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
    this.currentFilter = 'filter9'; // Default: STATUS - ACTIVE
    this.autoRefreshInterval = 5; // seconds
    this.autoRefreshTimer = null;
    this.currentDetailTab = 'sql'; // 'sql' | 'tablespaces' | 'waits' | 'locks' | 'locktree' | 'cursors' | 'transactions' | 'io' | 'info'
    this.detailsCache = new Map(); // sid -> { data, ts }
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

        this.renderTable();
        this.renderGauges();
        
        if (this.selectedSid) {
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

    if (this.sessions.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 11px;">
            Nenhuma sessão encontrada para o filtro selecionado (${this.currentFilter}).
          </td>
        </tr>
      `;
      return;
    }

    this.tableBody.innerHTML = this.sessions.map(s => {
      const isSelected = this.selectedSid === s.sid;
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
  }

  async selectSession(sid, serial) {
    this.selectedSid = sid;
    this.selectedSerial = serial;

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

  renderDetail() {
    const s = this.sessions.find(item => item.sid === this.selectedSid) || this.sessions[0];
    if (!s || !this.detailPane) return;

    const details = this.sessionDetails || this.getMockSessionDetails(s.sid);
    const sqlObj = details.sql || {};
    const sqlText = sqlObj.sqlText || s.sqlText || '-- Nenhuma instrução SQL ativa no momento para esta sessão.';
    const waits = details.waits || [];
    const locks = details.locks || [];
    const openCursors = details.openCursors || [];
    const transactions = details.transactions || [];
    const io = details.io || {};
    const info = details.info || {};
    const tsData = details.tablespaces || { tempUsage: [], userTablespaces: {}, userQuotas: [], databaseTablespaces: [] };
    const tempUsage = tsData.tempUsage || [];
    const userTs = tsData.userTablespaces || {};
    const userQuotas = tsData.userQuotas || [];
    const dbTablespaces = tsData.databaseTablespaces || [];

    // Check instance blockers count for tab badge
    const blockers = this.sessions.filter(b => b.blockingSession !== null || (b.lockwait && b.lockwait !== ''));

    this.detailPane.innerHTML = `
      <div class="toad-drawer-container">
        
        <!-- Header Drawer Strip -->
        <div class="toad-drawer-header">
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
          </div>
        </div>

        <!-- Classic TOAD Notebook Tabs Strip ("Abas / Gavetas") -->
        <div class="toad-drawer-tabs-strip">
          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'sql' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('sql')">
            <span>Current SQL</span>
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'tablespaces' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('tablespaces')">
            <span>💾 Tablespaces &amp; Temp</span>
            ${tempUsage.length > 0 ? `<span class="toad-drawer-tab-badge">${tempUsage.length}</span>` : ''}
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'waits' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('waits')">
            <span>Session Waits</span>
            ${waits.length > 0 ? `<span class="toad-drawer-tab-badge">${waits.length}</span>` : ''}
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'locks' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('locks')">
            <span>Locks Held</span>
            ${locks.length > 0 ? `<span class="toad-drawer-tab-badge danger">${locks.length}</span>` : ''}
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'locktree' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('locktree')">
            <span>🔒 Lock Tree</span>
            ${blockers.length > 0 ? `<span class="toad-drawer-tab-badge danger">${blockers.length}</span>` : ''}
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'cursors' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('cursors')">
            <span>Open Cursors</span>
            ${openCursors.length > 0 ? `<span class="toad-drawer-tab-badge">${openCursors.length}</span>` : ''}
          </button>

          <button class="toad-drawer-tab-btn ${this.currentDetailTab === 'transactions' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('transactions')">
            <span>Undo &amp; Transactions</span>
            ${transactions.length > 0 ? `<span class="toad-drawer-tab-badge">${transactions.length}</span>` : ''}
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
          
          <!-- TAB 1: CURRENT SQL -->
          <div style="display: ${this.currentDetailTab === 'sql' ? 'block' : 'none'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px;">
              <span>SQL ID: <strong style="font-family: var(--toad-font-code); color: #0284c7;">${sqlObj.sqlId || s.sqlId || '-'}</strong></span>
              <span style="color: #64748b;">
                Execuções: <strong>${sqlObj.executions || 1}</strong> | 
                Buffer Gets: <strong>${(sqlObj.bufferGets || 0).toLocaleString()}</strong> | 
                Disk Reads: <strong>${(sqlObj.diskReads || 0).toLocaleString()}</strong> | 
                CPU Time: <strong>${sqlObj.cpuTime ? sqlObj.cpuTime + 's' : '0.00s'}</strong> | 
                Elapsed: <strong>${sqlObj.elapsedTime ? sqlObj.elapsedTime + 's' : '0.00s'}</strong>
              </span>
            </div>
            <div style="background: #0f172a; color: #38bdf8; border: 1px solid #1e293b; border-radius: 6px; padding: 12px; font-family: var(--toad-font-code); font-size: 11px; max-height: 220px; overflow-y: auto; white-space: pre-wrap; line-height: 1.5; user-select: text;">${this.escapeHtml(sqlText)}</div>
          </div>

          <!-- TAB 2: TABLESPACES & TEMP (TOAD PARITY) -->
          <div style="display: ${this.currentDetailTab === 'tablespaces' ? 'block' : 'none'};">
            
            <!-- Summary Cards: User Schema Tablespace Mapping -->
            <div class="ts-cards-summary-row">
              <div class="ts-summary-card">
                <span class="ts-card-label">Schema Owner</span>
                <span class="ts-card-value" style="color: #0284c7;">${userTs.username || s.username || 'HR'}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Default Tablespace</span>
                <span class="ts-card-value">${userTs.defaultTablespace || 'USERS'}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Temporary Tablespace</span>
                <span class="ts-card-value">${userTs.temporaryTablespace || 'TEMP'}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Account Status</span>
                <span class="ts-card-value" style="color: #059669;">${userTs.accountStatus || 'OPEN'}</span>
              </div>
            </div>

            <!-- Section 1: Session Temp / Sort Usage -->
            <div class="ts-section-title">
              <span>⚡ Session Sort &amp; Temp Segments Allocation (V$SORT_USAGE / V$TEMPSEG_USAGE)</span>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">Temporary Tablespace Sort Extents</span>
            </div>
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th>Tablespace</th>
                  <th>Segment Type</th>
                  <th>Extents</th>
                  <th>Blocks</th>
                  <th>Allocated Space (MB)</th>
                  <th>SQL ID</th>
                </tr>
              </thead>
              <tbody>
                ${tempUsage.length > 0 ? tempUsage.map(t => `
                  <tr>
                    <td style="font-weight: 700; color: #0284c7;">${t.tablespace}</td>
                    <td><span class="session-status-badge active">${t.segType}</span></td>
                    <td>${t.extents}</td>
                    <td>${t.blocks}</td>
                    <td style="font-weight: 700; color: #0f172a;">${t.mbUsed} MB</td>
                    <td style="font-family: var(--toad-font-code); color: #0284c7;">${t.sqlId || '-'}</td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="6" style="padding: 10px; text-align: center; color: #059669; font-size: 11px;">
                      ✔ Nenhum segmento temporário ou de ordenação (sort/hash) ativo em tablespace temporário nesta sessão.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>

            <!-- Section 2: User Storage Quotas & Allocations -->
            <div class="ts-section-title">
              <span>📊 User Schema Storage &amp; Quota Consumption (DBA_SEGMENTS)</span>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">Allocated Segments by Schema Owner</span>
            </div>
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th>Tablespace Name</th>
                  <th>Total Allocated (MB)</th>
                  <th>Segments Count</th>
                  <th>Quota Status</th>
                </tr>
              </thead>
              <tbody>
                ${userQuotas.length > 0 ? userQuotas.map(q => `
                  <tr>
                    <td style="font-weight: 700;">${q.tablespace}</td>
                    <td style="font-weight: 700; color: #0284c7;">${(q.mbUsed || 0).toLocaleString()} MB</td>
                    <td>${q.segmentCount || 0}</td>
                    <td><span class="session-status-badge active">UNLIMITED / OK</span></td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="4" style="padding: 10px; text-align: center; color: #64748b; font-size: 11px;">
                      Nenhum segmento físico alocado diretamente para este usuário.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>

            <!-- Section 3: Database Tablespaces Health & Capacity -->
            <div class="ts-section-title">
              <span>💾 Database Tablespaces Capacity &amp; Storage Utilization (DBA_TABLESPACES)</span>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">Real-time Datafiles &amp; Free Space Monitor</span>
            </div>
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th>Tablespace</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Extent Mgmt</th>
                  <th style="text-align: right;">Total (MB)</th>
                  <th style="text-align: right;">Used (MB)</th>
                  <th style="text-align: right;">Free (MB)</th>
                  <th style="width: 140px;">% Used</th>
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
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

          </div>

          <!-- TAB 3: SESSION WAITS -->
          <div style="display: ${this.currentDetailTab === 'waits' ? 'block' : 'none'};">
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th>Wait Event</th>
                  <th>State</th>
                  <th>Wait Time</th>
                  <th>Seconds in Wait</th>
                  <th>P1 (Parameter 1)</th>
                  <th>P2 (Parameter 2)</th>
                  <th>P3 (Parameter 3)</th>
                </tr>
              </thead>
              <tbody>
                ${waits.length > 0 ? waits.map(w => `
                  <tr>
                    <td style="font-weight: 700; color: #b91c1c;">${w.event}</td>
                    <td>${w.state}</td>
                    <td>${w.waitTime}</td>
                    <td style="font-weight: 600;">${w.secondsInWait}s</td>
                    <td>${w.p1Text || 'P1'}: ${w.p1 || 0}</td>
                    <td>${w.p2Text || 'P2'}: ${w.p2 || 0}</td>
                    <td>${w.p3Text || 'P3'}: ${w.p3 || 0}</td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="7" style="padding: 16px; text-align: center; color: #059669; font-size: 11px;">✔ Nenhum wait event ativo reportado no momento para esta sessão.</td></tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- TAB 4: LOCKS HELD -->
          <div style="display: ${this.currentDetailTab === 'locks' ? 'block' : 'none'};">
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th>Object Owner</th>
                  <th>Object Name</th>
                  <th>Object Type</th>
                  <th>Lock Mode</th>
                  <th>OS User</th>
                </tr>
              </thead>
              <tbody>
                ${locks.length > 0 ? locks.map(lk => `
                  <tr>
                    <td>${lk.owner}</td>
                    <td style="font-weight: 700; color: #0284c7;">${lk.objectName}</td>
                    <td>${lk.objectType}</td>
                    <td style="color: #b91c1c; font-weight: 700;">${lk.lockMode}</td>
                    <td>${lk.osUser || '-'}</td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="5" style="padding: 16px; text-align: center; color: #64748b; font-size: 11px;">Esta sessão não está retendo locks em objetos no momento.</td></tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- TAB 5: LOCK TREE (HIERARQUIA DE BLOQUEIOS) -->
          <div style="display: ${this.currentDetailTab === 'locktree' ? 'block' : 'none'};">
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
                      SID: <strong>${b.sid}</strong>, Serial: <strong>${b.serial}</strong> | User: <strong style="color: #0284c7;">${b.username}</strong> | Machine: ${b.machine}
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
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th style="width: 140px;">SQL ID</th>
                  <th style="width: 140px;">Parsing User</th>
                  <th>Open Cursor SQL Statement</th>
                </tr>
              </thead>
              <tbody>
                ${openCursors.length > 0 ? openCursors.map(c => `
                  <tr>
                    <td style="font-family: var(--toad-font-code); color: #0284c7; font-weight: 700;">${c.sqlId || '-'}</td>
                    <td>${c.user || s.username}</td>
                    <td style="font-family: var(--toad-font-code); font-size: 11px; white-space: pre-wrap; color: #0f172a;">${this.escapeHtml(c.sqlText)}</td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="3" style="padding: 16px; text-align: center; color: #64748b; font-size: 11px;">Nenhum cursor aberto registrado em V$OPEN_CURSOR.</td></tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- TAB 7: UNDO & TRANSACTIONS -->
          <div style="display: ${this.currentDetailTab === 'transactions' ? 'block' : 'none'};">
            <table class="toad-grid-table">
              <thead>
                <tr>
                  <th>Transaction ID (XID)</th>
                  <th>Used Undo Blocks</th>
                  <th>Used Undo Records</th>
                  <th>Start Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.length > 0 ? transactions.map(tx => `
                  <tr>
                    <td style="font-weight: 700; font-family: var(--toad-font-code); color: #0284c7;">${tx.xid}</td>
                    <td style="font-weight: 700;">${tx.usedUblk || 0} blks</td>
                    <td>${tx.usedUrec || 0} recs</td>
                    <td>${tx.startTime || '-'}</td>
                    <td><span class="session-status-badge active">${tx.status || 'ACTIVE'}</span></td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="5" style="padding: 16px; text-align: center; color: #64748b; font-size: 11px;">Nenhuma transação ativa aberta (V$TRANSACTION) para esta sessão.</td></tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- TAB 8: I/O & MEMORY -->
          <div style="display: ${this.currentDetailTab === 'io' ? 'block' : 'none'};">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 12px;">
              <div class="ts-summary-card">
                <span class="ts-card-label">Block Gets</span>
                <span class="ts-card-value">${(io.blockGets || 0).toLocaleString()}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Consistent Gets</span>
                <span class="ts-card-value">${(io.consistentGets || 0).toLocaleString()}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Physical Reads</span>
                <span class="ts-card-value" style="color: #0284c7;">${(io.physicalReads || s.physicalReads || 0).toLocaleString()}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Block Changes</span>
                <span class="ts-card-value">${(io.blockChanges || s.blockChanges || 0).toLocaleString()}</span>
              </div>
              <div class="ts-summary-card">
                <span class="ts-card-label">Process Memory (PGA)</span>
                <span class="ts-card-value" style="color: #059669;">${s.pgaMb || 12.4} MB</span>
              </div>
            </div>
          </div>

          <!-- TAB 9: SESSION INFO -->
          <div style="display: ${this.currentDetailTab === 'info' ? 'block' : 'none'};">
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
