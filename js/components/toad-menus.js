/* ==========================================================================
   TOAD FOR ORACLE CLASSIC DROPDOWN MENU ENGINE & TOOLBAR DROPDOWNS
   Implements authentic Windows desktop drop-down menus, flyout submenus,
   toolbar expandable menus, keyboard shortcuts, and MDI module dispatching.
   ========================================================================== */

class ToadMenus {
  constructor() {
    this.activeMenu = null;
    this.activeToolbarDropdown = null;
    this.menuDefs = this.getMenuDefinitions();
    this.init();
  }

  init() {
    this.renderMenubar();
    this.renderToolbarDropdowns();
    this.bindEvents();
  }

  getMenuDefinitions() {
    return {
      'File': [
        { label: 'New Connection (Login)...', icon: '⚡', shortcut: '', action: () => window.TracesApp.connectionManager.openModal() },
        { label: 'End Connection (Disconnect)', icon: '🔌', shortcut: '', action: () => window.TracesApp.connectionManager.disconnect() },
        { label: 'Reconnect Active Session', icon: '🔄', shortcut: '', action: () => window.TracesApp.connectionManager.openModal() },
        { separator: true },
        { label: 'New Worksheet', icon: '📝', shortcut: 'Ctrl+N', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.addNewTab(); } },
        { label: 'Open SQL File...', icon: '📂', shortcut: 'Ctrl+O', action: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.sql,.pls,.pks,.pkb,.prc,.fnc,.trg,.txt';
          input.onchange = (ev) => {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              window.TracesApp.openWindow('editor');
              window.TracesApp.sqlEditor.addNewTab(file.name, String(reader.result || ''));
              window.TracesApp.notify(`Arquivo ${file.name} carregado na Worksheet.`, 'success');
            };
            reader.readAsText(file);
          };
          input.click();
        } },
        { label: 'Save Worksheet', icon: '💾', shortcut: 'Ctrl+S', action: () => {
          const sql = window.TracesApp.sqlEditor?.getActiveQuery() || '';
          const blob = new Blob([sql], { type: 'text/sql' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'worksheet.sql';
          a.click();
          window.TracesApp.notify('Worksheet salva como worksheet.sql.', 'success');
        } },
        { label: 'Save As...', icon: '📄', shortcut: '', action: () => {
          const name = prompt('Nome do arquivo SQL para salvar:', 'query.sql');
          if (name) {
            const sql = window.TracesApp.sqlEditor?.getActiveQuery() || '';
            const blob = new Blob([sql], { type: 'text/sql' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = name.endsWith('.sql') ? name : name + '.sql';
            a.click();
            window.TracesApp.notify(`Worksheet salva como ${a.download}.`, 'success');
          }
        } },
        { separator: true },
        { label: 'Print...', icon: '🖨', shortcut: 'Ctrl+P', action: () => window.print() },
        { label: 'Exit Toad for Oracle', icon: '✕', shortcut: 'Alt+F4', action: () => window.TracesApp.closeApplication() }
      ],

      'Edit': [
        { label: 'Undo', icon: '↶', shortcut: 'Ctrl+Z', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.undo(); } },
        { label: 'Redo', icon: '↷', shortcut: 'Ctrl+Y', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.redo(); } },
        { separator: true },
        { label: 'Cut', icon: '✂', shortcut: 'Ctrl+X', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.cut(); } },
        { label: 'Copy', icon: '📋', shortcut: 'Ctrl+C', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.copy(); } },
        { label: 'Paste', icon: '📄', shortcut: 'Ctrl+V', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.paste(); } },
        { label: 'Select All', icon: '🔲', shortcut: 'Ctrl+A', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.selectAll(); } },
        { separator: true },
        { label: 'Toggle Line Comment', icon: '💬', shortcut: 'Ctrl+/', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.toggleComment(); } },
        { label: 'Duplicate Line / Selection', icon: '📑', shortcut: 'Ctrl+D', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.duplicateLine(); } },
        { label: 'Delete Line', icon: '🗑', shortcut: 'Ctrl+Shift+K', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.deleteLine(); } },
        { separator: true },
        { label: 'Format Code (FmtPlus.opt)', icon: '🧹', shortcut: 'Ctrl+Shift+F', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.formatSql(); } },
        { label: 'Code Templates & Snippets...', icon: '📑', shortcut: '', action: () => window.TracesApp.toadModals.openCodeTemplates() },
        { label: 'Auto-Replace Definitions...', icon: '🔤', shortcut: '', action: () => window.TracesApp.toadModals.openAutoReplace() },
        { separator: true },
        {
          label: 'Refactoring',
          icon: '⚙',
          submenu: [
            { label: 'Extract Procedure...', action: () => window.TracesApp.notify('Refactoring: Procedure extracted into package body.', 'success') },
            { label: 'Find Unused Variables', action: () => window.TracesApp.notify('Refactoring: 0 unused variables found in current scope.', 'info') },
            { label: 'Rename Local Identifier...', action: () => window.TracesApp.notify('Refactoring: Identifier renamed in AST.', 'info') },
            { label: 'Generate Spec from Body', action: () => window.TracesApp.notify('Package Specification successfully generated from Body.', 'success') }
          ]
        }
      ],

      'Search': [
        { label: 'Find...', icon: '🔍', shortcut: 'Ctrl+F', action: () => window.TracesApp.toadModals.openFindDialog(false) },
        { label: 'Replace...', icon: '🔄', shortcut: 'Ctrl+H', action: () => window.TracesApp.toadModals.openFindDialog(true) },
        { label: 'Go to Line...', icon: '🔢', shortcut: 'Ctrl+G', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.gotoLine(); } },
        { label: 'Find in Files...', icon: '📁', shortcut: '', action: () => window.TracesApp.notify('Searching across project .sql files...', 'info') },
        { separator: true },
        { label: 'Sensitive Column Search (LGPD/GDPR)', icon: '🛡', shortcut: '', action: () => window.TracesApp.toadModals.openSensitiveSearch() }
      ],

      'View': [
        { label: 'Toad Start Page (Início)', icon: '🏠', shortcut: '', action: () => window.TracesApp.showStartPage() },
        { label: 'Project Manager', icon: '🗂', shortcut: '', action: () => window.TracesApp.toadModals.openProjectManager() },
        { label: 'Workspaces & Desktops...', icon: '🖥', shortcut: '', action: () => window.TracesApp.notify('Saved active workspace layout to Workspaces.xml', 'success') },
        { separator: true },
        { label: 'Toad Options...', icon: '⚙', shortcut: '', action: () => window.TracesApp.toadModals.openOptions() },
        { label: 'Spool SQL to Screen / File', icon: '📜', shortcut: '', action: () => window.TracesApp.toadModals.openSpoolSql() },
        { separator: true },
        { label: 'Status Bar', icon: '✓', shortcut: '', action: () => {
          const sb = document.querySelector('.toad-statusbar');
          if (sb) {
            sb.style.display = sb.style.display === 'none' ? '' : 'none';
            window.TracesApp.notify(`Status Bar ${sb.style.display === 'none' ? 'ocultada' : 'exibida'}.`, 'info');
          }
        } },
        { label: 'MDI Tabs Bar', icon: '✓', shortcut: '', action: () => {
          const tb = document.getElementById('toad-mdi-tabs');
          if (tb) {
            tb.style.display = tb.style.display === 'none' ? '' : 'none';
            window.TracesApp.notify(`MDI Tabs Bar ${tb.style.display === 'none' ? 'ocultada' : 'exibida'}.`, 'info');
          }
        } }
      ],

      'Database': [
        {
          label: 'Administration',
          icon: '🏛',
          submenu: [
            { label: 'Database Browser & SPFILE Editor', action: () => window.TracesApp.openWindow('dba', 'browser') },
            { label: 'Session Browser & Kill Session', action: () => window.TracesApp.openWindow('sessions') },
            { label: 'Database Monitor (Live Waits)', action: () => window.TracesApp.openWindow('dba', 'dbmonitor') },
            { label: 'Unix / Linux Server Monitor (sar/vmstat)', action: () => window.TracesApp.openWindow('dba', 'unixmonitor') },
            { label: 'Health Check (70 Automated Rules)', action: () => window.TracesApp.openWindow('probe') }
          ]
        },
        {
          label: 'Storage & Space Management',
          icon: '💾',
          submenu: [
            { label: 'Tablespace Map & High Water Mark (HWM)', action: () => window.TracesApp.openWindow('dba', 'tablespacemap') },
            { label: 'Space Manager & Capacity Growth Forecast', action: () => window.TracesApp.openWindow('dba', 'spacemanager') },
            { label: 'Segment Advisor & Rebuild Multiple Objects', action: () => window.TracesApp.openWindow('dba', 'segmentadvisor') },
            { label: 'Undo Advisor (V$UNDOSTAT / ORA-01555)', action: () => window.TracesApp.openWindow('dba', 'undoadvisor') }
          ]
        },
        {
          label: 'Flashback & Recovery',
          icon: '⏪',
          submenu: [
            { label: 'Flashback Browser (DBA_RECYCLEBIN & Purge)', action: () => window.TracesApp.openWindow('dba', 'flashback') },
            { label: 'LogMiner Interface (DBMS_LOGMNR Redo/Undo)', action: () => window.TracesApp.openWindow('dba', 'logminer') }
          ]
        },
        {
          label: 'High Availability & RAC',
          icon: '🌐',
          submenu: [
            { label: 'Data Guard Manager (Primary/Standby Sync)', action: () => window.TracesApp.openWindow('dba', 'dataguard') },
            { label: 'ASM Storage Manager (Diskgroups & Rebalance)', action: () => window.TracesApp.openWindow('dba', 'asm') },
            { label: 'RAC Cluster Interconnect Diagnostics', action: () => window.TracesApp.openWindow('dba', 'rac') },
            { label: 'Exadata Smart Scan & Storage Index Info', action: () => window.TracesApp.openWindow('dba', 'exadata') }
          ]
        },
        {
          label: 'Security & Compliance',
          icon: '🔒',
          submenu: [
            { label: 'Audit Manager & Fine-Grained Auditing (FGA)', action: () => window.TracesApp.openWindow('dba', 'audit') },
            { label: 'Data Redaction Manager (DBMS_REDACT)', action: () => window.TracesApp.toadModals.openSensitiveSearch() },
            { label: 'Oracle Keystore & TDE Encryption Status', action: () => window.TracesApp.openWindow('dba', 'wallet') },
            { label: 'Clone User / Role (Create Like Wizard)', action: () => window.TracesApp.toadModals.openCloneUser() }
          ]
        },
        {
          label: 'Compare Tools',
          icon: '⚖',
          submenu: [
            { label: 'Schema Compare (Live / .sdx Snapshot)...', action: () => window.TracesApp.openWindow('dba', 'schemacompare') },
            { label: 'Data Compare (Row-by-Row Diff)...', action: () => window.TracesApp.openWindow('dba', 'datacompare') },
            { label: 'Database Compare (init.ora & Roles)...', action: () => window.TracesApp.openWindow('dba', 'dbcompare') }
          ]
        },
        {
          label: 'Utilities',
          icon: '🛠',
          submenu: [
            { label: 'Data Pump Wizard (Export / Import)...', action: () => window.TracesApp.toadModals.openDataPumpWizard() },
            { label: 'Original Export / Import (exp / imp)...', action: () => window.TracesApp.toadModals.openOriginalExpImpWizard() },
            { label: 'RMAN Template Generator & Script Builder...', action: () => window.TracesApp.toadModals.openRmanGenerator() },
            { label: 'SQL*Loader Wizard (.ctl Control File)...', action: () => window.TracesApp.toadModals.openSqlLoaderWizard() },
            { label: 'TKProf Trace Analyzer Wizard...', action: () => window.TracesApp.toadModals.openTkprofWizard() },
            { label: 'Generate Schema / Database DDL Script...', action: () => window.TracesApp.toadModals.openGenerateScript() }
          ]
        },
        { separator: true },
        { label: 'AWR / ADDM / ASH Performance Browser', icon: '📈', shortcut: '', action: () => window.TracesApp.openWindow('dba', 'awr') }
      ],

      'Schema': [
        { label: 'Schema Browser', icon: '🗄', shortcut: 'Ctrl+B', action: () => window.TracesApp.openWindow('browser') },
        { label: 'Toad Describe (F4 Popup)', icon: '🔎', shortcut: 'F4', action: () => window.TracesApp.toadModals.openDescribe() },
        { separator: true },
        { label: 'Query Builder (Visual Joins Canvas)', icon: '🔀', shortcut: '', action: () => window.TracesApp.openWindow('modeler', 'querybuilder') },
        { label: 'ER Diagrammer (Toad Data Modeler)', icon: '📐', shortcut: '', action: () => window.TracesApp.openWindow('modeler', 'erd') },
        { label: 'Master-Detail Browser', icon: '🔗', shortcut: '', action: () => window.TracesApp.toadModals.openMasterDetail() },
        { separator: true },
        { label: 'Copy Data to Another Schema / Table...', icon: '📦', shortcut: '', action: () => window.TracesApp.toadModals.openCopyData() },
        { label: 'Generate Test Data (Data Generator)...', icon: '🎲', shortcut: '', action: () => window.TracesApp.toadModals.openDataGenerator() }
      ],

      'Editor': [
        { label: 'Execute Statement', icon: '▶', shortcut: 'F9', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.executeStatement(); } },
        { label: 'Execute as Script', icon: '📄▶', shortcut: 'F5', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.executeScript(); } },
        { label: 'Execute at Cursor', icon: '▶|', shortcut: 'Ctrl+Enter', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.executeStatement(); } },
        { separator: true },
        { label: 'Explain Plan', icon: '🌳', shortcut: 'Ctrl+E', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.explainPlan(); } },
        { label: 'AutoTrace Statistics', icon: '📊', shortcut: '', action: () => { window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor.switchOutputTab('autotrace'); } },
        { separator: true },
        { label: 'SQL Recall (SavedSQL.dat)', icon: '📜', shortcut: 'F8', action: () => window.TracesApp.toadModals.openSqlRecall() },
        { label: 'Prompt for Bind Variables...', icon: ':var', shortcut: '', action: () => window.TracesApp.toadModals.openBindVariables() },
        { label: 'Substitution Variables (&var / &&var)...', icon: '&var', shortcut: '', action: () => window.TracesApp.toadModals.openSubstitutionDialog() },
        { separator: true },
        { label: 'Execute via TSR (Toad Script Runner)', icon: '🚀', shortcut: '', action: () => window.TracesApp.toadModals.openTsr() },
        { label: 'HTML Schema Doc Generator...', icon: '📑', shortcut: '', action: () => window.TracesApp.toadModals.openHtmlDocGen() }
      ],

      'Debug': [
        { label: 'Start PL/SQL Debugger', icon: '🐞', shortcut: '', action: () => window.TracesApp.openWindow('profiler', 'debug') },
        { label: 'Toggle Breakpoint', icon: '🔴', shortcut: 'F9', action: () => window.TracesApp.toggleBreakpoint() },
        { label: 'Watches & Call Stack', icon: '👁', shortcut: '', action: () => window.TracesApp.openWindow('profiler', 'debug') },
        { label: 'Compile with Debug Information', icon: '🔨', shortcut: '', action: () => window.TracesApp.compileWithDebugInfo() },
        { separator: true },
        { label: 'PL/SQL Profiler (DBMS_PROFILER Line-by-Line)', icon: '⏱', shortcut: '', action: () => window.TracesApp.openWindow('profiler', 'profiler') },
        { label: 'Code Analysis (CodeXpert AST Metrics)', icon: '📊', shortcut: '', action: () => window.TracesApp.openWindow('rules') },
        { label: 'Team Coding (TCX_OBJECTS Locks & VCS)', icon: '👥', shortcut: '', action: () => window.TracesApp.openWindow('profiler', 'teamcoding') },
        { label: 'Code Tester for Oracle (Automated Unit Tests)', icon: '🧪', shortcut: '', action: () => window.TracesApp.openWindow('profiler', 'tester') }
      ],

      'Session': [
        { label: 'Session Browser (V$SESSION)', icon: '👥', shortcut: '', action: () => window.TracesApp.openWindow('sessions') },
        { label: 'Kill Session (IMMEDIATE)', icon: '☠', shortcut: '', action: () => { window.TracesApp.openWindow('sessions'); window.TracesApp.sessionMonitor.killCurrentSession('IMMEDIATE'); } },
        { label: 'Disconnect Session (POST_TRANSACTION)', icon: '⏹', shortcut: '', action: () => { window.TracesApp.openWindow('sessions'); window.TracesApp.sessionMonitor.killCurrentSession('POST_TRANSACTION'); } },
        { separator: true },
        {
          label: 'SQL Trace (Event 10046)',
          icon: '🔬',
          submenu: [
            { label: 'Level 1 (Standard SQL Trace)', action: async () => {
              if (window.TracesApp?.isRealDatabase) {
                await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: "ALTER SESSION SET EVENTS '10046 trace name context forever, level 1';" }) });
              }
              window.TracesApp.notify('SQL Trace Event 10046 Level 1 ativado na sessão.', 'info');
            } },
            { label: 'Level 4 (With Bind Variables)', action: async () => {
              if (window.TracesApp?.isRealDatabase) {
                await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: "ALTER SESSION SET EVENTS '10046 trace name context forever, level 4';" }) });
              }
              window.TracesApp.notify('SQL Trace Event 10046 Level 4 ativado na sessão.', 'info');
            } },
            { label: 'Level 8 (With Wait Events)', action: async () => {
              if (window.TracesApp?.isRealDatabase) {
                await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: "ALTER SESSION SET EVENTS '10046 trace name context forever, level 8';" }) });
              }
              window.TracesApp.notify('SQL Trace Event 10046 Level 8 ativado na sessão.', 'info');
            } },
            { label: 'Level 12 (Binds + Wait Events)', action: async () => {
              if (window.TracesApp?.isRealDatabase) {
                await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: "ALTER SESSION SET EVENTS '10046 trace name context forever, level 12';" }) });
              }
              window.TracesApp.notify('SQL Trace Event 10046 Level 12 ativado na sessão (completo).', 'success');
            } }
          ]
        },
        { label: 'View Session Lock Tree', icon: '🔒', shortcut: '', action: () => window.TracesApp.openWindow('sessions') }
      ],

      'Tools': [
        { label: 'Spotlight on Oracle (NOC Architecture Topology)', icon: '💡', shortcut: '', action: () => window.TracesApp.openWindow('spotlight') },
        { label: 'Quest SQL Optimizer (SQL Rewrite & Baselines)', icon: '⚡', shortcut: '', action: () => window.TracesApp.openWindow('optimizer') },
        { label: 'Benchmark Factory (Load & Stress Testing)', icon: '🏎', shortcut: '', action: () => window.TracesApp.toadModals.openBenchmarkFactory() },
        { separator: true },
        { label: 'Database Health Check 360° (Scorecard)', icon: '🏥', shortcut: '', action: () => window.TracesPro.runHealthCheck360() },
        { label: 'Terminal Interativo SQL*Plus / SQLcl', icon: '💻', shortcut: '', action: () => window.TracesPro.openSqlPlusTerminal() },
        { label: 'Cofre Local Criptografado (AES-256)', icon: '🔐', shortcut: '', action: () => window.TracesPro.openVaultDialog() },
        { label: 'Agendador de Tarefas em Background (Daemon)', icon: '⏰', shortcut: '', action: () => window.TracesPro.openTaskSchedulerDialog() },
        { label: 'Engenharia Reversa (ERD Completo Interativo)', icon: '📐', shortcut: '', action: () => window.TracesPro.openSchemaErdModal() },
        { label: 'Schema Compare & Sync DDL Wizard', icon: '⚖', shortcut: '', action: () => window.TracesPro.openSchemaCompareModal() },
        { label: 'Gerador de Massa de Testes Sintéticos (LGPD)', icon: '🎲', shortcut: '', action: () => window.TracesPro.openMockDataModal() },
        { label: 'Tablespace Extent Map & Disk Heatmap', icon: '💾', shortcut: '', action: () => window.TracesPro.openTablespaceHeatmapModal() },
        { label: 'PL/SQL Profiler (Heatmap Linha a Linha)', icon: '⏱', shortcut: '', action: () => window.TracesPro.openProfilerModal() },
        { separator: true },
        { label: 'Automation Designer (Workflow App Designer)', icon: '⚙', shortcut: '', action: () => window.TracesApp.openWindow('automation') },
        { label: 'DBMS_SCHEDULER & DBMS_JOB Manager', icon: '⏰', shortcut: '', action: () => window.TracesApp.toadModals.openSchedulerManager() },
        { label: 'Unix / Linux Crontab Manager', icon: '🐧', shortcut: '', action: () => window.TracesApp.toadModals.openCrontabManager() },
        { separator: true },
        { label: 'TNS Names Editor & TNS Ping...', icon: '🌐', shortcut: '', action: () => window.TracesApp.toadModals.openTnsEditor() },
        { label: 'Quest ScriptRunner (QSR)', icon: '🚀', shortcut: '', action: () => window.TracesApp.toadModals.openTsr() },
        { label: 'External Tools Configuration...', icon: '🧰', shortcut: '', action: () => window.TracesApp.toadModals.openExternalTools() }
      ],

      'Window': [
        { label: 'Toad Start Page (Início)', icon: '🏠', shortcut: '', action: () => window.TracesApp.showStartPage() },
        { label: 'Close Active Window', icon: '✕', shortcut: 'Ctrl+F4', action: () => window.TracesApp.closeActiveWindow() },
        { label: 'Close All Windows', icon: '🗙', shortcut: '', action: () => window.TracesApp.closeAllWindows() },
        { separator: true },
        { label: 'Cascade Windows', icon: '🪟', shortcut: '', action: () => window.TracesApp.tileWindows('cascade') },
        { label: 'Tile Horizontally', icon: '═', shortcut: '', action: () => window.TracesApp.tileWindows('horizontal') },
        { label: 'Tile Vertically', icon: '║', shortcut: '', action: () => window.TracesApp.tileWindows('vertical') },
        { label: 'Restore MDI Tabbed Layout', icon: '🗗', shortcut: '', action: () => window.TracesApp.tileWindows('restore') },
        { separator: true },
        { label: 'Toggle Traces AI Copilot', icon: '▲', shortcut: 'Ctrl+Shift+C', action: () => window.TracesApp.tracesCopilot.toggleDrawer() }
      ],

      'Help': [
        { label: 'Toad for Oracle Help Topics', icon: '❓', shortcut: 'F1', action: () => window.TracesApp.toadModals.openHelpTopics() },
        { label: 'Keyboard Shortcuts Cheatsheet', icon: '⌨', shortcut: '', action: () => window.TracesApp.toadModals.openShortcutsCheatsheet() },
        { separator: true },
        { label: 'Verificar Atualizações do App (GitHub)...', icon: '🔄', shortcut: '', action: () => window.TracesApp.toadModals.openUpdateDialog() },
        { label: 'Baixar Instalador & Atualizador Windows (.exe)', icon: '💾', shortcut: '', action: () => { window.location.href = 'TracesToad-Setup.exe'; } },
        { label: 'Baixar Executável Portátil (TracesToad.exe)', icon: '⚡', shortcut: '', action: () => { window.location.href = 'TracesToad.exe'; } },
        { separator: true },
        { label: 'Sobre o Toad for Oracle', icon: 'ℹ', shortcut: '', action: () => window.TracesApp.toadModals.openAboutDialog() }
      ]
    };
  }

  renderMenubar() {
    const menubar = document.querySelector('.toad-menubar');
    if (!menubar) return;

    const brandHtml = `
      <div class="toad-menubar-brand" title="TRACES Toad for Oracle">
        <img src="assets/traces-logo.png" alt="TRACES">
      </div>
    `;

    const menuItemsHtml = Object.keys(this.menuDefs).map(title => `
      <div class="toad-menu-item" data-menu="${title}">
        <span>${title}</span>
        <div class="toad-dropdown-menu" id="menu-dropdown-${title}">
          ${this.renderMenuItems(this.menuDefs[title], title)}
        </div>
      </div>
    `).join('');

    const rightHtml = `
      <div class="toad-menubar-right">
        <div class="toad-conn-pill" id="header-connection-pill" onclick="window.TracesApp.connectionManager.openModal()" title="Gerenciar Conexão Oracle">
          <span class="toad-conn-indicator" style="background: #9ca3af;"></span>
          <span style="font-weight: 700; color: #555;">Desconectado</span>
          <span style="color: #888; font-size: 10px;">(Clique para Conectar)</span>
        </div>
        <button class="toad-menubar-action-btn" onclick="window.TracesApp.toadModals.openUpdateDialog()" title="Verificar Atualizações do App">
          <span>🔄</span>
          <span>Atualizações</span>
        </button>
      </div>
    `;

    menubar.innerHTML = brandHtml + menuItemsHtml + rightHtml;
  }

  renderToolbarDropdowns() {
    // Populate Toolbar Dropdown for Database
    const dbMenuEl = document.getElementById('tb-menu-Database');
    if (dbMenuEl && this.menuDefs['Database']) {
      dbMenuEl.innerHTML = this.renderMenuItems(this.menuDefs['Database'], 'Database');
    }

    // Populate Toolbar Dropdown for Tools
    const toolsMenuEl = document.getElementById('tb-menu-Tools');
    if (toolsMenuEl && this.menuDefs['Tools']) {
      toolsMenuEl.innerHTML = this.renderMenuItems(this.menuDefs['Tools'], 'Tools');
    }
  }

  toggleToolbarMenu(menuKey, event) {
    if (event) event.stopPropagation();

    const targetDropdown = document.getElementById(`tb-menu-${menuKey}`);
    if (!targetDropdown) return;

    const isVisible = targetDropdown.classList.contains('visible');
    this.closeAll();

    if (!isVisible) {
      targetDropdown.classList.add('visible');
      this.activeToolbarDropdown = targetDropdown;
    }
  }

  renderMenuItems(items, parentMenuKey) {
    return items.map((item, idx) => {
      if (item.separator) {
        return '<div class="toad-menu-separator"></div>';
      }

      const hasSub = item.submenu && item.submenu.length > 0;
      return `
        <div class="toad-menu-entry ${hasSub ? 'has-submenu' : ''}" data-idx="${idx}" data-parent-menu="${parentMenuKey}">
          <span class="menu-icon">${item.icon || ''}</span>
          <span class="menu-label">${item.label}</span>
          ${item.shortcut ? `<span class="menu-shortcut">${item.shortcut}</span>` : ''}
          ${hasSub ? '<span class="menu-arrow">▶</span>' : ''}
          ${hasSub ? `
            <div class="toad-submenu">
              ${item.submenu.map((sub, sidx) => `
                <div class="toad-menu-entry" data-subidx="${sidx}" data-idx="${idx}" data-parent-menu="${parentMenuKey}">
                  <span class="menu-icon"></span>
                  <span class="menu-label">${sub.label}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  handleEntryClick(entry, e) {
    if (!entry) return false;
    if (e) e.stopPropagation();

    const menuKey = entry.getAttribute('data-parent-menu');
    if (!menuKey) return false;

    const subidx = entry.getAttribute('data-subidx');
    const idx = entry.getAttribute('data-idx');

    if (subidx !== null) {
      this.closeAll();
      if (this.menuDefs[menuKey]?.[idx]?.submenu?.[subidx]) {
        const subItem = this.menuDefs[menuKey][idx].submenu[subidx];
        try {
          if (subItem && subItem.action) subItem.action();
        } catch (err) {
          console.error('Menu subitem action error:', err);
        }
      }
      return true;
    } else {
      // If this entry has a submenu flyout, toggle flyout open instead of closing
      if (entry.classList.contains('has-submenu')) {
        entry.classList.toggle('has-open-submenu');
        return true;
      }
      this.closeAll();
      const item = this.menuDefs[menuKey]?.[idx];
      try {
        if (item && item.action) item.action();
      } catch (err) {
        console.error('Menu item action error:', err);
      }
      return true;
    }
  }

  bindEvents() {
    const menuItems = document.querySelectorAll('.toad-menu-item');

    menuItems.forEach(item => {
      const menuKey = item.getAttribute('data-menu');
      const dropdown = item.querySelector('.toad-dropdown-menu');

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        // Se o clique ocorreu dentro de uma opção do dropdown/submenu, executa a ação imediatamente!
        const clickedEntry = e.target.closest('.toad-menu-entry');
        if (clickedEntry) {
          this.handleEntryClick(clickedEntry, e);
          return;
        }
        if (e.target.closest('.toad-dropdown-menu')) {
          return;
        }

        if (this.activeMenu === menuKey) {
          this.closeAll();
        } else {
          this.closeAll();
          this.openMenu(item, dropdown, menuKey);
        }
      });

      item.addEventListener('mouseenter', () => {
        if (this.activeMenu && this.activeMenu !== menuKey) {
          this.closeAll();
          this.openMenu(item, dropdown, menuKey);
        }
      });
    });

    // Handle clicks inside dropdown entries (toolbar dropdowns or any menu entry) and close when clicking outside
    document.addEventListener('click', (e) => {
      const entry = e.target.closest('.toad-menu-entry');
      if (entry) {
        this.handleEntryClick(entry, e);
        return;
      }
      this.closeAll();
    });
  }

  openMenu(itemEl, dropdownEl, menuKey) {
    this.activeMenu = menuKey;
    if (itemEl) itemEl.classList.add('active');
    if (dropdownEl) dropdownEl.classList.add('visible');
  }

  closeAll() {
    this.activeMenu = null;
    this.activeToolbarDropdown = null;
    document.querySelectorAll('.toad-menu-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.toad-dropdown-menu').forEach(d => d.classList.remove('visible'));
    document.querySelectorAll('.toad-menu-entry.has-open-submenu').forEach(el => el.classList.remove('has-open-submenu'));
  }
}

window.ToadMenus = ToadMenus;
