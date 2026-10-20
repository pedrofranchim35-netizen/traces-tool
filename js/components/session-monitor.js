/* ==========================================================================
   SESSION BROWSER & INSTANCE MONITOR COMPONENT - TOAD FOR ORACLE 1:1
   Implements all 12 native Toad filters (TOAD_SESSBROWFILTERS.INI),
   live V$SESSION inspection, V$SQL current statement, V$SESSION_WAIT,
   V$LOCKED_OBJECT, V$SESS_IO, and ALTER SYSTEM KILL SESSION.
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
    this.selectedSid = null;
    this.selectedSerial = null;
    this.currentFilter = 'filter9'; // Default: STATUS - ACTIVE
    this.autoRefreshInterval = 5; // seconds
    this.autoRefreshTimer = null;
    this.currentDetailTab = 'sql'; // 'sql' | 'waits' | 'locks' | 'io' | 'info'
    this.sessionDetails = null;

    this.initElements();
    this.bindEvents();
    this.render();
    this.setupAutoRefresh();
  }

  initElements() {
    this.tableBody = document.getElementById('session-table-body');
    this.lockTreeContent = document.getElementById('lock-tree-content');
    this.detailPane = document.getElementById('session-detail-inspector');
    this.filterSelect = document.getElementById('session-native-filter-select');
    this.autoRefreshSelect = document.getElementById('session-autorefresh-select');
  }

  bindEvents() {
    // Already bound via inline handlers or element listeners
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

  onFilterChanged(filterId) {
    this.currentFilter = filterId;
    this.refresh();
  }

  async refresh(isSilent = false) {
    if (!window.TracesApp || !window.TracesApp.isConnected()) {
      if (!isSilent) window.TracesApp?.notify('Desconectado. Conecte-se a um banco de dados para monitorar sessões.', 'warning');
      this.render();
      return;
    }

    await this.loadRealSessions();
    if (!isSilent) window.TracesApp.notify('Sessões atualizadas ao vivo do Oracle.', 'info');
  }

  async loadRealSessions() {
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/sessions?filter=${encodeURIComponent(this.currentFilter)}${connParam}`);
      const data = await resp.json();
      if (data.os && window.TracesApp?.setServerOs) {
        window.TracesApp.setServerOs(data.os);
      }
      if (data.success !== false && data.sessions) {
        this.sessions = data.sessions;
        this.locks = data.locks || [];
        
        // Auto-select first session if none selected or selected session gone
        if (!this.selectedSid || !this.sessions.some(s => s.sid === this.selectedSid)) {
          if (this.sessions.length > 0) {
            this.selectedSid = this.sessions[0].sid;
            this.selectedSerial = this.sessions[0].serial;
            this.loadSessionDetails(this.selectedSid);
          } else {
            this.selectedSid = null;
            this.selectedSerial = null;
            this.sessionDetails = null;
          }
        } else if (this.selectedSid) {
          this.loadSessionDetails(this.selectedSid);
        }

        // Also refresh instance probe metrics
        try {
          const probeResp = await fetch(`/api/probe${connParam ? '?' + connParam.slice(1) : ''}`);
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
          // Ignore
        }

        this.render();
      }
    } catch (e) {
      console.warn('Real sessions fetch error', e);
    }
  }

  render() {
    if (!window.TracesApp || !window.TracesApp.isConnected()) {
      if (this.tableBody) {
        this.tableBody.innerHTML = `
          <tr>
            <td colspan="11" style="text-align: center; padding: 48px 16px; color: var(--text-muted); font-size: 11px;">
              <div style="font-size: 24px; margin-bottom: 8px;">🔌</div>
              <strong style="font-size: 12px; color: #1e293b;">Session Browser - Desconectado</strong><br><br>
              Esta ferramenta requer uma conexão ativa com o banco Oracle para inspecionar sessões (V$SESSION), locks (V$LOCKED_OBJECT) e wait events.<br>
              <button class="btn btn-primary" style="margin-top: 12px; padding: 4px 14px; font-weight: 600;" onclick="window.TracesApp.connectionManager.openModal();">
                ⚡ Conectar ao Banco de Dados...
              </button>
            </td>
          </tr>
        `;
      }
      if (this.lockTreeContent) {
        this.lockTreeContent.innerHTML = `<div style="padding: 16px; text-align: center; color: #888; font-size: 11px;">Desconectado do banco de dados.</div>`;
      }
      if (this.detailPane) {
        this.detailPane.innerHTML = `<div style="padding: 16px; text-align: center; color: #888; font-size: 11px;">Nenhuma sessão ativa inspecionada.</div>`;
      }
      return;
    }
    this.renderGauges();
    this.renderTable();
    this.renderLockTree();
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
            Nenhuma sessão encontrada para o filtro selecionado.
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
          <td style="font-weight: 700; color: ${isBlocking ? '#f87171' : 'var(--text-primary)'};">${s.sid}</td>
          <td style="color: var(--text-muted);">${s.serial}</td>
          <td>
            <span class="session-status-badge ${s.status.toLowerCase()} ${isBlocked ? 'blocked' : ''}">
              ${isBlocked ? 'WAIT LOCK' : s.status}
            </span>
          </td>
          <td style="font-weight: 600; color: #0078d7; font-family: var(--font-code);">${s.username || 'BACKGROUND'}</td>
          <td>${s.osuser || '-'}</td>
          <td style="color: var(--text-muted);">${s.machine || '-'}</td>
          <td style="font-size: 11px;">${s.program || '-'}</td>
          <td style="color: ${isBlocked ? '#f87171' : 'var(--text-secondary)'}; font-size: 10px; font-family: var(--font-code);">
            ${s.event || 'None'}
          </td>
          <td style="font-size: 11px;">${s.logonTime || '-'}</td>
          <td style="text-align: right; font-family: var(--font-code);">${s.pgaMb || 0} MB</td>
          <td>
            ${isBlocking ? '<span style="color: #ef4444; font-weight: 700;">BLOCKER</span>' : ''}
            ${isBlocked ? '<span style="color: #f59e0b; font-weight: 700;">WAITING ON LOCK</span>' : ''}
            ${!isBlocking && !isBlocked ? '-' : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  async selectSession(sid, serial) {
    this.selectedSid = sid;
    this.selectedSerial = serial;
    this.renderTable();

    if (window.TracesApp && window.TracesApp.isConnected()) {
      await this.loadSessionDetails(sid);
    } else {
      this.renderDetail();
    }
  }

  async loadSessionDetails(sid) {
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/session-details?sid=${sid}${connParam}`);
      const data = await resp.json();
      this.sessionDetails = data.details || data;
      this.renderDetail();
    } catch (e) {
      console.warn('Session details load error', e);
      this.renderDetail();
    }
  }

  renderLockTree() {
    if (!this.lockTreeContent) return;

    const blockers = this.sessions.filter(s => s.blockingSession !== null || (s.lockwait && s.lockwait !== ''));
    const locks = this.locks || [];

    if (blockers.length === 0 && locks.length === 0) {
      this.lockTreeContent.innerHTML = `
        <div style="padding: 16px; text-align: center; color: #15803d; font-size: 11px; font-weight: 600;">
          ✔ Nenhuma contenção de lock ou sessão bloqueada no momento (V$LOCKED_OBJECT / V$SESSION).
        </div>
      `;
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';

    if (blockers.length > 0) {
      html += blockers.map(b => `
        <div class="lock-node ${b.blockingSession ? 'root-blocker' : 'waiting-session'}">
          <span style="background: ${b.blockingSession ? 'var(--traces-red)' : '#f59e0b'}; color: #fff; font-size: 9px; padding: 2px 6px; border-radius: 3px; font-weight: 700;">
            ${b.blockingSession ? 'BLOCKER' : 'WAITING'}
          </span>
          <span>SID: <strong>${b.sid}</strong>, Serial: ${b.serial} | User: <strong>${b.username}</strong> | Machine: ${b.machine}</span>
          <span style="color: #64748b; font-size: 10px;">Wait Event: ${b.event}</span>
          <button class="btn btn-danger" style="height: 22px; padding: 0 8px; font-size: 10px;" onclick="window.TracesApp.sessionMonitor.killSession(${b.sid}, ${b.serial})">
            Kill (SID ${b.sid})
          </button>
        </div>
      `).join('');
    }

    if (locks.length > 0) {
      html += `
        <table class="meta-table" style="width: 100%; margin-top: 4px; font-size: 11px;">
          <thead>
            <tr>
              <th>SID</th>
              <th>Serial#</th>
              <th>User</th>
              <th>Program</th>
              <th>Object Locked</th>
              <th>Type</th>
              <th>Lock Mode</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${locks.map(lk => `
              <tr>
                <td style="font-weight: 700;">${lk.sid}</td>
                <td>${lk.serial || '-'}</td>
                <td style="color: #0078d7; font-weight: 600;">${lk.username}</td>
                <td>${lk.program}</td>
                <td style="font-family: var(--font-code); font-weight: 700;">${lk.owner}.${lk.objectName}</td>
                <td>${lk.objectType}</td>
                <td style="color: #b91c1c; font-weight: 700;">${lk.lockMode}</td>
                <td>
                  <button class="btn btn-danger" style="height: 20px; padding: 0 6px; font-size: 10px;" onclick="window.TracesApp.sessionMonitor.killSession(${lk.sid}, ${lk.serial || 0})">Kill</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    html += '</div>';
    this.lockTreeContent.innerHTML = html;
  }

  renderDetail() {
    const s = this.sessions.find(item => item.sid === this.selectedSid) || this.sessions[0];
    if (!s || !this.detailPane) return;

    const details = this.sessionDetails || {};
    const sqlObj = details.sql || {};
    const sqlText = sqlObj.sqlText || s.sqlText || '-- Nenhuma query SQL ativa no momento';
    const waits = details.waits || [];
    const locks = details.locks || [];
    const io = details.io || {};

    const osInfo = window.TracesApp?.getServerOs?.() || { os_type: 'linux', os_name: 'Linux' };
    const osKill = window.TracesApp?.getOsKillCommand?.(s.spid, s.sid) || {
      cmd: `kill -9 ${s.spid || s.sid}`,
      osType: 'linux',
      osName: 'Linux',
      debugCmd: `pstack ${s.spid || s.sid}`,
      explanation: 'Finalize o processo no SO caso o ALTER SYSTEM KILL SESSION fique preso em KILLED.'
    };
    const osIcon = osInfo.os_type === 'windows' ? '🪟' : osInfo.os_type === 'aix' ? '🟣' : '🐧';
    const osBadgeClass = osInfo.os_type === 'windows' ? 'os-windows' : osInfo.os_type === 'aix' ? 'os-aix' : 'os-linux';

    this.detailPane.innerHTML = `
      <div style="padding: 12px 16px; background: #fff; border-top: 1px solid var(--border-default); display: flex; flex-direction: column; gap: 10px;">
        
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-weight: 700; font-size: 13px; color: var(--text-primary);">
              Session Inspector: SID ${s.sid}, Serial# ${s.serial} (${s.username})
            </span>
            <span class="session-status-badge ${s.status.toLowerCase()}">${s.status}</span>
            <span class="toad-os-badge ${osBadgeClass}">${osIcon} Host: ${osInfo.os_name}</span>
            <span style="font-size: 11px; color: var(--text-muted);">SPID / Thread: <strong style="color: #4338ca; font-family: var(--font-code);">${s.spid || '-'}</strong> | OS: ${s.osuser} @ ${s.machine} | Program: ${s.program}</span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-danger" style="font-weight: 700;" onclick="window.TracesApp.sessionMonitor.killSession(${s.sid}, ${s.serial})">
              ⚡ Kill Session IMMEDIATE
            </button>
            <button class="btn" onclick="window.TracesApp.sessionMonitor.refresh()">
              🔄 Atualizar
            </button>
          </div>
        </div>

        <!-- OS-Adapted Kill & Diagnostic Box -->
        <div class="os-cmd-banner">
          <div class="os-cmd-row">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 13px;">${osIcon}</span>
              <span style="font-size: 11px; font-weight: 700; color: #f8fafc;">Comando SO Adaptado (${osKill.osName}):</span>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="os-cmd-copy-btn" onclick="navigator.clipboard.writeText('${osKill.cmd}'); window.TracesApp.notify('Comando SO copiado: ${osKill.cmd}', 'success');">
                📋 Copiar Kill SO
              </button>
              <button class="os-cmd-copy-btn" style="background:#475569; border-color:#64748b;" onclick="navigator.clipboard.writeText('${osKill.debugCmd}'); window.TracesApp.notify('Comando diagnóstico copiado: ${osKill.debugCmd}', 'info');">
                🔍 Copiar Diagnóstico
              </button>
            </div>
          </div>
          <div class="os-cmd-row">
            <code class="os-cmd-code">${osKill.cmd}</code>
          </div>
          <div class="os-cmd-hint">
            💡 ${osKill.explanation} Diagnóstico do processo: <code style="color:#cbd5e1;">${osKill.debugCmd}</code>
          </div>
        </div>

        <!-- Subtabs Bar -->
        <div class="detail-tabs-bar" style="border-bottom: 1px solid #bfbfbf; padding-bottom: 2px;">
          <button class="detail-tab ${this.currentDetailTab === 'sql' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('sql')">Current SQL (V$SQL)</button>
          <button class="detail-tab ${this.currentDetailTab === 'waits' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('waits')">Session Waits (V$SESSION_WAIT)</button>
          <button class="detail-tab ${this.currentDetailTab === 'locks' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('locks')">Locks (V$LOCKED_OBJECT)</button>
          <button class="detail-tab ${this.currentDetailTab === 'io' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('io')">I/O &amp; Memory (V$SESS_IO)</button>
          <button class="detail-tab ${this.currentDetailTab === 'info' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('info')">Session Info</button>
        </div>

        <!-- Subtab 1: Current SQL -->
        <div style="display: ${this.currentDetailTab === 'sql' ? 'block' : 'none'};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 11px;">
            <span>SQL ID: <strong style="font-family: var(--font-code); color: #0078d7;">${sqlObj.sqlId || s.sqlId || '-'}</strong></span>
            <span>Execuções: <strong>${sqlObj.executions || 1}</strong> | Buffer Gets: <strong>${sqlObj.bufferGets || 0}</strong> | Disk Reads: <strong>${sqlObj.diskReads || 0}</strong></span>
          </div>
          <div style="background: #1e1e1e; color: #38bdf8; border: 1px solid #333; border-radius: 3px; padding: 10px; font-family: var(--font-code); font-size: 11px; max-height: 140px; overflow-y: auto; white-space: pre-wrap; line-height: 1.4;">${this.escapeHtml(sqlText)}</div>
        </div>

        <!-- Subtab 2: Session Waits -->
        <div style="display: ${this.currentDetailTab === 'waits' ? 'block' : 'none'};">
          <table class="meta-table" style="width: 100%;">
            <thead>
              <tr>
                <th>Event</th>
                <th>State</th>
                <th>Wait Time</th>
                <th>Seconds in Wait</th>
                <th>P1 (Text)</th>
                <th>P2 (Text)</th>
              </tr>
            </thead>
            <tbody>
              ${waits.length > 0 ? waits.map(w => `
                <tr>
                  <td style="font-weight: 700; color: #c00000;">${w.event}</td>
                  <td>${w.state}</td>
                  <td>${w.waitTime}</td>
                  <td>${w.secondsInWait}s</td>
                  <td>${w.p1Text || '-'}: ${w.p1 || 0}</td>
                  <td>${w.p2Text || '-'}: ${w.p2 || 0}</td>
                </tr>
              `).join('') : `<tr><td colspan="6" style="padding: 16px; text-align: center; color: var(--text-muted);">Nenhum wait event crítico reportado.</td></tr>`}
            </tbody>
          </table>
        </div>

        <!-- Subtab 3: Locks -->
        <div style="display: ${this.currentDetailTab === 'locks' ? 'block' : 'none'};">
          <table class="meta-table" style="width: 100%;">
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
                  <td style="font-weight: 700; color: #0078d7;">${lk.objectName}</td>
                  <td>${lk.objectType}</td>
                  <td style="color: #c00000; font-weight: 700;">${lk.lockMode}</td>
                  <td>${lk.osUser}</td>
                </tr>
              `).join('') : `<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">Esta sessão não está retendo locks em objetos.</td></tr>`}
            </tbody>
          </table>
        </div>

        <!-- Subtab 4: I/O & Memory -->
        <div style="display: ${this.currentDetailTab === 'io' ? 'grid' : 'none'}; grid-template-columns: repeat(4, 1fr); gap: 10px;">
          <div class="advisor-card" style="padding: 8px;">
            <div class="metric-label">Block Gets</div>
            <div class="metric-value" style="font-size: 16px;">${(io.blockGets || 0).toLocaleString()}</div>
          </div>
          <div class="advisor-card" style="padding: 8px;">
            <div class="metric-label">Consistent Gets</div>
            <div class="metric-value" style="font-size: 16px;">${(io.consistentGets || 0).toLocaleString()}</div>
          </div>
          <div class="advisor-card" style="padding: 8px;">
            <div class="metric-label">Physical Reads</div>
            <div class="metric-value" style="font-size: 16px; color: #0078d7;">${(io.physicalReads || s.physicalReads || 0).toLocaleString()}</div>
          </div>
          <div class="advisor-card" style="padding: 8px;">
            <div class="metric-label">Block Changes</div>
            <div class="metric-value" style="font-size: 16px;">${(io.blockChanges || s.blockChanges || 0).toLocaleString()}</div>
          </div>
        </div>

        <!-- Subtab 5: Session Info -->
        <div style="display: ${this.currentDetailTab === 'info' ? 'grid' : 'none'}; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 11px;">
          <div><strong>Logon Time:</strong> ${s.logonTime || '-'}</div>
          <div><strong>Last Call ET:</strong> ${s.lastCallEt || 0}s</div>
          <div><strong>Module:</strong> ${s.module || '-'}</div>
          <div><strong>Client Program:</strong> ${s.program || '-'}</div>
          <div><strong>Process Memory (PGA):</strong> ${s.pgaMb || 0} MB</div>
          <div><strong>Wait Status:</strong> ${s.event || 'None'}</div>
        </div>

      </div>
    `;
  }

  switchSubtab(tabKey) {
    this.currentDetailTab = tabKey;
    this.renderDetail();
  }

  async killSession(sid, serial, mode = 'IMMEDIATE') {
    if (!window.TracesApp || !window.TracesApp.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se para gerenciar sessões.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    const ok = confirm(`Deseja encerrar a Sessão Oracle?\nALTER SYSTEM ${mode === 'POST_TRANSACTION' ? 'DISCONNECT' : 'KILL'} SESSION '${sid},${serial}' ${mode};`);
    if (!ok) return;

    if (window.TracesApp && window.TracesApp.isConnected()) {
      try {
        const activeConn = window.TracesApp?.connectionManager?.getActive?.();
        const resp = await fetch('/api/kill-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sid, serial, mode, conn_id: activeConn?.id })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro ao finalizar sessão: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`Sessão ${sid},${serial} encerrada com sucesso no Oracle.`, 'success');
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
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.SessionMonitor = SessionMonitor;
