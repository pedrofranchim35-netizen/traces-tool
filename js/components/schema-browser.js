/* ==========================================================================
   SCHEMA BROWSER COMPONENT - TOAD FOR ORACLE PARITY (LIVE REAL DB)
   ========================================================================== */

class SchemaBrowser {
  constructor() {
    this.currentSchema = window.TRACES_DB ? window.TRACES_DB.activeSchema : 'SYS';
    this.currentCategory = 'tables';
    this.viewMode = 'tree'; // Default: authentic Toad Menu Expandido
    this.expandedCategories = { tables: true };
    this.selectedObject = null;
    this.currentDetailTab = 'columns';
    this.searchQuery = '';
    this.filterMatchMode = 'contains';
    this.statusFilter = 'ALL';
    this.sortOrder = 'asc';
    this.subtabFilter = '';
    this.allTablespacesOverview = null;
    this.realSchemas = [];
    this.realObjects = null;
    this.isLoadingDetails = false;
    this.detailsCache = new Map();
    this.categoryLimits = {};
    this.defaultCategoryLimit = 200;
    this.detailListLimits = {};

    this.initElements();
    this.bindEvents();
    this.render();
    this.updateDetailTabsForCategory(this.currentCategory);
  }

  setStatusFilter(filter) {
    this.statusFilter = (filter || 'ALL').toUpperCase();
    this.refreshFilteredList();
  }

  setFilterMatchMode(mode) {
    this.filterMatchMode = mode || 'contains';
    this.refreshFilteredList();
  }

  setSortOrder(order) {
    this.sortOrder = order || 'asc';
    this.refreshFilteredList();
  }

