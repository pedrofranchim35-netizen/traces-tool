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

    this.updateConnectionState();

    if (this.sessionMonitor && typeof this.sessionMonitor.renderDetail === 'function') {
      this.sessionMonitor.renderDetail();
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
    const conn = this.isRealDatabase ? this.realDatabaseConfig : this.connectionManager?.getActive();

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
        if (data.connection.os) {
          this.setServerOs(data.connection.os);
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
      this.sessionMonitor.refresh(true);
    }
    if (viewKey === 'explain' && this.explainPlan) {
      this.explainPlan.onViewActivated();
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


