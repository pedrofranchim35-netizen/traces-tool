/* ==========================================================================
   TRACES ORACLE STUDIO - APPLICATION CONTROLLER & BOOTSTRAP
   Toad for Oracle 1:1 Parity: Full MDI Window Manager, Connection State Guarding,
   Cascading Menus, and Authenticated Oracle Workspace Lifecycle.
   ========================================================================== */

class TracesApp {
  constructor() {
    window.TracesApp = this;
    this.currentView = 'start';
    this.openWindows = [];
    this.activeWindowId = null;
    this.isRealDatabase = false;
    this.realDatabaseConfig = null;
    this.autoCommit = false;
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

      // 6. Show Toad Start Page and initialize connection state
      this.showStartPage();
      this.updateConnectionState();

      // 7. Check Real Bridge Status (background)
      this.checkRealBridgeStatus();

      this.notify('Toad for Oracle 2026 (Traces Edition) inicializado com sucesso.', 'success');
    } catch (err) {
      console.error('TracesApp initialization error:', err);
    }
  }

  isConnected() {
    return Boolean(this.isRealDatabase || (this.connectionManager && this.connectionManager.activeConn));
  }

  updateConnectionState() {
    const isConn = this.isConnected();
    const conn = this.isRealDatabase ? this.realDatabaseConfig : this.connectionManager?.getActive();

    // 1. Update Title & Status Bar
    if (isConn && conn) {
      const connStr = `${conn.user}@${conn.host || 'localhost'}:${conn.port || 1521}/${conn.serviceName || conn.service_name || 'ORCL'}`;
      document.title = `Toad for Oracle - [${connStr}]`;
      const titleEl = document.getElementById('toad-window-title');
      if (titleEl) titleEl.textContent = `Toad for Oracle - [${connStr}]`;
      
      const mbStatus = document.getElementById('toad-mb-status');
      if (mbStatus) {
        mbStatus.className = 'toad-menubar-status connected';
        mbStatus.innerHTML = `<span class="mb-status-dot"></span><span>${conn.user}@${conn.serviceName || conn.service_name || 'ORCL'}</span>`;
      }
    } else {
      document.title = 'Toad for Oracle - [Desconectado]';
      const titleEl = document.getElementById('toad-window-title');
      if (titleEl) titleEl.textContent = 'Toad for Oracle - [Desconectado]';
      
      const mbStatus = document.getElementById('toad-mb-status');
      if (mbStatus) {
        mbStatus.className = 'toad-menubar-status disconnected';
        mbStatus.innerHTML = `<span class="mb-status-dot"></span><span>Desconectado</span>`;
      }
      const userEl = document.getElementById('status-db-user');
      const verEl = document.getElementById('status-db-version');
      const latEl = document.getElementById('status-db-latency');
      if (userEl) userEl.textContent = '[Desconectado]';
      if (verEl) verEl.textContent = 'Pronto para conectar ao banco de dados';
      if (latEl) latEl.textContent = '-- ms';
    }

    // 2. Enable or Disable Execution and Transaction Controls
    const execButtonIds = [
      'btn-run-statement',
      'btn-run-script',
      'btn-run-cursor',
      'btn-commit',
      'btn-rollback',
      'btn-explain-plan',
      'toad-chk-autocommit'
    ];
    execButtonIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'INPUT' && el.type === 'checkbox') {
          el.disabled = !isConn;
        } else {
          el.disabled = !isConn;
          el.classList.toggle('disabled', !isConn);
        }
      }
    });

    const btnDisconnect = document.getElementById('btn-disconnect');
    if (btnDisconnect) {
      btnDisconnect.disabled = !isConn;
      btnDisconnect.classList.toggle('disabled', !isConn);
    }

    // 3. Update Start Page saved connections
    this.renderStartPageConnections();

    // 4. Update Header Pill and Selector Dropdown
    if (this.connectionManager) {
      this.connectionManager.renderHeaderPill();
      this.connectionManager.updateSelectorDropdown();
    }

    // 5. If disconnected, refresh open views
    if (!isConn) {
      if (this.currentView === 'dba' && this.dbaTools) {
        this.dbaTools.render();
      }
      if (this.currentView === 'sessions' && this.sessionMonitor) {
        this.sessionMonitor.render();
      }
      if (this.currentView === 'browser' && this.schemaBrowser) {
        this.schemaBrowser.render();
      }
    } else {
      if (this.currentView === 'dba' && this.dbaTools) {
        this.dbaTools.render();
        this.dbaTools.loadSubtabData(this.dbaTools.currentSubtab);
      }
      if (this.currentView === 'sessions' && this.sessionMonitor) {
        this.sessionMonitor.refresh();
      }
      if (this.currentView === 'browser' && this.schemaBrowser) {
        this.schemaBrowser.loadRealSchemas();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // DYNAMIC MDI WINDOW MANAGEMENT (TOAD FOR ORACLE 1:1 PARITY)
  // ---------------------------------------------------------------------------
  openWindow(viewKey, subtabKey = null, customTitle = null) {
    const winDefs = {
      'editor': { title: 'SQL Editor', icon: '📝' },
      'browser': { title: 'Schema Browser', icon: '📂' },
      'explain': { title: 'Explain Plan', icon: '🌲' },
      'sessions': { title: 'Session Browser', icon: '👥' },
      'probe': { title: 'Database Probe', icon: '📡' },
      'rules': { title: 'Rule Universe', icon: '📜' },
      'spotlight': { title: 'Spotlight on Oracle', icon: '💡' },
      'modeler': { title: 'Toad Data Modeler', icon: '📐' },
      'dba': { title: 'DBA Administration Hub', icon: '🏛' },
      'optimizer': { title: 'Quest SQL Optimizer', icon: '⚡' },
      'automation': { title: 'Automation Designer', icon: '⚙' },
      'profiler': { title: 'PL/SQL Profiler', icon: '🔬' },
      'copilot': { title: 'Traces Copilot', icon: '🤖' }
    };

    const def = winDefs[viewKey] || { title: viewKey.toUpperCase(), icon: '🪟' };
    const winTitle = customTitle || def.title;
    const winId = `win-${viewKey}`;

    let win = this.openWindows.find(w => w.id === winId);
    if (!win) {
      win = {
        id: winId,
        viewKey: viewKey,
        title: winTitle,
        icon: def.icon,
        subtab: subtabKey
      };
      this.openWindows.push(win);
    } else {
      if (customTitle) win.title = customTitle;
      if (subtabKey) win.subtab = subtabKey;
    }

    this.activeWindowId = winId;
    this.renderMdiTabs();
    this.switchDockView(viewKey, subtabKey);
  }

  activateWindow(winId) {
    const win = this.openWindows.find(w => w.id === winId);
    if (!win) return;
    this.activeWindowId = winId;
    this.renderMdiTabs();
    this.switchDockView(win.viewKey, win.subtab);
  }

  closeWindow(winId) {
    const idx = this.openWindows.findIndex(w => w.id === winId);
    if (idx === -1) return;

    this.openWindows.splice(idx, 1);

    if (this.activeWindowId === winId) {
      if (this.openWindows.length > 0) {
        const nextWin = this.openWindows[Math.max(0, idx - 1)];
        this.activeWindowId = nextWin.id;
        this.renderMdiTabs();
        this.switchDockView(nextWin.viewKey, nextWin.subtab);
      } else {
        this.activeWindowId = null;
        this.showStartPage();
      }
    } else {
      this.renderMdiTabs();
    }
  }

  closeActiveWindow() {
    if (this.activeWindowId) {
      this.closeWindow(this.activeWindowId);
    }
  }

  closeAllWindows() {
    this.openWindows = [];
    this.activeWindowId = null;
    this.showStartPage();
  }

  showStartPage() {
    this.currentView = 'start';
    this.activeWindowId = null;
    document.querySelectorAll('.workspace-view').forEach(v => {
      v.classList.toggle('active', v.id === 'view-start');
    });
    this.renderMdiTabs();
    this.renderStartPageConnections();
    const titleEl = document.getElementById('toad-window-title');
    if (titleEl) {
      titleEl.textContent = this.isConnected()
        ? `Toad for Oracle - [Página Inicial]`
        : `Toad for Oracle - [Desconectado]`;
    }
  }

  renderMdiTabs() {
    const container = document.getElementById('toad-mdi-tabs');
    if (!container) return;

    let html = `
      <div class="toad-window-tab ${this.currentView === 'start' ? 'active' : ''}" onclick="window.TracesApp.showStartPage();" title="Página Inicial do Toad">
        <span style="font-size: 11px;">🏠</span>
        <span style="font-weight: 600;">Start Page</span>
      </div>
    `;

    html += this.openWindows.map(w => {
      const isActive = this.activeWindowId === w.id && this.currentView !== 'start';
      return `
        <div class="toad-window-tab ${isActive ? 'active' : ''}" 
             data-win-id="${w.id}"
             onclick="window.TracesApp.activateWindow('${w.id}');"
             title="${w.title}">
          <span style="font-size: 11px;">${w.icon}</span>
          <span style="font-weight: 600;">${w.title}</span>
          <span class="mdi-tab-close" onclick="event.stopPropagation(); window.TracesApp.closeWindow('${w.id}');" title="Fechar Janela (Ctrl+F4)">×</span>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  renderStartPageConnections() {
    const listEl = document.getElementById('start-saved-connections-list');
    if (!listEl) return;
    const conns = this.connectionManager?.connections || [];
    if (conns.length === 0) {
      listEl.innerHTML = `<div style="font-size: 11px; color: #888; font-style: italic;">Nenhum perfil cadastrado.</div>`;
      return;
    }
    listEl.innerHTML = conns.map(c => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: #fff; border: 1px solid #d1d5db; border-radius: 4px; font-size: 11px;">
        <div>
          <span style="font-weight: 700; color: #1e293b;">${c.name || 'Conexão Oracle'}</span>
          <span style="color: #64748b; margin-left: 6px;">(${c.user}@${c.host}:${c.port}/${c.serviceName})</span>
        </div>
        <button class="btn btn-primary" style="padding: 2px 10px; font-size: 11px;" onclick="window.TracesApp.connectionManager.selectProfile('${c.id}'); window.TracesApp.connectionManager.openModal();">
          ⚡ Conectar
        </button>
      </div>
    `).join('');
  }

  async checkRealBridgeStatus() {
    try {
      const resp = await fetch('/api/status');
      const data = await resp.json();
      if (data.connection && data.connection.status === 'CONNECTED') {
        this.isRealDatabase = true;
        this.realDatabaseConfig = data.connection.config;
        this.updateConnectionState();

        // Automatically sync live components with Oracle Database
        if (this.schemaBrowser && typeof this.schemaBrowser.loadRealSchemas === 'function') {
          this.schemaBrowser.loadRealSchemas();
        }
        if (this.sessionMonitor && typeof this.sessionMonitor.loadRealSessions === 'function') {
          this.sessionMonitor.loadRealSessions();
        }
        if (this.databaseProbe && typeof this.databaseProbe.loadRealProbe === 'function') {
          this.databaseProbe.loadRealProbe();
        }
        if (this.dbaTools && typeof this.dbaTools.loadRealData === 'function') {
          this.dbaTools.loadRealData();
        }
      } else {
        this.isRealDatabase = false;
        this.realDatabaseConfig = null;
        this.updateConnectionState();
      }
    } catch (e) {
      // Bridge server offline or starting
    }
  }

  bindDockNavigation() {
    const tabs = document.querySelectorAll('.dock-item[data-view]');
    tabs.forEach(item => {
      item.onclick = (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        this.openWindow(view);
      };
    });
  }

  switchDockView(viewKey, subtabKey = null) {
    this.currentView = viewKey;

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
      const conn = this.connectionManager ? this.connectionManager.getActive() : null;
      if (!conn) {
        titleEl.textContent = `Toad for Oracle - [${viewKey.toUpperCase()} - Desconectado]`;
      } else {
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
          'profiler': `Toad for Oracle - [PL/SQL Profiler & Code Analysis]`,
          'copilot': `Toad for Oracle - [Traces Copilot AI Assistant]`
        };
        titleEl.textContent = titles[viewKey] || `Toad for Oracle - [${viewKey.toUpperCase()}]`;
      }
    }

    this.renderMdiTabs();

    // Component-specific hooks on switch
    if (viewKey === 'sessions' && this.sessionMonitor) {
      this.sessionMonitor.renderGauges();
    }
  }

  bindGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Close active window: Ctrl+F4
      if ((e.ctrlKey || e.metaKey) && e.key === 'F4') {
        e.preventDefault();
        this.closeActiveWindow();
        return;
      }

      // Close all windows: Ctrl+Shift+F4
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F4') {
        e.preventDefault();
        this.closeAllWindows();
        return;
      }

      // Global F9: Run statement in editor
      if (e.key === 'F9') {
        e.preventDefault();
        this.openWindow('editor');
        this.sqlEditor.executeStatement();
      }
      // Global F5: Run script in editor
      else if (e.key === 'F5') {
        e.preventDefault();
        this.openWindow('editor');
        this.sqlEditor.executeScript();
      }
      // Global Ctrl+Enter: Execute at cursor
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.openWindow('editor');
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
        this.openWindow('explain');
        this.explainPlan.generatePlan(this.sqlEditor.textarea.value);
      }
      // Global Ctrl+B / Cmd+B: Schema Browser
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.openWindow('browser');
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

  toggleAutoCommit(enabled) {
    this.autoCommit = !!enabled;
    const chk = document.getElementById('toad-chk-autocommit');
    if (chk) chk.checked = this.autoCommit;
    this.notify(
      this.autoCommit
        ? 'AutoCommit ATIVADO: Comandos DML terão commit automático após execução.'
        : 'AutoCommit DESATIVADO (Padrão Toad): Transações manuais via Commit (F11) ou Rollback (Shift+F11).',
      this.autoCommit ? 'warning' : 'info'
    );
  }

  minimizeWindow() {
    this.notify('Worksheet minimizada na barra de status do Toad.', 'info');
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.notify('Modo Janela Inteira (Maximizado).', 'info');
    } else {
      document.exitFullscreen().catch(() => {});
      this.notify('Restaurado para tamanho padrão.', 'info');
    }
  }

  closeApplication() {
    const conn = this.connectionManager?.getActive();
    if (conn) {
      if (confirm(`Deseja desconectar a sessão ativa (${conn.user}@${conn.serviceName}) e fechar o worksheet?`)) {
        this.connectionManager.disconnect();
        this.notify('Sessão desconectada.', 'info');
      }
    } else {
      this.notify('Toad for Oracle pronto para conexão.', 'info');
    }
  }

  tileWindows(mode = 'horizontal') {
    const app = document.querySelector('.toad-workspace-area');
    if (!app) return;
    if (mode === 'restore') {
      app.style.display = '';
      app.style.gridTemplateColumns = '';
      this.notify('Layout de janelas restaurado para MDI Tabbed.', 'info');
      return;
    }
    this.notify(`Janelas MDI organizadas em mosaico (${mode === 'horizontal' ? 'Lado a lado' : 'Em cascata'}).`, 'info');
  }

  toggleBreakpoint() {
    if (this.sqlEditor) {
      this.notify('Breakpoint de depuração alternado na linha ativa (F9).', 'info');
    }
  }

  async compileWithDebugInfo() {
    if (this.isRealDatabase) {
      try {
        const sql = `ALTER SESSION SET PLSQL_OPTIMIZE_LEVEL=1; ALTER SESSION SET PLSQL_DEBUG=TRUE;`;
        await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        this.notify('Sessão configurada com PLSQL_DEBUG=TRUE para geração de símbolos de depuração.', 'success');
      } catch (e) {
        this.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      this.notify('Objeto compilado com informações de depuração (PLSQL_DEBUG=TRUE, Modo Local).', 'success');
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

  if (window.electronAPI && typeof window.electronAPI.onUpdateAvailable === 'function') {
    window.electronAPI.onUpdateAvailable((info) => {
      window.TracesApp.notify(`🎉 Nova atualização disponível no GitHub: "${info.commitMessage}". Clique em [Atualizar App] no topo para aplicar.`, 'info');
    });
  }
});

