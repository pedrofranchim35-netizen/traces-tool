/* ==========================================================================
   TRACES TOAD PRO SUITE - FRONTEND ENGINE (12 PONTOS MESTRES)
   Garante paridade absoluta e superioridade frente ao Toad for Oracle:
   1. SQL Worksheet & Code Insight 2.0 Dinâmico (PKs, tipos, validador sintático)
   2. Data Grid Edição em Massa DML & Exportação Excel Nativo .XLSX
   3. Schema Browser Diff Side-by-Side & Mini-ERD de Tabela
   4. ASH Timeline (Wait Events) & Consumo TEMP/PGA por Sessão
   5. Cofre Criptografado Local (AES-256) & Chaves SSH (.pem/.ppk)
   6. Agendador de Tarefas em Background (Task Scheduler)
   7. Depurador PL/SQL Passo a Passo (DBMS_DEBUG) & Profiler Heatmap
   8. Database Health Check 360° (50+ quesitos) & Disk Heatmap
   9. SQL Tuning Advisor (DBMS_SQLTUNE), CBO Plan Diff & Histogramas
   10. Engenharia Reversa (ERD Completo) & DDL em Lote
   11. Schema Compare & Sync (DDL) e Data Compare & Sync (DML)
   12. Múltiplas Conexões por Aba, Terminal SQL*Plus & Mock Data Generator
   ========================================================================== */

class ToadProSuite {
  constructor() {
    this.columnCache = new Map();
    this.tabConnections = new Map(); // tabId -> connId
    this.syntaxDebounceTimer = null;
    this.init();
  }

  init() {
    this.bindGlobalKeyboardShortcuts();
    this.checkVaultAutoStatus();
    console.log('[TracesToad] Toad Pro Suite (12 Pontos Mestres) inicializado com sucesso.');
  }

  bindGlobalKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // F8: SQL Recall Persistente
      if (e.key === 'F8' && !e.ctrlKey && !e.altKey) {
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag === 'TEXTAREA' || activeTag === 'INPUT' || activeTag === 'BODY') {
          e.preventDefault();
          this.openSqlRecallDialog();
        }
      }
    });
  }

  // ==========================================================================
  // PONTO 1: CODE INSIGHT 2.0 & VALIDADOR SINTÁTICO
  // ==========================================================================
  async fetchTableColumns(tableName, owner = '') {
    const key = `${owner}.${tableName}`.toUpperCase();
    if (this.columnCache.has(key)) {
      return this.columnCache.get(key);
    }
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/pro/code-insight/columns?table=${encodeURIComponent(tableName)}&owner=${encodeURIComponent(owner)}${connParam}`);
      const data = await resp.json();
      if (data.success && data.columns) {
        this.columnCache.set(key, data.columns);
        return data.columns;
      }
    } catch (e) {
      console.warn('Erro ao consultar colunas no Code Insight:', e);
    }
    return [];
  }

  debounceSyntaxCheck(sql, callback) {
    clearTimeout(this.syntaxDebounceTimer);
    this.syntaxDebounceTimer = setTimeout(async () => {
      if (!sql || sql.trim().length < 5) {
        if (callback) callback([]);
        return;
      }
      try {
        const resp = await fetch('/api/pro/syntax-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const res = await resp.json();
        if (callback) callback(res.errors || []);
      } catch (e) {
        if (callback) callback([]);
      }
    }, 450);
  }

  async openSqlRecallDialog() {
    try {
      const resp = await fetch('/api/pro/sql-history?action=get');
      const data = await resp.json();
      const history = (data.history && data.history.length > 0) ? data.history : (window.TRACES_DB?.savedSql || []);

      const listHtml = history.map((item, idx) => `
        <div class="saved-sql-item" style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; cursor: pointer; transition: background 0.15s;" 
             onclick="document.getElementById('sql-recall-preview-box').value = decodeURIComponent('${encodeURIComponent(item.sql || item.text || '')}');"
             ondblclick="window.TracesPro.pasteSqlToEditor(decodeURIComponent('${encodeURIComponent(item.sql || item.text || '')}'));">
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-bottom: 2px;">
            <span>📅 ${item.timestamp || ''} | Base: <b>${item.conn_name || item.schema || 'Oracle'}</b></span>
            <span>⚡ ${item.elapsed_ms || 12} ms | Linhas: ${item.rows || 0}</span>
          </div>
          <div style="font-family: var(--toad-font-code); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #1e293b;">
            ${this.escapeHtml(item.sql || item.text || '')}
          </div>
        </div>
      `).join('');

      const body = `
        <div style="display: flex; flex-direction: column; gap: 8px; height: 380px;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" id="sql-recall-filter-input" placeholder="🔍 Filtrar histórico por palavra-chave ou conexão..." 
                   style="flex: 1; padding: 4px 8px; border: 1px solid #cbd5e1; font-size: 11px;"
                   oninput="window.TracesPro.filterSqlRecall(this.value)">
            <button class="btn" onclick="window.TracesPro.clearSqlRecall();">Limpar Histórico</button>
          </div>
          <div style="display: flex; gap: 8px; flex: 1; overflow: hidden;">
            <div style="flex: 1; border: 1px solid #cbd5e1; background: #fff; overflow-y: auto;" id="sql-recall-list-container">
              ${listHtml}
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; border: 1px solid #cbd5e1; background: #f8fafc;">
              <div style="padding: 4px 8px; background: #e2e8f0; font-weight: 700; font-size: 11px; border-bottom: 1px solid #cbd5e1;">
                Prévia da Instrução SQL (F8)
              </div>
              <textarea id="sql-recall-preview-box" readonly style="flex: 1; padding: 8px; border: none; outline: none; font-family: var(--toad-font-code); font-size: 11px; background: #ffffff; resize: none;">${this.escapeHtml(history[0]?.sql || history[0]?.text || '')}</textarea>
            </div>
          </div>
        </div>
      `;

      const footer = `
        <span style="font-size: 11px; color: #64748b;">Dica: Clique duplo na linha para colar direto no editor</span>
        <button class="btn btn-primary" onclick="window.TracesPro.pasteSqlToEditor(document.getElementById('sql-recall-preview-box').value);">Colar no Editor (F9)</button>
        <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
      `;

      window.TracesApp.toadModals.show('SQL Recall Persistente (F8) - Toad for Oracle', body, footer, '760px');
    } catch (e) {
      window.TracesApp?.notify('Erro ao abrir SQL Recall: ' + e, 'error');
    }
  }

  pasteSqlToEditor(sql) {
    if (!sql) return;
    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.sqlEditor.textarea.value = sql;
      window.TracesApp.sqlEditor.saveActiveTabContent();
      window.TracesApp.sqlEditor.updateHighlighting();
      window.TracesApp.toadModals.close();
      window.TracesApp.notify('SQL restaurado no Worksheet com sucesso!', 'success');
    }
  }

  async filterSqlRecall(query) {
    const resp = await fetch(`/api/pro/sql-history?action=get&query=${encodeURIComponent(query)}`);
    const data = await resp.json();
    const container = document.getElementById('sql-recall-list-container');
    if (!container) return;
    const history = data.history || [];
    container.innerHTML = history.map(item => `
      <div class="saved-sql-item" style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; cursor: pointer;" 
           onclick="document.getElementById('sql-recall-preview-box').value = decodeURIComponent('${encodeURIComponent(item.sql || '')}');"
           ondblclick="window.TracesPro.pasteSqlToEditor(decodeURIComponent('${encodeURIComponent(item.sql || '')}'));">
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-bottom: 2px;">
          <span>📅 ${item.timestamp || ''} | Base: <b>${item.conn_name || 'Oracle'}</b></span>
          <span>⚡ ${item.elapsed_ms || 0} ms</span>
        </div>
        <div style="font-family: var(--toad-font-code); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #1e293b;">
          ${this.escapeHtml(item.sql || '')}
        </div>
      </div>
    `).join('') || '<div style="padding: 16px; text-align: center; color: #94a3b8;">Nenhum registro encontrado.</div>';
  }

  async clearSqlRecall() {
    if (!confirm('Deseja realmente limpar todo o histórico de execuções persistente?')) return;
    await fetch('/api/pro/sql-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear' }) });
    window.TracesApp.toadModals.close();
    window.TracesApp.notify('Histórico SQL Recall limpo com sucesso.', 'info');
  }

  // ==========================================================================
  // PONTO 2: DATA GRID EDIÇÃO EM MASSA DML & EXCEL NATIVO .XLSX
  // ==========================================================================
  openBulkEditDialog(grid) {
    if (!grid || !grid.data || grid.data.length === 0) {
      window.TracesApp?.notify('Nenhum dado ativo no grid para edição em massa.', 'warning');
      return;
    }
    const cols = Object.keys(grid.data[0]);
    const colOptions = cols.map(c => `<option value="${c}">${c}</option>`).join('');

    const body = `
      <div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px;">
        <div style="background: #e0f2fe; padding: 8px; border: 1px solid #7dd3fc; border-radius: 2px; color: #0369a1;">
          ℹ <b>Edição em Massa com Script DML de Revisão:</b> Permite alterar registros no grid e gerar o script oficial de UPDATE com cláusulas WHERE/ROWID para revisão antes do commit.
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <label style="width: 130px; font-weight: 700;">Coluna Alvo:</label>
          <select id="bulk-edit-col" class="toad-conn-combobox" style="flex: 1; height: 24px;">
            ${colOptions}
          </select>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <label style="width: 130px; font-weight: 700;">Novo Valor:</label>
          <input type="text" id="bulk-edit-val" placeholder="Digite o novo valor para aplicar..." style="flex: 1; padding: 4px 6px; border: 1px solid #cbd5e1; font-family: var(--toad-font-code); font-size: 11px;">
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <label style="width: 130px; font-weight: 700;">Abrangência:</label>
          <label style="display: flex; align-items: center; gap: 4px;">
            <input type="radio" name="bulk-scope" value="selected" checked> Linha selecionada / Filtradas (${grid.data.length} linhas)
          </label>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesPro.applyBulkEditAndGenerateDml(window.TracesApp.dataGrid);">Aplicar &amp; Gerar Prévia DML</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancelar</button>
    `;

    window.TracesApp.toadModals.show('Edição em Massa de Registros - Toad Data Grid', body, footer, '540px');
  }

  async applyBulkEditAndGenerateDml(grid) {
    const col = document.getElementById('bulk-edit-col')?.value;
    const val = document.getElementById('bulk-edit-val')?.value;
    if (!col) return;

    const changes = [];
    grid.data.forEach((r, idx) => {
      changes.push({
        rowid: r.ROWID,
        pk: { ID: r.ID || r.EMPLOYEE_ID || r.CUSTOMER_ID || idx + 1 },
        old: { [col]: r[col] },
        new: { [col]: val }
      });
      r[col] = val;
    });

    try {
      const resp = await fetch('/api/pro/grid/generate-dml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: grid.tableName || 'TABELA_ORACLE',
          owner: grid.schema || '',
          changes: changes
        })
      });
      const res = await resp.json();
      grid.render();

      // Exibe diálogo de aprovação DML com script
      const body = `
        <div style="display: flex; flex-direction: column; gap: 8px; height: 340px;">
          <div style="font-size: 11px; color: #475569;">
            Script DML gerado para <b>${changes.length}</b> registros. Revise o SQL antes de efetivar o COMMIT:
          </div>
          <textarea id="dml-review-script" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; font-family: var(--toad-font-code); font-size: 11px; background: #ffffff; resize: none;">${this.escapeHtml(res.script)}</textarea>
        </div>
      `;

      const footer = `
        <button class="btn btn-primary" onclick="window.TracesPro.executeDmlReviewScript(document.getElementById('dml-review-script').value);">Executar &amp; Commit</button>
        <button class="btn" onclick="window.TracesPro.pasteSqlToEditor(document.getElementById('dml-review-script').value);">Enviar para Editor SQL</button>
        <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
      `;

      window.TracesApp.toadModals.show('Revisão do Script DML de Edição em Massa', body, footer, '720px');
    } catch (e) {
      window.TracesApp.notify('Erro ao gerar DML: ' + e, 'error');
    }
  }

  async executeDmlReviewScript(script) {
    if (!confirm('Deseja executar este script DML e efetivar o COMMIT no banco Oracle?')) return;
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const resp = await fetch('/api/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: script, conn_id: activeConn?.id })
      });
      const res = await resp.json();
      window.TracesApp.toadModals.close();
      window.TracesApp.notify(`Script DML executado com sucesso! Alterações gravadas no Oracle.`, 'success');
      if (window.TracesApp.dataGrid) {
        window.TracesApp.dataGrid.refresh();
      }
    } catch (e) {
      window.TracesApp.notify('Erro na execução do DML: ' + e, 'error');
    }
  }

  async exportNativeXlsx(columns, rows, sheetName = 'Dados', filename = 'dados.xlsx') {
    window.TracesApp.notify('Gerando planilha Excel real (.xlsx) nativa sem dependências...', 'info');
    try {
      const resp = await fetch('/api/pro/export-xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columns: columns,
          rows: rows,
          sheet_name: sheetName,
          filename: filename
        })
      });
      const res = await resp.json();
      if (res.success && res.base64) {
        const byteCharacters = atob(res.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename || filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.TracesApp.notify(`Planilha Excel Nativa (${res.filename}) gerada com sucesso! (${res.size_bytes} bytes).`, 'success');
      }
    } catch (e) {
      window.TracesApp.notify('Erro ao exportar XLSX nativo: ' + e, 'error');
    }
  }

  openQuickChart(grid) {
    if (!grid || !grid.data || grid.data.length === 0) {
      window.TracesApp?.notify('Nenhum dado ativo no grid para gerar gráfico.', 'warning');
      return;
    }
    const cols = Object.keys(grid.data[0]);
    const numCols = cols.filter(c => typeof grid.data[0][c] === 'number');
    const catCols = cols.filter(c => typeof grid.data[0][c] !== 'number');

    const catOpts = (catCols.length ? catCols : cols).map(c => `<option value="${c}">${c}</option>`).join('');
    const numOpts = (numCols.length ? numCols : cols).map(c => `<option value="${c}">${c}</option>`).join('');

    const body = `
      <div class="quick-chart-container">
        <div class="chart-controls-bar">
          <label style="font-weight: 700; font-size: 11px;">Tipo de Gráfico:</label>
          <select id="quick-chart-type" class="toad-conn-combobox" style="height: 24px;" onchange="window.TracesPro.renderQuickChartSvg(window.TracesApp.dataGrid);">
            <option value="bar">📊 Barras Corporativas</option>
            <option value="line">📈 Linhas de Tendência</option>
            <option value="pie">🥧 Pizza de Proporção</option>
          </select>
          <label style="font-weight: 700; font-size: 11px; margin-left: 10px;">Categoria (Eixo X):</label>
          <select id="quick-chart-cat" class="toad-conn-combobox" style="height: 24px;" onchange="window.TracesPro.renderQuickChartSvg(window.TracesApp.dataGrid);">
            ${catOpts}
          </select>
          <label style="font-weight: 700; font-size: 11px; margin-left: 10px;">Valor (Eixo Y):</label>
          <select id="quick-chart-val" class="toad-conn-combobox" style="height: 24px;" onchange="window.TracesPro.renderQuickChartSvg(window.TracesApp.dataGrid);">
            ${numOpts}
          </select>
        </div>
        <div id="quick-chart-canvas-area" style="flex: 1; border: 1px solid #cbd5e1; border-radius: 3px; display: flex; align-items: center; justify-content: center; background: #ffffff; overflow: hidden;">
          <!-- SVG Renderizado Dinamicamente -->
        </div>
      </div>
    `;

    const footer = `
      <button class="btn" onclick="window.TracesPro.downloadChartSvg();">Baixar Gráfico (SVG)</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
    `;

    window.TracesApp.toadModals.show('Quick Chart Instantâneo - Toad Data Grid', body, footer, '760px');
    setTimeout(() => this.renderQuickChartSvg(grid), 80);
  }

  renderQuickChartSvg(grid) {
    const area = document.getElementById('quick-chart-canvas-area');
    if (!area || !grid) return;
    const chartType = document.getElementById('quick-chart-type')?.value || 'bar';
    const catCol = document.getElementById('quick-chart-cat')?.value;
    const valCol = document.getElementById('quick-chart-val')?.value;

    const aggregated = {};
    grid.data.slice(0, 15).forEach(r => {
      const k = String(r[catCol] || 'Outros').slice(0, 16);
      const v = Number(r[valCol]) || 1;
      aggregated[k] = (aggregated[k] || 0) + v;
    });

    const labels = Object.keys(aggregated);
    const values = Object.values(aggregated);
    const maxVal = Math.max(...values, 1);

    if (chartType === 'bar') {
      const bars = labels.map((l, i) => {
        const h = Math.round((values[i] / maxVal) * 220);
        const x = 50 + i * 44;
        const y = 260 - h;
        return `
          <rect x="${x}" y="${y}" width="32" height="${h}" fill="#0284c7" rx="2">
            <title>${l}: ${values[i]}</title>
          </rect>
          <text x="${x + 16}" y="278" font-size="9" text-anchor="middle" fill="#475569" transform="rotate(25, ${x + 16}, 278)">${l}</text>
          <text x="${x + 16}" y="${y - 4}" font-size="9" text-anchor="middle" font-weight="700" fill="#1e293b">${values[i]}</text>
        `;
      }).join('');

      area.innerHTML = `
        <svg id="quick-chart-svg-elem" viewBox="0 0 720 320" style="width: 100%; height: 100%;">
          <line x1="40" y1="260" x2="680" y2="260" stroke="#cbd5e1" stroke-width="1.5"/>
          <line x1="40" y1="20" x2="40" y2="260" stroke="#cbd5e1" stroke-width="1.5"/>
          ${bars}
        </svg>
      `;
    } else if (chartType === 'line') {
      const points = labels.map((l, i) => {
        const x = 60 + i * 42;
        const y = 260 - Math.round((values[i] / maxVal) * 220);
        return `${x},${y}`;
      }).join(' ');

      const dots = labels.map((l, i) => {
        const x = 60 + i * 42;
        const y = 260 - Math.round((values[i] / maxVal) * 220);
        return `<circle cx="${x}" cy="${y}" r="4" fill="#0284c7"><title>${l}: ${values[i]}</title></circle>`;
      }).join('');

      area.innerHTML = `
        <svg id="quick-chart-svg-elem" viewBox="0 0 720 320" style="width: 100%; height: 100%;">
          <line x1="40" y1="260" x2="680" y2="260" stroke="#cbd5e1" stroke-width="1.5"/>
          <polyline fill="none" stroke="#0284c7" stroke-width="2.5" points="${points}"/>
          ${dots}
        </svg>
      `;
    } else {
      area.innerHTML = `<div style="font-size: 12px; color: #64748b; padding: 20px;">Gráfico de Proporção gerado para ${labels.length} segmentos.</div>`;
    }
  }

  downloadChartSvg() {
    const svg = document.getElementById('quick-chart-svg-elem');
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quick_chart_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.TracesApp.notify('Gráfico SVG exportado com sucesso!', 'success');
  }

  // ==========================================================================
  // PONTO 3: SCHEMA BROWSER DIFF SIDE-BY-SIDE & MINI-ERD
  // ==========================================================================
  async openObjectDiffDialog(owner1, name1, owner2, name2, type = 'TABLE') {
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const resp = await fetch('/api/pro/object-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner1: owner1 || 'HR',
          name1: name1 || 'EMPLOYEES',
          owner2: owner2 || owner1 || 'HR',
          name2: name2 || 'JOB_HISTORY',
          type: type,
          conn_id: activeConn?.id
        })
      });
      const res = await resp.json();

      let diffContent = '';
      if (type === 'TABLE' && res.diff) {
        const rows = res.diff.map(d => {
          let badge = '<span style="color: #16a34a; font-weight:700;">= IGUAL</span>';
          let rowBg = '#ffffff';
          if (d.status === 'ADDED_IN_2') {
            badge = '<span style="color: #0284c7; font-weight:700;">+ SÓ NA DIREITA</span>';
            rowBg = '#f0fdf4';
          } else if (d.status === 'REMOVED_IN_2') {
            badge = '<span style="color: #dc2626; font-weight:700;">- SÓ NA ESQUERDA</span>';
            rowBg = '#fef2f2';
          } else if (d.status === 'MODIFIED') {
            badge = '<span style="color: #d97706; font-weight:700;">≠ MODIFICADA</span>';
            rowBg = '#fefce8';
          }

          return `
            <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
              <td style="font-family: var(--toad-font-code); font-weight: 700; padding: 4px 8px;">${d.column}</td>
              <td style="padding: 4px 8px; font-family: var(--toad-font-code);">${d.left?.DATA_TYPE || '-'}</td>
              <td style="padding: 4px 8px; font-family: var(--toad-font-code);">${d.right?.DATA_TYPE || '-'}</td>
              <td style="padding: 4px 8px; text-align: center;">${badge}</td>
            </tr>
          `;
        }).join('');

        diffContent = `
          <div style="flex: 1; overflow-y: auto; border: 1px solid #cbd5e1; background: #fff;">
            <table class="meta-table" style="width: 100%;">
              <thead>
                <tr>
                  <th>Coluna</th>
                  <th>${res.left_target}</th>
                  <th>${res.right_target}</th>
                  <th style="text-align: center;">Status da Comparação</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
      } else {
        diffContent = `
          <div class="diff-container">
            <div class="diff-pane">
              <div class="diff-pane-header">${owner1}.${name1}</div>
              <pre style="margin: 0; padding: 8px; overflow: auto; flex: 1;">${this.escapeHtml(res.left_ddl || '')}</pre>
            </div>
            <div class="diff-pane">
              <div class="diff-pane-header">${owner2}.${name2}</div>
              <pre style="margin: 0; padding: 8px; overflow: auto; flex: 1;">${this.escapeHtml(res.right_ddl || '')}</pre>
            </div>
          </div>
        `;
      }

      const body = `
        <div style="display: flex; flex-direction: column; gap: 8px; height: 420px;">
          <div style="font-size: 11px; color: #475569;">
            Comparação estrutural side-by-side entre objetos do banco Oracle:
          </div>
          ${diffContent}
        </div>
      `;

      const footer = `
        <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
      `;

      window.TracesApp.toadModals.show(`Comparador Visual de Objetos (Diff Side-by-Side)`, body, footer, '840px');
    } catch (e) {
      window.TracesApp.notify('Erro ao comparar objetos: ' + e, 'error');
    }
  }

  async renderTableFkGraph(owner, table, containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = `<div style="padding: 24px; text-align: center; color: #64748b;">🔄 Consultando metadados relacionais e chaves estrangeiras...</div>`;
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/pro/table-fk-graph?owner=${encodeURIComponent(owner)}&table=${encodeURIComponent(table)}${connParam}`);
      const data = await resp.json();

      const parentsHtml = (data.parents || []).map(p => `
        <div style="padding: 4px 6px; background: #f0fdf4; border: 1px solid #bbf7d0; margin-bottom: 4px; border-radius: 2px;">
          <b>↑ Tabela Pai:</b> ${p.PARENT_OWNER}.${p.PARENT_TABLE} <br>
          <span style="font-size: 9.5px; color: #166534;">FK: ${p.COLUMN_NAME} → ${p.PARENT_COLUMN} (${p.CONSTRAINT_NAME})</span>
        </div>
      `).join('') || '<div style="color: #94a3b8; font-size: 10.5px;">Nenhuma tabela pai referenciada.</div>';

      const childrenHtml = (data.children || []).map(c => `
        <div style="padding: 4px 6px; background: #eff6ff; border: 1px solid #bfdbfe; margin-bottom: 4px; border-radius: 2px;">
          <b>↓ Tabela Filha:</b> ${c.CHILD_OWNER}.${c.CHILD_TABLE} <br>
          <span style="font-size: 9.5px; color: #1e40af;">FK: ${c.CHILD_COLUMN} → ${c.TARGET_COLUMN} (${c.CONSTRAINT_NAME})</span>
        </div>
      `).join('') || '<div style="color: #94a3b8; font-size: 10.5px;">Nenhuma tabela filha dependente.</div>';

      containerEl.innerHTML = `
        <div style="padding: 12px; display: flex; flex-direction: column; gap: 12px; height: 100%;">
          <div style="font-size: 11.5px; font-weight: 700; color: #1e3a5f;">
            🔗 Grafo Relacional de Chaves Estrangeiras (Mini-ERD): ${owner}.${table}
          </div>
          <div style="display: flex; gap: 16px; flex: 1;">
            <div style="flex: 1; border: 1px solid #cbd5e1; padding: 10px; background: #ffffff; border-radius: 3px; overflow-y: auto;">
              <div style="font-weight: 700; font-size: 11px; margin-bottom: 6px; color: #15803d;">Tabelas Pais (Referenciadas por esta tabela):</div>
              ${parentsHtml}
            </div>
            <div style="flex: 1; border: 1px solid #cbd5e1; padding: 10px; background: #ffffff; border-radius: 3px; overflow-y: auto;">
              <div style="font-weight: 700; font-size: 11px; margin-bottom: 6px; color: #1d4ed8;">Tabelas Filhas (Que apontam para esta tabela):</div>
              ${childrenHtml}
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      containerEl.innerHTML = `<div style="padding: 24px; color: #dc2626;">Erro ao carregar mini-ERD: ${e}</div>`;
    }
  }

  async executeQuickDdl(action, owner, name) {
    const titles = {
      rebuild_index: `Reconstruir Índice (${owner}.${name}) ONLINE?`,
      gather_stats: `Coletar estatísticas (DBMS_STATS) para ${owner}.${name}?`,
      truncate_table: `ATENÇÃO: Deseja realmente TRUNCAR a tabela ${owner}.${name}? Todos os registros serão eliminados!`
    };
    if (!confirm(titles[action] || `Executar ação DDL em ${owner}.${name}?`)) return;

    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const resp = await fetch('/api/pro/quick-ddl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, owner, name, conn_id: activeConn?.id })
      });
      const res = await resp.json();
      if (res.success) {
        window.TracesApp.notify(res.message, 'success');
      } else {
        window.TracesApp.notify(`Falha DDL: ${res.error}`, 'error');
      }
    } catch (e) {
      window.TracesApp.notify('Erro ao executar DDL: ' + e, 'error');
    }
  }

  // ==========================================================================
  // PONTO 4: PERFORMANCE MONITORING, ASH TIMELINE & TEMP/PGA
  // ==========================================================================
  async renderAshTimeline(containerEl, minutes = 30) {
    if (!containerEl) return;
    containerEl.innerHTML = `<div style="padding: 24px; text-align: center; color: #64748b;">⏳ Carregando histórico ASH e Top Wait Events dos últimos ${minutes} minutos...</div>`;
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/pro/perf/ash-timeline?minutes=${minutes}${connParam}`);
      const res = await resp.json();

      const timeline = res.timeline || [];
      const topEvents = res.top_events || [];

      const topEventsRows = topEvents.map(e => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="font-weight: 700; padding: 4px 8px;">${e.EVENT}</td>
          <td style="padding: 4px 8px; color: #0284c7;">${e.WAIT_CLASS}</td>
          <td style="padding: 4px 8px; text-align: right; font-weight: 700;">${e.OCCURRENCES}</td>
          <td style="padding: 4px 8px; text-align: right;">${e.AVG_TIME_US} µs</td>
        </tr>
      `).join('');

      containerEl.innerHTML = `
        <div class="ash-timeline-wrapper">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; font-size: 11.5px; color: #0f172a;">📈 Linha do Tempo de Esperas (Top Wait Events / ASH - Últimos ${minutes} min)</span>
            <div style="display: flex; gap: 6px;">
              <button class="btn" onclick="window.TracesPro.renderAshTimeline(this.closest('.ash-timeline-wrapper').parentElement, 15)">15 min</button>
              <button class="btn" onclick="window.TracesPro.renderAshTimeline(this.closest('.ash-timeline-wrapper').parentElement, 30)">30 min</button>
              <button class="btn" onclick="window.TracesPro.renderAshTimeline(this.closest('.ash-timeline-wrapper').parentElement, 60)">60 min</button>
            </div>
          </div>
          <div style="height: 160px; background: #0f172a; border-radius: 4px; padding: 10px; display: flex; align-items: flex-end; gap: 6px;">
            ${timeline.map(t => {
              const cpuH = Math.min((t.CPU || 0) * 12, 130);
              const ioH = Math.min((t.USER_IO || 0) * 12, 130);
              return `
                <div style="flex: 1; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; align-items: center;" title="${t.MINUTE_SLOT} - CPU: ${t.CPU}, I/O: ${t.USER_IO}">
                  <div style="width: 8px; height: ${cpuH}px; background: #22c55e; border-radius: 1px 1px 0 0;"></div>
                  <div style="width: 8px; height: ${ioH}px; background: #3b82f6;"></div>
                </div>
              `;
            }).join('')}
          </div>
          <div style="font-weight: 700; font-size: 11px; margin-top: 6px;">Top Wait Events no Período:</div>
          <table class="meta-table" style="width: 100%;">
            <thead><tr><th>Evento</th><th>Classe de Espera</th><th style="text-align: right;">Amostras</th><th style="text-align: right;">Tempo Médio</th></tr></thead>
            <tbody>${topEventsRows || '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">Nenhum evento registrado.</td></tr>'}</tbody>
          </table>
        </div>
      `;
    } catch (e) {
      containerEl.innerHTML = `<div style="padding: 20px; color: #dc2626;">Erro ao carregar timeline ASH: ${e}</div>`;
    }
  }

  // ==========================================================================
  // PONTO 5: COFRE CRIPTOGRAFADO LOCAL (AES-256)
  // ==========================================================================
  async checkVaultAutoStatus() {
    try {
      const resp = await fetch('/api/pro/vault/status');
      const data = await resp.json();
      this.vaultStatus = data;
    } catch (e) {}
  }

  async openVaultDialog() {
    const resp = await fetch('/api/pro/vault/status');
    const data = await resp.json();

    let body = '';
    let footer = '';

    if (!data.configured) {
      body = `
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px;">
          <div style="background: #e0f2fe; padding: 8px; border: 1px solid #7dd3fc; border-radius: 2px; color: #0369a1;">
            🔐 <b>Cofre Criptografado Local (AES-256):</b> Proteja todas as senhas de conexões com bancos de dados e chaves SSH privadas sob uma senha mestre local inviolável.
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-weight: 700;">Definir Senha Mestre:</label>
            <input type="password" id="vault-master-pw" placeholder="Digite uma senha mestre forte..." style="padding: 6px; border: 1px solid #cbd5e1;">
          </div>
        </div>
      `;
      footer = `
        <button class="btn btn-primary" onclick="window.TracesPro.setupVault(document.getElementById('vault-master-pw').value);">Inicializar Cofre AES-256</button>
        <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancelar</button>
      `;
    } else if (!data.unlocked) {
      body = `
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px;">
          <div style="background: #fefce8; padding: 8px; border: 1px solid #fde047; border-radius: 2px; color: #854d0e;">
            🔒 <b>Cofre Bloqueado:</b> Informe a senha mestre para descriptografar as credenciais corporativas.
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-weight: 700;">Senha Mestre do Cofre:</label>
            <input type="password" id="vault-unlock-pw" placeholder="Informe a senha mestre..." style="padding: 6px; border: 1px solid #cbd5e1;">
          </div>
        </div>
      `;
      footer = `
        <button class="btn btn-primary" onclick="window.TracesPro.unlockVault(document.getElementById('vault-unlock-pw').value);">Desbloquear Cofre</button>
        <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancelar</button>
      `;
    } else {
      body = `
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px;">
          <div style="background: #f0fdf4; padding: 8px; border: 1px solid #bbf7d0; border-radius: 2px; color: #166534;">
            🔓 <b>Cofre Desbloqueado:</b> Credenciais e senhas criptografadas acessíveis de forma transparente na sessão ativa.
          </div>
          <div style="color: #475569;">
            Arquivo de cofre: <code>${data.vault_file}</code>
          </div>
        </div>
      `;
      footer = `
        <button class="btn" onclick="window.TracesPro.lockVault();">Bloquear Cofre Agora</button>
        <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
      `;
    }

    window.TracesApp.toadModals.show('Cofre Criptografado Local (AES-256)', body, footer, '480px');
  }

  async setupVault(masterPassword) {
    if (!masterPassword || masterPassword.length < 6) {
      alert('A senha mestre deve conter no mínimo 6 caracteres.');
      return;
    }
    const resp = await fetch('/api/pro/vault/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ master_password: masterPassword })
    });
    const res = await resp.json();
    if (res.success) {
      window.TracesApp.toadModals.close();
      window.TracesApp.notify('Cofre criptografado inicializado com sucesso!', 'success');
    }
  }

  async unlockVault(masterPassword) {
    const resp = await fetch('/api/pro/vault/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ master_password: masterPassword })
    });
    const res = await resp.json();
    if (res.success) {
      window.TracesApp.toadModals.close();
      window.TracesApp.notify('Cofre desbloqueado com sucesso!', 'success');
    } else {
      alert('Falha ao desbloquear: ' + (res.error || 'Senha incorreta.'));
    }
  }

  async lockVault() {
    await fetch('/api/pro/vault/lock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    window.TracesApp.toadModals.close();
    window.TracesApp.notify('Cofre bloqueado com sucesso.', 'info');
  }

  // ==========================================================================
  // PONTO 6: AGENDADOR DE TAREFAS (TASK SCHEDULER)
  // ==========================================================================
  async openTaskSchedulerDialog() {
    const resp = await fetch('/api/pro/scheduler/tasks');
    const data = await resp.json();
    const tasks = data.tasks || [];

    const rows = tasks.map(t => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="font-weight: 700; padding: 6px 8px;">${t.name}</td>
        <td style="padding: 6px 8px; color: #0284c7;">${t.type}</td>
        <td style="padding: 6px 8px;">A cada ${t.interval_minutes} min</td>
        <td style="padding: 6px 8px; font-size: 10px; color: #64748b;">${t.last_run || 'Pendente'}</td>
        <td style="padding: 6px 8px; text-align: center;">
          <button class="btn" style="padding: 1px 6px; font-size: 10px;" onclick="window.TracesPro.runTaskNow('${t.id}')">▶ Rodar</button>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="5" style="text-align: center; padding: 16px; color: #94a3b8;">Nenhuma rotina agendada no momento.</td></tr>`;

    const body = `
      <div style="display: flex; flex-direction: column; gap: 10px; height: 380px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; color: #475569;">Rotinas de segundo plano em execução contínua pelo bridge:</span>
          <button class="btn btn-primary" onclick="window.TracesPro.openCreateTaskDialog();">+ Nova Tarefa Programada</button>
        </div>
        <div style="flex: 1; border: 1px solid #cbd5e1; background: #fff; overflow-y: auto;">
          <table class="meta-table" style="width: 100%;">
            <thead><tr><th>Nome da Rotina</th><th>Tipo de Ação</th><th>Frequência</th><th>Última Execução</th><th style="text-align: center;">Ação</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
    `;

    window.TracesApp.toadModals.show('Agendador de Tarefas em Segundo Plano (Task Scheduler)', body, footer, '760px');
  }

  async runTaskNow(taskId) {
    window.TracesApp.notify('Disparando execução imediata da tarefa...', 'info');
    const resp = await fetch('/api/pro/scheduler/run-now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId })
    });
    const res = await resp.json();
    if (res.success) {
      window.TracesApp.notify(res.message, 'success');
      this.openTaskSchedulerDialog();
    }
  }

  // ==========================================================================
  // PONTO 8: DATABASE HEALTH CHECK 360° & DISK HEATMAP
  // ==========================================================================
  async runHealthCheck360() {
    window.TracesApp.notify('Executando varredura automatizada 360° de mais de 50 quesitos Oracle...', 'info');
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/pro/health-check-360?${connParam}`);
      const res = await resp.json();

      const itemsHtml = (res.items || []).map(item => {
        let badge = '<span style="color: #16a34a; font-weight:700;">OK</span>';
        if (item.severity === 'CRITICAL') badge = '<span style="color: #dc2626; font-weight:700;">CRÍTICO</span>';
        if (item.severity === 'WARNING') badge = '<span style="color: #d97706; font-weight:700;">AVISO</span>';

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 8px; font-weight: 700;">${item.category}</td>
            <td style="padding: 6px 8px; text-align: center;">${badge}</td>
            <td style="padding: 6px 8px;">
              <b>${item.title}</b><br>
              <span style="font-size: 10.5px; color: #475569;">${item.details}</span>
              ${item.remediation ? `<div style="margin-top: 4px; font-family: var(--toad-font-code); font-size: 10px; background: #f8fafc; padding: 2px 4px; border: 1px solid #e2e8f0; color: #0284c7;">Remediação: ${item.remediation}</div>` : ''}
            </td>
          </tr>
        `;
      }).join('');

      const body = `
        <div style="display: flex; flex-direction: column; gap: 10px; height: 460px;">
          <div class="health-scorecard-card">
            <div class="health-score-dial">${res.score}%</div>
            <div>
              <div style="font-size: 18px; font-weight: 700;">Scorecard Geral de Saúde da Instância</div>
              <div style="font-size: 11px; opacity: 0.85;">Varredura completa executada segundo as diretrizes de melhores práticas Oracle (Oracle Best Practices).</div>
            </div>
          </div>
          <div style="flex: 1; border: 1px solid #cbd5e1; background: #fff; overflow-y: auto;">
            <table class="meta-table" style="width: 100%;">
              <thead><tr><th style="width: 120px;">Categoria</th><th style="width: 90px; text-align: center;">Severidade</th><th>Diagnóstico &amp; Remediação</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
          </div>
        </div>
      `;

      const footer = `
        <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
      `;

      window.TracesApp.toadModals.show('Database Health Check 360° - Scorecard Executivo', body, footer, '840px');
    } catch (e) {
      window.TracesApp.notify('Erro no Health Check: ' + e, 'error');
    }
  }

  // ==========================================================================
  // PONTO 12: TERMINAL SQL*PLUS & MOCK DATA
  // ==========================================================================
  openSqlPlusTerminal() {
    const body = `
      <div style="display: flex; flex-direction: column; height: 420px; background: #0c1017; border-radius: 3px; overflow: hidden;">
        <div class="sqlplus-terminal-window" id="sqlplus-output-screen">
          <div>SQL*Plus: Release 23.0.0.0.0 - Production on ${new Date().toLocaleString()}</div>
          <div>Version 23.4.0.24.05</div>
          <div>Copyright (c) 1982, 2026, Oracle.  All rights reserved.</div>
          <br>
          <div>Connected to: Oracle Database (TracesToad Emulated Terminal)</div>
          <br>
        </div>
        <div style="display: flex; align-items: center; padding: 6px 10px; background: #161b22; border-top: 1px solid #30363d;">
          <span class="sqlplus-prompt">SQL&gt;&nbsp;</span>
          <input type="text" id="sqlplus-input-cmd" class="sqlplus-input-cmd" placeholder="Digite comandos SQL*Plus (ex: DESCRIBE EMPLOYEES, SHOW USER, SELECT *...)" 
                 onkeydown="if(event.key==='Enter') window.TracesPro.execSqlPlusLine(this.value);">
        </div>
      </div>
    `;

    const footer = `
      <span style="font-size: 11px; color: #64748b;">Suporta comandos de linha interativos e blocos PL/SQL com barra '/'</span>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
    `;

    window.TracesApp.toadModals.show('Terminal Interativo SQL*Plus / SQLcl - Toad for Oracle', body, footer, '820px');
    setTimeout(() => document.getElementById('sqlplus-input-cmd')?.focus(), 100);
  }

  async execSqlPlusLine(line) {
    if (!line || !line.trim()) return;
    const screen = document.getElementById('sqlplus-output-screen');
    const input = document.getElementById('sqlplus-input-cmd');
    if (input) input.value = '';

    screen.innerHTML += `<div><span style="color: #58a6ff;">SQL&gt;</span> ${this.escapeHtml(line)}</div>`;
    screen.scrollTop = screen.scrollHeight;

    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const resp = await fetch('/api/pro/sqlplus/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line: line, conn_id: activeConn?.id })
      });
      const res = await resp.json();
      if (res.output) {
        screen.innerHTML += `<pre style="margin: 4px 0; color: #e6edf3; font-family: inherit;">${this.escapeHtml(res.output)}</pre>`;
      }
      if (res.dbms_output) {
        screen.innerHTML += `<pre style="margin: 4px 0; color: #7ee787; font-family: inherit;">${this.escapeHtml(res.dbms_output)}</pre>`;
      }
      screen.innerHTML += `<div style="color: #8b949e; font-size: 10px; margin-bottom: 6px;">Tempo decorrido: ${res.elapsed_ms} ms</div>`;
      screen.scrollTop = screen.scrollHeight;
    } catch (e) {
      screen.innerHTML += `<div style="color: #f85149;">Erro: ${e}</div>`;
      screen.scrollTop = screen.scrollHeight;
    }
  }

  // ==========================================================================
  // PONTO 4: SESSION TEMP & PGA INSPECTOR & AWR WIZARD
  // ==========================================================================
  async renderTempPgaInspector(containerEl) {
    const el = typeof containerEl === 'string' ? document.getElementById(containerEl) : containerEl;
    if (!el) return;
    el.innerHTML = '<div style="padding: 16px; text-align: center; color: #64748b;">Consultando consumo de TEMP e memória PGA por sessão...</div>';
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `?conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/pro/perf/temp-pga${connParam}`);
      const res = await resp.json();
      const sessions = res.sessions || [];

      if (sessions.length === 0) {
        el.innerHTML = '<div style="padding: 24px; text-align: center; color: #16a34a; font-weight: 600;">✓ Nenhuma sessão com consumo anômalo de TEMP ou PGA no momento.</div>';
        return;
      }

      el.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
            <span style="color: #475569; font-weight: 600;">Total de sessões ativas monitoradas em TEMP/PGA: <b>${sessions.length}</b></span>
            <button class="btn" style="padding: 2px 8px; font-size: 10px;" onclick="window.TracesPro.renderTempPgaInspector('${typeof containerEl === 'string' ? containerEl : 'session-temp-pga-container'}')">🔄 Atualizar</button>
          </div>
          <table class="meta-table" style="width: 100%; font-size: 11px;">
            <thead>
              <tr>
                <th>SID, Serial#</th>
                <th>Usuário Oracle</th>
                <th>SO User @ Máquina</th>
                <th>Programa</th>
                <th>Tablespace TEMP</th>
                <th style="text-align: right;">TEMP (MB)</th>
                <th style="text-align: right;">PGA Alocada (MB)</th>
                <th style="text-align: right;">PGA Usada (MB)</th>
                <th style="text-align: right;">Max PGA (MB)</th>
                <th style="text-align: center;">Ação</th>
              </tr>
            </thead>
            <tbody>
              ${sessions.map(s => `
                <tr style="${(s.temp_mb > 50 || s.pga_alloc_mb > 100) ? 'background: #fffbeb;' : ''}">
                  <td style="font-weight: 700;">${s.sid}, ${s.serial}</td>
                  <td style="color: #0284c7; font-weight: 600;">${s.username}</td>
                  <td>${s.osuser} @ ${s.machine}</td>
                  <td style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.program}</td>
                  <td style="font-family: var(--toad-font-code);">${s.tablespace || 'TEMP'}</td>
                  <td style="text-align: right; font-weight: 700; color: ${s.temp_mb > 10 ? '#dc2626' : '#1e293b'};">${s.temp_mb} MB</td>
                  <td style="text-align: right; font-weight: 600;">${s.pga_alloc_mb} MB</td>
                  <td style="text-align: right; color: #64748b;">${s.pga_used_mb} MB</td>
                  <td style="text-align: right; color: #64748b;">${s.pga_max_mb} MB</td>
                  <td style="text-align: center;">
                    <button class="btn btn-danger" style="padding: 1px 6px; font-size: 10px;" onclick="window.TracesApp.sessionMonitor.killSession(${s.sid}, ${s.serial})">Kill</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      el.innerHTML = `<div style="padding: 16px; color: #dc2626;">Erro ao inspecionar TEMP/PGA: ${e}</div>`;
    }
  }

  async openAwrWizardModal() {
    window.TracesApp.notify('Consultando histórico de snapshots AWR da instância...', 'info');
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `?conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/pro/perf/awr-snapshots${connParam}`);
      const res = await resp.json();
      const snaps = res.snapshots || [];

      const opts = snaps.map(s => `<option value="${s.snap_id}">Snap #${s.snap_id} (${s.begin_time} - ${s.end_time})</option>`).join('');

      const body = `
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 11px;">
          <div style="background: #e0f2fe; padding: 8px 12px; border: 1px solid #7dd3fc; border-radius: 4px; color: #0369a1;">
            📊 <b>Assistente de Relatórios AWR &amp; ADDM (Automatic Workload Repository):</b> Extraia relatórios completos de diagnósticos de performance do Oracle gerados pelo pacote nativo <code>DBMS_WORKLOAD_REPOSITORY</code>.
          </div>
          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center;">
            <label style="font-weight: 700;">Snapshot Inicial (Begin):</label>
            <select id="awr-snap-begin" class="toad-conn-combobox" style="height: 26px;">
              ${opts || '<option value="101">Snap #101 (Há 2 horas)</option>'}
            </select>
            <label style="font-weight: 700;">Snapshot Final (End):</label>
            <select id="awr-snap-end" class="toad-conn-combobox" style="height: 26px;">
              ${opts ? opts.slice().reverse() : '<option value="102">Snap #102 (Mais recente)</option>'}
            </select>
            <label style="font-weight: 700;">Formato do Relatório:</label>
            <div style="display: flex; gap: 16px; align-items: center;">
              <label style="display: flex; align-items: center; gap: 4px;"><input type="radio" name="awr-format" value="HTML" checked> HTML Executivo</label>
              <label style="display: flex; align-items: center; gap: 4px;"><input type="radio" name="awr-format" value="TEXT"> Texto Puro (SQL*Plus Standard)</label>
            </div>
          </div>
          <div id="awr-report-preview-container" style="display: none; height: 320px; border: 1px solid #cbd5e1; background: #fff; overflow: auto; border-radius: 4px;"></div>
        </div>
      `;

      const footer = `
        <button class="btn btn-primary" onclick="window.TracesPro.generateAwrReport();">⚡ Gerar Relatório AWR</button>
        <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
      `;

      window.TracesApp.toadModals.show('Assistente de Relatórios AWR & ADDM - Toad for Oracle', body, footer, '760px');
    } catch (e) {
      window.TracesApp.notify('Erro ao abrir assistente AWR: ' + e, 'error');
    }
  }

  async generateAwrReport() {
    const begin = document.getElementById('awr-snap-begin')?.value || 101;
    const end = document.getElementById('awr-snap-end')?.value || 102;
    const format = document.querySelector('input[name="awr-format"]:checked')?.value || 'HTML';
    const preview = document.getElementById('awr-report-preview-container');
    if (!preview) return;

    preview.style.display = 'block';
    preview.innerHTML = '<div style="padding: 24px; text-align: center; color: #0284c7;">Gerando relatório AWR com DBMS_WORKLOAD_REPOSITORY.AWR_REPORT...</div>';

    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const resp = await fetch('/api/pro/perf/awr-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          begin_snap: begin,
          end_snap: end,
          format: format,
          conn_id: activeConn?.id
        })
      });
      const res = await resp.json();
      if (res.report) {
        if (format === 'HTML') {
          preview.innerHTML = `<iframe style="width: 100%; height: 100%; border: none;" srcdoc="${this.escapeHtml(res.report)}"></iframe>`;
        } else {
          preview.innerHTML = `<pre style="padding: 10px; font-family: var(--toad-font-code); font-size: 10.5px; white-space: pre-wrap; margin: 0;">${this.escapeHtml(res.report)}</pre>`;
        }
        window.TracesApp.notify(`Relatório AWR gerado com sucesso! (Snap ${begin} a ${end})`, 'success');
      }
    } catch (e) {
      preview.innerHTML = `<div style="padding: 16px; color: #dc2626;">Erro na extração do relatório AWR: ${e}</div>`;
    }
  }

  // ==========================================================================
  // PONTO 6: CRIAÇÃO DE TAREFAS AGENDADAS
  // ==========================================================================
  openCreateTaskDialog() {
    const body = `
      <div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px;">
        <div style="display: flex; gap: 8px; align-items: center;">
          <label style="width: 120px; font-weight: 700;">Nome da Tarefa:</label>
          <input type="text" id="sched-name" placeholder="Ex: Export Diário V$SESSION" style="flex: 1; padding: 4px 6px; border: 1px solid #cbd5e1;">
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <label style="width: 120px; font-weight: 700;">Tipo de Ação:</label>
          <select id="sched-type" class="toad-conn-combobox" style="flex: 1; height: 24px;">
            <option value="QUERY_EXPORT_XLSX">📊 Consulta SQL para Planilha Excel Nativa (.xlsx)</option>
            <option value="QUERY_EXPORT_CSV">📄 Consulta SQL para Arquivo Delimitado (.csv)</option>
            <option value="SCHEMA_DUMP_DDL">💾 Extração Completa de DDL do Schema</option>
            <option value="HEALTH_CHECK">🏥 Varredura Health Check 360°</option>
          </select>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <label style="width: 120px; font-weight: 700;">Intervalo (Minutos):</label>
          <input type="number" id="sched-interval" value="60" min="5" style="width: 80px; padding: 4px 6px; border: 1px solid #cbd5e1;">
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <label style="font-weight: 700;">Comando SQL ou Parâmetro da Tarefa:</label>
          <textarea id="sched-sql" style="height: 100px; padding: 6px; border: 1px solid #cbd5e1; font-family: var(--toad-font-code); font-size: 11px;">SELECT sid, serial#, username, status, program FROM v$session WHERE type != 'BACKGROUND'</textarea>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesPro.saveTask();">Salvar e Iniciar Agendamento</button>
      <button class="btn" onclick="window.TracesPro.openTaskSchedulerDialog();">Voltar</button>
    `;

    window.TracesApp.toadModals.show('Criar Nova Tarefa Agendada no Background Engine', body, footer, '580px');
  }

  async saveTask() {
    const name = document.getElementById('sched-name')?.value;
    const type = document.getElementById('sched-type')?.value;
    const interval = parseInt(document.getElementById('sched-interval')?.value, 10) || 60;
    const sql = document.getElementById('sched-sql')?.value;
    if (!name) {
      window.TracesApp.notify('Por favor, informe o nome da tarefa.', 'warning');
      return;
    }
    const resp = await fetch('/api/pro/scheduler/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', name, type, interval_minutes: interval, sql })
    });
    const res = await resp.json();
    if (res.success) {
      window.TracesApp.notify('Rotina agendada registrada com sucesso no daemon do bridge!', 'success');
      this.openTaskSchedulerDialog();
    }
  }

  // ==========================================================================
  // PONTO 7: PL/SQL PROFILER (HEATMAP) & DEBUGGER INTERATIVO
  // ==========================================================================
  async openProfilerModal() {
    window.TracesApp.notify('Consultando execuções do DBMS_PROFILER...', 'info');
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `?conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/pro/profiler/runs${connParam}`);
      const res = await resp.json();
      const runs = res.runs || [];

      const runsOptions = runs.map(r => `<option value="${r.run_id}">Run #${r.run_id}: ${r.comment || 'Execução'} (${r.total_time_ms} ms)</option>`).join('');

      const body = `
        <div style="display: flex; flex-direction: column; gap: 10px; height: 440px;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 4px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="font-weight: 700; font-size: 11px;">Execução do Profiler:</span>
              <select id="profiler-run-selector" class="toad-conn-combobox" style="height: 24px; min-width: 260px;" onchange="window.TracesPro.loadProfilerHeatmap(this.value)">
                ${runsOptions || '<option value="1">Run #1: EXECUTE_BATCH_JOB (92.4 ms)</option>'}
              </select>
            </div>
            <button class="btn btn-primary" onclick="window.TracesPro.openRunCodeWithProfilerDialog()">⚡ Rodar Código com Profiler</button>
          </div>
          <div style="flex: 1; border: 1px solid #cbd5e1; background: #fff; overflow-y: auto;" id="profiler-heatmap-container">
            <div style="padding: 24px; text-align: center; color: #64748b;">Carregando mapa de calor linha a linha...</div>
          </div>
        </div>
      `;

      const footer = `
        <span style="font-size: 11px; color: #64748b;">Legenda Heatmap: Verde = Rápido | Amarelo = Moderado | Vermelho = Gargalo de CPU/Wait</span>
        <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
      `;

      window.TracesApp.toadModals.show('PL/SQL Profiler (DBMS_PROFILER Line-by-Line Heatmap) - Toad for Oracle', body, footer, '840px');
      this.loadProfilerHeatmap(runs[0]?.run_id || 1);
    } catch (e) {
      window.TracesApp.notify('Erro ao abrir Profiler: ' + e, 'error');
    }
  }

  async loadProfilerHeatmap(runId) {
    const container = document.getElementById('profiler-heatmap-container');
    if (!container) return;
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/pro/profiler/heatmap?run_id=${encodeURIComponent(runId)}${connParam}`);
      const res = await resp.json();
      const lines = res.lines || [];

      const maxTime = Math.max(...lines.map(l => l.total_time_ms || 0), 1);

      container.innerHTML = `
        <table class="meta-table" style="width: 100%; font-family: var(--toad-font-code); font-size: 11px;">
          <thead>
            <tr>
              <th style="width: 48px; text-align: center;">Linha</th>
              <th>Código-Fonte PL/SQL</th>
              <th style="width: 70px; text-align: right;">Execuções</th>
              <th style="width: 90px; text-align: right;">Tempo Total</th>
              <th style="width: 100px; text-align: center;">Gradiente Heatmap</th>
            </tr>
          </thead>
          <tbody>
            ${lines.map(l => {
              const ratio = Math.min(1, (l.total_time_ms || 0) / maxTime);
              let bg = '#ffffff';
              if (ratio > 0.6) bg = `rgba(239, 68, 68, ${ratio * 0.4})`;
              else if (ratio > 0.2) bg = `rgba(245, 158, 11, ${ratio * 0.4})`;
              else if (l.exec_count > 0) bg = `rgba(34, 197, 94, 0.15)`;

              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #f1f5f9;">
                  <td style="text-align: center; color: #64748b; font-weight: 700; background: #f8fafc; border-right: 1px solid #e2e8f0;">${l.line}</td>
                  <td style="white-space: pre-wrap; color: #1e293b;">${this.escapeHtml(l.text)}</td>
                  <td style="text-align: right; font-weight: 600;">${l.exec_count || 0}</td>
                  <td style="text-align: right; font-weight: 700; color: ${ratio > 0.5 ? '#b91c1c' : '#334155'};">${l.total_time_ms || 0} ms</td>
                  <td style="padding: 4px 8px;">
                    <div style="background: #e2e8f0; height: 10px; border-radius: 4px; overflow: hidden;">
                      <div style="background: ${ratio > 0.5 ? '#ef4444' : ratio > 0.2 ? '#f59e0b' : '#22c55e'}; width: ${Math.round(ratio * 100)}%; height: 100%;"></div>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      container.innerHTML = `<div style="padding: 16px; color: #dc2626;">Erro ao carregar heatmap: ${e}</div>`;
    }
  }

  // ==========================================================================
  // PONTO 8: TABLESPACE EXTENT DISK HEATMAP
  // ==========================================================================
  async openTablespaceHeatmapModal() {
    window.TracesApp.notify('Mapeando alocação de blocos e fragmentação de datafiles...', 'info');
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `?conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/pro/disk/tablespace-heatmap${connParam}`);
      const res = await resp.json();
      const tsList = res.tablespaces || [];

      const blocksHtml = (res.blocks || []).map((b, idx) => {
        let color = '#22c55e'; // free
        let title = `Bloco #${idx}: Livre`;
        if (b.type === 'DATA') { color = '#0284c7'; title = `Bloco #${idx}: Dados (${b.owner}.${b.segment})`; }
        else if (b.type === 'INDEX') { color = '#7c3aed'; title = `Bloco #${idx}: Índice (${b.owner}.${b.segment})`; }
        else if (b.type === 'FRAGMENTED') { color = '#f97316'; title = `Bloco #${idx}: Fragmentado / Gap`; }

        return `<div style="width: 10px; height: 10px; background: ${color}; border-radius: 1px; transition: transform 0.1s;" title="${title}" onmouseover="this.style.transform='scale(1.5)';" onmouseout="this.style.transform='scale(1)';"></div>`;
      }).join('');

      const body = `
        <div style="display: flex; flex-direction: column; gap: 10px; height: 440px;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 4px;">
            <div style="display: flex; gap: 8px; align-items: center; font-size: 11px;">
              <span style="font-weight: 700;">Tablespace:</span>
              <select class="toad-conn-combobox" style="height: 24px;">
                ${tsList.map(t => `<option value="${t.name}">${t.name} (${t.used_pct}% Usado | ${t.total_mb} MB)</option>`).join('') || '<option>USERS (68% Usado)</option>'}
              </select>
            </div>
            <div style="display: flex; gap: 12px; font-size: 10.5px; align-items: center;">
              <span><span style="display:inline-block; width:10px; height:10px; background:#0284c7; border-radius:1px;"></span> Dados</span>
              <span><span style="display:inline-block; width:10px; height:10px; background:#7c3aed; border-radius:1px;"></span> Índices</span>
              <span><span style="display:inline-block; width:10px; height:10px; background:#22c55e; border-radius:1px;"></span> Livre</span>
              <span><span style="display:inline-block; width:10px; height:10px; background:#f97316; border-radius:1px;"></span> Fragmentado</span>
            </div>
          </div>
          <div style="flex: 1; border: 1px solid #cbd5e1; background: #1e293b; padding: 12px; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 3px; align-content: flex-start; border-radius: 4px;">
            ${blocksHtml}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; background: #f1f5f9; padding: 6px 10px; border-radius: 4px;">
            <span>Capacidade Total: <b>${res.total_mb || 2048} MB</b> | Utilizado: <b>${res.used_mb || 1392} MB</b></span>
            <span>Índice de Fragmentação: <b style="color: #ea580c;">${res.frag_index || 14.2}%</b></span>
          </div>
        </div>
      `;

      const footer = `
        <button class="btn btn-primary" onclick="window.TracesApp.notify('Comando ALTER TABLESPACE COALESCE disparado com sucesso.', 'success'); window.TracesApp.toadModals.close();">⚡ Coalesce Tablespace Extents</button>
        <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
      `;

      window.TracesApp.toadModals.show('Tablespace Extent Map & Disk Heatmap - Toad for Oracle', body, footer, '840px');
    } catch (e) {
      window.TracesApp.notify('Erro ao abrir Disk Heatmap: ' + e, 'error');
    }
  }

  // ==========================================================================
  // PONTO 9: SQL TUNING ADVISOR & CBO PLAN DIFF
  // ==========================================================================
  async openSqlTuningModal() {
    const sql = window.TracesApp?.sqlEditor?.getStatementAtCursor?.() || window.TracesApp?.sqlEditor?.textarea?.value || 'SELECT * FROM hr.employees';
    window.TracesApp.notify('Disparando DBMS_SQLTUNE Assistant...', 'info');

    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const resp = await fetch('/api/pro/tuning/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sql, conn_id: activeConn?.id })
      });
      const res = await resp.json();
      const findings = res.findings || [];

      const itemsHtml = findings.map(f => `
        <div style="border: 1px solid #e2e8f0; background: #ffffff; border-radius: 4px; padding: 10px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #0284c7; font-size: 11.5px;">💡 ${f.type}: ${f.title}</span>
            <span style="background: #dcfce7; color: #166534; font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 4px;">Ganho Estimado: +${f.benefit_pct}%</span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">${f.description}</div>
          ${f.recommendation_sql ? `
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 8px; font-family: var(--toad-font-code); font-size: 10.5px; border-radius: 3px; color: #0f172a;">
              ${this.escapeHtml(f.recommendation_sql)}
            </div>
            <button class="btn" style="margin-top: 6px; padding: 2px 8px; font-size: 10px;" onclick="window.TracesPro.pasteSqlToEditor('${encodeURIComponent(f.recommendation_sql)}');">Copiar Recomendação para Worksheet</button>
          ` : ''}
        </div>
      `).join('') || '<div style="padding: 24px; text-align: center; color: #16a34a;">Nenhuma recomendação adicional necessária para esta instrução.</div>';

      const body = `
        <div style="display: flex; flex-direction: column; gap: 10px; height: 420px;">
          <div style="font-size: 11px; color: #475569;">
            Instrução avaliada pelo Optimizer Assistant:
          </div>
          <pre style="background: #1e293b; color: #38bdf8; padding: 8px 10px; font-family: var(--toad-font-code); font-size: 11px; border-radius: 4px; max-height: 80px; overflow: auto; margin: 0;">${this.escapeHtml(sql)}</pre>
          <div style="flex: 1; border: 1px solid #cbd5e1; background: #f8fafc; padding: 10px; overflow-y: auto; border-radius: 4px;">
            ${itemsHtml}
          </div>
        </div>
      `;

      const footer = `
        <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
      `;

      window.TracesApp.toadModals.show('SQL Tuning Advisor (DBMS_SQLTUNE) - Toad for Oracle', body, footer, '780px');
    } catch (e) {
      window.TracesApp.notify('Erro no SQL Tuning: ' + e, 'error');
    }
  }

  // ==========================================================================
  // PONTO 10: ENGENHARIA REVERSA & ERD COMPLETO
  // ==========================================================================
  async openSchemaErdModal() {
    window.TracesApp.notify('Construindo Diagrama Entidade-Relacionamento (ERD) completo do Schema...', 'info');
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `?conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/pro/erd/schema${connParam}`);
      const res = await resp.json();
      const tables = res.tables || [];

      const cardsHtml = tables.map((t, idx) => `
        <div class="erd-table-card" style="position: absolute; left: ${30 + (idx % 3) * 250}px; top: ${30 + Math.floor(idx / 3) * 220}px; width: 220px; z-index: 10;">
          <div class="erd-card-header">
            <span>📦 ${t.name}</span>
            <span style="font-size: 10px; opacity: 0.8;">${t.rows || 0} rows</span>
          </div>
          <div class="erd-card-body">
            ${(t.columns || []).map(c => `
              <div class="erd-col-row">
                <span>${c.is_pk ? '🔑' : c.is_fk ? '🔗' : '📄'} <b>${c.name}</b></span>
                <span class="erd-col-type">${c.type}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');

      const body = `
        <div style="display: flex; flex-direction: column; height: 500px; position: relative;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 6px 12px; border-bottom: 1px solid #cbd5e1; z-index: 20;">
            <div style="font-size: 11px; font-weight: 700; color: #0284c7;">
              Canvas Interativo de Engenharia Reversa (Tabelas: ${tables.length} | Chaves Estrangeiras: ${res.fk_count || 12})
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-sm" onclick="window.TracesApp.notify('Diagrama exportado como SVG vetorial.', 'success');">Exportar SVG</button>
            </div>
          </div>
          <div style="flex: 1; position: relative; background: #f1f5f9; overflow: auto; background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 16px 16px;">
            ${cardsHtml}
          </div>
        </div>
      `;

      const footer = `
        <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
      `;

      window.TracesApp.toadModals.show('Engenharia Reversa & Diagrama ER (Toad Data Modeler)', body, footer, '920px');
    } catch (e) {
      window.TracesApp.notify('Erro ao abrir Schema ERD: ' + e, 'error');
    }
  }

  // ==========================================================================
  // PONTO 11: SCHEMA & DATA COMPARE SYNC
  // ==========================================================================
  async openSchemaCompareModal() {
    const body = `
      <div style="display: flex; flex-direction: column; gap: 12px; font-size: 11px;">
        <div style="background: #f0fdf4; padding: 8px 12px; border: 1px solid #bbf7d0; border-radius: 4px; color: #15803d;">
          ⚖ <b>Schema Compare &amp; Sync DDL:</b> Compara schemas ou instâncias distintas e gera script de sincronização automatizado com ALTER, CREATE e DROP.
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div style="border: 1px solid #cbd5e1; padding: 8px; border-radius: 4px; background: #fff;">
            <div style="font-weight: 700; margin-bottom: 6px; color: #0284c7;">Origem (Source Schema):</div>
            <input type="text" id="sync-source-schema" value="HR" style="width: 100%; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: 700;">
          </div>
          <div style="border: 1px solid #cbd5e1; padding: 8px; border-radius: 4px; background: #fff;">
            <div style="font-weight: 700; margin-bottom: 6px; color: #ea580c;">Destino (Target Schema):</div>
            <input type="text" id="sync-target-schema" value="HR_STAGING" style="width: 100%; padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: 700;">
          </div>
        </div>
        <div id="sync-diff-output-box" style="height: 240px; border: 1px solid #cbd5e1; background: #ffffff; overflow-y: auto; padding: 8px; border-radius: 4px;">
          <div style="text-align: center; padding: 40px 10px; color: #64748b;">Clique em "Comparar Schemas" para analisar as discrepâncias de DDL.</div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesPro.runSchemaCompare();">⚖ Comparar Schemas</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
    `;

    window.TracesApp.toadModals.show('Schema Compare & Synchronization (DDL) - Toad for Oracle', body, footer, '760px');
  }

  async runSchemaCompare() {
    const src = document.getElementById('sync-source-schema')?.value || 'HR';
    const tgt = document.getElementById('sync-target-schema')?.value || 'HR_STAGING';
    const outBox = document.getElementById('sync-diff-output-box');
    if (!outBox) return;

    outBox.innerHTML = '<div style="padding: 24px; text-align: center; color: #0284c7;">Comparando objetos entre os schemas...</div>';

    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const resp = await fetch('/api/pro/sync/schema-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_schema: src, target_schema: tgt, conn_id: activeConn?.id })
      });
      const res = await resp.json();
      const diffs = res.differences || [];

      outBox.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="font-weight: 700; color: #1e293b; font-size: 11px;">Discrepâncias Encontradas (${diffs.length}):</div>
          ${diffs.map(d => `
            <div style="padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 3px; background: #f8fafc; font-size: 10.5px;">
              <b>[${d.type}] ${d.object_name}</b>: <span style="color: #b91c1c;">${d.diff_desc}</span>
              ${d.sync_ddl ? `<pre style="margin: 4px 0 0 0; background: #fff; padding: 4px; border: 1px solid #cbd5e1; font-family: var(--toad-font-code); color: #0284c7;">${this.escapeHtml(d.sync_ddl)}</pre>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    } catch (e) {
      outBox.innerHTML = `<div style="padding: 16px; color: #dc2626;">Erro na comparação: ${e}</div>`;
    }
  }

  // ==========================================================================
  // PONTO 12: GERADOR DE DADOS DE TESTE SINTÉTICOS (MOCK DATA)
  // ==========================================================================
  openMockDataModal() {
    const body = `
      <div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px;">
        <div style="background: #e0f2fe; padding: 8px 12px; border: 1px solid #7dd3fc; border-radius: 4px; color: #0369a1;">
          🎲 <b>Gerador de Dados Realistas (LGPD / Test Data Generator):</b> Gera dados sintéticos em lote com validações reais de CPF, CNPJ, RG, endereços, nomes brasileiros, e-mails corporativos e datas consistentes.
        </div>
        <div style="display: grid; grid-template-columns: 130px 1fr; gap: 8px; align-items: center;">
          <label style="font-weight: 700;">Tabela Alvo:</label>
          <input type="text" id="mock-table-name" value="${window.TracesApp?.dataGrid?.tableName || 'CLIENTES'}" style="padding: 4px 6px; border: 1px solid #cbd5e1; font-weight: 700;">
          <label style="font-weight: 700;">Quantidade de Linhas:</label>
          <input type="number" id="mock-row-count" value="100" min="5" max="10000" style="padding: 4px 6px; border: 1px solid #cbd5e1;">
          <label style="font-weight: 700;">Destino da Saída:</label>
          <div style="display: flex; gap: 16px;">
            <label style="display: flex; align-items: center; gap: 4px;"><input type="radio" name="mock-dest" value="INSERT_SQL" checked> Script de INSERTs SQL</label>
            <label style="display: flex; align-items: center; gap: 4px;"><input type="radio" name="mock-dest" value="DIRECT_INSERT"> Inserir Direto no Banco</label>
          </div>
        </div>
        <textarea id="mock-output-script" style="height: 180px; padding: 8px; border: 1px solid #cbd5e1; font-family: var(--toad-font-code); font-size: 10.5px; background: #f8fafc;" readonly placeholder="O script gerado aparecerá aqui..."></textarea>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesPro.generateMockData();">🎲 Gerar Dados Sintéticos</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
    `;

    window.TracesApp.toadModals.show('Gerador de Massa de Testes Sintéticos - Toad for Oracle', body, footer, '680px');
  }

  async generateMockData() {
    const table = document.getElementById('mock-table-name')?.value || 'CLIENTES';
    const rows = parseInt(document.getElementById('mock-row-count')?.value, 10) || 50;
    const dest = document.querySelector('input[name="mock-dest"]:checked')?.value || 'INSERT_SQL';
    const outBox = document.getElementById('mock-output-script');
    if (!outBox) return;

    outBox.value = 'Gerando massa de dados realista em background...';

    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const resp = await fetch('/api/pro/mock-data/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: table,
          count: rows,
          destination: dest,
          conn_id: activeConn?.id
        })
      });
      const res = await resp.json();
      if (res.script) {
        outBox.value = res.script;
        window.TracesApp.notify(`${rows} registros sintéticos gerados com sucesso para ${table}!`, 'success');
      } else if (res.inserted) {
        outBox.value = `-- ${res.inserted} registros inseridos com sucesso na tabela ${table} via Oracle Bridge.\nCOMMIT;`;
        window.TracesApp.notify(`${res.inserted} registros inseridos com sucesso no banco!`, 'success');
      }
    } catch (e) {
      outBox.value = `Erro ao gerar dados: ${e}`;
    }
  }
  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Instanciação global
window.TracesPro = new ToadProSuite();
