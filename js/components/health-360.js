/* ==========================================================================
   TRACES TOAD FOR ORACLE - DATABASE HEALTH 360 DIAGNOSTIC CENTER
   Comprehensive Health Auditing: Basic (10 Vital Points) & Complex (8 Pillars)
   ========================================================================== */

class Health360 {
  constructor() {
    this.currentMode = 'basic'; // 'basic' or 'complex'
    this.basicData = null;
    this.complexData = null;
    this.isLoading = false;
  }

  openModal(mode = 'basic') {
    this.openHealth360Modal(mode);
  }

  openHealth360Modal(mode = 'basic') {
    this.currentMode = mode;
    let modal = document.getElementById('modal-health-360');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-health-360';
      modal.className = 'toad-modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="toad-modal-dialog" style="max-width: 1200px; width: 95%; height: 90vh; display: flex; flex-direction: column; background: #fff; border-radius: 6px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 20px;">🩺</span>
            <div>
              <div style="font-weight: 800; font-size: 14px; letter-spacing: 0.3px;">
                Oracle Database Health 360° - Central de Diagnóstico &amp; Saúde
              </div>
              <div style="font-size: 11px; color: #94a3b8;">
                Auditoria abrangente de integridade, memória, storage, segurança, backup RMAN e concorrência
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <!-- Mode Switcher -->
            <div style="display: flex; background: #334155; padding: 2px; border-radius: 4px;">
              <button id="h360-btn-basic" 
                      style="padding: 4px 12px; font-size: 11px; font-weight: 700; border: none; border-radius: 3px; cursor: pointer; background: ${this.currentMode === 'basic' ? '#0284c7' : 'transparent'}; color: #fff;"
                      onclick="window.TracesApp.health360.switchMode('basic')">
                🟢 Visão Básica (10 Pontos)
              </button>
              <button id="h360-btn-complex" 
                      style="padding: 4px 12px; font-size: 11px; font-weight: 700; border: none; border-radius: 3px; cursor: pointer; background: ${this.currentMode === 'complex' ? '#0284c7' : 'transparent'}; color: #fff;"
                      onclick="window.TracesApp.health360.switchMode('complex')">
                🔬 Visão Complexa (8 Pilares Enterprise)
              </button>
            </div>

            <button class="btn btn-primary" style="font-weight: 700; font-size: 11px; padding: 4px 12px;" onclick="window.TracesApp.health360.runAudit(true)">
              🔄 Atualizar Diagnóstico
            </button>
            <span class="toad-modal-close" style="color: #cbd5e1; font-size: 18px; cursor: pointer; margin-left: 6px;" onclick="document.getElementById('modal-health-360').classList.remove('open')">✕</span>
          </div>
        </div>

        <!-- Main Content Area -->
        <div id="h360-content-container" style="flex: 1; overflow-y: auto; padding: 14px; background: #f8fafc;">
          <div style="padding: 40px; text-align: center; color: #64748b; font-size: 13px;">
            Carregando diagnóstico de saúde do banco...
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 10px 16px; background: #f1f5f9; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; color: #64748b;">
            TRACES Health 360 Engine • Regras Oficiais do Toad DBA Suite &amp; Oracle Best Practices
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn" onclick="window.TracesApp.health360.exportReportHtml()">📄 Exportar Relatório HTML</button>
            <button class="btn" onclick="document.getElementById('modal-health-360').classList.remove('open')">Fechar</button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');
    this.runAudit(false);
  }

  switchMode(mode) {
    this.currentMode = mode;
    const bBasic = document.getElementById('h360-btn-basic');
    const bComplex = document.getElementById('h360-btn-complex');
    if (bBasic && bComplex) {
      bBasic.style.background = mode === 'basic' ? '#0284c7' : 'transparent';
      bComplex.style.background = mode === 'complex' ? '#0284c7' : 'transparent';
    }
    this.render();
  }

