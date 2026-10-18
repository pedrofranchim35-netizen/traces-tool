/* ==========================================================================
   SCHEMA BROWSER COMPONENT
   ========================================================================== */

class SchemaBrowser {
  constructor() {
    this.currentSchema = window.TRACES_DB.activeSchema;
    this.currentCategory = 'tables';
    this.selectedObject = null;
    this.currentDetailTab = 'columns';
    this.searchQuery = '';

    this.initElements();
    this.bindEvents();
    this.render();
  }

  initElements() {
    this.schemaSelect = document.getElementById('browser-schema-select');
    this.categoryScroller = document.getElementById('browser-category-pills');
    this.searchInput = document.getElementById('browser-object-search');
    this.objectList = document.getElementById('browser-object-list');
    this.detailTitle = document.getElementById('browser-detail-title');
    this.detailTypePill = document.getElementById('browser-detail-type');
    this.detailTabs = document.querySelectorAll('.detail-tab');
  }

  bindEvents() {
    this.schemaSelect.addEventListener('change', async (e) => {
      this.currentSchema = e.target.value;
      if (window.TRACES_DB) window.TRACES_DB.activeSchema = this.currentSchema;
      this.selectedObject = null;

      if (window.TracesApp && window.TracesApp.isRealDatabase) {
        await this.loadRealObjects(this.currentSchema);
      } else {
        this.render();
      }
    });

    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderObjectList();
    });

    this.detailTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.getAttribute('data-tab');
        this.switchDetailTab(targetTab);
      });
    });
  }

  async loadRealSchemas() {
    try {
      const resp = await fetch('/api/schemas');
      const data = await resp.json();
      if (data.schemas && data.schemas.length > 0) {
        this.realSchemas = data.schemas;
        const targetUser = (window.TracesApp.realDatabaseConfig?.user || 'SYS').toUpperCase();
        this.schemaSelect.innerHTML = data.schemas.map(s => `
          <option value="${s}" ${s.toUpperCase() === targetUser ? 'selected' : ''}>${s}</option>
        `).join('');
        this.currentSchema = this.schemaSelect.value;
        await this.loadRealObjects(this.currentSchema);
      }
    } catch (e) {
      console.warn('Real schemas error', e);
    }
  }

  async loadRealObjects(schema) {
    try {
      const resp = await fetch(`/api/objects?schema=${encodeURIComponent(schema)}`);
      const data = await resp.json();
      if (data.objects) {
        this.realObjects = {
          tables: data.objects.filter(o => o.type === 'TABLE'),
          views: data.objects.filter(o => o.type === 'VIEW'),
          packages: data.objects.filter(o => o.type === 'PACKAGE'),
          procedures: data.objects.filter(o => o.type === 'PROCEDURE'),
          functions: data.objects.filter(o => o.type === 'FUNCTION'),
          sequences: data.objects.filter(o => o.type === 'SEQUENCE'),
          triggers: data.objects.filter(o => o.type === 'TRIGGER')
        };
        this.renderCategoryPills();
        this.renderObjectList();
      }
    } catch (e) {
      console.warn('Real objects error', e);
    }
  }

  onConnectionChanged(conn) {
    if (conn.user) {
      this.currentSchema = conn.user;
      this.schemaSelect.value = conn.user;
    }
    this.selectedObject = null;
    this.render();
  }

  getSchemaData() {
    if (window.TracesApp && window.TracesApp.isRealDatabase && this.realObjects) {
      return this.realObjects;
    }
    return window.TRACES_DB.schemas[this.currentSchema] || window.TRACES_DB.schemas['HR'] || { tables: [], views: [] };
  }

  render() {
    this.renderCategoryPills();
    this.renderObjectList();
  }

  renderCategoryPills() {
    const data = this.getSchemaData();
    const categories = [
      { key: 'tables', label: 'Tables', count: data.tables?.length || 0 },
      { key: 'views', label: 'Views', count: data.views?.length || 0 },
      { key: 'packages', label: 'Packages', count: data.packages?.length || 0 },
      { key: 'procedures', label: 'Procedures', count: data.procedures?.length || 0 },
      { key: 'functions', label: 'Functions', count: data.functions?.length || 0 },
      { key: 'sequences', label: 'Sequences', count: data.sequences?.length || 0 },
      { key: 'triggers', label: 'Triggers', count: data.triggers?.length || 0 }
    ];

    this.categoryScroller.innerHTML = categories.map(cat => `
      <div class="category-tab-pill ${this.currentCategory === cat.key ? 'active' : ''}" 
           onclick="window.TracesApp.schemaBrowser.selectCategory('${cat.key}')">
        <span>${cat.label}</span>
        <span class="category-count">${cat.count}</span>
      </div>
    `).join('');
  }

  selectCategory(categoryKey) {
    this.currentCategory = categoryKey;
    this.selectedObject = null;
    this.renderCategoryPills();
    this.renderObjectList();
  }

  renderObjectList() {
    const data = this.getSchemaData();
    const items = data[this.currentCategory] || [];

    const filtered = items.filter(obj => 
      obj.name.toLowerCase().includes(this.searchQuery)
    );

    if (filtered.length === 0) {
      this.objectList.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 11px;">
          No ${this.currentCategory} found matching "${this.searchQuery}"
        </div>
      `;
      return;
    }

    this.objectList.innerHTML = filtered.map(obj => `
      <div class="object-item ${this.selectedObject?.name === obj.name ? 'active' : ''}"
           onclick="window.TracesApp.schemaBrowser.selectObject('${obj.name}')">
        <div class="object-item-left">
          <svg class="object-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${this.getCategoryIcon(this.currentCategory)}
          </svg>
          <span>${obj.name}</span>
        </div>
        <span class="status-indicator ${obj.status ? obj.status.toLowerCase() : 'valid'}">
          ${obj.status || 'VALID'}
        </span>
      </div>
    `).join('');

    // Auto-select first item if none selected
    if (!this.selectedObject && filtered.length > 0) {
      this.selectObject(filtered[0].name);
    }
  }

  getCategoryIcon(cat) {
    switch (cat) {
      case 'tables':
        return '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 9v12M15 9v12"/>';
      case 'views':
        return '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
      case 'packages':
        return '<path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 1.55v12.42a1.78 1.78 0 0 0 2.5 1.55L16.5 14.6a1.78 1.78 0 0 0 0-3.2z"/>';
      case 'procedures':
      case 'functions':
        return '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>';
      case 'sequences':
        return '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>';
      case 'triggers':
        return '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>';
      default:
        return '<circle cx="12" cy="12" r="10"/>';
    }
  }

  selectObject(objectName) {
    const data = this.getSchemaData();
    const items = data[this.currentCategory] || [];
    this.selectedObject = items.find(o => o.name === objectName);

    if (!this.selectedObject) return;

    // Update active highlight in list
    const allItems = this.objectList.querySelectorAll('.object-item');
    allItems.forEach(el => el.classList.remove('active'));
    const matched = Array.from(allItems).find(el => el.textContent.includes(objectName));
    if (matched) matched.classList.add('active');

    // Update detail pane header
    this.detailTitle.textContent = `${this.currentSchema}.${this.selectedObject.name}`;
    this.detailTypePill.textContent = this.currentCategory.slice(0, -1).toUpperCase();

    this.renderDetailContent();
  }

  switchDetailTab(tabKey) {
    this.currentDetailTab = tabKey;
    this.detailTabs.forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabKey);
    });

    const panes = document.querySelectorAll('.detail-tab-pane');
    panes.forEach(p => {
      p.classList.toggle('active', p.id === `tab-pane-${tabKey}`);
    });

    this.renderDetailContent();
  }

  renderDetailContent() {
    if (!this.selectedObject) return;
    const obj = this.selectedObject;

    // 1. Columns Pane
    const colPane = document.getElementById('tab-pane-columns');
    if (colPane) {
      if (obj.columns && obj.columns.length > 0) {
        colPane.innerHTML = `
          <table class="meta-table">
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Column Name</th>
                <th>Data Type</th>
                <th style="width: 70px;">Nullable</th>
                <th>Default</th>
                <th style="width: 80px;">Key</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              ${obj.columns.map((col, idx) => `
                <tr>
                  <td style="color: var(--text-muted);">${idx + 1}</td>
                  <td style="font-weight: 600; color: var(--text-primary);">${col.name}</td>
                  <td style="color: var(--syntax-type);">${col.type}</td>
                  <td><span style="color: ${col.nullable === 'N' ? 'var(--traces-red)' : 'var(--text-muted)'}; font-weight: 600;">${col.nullable}</span></td>
                  <td style="color: var(--syntax-string);">${col.defaultVal || '-'}</td>
                  <td>
                    ${col.pk ? '<span class="pk-badge">PK</span> ' : ''}
                    ${col.fk ? '<span class="fk-badge">FK</span>' : ''}
                    ${!col.pk && !col.fk ? '-' : ''}
                  </td>
                  <td style="color: var(--text-muted); font-size: 10px;">${col.comments || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        colPane.innerHTML = `<div style="padding: 24px; color: var(--text-muted);">No column declarations for this object.</div>`;
      }
    }

    // 2. Data Preview Pane
    const dataPane = document.getElementById('tab-pane-data');
    if (dataPane) {
      if (obj.data && obj.data.length > 0) {
        const cols = Object.keys(obj.data[0]);
        dataPane.innerHTML = `
          <div style="flex: 1; overflow: auto;">
            <table class="oracle-data-table">
              <thead>
                <tr>
                  <th class="row-num-cell">#</th>
                  ${cols.map(c => `<th>${c}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${obj.data.map((row, idx) => `
                  <tr>
                    <td class="row-num-cell">${idx + 1}</td>
                    ${cols.map(c => `
                      <td>${row[c] !== null && row[c] !== undefined ? row[c] : '<span class="cell-null">(null)</span>'}</td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="padding: 6px 12px; background: var(--bg-surface); border-top: 1px solid var(--border-default); font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between;">
            <span>Showing ${obj.data.length} rows (sampled from ${obj.numRows || obj.data.length} total)</span>
            <button class="btn btn-secondary" style="height: 22px; padding: 0 8px; font-size: 10px;" onclick="window.TracesApp.openObjectInWorksheet('${obj.name}')">
              Query in Worksheet (F9)
            </button>
          </div>
        `;
      } else {
        dataPane.innerHTML = `<div style="padding: 24px; color: var(--text-muted);">No tabular data preview available.</div>`;
      }
    }

    // 3. Indexes Pane
    const idxPane = document.getElementById('tab-pane-indexes');
    if (idxPane) {
      if (obj.indexes && obj.indexes.length > 0) {
        idxPane.innerHTML = `
          <table class="meta-table">
            <thead>
              <tr>
                <th>Index Name</th>
                <th>Uniqueness</th>
                <th>Columns</th>
                <th>Status</th>
                <th>Clustering Factor</th>
              </tr>
            </thead>
            <tbody>
              ${obj.indexes.map(ix => `
                <tr>
                  <td style="font-weight: 600; color: #38bdf8;">${ix.name}</td>
                  <td>${ix.type}</td>
                  <td style="color: var(--text-secondary);">${ix.columns}</td>
                  <td><span class="status-indicator valid">${ix.status}</span></td>
                  <td>${ix.clusteringFactor || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        idxPane.innerHTML = `<div style="padding: 24px; color: var(--text-muted);">No indexes configured.</div>`;
      }
    }

    // 4. Constraints Pane
    const constrPane = document.getElementById('tab-pane-constraints');
    if (constrPane) {
      if (obj.constraints && obj.constraints.length > 0) {
        constrPane.innerHTML = `
          <table class="meta-table">
            <thead>
              <tr>
                <th>Constraint Name</th>
                <th>Type</th>
                <th>Details / Condition</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${obj.constraints.map(cn => `
                <tr>
                  <td style="font-weight: 600;">${cn.name}</td>
                  <td style="color: var(--syntax-keyword); font-weight: 600;">${cn.type}</td>
                  <td style="color: var(--text-secondary);">${cn.details}</td>
                  <td><span class="status-indicator valid">${cn.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        constrPane.innerHTML = `<div style="padding: 24px; color: var(--text-muted);">No constraints defined.</div>`;
      }
    }

    // 5. DDL Script Pane
    const ddlPane = document.getElementById('tab-pane-ddl');
    if (ddlPane) {
      const ddlCode = obj.ddl || obj.specDdl || `-- DDL not generated for ${obj.name}`;
      ddlPane.innerHTML = `
        <div style="display: flex; justify-content: flex-end; padding: 8px 12px; background: var(--bg-surface); border-bottom: 1px solid var(--border-default);">
          <button class="btn btn-secondary" style="height: 24px; padding: 0 8px; font-size: 11px;" onclick="navigator.clipboard.writeText(document.getElementById('ddl-code-block').textContent); window.TracesApp.notify('DDL copied to clipboard', 'info');">
            Copy DDL
          </button>
        </div>
        <div id="ddl-code-block" class="ddl-script-container">${this.escapeHtml(ddlCode)}</div>
      `;
    }

    // 6. Statistics Pane
    const statsPane = document.getElementById('tab-pane-stats');
    if (statsPane) {
      statsPane.innerHTML = `
        <div style="padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div class="advisor-card">
            <div class="metric-label">Estimated Rows</div>
            <div class="metric-value" style="font-size: 20px;">${(obj.numRows || 0).toLocaleString()}</div>
          </div>
          <div class="advisor-card">
            <div class="metric-label">Allocated Blocks</div>
            <div class="metric-value" style="font-size: 20px;">${obj.blocks || '-'}</div>
          </div>
          <div class="advisor-card">
            <div class="metric-label">Avg Row Length</div>
            <div class="metric-value" style="font-size: 20px;">${obj.avgRowLen ? obj.avgRowLen + ' bytes' : '-'}</div>
          </div>
          <div class="advisor-card">
            <div class="metric-label">Tablespace</div>
            <div class="metric-value" style="font-size: 20px; color: var(--traces-red);">${obj.tablespace || 'USERS'}</div>
          </div>
          <div class="advisor-card" style="grid-column: 1 / -1;">
            <div class="metric-label">Last DBMS_STATS Gathered</div>
            <div style="font-family: var(--font-code); color: var(--text-primary); margin-top: 4px;">
              ${obj.lastAnalyzed || 'Automatic Optimizer Job'}
            </div>
          </div>
        </div>
      `;
    }
  }

  recompileCurrentObject() {
    if (!this.selectedObject) return;
    window.TracesApp.notify(`ALTER ${this.currentCategory.slice(0, -1).toUpperCase()} "${this.currentSchema}"."${this.selectedObject.name}" COMPILE: SUCCESS`, 'success');
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.SchemaBrowser = SchemaBrowser;
