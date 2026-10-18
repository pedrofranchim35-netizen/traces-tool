/* ==========================================================================
   TOAD FOR ORACLE CLASSIC DROPDOWN MENU ENGINE
   Implements authentic Windows desktop drop-down menus, flyout submenus,
   keyboard shortcuts, and direct module dispatching.
   ========================================================================== */

class ToadMenus {
  constructor() {
    this.activeMenu = null;
    this.menuDefs = this.getMenuDefinitions();
    this.init();
  }

  init() {
    this.renderMenubar();
    this.bindEvents();
  }

  getMenuDefinitions() {
    return {
      'File': [
        { label: 'New Connection...', icon: '⚡', shortcut: '', action: () => window.TracesApp.connectionManager.openModal() },
        { label: 'End Connection (Disconnect)', icon: '🔌', shortcut: '', action: () => window.TracesApp.connectionManager.disconnect() },
        { label: 'Reconnect', icon: '🔄', shortcut: '', action: () => window.TracesApp.connectionManager.openModal() },
        { separator: true },
        { label: 'Open File...', icon: '📂', shortcut: 'Ctrl+O', action: () => window.TracesApp.sqlEditor.addNewTab() },
        { label: 'Save Worksheet', icon: '💾', shortcut: 'Ctrl+S', action: () => window.TracesApp.notify('Saved query to local SQL file.', 'info') },
        { label: 'Save As...', icon: '📄', shortcut: '', action: () => window.TracesApp.notify('Save As: Saved to User Files directory.', 'info') },
        { separator: true },
        { label: 'Print...', icon: '🖨', shortcut: 'Ctrl+P', action: () => window.print() },
        { label: 'Exit', icon: '✕', shortcut: 'Alt+F4', action: () => window.TracesApp.notify('Toad session active.', 'info') }
      ],

      'Edit': [
        { label: 'Undo', icon: '↶', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
        { label: 'Redo', icon: '↷', shortcut: 'Ctrl+Y', action: () => document.execCommand('redo') },
        { separator: true },
        { label: 'Cut', icon: '✂', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
        { label: 'Copy', icon: '📋', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
        { label: 'Paste', icon: '📄', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
        { separator: true },
        { label: 'Format Code (FmtPlus.opt)', icon: '🧹', shortcut: 'Ctrl+Shift+F', action: () => window.TracesApp.sqlEditor.formatSql() },
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
        { label: 'Find...', icon: '🔍', shortcut: 'Ctrl+F', action: () => window.TracesApp.toadModals.openFindDialog() },
        { label: 'Replace...', icon: '🔄', shortcut: 'Ctrl+H', action: () => window.TracesApp.toadModals.openFindDialog(true) },
        { label: 'Find in Files...', icon: '📁', shortcut: '', action: () => window.TracesApp.notify('Searching across project .sql files...', 'info') },
        { separator: true },
        { label: 'Sensitive Column Search (LGPD/GDPR)', icon: '🛡', shortcut: '', action: () => window.TracesApp.toadModals.openSensitiveSearch() }
      ],

      'View': [
        { label: 'Project Manager', icon: '🗂', shortcut: '', action: () => window.TracesApp.toadModals.openProjectManager() },
        { label: 'Workspaces & Desktops...', icon: '🖥', shortcut: '', action: () => window.TracesApp.notify('Saved active workspace layout to Workspaces.xml', 'success') },
        { separator: true },
        { label: 'Toad Options...', icon: '⚙', shortcut: '', action: () => window.TracesApp.toadModals.openOptions() },
        { label: 'Spool SQL to Screen / File', icon: '📜', shortcut: '', action: () => window.TracesApp.toadModals.openSpoolSql() },
        { separator: true },
        { label: 'Status Bar', icon: '✓', shortcut: '', action: () => {} },
        { label: 'MDI Tabs Bar', icon: '✓', shortcut: '', action: () => {} }
      ],

      'Database': [
        {
          label: 'Administration',
          icon: '🏛',
          submenu: [
            { label: 'Database Browser & SPFILE Editor', action: () => window.TracesApp.switchDockView('dba', 'browser') },
            { label: 'Session Browser & Kill Session', action: () => window.TracesApp.switchDockView('sessions') },
            { label: 'Database Monitor', action: () => window.TracesApp.switchDockView('dba', 'dbmonitor') },
            { label: 'Unix / Linux Server Monitor (sar/vmstat)', action: () => window.TracesApp.switchDockView('dba', 'unixmonitor') },
            { label: 'Health Check (120+ Diagnostic Rules)', action: () => window.TracesApp.switchDockView('probe') }
          ]
        },
        {
          label: 'Storage & Space Management',
          icon: '💾',
          submenu: [
            { label: 'Tablespace Map & High Water Mark (HWM)', action: () => window.TracesApp.switchDockView('dba', 'tablespacemap') },
            { label: 'Space Manager & Capacity Growth Forecast', action: () => window.TracesApp.switchDockView('dba', 'spacemanager') },
            { label: 'Segment Advisor & Rebuild Multiple Objects', action: () => window.TracesApp.switchDockView('dba', 'segmentadvisor') },
            { label: 'Undo Advisor (V$UNDOSTAT / ORA-01555)', action: () => window.TracesApp.switchDockView('dba', 'undoadvisor') }
          ]
        },
        {
          label: 'Flashback & Undo',
          icon: '⏪',
          submenu: [
            { label: 'Flashback Browser (DBA_RECYCLEBIN & Purge)', action: () => window.TracesApp.switchDockView('dba', 'flashback') },
            { label: 'LogMiner Interface (DBMS_LOGMNR Redo/Undo)', action: () => window.TracesApp.switchDockView('dba', 'logminer') }
          ]
        },
        {
          label: 'High Availability & RAC',
          icon: '🌐',
          submenu: [
            { label: 'Data Guard Manager (Primary/Standby Sync)', action: () => window.TracesApp.switchDockView('dba', 'dataguard') },
            { label: 'ASM Manager (Diskgroups & Rebalance)', action: () => window.TracesApp.switchDockView('dba', 'asm') },
            { label: 'RAC Cluster Interconnect Diagnostics', action: () => window.TracesApp.switchDockView('dba', 'rac') },
            { label: 'Exadata Smart Scan & Storage Index Info', action: () => window.TracesApp.switchDockView('dba', 'exadata') }
          ]
        },
        {
          label: 'Security & Compliance',
          icon: '🔒',
          submenu: [
            { label: 'Audit Manager & Fine-Grained Auditing (FGA)', action: () => window.TracesApp.switchDockView('dba', 'audit') },
            { label: 'Data Redaction Manager (DBMS_REDACT)', action: () => window.TracesApp.toadModals.openSensitiveSearch() },
            { label: 'Oracle Keystore & TDE Encryption Status', action: () => window.TracesApp.switchDockView('dba', 'wallet') },
            { label: 'Clone User / Role (Create Like Wizard)', action: () => window.TracesApp.toadModals.openCloneUser() }
          ]
        },
        {
          label: 'Compare Tools',
          icon: '⚖',
          submenu: [
            { label: 'Schema Compare (Live / .sdx Snapshot)...', action: () => window.TracesApp.switchDockView('dba', 'schemacompare') },
            { label: 'Data Compare (Row-by-Row Diff)...', action: () => window.TracesApp.switchDockView('dba', 'datacompare') },
            { label: 'Database Compare (init.ora & Roles)...', action: () => window.TracesApp.switchDockView('dba', 'dbcompare') }
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
        { label: 'AWR / ADDM / ASH Performance Browser', icon: '📈', shortcut: '', action: () => window.TracesApp.switchDockView('dba', 'awr') }
      ],

      'Schema': [
        { label: 'Schema Browser', icon: '🗄', shortcut: 'Ctrl+B', action: () => window.TracesApp.switchDockView('browser') },
        { label: 'Toad Describe (F4 Popup)', icon: '🔎', shortcut: 'F4', action: () => window.TracesApp.toadModals.openDescribe() },
        { separator: true },
        { label: 'Query Builder (Visual Joins Canvas)', icon: '🔀', shortcut: '', action: () => window.TracesApp.switchDockView('modeler', 'querybuilder') },
        { label: 'ER Diagrammer (Toad Data Modeler)', icon: '📐', shortcut: '', action: () => window.TracesApp.switchDockView('modeler', 'erd') },
        { label: 'Master-Detail Browser', icon: '🔗', shortcut: '', action: () => window.TracesApp.toadModals.openMasterDetail() },
        { separator: true },
        { label: 'Copy Data to Another Schema / Table...', icon: '📦', shortcut: '', action: () => window.TracesApp.toadModals.openCopyData() },
        { label: 'Generate Test Data (Data Generator)...', icon: '🎲', shortcut: '', action: () => window.TracesApp.toadModals.openDataGenerator() }
      ],

      'Editor': [
        { label: 'Execute Statement', icon: '▶', shortcut: 'F9', action: () => window.TracesApp.sqlEditor.executeStatement() },
        { label: 'Execute as Script', icon: '📄▶', shortcut: 'F5', action: () => window.TracesApp.sqlEditor.executeScript() },
        { label: 'Execute at Cursor', icon: '▶|', shortcut: 'Ctrl+Enter', action: () => window.TracesApp.sqlEditor.executeStatement() },
        { separator: true },
        { label: 'Explain Plan', icon: '🌳', shortcut: 'Ctrl+E', action: () => window.TracesApp.sqlEditor.explainPlan() },
        { label: 'AutoTrace Statistics', icon: '📊', shortcut: '', action: () => { window.TracesApp.switchDockView('editor'); window.TracesApp.sqlEditor.switchOutputTab('autotrace'); } },
        { separator: true },
        { label: 'SQL Recall (SavedSQL.dat)', icon: '📜', shortcut: 'F8', action: () => window.TracesApp.toadModals.openSqlRecall() },
        { label: 'Prompt for Bind Variables...', icon: ':var', shortcut: '', action: () => window.TracesApp.toadModals.openBindVariables() },
        { label: 'Substitution Variables (&var / &&var)...', icon: '&var', shortcut: '', action: () => window.TracesApp.toadModals.openSubstitutionDialog() },
        { separator: true },
        { label: 'Execute via TSR (Toad Script Runner)', icon: '🚀', shortcut: '', action: () => window.TracesApp.toadModals.openTsr() },
        { label: 'HTML Schema Doc Generator...', icon: '📑', shortcut: '', action: () => window.TracesApp.toadModals.openHtmlDocGen() }
      ],

      'Debug': [
        { label: 'Start PL/SQL Debugger', icon: '🐞', shortcut: '', action: () => window.TracesApp.switchDockView('profiler', 'debug') },
        { label: 'Toggle Breakpoint', icon: '🔴', shortcut: 'F9', action: () => window.TracesApp.toggleBreakpoint() },
        { label: 'Watches & Call Stack', icon: '👁', shortcut: '', action: () => window.TracesApp.switchDockView('profiler', 'debug') },
        { label: 'Compile with Debug Information', icon: '🔨', shortcut: '', action: () => window.TracesApp.compileWithDebugInfo() },
        { separator: true },
        { label: 'PL/SQL Profiler (DBMS_PROFILER Line-by-Line)', icon: '⏱', shortcut: '', action: () => window.TracesApp.switchDockView('profiler', 'profiler') },
        { label: 'Code Analysis (CodeXpert AST Metrics)', icon: '📊', shortcut: '', action: () => window.TracesApp.switchDockView('rules') },
        { label: 'Team Coding (TCX_OBJECTS Locks & VCS)', icon: '👥', shortcut: '', action: () => window.TracesApp.switchDockView('profiler', 'teamcoding') },
        { label: 'Code Tester for Oracle (Automated Unit Tests)', icon: '🧪', shortcut: '', action: () => window.TracesApp.switchDockView('profiler', 'tester') }
      ],

      'Session': [
        { label: 'Kill Session (IMMEDIATE)', icon: '☠', shortcut: '', action: () => window.TracesApp.sessionMonitor.killCurrentSession('IMMEDIATE') },
        { label: 'Disconnect Session (POST_TRANSACTION)', icon: '⏹', shortcut: '', action: () => window.TracesApp.sessionMonitor.killCurrentSession('POST_TRANSACTION') },
        { separator: true },
        {
          label: 'SQL Trace (Event 10046)',
          icon: '🔬',
          submenu: [
            { label: 'Level 1 (Standard SQL Trace)', action: () => window.TracesApp.notify('SQL Trace Event 10046 Level 1 enabled.', 'info') },
            { label: 'Level 4 (With Bind Variables)', action: () => window.TracesApp.notify('SQL Trace Event 10046 Level 4 enabled.', 'info') },
            { label: 'Level 8 (With Wait Events)', action: () => window.TracesApp.notify('SQL Trace Event 10046 Level 8 enabled.', 'info') },
            { label: 'Level 12 (Binds + Wait Events)', action: () => window.TracesApp.notify('SQL Trace Event 10046 Level 12 enabled.', 'success') }
          ]
        },
        { label: 'View Session Lock Tree', icon: '🔒', shortcut: '', action: () => window.TracesApp.switchDockView('sessions') }
      ],

      'Tools': [
        { label: 'Spotlight on Oracle (NOC Architecture Topology)', icon: '💡', shortcut: '', action: () => window.TracesApp.switchDockView('spotlight') },
        { label: 'Quest SQL Optimizer (SQL Rewrite & Baselines)', icon: '⚡', shortcut: '', action: () => window.TracesApp.switchDockView('optimizer') },
        { label: 'Benchmark Factory (Load & Stress Testing)', icon: '🏎', shortcut: '', action: () => window.TracesApp.toadModals.openBenchmarkFactory() },
        { separator: true },
        { label: 'Automation Designer (Workflow App Designer)', icon: '⚙', shortcut: '', action: () => window.TracesApp.switchDockView('automation') },
        { label: 'DBMS_SCHEDULER & DBMS_JOB Manager', icon: '⏰', shortcut: '', action: () => window.TracesApp.toadModals.openSchedulerManager() },
        { label: 'Unix / Linux Crontab Manager', icon: '🐧', shortcut: '', action: () => window.TracesApp.toadModals.openCrontabManager() },
        { separator: true },
        { label: 'TNS Names Editor & TNS Ping...', icon: '🌐', shortcut: '', action: () => window.TracesApp.toadModals.openTnsEditor() },
        { label: 'Quest ScriptRunner (QSR)', icon: '🚀', shortcut: '', action: () => window.TracesApp.toadModals.openTsr() },
        { label: 'External Tools Configuration...', icon: '🧰', shortcut: '', action: () => window.TracesApp.toadModals.openExternalTools() }
      ],

      'Window': [
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
        { label: 'About Toad for Oracle', icon: 'ℹ', shortcut: '', action: () => window.TracesApp.toadModals.openAboutDialog() }
      ]
    };
  }

  renderMenubar() {
    const menubar = document.querySelector('.toad-menubar');
    if (!menubar) return;

    menubar.innerHTML = Object.keys(this.menuDefs).map(title => `
      <div class="toad-menu-item" data-menu="${title}">
        <span>${title}</span>
        <div class="toad-dropdown-menu" id="menu-dropdown-${title}">
          ${this.renderMenuItems(this.menuDefs[title])}
        </div>
      </div>
    `).join('');
  }

  renderMenuItems(items) {
    return items.map((item, idx) => {
      if (item.separator) {
        return '<div class="toad-menu-separator"></div>';
      }

      const hasSub = item.submenu && item.submenu.length > 0;
      return `
        <div class="toad-menu-entry ${hasSub ? 'has-submenu' : ''}" data-idx="${idx}">
          <span class="menu-icon">${item.icon || ''}</span>
          <span class="menu-label">${item.label}</span>
          ${item.shortcut ? `<span class="menu-shortcut">${item.shortcut}</span>` : ''}
          ${hasSub ? '<span class="menu-arrow">▶</span>' : ''}
          ${hasSub ? `
            <div class="toad-submenu">
              ${item.submenu.map((sub, sidx) => `
                <div class="toad-menu-entry" data-subidx="${sidx}">
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

  bindEvents() {
    const menuItems = document.querySelectorAll('.toad-menu-item');

    menuItems.forEach(item => {
      const menuKey = item.getAttribute('data-menu');
      const dropdown = item.querySelector('.toad-dropdown-menu');

      item.addEventListener('click', (e) => {
        e.stopPropagation();
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

    // Close when clicking outside
    document.addEventListener('click', () => {
      this.closeAll();
    });

    // Handle clicks inside dropdown entries
    document.querySelectorAll('.toad-dropdown-menu').forEach(menu => {
      menu.addEventListener('click', (e) => {
        const entry = e.target.closest('.toad-menu-entry');
        if (!entry) return;
        e.stopPropagation();

        const parentItem = entry.closest('.toad-menu-item');
        const menuKey = parentItem ? parentItem.getAttribute('data-menu') : null;
        if (!menuKey) return;

        const subidx = entry.getAttribute('data-subidx');
        if (subidx !== null) {
          const parentEntry = entry.closest('.has-submenu');
          const parentIdx = parentEntry ? parentEntry.getAttribute('data-idx') : null;
          if (parentIdx !== null && this.menuDefs[menuKey]?.[parentIdx]?.submenu?.[subidx]) {
            const subItem = this.menuDefs[menuKey][parentIdx].submenu[subidx];
            try {
              if (subItem && subItem.action) subItem.action();
            } catch (err) {
              console.error('Menu subitem action error:', err);
            }
          }
        } else {
          // If this entry has a submenu flyout, don't close, keep open
          if (entry.classList.contains('has-submenu')) {
            entry.classList.toggle('has-open-submenu');
            return;
          }
          const idx = entry.getAttribute('data-idx');
          const item = this.menuDefs[menuKey]?.[idx];
          try {
            if (item && item.action) item.action();
          } catch (err) {
            console.error('Menu item action error:', err);
          }
        }

        this.closeAll();
      });
    });
  }

  openMenu(itemEl, dropdownEl, menuKey) {
    this.activeMenu = menuKey;
    itemEl.classList.add('active');
    dropdownEl.classList.add('visible');
  }

  closeAll() {
    this.activeMenu = null;
    document.querySelectorAll('.toad-menu-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.toad-dropdown-menu').forEach(d => d.classList.remove('visible'));
  }
}

window.ToadMenus = ToadMenus;