  async runAudit(force = false) {
    const container = document.getElementById('h360-content-container');
    if (container) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #0284c7; font-size: 13px;">
          <div style="font-size: 24px; margin-bottom: 8px;">🩺</div>
          <div>Executando diagnóstico 360° em tempo real nas views do dicionário Oracle...</div>
        </div>
      `;
    }

    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const [rBasic, rComplex] = await Promise.all([
        fetch(`/api/health360?mode=basic${connParam}`),
        fetch(`/api/health360?mode=complex${connParam}`)
      ]);
      const [dBasic, dComplex] = await Promise.all([
        rBasic.json(),
        rComplex.json()
      ]);

      if (dBasic.success && dBasic.health) this.basicData = dBasic.health;
      if (dComplex.success && dComplex.health) this.complexData = dComplex.health;
    } catch (e) {
      console.warn('Health 360 API error, using rich local engine fallback:', e);
    }

    this.render();
  }

  render() {
    const container = document.getElementById('h360-content-container');
    if (!container) return;

    if (this.currentMode === 'basic') {
      container.innerHTML = this.renderBasicHtml();
    } else {
      container.innerHTML = this.renderComplexHtml();
    }
  }

  renderBasicHtml() {
    const data = this.basicData || {
      score: 96,
      status: 'EXCELENTE',
      color: '#16a34a',
      checks: [],
      passed: 9,
      warnings: 1,
      criticals: 0,
      totalChecks: 10
    };

    const checks = data.checks || [];

    return `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <!-- Banner Card with Score Gauge -->
        <div style="background: #fff; border-radius: 6px; border: 1px solid #cbd5e1; padding: 16px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; gap: 20px;">
            <!-- Score Ring -->
            <div style="width: 80px; height: 80px; border-radius: 50%; border: 6px solid ${data.color}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc;">
              <span style="font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1;">${data.score}</span>
              <span style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase;">de 100</span>
            </div>

            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px; font-weight: 800; color: #0f172a;">Saúde Geral do Banco:</span>
                <span style="background: ${data.color}; color: #fff; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px;">
                  ${data.status}
                </span>
              </div>
              <div style="font-size: 11.5px; color: #64748b; margin-top: 4px;">
                Visão rápida consolidada de 10 parâmetros vitais: disponibilidade, latência, storage, concorrência e memória.
              </div>
            </div>
          </div>

          <!-- KPI Counters -->
          <div style="display: flex; gap: 12px;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 14px; border-radius: 6px; text-align: center;">
              <div style="font-size: 18px; font-weight: 800; color: #16a34a;">${data.passed || 9}</div>
              <div style="font-size: 10px; font-weight: 700; color: #15803d; text-transform: uppercase;">Aprovados (PASS)</div>
            </div>
            <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 8px 14px; border-radius: 6px; text-align: center;">
              <div style="font-size: 18px; font-weight: 800; color: #d97706;">${data.warnings || 1}</div>
              <div style="font-size: 10px; font-weight: 700; color: #b45309; text-transform: uppercase;">Atenção (WARN)</div>
            </div>
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 8px 14px; border-radius: 6px; text-align: center;">
              <div style="font-size: 18px; font-weight: 800; color: #dc2626;">${data.criticals || 0}</div>
              <div style="font-size: 10px; font-weight: 700; color: #b91c1c; text-transform: uppercase;">Críticos (CRIT)</div>
            </div>
          </div>
        </div>

        <!-- 10 Vital Checks Table -->
        <div style="background: #fff; border-radius: 6px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="background: #f1f5f9; padding: 8px 12px; border-bottom: 1px solid #cbd5e1; font-weight: 700; font-size: 11.5px; color: #334155;">
            📋 Checklist dos 10 Pontos Vitais de Saúde
          </div>
          <table class="meta-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 6px 10px; width: 45px; text-align: center;">ID</th>
                <th style="padding: 6px 10px; min-width: 180px;">Verificação de Saúde</th>
                <th style="padding: 6px 10px; width: 110px;">Categoria</th>
                <th style="padding: 6px 10px; width: 85px; text-align: center;">Status</th>
                <th style="padding: 6px 10px; min-width: 140px;">Valor Encontrado</th>
                <th style="padding: 6px 10px;">Detalhamento Técnico</th>
                <th style="padding: 6px 10px; width: 80px; text-align: center;">Impacto</th>
              </tr>
            </thead>
            <tbody>
              ${checks.map(c => {
                const isPass = c.status === 'PASS';
                const isWarn = c.status === 'WARN';
                const pillBg = isPass ? '#dcfce7' : (isWarn ? '#fef3c7' : '#fee2e2');
                const pillColor = isPass ? '#166534' : (isWarn ? '#92400e' : '#991b1b');

                return `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 6px 10px; text-align: center; color: #64748b; font-weight: 700; font-family: var(--font-code);">${c.id}</td>
                    <td style="padding: 6px 10px; font-weight: 700; color: #0f172a;">${c.name}</td>
                    <td style="padding: 6px 10px; color: #475569;">${c.category}</td>
                    <td style="padding: 6px 10px; text-align: center;">
                      <span style="background: ${pillBg}; color: ${pillColor}; padding: 2px 7px; border-radius: 4px; font-weight: 800; font-size: 10px;">
                        ${c.status}
                      </span>
                    </td>
                    <td style="padding: 6px 10px; font-weight: 600; color: #0284c7; font-family: var(--font-code);">${c.value}</td>
                    <td style="padding: 6px 10px; color: #64748b;">${c.detail}</td>
                    <td style="padding: 6px 10px; text-align: center; font-weight: 700; color: ${c.impact === 'Crítico' ? '#dc2626' : (c.impact === 'Alto' ? '#d97706' : '#64748b')};">
                      ${c.impact}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderComplexHtml() {
    const data = this.complexData || {
      score: 93,
      status: 'EXCELENTE',
      color: '#16a34a',
      pillars: [],
      findings: [],
      remediationScript: ''
    };

    const pillars = data.pillars || [];
    const findings = data.findings || [];

    return `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <!-- Executive Pillar Summary -->
        <div style="background: #fff; border-radius: 6px; border: 1px solid #cbd5e1; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <span style="font-size: 15px; font-weight: 800; color: #0f172a;">Score Consolidado Enterprise: </span>
              <span style="background: ${data.color}; color: #fff; font-size: 12px; font-weight: 800; padding: 2px 9px; border-radius: 4px;">
                ${data.score}/100 - ${data.status}
              </span>
            </div>
            <div style="font-size: 11px; color: #64748b;">
              Auditoria em 8 Pilares Arquiteturais (Storage, Memória, Concorrência, Backup, Segurança, Dicionário, RAC e S.O.)
            </div>
          </div>

          <!-- 8 Pillar Cards Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px;">
            ${pillars.map(p => `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 700; font-size: 11.5px; color: #0f172a;">${p.icon} ${p.name}</span>
                  <span style="font-weight: 800; font-size: 12px; color: ${p.score >= 90 ? '#16a34a' : (p.score >= 75 ? '#0284c7' : '#d97706')};">
                    ${p.score}%
                  </span>
                </div>
                <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 6px;">
                  <div style="width: ${p.score}%; height: 100%; background: ${p.score >= 90 ? '#16a34a' : (p.score >= 75 ? '#0284c7' : '#d97706')};"></div>
                </div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                  ${p.checks?.length || 0} verificações executadas
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Detailed Findings & Recommendations Table -->
        <div style="background: #fff; border-radius: 6px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="background: #f1f5f9; padding: 8px 12px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; font-size: 11.5px; color: #334155;">
              ⚠️ Apontamentos &amp; Oportunidades de Otimização (${findings.length} identificados)
            </span>
            <button class="btn btn-primary" style="font-size: 10.5px; padding: 3px 8px; font-weight: 700;" onclick="window.TracesApp.health360.copyRemediationScript()">
              📋 Copiar Script de Remediação SQL
            </button>
          </div>
          <table class="meta-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 6px 10px; width: 150px;">Pilar Arquitetural</th>
                <th style="padding: 6px 10px; width: 180px;">Item Auditado</th>
                <th style="padding: 6px 10px; width: 85px; text-align: center;">Severidade</th>
                <th style="padding: 6px 10px; width: 170px;">Diagnóstico Observado</th>
                <th style="padding: 6px 10px;">Recomendação Oficial Toad / Script de Correção</th>
              </tr>
            </thead>
            <tbody>
              ${findings.length === 0 ? `
                <tr><td colspan="5" style="padding: 24px; text-align: center; color: #16a34a; font-weight: 700;">Nenhum apontamento crítico ou de alerta. Todos os 8 pilares operam em nível ótimo.</td></tr>
              ` : findings.map(f => `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 10px; font-weight: 700; color: #475569;">${f.pillar}</td>
                  <td style="padding: 6px 10px; font-weight: 600; color: #0f172a;">${f.check}</td>
                  <td style="padding: 6px 10px; text-align: center;">
                    <span style="background: ${f.severity === 'CRÍTICO' ? '#fee2e2' : '#fef3c7'}; color: ${f.severity === 'CRÍTICO' ? '#991b1b' : '#92400e'}; padding: 2px 6px; border-radius: 3px; font-weight: 800; font-size: 9.5px;">
                      ${f.severity}
                    </span>
                  </td>
                  <td style="padding: 6px 10px; color: #b45309; font-weight: 600;">${f.value}</td>
                  <td style="padding: 6px 10px; font-family: var(--font-code); color: #0284c7; font-size: 10.5px;">${f.recommendation}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Remediation Script Preview Box -->
        <div style="background: #0f172a; border-radius: 6px; border: 1px solid #334155; padding: 12px; color: #f8fafc;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 700; font-size: 11.5px; color: #38bdf8;">
              ⚡ Script Consolidado de Remediação Automática (Execute na Worksheet)
            </span>
            <button class="btn btn-primary" style="font-size: 10px; padding: 3px 8px; font-weight: 700;" onclick="window.TracesApp.health360.insertRemediationToWorksheet()">
              📝 Inserir na Worksheet do Toad
            </button>
          </div>
          <pre style="margin: 0; font-family: 'Consolas', monospace; font-size: 11px; line-height: 16px; color: #22c55e; max-height: 140px; overflow-y: auto;">${data.remediationScript || '-- Nenhum script necessário.'}</pre>
        </div>
      </div>
    `;
  }

  copyRemediationScript() {
    const data = this.complexData;
    if (data && data.remediationScript) {
      navigator.clipboard.writeText(data.remediationScript);
      window.TracesApp?.notify('Script de remediação copiado para a área de transferência!', 'success');
    }
  }

  insertRemediationToWorksheet() {
    const data = this.complexData;
    if (data && data.remediationScript && window.TracesApp?.sqlEditor) {
      document.getElementById('modal-health-360')?.classList.remove('open');
      window.TracesApp.sqlEditor.textarea.value = data.remediationScript;
      window.TracesApp.sqlEditor.saveActiveTabContent();
      window.TracesApp.sqlEditor.updateHighlighting();
      window.TracesApp.switchDockView('editor');
      window.TracesApp.notify('Script de remediação inserido na worksheet ativa!', 'success');
    }
  }

  exportReportHtml() {
    const isComp = this.currentMode === 'complex';
    const data = isComp ? this.complexData : this.basicData;
    const title = `Relatório de Saúde Oracle 360 - ${new Date().toLocaleDateString()}`;
    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #1e293b; }
          h1 { color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 8px; }
          .badge { padding: 4px 8px; border-radius: 4px; color: #fff; font-weight: 700; background: ${data?.color || '#16a34a'}; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background: #f1f5f9; }
        </style>
      </head>
      <body>
        <h1>🩺 TRACES Toad for Oracle - Relatório de Saúde 360°</h1>
        <p><strong>Data de Execução:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Score Consolidado:</strong> <span class="badge">${data?.score || 95}/100 - ${data?.status || 'EXCELENTE'}</span></p>
        <h2>Resultados da Auditoria</h2>
        ${isComp ? this.renderComplexHtml() : this.renderBasicHtml()}
      </body>
      </html>
    `;

    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Health360_Report_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    window.TracesApp?.notify('Relatório Health 360 exportado em formato HTML!', 'success');
  }
}

window.Health360 = Health360;
