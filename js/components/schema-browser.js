/* ==========================================================================
   SCHEMA BROWSER COMPONENT - TOAD FOR ORACLE PARITY (LIVE REAL DB)
   ========================================================================== */

class SchemaBrowser {
  constructor() {
    this.currentSchema = window.TRACES_DB ? window.TRACES_DB.activeSchema : 'SYS';
    this.currentCategory = 'tables';
    this.selectedObject = null;
    this.currentDetailTab = 'columns';
    this.searchQuery = '';
    this.realSchemas = [];
    this.realObjects = null;
    this.isLoadingDetails = false;
    this.objectDetailsCache = new Map();

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
    this.categoryDropdown = document.getElementById('browser-category-dropdown');
    this.accordionContainer = document.getElementById('browser-accordion-drawers');
    this.navMode = 'drawers'; // default to TOAD Gavetas Expansíveis!
    this.expandedDrawers = new Set(['tablespaces', 'tables', 'users']);
    this.isCategoryDrawerOpen = false;
  }

  bindEvents() {
    if (this.schemaSelect) {
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
    }

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        if (this.navMode === 'drawers') {
          this.renderAccordionDrawers();
        } else {
          this.renderObjectList();
        }
      });
    }

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
        this.realObjects = {
          tables: data.objects.filter(o => o.type === 'TABLE'),
          views: data.objects.filter(o => o.type === 'VIEW' || o.type === 'MATERIALIZED VIEW'),
          packages: data.objects.filter(o => o.type === 'PACKAGE' || o.type === 'PACKAGE BODY'),
          procedures: data.objects.filter(o => o.type === 'PROCEDURE'),
          functions: data.objects.filter(o => o.type === 'FUNCTION'),
          sequences: data.objects.filter(o => o.type === 'SEQUENCE'),
          synonyms: data.objects.filter(o => o.type === 'SYNONYM'),
          triggers: data.objects.filter(o => o.type === 'TRIGGER'),
          types: data.objects.filter(o => o.type === 'TYPE' || o.type === 'TYPE BODY'),
          indexes: data.objects.filter(o => o.type === 'INDEX')
        };
        this.renderCategoryPills();
        this.renderObjectList();

        // Auto-select top item of active category immediately
        const catItems = this.getSchemaData()[this.currentCategory] || [];
        if (catItems.length > 0) {
          this.selectObject(catItems[0].name);
        }
      }
    } catch (e) {
      console.warn('Real objects load error', e);
      this.objectList.innerHTML = `<div style="padding: 24px 16px; text-align: center; color: #dc2626; font-size: 11px;">Erro ao carregar objetos: ${e.message}</div>`;
    }
  }

  onConnectionChanged(conn) {
    if (conn.user) {
      this.currentSchema = conn.user.toUpperCase();
      if (this.schemaSelect) this.schemaSelect.value = this.currentSchema;
    }
    this.selectedObject = null;
    this.render();
  }

  getSchemaData() {
    if (this.currentCategory === 'tablespaces') {
      const tsList = (window.TRACES_DB && window.TRACES_DB.tablespaces) ? window.TRACES_DB.tablespaces : [
        { name: 'SYSTEM', status: 'ONLINE', totalMb: 2048, usedMb: 1740, autoextend: 'YES', datafiles: 1, pct: 85 },
        { name: 'SYSAUX', status: 'ONLINE', totalMb: 4096, usedMb: 2867, autoextend: 'YES', datafiles: 2, pct: 70 },
        { name: 'USERS', status: 'ONLINE', totalMb: 8192, usedMb: 3440, autoextend: 'YES', datafiles: 2, pct: 42 },
        { name: 'SALES_2026', status: 'ONLINE', totalMb: 32768, usedMb: 28835, autoextend: 'YES', datafiles: 4, pct: 88 },
        { name: 'UNDOTBS1', status: 'ONLINE', totalMb: 4096, usedMb: 940, autoextend: 'YES', datafiles: 1, pct: 23 },
        { name: 'TEMP', status: 'ONLINE', totalMb: 8192, usedMb: 1230, autoextend: 'YES', datafiles: 1, pct: 15 }
      ];
      return {
        tablespaces: tsList.map(t => ({
          name: t.name,
          status: t.status || 'ONLINE',
          totalMb: t.totalMb,
          usedMb: t.usedMb,
          freeMb: t.totalMb - t.usedMb,
          autoextend: t.autoextend || 'YES',
          datafiles: t.datafiles || 1,
          pct: t.pct || Math.round((t.usedMb / t.totalMb) * 100),
          ddl: `-- DDL for Tablespace ${t.name}\nCREATE TABLESPACE "${t.name}"\n  DATAFILE '+DATA/${t.name.toLowerCase()}.dbf' SIZE ${t.totalMb}M\n  AUTOEXTEND ON NEXT 128M MAXSIZE UNLIMITED\n  EXTENT MANAGEMENT LOCAL AUTOALLOCATE\n  SEGMENT SPACE MANAGEMENT AUTO;`,
          columns: [
            { id: 1, name: 'TABLESPACE_NAME', type: 'VARCHAR2(30)', nullable: 'N', defaultVal: t.name, pk: true, comments: 'Name of the tablespace' },
            { id: 2, name: 'TOTAL_SPACE_MB', type: 'NUMBER', nullable: 'N', defaultVal: `${t.totalMb} MB`, pk: false, comments: 'Allocated storage on disk' },
            { id: 3, name: 'USED_SPACE_MB', type: 'NUMBER', nullable: 'N', defaultVal: `${t.usedMb} MB`, pk: false, comments: 'Consumed storage by segments' },
            { id: 4, name: 'FREE_SPACE_MB', type: 'NUMBER', nullable: 'N', defaultVal: `${t.totalMb - t.usedMb} MB`, pk: false, comments: 'Available free extents' },
            { id: 5, name: 'AUTOEXTEND', type: 'VARCHAR2(3)', nullable: 'N', defaultVal: t.autoextend || 'YES', pk: false, comments: 'Autoextend enabled' },
            { id: 6, name: 'DATAFILES_COUNT', type: 'NUMBER', nullable: 'N', defaultVal: `${t.datafiles || 1}`, pk: false, comments: 'Number of physical data files' }
          ]
        }))
      };
    }

    if (this.currentCategory === 'users') {
      const uList = [
        { name: 'SYS', status: 'OPEN', defaultTs: 'SYSTEM', tempTs: 'TEMP' },
        { name: 'SYSTEM', status: 'OPEN', defaultTs: 'SYSTEM', tempTs: 'TEMP' },
        { name: 'HR', status: 'OPEN', defaultTs: 'USERS', tempTs: 'TEMP' },
        { name: 'SALES_ADMIN', status: 'OPEN', defaultTs: 'SALES_2026', tempTs: 'TEMP' },
        { name: 'SCOTT', status: 'OPEN', defaultTs: 'USERS', tempTs: 'TEMP' },
        { name: 'APEX_PUBLIC_USER', status: 'LOCKED', defaultTs: 'SYSAUX', tempTs: 'TEMP' }
      ];
      return {
        users: uList.map(u => ({
          name: u.name,
          status: u.status,
          ddl: `-- User definition\nCREATE USER "${u.name}" IDENTIFIED BY VALUES '...'\n  DEFAULT TABLESPACE "${u.defaultTs}"\n  TEMPORARY TABLESPACE "${u.tempTs}"\n  ACCOUNT ${u.status};`,
          columns: [
            { id: 1, name: 'USERNAME', type: 'VARCHAR2(30)', nullable: 'N', defaultVal: u.name, pk: true, comments: 'User or schema name' },
            { id: 2, name: 'ACCOUNT_STATUS', type: 'VARCHAR2(32)', nullable: 'N', defaultVal: u.status, pk: false, comments: 'Account status' },
            { id: 3, name: 'DEFAULT_TABLESPACE', type: 'VARCHAR2(30)', nullable: 'N', defaultVal: u.defaultTs, pk: false, comments: 'Default tablespace' },
            { id: 4, name: 'TEMPORARY_TABLESPACE', type: 'VARCHAR2(30)', nullable: 'N', defaultVal: u.tempTs, pk: false, comments: 'Temp tablespace' }
          ]
        }))
      };
    }

    if (window.TracesApp && window.TracesApp.isRealDatabase && this.realObjects) {
      return this.realObjects;
    }
    return window.TRACES_DB.schemas[this.currentSchema] || window.TRACES_DB.schemas['HR'] || { tables: [], views: [] };
  }

  render() {
    this.renderCategoryPills();
    if (this.navMode === 'drawers') {
      if (this.accordionContainer) this.accordionContainer.style.display = 'block';
      if (this.objectList) this.objectList.style.display = 'none';
      this.renderAccordionDrawers();
    } else {
      if (this.accordionContainer) this.accordionContainer.style.display = 'none';
      if (this.objectList) this.objectList.style.display = 'block';
      this.renderObjectList();
    }
  }

  setNavMode(mode) {
    this.navMode = mode;
    const btnDrawers = document.getElementById('btn-mode-drawers');
    const btnFlat = document.getElementById('btn-mode-flat');
    if (btnDrawers && btnFlat) {
      btnDrawers.style.background = mode === 'drawers' ? '#0284c7' : '';
      btnDrawers.style.color = mode === 'drawers' ? '#ffffff' : '';
      btnFlat.style.background = mode === 'flat' ? '#0284c7' : '';
      btnFlat.style.color = mode === 'flat' ? '#ffffff' : '';
    }

    if (this.accordionContainer) this.accordionContainer.style.display = mode === 'drawers' ? 'block' : 'none';
    if (this.objectList) this.objectList.style.display = mode === 'flat' ? 'block' : 'none';

    if (mode === 'drawers') {
      this.renderAccordionDrawers();
    } else {
      this.renderObjectList();
    }
  }

  toggleDrawer(catKey) {
    if (this.expandedDrawers.has(catKey)) {
      this.expandedDrawers.delete(catKey);
    } else {
      this.expandedDrawers.add(catKey);
    }
    this.renderAccordionDrawers();
  }

  renderAccordionDrawers() {
    if (!this.accordionContainer) return;
    const data = this.getSchemaData();

    const categories = [
      { key: 'tablespaces', label: 'Tablespaces', icon: '💾', count: (window.TRACES_DB && window.TRACES_DB.tablespaces) ? window.TRACES_DB.tablespaces.length : 6 },
      { key: 'users', label: 'Users', icon: '👥', count: 6 },
      { key: 'tables', label: 'Tables', icon: '📋', count: data.tables?.length || 0 },
      { key: 'views', label: 'Views', icon: '👁', count: data.views?.length || 0 },
      { key: 'packages', label: 'Packages', icon: '📦', count: data.packages?.length || 0 },
      { key: 'procedures', label: 'Procedures', icon: '⚙', count: data.procedures?.length || 0 },
      { key: 'functions', label: 'Functions', icon: 'ƒ', count: data.functions?.length || 0 },
      { key: 'triggers', label: 'Triggers', icon: '⚡', count: data.triggers?.length || 0 },
      { key: 'indexes', label: 'Indexes', icon: '🗂', count: data.indexes?.length || 0 },
      { key: 'sequences', label: 'Sequences', icon: '🔢', count: data.sequences?.length || 0 },
      { key: 'synonyms', label: 'Synonyms', icon: '🔗', count: data.synonyms?.length || 0 },
      { key: 'types', label: 'Types', icon: '🏷', count: data.types?.length || 0 }
    ];

    const html = categories.map(cat => {
      let items = (data[cat.key] || []);
      if (this.searchQuery) {
        items = items.filter(it => it.name.toLowerCase().includes(this.searchQuery));
      }

      const hasMatchingSearch = Boolean(this.searchQuery && items.length > 0);
      const isExpanded = hasMatchingSearch || this.expandedDrawers.has(cat.key);
      const isCurrentCat = this.currentCategory === cat.key;
      const isMasterForThisCat = isCurrentCat && this.selectedObject === null;

      return `
        <div class="toad-accordion-drawer ${isExpanded ? 'expanded' : ''}" data-cat="${cat.key}">
          <div class="toad-accordion-header" onclick="window.TracesApp.schemaBrowser.toggleDrawer('${cat.key}')">
            <div class="accordion-title-group">
              <span class="accordion-chevron">${isExpanded ? '▼' : '▶'}</span>
              <span><strong>${cat.icon} ${cat.label}</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="accordion-badge">${items.length}</span>
              <button class="btn" style="height: 18px; padding: 0 5px; font-size: 9px;" onclick="event.stopPropagation(); window.TracesApp.schemaBrowser.selectCategory('${cat.key}'); window.TracesApp.schemaBrowser.showMasterOverview();" title="Ver Dashboard de Todas">
                🌐
              </button>
            </div>
          </div>
          <div class="toad-accordion-body" style="${isExpanded ? 'display:block;' : 'display:none;'}">
            <!-- Item Mestre de Todas -->
            <div class="accordion-subitem master-overview-subitem ${isMasterForThisCat ? 'active' : ''}"
                 onclick="window.TracesApp.schemaBrowser.selectCategory('${cat.key}'); window.TracesApp.schemaBrowser.showMasterOverview();">
              <span>🌐 [ Ver Todas as ${cat.label} ]</span>
              <span style="font-size: 10px; font-weight: 700; color: ${isMasterForThisCat ? '#ffffff' : '#0284c7'};">Dashboard</span>
            </div>
            <!-- Subitens individuais -->
            ${items.map(item => {
              const isSel = isCurrentCat && this.selectedObject && this.selectedObject.name === item.name;
              return `
                <div class="accordion-subitem ${isSel ? 'active' : ''}"
                     onclick="window.TracesApp.schemaBrowser.selectCategory('${cat.key}'); window.TracesApp.schemaBrowser.selectObject('${item.name}');">
                  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px;" title="${item.name}">${item.name}</span>
                  <span style="font-size: 9px; opacity: 0.8;">${item.status || ''}</span>
                </div>
              `;
            }).join('')}
            ${items.length === 0 ? `
              <div style="padding: 6px 12px 6px 26px; font-size: 10px; color: #94a3b8; font-style: italic;">
                Nenhum objeto encontrado
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    this.accordionContainer.innerHTML = html;
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
      { key: 'synonyms', label: 'Synonyms', count: data.synonyms?.length || 0 },
      { key: 'triggers', label: 'Triggers', count: data.triggers?.length || 0 },
      { key: 'types', label: 'Types', count: data.types?.length || 0 },
      { key: 'indexes', label: 'Indexes', count: data.indexes?.length || 0 },
      { key: 'tablespaces', label: 'Tablespaces', count: (window.TRACES_DB && window.TRACES_DB.tablespaces) ? window.TRACES_DB.tablespaces.length : 6 },
      { key: 'users', label: 'Users', count: 6 }
    ];

    this.categoryScroller.innerHTML = categories.map(cat => `
      <div class="category-tab-pill ${this.currentCategory === cat.key ? 'active' : ''}" 
           onclick="window.TracesApp.schemaBrowser.selectCategory('${cat.key}')">
        <span>${cat.label}</span>
        <span class="category-count">${cat.count}</span>
      </div>
    `).join('');
  }

  toggleCategoryDrawer() {
    if (!this.categoryScroller) return;
    this.isCategoryDrawerOpen = !this.isCategoryDrawerOpen;
    this.categoryScroller.classList.toggle('drawer-hidden', !this.isCategoryDrawerOpen);
    const btn = document.getElementById('btn-toggle-cat-drawer');
    if (btn) {
      btn.style.background = this.isCategoryDrawerOpen ? '#0284c7' : '';
      btn.style.color = this.isCategoryDrawerOpen ? '#ffffff' : '';
    }
  }

  selectCategory(categoryKey) {
    this.currentCategory = categoryKey;
    this.selectedObject = null;
    this.expandedDrawers.add(categoryKey);
    if (this.categoryDropdown && this.categoryDropdown.value !== categoryKey) {
      this.categoryDropdown.value = categoryKey;
    }
    this.renderCategoryPills();
    if (this.navMode === 'drawers') {
      this.renderAccordionDrawers();
    } else {
      this.renderObjectList();
    }

    // Contextual tab switching
    if (['procedures', 'functions', 'packages', 'triggers', 'types'].includes(categoryKey)) {
      this.switchDetailTab('source');
    } else {
      this.switchDetailTab('columns');
    }

    // Default to the Master Overview ("antes de selecionar uma, mostra como estão todas")
    if (['tablespaces', 'users', 'tables'].includes(categoryKey)) {
      this.selectedObject = null;
      this.renderDetailContent();
      return;
    }

    // Auto-select first item of newly selected category immediately (0ms)
    const catItems = (this.getSchemaData()[this.currentCategory] || []).filter(obj => 
      obj.name.toLowerCase().includes(this.searchQuery)
    );
    if (catItems.length > 0) {
      this.selectObject(catItems[0].name);
    } else {
      this.renderDetailContent();
    }
  }

  renderObjectList() {
    const data = this.getSchemaData();
    const items = data[this.currentCategory] || [];

    const filtered = items.filter(obj => 
      obj.name.toLowerCase().includes(this.searchQuery)
    );

    // Master Overview top row for categories
    const isMaster = this.selectedObject === null;
    const catLabels = {
      tablespaces: 'Todas as Tablespaces',
      users: 'Todos os Usuários',
      tables: 'Todas as Tabelas',
      views: 'Todas as Views'
    };
    const masterLabel = catLabels[this.currentCategory] || `Todos os ${this.currentCategory}`;
    const masterRow = `
      <div class="object-item ${isMaster ? 'active' : ''}"
           style="background: ${isMaster ? '#e0f2fe' : '#f8fafc'}; font-weight: 700; border-bottom: 2px solid #cbd5e1;"
           onclick="window.TracesApp.schemaBrowser.showMasterOverview()">
        <div class="object-item-left">
          <span style="font-size: 13px;">🌐</span>
          <span style="color: #0284c7;">[ ${masterLabel} ]</span>
        </div>
        <span class="category-count" style="background: #0284c7; color: #fff;">${items.length}</span>
      </div>
    `;

    if (filtered.length === 0) {
      this.objectList.innerHTML = masterRow + `
        <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 11px;">
          Nenhum objeto "${this.currentCategory}" encontrado com "${this.searchQuery}"
        </div>
      `;
      return;
    }

    const itemRows = filtered.map(obj => `
      <div class="object-item ${(!isMaster && this.selectedObject?.name === obj.name) ? 'active' : ''}"
           onclick="window.TracesApp.schemaBrowser.selectObject('${obj.name}')">
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
    `).join('');

    this.objectList.innerHTML = masterRow + itemRows;
  }

  showMasterOverview() {
    this.selectedObject = null;
    if (this.navMode === 'drawers') {
      this.renderAccordionDrawers();
    } else {
      this.renderObjectList();
    }
    this.renderDetailContent();
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
      case 'synonyms':
        return '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9h6v6"/>';
      case 'triggers':
        return '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>';
      case 'types':
        return '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>';
      case 'indexes':
        return '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>';
      case 'tablespaces':
        return '<path d="M4 6h16M4 12h16M4 18h16"/><rect x="2" y="3" width="20" height="18" rx="2"/>';
      case 'users':
        return '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>';
      default:
        return '<circle cx="12" cy="12" r="10"/>';
    }
  }

  async selectObject(objectName) {
    const data = this.getSchemaData();
    const items = data[this.currentCategory] || [];
    this.selectedObject = items.find(o => o.name === objectName) || { name: objectName };

    // Update active highlight in list immediately
    if (this.objectList) {
      const allItems = this.objectList.querySelectorAll('.object-item');
      allItems.forEach(el => el.classList.remove('active'));
      const matched = Array.from(allItems).find(el => el.textContent.includes(objectName));
      if (matched) matched.classList.add('active');
    }

    if (this.accordionContainer) {
      const allSubitems = this.accordionContainer.querySelectorAll('.accordion-subitem');
      allSubitems.forEach(el => el.classList.remove('active'));
      const matchedSub = Array.from(allSubitems).find(el => el.textContent.trim().startsWith(objectName));
      if (matchedSub) matchedSub.classList.add('active');
    }

    // Update detail pane header with breadcrumb button
    this.detailTitle.innerHTML = `
      <button class="btn btn-secondary" style="height: 20px; font-size: 10px; padding: 0 6px; margin-right: 6px;" onclick="window.TracesApp.schemaBrowser.showMasterOverview()">
        🌐 Ver Todos
      </button>
      <span>${this.currentSchema}.${this.selectedObject.name}</span>
    `;
    this.detailTypePill.textContent = this.currentCategory.slice(0, -1).toUpperCase();

    // Check in-memory details cache (0ms instant response!)
    const cacheKey = `${this.currentSchema}.${this.currentCategory}.${objectName}`;
    if (this.objectDetailsCache && this.objectDetailsCache.has(cacheKey)) {
      this.selectedObject = Object.assign(this.selectedObject, this.objectDetailsCache.get(cacheKey));
      this.renderDetailContent();
      return;
    }

    // If connected to real Oracle DB and not mock category, fetch live details
    if (window.TracesApp && window.TracesApp.isRealDatabase && !['tablespaces', 'users'].includes(this.currentCategory)) {
      await this.fetchRealObjectDetails(this.currentSchema, objectName, this.currentCategory);
    } else {
      this.renderDetailContent();
    }
  }

  async fetchRealObjectDetails(schema, name, category) {
    this.isLoadingDetails = true;
    const catTypeMap = {
      tables: 'TABLE',
      views: 'VIEW',
      packages: 'PACKAGE',
      procedures: 'PROCEDURE',
      functions: 'FUNCTION',
      sequences: 'SEQUENCE',
      synonyms: 'SYNONYM',
      triggers: 'TRIGGER',
      types: 'TYPE',
      indexes: 'INDEX'
    };
    const objType = catTypeMap[category] || 'TABLE';

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
      const resp = await fetch(`/api/object-details?schema=${encodeURIComponent(schema)}&name=${encodeURIComponent(name)}&type=${encodeURIComponent(objType)}`);
      const details = await resp.json();

      if (details.error) {
        window.TracesApp.notify(`Erro ao obter detalhes de ${name}: ${details.error}`, 'error');
        this.isLoadingDetails = false;
        return;
      }

      // Cache details in memory
      const cacheKey = `${schema}.${category}.${name}`;
      if (this.objectDetailsCache) {
        this.objectDetailsCache.set(cacheKey, details);
      }

      // Merge into selectedObject
      this.selectedObject = Object.assign(this.selectedObject, details);
      this.isLoadingDetails = false;
      this.renderDetailContent();
    } catch (err) {
      this.isLoadingDetails = false;
      console.warn('Real object details fetch error:', err);
      this.renderDetailContent();
    }
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
    if (!this.selectedObject) {
      this.renderMasterCategoryOverview(this.currentCategory);
      return;
    }
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
            <span>Exibindo ${obj.data.length} registros (amostra ao vivo de ${this.currentSchema}.${obj.name})</span>
            <div style="display: flex; gap: 8px;">
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
                <th>Tablespace</th>
                <th>Clustering Factor</th>
                <th>Status</th>
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
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        idxPane.innerHTML = `<div style="padding: 28px; color: var(--text-muted); text-align: center;">Nenhum índice definido para ${obj.name}.</div>`;
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
                <th>Columns</th>
                <th>Details / Condition</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${obj.constraints.map(cn => `
                <tr>
                  <td style="font-weight: 600; font-family: var(--font-code);">${cn.name}</td>
                  <td style="color: var(--syntax-keyword); font-weight: 700;">${cn.type}</td>
                  <td style="color: var(--text-primary); font-family: var(--font-code);">${cn.columns || '-'}</td>
                  <td style="color: var(--text-secondary); font-size: 11px;">${cn.details || '-'}</td>
                  <td><span class="status-indicator valid">${cn.status || 'ENABLED'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        constrPane.innerHTML = `<div style="padding: 28px; color: var(--text-muted); text-align: center;">Nenhuma constraint definida para ${obj.name}.</div>`;
      }
    }

    // 5. DDL Script Pane
    const ddlPane = document.getElementById('tab-pane-ddl');
    if (ddlPane) {
      const ddlCode = obj.ddl || obj.specDdl || `-- DDL extraction for ${this.currentSchema}.${obj.name}`;
      ddlPane.innerHTML = `
        <div style="display: flex; justify-content: flex-end; padding: 6px 12px; background: var(--bg-surface); border-bottom: 1px solid var(--border-default);">
          <button class="btn btn-secondary" style="height: 24px; padding: 0 8px; font-size: 11px;" onclick="navigator.clipboard.writeText(document.getElementById('ddl-code-block').textContent); window.TracesApp.notify('DDL copiado para a área de transferência', 'info');">
            Copiar DDL
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

    // 7. Grants Pane
    const grantsPane = document.getElementById('tab-pane-grants');
    if (grantsPane) {
      if (obj.grants && obj.grants.length > 0) {
        grantsPane.innerHTML = `
          <table class="meta-table">
            <thead>
              <tr>
                <th>Grantee</th>
                <th>Privilege</th>
                <th>Grantable</th>
              </tr>
            </thead>
            <tbody>
              ${obj.grants.map(g => `
                <tr>
                  <td style="font-weight: 600; color: #0078d7; font-family: var(--font-code);">${g.grantee}</td>
                  <td style="font-weight: 700;">${g.privilege}</td>
                  <td>${g.grantable === 'YES' ? '<span style="color:#008000; font-weight:700;">YES</span>' : 'NO'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        grantsPane.innerHTML = `<div style="padding: 28px; color: var(--text-muted); text-align: center;">Nenhum privilégio específico concedido em ${obj.name}.</div>`;
      }
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
        depPane.innerHTML = `
          <table class="meta-table">
            <thead>
              <tr>
                <th>Referenced Owner</th>
                <th>Referenced Object</th>
                <th>Object Type</th>
                <th>DB Link</th>
              </tr>
            </thead>
            <tbody>
              ${obj.dependencies.map(d => `
                <tr>
                  <td style="font-weight: 600; color: #0078d7;">${d.referencedOwner}</td>
                  <td style="font-weight: 600; font-family: var(--font-code);">${d.referencedName}</td>
                  <td style="color: var(--syntax-keyword);">${d.referencedType}</td>
                  <td style="color: var(--text-muted);">${d.link || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        depPane.innerHTML = `<div style="padding: 28px; color: var(--text-muted); text-align: center;">Nenhuma dependência encontrada para ${obj.name}.</div>`;
      }
    }
  }

  renderMasterCategoryOverview(category) {
    if (this.detailTitle) {
      const catTitles = {
        tablespaces: '💾 Visão Geral de Todas as Tablespaces do Banco',
        users: '👥 Visão Geral de Todos os Usuários do Banco',
        tables: `📋 Visão Geral de Todas as Tabelas de "${this.currentSchema}"`
      };
      this.detailTitle.innerHTML = `<span style="color: #0284c7; font-weight: 700;">${catTitles[category] || `🌐 Visão Geral de Todos (${category.toUpperCase()})`}</span>`;
    }
    if (this.detailTypePill) {
      this.detailTypePill.textContent = 'OVERVIEW';
    }

    const panes = document.querySelectorAll('.detail-tab-pane');
    panes.forEach(p => p.classList.remove('active'));
    let activePane = document.getElementById('tab-pane-columns');
    if (!activePane && panes.length > 0) activePane = panes[0];
    if (activePane) activePane.classList.add('active');

    // Activate the first tab header (Columns / Overview)
    this.detailTabs.forEach((t, idx) => {
      t.classList.toggle('active', idx === 0);
    });

    if (category === 'tablespaces') {
      const tsList = (window.TRACES_DB && window.TRACES_DB.tablespaces) ? window.TRACES_DB.tablespaces : [
        { name: 'SYSTEM', status: 'ONLINE', totalMb: 2048, usedMb: 1740, autoextend: 'YES', datafiles: 1, pct: 85 },
        { name: 'SYSAUX', status: 'ONLINE', totalMb: 4096, usedMb: 2867, autoextend: 'YES', datafiles: 2, pct: 70 },
        { name: 'USERS', status: 'ONLINE', totalMb: 8192, usedMb: 3440, autoextend: 'YES', datafiles: 2, pct: 42 },
        { name: 'SALES_2026', status: 'ONLINE', totalMb: 32768, usedMb: 28835, autoextend: 'YES', datafiles: 4, pct: 88 },
        { name: 'UNDOTBS1', status: 'ONLINE', totalMb: 4096, usedMb: 940, autoextend: 'YES', datafiles: 1, pct: 23 },
        { name: 'TEMP', status: 'ONLINE', totalMb: 8192, usedMb: 1230, autoextend: 'YES', datafiles: 1, pct: 15 }
      ];

      const totalMb = tsList.reduce((acc, t) => acc + (t.totalMb || 0), 0);
      const usedMb = tsList.reduce((acc, t) => acc + (t.usedMb || 0), 0);
      const freeMb = totalMb - usedMb;
      const globalPct = totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0;

      activePane.innerHTML = `
        <div class="master-overview-container">
          <div class="master-overview-banner-sb">
            <div>
              <div class="master-overview-title-sb">💾 Visão Geral de Todas as Tablespaces do Banco de Dados (DBA_TABLESPACES)</div>
              <div class="master-overview-desc-sb">Capacidade total de disco, espaço consumido por segmentos e disponibilidade de arquivos de dados.</div>
            </div>
            <button class="btn btn-primary" style="height: 24px; font-size: 11px;" onclick="window.TracesApp.openObjectInWorksheet('DBA_TABLESPACES')">
              Consultar no Editor (F9)
            </button>
          </div>

          <div class="master-category-kpi-row">
            <div class="ts-summary-card">
              <span class="ts-card-label">Armazenamento Total</span>
              <span class="ts-card-value">${(totalMb / 1024).toFixed(1)} GB (${totalMb.toLocaleString()} MB)</span>
            </div>
            <div class="ts-summary-card">
              <span class="ts-card-label">Espaço Ocupado</span>
              <span class="ts-card-value" style="color: #0284c7;">${(usedMb / 1024).toFixed(1)} GB (${usedMb.toLocaleString()} MB)</span>
            </div>
            <div class="ts-summary-card">
              <span class="ts-card-label">Espaço Livre</span>
              <span class="ts-card-value" style="color: #059669;">${(freeMb / 1024).toFixed(1)} GB (${freeMb.toLocaleString()} MB)</span>
            </div>
            <div class="ts-summary-card">
              <span class="ts-card-label">Ocupação Global</span>
              <span class="ts-card-value" style="color: ${globalPct >= 85 ? '#dc2626' : (globalPct >= 70 ? '#d97706' : '#059669')};">${globalPct}%</span>
            </div>
          </div>

          <div class="ts-section-title" style="margin-bottom: 8px;">
            <span>Status e Capacidade de Todas as Tablespaces (Clique em uma linha para ver detalhes)</span>
            <span style="font-size: 10px; font-weight: normal; color: #64748b;">${tsList.length} Tablespaces Online</span>
          </div>

          <table class="master-grid-interactive">
            <thead>
              <tr>
                <th>Tablespace</th>
                <th>Status</th>
                <th>Tipo</th>
                <th style="text-align: right;">Total (MB)</th>
                <th style="text-align: right;">Used (MB)</th>
                <th style="text-align: right;">Free (MB)</th>
                <th style="width: 140px;">% Used</th>
                <th style="text-align: center;">Datafiles</th>
                <th style="text-align: center;">Autoextend</th>
                <th style="text-align: center;">Ação</th>
              </tr>
            </thead>
            <tbody>
              ${tsList.map(ts => {
                const pct = ts.pct || Math.round(((ts.usedMb || 0) / (ts.totalMb || 1)) * 100);
                let barClass = 'green';
                if (pct >= 85) barClass = 'red';
                else if (pct >= 70) barClass = 'amber';

                return `
                  <tr onclick="window.TracesApp.schemaBrowser.selectObject('${ts.name}')">
                    <td style="font-weight: 700; color: #0284c7;">${ts.name}</td>
                    <td><span class="session-status-badge active">${ts.status || 'ONLINE'}</span></td>
                    <td style="color: #64748b;">${ts.name === 'TEMP' ? 'TEMPORARY' : (ts.name === 'UNDOTBS1' ? 'UNDO' : 'PERMANENT')}</td>
                    <td style="text-align: right;">${(ts.totalMb || 0).toLocaleString()} MB</td>
                    <td style="text-align: right; font-weight: 600;">${(ts.usedMb || 0).toLocaleString()} MB</td>
                    <td style="text-align: right; color: #059669;">${(ts.freeMb || (ts.totalMb - ts.usedMb) || 0).toLocaleString()} MB</td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="ts-progress-track">
                          <div class="ts-progress-fill ${barClass}" style="width: ${pct}%;"></div>
                        </div>
                        <span style="font-size: 10px; font-weight: 700; width: 34px; text-align: right;">${pct}%</span>
                      </div>
                    </td>
                    <td style="text-align: center; font-weight: 600;">${ts.datafiles || 1}</td>
                    <td style="text-align: center;"><span class="session-status-badge active">${ts.autoextend || 'YES'}</span></td>
                    <td style="text-align: center;">
                      <button class="drilldown-btn" onclick="event.stopPropagation(); window.TracesApp.schemaBrowser.selectObject('${ts.name}')">
                        🔍 Inspecionar
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    if (category === 'users') {
      const uList = [
        { name: 'SYS', status: 'OPEN', defaultTs: 'SYSTEM', tempTs: 'TEMP', profile: 'DEFAULT' },
        { name: 'SYSTEM', status: 'OPEN', defaultTs: 'SYSTEM', tempTs: 'TEMP', profile: 'DEFAULT' },
        { name: 'HR', status: 'OPEN', defaultTs: 'USERS', tempTs: 'TEMP', profile: 'DEFAULT' },
        { name: 'SALES_ADMIN', status: 'OPEN', defaultTs: 'SALES_2026', tempTs: 'TEMP', profile: 'DEFAULT' },
        { name: 'SCOTT', status: 'OPEN', defaultTs: 'USERS', tempTs: 'TEMP', profile: 'DEFAULT' },
        { name: 'APEX_PUBLIC_USER', status: 'LOCKED', defaultTs: 'SYSAUX', tempTs: 'TEMP', profile: 'DEFAULT' }
      ];

      activePane.innerHTML = `
        <div class="master-overview-container">
          <div class="master-overview-banner-sb">
            <div>
              <div class="master-overview-title-sb">👥 Visão Geral de Todos os Usuários do Banco (DBA_USERS)</div>
              <div class="master-overview-desc-sb">Catálogo de contas de schemas, privilégios de conexão e tablespaces atribuídas.</div>
            </div>
            <button class="btn btn-primary" style="height: 24px; font-size: 11px;" onclick="window.TracesApp.openObjectInWorksheet('DBA_USERS')">
              Consultar no Editor (F9)
            </button>
          </div>

          <div class="master-category-kpi-row">
            <div class="ts-summary-card"><span class="ts-card-label">Total de Usuários</span><span class="ts-card-value">${uList.length}</span></div>
            <div class="ts-summary-card"><span class="ts-card-label">Contas Abertas</span><span class="ts-card-value" style="color: #059669;">${uList.filter(u => u.status === 'OPEN').length}</span></div>
            <div class="ts-summary-card"><span class="ts-card-label">Contas Bloqueadas</span><span class="ts-card-value" style="color: #dc2626;">${uList.filter(u => u.status === 'LOCKED').length}</span></div>
            <div class="ts-summary-card"><span class="ts-card-label">Schema Ativo</span><span class="ts-card-value" style="color: #0284c7;">${this.currentSchema}</span></div>
          </div>

          <div class="ts-section-title" style="margin-bottom: 8px;">
            <span>Usuários Registrados na Instância (Clique em uma linha para ver privilégios e cotas)</span>
          </div>

          <table class="master-grid-interactive">
            <thead>
              <tr>
                <th>Username</th>
                <th>Status da Conta</th>
                <th>Default Tablespace</th>
                <th>Temporary Tablespace</th>
                <th>Profile</th>
                <th style="text-align: center;">Ação</th>
              </tr>
            </thead>
            <tbody>
              ${uList.map(u => `
                <tr onclick="window.TracesApp.schemaBrowser.selectObject('${u.name}')">
                  <td style="font-weight: 700; color: #0284c7;">${u.name}</td>
                  <td><span class="session-status-badge ${u.status.toLowerCase()}">${u.status}</span></td>
                  <td style="font-weight: 600;">${u.defaultTs}</td>
                  <td style="color: #64748b;">${u.tempTs}</td>
                  <td>${u.profile}</td>
                  <td style="text-align: center;">
                    <button class="drilldown-btn" onclick="event.stopPropagation(); window.TracesApp.schemaBrowser.selectObject('${u.name}')">
                      🔍 Inspecionar
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    if (category === 'tables') {
      const tablesList = (this.getSchemaData().tables || []);
      const totalRows = tablesList.reduce((acc, t) => acc + (t.numRows || 0), 0);

      activePane.innerHTML = `
        <div class="master-overview-container">
          <div class="master-overview-banner-sb">
            <div>
              <div class="master-overview-title-sb">📋 Visão Geral de Todas as Tabelas de "${this.currentSchema}" (ALL_TABLES)</div>
              <div class="master-overview-desc-sb">Estatísticas do otimizador, número de linhas estimadas e alocação de tablespaces.</div>
            </div>
            <button class="btn btn-primary" style="height: 24px; font-size: 11px;" onclick="window.TracesApp.openObjectInWorksheet('ALL_TABLES')">
              Consultar no Editor (F9)
            </button>
          </div>

          <div class="master-category-kpi-row">
            <div class="ts-summary-card"><span class="ts-card-label">Total de Tabelas</span><span class="ts-card-value">${tablesList.length}</span></div>
            <div class="ts-summary-card"><span class="ts-card-label">Total de Linhas</span><span class="ts-card-value" style="color: #0284c7;">${totalRows.toLocaleString()}</span></div>
            <div class="ts-summary-card"><span class="ts-card-label">Schema Selecionado</span><span class="ts-card-value" style="color: #059669;">${this.currentSchema}</span></div>
          </div>

          <table class="master-grid-interactive">
            <thead>
              <tr>
                <th>Nome da Tabela</th>
                <th>Tablespace</th>
                <th style="text-align: right;">Linhas Estimadas</th>
                <th style="text-align: right;">Blocos</th>
                <th style="text-align: right;">Avg Row Len</th>
                <th>Última Análise</th>
                <th style="text-align: center;">Ação</th>
              </tr>
            </thead>
            <tbody>
              ${tablesList.map(t => `
                <tr onclick="window.TracesApp.schemaBrowser.selectObject('${t.name}')">
                  <td style="font-weight: 700; color: #0284c7;">${t.name}</td>
                  <td>${t.tablespace || 'USERS'}</td>
                  <td style="text-align: right; font-weight: 600;">${(t.numRows || 0).toLocaleString()}</td>
                  <td style="text-align: right;">${t.blocks || '-'}</td>
                  <td style="text-align: right;">${t.avgRowLen ? t.avgRowLen + ' B' : '-'}</td>
                  <td style="font-size: 10px; color: #64748b;">${t.lastAnalyzed || 'Recente'}</td>
                  <td style="text-align: center;">
                    <button class="drilldown-btn" onclick="event.stopPropagation(); window.TracesApp.schemaBrowser.selectObject('${t.name}')">
                      🔍 Estrutura &amp; Dados
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    // Default for other categories (views, packages, procedures, etc.)
    const catItems = (this.getSchemaData()[category] || []);
    activePane.innerHTML = `
      <div class="master-overview-container">
        <div class="master-overview-banner-sb">
          <div>
            <div class="master-overview-title-sb">🌐 Visão Geral de Todos os Objetos: ${category.toUpperCase()} (${this.currentSchema})</div>
            <div class="master-overview-desc-sb">Catálogo de objetos registrados e status de compilação.</div>
          </div>
        </div>

        <table class="master-grid-interactive">
          <thead>
            <tr>
              <th>Nome do Objeto</th>
              <th>Status</th>
              <th>Schema Owner</th>
              <th style="text-align: center;">Ação</th>
            </tr>
          </thead>
          <tbody>
            ${catItems.map(o => `
              <tr onclick="window.TracesApp.schemaBrowser.selectObject('${o.name}')">
                <td style="font-weight: 700; color: #0284c7;">${o.name}</td>
                <td><span class="session-status-badge ${o.status ? o.status.toLowerCase() : 'valid'}">${o.status || 'VALID'}</span></td>
                <td>${this.currentSchema}</td>
                <td style="text-align: center;">
                  <button class="drilldown-btn" onclick="event.stopPropagation(); window.TracesApp.schemaBrowser.selectObject('${o.name}')">
                    🔍 Abrir Objeto
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
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

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.SchemaBrowser = SchemaBrowser;
