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
  }

  initElements() {
    this.treeCanvas = document.getElementById('plan-tree-canvas');
    this.metricTotalCost = document.getElementById('plan-metric-cost');
    this.metricCardinality = document.getElementById('plan-metric-cardinality');
    this.metricIoCost = document.getElementById('plan-metric-io');
    this.metricCpuCost = document.getElementById('plan-metric-cpu');
    this.advisorPane = document.getElementById('optimizer-advisor-pane');
  }

  async generatePlan(sql) {
    if (!sql || !sql.trim()) {
      window.TracesApp.notify('Nenhuma query SQL para gerar o Explain Plan.', 'warning');
      return;
    }

    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      window.TracesApp.notify('Gerando Execution Plan via DBMS_XPLAN e PLAN_TABLE...', 'info');
      try {
        const resp = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await resp.json();

        if (data.error) {
          window.TracesApp.notify(`Erro no Explain Plan: ${data.error}`, 'error');
          return;
        }

        this.planText = data.planText || '';

        if (data.nodes && data.nodes.length > 0) {
          this.planTree = this.buildTreeFromNodes(data.nodes);
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
      this.planTree.children[0].children[0].children[1].objectName = 'SALES_TRANSACTIONS';
      this.planTree.children[0].children[0].children[1].options = 'PARTITION RANGE ALL';
    } else {
      this.initDefaultPlan();
    }
    this.render();
    window.TracesApp.notify('Explain Plan gerado (Modo Local).', 'info');
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
        <div style="background: #1e1e1e; color: #f8fafc; padding: 14px; font-family: var(--font-code); font-size: 11px; line-height: 1.45; overflow-x: auto; border-radius: 4px; border: 1px solid #334155; white-space: pre;">${this.escapeHtml(this.planText || '-- Run Explain Plan on connected Oracle Database to see DBMS_XPLAN')}</div>
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
