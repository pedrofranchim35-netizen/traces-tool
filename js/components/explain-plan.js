/* ==========================================================================
   EXPLAIN PLAN & SQL OPTIMIZER COMPONENT
   ========================================================================== */

class ExplainPlan {
  constructor() {
    this.selectedNodeId = 0;
    this.planTree = {
      id: 0,
      operation: 'SELECT STATEMENT',
      options: null,
      objectOwner: null,
      objectName: null,
      cost: 24,
      cardinality: 107,
      bytes: 14231,
      cpuCost: 1280000,
      ioCost: 22,
      tempSpace: 0,
      filterPredicates: null,
      accessPredicates: null,
      bottleneck: false,
      children: [
        {
          id: 1,
          operation: 'SORT',
          options: 'ORDER BY',
          objectOwner: null,
          objectName: null,
          cost: 24,
          cardinality: 107,
          bytes: 14231,
          cpuCost: 1280000,
          ioCost: 22,
          tempSpace: 0,
          filterPredicates: null,
          accessPredicates: null,
          bottleneck: false,
          children: [
            {
              id: 2,
              operation: 'HASH JOIN',
              options: null,
              objectOwner: null,
              objectName: null,
              cost: 20,
              cardinality: 107,
              bytes: 14231,
              cpuCost: 890000,
              ioCost: 19,
              tempSpace: 0,
              filterPredicates: null,
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
                  filterPredicates: null,
                  accessPredicates: null,
                  bottleneck: false,
                  children: []
                },
                {
                  id: 4,
                  operation: 'HASH JOIN',
                  options: null,
                  objectOwner: null,
                  objectName: null,
                  cost: 16,
                  cardinality: 107,
                  bytes: 11936,
                  cpuCost: 650000,
                  ioCost: 16,
                  tempSpace: 0,
                  filterPredicates: null,
                  accessPredicates: 'E.JOB_ID = J.JOB_ID',
                  bottleneck: false,
                  children: [
                    {
                      id: 5,
                      operation: 'TABLE ACCESS',
                      options: 'FULL',
                      objectOwner: 'HR',
                      objectName: 'JOBS',
                      cost: 3,
                      cardinality: 19,
                      bytes: 1178,
                      cpuCost: 28000,
                      ioCost: 3,
                      tempSpace: 0,
                      filterPredicates: null,
                      accessPredicates: null,
                      bottleneck: false,
                      children: []
                    },
                    {
                      id: 6,
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
                      accessPredicates: null,
                      bottleneck: true,
                      bottleneckReason: 'Full Table Scan: Unindexed filter condition on SALARY',
                      children: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    this.initElements();
    this.render();
  }

  initElements() {
    this.treeCanvas = document.getElementById('plan-tree-canvas');
    this.metricTotalCost = document.getElementById('plan-metric-cost');
    this.metricCardinality = document.getElementById('plan-metric-cardinality');
    this.metricIoCost = document.getElementById('plan-metric-io');
    this.metricCpuCost = document.getElementById('plan-metric-cpu');
    this.advisorPane = document.getElementById('optimizer-advisor-pane');
  }

  generatePlan(sql) {
    if (sql && sql.toLowerCase().includes('sales_transactions')) {
      this.planTree.cost = 380;
      this.planTree.children[0].children[0].children[1].objectName = 'SALES_TRANSACTIONS';
      this.planTree.children[0].children[0].children[1].options = 'PARTITION RANGE ALL';
    } else {
      this.planTree.cost = 24;
    }
    this.render();
  }

  render() {
    this.renderMetrics();
    this.renderTree();
    this.renderAdvisor();
  }

  renderMetrics() {
    if (this.metricTotalCost) this.metricTotalCost.textContent = this.planTree.cost;
    if (this.metricCardinality) this.metricCardinality.textContent = this.planTree.cardinality.toLocaleString();
    if (this.metricIoCost) this.metricIoCost.textContent = this.planTree.ioCost;
    if (this.metricCpuCost) this.metricCpuCost.textContent = (this.planTree.cpuCost / 1000000).toFixed(2) + ' M';
  }

  renderTree() {
    this.treeCanvas.innerHTML = `
      <div class="plan-tree-wrapper">
        ${this.renderNodeHtml(this.planTree)}
      </div>
    `;
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
              <span class="stat-val ${node.cost > 20 ? 'cost-high' : ''}">${node.cost}</span>
            </div>
            <div class="stat-item">
              <span class="stat-lbl">Rows</span>
              <span class="stat-val">${node.cardinality.toLocaleString()}</span>
            </div>
            <div class="stat-item">
              <span class="stat-lbl">I/O Cost</span>
              <span class="stat-val">${node.ioCost}</span>
            </div>
            <div class="stat-item">
              <span class="stat-lbl">Bytes</span>
              <span class="stat-val">${node.bytes}</span>
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

  renderAdvisor() {
    this.advisorPane.innerHTML = `
      <div class="advisor-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
        </svg>
        <span>Oracle SQL Optimizer Advisor</span>
      </div>

      <div class="advisor-card alert">
        <div class="advisor-card-title" style="color: var(--traces-red);">
          Bottleneck: Full Table Scan on HR.EMPLOYEES
        </div>
        <div class="advisor-card-desc">
          Predicate <code>salary >= 6000</code> forces a full table scan across 24 blocks. Creating a B-tree index on SALARY will allow index range scanning and reduce query cost from 24 to 4.
        </div>
        <div class="hint-code-box">
          CREATE INDEX hr.emp_salary_ix ON hr.employees (salary);
        </div>
        <button class="btn btn-secondary" style="height: 26px; font-size: 11px; margin-top: 4px;" onclick="window.TracesApp.notify('Index recommendation copied.', 'info')">
          Copy DDL Recommendation
        </button>
      </div>

      <div class="advisor-card">
        <div class="advisor-card-title">Optimizer Hint Suggestion: Index Scan</div>
        <div class="advisor-card-desc">
          Enforce B-tree index access path over EMPLOYEES:
        </div>
        <div class="hint-code-box">
          /*+ INDEX(e emp_salary_ix) */
        </div>
        <button class="btn btn-secondary" style="height: 26px; font-size: 11px;" onclick="window.TracesApp.applyOptimizerHint('/*+ INDEX(e emp_salary_ix) */')">
          Apply to Worksheet
        </button>
      </div>

      <div class="advisor-card">
        <div class="advisor-card-title">Optimizer Hint Suggestion: Join Order</div>
        <div class="advisor-card-desc">
          Enforce driving table order and Nested Loops join:
        </div>
        <div class="hint-code-box">
          /*+ LEADING(e d j) USE_NL(d j) */
        </div>
        <button class="btn btn-secondary" style="height: 26px; font-size: 11px;" onclick="window.TracesApp.applyOptimizerHint('/*+ LEADING(e d j) USE_NL(d j) */')">
          Apply to Worksheet
        </button>
      </div>
    `;
  }
}

window.ExplainPlan = ExplainPlan;
