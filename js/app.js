/* ==========================================================================
   TRACES ORACLE STUDIO - APPLICATION CONTROLLER & BOOTSTRAP
   ========================================================================== */

class TracesApp {
  constructor() {
    window.TracesApp = this;
    this.currentView = 'editor';
    this.isRealDatabase = false;
    this.realDatabaseConfig = null;
    this.init();
  }

  init() {
    try {
      // 1. Connection & Modals
      this.connectionManager = new ConnectionManager();
      this.toadModals = new ToadModals();

      // 2. Core Functional Modules
      this.schemaBrowser = new SchemaBrowser();
      this.dataGrid = new DataGrid();
      this.sqlEditor = new SqlEditor();
      this.explainPlan = new ExplainPlan();
      this.sessionMonitor = new SessionMonitor();
      this.ruleAuditor = new RuleAuditor();
      this.databaseProbe = new DatabaseProbe();
      this.tracesCopilot = new TracesCopilot();

      // 3. Advanced Suite Modules
      this.spotlightOracle = new SpotlightOracle();
      this.dataModeler = new DataModeler();
      this.dbaTools = new DbaTools();
      this.codeQuality = new CodeQuality();
      this.automationDesigner = new AutomationDesigner();
      this.sqlOptimizer = new SqlOptimizer();

      // 4. Menu engine (initialized after all target components are ready)
      this.toadMenus = new ToadMenus();

      // 5. Navigation & Shortcuts
      this.bindDockNavigation();
      this.bindGlobalShortcuts();
      this.initSplitter();

      // 6. Check Real Bridge Status
      this.checkRealBridgeStatus();

      this.notify('Toad for Oracle 2026 (Traces Edition) initialized. Ready.', 'success');
    } catch (err) {
      console.error('TracesApp initialization error:', err);
    }
  }

  async checkRealBridgeStatus() {
    try {
      const resp = await fetch('/api/status');
      const data = await resp.json();
      if (data.connection && data.connection.status === 'CONNECTED') {
        this.isRealDatabase = true;
        this.realDatabaseConfig = data.connection.config;
        const cfg = data.connection.config;
        const titleEl = document.getElementById('toad-window-title');
        if (titleEl) {
          titleEl.textContent = `Toad for Oracle - [REAL ORACLE: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.service_name}]`;
        }
        const dbVerEl = document.getElementById('status-db-version');
        const userEl = document.getElementById('status-db-user');
        if (dbVerEl && data.connection.banner) dbVerEl.textContent = data.connection.banner.split('\n')[0];
        if (userEl) userEl.textContent = `${cfg.user}@${cfg.service_name}`;
      }
    } catch (e) {
      // Bridge server offline or starting
    }
  }

