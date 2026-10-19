/* ==========================================================================
   SESSION BROWSER & INSTANCE MONITOR COMPONENT - TOAD FOR ORACLE 1:1
   Authentic TOAD tabbed drawer notebook layout (Abas/Gavetas inferiores):
   1. Current SQL (V$SQL)
   2. Tablespaces & Temp (V$SORT_USAGE / DBA_TABLESPACES / DBA_SEGMENTS)
   3. Session Waits (V$SESSION_WAIT)
   4. Locks (V$LOCKED_OBJECT)
   5. Lock Tree (Hierarquia de Bloqueios de Instâncias)
   6. Open Cursors (V$OPEN_CURSOR)
   7. Undo & Transactions (V$TRANSACTION)
   8. I/O & Memory (V$SESS_IO)
   9. Session Info (Metadados do Processo & Cliente)
   Optimized: Instant optimistic rendering, in-memory caching, zero manual refresh.
   ========================================================================== */

class SessionMonitor {
  constructor() {
    this.sessions = window.TRACES_DB ? window.TRACES_DB.sessions : [];
    this.metrics = window.TRACES_DB ? window.TRACES_DB.instanceMetrics : {
      bufferCacheHitRatio: 99.2,
      libraryCacheHitRatio: 99.8,
      activeSessionsCount: 2,
      totalSessionsCount: 15,
      redoLogSwitchesPerHour: 2.4
    };
    this.selectedSid = this.sessions.length > 0 ? this.sessions[0].sid : null;
    this.selectedSerial = this.sessions.length > 0 ? this.sessions[0].serial : null;
    this.scopeMode = 'session'; // 'all' | 'session'
    this.currentFilter = 'filter9'; // Default: STATUS - ACTIVE
    this.autoRefreshInterval = 5; // seconds
    this.autoRefreshTimer = null;
    this.currentDetailTab = 'sql'; // 'sql' | 'tablespaces' | 'waits' | 'locks' | 'locktree' | 'cursors' | 'transactions' | 'io' | 'info'
    this.detailsCache = new Map(); // sid -> { data, ts }
    this.instanceOverview = this.getMockInstanceOverview();
    this.selectedMasterSqlId = '8h3k9f01q2a8z';
    this.sessionDetails = this.getMockSessionDetails(this.selectedSid);
    this.isLoadingDetails = false;

    this.initElements();
    this.bindEvents();
    this.initSplitter();
    this.render();
    this.setupAutoRefresh();
  }

  initElements() {
    this.tableBody = document.getElementById('session-table-body');
    this.tableWrapper = document.querySelector('.session-table-wrapper');
    this.detailPane = document.getElementById('session-detail-inspector');
    this.filterSelect = document.getElementById('session-native-filter-select');
    this.autoRefreshSelect = document.getElementById('session-autorefresh-select');
  }

  bindEvents() {
    if (this.filterSelect) {
      this.filterSelect.value = this.currentFilter;
    }
  }

