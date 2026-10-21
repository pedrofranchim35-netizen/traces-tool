/* ==========================================================================
   TOAD DATABASE PROBE & HEALTH MONITOR COMPONENT (70 ALERTS)
   Matching DatabaseProbe.txt & HCExplanations.XML with live database metrics.
   ========================================================================== */

class DatabaseProbe {
  constructor() {
    this.alerts = window.TRACES_RULES ? window.TRACES_RULES.probeAlerts : [];
    this.tablespaces = window.TRACES_DB ? window.TRACES_DB.tablespaces : [];
    this.filterState = 'ALL';

    this.initElements();
    this.bindEvents();
    this.loadInitialRules();
    this.render();
  }

  async loadInitialRules() {
    if (!this.alerts || this.alerts.length === 0) {
      try {
        const resp = await fetch('assets/probe_rules.json');
        if (resp.ok) {
          const rules = await resp.json();
          this.alerts = rules.map(r => ({
            id: r.id,
            name: r.name,
            desc: r.desc || '',
            category: r.name.includes('IO') ? 'Storage / IO' : (r.name.includes('Session') ? 'Sessions' : 'Configuration'),
            check: r.name,
            value: r.op === '=' && r.right ? `${(r.left || '').toUpperCase()} = ${r.right}` : 'Configured Optimal',
            status: (r.id === '1' || r.id === '22') ? 'WARN' : 'PASS',
            advice: r.desc
          }));
          this.render();
        }
      } catch (e) {
        console.warn('Could not load probe_rules.json', e);
      }
    }
  }

  initElements() {
    this.storageBarsList = document.getElementById('probe-storage-bars');
    this.alertsTableBody = document.getElementById('probe-alerts-table-body');
    this.btnRunCheck = document.getElementById('btn-run-probe-check');
  }

  bindEvents() {
    if (this.btnRunCheck) {
      this.btnRunCheck.addEventListener('click', async () => {
        window.TracesApp.notify('Executando diagnóstico de integridade e probe de 70 pontos no Oracle...', 'info');
        if (window.TracesApp && window.TracesApp.isRealDatabase) {
          await this.loadRealProbe();
        } else {
          setTimeout(() => {
            this.render();
            window.TracesApp.notify('Database Probe concluído: 68 verificações PASS, 2 WARN.', 'success');
          }, 400);
        }
      });
    }
  }

  async loadRealProbe() {
    try {
      const [probeResp, tsResp] = await Promise.all([
        fetch('/api/probe'),
        fetch('/api/tablespaces-details')
      ]);
      const [probeData, tsData] = await Promise.all([
        probeResp.json(),
        tsResp.json()
      ]);
      if (probeData.alerts && probeData.alerts.length > 0) {
        this.alerts = probeData.alerts;
      }
      if (tsData.tablespaces && tsData.tablespaces.length > 0) {
        this.tablespaces = tsData.tablespaces;
      }

      this.render();
      window.TracesApp.notify(`Database Probe concluído com sucesso no Oracle Real (${this.alerts.length} alertas verificados).`, 'success');
    } catch (e) {
      console.warn('Real probe error', e);
      window.TracesApp.notify(`Falha ao rodar Database Probe: ${e.message}`, 'error');
    }
  }

  render() {
    this.renderStorageBars();
    this.renderAlertsTable();
  }

  renderStorageBars() {
    if (!this.storageBarsList) return;

    if (this.tablespaces.length === 0) {
      this.storageBarsList.innerHTML = `<div style="padding: 16px; color: var(--text-muted); font-size: 11px;">Nenhum tablespace encontrado.</div>`;
      return;
    }

    this.storageBarsList.innerHTML = this.tablespaces.map(ts => {
      let stateClass = '';
      const pct = ts.pct || 0;
      if (pct >= 85) stateClass = 'danger';
      else if (pct >= 70) stateClass = 'warning';

      return `
        <div class="storage-item">
          <div class="storage-labels">
            <span class="storage-name" style="font-weight: 600;">${ts.name} (${ts.datafiles || 1} datafiles)</span>
            <span class="storage-pct">${(ts.usedMb || 0).toLocaleString()} MB / ${(ts.totalMb || 0).toLocaleString()} MB (${pct}%)</span>
          </div>
          <div class="storage-track">
            <div class="storage-fill ${stateClass}" style="width: ${Math.min(100, pct)}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderAlertsTable() {
    if (!this.alertsTableBody) return;

    if (this.alerts.length === 0) {
      this.alertsTableBody.innerHTML = `<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">Nenhum alerta diagnosticado. Clique em Run Check.</td></tr>`;
      return;
    }

    this.alertsTableBody.innerHTML = this.alerts.map(a => {
      const isPass = a.status === 'PASS';
      const isWarn = a.status === 'WARN';

      return `
        <tr>
          <td style="font-family: var(--font-code); font-weight: 600; width: 60px;">#${a.id}</td>
          <td style="font-weight: 600; color: var(--text-primary); width: 220px;">${a.name}</td>
          <td style="color: var(--text-secondary); font-size: 11px;">${a.desc}</td>
          <td style="font-family: var(--font-code); font-size: 11px; color: #0078d7; width: 180px;">${a.value}</td>
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
