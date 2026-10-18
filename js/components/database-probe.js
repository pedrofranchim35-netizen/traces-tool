/* ==========================================================================
   TOAD DATABASE PROBE & HEALTH MONITOR COMPONENT
   ========================================================================== */

class DatabaseProbe {
  constructor() {
    this.alerts = window.TRACES_RULES.probeAlerts;
    this.tablespaces = window.TRACES_DB.tablespaces;
    this.filterState = 'ALL';

    this.initElements();
    this.bindEvents();
    this.render();
  }

  initElements() {
    this.storageBarsList = document.getElementById('probe-storage-bars');
    this.alertsTableBody = document.getElementById('probe-alerts-table-body');
    this.btnRunCheck = document.getElementById('btn-run-probe-check');
  }

  bindEvents() {
    if (this.btnRunCheck) {
      this.btnRunCheck.addEventListener('click', () => {
        window.TracesApp.notify('Running 70-point Database Probe health diagnostic...', 'info');
        setTimeout(() => {
          this.render();
          window.TracesApp.notify('Database Probe completed: 68 checks PASSED, 2 WARN.', 'success');
        }, 600);
      });
    }
  }

  render() {
    this.renderStorageBars();
    this.renderAlertsTable();
  }

  renderStorageBars() {
    this.storageBarsList.innerHTML = this.tablespaces.map(ts => {
      let stateClass = '';
      if (ts.pct >= 85) stateClass = 'danger';
      else if (ts.pct >= 70) stateClass = 'warning';

      return `
        <div class="storage-item">
          <div class="storage-labels">
            <span class="storage-name">${ts.name} (${ts.datafiles} datafiles)</span>
            <span class="storage-pct">${ts.usedMb.toLocaleString()} MB / ${ts.totalMb.toLocaleString()} MB (${ts.pct}%)</span>
          </div>
          <div class="storage-track">
            <div class="storage-fill ${stateClass}" style="width: ${ts.pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderAlertsTable() {
    this.alertsTableBody.innerHTML = this.alerts.map(a => {
      const isPass = a.status === 'PASS';
      const isWarn = a.status === 'WARN';

      return `
        <tr>
          <td style="font-family: var(--font-code); font-weight: 600; width: 60px;">#${a.id}</td>
          <td style="font-weight: 600; color: var(--text-primary); width: 220px;">${a.name}</td>
          <td style="color: var(--text-secondary); font-size: 11px;">${a.desc}</td>
          <td style="font-family: var(--font-code); font-size: 11px; color: #38bdf8; width: 160px;">${a.value}</td>
          <td style="width: 100px;">
            <span class="alert-state-badge ${isPass ? 'pass' : (isWarn ? 'warn' : 'fail')}">
              ${a.status}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }
}

window.DatabaseProbe = DatabaseProbe;
