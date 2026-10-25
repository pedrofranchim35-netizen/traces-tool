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
    this.serverOs = {
      os_type: 'linux',
      os_name: 'Linux',
      platform_name: 'Linux x86 64-bit',
      host_name: 'oracle-srv-01',
      instance_name: 'ORCL',
      file_separator: '/',
      kill_cmd_template: 'kill -9 {spid}',
      stack_cmd_template: 'pstack {spid}',
      diag_tools: 'top, vmstat, iostat, sar, free -m'
    };
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

      // 2.1 Enterprise Integrations
      this.inventoryManager = new InventoryManager();
      this.sqlplusRmanTerminal = new SqlplusRmanTerminal();
      this.pythonOsConsole = new PythonOsConsole();
      this.health360 = new Health360();

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
      this.initUniversalInteractivity();

      // 6. Show Toad Start Page and initialize connection state
      this.showStartPage();
      this.updateConnectionState();

      // 7. Check Real Bridge Status (background + periodic sync if disconnected)
      this.checkRealBridgeStatus();
      setInterval(() => {
        if (!this.isConnected()) {
          this.checkRealBridgeStatus();
          if (this.connectionManager && typeof this.connectionManager.syncWithServerState === 'function') {
            this.connectionManager.syncWithServerState();
          }
        }
      }, 2500);

      this.notify('Toad for Oracle 2026 (Traces Edition) inicializado com sucesso.', 'success');
    } catch (err) {
      console.error('TracesApp initialization error:', err);
    }
  }

  isConnected() {
    if (this.isRealDatabase) return true;
    if (this.realDatabaseConfig) return true;
    if (this.connectionManager) {
      if (typeof this.connectionManager.getActive === 'function' && this.connectionManager.getActive()) return true;
      if (this.connectionManager.activeConn) return true;
      if (this.connectionManager.activeConnections && this.connectionManager.activeConnections.size > 0) return true;
    }
    return false;
  }

  getActiveConnection() {
    if (this.realDatabaseConfig) return this.realDatabaseConfig;
    if (this.connectionManager) {
      if (typeof this.connectionManager.getActive === 'function') {
        const c = this.connectionManager.getActive();
        if (c) return c;
      }
      if (this.connectionManager.activeConn) return this.connectionManager.activeConn;
      if (this.connectionManager.activeConnections && this.connectionManager.activeConnections.size > 0) {
        return this.connectionManager.activeConnections.values().next().value?.config || null;
      }
    }
    return null;
  }

  setServerOs(osInfo) {
    if (!osInfo) return;
    this.serverOs = Object.assign({}, this.serverOs, osInfo);
    const combined = `${this.serverOs.platform_name || ''} ${this.serverOs.os_name || ''} ${this.serverOs.port_string || ''}`.toUpperCase();
    if (combined.includes('AIX') || combined.includes('RS6000') || combined.includes('IBM/AIX')) {
      this.serverOs.os_type = 'aix';
      if (!this.serverOs.os_name) this.serverOs.os_name = 'IBM AIX';
      this.serverOs.file_separator = '/';
      this.serverOs.kill_cmd_template = 'kill -9 {spid}';
      this.serverOs.stack_cmd_template = 'procstack {spid}';
      this.serverOs.diag_tools = 'topas, vmstat -v, lsvg, lspv, svmon, errpt';
    } else if (combined.includes('WIN') || combined.includes('MICROSOFT')) {
      this.serverOs.os_type = 'windows';
      if (!this.serverOs.os_name) this.serverOs.os_name = 'Microsoft Windows';
      this.serverOs.file_separator = '\\';
      const inst = this.serverOs.instance_name || '%ORACLE_SID%';
      this.serverOs.kill_cmd_template = `orakill ${inst} {spid}`;
      this.serverOs.stack_cmd_template = 'tasklist /fi "imagename eq oracle.exe"';
      this.serverOs.diag_tools = 'tasklist, typeperf, Get-Process, sc query, orakill';
    } else {
      this.serverOs.os_type = 'linux';
      if (!this.serverOs.os_name) this.serverOs.os_name = 'Linux';
      this.serverOs.file_separator = '/';
      this.serverOs.kill_cmd_template = 'kill -9 {spid}';
      this.serverOs.stack_cmd_template = 'pstack {spid}';
      this.serverOs.diag_tools = 'top, vmstat, iostat, sar, free -m';
    }

    const osEl = document.getElementById('status-db-os');
    if (osEl && this.isConnected()) {
      const os = this.getServerOs();
      const icon = os.os_type === 'windows' ? '🪟' : os.os_type === 'aix' ? '🟣' : '🐧';
      const label = os.os_type === 'windows' ? 'Windows x64' : os.os_type === 'aix' ? 'IBM AIX' : 'Linux x86_64';
      const badgeClass = os.os_type === 'windows' ? 'os-windows' : os.os_type === 'aix' ? 'os-aix' : 'os-linux';
      osEl.innerHTML = `<span class="toad-os-badge ${badgeClass}">${icon} ${label}</span>`;
      osEl.title = `Host SO: ${os.os_name} (${os.platform_name || ''}) | Instância: ${os.instance_name || 'ORCL'} - Clique para abrir o Monitor de Servidor no DBA Hub`;
      osEl.onclick = () => this.openWindow('dba', 'unixmonitor');
    }

    if (this.dbaTools && typeof this.dbaTools.renderCurrentSubtab === 'function' && this.dbaTools.currentSubtab === 'unixmonitor') {
      this.dbaTools.renderCurrentSubtab();
    }
  }

  getServerOs() {
    return this.serverOs || {
      os_type: 'linux',
      os_name: 'Linux',
      platform_name: 'Linux x86 64-bit',
      file_separator: '/',
      kill_cmd_template: 'kill -9 {spid}'
    };
  }

  getOsKillCommand(spid, sid, instanceName) {
    const os = this.getServerOs();
    const pid = spid || sid || '<spid>';
    if (os.os_type === 'windows') {
      const inst = instanceName || os.instance_name || 'ORCL';
      return {
        cmd: `orakill ${inst} ${pid}`,
        osType: 'windows',
        osName: 'Microsoft Windows',
        debugCmd: `tasklist /fi "imagename eq oracle.exe" /v`,
        explanation: `No Windows, threads dedicadas dentro do processo oracle.exe devem ser eliminadas com orakill ${inst} ${pid} para encerrar a sessão sem derrubar a instância.`
      };
    } else if (os.os_type === 'aix') {
      return {
        cmd: `kill -9 ${pid}`,
        osType: 'aix',
        osName: 'IBM AIX',
        debugCmd: `procstack ${pid}`,
        explanation: `No IBM AIX, o processo de servidor dedicado roda em nível de SO. Utilize kill -9 ${pid} para eliminação forçada ou procstack ${pid} para obter a stack de threads AIX.`
      };
    } else {
      return {
        cmd: `kill -9 ${pid}`,
        osType: 'linux',
        osName: 'Linux',
        debugCmd: `pstack ${pid}`,
        explanation: `No Linux, o processo de servidor dedicado (LOCAL=NO) pode ser finalizado no SO via kill -9 ${pid} ou inspecionado com pstack ${pid}.`
      };
    }
  }

  updateConnectionState() {
    const isConn = this.isConnected();
    const conn = this.getActiveConnection();

    // 1. Update Title & Status Bar
    if (isConn && conn) {
      if (!this.isRealDatabase && conn.osType) {
        this.serverOs = {
          os_type: conn.osType,
          os_name: conn.osName,
          platform_name: conn.platform,
          host_name: conn.host,
          instance_name: conn.instanceName || conn.serviceName || 'ORCL',
          file_separator: conn.osType === 'windows' ? '\\' : '/',
          path_example: conn.osType === 'windows' ? 'D:\\app\\oracle\\oradata' : conn.osType === 'aix' ? '/oracle/oradata' : '/u01/app/oracle/oradata',
          kill_cmd_template: conn.osType === 'windows' ? `orakill ${conn.instanceName || conn.serviceName || 'ORCL'} {spid}` : 'kill -9 {spid}',
          stack_cmd_template: conn.osType === 'windows' ? 'tasklist /fi "imagename eq oracle.exe"' : conn.osType === 'aix' ? 'procstack {spid}' : 'pstack {spid}',
          diag_tools: conn.osType === 'windows' ? 'tasklist, typeperf, Get-Process, sc query, orakill' : conn.osType === 'aix' ? 'topas, vmstat -v, lsvg, lspv, svmon, errpt' : 'top, vmstat, iostat, sar, free -m'
        };
      }

      const totalActive = this.connectionManager?.activeConnections?.size || 1;
      const multiSuffix = totalActive > 1 ? ` [${totalActive} Bancos Conectados]` : '';
      const connStr = `${conn.user}@${conn.host || 'localhost'}:${conn.port || 1521}/${conn.serviceName || conn.service_name || 'ORCL'}`;
      document.title = `Toad for Oracle - [${connStr}]${multiSuffix}`;
      const titleEl = document.getElementById('toad-window-title');
      if (titleEl) titleEl.textContent = `Toad for Oracle - [${connStr}]${multiSuffix}`;
      
      const mbStatus = document.getElementById('toad-mb-status');
      if (mbStatus) {
        mbStatus.className = 'toad-menubar-status connected';
        const multiBadge = totalActive > 1 ? ` <span style="background: #15803d; color: #fff; font-size: 9.5px; padding: 1px 6px; border-radius: 8px; font-weight: 700; margin-left: 5px;">${totalActive} DBs</span>` : '';
        mbStatus.innerHTML = `<span class="mb-status-dot"></span><span>${conn.user}@${conn.serviceName || conn.service_name || 'ORCL'}</span>${multiBadge}`;
      }
      const startBadge = document.getElementById('start-header-status-badge');
      if (startBadge) {
        startBadge.innerHTML = `
          <span style="background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.4); color: #86efac; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; display: inline-flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block;"></span>
            Conectado: ${conn.user}@${conn.serviceName || conn.service_name || 'ORCL'}
          </span>
        `;
      }
      const userEl = document.getElementById('status-db-user');
      const verEl = document.getElementById('status-db-version');
      const latEl = document.getElementById('status-db-latency');
      const osEl = document.getElementById('status-db-os');
      if (userEl) userEl.textContent = `${conn.user}@${conn.serviceName || conn.service_name || 'ORCL'}`;
      if (verEl) verEl.textContent = conn.serverVersion || 'Oracle Database 19c Enterprise Edition (AL32UTF8 | Dedicated Server)';
      if (latEl && (!latEl.textContent || latEl.textContent === '-- ms')) latEl.textContent = '0.5 ms';

      if (osEl) {
        const os = this.getServerOs();
        const icon = os.os_type === 'windows' ? '🪟' : os.os_type === 'aix' ? '🟣' : '🐧';
        const label = os.os_type === 'windows' ? 'Windows x64' : os.os_type === 'aix' ? 'IBM AIX' : 'Linux x86_64';
        const badgeClass = os.os_type === 'windows' ? 'os-windows' : os.os_type === 'aix' ? 'os-aix' : 'os-linux';
        osEl.innerHTML = `<span class="toad-os-badge ${badgeClass}">${icon} ${label}</span>`;
        osEl.title = `Host SO: ${os.os_name} (${os.platform_name || ''}) | Instância: ${os.instance_name || conn.serviceName || 'ORCL'} - Clique para abrir o Monitor de Servidor no DBA Hub`;
        osEl.onclick = () => this.openWindow('dba', 'unixmonitor');
      }

      const startAlert = document.getElementById('start-alert-box');
      if (startAlert) {
        startAlert.className = 'start-alert-banner connected';
        startAlert.style.borderColor = '#16a34a';
        startAlert.style.background = '#f0fdf4';
        startAlert.innerHTML = `
          <div>
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px; color: #15803d;">⚡ Conectado ao Banco Real Oracle</div>
            <div style="font-size: 11.5px; color: #374151;">
              Sessão ativa como <b>${conn.user}</b> em <b>${conn.serviceName || conn.service_name || 'ORCL'}</b>. Execute consultas na Worksheet ou inspecione objetos no Schema Browser.
            </div>
          </div>
          <button class="btn btn-primary" onclick="window.TracesApp.openWindow('editor')" style="padding: 6px 14px; font-weight: 700; background: #15803d; border-color: #166534; white-space: nowrap;">
            📝 Abrir SQL Editor
          </button>
        `;
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
      const osEl = document.getElementById('status-db-os');
      if (userEl) userEl.textContent = '[Desconectado]';
      if (verEl) verEl.textContent = 'Pronto para conectar ao banco de dados';
      if (latEl) latEl.textContent = '-- ms';
      if (osEl) {
        osEl.innerHTML = `<span>🖥️</span> <span>[SO: Auto]</span>`;
        osEl.title = 'Host SO: Detectado automaticamente ao conectar (Linux, Windows, AIX)';
      }

      const startBadge = document.getElementById('start-header-status-badge');
      if (startBadge) {
        startBadge.innerHTML = `
          <span style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; display: inline-flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444; display: inline-block;"></span>
            Desconectado do Banco
          </span>
        `;
      }
      const startAlert = document.getElementById('start-alert-box');
      if (startAlert) {
        startAlert.className = 'start-alert-banner disconnected';
        startAlert.style.borderColor = '';
        startAlert.style.background = '';
        startAlert.innerHTML = `
          <div>
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">⚡ Modo Offline / Desconectado</div>
            <div style="font-size: 11.5px; opacity: 0.9;">
              Conecte-se a uma instância Oracle para executar queries na Worksheet, carregar schemas, inspecionar planos CBO e monitorar sessões em tempo real.
            </div>
          </div>
          <button class="btn btn-primary" onclick="window.TracesApp.connectionManager.openModal()" style="padding: 6px 14px; font-weight: 700; background: #0284c7; border-color: #0369a1; white-space: nowrap;">
            ⚡ Conectar ao Banco de Dados...
          </button>
        `;
      }
    }

    // 2. Keep Execution Controls responsive (never lock with pointer-events:none so user gets feedback or mock execution)
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
        el.disabled = false;
        el.classList.remove('disabled');
      }
    });

    ['btn-disconnect', 'btn-toolbar-disconnect'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = !isConn;
        btn.classList.toggle('disabled', !isConn);
      }
    });

    // 3. Update Start Page saved connections
    this.renderStartPageConnections();

    // 4. Update Header Pill and Selector Dropdown
    if (this.connectionManager) {
      this.connectionManager.renderHeaderPill();
      this.connectionManager.updateSelectorDropdown();
    }

    // 5. Only trigger view data reload when connection identity actually changes
    const connStateKey = isConn
      ? `CONN:${conn?.id || ''}:${conn?.user || ''}@${conn?.host || ''}:${conn?.serviceName || conn?.service_name || ''}`
      : 'DISCONNECTED';
    const stateChanged = this._lastConnStateKey !== connStateKey;
    this._lastConnStateKey = connStateKey;

    if (stateChanged) {
      if (!isConn) {
        if (this.dbaTools) {
          this.dbaTools.updateConnectionState(false);
          if (this.currentView === 'dba') this.dbaTools.render();
        }
        if (this.currentView === 'sessions' && this.sessionMonitor) {
          this.sessionMonitor.render();
        }
        if (this.currentView === 'browser' && this.schemaBrowser) {
          this.schemaBrowser.render();
        }
      } else {
        if (this.dbaTools) {
          this.dbaTools.updateConnectionState(true);
          if (this.currentView === 'dba') {
            this.dbaTools.render();
            this.dbaTools.loadSubtabData(this.dbaTools.currentSubtab);
          }
        }
        if (this.currentView === 'sessions' && this.sessionMonitor) {
          this.sessionMonitor.refresh(true);
        }
        if (this.currentView === 'browser' && this.schemaBrowser) {
          this.schemaBrowser.loadRealSchemas();
        }
      }
    } else {
      if (this.dbaTools) {
        this.dbaTools.updateConnectionBadge();
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

  // ---------------------------------------------------------------------------
  // PER-CONNECTION WORKSPACES (TOAD: each connection keeps its own windows/worksheets)
  // ---------------------------------------------------------------------------
  swapWorkspace(oldConnId, newConnId) {
    if (!this.connWorkspaces) this.connWorkspaces = {};
    if (oldConnId === newConnId) return;
    const ed = this.sqlEditor;
    if (oldConnId) {
      if (ed) ed.saveActiveTabContent();
      this.connWorkspaces[oldConnId] = {
        openWindows: this.openWindows,
        activeWindowId: this.activeWindowId,
        currentView: this.currentView,
        editorTabs: ed ? ed.tabs : null,
        editorActiveTabId: ed ? ed.activeTabId : null
      };
    }
    const ws = newConnId ? this.connWorkspaces[newConnId] : null;
    if (ws) {
      this.openWindows = ws.openWindows;
      this.activeWindowId = ws.activeWindowId;
      if (ed && ws.editorTabs) { ed.tabs = ws.editorTabs; ed.activeTabId = ws.editorActiveTabId; }
    } else {
      this.openWindows = [];
      this.activeWindowId = null;
      if (ed && oldConnId) {
        const content = `-- Nova Worksheet\nSELECT * FROM dual;`;
        const id = `tab-${Date.now()}`;
        ed.tabs = [{ id, title: 'worksheet_1.sql', content, history: [{ content, selStart: 0, selEnd: 0 }], future: [] }];
        ed.activeTabId = id;
      }
    }
    if (ed) { ed.renderTabs(); ed.loadTabContent(); }
    const win = this.openWindows.find(w => w.id === this.activeWindowId);
    if (ws && win && ws.currentView !== 'start') {
      this.renderMdiTabs();
      this.switchDockView(win.viewKey, win.subtab);
    } else if (ws && this.openWindows.length === 0) {
      this.showStartPage();
    } else if (!ws) {
      this.openWindow('editor');
    } else {
      this.showStartPage();
    }
  }

  dropWorkspace(connId) {
    if (this.connWorkspaces) delete this.connWorkspaces[connId];
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

    const ac = this.connectionManager?.activeConn;
    const connLabel = ac ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:#334155;padding:0 8px;margin-right:4px;border-right:1px solid #cbd5e1;align-self:center;"><span style="width:8px;height:8px;border-radius:50%;background:${ac.color || '#16a34a'};"></span>${ac.user}@${ac.serviceName}</span>` : '';
    let html = connLabel + `
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
        if (data.connection.os) {
          this.setServerOs(data.connection.os);
        }
        if (this.connectionManager?.syncWithServerState) {
          this.connectionManager.syncWithServerState();
        }
        this.updateConnectionState();

        // If currently on Start Page, switch to SQL Editor automatically (authentic Toad behavior)
        if (this.currentView === 'start') {
          this.openWindow('editor');
          setTimeout(() => {
            if (this.sqlEditor?.textarea) this.sqlEditor.textarea.focus();
          }, 150);
        }

        // Automatically sync live components with Oracle Database
        if (this.schemaBrowser && typeof this.schemaBrowser.loadRealSchemas === 'function') {
          this.schemaBrowser.loadRealSchemas();
        }
        // Note: SessionMonitor manages its own autoRefreshTimer; only trigger initial load if sessions list is empty
        if (this.sessionMonitor && typeof this.sessionMonitor.loadRealSessions === 'function' && (!this.sessionMonitor.lastRefreshTime)) {
          this.sessionMonitor.loadRealSessions(false);
        }
        if (this.databaseProbe && typeof this.databaseProbe.loadRealProbe === 'function') {
          this.databaseProbe.loadRealProbe();
        }
        if (this.dbaTools) {
          this.dbaTools.updateConnectionState(true);
          if (typeof this.dbaTools.loadRealData === 'function' && this.currentView === 'dba') {
            this.dbaTools.loadRealData();
          }
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
      this.sessionMonitor.refresh(true);
    }
    if (viewKey === 'explain' && this.explainPlan) {
      this.explainPlan.onViewActivated();
    }
    if (viewKey === 'dba' && this.dbaTools) {
      this.dbaTools.onViewActivated(subtabKey);
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
      // Global F7: Single Record Viewer
      else if (e.key === 'F7') {
        e.preventDefault();
        this.dataGrid.openRecordViewer();
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
      // Global Ctrl+E / Cmd+E: Explain Plan (target last executed query)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        this.openWindow('explain');
        this.explainPlan.generatePlan();
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
      // Global Windows Editing & File Shortcuts when focus is outside an input/textarea
      else if (e.ctrlKey || e.metaKey) {
        const active = document.activeElement;
        const isEditable = active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.isContentEditable);
        const k = e.key.toLowerCase();
        if (k === 'n' && !e.shiftKey) {
          e.preventDefault();
          this.openWindow('editor');
          this.sqlEditor?.addNewTab();
        } else if (k === 's' && !e.shiftKey) {
          e.preventDefault();
          const sql = this.sqlEditor?.getActiveQuery?.() || '';
          const blob = new Blob([sql], { type: 'text/sql' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'worksheet.sql';
          a.click();
          this.notify('Worksheet salva como worksheet.sql.', 'success');
        } else if (!isEditable && this.currentView === 'editor' && this.sqlEditor) {
          if (k === 'v' && !e.shiftKey) {
            e.preventDefault();
            this.sqlEditor.paste();
          } else if (k === 'c' && !e.shiftKey && (!window.getSelection || !window.getSelection().toString())) {
            e.preventDefault();
            this.sqlEditor.copy();
          } else if (k === 'x' && !e.shiftKey) {
            e.preventDefault();
            this.sqlEditor.cut();
          } else if (k === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.sqlEditor.undo();
          } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
            e.preventDefault();
            this.sqlEditor.redo();
          } else if (k === 'a' && !e.shiftKey) {
            e.preventDefault();
            this.sqlEditor.selectAll();
          } else if (k === 'f' && !e.shiftKey) {
            e.preventDefault();
            this.toadModals?.openFindDialog(false);
          } else if (k === 'h' && !e.shiftKey) {
            e.preventDefault();
            this.toadModals?.openFindDialog(true);
          } else if (k === 'g' && !e.shiftKey) {
            e.preventDefault();
            this.sqlEditor.gotoLine();
          }
        }
      }
    });
  }

  toggleEditorSplitOrientation() {
    const splitContainer = document.querySelector('#view-editor .editor-split-pane');
    const upper = document.getElementById('editor-upper-pane');
    const lower = document.getElementById('editor-lower-pane');
    const splitter = document.getElementById('editor-pane-splitter');
    const btn = document.getElementById('btn-toggle-editor-split-orient');
    if (!splitContainer || !upper || !lower || !splitter) return;

    this.editorSideBySide = !this.editorSideBySide;
    splitContainer.classList.toggle('side-by-side', this.editorSideBySide);
    upper.classList.remove('collapsed-pane');
    lower.classList.remove('collapsed-pane');
    lower.style.flex = '';

    if (this.editorSideBySide) {
      lower.style.height = '100%';
      lower.style.width = `${Math.round(window.innerWidth * 0.48)}px`;
      if (btn) btn.innerHTML = '⬍ Dividir Empilhado';
      this.notify('Editor dividido Lado a Lado (arraste a barra central para os lados).', 'info');
    } else {
      lower.style.width = '';
      lower.style.height = '270px';
      if (btn) btn.innerHTML = '⬌ Dividir Lado a Lado';
      this.notify('Editor dividido Superior / Inferior (arraste a barra para cima/baixo).', 'info');
    }
  }

  initSplitter() {
    // 1. SQL Editor Splitter (Supports both Horizontal Top/Bottom and Vertical Side-by-Side)
    const splitter = document.getElementById('editor-pane-splitter');
    const upper = document.getElementById('editor-upper-pane');
    const lower = document.getElementById('editor-lower-pane');
    if (splitter && upper && lower) {
      let isDragging = false;
      let startY = 0;
      let startX = 0;
      let startLowerHeight = 0;
      let startLowerWidth = 0;

      splitter.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        upper.classList.remove('collapsed-pane');
        lower.classList.remove('collapsed-pane');
        lower.style.flex = '';
        isDragging = true;
        startY = e.clientY;
        startX = e.clientX;
        startLowerHeight = lower.offsetHeight || 270;
        startLowerWidth = lower.offsetWidth || Math.round(window.innerWidth * 0.48);
        splitter.classList.add('dragging');
        document.body.style.cursor = this.editorSideBySide ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
      });

      splitter.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        this.toggleSplitPane('editor', 'reset');
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        if (this.editorSideBySide) {
          const dx = startX - e.clientX;
          const newWidth = Math.max(240, Math.min(window.innerWidth - 280, startLowerWidth + dx));
          lower.style.width = `${newWidth}px`;
        } else {
          const dy = startY - e.clientY;
          const newHeight = Math.max(85, Math.min(window.innerHeight - 170, startLowerHeight + dy));
          lower.style.height = `${newHeight}px`;
        }
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

    // 2. Schema Browser Vertical Splitter (Left Object Tree / Right Object Inspector)
    const bSplitter = document.getElementById('browser-pane-splitter');
    const bNav = document.getElementById('browser-nav-pane');
    if (bSplitter && bNav) {
      let bDrag = false;
      let startX = 0;
      let startW = 0;

      bSplitter.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        bNav.classList.remove('collapsed-pane');
        const btn = document.getElementById('browser-splitter-btn');
        if (btn) btn.textContent = '◀';
        bDrag = true;
        startX = e.clientX;
        startW = bNav.offsetWidth || 280;
        bSplitter.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });

      bSplitter.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        bNav.classList.remove('collapsed-pane');
        bNav.style.width = '280px';
      });

      window.addEventListener('mousemove', (e) => {
        if (!bDrag) return;
        const dx = e.clientX - startX;
        const newW = Math.max(160, Math.min(window.innerWidth - 280, startW + dx));
        bNav.style.width = `${newW}px`;
      });

      window.addEventListener('mouseup', () => {
        if (bDrag) {
          bDrag = false;
          bSplitter.classList.remove('dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }

    // 3. Explain Plan Vertical Splitter (Left Tree / Right Optimizer Advisor)
    const exSplitter = document.getElementById('explain-pane-splitter');
    const exAdvisor = document.getElementById('optimizer-advisor-pane');
    if (exSplitter && exAdvisor) {
      let exDrag = false;
      let startX = 0;
      let startW = 0;

      exSplitter.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        exAdvisor.classList.remove('collapsed-pane');
        const btn = document.getElementById('explain-splitter-btn');
        if (btn) btn.textContent = '▶';
        exDrag = true;
        startX = e.clientX;
        startW = exAdvisor.offsetWidth || 340;
        exSplitter.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });

      exSplitter.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        exAdvisor.classList.remove('collapsed-pane');
        exAdvisor.style.width = '340px';
      });

      window.addEventListener('mousemove', (e) => {
        if (!exDrag) return;
        const dx = startX - e.clientX;
        const newW = Math.max(200, Math.min(window.innerWidth - 300, startW + dx));
        exAdvisor.style.width = `${newW}px`;
      });

      window.addEventListener('mouseup', () => {
        if (exDrag) {
          exDrag = false;
          exSplitter.classList.remove('dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }

    // 4. Code Quality / Rules Vertical Splitter
    const rSplitter = document.getElementById('rules-pane-splitter');
    const rSidebar = document.querySelector('#view-rules .rules-sidebar');
    if (rSplitter && rSidebar) {
      let rDrag = false;
      let startX = 0;
      let startW = 0;

      rSplitter.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        rSidebar.classList.remove('collapsed-pane');
        const btn = document.getElementById('rules-splitter-btn');
        if (btn) btn.textContent = '◀';
        rDrag = true;
        startX = e.clientX;
        startW = rSidebar.offsetWidth || 320;
        rSplitter.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });

      rSplitter.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        rSidebar.classList.remove('collapsed-pane');
        rSidebar.style.width = '320px';
      });

      window.addEventListener('mousemove', (e) => {
        if (!rDrag) return;
        const dx = e.clientX - startX;
        const newW = Math.max(180, Math.min(window.innerWidth - 300, startW + dx));
        rSidebar.style.width = `${newW}px`;
      });

      window.addEventListener('mouseup', () => {
        if (rDrag) {
          rDrag = false;
          rSplitter.classList.remove('dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }

    // 5. Universal Delegated Splitter for Dynamic Views (DBA Hub Sidebar, Data Modeler, Optimizer, etc.)
    let dynSplitter = null;
    let dynTarget = null;
    let dynMode = 'col'; // 'col' or 'row'
    let dynStart = 0;
    let dynStartSize = 0;

    document.addEventListener('mousedown', (e) => {
      const sp = e.target.closest('[data-splitter-target]');
      if (!sp || e.target.closest('button')) return;
      const targetSel = sp.getAttribute('data-splitter-target');
      const targetEl = document.querySelector(targetSel);
      if (!targetEl) return;
      targetEl.classList.remove('collapsed-pane');
      dynSplitter = sp;
      dynTarget = targetEl;
      dynMode = sp.getAttribute('data-splitter-mode') || 'col';
      dynStart = dynMode === 'row' ? e.clientY : e.clientX;
      dynStartSize = dynMode === 'row' ? targetEl.offsetHeight : targetEl.offsetWidth;
      sp.classList.add('dragging');
      document.body.style.cursor = dynMode === 'row' ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dynSplitter || !dynTarget) return;
      if (dynMode === 'row') {
        const dy = e.clientY - dynStart;
        const nh = Math.max(90, Math.min(window.innerHeight - 180, dynStartSize + dy));
        dynTarget.style.height = `${nh}px`;
        dynTarget.style.flex = 'none';
      } else {
        const dx = e.clientX - dynStart;
        const nw = Math.max(150, Math.min(window.innerWidth - 280, dynStartSize + dx));
        dynTarget.style.width = `${nw}px`;
        dynTarget.style.flex = 'none';
      }
    });

    window.addEventListener('mouseup', () => {
      if (dynSplitter) {
        dynSplitter.classList.remove('dragging');
        dynSplitter = null;
        dynTarget = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  toggleSplitPane(viewKey, targetPane) {
    if (viewKey === 'editor') {
      const upper = document.getElementById('editor-upper-pane');
      const lower = document.getElementById('editor-lower-pane');
      if (!upper || !lower) return;
      if (targetPane === 'reset') {
        upper.classList.remove('collapsed-pane');
        lower.classList.remove('collapsed-pane');
        lower.style.flex = '';
        lower.style.height = '270px';
      } else if (targetPane === 'upper') {
        // Maximize Grid (hide upper SQL editor)
        const willCollapse = !upper.classList.contains('collapsed-pane');
        upper.classList.toggle('collapsed-pane', willCollapse);
        lower.classList.remove('collapsed-pane');
        lower.style.flex = willCollapse ? '1' : '';
        if (!willCollapse) lower.style.height = '270px';
      } else if (targetPane === 'lower') {
        // Hide/Show Lower Data Grid
        const willCollapse = !lower.classList.contains('collapsed-pane');
        lower.classList.toggle('collapsed-pane', willCollapse);
        upper.classList.remove('collapsed-pane');
        lower.style.flex = '';
      }
    } else if (viewKey === 'browser') {
      const bNav = document.getElementById('browser-nav-pane');
      const btn = document.getElementById('browser-splitter-btn');
      if (!bNav) return;
      const collapsed = bNav.classList.toggle('collapsed-pane');
      if (btn) btn.textContent = collapsed ? '▶' : '◀';
    } else if (viewKey === 'explain') {
      const exAdvisor = document.getElementById('optimizer-advisor-pane');
      const btn = document.getElementById('explain-splitter-btn');
      if (!exAdvisor) return;
      const collapsed = exAdvisor.classList.toggle('collapsed-pane');
      if (btn) btn.textContent = collapsed ? '◀' : '▶';
    } else if (viewKey === 'rules') {
      const rSidebar = document.querySelector('#view-rules .rules-sidebar');
      const btn = document.getElementById('rules-splitter-btn');
      if (!rSidebar) return;
      const collapsed = rSidebar.classList.toggle('collapsed-pane');
      if (btn) btn.textContent = collapsed ? '▶' : '◀';
    }
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
    const app = document.querySelector('.toad-workspace');
    if (!app) return;
    if (mode === 'restore') {
      app.style.display = '';
      app.style.gridTemplateColumns = '';
      app.style.gridTemplateRows = '';
      document.querySelectorAll('.workspace-view').forEach(v => {
        v.style.display = '';
        v.classList.toggle('active', v.id === `view-${this.currentView}`);
      });
      this.notify('Layout de janelas restaurado para MDI Tabbed.', 'info');
      return;
    }
    this.notify(`Janelas MDI organizadas em mosaico (${mode === 'horizontal' ? 'Horizontal' : mode === 'vertical' ? 'Vertical' : 'Cascata'}).`, 'info');
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

  // =========================================================================
  // UNIVERSAL INTERACTIVE DRILL-DOWN & SMART ENTITY INSPECTOR ENGINE
  // =========================================================================
  initUniversalInteractivity() {
    // 1. Click delegation for [data-inspect] attributes anywhere in the app
    document.addEventListener('click', (e) => {
      const inspectEl = e.target.closest('[data-inspect]');
      if (inspectEl) {
        e.stopPropagation();
        const token = inspectEl.getAttribute('data-inspect');
        const type = inspectEl.getAttribute('data-inspect-type') || null;
        if (token) this.smartInspect(token, type);
        return;
      }

      // 2. Ctrl+Click or Alt+Click on any element (td, span, pre, div, code, b) inspects the word/content
      if ((e.ctrlKey || e.metaKey || e.altKey) && !e.target.closest('button, input, select, .toad-menubar')) {
        const sel = window.getSelection ? window.getSelection().toString().trim() : '';
        if (sel && sel.length >= 2 && sel.length <= 90) {
          e.preventDefault();
          this.smartInspect(sel);
          return;
        }
        const cellOrSpan = e.target.closest('td, span, code, b, strong, .console-line, .dba-alert-entry');
        if (cellOrSpan) {
          const txt = (cellOrSpan.innerText || cellOrSpan.textContent || '').trim();
          if (txt && txt.length >= 2 && txt.length <= 90 && !txt.includes('\n')) {
            e.preventDefault();
            this.smartInspect(txt);
          }
        }
      }
    });

    // 3. Double-click on any word in logs, pre blocks, tables (except editable Data Grid cells), or cards
    document.addEventListener('dblclick', (e) => {
      if (e.target.closest('#oracle-data-table, input, textarea, select, button, .toad-menubar, #toad-smart-inspector-modal')) {
        return;
      }
      const sel = window.getSelection ? window.getSelection().toString().trim() : '';
      if (sel && sel.length >= 2 && sel.length <= 80 && !sel.includes('\n')) {
        this.smartInspect(sel);
        return;
      }
      const td = e.target.closest('td, .console-line, .dba-alert-entry');
      if (td) {
        const txt = (td.innerText || td.textContent || '').trim();
        if (txt && txt.length >= 2 && txt.length <= 80 && !txt.includes('\n')) {
          this.smartInspect(txt);
        }
      }
    });
  }

  escapeHtmlSafe(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  linkifyInteractiveText(rawText) {
    if (!rawText) return '';
    let html = this.escapeHtmlSafe(rawText);
    // 1. Linkify ORA-xxxxx / PLS-xxxxx / RMAN-xxxxx / TNS-xxxxx / SP2-xxxx
    html = html.replace(/\b((?:ORA|PLS|RMAN|TNS|SP2)-\d{4,5})\b/gi, (m, code) => {
      const up = code.toUpperCase();
      return `<span class="toad-clickable-token" style="color:#dc2626; font-weight:700;" title="Clique para ver causa, solução e diagnóstico do erro ${up}" onclick="window.TracesApp.smartInspect('${up}', 'ora_error')">${m}</span>`;
    });
    // 2. Linkify SQL_IDs (e.g. SQL_ID 8f3k9m2p1q4r5 or sql_id='...')
    html = html.replace(/\b(sql_id[\s=:']*?)([a-z0-9]{13})\b/gi, (m, prefix, sqlId) => {
      return `${prefix}<span class="toad-clickable-token" style="color:#0284c7; font-weight:700;" title="Clique para abrir o SQL_ID ${sqlId}" onclick="window.TracesApp.smartInspect('${sqlId}', 'sql_id')">${sqlId}</span>`;
    });
    // 3. Linkify SCHEMA.OBJECT patterns (e.g. HR.EMPLOYEES, SYS.V$SESSION)
    html = html.replace(/\b([A-Z][A-Z0-9_$#]{1,29}\.[A-Z][A-Z0-9_$#]{1,29})\b/g, (m, schObj) => {
      return `<span class="toad-clickable-token" style="color:#0369a1; font-weight:600;" title="Clique para inspecionar ${schObj} ou abrir no Schema Browser" onclick="window.TracesApp.smartInspect('${schObj}', 'object')">${schObj}</span>`;
    });
    return html;
  }

  navigateToObject(rawToken) {
    if (!rawToken) return;
    const clean = String(rawToken).trim().replace(/^["']+|["';]+$/g, '');
    let schema = this.schemaBrowser?.currentSchema || 'HR';
    let objName = clean.toUpperCase();
    if (clean.includes('.')) {
      const parts = clean.split('.');
      schema = parts[0].replace(/^["']+|["']+$/g, '').toUpperCase();
      objName = parts[1].replace(/^["']+|["']+$/g, '').toUpperCase();
    }

    this.openWindow('browser');
    if (!this.schemaBrowser) return;

    // Check if it is a known tablespace
    const tsList = this.schemaBrowser.allTablespacesOverview || this.databaseProbe?.tablespaces || [];
    if (tsList.some(t => (t.name || '').toUpperCase() === objName) || ['SYSTEM', 'SYSAUX', 'USERS', 'UNDOTBS1', 'TEMP'].includes(objName)) {
      this.schemaBrowser.expandedCategories['tablespaces'] = true;
      this.schemaBrowser.selectCategory('tablespaces');
      this.schemaBrowser.selectObject(objName, 'tablespaces');
      this.notify(`Navegado para Tablespace ${objName} no Schema Browser.`, 'info');
      return;
    }

    // Check if it is a schema/user name itself
    const knownSchemas = this.schemaBrowser.schemas || (window.TRACES_DB ? Object.keys(window.TRACES_DB.schemas || {}) : []);
    if (!clean.includes('.') && knownSchemas.includes(objName)) {
      this.schemaBrowser.selectSchema(objName);
      this.notify(`Schema Browser alterado para o schema ${objName}.`, 'info');
      return;
    }

    if (schema && schema !== this.schemaBrowser.currentSchema && knownSchemas.includes(schema)) {
      this.schemaBrowser.currentSchema = schema;
      if (this.schemaBrowser.schemaSelect) this.schemaBrowser.schemaSelect.value = schema;
    }

    const data = this.schemaBrowser.getSchemaData ? this.schemaBrowser.getSchemaData() : {};
    const cats = ['tables', 'views', 'mviews', 'packages', 'procedures', 'functions', 'indexes', 'triggers', 'sequences', 'synonyms', 'types', 'tablespaces', 'users', 'roles', 'jobs'];
    let foundCat = 'tables';
    for (const c of cats) {
      const arr = data[c] || [];
      if (arr.some(item => (item.name || '').toUpperCase() === objName)) {
        foundCat = c;
        break;
      }
    }

    this.schemaBrowser.expandedCategories[foundCat] = true;
    this.schemaBrowser.currentCategory = foundCat;
    this.schemaBrowser.render();
    this.schemaBrowser.selectObject(objName, foundCat);
    this.notify(`Inspecionando ${schema}.${objName} no Schema Browser.`, 'info');
  }

  inspectProbeAlert(idx) {
    const alert = this.databaseProbe?.alerts?.[idx];
    if (!alert) return;
    const isPass = alert.status === 'PASS';
    const isWarn = alert.status === 'WARN';
    const badgeBg = isPass ? '#dcfce7' : isWarn ? '#fef3c7' : '#fee2e2';
    const badgeColor = isPass ? '#15803d' : isWarn ? '#b45309' : '#b91c1c';

    // Determine best related module
    const textCombined = `${alert.name} ${alert.desc} ${alert.value}`.toLowerCase();
    let relatedBtnHtml = `<button class="btn btn-primary" onclick="window.TracesApp.openWindow('dba', 'browser'); document.getElementById('toad-smart-inspector-modal')?.remove();">🏛 Abrir Parâmetros (SPFILE)</button>`;
    if (textCombined.includes('tablespace') || textCombined.includes('space') || textCombined.includes('extent') || textCombined.includes('datafile')) {
      relatedBtnHtml = `<button class="btn btn-primary" onclick="window.TracesApp.openWindow('dba', 'spacemanager'); document.getElementById('toad-smart-inspector-modal')?.remove();">📊 Abrir Space Manager</button>`;
    } else if (textCombined.includes('undo') || textCombined.includes('01555')) {
      relatedBtnHtml = `<button class="btn btn-primary" onclick="window.TracesApp.openWindow('dba', 'undoadvisor'); document.getElementById('toad-smart-inspector-modal')?.remove();">⏱ Abrir Undo Advisor</button>`;
    } else if (textCombined.includes('session') || textCombined.includes('lock') || textCombined.includes('process')) {
      relatedBtnHtml = `<button class="btn btn-primary" onclick="window.TracesApp.openWindow('sessions'); document.getElementById('toad-smart-inspector-modal')?.remove();">👥 Abrir Session Browser</button>`;
    } else if (textCombined.includes('rman') || textCombined.includes('backup') || textCombined.includes('archive') || textCombined.includes('recovery')) {
      relatedBtnHtml = `<button class="btn btn-primary" onclick="window.TracesApp.openWindow('dba', 'rman'); document.getElementById('toad-smart-inspector-modal')?.remove();">🛡️ Abrir RMAN Backup &amp; Terminal</button>`;
    } else if (textCombined.includes('sga') || textCombined.includes('pga') || textCombined.includes('memory') || textCombined.includes('cache') || textCombined.includes('hit')) {
      relatedBtnHtml = `<button class="btn btn-primary" onclick="window.TracesApp.openWindow('spotlight'); document.getElementById('toad-smart-inspector-modal')?.remove();">💡 Abrir Spotlight Memory &amp; SGA</button>`;
    }

    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid #cbd5e1; padding:10px 12px; border-radius:4px;">
          <div>
            <div style="font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase;">Regra de Diagnóstico #${alert.id}</div>
            <div style="font-size:14px; font-weight:800; color:#0f172a;">${this.escapeHtmlSafe(alert.name)}</div>
          </div>
          <span style="background:${badgeBg}; color:${badgeColor}; padding:4px 10px; border-radius:4px; font-weight:800; font-size:11px;">${alert.status}</span>
        </div>
        <div style="background:#fff; border:1px solid #cbd5e1; padding:10px 12px; border-radius:4px;">
          <div style="font-weight:700; color:#334155; margin-bottom:4px;">Valor / Estado Atual Detectado:</div>
          <div style="font-family:var(--toad-font-code, monospace); font-size:13px; font-weight:700; color:#0284c7;">${this.escapeHtmlSafe(alert.value)}</div>
        </div>
        <div style="background:#f8fafc; border-left:4px solid #0284c7; padding:10px 12px; border-radius:4px;">
          <div style="font-weight:700; color:#0f172a; margin-bottom:4px;">📋 Explicação Técnica &amp; Recomendação DBA:</div>
          <div style="color:#334155; line-height:1.5;">${this.escapeHtmlSafe(alert.advice || alert.desc || 'Verifique as métricas relacionadas desta regra na instância Oracle.')}</div>
        </div>
      </div>
    `;

    this.openSmartInspectorModal(`🏥 Diagnóstico Database Probe — #${alert.id} ${alert.name}`, bodyHtml, `
      ${relatedBtnHtml}
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove();">Fechar</button>
    `);
  }

  async smartInspect(rawToken, hintType = null, extraData = null) {
    if (!rawToken) return;
    const token = String(rawToken).trim().replace(/^['"`(\[{]+|['"`)\];,}]+$/g, '').trim();
    if (!token || token.length < 1) return;

    const upper = token.toUpperCase();
    const lower = token.toLowerCase();

    // 1. SQL_ID (13 alphanumeric chars or explicit hintType === 'sql_id')
    if (hintType === 'sql_id' || (/^[a-z0-9]{13}$/i.test(token) && /\d/.test(token) && /[a-z]/i.test(token))) {
      if (this.dbaTools && typeof this.dbaTools.inspectSqlId === 'function') {
        this.dbaTools.inspectSqlId(token);
        return;
      }
    }

    // 2. ORA- / PLS- / RMAN- / TNS- Error Codes
    const oraMatch = token.match(/\b((?:ORA|PLS|RMAN|TNS|SP2)-\d{4,5})\b/i);
    if (hintType === 'ora_error' || oraMatch) {
      const code = (oraMatch ? oraMatch[1] : token).toUpperCase();
      return this.inspectOraError(code, rawToken);
    }

    // 3. Oracle Wait Events
    const isWaitEvent = hintType === 'wait_event' ||
      /^(db file |enq: |log file |buffer busy|latch:|direct path |SQL\*Net |library cache |cursor: |read by other|gc |cell smart|free buffer|write complete|CPU time)/i.test(token);
    if (isWaitEvent) {
      return this.inspectWaitEvent(token);
    }

    // 4. CBO Execution Plan Operations
    const isCboOp = hintType === 'cbo_op' ||
      /^(SELECT STATEMENT|TABLE ACCESS|INDEX RANGE SCAN|INDEX UNIQUE SCAN|INDEX FULL SCAN|INDEX FAST FULL SCAN|INDEX SKIP SCAN|NESTED LOOPS|HASH JOIN|MERGE JOIN|SORT |HASH GROUP BY|FILTER|VIEW|PARTITION |MAT_VIEW|BITMAP )/i.test(upper);
    if (isCboOp) {
      return this.inspectCboOperation(upper);
    }

    // 5. Oracle Background Processes
    const bgProcs = {
      'PMON': { title: 'Process Monitor (PMON)', role: 'Monitora processos de usuário, limpa recursos e locks de sessões abortadas e registra a instância no Oracle Listener.', views: 'V$PROCESS, V$BGPROCESS, V$SESSION', wait: 'pmon timer', tool: 'sessions' },
      'SMON': { title: 'System Monitor (SMON)', role: 'Executa Instance Recovery após crash, limpa segmentos temporários órfãos e faz coalescência de extents contíguos.', views: 'V$BGPROCESS, V$FAST_START_TRANSACTIONS', wait: 'smon timer', tool: 'undoadvisor' },
      'DBW0': { title: 'Database Writer (DBWn)', role: 'Grava blocos modificados (Dirty Buffers) do Database Buffer Cache da SGA para os Datafiles em disco em checkpoints ou falta de buffers livres.', views: 'V$BUFFER_POOL_STATISTICS, V$SYSSTAT', wait: 'db file parallel write / free buffer waits', tool: 'dbmonitor' },
      'LGWR': { title: 'Log Writer (LGWR)', role: 'Descarrega sequencialmente o Redo Log Buffer da SGA para os Online Redo Log Files a cada COMMIT, a cada 3 segundos ou quando o buffer atinge 1/3.', views: 'V$LOG, V$LOGFILE, V$SYSTEM_EVENT', wait: 'log file sync / log file parallel write', tool: 'logminer' },
      'CKPT': { title: 'Checkpoint Process (CKPT)', role: 'Sinaliza o DBWn nos checkpoints e atualiza os cabeçalhos de todos os Datafiles e do Controlfile com o SCN de checkpoint mais recente.', views: 'V$DATAFILE_HEADER, V$DATABASE', wait: 'control file parallel write', tool: 'browser' },
      'ARC0': { title: 'Archiver Process (ARCn)', role: 'Copia os Online Redo Logs cheios para a Fast Recovery Area (FRA) / destino de Archive Logs após cada Log Switch.', views: 'V$ARCHIVED_LOG, V$ARCHIVE_DEST_STATUS', wait: 'ARCH wait on SENDREQ', tool: 'rman' }
    };
    if (hintType === 'process' || bgProcs[upper]) {
      const p = bgProcs[upper] || { title: `Oracle Process (${upper})`, role: 'Processo de background do motor Oracle.', views: 'V$PROCESS, V$BGPROCESS', wait: 'rdbms ipc message', tool: 'sessions' };
      const bodyHtml = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div style="background:#0f172a; color:#fff; padding:10px 14px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:15px; font-weight:800; color:#38bdf8;">⚙️ ${p.title}</span>
            <span style="background:#16a34a; color:#fff; padding:2px 8px; border-radius:3px; font-size:10px; font-weight:700;">ONLINE / HEALTHY</span>
          </div>
          <div style="background:#fff; border:1px solid #cbd5e1; padding:10px 12px; border-radius:4px; line-height:1.5;">
            <b>Função na Arquitetura Oracle:</b><br>${p.role}
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:8px 10px; border-radius:4px;">
              <div style="font-size:10px; color:#64748b; font-weight:700;">VIEWS RELACIONADAS</div>
              <div style="font-family:var(--toad-font-code, monospace); font-weight:700; color:#0369a1; margin-top:2px;">${p.views}</div>
            </div>
            <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:8px 10px; border-radius:4px; cursor:pointer;" onclick="window.TracesApp.smartInspect('${p.wait.split('/')[0].trim()}', 'wait_event')">
              <div style="font-size:10px; color:#64748b; font-weight:700;">WAIT EVENTS ASSOCIADOS (CLIQUE)</div>
              <div class="toad-clickable-token" style="font-family:var(--toad-font-code, monospace); font-weight:700; color:#d97706; margin-top:2px;">${p.wait}</div>
            </div>
          </div>
        </div>
      `;
      return this.openSmartInspectorModal(`⚙️ Processo Oracle — ${upper}`, bodyHtml, `
        <button class="btn btn-primary" onclick="window.TracesApp.openWindow('sessions'); document.getElementById('toad-smart-inspector-modal')?.remove();">👥 Ver Processos no Session Browser</button>
        <button class="btn" onclick="window.TracesApp.openWindow('dba', '${p.tool}'); document.getElementById('toad-smart-inspector-modal')?.remove();">🏛 Abrir Ferramenta DBA (${p.tool.toUpperCase()})</button>
        <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove();">Fechar</button>
      `);
    }

    // 6. Oracle Initialization Parameters
    const paramList = this.dbaTools?.realParameters || this.dbaTools?.cachedData?.['browser']?.parameters || (window.TRACES_DB ? window.TRACES_DB.parameters : []);
    const matchedParam = paramList.find(p => (p.name || '').toLowerCase() === lower);
    if (hintType === 'parameter' || matchedParam || lower.includes('_target') || lower.includes('_size') || lower === 'session_cached_cursors' || lower === 'open_cursors' || lower === 'undo_retention' || lower === 'processes') {
      return this.inspectParameter(lower, matchedParam);
    }

    // 7. Tablespaces
    const tsOverview = this.schemaBrowser?.allTablespacesOverview || this.databaseProbe?.tablespaces || (window.TRACES_DB ? window.TRACES_DB.tablespaces : []);
    const matchedTs = tsOverview.find(t => (t.name || '').toUpperCase() === upper);
    if (hintType === 'tablespace' || matchedTs || ['SYSTEM', 'SYSAUX', 'USERS', 'UNDOTBS1', 'TEMP', 'EXAMPLE'].includes(upper)) {
      return this.inspectTablespace(upper, matchedTs);
    }

    // 8. Schemas / Database Users
    const knownSchemas = this.schemaBrowser?.schemas || (window.TRACES_DB ? Object.keys(window.TRACES_DB.schemas || {}) : ['HR', 'SYS', 'SYSTEM']);
    if (hintType === 'schema' || (!token.includes('.') && knownSchemas.includes(upper))) {
      return this.inspectSchemaUser(upper);
    }

    // 9. Default: Database Object (Table, View, Index, Package, Procedure, Column, or SQL Identifier)
    return this.inspectDatabaseObject(token);
  }

  inspectOraError(code, fullText = '') {
    const kb = {
      'ORA-01555': {
        title: 'snapshot too old: rollback segment number with name "..." too small',
        cause: 'Uma consulta longa tentou ler a imagem consistente (Read Consistency) de um bloco que já foi sobrescrito na tablespace de UNDO após o COMMIT de outra transação.',
        fix: 'Aumente o parâmetro UNDO_RETENTION (DEFERRED/IMMEDIATE), redimensione a tablespace UNDOTBS1 com AUTOEXTEND ON ou otimize o tempo de execução da query.',
        sql: `SELECT begin_time, end_time, undoblks, txncount, maxquerylen, maxqueryid, ssolderrcnt FROM v$undostat ORDER BY begin_time DESC;`,
        tool: ['dba', 'undoadvisor'],
        toolLabel: '⏱ Abrir Undo Advisor'
      },
      'ORA-01652': {
        title: 'unable to extend temp segment by ... in tablespace ...',
        cause: 'Falta de espaço livre na tablespace temporária (TEMP) para operações de Sort (ORDER BY / GROUP BY), Hash Join ou Global Temporary Tables, ou na tablespace permanente durante criação/rebuild de índice.',
        fix: 'Adicione um Tempfile/Datafile ou habilite AUTOEXTEND ON na tablespace afetada, e identifique a sessão que está consumindo mais TEMP.',
        sql: `SELECT tablespace_name, ROUND(tablespace_size/1024/1024,1) size_mb, ROUND(allocated_space/1024/1024,1) alloc_mb, ROUND(free_space/1024/1024,1) free_mb FROM dba_temp_free_space;`,
        tool: ['browser', null],
        toolLabel: '🗄 Abrir Visão Geral de Tablespaces'
      },
      'ORA-01653': {
        title: 'unable to extend table ... in tablespace ...',
        cause: 'A tablespace de dados atingiu 100% da capacidade alocada (ou o limite MAXBYTES do autoextend).',
        fix: 'Redimensione o Datafile existente, aumente o MAXSIZE ou adicione um novo Datafile na tablespace.',
        sql: `SELECT tablespace_name, file_name, ROUND(bytes/1024/1024,1) mb, autoextensible, ROUND(maxbytes/1024/1024,1) max_mb FROM dba_data_files ORDER BY tablespace_name;`,
        tool: ['dba', 'spacemanager'],
        toolLabel: '📊 Abrir Space Manager'
      },
      'ORA-00060': {
        title: 'deadlock detected while waiting for resource',
        cause: 'Duas ou mais sessões estão bloqueando recursos (linhas TX ou tabelas TM) em ordem cruzada, gerando espera circular.',
        fix: 'Inspecione a árvore de bloqueios no Session Browser, verifique se faltam índices em colunas de Foreign Key (FK) e garanta ordem consistente de DML na aplicação.',
        sql: `SELECT sid, serial#, username, blocking_session, event, sql_id, seconds_in_wait FROM v$session WHERE blocking_session IS NOT NULL OR sid IN (SELECT blocking_session FROM v$session);`,
        tool: ['sessions', null],
        toolLabel: '👥 Abrir Session Browser (Locks)'
      },
      'ORA-00942': {
        title: 'table or view does not exist',
        cause: 'A tabela ou view consultada não existe no schema atual, falta prefixar com o schema dono (ex: SCHEMA.TABELA) ou o usuário não possui privilégio SELECT sobre o objeto.',
        fix: 'Pesquise o objeto no Schema Browser em todos os schemas ou conceda permissão via GRANT SELECT.',
        sql: `SELECT owner, object_name, object_type, status FROM all_objects WHERE object_name LIKE UPPER('%');`,
        tool: ['browser', null],
        toolLabel: '🗄 Procurar no Schema Browser'
      },
      'ORA-02096': {
        title: 'specified initialization parameter is not modifiable with this option',
        cause: 'O parâmetro possui ISSYS_MODIFIABLE = DEFERRED (como session_cached_cursors) ou FALSE (estático) e foi executado ALTER SYSTEM SET sem a cláusula DEFERRED ou sem SCOPE=SPFILE.',
        fix: 'Use ALTER SYSTEM SET <param> = <val> DEFERRED SCOPE=BOTH; (para parâmetros DEFERRED) ou SCOPE=SPFILE; (para parâmetros estáticos).',
        sql: `SELECT name, value, isses_modifiable, issys_modifiable, description FROM v$parameter WHERE name LIKE '%cursor%';`,
        tool: ['dba', 'browser'],
        toolLabel: '🏛 Abrir Editor de Parâmetros (SPFILE)'
      },
      'ORA-04031': {
        title: 'unable to allocate ... bytes of shared memory ("shared pool", ...)',
        cause: 'Fragmentação da Shared Pool por excesso de Hard Parses (falta de Bind Variables) ou dimensionamento insuficiente de SHARED_POOL_SIZE / SGA_TARGET.',
        fix: 'Verifique sga_target, shared_pool_size, cursor_sharing e session_cached_cursors.',
        sql: `SELECT pool, name, ROUND(bytes/1024/1024, 2) mb FROM v$sgastat WHERE pool = 'shared pool' ORDER BY bytes DESC;`,
        tool: ['dba', 'browser'],
        toolLabel: '🏛 Inspecionar SGA / Parâmetros'
      },
      'ORA-00257': {
        title: 'Archiver error. Connect internal only, until freed',
        cause: 'A Fast Recovery Area (FRA) atingiu 100% da capacidade (DB_RECOVERY_FILE_DEST_SIZE) e o processo ARCn não consegue gravar novos Archive Logs, travando novas transações.',
        fix: 'Abra o módulo RMAN, execute CROSSCHECK ARCHIVELOG ALL; DELETE EXPIRED/OBSOLETE; ou aumente o parâmetro db_recovery_file_dest_size.',
        sql: `SELECT name, ROUND(space_limit/1024/1024/1024,2) limit_gb, ROUND(space_used/1024/1024/1024,2) used_gb, ROUND(space_reclaimable/1024/1024/1024,2) reclaim_gb FROM v$recovery_file_dest;`,
        tool: ['dba', 'rman'],
        toolLabel: '🛡️ Abrir Módulo RMAN & FRA'
      }
    };

    const info = kb[code] || {
      title: `Código de Diagnóstico Oracle (${code})`,
      cause: `Mensagem capturada: ${fullText || code}. Consulte o dicionário de erros ou o Alert Log da instância para detalhes contextuais.`,
      fix: 'Verifique a sintaxe do comando, privilégios do schema atual, espaço em tablespaces e parâmetros da sessão.',
      sql: `SELECT * FROM v$diag_alert_ext WHERE message_text LIKE '%${code}%' FETCH FIRST 20 ROWS ONLY;`,
      tool: ['dba', 'browser'],
      toolLabel: '🏛 Abrir DBA Hub & Alert Log'
    };

    const safeSql = info.sql.replace(/'/g, "\\'");
    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="background:#fef2f2; border:1px solid #fca5a5; border-left:4px solid #dc2626; padding:10px 12px; border-radius:4px;">
          <div style="font-size:15px; font-weight:800; color:#991b1b;">🚨 ${code}: ${this.escapeHtmlSafe(info.title)}</div>
        </div>
        <div style="background:#fff; border:1px solid #cbd5e1; padding:10px 12px; border-radius:4px; line-height:1.5;">
          <b style="color:#0f172a;">🔍 Causa Raiz no Oracle:</b><br>${this.escapeHtmlSafe(info.cause)}
        </div>
        <div style="background:#f0fdf4; border:1px solid #86efac; padding:10px 12px; border-radius:4px; line-height:1.5;">
          <b style="color:#166534;">🛠️ Ação Recomendada (DBA Fix):</b><br>${this.escapeHtmlSafe(info.fix)}
        </div>
        <div>
          <div style="font-weight:700; font-size:11px; color:#475569; margin-bottom:4px;">Query SQL de Diagnóstico Imediato:</div>
          <pre style="margin:0; padding:8px 10px; background:#0f172a; color:#38bdf8; border-radius:4px; font-family:var(--toad-font-code, monospace); font-size:11px; white-space:pre-wrap;">${this.escapeHtmlSafe(info.sql)}</pre>
        </div>
      </div>
    `;

    this.openSmartInspectorModal(`🚨 Diagnóstico de Erro Oracle — ${code}`, bodyHtml, `
      <button class="btn btn-primary" onclick="window.TracesApp.openWindow('${info.tool[0]}', ${info.tool[1] ? `'${info.tool[1]}'` : 'null'}); document.getElementById('toad-smart-inspector-modal')?.remove();">${info.toolLabel}</button>
      <button class="btn" onclick="window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor?.addNewTab('${safeSql}', 'diag_${code}.sql'); document.getElementById('toad-smart-inspector-modal')?.remove();">📝 Abrir Diagnóstico no SQL Editor</button>
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove();">Fechar</button>
    `);
  }

  inspectWaitEvent(eventName) {
    const evLower = eventName.toLowerCase();
    let waitClass = 'User I/O / Concurrency';
    let cause = 'Sessões aguardando liberação de recurso ou operação de I/O no motor Oracle.';
    let pMeaning = 'P1 = File# / Lock ID | P2 = Block# | P3 = Blocks / Mode';
    let tuning = 'Inspecione as sessões ativas neste evento e verifique o plano de execução (DBMS_XPLAN) do SQL_ID associado.';
    let targetSub = 'dbmonitor';

    if (evLower.includes('sequential read')) {
      waitClass = 'User I/O';
      cause = 'Leitura física de bloco único (Single-Block Read), tipicamente causada por acesso via Índice (INDEX RANGE/UNIQUE SCAN) ou Table Access by Index Rowid.';
      pMeaning = 'P1 = file# (ID do Datafile) | P2 = block# (Bloco inicial) | P3 = blocks (= 1)';
      tuning = 'Verifique se o Clustering Factor do índice está alto, se o Buffer Cache (DB_CACHE_SIZE) pode ser ampliado ou se há índices seletivos demais em tabelas grandes.';
    } else if (evLower.includes('scattered read') || evLower.includes('direct path read')) {
      waitClass = 'User I/O';
      cause = 'Leitura física multibloco (Multi-Block Read), característica de Full Table Scans (TABLE ACCESS FULL) ou Index Fast Full Scans.';
      pMeaning = 'P1 = file# | P2 = block# | P3 = blocks (db_file_multiblock_read_count)';
      tuning = 'Identifique o SQL realizando Full Table Scan e avalie a criação de índice ou particionamento.';
    } else if (evLower.includes('enq: tx') || evLower.includes('lock')) {
      waitClass = 'Application / Concurrency';
      cause = 'Contenção de bloqueio de linha (Row-Level Lock TX): uma sessão está tentando atualizar/excluir uma linha já modificada por outra sessão que ainda não executou COMMIT ou ROLLBACK.';
      pMeaning = 'P1 = name|mode | P2 = usn<<16 | slot | P3 = sequence (Undo Transaction ID)';
      tuning = 'Abra a Árvore de Locks no Session Browser para identificar a sessão Blocker (SID bloqueadora), o SQL_ID e o objeto travado.';
      targetSub = 'sessions';
    } else if (evLower.includes('log file sync')) {
      waitClass = 'Commit';
      cause = 'Sessões de usuário aguardando o processo LGWR gravar o Redo Buffer em disco durante o processamento de COMMIT.';
      pMeaning = 'P1 = buffer# no Redo Log Buffer que precisa ser sincronizado';
      tuning = 'Evite COMMIT dentro de loops PL/SQL (Commit-per-row) e verifique a latência de escrita dos discos dos Online Redo Logs.';
    } else if (evLower.includes('buffer busy') || evLower.includes('cache buffers chains')) {
      waitClass = 'Concurrency';
      cause = 'Múltiplas sessões disputando simultaneamente os mesmos blocos quentes (Hot Blocks) no Buffer Cache da SGA.';
      pMeaning = 'P1 = file# | P2 = block# | P3 = class# (Data Block / Segment Header / Undo Header)';
      tuning = 'Use ASSM (Segment Space Management AUTO), considere Reverse Key Indexes ou Hash Partitioning para sequências concorrentes.';
    }

    const activeWaiting = (this.sessionMonitor?.sessions || []).filter(s => (s.event || '').toLowerCase().includes(evLower));
    const diagSql = `SELECT sid, serial#, username, status, sql_id, event, p1, p2, p3, seconds_in_wait, blocking_session\nFROM v$session\nWHERE LOWER(event) LIKE '%${evLower.replace(/'/g, '')}%';`;

    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="background:#0f172a; color:#fff; padding:10px 14px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:10px; color:#94a3b8; text-transform:uppercase;">Oracle Wait Event (${waitClass})</div>
            <div style="font-size:15px; font-weight:800; color:#facc15; font-family:var(--toad-font-code, monospace);">${this.escapeHtmlSafe(eventName)}</div>
          </div>
          <span style="background:${activeWaiting.length > 0 ? '#dc2626' : '#16a34a'}; color:#fff; padding:3px 9px; border-radius:4px; font-weight:700; font-size:11px;">
            ${activeWaiting.length} Sessão(ões) Agora
          </span>
        </div>
        <div style="background:#fff; border:1px solid #cbd5e1; padding:10px 12px; border-radius:4px; line-height:1.5;">
          <b>📖 O que significa este evento:</b><br>${this.escapeHtmlSafe(cause)}
        </div>
        <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:8px 12px; border-radius:4px; font-family:var(--toad-font-code, monospace); font-size:11px; color:#0369a1;">
          <b>Parâmetros V$SESSION_WAIT:</b> ${this.escapeHtmlSafe(pMeaning)}
        </div>
        <div style="background:#f0fdf4; border:1px solid #86efac; padding:10px 12px; border-radius:4px; line-height:1.5;">
          <b style="color:#166534;">⚡ Recomendações de Tuning DBA:</b><br>${this.escapeHtmlSafe(tuning)}
        </div>
        ${activeWaiting.length > 0 ? `
          <div style="background:#fff; border:1px solid #cbd5e1; padding:8px 10px; border-radius:4px;">
            <div style="font-weight:700; margin-bottom:6px; font-size:11px;">Sessões Aguardando Neste Evento Agora:</div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              ${activeWaiting.map(s => `
                <span class="editor-cursor-token-pill" onclick="window.TracesApp.openWindow('sessions'); window.TracesApp.sessionMonitor?.selectSession(${s.sid}, ${s.serial}); document.getElementById('toad-smart-inspector-modal')?.remove();">
                  👤 SID ${s.sid} (${s.username || 'BG'}${s.sqlId ? ' • SQL_ID: ' + s.sqlId : ''})
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    const safeSql = diagSql.replace(/'/g, "\\'").replace(/\n/g, '\\n');
    this.openSmartInspectorModal(`⚡ Wait Event Inspector — ${eventName}`, bodyHtml, `
      <button class="btn btn-primary" onclick="window.TracesApp.openWindow('sessions'); document.getElementById('toad-smart-inspector-modal')?.remove();">👥 Ver Sessões no Session Browser</button>
      <button class="btn" onclick="window.TracesApp.openWindow('dba', 'awr'); document.getElementById('toad-smart-inspector-modal')?.remove();">⏱ Abrir AWR / ASH</button>
      <button class="btn" onclick="window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor?.addNewTab('${safeSql}', 'wait_diag.sql'); document.getElementById('toad-smart-inspector-modal')?.remove();">📝 Abrir Query no Editor</button>
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove();">Fechar</button>
    `);
  }

  inspectCboOperation(opName) {
    let desc = 'Operação do plano de execução calculada pelo Cost-Based Optimizer (CBO) do Oracle.';
    let tip = 'Verifique a cardinalidade estimada (E-Rows) comparada às linhas reais e certifique-se de que as estatísticas do objeto estão atualizadas via DBMS_STATS.';
    let hint = '/*+ GATHER_PLAN_STATISTICS */';

    if (opName.includes('TABLE ACCESS FULL')) {
      desc = 'Leitura sequencial completa de todos os blocos abaixo da High Water Mark (HWM) da tabela usando leituras multibloco (db file scattered read / direct path read).';
      tip = 'Ideal quando a consulta lê grande fração da tabela (> 10-15%). Se a consulta deveria retornar poucas linhas, crie um índice nas colunas do predicado WHERE ou verifique se funções nas colunas estão inibindo o índice.';
      hint = '/*+ INDEX(t) */';
    } else if (opName.includes('INDEX UNIQUE SCAN')) {
      desc = 'Busca direta pela árvore B-Tree de um índice UNIQUE ou PRIMARY KEY garantindo no máximo 1 ROWID retornado.';
      tip = 'É o caminho de acesso mais eficiente possível no Oracle (tipicamente 1 a 3 Consistent Gets).';
      hint = '/*+ INDEX(t) */';
    } else if (opName.includes('INDEX RANGE SCAN')) {
      desc = 'Percorre a estrutura B-Tree até o valor inicial do intervalo e segue os ponteiros das folhas (Leaf Blocks) para recuperar os ROWIDs correspondentes.';
      tip = 'Se o Starts * E-Rows for muito alto e houver TABLE ACCESS BY INDEX ROWID seguinte, avalie incluir colunas extras no índice (Covering Index) para evitar ir à tabela.';
      hint = '/*+ INDEX_RS_ASC(t) */';
    } else if (opName.includes('INDEX FAST FULL SCAN')) {
      desc = 'Lê todos os blocos do segmento de índice usando leituras multibloco sem seguir a ordem da árvore (substitui um Full Table Scan quando todas as colunas estão no índice).';
      tip = 'Excelente para COUNT(*) ou projeções cobertas integralmente pelo índice.';
      hint = '/*+ INDEX_FFS(t) */';
    } else if (opName.includes('NESTED LOOPS')) {
      desc = 'Para cada linha retornada pela fonte externa (Driving Row Source), o Oracle executa uma busca (Starts) na fonte interna (Inner Probe), geralmente via índice.';
      tip = 'Excelente para OLTP e conjuntos pequenos de linhas na tabela Driving. Se a tabela externa retornar milhões de linhas, um HASH JOIN costuma ser mais eficiente.';
      hint = '/*+ USE_NL(t1 t2) */';
    } else if (opName.includes('HASH JOIN')) {
      desc = 'Constrói uma tabela Hash em memória (PGA Workarea) com a menor fonte de dados (Build Table) e percorre a segunda fonte (Probe Table) fazendo correspondência por hash.';
      tip = 'Ideal para joins de médio/grande volume ou quando não há índices seletivos na condição de join. Monitore o uso de PGA para evitar Hash Joins multipass em TEMP.';
      hint = '/*+ USE_HASH(t1 t2) */';
    }

    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="background:#0f172a; color:#facc15; padding:10px 14px; border-radius:4px; font-family:var(--toad-font-code, monospace); font-size:15px; font-weight:800;">
          🌳 CBO Operation: ${this.escapeHtmlSafe(opName)}
        </div>
        <div style="background:#fff; border:1px solid #cbd5e1; padding:10px 12px; border-radius:4px; line-height:1.5;">
          <b>Como o Oracle executa esta operação:</b><br>${this.escapeHtmlSafe(desc)}
        </div>
        <div style="background:#f0fdf4; border:1px solid #86efac; padding:10px 12px; border-radius:4px; line-height:1.5;">
          <b style="color:#166534;">💡 Dica de Otimização &amp; Tuning:</b><br>${this.escapeHtmlSafe(tip)}
        </div>
        <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:8px 12px; border-radius:4px; font-family:var(--toad-font-code, monospace);">
          Hint Optimizer Relacionado: <b style="color:#0284c7;">${this.escapeHtmlSafe(hint)}</b>
        </div>
      </div>
    `;

    this.openSmartInspectorModal(`🌳 Operação do Plano de Execução — ${opName}`, bodyHtml, `
      <button class="btn btn-primary" onclick="window.TracesApp.applyOptimizerHint('${hint}'); document.getElementById('toad-smart-inspector-modal')?.remove();">⚡ Aplicar Hint ${hint} no Editor</button>
      <button class="btn" onclick="window.TracesApp.openWindow('optimizer'); document.getElementById('toad-smart-inspector-modal')?.remove();">🚀 Abrir SQL Optimizer</button>
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove();">Fechar</button>
    `);
  }

  async inspectParameter(paramNameLower, cachedParam = null) {
    let p = cachedParam;
    if (!p && this.isConnected()) {
      try {
        const activeConn = this.getActiveConnection();
        const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
        const resp = await fetch(`/api/parameters?search=${encodeURIComponent(paramNameLower)}${connParam}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.parameters && data.parameters.length > 0) {
            p = data.parameters.find(x => (x.name || '').toLowerCase() === paramNameLower) || data.parameters[0];
          }
        }
      } catch (_) {}
    }

    const name = p?.name || paramNameLower;
    const val = p?.value ?? '(Consulte em V$PARAMETER)';
    const sysMod = (name.toLowerCase() === 'session_cached_cursors' ? 'DEFERRED' : (p?.sysModifiable || (p?.isDynamic ? 'IMMEDIATE' : 'FALSE'))).toUpperCase();
    const sesMod = Boolean(p?.sesModifiable || name.toLowerCase() === 'session_cached_cursors');
    const desc = p?.description || 'Parâmetro de configuração e inicialização da instância Oracle (V$PARAMETER / SPFILE).';
    const safeVal = String(val).replace(/'/g, "\\'");

    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="background:#0f172a; color:#fff; padding:10px 14px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-family:var(--toad-font-code, monospace); font-size:15px; font-weight:800; color:#38bdf8;">⚙️ ${this.escapeHtmlSafe(name)}</span>
          <span style="background:#1e293b; color:#4ade80; padding:3px 10px; border-radius:4px; font-family:var(--toad-font-code, monospace); font-weight:700;">Valor: ${this.escapeHtmlSafe(String(val))}</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
          <div style="background:#fff; border:1px solid #cbd5e1; padding:8px 10px; border-radius:4px;">
            <div style="font-size:10px; color:#64748b; font-weight:700;">ISSYS_MODIFIABLE</div>
            <div style="font-weight:800; color:${sysMod === 'IMMEDIATE' ? '#15803d' : sysMod === 'DEFERRED' ? '#d97706' : '#b91c1c'}; margin-top:2px;">${sysMod}</div>
          </div>
          <div style="background:#fff; border:1px solid #cbd5e1; padding:8px 10px; border-radius:4px;">
            <div style="font-size:10px; color:#64748b; font-weight:700;">ISSES_MODIFIABLE</div>
            <div style="font-weight:800; color:${sesMod ? '#0284c7' : '#64748b'}; margin-top:2px;">${sesMod ? 'TRUE (ALTER SESSION)' : 'FALSE'}</div>
          </div>
          <div style="background:#fff; border:1px solid #cbd5e1; padding:8px 10px; border-radius:4px;">
            <div style="font-size:10px; color:#64748b; font-weight:700;">VALOR PADRÃO?</div>
            <div style="font-weight:800; color:#334155; margin-top:2px;">${p?.isDefault !== false ? 'TRUE (Default)' : 'FALSE (Customizado)'}</div>
          </div>
        </div>
        <div style="background:#fff; border:1px solid #cbd5e1; padding:10px 12px; border-radius:4px; line-height:1.5;">
          <b>Descrição Oficial (V$PARAMETER):</b><br>${this.escapeHtmlSafe(desc)}
        </div>
      </div>
    `;

    this.openSmartInspectorModal(`⚙️ Parâmetro Oracle — ${name}`, bodyHtml, `
      <button class="btn btn-primary" onclick="document.getElementById('toad-smart-inspector-modal')?.remove(); window.TracesApp.dbaTools.editParameter('${name}', '${safeVal}', '${sysMod}', ${sesMod});">✏️ Alterar Parâmetro (${sysMod})</button>
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove(); window.TracesApp.openWindow('dba', 'browser');">🏛 Ver no Database Browser (SPFILE)</button>
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove();">Fechar</button>
    `);
  }

  async inspectTablespace(tsName, cachedTs = null) {
    let ts = cachedTs;
    if (!ts && this.isConnected()) {
      try {
        const activeConn = this.getActiveConnection();
        const connParam = activeConn?.id ? `?conn_id=${encodeURIComponent(activeConn.id)}` : '';
        const resp = await fetch(`/api/tablespaces-details${connParam}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.tablespaces) {
            ts = data.tablespaces.find(t => (t.name || '').toUpperCase() === tsName);
          }
        }
      } catch (_) {}
    }

    const totalMb = Number(ts?.totalMb ?? ts?.allocatedMb ?? 1024);
    const usedMb = Number(ts?.usedMb ?? 512);
    const freeMb = Number(ts?.freeMb ?? Math.max(0, totalMb - usedMb));
    const maxMb = Number(ts?.maxMb ?? totalMb * 4);
    const pctAlloc = Number(ts?.pct ?? (totalMb > 0 ? ((usedMb / totalMb) * 100).toFixed(1) : 0));
    const pctMax = Number(ts?.pctMax ?? (maxMb > 0 ? ((usedMb / maxMb) * 100).toFixed(1) : pctAlloc));

    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="background:#0f172a; color:#fff; padding:10px 14px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:10px; color:#94a3b8; text-transform:uppercase;">Oracle Tablespace (${ts?.contents || 'PERMANENT'})</div>
            <div style="font-size:16px; font-weight:800; color:#38bdf8;">🗄️ ${this.escapeHtmlSafe(tsName)}</div>
          </div>
          <span style="background:#16a34a; color:#fff; padding:3px 10px; border-radius:4px; font-weight:700; font-size:11px;">${ts?.status || 'ONLINE'}</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
          <div style="background:#fff; border:1px solid #cbd5e1; padding:8px 10px; border-radius:4px;">
            <div style="font-size:10px; color:#64748b; font-weight:700;">ALOCADO ATUAL</div>
            <div style="font-size:14px; font-weight:800; color:#0f172a;">${totalMb.toLocaleString()} MB</div>
          </div>
          <div style="background:#fff; border:1px solid #cbd5e1; padding:8px 10px; border-radius:4px;">
            <div style="font-size:10px; color:#64748b; font-weight:700;">USADO ATUAL</div>
            <div style="font-size:14px; font-weight:800; color:#0284c7;">${usedMb.toLocaleString()} MB (${pctAlloc}%)</div>
          </div>
          <div style="background:#fff; border:1px solid #cbd5e1; padding:8px 10px; border-radius:4px;">
            <div style="font-size:10px; color:#64748b; font-weight:700;">MAX SIZE (AUTOEXTEND)</div>
            <div style="font-size:14px; font-weight:800; color:#7c3aed;">${maxMb.toLocaleString()} MB</div>
          </div>
          <div style="background:#fff; border:1px solid #cbd5e1; padding:8px 10px; border-radius:4px;">
            <div style="font-size:10px; color:#64748b; font-weight:700;">% USO REAL (VS MAX)</div>
            <div style="font-size:14px; font-weight:800; color:${pctMax >= 85 ? '#dc2626' : '#16a34a'};">${pctMax}%</div>
          </div>
        </div>
        <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:8px 12px; border-radius:4px; font-size:11px;">
          <b>Datafiles / Tempfiles:</b> ${ts?.datafiles || 1} arquivo(s) | <b>Autoextend:</b> ${ts?.autoextend || 'YES'} | <b>Livre Alocado:</b> ${freeMb.toLocaleString()} MB
        </div>
      </div>
    `;

    this.openSmartInspectorModal(`🗄️ Tablespace 360° Inspector — ${tsName}`, bodyHtml, `
      <button class="btn btn-primary" onclick="document.getElementById('toad-smart-inspector-modal')?.remove(); window.TracesApp.navigateToObject('${tsName}');">🗄 Abrir Visão Geral &amp; Datafiles no Schema Browser</button>
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove(); window.TracesApp.openWindow('dba', 'tablespacemap');">💾 Tablespace Map (HWM)</button>
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove(); window.TracesApp.openWindow('dba', 'spacemanager');">📊 Space Manager</button>
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove();">Fechar</button>
    `);
  }

  inspectSchemaUser(schemaName) {
    const activeSessions = (this.sessionMonitor?.sessions || []).filter(s => (s.username || '').toUpperCase() === schemaName);
    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="background:#0f172a; color:#fff; padding:10px 14px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:10px; color:#94a3b8; text-transform:uppercase;">Oracle Database Schema / User</div>
            <div style="font-size:16px; font-weight:800; color:#38bdf8;">👤 ${this.escapeHtmlSafe(schemaName)}</div>
          </div>
          <span style="background:#16a34a; color:#fff; padding:3px 10px; border-radius:4px; font-weight:700; font-size:11px;">ACCOUNT OPEN</span>
        </div>
        <div style="background:#fff; border:1px solid #cbd5e1; padding:10px 12px; border-radius:4px;">
          Sessões ativas/conectadas deste usuário agora: <b>${activeSessions.length}</b> sessão(ões).<br>
          Clique abaixo para navegar diretamente para todos os objetos (Tabelas, Views, Packages, Procedures, Índices) do schema <b>${this.escapeHtmlSafe(schemaName)}</b> ou filtrar suas sessões.
        </div>
      </div>
    `;

    this.openSmartInspectorModal(`👤 Schema / Usuário Oracle — ${schemaName}`, bodyHtml, `
      <button class="btn btn-primary" onclick="document.getElementById('toad-smart-inspector-modal')?.remove(); window.TracesApp.openWindow('browser'); window.TracesApp.schemaBrowser?.selectSchema?.('${schemaName}');">🗄 Explorar Objetos de ${schemaName} no Schema Browser</button>
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove(); window.TracesApp.openWindow('sessions'); if(window.TracesApp.sessionMonitor){ window.TracesApp.sessionMonitor.searchQuery='${schemaName.toLowerCase()}'; if(window.TracesApp.sessionMonitor.searchInput) window.TracesApp.sessionMonitor.searchInput.value='${schemaName}'; window.TracesApp.sessionMonitor.renderTable(); }">👥 Ver Sessões de ${schemaName}</button>
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove();">Fechar</button>
    `);
  }

  async inspectDatabaseObject(rawToken) {
    const clean = String(rawToken).trim().replace(/^["']+|["';]+$/g, '');
    let schema = this.schemaBrowser?.currentSchema || 'HR';
    let objName = clean.toUpperCase();
    if (clean.includes('.')) {
      const parts = clean.split('.');
      schema = parts[0].replace(/^["']+|["']+$/g, '').toUpperCase();
      objName = parts[1].replace(/^["']+|["']+$/g, '').toUpperCase();
    }

    let details = null;
    if (this.isConnected()) {
      try {
        const activeConn = this.getActiveConnection();
        const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
        const resp = await fetch(`/api/object-details?schema=${encodeURIComponent(schema)}&name=${encodeURIComponent(objName)}&type=TABLE${connParam}`);
        if (resp.ok) {
          const d = await resp.json();
          if (d && (d.columns?.length > 0 || d.ddl || d.indexes?.length > 0 || d.source)) {
            details = d;
          }
        }
      } catch (_) {}
    }

    if (!details && this.schemaBrowser) {
      const sData = this.schemaBrowser.getSchemaData ? this.schemaBrowser.getSchemaData() : {};
      for (const cat of ['tables', 'views', 'packages', 'procedures', 'functions', 'indexes', 'sequences', 'synonyms', 'triggers']) {
        const found = (sData[cat] || []).find(o => (o.name || '').toUpperCase() === objName);
        if (found) {
          details = Object.assign({ category: cat }, found);
          break;
        }
      }
    }

    const cols = details?.columns || [];
    const idxs = details?.indexes || [];
    const objType = details?.type || (details?.category ? details.category.slice(0, -1).toUpperCase() : 'DATABASE OBJECT / IDENTIFIER');
    const fullQualified = `${schema}.${objName}`;

    const colsHtml = cols.length > 0 ? `
      <div style="max-height:170px; overflow-y:auto; border:1px solid #cbd5e1; background:#fff; border-radius:4px;">
        <table class="meta-table" style="width:100%; font-size:11px;">
          <thead><tr><th>Coluna</th><th>Tipo de Dados</th><th>Nullable</th><th>Chave</th></tr></thead>
          <tbody>
            ${cols.slice(0, 30).map(c => `
              <tr>
                <td style="font-family:var(--toad-font-code, monospace); font-weight:700; color:#0f172a;">${this.escapeHtmlSafe(c.name)}</td>
                <td style="font-family:var(--toad-font-code, monospace); color:#0284c7;">${this.escapeHtmlSafe(c.type)}</td>
                <td>${c.nullable === false || c.nullable === 'N' ? '<span style="color:#dc2626; font-weight:700;">NOT NULL</span>' : 'NULL'}</td>
                <td>${c.pk ? '<span class="pk-badge">PK</span>' : (c.fk ? '<span class="pk-badge" style="background:#0284c7;">FK</span>' : '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : `
      <div style="background:#fff; border:1px solid #cbd5e1; padding:10px 12px; border-radius:4px; font-size:11.5px; color:#334155;">
        Use os botões abaixo para abrir <b>${this.escapeHtmlSafe(fullQualified)}</b> diretamente no <b>Schema Browser</b>, abrir o <b>Toad Describe (F4)</b>, consultar seus dados ou gerar uma query no <b>SQL Editor</b>.
      </div>
    `;

    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="background:#0f172a; color:#fff; padding:10px 14px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:10px; color:#94a3b8; text-transform:uppercase;">${this.escapeHtmlSafe(objType)} • Owner: <span class="toad-clickable-token" style="color:#38bdf8;" onclick="window.TracesApp.smartInspect('${schema}', 'schema')">${this.escapeHtmlSafe(schema)}</span></div>
            <div style="font-size:16px; font-weight:800; color:#f8fafc; font-family:var(--toad-font-code, monospace);">📦 ${this.escapeHtmlSafe(fullQualified)}</div>
          </div>
          <span style="background:#1e293b; color:#4ade80; padding:3px 10px; border-radius:4px; font-size:11px; font-weight:700;">
            ${cols.length > 0 ? `${cols.length} Colunas | ${idxs.length} Índices` : 'Interativo'}
          </span>
        </div>
        ${colsHtml}
      </div>
    `;

    this.openSmartInspectorModal(`🔎 Smart Inspector — ${fullQualified}`, bodyHtml, `
      <button class="btn btn-primary" onclick="document.getElementById('toad-smart-inspector-modal')?.remove(); window.TracesApp.navigateToObject('${fullQualified}');">🗄 Abrir no Schema Browser</button>
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove(); window.TracesApp.toadModals?.openDescribe?.('${fullQualified}');">🔎 Describe Completo (F4)</button>
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove(); window.TracesApp.openObjectInWorksheet('${objName}');">📊 SELECT * no Editor</button>
      <button class="btn" onclick="document.getElementById('toad-smart-inspector-modal')?.remove();">Fechar</button>
    `);
  }

  openSmartInspectorModal(title, bodyHtml, footerButtonsHtml) {
    let existing = document.getElementById('toad-smart-inspector-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'toad-smart-inspector-modal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:99998; display:flex; align-items:center; justify-content:center; padding:16px;';
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.innerHTML = `
      <div style="background:#f8fafc; border:2px solid #0284c7; border-radius:6px; width:640px; max-width:96vw; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 20px 50px rgba(0,0,0,0.4); font-family:var(--toad-font-ui, sans-serif); overflow:hidden;">
        <div style="background:linear-gradient(90deg, #0f172a 0%, #0369a1 100%); color:#fff; padding:9px 14px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:700; font-size:13px;">${title}</span>
          <button class="btn" style="background:transparent; border:none; color:#fff; font-weight:800; font-size:14px; cursor:pointer;" onclick="document.getElementById('toad-smart-inspector-modal')?.remove();">✕</button>
        </div>
        <div style="padding:14px; overflow-y:auto; flex:1; font-size:12px; color:#1e293b;">
          ${bodyHtml}
        </div>
        <div style="padding:9px 14px; background:#e2e8f0; border-top:1px solid #cbd5e1; display:flex; justify-content:flex-end; align-items:center; gap:8px; flex-wrap:wrap;">
          ${footerButtonsHtml}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
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

/* ==========================================================================
   TOAD FLOATING CONTEXT MENU DISPATCHER
   ========================================================================== */
window.showToadContextMenu = function(x, y, items) {
  let menuEl = document.getElementById('toad-context-menu');
  if (!menuEl) {
    menuEl = document.createElement('div');
    menuEl.id = 'toad-context-menu';
    menuEl.className = 'toad-context-menu';
    document.body.appendChild(menuEl);
  }

  menuEl.innerHTML = items.map((item, idx) => {
    if (item.separator) {
      return '<div class="toad-context-sep"></div>';
    }
    return `
      <div class="toad-context-item ${item.disabled ? 'disabled' : ''}" data-item-idx="${idx}">
        <span class="toad-context-icon">${item.icon || ''}</span>
        <span class="toad-context-label">${item.label}</span>
        ${item.shortcut ? `<span class="toad-context-shortcut">${item.shortcut}</span>` : ''}
      </div>
    `;
  }).join('');

  menuEl.style.display = 'block';
  menuEl.style.left = '0px';
  menuEl.style.top = '0px';

  const menuRect = menuEl.getBoundingClientRect();
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;

  let left = x;
  let top = y;
  if (left + menuRect.width > winWidth) left = Math.max(4, winWidth - menuRect.width - 8);
  if (top + menuRect.height > winHeight) top = Math.max(4, winHeight - menuRect.height - 8);

  menuEl.style.left = `${left}px`;
  menuEl.style.top = `${top}px`;

  const itemEls = menuEl.querySelectorAll('.toad-context-item:not(.disabled)');
  itemEls.forEach(el => {
    const idx = parseInt(el.getAttribute('data-item-idx'), 10);
    const item = items[idx];
    if (item && item.action) {
      el.onclick = (e) => {
        e.stopPropagation();
        menuEl.style.display = 'none';
        item.action();
      };
    }
  });

  const closeMenu = (e) => {
    if (!menuEl.contains(e.target)) {
      menuEl.style.display = 'none';
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('contextmenu', closeMenu);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
    document.addEventListener('contextmenu', closeMenu);
  }, 20);
};


