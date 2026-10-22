/* ==========================================================================
   EXPLAIN PLAN & SQL OPTIMIZER COMPONENT - TOAD FOR ORACLE 1:1
   Uses PLAN_TABLE hierarchical tree matching ExplainPlancolumnDefs.xml
   and DBMS_XPLAN.DISPLAY text output.
   ========================================================================== */

class ExplainPlan {
  constructor() {
    this.selectedNodeId = 0;
    this.planTree = null;
    this.planText = '';
    this.activeSubtab = 'tree'; // 'tree' | 'text'
    this.currentSql = '';
    this.currentSource = 'ÚLTIMA QUERY EXECUTADA';
    this.currentTimestamp = '';

    this.initDefaultPlan();
    this.initElements();
    this.render();
    this.loadColumnDefs();
  }

  async loadColumnDefs() {
    try {
      const resp = await fetch('assets/explain_plan_cols.json');
      if (resp.ok) {
        this.planColumns = await resp.json();
      }
    } catch (e) {}
  }

  initDefaultPlan() {
    this.planTree = {
      id: 0,
      operation: 'SELECT STATEMENT',
      options: '',
      objectOwner: '',
      objectName: '',
      cost: 24,
      cardinality: 107,
      bytes: 14231,
      cpuCost: 1280000,
      ioCost: 22,
      tempSpace: 0,
      filterPredicates: '',
      accessPredicates: '',
      bottleneck: false,
      children: [
        {
          id: 1,
          operation: 'SORT',
          options: 'ORDER BY',
          objectOwner: '',
          objectName: '',
          cost: 24,
          cardinality: 107,
          bytes: 14231,
          cpuCost: 1280000,
          ioCost: 22,
          tempSpace: 0,
          filterPredicates: '',
          accessPredicates: '',
          bottleneck: false,
          children: [
            {
              id: 2,
              operation: 'HASH JOIN',
              options: '',
              objectOwner: '',
              objectName: '',
              cost: 20,
              cardinality: 107,
              bytes: 14231,
              cpuCost: 890000,
              ioCost: 19,
              tempSpace: 0,
              filterPredicates: '',
              accessPredicates: 'E.DEPARTMENT_ID = D.DEPARTMENT_ID',
              bottleneck: false,
              children: [
                {
                  id: 3,
                  operation: 'TABLE ACCESS',
                  options: 'FULL',
                  objectOwner: 'HR',
                  objectName: 'DEPARTMENTS',
                  cost: 3,
                  cardinality: 27,
                  bytes: 2295,
                  cpuCost: 35000,
                  ioCost: 3,
                  tempSpace: 0,
                  filterPredicates: '',
                  accessPredicates: '',
                  bottleneck: false,
                  children: []
                },
                {
                  id: 4,
                  operation: 'TABLE ACCESS',
                  options: 'FULL',
                  objectOwner: 'HR',
                  objectName: 'EMPLOYEES',
                  cost: 12,
                  cardinality: 107,
                  bytes: 10758,
                  cpuCost: 510000,
                  ioCost: 12,
                  tempSpace: 0,
                  filterPredicates: 'E.SALARY >= 6000',
                  accessPredicates: '',
                  bottleneck: true,
                  bottleneckReason: 'Full Table Scan: Predicate filter on unindexed column SALARY',
                  children: []
                }
              ]
            }
          ]
        }
      ]
    };
    this.planText = `Plan hash value: 60291807

----------------------------------------------------------------------
| Id  | Operation            | Name           | Starts | E-Rows |
----------------------------------------------------------------------
|   0 | SELECT STATEMENT     |                |      1 |        |
|   1 |   SORT AGGREGATE     |                |      1 |      1 |
|   2 |     NESTED LOOPS     |                |      1 |   145K |
|*  3 |       TABLE ACCESS FULL| CUSTOMERS      |      1 |   1115 |
|*  4 |       INDEX RANGE SCAN | SALES_CUST_IDX |   3341 |    130 |
----------------------------------------------------------------------

Predicate Information (identified by operation id):
---------------------------------------------------
*  3 - filter("CUSTOMERS"."STATUS"='ACTIVE')
*  4 - access("SALES"."CUST_ID"="CUSTOMERS"."ID")`;
  }