  bindDockNavigation() {
    const tabs = document.querySelectorAll('.toad-window-tab[data-view], .dock-item[data-view]');
    tabs.forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        this.switchDockView(view);
      });
    });
  }

  switchDockView(viewKey, subtabKey = null) {
    this.currentView = viewKey;

    // Update MDI tabs highlight
    document.querySelectorAll('.toad-window-tab[data-view], .dock-item[data-view]').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewKey);
    });

    // Update workspace views
    document.querySelectorAll('.workspace-view').forEach(v => {
      v.classList.toggle('active', v.id === `view-${viewKey}`);
    });

    // If subtab provided, route to component
    if (subtabKey) {
      if (viewKey === 'dba' && this.dbaTools) this.dbaTools.switchSubtab(subtabKey);
      if (viewKey === 'profiler' && this.codeQuality) this.codeQuality.switchSubtab(subtabKey);
    }

    // Update Window Titlebar
    const titleEl = document.getElementById('toad-window-title');
    if (titleEl) {
      const conn = this.connectionManager ? this.connectionManager.getActive() : { user: 'SYSTEM', serviceName: 'sales_prod.db.corp' };
      const titles = {
        'editor': `Toad for Oracle - [Editor (${conn.user}@${conn.serviceName})]`,
        'browser': `Toad for Oracle - [Schema Browser (${conn.user}@${conn.serviceName})]`,
        'explain': `Toad for Oracle - [Explain Plan (${conn.user}@${conn.serviceName})]`,
        'sessions': `Toad for Oracle - [Session Browser (${conn.user}@${conn.serviceName})]`,
        'probe': `Toad for Oracle - [Database Probe (${conn.user}@${conn.serviceName})]`,
        'rules': `Toad for Oracle - [Rule Universe (${conn.user}@${conn.serviceName})]`,
        'spotlight': `Toad for Oracle - [Spotlight on Oracle (${conn.user}@${conn.serviceName})]`,
        'modeler': `Toad for Oracle - [Toad Data Modeler & Query Builder]`,
        'dba': `Toad for Oracle - [DBA Administration Hub (${conn.user}@${conn.serviceName})]`,
        'optimizer': `Toad for Oracle - [Quest SQL Optimizer (${conn.user}@${conn.serviceName})]`,
        'automation': `Toad for Oracle - [Automation Designer (App Designer)]`,
        'profiler': `Toad for Oracle - [PL/SQL Profiler & Code Analysis]`
      };
      titleEl.textContent = titles[viewKey] || `Toad for Oracle - [${viewKey.toUpperCase()}]`;
    }

    // Component-specific hooks on switch
    if (viewKey === 'sessions' && this.sessionMonitor) {
      this.sessionMonitor.renderGauges();
    }
  }

  bindGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Global F9: Run statement in editor
      if (e.key === 'F9') {
        e.preventDefault();
        this.switchDockView('editor');
        this.sqlEditor.executeStatement();
      }
      // Global F5: Run script in editor
      else if (e.key === 'F5') {
        e.preventDefault();
        this.switchDockView('editor');
        this.sqlEditor.executeScript();
      }
      // Global Ctrl+Enter: Execute at cursor
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.switchDockView('editor');
        this.sqlEditor.executeStatement();
      }
      // Global F4: Toad Describe Object
      else if (e.key === 'F4') {
        e.preventDefault();
        this.toadModals.openDescribe();
      }
      // Global F8: SQL Recall
      else if (e.key === 'F8') {
        e.preventDefault();
        this.toadModals.openSqlRecall();
      }
      // Global F11: Commit
      else if (e.key === 'F11' && !e.shiftKey) {
        e.preventDefault();
        this.sqlEditor.commitTransaction();
      }
      // Global Shift+F11: Rollback
      else if (e.key === 'F11' && e.shiftKey) {
        e.preventDefault();
        this.sqlEditor.rollbackTransaction();
      }
      // Global Ctrl+E / Cmd+E: Explain Plan
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        this.switchDockView('explain');
        this.explainPlan.generatePlan(this.sqlEditor.textarea.value);
      }
      // Global Ctrl+B / Cmd+B: Schema Browser
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.switchDockView('browser');
      }
      // Global Ctrl+Shift+F: Format Code
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        this.sqlEditor.formatSql();
      }
    });
  }

  initSplitter() {
    const splitter = document.getElementById('editor-pane-splitter');
    const upper = document.getElementById('editor-upper-pane');
    const lower = document.getElementById('editor-lower-pane');
    if (!splitter || !upper || !lower) return;

    let isDragging = false;
    let startY = 0;
    let startLowerHeight = 0;

    splitter.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startLowerHeight = lower.offsetHeight;
      splitter.classList.add('dragging');
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dy = startY - e.clientY;
      const newHeight = Math.max(120, Math.min(window.innerHeight - 250, startLowerHeight + dy));
      lower.style.height = `${newHeight}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        splitter.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  openObjectInWorksheet(objectName) {
    this.switchDockView('editor');
    const sql = `SELECT * FROM ${this.schemaBrowser.currentSchema}.${objectName};`;
    this.sqlEditor.textarea.value = sql;
    this.sqlEditor.saveActiveTabContent();
    this.sqlEditor.updateHighlighting();
    this.sqlEditor.updateGutter();
    this.sqlEditor.executeStatement();
  }

  applyOptimizerHint(hintText) {
    this.switchDockView('editor');
    let sql = this.sqlEditor.textarea.value;
    if (sql.includes('SELECT')) {
      sql = sql.replace(/SELECT\s+/i, `SELECT ${hintText} `);
      this.sqlEditor.textarea.value = sql;
      this.sqlEditor.saveActiveTabContent();
      this.sqlEditor.updateHighlighting();
      this.notify(`Applied hint ${hintText} to SQL Worksheet.`, 'success');
    }
  }

  notify(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '✕';
    else if (type === 'warning') icon = '⚠';

    toast.innerHTML = `
      <span style="font-weight: 700; font-size: 14px;">${icon}</span>
      <span style="flex: 1;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, 3800);
  }
}

// Global bootstrap
window.TracesAppClass = TracesApp;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TracesApp;
}

window.addEventListener('DOMContentLoaded', () => {
  window.TracesApp = new TracesApp();
});
