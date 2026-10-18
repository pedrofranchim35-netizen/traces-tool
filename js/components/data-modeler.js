/* ==========================================================================
   TOAD DATA MODELER & VISUAL QUERY BUILDER
   Interactive visual canvas for ER diagrams, draggable entity cards,
   automatic foreign key join resolution, and dynamic SQL query generation.
   ========================================================================== */

class DataModeler {
  constructor() {
    this.container = document.getElementById('view-modeler');
    this.selectedColumns = new Set(['e.employee_id', 'e.first_name', 'e.last_name', 'd.department_name', 'e.salary']);
    this.tables = [
      { id: 'tbl-emp', schema: 'HR', name: 'EMPLOYEES', alias: 'e', x: 40, y: 30, cols: [
        { name: 'EMPLOYEE_ID', pk: true, fk: false },
        { name: 'FIRST_NAME', pk: false, fk: false },
        { name: 'LAST_NAME', pk: false, fk: false },
        { name: 'EMAIL', pk: false, fk: false },
        { name: 'SALARY', pk: false, fk: false },
        { name: 'DEPARTMENT_ID', pk: false, fk: true },
        { name: 'JOB_ID', pk: false, fk: true }
      ]},
      { id: 'tbl-dept', schema: 'HR', name: 'DEPARTMENTS', alias: 'd', x: 340, y: 30, cols: [
        { name: 'DEPARTMENT_ID', pk: true, fk: false },
        { name: 'DEPARTMENT_NAME', pk: false, fk: false },
        { name: 'MANAGER_ID', pk: false, fk: false },
        { name: 'LOCATION_ID', pk: false, fk: false }
      ]},
      { id: 'tbl-jobs', schema: 'HR', name: 'JOBS', alias: 'j', x: 40, y: 260, cols: [
        { name: 'JOB_ID', pk: true, fk: false },
        { name: 'JOB_TITLE', pk: false, fk: false },
        { name: 'MIN_SALARY', pk: false, fk: false },
        { name: 'MAX_SALARY', pk: false, fk: false }
      ]},
      { id: 'tbl-cust', schema: 'SALES_ADMIN', name: 'CUSTOMERS', alias: 'c', x: 620, y: 30, cols: [
        { name: 'CUSTOMER_ID', pk: true, fk: false },
        { name: 'NAME', pk: false, fk: false },
        { name: 'TIER', pk: false, fk: false },
        { name: 'CREDIT_LIMIT', pk: false, fk: false }
      ]},
      { id: 'tbl-tx', schema: 'SALES_ADMIN', name: 'SALES_TRANSACTIONS', alias: 't', x: 620, y: 240, cols: [
        { name: 'TX_ID', pk: true, fk: false },
        { name: 'CUSTOMER_ID', pk: false, fk: true },
        { name: 'AMOUNT', pk: false, fk: false },
        { name: 'TX_DATE', pk: false, fk: false },
        { name: 'STATUS', pk: false, fk: false }
      ]}
    ];

    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="modeler-view-container">
        <!-- Sidebar -->
        <div class="modeler-sidebar">
          <div style="padding: 8px; background: #e4e4e4; font-weight: 700; font-size: 11px; border-bottom: 1px solid #ccc;">
            Model Entities (Drag to Canvas)
          </div>
          <div style="flex: 1; overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
            <div class="action-palette-item" onclick="window.TracesApp.notify('HR.EMPLOYEES already on canvas.', 'info');">📄 HR.EMPLOYEES</div>
            <div class="action-palette-item" onclick="window.TracesApp.notify('HR.DEPARTMENTS already on canvas.', 'info');">📄 HR.DEPARTMENTS</div>
            <div class="action-palette-item" onclick="window.TracesApp.notify('HR.JOBS already on canvas.', 'info');">📄 HR.JOBS</div>
            <div class="action-palette-item" onclick="window.TracesApp.notify('SALES_ADMIN.CUSTOMERS already on canvas.', 'info');">📄 SALES_ADMIN.CUSTOMERS</div>
            <div class="action-palette-item" onclick="window.TracesApp.notify('SALES_ADMIN.SALES_TRANSACTIONS already on canvas.', 'info');">📄 SALES_ADMIN.SALES_TRANSACTIONS</div>
            <div class="action-palette-item" onclick="window.TracesApp.notify('Added HR.JOB_HISTORY to canvas.', 'success');">+ HR.JOB_HISTORY</div>
            <div class="action-palette-item" onclick="window.TracesApp.notify('Added HR.LOCATIONS to canvas.', 'success');">+ HR.LOCATIONS</div>
          </div>
          <div style="padding: 8px; border-top: 1px solid #ccc; font-size: 10px; color: #666;">
            ER Diagrammer v2026.2<br>Reverse engineering active.
          </div>
        </div>

        <!-- Canvas & Query Builder Panel -->
        <div class="modeler-canvas-area">
          <div class="modeler-canvas" id="modeler-canvas-surface">
            <!-- SVG connector lines -->
            <svg style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index: 1;">
              <!-- Line 1: EMPLOYEES to DEPARTMENTS -->
              <path d="M 260 140 C 300 140, 300 100, 340 100" stroke="#0078d7" stroke-width="2" fill="none" stroke-dasharray="3,3"/>
              <!-- Line 2: EMPLOYEES to JOBS -->
              <path d="M 150 210 C 150 235, 150 235, 150 260" stroke="#10b981" stroke-width="2" fill="none"/>
              <!-- Line 3: CUSTOMERS to TRANSACTIONS -->
              <path d="M 730 190 C 730 215, 730 215, 730 240" stroke="#f59e0b" stroke-width="2" fill="none"/>
            </svg>

            <!-- Table Cards -->
            ${this.renderTableCards()}
          </div>

          <!-- Query Builder Bottom Panel -->
          <div class="query-builder-bottom-panel">
            <div class="query-builder-tabs">
              <div class="qb-tab active" id="qbtab-sql">Generated SQL Query</div>
              <div class="qb-tab" id="qbtab-joins" onclick="window.TracesApp.notify('Auto-detected 2 Foreign Key Joins: e.dept_id=d.dept_id, e.job_id=j.job_id', 'info');">Joins (2 Detected)</div>
              <div class="qb-tab" id="qbtab-criteria" onclick="window.TracesApp.notify('Criteria: WHERE e.salary >= 6000', 'info');">Criteria (WHERE / HAVING)</div>
              <div style="margin-left: auto; display: flex; align-items: center; padding-right: 8px; gap: 6px;">
                <button class="btn btn-primary" onclick="window.TracesApp.dataModeler.sendToEditor();">Send to SQL Editor (F9)</button>
              </div>
            </div>
            <div style="flex: 1; padding: 8px; overflow: auto; background: #fff;">
              <pre id="qb-sql-preview" style="margin: 0; font-family: var(--toad-font-code); font-size: 11.5px; color: #111;">${this.generateSql()}</pre>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindCardDragging();
  }