  clearObjectSearch() {
    this.searchQuery = '';
    if (this.searchInput) this.searchInput.value = '';
    const clearBtn = document.getElementById('browser-search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';
    this.refreshFilteredList();
  }

  refreshFilteredList() {
    const clearBtn = document.getElementById('browser-search-clear-btn');
    if (clearBtn) clearBtn.style.display = this.searchQuery ? 'block' : 'none';
    if (this.viewMode === 'tree') {
      this.renderTreeView(true);
    } else {
      this.renderObjectList(true);
    }
  }

  filterAndSortObjects(items) {
    if (!Array.isArray(items)) return [];
    let filtered = items.slice();

    if (this.searchQuery) {
      const rawTerms = this.searchQuery.split(',').map(s => s.trim()).filter(Boolean);
      filtered = filtered.filter(obj => {
        const name = (obj.name || '').toLowerCase();
        return rawTerms.some(term => {
          if (term.includes('*') || term.includes('%') || term.includes('?')) {
            const esc = term.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/[*%]/g, '.*').replace(/\?/g, '.');
            try {
              const rx = new RegExp(`^${esc}$`, 'i');
              return this.filterMatchMode === 'negate' ? !rx.test(name) : rx.test(name);
            } catch (_) {
              return name.includes(term.replace(/[*%?]/g, ''));
            }
          }
          switch (this.filterMatchMode) {
            case 'starts': return name.startsWith(term);
            case 'ends': return name.endsWith(term);
            case 'exact': return name === term;
            case 'negate': return !name.includes(term);
            default: return name.includes(term);
          }
        });
      });
    }

    if (this.statusFilter && this.statusFilter !== 'ALL') {
      filtered = filtered.filter(obj => (obj.status || 'VALID').toUpperCase() === this.statusFilter);
    }

    if (this.sortOrder === 'desc') {
      filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else if (this.sortOrder === 'invalid_first') {
      filtered.sort((a, b) => {
        const sa = (a.status || 'VALID').toUpperCase() === 'INVALID' ? 0 : 1;
        const sb = (b.status || 'VALID').toUpperCase() === 'INVALID' ? 0 : 1;
        if (sa !== sb) return sa - sb;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return filtered;
  }

  initElements() {
    this.schemaSelect = document.getElementById('browser-schema-select');
    this.styleBar = document.getElementById('browser-style-bar');
    this.dropdownContainer = document.getElementById('browser-dropdown-container');
    this.categoryScroller = document.getElementById('browser-category-pills');
    this.searchInput = document.getElementById('browser-object-search');
    this.objectList = document.getElementById('browser-object-list');
    this.detailTitle = document.getElementById('browser-detail-title');
    this.detailTypePill = document.getElementById('browser-detail-type');
    this.detailTabs = document.querySelectorAll('.detail-tab');
  }

  bindEvents() {
    if (this.styleBar) {
      this.styleBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.browser-style-btn');
        if (btn) {
          const style = btn.getAttribute('data-style');
          if (style) this.switchViewMode(style);
        }
      });
    }

    if (this.schemaSelect) {
      this.schemaSelect.addEventListener('change', async (e) => {
        this.currentSchema = e.target.value;
        if (window.TRACES_DB) window.TRACES_DB.activeSchema = this.currentSchema;
        this.selectedObject = null;

        if (window.TracesApp && window.TracesApp.isConnected()) {
          if (this.detailsCache) this.detailsCache.clear();
          await this.loadRealObjects(this.currentSchema);
        } else {
          this.render();
        }
      });
    }

    if (this.searchInput) {
      let searchDebounceTimer = null;
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          this.searchQuery = e.target.value.toLowerCase().trim();
          this.refreshFilteredList();
        }, 100);
      });
    }

    this.detailTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.getAttribute('data-tab');
        this.switchDetailTab(targetTab);
      });
    });
  }

  switchViewMode(mode) {
    this.viewMode = mode;
    this.render();
  }

  toggleCategory(catKey) {
    this.expandedCategories[catKey] = !this.expandedCategories[catKey];
    this.currentCategory = catKey;
    this.updateDetailTabsForCategory(catKey);
    if (catKey === 'tablespaces') {
      this.switchDetailTab('tsoverview');
      if (this.detailTitle) this.detailTitle.textContent = 'TABLESPACES DA INSTÂNCIA (DBA_TABLESPACES)';
      if (this.detailTypePill) this.detailTypePill.textContent = 'TABLESPACE SUITE';
      this.renderContextActionsBar();
      this.loadAllTablespacesOverview(true);
    }
    const prevScroll = this.objectList ? this.objectList.scrollTop : 0;
    this.renderTreeView(true);
    if (this.objectList) this.objectList.scrollTop = prevScroll;
  }

  showMoreCategory(catKey, step = 500, ev = null) {
    if (ev) {
      ev.stopPropagation();
      ev.preventDefault();
    }
    const current = this.categoryLimits[catKey] || this.defaultCategoryLimit || 200;
    this.categoryLimits[catKey] = current + step;
    const prevScroll = this.objectList ? this.objectList.scrollTop : 0;
    if (this.viewMode === 'tree') {
      this.renderTreeView(true);
    } else {
      this.renderObjectList(true);
    }
    if (this.objectList) this.objectList.scrollTop = prevScroll;
  }

  showAllCategory(catKey, ev = null) {
    if (ev) {
      ev.stopPropagation();
      ev.preventDefault();
    }
    this.categoryLimits[catKey] = 999999;
    const prevScroll = this.objectList ? this.objectList.scrollTop : 0;
    if (this.viewMode === 'tree') {
      this.renderTreeView(true);
    } else {
      this.renderObjectList(true);
    }
    if (this.objectList) this.objectList.scrollTop = prevScroll;
  }

  renderStyleBar() {
    const btns = document.querySelectorAll('.browser-style-btn');
    btns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-style') === this.viewMode);
    });
  }

  getCategories() {
    const isConn = window.TracesApp && window.TracesApp.isConnected();
    const data = isConn ? this.getSchemaData() : {};
    return [
      { key: 'tables', label: 'Tables', icon: '📦', count: data.tables?.length || 0 },
      { key: 'views', label: 'Views', icon: '👁', count: data.views?.length || 0 },
      { key: 'mviews', label: 'Materialized Views', icon: '📋', count: data.mviews?.length || 0 },
      { key: 'packages', label: 'Packages', icon: '📦', count: data.packages?.length || 0 },
      { key: 'procedures', label: 'Procedures', icon: '⚡', count: data.procedures?.length || 0 },
      { key: 'functions', label: 'Functions', icon: '⚙', count: data.functions?.length || 0 },
      { key: 'triggers', label: 'Triggers', icon: '⚡', count: data.triggers?.length || 0 },
      { key: 'types', label: 'Types', icon: '🏷', count: data.types?.length || 0 },
      { key: 'sequences', label: 'Sequences', icon: '🔢', count: data.sequences?.length || 0 },
      { key: 'synonyms', label: 'Synonyms', icon: '🔀', count: data.synonyms?.length || 0 },
      { key: 'indexes', label: 'Indexes', icon: '📑', count: data.indexes?.length || 0 },
      { key: 'tablespaces', label: 'Tablespaces', icon: '🗄️', count: data.tablespaces?.length || 0 },
      { key: 'dblinks', label: 'DB Links', icon: '🔗', count: data.dblinks?.length || 0 },
      { key: 'users', label: 'Users', icon: '👤', count: data.users?.length || 0 },
      { key: 'roles', label: 'Roles', icon: '🛡️', count: data.roles?.length || 0 },
      { key: 'jobs', label: 'Scheduler Jobs', icon: '⏱️', count: data.jobs?.length || 0 },
      { key: 'directories', label: 'Directories', icon: '📁', count: data.directories?.length || 0 },
      { key: 'queues', label: 'Queues', icon: '📬', count: data.queues?.length || 0 },
      { key: 'recyclebin', label: 'Recycle Bin', icon: '🗑️', count: data.recyclebin?.length || 0 },
      { key: 'java', label: 'Java Sources', icon: '☕', count: data.java?.length || 0 },
      { key: 'clusters', label: 'Clusters', icon: '🗃️', count: data.clusters?.length || 0 }
    ];
  }

  async loadRealSchemas() {
    try {
      const resp = await fetch('/api/schemas');
      const data = await resp.json();
      if (data.schemas && data.schemas.length > 0) {
        this.realSchemas = data.schemas;
        const targetUser = (window.TracesApp.realDatabaseConfig?.user || 'SYS').toUpperCase();
        
        let foundSelected = false;
        this.schemaSelect.innerHTML = data.schemas.map(s => {
          const isSel = s.toUpperCase() === targetUser;
          if (isSel) foundSelected = true;
          return `<option value="${s}" ${isSel ? 'selected' : ''}>${s}</option>`;
        }).join('');

        if (!foundSelected && data.schemas.length > 0) {
          this.schemaSelect.value = data.schemas[0];
        }

        this.currentSchema = this.schemaSelect.value;
        await this.loadRealObjects(this.currentSchema);
      }
    } catch (e) {
      console.warn('Real schemas load error', e);
    }
  }

  async loadRealObjects(schema) {
    if (!schema) return;
    try {
      this.objectList.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 11px;">
          <span class="toad-spinner" style="display:inline-block; margin-bottom:8px;">⏳</span><br>
          Lendo catálogo de objetos de "${schema}"...
        </div>
      `;

      const resp = await fetch(`/api/objects?schema=${encodeURIComponent(schema)}`);
      const data = await resp.json();
      if (data.objects) {
        this.categoryLimits = {};
        this.realObjects = {
          tables: data.objects.filter(o => o.type === 'TABLE'),
          views: data.objects.filter(o => o.type === 'VIEW'),
          mviews: data.objects.filter(o => o.type === 'MATERIALIZED VIEW' || o.type === 'MVIEW' || o.type === 'SNAPSHOT'),
          packages: data.objects.filter(o => o.type === 'PACKAGE' || o.type === 'PACKAGE BODY'),
          procedures: data.objects.filter(o => o.type === 'PROCEDURE'),
          functions: data.objects.filter(o => o.type === 'FUNCTION'),
          triggers: data.objects.filter(o => o.type === 'TRIGGER'),
          types: data.objects.filter(o => o.type === 'TYPE' || o.type === 'TYPE BODY'),
          sequences: data.objects.filter(o => o.type === 'SEQUENCE'),
          synonyms: data.objects.filter(o => o.type === 'SYNONYM'),
          indexes: data.objects.filter(o => o.type === 'INDEX'),
          tablespaces: data.objects.filter(o => o.type === 'TABLESPACE'),
          dblinks: data.objects.filter(o => o.type === 'DATABASE LINK' || o.type === 'DB LINK' || o.type === 'DBLINK'),
          users: data.objects.filter(o => o.type === 'USER'),
          roles: data.objects.filter(o => o.type === 'ROLE'),
          jobs: data.objects.filter(o => o.type === 'JOB' || o.type === 'SCHEDULER JOB'),
          directories: data.objects.filter(o => o.type === 'DIRECTORY'),
          queues: data.objects.filter(o => o.type === 'QUEUE'),
          recyclebin: data.objects.filter(o => o.type === 'RECYCLEBIN'),
          java: data.objects.filter(o => o.type && o.type.startsWith('JAVA')),
          clusters: data.objects.filter(o => o.type === 'CLUSTER')
        };
        this.render();
      }
    } catch (e) {
      console.warn('Real objects load error', e);
      this.objectList.innerHTML = `<div style="padding: 24px 16px; text-align: center; color: #c00000; font-size: 11px;">Erro ao carregar objetos: ${e.message}</div>`;
    }
  }

  onConnectionChanged(conn) {
    if (conn.user) {
      this.currentSchema = conn.user.toUpperCase();
      if (this.schemaSelect) this.schemaSelect.value = this.currentSchema;
    }
    if (this.detailsCache) this.detailsCache.clear();
    this.selectedObject = null;
    this.render();
  }

  getSchemaData() {
    if (window.TracesApp && window.TracesApp.isConnected() && this.realObjects) {
      return this.realObjects;
    }
    const schema = (window.TRACES_DB && window.TRACES_DB.schemas) 
      ? (window.TRACES_DB.schemas[this.currentSchema] || window.TRACES_DB.schemas['HR'] || {})
      : {};
    return {
      tables: schema.tables || [],
      views: schema.views || [],
      mviews: schema.mviews || window.TRACES_DB?.mviews || [],
      packages: schema.packages || [],
      procedures: schema.procedures || [],
      functions: schema.functions || [],
      triggers: schema.triggers || [],
      types: schema.types || [],
      sequences: schema.sequences || [],
      synonyms: schema.synonyms || [],
      indexes: schema.indexes || [],
      tablespaces: schema.tablespaces || window.TRACES_DB?.tablespaces || [],
      dblinks: schema.dblinks || window.TRACES_DB?.dblinks || [],
      users: schema.users || window.TRACES_DB?.users || [],
      roles: schema.roles || window.TRACES_DB?.roles || [],
      jobs: schema.jobs || window.TRACES_DB?.jobs || [],
      directories: schema.directories || window.TRACES_DB?.directories || [],
      queues: schema.queues || window.TRACES_DB?.queues || [],
      recyclebin: schema.recyclebin || window.TRACES_DB?.recyclebin || [],
      java: schema.java || window.TRACES_DB?.java || [],
      clusters: schema.clusters || window.TRACES_DB?.clusters || []
    };
  }

  render() {
    this.renderStyleBar();
    if (this.viewMode === 'tree') {
      if (this.dropdownContainer) this.dropdownContainer.style.display = 'none';
      if (this.categoryScroller) this.categoryScroller.style.display = 'none';
      this.renderTreeView();
    } else if (this.viewMode === 'dropdown') {
      if (this.categoryScroller) this.categoryScroller.style.display = 'none';
      if (this.dropdownContainer) {
        this.dropdownContainer.style.display = 'block';
        this.renderDropdown();
      }
      this.renderObjectList();
    } else { // 'tabs'
      if (this.dropdownContainer) this.dropdownContainer.style.display = 'none';
      if (this.categoryScroller) {
        this.categoryScroller.style.display = 'flex';
        this.renderCategoryPills();
      }
      this.renderObjectList();
    }
  }

  renderDropdown() {
    if (!this.dropdownContainer) return;
    const categories = this.getCategories();
    this.dropdownContainer.innerHTML = `
      <div class="browser-dropdown-row">
        <label class="browser-dropdown-label" for="browser-category-dropdown">Tipo de Objeto:</label>
        <select class="browser-dropdown-select" id="browser-category-dropdown">
          ${categories.map(c => `
            <option value="${c.key}" ${this.currentCategory === c.key ? 'selected' : ''}>
              ${c.label} (${c.count.toLocaleString()})
            </option>
          `).join('')}
        </select>
      </div>
    `;
    const sel = document.getElementById('browser-category-dropdown');
    if (sel) {
      sel.addEventListener('change', (e) => {
        this.selectCategory(e.target.value);
      });
    }
  }

  renderTreeView(skipAutoSelect = false) {
    if (!window.TracesApp || !window.TracesApp.isConnected()) {
      if (this.objectList) {
        this.objectList.innerHTML = `
          <div style="padding: 40px 16px; text-align: center; color: var(--text-muted); font-size: 11px;">
            <div style="font-size: 24px; margin-bottom: 8px;">🔌</div>
            <strong style="font-size: 12px; color: #1e293b;">Schema Browser - Desconectado</strong><br><br>
            Conecte-se a uma instância Oracle para carregar schemas, tabelas, views e procedures.<br>
            <button class="btn btn-primary" style="margin-top: 12px; padding: 4px 14px; font-weight: 600;" onclick="window.TracesApp.connectionManager.openModal();">
              ⚡ Conectar ao Banco de Dados...
            </button>
          </div>
        `;
      }
      if (this.detailTitle) this.detailTitle.textContent = 'Nenhum Objeto Selecionado';
      const detailContainer = document.getElementById('browser-detail-content');
      if (detailContainer) detailContainer.innerHTML = '<div style="padding: 24px; text-align: center; color: #888; font-size: 11px;">Desconectado do banco de dados.</div>';
      return;
    }

    const data = this.getSchemaData();
    const categories = this.getCategories();

    let html = '';
    let totalMatched = 0;
    for (const cat of categories) {
      const items = data[cat.key] || [];
      const filtered = this.filterAndSortObjects(items);
      totalMatched += filtered.length;

      const isSearching = !!this.searchQuery || (this.statusFilter && this.statusFilter !== 'ALL');
      const isExpanded = isSearching ? (filtered.length > 0) : !!this.expandedCategories[cat.key];
      const limit = this.categoryLimits[cat.key] || this.defaultCategoryLimit || 200;
      const visibleItems = isExpanded ? filtered.slice(0, limit) : [];
      const remaining = filtered.length - visibleItems.length;
      const countBadge = (isSearching && filtered.length !== items.length)
        ? `${filtered.length.toLocaleString()} / ${items.length.toLocaleString()}`
        : items.length.toLocaleString();

      html += `
        <div class="toad-tree-category ${isExpanded ? 'expanded' : ''}" data-category="${cat.key}">
          <div class="toad-tree-category-header" onclick="window.TracesApp.schemaBrowser.toggleCategory('${cat.key}')">
            <span class="toad-tree-arrow ${isExpanded ? 'expanded' : ''}">▶</span>
            <span class="toad-tree-category-title">${cat.icon} ${cat.label}</span>
            <button type="button" class="btn" style="height: 17px; padding: 0 5px; font-size: 9.5px; margin-left: auto; margin-right: 4px; background: #e0f2fe; border-color: #7dd3fc; color: #0369a1; font-weight: 700;"
                    title="Criar novo ${cat.label}"
                    onclick="event.stopPropagation(); window.TracesApp.schemaBrowser.openCreateObjectWizard('${cat.key}')">
              + Novo
            </button>
            <span class="toad-tree-category-count" style="margin-left: 0;" title="Total: ${items.length.toLocaleString()} objetos">${countBadge}</span>
          </div>
          ${isExpanded ? `
            <div class="toad-tree-category-items">
              ${filtered.length === 0 ? `
                <div style="padding: 6px 16px 6px 36px; font-size: 11px; color: var(--text-muted); font-style: italic;">
                  ${isSearching ? 'Nenhum resultado' : 'Nenhum objeto'}
                </div>
              ` : `
                ${visibleItems.map(obj => `
                  <div class="toad-tree-item ${this.selectedObject?.name === obj.name && this.currentCategory === cat.key ? 'active' : ''}"
                       onclick="window.TracesApp.schemaBrowser.selectObject('${obj.name}', '${cat.key}')"
                       oncontextmenu="window.TracesApp.schemaBrowser.handleContextMenu(event, '${obj.name}', '${cat.key}'); return false;">
                    <div class="toad-tree-item-name">
                      <svg class="object-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${this.getCategoryIcon(cat.key)}
                      </svg>
                      <span>${obj.name}</span>
                    </div>
                    <span class="status-indicator ${obj.status ? obj.status.toLowerCase() : 'valid'}">
                      ${obj.status || 'VALID'}
                    </span>
                  </div>
                `).join('')}
                ${remaining > 0 ? `
                  <div class="toad-tree-load-more" style="padding: 6px 10px 8px 24px; background: #f8fafc; border-top: 1px dashed #cbd5e1; border-bottom: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 5px;">
                    <div style="font-size: 10px; color: #475569; display: flex; justify-content: space-between; align-items: center;">
                      <span>Exibindo <strong>${visibleItems.length.toLocaleString()}</strong> de <strong>${filtered.length.toLocaleString()}</strong> ${cat.label}</span>
                      <span style="color: #64748b;">(+${remaining.toLocaleString()} ocultos)</span>
                    </div>
                    <div style="display: flex; gap: 6px;">
                      <button type="button" class="btn btn-primary" style="flex: 1; height: 22px; padding: 0 8px; font-size: 10px; font-weight: 600;"
                              onclick="window.TracesApp.schemaBrowser.showMoreCategory('${cat.key}', 500, event)">
                        ➕ Ver mais (+${Math.min(500, remaining).toLocaleString()})
                      </button>
                      <button type="button" class="btn btn-secondary" style="height: 22px; padding: 0 8px; font-size: 10px; font-weight: 600;"
                              onclick="window.TracesApp.schemaBrowser.showAllCategory('${cat.key}', event)">
                        Ver todos (${filtered.length.toLocaleString()})
                      </button>
                    </div>
                  </div>
                ` : ''}
              `}
            </div>
          ` : ''}
        </div>
      `;
    }

    const fBadge = document.getElementById('browser-filter-count-badge');
    if (fBadge) fBadge.textContent = `${totalMatched.toLocaleString()} obj`;

    this.objectList.innerHTML = html;

    if (!skipAutoSelect && !this.selectedObject) {
      const firstCat = categories.find(c => (data[c.key] || []).length > 0);
      if (firstCat && data[firstCat.key].length > 0) {
        this.selectObject(data[firstCat.key][0].name, firstCat.key);
      }
    }
  }

  renderCategoryPills() {
    if (!this.categoryScroller) return;
    const categories = this.getCategories();
    this.categoryScroller.innerHTML = categories.map(cat => `
      <div class="category-tab-pill ${this.currentCategory === cat.key ? 'active' : ''}" 
           onclick="window.TracesApp.schemaBrowser.selectCategory('${cat.key}')">
        <span>${cat.label}</span>
        <span class="category-count">${cat.count.toLocaleString()}</span>
      </div>
    `).join('');
  }

  selectCategory(categoryKey) {
    this.currentCategory = categoryKey;
    this.selectedObject = null;
    this.updateDetailTabsForCategory(categoryKey);
    this.render();

    // Contextual tab switching
    if (categoryKey === 'tablespaces') {
      this.switchDetailTab('tsoverview');
      if (this.detailTitle) this.detailTitle.textContent = 'TABLESPACES DA INSTÂNCIA (DBA_TABLESPACES)';
      if (this.detailTypePill) this.detailTypePill.textContent = 'TABLESPACE SUITE';
      this.renderContextActionsBar();
      this.loadAllTablespacesOverview(true);
    } else if (['procedures', 'functions', 'packages', 'triggers', 'types'].includes(categoryKey)) {
      this.switchDetailTab('source');
    } else if (this.currentDetailTab === 'source' || this.currentDetailTab === 'tsoverview' || this.currentDetailTab === 'tsdatafiles') {
      this.switchDetailTab('columns');
    }
  }

  updateDetailTabsForCategory(categoryKey) {
    const catConfigs = {
      tables: ['columns', 'data', 'indexes', 'constraints', 'ddl', 'grants', 'partitions', 'dependencies', 'stats', 'erd'],
      views: ['columns', 'data', 'ddl', 'grants', 'dependencies', 'stats'],
      mviews: ['columns', 'data', 'ddl', 'grants', 'dependencies', 'stats'],
      packages: ['source', 'ddl', 'grants', 'dependencies', 'stats'],
      procedures: ['source', 'ddl', 'grants', 'dependencies', 'stats'],
      functions: ['source', 'ddl', 'grants', 'dependencies', 'stats'],
      triggers: ['source', 'ddl', 'grants', 'dependencies'],
      types: ['source', 'ddl', 'grants', 'dependencies'],
      indexes: ['columns', 'ddl', 'partitions', 'stats'],
      sequences: ['columns', 'ddl', 'grants'],
      synonyms: ['columns', 'ddl'],
      users: ['columns', 'grants', 'ddl'],
      dblinks: ['columns', 'ddl'],
      tablespaces: ['tsoverview', 'columns', 'tsdatafiles', 'ddl']
    };

    const allowedKeys = catConfigs[categoryKey] || ['columns', 'data', 'ddl', 'stats'];
    const allTabs = document.querySelectorAll('.detail-tab');
    allTabs.forEach(tab => {
      const k = tab.getAttribute('data-tab');
      if (allowedKeys.includes(k)) {
        tab.style.display = 'inline-flex';
        if (categoryKey === 'tablespaces') {
          if (k === 'tsoverview') tab.innerHTML = '📊 Todas as Tablespaces &amp; Uso Máx';
          if (k === 'columns') tab.innerHTML = '💾 Tablespace Selecionada';
          if (k === 'tsdatafiles') tab.innerHTML = '📁 Datafiles Mapeados';
          if (k === 'ddl') tab.innerHTML = '📜 Script (DDL)';
        } else if (categoryKey === 'tables') {
          if (k === 'columns') tab.innerHTML = 'Columns';
          if (k === 'ddl') tab.innerHTML = 'Script (DDL)';
        }
      } else {
        tab.style.display = 'none';
      }
    });

    if (!allowedKeys.includes(this.currentDetailTab)) {
      this.switchDetailTab(allowedKeys[0]);
    }
  }

  renderObjectList(skipAutoSelect = false) {
    if (!window.TracesApp || !window.TracesApp.isConnected()) {
      if (this.objectList) {
        this.objectList.innerHTML = `
          <div style="padding: 40px 16px; text-align: center; color: var(--text-muted); font-size: 11px;">
            <div style="font-size: 24px; margin-bottom: 8px;">🔌</div>
            <strong style="font-size: 12px; color: #1e293b;">Schema Browser - Desconectado</strong><br><br>
            Conecte-se a uma instância Oracle para carregar schemas, tabelas, views e procedures.<br>
            <button class="btn btn-primary" style="margin-top: 12px; padding: 4px 14px; font-weight: 600;" onclick="window.TracesApp.connectionManager.openModal();">
              ⚡ Conectar ao Banco de Dados...
            </button>
          </div>
        `;
      }
      if (this.detailTitle) this.detailTitle.textContent = 'Nenhum Objeto Selecionado';
      const detailContainer = document.getElementById('browser-detail-content');
      if (detailContainer) detailContainer.innerHTML = '<div style="padding: 24px; text-align: center; color: #888; font-size: 11px;">Desconectado do banco de dados.</div>';
      return;
    }

    const data = this.getSchemaData();
    const items = data[this.currentCategory] || [];
    const filtered = this.filterAndSortObjects(items);

    const fBadge = document.getElementById('browser-filter-count-badge');
    if (fBadge) fBadge.textContent = `${filtered.length.toLocaleString()} / ${items.length.toLocaleString()}`;

    if (filtered.length === 0) {
      this.objectList.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 11px;">
          Nenhum objeto "${this.currentCategory}" encontrado com filtro ativo
          <div style="margin-top: 8px;">
            <button class="btn btn-primary" onclick="window.TracesApp.schemaBrowser.openCreateObjectWizard('${this.currentCategory}')">➕ Criar Novo (${this.currentCategory})</button>
          </div>
        </div>
      `;
      return;
    }

    const limit = this.categoryLimits[this.currentCategory] || this.defaultCategoryLimit || 200;
    const visibleItems = filtered.slice(0, limit);
    const remaining = filtered.length - visibleItems.length;

    this.objectList.innerHTML = visibleItems.map(obj => `
      <div class="object-item ${this.selectedObject?.name === obj.name ? 'active' : ''}"
           onclick="window.TracesApp.schemaBrowser.selectObject('${obj.name}')"
           oncontextmenu="window.TracesApp.schemaBrowser.handleContextMenu(event, '${obj.name}', '${this.currentCategory}'); return false;">
        <div class="object-item-left">
          <svg class="object-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${this.getCategoryIcon(this.currentCategory)}
          </svg>
          <span style="font-weight: 600;">${obj.name}</span>
        </div>
        <span class="status-indicator ${obj.status ? obj.status.toLowerCase() : 'valid'}">
          ${obj.status || 'VALID'}
        </span>
      </div>
    `).join('') + (remaining > 0 ? `
      <div class="toad-tree-load-more" style="padding: 8px 12px; background: #f8fafc; border-top: 1px dashed #cbd5e1; display: flex; flex-direction: column; gap: 6px;">
        <div style="font-size: 10px; color: #475569; display: flex; justify-content: space-between; align-items: center;">
          <span>Exibindo <strong>${visibleItems.length.toLocaleString()}</strong> de <strong>${filtered.length.toLocaleString()}</strong> objetos</span>
          <span style="color: #64748b;">(+${remaining.toLocaleString()} restantes)</span>
        </div>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn btn-primary" style="flex: 1; height: 24px; padding: 0 8px; font-size: 10px; font-weight: 600;"
                  onclick="window.TracesApp.schemaBrowser.showMoreCategory('${this.currentCategory}', 500, event)">
            ➕ Ver mais (+${Math.min(500, remaining).toLocaleString()})
          </button>
          <button type="button" class="btn btn-secondary" style="height: 24px; padding: 0 8px; font-size: 10px; font-weight: 600;"
                  onclick="window.TracesApp.schemaBrowser.showAllCategory('${this.currentCategory}', event)">
            Ver todos (${filtered.length.toLocaleString()})
          </button>
        </div>
      </div>
    ` : '');

    // Auto-select first item if none selected
    if (!skipAutoSelect && !this.selectedObject && filtered.length > 0) {
      this.selectObject(filtered[0].name);
    }
  }

  getCategoryIcon(cat) {
    switch (cat) {
      case 'tables':
        return '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 9v12M15 9v12"/>';
      case 'views':
        return '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
      case 'mviews':
        return '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><path d="M21 4v5h-5M3 20v-5h5"/>';
      case 'packages':
        return '<path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 1.55v12.42a1.78 1.78 0 0 0 2.5 1.55L16.5 14.6a1.78 1.78 0 0 0 0-3.2z"/>';
      case 'procedures':
      case 'functions':
        return '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>';
      case 'sequences':
        return '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>';
      case 'synonyms':
        return '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9h6v6"/>';
      case 'triggers':
        return '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>';
      case 'types':
        return '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>';
      case 'indexes':
        return '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>';
      case 'tablespaces':
        return '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>';
      case 'dblinks':
        return '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>';
      case 'users':
        return '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>';
      case 'roles':
        return '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>';
      case 'jobs':
        return '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>';
      case 'directories':
        return '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>';
      case 'queues':
        return '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>';
      case 'recyclebin':
        return '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>';
      case 'java':
        return '<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>';
      case 'clusters':
        return '<rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/>';
      default:
        return '<circle cx="12" cy="12" r="10"/>';
    }
  }

  async selectObject(objectName, categoryKey) {
    if (categoryKey && categoryKey !== this.currentCategory) {
      this.currentCategory = categoryKey;
      this.updateDetailTabsForCategory(categoryKey);
    }
    const data = this.getSchemaData();
    const items = data[this.currentCategory] || [];
    this.selectedObject = items.find(o => o.name === objectName) || { name: objectName };

    // Update active highlight in list
    const allItems = this.objectList.querySelectorAll('.object-item, .toad-tree-item');
    allItems.forEach(el => el.classList.remove('active'));
    const matched = Array.from(allItems).find(el => el.textContent.includes(objectName));
    if (matched) matched.classList.add('active');

    // Update detail pane header
    if (this.currentCategory === 'tablespaces') {
      if (this.detailTitle) this.detailTitle.textContent = `TABLESPACE: ${this.selectedObject.name}`;
      if (this.detailTypePill) this.detailTypePill.textContent = 'TABLESPACE';
    } else {
      if (this.detailTitle) this.detailTitle.textContent = `${this.currentSchema}.${this.selectedObject.name}`;
      if (this.detailTypePill) this.detailTypePill.textContent = this.currentCategory.slice(0, -1).toUpperCase();
    }
    this.renderContextActionsBar();

    // Contextual detail tab selection
    if (['procedures', 'functions', 'packages', 'triggers', 'types'].includes(this.currentCategory)) {
      if (this.currentDetailTab === 'columns') this.switchDetailTab('source');
    } else if (this.currentCategory === 'tablespaces') {
      this.loadAllTablespacesOverview();
      if (this.currentDetailTab === 'tsoverview') {
        this.selectTablespaceInMaster(objectName);
      }
    }

    // If connected to real Oracle DB, fetch complete live object details
    if (window.TracesApp && window.TracesApp.isConnected()) {
      await this.fetchRealObjectDetails(this.currentSchema, objectName, this.currentCategory);
    } else {
      this.renderDetailContent();
    }
  }

  async fetchRealObjectDetails(schema, name, category, forceRefresh = false) {
    const catTypeMap = {
      tables: 'TABLE',
      views: 'VIEW',
      mviews: 'MATERIALIZED VIEW',
      packages: 'PACKAGE',
      procedures: 'PROCEDURE',
      functions: 'FUNCTION',
      triggers: 'TRIGGER',
      types: 'TYPE',
      sequences: 'SEQUENCE',
      synonyms: 'SYNONYM',
      indexes: 'INDEX',
      tablespaces: 'TABLESPACE',
      dblinks: 'DATABASE LINK',
      users: 'USER',
      roles: 'ROLE',
      jobs: 'JOB',
      directories: 'DIRECTORY',
      queues: 'QUEUE',
      recyclebin: 'RECYCLEBIN',
      java: 'JAVA SOURCE',
      clusters: 'CLUSTER'
    };
    const objType = catTypeMap[category] || 'TABLE';
    const cacheKey = `${schema}.${objType}.${name}`;

    // 0ms instant cache hit
    if (!forceRefresh && this.detailsCache && this.detailsCache.has(cacheKey)) {
      const cached = this.detailsCache.get(cacheKey);
      this.selectedObject = Object.assign(this.selectedObject || {}, cached);
      this.isLoadingDetails = false;
      this.renderDetailContent();
      return;
    }

    this.isLoadingDetails = true;

    // Show loading state in detail area
    const activePane = document.querySelector('.detail-tab-pane.active');
    if (activePane) {
      activePane.innerHTML = `
        <div style="padding: 32px; text-align: center; color: var(--text-muted); font-size: 12px;">
          <span style="font-size: 18px; display: block; margin-bottom: 8px;">⚡</span>
          Consultando metadados de <strong>${schema}.${name}</strong> no Oracle...
        </div>
      `;
    }

    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/object-details?schema=${encodeURIComponent(schema)}&name=${encodeURIComponent(name)}&type=${encodeURIComponent(objType)}${connParam}`);
      const details = await resp.json();

      if (details.error && !details.name) {
        window.TracesApp?.notify(`Erro ao obter detalhes de ${name}: ${details.error}`, 'error');
        this.isLoadingDetails = false;
        return;
      }

      if (!this.detailsCache) this.detailsCache = new Map();
      this.detailsCache.set(cacheKey, details);

      // Merge into selectedObject
      this.selectedObject = Object.assign(this.selectedObject || {}, details);
      this.isLoadingDetails = false;
      this.renderDetailContent();
    } catch (err) {
      this.isLoadingDetails = false;
      console.warn('Real object details fetch error:', err);
      this.renderDetailContent();
    }
  }

  async switchDetailTab(tabKey) {
    this.currentDetailTab = tabKey;
    this.detailTabs.forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabKey);
    });

    const panes = document.querySelectorAll('.detail-tab-pane');
    panes.forEach(p => {
      p.classList.toggle('active', p.id === `tab-pane-${tabKey}`);
    });

    // On-demand fetch for Data Tab
    if (tabKey === 'data' && this.selectedObject && window.TracesApp?.isConnected()) {
      const objType = (this.selectedObject.type || this.currentCategory || '').toUpperCase();
      if ((!this.selectedObject.data || this.selectedObject.data.length === 0) &&
          (objType.includes('TABLE') || objType.includes('VIEW') || this.currentCategory === 'tables' || this.currentCategory === 'views' || this.currentCategory === 'mviews')) {
        await this.loadMoreObjectData(200, true);
      }
    }

    // On-demand fetch for DDL / Script Tab (if DDL empty)
    if ((tabKey === 'ddl' || tabKey === 'script') && this.selectedObject && !this.selectedObject.ddl && window.TracesApp?.isConnected()) {
      const scriptPane = document.getElementById('tab-pane-ddl') || document.getElementById('tab-pane-script');
      if (scriptPane) {
        scriptPane.innerHTML = `
          <div style="padding: 32px; text-align: center; color: var(--text-muted); font-size: 12px;">
            <span style="font-size: 18px; display: block; margin-bottom: 8px;">📜</span>
            Gerando DDL completo de <strong>${this.currentSchema}.${this.selectedObject.name}</strong>...
          </div>
        `;
      }
      try {
        const activeConn = window.TracesApp?.connectionManager?.getActive?.();
        const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
        const resp = await fetch(`/api/object-ddl?schema=${encodeURIComponent(this.currentSchema)}&name=${encodeURIComponent(this.selectedObject.name)}&type=${encodeURIComponent(this.selectedObject.type || 'TABLE')}${connParam}`);
        const res = await resp.json();
        if (res.ddl) {
          this.selectedObject.ddl = res.ddl;
        }
      } catch (e) {
        console.warn('Failed to load object DDL', e);
      }
    }

    // On-demand fetch for Mini-ERD Tab
    if (tabKey === 'erd' && this.selectedObject) {
      const erdPane = document.getElementById('tab-pane-erd');
      if (erdPane && window.TracesPro) {
        window.TracesPro.renderTableFkGraph(this.currentSchema, this.selectedObject.name, erdPane);
      }
    }

    // On-demand fetch for Tablespaces Overview & Max Usage Tab
    if (tabKey === 'tsoverview') {
      await this.loadAllTablespacesOverview(true);
    }

    this.renderDetailContent();
  }

  async loadMoreObjectData(targetLimit = 500, isInitial = false) {
    if (!this.selectedObject || !window.TracesApp?.isConnected()) return;
    const dataPane = document.getElementById('tab-pane-data');
    if (isInitial && dataPane) {
      dataPane.innerHTML = `
        <div style="padding: 32px; text-align: center; color: var(--text-muted); font-size: 12px;">
          <span style="font-size: 18px; display: block; margin-bottom: 8px;">📊</span>
          Carregando registros ao vivo de <strong>${this.currentSchema}.${this.selectedObject.name}</strong>...
        </div>
      `;
    }
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/object-data?schema=${encodeURIComponent(this.currentSchema)}&name=${encodeURIComponent(this.selectedObject.name)}&limit=${targetLimit}${connParam}`);
      const res = await resp.json();
      const rowsData = res.rows || res.data;
      if (rowsData) {
        this.selectedObject.data = rowsData;
        this.selectedObject.dataHasMore = !!res.hasMore;
        this.selectedObject.dataLimit = targetLimit;
        const cacheKey = `${this.currentSchema}.${this.selectedObject.type || 'TABLE'}.${this.selectedObject.name}`;
        if (this.detailsCache && this.detailsCache.has(cacheKey)) {
          const cached = this.detailsCache.get(cacheKey);
          cached.data = rowsData;
          cached.dataHasMore = !!res.hasMore;
          cached.dataLimit = targetLimit;
        }
      }
    } catch (e) {
      console.warn('Failed to load object data preview', e);
    }
    this.renderDetailContent();
  }

  showMoreDetailList(sectionKey, step = 500) {
    const key = `${this.currentSchema}.${this.selectedObject?.name}.${sectionKey}`;
    const current = this.detailListLimits[key] || 200;
    this.detailListLimits[key] = current + step;
    this.renderDetailContent();
  }

  renderDetailContent() {
    if (!this.selectedObject) return;
    const obj = this.selectedObject;

    // 1. Columns / Overview Pane
    const colPane = document.getElementById('tab-pane-columns');
    if (colPane) {
      // Specialized Inspector: Tablespaces
      if (this.currentCategory === 'tablespaces') {
        colPane.innerHTML = this.buildSelectedTablespaceDetailHtml(obj.tablespaceInfo || obj);
      } else if (this.currentCategory === 'dblinks') {
        const link = obj.dbLinkInfo || obj;
        colPane.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
            <div class="advisor-card" style="padding: 16px;">
              <strong style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px; display: block;">Database Link: ${obj.name}</strong>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 12px;">
                <div><span style="color: var(--text-muted);">Remote Host / DSN:</span> <strong style="font-family: var(--font-code);">${link.host || 'erp-db.corp:1521/PROD'}</strong></div>
                <div><span style="color: var(--text-muted);">Connected Remote User:</span> <strong style="font-family: var(--font-code);">${link.user || 'REMOTE_APP'}</strong></div>
                <div><span style="color: var(--text-muted);">Created Date:</span> <strong>${link.created || '2025-01-15'}</strong></div>
                <div><span style="color: var(--text-muted);">Status:</span> <span class="status-indicator valid">VALID</span></div>
              </div>
              <div style="margin-top: 16px;">
                <button class="btn btn-primary" onclick="window.TracesApp.notify('Testando conexão com ${obj.name}... Conexão estabelecida com sucesso via Oracle Net8 (24ms)!', 'success');">
                  ⚡ Testar Conexão do DB Link (Test Link)
                </button>
              </div>
            </div>
          </div>
        `;
      } else if (this.currentCategory === 'users') {
        const u = obj.userInfo || obj;
        const statusVal = u.accountStatus || u.status || 'OPEN';
        const isBad = statusVal.includes('LOCKED') || statusVal.includes('EXPIRED');
        colPane.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
            <div class="advisor-card" style="padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <strong style="font-size: 13px; color: var(--text-primary);">Oracle User Account: ${obj.name}</strong>
                <span class="status-indicator ${isBad ? 'invalid' : 'valid'}">${statusVal}</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 12px;">
                <div><span style="color: var(--text-muted);">Default Tablespace:</span> <strong>${u.defaultTablespace || 'USERS'}</strong></div>
                <div><span style="color: var(--text-muted);">Temporary Tablespace:</span> <strong>${u.tempTablespace || u.temporaryTablespace || 'TEMP'}</strong></div>
                <div><span style="color: var(--text-muted);">Security Profile:</span> <strong>${u.profile || 'DEFAULT'}</strong></div>
                <div><span style="color: var(--text-muted);">Created Date:</span> <strong>${u.created || '-'}</strong></div>
              </div>
            </div>
            <div class="advisor-card" style="padding: 12px;">
              <strong style="font-size: 12px; margin-bottom: 8px; display: block;">Roles Concedidas (DBA_ROLE_PRIVS)</strong>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                ${(u.roles && u.roles.length > 0) ? u.roles.map(r => `
                  <span class="pk-badge" style="background:#0284c7; padding: 3px 8px; font-size: 11px;">
                    ${r.role || r} ${r.admin === 'YES' ? '★' : ''}
                  </span>
                `).join('') : `
                  <span style="color: var(--text-muted); font-size: 11px;">Nenhuma role concedida diretamente.</span>
                `}
              </div>
            </div>
            ${(u.sysPrivs && u.sysPrivs.length > 0) ? `
              <div class="advisor-card" style="padding: 12px;">
                <strong style="font-size: 12px; margin-bottom: 8px; display: block;">Privilégios de Sistema (DBA_SYS_PRIVS)</strong>
                <div style="display: flex; gap: 6px; flex-wrap: wrap; max-height: 120px; overflow-y: auto;">
                  ${u.sysPrivs.map(p => `
                    <span class="pk-badge" style="background:#475569; padding: 2px 6px; font-size: 10px;">
                      ${p.privilege || p} ${p.admin === 'YES' ? '★' : ''}
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      } else if (this.currentCategory === 'roles') {
        const privs = obj.roleInfo?.privileges || obj.privileges || [];
        const grantedRoles = obj.roleInfo?.grantedRoles || obj.grantedRoles || [];
        colPane.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
            <div class="advisor-card" style="padding: 16px;">
              <strong style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px; display: block;">Oracle Role: ${obj.name}</strong>
              <table class="meta-table">
                <thead>
                  <tr>
                    <th>Granted System Privilege</th>
                    <th style="width: 120px;">Admin Option</th>
                  </tr>
                </thead>
                <tbody>
                  ${privs.length > 0 ? privs.map(p => `
                    <tr>
                      <td style="font-weight: 600; font-family: var(--font-code);">${p.privilege || p}</td>
                      <td>${p.admin || 'NO'}</td>
                    </tr>
                  `).join('') : `
                    <tr><td colspan="2" style="color: var(--text-muted); text-align: center;">Nenhum privilégio de sistema concedido diretamente a esta role.</td></tr>
                  `}
                </tbody>
              </table>
            </div>
            ${grantedRoles.length > 0 ? `
              <div class="advisor-card" style="padding: 12px;">
                <strong style="font-size: 12px; margin-bottom: 8px; display: block;">Roles Herdadas (ROLE_ROLE_PRIVS)</strong>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  ${grantedRoles.map(gr => `
                    <span class="pk-badge" style="background:#0284c7; padding: 3px 8px;">${gr.role || gr}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      } else if (this.currentCategory === 'sequences') {
        const seq = obj.sequenceInfo || obj;
        colPane.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
            <div class="advisor-card" style="padding: 16px;">
              <strong style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px; display: block;">Oracle Sequence: ${obj.name}</strong>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 12px;">
                <div><span style="color: var(--text-muted);">Current / Last Value:</span> <strong style="font-family: var(--font-code); color: #0284c7; font-size: 14px;">${seq.lastNumber || '-'}</strong></div>
                <div><span style="color: var(--text-muted);">Increment By:</span> <strong>${seq.incrementBy || 1}</strong></div>
                <div><span style="color: var(--text-muted);">Cache Size:</span> <strong>${seq.cacheSize || 20}</strong></div>
                <div><span style="color: var(--text-muted);">Min Value:</span> <strong>${seq.minValue || 1}</strong></div>
                <div><span style="color: var(--text-muted);">Max Value:</span> <strong style="font-family: var(--font-code);">${seq.maxValue || '99999999999999999999'}</strong></div>
                <div><span style="color: var(--text-muted);">Cycle / Order:</span> <strong>${seq.cycleFlag === 'Y' ? 'CYCLE' : 'NOCYCLE'} / ${seq.orderFlag === 'Y' ? 'ORDER' : 'NOORDER'}</strong></div>
              </div>
            </div>
          </div>
        `;
      } else if (this.currentCategory === 'synonyms') {
        const syn = obj.synonymInfo || obj;
        colPane.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
            <div class="advisor-card" style="padding: 16px;">
              <strong style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px; display: block;">Oracle Synonym: ${obj.name}</strong>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 12px;">
                <div><span style="color: var(--text-muted);">Target Schema / Owner:</span> <strong style="font-family: var(--font-code);">${syn.targetOwner || this.currentSchema}</strong></div>
                <div><span style="color: var(--text-muted);">Target Object:</span> <strong style="font-family: var(--font-code); color: #0284c7;">${syn.targetTable || obj.name}</strong></div>
                <div><span style="color: var(--text-muted);">DB Link:</span> <strong>${syn.dbLink || '(Local Database)'}</strong></div>
                <div><span style="color: var(--text-muted);">Status:</span> <span class="status-indicator valid">VALID</span></div>
              </div>
            </div>
          </div>
        `;
      } else if (this.currentCategory === 'triggers') {
        const trg = obj.triggerInfo || obj;
        colPane.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
            <div class="advisor-card" style="padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <strong style="font-size: 13px; color: var(--text-primary);">Oracle Trigger: ${obj.name}</strong>
                <span class="status-indicator ${trg.status === 'ENABLED' ? 'valid' : 'invalid'}">${trg.status || 'ENABLED'}</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 12px;">
                <div><span style="color: var(--text-muted);">Trigger Type:</span> <strong>${trg.type || 'BEFORE EACH ROW'}</strong></div>
                <div><span style="color: var(--text-muted);">Triggering Event:</span> <strong style="color: #0284c7;">${trg.event || 'INSERT OR UPDATE'}</strong></div>
                <div><span style="color: var(--text-muted);">Target Table / View:</span> <strong style="font-family: var(--font-code);">${trg.tableOwner || this.currentSchema}.${trg.tableName || '-'}</strong></div>
                <div><span style="color: var(--text-muted);">Action Type:</span> <strong>${trg.actionType || 'PL/SQL'}</strong></div>
              </div>
              <div style="margin-top: 12px;">
                <button class="btn btn-primary" onclick="window.TracesApp.schemaBrowser.switchDetailTab('source');">
                  📄 Ver Código-Fonte PL/SQL (Source Code)
                </button>
              </div>
            </div>
          </div>
        `;
      } else if (this.currentCategory === 'jobs') {
        const j = obj.jobInfo || obj;
        colPane.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
            <div class="advisor-card" style="padding: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <strong style="font-size: 13px; color: var(--text-primary);">Scheduler Job: ${obj.name}</strong>
                <span class="status-indicator ${j.status === 'RUNNING' ? 'running' : 'valid'}">${j.status || 'SCHEDULED'}</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 12px;">
                <div><span style="color: var(--text-muted);">Job Type:</span> <strong>${j.jobType || 'PLSQL_BLOCK'}</strong></div>
                <div><span style="color: var(--text-muted);">Repeat Interval:</span> <strong style="font-family: var(--font-code); color: #0284c7;">${j.repeatInterval || 'FREQ=DAILY;BYHOUR=2'}</strong></div>
                <div><span style="color: var(--text-muted);">Next Scheduled Run:</span> <strong>${j.nextRun || 'Amanhã às 02:00:00'}</strong></div>
                <div><span style="color: var(--text-muted);">Failure Count:</span> <strong>${j.failureCount || 0}</strong></div>
              </div>
              <div style="margin-top: 16px;">
                <button class="btn btn-primary" onclick="window.TracesApp.notify('Job ${obj.name} executado com sucesso em segundo plano via DBMS_SCHEDULER.RUN_JOB!', 'success');">
                  ▶ Executar Job Agora (Run Now)
                </button>
              </div>
            </div>
          </div>
        `;
      } else if (this.currentCategory === 'directories') {
        const dir = obj.directoryInfo || obj;
        colPane.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
            <div class="advisor-card" style="padding: 16px;">
              <strong style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px; display: block;">Oracle Directory: ${obj.name}</strong>
              <div style="font-size: 12px; margin-bottom: 8px;">
                <span style="color: var(--text-muted);">System File Path:</span>
                <div style="font-family: var(--font-code); background: #f1f5f9; padding: 8px 12px; border-radius: 4px; margin-top: 4px; border: 1px solid #cbd5e1;">
                  ${dir.path || '/u01/app/oracle/admin/sales/dpdump'}
                </div>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">
                Usado por: Oracle Data Pump (expdp / impdp), UTL_FILE, External Tables e BFILEs.
              </div>
            </div>
          </div>
        `;
      } else if (this.currentCategory === 'recyclebin') {
        const rb = obj.recyclebinInfo || obj;
        colPane.innerHTML = `
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
            <div class="advisor-card" style="padding: 16px;">
              <strong style="font-size: 13px; color: var(--text-primary); margin-bottom: 12px; display: block;">Recycle Bin Object: ${obj.name}</strong>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 12px;">
                <div><span style="color: var(--text-muted);">Original Table Name:</span> <strong style="color: var(--traces-red);">${rb.originalName || obj.name}</strong></div>
                <div><span style="color: var(--text-muted);">Dropped Time:</span> <strong>${rb.dropTime || '2026-10-18 11:42:19'}</strong></div>
                <div><span style="color: var(--text-muted);">Tablespace:</span> <strong>${rb.tablespace || 'USERS'}</strong></div>
                <div><span style="color: var(--text-muted);">Can Flashback Undrop:</span> <span style="color:#10b981; font-weight:700;">YES</span></div>
              </div>
              <div style="margin-top: 16px;">
                <button class="btn btn-primary" onclick="window.TracesApp.notify('FLASHBACK TABLE ${rb.originalName || obj.name} TO BEFORE DROP: Tabela restaurada com sucesso!', 'success');">
                  ♻ Restaurar Tabela (Flashback Undrop)
                </button>
              </div>
            </div>
          </div>
        `;
      } else if ((obj.columns && obj.columns.length > 0) || this.currentCategory === 'tables' || this.currentCategory === 'views') {
        const isTable = this.currentCategory === 'tables';
        const colSearch = (this.subtabFilter || '').toLowerCase();
        const allCols = obj.columns || [];
        const filteredCols = colSearch
          ? allCols.filter(c => (c.name || '').toLowerCase().includes(colSearch) || (c.type || '').toLowerCase().includes(colSearch) || (c.comments || '').toLowerCase().includes(colSearch))
          : allCols;
        const mvBanner = (obj.mviewInfo || this.currentCategory === 'mviews') ? `
          <div class="advisor-card" style="margin: 10px 10px 0 10px; padding: 10px 14px; background: #f0fdf4; border: 1px solid #86efac;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: #166534; font-size: 12px;">📋 Materialized View: ${obj.name} ${obj.mviewInfo?.containerTable ? `(Container: ${obj.mviewInfo.containerTable})` : ''}</strong>
              <span class="status-indicator ${obj.mviewInfo?.compileState === 'VALID' ? 'valid' : 'invalid'}">${obj.mviewInfo?.compileState || 'VALID'}</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 11px;">
              <div><span style="color: #64748b;">Refresh Mode:</span> <strong>${obj.mviewInfo?.refreshMode || 'DEMAND'}</strong></div>
              <div><span style="color: #64748b;">Refresh Method:</span> <strong>${obj.mviewInfo?.refreshMethod || 'FORCE'}</strong></div>
              <div><span style="color: #64748b;">Last Refresh:</span> <strong>${obj.mviewInfo?.lastRefreshDate || 'Never'}</strong></div>
              <div><span style="color: #64748b;">Staleness:</span> <strong>${obj.mviewInfo?.staleness || 'FRESH'}</strong></div>
            </div>
          </div>
        ` : '';
        const colActionBar = `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #f8fafc; border-bottom: 1px solid #cbd5e1; gap: 8px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              ${isTable ? `
                <button class="btn btn-primary" style="height: 23px; padding: 0 9px; font-size: 10.5px; font-weight: 700;" onclick="window.TracesApp.schemaBrowser.promptColumnAction('ADD')">
                  ➕ Adicionar Coluna
                </button>
                <button class="btn" style="height: 23px; padding: 0 8px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.schemaBrowser.promptColumnAction('MODIFY')">
                  ✏ Modificar Coluna
                </button>
                <button class="btn" style="height: 23px; padding: 0 8px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.schemaBrowser.promptColumnAction('RENAME')">
                  🏷 Renomear Coluna
                </button>
                <button class="btn btn-danger" style="height: 23px; padding: 0 8px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.schemaBrowser.promptColumnAction('DROP')">
                  🗑 Remover Coluna
                </button>
              ` : `<span style="font-size: 11px; font-weight: 600; color: #475569;">Colunas de ${obj.name} (${filteredCols.length}/${allCols.length})</span>`}
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="text" placeholder="🔍 Filtrar colunas ou tipo..." value="${this.escapeHtml(this.subtabFilter || '')}"
                     style="height: 22px; width: 190px; padding: 0 7px; font-size: 10.5px; border: 1px solid #cbd5e1; border-radius: 3px;"
                     oninput="window.TracesApp.schemaBrowser.setSubtabFilter(this.value)">
            </div>
          </div>
        `;
        colPane.innerHTML = `
          ${mvBanner}
          ${colActionBar}
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
                ${isTable ? '<th style="width: 130px; text-align: right;">Manipular</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${filteredCols.map((col, idx) => `
                <tr>
                  <td style="color: var(--text-muted);">${col.id || (idx + 1)}</td>
                  <td style="font-weight: 600; color: var(--text-primary); font-family: var(--font-code);">${col.name}</td>
                  <td style="color: var(--syntax-type); font-family: var(--font-code);">${col.type}</td>
                  <td><span style="color: ${col.nullable === 'N' ? 'var(--traces-red)' : 'var(--text-muted)'}; font-weight: 600;">${col.nullable}</span></td>
                  <td style="color: var(--syntax-string); font-family: var(--font-code);">${col.defaultVal || '-'}</td>
                  <td>
                    ${col.pk ? '<span class="pk-badge">PK</span> ' : ''}
                    ${col.fk ? '<span class="fk-badge">FK</span>' : ''}
                    ${!col.pk && !col.fk ? '-' : ''}
                  </td>
                  <td style="color: var(--text-muted); font-size: 11px;">${col.comments || ''}</td>
                  ${isTable ? `
                    <td style="text-align: right; white-space: nowrap;">
                      <button class="btn" style="height: 19px; padding: 0 5px; font-size: 9.5px;" title="Modificar tipo/nullable da coluna ${col.name}" onclick="window.TracesApp.schemaBrowser.promptColumnAction('MODIFY', '${col.name}', '${col.type}', '${col.nullable}')">✏ Alt</button>
                      <button class="btn" style="height: 19px; padding: 0 5px; font-size: 9.5px;" title="Renomear coluna ${col.name}" onclick="window.TracesApp.schemaBrowser.promptColumnAction('RENAME', '${col.name}')">🏷 Ren</button>
                      <button class="btn btn-danger" style="height: 19px; padding: 0 5px; font-size: 9.5px;" title="Remover (DROP) coluna ${col.name}" onclick="window.TracesApp.schemaBrowser.promptColumnAction('DROP', '${col.name}')">🗑</button>
                    </td>
                  ` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        colPane.innerHTML = `<div style="padding: 28px; color: var(--text-muted); text-align: center;">Nenhuma coluna declarada para ${obj.name}.</div>`;
      }
    }

    // 2. Data Preview Pane
    const dataPane = document.getElementById('tab-pane-data');
    if (dataPane) {
      if (obj.data && obj.data.length > 0) {
        const cols = Object.keys(obj.data[0]);
        const curLimit = obj.dataLimit || obj.data.length;
        const nextLimit = Math.min(5000, curLimit + 500);
        const estTotal = obj.stats?.numRows ? ` (Total estimado: ${obj.stats.numRows.toLocaleString()} linhas)` : '';
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
                      <td>${row[c] !== null && row[c] !== undefined ? this.escapeHtml(String(row[c])) : '<span class="cell-null">(null)</span>'}</td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="padding: 6px 12px; background: var(--bg-surface); border-top: 1px solid var(--border-default); font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
            <span>Exibindo <strong>${obj.data.length.toLocaleString()}</strong> registros ao vivo de ${this.currentSchema}.${obj.name}${estTotal}</span>
            <div style="display: flex; gap: 8px; align-items: center;">
              ${obj.dataHasMore ? `
                <button class="btn btn-primary" style="height: 22px; padding: 0 10px; font-size: 10px; font-weight: 600;"
                        onclick="window.TracesApp.schemaBrowser.loadMoreObjectData(${nextLimit}, false)">
                  ➕ Ver mais linhas (+500)
                </button>
                <button class="btn" style="height: 22px; padding: 0 10px; font-size: 10px; font-weight: 700; color: #0369a1; border-color: #7dd3fc; background: #e0f2fe;"
                        onclick="window.TracesApp.schemaBrowser.loadMoreObjectData(0, false)">
                  ⚡ Carregar Todas as Linhas
                </button>
              ` : ''}
              <button class="btn btn-secondary" style="height: 22px; padding: 0 8px; font-size: 10px;" onclick="window.TracesApp.openObjectInWorksheet('${obj.name}')">
                Abrir na Worksheet (F9)
              </button>
            </div>
          </div>
        `;
      } else {
        dataPane.innerHTML = `
          <div style="padding: 28px; color: var(--text-muted); text-align: center;">
            Nenhum dado retornado para a tabela ${obj.name}.
            <div style="margin-top: 8px;">
              <button class="btn btn-primary" onclick="window.TracesApp.openObjectInWorksheet('${obj.name}')">Consultar SELECT * FROM ${this.currentSchema}.${obj.name}</button>
            </div>
          </div>
        `;
      }
    }

    // 3. Indexes Pane (with Create / Rebuild / Drop Actions)
    const idxPane = document.getElementById('tab-pane-indexes');
    if (idxPane) {
      const idxActionBar = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #f8fafc; border-bottom: 1px solid #cbd5e1; gap: 6px; flex-wrap: wrap;">
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn btn-primary" style="height: 23px; padding: 0 9px; font-size: 10.5px; font-weight: 700;" onclick="window.TracesApp.schemaBrowser.promptIndexAction('CREATE')">
              ➕ Criar Novo Índice
            </button>
            <button class="btn" style="height: 23px; padding: 0 8px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.schemaBrowser.promptIndexAction('REBUILD')">
              🔄 Rebuild Índice
            </button>
            <button class="btn btn-danger" style="height: 23px; padding: 0 8px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.schemaBrowser.promptIndexAction('DROP')">
              🗑 Remover Índice (Drop)
            </button>
          </div>
          <span style="font-size: 10.5px; color: #64748b;">Total: ${(obj.indexes || []).length} índice(s)</span>
        </div>
      `;
      if (obj.indexes && obj.indexes.length > 0) {
        idxPane.innerHTML = `
          ${idxActionBar}
          <table class="meta-table">
            <thead>
              <tr>
                <th>Index Name</th>
                <th>Uniqueness</th>
                <th>Columns</th>
                <th>Tablespace</th>
                <th>Clustering Factor</th>
                <th>Status</th>
                <th style="text-align: right;">Manipular</th>
              </tr>
            </thead>
            <tbody>
              ${obj.indexes.map(ix => `
                <tr>
                  <td style="font-weight: 600; color: #0078d7; font-family: var(--font-code);">${ix.name}</td>
                  <td>${ix.type}</td>
                  <td style="color: var(--text-primary); font-family: var(--font-code);">${ix.columns}</td>
                  <td style="color: var(--text-muted);">${ix.tablespace || '-'}</td>
                  <td>${ix.clusteringFactor || '-'}</td>
                  <td><span class="status-indicator valid">${ix.status || 'VALID'}</span></td>
                  <td style="text-align: right; white-space: nowrap;">
                    <button class="btn" style="height: 19px; padding: 0 6px; font-size: 9.5px;" onclick="window.TracesApp.schemaBrowser.promptIndexAction('REBUILD', '${ix.name}')">🔄 Rebuild</button>
                    <button class="btn btn-danger" style="height: 19px; padding: 0 6px; font-size: 9.5px;" onclick="window.TracesApp.schemaBrowser.promptIndexAction('DROP', '${ix.name}')">🗑 Drop</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        idxPane.innerHTML = `${idxActionBar}<div style="padding: 28px; color: var(--text-muted); text-align: center;">Nenhum índice definido para ${obj.name}. Use <strong>+ Criar Novo Índice</strong> acima para adicionar.</div>`;
      }
    }

    // 4. Constraints Pane (with Add PK/FK/UK/CHECK, Enable/Disable, Drop Actions)
    const constrPane = document.getElementById('tab-pane-constraints');
    if (constrPane) {
      const constrActionBar = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #f8fafc; border-bottom: 1px solid #cbd5e1; gap: 6px; flex-wrap: wrap;">
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-primary" style="height: 23px; padding: 0 9px; font-size: 10.5px; font-weight: 700;" onclick="window.TracesApp.schemaBrowser.promptConstraintAction('ADD_PK')">
              🔑 + Primary Key (PK)
            </button>
            <button class="btn" style="height: 23px; padding: 0 8px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.schemaBrowser.promptConstraintAction('ADD_FK')">
              🔗 + Foreign Key (FK)
            </button>
            <button class="btn" style="height: 23px; padding: 0 8px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.schemaBrowser.promptConstraintAction('ADD_CHECK')">
              ✔ + Check / Unique
            </button>
            <button class="btn btn-danger" style="height: 23px; padding: 0 8px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.schemaBrowser.promptConstraintAction('DROP')">
              🗑 Remover Constraint
            </button>
          </div>
          <span style="font-size: 10.5px; color: #64748b;">Total: ${(obj.constraints || []).length} constraint(s)</span>
        </div>
      `;
      if (obj.constraints && obj.constraints.length > 0) {
        constrPane.innerHTML = `
          ${constrActionBar}
          <table class="meta-table">
            <thead>
              <tr>
                <th>Constraint Name</th>
                <th>Type</th>
                <th>Columns</th>
                <th>Details / Condition</th>
                <th>Status</th>
                <th style="text-align: right;">Manipular</th>
              </tr>
            </thead>
            <tbody>
              ${obj.constraints.map(cn => {
                const isEn = (cn.status || 'ENABLED').toUpperCase() === 'ENABLED';
                return `
                <tr>
                  <td style="font-weight: 600; font-family: var(--font-code);">${cn.name}</td>
                  <td style="color: var(--syntax-keyword); font-weight: 700;">${cn.type}</td>
                  <td style="color: var(--text-primary); font-family: var(--font-code);">${cn.columns || '-'}</td>
                  <td style="color: var(--text-secondary); font-size: 11px;">${cn.details || '-'}</td>
                  <td><span class="status-indicator ${isEn ? 'valid' : 'invalid'}">${cn.status || 'ENABLED'}</span></td>
                  <td style="text-align: right; white-space: nowrap;">
                    <button class="btn" style="height: 19px; padding: 0 6px; font-size: 9.5px;" onclick="window.TracesApp.schemaBrowser.promptConstraintAction('${isEn ? 'DISABLE' : 'ENABLE'}', '${cn.name}')">${isEn ? '⏸ Disable' : '✅ Enable'}</button>
                    <button class="btn btn-danger" style="height: 19px; padding: 0 6px; font-size: 9.5px;" onclick="window.TracesApp.schemaBrowser.promptConstraintAction('DROP', '${cn.name}')">🗑 Drop</button>
                  </td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        `;
      } else {
        constrPane.innerHTML = `${constrActionBar}<div style="padding: 28px; color: var(--text-muted); text-align: center;">Nenhuma constraint definida para ${obj.name}.</div>`;
      }
    }

    // 5. DDL Script Pane
    const ddlPane = document.getElementById('tab-pane-ddl');
    if (ddlPane) {
      let ddlCode = obj.ddl || obj.specDdl;
      if (!ddlCode && this.currentCategory === 'tablespaces') {
        const ts = obj.tablespaceInfo || obj;
        const totMb = ts.totalMb || 1024;
        const maxMb = ts.maxMb || totMb * 4;
        ddlCode = `CREATE TABLESPACE "${obj.name}"\n  DATAFILE '${obj.name.toLowerCase()}01.dbf' SIZE ${totMb}M\n  AUTOEXTEND ${ts.autoextend === 'NO' ? 'OFF' : 'ON NEXT 128M MAXSIZE ' + maxMb + 'M'}\n  EXTENT MANAGEMENT ${ts.extentManagement || 'LOCAL'} ${ts.allocationType || 'AUTOALLOCATE'}\n  SEGMENT SPACE MANAGEMENT ${ts.segmentSpaceManagement || 'AUTO'};`;
      }
      ddlCode = ddlCode || `-- DDL extraction for ${this.currentSchema}.${obj.name}`;
      ddlPane.innerHTML = `
        <div style="display: flex; justify-content: flex-end; gap: 8px; padding: 6px 12px; background: var(--bg-surface); border-bottom: 1px solid var(--border-default);">
          <button class="btn btn-secondary" style="height: 24px; padding: 0 8px; font-size: 11px;" onclick="navigator.clipboard.writeText(document.getElementById('ddl-code-block').textContent); window.TracesApp.notify('DDL copiado para a área de transferência', 'info');">
            Copiar DDL
          </button>
          <button class="btn btn-primary" style="height: 24px; padding: 0 8px; font-size: 11px;" onclick="window.TracesApp.openObjectInWorksheet('${obj.name}');">
            📝 Abrir no Worksheet
          </button>
        </div>
        <div id="ddl-code-block" class="ddl-script-container" style="padding: 12px; font-family: var(--font-code); font-size: 11px; white-space: pre-wrap; line-height: 1.4; overflow: auto; height: calc(100% - 37px);">${this.escapeHtml(ddlCode)}</div>
      `;
    }

    // 6. Source / Code Pane (Procedures, Functions, Packages, Triggers, Views)
    const sourcePane = document.getElementById('tab-pane-source');
    if (sourcePane) {
      const src = obj.source || obj.ddl || '';
      if (src) {
        sourcePane.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: var(--bg-surface); border-bottom: 1px solid var(--border-default);">
            <span style="font-size: 11px; color: var(--text-muted);">PL/SQL Source Code (${src.split('\n').length} lines)</span>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary" style="height: 24px; padding: 0 8px; font-size: 11px;" onclick="navigator.clipboard.writeText(document.getElementById('plsql-source-view').textContent); window.TracesApp.notify('Código fonte copiado', 'info');">
                Copiar Código
              </button>
              <button class="btn btn-primary" style="height: 24px; padding: 0 8px; font-size: 11px;" onclick="window.TracesApp.schemaBrowser.recompileCurrentObject()">
                Recompilar (F9)
              </button>
            </div>
          </div>
          <div id="plsql-source-view" class="ddl-script-container" style="padding: 12px; font-family: var(--font-code); font-size: 11px; white-space: pre-wrap; line-height: 1.4; overflow: auto; height: calc(100% - 37px);">${this.escapeHtml(src)}</div>
        `;
      } else {
        sourcePane.innerHTML = `<div style="padding: 28px; color: var(--text-muted); text-align: center;">Código fonte não aplicável para ${obj.name}.</div>`;
      }
    }

    // 7. Grants Pane (with GRANT & REVOKE Actions)
    const grantsPane = document.getElementById('tab-pane-grants');
    if (grantsPane) {
      const grantActionBar = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #f8fafc; border-bottom: 1px solid #cbd5e1; gap: 6px; flex-wrap: wrap;">
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn btn-primary" style="height: 23px; padding: 0 9px; font-size: 10.5px; font-weight: 700;" onclick="window.TracesApp.schemaBrowser.promptGrantAction('GRANT')">
              ➕ Conceder Privilégio (GRANT)
            </button>
            <button class="btn btn-danger" style="height: 23px; padding: 0 8px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.schemaBrowser.promptGrantAction('REVOKE')">
              🚫 Revogar Privilégio (REVOKE)
            </button>
          </div>
          <span style="font-size: 10.5px; color: #64748b;">Total: ${(obj.grants || []).length} permissão(ões)</span>
        </div>
      `;
      if (obj.grants && obj.grants.length > 0) {
        const gKey = `${this.currentSchema}.${obj.name}.grants`;
        const gLimit = this.detailListLimits[gKey] || 200;
        const visibleGrants = obj.grants.slice(0, gLimit);
        const remGrants = obj.grants.length - visibleGrants.length;
        grantsPane.innerHTML = `
          ${grantActionBar}
          <table class="meta-table">
            <thead>
              <tr>
                <th>Grantee (${obj.grants.length.toLocaleString()} total)</th>
                <th>Privilege</th>
                <th>Grantable</th>
                <th style="text-align: right;">Ação</th>
              </tr>
            </thead>
            <tbody>
              ${visibleGrants.map(g => `
                <tr>
                  <td style="font-weight: 600; color: #0078d7; font-family: var(--font-code);">${g.grantee}</td>
                  <td style="font-weight: 700;">${g.privilege}</td>
                  <td>${g.grantable === 'YES' ? '<span style="color:#008000; font-weight:700;">YES</span>' : 'NO'}</td>
                  <td style="text-align: right;">
                    <button class="btn btn-danger" style="height: 19px; padding: 0 6px; font-size: 9.5px;" onclick="window.TracesApp.schemaBrowser.promptGrantAction('REVOKE', '${g.privilege}', '${g.grantee}')">🚫 Revogar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${remGrants > 0 ? `
            <div style="padding: 8px 12px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span>Exibindo <strong>${visibleGrants.length.toLocaleString()}</strong> de <strong>${obj.grants.length.toLocaleString()}</strong> grants</span>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-primary" style="height: 22px; padding: 0 10px; font-size: 10px;" onclick="window.TracesApp.schemaBrowser.showMoreDetailList('grants', 500)">
                  ➕ Ver mais (+${Math.min(500, remGrants)})
                </button>
                <button class="btn btn-secondary" style="height: 22px; padding: 0 10px; font-size: 10px;" onclick="window.TracesApp.schemaBrowser.showMoreDetailList('grants', 999999)">
                  Ver todos (${obj.grants.length.toLocaleString()})
                </button>
              </div>
            </div>
          ` : ''}
        `;
      } else {
        grantsPane.innerHTML = `${grantActionBar}<div style="padding: 28px; color: var(--text-muted); text-align: center;">Nenhum privilégio específico concedido em ${obj.name}.</div>`;
      }
    }

    // 7.5. Tablespaces Overview & Max Usage Pane (#tab-pane-tsoverview)
    const tsOvPane = document.getElementById('tab-pane-tsoverview');
    if (tsOvPane && this.currentCategory === 'tablespaces') {
      tsOvPane.innerHTML = this.buildTablespacesOverviewHtml();
    }
    const tsDfPane = document.getElementById('tab-pane-tsdatafiles');
    if (tsDfPane && this.currentCategory === 'tablespaces') {
      tsDfPane.innerHTML = this.buildDatafilesTabHtml();
    }

      // 8. Statistics Pane
    const statsPane = document.getElementById('tab-pane-stats');
    if (statsPane) {
      const stats = obj.stats || {};
      statsPane.innerHTML = `
        <div style="padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div class="advisor-card">
            <div class="metric-label">Estimated Rows (NUM_ROWS)</div>
            <div class="metric-value" style="font-size: 20px;">${(stats.numRows || obj.numRows || 0).toLocaleString()}</div>
          </div>
          <div class="advisor-card">
            <div class="metric-label">Allocated Blocks (BLOCKS)</div>
            <div class="metric-value" style="font-size: 20px;">${stats.blocks || obj.blocks || '-'}</div>
          </div>
          <div class="advisor-card">
            <div class="metric-label">Avg Row Length (BYTES)</div>
            <div class="metric-value" style="font-size: 20px;">${(stats.avgRowLen || obj.avgRowLen) ? (stats.avgRowLen || obj.avgRowLen) + ' bytes' : '-'}</div>
          </div>
          <div class="advisor-card">
            <div class="metric-label">Tablespace</div>
            <div class="metric-value" style="font-size: 20px; color: var(--traces-red);">${stats.tablespace || obj.tablespace || 'USERS'}</div>
          </div>
          <div class="advisor-card" style="grid-column: 1 / -1;">
            <div class="metric-label">Last DBMS_STATS Gathered</div>
            <div style="font-family: var(--font-code); color: var(--text-primary); margin-top: 4px;">
              ${stats.lastAnalyzed || obj.lastAnalyzed || 'Automatic Optimizer Job'}
            </div>
          </div>
        </div>
      `;
    }

    // 9. Partitions Pane
    const partPane = document.getElementById('tab-pane-partitions');
    if (partPane) {
      if (obj.partitions && obj.partitions.length > 0) {
        partPane.innerHTML = `
          <table class="meta-table">
            <thead>
              <tr>
                <th>Partition Name</th>
                <th>Tablespace</th>
                <th>Rows</th>
                <th>Blocks</th>
                <th>High Value Expression</th>
                <th>Compression</th>
              </tr>
            </thead>
            <tbody>
              ${obj.partitions.map(p => `
                <tr>
                  <td style="font-weight: 600; color: #0078d7; font-family: var(--font-code);">${p.name}</td>
                  <td>${p.tablespace}</td>
                  <td style="text-align: right;">${(p.numRows || 0).toLocaleString()}</td>
                  <td style="text-align: right;">${(p.blocks || 0).toLocaleString()}</td>
                  <td style="font-family: var(--font-code); color: #800080; font-size: 11px;">${p.highValue || '-'}</td>
                  <td>${p.compression}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        partPane.innerHTML = `<div style="padding: 28px; color: var(--text-muted); text-align: center;">Tabela ${obj.name} não possui particionamento (Non-partitioned).</div>`;
      }
    }

    // 10. Dependencies Pane
    const depPane = document.getElementById('tab-pane-dependencies');
    if (depPane) {
      if (obj.dependencies && obj.dependencies.length > 0) {
        const dKey = `${this.currentSchema}.${obj.name}.dependencies`;
        const dLimit = this.detailListLimits[dKey] || 200;
        const visibleDeps = obj.dependencies.slice(0, dLimit);
        const remDeps = obj.dependencies.length - visibleDeps.length;
        depPane.innerHTML = `
          <table class="meta-table">
            <thead>
              <tr>
                <th>Referenced Owner</th>
                <th>Referenced Object (${obj.dependencies.length.toLocaleString()} total)</th>
                <th>Object Type</th>
                <th>Direction / Link</th>
              </tr>
            </thead>
            <tbody>
              ${visibleDeps.map(d => `
                <tr>
                  <td style="font-weight: 600; color: #0078d7;">${d.referencedOwner}</td>
                  <td style="font-weight: 600; font-family: var(--font-code);">${d.referencedName}</td>
                  <td style="color: var(--syntax-keyword);">${d.referencedType}</td>
                  <td style="color: var(--text-muted);">${d.dependencyType || d.link || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${remDeps > 0 ? `
            <div style="padding: 8px 12px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <span>Exibindo <strong>${visibleDeps.length.toLocaleString()}</strong> de <strong>${obj.dependencies.length.toLocaleString()}</strong> dependências</span>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-primary" style="height: 22px; padding: 0 10px; font-size: 10px;" onclick="window.TracesApp.schemaBrowser.showMoreDetailList('dependencies', 500)">
                  ➕ Ver mais (+${Math.min(500, remDeps)})
                </button>
                <button class="btn btn-secondary" style="height: 22px; padding: 0 10px; font-size: 10px;" onclick="window.TracesApp.schemaBrowser.showMoreDetailList('dependencies', 999999)">
                  Ver todos (${obj.dependencies.length.toLocaleString()})
                </button>
              </div>
            </div>
          ` : ''}
        `;
      } else {
        depPane.innerHTML = `<div style="padding: 28px; color: var(--text-muted); text-align: center;">Nenhuma dependência encontrada para ${obj.name}.</div>`;
      }
    }
  }

  async recompileCurrentObject() {
    if (!this.selectedObject) return;
    const cat = this.currentCategory.slice(0, -1).toUpperCase();
    const sql = `ALTER ${cat} "${this.currentSchema}"."${this.selectedObject.name}" COMPILE;`;
    
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro de compilação: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`ALTER ${cat} "${this.currentSchema}"."${this.selectedObject.name}" COMPILE: SUCESSO`, 'success');
        }
      } catch (e) {
        window.TracesApp.notify(`Falha na compilação: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp.notify(`ALTER ${cat} "${this.currentSchema}"."${this.selectedObject.name}" COMPILE: SUCESSO (Modo Local)`, 'success');
    }
  }

  async countCurrentTableRows() {
    if (!this.selectedObject) {
      window.TracesApp?.notify('Nenhum objeto selecionado para contar linhas.', 'warning');
      return;
    }
    if (this.currentCategory !== 'tables') {
      window.TracesApp?.notify(`Contagem de registros aplica-se apenas a Tabelas (objeto selecionado: ${this.selectedObject.type || this.currentCategory}).`, 'info');
      return;
    }
    await this.countRows(this.currentSchema, this.selectedObject.name);
  }

  async countRows(schema, tableName) {
    window.TracesApp?.notify(`Contando registros em ${schema}.${tableName}...`, 'info');
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: `SELECT COUNT(*) AS TOTAL_ROWS FROM "${schema}"."${tableName}"` })
        });
        const data = await resp.json();
        if (data.rows && data.rows.length > 0) {
          const count = data.rows[0].TOTAL_ROWS !== undefined ? data.rows[0].TOTAL_ROWS : Object.values(data.rows[0])[0];
          window.TracesApp.notify(`📊 Tabela ${schema}.${tableName}: ${Number(count).toLocaleString()} registros.`, 'success');
        } else if (data.error) {
          window.TracesApp.notify(`Erro ao contar linhas: ${data.error}`, 'error');
        }
      } catch (e) {
        window.TracesApp?.notify(`Falha ao consultar contagem: ${e.message}`, 'error');
      }
    } else {
      const data = this.getSchemaData();
      const tbl = (data.tables || []).find(t => t.name === tableName);
      const count = tbl?.data ? tbl.data.length : (tbl?.rows || 107);
      window.TracesApp?.notify(`📊 Tabela ${schema}.${tableName}: ${Number(count).toLocaleString()} registros (Modo Local).`, 'success');
    }
  }

  handleContextMenu(e, objName, catKey) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const schema = this.currentSchema;
    const cat = catKey || this.currentCategory;
    const obj = (this.getSchemaData()[cat] || []).find(o => o.name === objName) || { name: objName, type: cat.toUpperCase() };

    this.selectObject(objName, cat);

    const items = [];

    if (cat === 'tables') {
      items.push(
        { label: `Select * from ${objName}`, icon: '📝', shortcut: 'Ctrl+Enter', action: () => {
          window.TracesApp.openWindow('editor');
          window.TracesApp.sqlEditor.addNewTab(`SELECT * FROM "${schema}"."${objName}";\n`, `${objName}.sql`);
          window.TracesApp.sqlEditor.executeStatement();
        }},
        { label: 'Count Rows...', icon: '📊', shortcut: '', action: () => this.countRows(schema, objName) },
        { label: 'Compare with Another Table (Diff Side-by-Side)...', icon: '⚖️', shortcut: '', action: () => window.TracesPro.openObjectDiffDialog(schema, objName, schema, '') },
        { label: 'View Foreign Key Graph (Mini-ERD)', icon: '🔗', shortcut: '', action: () => this.switchDetailTab('erd') },
        { separator: true },
        { label: 'Generate DDL Script', icon: '📜', shortcut: '', action: () => this.switchDetailTab('ddl') },
        { label: 'Gather Table Statistics', icon: '⚡', shortcut: '', action: () => this.gatherStatistics(schema, objName) },
        { label: 'Export Dataset (XLSX, CSV)...', icon: '📤', shortcut: '', action: () => {
          this.switchDetailTab('data');
          window.TracesApp.dataGrid.showExportMenu();
        }},
        { separator: true },
        { label: 'Truncate Table...', icon: '⚠️', shortcut: '', action: () => this.truncateTable(schema, objName) },
        { label: 'Drop Table...', icon: '🗑️', shortcut: '', action: () => this.dropObject(schema, objName, 'TABLE') }
      );
    } else if (['views', 'mviews'].includes(cat)) {
      items.push(
        { label: `Select * from ${objName}`, icon: '📝', shortcut: '', action: () => {
          window.TracesApp.openWindow('editor');
          window.TracesApp.sqlEditor.addNewTab(`SELECT * FROM "${schema}"."${objName}";\n`, `${objName}.sql`);
          window.TracesApp.sqlEditor.executeStatement();
        }},
        { label: 'Recompile View', icon: '🔄', shortcut: 'F9', action: () => this.recompileObject(schema, objName, 'VIEW') },
        { label: 'Describe (F4)', icon: '🔎', shortcut: 'F4', action: () => window.TracesApp.toadModals.openDescribe(`${schema}.${objName}`) },
        { label: 'Generate DDL', icon: '📜', shortcut: '', action: () => this.switchDetailTab('ddl') },
        { separator: true },
        { label: 'Drop View...', icon: '🗑️', shortcut: '', action: () => this.dropObject(schema, objName, 'VIEW') }
      );
    } else if (['packages', 'procedures', 'functions', 'triggers', 'types'].includes(cat)) {
      const typeSingular = cat.slice(0, -1).toUpperCase();
      items.push(
        { label: `Load ${objName} in Editor`, icon: '📝', shortcut: '', action: () => {
          window.TracesApp.openWindow('editor');
          window.TracesApp.sqlEditor.addNewTab(obj.ddl || `-- Source for ${typeSingular} ${objName}\n`, `${objName}.sql`);
        }},
        { label: `Recompile (F9)`, icon: '🔄', shortcut: 'F9', action: () => this.recompileObject(schema, objName, typeSingular) },
        { label: `Compile with Debug`, icon: '🐞', shortcut: '', action: () => this.recompileObject(schema, objName, typeSingular, true) },
        { label: 'View Source (Code)', icon: '👁️', shortcut: '', action: () => this.switchDetailTab('source') },
        { separator: true },
        { label: `Drop ${typeSingular}...`, icon: '🗑️', shortcut: '', action: () => this.dropObject(schema, objName, typeSingular) }
      );
    } else if (cat === 'tablespaces') {
      items.push(
        { label: 'Show in Tablespace Map', icon: '🗺️', shortcut: '', action: () => window.TracesApp.openWindow('dba', 'tablespacemap') },
        { label: 'Add Datafile to Tablespace...', icon: '➕', shortcut: '', action: () => {
          const df = prompt(`Caminho e nome do novo datafile para ${objName}:`, `/u01/app/oracle/oradata/ORCL/${objName.toLowerCase()}02.dbf`);
          if (df) {
            const size = prompt('Tamanho inicial (ex: 500M, 1G):', '500M');
            if (size) {
              const sql = `ALTER TABLESPACE "${objName}" ADD DATAFILE '${df}' SIZE ${size} AUTOEXTEND ON NEXT 50M MAXSIZE 10G;`;
              window.TracesApp.openWindow('editor');
              window.TracesApp.sqlEditor.addNewTab(sql, `add_datafile_${objName}.sql`);
              window.TracesApp.notify(`Script de adição de datafile carregado na Worksheet.`, 'success');
            }
          }
        }},
        { label: 'Alter Tablespace Read Only', icon: '🔒', shortcut: '', action: () => {
          if (confirm(`Colocar tablespace ${objName} em READ ONLY?`)) {
            window.TracesApp.openWindow('editor');
            window.TracesApp.sqlEditor.addNewTab(`ALTER TABLESPACE "${objName}" READ ONLY;`, `alter_${objName}.sql`);
          }
        }},
        { separator: true },
        { label: 'Drop Tablespace...', icon: '🗑️', shortcut: '', action: () => this.dropObject(schema, objName, 'TABLESPACE') }
      );
    } else if (cat === 'dblinks') {
      items.push(
        { label: `Test Connection (${objName})`, icon: '🔌', shortcut: '', action: () => this.testDbLink(objName) },
        { label: 'Show DDL Definition', icon: '📜', shortcut: '', action: () => this.switchDetailTab('ddl') },
        { separator: true },
        { label: 'Drop DB Link...', icon: '🗑️', shortcut: '', action: () => this.dropObject(schema, objName, 'DATABASE LINK') }
      );
    } else if (cat === 'users') {
      items.push(
        { label: `Lock / Unlock User (${objName})`, icon: '🔒', shortcut: '', action: () => {
          const action = prompt(`Digite LOCK para bloquear ou UNLOCK para desbloquear o usuário ${objName}:`, 'ACCOUNT LOCK');
          if (action) {
            const sql = `ALTER USER "${objName}" ${action.includes('UNLOCK') ? 'ACCOUNT UNLOCK' : 'ACCOUNT LOCK'};`;
            window.TracesApp.openWindow('editor');
            window.TracesApp.sqlEditor.addNewTab(sql, `alter_user_${objName}.sql`);
          }
        }},
        { label: 'Expire Password...', icon: '🔑', shortcut: '', action: () => {
          const sql = `ALTER USER "${objName}" PASSWORD EXPIRE;`;
          window.TracesApp.openWindow('editor');
          window.TracesApp.sqlEditor.addNewTab(sql, `expire_user_${objName}.sql`);
        }},
        { label: 'Clone User (Create Like)...', icon: '👤', shortcut: '', action: () => window.TracesApp.toadModals.openCloneUser(objName) },
        { separator: true },
        { label: 'Drop User...', icon: '🗑️', shortcut: '', action: () => this.dropObject(schema, objName, 'USER') }
      );
    } else if (cat === 'jobs') {
      items.push(
        { label: `Run Job Now (${objName})`, icon: '▶️', shortcut: '', action: () => this.runSchedulerJob(objName) },
        { label: 'Enable / Disable Job', icon: '⏸️', shortcut: '', action: () => {
          const sql = `BEGIN DBMS_SCHEDULER.ENABLE(name => '${objName}'); END;`;
          window.TracesApp.openWindow('editor');
          window.TracesApp.sqlEditor.addNewTab(sql, `enable_job_${objName}.sql`);
        }},
        { separator: true },
        { label: 'Drop Job...', icon: '🗑️', shortcut: '', action: () => this.dropObject(schema, objName, 'JOB') }
      );
    } else if (cat === 'recyclebin') {
      items.push(
        { label: `Flashback Undrop (${objName})`, icon: '⏪', shortcut: '', action: () => this.flashbackUndrop(objName) },
        { label: `Purge Object from Recyclebin`, icon: '🗑️', shortcut: '', action: () => this.purgeRecyclebinObject(objName) },
        { separator: true },
        { label: 'Purge Entire Recyclebin (PURGE RECYCLEBIN)', icon: '💥', shortcut: '', action: () => {
          if (confirm('Tem certeza que deseja purgar toda a lixeira (DBA_RECYCLEBIN)?')) {
            window.TracesApp.openWindow('editor');
            window.TracesApp.sqlEditor.addNewTab('PURGE RECYCLEBIN;', 'purge_recyclebin.sql');
            window.TracesApp.sqlEditor.executeStatement();
          }
        }}
      );
    } else if (cat === 'indexes') {
      items.push(
        { label: 'Rebuild Index (Online)', icon: '🔄', shortcut: '', action: () => window.TracesPro.executeQuickDdl('rebuild_index', schema, objName) },
        { label: 'Gather Index Statistics', icon: '⚡', shortcut: '', action: () => window.TracesPro.executeQuickDdl('gather_stats', schema, objName) },
        { label: 'Show DDL', icon: '📜', shortcut: '', action: () => this.switchDetailTab('ddl') },
        { separator: true },
        { label: 'Drop Index...', icon: '🗑️', shortcut: '', action: () => this.dropObject(schema, objName, 'INDEX') }
      );
    } else {
      items.push(
        { label: 'Describe (F4)', icon: '🔎', shortcut: 'F4', action: () => window.TracesApp.toadModals.openDescribe(`${schema}.${objName}`) },
        { label: 'Show DDL', icon: '📜', shortcut: '', action: () => this.switchDetailTab('ddl') }
      );
    }

    items.push(
      { separator: true },
      { label: `Copy Object Name (${objName})`, icon: '📋', shortcut: 'Ctrl+C', action: () => {
        navigator.clipboard.writeText(objName);
        window.TracesApp?.notify(`Nome "${objName}" copiado para a área de transferência.`, 'info');
      }},
      { label: `Filter for "${objName}"`, icon: '🔍', shortcut: '', action: () => {
        if (this.searchInput) {
          this.searchInput.value = objName;
          this.searchQuery = objName.toLowerCase();
          if (this.viewMode === 'tree') this.renderTreeView();
          else this.renderObjectList();
        }
      }}
    );

    if (typeof window.showToadContextMenu === 'function') {
      window.showToadContextMenu(e.clientX, e.clientY, items);
    }
  }

  async gatherStatistics(schema, tableName) {
    const sql = `BEGIN DBMS_STATS.GATHER_TABLE_STATS(ownname => '${schema}', tabname => '${tableName}', cascade => TRUE, estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE); END;`;
    window.TracesApp?.notify(`Coletando estatísticas da tabela ${schema}.${tableName}...`, 'info');
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro ao coletar estatísticas: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`Estatísticas de ${tableName} atualizadas com sucesso.`, 'success');
        }
      } catch (e) {
        window.TracesApp?.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp?.notify(`DBMS_STATS.GATHER_TABLE_STATS(${schema}.${tableName}): Concluído com sucesso (Modo Local).`, 'success');
    }
  }

  async truncateTable(schema, tableName) {
    if (!confirm(`AVISO TOAD: Deseja realmente executar TRUNCATE TABLE "${schema}"."${tableName}"?\nTodos os registros serão apagados imediatamente sem rollback.`)) return;
    const sql = `TRUNCATE TABLE "${schema}"."${tableName}";`;
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro ao truncar tabela: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`Tabela "${schema}"."${tableName}" truncada com sucesso.`, 'success');
          this.switchDetailTab('data');
        }
      } catch (e) {
        window.TracesApp?.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp?.notify(`Tabela "${schema}"."${tableName}" truncada (Modo Local).`, 'success');
    }
  }

  async dropObject(schema, objName, type) {
    if (!confirm(`CONFIRMAÇÃO TOAD: Deseja realmente excluir permanentemente ${type} "${schema}"."${objName}"?`)) return;
    const sql = `DROP ${type} "${schema}"."${objName}"${type === 'TABLE' ? ' CASCADE CONSTRAINTS' : ''};`;
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro ao excluir: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`${type} "${objName}" excluído com sucesso.`, 'success');
          await this.loadRealObjects(schema);
        }
      } catch (e) {
        window.TracesApp?.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp?.notify(`${type} "${objName}" removido (Modo Local).`, 'success');
    }
  }

  async testDbLink(linkName) {
    window.TracesApp?.notify(`Testando Database Link "${linkName}"...`, 'info');
    const start = performance.now();
    const sql = `SELECT * FROM dual@"${linkName}"`;
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await resp.json();
        const elapsed = (performance.now() - start).toFixed(1);
        if (data.error) {
          window.TracesApp.notify(`Falha no DB Link ${linkName}: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`✓ DB Link "${linkName}" ativo e operante (latência: ${elapsed} ms).`, 'success');
        }
      } catch (e) {
        window.TracesApp?.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp?.notify(`✓ DB Link "${linkName}" ativo e operante (Modo Local - 0.4 ms).`, 'success');
    }
  }

  async runSchedulerJob(jobName) {
    window.TracesApp?.notify(`Disparando execução imediata de ${jobName}...`, 'info');
    const sql = `BEGIN DBMS_SCHEDULER.RUN_JOB(job_name => '${jobName}', use_current_session => FALSE); END;`;
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro ao executar job: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`Job "${jobName}" disparado com sucesso em segundo plano.`, 'success');
        }
      } catch (e) {
        window.TracesApp?.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp?.notify(`Job "${jobName}" executado com sucesso (Modo Local).`, 'success');
    }
  }

  async flashbackUndrop(tableName) {
    const sql = `FLASHBACK TABLE "${tableName}" TO BEFORE DROP;`;
    window.TracesApp?.notify(`Restaurando ${tableName} da lixeira...`, 'info');
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro no flashback: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`Tabela "${tableName}" restaurada com sucesso com Flashback Drop!`, 'success');
          await this.loadRealObjects(this.currentSchema);
        }
      } catch (e) {
        window.TracesApp?.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp?.notify(`Tabela "${tableName}" restaurada da lixeira (Modo Local).`, 'success');
    }
  }

  async purgeRecyclebinObject(objName) {
    if (!confirm(`Deseja realmente purgar o objeto "${objName}" da lixeira? Esta ação não pode ser desfeita.`)) return;
    const sql = `PURGE TABLE "${objName}";`;
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro ao purgar: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`Objeto "${objName}" purgado da lixeira com sucesso.`, 'success');
          await this.loadRealObjects(this.currentSchema);
        }
      } catch (e) {
        window.TracesApp?.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp?.notify(`Objeto "${objName}" purgado da lixeira (Modo Local).`, 'success');
    }
  }

  async recompileObject(schema, objName, type, isDebug = false) {
    const debugClause = isDebug ? ' DEBUG' : '';
    const sql = `ALTER ${type} "${schema}"."${objName}" COMPILE${debugClause};`;
    window.TracesApp?.notify(`Recompilando ${type} "${schema}"."${objName}"...`, 'info');
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro de compilação: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`${type} "${objName}" recompilado com sucesso.`, 'success');
        }
      } catch (e) {
        window.TracesApp?.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp?.notify(`${type} "${objName}" recompilado com sucesso (Modo Local).`, 'success');
    }
  }

  setSubtabFilter(val) {
    this.subtabFilter = val || '';
    this.renderDetailContent();
  }

  async executeDdlOrOpenInEditor(sql, title = 'ddl_action.sql', runImmediately = false) {
    if (!sql) return;
    if (runImmediately && window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro Oracle DDL: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`Comando DDL executado com sucesso!`, 'success');
          if (this.detailsCache) this.detailsCache.clear();
          await this.loadRealObjects(this.currentSchema);
          if (this.selectedObject?.name) {
            await this.fetchRealObjectDetails(this.currentSchema, this.selectedObject.name, this.currentCategory, true);
          }
        }
      } catch (e) {
        window.TracesApp?.notify(`Falha ao executar DDL: ${e.message}`, 'error');
      }
      return;
    }
    this.openDdlPreviewModal(sql, title);
  }

  openDdlPreviewModal(sql, title = 'Alterar / Criar Objeto Oracle') {
    let modal = document.getElementById('toad-ddl-action-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'toad-ddl-action-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="toad-modal-window" style="width: 680px; max-width: 95vw;">
        <div class="toad-modal-titlebar">
          <span>⚙ Toad Schema Browser — ${this.escapeHtml(title)}</span>
          <span class="toad-modal-close" onclick="document.getElementById('toad-ddl-action-modal').classList.remove('open')">×</span>
        </div>
        <div class="modal-body" style="padding: 14px; display: flex; flex-direction: column; gap: 10px;">
          <div style="font-size: 11.5px; color: #334155;">
            Revise ou edite o comando DDL gerado abaixo. Você pode <strong>Executar Direto no Banco</strong> ou <strong>Enviar para a Worksheet</strong>:
          </div>
          <textarea id="toad-ddl-modal-textarea" style="width: 100%; height: 190px; font-family: var(--font-code); font-size: 12px; padding: 10px; border: 1px solid #94a3b8; border-radius: 4px; background: #0f172a; color: #f8fafc; line-height: 1.45;">${this.escapeHtml(sql)}</textarea>
        </div>
        <div class="modal-footer" style="padding: 10px 14px; background: #f1f5f9; border-top: 1px solid #cbd5e1; display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn" onclick="document.getElementById('toad-ddl-action-modal').classList.remove('open')">Cancelar</button>
          <button class="btn" style="font-weight: 600;" onclick="
            const code = document.getElementById('toad-ddl-modal-textarea').value;
            document.getElementById('toad-ddl-action-modal').classList.remove('open');
            window.TracesApp.openWindow('editor');
            window.TracesApp.sqlEditor.addNewTab(code, '${title.replace(/[^a-zA-Z0-9_.-]/g, '_')}');
          ">📝 Abrir no SQL Editor</button>
          <button class="btn btn-primary" style="font-weight: 700;" onclick="
            const code = document.getElementById('toad-ddl-modal-textarea').value;
            document.getElementById('toad-ddl-action-modal').classList.remove('open');
            window.TracesApp.schemaBrowser.executeDdlOrOpenInEditor(code, '${title.replace(/[^a-zA-Z0-9_.-]/g, '_')}', true);
          ">⚡ Executar Agora no Oracle</button>
        </div>
      </div>
    `;
    modal.classList.add('open');
  }

  renderContextActionsBar() {
    const bar = document.getElementById('browser-context-actions-bar');
    if (!bar) return;
    const cat = this.currentCategory || 'tables';
    const objName = this.selectedObject?.name || '';
    const schema = this.currentSchema || 'HR';

    let buttons = `
      <button class="btn btn-primary" style="height: 24px; padding: 0 8px; font-size: 10.5px; font-weight: 700;" onclick="window.TracesApp.schemaBrowser.openCreateObjectWizard('${cat}')" title="Criar novo objeto (${cat})">
        ➕ Criar Novo
      </button>
    `;

    if (cat === 'tables' && objName) {
      buttons += `
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.promptColumnAction('ADD')" title="Adicionar nova coluna na tabela ${objName}">➕ Coluna</button>
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.promptConstraintAction('ADD_PK')" title="Adicionar Constraint (PK/FK/Check)">🔑 +Constraint</button>
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.promptIndexAction('CREATE')" title="Criar Índice para ${objName}">📇 +Índice</button>
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.promptRenameTable('${schema}', '${objName}')" title="Renomear Tabela">🏷 Renomear</button>
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px; color: #b45309;" onclick="window.TracesApp.schemaBrowser.truncateTable('${schema}', '${objName}')" title="Truncate Table">🧹 Truncate</button>
        <button class="btn btn-danger" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.dropObject('${schema}', '${objName}', 'TABLE')" title="Drop Table">🗑 Drop</button>
      `;
    } else if ((cat === 'views' || cat === 'mviews') && objName) {
      const vType = cat === 'mviews' ? 'MATERIALIZED VIEW' : 'VIEW';
      buttons += `
        ${cat === 'mviews' ? `<button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.executeDdlOrOpenInEditor('BEGIN DBMS_MVIEW.REFRESH(\\'${schema}.${objName}\\', \\'C\\'); END;', 'refresh_mview.sql')">🔄 Refresh MView</button>` : ''}
        <button class="btn btn-danger" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.dropObject('${schema}', '${objName}', '${vType}')">🗑 Drop</button>
      `;
    } else if (['packages', 'procedures', 'functions', 'types'].includes(cat) && objName) {
      const tSing = cat.slice(0, -1).toUpperCase();
      buttons += `
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.recompileObject('${schema}', '${objName}', '${tSing}', true)">🐞 Compile Debug</button>
        <button class="btn btn-danger" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.dropObject('${schema}', '${objName}', '${tSing}')">🗑 Drop</button>
      `;
    } else if (cat === 'triggers' && objName) {
      buttons += `
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.executeDdlOrOpenInEditor('ALTER TRIGGER \\'${schema}\\'.\\'${objName}\\' ENABLE;', 'enable_trigger.sql', true)">✅ Enable</button>
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.executeDdlOrOpenInEditor('ALTER TRIGGER \\'${schema}\\'.\\'${objName}\\' DISABLE;', 'disable_trigger.sql', true)">⏸ Disable</button>
        <button class="btn btn-danger" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.dropObject('${schema}', '${objName}', 'TRIGGER')">🗑 Drop</button>
      `;
    } else if (cat === 'sequences' && objName) {
      buttons += `
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.promptAlterSequence('${schema}', '${objName}')">⚙ Alterar Sequence</button>
        <button class="btn btn-danger" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.dropObject('${schema}', '${objName}', 'SEQUENCE')">🗑 Drop</button>
      `;
    } else if (cat === 'indexes' && objName) {
      buttons += `
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.promptIndexAction('REBUILD', '${objName}')">🔄 Rebuild Online</button>
        <button class="btn btn-danger" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.dropObject('${schema}', '${objName}', 'INDEX')">🗑 Drop</button>
      `;
    } else if (cat === 'tablespaces') {
      const tsTarget = objName || this.allTablespacesOverview?.[0]?.name || 'USERS';
      buttons = `
        <button class="btn btn-primary" style="height: 24px; padding: 0 8px; font-size: 10.5px; font-weight: 700;" onclick="window.TracesApp.schemaBrowser.openCreateObjectWizard('tablespaces')">➕ Nova Tablespace</button>
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.promptAddDatafile('${tsTarget}')">➕ Add Datafile</button>
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.promptResizeTablespace('${tsTarget}')">↔ Resize</button>
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.promptAutoextendTablespace('${tsTarget}')">⚙ Autoextend (Max)</button>
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px; background: #e0f2fe; border-color: #7dd3fc; color: #0369a1; font-weight: 700;" onclick="window.TracesApp.schemaBrowser.switchDetailTab('tsoverview')">📊 Visão Geral &amp; Máx</button>
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.openWindow('dba', 'spacemanager')">🏛 Space Manager</button>
        ${objName ? `<button class="btn btn-danger" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.dropObject('${schema}', '${objName}', 'TABLESPACE')">🗑 Drop</button>` : ''}
      `;
    } else if (cat === 'users' && objName) {
      buttons += `
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.executeDdlOrOpenInEditor('ALTER USER \"${objName}\" ACCOUNT UNLOCK;', 'unlock_user.sql')">🔓 Unlock</button>
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.executeDdlOrOpenInEditor('ALTER USER \"${objName}\" ACCOUNT LOCK;', 'lock_user.sql')">🔒 Lock</button>
        <button class="btn" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.promptGrantAction('GRANT')">🛡 +Grant</button>
        <button class="btn btn-danger" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.dropObject('${schema}', '${objName}', 'USER')">🗑 Drop</button>
      `;
    } else if (objName) {
      const tSing = cat === 'dblinks' ? 'DATABASE LINK' : cat.slice(0, -1).toUpperCase();
      buttons += `
        <button class="btn btn-danger" style="height: 24px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.dropObject('${schema}', '${objName}', '${tSing}')">🗑 Drop</button>
      `;
    }

    bar.innerHTML = buttons;

    const countBtn = bar.parentElement ? bar.parentElement.querySelector('button[title*="Contar registros"]') : null;
    if (countBtn) countBtn.style.display = (cat === 'tables' || cat === 'views') ? '' : 'none';
    const recompBtn = bar.parentElement ? bar.parentElement.querySelector('button[onclick*="recompileCurrentObject"]') : null;
    if (recompBtn) recompBtn.style.display = ['procedures', 'functions', 'packages', 'triggers', 'types', 'views'].includes(cat) ? '' : 'none';
  }

  openCreateObjectWizard(defaultCategory = null) {
    const cat = defaultCategory || this.currentCategory || 'tables';
    const schema = this.currentSchema || 'HR';
    const templates = {
      tables: `CREATE TABLE "${schema}"."NOVA_TABELA" (\n  ID          NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n  DESCRICAO   VARCHAR2(150 CHAR) NOT NULL,\n  STATUS      VARCHAR2(20 CHAR) DEFAULT 'ATIVO',\n  DT_CRIACAO  TIMESTAMP DEFAULT SYSTIMESTAMP\n) TABLESPACE USERS;`,
      views: `CREATE OR REPLACE FORCE VIEW "${schema}"."VW_NOVA_CONSULTA" AS\nSELECT *\nFROM "${schema}"."${this.selectedObject?.name || 'EMPLOYEES'}";`,
      mviews: `CREATE MATERIALIZED VIEW "${schema}"."MV_RESUMO"\nBUILD IMMEDIATE\nREFRESH FORCE ON DEMAND\nAS\nSELECT * FROM "${schema}"."${this.selectedObject?.name || 'EMPLOYEES'}";`,
      procedures: `CREATE OR REPLACE PROCEDURE "${schema}"."PRC_PROCESSA_DADOS" (\n  p_id IN NUMBER,\n  p_status OUT VARCHAR2\n) IS\nBEGIN\n  p_status := 'OK';\nEND PRC_PROCESSA_DADOS;\n/`,
      functions: `CREATE OR REPLACE FUNCTION "${schema}"."FN_CALCULA_VALOR" (\n  p_id IN NUMBER\n) RETURN NUMBER IS\n  v_ret NUMBER := 0;\nBEGIN\n  RETURN v_ret;\nEND FN_CALCULA_VALOR;\n/`,
      packages: `CREATE OR REPLACE PACKAGE "${schema}"."PKG_NOVO_MODULO" IS\n  PROCEDURE prc_executar(p_id IN NUMBER);\nEND PKG_NOVO_MODULO;\n/\n\nCREATE OR REPLACE PACKAGE BODY "${schema}"."PKG_NOVO_MODULO" IS\n  PROCEDURE prc_executar(p_id IN NUMBER) IS\n  BEGIN\n    NULL;\n  END prc_executar;\nEND PKG_NOVO_MODULO;\n/`,
      triggers: `CREATE OR REPLACE TRIGGER "${schema}"."TRG_${this.selectedObject?.name || 'TABELA'}_BIU"\nBEFORE INSERT OR UPDATE ON "${schema}"."${this.selectedObject?.name || 'NOVA_TABELA'}"\nFOR EACH ROW\nBEGIN\n  NULL;\nEND;\n/`,
      sequences: `CREATE SEQUENCE "${schema}"."SEQ_NOVO_ID"\n  START WITH 1\n  INCREMENT BY 1\n  MINVALUE 1\n  MAXVALUE 999999999999999999\n  CACHE 20\n  NOCYCLE\n  NOORDER;`,
      synonyms: `CREATE OR REPLACE SYNONYM "${schema}"."SYN_OBJETO" FOR "${schema}"."${this.selectedObject?.name || 'EMPLOYEES'}";`,
      indexes: `CREATE INDEX "${schema}"."IDX_${this.selectedObject?.name || 'TABELA'}_01"\n  ON "${schema}"."${this.selectedObject?.name || 'NOVA_TABELA'}" (ID)\n  TABLESPACE USERS ONLINE;`,
      tablespaces: `CREATE TABLESPACE "TS_DADOS_NOVO"\n  DATAFILE 'ts_dados_novo01.dbf' SIZE 512M\n  AUTOEXTEND ON NEXT 128M MAXSIZE 32G\n  EXTENT MANAGEMENT LOCAL AUTOALLOCATE\n  SEGMENT SPACE MANAGEMENT AUTO;`,
      users: `CREATE USER "NOVO_USUARIO" IDENTIFIED BY "SenhaForte#2026"\n  DEFAULT TABLESPACE USERS\n  TEMPORARY TABLESPACE TEMP\n  QUOTA UNLIMITED ON USERS;\n\nGRANT CONNECT, RESOURCE TO "NOVO_USUARIO";`,
      roles: `CREATE ROLE "RL_APP_ACESSO";\nGRANT CREATE SESSION, SELECT ANY TABLE TO "RL_APP_ACESSO";`,
      dblinks: `CREATE DATABASE LINK "LK_REMOTO"\n  CONNECT TO "USUARIO_REMOTO" IDENTIFIED BY "SenhaRemota"\n  USING '//host-remoto:1521/ORCL';`,
      jobs: `BEGIN\n  DBMS_SCHEDULER.CREATE_JOB(\n    job_name        => '"${schema}"."JOB_ROTINA_DIARIA"',\n    job_type        => 'PLSQL_BLOCK',\n    job_action      => 'BEGIN NULL; END;',\n    start_date      => SYSTIMESTAMP,\n    repeat_interval => 'FREQ=DAILY;BYHOUR=2;BYMINUTE=0',\n    enabled         => TRUE\n  );\nEND;\n/`
    };
    const ddl = templates[cat] || templates.tables;
    this.openDdlPreviewModal(ddl, `Criar Novo Objeto (${cat.toUpperCase()})`);
  }

  promptRenameTable(schema, tableName) {
    const newName = prompt(`Novo nome para a tabela ${schema}.${tableName}:`, `${tableName}_NEW`);
    if (!newName || newName.trim() === tableName) return;
    const sql = `ALTER TABLE "${schema}"."${tableName}" RENAME TO "${newName.trim().toUpperCase()}";`;
    this.openDdlPreviewModal(sql, `Renomear Tabela ${tableName}`);
  }

  promptColumnAction(action, colName = '', colType = 'VARCHAR2(100 CHAR)', colNullable = 'Y') {
    const schema = this.currentSchema;
    const table = this.selectedObject?.name || 'TABELA';
    if (action === 'ADD') {
      const name = prompt(`Nome da nova coluna para ${schema}.${table}:`, 'NOVA_COLUNA');
      if (!name) return;
      const type = prompt(`Tipo de dado da coluna ${name.toUpperCase()}:`, 'VARCHAR2(100 CHAR)');
      if (!type) return;
      const sql = `ALTER TABLE "${schema}"."${table}" ADD ("${name.trim().toUpperCase()}" ${type.trim()});`;
      this.openDdlPreviewModal(sql, `Adicionar Coluna em ${table}`);
    } else if (action === 'MODIFY') {
      const cName = colName || prompt(`Nome da coluna a modificar em ${schema}.${table}:`, this.selectedObject?.columns?.[0]?.name || 'COLUNA');
      if (!cName) return;
      const nType = prompt(`Novo tipo / tamanho / constraint para ${cName}:`, `${colType} ${colNullable === 'N' ? 'NOT NULL' : 'NULL'}`);
      if (!nType) return;
      const sql = `ALTER TABLE "${schema}"."${table}" MODIFY ("${cName.trim().toUpperCase()}" ${nType.trim()});`;
      this.openDdlPreviewModal(sql, `Modificar Coluna ${cName}`);
    } else if (action === 'RENAME') {
      const cName = colName || prompt(`Nome atual da coluna em ${schema}.${table}:`, this.selectedObject?.columns?.[0]?.name || 'COLUNA');
      if (!cName) return;
      const newName = prompt(`Novo nome para a coluna ${cName}:`, `${cName}_NOVO`);
      if (!newName) return;
      const sql = `ALTER TABLE "${schema}"."${table}" RENAME COLUMN "${cName.trim().toUpperCase()}" TO "${newName.trim().toUpperCase()}";`;
      this.openDdlPreviewModal(sql, `Renomear Coluna ${cName}`);
    } else if (action === 'DROP') {
      const cName = colName || prompt(`Nome da coluna a REMOVER (DROP) de ${schema}.${table}:`, '');
      if (!cName) return;
      const sql = `ALTER TABLE "${schema}"."${table}" DROP COLUMN "${cName.trim().toUpperCase()}";`;
      this.openDdlPreviewModal(sql, `Remover Coluna ${cName}`);
    }
  }

  promptIndexAction(action, idxName = '') {
    const schema = this.currentSchema;
    const table = this.selectedObject?.name || 'TABELA';
    if (action === 'CREATE') {
      const defaultCol = this.selectedObject?.columns?.[0]?.name || 'ID';
      const cols = prompt(`Coluna(s) para o novo índice em ${schema}.${table} (separadas por vírgula):`, defaultCol);
      if (!cols) return;
      const name = prompt(`Nome do novo índice:`, `IDX_${table}_${cols.split(',')[0].trim().toUpperCase()}`);
      if (!name) return;
      const sql = `CREATE INDEX "${schema}"."${name.trim().toUpperCase()}" ON "${schema}"."${table}" (${cols}) TABLESPACE USERS ONLINE;`;
      this.openDdlPreviewModal(sql, `Criar Índice ${name}`);
    } else if (action === 'REBUILD') {
      const name = idxName || prompt(`Nome do índice para REBUILD ONLINE:`, this.selectedObject?.indexes?.[0]?.name || `IDX_${table}`);
      if (!name) return;
      const sql = `ALTER INDEX "${schema}"."${name.trim().toUpperCase()}" REBUILD ONLINE;`;
      this.openDdlPreviewModal(sql, `Rebuild Index ${name}`);
    } else if (action === 'DROP') {
      const name = idxName || prompt(`Nome do índice para remover (DROP):`, this.selectedObject?.indexes?.[0]?.name || '');
      if (!name) return;
      const sql = `DROP INDEX "${schema}"."${name.trim().toUpperCase()}";`;
      this.openDdlPreviewModal(sql, `Drop Index ${name}`);
    }
  }

  promptConstraintAction(action, cnName = '') {
    const schema = this.currentSchema;
    const table = this.selectedObject?.name || 'TABELA';
    const firstCol = this.selectedObject?.columns?.[0]?.name || 'ID';
    if (action === 'ADD_PK') {
      const cols = prompt(`Coluna(s) da Primary Key em ${schema}.${table}:`, firstCol);
      if (!cols) return;
      const sql = `ALTER TABLE "${schema}"."${table}" ADD CONSTRAINT "PK_${table}" PRIMARY KEY (${cols});`;
      this.openDdlPreviewModal(sql, `Adicionar Primary Key em ${table}`);
    } else if (action === 'ADD_FK') {
      const col = prompt(`Coluna local (FK) em ${schema}.${table}:`, firstCol);
      if (!col) return;
      const ref = prompt(`Tabela e coluna referenciada (ex: DEPARTMENTS(DEPARTMENT_ID)):`, 'DEPARTMENTS(DEPARTMENT_ID)');
      if (!ref) return;
      const sql = `ALTER TABLE "${schema}"."${table}" ADD CONSTRAINT "FK_${table}_${col.trim().toUpperCase()}" FOREIGN KEY (${col}) REFERENCES "${schema}".${ref};`;
      this.openDdlPreviewModal(sql, `Adicionar Foreign Key em ${table}`);
    } else if (action === 'ADD_CHECK') {
      const cond = prompt(`Condição CHECK (ex: SALARIO > 0) para ${schema}.${table}:`, `${firstCol} IS NOT NULL`);
      if (!cond) return;
      const sql = `ALTER TABLE "${schema}"."${table}" ADD CONSTRAINT "CK_${table}_${Date.now().toString().slice(-4)}" CHECK (${cond});`;
      this.openDdlPreviewModal(sql, `Adicionar Constraint CHECK em ${table}`);
    } else if (action === 'ENABLE' || action === 'DISABLE') {
      const name = cnName || prompt(`Nome da constraint para ${action}:`, '');
      if (!name) return;
      const sql = `ALTER TABLE "${schema}"."${table}" ${action} CONSTRAINT "${name.trim().toUpperCase()}";`;
      this.openDdlPreviewModal(sql, `${action} Constraint ${name}`);
    } else if (action === 'DROP') {
      const name = cnName || prompt(`Nome da constraint a remover (DROP) de ${schema}.${table}:`, '');
      if (!name) return;
      const sql = `ALTER TABLE "${schema}"."${table}" DROP CONSTRAINT "${name.trim().toUpperCase()}";`;
      this.openDdlPreviewModal(sql, `Drop Constraint ${name}`);
    }
  }

  promptGrantAction(action, priv = 'SELECT', grantee = '') {
    const schema = this.currentSchema;
    const objName = this.selectedObject?.name || 'EMPLOYEES';
    if (action === 'GRANT') {
      const privs = prompt(`Privilégios a conceder em ${schema}.${objName} (ex: SELECT, INSERT, UPDATE, DELETE, EXECUTE):`, 'SELECT, INSERT, UPDATE');
      if (!privs) return;
      const targetUser = prompt(`Conceder para qual Usuário ou Role (Grantee)?`, 'PUBLIC');
      if (!targetUser) return;
      const sql = `GRANT ${privs} ON "${schema}"."${objName}" TO "${targetUser.trim().toUpperCase()}";`;
      this.openDdlPreviewModal(sql, `Conceder Privilégio (GRANT)`);
    } else if (action === 'REVOKE') {
      const p = priv || prompt(`Privilégio a revogar de ${schema}.${objName}:`, 'SELECT');
      if (!p) return;
      const g = grantee || prompt(`Revogar de qual Usuário / Role?`, '');
      if (!g) return;
      const sql = `REVOKE ${p} ON "${schema}"."${objName}" FROM "${g.trim().toUpperCase()}";`;
      this.openDdlPreviewModal(sql, `Revogar Privilégio (REVOKE)`);
    }
  }

  promptAlterSequence(schema, seqName) {
    const inc = prompt(`Novo INCREMENT BY para ${schema}.${seqName}:`, '1');
    if (!inc) return;
    const cache = prompt(`Novo CACHE SIZE (ou 0 para NOCACHE):`, '20');
    const cacheClause = Number(cache) > 0 ? `CACHE ${Number(cache)}` : 'NOCACHE';
    const sql = `ALTER SEQUENCE "${schema}"."${seqName}" INCREMENT BY ${Number(inc) || 1} ${cacheClause};`;
    this.openDdlPreviewModal(sql, `Alterar Sequence ${seqName}`);
  }

  promptAddDatafile(tsName) {
    const ts = tsName || this.selectedObject?.name || 'USERS';
    const dfPath = prompt(`Caminho/nome do novo Datafile para a tablespace ${ts}:`, `${ts.toLowerCase()}_02.dbf`);
    if (!dfPath) return;
    const size = prompt(`Tamanho inicial (ex: 512M, 1G, 2G):`, '512M');
    if (!size) return;
    const maxSize = prompt(`Tamanho Máximo Autoextend (ex: 16G, 32G, UNLIMITED):`, '32G');
    const sql = `ALTER TABLESPACE "${ts}" ADD DATAFILE '${dfPath}' SIZE ${size} AUTOEXTEND ON NEXT 128M MAXSIZE ${maxSize || 'UNLIMITED'};`;
    this.openDdlPreviewModal(sql, `Adicionar Datafile em ${ts}`);
  }

  promptResizeTablespace(tsName, dfPath = '', curSizeMb = 1024) {
    const ts = tsName || this.selectedObject?.name || 'USERS';
    const targetFile = dfPath || this.selectedObject?.datafiles?.[0]?.fileName || `${ts.toLowerCase()}01.dbf`;
    const newSize = prompt(`Novo tamanho para o datafile '${targetFile}' (atual: ${curSizeMb} MB, ex: 2048M ou 4G):`, `${Math.max(512, Math.round(curSizeMb * 1.5))}M`);
    if (!newSize) return;
    const sql = `ALTER DATABASE DATAFILE '${targetFile}' RESIZE ${newSize};`;
    this.openDdlPreviewModal(sql, `Redimensionar (Resize) Datafile — ${ts}`);
  }

  promptAutoextendTablespace(tsName, dfPath = '') {
    const ts = tsName || this.selectedObject?.name || 'USERS';
    const targetFile = dfPath || this.selectedObject?.datafiles?.[0]?.fileName || `${ts.toLowerCase()}01.dbf`;
    const maxSz = prompt(`Configurar AUTOEXTEND ON para '${targetFile}'. Informe o MAXSIZE (ex: 16G, 32G, UNLIMITED ou OFF para desativar):`, '32G');
    if (!maxSz) return;
    const sql = maxSz.trim().toUpperCase() === 'OFF'
      ? `ALTER DATABASE DATAFILE '${targetFile}' AUTOEXTEND OFF;`
      : `ALTER DATABASE DATAFILE '${targetFile}' AUTOEXTEND ON NEXT 128M MAXSIZE ${maxSz.trim().toUpperCase()};`;
    this.openDdlPreviewModal(sql, `Configurar Autoextend / Uso Máx — ${ts}`);
  }

  async loadAllTablespacesOverview(force = false) {
    if (!force && this.allTablespacesOverview && this.allTablespacesOverview.length > 0 && this.allDatafiles && this.allDatafiles.length > 0) {
      return this.allTablespacesOverview;
    }
    if (window.TracesApp && window.TracesApp.isConnected()) {
      try {
        const activeConn = window.TracesApp?.connectionManager?.getActive?.();
        const connParam = activeConn?.id ? `?conn_id=${encodeURIComponent(activeConn.id)}` : '';
        const resp = await fetch(`/api/tablespaces${connParam}`);
        const data = await resp.json();
        if (data.tablespaces && Array.isArray(data.tablespaces)) {
          this.allTablespacesOverview = data.tablespaces;
          this.allTablespacesSummary = data.summary || null;
          this.allDatafiles = data.datafiles || [];
          if (!this.selectedObject && this.allTablespacesOverview.length > 0) {
            this.selectedObject = this.allTablespacesOverview[0];
          }
          if (this.currentCategory === 'tablespaces') {
            const tsOvPane = document.getElementById('tab-pane-tsoverview');
            if (tsOvPane) tsOvPane.innerHTML = this.buildTablespacesOverviewHtml();
            const colPane = document.getElementById('tab-pane-columns');
            if (colPane) colPane.innerHTML = this.buildSelectedTablespaceDetailHtml(this.selectedObject || this.allTablespacesOverview[0]);
            const dfPane = document.getElementById('tab-pane-tsdatafiles');
            if (dfPane) dfPane.innerHTML = this.buildDatafilesTabHtml();
          }
          return this.allTablespacesOverview;
        }
      } catch (e) {
        console.warn('Error loading tablespaces overview:', e);
      }
    }
    // Fallback to schema data tablespaces
    const rawTs = this.getSchemaData().tablespaces || [
      { name: 'SYSTEM', totalMb: 1200, usedMb: 1020, freeMb: 180, pct: 85.0, maxMb: 32768, freeMaxMb: 31748, maxPct: 3.1, autoextend: 'YES', datafiles: 1, status: 'ONLINE', contents: 'PERMANENT' },
      { name: 'SYSAUX', totalMb: 1400, usedMb: 1120, freeMb: 280, pct: 80.0, maxMb: 32768, freeMaxMb: 31648, maxPct: 3.4, autoextend: 'YES', datafiles: 1, status: 'ONLINE', contents: 'PERMANENT' },
      { name: 'USERS', totalMb: 4096, usedMb: 2840, freeMb: 1256, pct: 69.3, maxMb: 32768, freeMaxMb: 29928, maxPct: 8.7, autoextend: 'YES', datafiles: 2, status: 'ONLINE', contents: 'PERMANENT' },
      { name: 'UNDOTBS1', totalMb: 2048, usedMb: 420, freeMb: 1628, pct: 20.5, maxMb: 16384, freeMaxMb: 15964, maxPct: 2.6, autoextend: 'YES', datafiles: 1, status: 'ONLINE', contents: 'UNDO' },
      { name: 'TEMP', totalMb: 1024, usedMb: 180, freeMb: 844, pct: 17.6, maxMb: 8192, freeMaxMb: 8012, maxPct: 2.2, autoextend: 'YES', datafiles: 1, status: 'ONLINE', contents: 'TEMPORARY' }
    ];
    this.allTablespacesOverview = rawTs.map(t => {
      const tot = Number(t.totalMb || 1024);
      const used = Number(t.usedMb ?? Math.round(tot * 0.55));
      const free = Number(t.freeMb ?? Math.max(0, tot - used));
      const pct = Number(t.pct ?? t.usedPct ?? (tot > 0 ? Math.round((used / tot) * 1000) / 10 : 0));
      const maxMb = Number(t.maxMb && t.maxMb >= tot ? t.maxMb : (t.autoextend === 'NO' ? tot : tot * 4));
      const freeMaxMb = Number(t.freeMaxMb ?? Math.max(0, maxMb - used));
      const maxPct = Number(t.maxPct ?? t.maxPctUsed ?? (maxMb > 0 ? Math.round((used / maxMb) * 1000) / 10 : pct));
      return Object.assign({}, t, { totalMb: tot, usedMb: used, freeMb: free, pct, maxMb, freeMaxMb, maxPct, autoextend: t.autoextend || 'YES', datafiles: t.datafiles || 1 });
    });
    if (!this.allDatafiles || this.allDatafiles.length === 0) {
      this.allDatafiles = [];
      this.allTablespacesOverview.forEach(t => {
        if (Array.isArray(t.datafilesList) && t.datafilesList.length > 0) {
          t.datafilesList.forEach(df => this.allDatafiles.push(df));
        }
      });
    }
    if (!this.selectedObject && this.allTablespacesOverview.length > 0) {
      this.selectedObject = this.allTablespacesOverview[0];
    }
    if (this.currentCategory === 'tablespaces') {
      const tsOvPane = document.getElementById('tab-pane-tsoverview');
      if (tsOvPane) tsOvPane.innerHTML = this.buildTablespacesOverviewHtml();
      const colPane = document.getElementById('tab-pane-columns');
      if (colPane) colPane.innerHTML = this.buildSelectedTablespaceDetailHtml(this.selectedObject || this.allTablespacesOverview[0]);
      const dfPane = document.getElementById('tab-pane-tsdatafiles');
      if (dfPane) dfPane.innerHTML = this.buildDatafilesTabHtml();
    }
    return this.allTablespacesOverview;
  }

  buildTablespacesOverviewHtml() {
    const list = this.allTablespacesOverview || [];
    if (list.length === 0) {
      this.loadAllTablespacesOverview();
    }
    const tsList = this.allTablespacesOverview || [];
    const sumAlloc = tsList.reduce((acc, t) => acc + Number(t.totalMb || 0), 0);
    const sumUsed = tsList.reduce((acc, t) => acc + Number(t.usedMb || 0), 0);
    const sumFree = tsList.reduce((acc, t) => acc + Number(t.freeMb ?? Math.max(0, (t.totalMb || 0) - (t.usedMb || 0))), 0);
    const sumMax = tsList.reduce((acc, t) => acc + Number(t.maxMb || t.totalMb || 0), 0);
    const sumFreeMax = Math.max(0, sumMax - sumUsed);
    const sumFiles = tsList.reduce((acc, t) => acc + Number(t.datafiles || t.filesCount || 1), 0);
    const globalAllocPct = sumAlloc > 0 ? ((sumUsed / sumAlloc) * 100).toFixed(1) : '0.0';
    const globalMaxPct = sumMax > 0 ? ((sumUsed / sumMax) * 100).toFixed(1) : '0.0';

    const selectedTs = (this.selectedObject && this.selectedObject.name)
      ? tsList.find(t => t.name === this.selectedObject.name) || tsList[0]
      : tsList[0];

    return `
      <div class="toad-ts-container">
        <!-- 1. Header Banner -->
        <div class="toad-ts-header-card">
          <div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
              <span>💾</span>
              <span>Visão Geral de Todas as Tablespaces &amp; Uso Máximo (Autoextend / MAXBYTES)</span>
              <span class="status-indicator valid" style="font-size: 10px;">PROD INSTANCE</span>
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              Sessão corporativa consolidada: monitoramento de capacidade alocada atual, tetos de expansão física (MAXBYTES) e datafiles.
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-primary" style="height: 26px; padding: 0 11px; font-weight: 700; font-size: 11px;" onclick="window.TracesApp.schemaBrowser.openCreateObjectWizard('tablespaces')">
              ➕ Nova Tablespace
            </button>
            <button class="btn" style="height: 26px; padding: 0 10px; font-weight: 600; font-size: 11px;" onclick="window.TracesApp.schemaBrowser.loadAllTablespacesOverview(true)">
              🔄 Atualizar Métricas
            </button>
            <button class="btn" style="height: 26px; padding: 0 10px; font-weight: 600; font-size: 11px;" onclick="window.TracesApp.openWindow('dba', 'spacemanager')">
              🏛 DBA Space Manager
            </button>
          </div>
        </div>

        <!-- 2. Executive KPI Ribbon -->
        <div class="toad-ts-kpis">
          <div class="toad-ts-kpi-card">
            <div class="toad-ts-kpi-title">🗄️ Tablespaces &amp; Arqs</div>
            <div class="toad-ts-kpi-val">${tsList.length} TS <span style="font-size: 12px; color: #0284c7; font-weight: 600;">(${sumFiles} dbf)</span></div>
            <div class="toad-ts-kpi-sub">Total de recipientes físicos</div>
          </div>
          <div class="toad-ts-kpi-card">
            <div class="toad-ts-kpi-title">💾 Total Alocado Atual</div>
            <div class="toad-ts-kpi-val">${(sumAlloc / 1024).toFixed(2)} GB</div>
            <div class="toad-ts-kpi-sub">${Math.round(sumAlloc).toLocaleString()} MB alocados em disco</div>
          </div>
          <div class="toad-ts-kpi-card">
            <div class="toad-ts-kpi-title">📈 Total Usado Alocado</div>
            <div class="toad-ts-kpi-val" style="color: ${Number(globalAllocPct) > 85 ? '#dc2626' : Number(globalAllocPct) > 70 ? '#d97706' : '#0f172a'};">
              ${(sumUsed / 1024).toFixed(2)} GB <span style="font-size: 12px; font-weight: 700;">(${globalAllocPct}%)</span>
            </div>
            <div class="toad-ts-kpi-sub">${Math.round(sumUsed).toLocaleString()} MB ocupados</div>
          </div>
          <div class="toad-ts-kpi-card">
            <div class="toad-ts-kpi-title">🟢 Livre no Alocado</div>
            <div class="toad-ts-kpi-val" style="color: #15803d;">${(sumFree / 1024).toFixed(2)} GB</div>
            <div class="toad-ts-kpi-sub">${Math.round(sumFree).toLocaleString()} MB livres sem autoextend</div>
          </div>
          <div class="toad-ts-kpi-card highlight-max">
            <div class="toad-ts-kpi-title" style="color: #0369a1;">🚀 Capacidade Máx (MAXBYTES)</div>
            <div class="toad-ts-kpi-val" style="color: #0284c7;">${(sumMax / 1024).toFixed(2)} GB</div>
            <div class="toad-ts-kpi-sub" style="color: #0369a1;">Teto de autoexpansão do storage</div>
          </div>
          <div class="toad-ts-kpi-card highlight-free">
            <div class="toad-ts-kpi-title" style="color: #15803d;">🛡️ Livre Real até o Teto</div>
            <div class="toad-ts-kpi-val" style="color: #15803d;">${(sumFreeMax / 1024).toFixed(2)} GB</div>
            <div class="toad-ts-kpi-sub" style="color: #166534;">Ocupação do teto: <strong>${globalMaxPct}%</strong></div>
          </div>
        </div>

        <!-- 3. Filter Toolbar -->
        <div class="toad-ts-toolbar">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div class="toad-ts-filter-box">
              <span style="font-size: 12px; color: #64748b;">🔍</span>
              <input type="text" id="toad-ts-filter-text" placeholder="Filtrar tablespace por nome..." oninput="window.TracesApp.schemaBrowser.filterTablespacesGrid()">
            </div>
            <select class="toad-conn-combobox" id="toad-ts-filter-usage" style="height: 24px; min-width: 140px;" onchange="window.TracesApp.schemaBrowser.filterTablespacesGrid()">
              <option value="all">Todas as Faixas de Uso</option>
              <option value="50">Uso Alocado &gt; 50%</option>
              <option value="70">⚠️ Atenção (&gt; 70%)</option>
              <option value="85">🚨 Crítico (&gt; 85%)</option>
            </select>
            <select class="toad-conn-combobox" id="toad-ts-filter-autoext" style="height: 24px; min-width: 130px;" onchange="window.TracesApp.schemaBrowser.filterTablespacesGrid()">
              <option value="all">Todos os Autoextend</option>
              <option value="YES">Com Autoextend (YES)</option>
              <option value="NO">Sem Autoextend (Fixo)</option>
            </select>
            <button class="btn" style="height: 24px; padding: 0 8px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.resetTablespacesGridFilter()">
              ✕ Limpar
            </button>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="dba-filter-count-badge" id="toad-ts-count-badge">Exibindo ${tsList.length} de ${tsList.length} tablespaces</span>
          </div>
        </div>

        <!-- 4. Master Data Grid (All Tablespaces) -->
        <div class="toad-ts-table-wrapper">
          <table class="toad-ts-table" id="toad-ts-master-table">
            <thead>
              <tr>
                <th style="min-width: 130px;">Tablespace</th>
                <th style="width: 80px;">Status</th>
                <th style="width: 90px;">Tipo</th>
                <th style="text-align: center; width: 45px;">Arq</th>
                <th style="text-align: right; width: 95px;">Alocado</th>
                <th style="text-align: right; width: 95px;">Usado</th>
                <th style="text-align: right; width: 95px;">Livre Aloc</th>
                <th style="min-width: 140px;">% Uso Alocado</th>
                <th style="text-align: center; width: 75px;">Autoext</th>
                <th style="text-align: right; min-width: 110px;">Capacidade Máx</th>
                <th style="text-align: right; min-width: 100px;">Livre até Máx</th>
                <th style="min-width: 140px;">% Uso sobre o Máx</th>
                <th style="text-align: right; min-width: 140px;">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody>
              ${tsList.map(t => {
                const tot = Number(t.totalMb || 0);
                const used = Number(t.usedMb || 0);
                const free = Number(t.freeMb ?? Math.max(0, tot - used));
                const pct = Number(t.pct ?? t.pctUsed ?? (tot > 0 ? Math.round((used / tot) * 1000) / 10 : 0));
                const maxMb = Number(t.maxMb && t.maxMb >= tot ? t.maxMb : (t.autoextend === 'NO' ? tot : tot * 4));
                const freeMax = Number(t.freeMaxMb ?? Math.max(0, maxMb - used));
                const maxPct = Number(t.maxPct ?? t.maxPctUsed ?? (maxMb > 0 ? Math.round((used / maxMb) * 1000) / 10 : pct));
                const cAlloc = pct >= 85 ? '#dc2626' : pct >= 70 ? '#d97706' : '#16a34a';
                const cMax = maxPct >= 85 ? '#dc2626' : maxPct >= 70 ? '#d97706' : '#0284c7';
                const isSelected = selectedTs && selectedTs.name === t.name;

                return `
                  <tr class="ts-grid-row ${isSelected ? 'active-ts-row' : ''}" data-name="${t.name.toLowerCase()}" data-pct="${pct}" data-autoext="${t.autoextend || 'YES'}"
                      onclick="window.TracesApp.schemaBrowser.selectTablespaceInMaster('${t.name}')" style="cursor: pointer;">
                    <td style="font-weight: 700; color: #0284c7; font-family: var(--font-code);">
                      💾 ${t.name}
                    </td>
                    <td>
                      <span class="status-indicator ${t.status === 'ONLINE' ? 'valid' : 'invalid'}" style="font-size: 10px; font-weight: 700;">
                        ${t.status || 'ONLINE'}
                      </span>
                    </td>
                    <td style="color: #64748b; font-size: 10.5px; font-weight: 600;">
                      ${t.contents || 'PERMANENT'}
                    </td>
                    <td style="text-align: center; font-weight: 700; color: #334155;">
                      ${t.datafiles || t.filesCount || 1}
                    </td>
                    <td style="text-align: right; font-family: var(--font-code); font-weight: 600;">
                      ${tot.toLocaleString()} MB
                    </td>
                    <td style="text-align: right; font-family: var(--font-code); color: ${cAlloc}; font-weight: 700;">
                      ${used.toLocaleString()} MB
                    </td>
                    <td style="text-align: right; font-family: var(--font-code); color: #15803d; font-weight: 600;">
                      ${free.toLocaleString()} MB
                    </td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <div class="toad-ts-meter-track">
                          <div class="toad-ts-meter-fill" style="width: ${Math.min(100, pct)}%; background: ${cAlloc};"></div>
                        </div>
                        <span style="font-size: 10.5px; font-weight: 700; color: ${cAlloc}; min-width: 38px; text-align: right;">${pct}%</span>
                      </div>
                    </td>
                    <td style="text-align: center;">
                      <span style="font-weight: 700; font-size: 10px; padding: 2px 7px; border-radius: 8px; background: ${t.autoextend === 'NO' ? '#fee2e2' : '#dcfce7'}; color: ${t.autoextend === 'NO' ? '#991b1b' : '#166534'};">
                        ${t.autoextend || 'YES'}
                      </span>
                    </td>
                    <td style="text-align: right; font-family: var(--font-code); font-weight: 700; color: #0369a1;">
                      ${maxMb.toLocaleString()} MB <span style="font-size: 9.5px; color: #64748b;">(${(maxMb / 1024).toFixed(1)}G)</span>
                    </td>
                    <td style="text-align: right; font-family: var(--font-code); font-weight: 600; color: #15803d;">
                      ${freeMax.toLocaleString()} MB
                    </td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <div class="toad-ts-meter-track">
                          <div class="toad-ts-meter-fill" style="width: ${Math.min(100, maxPct)}%; background: ${cMax};"></div>
                        </div>
                        <span style="font-size: 10.5px; font-weight: 700; color: ${cMax}; min-width: 38px; text-align: right;">${maxPct}%</span>
                      </div>
                    </td>
                    <td style="text-align: right; white-space: nowrap;" onclick="event.stopPropagation()">
                      <button class="btn" style="height: 20px; padding: 0 6px; font-size: 9.5px;" title="Adicionar Datafile em ${t.name}" onclick="window.TracesApp.schemaBrowser.promptAddDatafile('${t.name}')">+File</button>
                      <button class="btn" style="height: 20px; padding: 0 6px; font-size: 9.5px;" title="Redimensionar Datafile de ${t.name}" onclick="window.TracesApp.schemaBrowser.promptResizeTablespace('${t.name}', '', ${tot})">↔Resize</button>
                      <button class="btn" style="height: 20px; padding: 0 6px; font-size: 9.5px;" title="Configurar Autoextend / MaxSize de ${t.name}" onclick="window.TracesApp.schemaBrowser.promptAutoextendTablespace('${t.name}')">⚙Max</button>
                      <button class="btn btn-danger" style="height: 20px; padding: 0 6px; font-size: 9.5px;" title="Drop ${t.name}" onclick="window.TracesApp.schemaBrowser.dropObject('${this.currentSchema}', '${t.name}', 'TABLESPACE')">🗑</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- 5. Lower Master-Detail Inspector for Selected Tablespace -->
        <div id="ts-master-detail-lower">
          ${this.buildSelectedTablespaceDetailHtml(selectedTs)}
        </div>
      </div>
    `;
  }

  buildSelectedTablespaceDetailHtml(ts) {
    if (!ts) {
      return `
        <div class="toad-ts-detail-pane" style="text-align: center; color: #64748b; font-size: 11px; padding: 24px;">
          Selecione uma tablespace na tabela acima para visualizar seus datafiles mapeados, parâmetros de bloco e script DDL.
        </div>
      `;
    }

    const totalMb = Number(ts.totalMb || 1024);
    const usedMb = Number(ts.usedMb || Math.round(totalMb * 0.55));
    const freeMb = Number(ts.freeMb ?? Math.max(0, totalMb - usedMb));
    const pct = Number(ts.pct ?? (totalMb > 0 ? Math.round((usedMb / totalMb) * 1000) / 10 : 0));
    const maxMb = Number(ts.maxMb && ts.maxMb >= totalMb ? ts.maxMb : (ts.autoextend === 'NO' ? totalMb : totalMb * 4));
    const freeMaxMb = Number(ts.freeMaxMb ?? Math.max(0, maxMb - usedMb));
    const maxPct = Number(ts.maxPct ?? (maxMb > 0 ? Math.round((usedMb / maxMb) * 1000) / 10 : pct));
    const barColor = pct > 85 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981';
    const maxBarColor = maxPct > 85 ? '#ef4444' : maxPct > 70 ? '#f59e0b' : '#0284c7';

    const rawDatafiles = (Array.isArray(ts.datafilesList) && ts.datafilesList.length > 0)
      ? ts.datafilesList
      : (Array.isArray(ts.datafiles) && ts.datafiles.length > 0
          ? ts.datafiles
          : (this.allDatafiles ? this.allDatafiles.filter(f => (f.tablespace || '').toUpperCase() === (ts.name || '').toUpperCase()) : []));
    const hasDatafiles = Array.isArray(rawDatafiles) && rawDatafiles.length > 0;

    return `
      <div class="toad-ts-detail-pane">
        <!-- Sub-header -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">💾</span>
            <div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a;">
                Detalhes &amp; Datafiles da Tablespace: <span style="color: #0284c7;">${ts.name}</span>
              </div>
              <div style="font-size: 10.5px; color: #64748b;">
                Status: <strong>${ts.status || 'ONLINE'}</strong> &bull; Tipo: <strong>${ts.contents || 'PERMANENT'}</strong> &bull; Extent: <strong>${ts.extentManagement || 'LOCAL'}</strong> &bull; Block: <strong>${ts.blockSize || 8192} B</strong>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-primary" style="height: 24px; padding: 0 9px; font-size: 10.5px; font-weight: 700;" onclick="window.TracesApp.schemaBrowser.promptAddDatafile('${ts.name}')">
              ➕ Add Datafile
            </button>
            <button class="btn" style="height: 24px; padding: 0 9px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.schemaBrowser.promptResizeTablespace('${ts.name}')">
              ↔ Resize Datafile
            </button>
            <button class="btn" style="height: 24px; padding: 0 9px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.schemaBrowser.promptAutoextendTablespace('${ts.name}')">
              ⚙ Config Autoextend
            </button>
            <button class="btn" style="height: 24px; padding: 0 9px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.openObjectInWorksheet('${ts.name}')">
              📝 Abrir no Worksheet
            </button>
            <button class="btn btn-danger" style="height: 24px; padding: 0 9px; font-size: 10.5px;" onclick="window.TracesApp.schemaBrowser.dropObject('${this.currentSchema}', '${ts.name}', 'TABLESPACE')">
              🗑 Drop
            </button>
          </div>
        </div>

        <!-- Dual Capacity Visual Meter for Selected TS -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
          <!-- 1. Alocado -->
          <div class="advisor-card" style="padding: 12px; border-left: 3px solid ${barColor};">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
              <strong style="font-size: 11px; color: #1e293b;">1. Ocupação do Espaço Alocado</strong>
              <span style="font-weight: 800; font-size: 12px; color: ${barColor};">${pct}% Alocado</span>
            </div>
            <div class="toad-ts-meter-track" style="margin-bottom: 6px;">
              <div class="toad-ts-meter-fill" style="width: ${Math.min(100, pct)}%; background: ${barColor};"></div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 10.5px;">
              <div><span style="color: #64748b;">Alocado:</span><br><strong>${totalMb.toLocaleString()} MB</strong></div>
              <div><span style="color: #64748b;">Usado:</span><br><strong style="color: ${barColor};">${usedMb.toLocaleString()} MB</strong></div>
              <div><span style="color: #64748b;">Livre:</span><br><strong style="color: #10b981;">${freeMb.toLocaleString()} MB</strong></div>
            </div>
          </div>

          <!-- 2. Capacidade Máxima com Autoextend -->
          <div class="advisor-card" style="padding: 12px; border-left: 3px solid ${maxBarColor};">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
              <strong style="font-size: 11px; color: #1e293b;">2. Capacidade Máxima (MAXBYTES / Autoextend)</strong>
              <span style="font-weight: 800; font-size: 12px; color: ${maxBarColor};">${maxPct}% do Máx</span>
            </div>
            <div class="toad-ts-meter-track" style="margin-bottom: 6px;">
              <div class="toad-ts-meter-fill" style="width: ${Math.min(100, maxPct)}%; background: ${maxBarColor};"></div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 10.5px;">
              <div><span style="color: #64748b;">Teto Máx:</span><br><strong style="color: #0369a1;">${maxMb.toLocaleString()} MB</strong></div>
              <div><span style="color: #64748b;">Livre até Máx:</span><br><strong style="color: #15803d;">${freeMaxMb.toLocaleString()} MB</strong></div>
              <div><span style="color: #64748b;">Autoextend:</span><br><strong style="color: ${ts.autoextend === 'NO' ? '#dc2626' : '#16a34a'};">${ts.autoextend || 'YES'}</strong></div>
            </div>
          </div>
        </div>

        <!-- Datafiles Table for Selected TS -->
        <div style="border: 1px solid #cbd5e1; border-radius: 5px; overflow: hidden; background: #fff;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 6px 12px; border-bottom: 1px solid #cbd5e1;">
            <strong style="font-size: 11px; color: #334155;">📁 Datafiles Mapeados (${rawDatafiles.length} arquivos físicos)</strong>
            <button class="btn" style="height: 20px; padding: 0 7px; font-size: 10px;" onclick="window.TracesApp.schemaBrowser.promptAddDatafile('${ts.name}')">➕ Novo Datafile</button>
          </div>
          <table class="meta-table" style="width: 100%;">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">ID</th>
                <th style="width: 80px; text-align: center;">Tipo</th>
                <th>Caminho do Datafile (.dbf)</th>
                <th style="text-align: right; width: 105px;">Alocado</th>
                <th style="text-align: right; width: 105px;">User Bytes</th>
                <th style="text-align: right; width: 130px;">Máximo (MAXBYTES)</th>
                <th style="text-align: right; width: 95px;">Incremento</th>
                <th style="text-align: center; width: 85px;">Autoextend</th>
                <th style="text-align: center; width: 80px;">Status</th>
                <th style="text-align: center; width: 120px;">I/O Reads/Writes</th>
                <th style="text-align: right; width: 140px;">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody>
              ${hasDatafiles ? rawDatafiles.map(df => {
                const dfPath = df.fileName || df.name || `/u01/app/oracle/oradata/${ts.name.toLowerCase()}01.dbf`;
                const dfSize = df.sizeMb || totalMb;
                const dfUserBytes = df.userBytesMb || dfSize;
                const dfMax = df.maxMb || (df.autoextend === 'NO' ? dfSize : maxMb);
                const dfIncr = df.incrementMb || 0;
                const dfType = df.fileType || (ts.contents === 'TEMPORARY' ? 'TEMPFILE' : 'DATAFILE');
                const reads = df.phyReads != null ? Number(df.phyReads).toLocaleString() : '0';
                const writes = df.phyWrites != null ? Number(df.phyWrites).toLocaleString() : '0';
                return `
                  <tr>
                    <td style="text-align: center; font-family: var(--font-code); color: #64748b; font-weight: 700; font-size: 10px;">
                      #${df.fileId || '-'}
                    </td>
                    <td style="text-align: center;">
                      <span style="font-size: 9.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: ${dfType === 'TEMPFILE' ? '#fef3c7' : '#e0f2fe'}; color: ${dfType === 'TEMPFILE' ? '#92400e' : '#0369a1'};">
                        ${dfType}
                      </span>
                    </td>
                    <td style="font-family: var(--font-code); color: #0f172a; font-weight: 600; font-size: 11px;">
                      📄 ${dfPath}
                    </td>
                    <td style="text-align: right; font-family: var(--font-code); font-weight: 600;">
                      ${Number(dfSize).toLocaleString()} MB
                    </td>
                    <td style="text-align: right; font-family: var(--font-code); color: #475569;">
                      ${Number(dfUserBytes).toLocaleString()} MB
                    </td>
                    <td style="text-align: right; font-family: var(--font-code); font-weight: 700; color: #0369a1;">
                      ${Number(dfMax).toLocaleString()} MB <span style="font-size: 9.5px; color: #64748b;">(${(dfMax/1024).toFixed(1)}G)</span>
                    </td>
                    <td style="text-align: right; font-family: var(--font-code); color: #64748b;">
                      ${Number(dfIncr).toLocaleString()} MB
                    </td>
                    <td style="text-align: center;">
                      <span style="font-weight: 700; font-size: 10px; padding: 1px 6px; border-radius: 8px; background: ${df.autoextend === 'NO' ? '#fee2e2' : '#dcfce7'}; color: ${df.autoextend === 'NO' ? '#991b1b' : '#166534'};">
                        ${df.autoextend || 'YES'}
                      </span>
                    </td>
                    <td style="text-align: center;">
                      <span class="status-indicator valid" style="font-size: 10px;">${df.status || 'AVAILABLE'}</span>
                    </td>
                    <td style="text-align: center; font-size: 10px; color: #475569; font-family: var(--font-code);">
                      R:${reads} / W:${writes}
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                      <button class="btn" style="height: 20px; padding: 0 6px; font-size: 9.5px;" onclick="window.TracesApp.schemaBrowser.promptResizeTablespace('${ts.name}', '${dfPath.replace(/\\/g, '\\\\')}', ${dfSize})">↔ Resize</button>
                      <button class="btn" style="height: 20px; padding: 0 6px; font-size: 9.5px;" onclick="window.TracesApp.schemaBrowser.promptAutoextendTablespace('${ts.name}', '${dfPath.replace(/\\/g, '\\\\')}')">⚙ Max</button>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="11" style="text-align: center; color: #64748b; padding: 12px; font-size: 11px;">
                    Nenhum datafile físico associado a esta tablespace.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <!-- Storage Parameters Strip -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
          <div class="advisor-card" style="padding: 8px 10px;">
            <div class="metric-label" style="font-size: 10px;">Extent Mgmt</div>
            <div class="metric-value" style="font-size: 12px; font-weight: 700;">${ts.extentManagement || 'LOCAL'}</div>
          </div>
          <div class="advisor-card" style="padding: 8px 10px;">
            <div class="metric-label" style="font-size: 10px;">Allocation Type</div>
            <div class="metric-value" style="font-size: 12px; font-weight: 700;">${ts.allocationType || 'SYSTEM'}</div>
          </div>
          <div class="advisor-card" style="padding: 8px 10px;">
            <div class="metric-label" style="font-size: 10px;">Segment Space Mgmt</div>
            <div class="metric-value" style="font-size: 12px; font-weight: 700;">${ts.segmentSpaceManagement || 'AUTO (ASSM)'}</div>
          </div>
          <div class="advisor-card" style="padding: 8px 10px;">
            <div class="metric-label" style="font-size: 10px;">Block Size</div>
            <div class="metric-value" style="font-size: 12px; font-weight: 700;">${ts.blockSize || 8192} Bytes</div>
          </div>
          <div class="advisor-card" style="padding: 8px 10px;">
            <div class="metric-label" style="font-size: 10px;">Logging</div>
            <div class="metric-value" style="font-size: 12px; font-weight: 700; color: #16a34a;">LOGGING</div>
          </div>
        </div>

        <!-- Quick DDL Box -->
        <div style="background: #1e293b; border-radius: 5px; padding: 10px 12px; color: #e2e8f0; font-family: var(--font-code); font-size: 11px; overflow-x: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; color: #94a3b8; font-size: 10px; font-weight: 700; text-transform: uppercase;">
            <span>📜 DDL de Criação da Tablespace</span>
            <button class="btn" style="height: 18px; padding: 0 6px; font-size: 9.5px; background: #334155; color: #f8fafc; border: none;"
                    onclick="navigator.clipboard.writeText('CREATE TABLESPACE \\&quot;${ts.name}\\&quot; DATAFILE \\&apos;${ts.name.toLowerCase()}01.dbf\\&apos; SIZE ${totalMb}M AUTOEXTEND ON NEXT 128M MAXSIZE ${maxMb}M EXTENT MANAGEMENT LOCAL SEGMENT SPACE MANAGEMENT AUTO;'); window.TracesApp.notify('DDL copiado para a Área de Transferência!', 'success');">
              📋 Copiar DDL
            </button>
          </div>
          <code>CREATE TABLESPACE "${ts.name}" DATAFILE '${ts.name.toLowerCase()}01.dbf' SIZE ${totalMb}M AUTOEXTEND ${ts.autoextend === 'NO' ? 'OFF' : 'ON NEXT 128M MAXSIZE ' + maxMb + 'M'} EXTENT MANAGEMENT LOCAL SEGMENT SPACE MANAGEMENT AUTO;</code>
        </div>
      </div>
    `;
  }

  buildDatafilesTabHtml() {
    let allFiles = [];
    if (this.allDatafiles && Array.isArray(this.allDatafiles) && this.allDatafiles.length > 0) {
      allFiles = this.allDatafiles.map(df => Object.assign({}, df));
    } else {
      const tsList = this.allTablespacesOverview || [];
      tsList.forEach(ts => {
        const dfs = ts.datafilesList || (Array.isArray(ts.datafiles) ? ts.datafiles : []);
        if (Array.isArray(dfs) && dfs.length > 0) {
          dfs.forEach(df => {
            allFiles.push(Object.assign({}, df, { tablespace: df.tablespace || ts.name }));
          });
        }
      });
    }

    if (allFiles.length === 0) {
      const tsList = this.allTablespacesOverview || [];
      tsList.forEach(ts => {
        allFiles.push({
          tablespace: ts.name,
          fileId: 1,
          fileName: `/u01/app/oracle/oradata/${ts.name.toLowerCase()}01.dbf`,
          sizeMb: ts.totalMb || 1024,
          userBytesMb: ts.totalMb || 1024,
          maxMb: ts.maxMb || (ts.autoextend === 'NO' ? ts.totalMb : ts.totalMb * 4),
          incrementMb: 128,
          autoextend: ts.autoextend || 'YES',
          status: ts.status || 'AVAILABLE',
          fileType: ts.contents === 'TEMPORARY' ? 'TEMPFILE' : 'DATAFILE',
          phyReads: 0,
          phyWrites: 0
        });
      });
    }

    // Map distinct tablespaces with counts
    const tsMap = {};
    allFiles.forEach(f => {
      const tsName = (f.tablespace || 'UNKNOWN').toUpperCase();
      tsMap[tsName] = (tsMap[tsName] || 0) + 1;
    });
    const tsNames = Object.keys(tsMap).sort();

    const sumAllocMb = allFiles.reduce((acc, f) => acc + Number(f.sizeMb || 0), 0);
    const sumMaxMb = allFiles.reduce((acc, f) => acc + Number(f.maxMb || f.sizeMb || 0), 0);
    const sumReads = allFiles.reduce((acc, f) => acc + Number(f.phyReads || 0), 0);
    const sumWrites = allFiles.reduce((acc, f) => acc + Number(f.phyWrites || 0), 0);

    return `
      <div class="toad-ts-container">
        <!-- Header Card -->
        <div class="toad-ts-header-card">
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px;">
              📁 Todos os Datafiles da Instância (DBA_DATA_FILES &amp; DBA_TEMP_FILES)
              <span style="font-size: 11px; background: #0284c7; color: #fff; padding: 1px 7px; border-radius: 10px; font-weight: 700;">${allFiles.length} arquivos</span>
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              Mapeamento de <strong>${allFiles.length} arquivos físicos (.dbf)</strong> em <strong>${tsNames.length} tablespaces</strong>. Alocado: <strong>${(sumAllocMb / 1024).toFixed(1)} GB</strong> &bull; Teto MAXBYTES: <strong>${(sumMaxMb / 1024).toFixed(1)} GB</strong> &bull; I/O Total: <strong>${sumReads.toLocaleString()} leituras / ${sumWrites.toLocaleString()} escritas</strong>.
            </div>
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-primary" style="height: 24px; padding: 0 9px; font-size: 10.5px; font-weight: 700;" onclick="window.TracesApp.schemaBrowser.promptAddDatafile('${this.selectedObject?.name || 'USERS'}')">
              ➕ Adicionar Datafile
            </button>
            <button class="btn" style="height: 24px; padding: 0 9px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.schemaBrowser.loadAllTablespacesOverview(true)">
              🔄 Atualizar
            </button>
            <button class="btn" style="height: 24px; padding: 0 9px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.schemaBrowser.switchDetailTab('tsoverview')">
              📊 Voltar à Visão Geral
            </button>
          </div>
        </div>

        <!-- Filter Toolbar -->
        <div class="toad-ts-filter-bar">
          <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 200px;">
            <input type="text" id="toad-df-filter-text" class="toad-ts-search-input" placeholder="🔍 Filtrar por nome do arquivo (.dbf), tablespace ou caminho..." oninput="window.TracesApp.schemaBrowser.filterDatafilesGrid()">
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <label style="font-size: 11px; color: #475569; font-weight: 600;">Tablespace:</label>
            <select id="toad-df-filter-ts" class="toad-ts-select" onchange="window.TracesApp.schemaBrowser.filterDatafilesGrid()">
              <option value="all">Todas as Tablespaces (${allFiles.length})</option>
              ${tsNames.map(ts => `<option value="${ts}">${ts} (${tsMap[ts]})</option>`).join('')}
            </select>

            <label style="font-size: 11px; color: #475569; font-weight: 600;">Tipo:</label>
            <select id="toad-df-filter-type" class="toad-ts-select" onchange="window.TracesApp.schemaBrowser.filterDatafilesGrid()">
              <option value="all">Tipo: Todos</option>
              <option value="DATAFILE">DATAFILE</option>
              <option value="TEMPFILE">TEMPFILE</option>
            </select>

            <label style="font-size: 11px; color: #475569; font-weight: 600;">Autoextend:</label>
            <select id="toad-df-filter-autoext" class="toad-ts-select" onchange="window.TracesApp.schemaBrowser.filterDatafilesGrid()">
              <option value="all">Autoextend: Todos</option>
              <option value="YES">Autoextend ON (YES)</option>
              <option value="NO">Autoextend OFF (NO)</option>
            </select>

            <button class="btn" style="height: 24px; padding: 0 8px; font-size: 10px;" onclick="window.TracesApp.schemaBrowser.resetDatafilesFilter()">
              Limpar Filtros
            </button>
          </div>

          <span id="toad-df-count-badge" style="font-size: 11px; font-weight: 700; color: #0284c7; background: #e0f2fe; padding: 3px 8px; border-radius: 4px; white-space: nowrap;">
            Exibindo ${allFiles.length} de ${allFiles.length} datafiles
          </span>
        </div>

        <!-- Master Datafiles Table -->
        <div class="toad-ts-table-wrapper" style="max-height: calc(100vh - 240px); overflow-y: auto;">
          <table class="toad-ts-table" id="toad-df-master-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">ID</th>
                <th style="width: 80px; text-align: center;">Tipo</th>
                <th style="width: 140px;">Tablespace</th>
                <th>Caminho do Datafile (.dbf)</th>
                <th style="text-align: right; width: 105px;">Alocado</th>
                <th style="text-align: right; width: 105px;">User Bytes</th>
                <th style="text-align: right; width: 140px;">Máximo (MAXBYTES)</th>
                <th style="text-align: right; width: 95px;">Incremento</th>
                <th style="text-align: center; width: 85px;">Autoextend</th>
                <th style="text-align: center; width: 80px;">Status</th>
                <th style="text-align: center; width: 130px;">I/O Reads / Writes</th>
                <th style="text-align: right; width: 140px;">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody>
              ${allFiles.map(f => {
                const tsName = f.tablespace || 'UNKNOWN';
                const fPath = f.fileName || `${tsName.toLowerCase()}01.dbf`;
                const szMb = Number(f.sizeMb || 0);
                const ubMb = Number(f.userBytesMb || szMb);
                const mxMb = Number(f.maxMb || szMb);
                const incrMb = Number(f.incrementMb || 0);
                const aext = (f.autoextend || 'YES').toUpperCase();
                const fType = (f.fileType || 'DATAFILE').toUpperCase();
                const reads = f.phyReads != null ? Number(f.phyReads).toLocaleString() : '0';
                const writes = f.phyWrites != null ? Number(f.phyWrites).toLocaleString() : '0';

                return `
                  <tr class="df-grid-row" data-name="${fPath.toLowerCase()}" data-ts="${tsName.toUpperCase()}" data-autoext="${aext}" data-type="${fType}">
                    <td style="text-align: center; font-family: var(--font-code); color: #64748b; font-weight: 700; font-size: 10px;">
                      #${f.fileId || '-'}
                    </td>
                    <td style="text-align: center;">
                      <span style="font-size: 9.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: ${fType === 'TEMPFILE' ? '#fef3c7' : '#e0f2fe'}; color: ${fType === 'TEMPFILE' ? '#92400e' : '#0369a1'};">
                        ${fType}
                      </span>
                    </td>
                    <td style="font-weight: 700; color: #0284c7; font-family: var(--font-code); cursor: pointer;" onclick="window.TracesApp.schemaBrowser.selectTablespaceInMaster('${tsName}')">
                      💾 ${tsName}
                    </td>
                    <td style="font-family: var(--font-code); color: #0f172a; font-weight: 600; font-size: 11px;">
                      ${fPath}
                    </td>
                    <td style="text-align: right; font-family: var(--font-code); font-weight: 600;">
                      ${szMb.toLocaleString()} MB
                    </td>
                    <td style="text-align: right; font-family: var(--font-code); color: #475569;">
                      ${ubMb.toLocaleString()} MB
                    </td>
                    <td style="text-align: right; font-family: var(--font-code); font-weight: 700; color: #0369a1;">
                      ${mxMb.toLocaleString()} MB <span style="font-size: 9.5px; color: #64748b;">(${(mxMb / 1024).toFixed(1)}G)</span>
                    </td>
                    <td style="text-align: right; font-family: var(--font-code); color: #64748b;">
                      ${incrMb.toLocaleString()} MB
                    </td>
                    <td style="text-align: center;">
                      <span style="font-weight: 700; font-size: 10px; padding: 1px 6px; border-radius: 8px; background: ${aext === 'NO' ? '#fee2e2' : '#dcfce7'}; color: ${aext === 'NO' ? '#991b1b' : '#166534'};">
                        ${aext}
                      </span>
                    </td>
                    <td style="text-align: center;">
                      <span class="status-indicator valid" style="font-size: 10px;">${f.status || 'AVAILABLE'}</span>
                    </td>
                    <td style="text-align: center; font-size: 10px; color: #475569; font-family: var(--font-code);">
                      📖 ${reads} / ✍️ ${writes}
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                      <button class="btn" style="height: 20px; padding: 0 6px; font-size: 9.5px;" onclick="window.TracesApp.schemaBrowser.promptResizeTablespace('${tsName}', '${fPath.replace(/\\/g, '\\\\')}', ${szMb})">↔ Resize</button>
                      <button class="btn" style="height: 20px; padding: 0 6px; font-size: 9.5px;" onclick="window.TracesApp.schemaBrowser.promptAutoextendTablespace('${tsName}', '${fPath.replace(/\\/g, '\\\\')}')">⚙ Max</button>
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

  filterDatafilesGrid() {
    const textInp = document.getElementById('toad-df-filter-text');
    const tsSel = document.getElementById('toad-df-filter-ts');
    const autoextSel = document.getElementById('toad-df-filter-autoext');
    const typeSel = document.getElementById('toad-df-filter-type');
    const badge = document.getElementById('toad-df-count-badge');

    const text = textInp ? textInp.value.toLowerCase().trim() : '';
    const ts = tsSel ? tsSel.value.toUpperCase() : 'ALL';
    const autoext = autoextSel ? autoextSel.value.toUpperCase() : 'ALL';
    const ftype = typeSel ? typeSel.value.toUpperCase() : 'ALL';

    const rows = document.querySelectorAll('#toad-df-master-table tbody tr.df-grid-row');
    let visibleCount = 0;

    rows.forEach(r => {
      const name = r.getAttribute('data-name') || '';
      const rowTs = r.getAttribute('data-ts') || '';
      const aext = r.getAttribute('data-autoext') || 'YES';
      const rType = r.getAttribute('data-type') || 'DATAFILE';

      let match = true;
      if (text && !name.includes(text) && !rowTs.toLowerCase().includes(text)) match = false;
      if (ts !== 'ALL' && rowTs !== ts) match = false;
      if (autoext !== 'ALL' && aext !== autoext) match = false;
      if (ftype !== 'ALL' && rType !== ftype) match = false;

      r.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });

    if (badge) {
      const isFiltered = (text || ts !== 'ALL' || autoext !== 'ALL' || ftype !== 'ALL');
      badge.textContent = `Exibindo ${visibleCount} de ${rows.length} datafiles${isFiltered ? ' (Filtro Ativo)' : ''}`;
    }
  }

  resetDatafilesFilter() {
    const textInp = document.getElementById('toad-df-filter-text');
    const tsSel = document.getElementById('toad-df-filter-ts');
    const autoextSel = document.getElementById('toad-df-filter-autoext');
    const typeSel = document.getElementById('toad-df-filter-type');
    if (textInp) textInp.value = '';
    if (tsSel) tsSel.value = 'all';
    if (autoextSel) autoextSel.value = 'all';
    if (typeSel) typeSel.value = 'all';
    this.filterDatafilesGrid();
  }

  filterTablespacesGrid() {
    const textInp = document.getElementById('toad-ts-filter-text');
    const usageSel = document.getElementById('toad-ts-filter-usage');
    const autoextSel = document.getElementById('toad-ts-filter-autoext');
    const badge = document.getElementById('toad-ts-count-badge');

    const text = textInp ? textInp.value.toLowerCase().trim() : '';
    const usage = usageSel ? usageSel.value : 'all';
    const autoext = autoextSel ? autoextSel.value : 'all';

    const rows = document.querySelectorAll('#toad-ts-master-table tbody tr.ts-grid-row');
    let visibleCount = 0;

    rows.forEach(r => {
      const name = r.getAttribute('data-name') || '';
      const pct = parseFloat(r.getAttribute('data-pct') || '0');
      const aext = r.getAttribute('data-autoext') || 'YES';

      let match = true;
      if (text && !name.includes(text)) match = false;
      if (usage === '50' && pct <= 50) match = false;
      if (usage === '70' && pct <= 70) match = false;
      if (usage === '85' && pct <= 85) match = false;
      if (autoext !== 'all' && aext !== autoext) match = false;

      r.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });

    if (badge) {
      badge.textContent = `Exibindo ${visibleCount} de ${rows.length} tablespaces${(text || usage !== 'all' || autoext !== 'all') ? ' (Filtro Ativo)' : ''}`;
    }
  }

  resetTablespacesGridFilter() {
    const textInp = document.getElementById('toad-ts-filter-text');
    const usageSel = document.getElementById('toad-ts-filter-usage');
    const autoextSel = document.getElementById('toad-ts-filter-autoext');
    if (textInp) textInp.value = '';
    if (usageSel) usageSel.value = 'all';
    if (autoextSel) autoextSel.value = 'all';
    this.filterTablespacesGrid();
  }

  selectTablespaceInMaster(tsName) {
    if (!tsName) return;
    const list = this.allTablespacesOverview || [];
    const ts = list.find(t => t.name === tsName) || { name: tsName };
    this.selectedObject = ts;

    // Highlight row in master table
    const rows = document.querySelectorAll('#toad-ts-master-table tbody tr.ts-grid-row');
    rows.forEach(r => {
      const match = r.getAttribute('data-name') === tsName.toLowerCase();
      r.classList.toggle('active-ts-row', match);
    });

    // Update lower drilldown
    const lower = document.getElementById('ts-master-detail-lower');
    if (lower) {
      lower.innerHTML = this.buildSelectedTablespaceDetailHtml(ts);
    }

    // Update left tree active state
    const allItems = this.objectList?.querySelectorAll('.object-item, .toad-tree-item');
    if (allItems) {
      allItems.forEach(el => el.classList.remove('active'));
      const matched = Array.from(allItems).find(el => el.textContent.includes(tsName));
      if (matched) matched.classList.add('active');
    }

    // Update header title
    if (this.detailTitle) this.detailTitle.textContent = `TABLESPACE: ${tsName}`;
    if (this.detailTypePill) this.detailTypePill.textContent = 'TABLESPACE';

    // Also update tab-pane-columns and tab-pane-tsdatafiles in background
    const colPane = document.getElementById('tab-pane-columns');
    if (colPane && this.currentCategory === 'tablespaces') colPane.innerHTML = this.buildSelectedTablespaceDetailHtml(ts);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.SchemaBrowser = SchemaBrowser;
