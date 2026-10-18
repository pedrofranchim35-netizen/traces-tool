/* ==========================================================================
   SESSION BROWSER & INSTANCE MONITOR COMPONENT
   ========================================================================== */

class SessionMonitor {
  constructor() {
    this.sessions = window.TRACES_DB.sessions;
    this.metrics = window.TRACES_DB.instanceMetrics;
    this.selectedSid = 312; // Pre-select blocking session

    this.initElements();
    this.bindEvents();
    this.render();
  }

  initElements() {
    this.tableBody = document.getElementById('session-table-body');
    this.lockTreeContent = document.getElementById('lock-tree-content');
    this.detailPane = document.getElementById('session-detail-inspector');
    this.filterActiveOnly = document.getElementById('filter-active-sessions');
  }

  bindEvents() {
    if (this.filterActiveOnly) {
      this.filterActiveOnly.addEventListener('click', (e) => {
        e.currentTarget.classList.toggle('active');
        this.renderTable();
      });
    }
  }

  async refresh() {
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      await this.loadRealSessions();
      window.TracesApp.notify('Sessões ativas do Oracle atualizadas.', 'info');
      return;
    }
    this.sessions = window.TRACES_DB.sessions;
    this.render();
    window.TracesApp.notify('Refreshed live Oracle sessions and lock trees.', 'info');
  }

  async loadRealSessions() {
    try {
      const resp = await fetch('/api/sessions');
      const data = await resp.json();
      if (data.sessions && data.sessions.length > 0) {
        this.sessions = data.sessions.map(s => ({
          sid: s.sid,
          serial: s.serial,
          username: s.username,
          status: s.status,
          osuser: s.osuser,
          machine: s.machine,
          program: s.program,
          sqlId: s.sql_id,
          blockingSession: null,
          logonTime: 'Active',
          sqlText: `SELECT * FROM v$session WHERE sid = ${s.sid}`
        }));
        this.render();
      }
    } catch (e) {
      console.warn('Real sessions fetch error', e);
    }
  }

  render() {
    this.renderGauges();
    this.renderTable();
    this.renderLockTree();
    this.renderDetail();
  }

  renderGauges() {
    // Gauge 1: Buffer Cache Hit Ratio
    const bufFill = document.getElementById('gauge-buf-fill');
    const bufVal = document.getElementById('gauge-buf-val');
    if (bufFill && bufVal) {
      const circ = 2 * Math.PI * 15; // r=15
      const offset = circ - (circ * (this.metrics.bufferCacheHitRatio / 100));
      bufFill.style.strokeDasharray = circ;
      bufFill.style.strokeDashoffset = offset;
      bufVal.textContent = `${this.metrics.bufferCacheHitRatio}%`;
    }

    // Gauge 2: Library Cache Hit Ratio
    const libFill = document.getElementById('gauge-lib-fill');
    const libVal = document.getElementById('gauge-lib-val');
    if (libFill && libVal) {
      const circ = 2 * Math.PI * 15;
      const offset = circ - (circ * (this.metrics.libraryCacheHitRatio / 100));
      libFill.style.strokeDasharray = circ;
      libFill.style.strokeDashoffset = offset;
      libVal.textContent = `${this.metrics.libraryCacheHitRatio}%`;
    }

    // Active Sessions & Redo
    const actVal = document.getElementById('gauge-act-val');
    if (actVal) actVal.textContent = `${this.metrics.activeSessionsCount} / ${this.metrics.totalSessionsCount}`;

    const redoVal = document.getElementById('gauge-redo-val');
    if (redoVal) redoVal.textContent = `${this.metrics.redoLogSwitchesPerHour} / hr`;
  }

  renderTable() {
    let list = this.sessions;
    const activeOnly = this.filterActiveOnly?.classList.contains('active');
    if (activeOnly) {
      list = list.filter(s => s.status === 'ACTIVE');
    }

    this.tableBody.innerHTML = list.map(s => {
      const isSelected = this.selectedSid === s.sid;
      const isBlocking = s.blocking !== null;
      const isBlocked = s.blockedBy !== null;

      let rowClass = '';
      if (isSelected) rowClass += ' selected';
      if (isBlocking) rowClass += ' blocking';

      return `
        <tr class="${rowClass}" onclick="window.TracesApp.sessionMonitor.selectSession(${s.sid})">
          <td style="font-weight: 700; color: ${isBlocking ? '#f87171' : 'var(--text-primary)'};">${s.sid}</td>
          <td style="color: var(--text-muted);">${s.serial}</td>
          <td>
            <span class="session-status-badge ${s.status.toLowerCase()} ${isBlocked ? 'blocked' : ''}">
              ${isBlocked ? 'BLOCKED' : s.status}
            </span>
          </td>
          <td style="font-weight: 600; color: #38bdf8;">${s.username || 'BACKGROUND'}</td>
          <td>${s.osuser}</td>
          <td style="color: var(--text-muted);">${s.machine}</td>
          <td>${s.program}</td>
          <td style="color: ${isBlocked ? '#f87171' : 'var(--text-secondary)'}; font-size: 10px;">
            ${s.event || 'None'}
          </td>
          <td>${s.logonTime}</td>
          <td style="text-align: right;">${s.pgaMb} MB</td>
          <td>
            ${isBlocking ? '<span style="color: #ef4444; font-weight: 700;">BLOCKING SID ' + s.blocking + '</span>' : ''}
            ${isBlocked ? '<span style="color: #f59e0b; font-weight: 700;">WAITING ON ' + s.blockedBy + '</span>' : ''}
            ${!isBlocking && !isBlocked ? '-' : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  selectSession(sid) {
    this.selectedSid = sid;
    this.renderTable();
    this.renderDetail();
  }

  renderLockTree() {
    this.lockTreeContent.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div class="lock-node root-blocker">
          <span style="background: var(--traces-red); color: #fff; font-size: 9px; padding: 2px 6px; border-radius: 3px; font-weight: 700;">BLOCKER</span>
          <span>SID: 312 | Serial: 44018 | User: <strong>SALES_ADMIN</strong> | Machine: etl-node-02.corp | Program: python-cx_oracle</span>
          <span style="color: #fca5a5; font-size: 10px;">Holds Exclusive Lock (Mode 6: TX Row-X) on SALES_ADMIN.CUSTOMERS</span>
        </div>
        <div class="lock-node waiting-session">
          <span style="color: var(--text-muted);">└──</span>
          <span style="background: #f59e0b; color: #000; font-size: 9px; padding: 2px 6px; border-radius: 3px; font-weight: 700;">WAITING</span>
          <span>SID: 204 | Serial: 11029 | User: <strong>HR</strong> | Machine: prod-api-04.corp | Program: node.exe</span>
          <span style="color: #fde68a; font-size: 10px;">Waiting on 'enq: TX - row lock contention' for 45s</span>
          <button class="btn btn-danger" style="height: 22px; padding: 0 8px; font-size: 10px; margin-left: 12px;" onclick="window.TracesApp.sessionMonitor.killSession(312, 44018)">
            Kill Blocker (SID 312)
          </button>
        </div>
      </div>
    `;
  }

  renderDetail() {
    const s = this.sessions.find(item => item.sid === this.selectedSid);
    if (!s || !this.detailPane) return;

    this.detailPane.innerHTML = `
      <div style="padding: 16px; background: var(--bg-surface); border-top: 1px solid var(--border-default); display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-family: var(--font-display); font-size: 14px; font-weight: 700; color: var(--text-primary);">
              Session Details: SID ${s.sid}, Serial# ${s.serial} (${s.username || 'INTERNAL'})
            </span>
            <span class="session-status-badge ${s.status.toLowerCase()}">${s.status}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-danger" onclick="window.TracesApp.sessionMonitor.killSession(${s.sid}, ${s.serial})">
              Kill Session IMMEDIATE
            </button>
            <button class="btn btn-secondary" onclick="window.TracesApp.sessionMonitor.refresh()">
              Refresh
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 11px;">
          <div class="advisor-card" style="padding: 8px;">
            <div class="metric-label">OS User / Machine</div>
            <div style="font-family: var(--font-code); color: var(--text-primary); margin-top: 2px;">${s.osuser} @ ${s.machine}</div>
          </div>
          <div class="advisor-card" style="padding: 8px;">
            <div class="metric-label">Client Program / Module</div>
            <div style="font-family: var(--font-code); color: var(--text-primary); margin-top: 2px;">${s.program} (${s.module})</div>
          </div>
          <div class="advisor-card" style="padding: 8px;">
            <div class="metric-label">Current Wait Event</div>
            <div style="font-family: var(--font-code); color: ${s.blockedBy ? '#f87171' : 'var(--text-secondary)'}; margin-top: 2px;">${s.event || 'None'}</div>
          </div>
          <div class="advisor-card" style="padding: 8px;">
            <div class="metric-label">Process Memory (PGA)</div>
            <div style="font-family: var(--font-code); color: var(--text-primary); margin-top: 2px;">${s.pgaMb} MB</div>
          </div>
        </div>

        <div>
          <div class="metric-label" style="margin-bottom: 4px;">Active SQL Text (V$SQL)</div>
          <div style="background: var(--bg-input); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 10px; font-family: var(--font-code); font-size: 11px; color: #38bdf8; overflow-x: auto;">
            ${s.sqlText ? s.sqlText : '-- Background Oracle kernel worker, no active user SQL'}
          </div>
        </div>
      </div>
    `;
  }

  killSession(sid, serial) {
    const ok = confirm(`Kill Oracle Session?\nALTER SYSTEM KILL SESSION '${sid},${serial}' IMMEDIATE;`);
    if (!ok) return;

    // Remove blocked status
    const idx = this.sessions.findIndex(s => s.sid === sid);
    if (idx !== -1) {
      this.sessions.splice(idx, 1);
    }

    // Unblock any waiting session
    this.sessions.forEach(s => {
      if (s.blockedBy === sid) {
        s.blockedBy = null;
        s.event = 'SQL*Net message from client';
      }
    });

    this.render();
    window.TracesApp.notify(`ALTER SYSTEM KILL SESSION '${sid},${serial}' IMMEDIATE executed successfully.`, 'success');
  }

  killCurrentSession(mode = 'IMMEDIATE') {
    const s = this.sessions.find(x => x.sid === this.selectedSid) || this.sessions[0];
    if (!s) return;
    if (mode === 'IMMEDIATE') {
      this.killSession(s.sid, s.serial);
    } else {
      const ok = confirm(`Disconnect Oracle Session?\nALTER SYSTEM DISCONNECT SESSION '${s.sid},${s.serial}' POST_TRANSACTION;`);
      if (ok) {
        window.TracesApp.notify(`ALTER SYSTEM DISCONNECT SESSION '${s.sid},${s.serial}' POST_TRANSACTION scheduled.`, 'success');
      }
    }
  }
}

window.SessionMonitor = SessionMonitor;