  renderTableCards() {
    return this.tables.map(tbl => `
      <div class="erd-table-card" id="${tbl.id}" style="left: ${tbl.x}px; top: ${tbl.y}px;">
        <div class="erd-table-header">
          <span>${tbl.name} (${tbl.alias})</span>
          <span style="font-size: 9px; opacity: 0.8;">${tbl.schema}</span>
        </div>
        <div class="erd-column-list">
          ${tbl.cols.map(c => {
            const colKey = `${tbl.alias}.${c.name.toLowerCase()}`;
            const checked = this.selectedColumns.has(colKey) ? 'checked' : '';
            return `
              <div class="erd-column-row" onclick="window.TracesApp.dataModeler.toggleColumn('${colKey}');">
                <input type="checkbox" ${checked} onclick="event.stopPropagation(); window.TracesApp.dataModeler.toggleColumn('${colKey}');">
                <span style="flex: 1;">${c.name}</span>
                ${c.pk ? '<span class="erd-pk-badge">PK</span>' : ''}
                ${c.fk ? '<span class="erd-fk-badge">FK</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');
  }

  toggleColumn(colKey) {
    if (this.selectedColumns.has(colKey)) {
      this.selectedColumns.delete(colKey);
    } else {
      this.selectedColumns.add(colKey);
    }
    const pre = document.getElementById('qb-sql-preview');
    if (pre) pre.textContent = this.generateSql();
  }

  generateSql() {
    const cols = Array.from(this.selectedColumns);
    const selectList = cols.length > 0 ? cols.join(',\n    ') : 'e.*';
    return `SELECT 
    ${selectList}
FROM 
    hr.employees e
    INNER JOIN hr.departments d ON e.department_id = d.department_id
    INNER JOIN hr.jobs j ON e.job_id = j.job_id
WHERE 
    e.salary >= 6000
ORDER BY 
    e.salary DESC;`;
  }

  sendToEditor() {
    window.TracesApp.switchDockView('editor');
    window.TracesApp.sqlEditor.textarea.value = this.generateSql();
    window.TracesApp.sqlEditor.saveActiveTabContent();
    window.TracesApp.sqlEditor.updateHighlighting();
    window.TracesApp.sqlEditor.updateGutter();
    window.TracesApp.sqlEditor.executeStatement();
  }

  bindCardDragging() {
    // Basic draggable card interaction
    setTimeout(() => {
      document.querySelectorAll('.erd-table-card').forEach(card => {
        let isDown = false;
        let startX, startY, origX, origY;

        card.querySelector('.erd-table-header').addEventListener('mousedown', (e) => {
          isDown = true;
          startX = e.clientX;
          startY = e.clientY;
          origX = card.offsetLeft;
          origY = card.offsetTop;
          card.style.zIndex = 100;
        });

        window.addEventListener('mousemove', (e) => {
          if (!isDown) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          card.style.left = `${origX + dx}px`;
          card.style.top = `${origY + dy}px`;
        });

        window.addEventListener('mouseup', () => {
          if (isDown) {
            isDown = false;
            card.style.zIndex = 10;
          }
        });
      });
    }, 100);
  }
}

window.DataModeler = DataModeler;