  formatToadDbmsXplan(nodes, planHash = '60291807') {
    if (!nodes || nodes.length === 0) return '';
    const formatErows = (val, id = 0, op = '') => {
      if ((id === 0 && (op || '').toUpperCase().includes('STATEMENT')) || val == null || val === '') return '';
      const n = Number(val);
      if (isNaN(n)) return String(val);
      if (n >= 1000000000) return `${Math.round(n / 1000000000)}G`;
      if (n >= 100000000) return `${Math.round(n / 1000000)}M`;
      if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`.replace('.0M', 'M');
      if (n >= 10000) return `${Math.round(n / 1000)}K`;
      return String(n);
    };

    const byId = {};
    const childrenMap = {};
    nodes.forEach(n => {
      byId[n.id] = Object.assign({}, n);
      childrenMap[n.id] = [];
    });
    nodes.forEach(n => {
      if (n.parentId != null && childrenMap[n.parentId] && n.parentId !== n.id) {
        childrenMap[n.parentId].push(n.id);
      }
    });

    const computeStats = (nid, depth = 0, parentStarts = 1, isInner = false, outerCard = 1) => {
      if (!byId[nid]) return;
      const n = byId[nid];
      n.depth = depth;
      if (n.starts != null && n.starts !== 0) {
        n.calcStarts = Number(n.starts);
      } else if (nid === 0) {
        n.calcStarts = 1;
      } else if (isInner) {
        n.calcStarts = Math.max(1, parentStarts * outerCard);
      } else {
        n.calcStarts = Math.max(1, parentStarts);
      }

      const ch = childrenMap[nid] || [];
      const op = (n.operation || '').toUpperCase();
      const isLoop = op.includes('NESTED LOOPS') || op.includes('FILTER');
      let firstCard = 1;
      ch.forEach((cid, idx) => {
        const childNode = byId[cid];
        if (idx === 0) {
          computeStats(cid, depth + 1, n.calcStarts, false, 1);
          firstCard = Number(childNode?.cardinality || childNode?.a_rows || 1);
        } else {
          computeStats(cid, depth + 1, n.calcStarts, isLoop, firstCard);
        }
      });
    };

    const rootId = nodes[0]?.id ?? 0;
    computeStats(rootId);

    const tableRows = [];
    const preds = [];
    nodes.forEach(n => {
      const nid = n.id;
      const hasPred = Boolean(n.accessPredicates || n.filterPredicates);
      const star = hasPred ? '*' : ' ';
      const idCol = `${star}${String(nid).padStart(3, ' ')}`;
      const depth = byId[nid]?.depth || 0;
      const indent = '  '.repeat(depth);
      let opTitle = n.operation || '';
      if (n.options) opTitle += ` ${n.options}`;
      const opStr = `${indent}${opTitle}`;
      const nameStr = n.objectName || '';
      const startsVal = byId[nid]?.calcStarts ?? 1;
      const startsStr = String(startsVal);
      const erowsStr = formatErows(n.cardinality, nid, opTitle);
      tableRows.push([idCol, opStr, nameStr, startsStr, erowsStr]);

      if (n.filterPredicates) preds.push({ id: nid, type: 'filter', txt: n.filterPredicates });
      if (n.accessPredicates) preds.push({ id: nid, type: 'access', txt: n.accessPredicates });
    });

    const wOp = Math.max(9, ...tableRows.map(r => r[1].length));
    const wName = Math.max(4, ...tableRows.map(r => r[2].length));
    const wStarts = Math.max(6, ...tableRows.map(r => r[3].length));
    const wErows = Math.max(6, ...tableRows.map(r => r[4].length));

    const header = `| Id  | ${'Operation'.padEnd(wOp, ' ')} | ${'Name'.padEnd(wName, ' ')} | ${'Starts'.padStart(wStarts, ' ')} | ${'E-Rows'.padStart(wErows, ' ')} |`;
    const dash = '-'.repeat(header.length);

    const lines = [];
    if (planHash) {
      lines.push(`Plan hash value: ${planHash}`);
      lines.push('');
    }
    lines.push(dash);
    lines.push(header);
    lines.push(dash);
    tableRows.forEach(r => {
      const rawId = r[0];
      const idPart = rawId.startsWith('*') ? `*${rawId.substring(1).padStart(3, ' ')}` : rawId.padStart(4, ' ');
      lines.push(`|${idPart} | ${r[1].padEnd(wOp, ' ')} | ${r[2].padEnd(wName, ' ')} | ${r[3].padStart(wStarts, ' ')} | ${r[4].padStart(wErows, ' ')} |`);
    });
    lines.push(dash);

    if (preds.length > 0) {
      lines.push('');
      lines.push('Predicate Information (identified by operation id):');
      lines.push('---------------------------------------------------');
      preds.sort((a, b) => a.id - b.id);
      preds.forEach(p => {
        lines.push(`*${String(p.id).padStart(3, ' ')} - ${p.type}(${p.txt})`);
      });
    }

    return lines.join('\n');
  }

  initElements() {
    this.treeCanvas = document.getElementById('plan-tree-canvas');
    this.metricTotalCost = document.getElementById('plan-metric-cost');
    this.metricCardinality = document.getElementById('plan-metric-cardinality');
    this.metricIoCost = document.getElementById('plan-metric-io');
    this.metricCpuCost = document.getElementById('plan-metric-cpu');
    this.advisorPane = document.getElementById('optimizer-advisor-pane');
  }

  getLastQuery() {
    return window.TracesApp?.lastExecutedQuery
      || window.TracesApp?.sqlEditor?.lastExecutedQuery
      || window.TracesApp?.dataGrid?.lastSql
      || (window.TRACES_DB?.savedSql?.[0]?.text)
      || '';
  }

  async generatePlanFromEditor() {
    const editor = window.TracesApp?.sqlEditor;
    let sql = '';
    if (editor?.textarea) {
      const selStart = editor.textarea.selectionStart;
      const selEnd = editor.textarea.selectionEnd;
      if (typeof selStart === 'number' && typeof selEnd === 'number' && selStart !== selEnd) {
        sql = editor.textarea.value.substring(selStart, selEnd).trim();
      }
    }
    if (!sql && editor) {
      sql = editor.getStatementAtCursor();
    }
    if (!sql && editor?.textarea) {
      sql = editor.textarea.value.trim();
    }
    return this.generatePlan(sql, 'EDITOR / CURSOR');
  }

  async generatePlan(sql = null, sourceLabel = null) {
    if (!sql || typeof sql !== 'string' || !sql.trim()) {
      sql = this.getLastQuery();
      sourceLabel = sourceLabel || 'ÚLTIMA QUERY EXECUTADA';
    } else {
      sourceLabel = sourceLabel || 'QUERY SELECIONADA';
    }

    if (!sql || !sql.trim()) {
      const editor = window.TracesApp?.sqlEditor;
      if (editor) {
        sql = editor.getStatementAtCursor() || editor.textarea?.value || '';
        sourceLabel = 'EDITOR / CURSOR';
      }
    }

    if (!sql || !sql.trim()) {
      window.TracesApp?.notify('Nenhuma query executada ou selecionada para gerar o Explain Plan.', 'warning');
      return;
    }

    // Clean query
    sql = sql.trim().replace(/;+\s*$/, '').trim();
    this.currentSql = sql;
    this.currentSource = sourceLabel;
    this.currentTimestamp = new Date().toLocaleTimeString();

    this.renderQueryBanner();

    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      window.TracesApp.notify('Gerando Execution Plan via DBMS_XPLAN e PLAN_TABLE...', 'info');
      try {
        const tab = window.TracesApp?.sqlEditor?.getActiveTab();
        let targetConnId = tab?.connId && tab.connId !== 'auto' ? tab.connId : null;
        if (!targetConnId) {
          targetConnId = window.TracesApp?.connectionManager?.activeConn?.id;
        }
        const payload = { sql };
        if (targetConnId) payload.conn_id = targetConnId;

        const resp = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await resp.json();

        if (data.error) {
          window.TracesApp.notify(`Erro no Explain Plan: ${data.error}`, 'error');
          this.planText = `-- Erro no Explain Plan retornado pelo Oracle:\n${data.error}\n\nQuery analisada:\n${sql}`;
          this.render();
          return;
        }

        this.planText = data.planText || '';
        if ((!this.planText || !this.planText.includes('Starts')) && data.nodes && data.nodes.length > 0) {
          this.planText = this.formatToadDbmsXplan(data.nodes, data.planHash);
        }

        if (data.nodes && data.nodes.length > 0) {
          this.planTree = this.buildTreeFromNodes(data.nodes);
        } else {
          this.planTree = {
            id: 0,
            operation: 'SELECT STATEMENT',
            options: '',
            objectOwner: '',
            objectName: '',
            cost: 1,
            cardinality: 1,
            bytes: 0,
            cpuCost: 0,
            ioCost: 0,
            tempSpace: 0,
            filterPredicates: '',
            accessPredicates: '',
            bottleneck: false,
            children: []
          };
        }

        this.render();
        window.TracesApp.notify('Execution Plan gerado com sucesso no Oracle.', 'success');
        return;
      } catch (err) {
        window.TracesApp.notify(`Falha ao comunicar com o banco: ${err.message}`, 'error');
      }
    }

    // Local fallback
    if (sql.toLowerCase().includes('sales_transactions')) {
      this.planTree.cost = 380;
      if (this.planTree.children?.[0]?.children?.[0]?.children?.[1]) {
        this.planTree.children[0].children[0].children[1].objectName = 'SALES_TRANSACTIONS';
        this.planTree.children[0].children[0].children[1].options = 'PARTITION RANGE ALL';
      }
    } else {
      this.initDefaultPlan();
    }
    this.render();
    window.TracesApp.notify('Explain Plan gerado (Modo Local).', 'info');
  }

  renderQueryBanner() {
    const badgeEl = document.getElementById('explain-query-badge');
    const timeEl = document.getElementById('explain-query-timestamp');
    const textEl = document.getElementById('explain-query-text');

    if (badgeEl) badgeEl.textContent = this.currentSource || 'ÚLTIMA QUERY EXECUTADA';
    if (timeEl) timeEl.textContent = this.currentTimestamp ? `Executada às ${this.currentTimestamp}` : '';
    if (textEl) textEl.textContent = this.currentSql || '-- Nenhuma query em análise';
  }

  copyCurrentSql() {
    if (!this.currentSql) return;
    navigator.clipboard.writeText(this.currentSql).then(() => {
      window.TracesApp?.notify('SQL copiado para a área de transferência.', 'success');
    }).catch(() => {
      window.TracesApp?.notify('Não foi possível copiar o SQL.', 'warning');
    });
  }

  onViewActivated() {
    const lastQuery = this.getLastQuery();
    if (lastQuery) {
      const cleanLast = lastQuery.trim().replace(/;+\s*$/, '').trim();
      if (!this.currentSql || this.currentSql !== cleanLast) {
        this.generatePlan(cleanLast, 'ÚLTIMA QUERY EXECUTADA');
      }
    } else if (!this.currentSql) {
      const editorQuery = window.TracesApp?.sqlEditor?.getStatementAtCursor();
      if (editorQuery) {
        this.generatePlan(editorQuery, 'EDITOR / CURSOR');
      }
    }
  }

  buildTreeFromNodes(flatNodes) {
    const nodeMap = {};
    flatNodes.forEach(n => {
      nodeMap[n.id] = Object.assign({}, n, { children: [] });
    });

    let root = null;
    flatNodes.forEach(n => {
      const current = nodeMap[n.id];
      if (n.parentId === null || n.parentId === undefined || n.id === 0) {
        if (!root) root = current;
      } else {
        const parent = nodeMap[n.parentId];
        if (parent) {
          parent.children.push(current);
        } else if (!root) {
          root = current;
        }
      }
    });

    return root || flatNodes[0];
  }

  render() {
    this.renderQueryBanner();
    this.renderMetrics();
    this.renderTree();
    this.renderAdvisor();
  }

  renderMetrics() {
    if (!this.planTree) return;
    if (this.metricTotalCost) this.metricTotalCost.textContent = this.planTree.cost || 0;
    if (this.metricCardinality) this.metricCardinality.textContent = (this.planTree.cardinality || 0).toLocaleString();
    if (this.metricIoCost) this.metricIoCost.textContent = this.planTree.ioCost || 0;
    if (this.metricCpuCost) this.metricCpuCost.textContent = this.planTree.cpuCost ? (this.planTree.cpuCost / 1000000).toFixed(2) + ' M' : '0 M';
  }

  renderTree() {
    if (!this.treeCanvas || !this.planTree) return;

    this.treeCanvas.innerHTML = `
      <div style="display: flex; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid var(--border-default); padding-bottom: 6px;">
        <button class="detail-tab ${this.activeSubtab === 'tree' ? 'active' : ''}" onclick="window.TracesApp.explainPlan.setSubtab('tree')">
          🌳 Visual Plan Tree
        </button>
        <button class="detail-tab ${this.activeSubtab === 'text' ? 'active' : ''}" onclick="window.TracesApp.explainPlan.setSubtab('text')">
          📄 DBMS_XPLAN Formatted Output
        </button>
      </div>

      ${this.activeSubtab === 'tree' ? `
        <div class="plan-tree-wrapper">
          ${this.renderNodeHtml(this.planTree)}
        </div>
      ` : `
        <div class="toad-xplan-view" style="background: #000000; border: 1px solid #27272a; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column;">
          <div style="background: #18181b; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #27272a;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #facc15; font-weight: 700; font-size: 11px; font-family: var(--font-code);">⚡ DBMS_XPLAN Formatted Output (Starts &amp; E-Rows)</span>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="btn" style="height: 22px; padding: 0 8px; font-size: 10px; background: #27272a; color: #facc15; border: 1px solid #3f3f46;" onclick="navigator.clipboard.writeText(window.TracesApp.explainPlan.planText || ''); window.TracesApp.notify('DBMS_XPLAN copiado!', 'success');">
                📋 Copiar XPlan
              </button>
            </div>
          </div>
          <pre style="margin: 0; padding: 16px 20px; overflow-x: auto; color: #facc15; background: #000000; font-family: 'Consolas', 'Cascadia Code', 'Fira Code', 'Courier New', monospace; font-size: 12px; line-height: 1.5; letter-spacing: 0.3px; user-select: text; white-space: pre;">${this.escapeHtml(this.planText || '-- Execute o Explain Plan em um banco Oracle conectado para visualizar o DBMS_XPLAN.')}</pre>
        </div>
      `}
    `;
  }

  setSubtab(tab) {
    this.activeSubtab = tab;
    this.renderTree();
  }

  renderNodeHtml(node) {
    const isSelected = this.selectedNodeId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
        <div class="plan-node-card ${node.bottleneck ? 'bottleneck' : ''} ${isSelected ? 'selected' : ''}"
             onclick="window.TracesApp.explainPlan.selectNode(${node.id})">
          <div class="node-header">
            <span class="node-operation">${node.operation} ${node.options ? `(${node.options})` : ''}</span>
            <span class="node-id-badge">ID: ${node.id}</span>
          </div>
          ${node.objectName ? `
            <div class="node-object">
              ${node.objectOwner ? node.objectOwner + '.' : ''}${node.objectName}
            </div>
          ` : ''}
          ${node.bottleneck ? `
            <div class="bottleneck-pill">
              ⚠ Bottleneck: ${node.bottleneckReason || 'High Cost Step'}
            </div>
          ` : ''}
          <div class="node-stats-row">
            <div class="stat-item">
              <span class="stat-lbl">Cost</span>
              <span class="stat-val ${node.cost > 20 ? 'cost-high' : ''}">${node.cost || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-lbl">Rows</span>
              <span class="stat-val">${(node.cardinality || 0).toLocaleString()}</span>
            </div>
            <div class="stat-item">
              <span class="stat-lbl">I/O Cost</span>
              <span class="stat-val">${node.ioCost || 0}</span>
            </div>
            <div class="stat-item">
              <span class="stat-lbl">Bytes</span>
              <span class="stat-val">${node.bytes || 0}</span>
            </div>
          </div>
          ${node.filterPredicates ? `
            <div style="margin-top: 6px; font-family: var(--font-code); font-size: 10px; color: #f59e0b;">
              filter: ${node.filterPredicates}
            </div>
          ` : ''}
          ${node.accessPredicates ? `
            <div style="margin-top: 6px; font-family: var(--font-code); font-size: 10px; color: #38bdf8;">
              access: ${node.accessPredicates}
            </div>
          ` : ''}
        </div>

        ${hasChildren ? `
          <div class="tree-branch">
            ${node.children.map(child => this.renderNodeHtml(child)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  selectNode(nodeId) {
    this.selectedNodeId = nodeId;
    this.renderTree();
  }

  collectPlanNodes(node, list = []) {
    if (!node) return list;
    list.push(node);
    if (node.children && node.children.length > 0) {
      node.children.forEach(c => this.collectPlanNodes(c, list));
    }
    return list;
  }

  renderAdvisor() {
    if (!this.advisorPane) return;
    const allNodes = this.collectPlanNodes(this.planTree);
    const fullScans = allNodes.filter(n => (n.operation === 'TABLE ACCESS' && /FULL/i.test(n.options || '')) || /FULL/i.test(n.operation || ''));
    const hashJoins = allNodes.filter(n => /HASH JOIN/i.test(n.operation || ''));
    const highCostNodes = allNodes.filter(n => (n.cost || 0) > 20);

    let cardsHtml = '';

    if (fullScans.length > 0) {
      fullScans.forEach(fn => {
        const obj = (fn.objectOwner ? fn.objectOwner + '.' : '') + (fn.objectName || 'TABLE');
        const ddl = `CREATE INDEX ${fn.objectOwner || 'HR'}.IDX_${(fn.objectName || 'TAB').toUpperCase()}_OPT ON ${obj} (/* filter columns */);`;
        const hint = `/*+ INDEX(${fn.objectName ? fn.objectName.toLowerCase() : 't'}) */`;
        cardsHtml += `
          <div class="advisor-card alert">
            <div class="advisor-card-title" style="color: var(--traces-red, #ef4444); font-weight: 700;">
              Bottleneck: Full Table Scan on ${obj} (Cost: ${fn.cost || 0})
            </div>
            <div class="advisor-card-desc" style="font-size: 11px; margin: 4px 0;">
              O Oracle Optimizer selecionou acesso TABLE ACCESS FULL. Avalie a criação de índice B-Tree para permitir Index Range Scan e reduzir Consistent Gets.
            </div>
            <div class="hint-code-box" style="font-family: var(--toad-font-code); font-size: 10.5px; background: #fff; border: 1px solid #ccc; padding: 6px; margin: 4px 0;">
              ${ddl}
            </div>
            <div style="display: flex; gap: 6px; margin-top: 4px;">
              <button class="btn" style="height: 24px; font-size: 11px;" onclick="window.TracesApp.applyOptimizerHint('${hint}')">
                Aplicar Hint ${hint}
              </button>
            </div>
          </div>
        `;
      });
    }

    if (hashJoins.length > 0) {
      cardsHtml += `
        <div class="advisor-card">
          <div class="advisor-card-title" style="font-weight: 700;">Join Method Advisor: Hash Join Detected</div>
          <div class="advisor-card-desc" style="font-size: 11px; margin: 4px 0;">
            Se o conjunto filtrado de linhas for pequeno (OLTP), considere forçar Nested Loops para início mais rápido do fetch:
          </div>
          <div class="hint-code-box" style="font-family: var(--toad-font-code); font-size: 10.5px; background: #fff; border: 1px solid #ccc; padding: 6px; margin: 4px 0;">
            /*+ USE_NL(d) */
          </div>
          <button class="btn" style="height: 24px; font-size: 11px;" onclick="window.TracesApp.applyOptimizerHint('/*+ USE_NL(d) */')">
            Aplicar Hint no Editor
          </button>
        </div>
      `;
    }

    if (!cardsHtml) {
      cardsHtml = `
        <div class="advisor-card" style="border-left: 3px solid #008000;">
          <div class="advisor-card-title" style="color: #008000; font-weight: 700;">Plano de Execução Otimizado</div>
          <div class="advisor-card-desc" style="font-size: 11px; margin-top: 4px;">
            Nenhum gargalo severo detectado pelo analisador de plano do Toad. A consulta está utilizando caminhos eficientes de acesso via índices.
          </div>
        </div>
      `;
    }

    this.advisorPane.innerHTML = `
      <div class="advisor-title" style="font-weight: 700; font-size: 13px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
        <span>Oracle SQL Optimizer Advisor</span>
      </div>
      ${cardsHtml}
    `;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.ExplainPlan = ExplainPlan;