  initSplitter() {
    const splitter = document.getElementById('session-splitter');
    const tableWrapper = this.tableWrapper || document.querySelector('.session-table-wrapper');
    if (!splitter || !tableWrapper) return;

    let isDragging = false;
    let startY = 0;
    let startTableH = 0;

    splitter.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startTableH = tableWrapper.offsetHeight;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const delta = e.clientY - startY;
      const containerH = tableWrapper.parentElement ? tableWrapper.parentElement.offsetHeight : 600;
      const newH = Math.max(140, Math.min(containerH - 180, startTableH + delta));
      tableWrapper.style.flex = `0 0 ${newH}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  setupAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
    if (this.autoRefreshInterval > 0) {
      this.autoRefreshTimer = setInterval(() => {
        if (window.TracesApp && window.TracesApp.currentView === 'sessions') {
          this.refresh(true);
        }
      }, this.autoRefreshInterval * 1000);
    }
  }

  setAutoRefresh(seconds) {
    this.autoRefreshInterval = parseInt(seconds, 10);
    this.setupAutoRefresh();
    window.TracesApp.notify(`Auto-Refresh de sessões ajustado para ${this.autoRefreshInterval > 0 ? this.autoRefreshInterval + 's' : 'Desativado'}.`, 'info');
  }

  async onFilterChanged(filterId) {
    this.currentFilter = filterId;
    await this.refresh(true);
  }

  async refresh(isSilent = false) {
    // Preserve scroll position
    const savedScrollTop = this.tableWrapper ? this.tableWrapper.scrollTop : 0;

    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      await this.loadRealSessions();
      if (this.tableWrapper) this.tableWrapper.scrollTop = savedScrollTop;
      if (!isSilent) window.TracesApp.notify('Sessões atualizadas ao vivo do Oracle.', 'info');
      return;
    }

    this.sessions = window.TRACES_DB.sessions;
    
    // Auto-select first session if selectedSid is missing from current filtered set
    const stillExists = this.sessions.some(s => s.sid === this.selectedSid);
    if (!stillExists && this.sessions.length > 0) {
      this.selectedSid = this.sessions[0].sid;
      this.selectedSerial = this.sessions[0].serial;
      this.sessionDetails = this.getMockSessionDetails(this.selectedSid);
    }

    this.render();
    if (this.tableWrapper) this.tableWrapper.scrollTop = savedScrollTop;
    if (!isSilent) window.TracesApp.notify('Sessões atualizadas (Modo Local).', 'info');
  }

  async loadRealSessions() {
    try {
      const resp = await fetch(`/api/sessions?filter=${encodeURIComponent(this.currentFilter)}`);
      const data = await resp.json();
      if (data.sessions) {
        this.sessions = data.sessions;
        
        // Auto-select first session if none selected or if selected session left the filter
        const stillExists = this.sessions.some(s => s.sid === this.selectedSid);
        if (!stillExists && this.sessions.length > 0) {
          this.selectedSid = this.sessions[0].sid;
          this.selectedSerial = this.sessions[0].serial;
        }

        // Also refresh instance probe metrics silently
        try {
          const probeResp = await fetch('/api/probe');
          const probeData = await probeResp.json();
          if (probeData.metrics) {
            this.metrics = Object.assign(this.metrics, {
              bufferCacheHitRatio: probeData.metrics.bufferCacheHitRatio,
              libraryCacheHitRatio: probeData.metrics.libraryCacheHitRatio,
              activeSessionsCount: probeData.metrics.activeSessions,
              totalSessionsCount: probeData.metrics.totalSessions,
              redoLogSwitchesPerHour: probeData.metrics.redoLogSwitches
            });
          }
        } catch (e) {
          // Ignore probe errors
        }

        // Fetch real instance overview for master tabs
        try {
          const ovResp = await fetch('/api/instance-overview');
          const ovData = await ovResp.json();
          if (ovData && !ovData.error) {
            this.instanceOverview = ovData;
          }
        } catch (e) {
          // Ignore overview errors
        }

        this.renderTable();
        this.renderGauges();
        
        if (this.selectedSid && this.scopeMode === 'session') {
          await this.loadSessionDetails(this.selectedSid);
        } else {
          this.renderDetail();
        }
      }
    } catch (e) {
      console.warn('Real sessions fetch error', e);
    }
  }

  render() {
    this.renderGauges();
    this.renderTable();
    this.renderDetail();
  }

  renderGauges() {
    const bufFill = document.getElementById('gauge-buf-fill');
    const bufVal = document.getElementById('gauge-buf-val');
    if (bufFill && bufVal) {
      const circ = 2 * Math.PI * 15;
      const offset = circ - (circ * (this.metrics.bufferCacheHitRatio / 100));
      bufFill.style.strokeDasharray = circ;
      bufFill.style.strokeDashoffset = offset;
      bufVal.textContent = `${this.metrics.bufferCacheHitRatio}%`;
    }

    const libFill = document.getElementById('gauge-lib-fill');
    const libVal = document.getElementById('gauge-lib-val');
    if (libFill && libVal) {
      const circ = 2 * Math.PI * 15;
      const offset = circ - (circ * (this.metrics.libraryCacheHitRatio / 100));
      libFill.style.strokeDasharray = circ;
      libFill.style.strokeDashoffset = offset;
      libVal.textContent = `${this.metrics.libraryCacheHitRatio}%`;
    }

    const actVal = document.getElementById('gauge-act-val');
    if (actVal) actVal.textContent = `${this.metrics.activeSessionsCount || this.sessions.filter(s => s.status === 'ACTIVE').length} / ${this.metrics.totalSessionsCount || this.sessions.length}`;

    const redoVal = document.getElementById('gauge-redo-val');
    if (redoVal) redoVal.textContent = `${this.metrics.redoLogSwitchesPerHour} / hr`;
  }

  renderTable() {
    if (!this.tableBody) return;

    const isMasterSelected = this.selectedSid === null || this.scopeMode === 'all';
    const masterRow = `
      <tr class="${isMasterSelected ? 'selected' : ''}" style="background: ${isMasterSelected ? '#e0f2fe' : '#f8fafc'}; font-weight: 700; cursor: pointer; border-bottom: 2px solid #cbd5e1;" onclick="window.TracesApp.sessionMonitor.selectMasterOverview()">
        <td style="color: #0284c7; text-align: center; font-size: 13px;">🌐</td>
        <td style="color: #0284c7; font-weight: 700;">ALL</td>
        <td><span class="session-status-badge active" style="font-weight: 700; background: #0284c7; color: #fff;">INSTÂNCIA</span></td>
        <td style="color: #0284c7; font-weight: 700;">(Todas as Sessões)</td>
        <td>-</td>
        <td style="color: #475569; font-size: 11px;">Visão Geral Global</td>
        <td style="font-size: 11px; color: #0284c7;">Toad Parity Engine</td>
        <td style="color: #0284c7; font-size: 10px;">V$SESSION / V$LOCK</td>
        <td style="font-size: 11px; color: #64748b;">${this.sessions.length} conexões</td>
        <td style="text-align: right; color: #0284c7; font-family: var(--toad-font-code);">${this.metrics.pgaTotalMb || 1420} MB</td>
        <td><span style="color: #0284c7; font-size: 10px; font-weight: 700;">🌐 VISÃO GERAL</span></td>
      </tr>
    `;

    if (this.sessions.length === 0) {
      this.tableBody.innerHTML = masterRow + `
        <tr>
          <td colspan="11" style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 11px;">
            Nenhuma sessão encontrada para o filtro selecionado (${this.currentFilter}).
          </td>
        </tr>
      `;
      return;
    }

    const sessionRows = this.sessions.map(s => {
      const isSelected = (!isMasterSelected) && (this.selectedSid === s.sid);
      const isBlocking = s.blockingSession !== null && s.blockingSession !== undefined;
      const isBlocked = s.lockwait !== null && s.lockwait !== undefined && s.lockwait !== '';

      let rowClass = '';
      if (isSelected) rowClass += ' selected';
      if (isBlocking) rowClass += ' blocking';

      return `
        <tr class="${rowClass}" onclick="window.TracesApp.sessionMonitor.selectSession(${s.sid}, ${s.serial})">
          <td style="font-weight: 700; color: ${isBlocking ? '#b91c1c' : 'inherit'};">${s.sid}</td>
          <td style="color: #64748b;">${s.serial}</td>
          <td>
            <span class="session-status-badge ${s.status.toLowerCase()} ${isBlocked ? 'blocked' : ''}">
              ${isBlocked ? 'WAIT LOCK' : s.status}
            </span>
          </td>
          <td style="font-weight: 600; color: #0284c7; font-family: var(--toad-font-code);">${s.username || 'BACKGROUND'}</td>
          <td>${s.osuser || '-'}</td>
          <td style="color: #64748b;">${s.machine || '-'}</td>
          <td style="font-size: 11px;">${s.program || '-'}</td>
          <td style="color: ${isBlocked ? '#dc2626' : '#334155'}; font-size: 10px; font-family: var(--toad-font-code);">
            ${s.event || 'None'}
          </td>
          <td style="font-size: 11px;">${s.logonTime || '-'}</td>
          <td style="text-align: right; font-family: var(--toad-font-code); font-variant-numeric: tabular-nums;">${s.pgaMb || 0} MB</td>
          <td>
            ${isBlocking ? '<span style="color: #dc2626; font-weight: 700;">BLOCKER</span>' : ''}
            ${isBlocked ? '<span style="color: #d97706; font-weight: 700;">WAITING ON LOCK</span>' : ''}
            ${!isBlocking && !isBlocked ? '-' : ''}
          </td>
        </tr>
      `;
    }).join('');

    this.tableBody.innerHTML = masterRow + sessionRows;
  }

  selectMasterOverview() {
    this.selectedSid = null;
    this.selectedSerial = null;
    this.scopeMode = 'all';
    this.renderTable();
    this.renderDetail();
  }

  setScopeMode(mode) {
    this.scopeMode = mode;
    if (mode === 'session' && !this.selectedSid && this.sessions.length > 0) {
      this.selectedSid = this.sessions[0].sid;
      this.selectedSerial = this.sessions[0].serial;
    }
    this.renderTable();
    this.renderDetail();
  }

  selectMasterSql(sqlId) {
    this.selectedMasterSqlId = sqlId;
    this.renderDetail();
  }

  async selectSession(sid, serial) {
    this.selectedSid = sid;
    this.selectedSerial = serial;
    this.scopeMode = 'session';

    // Instant visual update on table rows (0ms feedback)
    if (this.tableBody) {
      const rows = this.tableBody.querySelectorAll('tr');
      rows.forEach(r => {
        const firstCell = r.querySelector('td');
        if (firstCell && firstCell.textContent.trim() === String(sid)) {
          r.classList.add('selected');
        } else {
          r.classList.remove('selected');
        }
      });
    }

    // Check in-memory cache first (0ms latency!)
    const cached = this.detailsCache.get(sid);
    const now = Date.now();
    if (cached && (now - cached.ts) < 20000) {
      this.sessionDetails = cached.data;
      this.renderDetail();
      // Silently re-validate in background
      if (window.TracesApp && window.TracesApp.isRealDatabase) {
        this.fetchSessionDetailsInBackground(sid);
      }
      return;
    }

    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      // Optimistic instant render of header while fetching
      this.renderOptimisticPreview(sid, serial);
      await this.loadSessionDetails(sid);
    } else {
      this.sessionDetails = this.getMockSessionDetails(sid);
      this.detailsCache.set(sid, { data: this.sessionDetails, ts: now });
      this.renderDetail();
    }
  }

  renderOptimisticPreview(sid, serial) {
    const s = this.sessions.find(x => x.sid === sid) || { sid, serial, username: 'LOADING...', status: 'ACTIVE' };
    this.isLoadingDetails = true;
    this.sessionDetails = this.getMockSessionDetails(sid);
    this.renderDetail();
  }

  async loadSessionDetails(sid) {
    try {
      this.isLoadingDetails = true;
      const resp = await fetch(`/api/session-details?sid=${sid}`);
      const data = await resp.json();
      this.isLoadingDetails = false;
      if (data && !data.error) {
        this.sessionDetails = data;
        this.detailsCache.set(sid, { data: this.sessionDetails, ts: Date.now() });
      } else {
        this.sessionDetails = this.getMockSessionDetails(sid);
      }
      this.renderDetail();
    } catch (e) {
      this.isLoadingDetails = false;
      console.warn('Session details load error', e);
      this.sessionDetails = this.getMockSessionDetails(sid);
      this.renderDetail();
    }
  }

  async fetchSessionDetailsInBackground(sid) {
    try {
      const resp = await fetch(`/api/session-details?sid=${sid}`);
      const data = await resp.json();
      if (data && !data.error) {
        this.sessionDetails = data;
        this.detailsCache.set(sid, { data: this.sessionDetails, ts: Date.now() });
        // Re-render only if current sid is still this session
        if (this.selectedSid === sid) {
          this.renderDetail();
        }
      }
    } catch (e) {
      // Ignore background refresh errors
    }
  }

  getMockSessionDetails(sid) {
    const s = this.sessions.find(x => x.sid === sid) || this.sessions[0];
    const username = s?.username || 'HR';
    
    // Default mock database tablespaces
    const dbTablespaces = (window.TRACES_DB && window.TRACES_DB.tablespaces) ? window.TRACES_DB.tablespaces.map(ts => ({
      tablespace: ts.name,
      status: 'ONLINE',
      contents: ts.name === 'TEMP' ? 'TEMPORARY' : (ts.name === 'UNDOTBS1' ? 'UNDO' : 'PERMANENT'),
      extentMgmt: 'LOCAL',
      totalMb: ts.totalMb,
      usedMb: ts.usedMb,
      freeMb: ts.totalMb - ts.usedMb,
      pctUsed: ts.pct
    })) : [
      { tablespace: 'SYSTEM', status: 'ONLINE', contents: 'PERMANENT', extentMgmt: 'LOCAL', totalMb: 2048, usedMb: 1740, freeMb: 308, pctUsed: 85.0 },
      { tablespace: 'SYSAUX', status: 'ONLINE', contents: 'PERMANENT', extentMgmt: 'LOCAL', totalMb: 4096, usedMb: 2867, freeMb: 1229, pctUsed: 70.0 },
      { tablespace: 'USERS', status: 'ONLINE', contents: 'PERMANENT', extentMgmt: 'LOCAL', totalMb: 8192, usedMb: 3440, freeMb: 4752, pctUsed: 42.0 },
      { tablespace: 'SALES_2026', status: 'ONLINE', contents: 'PERMANENT', extentMgmt: 'LOCAL', totalMb: 32768, usedMb: 28835, freeMb: 3933, pctUsed: 88.0 },
      { tablespace: 'UNDOTBS1', status: 'ONLINE', contents: 'UNDO', extentMgmt: 'LOCAL', totalMb: 4096, usedMb: 940, freeMb: 3156, pctUsed: 23.0 },
      { tablespace: 'TEMP', status: 'ONLINE', contents: 'TEMPORARY', extentMgmt: 'LOCAL', totalMb: 8192, usedMb: 1230, freeMb: 6962, pctUsed: 15.0 }
    ];

    // Temp sort usage
    const tempUsage = [];
    if (s && (s.sid === 142 || s.sid === 312)) {
      tempUsage.push({
        tablespace: 'TEMP',
        segType: 'SORT',
        extents: 12,
        blocks: 1536,
        mbUsed: 12.0,
        sqlId: s.sqlId || '8h3k9f01q2a8z'
      });
      tempUsage.push({
        tablespace: 'TEMP',
        segType: 'HASH',
        extents: 4,
        blocks: 512,
        mbUsed: 4.0,
        sqlId: s.sqlId || '8h3k9f01q2a8z'
      });
    }

    // User tablespace assignments
    const userTablespaces = {
      username: username,
      defaultTablespace: username === 'SALES_ADMIN' ? 'SALES_2026' : 'USERS',
      temporaryTablespace: 'TEMP',
      accountStatus: 'OPEN'
    };

    // User Quotas
    const userQuotas = [
      { tablespace: userTablespaces.defaultTablespace, mbUsed: username === 'SALES_ADMIN' ? 28835.0 : 3440.0, segmentCount: username === 'SALES_ADMIN' ? 42 : 18 },
      { tablespace: 'USERS', mbUsed: 140.0, segmentCount: 4 }
    ];

    // Waits
    const waits = [];
    if (s && s.event) {
      waits.push({
        event: s.event,
        waitTime: s.status === 'ACTIVE' ? 0 : 120,
        secondsInWait: s.lastCallEt || 2,
        state: 'WAITING',
        p1Text: 'file#',
        p1: 4,
        p2Text: 'block#',
        p2: 12093,
        p3Text: 'blocks',
        p3: 1
      });
    }

    // Locks
    const locks = [];
    if (s && (s.sid === 204 || s.sid === 312)) {
      locks.push({
        owner: 'SALES_ADMIN',
        objectName: 'CUSTOMERS',
        objectType: 'TABLE',
        lockMode: s.sid === 312 ? 'Exclusive (X)' : 'Row Share (SS)',
        osUser: s.osuser || 'oracle'
      });
    }

    // Open Cursors
    const openCursors = [
      { sqlId: s?.sqlId || '8h3k9f01q2a8z', user: username, sqlText: s?.sqlText || 'SELECT e.first_name, e.last_name, d.department_name, e.salary FROM employees e JOIN departments d ON e.department_id = d.department_id ORDER BY e.salary DESC;' },
      { sqlId: '9a4bb10034x', user: username, sqlText: 'SELECT tablespace_name, status, contents FROM dba_tablespaces ORDER BY tablespace_name;' },
      { sqlId: 'c12999da872', user: username, sqlText: 'SELECT sid, serial#, status, username, osuser FROM v$session WHERE status = \'ACTIVE\';' }
    ];

    // Transactions
    const transactions = [];
    if (s && (s.sid === 204 || s.sid === 312 || s.sid === 142)) {
      transactions.push({
        xid: `7.${(s.sid % 20) + 1}.9401`,
        usedUblk: 8,
        usedUrec: 42,
        startTime: s.logonTime || '14:05:00',
        status: 'ACTIVE'
      });
    }

    // IO
    const io = {
      blockGets: 1420 + (s?.sid || 1) * 35,
      consistentGets: 8400 + (s?.sid || 1) * 120,
      physicalReads: (s?.physicalReads || 24),
      blockChanges: (s?.blockChanges || 18)
    };

    // Info
    const info = {
      sid: s?.sid || 0,
      serial: s?.serial || 0,
      username: username,
      status: s?.status || 'ACTIVE',
      osuser: s?.osuser || 'oracle',
      machine: s?.machine || 'localhost',
      terminal: 'pts/2',
      program: s?.program || 'traces-oracle.exe',
      module: s?.module || 'Traces Toad Net8 Client',
      action: 'Query Execution',
      clientInfo: 'Toad for Oracle 1:1 Parity Mode',
      server: 'DEDICATED',
      logonTime: s?.logonTime || '2026-10-18 12:00:00',
      spid: s?.spid || '19402'
    };

    return {
      sid: s?.sid,
      sql: {
        sqlId: s?.sqlId || '8h3k9f01q2a8z',
        sqlText: s?.sqlText || 'SELECT e.first_name, e.last_name, d.department_name, e.salary FROM employees e JOIN departments d ON e.department_id = d.department_id ORDER BY e.salary DESC;',
        executions: 48,
        bufferGets: io.consistentGets,
        diskReads: io.physicalReads,
        cpuTime: 0.12,
        elapsedTime: 0.35
      },
      tablespaces: {
        tempUsage,
        userTablespaces,
        userQuotas,
        databaseTablespaces: dbTablespaces
      },
      waits,
      locks,
      openCursors,
      transactions,
      io,
      info
    };
  }

  switchSubtab(tabKey) {
    this.currentDetailTab = tabKey;
    this.renderDetail();
  }

  toggleDrawerState(state) {
    const split = document.querySelector('.session-body-split');
    if (!split) return;
    this.drawerState = state;
    split.classList.remove('drawer-minimized', 'drawer-maximized');
    if (state === 'minimize') {
      split.classList.add('drawer-minimized');
    } else if (state === 'maximize') {
      split.classList.add('drawer-maximized');
    } else {
      const tableWrapper = split.querySelector('.session-table-wrapper');
      if (tableWrapper) tableWrapper.style.flex = '';
    }
  }

  getMockInstanceOverview() {
    const dbTablespaces = (window.TRACES_DB && window.TRACES_DB.tablespaces) ? window.TRACES_DB.tablespaces.map(ts => ({
      tablespace: ts.name,
      status: ts.status || 'ONLINE',
      contents: ts.name === 'TEMP' ? 'TEMPORARY' : (ts.name === 'UNDOTBS1' ? 'UNDO' : 'PERMANENT'),
      extentMgmt: 'LOCAL',
      totalMb: ts.totalMb,
      usedMb: ts.usedMb,
      freeMb: ts.totalMb - ts.usedMb,
      pctUsed: ts.pct || Math.round((ts.usedMb / ts.totalMb) * 100),
      datafiles: ts.datafiles || 1
    })) : [
      { tablespace: 'SYSTEM', status: 'ONLINE', contents: 'PERMANENT', extentMgmt: 'LOCAL', totalMb: 2048, usedMb: 1740, freeMb: 308, pctUsed: 85.0, datafiles: 1 },
      { tablespace: 'SYSAUX', status: 'ONLINE', contents: 'PERMANENT', extentMgmt: 'LOCAL', totalMb: 4096, usedMb: 2867, freeMb: 1229, pctUsed: 70.0, datafiles: 2 },
      { tablespace: 'USERS', status: 'ONLINE', contents: 'PERMANENT', extentMgmt: 'LOCAL', totalMb: 8192, usedMb: 3440, freeMb: 4752, pctUsed: 42.0, datafiles: 2 },
      { tablespace: 'SALES_2026', status: 'ONLINE', contents: 'PERMANENT', extentMgmt: 'LOCAL', totalMb: 32768, usedMb: 28835, freeMb: 3933, pctUsed: 88.0, datafiles: 4 },
      { tablespace: 'UNDOTBS1', status: 'ONLINE', contents: 'UNDO', extentMgmt: 'LOCAL', totalMb: 4096, usedMb: 940, freeMb: 3156, pctUsed: 23.0, datafiles: 1 },
      { tablespace: 'TEMP', status: 'ONLINE', contents: 'TEMPORARY', extentMgmt: 'LOCAL', totalMb: 8192, usedMb: 1230, freeMb: 6962, pctUsed: 15.0, datafiles: 1 }
    ];

    return {
      allLocks: [
        { sid: 312, serial: 44018, username: 'SALES_ADMIN', osuser: 'batch_srv', machine: 'etl-node-02.corp', program: 'python-cx_oracle', owner: 'SALES_ADMIN', objectName: 'CUSTOMERS', objectType: 'TABLE', lockMode: 'Exclusive (X)' },
        { sid: 204, serial: 11029, username: 'HR', osuser: 'app_user', machine: 'prod-api-04.corp', program: 'node.exe', owner: 'SALES_ADMIN', objectName: 'CUSTOMERS', objectType: 'TABLE', lockMode: 'Exclusive (X) (WAITING)' },
        { sid: 142, serial: 50412, username: 'SALES_ADMIN', osuser: 'pfranchim', machine: 'macbook-pro.local', program: 'traces-oracle.exe', owner: 'SALES_ADMIN', objectName: 'SALES_TRANSACTIONS', objectType: 'TABLE', lockMode: 'Row Share (SS)' }
      ],
      allWaits: [
        { event: 'db file sequential read', waitClass: 'User I/O', totalWaits: 42190, timeWaitedMs: 14280.4, avgWaitMs: 0.34 },
        { event: 'enq: TX - row lock contention', waitClass: 'Application', totalWaits: 1820, timeWaitedMs: 94200.0, avgWaitMs: 51.75 },
        { event: 'log file sync', waitClass: 'Commit', totalWaits: 12400, timeWaitedMs: 8940.2, avgWaitMs: 0.72 },
        { event: 'db file scattered read', waitClass: 'User I/O', totalWaits: 8400, timeWaitedMs: 6420.5, avgWaitMs: 0.76 },
        { event: 'direct path read temp', waitClass: 'User I/O', totalWaits: 3200, timeWaitedMs: 2840.1, avgWaitMs: 0.89 },
        { event: 'cursor: pin S wait on X', waitClass: 'Concurrency', totalWaits: 140, timeWaitedMs: 1200.0, avgWaitMs: 8.57 }
      ],
      activeSessionWaits: [
        { sid: 204, serial: 11029, username: 'HR', osuser: 'app_user', machine: 'prod-api-04.corp', program: 'node.exe', event: 'enq: TX - row lock contention', waitTime: 0, secondsInWait: 45, state: 'WAITING', p1Text: 'name|mode', p1: 1415053318, p2Text: 'usn<<16|slot', p2: 458763 },
        { sid: 312, serial: 44018, username: 'SALES_ADMIN', osuser: 'batch_srv', machine: 'etl-node-02.corp', program: 'python-cx_oracle', event: 'db file sequential read', waitTime: 0, secondsInWait: 2, state: 'WAITING', p1Text: 'file#', p1: 4, p2Text: 'block#', p2: 12093 },
        { sid: 142, serial: 50412, username: 'SALES_ADMIN', osuser: 'pfranchim', machine: 'macbook-pro.local', program: 'traces-oracle.exe', event: 'SQL*Net message from client', waitTime: 0, secondsInWait: 0, state: 'WAITING', p1Text: 'protocol', p1: 1952673792, p2Text: '#bytes', p2: 1 }
      ],
      allTopSql: [
        { sqlId: '8h3k9f01q2a8z', schema: 'HR', executions: 14820, bufferGets: 284100, diskReads: 1420, cpuSec: 1.45, elapsedSec: 3.12, getsPerExec: 19.2, sqlText: 'SELECT e.first_name, e.last_name, d.department_name, e.salary FROM employees e JOIN departments d ON e.department_id = d.department_id ORDER BY e.salary DESC;' },
        { sqlId: '3c19b48f99a10', schema: 'SALES_ADMIN', executions: 8420, bufferGets: 194200, diskReads: 890, cpuSec: 0.98, elapsedSec: 2.10, getsPerExec: 23.1, sqlText: 'UPDATE customers SET tier = \'ENTERPRISE\' WHERE customer_id = 10001;' },
        { sqlId: '5d8820c74a123', schema: 'SALES_ADMIN', executions: 5120, bufferGets: 142000, diskReads: 2400, cpuSec: 2.10, elapsedSec: 4.80, getsPerExec: 27.7, sqlText: 'SELECT t.tx_id, c.name, t.amount, t.tx_date FROM sales_transactions t JOIN customers c ON t.customer_id = c.customer_id WHERE t.amount >= 50000;' },
        { sqlId: '7a993e1102bb1', schema: 'HR', executions: 2940, bufferGets: 92400, diskReads: 120, cpuSec: 0.45, elapsedSec: 0.92, getsPerExec: 31.4, sqlText: 'UPDATE employees SET salary = salary * 1.05 WHERE department_id = 90;' },
        { sqlId: '9f0019da82110', schema: 'SYSTEM', executions: 1240, bufferGets: 48900, diskReads: 40, cpuSec: 0.22, elapsedSec: 0.54, getsPerExec: 39.4, sqlText: 'SELECT tablespace_name, status, contents FROM dba_tablespaces;' }
      ],
      allTransactions: [
        { sid: 312, serial: 44018, username: 'SALES_ADMIN', osuser: 'batch_srv', machine: 'etl-node-02.corp', xid: '7.14.9401', usedUblk: 18, usedUrec: 142, startTime: '12:44:30', status: 'ACTIVE' },
        { sid: 204, serial: 11029, username: 'HR', osuser: 'app_user', machine: 'prod-api-04.corp', xid: '3.8.4210', usedUblk: 4, usedUrec: 12, startTime: '13:05:18', status: 'ACTIVE' },
        { sid: 142, serial: 50412, username: 'SALES_ADMIN', osuser: 'pfranchim', machine: 'macbook-pro.local', xid: '9.2.1102', usedUblk: 8, usedUrec: 42, startTime: '14:10:02', status: 'ACTIVE' }
      ],
      allTopIo: [
        { sid: 312, serial: 44018, username: 'SALES_ADMIN', program: 'python-cx_oracle', osuser: 'batch_srv', machine: 'etl-node-02.corp', blockGets: 48200, consistentGets: 148200, physicalReads: 18400, blockChanges: 4200, pgaMb: 64.8 },
        { sid: 142, serial: 50412, username: 'SALES_ADMIN', program: 'traces-oracle.exe', osuser: 'pfranchim', machine: 'macbook-pro.local', blockGets: 1420, consistentGets: 28400, physicalReads: 420, blockChanges: 180, pgaMb: 18.4 },
        { sid: 204, serial: 11029, username: 'HR', program: 'node.exe', osuser: 'app_user', machine: 'prod-api-04.corp', blockGets: 840, consistentGets: 14200, physicalReads: 140, blockChanges: 64, pgaMb: 12.2 },
        { sid: 89, serial: 48102, username: 'SCOTT', program: 'toad.exe', osuser: 'developer', machine: 'dev-station-09', blockGets: 210, consistentGets: 4120, physicalReads: 42, blockChanges: 12, pgaMb: 9.8 }
      ],
      allCursors: [
        { sid: 142, user: 'SALES_ADMIN', sqlId: '8h3k9f01q2a8z', sqlText: 'SELECT e.first_name, e.last_name, d.department_name, e.salary FROM employees e JOIN departments d ON e.department_id = d.department_id ORDER BY e.salary DESC;' },
        { sid: 312, user: 'SALES_ADMIN', sqlId: '3c19b48f99a10', sqlText: 'UPDATE customers SET tier = \'ENTERPRISE\' WHERE customer_id = 10001;' },
        { sid: 204, user: 'HR', sqlId: '7a993e1102bb1', sqlText: 'UPDATE employees SET salary = salary * 1.05 WHERE department_id = 90;' },
        { sid: 89, user: 'SCOTT', sqlId: 'c12999da872', sqlText: 'SELECT * FROM dept;' }
      ],
      databaseTablespaces: dbTablespaces,
      allTempSortUsage: [
        { sid: 142, username: 'SALES_ADMIN', tablespace: 'TEMP', segType: 'SORT', extents: 12, blocks: 1536, mbUsed: 12.0, sqlId: '8h3k9f01q2a8z' },
        { sid: 142, username: 'SALES_ADMIN', tablespace: 'TEMP', segType: 'HASH', extents: 4, blocks: 512, mbUsed: 4.0, sqlId: '8h3k9f01q2a8z' },
        { sid: 312, username: 'SALES_ADMIN', tablespace: 'TEMP', segType: 'SORT', extents: 8, blocks: 1024, mbUsed: 8.0, sqlId: '3c19b48f99a10' }
      ]
    };
  }

  renderDetail() {
    if (!this.detailPane) return;

    const isOverview = (this.selectedSid === null || this.scopeMode === 'all');
    const s = this.sessions.find(item => item.sid === this.selectedSid) || (this.sessions.length > 0 ? this.sessions[0] : null);
    const ov = this.instanceOverview || this.getMockInstanceOverview();

    // Check instance blockers count for tab badge
    const blockers = this.sessions.filter(b => b.blockingSession !== null || (b.lockwait && b.lockwait !== ''));

    // Details for single session if available
    const details = (s ? (this.sessionDetails || this.getMockSessionDetails(s.sid)) : this.getMockSessionDetails(142));
    const sqlObj = details.sql || {};
    const sqlText = sqlObj.sqlText || s?.sqlText || '-- Nenhuma instrução SQL ativa no momento para esta sessão.';
    const waits = details.waits || [];
    const locks = details.locks || [];
    const openCursors = details.openCursors || [];
    const transactions = details.transactions || [];
    const io = details.io || {};
    const info = details.info || {};
    const tsData = details.tablespaces || { tempUsage: [], userTablespaces: {}, userQuotas: [], databaseTablespaces: ov.databaseTablespaces };
    const tempUsage = tsData.tempUsage || [];
    const userTs = tsData.userTablespaces || {};
    const userQuotas = tsData.userQuotas || [];
    const dbTablespaces = ov.databaseTablespaces || tsData.databaseTablespaces || [];

    // Selected Top SQL in Overview
    const topSqlList = ov.allTopSql || [];
    const activeTopSql = topSqlList.find(x => x.sqlId === this.selectedMasterSqlId) || topSqlList[0] || {
      sqlId: '8h3k9f01q2a8z',
      schema: 'HR',
      executions: 14820,
      bufferGets: 284100,
      diskReads: 1420,
      cpuSec: 1.45,
      elapsedSec: 3.12,
      getsPerExec: 19.2,
      sqlText: 'SELECT e.first_name, e.last_name, d.department_name, e.salary FROM employees e JOIN departments d ON e.department_id = d.department_id ORDER BY e.salary DESC;'
    };

    // Calculate database totals for storage
    const totalDbMb = dbTablespaces.reduce((acc, t) => acc + (t.totalMb || 0), 0);
    const usedDbMb = dbTablespaces.reduce((acc, t) => acc + (t.usedMb || 0), 0);
    const freeDbMb = totalDbMb - usedDbMb;
    const globalPct = totalDbMb > 0 ? Math.round((usedDbMb / totalDbMb) * 100) : 0;

    this.detailPane.innerHTML = `
      <div class="toad-drawer-container">
        
        <!-- Header Drawer Strip -->
        <div class="toad-drawer-header">
          ${isOverview ? `
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-weight: 700; font-size: 12px; color: #0284c7; display: flex; align-items: center; gap: 6px;">
                🌐 Visão Geral Global da Instância Oracle (Todos os Recursos)
              </span>
              <span class="session-status-badge active">INSTÂNCIA COMPLETA</span>
              <span style="font-size: 11px; color: #64748b;">
                Conexões: <strong>${this.sessions.length}</strong> | Ativas: <strong>${this.sessions.filter(x => x.status === 'ACTIVE').length}</strong> | PGA: <strong>${this.metrics.pgaTotalMb || 1420} MB</strong> | Hit Ratio: <strong>${this.metrics.bufferCacheHitRatio}%</strong>
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button class="btn" style="height: 22px; padding: 0 8px; font-size: 11px;" onclick="window.TracesApp.sessionMonitor.refresh()">
                🔄 Atualizar Todos
              </button>
              <div style="display: flex; align-items: center; gap: 2px; margin-left: 6px; border-left: 1px solid #cbd5e1; padding-left: 6px;">
                <button class="btn" style="height: 22px; padding: 0 6px; font-size: 10px; font-weight: bold;" onclick="window.TracesApp.sessionMonitor.toggleDrawerState('minimize')" title="Minimizar Gaveta (expandir tabela de sessões)">⚊</button>
                <button class="btn" style="height: 22px; padding: 0 6px; font-size: 10px;" onclick="window.TracesApp.sessionMonitor.toggleDrawerState('normal')" title="Restaurar Divisão 50/50">🗗</button>
                <button class="btn" style="height: 22px; padding: 0 6px; font-size: 10px;" onclick="window.TracesApp.sessionMonitor.toggleDrawerState('maximize')" title="Maximizar Gaveta">🗖</button>
              </div>
            </div>
          ` : `
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-weight: 700; font-size: 12px; color: #0f172a;">
                Session Drawer: SID <span style="color: #0284c7;">${s.sid}</span>, Serial# ${s.serial} (${s.username || 'BACKGROUND'})
              </span>
              <span class="session-status-badge ${s.status.toLowerCase()}">${s.status}</span>
              <span style="font-size: 11px; color: #64748b;">
                Client: ${s.osuser || '-'} @ ${s.machine || '-'} | Program: ${s.program || '-'} | SPID: ${s.spid || info.spid || '-'}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button class="btn btn-danger" style="height: 22px; padding: 0 8px; font-weight: 700; font-size: 11px;" onclick="window.TracesApp.sessionMonitor.killSession(${s.sid}, ${s.serial})">
                ⚡ Kill Session IMMEDIATE
              </button>
              <button class="btn" style="height: 22px; padding: 0 8px; font-size: 11px;" onclick="window.TracesApp.sessionMonitor.loadSessionDetails(${s.sid})">
                🔄 Refresh Details
              </button>
              <div style="display: flex; align-items: center; gap: 2px; margin-left: 6px; border-left: 1px solid #cbd5e1; padding-left: 6px;">
                <button class="btn" style="height: 22px; padding: 0 6px; font-size: 10px; font-weight: bold;" onclick="window.TracesApp.sessionMonitor.toggleDrawerState('minimize')" title="Minimizar Gaveta (expandir tabela de sessões)">⚊</button>
                <button class="btn" style="height: 22px; padding: 0 6px; font-size: 10px;" onclick="window.TracesApp.sessionMonitor.toggleDrawerState('normal')" title="Restaurar Divisão 50/50">🗗</button>
                <button class="btn" style="height: 22px; padding: 0 6px; font-size: 10px;" onclick="window.TracesApp.sessionMonitor.toggleDrawerState('maximize')" title="Maximizar Gaveta">🗖</button>
              </div>
            </div>
          `}
        </div>

        <!-- Scope Switcher Bar (Todos no Banco vs Sessão Selecionada) -->
        <div class="toad-scope-bar">
          <div class="toad-scope-pills">
            <button class="toad-scope-pill ${isOverview ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.setScopeMode('all')">
              <span>🌐 Visão Global de Todos (Instância Completa)</span>
            </button>
            ${this.selectedSid && s ? `
              <button class="toad-scope-pill ${!isOverview ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.setScopeMode('session')">
                <span>👤 Sessão Selecionada (SID ${s.sid}: ${s.username})</span>
              </button>
            ` : `
              <button class="toad-scope-pill" style="opacity: 0.6;" title="Clique em uma sessão na tabela acima para focar">
                <span>👤 (Selecione uma sessão acima para foco individual)</span>
              </button>
            `}
          </div>
          <div style="font-size: 11px; color: #64748b;">
            Modo: <strong style="color: #0284c7;">${isOverview ? 'Exibindo Recursos de Toda a Instância' : `Foco em SID ${s?.sid || '-'}`}</strong>
          </div>
        </div>

        <!-- Classic TOAD Notebook Tabs Strip ("Abas / Gavetas") -->
        <div class="toad-drawer-tabs-strip">
          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'sql' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('sql')">
            <span>Current / Top SQL</span>
            <span class="toad-drawer-tab-badge">${topSqlList.length}</span>
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'tablespaces' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('tablespaces')">
            <span>💾 Tablespaces &amp; Temp</span>
            <span class="toad-drawer-tab-badge">${dbTablespaces.length}</span>
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'waits' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('waits')">
            <span>Session Waits</span>
            ${(ov.activeSessionWaits || []).length > 0 ? `<span class="toad-drawer-tab-badge">${(ov.activeSessionWaits || []).length}</span>` : ''}
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'locks' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('locks')">
            <span>Locks Held</span>
            ${(ov.allLocks || []).length > 0 ? `<span class="toad-drawer-tab-badge danger">${(ov.allLocks || []).length}</span>` : ''}
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'locktree' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('locktree')">
            <span>🔒 Lock Tree</span>
            ${blockers.length > 0 ? `<span class="toad-drawer-tab-badge danger">${blockers.length}</span>` : ''}
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'cursors' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('cursors')">
            <span>Open Cursors</span>
            <span class="toad-drawer-tab-badge">${(ov.allCursors || []).length}</span>
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'transactions' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('transactions')">
            <span>Undo &amp; Transactions</span>
            ${(ov.allTransactions || []).length > 0 ? `<span class="toad-drawer-tab-badge">${(ov.allTransactions || []).length}</span>` : ''}
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'io' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('io')">
            <span>I/O &amp; Memory</span>
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'info' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('info')">
            <span>Session Info</span>
          </button>
        </div>

        <!-- Active Drawer Tab Body -->
        <div class="toad-drawer-body">
          
          <!-- TAB 1: CURRENT / TOP SQL -->
          <div style="display: ${this.currentDetailTab === 'sql' ? 'block' : 'none'};">
            ${isOverview ? `
              <div class="master-overview-banner">
                <div>
                  <div class="master-overview-title">🔥 Top SQL Statements Ativos da Instância Oracle (V$SQL / V$SQLAREA)</div>
                  <div class="master-overview-subtitle">Visão comparativa de maior consumo de Buffer Gets, leituras em disco e tempo de CPU.</div>
                </div>
                <button class="btn btn-primary" style="height: 24px; font-size: 11px;" onclick="window.TracesApp.openObjectInWorksheet('V$SQL')">
                  Abrir na Worksheet (F9)
                </button>
              </div>

              <!-- Top SQL KPI Summary -->
              <div class="master-kpi-grid">
                <div class="ts-summary-card">
                  <span class="ts-card-label">Instruções Monitoradas</span>
                  <span class="ts-card-value">${topSqlList.length} statements</span>
                </div>
                <div class="ts-summary-card">
                  <span class="ts-card-label">Maior Consumo de Buffer Gets</span>
                  <span class="ts-card-value" style="color: #0284c7;">${(topSqlList[0]?.bufferGets || 0).toLocaleString()}</span>
                </div>
                <div class="ts-summary-card">
                  <span class="ts-card-label">Top CPU Sec</span>
                  <span class="ts-card-value" style="color: #ea580c;">${topSqlList[0]?.cpuSec || 0}s</span>
                </div>
                <div class="ts-summary-card">
                  <span class="ts-card-label">Top Execuções</span>
                  <span class="ts-card-value" style="color: #059669;">${(topSqlList[0]?.executions || 0).toLocaleString()}</span>
                </div>
              </div>

              <!-- Top SQL Master Grid -->
              <div class="ts-section-title">
                <span>Ranking de Top SQL da Instância (Clique em uma linha para inspecionar abaixo)</span>
                <span style="font-size: 10px; font-weight: normal; color: #64748b;">Ordenado por Buffer Gets DESC</span>
              </div>
              <table class="toad-grid-table">
                <thead>
                  <tr>
                    <th style="width: 110px;">SQL ID</th>
                    <th style="width: 90px;">Parsing Schema</th>
                    <th style="text-align: right;">Execuções</th>
                    <th style="text-align: right;">Buffer Gets</th>
                    <th style="text-align: right;">Disk Reads</th>
                    <th style="text-align: right;">CPU (s)</th>
                    <th style="text-align: right;">Elapsed (s)</th>
                    <th style="text-align: right;">Gets / Exec</th>
                    <th>Instrução SQL Preview</th>
                  </tr>
                </thead>
                <tbody>
                  ${topSqlList.map(item => `
                    <tr style="cursor: pointer; background: ${item.sqlId === activeTopSql.sqlId ? '#e0f2fe' : 'transparent'};" onclick="window.TracesApp.sessionMonitor.selectMasterSql('${item.sqlId}')">
                      <td style="font-weight: 700; color: #0284c7; font-family: var(--toad-font-code);">${item.sqlId}</td>
                      <td style="font-weight: 600;">${item.schema}</td>
                      <td style="text-align: right;">${(item.executions || 1).toLocaleString()}</td>
                      <td style="text-align: right; font-weight: 700; color: #0284c7;">${(item.bufferGets || 0).toLocaleString()}</td>
                      <td style="text-align: right;">${(item.diskReads || 0).toLocaleString()}</td>
                      <td style="text-align: right;">${item.cpuSec || 0}s</td>
                      <td style="text-align: right;">${item.elapsedSec || 0}s</td>
                      <td style="text-align: right; font-weight: 600;">${item.getsPerExec || 0}</td>
                      <td style="font-family: var(--toad-font-code); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px;">
                        ${this.escapeHtml(item.sqlText)}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <!-- Selected Master SQL Inspector -->
              <div class="ts-section-title" style="margin-top: 10px;">
                <span>Inspecionando SQL ID: <strong style="color: #0284c7;">${activeTopSql.sqlId}</strong> (Schema: ${activeTopSql.schema})</span>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-secondary" style="height: 20px; font-size: 10px; padding: 0 6px;" onclick="navigator.clipboard.writeText(\`${this.escapeHtml(activeTopSql.sqlText)}\`); window.TracesApp.notify('SQL copiado!', 'info');">
                    📋 Copiar SQL
                  </button>
                  <button class="btn btn-primary" style="height: 20px; font-size: 10px; padding: 0 6px;" onclick="window.TracesApp.openObjectInWorksheet('${activeTopSql.sqlId}')">
                    Abrir na Worksheet
                  </button>
                </div>
              </div>
              <div style="background: #0f172a; color: #38bdf8; border: 1px solid #1e293b; border-radius: 6px; padding: 12px; font-family: var(--toad-font-code); font-size: 11px; max-height: 160px; overflow-y: auto; white-space: pre-wrap; line-height: 1.5; user-select: text;">
                ${this.escapeHtml(activeTopSql.sqlText)}
              </div>
            ` : `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px;">
                <span>SQL ID da Sessão: <strong style="font-family: var(--toad-font-code); color: #0284c7;">${sqlObj.sqlId || s.sqlId || '-'}</strong></span>
                <span style="color: #64748b;">
                  Execuções: <strong>${sqlObj.executions || 1}</strong> | 
                  Buffer Gets: <strong>${(sqlObj.bufferGets || 0).toLocaleString()}</strong> | 
                  Disk Reads: <strong>${(sqlObj.diskReads || 0).toLocaleString()}</strong> | 
                  CPU Time: <strong>${sqlObj.cpuTime ? sqlObj.cpuTime + 's' : '0.00s'}</strong> | 
                  Elapsed: <strong>${sqlObj.elapsedTime ? sqlObj.elapsedTime + 's' : '0.00s'}</strong>
                </span>
              </div>
              <div style="background: #0f172a; color: #38bdf8; border: 1px solid #1e293b; border-radius: 6px; padding: 12px; font-family: var(--toad-font-code); font-size: 11px; max-height: 160px; overflow-y: auto; white-space: pre-wrap; line-height: 1.5; user-select: text;">
                ${this.escapeHtml(sqlText)}
              </div>

              <!-- Contextual Top SQL Table -->
              <div class="ts-section-title" style="margin-top: 14px;">
                <span>🌐 Top SQL Ativo da Instância (Contexto Geral)</span>
                <span class="sid-drilldown-link" onclick="window.TracesApp.sessionMonitor.setScopeMode('all')">Ver Visão Completa de Todos →</span>
              </div>
              <table class="toad-grid-table">
                <thead>
                  <tr>
                    <th>SQL ID</th>
                    <th>Schema</th>
                    <th style="text-align: right;">Execuções</th>
                    <th style="text-align: right;">Buffer Gets</th>
                    <th style="text-align: right;">CPU (s)</th>
                    <th>SQL Preview</th>
                  </tr>
                </thead>
                <tbody>
                  ${topSqlList.slice(0, 4).map(item => `
                    <tr>
                      <td style="font-weight: 700; color: #0284c7;">${item.sqlId}</td>
                      <td>${item.schema}</td>
                      <td style="text-align: right;">${(item.executions || 1).toLocaleString()}</td>
                      <td style="text-align: right; font-weight: 700;">${(item.bufferGets || 0).toLocaleString()}</td>
                      <td style="text-align: right;">${item.cpuSec || 0}s</td>
                      <td style="font-family: var(--toad-font-code); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;">${this.escapeHtml(item.sqlText)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>

          <!-- TAB 2: TABLESPACES & TEMP (TOAD PARITY) -->
          <div style="display: ${this.currentDetailTab === 'tablespaces' ? 'block' : 'none'};">
            
            <!-- Database Tablespaces Overview Banner -->
            <div class="master-overview-banner">
              <div>
                <div class="master-overview-title">💾 Visão Geral de Todas as Tablespaces do Banco de Dados (DBA_TABLESPACES)</div>
                <div class="master-overview-subtitle">Capacidade, consumo físico e mapa de alocação de storage na instância.</div>
              </div>
              <div style="font-size: 11px; color: #0369a1; font-weight: 600;">
                Total: <strong>${(totalDbMb / 1024).toFixed(1)} GB</strong> | Usado: <strong>${(usedDbMb / 1024).toFixed(1)} GB</strong> (${globalPct}%)
              </div>
            </div>

            <!-- Summary KPI Cards -->
            <div class="master-kpi-grid">
              <div class="ts-summary-card">
                <span class="ts-card-label">Armazenamento Total</span>
                <span class="ts-card-value">${(totalDbMb / 1024).toFixed(1)} GB</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Espaço Consumido</span>
                <span class="ts-card-value" style="color: #0284c7;">${(usedDbMb / 1024).toFixed(1)} GB</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Espaço Livre</span>
                <span class="ts-card-value" style="color: #059669;">${(freeDbMb / 1024).toFixed(1)} GB</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Ocupação Global</span>
                <span class="ts-card-value" style="color: ${globalPct >= 85 ? '#dc2626' : (globalPct >= 70 ? '#d97706' : '#059669')};">${globalPct}%</span>
              </div>
            </div>

            <!-- Master Grid of All Database Tablespaces -->
            <div class="ts-section-title">
              <span>💾 Status e Capacidade de Todas as Tablespaces (DBA_TABLESPACES)</span>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">${dbTablespaces.length} Tablespaces Online</span>
            </div>
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th>Tablespace</th>
                  <th>Status</th>
                  <th>Tipo</th>
                  <th>Extent Mgmt</th>
                  <th style="text-align: right;">Total (MB)</th>
                  <th style="text-align: right;">Used (MB)</th>
                  <th style="text-align: right;">Free (MB)</th>
                  <th style="width: 140px;">% Used</th>
                  <th style="text-align: center;">Datafiles</th>
                </tr>
              </thead>
              <tbody>
                ${dbTablespaces.map(ts => {
                  const pct = Math.min(100, Math.max(0, parseFloat(ts.pctUsed || 0)));
                  let barClass = 'green';
                  if (pct >= 85) barClass = 'red';
                  else if (pct >= 70) barClass = 'amber';

                  return `
                    <tr>
                      <td style="font-weight: 700; color: #0f172a;">${ts.tablespace}</td>
                      <td><span class="session-status-badge active">${ts.status}</span></td>
                      <td style="color: #64748b;">${ts.contents || 'PERMANENT'}</td>
                      <td style="font-size: 10px;">${ts.extentMgmt || 'LOCAL'}</td>
                      <td style="text-align: right;">${(ts.totalMb || 0).toLocaleString()} MB</td>
                      <td style="text-align: right; font-weight: 600;">${(ts.usedMb || 0).toLocaleString()} MB</td>
                      <td style="text-align: right; color: #059669;">${(ts.freeMb || 0).toLocaleString()} MB</td>
                      <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <div class="ts-progress-track">
                            <div class="ts-progress-fill ${barClass}" style="width: ${pct}%;"></div>
                          </div>
                          <span style="font-size: 10px; font-weight: 700; width: 36px; text-align: right;">${pct}%</span>
                        </div>
                      </td>
                      <td style="text-align: center; font-weight: 600;">${ts.datafiles || 1}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <!-- Section: All Temp / Sort Segments Usage Across Sessions -->
            <div class="ts-section-title" style="margin-top: 14px;">
              <span>⚡ Segmentos Temporários de Ordenação Ativos em Todas as Sessões (V$SORT_USAGE)</span>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">Sort &amp; Hash Extents em Tablespaces Temporárias</span>
            </div>
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th>Sessão</th>
                  <th>Username</th>
                  <th>Tablespace</th>
                  <th>Tipo de Segmento</th>
                  <th>Extents</th>
                  <th>Blocks</th>
                  <th>Espaço Alocado (MB)</th>
                  <th>SQL ID</th>
                </tr>
              </thead>
              <tbody>
                ${(ov.allTempSortUsage && ov.allTempSortUsage.length > 0) ? ov.allTempSortUsage.map(t => `
                  <tr>
                    <td>
                      <span class="sid-drilldown-link" onclick="window.TracesApp.sessionMonitor.selectSession(${t.sid}, 0)">
                        SID ${t.sid}
                      </span>
                    </td>
                    <td style="font-weight: 600; color: #0284c7;">${t.username}</td>
                    <td style="font-weight: 700;">${t.tablespace}</td>
                    <td><span class="session-status-badge active">${t.segType}</span></td>
                    <td>${t.extents}</td>
                    <td>${t.blocks}</td>
                    <td style="font-weight: 700; color: #0f172a;">${t.mbUsed} MB</td>
                    <td style="font-family: var(--toad-font-code); color: #0284c7;">${t.sqlId || '-'}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="8" style="padding: 12px; text-align: center; color: #059669; font-size: 11px;">
                      ✔ Nenhum segmento temporário ativo ou retenção de sort extents no momento na instância.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>

            ${(!isOverview && s) ? `
              <!-- Section: Specific User Quotas & Schema Allocation -->
              <div class="ts-section-title" style="margin-top: 14px;">
                <span>📊 Cotas e Alocação do Schema da Sessão (${userTs.username || s.username || 'HR'})</span>
                <span style="font-size: 10px; font-weight: normal; color: #64748b;">DBA_SEGMENTS &amp; DBA_USERS</span>
              </div>
              <div class="ts-cards-summary-row" style="margin-bottom: 8px;">
                <div class="ts-summary-card"><span class="ts-card-label">Default Tablespace</span><span class="ts-card-value">${userTs.defaultTablespace || 'USERS'}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Temporary Tablespace</span><span class="ts-card-value">${userTs.temporaryTablespace || 'TEMP'}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Status da Conta</span><span class="ts-card-value" style="color: #059669;">${userTs.accountStatus || 'OPEN'}</span></div>
              </div>
            ` : ''}

          </div>

          <!-- TAB 3: SESSION WAITS -->
          <div style="display: ${this.currentDetailTab === 'waits' ? 'block' : 'none'};">
            
            <div class="master-overview-banner">
              <div>
                <div class="master-overview-title">⏳ Top Wait Events da Instância &amp; Sessões em Espera (V$SYSTEM_EVENT / V$SESSION_WAIT)</div>
                <div class="master-overview-subtitle">Contenções ativas de I/O, rede, locks e tempos de espera acumulados.</div>
              </div>
            </div>

            <div class="master-kpi-grid">
              <div class="ts-summary-card">
                <span class="ts-card-label">Top Wait Event</span>
                <span class="ts-card-value" style="color: #ea580c; font-size: 12px;">${ov.allWaits[0]?.event || 'None'}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Sessões em Espera Ativa</span>
                <span class="ts-card-value" style="color: #0284c7;">${ov.activeSessionWaits.length}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Tempo Total Esperado</span>
                <span class="ts-card-value">${(ov.allWaits[0]?.timeWaitedMs || 0).toLocaleString()} ms</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Média de Espera</span>
                <span class="ts-card-value" style="color: #059669;">${ov.allWaits[0]?.avgWaitMs || 0} ms</span>
              </div>
            </div>

            <!-- Active Sessions Waits Table -->
            <div class="ts-section-title">
              <span>Sessões Atualmente em Espera no Banco de Dados (V$SESSION_WAIT)</span>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">${ov.activeSessionWaits.length} sessões</span>
            </div>
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th>SID</th>
                  <th>Username</th>
                  <th>Machine / Host</th>
                  <th>Wait Event</th>
                  <th>Segundos em Espera</th>
                  <th>Estado</th>
                  <th>Parâmetros (P1, P2)</th>
                </tr>
              </thead>
              <tbody>
                ${ov.activeSessionWaits.length > 0 ? ov.activeSessionWaits.map(w => `
                  <tr>
                    <td>
                      <span class="sid-drilldown-link" onclick="window.TracesApp.sessionMonitor.selectSession(${w.sid}, ${w.serial || 0})">
                        SID ${w.sid}
                      </span>
                    </td>
                    <td style="font-weight: 600; color: #0284c7;">${w.username}</td>
                    <td style="color: #64748b;">${w.machine || '-'}</td>
                    <td style="font-weight: 700; color: #b91c1c;">${w.event}</td>
                    <td style="font-weight: 700; color: ${w.secondsInWait > 10 ? '#dc2626' : '#0f172a'};">${w.secondsInWait}s</td>
                    <td><span class="session-status-badge ${w.secondsInWait > 10 ? 'blocked' : 'active'}">${w.state}</span></td>
                    <td style="font-size: 10px; color: #64748b;">${w.p1Text || 'P1'}: ${w.p1 || 0}, ${w.p2Text || 'P2'}: ${w.p2 || 0}</td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="7" style="padding: 12px; text-align: center; color: #059669;">✔ Nenhuma sessão em contenção de espera no momento.</td></tr>
                `}
              </tbody>
            </table>

            <!-- Top Non-Idle Wait Events in DB -->
            <div class="ts-section-title" style="margin-top: 14px;">
              <span>Top Wait Events Acumulados da Instância (V$SYSTEM_EVENT - Non-Idle)</span>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">Tempo Total Acumulado</span>
            </div>
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th>Wait Event</th>
                  <th>Classe de Espera</th>
                  <th style="text-align: right;">Total de Esperas</th>
                  <th style="text-align: right;">Tempo Total (ms)</th>
                  <th style="text-align: right;">Média por Espera (ms)</th>
                </tr>
              </thead>
              <tbody>
                ${ov.allWaits.map(w => `
                  <tr>
                    <td style="font-weight: 700; color: #b91c1c;">${w.event}</td>
                    <td><span class="session-status-badge active">${w.waitClass}</span></td>
                    <td style="text-align: right;">${(w.totalWaits || 0).toLocaleString()}</td>
                    <td style="text-align: right; font-weight: 700;">${(w.timeWaitedMs || 0).toLocaleString()} ms</td>
                    <td style="text-align: right; color: #0284c7; font-weight: 600;">${w.avgWaitMs} ms</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- TAB 4: LOCKS HELD -->
          <div style="display: ${this.currentDetailTab === 'locks' ? 'block' : 'none'};">
            
            <div class="master-overview-banner">
              <div>
                <div class="master-overview-title">🔒 Todos os Bloqueios e Objetos Retidos no Banco de Dados (V$LOCKED_OBJECT / V$LOCK)</div>
                <div class="master-overview-subtitle">Lista abrangente de transações retendo locks em tabelas e partições em toda a base.</div>
              </div>
            </div>

            <div class="master-kpi-grid">
              <div class="ts-summary-card">
                <span class="ts-card-label">Objetos com Lock</span>
                <span class="ts-card-value" style="color: #dc2626;">${ov.allLocks.length}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Locks Exclusivos</span>
                <span class="ts-card-value" style="color: #b91c1c;">${ov.allLocks.filter(l => l.lockMode.includes('Exclusive')).length}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Sessões Bloqueadoras</span>
                <span class="ts-card-value" style="color: #ea580c;">${blockers.length}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Status de Contenção</span>
                <span class="ts-card-value" style="color: ${blockers.length > 0 ? '#dc2626' : '#059669'};">${blockers.length > 0 ? 'CONTENÇÃO DETECTADA' : 'NORMAL'}</span>
              </div>
            </div>

            <!-- All Database Locks Table -->
            <div class="ts-section-title">
              <span>Lista de Locks Ativos em Todo o Banco de Dados</span>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">${ov.allLocks.length} locks registrados</span>
            </div>
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th>Sessão</th>
                  <th>Username</th>
                  <th>OS User</th>
                  <th>Machine</th>
                  <th>Object Owner</th>
                  <th>Object Name</th>
                  <th>Object Type</th>
                  <th>Lock Mode</th>
                  <th style="text-align: center;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${ov.allLocks.length > 0 ? ov.allLocks.map(lk => `
                  <tr>
                    <td>
                      <span class="sid-drilldown-link" onclick="window.TracesApp.sessionMonitor.selectSession(${lk.sid}, ${lk.serial || 0})">
                        SID ${lk.sid}
                      </span>
                    </td>
                    <td style="font-weight: 600; color: #0284c7;">${lk.username}</td>
                    <td>${lk.osuser || '-'}</td>
                    <td style="color: #64748b;">${lk.machine || '-'}</td>
                    <td>${lk.owner}</td>
                    <td style="font-weight: 700; color: #0f172a;">${lk.objectName}</td>
                    <td><span class="session-status-badge active">${lk.objectType}</span></td>
                    <td style="color: #b91c1c; font-weight: 700;">${lk.lockMode}</td>
                    <td style="text-align: center;">
                      <button class="btn btn-danger" style="height: 20px; font-size: 9px; padding: 0 6px; font-weight: 700;" onclick="window.TracesApp.sessionMonitor.killSession(${lk.sid}, ${lk.serial || 0})">
                        ⚡ Kill SID ${lk.sid}
                      </button>
                    </td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="9" style="padding: 16px; text-align: center; color: #059669; font-size: 11px;">✔ Nenhum lock retido em objetos no banco de dados.</td></tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- TAB 5: LOCK TREE (HIERARQUIA DE BLOQUEIOS) -->
          <div style="display: ${this.currentDetailTab === 'locktree' ? 'block' : 'none'};">
            <div class="master-overview-banner">
              <div>
                <div class="master-overview-title">🌳 Árvore Completa de Bloqueios e Deadlocks da Instância (Lock Tree)</div>
                <div class="master-overview-subtitle">Identificação automática de sessões raiz bloqueadoras e dependências em cascata.</div>
              </div>
            </div>

            ${blockers.length === 0 ? `
              <div style="padding: 24px; text-align: center; color: #059669; font-size: 12px; font-weight: 600;">
                ✔ Nenhuma contenção de lock ou sessão bloqueada na instância no momento.
              </div>
            ` : `
              <div class="lock-tree-in-tab">
                <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
                  Sessões bloqueadoras raízes e sessões em fila de espera (V$LOCK / V$SESSION):
                </div>
                ${blockers.map(b => `
                  <div class="lock-node ${b.blockingSession ? 'root-blocker' : 'waiting-session'}">
                    <span style="background: ${b.blockingSession ? '#ef4444' : '#f59e0b'}; color: #fff; font-size: 9px; padding: 2px 6px; border-radius: 3px; font-weight: 700;">
                      ${b.blockingSession ? 'ROOT BLOCKER' : 'WAITING ON LOCK'}
                    </span>
                    <span style="font-size: 11px;">
                      SID: <strong class="sid-drilldown-link" onclick="window.TracesApp.sessionMonitor.selectSession(${b.sid}, ${b.serial})">${b.sid}</strong>, Serial: <strong>${b.serial}</strong> | User: <strong style="color: #0284c7;">${b.username}</strong> | Machine: ${b.machine}
                    </span>
                    <span style="color: #64748b; font-size: 10px; margin-left: auto;">
                      Wait Event: <strong>${b.event || 'enq: TX lock'}</strong>
                    </span>
                    <button class="btn btn-danger" style="height: 22px; padding: 0 8px; font-size: 10px; font-weight: 700;" onclick="window.TracesApp.sessionMonitor.killSession(${b.sid}, ${b.serial})">
                      ⚡ Kill (SID ${b.sid})
                    </button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- TAB 6: OPEN CURSORS -->
          <div style="display: ${this.currentDetailTab === 'cursors' ? 'block' : 'none'};">
            
            <div class="master-overview-banner">
              <div>
                <div class="master-overview-title">📑 Todos os Cursors Abertos na Instância Oracle (V$OPEN_CURSOR)</div>
                <div class="master-overview-subtitle">Monitoramento de cursores abertos por todas as sessões para prevenir ORA-01000.</div>
              </div>
            </div>

            <div class="master-kpi-grid">
              <div class="ts-summary-card">
                <span class="ts-card-label">Total de Cursors Abertos</span>
                <span class="ts-card-value">${(ov.allCursors || []).length}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Limite OPEN_CURSORS</span>
                <span class="ts-card-value" style="color: #0284c7;">1000</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Sessões com Cursors</span>
                <span class="ts-card-value" style="color: #059669;">${new Set((ov.allCursors || []).map(c => c.sid)).size}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Maior Quantidade</span>
                <span class="ts-card-value" style="color: #ea580c;">SALES_ADMIN</span>
              </div>
            </div>

            <div class="ts-section-title">
              <span>Cursores Abertos Registrados na Instância</span>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">V$OPEN_CURSOR</span>
            </div>
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th style="width: 80px;">Sessão</th>
                  <th style="width: 120px;">User</th>
                  <th style="width: 130px;">SQL ID</th>
                  <th>Declaração SQL do Cursor</th>
                  <th style="width: 70px; text-align: center;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${(ov.allCursors && ov.allCursors.length > 0) ? ov.allCursors.map(c => `
                  <tr>
                    <td>
                      <span class="sid-drilldown-link" onclick="window.TracesApp.sessionMonitor.selectSession(${c.sid}, 0)">
                        SID ${c.sid}
                      </span>
                    </td>
                    <td style="font-weight: 600;">${c.user}</td>
                    <td style="font-family: var(--toad-font-code); color: #0284c7; font-weight: 700;">${c.sqlId || '-'}</td>
                    <td style="font-family: var(--toad-font-code); font-size: 11px; white-space: pre-wrap; color: #0f172a;">${this.escapeHtml(c.sqlText)}</td>
                    <td style="text-align: center;">
                      <button class="btn btn-secondary" style="height: 20px; font-size: 9px; padding: 0 6px;" onclick="navigator.clipboard.writeText(\`${this.escapeHtml(c.sqlText)}\`); window.TracesApp.notify('SQL copiado!', 'info');">
                        📋 Copiar
                      </button>
                    </td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="5" style="padding: 16px; text-align: center; color: #64748b;">Nenhum cursor aberto registrado em V$OPEN_CURSOR.</td></tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- TAB 7: UNDO & TRANSACTIONS -->
          <div style="display: ${this.currentDetailTab === 'transactions' ? 'block' : 'none'};">
            
            <div class="master-overview-banner">
              <div>
                <div class="master-overview-title">💳 Todas as Transações Ativas e Consumo de Undo na Instância (V$TRANSACTION)</div>
                <div class="master-overview-subtitle">Controle de blocos de Rollback/Undo ocupados por todas as sessões em execução.</div>
              </div>
            </div>

            <div class="master-kpi-grid">
              <div class="ts-summary-card">
                <span class="ts-card-label">Transações Ativas</span>
                <span class="ts-card-value" style="color: #0284c7;">${ov.allTransactions.length}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Blocos de Undo em Uso</span>
                <span class="ts-card-value" style="color: #b91c1c;">${ov.allTransactions.reduce((acc, t) => acc + (t.usedUblk || 0), 0)} blks</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Registros de Undo</span>
                <span class="ts-card-value">${ov.allTransactions.reduce((acc, t) => acc + (t.usedUrec || 0), 0)} recs</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Tablespace Undo</span>
                <span class="ts-card-value" style="color: #059669;">UNDOTBS1</span>
              </div>
            </div>

            <div class="ts-section-title">
              <span>Lista de Transações Ativas em Toda a Base</span>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">V$TRANSACTION</span>
            </div>
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th>Sessão</th>
                  <th>Username</th>
                  <th>Machine</th>
                  <th>Transaction ID (XID)</th>
                  <th>Undo Blocks</th>
                  <th>Undo Records</th>
                  <th>Hora Início</th>
                  <th>Status</th>
                  <th style="text-align: center;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${ov.allTransactions.length > 0 ? ov.allTransactions.map(tx => `
                  <tr>
                    <td>
                      <span class="sid-drilldown-link" onclick="window.TracesApp.sessionMonitor.selectSession(${tx.sid}, ${tx.serial || 0})">
                        SID ${tx.sid}
                      </span>
                    </td>
                    <td style="font-weight: 600; color: #0284c7;">${tx.username}</td>
                    <td style="color: #64748b;">${tx.machine || '-'}</td>
                    <td style="font-weight: 700; font-family: var(--toad-font-code); color: #0284c7;">${tx.xid}</td>
                    <td style="font-weight: 700; color: #b91c1c;">${tx.usedUblk || 0} blks</td>
                    <td>${tx.usedUrec || 0} recs</td>
                    <td>${tx.startTime || '-'}</td>
                    <td><span class="session-status-badge active">${tx.status || 'ACTIVE'}</span></td>
                    <td style="text-align: center;">
                      <button class="btn btn-danger" style="height: 20px; font-size: 9px; padding: 0 6px; font-weight: 700;" onclick="window.TracesApp.sessionMonitor.killSession(${tx.sid}, ${tx.serial || 0})">
                        ⚡ Kill SID ${tx.sid}
                      </button>
                    </td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="9" style="padding: 16px; text-align: center; color: #059669; font-size: 11px;">✔ Nenhuma transação ativa aberta no momento no banco de dados.</td></tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- TAB 8: I/O & MEMORY -->
          <div style="display: ${this.currentDetailTab === 'io' ? 'block' : 'none'};">
            
            <div class="master-overview-banner">
              <div>
                <div class="master-overview-title">⚡ Top Consumidores de I/O e Memória PGA da Instância (V$SESS_IO / V$PROCESS)</div>
                <div class="master-overview-subtitle">Ranking ordenado por leituras físicas, buffer gets lógicos e alocação de memória privada PGA.</div>
              </div>
            </div>

            <div class="master-kpi-grid">
              <div class="ts-summary-card">
                <span class="ts-card-label">Total Leituras Físicas</span>
                <span class="ts-card-value" style="color: #0284c7;">${ov.allTopIo.reduce((acc, x) => acc + (x.physicalReads || 0), 0).toLocaleString()}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Total Consistent Gets</span>
                <span class="ts-card-value">${ov.allTopIo.reduce((acc, x) => acc + (x.consistentGets || 0), 0).toLocaleString()}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Total Memória PGA</span>
                <span class="ts-card-value" style="color: #059669;">${ov.allTopIo.reduce((acc, x) => acc + (x.pgaMb || 0), 0).toFixed(1)} MB</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Top Consumidor de I/O</span>
                <span class="ts-card-value" style="color: #ea580c;">SID ${ov.allTopIo[0]?.sid || '-'} (${ov.allTopIo[0]?.username || '-'})</span>
              </div>
            </div>

            <div class="ts-section-title">
              <span>Ranking de I/O e Memória de Todas as Sessões</span>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">Ordenado por Leituras Físicas + Consistent Gets</span>
            </div>
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th>Sessão</th>
                  <th>Username</th>
                  <th>Programa</th>
                  <th style="text-align: right;">Physical Reads</th>
                  <th style="text-align: right;">Consistent Gets</th>
                  <th style="text-align: right;">Block Gets</th>
                  <th style="text-align: right;">Block Changes</th>
                  <th style="text-align: right;">Memória PGA (MB)</th>
                  <th style="text-align: center;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${ov.allTopIo.map(item => `
                  <tr>
                    <td>
                      <span class="sid-drilldown-link" onclick="window.TracesApp.sessionMonitor.selectSession(${item.sid}, ${item.serial || 0})">
                        SID ${item.sid}
                      </span>
                    </td>
                    <td style="font-weight: 600; color: #0284c7;">${item.username}</td>
                    <td style="font-size: 11px;">${item.program || '-'}</td>
                    <td style="text-align: right; font-weight: 700; color: #0284c7;">${(item.physicalReads || 0).toLocaleString()}</td>
                    <td style="text-align: right;">${(item.consistentGets || 0).toLocaleString()}</td>
                    <td style="text-align: right;">${(item.blockGets || 0).toLocaleString()}</td>
                    <td style="text-align: right;">${(item.blockChanges || 0).toLocaleString()}</td>
                    <td style="text-align: right; font-weight: 700; color: #059669;">${item.pgaMb || 0} MB</td>
                    <td style="text-align: center;">
                      <button class="btn btn-danger" style="height: 20px; font-size: 9px; padding: 0 6px;" onclick="window.TracesApp.sessionMonitor.killSession(${item.sid}, ${item.serial || 0})">
                        ⚡ Kill
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- TAB 9: SESSION INFO -->
          <div style="display: ${this.currentDetailTab === 'info' ? 'block' : 'none'};">
            ${isOverview ? `
              <div class="master-overview-banner">
                <div>
                  <div class="master-overview-title">📊 Visão Geral da Instância Oracle &amp; Diagnóstico Global</div>
                  <div class="master-overview-subtitle">Informações estruturais do banco de dados, versão, alocação de memória e processos.</div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; font-size: 11px;">
                <div class="ts-summary-card"><span class="ts-card-label">Instância / Host</span><span class="ts-card-value">${window.TRACES_DB?.connections[0]?.name || 'PROD-RAC01'}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Versão do Banco</span><span class="ts-card-value" style="font-size: 11px;">${window.TRACES_DB?.connections[0]?.version || 'Oracle Database 23ai / 19c Enterprise'}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Uptime</span><span class="ts-card-value" style="color: #059669;">${window.TRACES_DB?.connections[0]?.uptime || '42 days, 18 hours'}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Buffer Cache Hit Ratio</span><span class="ts-card-value" style="color: #0284c7;">${this.metrics.bufferCacheHitRatio}%</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Library Cache Hit Ratio</span><span class="ts-card-value" style="color: #0284c7;">${this.metrics.libraryCacheHitRatio}%</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Redo Log Switches</span><span class="ts-card-value">${this.metrics.redoLogSwitchesPerHour} / hora</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Sessões Conectadas / Ativas</span><span class="ts-card-value">${this.sessions.length} total (${this.sessions.filter(x => x.status === 'ACTIVE').length} ativas)</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Memória PGA Agregada</span><span class="ts-card-value" style="color: #059669;">${this.metrics.pgaTotalMb || 1420} MB</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">SGA Target</span><span class="ts-card-value">16 GB</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">PGA Target</span><span class="ts-card-value">4 GB</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Tamanho do Bloco DB</span><span class="ts-card-value">8192 bytes</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Nós RAC Ativos</span><span class="ts-card-value">4 nós</span></div>
              </div>
            ` : `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; font-size: 11px;">
                <div class="ts-summary-card"><span class="ts-card-label">SID / Serial#</span><span class="ts-card-value">${s.sid}, ${s.serial}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Status</span><span class="ts-card-value">${s.status}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Database Username</span><span class="ts-card-value" style="color: #0284c7;">${s.username || 'BACKGROUND'}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">OS User</span><span class="ts-card-value">${s.osuser || info.osuser || '-'}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Machine / Host</span><span class="ts-card-value">${s.machine || info.machine || '-'}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Client Program</span><span class="ts-card-value">${s.program || info.program || '-'}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Module / Action</span><span class="ts-card-value">${s.module || info.module || '-'} (${s.action || info.action || 'None'})</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Client Info</span><span class="ts-card-value">${info.clientInfo || '-'}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Server Connection Type</span><span class="ts-card-value">${info.server || 'DEDICATED'}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Logon Time</span><span class="ts-card-value">${s.logonTime || info.logonTime || '-'}</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Last Call Elapsed Time</span><span class="ts-card-value">${s.lastCallEt || 0}s</span></div>
                <div class="ts-summary-card"><span class="ts-card-label">Oracle Process SPID</span><span class="ts-card-value">${s.spid || info.spid || '-'}</span></div>
              </div>
            `}
          </div>

        </div>
      </div>
    `;
  }

  async killSession(sid, serial, mode = 'IMMEDIATE') {
    const ok = confirm(`Deseja encerrar a Sessão Oracle?\nALTER SYSTEM ${mode === 'POST_TRANSACTION' ? 'DISCONNECT' : 'KILL'} SESSION '${sid},${serial}' ${mode};`);
    if (!ok) return;

    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const resp = await fetch('/api/kill-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sid, serial, mode })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro ao finalizar sessão: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`Sessão ${sid},${serial} encerrada com sucesso no Oracle.`, 'success');
          this.detailsCache.delete(sid);
          await this.refresh();
        }
      } catch (e) {
        window.TracesApp.notify(`Erro de comunicação: ${e.message}`, 'error');
      }
      return;
    }

    // Local mock removal
    const idx = this.sessions.findIndex(s => s.sid === sid);
    if (idx !== -1) {
      this.sessions.splice(idx, 1);
    }
    this.detailsCache.delete(sid);
    if (this.selectedSid === sid) {
      this.selectedSid = this.sessions.length > 0 ? this.sessions[0].sid : null;
      this.selectedSerial = this.sessions.length > 0 ? this.sessions[0].serial : null;
      this.sessionDetails = this.getMockSessionDetails(this.selectedSid);
    }
    this.render();
    window.TracesApp.notify(`ALTER SYSTEM KILL SESSION '${sid},${serial}' IMMEDIATE executado com sucesso (Modo Local).`, 'success');
  }

  killCurrentSession(mode = 'IMMEDIATE') {
    const s = this.sessions.find(x => x.sid === this.selectedSid) || this.sessions[0];
    if (!s) return;
    this.killSession(s.sid, s.serial, mode);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.SessionMonitor = SessionMonitor;
