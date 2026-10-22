/* ==========================================================================
   DBA ADMINISTRATION HUB & ADVANCED SUITE TOOLS (Toad for Oracle 2026 R2 Parity)
   Implements 19 DBA panes matching Toad DBA Suite & Xpert Edition:
   1. Database Browser & SPFILE
   2. Database Monitor (Live Throughput & Wait Events)
   3. Unix / Linux Server Monitor (V$OSSTAT)
   4. Tablespace Map & High Water Mark (HWM)
   5. Space Manager & Capacity Growth Forecast
   6. Segment Advisor & Rebuild Multiple Objects
   7. Undo Advisor (V$UNDOSTAT & ORA-01555 Sizing)
   8. Flashback Recycle Bin (DBA_RECYCLEBIN)
   9. LogMiner Interface (DBMS_LOGMNR)
   10. Data Guard Manager (V$DATAGUARD_STATS)
   11. ASM Manager (V$ASM_DISKGROUP)
   12. RAC Cluster Diagnostics (GV$INSTANCE)
   13. Exadata Smart Scan & Storage Index
   14. Audit Manager & FGA (UNIFIED_AUDIT_TRAIL)
   15. Oracle Keystore & TDE (V$ENCRYPTION_WALLET)
   16. Schema Compare (Live Cross-Schema DDL Diff)
   17. Data Compare (Row-by-Row PK Diff & Sync)
   18. Database Compare (Parameter & Profile Diff)
   19. AWR / ADDM / ASH Browser
   ========================================================================== */

class DbaTools {
  constructor() {
    this.container = document.getElementById('view-dba');
    this.currentSubtab = 'browser';
    this.cachedData = {};
    this.filterState = {};
    this.monitorInterval = null;
    this.monitorOsOverride = null;
    this.render();
  }

  getSubtabTitle(subKey) {
    const titles = {
      'browser': '🏛 Database Browser & SPFILE Editor',
      'dbmonitor': '📈 Database Monitor (Live Waits & Throughput)',
      'unixmonitor': (() => {
        const os = window.TracesApp?.getServerOs?.() || { os_type: 'linux' };
        const activeType = this.monitorOsOverride || os.os_type || 'linux';
        if (activeType === 'windows') return '🪟 Windows Host Server Monitor (V$OSSTAT)';
        if (activeType === 'aix') return '🟣 IBM AIX Host Server Monitor (V$OSSTAT)';
        return '🐧 Unix / Linux Server Monitor (V$OSSTAT)';
      })(),
      'tablespacemap': '💾 Tablespace Map & High Water Mark (HWM)',
      'spacemanager': '📊 Space Manager & Capacity Growth Forecast',
      'segmentadvisor': '🧹 Segment Advisor & Rebuild Multiple Objects',
      'undoadvisor': '⏱ Undo Advisor (V$UNDOSTAT & ORA-01555)',
      'rman': '🛡️ RMAN Backup & Recovery (Verificações & Terminal Interativo)',
      'flashback': '⏪ Flashback Recycle Bin (DBA_RECYCLEBIN)',
      'logminer': '🔍 LogMiner Interface (DBMS_LOGMNR Redo/Undo)',
      'dataguard': '🛡 Data Guard Manager (Primary/Standby Sync)',
      'asm': '💽 ASM Storage Manager (V$ASM_DISKGROUP)',
      'rac': '🌐 RAC Cluster Diagnostics (GV$INSTANCE)',
      'exadata': '⚡ Exadata Smart Scan & Storage Index',
      'audit': '🔒 Audit Manager & FGA (UNIFIED_AUDIT_TRAIL)',
      'wallet': '🔑 Oracle Keystore & TDE (V$ENCRYPTION_WALLET)',
      'schemacompare': '⚖ Schema Compare (Live Cross-Schema Diff)',
      'datacompare': '📋 Data Compare (Row-by-Row PK Diff)',
      'dbcompare': '📑 Database Compare (Parameter & Profile Diff)',
      'awr': '⏱ AWR / ASH Performance Browser'
    };
    return titles[subKey] || subKey;
  }

  refreshCurrentSubtab() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Desconectado do banco de dados. Conecte-se para carregar métricas.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }
    this.loadSubtabData(this.currentSubtab);
  }

  render() {
    if (!this.container) return;

    const activeConn = window.TracesApp?.getActiveConnection?.() || window.TracesApp?.realDatabaseConfig || window.TracesApp?.connectionManager?.getActive?.();
    const isConn = Boolean(window.TracesApp?.isConnected?.() || activeConn);
    this._renderedWithConn = isConn;
    const user = activeConn?.user || 'SYS';
    const host = activeConn?.host || 'localhost';
    const port = activeConn?.port || 1521;
    const sname = activeConn?.serviceName || activeConn?.service_name || 'ORCL';
    const dbTarget = isConn ? `${user}@${host}:${port}/${sname}` : 'Desconectado';

    this.container.innerHTML = `
      <div class="dba-hub-container" style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
        <!-- Header Bar: Tool Title & Quick Selector -->
        <div class="dba-header-bar">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-weight: 700; font-size: 13px; color: #1e293b;" id="dba-current-tool-title">
              ${this.getSubtabTitle(this.currentSubtab)}
            </span>
            <span style="font-size: 11px; color: #64748b;">|</span>
            <label style="font-size: 11px; font-weight: 600; color: #475569;">Ferramenta:</label>
            <select class="toad-conn-combobox" id="dba-tool-selector" style="height: 24px; min-width: 220px;" onchange="window.TracesApp.dbaTools.switchSubtab(this.value);">
              <optgroup label="Instância &amp; Administração">
                <option value="browser" ${this.currentSubtab === 'browser' ? 'selected' : ''}>Database Browser &amp; SPFILE</option>
                <option value="dbmonitor" ${this.currentSubtab === 'dbmonitor' ? 'selected' : ''}>Database Monitor (Wait Events)</option>
                <option value="unixmonitor" ${this.currentSubtab === 'unixmonitor' ? 'selected' : ''}>Unix / OS Server Monitor</option>
              </optgroup>
              <optgroup label="Storage &amp; Capacidade">
                <option value="tablespacemap" ${this.currentSubtab === 'tablespacemap' ? 'selected' : ''}>Tablespace Map (HWM)</option>
                <option value="spacemanager" ${this.currentSubtab === 'spacemanager' ? 'selected' : ''}>Space Manager &amp; Forecast</option>
                <option value="segmentadvisor" ${this.currentSubtab === 'segmentadvisor' ? 'selected' : ''}>Segment Advisor &amp; Rebuild</option>
                <option value="undoadvisor" ${this.currentSubtab === 'undoadvisor' ? 'selected' : ''}>Undo Advisor (ORA-01555)</option>
              </optgroup>
              <optgroup label="Backup, Flashback &amp; Recovery">
                <option value="rman" ${this.currentSubtab === 'rman' ? 'selected' : ''}>🛡️ RMAN Backup &amp; Recovery (Terminal)</option>
                <option value="flashback" ${this.currentSubtab === 'flashback' ? 'selected' : ''}>Flashback Recycle Bin</option>
                <option value="logminer" ${this.currentSubtab === 'logminer' ? 'selected' : ''}>LogMiner (Redo/Undo)</option>
              </optgroup>
              <optgroup label="Alta Disponibilidade &amp; RAC">
                <option value="dataguard" ${this.currentSubtab === 'dataguard' ? 'selected' : ''}>Data Guard Manager</option>
                <option value="asm" ${this.currentSubtab === 'asm' ? 'selected' : ''}>ASM Storage Manager</option>
                <option value="rac" ${this.currentSubtab === 'rac' ? 'selected' : ''}>RAC Cluster Diagnostics</option>
                <option value="exadata" ${this.currentSubtab === 'exadata' ? 'selected' : ''}>Exadata Smart Scan</option>
              </optgroup>
              <optgroup label="Segurança &amp; Auditoria">
                <option value="audit" ${this.currentSubtab === 'audit' ? 'selected' : ''}>Audit Manager (FGA)</option>
                <option value="wallet" ${this.currentSubtab === 'wallet' ? 'selected' : ''}>Keystore &amp; TDE</option>
              </optgroup>
              <optgroup label="Ferramentas de Comparação">
                <option value="schemacompare" ${this.currentSubtab === 'schemacompare' ? 'selected' : ''}>Schema Compare</option>
                <option value="datacompare" ${this.currentSubtab === 'datacompare' ? 'selected' : ''}>Data Compare</option>
                <option value="dbcompare" ${this.currentSubtab === 'dbcompare' ? 'selected' : ''}>Database Compare</option>
                <option value="awr" ${this.currentSubtab === 'awr' ? 'selected' : ''}>AWR / ASH Browser</option>
              </optgroup>
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.refreshCurrentSubtab();" title="Recarregar Dados">
              🔄 Atualizar
            </button>
            <span class="toad-conn-badge-indicator" style="background: ${isConn ? '#e0f2fe' : '#fee2e2'}; color: ${isConn ? '#0369a1' : '#b91c1c'}; font-size: 11px; padding: 3px 8px;">
              ${isConn ? '● Conectado: ' + dbTarget : '● Desconectado'}
            </span>
          </div>
        </div>

        <!-- Workbench Split: Left Categorized Navigation Tree + Right Content Pane -->
        <div class="dba-workspace-split">
          <!-- Left Navigation Sidebar -->
          <div class="dba-sidebar-nav">
            <div class="dba-nav-group">
              <div class="dba-nav-group-title">🏛 Instância &amp; Serviços</div>
              <div class="dba-nav-item ${this.currentSubtab === 'browser' ? 'active' : ''}" data-sub="browser" onclick="window.TracesApp.dbaTools.switchSubtab('browser');">
                <span>🏛 Database Browser &amp; SPFILE</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'dbmonitor' ? 'active' : ''}" data-sub="dbmonitor" onclick="window.TracesApp.dbaTools.switchSubtab('dbmonitor');">
                <span>📈 Database Monitor</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'unixmonitor' ? 'active' : ''}" data-sub="unixmonitor" onclick="window.TracesApp.dbaTools.switchSubtab('unixmonitor');">
                <span>🐧 Unix / OS Monitor</span>
              </div>
            </div>

            <div class="dba-nav-group">
              <div class="dba-nav-group-title">💾 Storage &amp; Espaço</div>
              <div class="dba-nav-item ${this.currentSubtab === 'tablespacemap' ? 'active' : ''}" data-sub="tablespacemap" onclick="window.TracesApp.dbaTools.switchSubtab('tablespacemap');">
                <span>💾 Tablespace Map (HWM)</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'spacemanager' ? 'active' : ''}" data-sub="spacemanager" onclick="window.TracesApp.dbaTools.switchSubtab('spacemanager');">
                <span>📊 Space Manager &amp; Forecast</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'segmentadvisor' ? 'active' : ''}" data-sub="segmentadvisor" onclick="window.TracesApp.dbaTools.switchSubtab('segmentadvisor');">
                <span>🧹 Segment Advisor &amp; Rebuild</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'undoadvisor' ? 'active' : ''}" data-sub="undoadvisor" onclick="window.TracesApp.dbaTools.switchSubtab('undoadvisor');">
                <span>⏱ Undo Advisor</span>
              </div>
            </div>

            <div class="dba-nav-group">
              <div class="dba-nav-group-title">🛡️ RMAN, Flashback &amp; Recovery</div>
              <div class="dba-nav-item ${this.currentSubtab === 'rman' ? 'active' : ''}" data-sub="rman" onclick="window.TracesApp.dbaTools.switchSubtab('rman');">
                <span>🛡️ RMAN Backup &amp; Terminal</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'flashback' ? 'active' : ''}" data-sub="flashback" onclick="window.TracesApp.dbaTools.switchSubtab('flashback');">
                <span>⏪ Flashback Recycle Bin</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'logminer' ? 'active' : ''}" data-sub="logminer" onclick="window.TracesApp.dbaTools.switchSubtab('logminer');">
                <span>🔍 LogMiner (Redo/Undo)</span>
              </div>
            </div>

            <div class="dba-nav-group">
              <div class="dba-nav-group-title">🌐 Alta Disponibilidade &amp; RAC</div>
              <div class="dba-nav-item ${this.currentSubtab === 'dataguard' ? 'active' : ''}" data-sub="dataguard" onclick="window.TracesApp.dbaTools.switchSubtab('dataguard');">
                <span>🛡 Data Guard Manager</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'asm' ? 'active' : ''}" data-sub="asm" onclick="window.TracesApp.dbaTools.switchSubtab('asm');">
                <span>💽 ASM Storage Manager</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'rac' ? 'active' : ''}" data-sub="rac" onclick="window.TracesApp.dbaTools.switchSubtab('rac');">
                <span>🌐 RAC Cluster Diagnostics</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'exadata' ? 'active' : ''}" data-sub="exadata" onclick="window.TracesApp.dbaTools.switchSubtab('exadata');">
                <span>⚡ Exadata Smart Scan</span>
              </div>
            </div>

            <div class="dba-nav-group">
              <div class="dba-nav-group-title">🔒 Segurança &amp; Auditoria</div>
              <div class="dba-nav-item ${this.currentSubtab === 'audit' ? 'active' : ''}" data-sub="audit" onclick="window.TracesApp.dbaTools.switchSubtab('audit');">
                <span>🔒 Audit Manager (FGA)</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'wallet' ? 'active' : ''}" data-sub="wallet" onclick="window.TracesApp.dbaTools.switchSubtab('wallet');">
                <span>🔑 Keystore &amp; TDE</span>
              </div>
            </div>

            <div class="dba-nav-group" style="border-bottom: none;">
              <div class="dba-nav-group-title">⚖ Comparação &amp; Tuning</div>
              <div class="dba-nav-item ${this.currentSubtab === 'schemacompare' ? 'active' : ''}" data-sub="schemacompare" onclick="window.TracesApp.dbaTools.switchSubtab('schemacompare');">
                <span>⚖ Schema Compare</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'datacompare' ? 'active' : ''}" data-sub="datacompare" onclick="window.TracesApp.dbaTools.switchSubtab('datacompare');">
                <span>📋 Data Compare</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'dbcompare' ? 'active' : ''}" data-sub="dbcompare" onclick="window.TracesApp.dbaTools.switchSubtab('dbcompare');">
                <span>📑 Database Compare</span>
              </div>
              <div class="dba-nav-item ${this.currentSubtab === 'awr' ? 'active' : ''}" data-sub="awr" onclick="window.TracesApp.dbaTools.switchSubtab('awr');">
                <span>⏱ AWR / ASH Browser</span>
              </div>
            </div>
          </div>

          <!-- Draggable Vertical Splitter for DBA Sidebar -->
          <div class="splitter-v" id="splitter-dba-sidebar" title="Arraste para redimensionar o menu lateral DBA" style="width: 5px; cursor: col-resize; background: #d0d7de; flex-shrink: 0;"></div>

          <!-- Right Content Pane -->
          <div class="dba-main-content">
            <div class="dba-content-pane ${this.currentSubtab === 'browser' ? 'active' : ''}" id="dba-pane-browser">${this.currentSubtab === 'browser' ? (isConn ? this.renderDatabaseBrowser() : this.renderDisconnectedWatermark(this.getSubtabTitle('browser'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'dbmonitor' ? 'active' : ''}" id="dba-pane-dbmonitor">${this.currentSubtab === 'dbmonitor' ? (isConn ? this.renderDbMonitor() : this.renderDisconnectedWatermark(this.getSubtabTitle('dbmonitor'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'unixmonitor' ? 'active' : ''}" id="dba-pane-unixmonitor">${this.currentSubtab === 'unixmonitor' ? (isConn ? this.renderUnixMonitor() : this.renderDisconnectedWatermark(this.getSubtabTitle('unixmonitor'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'tablespacemap' ? 'active' : ''}" id="dba-pane-tablespacemap">${this.currentSubtab === 'tablespacemap' ? (isConn ? this.renderTablespaceMap() : this.renderDisconnectedWatermark(this.getSubtabTitle('tablespacemap'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'spacemanager' ? 'active' : ''}" id="dba-pane-spacemanager">${this.currentSubtab === 'spacemanager' ? (isConn ? this.renderSpaceManager() : this.renderDisconnectedWatermark(this.getSubtabTitle('spacemanager'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'segmentadvisor' ? 'active' : ''}" id="dba-pane-segmentadvisor">${this.currentSubtab === 'segmentadvisor' ? (isConn ? this.renderSegmentAdvisor() : this.renderDisconnectedWatermark(this.getSubtabTitle('segmentadvisor'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'undoadvisor' ? 'active' : ''}" id="dba-pane-undoadvisor">${this.currentSubtab === 'undoadvisor' ? (isConn ? this.renderUndoAdvisor() : this.renderDisconnectedWatermark(this.getSubtabTitle('undoadvisor'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'rman' ? 'active' : ''}" id="dba-pane-rman">${this.currentSubtab === 'rman' ? (isConn ? this.renderRman() : this.renderDisconnectedWatermark(this.getSubtabTitle('rman'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'flashback' ? 'active' : ''}" id="dba-pane-flashback">${this.currentSubtab === 'flashback' ? (isConn ? this.renderFlashback() : this.renderDisconnectedWatermark(this.getSubtabTitle('flashback'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'logminer' ? 'active' : ''}" id="dba-pane-logminer">${this.currentSubtab === 'logminer' ? (isConn ? this.renderLogMiner() : this.renderDisconnectedWatermark(this.getSubtabTitle('logminer'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'dataguard' ? 'active' : ''}" id="dba-pane-dataguard">${this.currentSubtab === 'dataguard' ? (isConn ? this.renderDataGuard() : this.renderDisconnectedWatermark(this.getSubtabTitle('dataguard'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'asm' ? 'active' : ''}" id="dba-pane-asm">${this.currentSubtab === 'asm' ? (isConn ? this.renderAsm() : this.renderDisconnectedWatermark(this.getSubtabTitle('asm'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'rac' ? 'active' : ''}" id="dba-pane-rac">${this.currentSubtab === 'rac' ? (isConn ? this.renderRac() : this.renderDisconnectedWatermark(this.getSubtabTitle('rac'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'exadata' ? 'active' : ''}" id="dba-pane-exadata">${this.currentSubtab === 'exadata' ? (isConn ? this.renderExadata() : this.renderDisconnectedWatermark(this.getSubtabTitle('exadata'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'audit' ? 'active' : ''}" id="dba-pane-audit">${this.currentSubtab === 'audit' ? (isConn ? this.renderAudit() : this.renderDisconnectedWatermark(this.getSubtabTitle('audit'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'wallet' ? 'active' : ''}" id="dba-pane-wallet">${this.currentSubtab === 'wallet' ? (isConn ? this.renderWallet() : this.renderDisconnectedWatermark(this.getSubtabTitle('wallet'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'schemacompare' ? 'active' : ''}" id="dba-pane-schemacompare">${this.currentSubtab === 'schemacompare' ? (isConn ? this.renderSchemaCompare() : this.renderDisconnectedWatermark(this.getSubtabTitle('schemacompare'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'datacompare' ? 'active' : ''}" id="dba-pane-datacompare">${this.currentSubtab === 'datacompare' ? (isConn ? this.renderDataCompare() : this.renderDisconnectedWatermark(this.getSubtabTitle('datacompare'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'dbcompare' ? 'active' : ''}" id="dba-pane-dbcompare">${this.currentSubtab === 'dbcompare' ? (isConn ? this.renderDbCompare() : this.renderDisconnectedWatermark(this.getSubtabTitle('dbcompare'))) : ''}</div>
            <div class="dba-content-pane ${this.currentSubtab === 'awr' ? 'active' : ''}" id="dba-pane-awr">${this.currentSubtab === 'awr' ? (isConn ? this.renderAwr() : this.renderDisconnectedWatermark(this.getSubtabTitle('awr'))) : ''}</div>
          </div>
        </div>
      </div>
    `;
    this.initDbaSplitter();
  }

  initDbaSplitter() {
    const splitter = document.getElementById('splitter-dba-sidebar');
    const sidebar = this.container?.querySelector('.dba-sidebar-nav');
    if (!splitter || !sidebar) return;
    if (this._dbaSidebarWidth) {
      sidebar.style.width = `${this._dbaSidebarWidth}px`;
      sidebar.style.flex = `0 0 ${this._dbaSidebarWidth}px`;
    }
    let dragging = false;
    splitter.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dragging = true;
      splitter.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const rect = this.container.getBoundingClientRect();
      const w = Math.max(150, Math.min(rect.width - 320, e.clientX - rect.left));
      this._dbaSidebarWidth = w;
      sidebar.style.width = `${w}px`;
      sidebar.style.flex = `0 0 ${w}px`;
    });
    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      splitter.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  renderSubtabByKey(subKey) {
    const map = {
      browser: () => this.renderDatabaseBrowser(),
      dbmonitor: () => this.renderDbMonitor(),
      unixmonitor: () => this.renderUnixMonitor(),
      tablespacemap: () => this.renderTablespaceMap(),
      spacemanager: () => this.renderSpaceManager(),
      segmentadvisor: () => this.renderSegmentAdvisor(),
      undoadvisor: () => this.renderUndoAdvisor(),
      rman: () => this.renderRman(),
      flashback: () => this.renderFlashback(),
      logminer: () => this.renderLogMiner(),
      dataguard: () => this.renderDataGuard(),
      asm: () => this.renderAsm(),
      rac: () => this.renderRac(),
      exadata: () => this.renderExadata(),
      audit: () => this.renderAudit(),
      wallet: () => this.renderWallet(),
      schemacompare: () => this.renderSchemaCompare(),
      datacompare: () => this.renderDataCompare(),
      dbcompare: () => this.renderDbCompare(),
      awr: () => this.renderAwr()
    };
    return map[subKey] ? map[subKey]() : '';
  }

  updateConnectionState(isConn) {
    const activeConn = window.TracesApp?.getActiveConnection?.() || window.TracesApp?.realDatabaseConfig || window.TracesApp?.connectionManager?.getActive?.();
    const connBool = isConn !== undefined ? Boolean(isConn) : Boolean(window.TracesApp?.isConnected?.() || activeConn);

    if (this._renderedWithConn !== connBool || !this.container?.querySelector('.dba-main-content')) {
      this.render();
      if (connBool && window.TracesApp?.currentView === 'dba') {
        this.loadSubtabData(this.currentSubtab);
      }
    } else {
      this.updateConnectionBadge();
    }
  }

  updateConnectionBadge() {
    if (!this.container) return;
    const activeConn = window.TracesApp?.getActiveConnection?.() || window.TracesApp?.realDatabaseConfig || window.TracesApp?.connectionManager?.getActive?.();
    const isConn = Boolean(window.TracesApp?.isConnected?.() || activeConn);
    const badge = this.container.querySelector('.toad-conn-badge-indicator');
    if (badge) {
      const user = activeConn?.user || 'SYS';
      const host = activeConn?.host || 'localhost';
      const port = activeConn?.port || 1521;
      const sname = activeConn?.serviceName || activeConn?.service_name || 'ORCL';
      const dbTarget = isConn ? `${user}@${host}:${port}/${sname}` : 'Desconectado';
      badge.style.background = isConn ? '#e0f2fe' : '#fee2e2';
      badge.style.color = isConn ? '#0369a1' : '#b91c1c';
      badge.textContent = isConn ? `● Conectado: ${dbTarget}` : '● Desconectado';
    }
  }

  onViewActivated(subtabKey) {
    const activeConn = window.TracesApp?.getActiveConnection?.() || window.TracesApp?.realDatabaseConfig || window.TracesApp?.connectionManager?.getActive?.();
    const isConn = Boolean(window.TracesApp?.isConnected?.() || activeConn);

    if (this._renderedWithConn !== isConn || !this.container?.querySelector('.dba-main-content')) {
      this.render();
    } else {
      this.updateConnectionBadge();
    }

    const targetSub = subtabKey || this.currentSubtab || 'browser';
    this.switchSubtab(targetSub);
  }

  async switchSubtab(subKey) {
    this.currentSubtab = subKey;

    const activeConn = window.TracesApp?.getActiveConnection?.() || window.TracesApp?.realDatabaseConfig || window.TracesApp?.connectionManager?.getActive?.();
    const isConn = Boolean(window.TracesApp?.isConnected?.() || activeConn);

    this.updateConnectionBadge();

    // Update left sidebar active class
    document.querySelectorAll('.dba-nav-item').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-sub') === subKey);
    });

    // Update dropdown selector
    const selector = document.getElementById('dba-tool-selector');
    if (selector) selector.value = subKey;

    // Update title
    const titleEl = document.getElementById('dba-current-tool-title');
    if (titleEl) titleEl.textContent = this.getSubtabTitle(subKey);

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    let targetPane = document.getElementById(`dba-pane-${subKey}`);
    if (!targetPane) {
      this.render();
      targetPane = document.getElementById(`dba-pane-${subKey}`);
    }

    if (!isConn) {
      if (targetPane) {
        targetPane.innerHTML = this.renderDisconnectedWatermark(this.getSubtabTitle(subKey));
      }
      document.querySelectorAll('.dba-content-pane').forEach(p => {
        p.classList.toggle('active', p.id === `dba-pane-${subKey}`);
      });
      return;
    }

    // Populate target pane if empty or previously showing watermark
    if (targetPane && (!targetPane.innerHTML.trim() || targetPane.querySelector('.toad-disconnected-watermark'))) {
      targetPane.innerHTML = this.renderSubtabByKey(subKey);
    }

    // Switch pane
    document.querySelectorAll('.dba-content-pane').forEach(p => {
      p.classList.toggle('active', p.id === `dba-pane-${subKey}`);
    });

    // Load data from live Oracle DB
    await this.loadSubtabData(subKey);

    // Start periodic poll for DB Monitor
    if (subKey === 'dbmonitor') {
      this.monitorInterval = setInterval(() => {
        if (this.currentSubtab === 'dbmonitor') this.loadSubtabData('dbmonitor', true);
      }, 3000);
    }
  }

  async loadRealData() {
    return this.loadSubtabData(this.currentSubtab);
  }

  async loadSubtabData(subKey, silent = false) {
    try {
      const urlMap = {
        'browser': '/api/parameters',
        'flashback': '/api/dba/recyclebin'
      };
      let apiUrl = urlMap[subKey] || `/api/dba/${subKey}`;
      const activeConn = window.TracesApp?.getActiveConnection?.() || window.TracesApp?.realDatabaseConfig || window.TracesApp?.connectionManager?.getActive?.();
      if (activeConn?.id) {
        const sep = apiUrl.includes('?') ? '&' : '?';
        apiUrl += `${sep}conn_id=${encodeURIComponent(activeConn.id)}`;
      }
      const resp = await fetch(apiUrl);
      if (!resp.ok) return;
      const data = await resp.json();
      this.cachedData[subKey] = data;

      const pane = document.getElementById(`dba-pane-${subKey}`);
      if (!pane) return;

      switch (subKey) {
        case 'browser':
          this.realParameters = data.parameters;
          pane.innerHTML = this.renderDatabaseBrowser();
          break;
        case 'dbmonitor':
          pane.innerHTML = this.renderDbMonitor(data);
          break;
        case 'unixmonitor':
          if (data.os && window.TracesApp?.setServerOs) {
            window.TracesApp.setServerOs(data.os);
          }
          pane.innerHTML = this.renderUnixMonitor(data);
          break;
        case 'tablespacemap':
          pane.innerHTML = this.renderTablespaceMap(data);
          break;
        case 'spacemanager':
          pane.innerHTML = this.renderSpaceManager(data);
          break;
        case 'segmentadvisor':
          pane.innerHTML = this.renderSegmentAdvisor(data);
          break;
        case 'undoadvisor':
          pane.innerHTML = this.renderUndoAdvisor(data);
          break;
        case 'rman':
          pane.innerHTML = this.renderRman(data);
          break;
        case 'flashback':
          pane.innerHTML = this.renderFlashback(data);
          break;
        case 'logminer':
          pane.innerHTML = this.renderLogMiner(data);
          break;
        case 'dataguard':
          pane.innerHTML = this.renderDataGuard(data);
          break;
        case 'asm':
          pane.innerHTML = this.renderAsm(data);
          break;
        case 'rac':
          pane.innerHTML = this.renderRac(data);
          break;
        case 'exadata':
          pane.innerHTML = this.renderExadata(data);
          break;
        case 'audit':
          pane.innerHTML = this.renderAudit(data);
          break;
        case 'wallet':
          pane.innerHTML = this.renderWallet(data);
          break;
        case 'schemacompare':
          pane.innerHTML = this.renderSchemaCompare(data);
          break;
        case 'datacompare':
          pane.innerHTML = this.renderDataCompare(data);
          break;
        case 'dbcompare':
          pane.innerHTML = this.renderDbCompare(data);
          break;
        case 'awr':
          pane.innerHTML = this.renderAwr(data);
          break;
      }
    } catch (e) {
      if (!silent) console.warn(`Error loading DBA ${subKey}:`, e);
    }
  }

  renderDisconnectedWatermark(toolName) {
    return `
      <div class="toad-disconnected-watermark">
        <div class="watermark-icon">🔌</div>
        <div class="watermark-title">${toolName || 'Módulo DBA'} - Desconectado</div>
        <div class="watermark-desc">
          Esta ferramenta administrativa requer uma conexão ativa com uma instância Oracle Database.<br>
          Conecte-se a uma sessão ativa para inspecionar parâmetros, dicionário de dados e métricas em tempo real.
        </div>
        <button class="btn btn-primary" style="padding: 6px 16px; font-weight: 600; font-size: 12px; margin-top: 10px;" onclick="window.TracesApp.connectionManager.openModal();">
          ⚡ Conectar a um Banco Oracle...
        </button>
      </div>
    `;
  }

  // 1. Database Browser
  renderDatabaseBrowser() {
    const activeConn = window.TracesApp?.getActiveConnection?.() || window.TracesApp?.realDatabaseConfig || window.TracesApp?.connectionManager?.getActive?.();
    const isConn = Boolean(window.TracesApp?.isConnected?.() || activeConn);
    if (!isConn) {
      return this.renderDisconnectedWatermark('Database Browser & SPFILE Editor');
    }

    const list = this.realParameters || this.cachedData['browser']?.parameters || (window.TRACES_DB ? window.TRACES_DB.parameters : []);
    const paramsHtml = list.length === 0 ? `
      <tr>
        <td colspan="6" style="text-align: center; padding: 30px; color: #64748b;">
          ⏳ Carregando parâmetros de inicialização do banco Oracle (SPFILE / V$PARAMETER)...
        </td>
      </tr>
    ` : list.map(p => {
      const nameLower = (p.name || '').toLowerCase();
      let sysMod = (p.sysModifiable || '').toUpperCase();
      if (!sysMod) {
        if (nameLower === 'session_cached_cursors' || p.isDeferred) sysMod = 'DEFERRED';
        else if (p.isDynamic) sysMod = 'IMMEDIATE';
        else sysMod = 'FALSE';
      }
      const sesMod = Boolean(p.sesModifiable || nameLower === 'session_cached_cursors');
      let modBadge = '';
      if (sysMod === 'IMMEDIATE') {
        modBadge = `<span style="color:#008000; font-weight:700;" title="ISSYS_MODIFIABLE = IMMEDIATE (Altera em memória imediatamente via SCOPE=BOTH ou MEMORY)">IMMEDIATE (In-Memory)</span>`;
      } else if (sysMod === 'DEFERRED') {
        modBadge = `<span style="color:#d97706; font-weight:700;" title="ISSYS_MODIFIABLE = DEFERRED (Não aceita SCOPE=MEMORY direto sem DEFERRED! Use ALTER SYSTEM SET ... DEFERRED SCOPE=BOTH)">DEFERRED (Próximas Sessões)</span>`;
      } else {
        modBadge = `<span style="color:#c00000; font-weight:700;" title="ISSYS_MODIFIABLE = FALSE (Parâmetro estático: requer SCOPE=SPFILE e restart da instância)">STATIC (SPFILE Restart)</span>`;
      }
      const sesBadge = sesMod ? `<span style="background:#e0f2fe; color:#0369a1; padding:1px 5px; border-radius:3px; font-size:10px; font-weight:600;">ALTER SESSION: YES</span>` : `<span style="color:#94a3b8; font-size:10px;">NO</span>`;
      const safeVal = String(p.value ?? '').replace(/'/g, "\\'");
      return `
      <tr data-name="${nameLower}" data-desc="${(p.description || '').toLowerCase()}" data-sysmod="${sysMod}" data-dynamic="${sysMod === 'IMMEDIATE' ? 'true' : 'false'}" data-deferred="${sysMod === 'DEFERRED' ? 'true' : 'false'}" data-default="${p.isDefault !== false ? 'true' : 'false'}">
        <td><span class="toad-clickable-token" style="font-weight:700;" title="Clique para inspecionar '${p.name}' em detalhes" onclick="window.TracesApp.smartInspect('${p.name}', 'parameter')">${p.name}</span></td>
        <td style="font-family: var(--toad-font-code); font-weight: 700; color: #0078d7;">${p.value ?? ''}</td>
        <td>${modBadge}</td>
        <td>${sesBadge}</td>
        <td style="color: #666; font-size: 11px;">${p.description || '-'}</td>
        <td>
          <button class="btn" style="padding: 1px 6px;" onclick="window.TracesApp.dbaTools.editParameter('${p.name}', '${safeVal}', '${sysMod}', ${sesMod});">Alter...</button>
        </td>
      </tr>
    `;
    }).join('');

    const alertList = window.TRACES_DB ? window.TRACES_DB.alertLog : [];
    const alertHtml = alertList.map(a => `
      <div class="dba-alert-entry" data-text="${(a.message || '').toLowerCase()} ${(a.timestamp || '').toLowerCase()}" data-sev="${a.severity || 'INFO'}" style="font-family: var(--toad-font-code); font-size: 11px; padding: 3px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="color: #666;">[${a.timestamp}]</span>
        <span style="font-weight: 700; color: ${a.severity === 'WARNING' ? '#c00000' : '#0078d7'};">[${a.severity}]</span>
        <span>${window.TracesApp?.linkifyInteractiveText ? window.TracesApp.linkifyInteractiveText(a.message) : a.message}</span>
      </div>
    `).join('');

    const user = activeConn?.user || 'SYS';
    const host = activeConn?.host || 'localhost';
    const port = activeConn?.port || 1521;
    const sname = activeConn?.serviceName || activeConn?.service_name || 'ORCL';
    const dbTarget = isConn ? `${user}@${host}:${port}/${sname}` : 'Desconectado';

    setTimeout(() => {
      this.applyParamFilter();
      this.applyAlertFilter();
    }, 0);

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="font-weight: 700; font-size: 13px;">Oracle Instance Parameters (V$PARAMETER &amp; V$SPPARAMETER)</span>
          <span style="font-size: 11px; color: var(--text-muted);">(${list.length} parâmetros carregados)</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.switchSubtab('browser')">🔄 Atualizar Parâmetros</button>
          <span class="toad-conn-badge-indicator" style="background:#e0f2fe; color:#0369a1;">Instância: ${dbTarget}</span>
        </div>
      </div>

      <!-- Quick Filter Strip for Parameters -->
      <div class="dba-filter-bar">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-param-text" placeholder="Filtrar parâmetro por nome ou descrição (ex: session_cached_cursors)..." oninput="window.TracesApp.dbaTools.applyParamFilter();" value="${this.filterState.paramText || ''}">
        </div>
        <select class="toad-conn-combobox" id="dba-filter-param-type" style="height: 24px; min-width: 215px;" onchange="window.TracesApp.dbaTools.applyParamFilter();">
          <option value="all" ${this.filterState.paramType === 'all' ? 'selected' : ''}>Todos os Parâmetros</option>
          <option value="dynamic" ${this.filterState.paramType === 'dynamic' ? 'selected' : ''}>IMMEDIATE (Modificável em Memória)</option>
          <option value="deferred" ${this.filterState.paramType === 'deferred' ? 'selected' : ''}>DEFERRED (Próximas Sessões / SPFILE)</option>
          <option value="static" ${this.filterState.paramType === 'static' ? 'selected' : ''}>STATIC (Requer Restart / SPFILE)</option>
          <option value="modified" ${this.filterState.paramType === 'modified' ? 'selected' : ''}>Modificados (Não padrão)</option>
        </select>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearParamFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-param-count">Exibindo ${list.length} de ${list.length} parâmetros</span>
      </div>

      <div style="height: 290px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf; resize: vertical;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Parameter Name</th><th>Current Value</th><th>ISSYS_MODIFIABLE (System Scope)</th><th>ISSES_MODIFIABLE</th><th>Description</th><th>Action</th></tr></thead>
          <tbody id="dba-param-table-body">${paramsHtml}</tbody>
        </table>
      </div>

      <!-- Alert Log Header & Filter Strip -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; margin-bottom: 4px;">
        <span style="font-weight: 700; font-size: 12px;">Database Alert Log (alert_${sname}.log)</span>
      </div>

      <div class="dba-filter-bar">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-alert-text" placeholder="Filtrar alert log por mensagem ou timestamp..." oninput="window.TracesApp.dbaTools.applyAlertFilter();" value="${this.filterState.alertText || ''}">
        </div>
        <select class="toad-conn-combobox" id="dba-filter-alert-sev" style="height: 24px; min-width: 140px;" onchange="window.TracesApp.dbaTools.applyAlertFilter();">
          <option value="all" ${this.filterState.alertSev === 'all' ? 'selected' : ''}>Todas as Severidades</option>
          <option value="WARNING" ${this.filterState.alertSev === 'WARNING' ? 'selected' : ''}>WARNING</option>
          <option value="INFO" ${this.filterState.alertSev === 'INFO' ? 'selected' : ''}>INFO</option>
          <option value="ERROR" ${this.filterState.alertSev === 'ERROR' ? 'selected' : ''}>ERROR / ORA-</option>
        </select>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearAlertFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-alert-count">Exibindo ${alertList.length} entradas</span>
      </div>

      <div id="dba-alert-container" style="height: 120px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf; padding: 6px; resize: vertical;">
        ${alertHtml}
      </div>
    `;
  }

  formatParamSqlValue(rawVal) {
    const trimmed = String(rawVal ?? '').trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;
    if (/^(TRUE|FALSE)$/i.test(trimmed)) return trimmed.toUpperCase();
    if (/^\d+[KMGTP]$/i.test(trimmed)) return trimmed.toUpperCase();
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed;
    return `'${trimmed.replace(/'/g, "''")}'`;
  }

  editParameter(paramName, currentVal, sysModifiable = 'IMMEDIATE', sesModifiable = false) {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se para alterar parâmetros.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    const nameLower = (paramName || '').toLowerCase();
    const sysMod = (nameLower === 'session_cached_cursors' ? 'DEFERRED' : (sysModifiable || 'IMMEDIATE')).toUpperCase();
    const sesMod = Boolean(sesModifiable || nameLower === 'session_cached_cursors');

    let existingModal = document.getElementById('toad-param-alter-modal');
    if (existingModal) existingModal.remove();

    let defaultScope = 'BOTH';
    if (sysMod === 'DEFERRED') defaultScope = 'DEFERRED_BOTH';
    else if (sysMod === 'FALSE') defaultScope = 'SPFILE';

    const modal = document.createElement('div');
    modal.id = 'toad-param-alter-modal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.55); z-index:99999; display:flex; align-items:center; justify-content:center;';
    modal.innerHTML = `
      <div style="background:#f8fafc; border:2px solid #0284c7; border-radius:6px; width:540px; max-width:95vw; box-shadow:0 16px 40px rgba(0,0,0,0.35); font-family:var(--toad-font-ui, sans-serif); overflow:hidden;">
        <div style="background:linear-gradient(90deg,#0f172a,#0369a1); color:#fff; padding:8px 14px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:700; font-size:13px;">⚙️ Alter Parameter — ${paramName}</span>
          <button class="btn" style="background:transparent; border:none; color:#fff; font-weight:700; cursor:pointer;" onclick="document.getElementById('toad-param-alter-modal')?.remove();">✕</button>
        </div>
        <div style="padding:14px; display:flex; flex-direction:column; gap:10px; font-size:12px;">
          <div style="background:#fff; border:1px solid #cbd5e1; padding:8px 10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
            <div><b>ISSYS_MODIFIABLE:</b> <span style="font-weight:700; color:${sysMod === 'IMMEDIATE' ? '#15803d' : sysMod === 'DEFERRED' ? '#d97706' : '#b91c1c'};">${sysMod}</span></div>
            <div><b>ISSES_MODIFIABLE:</b> <span style="font-weight:700; color:${sesMod ? '#0369a1' : '#64748b'};">${sesMod ? 'TRUE (ALTER SESSION)' : 'FALSE'}</span></div>
          </div>
          ${sysMod === 'DEFERRED' ? `
            <div style="background:#fffbeb; border:1px solid #f59e0b; color:#92400e; padding:8px 10px; border-radius:4px; font-size:11px;">
              ⚠️ <b>Nota Oracle (DEFERRED):</b> O parâmetro <code>${paramName}</code> não é modificável diretamente em memória para sessões atuais (<code>ORA-02096</code> se omitir <code>DEFERRED</code>). Ele deve ser alterado com a cláusula <b><code>DEFERRED</code></b> (passa a valer para novas sessões conectadas) ou via <code>ALTER SESSION</code> / <code>SCOPE=SPFILE</code>.
            </div>
          ` : sysMod === 'FALSE' ? `
            <div style="background:#fef2f2; border:1px solid #ef4444; color:#991b1b; padding:8px 10px; border-radius:4px; font-size:11px;">
              🔒 <b>Nota Oracle (STATIC):</b> O parâmetro <code>${paramName}</code> é estático (<code>ISSYS_MODIFIABLE=FALSE</code>). Só pode ser alterado com <b><code>SCOPE=SPFILE</code></b> e exige reinicialização da instância.
            </div>
          ` : ''}
          <div>
            <label style="font-weight:700; display:block; margin-bottom:4px;">Novo Valor:</label>
            <input type="text" id="toad-param-new-val" value="${String(currentVal ?? '').replace(/"/g, '&quot;')}" style="width:100%; height:28px; padding:0 8px; border:1px solid #94a3b8; border-radius:3px; font-family:var(--toad-font-code, monospace); font-weight:700;" oninput="window.TracesApp.dbaTools.updateParamSqlPreview('${paramName}');">
          </div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:4px;">Escopo de Alteração (Scope &amp; Cláusula):</label>
            <select id="toad-param-scope-sel" style="width:100%; height:28px; padding:0 6px; border:1px solid #94a3b8; border-radius:3px;" onchange="window.TracesApp.dbaTools.updateParamSqlPreview('${paramName}');">
              <option value="DEFERRED_BOTH" ${defaultScope === 'DEFERRED_BOTH' ? 'selected' : ''}>ALTER SYSTEM ... DEFERRED SCOPE=BOTH (Novas Sessões + SPFILE)</option>
              <option value="DEFERRED_MEMORY" ${defaultScope === 'DEFERRED_MEMORY' ? 'selected' : ''}>ALTER SYSTEM ... DEFERRED SCOPE=MEMORY (Apenas Novas Sessões)</option>
              <option value="BOTH" ${defaultScope === 'BOTH' ? 'selected' : ''}>ALTER SYSTEM ... SCOPE=BOTH (Imediato em Memória + SPFILE)</option>
              <option value="MEMORY" ${defaultScope === 'MEMORY' ? 'selected' : ''}>ALTER SYSTEM ... SCOPE=MEMORY (Apenas Memória Imediato)</option>
              <option value="SPFILE" ${defaultScope === 'SPFILE' ? 'selected' : ''}>ALTER SYSTEM ... SCOPE=SPFILE (Apenas SPFILE / Próximo Boot)</option>
              ${sesMod ? `<option value="SESSION">ALTER SESSION SET ${paramName} = ... (Apenas Sessão Atual)</option>` : ''}
            </select>
          </div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:4px;">Preview do Comando SQL:</label>
            <pre id="toad-param-sql-preview" style="margin:0; padding:8px; background:#0f172a; color:#38bdf8; border-radius:4px; font-family:var(--toad-font-code, monospace); font-size:11px; white-space:pre-wrap;"></pre>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
            <button class="btn" style="height:28px; padding:0 12px;" onclick="const sql=document.getElementById('toad-param-sql-preview')?.textContent; if(sql){ window.TracesApp.openWindow('editor'); window.TracesApp.sqlEditor?.addNewTab(sql, 'ALTER_${paramName}.sql'); document.getElementById('toad-param-alter-modal')?.remove(); }">📝 Abrir no SQL Editor</button>
            <button class="btn" style="height:28px; padding:0 12px;" onclick="document.getElementById('toad-param-alter-modal')?.remove();">Cancelar</button>
            <button class="btn btn-primary" style="height:28px; padding:0 14px; font-weight:700;" onclick="window.TracesApp.dbaTools.executeParamAlter('${paramName}');">⚡ Executar Agora</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.updateParamSqlPreview(paramName);
    setTimeout(() => document.getElementById('toad-param-new-val')?.focus(), 40);
  }

  updateParamSqlPreview(paramName) {
    const valEl = document.getElementById('toad-param-new-val');
    const scopeEl = document.getElementById('toad-param-scope-sel');
    const prevEl = document.getElementById('toad-param-sql-preview');
    if (!valEl || !scopeEl || !prevEl) return;
    const formattedVal = this.formatParamSqlValue(valEl.value);
    const scope = scopeEl.value;
    let sql = '';
    if (scope === 'SESSION') {
      sql = `ALTER SESSION SET ${paramName} = ${formattedVal}`;
    } else if (scope === 'DEFERRED_BOTH') {
      sql = `ALTER SYSTEM SET ${paramName} = ${formattedVal} DEFERRED SCOPE=BOTH`;
    } else if (scope === 'DEFERRED_MEMORY') {
      sql = `ALTER SYSTEM SET ${paramName} = ${formattedVal} DEFERRED SCOPE=MEMORY`;
    } else {
      sql = `ALTER SYSTEM SET ${paramName} = ${formattedVal} SCOPE=${scope}`;
    }
    prevEl.textContent = sql + ';';
  }

  async executeParamAlter(paramName) {
    const valEl = document.getElementById('toad-param-new-val');
    const prevEl = document.getElementById('toad-param-sql-preview');
    const newVal = valEl ? valEl.value.trim() : '';
    const sqlRaw = prevEl ? prevEl.textContent.trim().replace(/;$/, '') : '';
    if (!newVal || !sqlRaw) return;

    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const activeConn = window.TracesApp?.getActiveConnection?.();
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: sqlRaw, conn_id: activeConn?.id })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro ao alterar parâmetro: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`${sqlRaw}; executado com sucesso no Oracle!`, 'success');
          document.getElementById('toad-param-alter-modal')?.remove();
          await this.loadSubtabData('browser');
        }
      } catch (e) {
        window.TracesApp.notify(`Erro: ${e.message}`, 'error');
      }
      return;
    }

    const p = (window.TRACES_DB ? window.TRACES_DB.parameters : []).find(item => item.name === paramName);
    if (p) p.value = newVal;
    document.getElementById('toad-param-alter-modal')?.remove();
    this.switchSubtab('browser');
    window.TracesApp.notify(`${sqlRaw}; executado com sucesso.`, 'success');
  }

  // 2. Database Monitor
  renderDbMonitor(data) {
    const rates = data?.rates || { logicalReads: 4280, physicalReads: 142, executes: 320, commits: 88, parses: 45 };
    const topEvents = data?.topEvents || [
      { event: 'db file sequential read', waits: 12450, timeWaitedMs: 4520 },
      { event: 'log file sync', waits: 3820, timeWaitedMs: 1420 },
      { event: 'direct path read', waits: 1980, timeWaitedMs: 820 },
      { event: 'SQL*Net message from client', waits: 45010, timeWaitedMs: 38200 }
    ];

    const eventsHtml = topEvents.map(e => `
      <tr data-event="${(e.event || '').toLowerCase()}">
        <td><b>${e.event}</b></td>
        <td style="text-align: right;">${Number(e.waits).toLocaleString()}</td>
        <td style="text-align: right; color: #0078d7; font-weight:700;">${Number(e.timeWaitedMs).toLocaleString()} ms</td>
      </tr>
    `).join('');

    setTimeout(() => this.applyMonitorFilter(), 0);

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 13px;">Toad Database Monitor (Real-Time I/O &amp; Throughput Rates)</span>
        <span class="toad-conn-badge-indicator" style="background:#e0f2fe; color:#0369a1;">Taxa de amostragem: 3s</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 12px;">
        <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px; text-align:center;">
          <div style="font-size:10px; color:#666;">LOGICAL READS / S</div>
          <div style="font-size:20px; font-weight:700; color:#0078d7;">${Number(rates.logicalReads).toLocaleString()}</div>
        </div>
        <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px; text-align:center;">
          <div style="font-size:10px; color:#666;">PHYSICAL READS / S</div>
          <div style="font-size:20px; font-weight:700; color:#c00000;">${Number(rates.physicalReads).toLocaleString()}</div>
        </div>
        <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px; text-align:center;">
          <div style="font-size:10px; color:#666;">EXECUTIONS / S</div>
          <div style="font-size:20px; font-weight:700; color:#008000;">${Number(rates.executes).toLocaleString()}</div>
        </div>
        <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px; text-align:center;">
          <div style="font-size:10px; color:#666;">COMMITS / S</div>
          <div style="font-size:20px; font-weight:700; color:#8b5cf6;">${Number(rates.commits).toLocaleString()}</div>
        </div>
        <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px; text-align:center;">
          <div style="font-size:10px; color:#666;">PARSES / S</div>
          <div style="font-size:20px; font-weight:700; color:#f59e0b;">${Number(rates.parses).toLocaleString()}</div>
        </div>
      </div>

      <div style="font-weight: 700; font-size: 12px; margin-bottom: 4px;">Top Database Wait Events (V$SYSTEM_EVENT)</div>

      <div class="dba-filter-bar">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-monitor-text" placeholder="Filtrar evento de espera por nome..." oninput="window.TracesApp.dbaTools.applyMonitorFilter();" value="${this.filterState.monitorText || ''}">
        </div>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearMonitorFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-monitor-count">Exibindo ${topEvents.length} de ${topEvents.length} eventos</span>
      </div>

      <div style="background: #fff; border: 1px solid #bfbfbf; max-height: 220px; overflow-y: auto;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Wait Event Name</th><th style="text-align: right;">Total Waits</th><th style="text-align: right;">Time Waited (ms)</th></tr></thead>
          <tbody id="dba-event-table-body">${eventsHtml}</tbody>
        </table>
      </div>
    `;
  }

  switchMonitorOs(osType) {
    this.monitorOsOverride = osType;
    const pane = document.getElementById('dba-pane-unixmonitor');
    if (pane) {
      pane.innerHTML = this.renderUnixMonitor(this.cachedData['unixmonitor']);
    }
    const osTitle = osType === 'windows' ? 'Microsoft Windows' : osType === 'aix' ? 'IBM AIX' : osType === 'linux' ? 'Linux' : 'Detecção Automática';
    window.TracesApp?.notify(`Visualização do Monitor de Servidor adaptada para ${osTitle}.`, 'info');
  }

  // 3. Unix / Windows / AIX Host Server Monitor
  renderUnixMonitor(data) {
    const detectedOs = window.TracesApp?.getServerOs?.() || { os_type: 'linux', os_name: 'Linux', platform_name: 'Linux x86 64-bit' };
    const activeOsType = this.monitorOsOverride || detectedOs.os_type || 'linux';

    const osStatsRaw = data?.osStats || {};
    const numCpus = osStatsRaw.NUM_CPUS?.value || osStatsRaw.NUM_CPU_CORES?.value || 16;
    const loadAvg = osStatsRaw.LOAD?.value || (activeOsType === 'windows' ? 1.15 : activeOsType === 'aix' ? 0.95 : 1.45);
    const memBytes = osStatsRaw.PHYSICAL_MEMORY_BYTES?.value;
    const memoryGb = memBytes ? Math.round(memBytes / 1024 / 1024 / 1024) : (activeOsType === 'windows' ? 32 : activeOsType === 'aix' ? 128 : 64);
    const busyPct = osStatsRaw.BUSY_TIME ? Math.min(95, Math.round((osStatsRaw.BUSY_TIME.value / (osStatsRaw.BUSY_TIME.value + (osStatsRaw.IDLE_TIME?.value || 1))) * 100)) : (activeOsType === 'windows' ? 24 : activeOsType === 'aix' ? 31 : 18);
    const idlePct = 100 - busyPct;
    const ioWait = (activeOsType === 'windows' ? 0.8 : activeOsType === 'aix' ? 4.2 : 2.5);

    let osMeta = {};
    if (activeOsType === 'windows') {
      osMeta = {
        type: 'windows',
        icon: '🪟',
        name: 'Microsoft Windows Server',
        badge: 'Microsoft Windows x64 (64-bit)',
        badgeClass: 'os-windows',
        card1: { title: 'LOGICAL PROCESSORS', val: `${numCpus} Threads`, sub: 'x64 Architecture (oracle.exe)' },
        card2: { title: 'SYSTEM COMMIT RATIO', val: `${(loadAvg * 14).toFixed(1)}%`, sub: 'Commit Limit / Pagefile', color: '#008000' },
        card3: { title: 'HOST PHYSICAL MEMORY', val: `${memoryGb} GB`, sub: 'Windows Dynamic Memory / Cache' },
        card4: { title: 'PROCESSOR TIME / IDLE', val: `${busyPct}% / ${idlePct}%`, sub: `DPC/Interrupt: ${ioWait}%` },
        commands: [
          {
            title: 'Finalizar Thread Presa (Kill sem derrubar instância)',
            cmd: `orakill ${detectedOs.instance_name || '%ORACLE_SID%'} <thread_id>`,
            note: 'No Windows, Oracle roda como processo único com múltiplas threads. ORAKILL mata apenas a thread específica da sessão.'
          },
          {
            title: 'Inspecionar Processo Principal oracle.exe',
            cmd: `tasklist /fi "imagename eq oracle.exe" /v`,
            note: 'Verifica PID mestre, tempo de CPU acumulado e consumo de memória RAM privada.'
          },
          {
            title: 'Monitorar Uso de CPU em Tempo Real (5 Amostras)',
            cmd: `typeperf "\\Processor(_Total)\\% Processor Time" -sc 5`,
            note: 'Coleta a carga de processamento dos núcleos do Windows sem interface gráfica.'
          },
          {
            title: 'Verificar Memória Física Disponível (MB)',
            cmd: `typeperf "\\Memory\\Available MBytes" -sc 5`,
            note: 'Monitora se a memória RAM do Windows está sofrendo pressão de paginação.'
          },
          {
            title: 'Status do Serviço Windows do Oracle',
            cmd: `sc queryex OracleService${detectedOs.instance_name || '%ORACLE_SID%'}`,
            note: 'Checa se o serviço Windows NT está RUNNING e obtém o PID do processo host.'
          },
          {
            title: 'Extrair Alertas Recentes no Event Viewer (Application)',
            cmd: `wevtutil qe Application /q:"*[System[Provider[@Name='Oracle.oraservice']]]" /c:5 /rd:true /f:text`,
            note: 'Exibe os últimos 5 eventos críticos do Oracle registrados no log de eventos do Windows.'
          },
          {
            title: 'Listar Threads do Processo (PowerShell)',
            cmd: `Get-Process oracle | Select-Object -ExpandProperty Threads | Format-Table Id, ThreadState, WaitReason -AutoSize`,
            note: 'Enumera todas as threads ativas do Oracle e o motivo de espera em nível de SO.'
          }
        ],
        footerNote: 'ℹ <b>Ambiente Microsoft Windows:</b> O banco de dados Oracle roda como uma aplicação multithread no processo <code>oracle.exe</code>. Diagnósticos de threads e comandos de encerramento usam a ferramenta oficial <code>orakill.exe</code>.'
      };
    } else if (activeOsType === 'aix') {
      osMeta = {
        type: 'aix',
        icon: '🟣',
        name: 'IBM AIX on POWER',
        badge: 'AIX-Based Systems (POWER9 / POWER10 64-bit)',
        badgeClass: 'os-aix',
        card1: { title: 'POWER SMT CORES', val: `${numCpus} Cores`, sub: 'SMT-8 Simultaneous Multi-Threading' },
        card2: { title: 'ENTITLED CAPACITY', val: `${(loadAvg * 0.75).toFixed(2)}`, sub: 'Entitled: 2.00 / Pool: Shared', color: '#008000' },
        card3: { title: 'VMM PINNED MEMORY', val: `${memoryGb} GB`, sub: 'VMM Large Pages (16M / 16G)' },
        card4: { title: 'CPU USER / SYS / IDLE', val: `${busyPct}% / ${(busyPct*0.3).toFixed(0)}% / ${idlePct}%`, sub: `Wait I/O: ${ioWait}%` },
        commands: [
          {
            title: 'Finalizar Processo de Sessão Dedicada no SO',
            cmd: `kill -9 <spid>`,
            note: 'No AIX, cada sessão dedicada roda como processo do SO (LOCAL=NO). Kill -9 força a finalização se o ALTER SYSTEM travar.'
          },
          {
            title: 'Obter Stack Trace Nativa de Processo AIX',
            cmd: `procstack <spid>`,
            note: 'Comando nativo do IBM AIX para extrair pilha de execução de funções C do processo Oracle sem pausá-lo.'
          },
          {
            title: 'Monitor de Desempenho em Tempo Real (Topas)',
            cmd: `topas -P`,
            note: 'Interface clássica do AIX mostrando os processos que mais consom CPU, memória e I/O.'
          },
          {
            title: 'Estatísticas de Paginação e Pinned Memory VMM',
            cmd: `vmstat -v`,
            note: 'Diagnostica paging space do AIX, páginas fixas na RAM e I/O de blocos do subsistema Virtual Memory Manager.'
          },
          {
            title: 'Consumo Global de Memória Virtual AIX (svmon)',
            cmd: `svmon -G`,
            note: 'Exibe frames de memória de 4KB, 64KB e 16MB alocados pelo SGA e PGA do Oracle.'
          },
          {
            title: 'Inspecionar Volume Groups e Logical Volumes (LVM)',
            cmd: `lsvg -o | lsvg -i -l`,
            note: 'Verifica o status de todos os Volume Groups ativos que contêm datafiles e archivelogs.'
          },
          {
            title: 'Relatório de Erros Críticos do Sistema (errpt)',
            cmd: `errpt -d H -T PERM`,
            note: 'Analisa o histórico de falhas de hardware, controladoras SCSI/FC e erros permanentes no AIX.'
          },
          {
            title: 'Verificar Entitlement da LPAR e Modo SMT',
            cmd: `lparstat -i | grep -E "Entitled|Capacity|Online"`,
            note: 'Mostra a capacidade de CPU dedicada/compartilhada outorgada a esta partição lógica IBM AIX.'
          }
        ],
        footerNote: 'ℹ <b>Ambiente IBM AIX:</b> O Oracle utiliza as APIs nativas do kernel AIX (LVM, VMM Large Pages e POWER SMT). Diagnósticos avançados usam <code>topas</code>, <code>procstack</code>, <code>svmon</code> e <code>errpt</code>.'
      };
    } else {
      // Default Linux
      osMeta = {
        type: 'linux',
        icon: '🐧',
        name: 'Linux Enterprise',
        badge: 'Linux x86 64-bit / aarch64',
        badgeClass: 'os-linux',
        card1: { title: 'SERVER CPU CORES', val: `${numCpus} Cores`, sub: 'Architecture x86_64 / aarch64' },
        card2: { title: '1-MIN LOAD AVERAGE', val: `${loadAvg}`, sub: loadAvg > numCpus ? 'CPU Bottleneck' : 'Healthy Load', color: loadAvg > numCpus ? '#c00000' : '#008000' },
        card3: { title: 'HOST PHYSICAL MEMORY', val: `${memoryGb} GB`, sub: 'HugePages Allocated' },
        card4: { title: 'CPU BUSY / IDLE', val: `${busyPct}% / ${idlePct}%`, sub: `I/O Wait: ${ioWait}%` },
        commands: [
          {
            title: 'Finalizar Processo de Sessão Dedicada no SO',
            cmd: `kill -9 <spid>`,
            note: 'Elimina o processo servidor local ou remoto (oracle<SID> LOCAL=NO) que ficou zumbi ou em loop.'
          },
          {
            title: 'Extrair Call Stack de Processo C (pstack)',
            cmd: `pstack <spid>`,
            note: 'Gera a pilha de chamadas do processo no Linux para identificar em qual syscall ele está travado.'
          },
          {
            title: 'Histórico de Utilização de CPU (sar)',
            cmd: `sar -u 2 5`,
            note: 'Coleta 5 amostras a cada 2 segundos mostrando %user, %system, %iowait e %idle.'
          },
          {
            title: 'Estatísticas de Memória Virtual e Swapping',
            cmd: `vmstat 2 5`,
            note: 'Verifica taxas de bi/bo (bloqueios de I/O) e se/so (swap in/swap out) no Linux.'
          },
          {
            title: 'Latência de I/O por Disco e Utilização % (iostat)',
            cmd: `iostat -xz 2 5`,
            note: 'Mostra tempo de resposta de leitura/escrita (await) e saturação dos discos NVMe/SAN.'
          },
          {
            title: 'Verificar Alocação de HugePages no Kernel',
            cmd: `cat /proc/meminfo | grep -i huge`,
            note: 'Confirma se o SGA do Oracle está devidamente travado em HugePages para evitar sobrecarga de TLB.'
          },
          {
            title: 'Segmentos de Memória Compartilhada e Semáforos (IPC)',
            cmd: `ipcs -m -s`,
            note: 'Inspeciona permissões e segmentos SHM / POSIX alocados para as instâncias Oracle.'
          },
          {
            title: 'Parâmetros de Semáforo no Kernel Linux',
            cmd: `sysctl -a | grep -E "kernel.sem|kernel.shm"`,
            note: 'Exibe SEMMSL, SEMMNS, SEMOPM, SEMMNI e limites de SHMMAX/SHMALL recomendados pela Oracle.'
          }
        ],
        footerNote: 'ℹ <b>Ambiente Linux:</b> O Oracle interage com o kernel Linux através de HugePages, AIO assíncrono e segmentos IPC. Comandos clássicos de diagnóstico: <code>top</code>, <code>vmstat</code>, <code>iostat</code>, <code>sar</code> e <code>pstack</code>.'
      };
    }

    return `
      <!-- OS Header & Platform Switcher -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">${osMeta.icon}</span>
          <span style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${osMeta.name} Server Monitor</span>
          <span class="toad-os-badge ${osMeta.badgeClass}">${osMeta.badge}</span>
        </div>
        <div class="os-platform-bar">
          <span style="font-size: 11px; font-weight: 600; color: #64748b; margin-right: 4px;">Plataforma SO:</span>
          <button class="os-platform-btn ${activeOsType === 'linux' ? 'active os-linux' : ''}" onclick="window.TracesApp.dbaTools.switchMonitorOs('linux')">
            🐧 Linux (top/sar)
          </button>
          <button class="os-platform-btn ${activeOsType === 'windows' ? 'active os-windows' : ''}" onclick="window.TracesApp.dbaTools.switchMonitorOs('windows')">
            🪟 Windows (orakill/perf)
          </button>
          <button class="os-platform-btn ${activeOsType === 'aix' ? 'active os-aix' : ''}" onclick="window.TracesApp.dbaTools.switchMonitorOs('aix')">
            🟣 IBM AIX (topas/lsvg)
          </button>
          ${this.monitorOsOverride ? `<button class="os-platform-btn" style="color:#ef4444;" onclick="window.TracesApp.dbaTools.switchMonitorOs(null)" title="Restaurar Detecção Automática">↺ Auto</button>` : ''}
        </div>
      </div>

      <!-- 4 Core Metric Gauges -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px;">
        <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px;">
          <div style="font-size:10px; color:#666;">${osMeta.card1.title}</div>
          <div style="font-size:20px; font-weight:700; color:#0078d7;">${osMeta.card1.val}</div>
          <div style="font-size:10px; color:#008000;">${osMeta.card1.sub}</div>
        </div>
        <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px;">
          <div style="font-size:10px; color:#666;">${osMeta.card2.title}</div>
          <div style="font-size:20px; font-weight:700; color:${osMeta.card2.color || '#0078d7'};">${osMeta.card2.val}</div>
          <div style="font-size:10px; color:#666;">${osMeta.card2.sub}</div>
        </div>
        <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px;">
          <div style="font-size:10px; color:#666;">${osMeta.card3.title}</div>
          <div style="font-size:20px; font-weight:700; color:#8b5cf6;">${osMeta.card3.val}</div>
          <div style="font-size:10px; color:#666;">${osMeta.card3.sub}</div>
        </div>
        <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px;">
          <div style="font-size:10px; color:#666;">${osMeta.card4.title}</div>
          <div style="font-size:20px; font-weight:700; color:#0078d7;">${osMeta.card4.val}</div>
          <div style="font-size:10px; color:#008000;">${osMeta.card4.sub}</div>
        </div>
      </div>

      <!-- Native Diagnostic Command Console -->
      <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:4px; margin-bottom: 12px; overflow: hidden;">
        <div style="background:#f1f5f9; padding:8px 12px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between;">
          <span style="font-weight:700; font-size:12px; color:#1e293b;">
            🛠️ Console de Comandos e Utilitários Nativos do SO (${osMeta.name})
          </span>
          <span style="font-size:11px; color:#64748b;">Comandos adaptados dinamicamente para DBAs</span>
        </div>
        <div style="padding:10px; display:flex; flex-direction:column; gap:8px; max-height:280px; overflow-y:auto;">
          ${osMeta.commands.map(cmdItem => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:3px; padding:6px 10px;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:11.5px; font-weight:700; color:#1e293b; margin-bottom:2px;">${cmdItem.title}</div>
                <div style="font-family:var(--toad-font-mono, monospace); font-size:11px; color:#0284c7; background:#e0f2fe; padding:2px 6px; border-radius:2px; display:inline-block; max-width:100%; overflow-x:auto;">${cmdItem.cmd}</div>
                <div style="font-size:10.5px; color:#64748b; margin-top:2px;">${cmdItem.note}</div>
              </div>
              <button class="btn" style="height:26px; padding:0 8px; font-size:10.5px; font-weight:600; white-space:nowrap;" onclick="navigator.clipboard.writeText('${cmdItem.cmd}'); window.TracesApp.notify('Comando copiado: ${cmdItem.cmd}', 'success');">
                📋 Copiar
              </button>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="background:#e5f1fb; border:1px solid #b8d6f5; padding:8px; font-size:11px; border-radius:3px;">
        ${osMeta.footerNote}
      </div>
    `;
  }

  // 4. Tablespace Map & HWM
  renderTablespaceMap(data) {
    const os = window.TracesApp?.getServerOs?.() || { os_type: 'linux' };
    const defaultDatafile = os.os_type === 'windows' 
      ? 'D:\\APP\\ORACLE\\ORADATA\\ORCL\\USERS01.DBF'
      : os.os_type === 'aix'
      ? '/oracle/oradata/ORCL/users01.dbf'
      : '/u01/app/oracle/oradata/ORCL/users01.dbf';

    const map = data || (window.TRACES_DB ? window.TRACES_DB.tablespaceMap : {
      tablespaceName: 'USERS',
      datafileName: defaultDatafile,
      allocatedMb: 4452,
      freeMb: 3740,
      maxShrinkMb: 1200,
      reclaimableMb: 3252
    });

    let blocksHtml = '';
    for (let i = 0; i < 280; i++) {
      let type = 'extent-allocated';
      if (i > 140) type = 'extent-free';
      if (i === 140) type = 'extent-hwm-line';
      blocksHtml += `<div class="extent-block ${type}" title="Block ${i * 4096}..${(i+1)*4096}"></div>`;
    }

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <div>
          <span style="font-weight: 700; font-size: 13px;">Tablespace Map: ${map.tablespaceName}</span>
          <span style="font-size: 11px; color: #666; margin-left: 8px;">Datafile: ${map.datafileName}</span>
        </div>
        <button class="btn btn-primary" onclick="window.TracesApp.dbaTools.generateResizeScript('${map.datafileName}', ${map.maxShrinkMb}, ${map.reclaimableMb});">Calculate Datafile Resize</button>
      </div>

      <div style="display: flex; gap: 16px; font-size: 11px; margin: 4px 0;">
        <span><span style="display:inline-block; width:10px; height:10px; background:#3b82f6; border-radius:2px;"></span> Allocated Extents (${map.allocatedMb} MB)</span>
        <span><span style="display:inline-block; width:10px; height:10px; background:#10b981; border-radius:2px;"></span> Free Extents Below/Above HWM (${map.freeMb} MB)</span>
        <span><span style="display:inline-block; width:10px; height:10px; background:#ef4444; border-radius:2px;"></span> High Water Mark (HWM)</span>
      </div>

      <div class="extent-map-canvas" style="display: grid; grid-template-columns: repeat(40, 1fr); gap: 2px; padding: 6px; background: #1e293b; border-radius: 4px; height: 160px; overflow-y: auto;">
        ${blocksHtml}
      </div>

      <div style="background: #e5f1fb; padding: 8px; border: 1px solid #b8d6f5; font-size: 11px; border-radius: 3px; margin-top: 8px;">
        ℹ <b>High Water Mark (HWM) Diagnostic:</b> Datafiles can be safely shrunk up to <b>${map.maxShrinkMb} MB</b> via <code>ALTER DATABASE DATAFILE '${map.datafileName}' RESIZE ${map.maxShrinkMb}M;</code>. Reclaiming <b>${map.reclaimableMb} MB</b> of unallocated OS storage.
      </div>
    `;
  }

  generateResizeScript(fileName, shrinkMb, reclaimMb) {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se para calcular redimensionamento.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    const sql = `-- Toad Datafile Resize Script (High Water Mark Reclaim)
-- Reclaimable OS storage: ${reclaimMb} MB
ALTER DATABASE DATAFILE '${fileName}' RESIZE ${shrinkMb}M;`;
    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.switchDockView('editor');
      window.TracesApp.sqlEditor.setQuery(sql);
      window.TracesApp.notify(`Script de redimensionamento gerado no Editor SQL (${reclaimMb} MB recuperáveis).`, 'success');
    } else {
      prompt('Datafile Resize SQL:', sql);
    }
  }

  // 5. Space Manager & Capacity Growth Forecast (with Full Max Usage & Autoextend Overview)
  renderSpaceManager(data) {
    const list = data?.spaces || data?.tablespaces || [
      { name: 'SYSTEM', totalMb: 1200, usedMb: 1140, freeMb: 60, usedPct: 95.0, maxMb: 32768, freeMaxMb: 31628, maxPct: 3.5, autoextend: 'YES', datafiles: 1, dailyGrowthMb: 0.8, daysUntilFull: 75 },
      { name: 'SYSAUX', totalMb: 2400, usedMb: 2180, freeMb: 220, usedPct: 90.8, maxMb: 32768, freeMaxMb: 30588, maxPct: 6.7, autoextend: 'YES', datafiles: 1, dailyGrowthMb: 3.2, daysUntilFull: 68 },
      { name: 'UNDOTBS1', totalMb: 4096, usedMb: 1240, freeMb: 2856, usedPct: 30.2, maxMb: 16384, freeMaxMb: 15144, maxPct: 7.6, autoextend: 'YES', datafiles: 1, dailyGrowthMb: 0.0, daysUntilFull: 999 },
      { name: 'USERS', totalMb: 8192, usedMb: 4452, freeMb: 3740, usedPct: 54.3, maxMb: 32768, freeMaxMb: 28316, maxPct: 13.6, autoextend: 'YES', datafiles: 2, dailyGrowthMb: 12.5, daysUntilFull: 299 },
      { name: 'TEMP', totalMb: 4096, usedMb: 512, freeMb: 3584, usedPct: 12.5, maxMb: 8192, freeMaxMb: 7680, maxPct: 6.3, autoextend: 'YES', datafiles: 1, dailyGrowthMb: 0.0, daysUntilFull: 999 }
    ];

    const sumAlloc = list.reduce((a, t) => a + Number(t.totalMb || 0), 0);
    const sumUsed = list.reduce((a, t) => a + Number(t.usedMb || 0), 0);
    const sumFree = list.reduce((a, t) => a + Number(t.freeMb ?? Math.max(0, (t.totalMb || 0) - (t.usedMb || 0))), 0);
    const sumMax = list.reduce((a, t) => a + Number(t.maxMb || t.totalMb || 0), 0);
    const sumFreeMax = Math.max(0, sumMax - sumUsed);
    const allocPct = sumAlloc > 0 ? ((sumUsed / sumAlloc) * 100).toFixed(1) : '0.0';
    const maxPct = sumMax > 0 ? ((sumUsed / sumMax) * 100).toFixed(1) : '0.0';

    const rows = list.map(t => {
      const uPct = Number(t.usedPct ?? t.pct ?? 0);
      const mPct = Number(t.maxPct ?? (t.maxMb > 0 ? Math.round((t.usedMb / t.maxMb) * 1000) / 10 : uPct));
      const mMb = Number(t.maxMb && t.maxMb >= t.totalMb ? t.maxMb : (t.autoextend === 'NO' ? t.totalMb : t.totalMb * 4));
      const fm = Number(t.freeMaxMb ?? Math.max(0, mMb - (t.usedMb || 0)));
      const cAlloc = uPct >= 85 ? '#ef4444' : uPct >= 70 ? '#f59e0b' : '#16a34a';
      const cMax = mPct >= 85 ? '#ef4444' : mPct >= 70 ? '#f59e0b' : '#0284c7';
      return `
        <tr data-name="${(t.name || '').toLowerCase()}" data-pct="${uPct}">
          <td><b style="color:#0284c7; cursor:pointer;" onclick="window.TracesApp.openWindow('browser', null, null); setTimeout(() => window.TracesApp.schemaBrowser.selectObject('${t.name}', 'tablespaces'), 100);">💾 ${t.name}</b></td>
          <td style="text-align: right; font-weight:600;">${Number(t.totalMb).toLocaleString()} MB</td>
          <td style="text-align: right; color:${cAlloc}; font-weight:700;">${Number(t.usedMb).toLocaleString()} MB</td>
          <td style="text-align: right; color:#15803d;">${Number(t.freeMb).toLocaleString()} MB</td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <div style="flex:1; background:#e0e0e0; height:8px; border-radius:4px; overflow:hidden;">
                <div style="width:${Math.min(uPct, 100)}%; background:${cAlloc}; height:100%;"></div>
              </div>
              <span style="font-weight:700; font-size:11px; width:38px; color:${cAlloc};">${uPct}%</span>
            </div>
          </td>
          <td style="text-align: center;"><span style="font-size:10px; font-weight:700; padding:1px 6px; border-radius:8px; background:${t.autoextend === 'NO' ? '#fee2e2' : '#dcfce7'}; color:${t.autoextend === 'NO' ? '#991b1b' : '#166534'};">${t.autoextend || 'YES'}</span></td>
          <td style="text-align: right; font-weight:700; color:#0369a1;">${Number(mMb).toLocaleString()} MB</td>
          <td style="text-align: right; color:#15803d;">${Number(fm).toLocaleString()} MB</td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <div style="flex:1; background:#e0e0e0; height:8px; border-radius:4px; overflow:hidden;">
                <div style="width:${Math.min(mPct, 100)}%; background:${cMax}; height:100%;"></div>
              </div>
              <span style="font-weight:700; font-size:11px; width:38px; color:${cMax};">${mPct}%</span>
            </div>
          </td>
          <td style="text-align: right; font-weight:700; color:${t.daysUntilFull < 60 ? '#c00000' : '#008000'};">
            ${t.daysUntilFull > 365 ? '> 1 ano' : `${t.daysUntilFull} dias`}
          </td>
        </tr>
      `;
    }).join('');

    setTimeout(() => this.applySpaceFilter(), 0);

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
        <div>
          <span style="font-weight: 700; font-size: 13px;">Space Manager &amp; Capacity Growth Forecast (DBA_TABLESPACE_USAGE_METRICS &amp; MAXBYTES)</span>
          <div style="font-size: 11px; color: #64748b;">Visão geral da alocação de espaço atual vs. teto máximo com Autoextend (MAXBYTES).</div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-primary" onclick="window.TracesApp.openWindow('browser', null, null); setTimeout(() => window.TracesApp.schemaBrowser.openCreateObjectWizard('tablespaces'), 100);">➕ Nova Tablespace</button>
          <button class="btn" onclick="window.TracesApp.dbaTools.switchSubtab('spacemanager');">🔄 Atualizar Métricas</button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 10px;">
        <div style="background:#fff; border:1px solid #cbd5e1; border-radius:4px; padding:8px 10px;">
          <div style="font-size:10px; color:#64748b; font-weight:700;">TOTAL ALOCADO</div>
          <div style="font-size:14px; font-weight:800; color:#0f172a;">${(sumAlloc/1024).toFixed(2)} GB</div>
          <div style="font-size:10px; color:#64748b;">${Math.round(sumAlloc).toLocaleString()} MB</div>
        </div>
        <div style="background:#fff; border:1px solid #cbd5e1; border-radius:4px; padding:8px 10px;">
          <div style="font-size:10px; color:#64748b; font-weight:700;">TOTAL USADO</div>
          <div style="font-size:14px; font-weight:800; color:#b45309;">${(sumUsed/1024).toFixed(2)} GB (${allocPct}%)</div>
          <div style="font-size:10px; color:#64748b;">${Math.round(sumUsed).toLocaleString()} MB</div>
        </div>
        <div style="background:#fff; border:1px solid #cbd5e1; border-radius:4px; padding:8px 10px;">
          <div style="font-size:10px; color:#64748b; font-weight:700;">LIVRE ALOCADO</div>
          <div style="font-size:14px; font-weight:800; color:#16a34a;">${(sumFree/1024).toFixed(2)} GB</div>
          <div style="font-size:10px; color:#64748b;">${Math.round(sumFree).toLocaleString()} MB</div>
        </div>
        <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:4px; padding:8px 10px;">
          <div style="font-size:10px; color:#0369a1; font-weight:700;">CAPACIDADE MÁX (AUTOEXTEND)</div>
          <div style="font-size:14px; font-weight:800; color:#0369a1;">${(sumMax/1024).toFixed(2)} GB</div>
          <div style="font-size:10px; color:#0284c7;">MAXBYTES Total</div>
        </div>
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:4px; padding:8px 10px;">
          <div style="font-size:10px; color:#15803d; font-weight:700;">LIVRE ATÉ O MÁX (REAL)</div>
          <div style="font-size:14px; font-weight:800; color:#15803d;">${(sumFreeMax/1024).toFixed(2)} GB</div>
          <div style="font-size:10px; color:#16a34a;">Uso sobre Máx: <strong>${maxPct}%</strong></div>
        </div>
      </div>

      <div class="dba-filter-bar">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-space-text" placeholder="Filtrar tablespace por nome..." oninput="window.TracesApp.dbaTools.applySpaceFilter();" value="${this.filterState.spaceText || ''}">
        </div>
        <select class="toad-conn-combobox" id="dba-filter-space-usage" style="height: 24px; min-width: 160px;" onchange="window.TracesApp.dbaTools.applySpaceFilter();">
          <option value="all" ${this.filterState.spaceUsage === 'all' ? 'selected' : ''}>Todas as Tablespaces</option>
          <option value="50" ${this.filterState.spaceUsage === '50' ? 'selected' : ''}>Uso > 50%</option>
          <option value="80" ${this.filterState.spaceUsage === '80' ? 'selected' : ''}>Uso > 80% (Atenção)</option>
          <option value="90" ${this.filterState.spaceUsage === '90' ? 'selected' : ''}>Uso > 90% (Crítico)</option>
        </select>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearSpaceFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-space-count">Exibindo ${list.length} de ${list.length} tablespaces</span>
      </div>

      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 380px;">
        <table class="meta-table" style="width: 100%;">
          <thead>
            <tr>
              <th>Tablespace</th>
              <th style="text-align: right;">Alocado</th>
              <th style="text-align: right;">Usado</th>
              <th style="text-align: right;">Livre Aloc</th>
              <th style="width:140px;">% Uso Alocado</th>
              <th style="text-align: center;">Autoext</th>
              <th style="text-align: right;">Máximo (MAXBYTES)</th>
              <th style="text-align: right;">Livre até Máx</th>
              <th style="width:140px;">% Uso Máx</th>
              <th style="text-align: right;">Previsão</th>
            </tr>
          </thead>
          <tbody id="dba-space-table-body">${rows}</tbody>
        </table>
      </div>
    `;
  }

  // 6. Segment Advisor
  renderSegmentAdvisor(data) {
    const list = data?.findings || data?.segments || [
      { owner: 'HR', segmentName: 'EMPLOYEES', segmentType: 'TABLE', allocatedMb: 1.8, reclaimableMb: 0.6, clusteringFactor: '12 (Optimal)', recommendation: 'ALTER TABLE hr.employees SHRINK SPACE COMPACT;', actionSql: 'ALTER TABLE hr.employees SHRINK SPACE COMPACT;' },
      { owner: 'SALES_ADMIN', segmentName: 'CUSTOMERS', segmentType: 'TABLE', allocatedMb: 128.0, reclaimableMb: 44.2, clusteringFactor: '48', recommendation: 'ALTER TABLE sales_admin.customers MOVE;', actionSql: 'ALTER TABLE sales_admin.customers MOVE;' },
      { owner: 'HR', segmentName: 'EMP_JOB_IX', segmentType: 'INDEX', allocatedMb: 0.8, reclaimableMb: 0.3, clusteringFactor: '21 (Deleted Leaf Rows > 25%)', recommendation: 'ALTER INDEX hr.emp_job_ix REBUILD ONLINE NOLOGGING;', actionSql: 'ALTER INDEX hr.emp_job_ix REBUILD ONLINE NOLOGGING;' }
    ];

    const rows = list.map(s => `
      <tr data-owner="${(s.owner || '').toLowerCase()}" data-name="${(s.segmentName || '').toLowerCase()}" data-type="${(s.segmentType || '').toUpperCase()}" data-recom="${(s.recommendation || '').toLowerCase()}">
        <td>${s.owner}</td>
        <td><b>${s.segmentName}</b></td>
        <td>${s.segmentType}</td>
        <td>${s.allocatedMb} MB</td>
        <td style="color:#008000; font-weight:700;">${s.reclaimableMb} MB</td>
        <td>${s.clusteringFactor}</td>
        <td><code>${s.recommendation}</code></td>
        <td><button class="btn" onclick="window.TracesApp.dbaTools.executeSegmentAction('${s.actionSql}');">Execute</button></td>
      </tr>
    `).join('');

    setTimeout(() => this.applySegmentFilter(), 0);

    return `
      <div style="font-weight: 700; font-size: 13px;">Segment Advisor &amp; Rebuild Multiple Objects (DBMS_SPACE)</div>
      <div style="font-size: 11px; color: #555; margin-bottom: 6px;">Objects with wasted space below High Water Mark (HWM) or fragmented index leaf rows:</div>

      <div class="dba-filter-bar">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-segment-text" placeholder="Filtrar por owner, segmento ou recomendação..." oninput="window.TracesApp.dbaTools.applySegmentFilter();" value="${this.filterState.segmentText || ''}">
        </div>
        <select class="toad-conn-combobox" id="dba-filter-segment-type" style="height: 24px; min-width: 140px;" onchange="window.TracesApp.dbaTools.applySegmentFilter();">
          <option value="all" ${this.filterState.segmentType === 'all' ? 'selected' : ''}>Todos os Tipos</option>
          <option value="TABLE" ${this.filterState.segmentType === 'TABLE' ? 'selected' : ''}>TABLE</option>
          <option value="INDEX" ${this.filterState.segmentType === 'INDEX' ? 'selected' : ''}>INDEX</option>
        </select>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearSegmentFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-segment-count">Exibindo ${list.length} de ${list.length} segmentos</span>
      </div>

      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 320px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Owner</th><th>Segment Name</th><th>Type</th><th>Allocated</th><th>Reclaimable</th><th>Clustering Factor</th><th>Recommendation</th><th>Action</th></tr></thead>
          <tbody id="dba-segment-table-body">${rows}</tbody>
        </table>
      </div>
    `;
  }

  async executeSegmentAction(sql) {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se ao banco de dados para executar esta ação.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    if (window.TracesApp?.isRealDatabase) {
      try {
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const res = await resp.json();
        if (res.error) window.TracesApp.notify(`Erro: ${res.error}`, 'error');
        else window.TracesApp.notify(`Executado com sucesso: ${sql}`, 'success');
      } catch (e) {
        window.TracesApp.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp.notify(`Executado: ${sql}`, 'success');
    }
  }

  // 7. Undo Advisor
  renderUndoAdvisor(data) {
    const u = data || {
      undoRetention: 1800,
      undoBlockRate: 142,
      recommendedMb: 2840,
      currentMb: 4096,
      safeStatus: 'SAFE (0 risk of ORA-01555)',
      samples: [
        '2026-10-18 15:00:00 | UNDOBLKS: 14,200 | TXNCOUNT: 1,840 | MAXQUERYLEN: 420s | UNXPSTEALCNT: 0 (No stolen unexpired blocks).'
      ]
    };

    const samplesList = (u.samples && u.samples.length > 0)
      ? u.samples
      : (Array.isArray(u.history) && u.history.length > 0)
      ? u.history.map(h => `${h.time || (h.beginTime + ' - ' + h.endTime)} | UNDOBLKS: ${Number(h.undoBlocks || h.blocksGenerated || 0).toLocaleString()} | TXNCOUNT: ${Number(h.txnCount || 0).toLocaleString()} | MAXQUERYLEN: ${h.maxQueryLen || 0}s | ORA-01555: ${h.ora01555 || 0}`)
      : ['Nenhuma amostra de V$UNDOSTAT disponível.'];

    return `
      <div style="font-weight: 700; font-size: 13px;">Oracle Undo Advisor (V$UNDOSTAT &amp; ORA-01555 Sizing)</div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 8px 0;">
        <div style="background: #f7f7f7; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">
          <div style="font-size: 10px; color: #666;">UNDO RETENTION</div>
          <div style="font-size: 18px; font-weight: 700; color: #0078d7;">${Number(u.undoRetention || u.undoRetentionSec || 900).toLocaleString()} sec</div>
          <div style="font-size: 9.5px; color: #555;">(${Math.round((u.undoRetention || u.undoRetentionSec || 900) / 60)} Minutes Guaranteed)</div>
        </div>
        <div style="background: #f7f7f7; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">
          <div style="font-size: 10px; color: #666;">UNDO BLOCK RATE</div>
          <div style="font-size: 18px; font-weight: 700; color: #008000;">${u.undoBlockRate || 0} blocks/s</div>
          <div style="font-size: 9.5px; color: #555;">Peak Workload: ${Math.round((u.undoBlockRate || 0) * 1.5)} blk/s</div>
        </div>
        <div style="background: #f7f7f7; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">
          <div style="font-size: 10px; color: #666;">RECOMMENDED UNDOTBS SIZE</div>
          <div style="font-size: 18px; font-weight: 700; color: #0078d7;">${Number(u.recommendedMb || u.optimalUndoMb || 0).toLocaleString()} MB</div>
          <div style="font-size: 9.5px; color: #008000;">Current ${Number(u.currentMb || u.undoTablespaceMb || 0).toLocaleString()} MB is ${u.safeStatus || 'OPTIMAL'}</div>
        </div>
      </div>
      <div style="font-size: 11px; background: #fff; border: 1px solid #ccc; padding: 8px; max-height: 240px; overflow-y: auto;">
        <b>V$UNDOSTAT Recent Samples (${u.undoTablespace ? 'Tablespace: ' + u.undoTablespace : ''}):</b><br>
        ${samplesList.join('<br>')}
      </div>
    `;
  }

  // 8. Flashback Recycle Bin
  renderFlashback(data) {
    const list = data?.recycleBin || data?.recyclebin || (window.TRACES_DB ? window.TRACES_DB.recycleBin : []);
    const listHtml = list.length === 0 ? `
      <tr>
        <td colspan="6" style="text-align: center; padding: 30px; color: #64748b; font-style: italic;">
          🗑️ A lixeira do banco de dados (DBA_RECYCLEBIN) está vazia no momento. Nenhum objeto descartado.
        </td>
      </tr>
    ` : list.map(r => `
      <tr data-orig="${(r.originalName || '').toLowerCase()}" data-obj="${(r.objectName || '').toLowerCase()}" data-type="${(r.type || '').toUpperCase()}" data-ts="${(r.tsName || '').toLowerCase()}">
        <td style="font-family: var(--toad-font-code); color: #800080;">${r.objectName}</td>
        <td><b>${r.originalName}</b></td>
        <td>${r.type}</td>
        <td>${r.tsName}</td>
        <td>${r.dropTime}</td>
        <td>
          <button class="btn" style="padding: 1px 6px;" onclick="window.TracesApp.dbaTools.flashbackRestore('${r.originalName}');">Restore Table</button>
          <button class="btn" style="padding: 1px 6px; color:#c00000;" onclick="window.TracesApp.dbaTools.purgeRecycleObject('${r.objectName}');">Purge</button>
        </td>
      </tr>
    `).join('');

    setTimeout(() => this.applyFlashbackFilter(), 0);

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-weight: 700; font-size: 13px;">Flashback Browser (DBA_RECYCLEBIN)</span>
        <button class="btn btn-primary" onclick="window.TracesApp.dbaTools.purgeEntireRecycleBin();">Purge Entire Recycle Bin</button>
      </div>

      <div class="dba-filter-bar">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-flashback-text" placeholder="Filtrar por nome original ou nome BIN$... " oninput="window.TracesApp.dbaTools.applyFlashbackFilter();" value="${this.filterState.flashbackText || ''}">
        </div>
        <select class="toad-conn-combobox" id="dba-filter-flashback-type" style="height: 24px; min-width: 140px;" onchange="window.TracesApp.dbaTools.applyFlashbackFilter();">
          <option value="all" ${this.filterState.flashbackType === 'all' ? 'selected' : ''}>Todos os Tipos</option>
          <option value="TABLE" ${this.filterState.flashbackType === 'TABLE' ? 'selected' : ''}>TABLE</option>
          <option value="INDEX" ${this.filterState.flashbackType === 'INDEX' ? 'selected' : ''}>INDEX</option>
          <option value="TRIGGER" ${this.filterState.flashbackType === 'TRIGGER' ? 'selected' : ''}>TRIGGER</option>
        </select>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearFlashbackFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-flashback-count">Exibindo ${list.length} de ${list.length} objetos</span>
      </div>

      <div style="height: 320px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Object Name in Recyclebin</th><th>Original Name</th><th>Type</th><th>Tablespace</th><th>Drop Timestamp</th><th>Actions</th></tr></thead>
          <tbody id="dba-flashback-table-body">${listHtml}</tbody>
        </table>
      </div>
    `;
  }

  async flashbackRestore(tableName) {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se ao banco de dados para executar restauração de flashback.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    if (window.TracesApp?.isRealDatabase) {
      try {
        const resp = await fetch('/api/dba/flashback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'flashback', tableName })
        });
        const res = await resp.json();
        if (res.error) window.TracesApp.notify(`Erro: ${res.error}`, 'error');
        else {
          window.TracesApp.notify(`FLASHBACK TABLE ${tableName} TO BEFORE DROP concluído com sucesso.`, 'success');
          await this.loadSubtabData('flashback');
        }
      } catch (e) {
        window.TracesApp.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp.notify(`FLASHBACK TABLE ${tableName} TO BEFORE DROP concluído.`, 'success');
    }
  }

  async purgeRecycleObject(objectName) {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se ao banco de dados para expurgar objetos.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    if (window.TracesApp?.isRealDatabase) {
      try {
        const resp = await fetch('/api/dba/flashback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'purge', objectName })
        });
        const res = await resp.json();
        if (res.error) window.TracesApp.notify(`Erro: ${res.error}`, 'error');
        else {
          window.TracesApp.notify(`PURGE TABLE ${objectName} concluído.`, 'info');
          await this.loadSubtabData('flashback');
        }
      } catch (e) {
        window.TracesApp.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp.notify(`PURGE TABLE ${objectName} concluído.`, 'info');
    }
  }

  async purgeEntireRecycleBin() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se ao banco de dados para expurgar a lixeira.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    if (confirm('Tem certeza que deseja expurgar toda a lixeira (PURGE DBA_RECYCLEBIN)?')) {
      if (window.TracesApp?.isRealDatabase) {
        try {
          const resp = await fetch('/api/dba/flashback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'purge_all' })
          });
          const res = await resp.json();
          window.TracesApp.notify(res.message || 'PURGE DBA_RECYCLEBIN executado com sucesso.', 'warning');
          await this.loadSubtabData('flashback');
        } catch (e) {
          window.TracesApp.notify(`Erro: ${e.message}`, 'error');
        }
      } else {
        window.TracesApp.notify('PURGE DBA_RECYCLEBIN executado.', 'warning');
      }
    }
  }

  // 9. LogMiner
  renderLogMiner(data) {
    const list = data?.entries || (window.TRACES_DB ? window.TRACES_DB.logMiner : []);
    const listHtml = list.map(l => `
      <div class="dba-logminer-item" data-table="${(l.table || '').toLowerCase()}" data-user="${(l.username || '').toLowerCase()}" data-scn="${l.scn}" data-op="${(l.operation || '').toUpperCase()}" data-redo="${(l.sqlRedo || '').toLowerCase()}" data-undo="${(l.sqlUndo || '').toLowerCase()}" style="border-bottom: 1px solid #e0e0e0; padding: 6px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; color: #666; font-size: 10px;">
          <span>SCN: <b>${l.scn}</b> | User: <b>${l.username}</b> | Table: <b>${l.table}</b></span>
          <span class="toad-conn-badge-indicator" style="background:#e0f2fe; color:#0369a1;">${l.operation}</span>
        </div>
        <div style="margin-top: 4px;">
          <span style="color: #008000; font-weight: 700;">SQL_REDO:</span>
          <code style="font-family: var(--toad-font-code); color: #111;">${l.sqlRedo}</code>
        </div>
        <div style="margin-top: 2px;">
          <span style="color: #c00000; font-weight: 700;">SQL_UNDO:</span>
          <code style="font-family: var(--toad-font-code); color: #444;">${l.sqlUndo}</code>
        </div>
      </div>
    `).join('');

    setTimeout(() => this.applyLogMinerFilter(), 0);

    return `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 13px;">LogMiner Redo / Undo Transaction Inspector (DBMS_LOGMNR)</span>
        <div style="display: flex; gap: 6px;">
          <button class="btn" onclick="window.TracesApp.dbaTools.startLogMinerSession();">▶ Start LogMiner Session</button>
          <button class="btn" onclick="window.TracesApp.dbaTools.stopLogMinerSession();">⏹ Stop Session</button>
        </div>
      </div>

      <div class="dba-filter-bar" style="margin-top: 6px;">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-logminer-text" placeholder="Buscar no SQL Redo, SQL Undo, Tabela, Usuário ou SCN..." oninput="window.TracesApp.dbaTools.applyLogMinerFilter();" value="${this.filterState.logminerText || ''}">
        </div>
        <select class="toad-conn-combobox" id="dba-filter-logminer-op" style="height: 24px; min-width: 150px;" onchange="window.TracesApp.dbaTools.applyLogMinerFilter();">
          <option value="all" ${this.filterState.logminerOp === 'all' ? 'selected' : ''}>Todas as Operações</option>
          <option value="INSERT" ${this.filterState.logminerOp === 'INSERT' ? 'selected' : ''}>INSERT</option>
          <option value="UPDATE" ${this.filterState.logminerOp === 'UPDATE' ? 'selected' : ''}>UPDATE</option>
          <option value="DELETE" ${this.filterState.logminerOp === 'DELETE' ? 'selected' : ''}>DELETE</option>
          <option value="DDL" ${this.filterState.logminerOp === 'DDL' ? 'selected' : ''}>DDL</option>
        </select>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearLogMinerFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-logminer-count">Exibindo ${list.length} de ${list.length} transações</span>
      </div>

      <div id="dba-logminer-container" style="flex: 1; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf; max-height: 380px;">
        ${listHtml}
      </div>
    `;
  }

  async startLogMinerSession() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se ao banco de dados para iniciar o LogMiner.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    if (window.TracesApp?.isRealDatabase) {
      try {
        const resp = await fetch('/api/dba/logminer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' })
        });
        const res = await resp.json();
        window.TracesApp.notify(res.message || 'Sessão LogMiner iniciada.', 'success');
        await this.loadSubtabData('logminer');
      } catch (e) {
        window.TracesApp.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp.notify('LogMiner session active for SCN 10482910000..10482910500', 'success');
    }
  }

  async stopLogMinerSession() {
    if (window.TracesApp?.isRealDatabase) {
      try {
        await fetch('/api/dba/logminer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'stop' })
        });
        window.TracesApp.notify('Sessão LogMiner finalizada (DBMS_LOGMNR.END_LOGMNR).', 'info');
      } catch (e) {
        window.TracesApp.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp.notify('LogMiner session ended.', 'info');
    }
  }

  // 10. Data Guard
  renderDataGuard(data) {
    const dg = data || (window.TRACES_DB ? window.TRACES_DB.dataGuard : {
      primary: { dbUniqueName: 'PROD_PRIMARY', role: 'PRIMARY', protectionMode: 'MAXIMUM AVAILABILITY', archiveGaps: 0 },
      standby: { dbUniqueName: 'PROD_STANDBY', role: 'PHYSICAL STANDBY', mrpStatus: 'APPLYING_LOG (Active)', applyLag: '+00 00:00:00', lastAppliedSeq: 18492 }
    });

    return `
      <div style="font-weight: 700; font-size: 13px;">Oracle Data Guard Manager (V$DATAGUARD_STATS &amp; V$ARCHIVE_DEST_STATUS)</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
        <div style="background: #fff; border: 1px solid #ccc; padding: 12px; border-radius: 4px;">
          <div style="font-weight: 700; color: #0078d7; font-size: 12px; margin-bottom: 6px;">PRIMARY DATABASE: ${dg.primary.dbUniqueName}</div>
          <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px;">
            <div>Role: <b>${dg.primary.role}</b></div>
            <div>Protection Mode: <b>${dg.primary.protectionMode}</b></div>
            <div>Log Transport: <b>SYNC AFFIRM (0 Transport Lag)</b></div>
            <div>Archive Gaps: <b>${dg.primary.archiveGaps}</b></div>
          </div>
        </div>

        <div style="background: #fff; border: 1px solid #ccc; padding: 12px; border-radius: 4px;">
          <div style="font-weight: 700; color: #008000; font-size: 12px; margin-bottom: 6px;">STANDBY DATABASE: ${dg.standby.dbUniqueName}</div>
          <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px;">
            <div>Role: <b>${dg.standby.role}</b></div>
            <div>MRP Status: <b>${dg.standby.mrpStatus}</b></div>
            <div>Apply Lag: <b>${dg.standby.applyLag}</b></div>
            <div>Last Sequence Applied: <b>${dg.standby.lastAppliedSeq}</b></div>
          </div>
          <div style="margin-top: 8px;">
            <button class="btn" onclick="window.TracesApp.notify('Managed Recovery Process (MRP0) restarted.', 'success');">Restart MRP</button>
            <button class="btn btn-primary" onclick="window.TracesApp.notify('Data Guard Switchover validated (No Redo Lag).', 'info');">Validate Switchover</button>
          </div>
        </div>
      </div>
    `;
  }

  // 11. ASM Storage Manager
  renderAsm(data) {
    const list = data?.diskgroups || (window.TRACES_DB ? window.TRACES_DB.asm.diskgroups : []);
    const rows = list.map(d => `
      <tr data-name="${(d.name || '').toLowerCase()}" data-state="${(d.state || '').toUpperCase()}">
        <td><b>+${d.name}</b></td>
        <td>${d.type}</td>
        <td>${d.totalGb} GB</td>
        <td>${d.freeGb} GB</td>
        <td><span style="color:#008000; font-weight:700;">${d.state}</span></td>
        <td>Rebalance Power: ${d.rebalancePower}</td>
        <td>${d.disks} Disks</td>
        <td><button class="btn" onclick="window.TracesApp.dbaTools.rebalanceAsm('${d.name}');">Rebalance</button></td>
      </tr>
    `).join('');

    setTimeout(() => this.applyAsmFilter(), 0);

    return `
      <div style="font-weight: 700; font-size: 13px;">ASM Storage Manager (Automatic Storage Management)</div>

      <div class="dba-filter-bar" style="margin-top: 6px;">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-asm-text" placeholder="Filtrar diskgroup por nome..." oninput="window.TracesApp.dbaTools.applyAsmFilter();" value="${this.filterState.asmText || ''}">
        </div>
        <select class="toad-conn-combobox" id="dba-filter-asm-state" style="height: 24px; min-width: 140px;" onchange="window.TracesApp.dbaTools.applyAsmFilter();">
          <option value="all" ${this.filterState.asmState === 'all' ? 'selected' : ''}>Todos os Estados</option>
          <option value="MOUNTED" ${this.filterState.asmState === 'MOUNTED' ? 'selected' : ''}>MOUNTED</option>
          <option value="DISMOUNTED" ${this.filterState.asmState === 'DISMOUNTED' ? 'selected' : ''}>DISMOUNTED</option>
        </select>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearAsmFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-asm-count">Exibindo ${list.length} de ${list.length} diskgroups</span>
      </div>

      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Diskgroup</th><th>Redundancy</th><th>Total Capacity</th><th>Free Space</th><th>State</th><th>Rebalance</th><th>Member Disks</th><th>Actions</th></tr></thead>
          <tbody id="dba-asm-table-body">${rows}</tbody>
        </table>
      </div>
    `;
  }

  async rebalanceAsm(dgName) {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se ao banco de dados para rebalancear diskgroup.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    if (window.TracesApp?.isRealDatabase) {
      try {
        await fetch('/api/dba/asm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'rebalance', diskgroup: dgName, power: 6 })
        });
        window.TracesApp.notify(`ALTER DISKGROUP ${dgName} REBALANCE POWER 6 iniciado.`, 'info');
      } catch (e) {
        window.TracesApp.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp.notify(`ALTER DISKGROUP ${dgName} REBALANCE POWER 6 initiated (Mock).`, 'info');
    }
  }

  // 12. RAC Cluster Diagnostics
  renderRac(data) {
    const instances = data?.instances || [
      { instId: 1, instanceName: 'ORCL1', hostName: 'racnode01.corp', status: 'OPEN' },
      { instId: 2, instanceName: 'ORCL2', hostName: 'racnode02.corp', status: 'OPEN' }
    ];
    const services = data?.services || [
      { serviceName: 'OLTP_SRV', networkName: 'oltp_srv' },
      { serviceName: 'BATCH_SRV', networkName: 'batch_srv' }
    ];

    const instHtml = instances.map(i => `
      <tr data-name="${(i.instanceName || '').toLowerCase()}" data-host="${(i.hostName || '').toLowerCase()}">
        <td><b>Instance ${i.instId}</b></td>
        <td>${i.instanceName}</td>
        <td>${i.hostName}</td>
        <td><span style="color:#008000; font-weight:700;">${i.status}</span></td>
      </tr>
    `).join('');

    const servHtml = services.map(s => `
      <tr data-srv="${(s.serviceName || '').toLowerCase()}">
        <td><b>${s.serviceName}</b></td>
        <td>${s.networkName}</td>
      </tr>
    `).join('');

    setTimeout(() => this.applyRacFilter(), 0);

    return `
      <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">Oracle Real Application Clusters (RAC) Node &amp; Interconnect Diagnostics</div>

      <div class="dba-filter-bar">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-rac-text" placeholder="Filtrar por instância, host ou serviço..." oninput="window.TracesApp.dbaTools.applyRacFilter();" value="${this.filterState.racText || ''}">
        </div>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearRacFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-rac-count">Exibindo ${instances.length} instâncias</span>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
        <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto;">
          <table class="meta-table" style="width: 100%;">
            <thead><tr><th>Instance ID</th><th>Instance Name</th><th>Host Node</th><th>Status</th></tr></thead>
            <tbody id="dba-rac-inst-body">${instHtml}</tbody>
          </table>
        </div>
        <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto;">
          <table class="meta-table" style="width: 100%;">
            <thead><tr><th>Cluster Service</th><th>Network Name</th></tr></thead>
            <tbody id="dba-rac-serv-body">${servHtml}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // 13. Exadata Smart Scan
  renderExadata(data) {
    const list = data?.smartScan || [
      { cell: 'cell01', offloadEligibleMb: 48200, returnedMb: 4200, savingsPct: 91.3 },
      { cell: 'cell02', offloadEligibleMb: 45100, returnedMb: 3950, savingsPct: 91.2 },
      { cell: 'cell03', offloadEligibleMb: 49800, returnedMb: 4100, savingsPct: 91.8 }
    ];

    const rows = list.map(c => `
      <tr>
        <td><b>${c.cell}</b></td>
        <td style="text-align: right;">${Number(c.offloadEligibleMb).toLocaleString()} MB</td>
        <td style="text-align: right;">${Number(c.returnedMb).toLocaleString()} MB</td>
        <td style="text-align: right; color:#008000; font-weight:700;">${c.savingsPct}% (Smart Scan)</td>
      </tr>
    `).join('');

    return `
      <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">Exadata Smart Scan &amp; Storage Index Diagnostics</div>
      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Storage Cell</th><th style="text-align: right;">Eligible Cell Offload</th><th style="text-align: right;">Returned to Compute</th><th style="text-align: right;">Bandwidth Saved</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="background:#e5f1fb; padding:8px; border:1px solid #b8d6f5; font-size:11px; border-radius:3px; margin-top:8px;">
        ⚡ <b>Smart Scan Offload:</b> Query predicates are evaluated directly on the Exadata Storage Servers, bypassing the storage interconnect and reducing DB node memory pressure.
      </div>
    `;
  }

  // 14. Audit Manager
  renderAudit(data) {
    const records = data?.records || [
      { timestamp: '2026-10-18 19:10:22', username: 'HR', action: 'SELECT', object: 'EMPLOYEES', returnCode: 0 },
      { timestamp: '2026-10-18 19:08:45', username: 'SYSTEM', action: 'ALTER SYSTEM', object: 'SPFILE', returnCode: 0 },
      { timestamp: '2026-10-18 19:01:12', username: 'APP_USER', action: 'LOGON', object: '-', returnCode: 1017 }
    ];

    const rows = records.map(r => `
      <tr data-user="${(r.username || '').toLowerCase()}" data-obj="${(r.object || '').toLowerCase()}" data-act="${(r.action || '').toUpperCase()}" data-status="${r.returnCode === 0 ? 'SUCCESS' : 'FAIL'}">
        <td>${r.timestamp}</td>
        <td><b>${r.username}</b></td>
        <td>${r.action}</td>
        <td>${r.object}</td>
        <td style="color:${r.returnCode === 0 ? '#008000' : '#c00000'}; font-weight:700;">
          ${r.returnCode === 0 ? 'SUCCESS' : `ORA-${String(r.returnCode).padStart(5, '0')}`}
        </td>
      </tr>
    `).join('');

    setTimeout(() => this.applyAuditFilter(), 0);

    return `
      <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">Audit Manager &amp; Fine-Grained Auditing (UNIFIED_AUDIT_TRAIL)</div>

      <div class="dba-filter-bar">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-audit-text" placeholder="Filtrar por usuário ou objeto auditado..." oninput="window.TracesApp.dbaTools.applyAuditFilter();" value="${this.filterState.auditText || ''}">
        </div>
        <select class="toad-conn-combobox" id="dba-filter-audit-action" style="height: 24px; min-width: 140px;" onchange="window.TracesApp.dbaTools.applyAuditFilter();">
          <option value="all" ${this.filterState.auditAction === 'all' ? 'selected' : ''}>Todas as Ações</option>
          <option value="SELECT" ${this.filterState.auditAction === 'SELECT' ? 'selected' : ''}>SELECT</option>
          <option value="INSERT" ${this.filterState.auditAction === 'INSERT' ? 'selected' : ''}>INSERT</option>
          <option value="UPDATE" ${this.filterState.auditAction === 'UPDATE' ? 'selected' : ''}>UPDATE</option>
          <option value="DELETE" ${this.filterState.auditAction === 'DELETE' ? 'selected' : ''}>DELETE</option>
          <option value="ALTER SYSTEM" ${this.filterState.auditAction === 'ALTER SYSTEM' ? 'selected' : ''}>ALTER SYSTEM</option>
          <option value="LOGON" ${this.filterState.auditAction === 'LOGON' ? 'selected' : ''}>LOGON</option>
        </select>
        <select class="toad-conn-combobox" id="dba-filter-audit-status" style="height: 24px; min-width: 130px;" onchange="window.TracesApp.dbaTools.applyAuditFilter();">
          <option value="all" ${this.filterState.auditStatus === 'all' ? 'selected' : ''}>Todos os Status</option>
          <option value="SUCCESS" ${this.filterState.auditStatus === 'SUCCESS' ? 'selected' : ''}>Sucesso (0)</option>
          <option value="FAIL" ${this.filterState.auditStatus === 'FAIL' ? 'selected' : ''}>Falhas (ORA-)</option>
        </select>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearAuditFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-audit-count">Exibindo ${records.length} de ${records.length} registros</span>
      </div>

      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 380px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Timestamp</th><th>Username</th><th>Action</th><th>Target Object</th><th>Status</th></tr></thead>
          <tbody id="dba-audit-table-body">${rows}</tbody>
        </table>
      </div>
    `;
  }

  // 15. Keystore & TDE
  renderWallet(data) {
    const w = data || { walletType: 'FILE (Software Keystore)', status: 'OPEN', wrlParameter: '/u01/app/oracle/admin/ORCL/wallet' };
    return `
      <div style="font-weight: 700; font-size: 13px; margin-bottom: 8px;">Oracle Keystore &amp; Transparent Data Encryption (TDE) Status</div>
      <div style="background: #fff; border: 1px solid #ccc; padding: 12px; border-radius: 4px; max-width: 600px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span>Keystore Status (V$ENCRYPTION_WALLET):</span>
          <span style="color:#008000; font-weight:700; background:#dcfce7; padding:2px 8px; border-radius:3px;">${w.status}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span>Keystore Type:</span>
          <b>${w.walletType}</b>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>WRL Location:</span>
          <code>${w.wrlParameter}</code>
        </div>
      </div>
    `;
  }

  // 16. Schema Compare
  renderSchemaCompare(data) {
    const diffs = data?.differences || [
      { type: 'COLUMN MISSING', object: 'EMPLOYEES.COMMISSION_PCT', sourceVal: 'NUMBER(2,2)', targetVal: '<MISSING>' },
      { type: 'INDEX MISSING', object: 'EMP_NAME_IX', sourceVal: 'INDEX (LAST_NAME, FIRST_NAME)', targetVal: '<MISSING>' }
    ];

    const rows = diffs.map(d => `
      <tr data-obj="${(d.object || '').toLowerCase()}" data-type="${(d.type || '').toUpperCase()}">
        <td><span class="toad-conn-badge-indicator" style="background:#fee2e2; color:#b91c1c;">${d.type}</span></td>
        <td><b>${d.object}</b></td>
        <td style="color:#008000;">${d.sourceVal}</td>
        <td style="color:#c00000;">${d.targetVal}</td>
      </tr>
    `).join('');

    setTimeout(() => this.applySchemaCompareFilter(), 0);

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="font-weight: 700; font-size: 13px;">Schema Compare</span>
          <input id="cmp-source-schema" type="text" value="HR" style="width: 80px; padding: 2px 4px; border: 1px solid #ccc; font-weight:700;" title="Source Schema" />
          <span>vs</span>
          <input id="cmp-target-schema" type="text" value="HR_UAT" style="width: 80px; padding: 2px 4px; border: 1px solid #ccc; font-weight:700;" title="Target Schema" />
          <button class="btn" onclick="window.TracesApp.dbaTools.runLiveSchemaCompare();">Compare Now</button>
        </div>
        <button class="btn btn-primary" onclick="window.TracesApp.dbaTools.generateSyncScript();">Generate Synchronization Script</button>
      </div>

      <div class="dba-filter-bar">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-schema-text" placeholder="Filtrar objeto ou tipo de diferença..." oninput="window.TracesApp.dbaTools.applySchemaCompareFilter();" value="${this.filterState.schemaText || ''}">
        </div>
        <select class="toad-conn-combobox" id="dba-filter-schema-type" style="height: 24px; min-width: 150px;" onchange="window.TracesApp.dbaTools.applySchemaCompareFilter();">
          <option value="all" ${this.filterState.schemaType === 'all' ? 'selected' : ''}>Todos os Tipos</option>
          <option value="COLUMN" ${this.filterState.schemaType === 'COLUMN' ? 'selected' : ''}>COLUMN MISSING</option>
          <option value="INDEX" ${this.filterState.schemaType === 'INDEX' ? 'selected' : ''}>INDEX MISSING</option>
        </select>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearSchemaCompareFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-schema-count">Exibindo ${diffs.length} de ${diffs.length} diferenças</span>
      </div>

      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 320px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Difference Type</th><th>Target Object</th><th>Source Schema</th><th>Target Schema</th></tr></thead>
          <tbody id="dba-schema-table-body">${rows}</tbody>
        </table>
      </div>
    `;
  }

  async runLiveSchemaCompare() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se ao banco de dados para comparar schemas.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    const src = document.getElementById('cmp-source-schema')?.value || 'HR';
    const tgt = document.getElementById('cmp-target-schema')?.value || 'HR_UAT';
    if (window.TracesApp?.isRealDatabase) {
      try {
        const resp = await fetch('/api/dba/schemacompare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceSchema: src, targetSchema: tgt })
        });
        const res = await resp.json();
        this.cachedData['schemacompare'] = res;
        const pane = document.getElementById('dba-pane-schemacompare');
        if (pane) pane.innerHTML = this.renderSchemaCompare(res);
      } catch (e) {
        window.TracesApp.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp.notify(`Comparando schemas ${src} e ${tgt} (Mock).`, 'info');
    }
  }

  generateSyncScript() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se ao banco de dados.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    const syncDdl = this.cachedData['schemacompare']?.syncDdl || [
      'ALTER TABLE HR_UAT.EMPLOYEES ADD (COMMISSION_PCT NUMBER(2,2));',
      'CREATE INDEX HR_UAT.EMP_NAME_IX ON HR_UAT.EMPLOYEES (LAST_NAME, FIRST_NAME);'
    ];
    const sql = `-- Toad Schema Synchronization Script\n${syncDdl.join('\n')}`;
    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.switchDockView('editor');
      window.TracesApp.sqlEditor.setQuery(sql);
      window.TracesApp.notify('Script de sincronização de Schema enviado para o Editor SQL.', 'success');
    }
  }

  // 17. Data Compare
  renderDataCompare(data) {
    const diffs = data?.differences || [
      { pk: '100', sourceVal: 'SALARY: 25,000.00', targetVal: 'SALARY: 24,000.00', status: 'VALUE MISMATCH', syncSql: 'UPDATE hr.employees SET salary = 25000 WHERE employee_id = 100;' },
      { pk: '107', sourceVal: 'FULL ROW (Diana Lorentz)', targetVal: 'MISSING IN TARGET', status: 'INSERT NEEDED', syncSql: "INSERT INTO hr.employees VALUES (107, 'Diana', 'Lorentz', ...);" }
    ];

    const rows = diffs.map(d => `
      <tr data-pk="${(d.pk || '').toLowerCase()}" data-status="${(d.status || '').toUpperCase()}" data-val="${((d.sourceVal || '') + ' ' + (d.targetVal || '') + ' ' + (d.syncSql || '')).toLowerCase()}">
        <td><b>${d.pk}</b></td>
        <td>${d.sourceVal}</td>
        <td>${d.targetVal}</td>
        <td><span class="toad-conn-badge-indicator" style="background:#fee2e2; color:#b91c1c;">${d.status}</span></td>
        <td><code>${d.syncSql}</code></td>
      </tr>
    `).join('');

    setTimeout(() => this.applyDataCompareFilter(), 0);

    return `
      <div style="font-weight: 700; font-size: 13px;">Data Compare (Line-by-Line PK Comparison)</div>
      <div style="font-size: 11px; color: #555; margin-bottom: 6px;">Table: HR.EMPLOYEES (Compared across Source and Target):</div>

      <div class="dba-filter-bar">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-data-text" placeholder="Filtrar por PK, valores ou SQL de sincronização..." oninput="window.TracesApp.dbaTools.applyDataCompareFilter();" value="${this.filterState.dataText || ''}">
        </div>
        <select class="toad-conn-combobox" id="dba-filter-data-status" style="height: 24px; min-width: 150px;" onchange="window.TracesApp.dbaTools.applyDataCompareFilter();">
          <option value="all" ${this.filterState.dataStatus === 'all' ? 'selected' : ''}>Todos os Status</option>
          <option value="MISMATCH" ${this.filterState.dataStatus === 'MISMATCH' ? 'selected' : ''}>VALUE MISMATCH</option>
          <option value="INSERT" ${this.filterState.dataStatus === 'INSERT' ? 'selected' : ''}>INSERT NEEDED</option>
        </select>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearDataCompareFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-data-count">Exibindo ${diffs.length} de ${diffs.length} linhas</span>
      </div>

      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 320px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>PK</th><th>Source Value</th><th>Target Value</th><th>Status</th><th>Sync Action</th></tr></thead>
          <tbody id="dba-data-table-body">${rows}</tbody>
        </table>
      </div>
    `;
  }

  // 18. Database Compare
  renderDbCompare(data) {
    const params = data?.parameters || [
      { name: 'db_block_size', sourceValue: '8192', targetValue: '8192', diff: false },
      { name: 'sga_target', sourceValue: '16384M', targetValue: '8192M', diff: true },
      { name: 'pga_aggregate_target', sourceValue: '4096M', targetValue: '2048M', diff: true }
    ];

    const rows = params.map(p => `
      <tr data-name="${(p.name || '').toLowerCase()}" data-diff="${p.diff ? 'true' : 'false'}" style="${p.diff ? 'background:#fffbeb;' : ''}">
        <td><b>${p.name}</b></td>
        <td>${p.sourceValue}</td>
        <td>${p.targetValue}</td>
        <td>${p.diff ? '<span style="color:#b45309; font-weight:700;">DIFFERENT</span>' : '<span style="color:#008000;">MATCH</span>'}</td>
      </tr>
    `).join('');

    setTimeout(() => this.applyDbCompareFilter(), 0);

    return `
      <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">Database Compare (init.ora &amp; SPFILE Configuration Differences)</div>

      <div class="dba-filter-bar">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-dbcompare-text" placeholder="Filtrar parâmetro comparado por nome..." oninput="window.TracesApp.dbaTools.applyDbCompareFilter();" value="${this.filterState.dbcompareText || ''}">
        </div>
        <select class="toad-conn-combobox" id="dba-filter-dbcompare-diff" style="height: 24px; min-width: 160px;" onchange="window.TracesApp.dbaTools.applyDbCompareFilter();">
          <option value="all" ${this.filterState.dbcompareDiff === 'all' ? 'selected' : ''}>Todos os Parâmetros</option>
          <option value="diff" ${this.filterState.dbcompareDiff === 'diff' ? 'selected' : ''}>Apenas Diferenças (DIFFERENT)</option>
          <option value="match" ${this.filterState.dbcompareDiff === 'match' ? 'selected' : ''}>Apenas Iguais (MATCH)</option>
        </select>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearDbCompareFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-dbcompare-count">Exibindo ${params.length} de ${params.length} parâmetros</span>
      </div>

      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 380px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Parameter Name</th><th>Source Instance</th><th>Target Instance</th><th>Match Status</th></tr></thead>
          <tbody id="dba-dbcompare-table-body">${rows}</tbody>
        </table>
      </div>
    `;
  }

    // 19. AWR / ASH & ADDM Diagnostics Suite
  renderAwr(data) {
    const snaps = data?.snapshots || [];
    const topSql = data?.topSql || [];
    const addmFindings = data?.addmFindings || [];
    const addmTasks = data?.addmTasks || [];
    const instances = data?.instances || [{ instanceNumber: 1, instanceName: 'LOCAL', hostName: '' }];
    const dbInfo = data?.database || { name: 'Oracle' };
    const ash = data?.ash || [];
    const currentSort = data?.sortBy || this.currentAwrSort || 'elapsed';
    this.currentAwrSort = currentSort;
    this.addmSubtab = this.addmSubtab || 'findings';

    // Cache latest AWR data
    this._latestAwrData = data;

    const snapStartDefault = snaps[1]?.snapId || snaps[0]?.snapId || 1;
    const snapEndDefault = snaps[0]?.snapId || 2;

    const snapsHtml = snaps.map((s, idx) => `
      <tr data-snap="${s.snapId}" data-time="${((s.beginTime || '') + ' ' + (s.endTime || '')).toLowerCase()}" style="cursor: pointer;" onclick="window.TracesApp.dbaTools.selectAwrSnapRow(${s.snapId})">
        <td style="font-weight: 700; color: #0284c7; font-family: monospace;">#${s.snapId}</td>
        <td>${s.beginTime || '-'}</td>
        <td>${s.endTime || '-'}</td>
        <td style="text-align: right; color: #64748b; font-size: 10px;">Inst #${s.instanceNumber || 1}</td>
        <td style="text-align: right; white-space: nowrap;" onclick="event.stopPropagation();">
          <div style="display: flex; gap: 3px; justify-content: flex-end;">
            <button class="btn btn-primary" style="height: 19px; padding: 0 5px; font-size: 9.5px; font-weight: 600;" onclick="window.TracesApp.dbaTools.quickGenerateAwr(${s.snapId})" title="Gerar e Visualizar Relatório AWR a partir deste snapshot">📊 AWR</button>
            <button class="btn" style="height: 19px; padding: 0 5px; font-size: 9.5px; font-weight: 600; color: #4338ca; border-color: #c7d2fe; background: #eef2ff;" onclick="window.TracesApp.dbaTools.quickGenerateAddm(${s.snapId})" title="Analisar e Visualizar Diagnóstico ADDM">🧠 ADDM</button>
            <button class="btn" style="height: 19px; padding: 0 5px; font-size: 9px;" onclick="window.TracesApp.dbaTools.quickDownloadAwr(${s.snapId}, 'HTML')" title="Download direto do AWR HTML para seu PC">⬇ HTML</button>
            <button class="btn" style="height: 19px; padding: 0 5px; font-size: 9px;" onclick="window.TracesApp.dbaTools.quickDownloadAwr(${s.snapId}, 'TEXT')" title="Download direto do AWR TXT para seu PC">⬇ TXT</button>
          </div>
        </td>
      </tr>
    `).join('');

    const sortLabels = [
      { key: 'elapsed', label: '⏱️ Tempo Decorrido (Total)' },
      { key: 'cpu', label: '⚡ Tempo de CPU' },
      { key: 'buffer_gets', label: '💾 Buffer Gets (I/O Lógico)' },
      { key: 'disk_reads', label: '💿 Disk Reads (I/O Físico)' },
      { key: 'executions', label: '🔁 Execuções' },
      { key: 'parse_calls', label: '🏷️ Parse Calls' }
    ];

    setTimeout(() => this.applyAwrFilter(), 0);

    return `
      <!-- Top Action Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 700; font-size: 13.5px; color: #0f172a;">⚡ AWR &amp; ADDM Diagnostics Suite (Oracle 19c)</span>
          <span class="toad-conn-badge-indicator" style="background:#e0f2fe; color:#0369a1; font-size: 10px;">Toad Enterprise Diagnostics</span>
          ${dbInfo.name ? `<span style="font-size: 10.5px; color: #64748b; font-weight: 600;">DB: <code style="color: #0284c7;">${dbInfo.name}</code></span>` : ''}
        </div>
        
        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
          <!-- Interval Selector -->
          <div style="display: flex; align-items: center; gap: 4px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 11px;">
            <span style="color: #64748b; font-weight: 600;">Faixa:</span>
            <select id="dba-awr-snap-start" style="height: 22px; font-size: 11px; font-weight: 600; padding: 0 4px;" title="Snapshot Inicial">
              ${snaps.map(s => `<option value="${s.snapId}" ${s.snapId == snapStartDefault ? 'selected' : ''}>Snap ${s.snapId} (${s.beginTime ? s.beginTime.slice(5, 16) : ''})</option>`).join('')}
            </select>
            <span style="color: #64748b;">até</span>
            <select id="dba-awr-snap-end" style="height: 22px; font-size: 11px; font-weight: 600; padding: 0 4px;" title="Snapshot Final">
              ${snaps.map(s => `<option value="${s.snapId}" ${s.snapId == snapEndDefault ? 'selected' : ''}>Snap ${s.snapId} (${s.endTime ? s.endTime.slice(5, 16) : ''})</option>`).join('')}
            </select>
          </div>

          <!-- Scope / Instance Selector -->
          <div style="display: flex; align-items: center; gap: 4px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 11px;">
            <span style="color: #64748b; font-weight: 600;">Escopo:</span>
            <select id="dba-awr-scope" style="height: 22px; font-size: 11px; font-weight: 600; padding: 0 4px;" title="Escopo do Relatório">
              ${instances.map(inst => `<option value="instance:${inst.instanceNumber}">Instância #${inst.instanceNumber} (${inst.instanceName || 'Local'})</option>`).join('')}
              <option value="global">RAC Cluster (Global Report)</option>
            </select>
          </div>

          <!-- Main View Buttons -->
          <button class="btn btn-primary" style="height: 24px; padding: 0 10px; font-size: 11px; font-weight: 600;" onclick="window.TracesApp.dbaTools.generateAwrReport();" title="Gerar e visualizar relatório AWR no aplicativo com abas HTML e Texto">
            📊 Relatório AWR
          </button>
          <button class="btn" style="height: 24px; padding: 0 10px; font-size: 11px; font-weight: 600; color: #4338ca; border-color: #c7d2fe; background: #eef2ff;" onclick="window.TracesApp.dbaTools.generateAddmReport();" title="Executar análise ADDM e visualizar diagnóstico completo">
            🧠 Análise ADDM
          </button>

          <!-- Direct Download Group (Before Entering View) -->
          <div style="display: flex; gap: 2px; align-items: center; background: #f1f5f9; padding: 1px; border-radius: 4px; border: 1px solid #cbd5e1;">
            <button class="btn" style="height: 22px; padding: 0 6px; font-size: 10px; font-weight: 600; color: #0284c7;" onclick="window.TracesApp.dbaTools.generateAwrReport({ directDownload: true, format: 'HTML' });" title="Download direto do relatório AWR em HTML para seu computador">
              ⬇ AWR HTML
            </button>
            <button class="btn" style="height: 22px; padding: 0 6px; font-size: 10px; font-weight: 600; color: #0284c7;" onclick="window.TracesApp.dbaTools.generateAwrReport({ directDownload: true, format: 'TEXT' });" title="Download direto do relatório AWR em Texto para seu computador">
              ⬇ AWR TXT
            </button>
            <button class="btn" style="height: 22px; padding: 0 6px; font-size: 10px; font-weight: 600; color: #4338ca;" onclick="window.TracesApp.dbaTools.generateAddmReport({ directDownload: true, format: 'TEXT' });" title="Download direto do relatório ADDM em Texto para seu computador">
              ⬇ ADDM TXT
            </button>
            <button class="btn" style="height: 22px; padding: 0 6px; font-size: 10px; font-weight: 600; color: #4338ca;" onclick="window.TracesApp.dbaTools.generateAddmReport({ directDownload: true, format: 'HTML' });" title="Download direto do relatório ADDM em HTML para seu computador">
              ⬇ ADDM HTML
            </button>
          </div>

          <button class="btn" style="height: 24px; padding: 0 8px; font-size: 11px;" onclick="window.TracesApp.dbaTools.createAwrSnapshot();" title="Forçar criação de novo Snapshot AWR via DBMS_WORKLOAD_REPOSITORY">
            📸 Criar Snapshot
          </button>
          <button class="btn" style="height: 24px; padding: 0 8px; font-size: 11px;" onclick="window.TracesApp.dbaTools.loadSubtabData('awr');" title="Atualizar dados de desempenho">
            🔄 Atualizar
          </button>
        </div>
      </div>

      <!-- Quick Metrics Ribbon -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; gap: 14px; align-items: center;">
          <span>📦 Snapshots no Histórico: <b>${snaps.length}</b></span>
          <span>🔥 Top SQL Monitorados: <b>${topSql.length}</b></span>
          <span>🧠 Descobertas ADDM Ativas: <b>${addmFindings.length}</b></span>
          <span>📋 Tarefas ADDM Concluídas: <b>${addmTasks.length}</b></span>
          <span>⏳ Amostras ASH: <b>${ash.length}</b></span>
        </div>
        <div style="color: #64748b; font-size: 10.5px;">
          💡 Clique em <b>Visualizar</b> para inspecionar no próprio app como <b>HTML e Texto</b> ou baixe diretamente na sua máquina com 1 clique.
        </div>
      </div>

      <!-- SECTION 1: TOP SQL STATEMENTS WITH DYNAMIC METRIC SORTING -->
      <div style="background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div style="background: #f1f5f9; padding: 6px 10px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
          <div style="font-weight: 700; font-size: 12px; color: #1e293b; display: flex; align-items: center; gap: 6px;">
            <span>🔥 Top SQL Statements (V$SQL &amp; DBA_HIST_SQLSTAT)</span>
            <span style="font-size: 10px; background: #e2e8f0; color: #475569; padding: 1px 6px; border-radius: 10px;">${topSql.length} consultas</span>
          </div>

          <!-- Sorting Pills -->
          <div style="display: flex; gap: 3px; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 10.5px; font-weight: 600; color: #475569; margin-right: 4px;">Ordenar por:</span>
            ${sortLabels.map(s => `
              <button class="btn ${currentSort === s.key ? 'btn-primary' : ''}" 
                      style="height: 22px; padding: 0 7px; font-size: 10px; font-weight: ${currentSort === s.key ? '700' : '500'};"
                      onclick="window.TracesApp.dbaTools.changeAwrSort('${s.key}')">
                ${s.label}
              </button>
            `).join('')}
          </div>
        </div>

        <div style="overflow-x: auto; max-height: 280px; overflow-y: auto;">
          <table class="meta-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 2; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              <tr>
                <th style="min-width: 110px;">SQL ID</th>
                <th style="min-width: 130px;">Ações</th>
                <th style="text-align: right; min-width: 75px;">Execuções</th>
                <th style="text-align: right; min-width: 95px;">Tempo Total</th>
                <th style="text-align: right; min-width: 90px;">Tempo/Exec</th>
                <th style="text-align: right; min-width: 85px;">Tempo CPU</th>
                <th style="text-align: right; min-width: 95px;">Buffer Gets</th>
                <th style="text-align: right; min-width: 85px;">Disk Reads</th>
                <th style="min-width: 120px;">Schema / Módulo</th>
                <th style="min-width: 90px;">Plan Hash</th>
                <th style="min-width: 250px;">Prévia da Consulta SQL</th>
              </tr>
            </thead>
            <tbody>
              ${topSql.length === 0 ? `
                <tr><td colspan="11" style="text-align: center; padding: 20px; color: #94a3b8;">Nenhum SQL capturado no cache de biblioteca para os critérios atuais.</td></tr>
              ` : topSql.map(q => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <a href="javascript:void(0)" onclick="window.TracesApp.dbaTools.openSqlInspector('${q.sqlId}')" style="font-weight: 700; color: #0284c7; font-family: monospace; text-decoration: underline;" title="Clique para inspecionar SQL completo, Explain Plan e Waits">
                        🔍 ${q.sqlId}
                      </a>
                      <button class="btn" style="height: 18px; padding: 0 4px; font-size: 9px;" onclick="window.TracesApp.dbaTools.copyToClipboard('${q.sqlId}', 'SQL ID copiado!'); event.stopPropagation();" title="Copiar SQL ID">📋</button>
                    </div>
                  </td>
                  <td style="white-space: nowrap;">
                    <div style="display: flex; gap: 3px;">
                      <button class="btn btn-primary" style="height: 20px; padding: 0 6px; font-size: 9.5px; font-weight: 600;" onclick="window.TracesApp.dbaTools.openSqlInspector('${q.sqlId}')" title="Inspecionar código completo, estatísticas, explain plan e waits">
                        🔍 Inspecionar
                      </button>
                      <button class="btn" style="height: 20px; padding: 0 6px; font-size: 9.5px; font-weight: 600; color: #15803d; border-color: #86efac; background: #f0fdf4;" onclick="window.TracesApp.dbaTools.openSqlInEditor('${q.sqlId}')" title="Carregar no SQL Editor para editar e executar">
                        📝 Editor
                      </button>
                    </div>
                  </td>
                  <td style="text-align: right; font-weight: 600;">${Number(q.executions || 0).toLocaleString()}</td>
                  <td style="text-align: right; font-weight: 700; color: ${q.elapsedSec > 100 ? '#dc2626' : (q.elapsedSec > 10 ? '#d97706' : '#1e293b')};">${this.formatDuration(q.elapsedSec)}</td>
                  <td style="text-align: right; color: #475569;">${Number(q.elapsedPerExec || 0).toFixed(4)}s</td>
                  <td style="text-align: right;">${this.formatDuration(q.cpuSec)}</td>
                  <td style="text-align: right; font-family: monospace;">${Number(q.bufferGets || 0).toLocaleString()}</td>
                  <td style="text-align: right; font-family: monospace;">${Number(q.diskReads || 0).toLocaleString()}</td>
                  <td style="font-size: 10.5px;">${q.schema || '-'}${q.module ? ` <span style="color:#64748b; font-size:9.5px;">(${q.module})</span>` : ''}</td>
                  <td style="font-family: monospace; font-size: 10px; color: #64748b;">${q.planHash || '-'}</td>
                  <td style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(q.sqlText || '')}">
                    <code style="font-size: 10px; color: #334155;">${this.escapeHtml(q.sqlText || '')}</code>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 2: ADDM FINDINGS & ADDM TASKS -->
      <div style="background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div style="background: #f1f5f9; padding: 6px 10px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
          <div style="display: flex; gap: 4px; align-items: center;">
            <button class="btn ${this.addmSubtab === 'findings' ? 'btn-primary' : ''}" style="height: 22px; padding: 0 8px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.dbaTools.switchAddmSubtab('findings');">
              💡 Descobertas e Recomendações (${addmFindings.length})
            </button>
            <button class="btn ${this.addmSubtab === 'tasks' ? 'btn-primary' : ''}" style="height: 22px; padding: 0 8px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.dbaTools.switchAddmSubtab('tasks');">
              📋 Histórico de Tarefas ADDM (${addmTasks.length})
            </button>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn btn-primary" style="height: 22px; padding: 0 8px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesApp.dbaTools.generateAddmReport();">
              📄 Ver Diagnóstico ADDM Completo
            </button>
          </div>
        </div>

        <div style="padding: 10px; max-height: 280px; overflow-y: auto;">
          ${this.addmSubtab === 'tasks' ? `
            <table class="meta-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 2;">
                <tr>
                  <th style="min-width: 60px;">Task ID</th>
                  <th style="min-width: 220px;">Nome da Tarefa ADDM</th>
                  <th style="min-width: 130px;">Criado em</th>
                  <th style="min-width: 80px;">Status</th>
                  <th style="min-width: 80px;">Origem</th>
                  <th style="text-align: right; min-width: 190px;">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody>
                ${addmTasks.length === 0 ? `
                  <tr><td colspan="6" style="text-align: center; padding: 15px; color: #94a3b8;">Nenhuma tarefa ADDM encontrada no catálogo.</td></tr>
                ` : addmTasks.map(t => `
                  <tr>
                    <td style="font-family: monospace; color: #64748b;">#${t.taskId}</td>
                    <td><b style="color: #312e81; font-family: monospace;">${this.escapeHtml(t.taskName)}</b></td>
                    <td>${t.createdTime || '-'}</td>
                    <td><span style="background: #dcfce7; color: #15803d; padding: 1px 6px; border-radius: 4px; font-weight: 600; font-size: 9.5px;">${t.status}</span></td>
                    <td><span class="toad-conn-badge-indicator" style="background:#f1f5f9; color:#475569; font-size:9.5px;">${t.howCreated || 'AUTO'}</span></td>
                    <td style="text-align: right;">
                      <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        <button class="btn btn-primary" style="height: 20px; padding: 0 6px; font-size: 10px; font-weight: 600;" onclick="window.TracesApp.dbaTools.generateAddmReport({ taskName: '${t.taskName}' });" title="Visualizar este diagnóstico no app com abas HTML e Texto">
                          👁 Ver
                        </button>
                        <button class="btn" style="height: 20px; padding: 0 6px; font-size: 10px; color: #4338ca; border-color: #c7d2fe; background: #eef2ff;" onclick="window.TracesApp.dbaTools.generateAddmReport({ taskName: '${t.taskName}', directDownload: true, format: 'HTML' });" title="Download direto do HTML para sua máquina">
                          ⬇ HTML
                        </button>
                        <button class="btn" style="height: 20px; padding: 0 6px; font-size: 10px; color: #4338ca; border-color: #c7d2fe; background: #eef2ff;" onclick="window.TracesApp.dbaTools.generateAddmReport({ taskName: '${t.taskName}', directDownload: true, format: 'TEXT' });" title="Download direto do TXT para sua máquina">
                          ⬇ TXT
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <!-- Findings Cards -->
            ${addmFindings.length === 0 ? `
              <div style="text-align: center; padding: 15px; color: #64748b; font-size: 11px;">
                Nenhuma recomendação crítica registrada no histórico recente do ADDM. O banco de dados está operando dentro dos limiares normais.
              </div>
            ` : `
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(460px, 1fr)); gap: 8px;">
                ${addmFindings.map(f => {
                  const isProb = f.type === 'PROBLEM';
                  const hasSql = f.sqlId && f.sqlId !== 'None' && f.sqlId.length === 13;
                  return `
                    <div style="background: #ffffff; border: 1px solid ${isProb ? '#fca5a5' : '#cbd5e1'}; border-left: 4px solid ${isProb ? '#dc2626' : '#0284c7'}; border-radius: 4px; padding: 8px 10px; font-size: 11px;">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
                        <span style="font-weight: 700; color: #0f172a; font-size: 11.5px;">${this.escapeHtml(f.name)}</span>
                        <div style="display: flex; gap: 4px; align-items: center;">
                          ${f.impactSec > 0 ? `<span style="background: #fee2e2; color: #991b1b; padding: 1px 6px; border-radius: 3px; font-weight: 700; font-size: 9.5px;">Impacto: ${this.formatDuration(f.impactSec)}</span>` : ''}
                          <span style="background: #f1f5f9; color: #475569; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-family: monospace;">${f.taskName ? f.taskName.split('_').slice(-2).join('_') : ''}</span>
                        </div>
                      </div>
                      <div style="color: #334155; margin: 4px 0; line-height: 1.35;">${this.escapeHtml(f.message)}</div>
                      
                      ${hasSql ? `
                        <div style="display: flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px dashed #94a3b8; border-radius: 3px; padding: 4px 8px; margin: 5px 0;">
                          <span style="font-weight: 700; color: #1e293b;">🎯 SQL Alvo:</span>
                          <a href="javascript:void(0)" onclick="window.TracesApp.dbaTools.openSqlInspector('${f.sqlId}')" style="font-family: monospace; font-weight: 700; font-size: 11px; color: #0284c7; text-decoration: underline;">
                            🔍 ${f.sqlId}
                          </a>
                          <button class="btn btn-primary" style="height: 18px; padding: 0 6px; font-size: 9.5px; margin-left: auto;" onclick="window.TracesApp.dbaTools.openSqlInEditor('${f.sqlId}')">
                            📝 Abrir no Editor
                          </button>
                        </div>
                      ` : (f.sqlId && f.sqlId !== 'None' ? `
                        <div style="font-size: 10px; color: #64748b; margin: 2px 0;">Objeto / Segmento relacionado: <b>${this.escapeHtml(f.sqlId)}</b></div>
                      ` : '')}

                      ${f.recommendation ? `
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 3px; padding: 4px 8px; margin-top: 4px; color: #166534; font-size: 10.5px;">
                          <b>💡 Ação Recomendada:</b> ${this.escapeHtml(f.recommendation)}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          `}
        </div>
      </div>

      <!-- SECTION 3: SNAPSHOTS & ASH REAL-TIME STRIP -->
      <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 10px;">
        <!-- Left: AWR Snapshots History Table -->
        <div style="background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="background: #f1f5f9; padding: 6px 10px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 700; font-size: 12px; color: #1e293b;">📅 Histórico de Snapshots AWR (DBA_HIST_SNAPSHOT)</div>
            <span class="dba-filter-count-badge" id="dba-awr-count" style="font-size: 9.5px;">${snaps.length} snapshots</span>
          </div>

          <div class="dba-filter-bar" style="border-bottom: 1px solid #e2e8f0; margin: 0; padding: 4px 8px; border-radius: 0;">
            <div class="dba-filter-input-wrap">
              <span style="font-size: 11px; color: #64748b;">🔍</span>
              <input type="text" id="dba-filter-awr-text" placeholder="Filtrar por Snapshot ID ou data..." oninput="window.TracesApp.dbaTools.applyAwrFilter();" value="${this.filterState.awrText || ''}" style="font-size: 11px;">
            </div>
            <button class="btn" style="height: 20px; padding: 0 6px; font-size: 10px;" onclick="window.TracesApp.dbaTools.clearAwrFilter();">✕</button>
          </div>

          <div style="overflow-y: auto; max-height: 220px;">
            <table class="meta-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 1;">
                <tr>
                  <th>Snapshot ID</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th style="text-align: right;">Instância</th>
                  <th style="text-align: right; min-width: 175px;">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody id="dba-awr-table-body">${snapsHtml}</tbody>
            </table>
          </div>
        </div>

        <!-- Right: ASH Wait Events Strip -->
        <div style="background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="background: #f1f5f9; padding: 6px 10px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 700; font-size: 12px; color: #1e293b;">⏳ Atividade em Tempo Real ASH (V$ACTIVE_SESSION_HISTORY)</div>
            <span style="font-size: 9.5px; background: #dcfce7; color: #15803d; padding: 1px 6px; border-radius: 10px; font-weight: 600;">Ao Vivo</span>
          </div>

          <div style="overflow-y: auto; max-height: 250px;">
            <table class="meta-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 1;">
                <tr>
                  <th>Hora</th>
                  <th>Sessão</th>
                  <th>Evento de Espera</th>
                  <th>Classe</th>
                  <th>SQL ID</th>
                </tr>
              </thead>
              <tbody>
                ${ash.length === 0 ? `
                  <tr><td colspan="5" style="text-align: center; padding: 15px; color: #94a3b8;">Nenhuma atividade recente registrada em V$ACTIVE_SESSION_HISTORY.</td></tr>
                ` : ash.map(a => `
                  <tr>
                    <td style="font-family: monospace; font-size: 10.5px;">${a.sampleTime || '-'}</td>
                    <td><b>SID ${a.sessionId || '-'}</b></td>
                    <td style="color: ${a.event?.includes('CPU') ? '#166534' : '#991b1b'}; font-weight: ${a.event?.includes('CPU') ? '400' : '600'};">${this.escapeHtml(a.event || 'CPU')}</td>
                    <td><span class="toad-conn-badge-indicator" style="background:#f1f5f9; color:#475569; font-size:9.5px;">${this.escapeHtml(a.waitClass || 'CPU')}</span></td>
                    <td>
                      ${a.sqlId ? `
                        <a href="javascript:void(0)" onclick="window.TracesApp.dbaTools.openSqlInspector('${a.sqlId}')" style="font-family: monospace; font-weight: 700; color: #0284c7; text-decoration: underline;">
                          🔍 ${a.sqlId}
                        </a>
                      ` : '<span style="color:#94a3b8;">-</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }


  // Quick switch of AWR Top SQL Sort
  async changeAwrSort(metric) {
    this.currentAwrSort = metric;
    const activeConn = window.TracesApp?.getActiveConnection?.() || window.TracesApp?.realDatabaseConfig || window.TracesApp?.connectionManager?.getActive?.();
    let url = `/api/dba/awr?sort_by=${encodeURIComponent(metric)}`;
    if (activeConn?.id) {
      url += `&conn_id=${encodeURIComponent(activeConn.id)}`;
    }
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        this.cachedData['awr'] = data;
        const pane = document.getElementById('dba-pane-awr');
        if (pane) pane.innerHTML = this.renderAwr(data);
      }
    } catch (e) {
      console.error('Error changing AWR sort:', e);
    }
  }

  selectAwrSnapRow(snapId) {
    const endSelect = document.getElementById('dba-awr-snap-end');
    const startSelect = document.getElementById('dba-awr-snap-start');
    if (endSelect && startSelect) {
      startSelect.value = snapId;
    }
  }

  // SQL Inspector Modal - Comprehensive Details, Full SQL CLOB, Explain Plan & ASH
  async openSqlInspector(sqlId) {
    if (!sqlId) return;

    // Check if modal container already exists
    let modal = document.getElementById('dba-sql-inspector-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dba-sql-inspector-modal';
      modal.className = 'toad-modal-backdrop';
      modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);';
      document.body.appendChild(modal);
    }

    // Show initial loading state
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div style="background: #ffffff; width: 92vw; max-width: 1050px; height: 86vh; max-height: 820px; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); display: flex; flex-direction: column; overflow: hidden; font-family: var(--font-ui, sans-serif);">
        <div style="background: #1e293b; color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">🔍</span>
            <span style="font-weight: 700; font-size: 14px;">SQL Inspector - Carregando SQL_ID: <code style="color: #38bdf8;">${sqlId}</code>...</span>
          </div>
          <button class="btn" style="color: #fff; background: transparent; border: none; font-size: 16px; cursor: pointer;" onclick="document.getElementById('dba-sql-inspector-modal').style.display='none';">✕</button>
        </div>
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; color: #64748b;">
          <div class="toad-spinner" style="width: 32px; height: 32px; border: 3px solid #cbd5e1; border-top-color: #0284c7; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <span>Extraindo código CLOB completo, estatísticas de execução e plano de execução DBMS_XPLAN...</span>
        </div>
      </div>
    `;

    try {
      const activeConn = window.TracesApp?.getActiveConnection?.() || window.TracesApp?.realDatabaseConfig || window.TracesApp?.connectionManager?.getActive?.();
      let url = `/api/dba/sql-details?sql_id=${encodeURIComponent(sqlId)}`;
      if (activeConn?.id) {
        url += `&conn_id=${encodeURIComponent(activeConn.id)}`;
      }

      const resp = await fetch(url);
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Falha ao buscar detalhes do SQL');
      }
      const data = await resp.json();
      this.renderSqlInspectorContent(data);
    } catch (e) {
      modal.innerHTML = `
        <div style="background: #ffffff; width: 500px; padding: 20px; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center;">
          <div style="color: #dc2626; font-size: 32px; margin-bottom: 8px;">⚠️</div>
          <h3 style="margin: 0 0 8px 0; color: #0f172a;">Erro ao inspecionar SQL</h3>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 16px;">${this.escapeHtml(e.message)}</p>
          <button class="btn btn-primary" onclick="document.getElementById('dba-sql-inspector-modal').style.display='none';">Fechar</button>
        </div>
      `;
    }
  }

  // Render the loaded SQL Inspector Modal
  renderSqlInspectorContent(data) {
    const modal = document.getElementById('dba-sql-inspector-modal');
    if (!modal) return;

    const stats = data.stats || {};
    const fullText = data.sqlFullText || '-- Consulta não disponível no cursor cache';
    const planLines = data.planLines || [];
    const ash = data.ash || [];
    const planHistory = data.planHistory || [];

    // Store current inspected SQL in memory for easy copy/export
    this._currentInspectedSql = fullText;
    this._currentInspectedSqlId = data.sqlId;

    const formattedPlan = planLines.length > 0 
      ? planLines.join('\n') 
      : 'Plano de execução não encontrado no cursor cache (V$SQL_PLAN / DBA_HIST_SQL_PLAN).';

    modal.innerHTML = `
      <div style="background: #ffffff; width: 94vw; max-width: 1100px; height: 88vh; max-height: 840px; border-radius: 6px; box-shadow: 0 10px 35px rgba(0,0,0,0.35); display: flex; flex-direction: column; overflow: hidden; font-family: var(--font-ui, sans-serif);">
        
        <!-- Modal Header -->
        <div style="background: #0f172a; color: #fff; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 16px;">🔍</span>
            <span style="font-weight: 700; font-size: 14px;">SQL Inspector:</span>
            <code style="background: #1e293b; color: #38bdf8; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 13px;">${data.sqlId}</code>
            ${stats.schema ? `<span class="toad-conn-badge-indicator" style="background:#334155; color:#93c5fd; font-size:10px;">Schema: ${stats.schema}</span>` : ''}
            ${stats.module ? `<span class="toad-conn-badge-indicator" style="background:#334155; color:#cbd5e1; font-size:10px;">Módulo: ${stats.module}</span>` : ''}
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn btn-primary" style="height: 24px; padding: 0 10px; font-size: 11px; font-weight: 700; background: #15803d; border-color: #166534;" onclick="window.TracesApp.dbaTools.openCurrentSqlInEditor();">
              📝 Abrir no Editor SQL
            </button>
            <button class="btn" style="height: 24px; padding: 0 8px; font-size: 11px; background: #334155; color: #fff; border-color: #475569;" onclick="window.TracesApp.dbaTools.copyToClipboard(window.TracesApp.dbaTools._currentInspectedSql, 'Código SQL completo copiado!');">
              📋 Copiar SQL
            </button>
            <button class="btn" style="color: #fff; background: transparent; border: none; font-size: 18px; line-height: 1; cursor: pointer; padding: 0 6px;" onclick="document.getElementById('dba-sql-inspector-modal').style.display='none';">✕</button>
          </div>
        </div>

        <!-- KPI Execution Stats Banner -->
        <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 8px 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; font-size: 11px;">
          <div>
            <div style="color: #64748b; font-size: 9.5px; text-transform: uppercase;">Execuções</div>
            <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${Number(stats.executions || 0).toLocaleString()}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 9.5px; text-transform: uppercase;">Tempo Total</div>
            <div style="font-weight: 700; font-size: 13px; color: ${stats.elapsedSec > 60 ? '#dc2626' : '#0f172a'};">${this.formatDuration(stats.elapsedSec || 0)}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 9.5px; text-transform: uppercase;">Tempo Médio / Exec</div>
            <div style="font-weight: 700; font-size: 13px; color: #0284c7;">${Number(stats.elapsedPerExec || 0).toFixed(4)}s</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 9.5px; text-transform: uppercase;">CPU Total</div>
            <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${this.formatDuration(stats.cpuSec || 0)}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 9.5px; text-transform: uppercase;">Buffer Gets (Lógico)</div>
            <div style="font-weight: 700; font-size: 13px; font-family: monospace; color: #0f172a;">${Number(stats.bufferGets || 0).toLocaleString()}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 9.5px; text-transform: uppercase;">Disk Reads (Físico)</div>
            <div style="font-weight: 700; font-size: 13px; font-family: monospace; color: #0f172a;">${Number(stats.diskReads || 0).toLocaleString()}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 9.5px; text-transform: uppercase;">Linhas Processadas</div>
            <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${Number(stats.rowsProcessed || 0).toLocaleString()}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 9.5px; text-transform: uppercase;">Custo Otimizador</div>
            <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${stats.optimizerCost || 0}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 9.5px; text-transform: uppercase;">Plan Hash</div>
            <div style="font-weight: 700; font-size: 12px; font-family: monospace; color: #475569;">${stats.planHash || '-'}</div>
          </div>
        </div>

        <!-- Inspector Tabs Header -->
        <div style="background: #e2e8f0; display: flex; gap: 1px; padding-left: 12px; padding-top: 4px; border-bottom: 1px solid #cbd5e1;">
          <button id="dba-sql-tab-btn-code" class="dba-inspector-tab-btn active" onclick="window.TracesApp.dbaTools.switchSqlInspectorTab('code')" style="background: #fff; border: 1px solid #cbd5e1; border-bottom: none; border-radius: 4px 4px 0 0; padding: 6px 14px; font-size: 11.5px; font-weight: 700; cursor: pointer; color: #0284c7;">
            📜 Código SQL Completo (CLOB)
          </button>
          <button id="dba-sql-tab-btn-plan" class="dba-inspector-tab-btn" onclick="window.TracesApp.dbaTools.switchSqlInspectorTab('plan')" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-bottom: none; border-radius: 4px 4px 0 0; padding: 6px 14px; font-size: 11.5px; font-weight: 600; cursor: pointer; color: #475569;">
            🌲 Plano de Execução (DBMS_XPLAN)
          </button>
          <button id="dba-sql-tab-btn-ash" class="dba-inspector-tab-btn" onclick="window.TracesApp.dbaTools.switchSqlInspectorTab('ash')" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-bottom: none; border-radius: 4px 4px 0 0; padding: 6px 14px; font-size: 11.5px; font-weight: 600; cursor: pointer; color: #475569;">
            ⏳ Esperas ASH (${ash.length})
          </button>
          <button id="dba-sql-tab-btn-history" class="dba-inspector-tab-btn" onclick="window.TracesApp.dbaTools.switchSqlInspectorTab('history')" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-bottom: none; border-radius: 4px 4px 0 0; padding: 6px 14px; font-size: 11.5px; font-weight: 600; cursor: pointer; color: #475569;">
            📊 Variações de Planos (${planHistory.length})
          </button>
        </div>

        <!-- Tab 1: Full SQL CLOB Code -->
        <div id="dba-sql-pane-code" class="dba-inspector-pane" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #1e1e1e;">
          <div style="background: #252526; padding: 4px 12px; display: flex; justify-content: space-between; align-items: center; color: #cccccc; font-size: 11px; border-bottom: 1px solid #333333;">
            <span>Oracle SQL / PL/SQL Statement (Sem truncamento)</span>
            <span>Total: ${fullText.length} caracteres</span>
          </div>
          <pre style="flex: 1; margin: 0; padding: 12px 16px; overflow: auto; color: #d4d4d4; font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-all; user-select: text;"><code>${this.escapeHtml(fullText)}</code></pre>
        </div>

        <!-- Tab 2: Execution Plan (DBMS_XPLAN) -->
        <div id="dba-sql-pane-plan" class="dba-inspector-pane" style="flex: 1; display: none; flex-direction: column; overflow: hidden; background: #000000;">
          <div style="background: #18181b; padding: 5px 12px; display: flex; justify-content: space-between; align-items: center; color: #a1a1aa; font-size: 11px; border-bottom: 1px solid #27272a;">
            <span style="color: #facc15; font-family: 'Consolas', monospace; font-weight: 700;">DBMS_XPLAN.DISPLAY_CURSOR('${data.sqlId}', NULL, 'ALLSTATS LAST +COST +BYTES')</span>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span>${planLines.length} linhas</span>
              <button class="btn" style="height: 20px; padding: 0 6px; font-size: 9.5px; background: #27272a; color: #facc15; border: 1px solid #3f3f46;" onclick="navigator.clipboard.writeText(${JSON.stringify(formattedPlan)}); window.TracesApp.notify('DBMS_XPLAN copiado!', 'success');">📋 Copiar</button>
            </div>
          </div>
          <pre style="flex: 1; margin: 0; padding: 14px 18px; overflow: auto; color: #facc15; background: #000000; font-family: 'Consolas', 'Cascadia Code', 'Fira Code', 'Courier New', monospace; font-size: 12px; line-height: 1.5; letter-spacing: 0.3px; user-select: text; white-space: pre;">${this.escapeHtml(formattedPlan)}</pre>
        </div>

        <!-- Tab 3: ASH Wait Events -->
        <div id="dba-sql-pane-ash" class="dba-inspector-pane" style="flex: 1; display: none; overflow-y: auto; padding: 16px; background: #ffffff;">
          <div style="font-weight: 700; font-size: 12.5px; margin-bottom: 8px; color: #0f172a;">Perfil de Espera e Consumo de Tempo (Active Session History para SQL_ID ${data.sqlId})</div>
          ${ash.length === 0 ? `
            <div style="text-align: center; padding: 30px; color: #94a3b8;">Nenhum evento de espera registrado no histórico ASH para este SQL_ID.</div>
          ` : `
            <table class="meta-table" style="width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 16px;">
              <thead>
                <tr>
                  <th>Evento de Espera</th>
                  <th>Classe de Espera</th>
                  <th style="text-align: right;">Amostras</th>
                  <th style="min-width: 250px;">Percentual do Tempo (%)</th>
                </tr>
              </thead>
              <tbody>
                ${ash.map(a => `
                  <tr>
                    <td style="font-weight: 600; color: ${a.event?.includes('CPU') ? '#15803d' : '#991b1b'};">${this.escapeHtml(a.event)}</td>
                    <td><span class="toad-conn-badge-indicator" style="background:#f1f5f9; color:#475569;">${this.escapeHtml(a.waitClass)}</span></td>
                    <td style="text-align: right; font-weight: 700; font-family: monospace;">${Number(a.samples || 0).toLocaleString()}</td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; background: #e2e8f0; height: 14px; border-radius: 3px; overflow: hidden;">
                          <div style="width: ${Math.min(100, a.pct || 0)}%; background: ${a.event?.includes('CPU') ? '#22c55e' : (a.waitClass === 'Configuration' ? '#f59e0b' : '#ef4444')}; height: 100%;"></div>
                        </div>
                        <span style="font-weight: 700; font-family: monospace; min-width: 45px; text-align: right;">${Number(a.pct || 0).toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <!-- Tab 4: Plan Variations History -->
        <div id="dba-sql-pane-history" class="dba-inspector-pane" style="flex: 1; display: none; overflow-y: auto; padding: 16px; background: #ffffff;">
          <div style="font-weight: 700; font-size: 12.5px; margin-bottom: 8px; color: #0f172a;">Histórico de Planos de Execução (Identificação de Regressão de Plano)</div>
          ${planHistory.length === 0 ? `
            <div style="text-align: center; padding: 30px; color: #94a3b8;">Apenas 1 plano de execução ativo registrado para este SQL_ID.</div>
          ` : `
            <table class="meta-table" style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
              <thead>
                <tr>
                  <th>Plan Hash Value</th>
                  <th style="text-align: right;">Execuções Totais</th>
                  <th style="text-align: right;">Tempo Médio / Exec</th>
                  <th style="text-align: right;">CPU Média / Exec</th>
                  <th style="text-align: right;">Buffer Gets Totais</th>
                </tr>
              </thead>
              <tbody>
                ${planHistory.map(p => `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: #0284c7;">#${p.planHash || '-'}</td>
                    <td style="text-align: right; font-weight: 600;">${Number(p.executions || 0).toLocaleString()}</td>
                    <td style="text-align: right; font-weight: 700;">${Number(p.avgElapsedSec || 0).toFixed(4)}s</td>
                    <td style="text-align: right;">${Number(p.avgCpuSec || 0).toFixed(4)}s</td>
                    <td style="text-align: right; font-family: monospace;">${Number(p.bufferGets || 0).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <!-- Footer Bar -->
        <div style="background: #f1f5f9; border-top: 1px solid #cbd5e1; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center;">
          <div style="color: #64748b; font-size: 10.5px;">
            Primeira Carga: <b>${stats.firstLoad || '-'}</b> | Última Atividade: <b>${stats.lastActive || '-'}</b>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary" style="height: 26px; padding: 0 12px; font-weight: 700; background: #15803d; border-color: #166534;" onclick="window.TracesApp.dbaTools.openCurrentSqlInEditor();">
              📝 Abrir no SQL Editor
            </button>
            <button class="btn" style="height: 26px; padding: 0 12px;" onclick="document.getElementById('dba-sql-inspector-modal').style.display='none';">
              Fechar
            </button>
          </div>
        </div>

      </div>
    `;
  }

  // Switch tabs inside SQL Inspector Modal
  switchSqlInspectorTab(tabKey) {
    const panes = ['code', 'plan', 'ash', 'history'];
    panes.forEach(k => {
      const pane = document.getElementById(`dba-sql-pane-${k}`);
      const btn = document.getElementById(`dba-sql-tab-btn-${k}`);
      if (pane) pane.style.display = (k === tabKey) ? 'flex' : 'none';
      if (btn) {
        if (k === tabKey) {
          btn.style.background = '#ffffff';
          btn.style.color = '#0284c7';
          btn.style.fontWeight = '700';
        } else {
          btn.style.background = '#f1f5f9';
          btn.style.color = '#475569';
          btn.style.fontWeight = '600';
        }
      }
    });
  }

  // Open currently inspected SQL directly into the SQL Editor
  openCurrentSqlInEditor() {
    const sqlText = this._currentInspectedSql;
    const sqlId = this._currentInspectedSqlId || 'query';
    if (!sqlText) {
      window.TracesApp?.notify('Nenhum código SQL disponível para abrir.', 'warning');
      return;
    }
    const modal = document.getElementById('dba-sql-inspector-modal');
    if (modal) modal.style.display = 'none';

    if (window.TracesApp?.sqlEditor?.openQuery) {
      window.TracesApp.sqlEditor.openQuery(sqlText, `SQL_${sqlId}.sql`);
      window.TracesApp.notify(`Consulta SQL_ID ${sqlId} aberta no SQL Editor.`, 'success');
    } else {
      window.TracesApp?.openWindow?.('editor');
      setTimeout(() => {
        if (window.TracesApp?.sqlEditor?.textarea) {
          window.TracesApp.sqlEditor.textarea.value = sqlText;
          if (window.TracesApp.sqlEditor.updateHighlight) window.TracesApp.sqlEditor.updateHighlight();
        }
      }, 150);
    }
  }

  // Open specific SQL ID in Editor with 1 click from table or ADDM cards
  async openSqlInEditor(sqlId) {
    if (!sqlId) return;
    try {
      window.TracesApp?.notify(`Carregando SQL_ID ${sqlId}...`, 'info');
      const activeConn = window.TracesApp?.getActiveConnection?.() || window.TracesApp?.realDatabaseConfig || window.TracesApp?.connectionManager?.getActive?.();
      let url = `/api/dba/sql-details?sql_id=${encodeURIComponent(sqlId)}`;
      if (activeConn?.id) {
        url += `&conn_id=${encodeURIComponent(activeConn.id)}`;
      }

      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Falha ao obter código SQL');
      const data = await resp.json();
      const sqlText = data.sqlFullText || '';

      if (window.TracesApp?.sqlEditor?.openQuery) {
        window.TracesApp.sqlEditor.openQuery(sqlText, `SQL_${sqlId}.sql`);
        window.TracesApp.notify(`SQL_ID ${sqlId} aberto com sucesso no SQL Editor.`, 'success');
      } else {
        window.TracesApp?.openWindow?.('editor');
        setTimeout(() => {
          if (window.TracesApp?.sqlEditor?.textarea) {
            window.TracesApp.sqlEditor.textarea.value = sqlText;
            if (window.TracesApp.sqlEditor.updateHighlight) window.TracesApp.sqlEditor.updateHighlight();
          }
        }, 150);
      }
    } catch (e) {
      window.TracesApp?.notify(`Erro ao abrir SQL no Editor: ${e.message}`, 'error');
    }
  }

    // Download report file directly to the client's local operating machine
  downloadReportFile(content, fileName, isHtml = false) {
    if (!content) {
      window.TracesApp?.notify('Conteúdo vazio para download.', 'warning');
      return;
    }
    try {
      const mimeType = isHtml ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8';
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
      window.TracesApp?.notify(`Relatório baixado na sua máquina: ${fileName}`, 'success');
    } catch (e) {
      console.error('Download error:', e);
      window.TracesApp?.notify(`Erro ao realizar download: ${e.message}`, 'error');
    }
  }

  // Quick Action from Snapshots table: Generate AWR from this snap
  async quickGenerateAwr(snapId) {
    const snaps = this._latestAwrData?.snapshots || [];
    const idx = snaps.findIndex(s => s.snapId === snapId);
    const startSnap = snaps[idx + 1]?.snapId || snapId - 1 || 1;
    await this.generateAwrReport({
      beginSnapId: startSnap,
      endSnapId: snapId,
      view: true
    });
  }

  // Quick Action from Snapshots table: Generate ADDM from this snap
  async quickGenerateAddm(snapId) {
    const snaps = this._latestAwrData?.snapshots || [];
    const idx = snaps.findIndex(s => s.snapId === snapId);
    const startSnap = snaps[idx + 1]?.snapId || snapId - 1 || 1;
    await this.generateAddmReport({
      beginSnapId: startSnap,
      endSnapId: snapId,
      view: true
    });
  }

  // Quick Action from Snapshots table: Download AWR directly
  async quickDownloadAwr(snapId, format = 'HTML') {
    const snaps = this._latestAwrData?.snapshots || [];
    const idx = snaps.findIndex(s => s.snapId === snapId);
    const startSnap = snaps[idx + 1]?.snapId || snapId - 1 || 1;
    await this.generateAwrReport({
      beginSnapId: startSnap,
      endSnapId: snapId,
      directDownload: true,
      format: format
    });
  }

  // Switch between Findings and Tasks in ADDM Section
  switchAddmSubtab(tab) {
    this.addmSubtab = tab;
    const pane = document.getElementById('dba-pane-awr');
    if (pane && this._latestAwrData) {
      pane.innerHTML = this.renderAwr(this._latestAwrData);
    }
  }

  // Create Snapshot via DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT
  async createAwrSnapshot() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se para criar snapshot AWR.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    try {
      window.TracesApp?.notify('Criando Snapshot AWR...', 'info');
      const activeConn = window.TracesApp?.getActiveConnection?.() || window.TracesApp?.realDatabaseConfig || window.TracesApp?.connectionManager?.getActive?.();
      let url = '/api/dba/awr';
      if (activeConn?.id) {
        url += `?conn_id=${encodeURIComponent(activeConn.id)}`;
      }

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_snapshot' })
      });
      const res = await resp.json();
      window.TracesApp.notify(res.message || 'Snapshot AWR criado com sucesso.', 'success');
      await this.loadSubtabData('awr');
    } catch (e) {
      window.TracesApp.notify(`Erro ao criar snapshot: ${e.message}`, 'error');
    }
  }

  // Generate Official AWR Report (HTML & Text dual modes)
  async generateAwrReport(options = {}) {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se para gerar relatório AWR.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    const startVal = options.beginSnapId || parseInt(document.getElementById('dba-awr-snap-start')?.value || 1, 10);
    const endVal = options.endSnapId || parseInt(document.getElementById('dba-awr-snap-end')?.value || 2, 10);
    const beginSnapId = Math.min(startVal, endVal);
    const endSnapId = Math.max(startVal, endVal);

    const scopeVal = document.getElementById('dba-awr-scope')?.value || 'instance:1';
    const isGlobal = scopeVal === 'global';
    const instNum = isGlobal ? 1 : parseInt(scopeVal.replace('instance:', '') || '1', 10);

    const reqFormat = options.format || 'BOTH';

    window.TracesApp?.notify(`Gerando Relatório AWR (${isGlobal ? 'RAC Global' : 'Inst #' + instNum}) entre snapshots ${beginSnapId} e ${endSnapId}...`, 'info');

    try {
      const activeConn = window.TracesApp?.getActiveConnection?.() || window.TracesApp?.realDatabaseConfig || window.TracesApp?.connectionManager?.getActive?.();
      let url = '/api/dba/awr';
      if (activeConn?.id) {
        url += `?conn_id=${encodeURIComponent(activeConn.id)}`;
      }

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_awr_report',
          beginSnapId: beginSnapId,
          endSnapId: endSnapId,
          scope: isGlobal ? 'global' : 'instance',
          instanceNumber: instNum,
          format: reqFormat
        })
      });

      const res = await resp.json();
      if (!res.success) {
        throw new Error(res.error || 'Falha ao gerar relatório AWR');
      }

      const reportHtml = res.html || res.htmlReport || '';
      const reportText = res.text || res.reportText || '';
      const fileNameHtml = res.fileNameHtml || `awrrpt_${instNum}_${beginSnapId}_${endSnapId}.html`;
      const fileNameText = res.fileNameText || `awrrpt_${instNum}_${beginSnapId}_${endSnapId}.txt`;

      if (options.directDownload) {
        if (options.format === 'HTML') {
          this.downloadReportFile(reportHtml, fileNameHtml, true);
        } else {
          this.downloadReportFile(reportText, fileNameText, false);
        }
      } else {
        this.showReportViewerModal({
          title: 'Relatório Oficial de Desempenho AWR (Workload Repository)',
          reportType: 'AWR',
          taskOrSnap: `Snapshots #${beginSnapId} .. #${endSnapId} (${isGlobal ? 'RAC Global' : 'Instância #' + instNum})`,
          htmlContent: reportHtml,
          textContent: reportText,
          defaultFormat: options.format === 'TEXT' ? 'text' : 'html',
          fileNameHtml: fileNameHtml,
          fileNameText: fileNameText
        });
      }
    } catch (e) {
      window.TracesApp?.notify(`Erro ao gerar relatório AWR: ${e.message}`, 'error');
    }
  }

  // Generate / Run Official ADDM Report (On-demand & Historical)
  async generateAddmReport(options = {}) {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se para gerar diagnóstico ADDM.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    const taskName = options.taskName || null;
    let beginSnapId = options.beginSnapId;
    let endSnapId = options.endSnapId;

    if (!taskName && (!beginSnapId || !endSnapId)) {
      const startVal = parseInt(document.getElementById('dba-awr-snap-start')?.value || 1, 10);
      const endVal = parseInt(document.getElementById('dba-awr-snap-end')?.value || 2, 10);
      beginSnapId = Math.min(startVal, endVal);
      endSnapId = Math.max(startVal, endVal);
    }

    const msg = taskName 
      ? `Carregando diagnóstico oficial ADDM (${taskName})...`
      : `Executando Análise Diagnóstica ADDM (DBMS_ADDM.ANALYZE_DB) entre snapshots ${beginSnapId} e ${endSnapId}...`;
    window.TracesApp?.notify(msg, 'info');

    try {
      const activeConn = window.TracesApp?.getActiveConnection?.() || window.TracesApp?.realDatabaseConfig || window.TracesApp?.connectionManager?.getActive?.();
      let url = '/api/dba/awr';
      if (activeConn?.id) {
        url += `?conn_id=${encodeURIComponent(activeConn.id)}`;
      }

      const payload = {
        action: 'generate_addm_report'
      };
      if (taskName) {
        payload.taskName = taskName;
      } else {
        payload.beginSnapId = beginSnapId;
        payload.endSnapId = endSnapId;
      }

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const res = await resp.json();
      if (!res.success) {
        throw new Error(res.error || 'Falha ao gerar relatório ADDM');
      }

      const reportHtml = res.html || res.reportHtml || '';
      const reportText = res.text || res.reportText || '';
      const finalTaskName = res.taskName || taskName || 'ADDM_REPORT';
      const fileNameHtml = res.fileNameHtml || `addm_report_${finalTaskName}.html`;
      const fileNameText = res.fileNameText || `addm_report_${finalTaskName}.txt`;

      if (options.directDownload) {
        if (options.format === 'HTML') {
          this.downloadReportFile(reportHtml, fileNameHtml, true);
        } else {
          this.downloadReportFile(reportText, fileNameText, false);
        }
      } else {
        this.showReportViewerModal({
          title: 'Relatório Oficial Diagnóstico ADDM (DBMS_ADVISOR)',
          reportType: 'ADDM',
          taskOrSnap: `Tarefa: ${finalTaskName}${res.beginSnapId ? ` (Snaps #${res.beginSnapId} .. #${res.endSnapId})` : ''}`,
          htmlContent: reportHtml,
          textContent: reportText,
          defaultFormat: options.format === 'HTML' ? 'html' : 'text',
          fileNameHtml: fileNameHtml,
          fileNameText: fileNameText
        });
      }
    } catch (e) {
      window.TracesApp?.notify(`Erro ao gerar diagnóstico ADDM: ${e.message}`, 'error');
    }
  }

  // Unified In-App Dual-Mode Report Viewer Modal (HTML & Monospace TEXT)
  showReportViewerModal(config) {
    let modal = document.getElementById('toad-report-viewer-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'toad-report-viewer-modal';
      modal.className = 'toad-modal-backdrop';
      modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 99999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(3px); font-family: var(--font-ui, sans-serif);';
      document.body.appendChild(modal);
    }

    this._activeReportViewer = {
      ...config,
      currentTab: config.defaultFormat || 'html'
    };

    const isHtml = this._activeReportViewer.currentTab === 'html';

    modal.style.display = 'flex';
    modal.innerHTML = `
      <div style="background: #ffffff; width: 94vw; max-width: 1350px; height: 90vh; border-radius: 6px; box-shadow: 0 15px 45px rgba(0,0,0,0.45); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #475569;">
        <!-- Header -->
        <div style="background: #0f172a; color: #fff; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px;">${config.reportType === 'ADDM' ? '🧠' : '📊'}</span>
            <div>
              <div style="font-weight: 700; font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
                <span>${this.escapeHtml(config.title)}</span>
                <span style="font-size: 10px; background: #0369a1; color: #fff; padding: 1px 6px; border-radius: 4px; font-family: monospace;">${this.escapeHtml(config.taskOrSnap)}</span>
              </div>
            </div>
          </div>

          <!-- Dual Tab Switcher -->
          <div style="display: flex; gap: 4px; background: #1e293b; padding: 2px; border-radius: 5px; border: 1px solid #334155;">
            <button id="toad-rep-btn-html" class="btn btn-sm ${isHtml ? 'btn-primary' : ''}" style="height: 24px; padding: 0 12px; font-size: 11px; font-weight: 600;" onclick="window.TracesApp.dbaTools.switchReportViewTab('html');">
              🌐 Visualização HTML
            </button>
            <button id="toad-rep-btn-text" class="btn btn-sm ${!isHtml ? 'btn-primary' : ''}" style="height: 24px; padding: 0 12px; font-size: 11px; font-weight: 600;" onclick="window.TracesApp.dbaTools.switchReportViewTab('text');">
              📄 Visualização TEXTO
            </button>
          </div>

          <!-- Action Buttons in Viewer Header -->
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn btn-sm btn-primary" style="height: 24px; padding: 0 9px; font-size: 11px; font-weight: 600;" onclick="window.TracesApp.dbaTools.downloadCurrentReport('html');" title="Baixar arquivo .html na sua máquina">
              ⬇ Baixar HTML
            </button>
            <button class="btn btn-sm btn-primary" style="height: 24px; padding: 0 9px; font-size: 11px; font-weight: 600;" onclick="window.TracesApp.dbaTools.downloadCurrentReport('text');" title="Baixar arquivo .txt na sua máquina">
              ⬇ Baixar TEXTO
            </button>
            <button class="btn btn-sm" style="height: 24px; padding: 0 8px; font-size: 11px; color: #e2e8f0; background: #1e293b; border-color: #475569;" onclick="window.TracesApp.dbaTools.copyCurrentReport();" title="Copiar texto para área de transferência">
              📋 Copiar
            </button>
            <button class="btn btn-sm" style="color: #cbd5e1; background: transparent; border: none; font-size: 18px; cursor: pointer; padding: 0 4px;" onclick="window.TracesApp.dbaTools.closeReportViewer();" title="Fechar visualização">✕</button>
          </div>
        </div>

        <!-- Body: HTML Pane -->
        <div id="toad-rep-html-pane" style="flex: 1; display: ${isHtml ? 'block' : 'none'}; width: 100%; height: 100%; background: #ffffff; position: relative;">
          <iframe id="toad-rep-iframe" style="width: 100%; height: 100%; border: none; background: #ffffff;"></iframe>
        </div>

        <!-- Body: Text Pane -->
        <div id="toad-rep-text-pane" style="flex: 1; display: ${!isHtml ? 'flex' : 'none'}; flex-direction: column; width: 100%; height: 100%; background: #0f172a; overflow: hidden;">
          <div style="background: #1e293b; border-bottom: 1px solid #334155; padding: 4px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #94a3b8;">🔍 Filtrar texto:</span>
              <input type="text" id="toad-rep-text-filter" placeholder="Buscar no texto do relatório..." oninput="window.TracesApp.dbaTools.filterReportText();" style="height: 20px; font-size: 11px; width: 220px; background: #0f172a; color: #f8fafc; border: 1px solid #475569; border-radius: 3px; padding: 0 6px;">
            </div>
            <div style="color: #94a3b8; font-family: monospace; font-size: 10.5px;">
              Tamanho: <b>${((config.textContent?.length || 0) / 1024).toFixed(1)} KB</b> &bull; Linhas: <b>${(config.textContent || '').split('\n').length}</b>
            </div>
          </div>
          <pre id="toad-rep-pre" style="flex: 1; margin: 0; padding: 14px; overflow: auto; color: #f1f5f9; font-family: 'Consolas', 'Courier New', monospace; font-size: 11.5px; line-height: 1.45; white-space: pre-wrap; user-select: text; word-break: break-word;"></pre>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; border-top: 1px solid #cbd5e1; padding: 6px 14px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
          <div style="color: #64748b;">
            💡 O arquivo é salvo imediatamente na pasta <b>Downloads</b> do seu sistema operacional local.
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-sm" style="height: 24px; padding: 0 14px;" onclick="window.TracesApp.dbaTools.closeReportViewer();">Fechar</button>
          </div>
        </div>
      </div>
    `;

    // Populate contents
    this.renderReportViewerContents();
  }

  // Populate iframe and pre contents
  renderReportViewerContents() {
    const rep = this._activeReportViewer;
    if (!rep) return;

    // Load iframe
    const ifr = document.getElementById('toad-rep-iframe');
    if (ifr && rep.htmlContent) {
      try {
        ifr.contentDocument.open();
        ifr.contentDocument.write(rep.htmlContent);
        ifr.contentDocument.close();
      } catch (e) {
        console.warn('Iframe write error:', e);
      }
    }

    // Load pre
    const pre = document.getElementById('toad-rep-pre');
    if (pre && rep.textContent) {
      pre.textContent = rep.textContent;
    }
  }

  // Switch between HTML and TEXT tabs inside viewer
  switchReportViewTab(tab) {
    if (!this._activeReportViewer) return;
    this._activeReportViewer.currentTab = tab;

    const htmlPane = document.getElementById('toad-rep-html-pane');
    const textPane = document.getElementById('toad-rep-text-pane');
    const btnHtml = document.getElementById('toad-rep-btn-html');
    const btnText = document.getElementById('toad-rep-btn-text');

    if (tab === 'html') {
      if (htmlPane) htmlPane.style.display = 'block';
      if (textPane) textPane.style.display = 'none';
      if (btnHtml) btnHtml.classList.add('btn-primary');
      if (btnText) btnText.classList.remove('btn-primary');
    } else {
      if (htmlPane) htmlPane.style.display = 'none';
      if (textPane) textPane.style.display = 'flex';
      if (btnHtml) btnHtml.classList.remove('btn-primary');
      if (btnText) btnText.classList.add('btn-primary');
    }
  }

  // Download active report in requested format
  downloadCurrentReport(fmt) {
    const rep = this._activeReportViewer;
    if (!rep) return;

    if (fmt === 'html') {
      this.downloadReportFile(rep.htmlContent, rep.fileNameHtml || 'relatorio.html', true);
    } else {
      this.downloadReportFile(rep.textContent, rep.fileNameText || 'relatorio.txt', false);
    }
  }

  // Copy current active report text
  copyCurrentReport() {
    const rep = this._activeReportViewer;
    if (!rep) return;
    const content = rep.currentTab === 'html' ? rep.htmlContent : rep.textContent;
    this.copyToClipboard(content, 'Conteúdo do relatório copiado para a área de transferência!');
  }

  // Filter text inside the text pane
  filterReportText() {
    const filter = (document.getElementById('toad-rep-text-filter')?.value || '').toLowerCase();
    const pre = document.getElementById('toad-rep-pre');
    const orig = this._activeReportViewer?.textContent || '';
    if (!pre) return;

    if (!filter) {
      pre.textContent = orig;
      return;
    }

    const lines = orig.split('\n');
    const matched = lines.filter(l => l.toLowerCase().includes(filter));
    pre.textContent = `--- ${matched.length} linhas encontradas para busca "${filter}" ---\n\n` + matched.join('\n');
  }

  // Close viewer
  closeReportViewer() {
    const modal = document.getElementById('toad-report-viewer-modal');
    if (modal) modal.style.display = 'none';
  }

  // Format seconds to human friendly time
  formatDuration(seconds) {
    const s = Number(seconds || 0);
    if (s <= 0) return '0.00s';
    if (s < 0.01) return `${(s * 1000).toFixed(1)}ms`;
    if (s < 60) return `${s.toFixed(2)}s`;
    if (s < 3600) {
      const m = Math.floor(s / 60);
      const rem = (s % 60).toFixed(0);
      return `${m}m ${rem}s`;
    }
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  }

  // Safe HTML Escaping
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Clipboard copy helper
  copyToClipboard(text, successMsg = 'Copiado para a área de transferência!') {
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        window.TracesApp?.notify?.(successMsg, 'success');
      }).catch(() => {
        this.fallbackCopy(text, successMsg);
      });
    } else {
      this.fallbackCopy(text, successMsg);
    }
  }

  fallbackCopy(text, successMsg) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      window.TracesApp?.notify?.(successMsg, 'success');
    } catch (e) {
      console.warn('Copy failed:', e);
    }
    document.body.removeChild(el);
  }

  // =========================================================================
  // DBA HUB FILTER HANDLERS & REAL-TIME SEARCH ENGINES
  // =========================================================================
  applyParamFilter() {
    const text = (document.getElementById('dba-filter-param-text')?.value || '').trim().toLowerCase();
    const type = document.getElementById('dba-filter-param-type')?.value || 'all';
    this.filterState.paramText = text;
    this.filterState.paramType = type;

    const rows = document.querySelectorAll('#dba-param-table-body tr');
    let visible = 0;
    rows.forEach(tr => {
      const name = tr.getAttribute('data-name') || '';
      const desc = tr.getAttribute('data-desc') || '';
      const isDynamic = tr.getAttribute('data-dynamic') === 'true';
      const isDeferred = tr.getAttribute('data-deferred') === 'true';
      const isDefault = tr.getAttribute('data-default') === 'true';

      const matchText = !text || name.includes(text) || desc.includes(text);
      let matchType = true;
      if (type === 'dynamic') matchType = isDynamic;
      else if (type === 'deferred') matchType = isDeferred;
      else if (type === 'static') matchType = !isDynamic && !isDeferred;
      else if (type === 'modified') matchType = !isDefault;

      const show = matchText && matchType;
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const badge = document.getElementById('dba-param-count');
    if (badge) {
      badge.textContent = `Exibindo ${visible} de ${rows.length} parâmetros${(text || type !== 'all') ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearParamFilter() {
    const inp = document.getElementById('dba-filter-param-text');
    if (inp) inp.value = '';
    const sel = document.getElementById('dba-filter-param-type');
    if (sel) sel.value = 'all';
    this.applyParamFilter();
  }

  applyAlertFilter() {
    const text = (document.getElementById('dba-filter-alert-text')?.value || '').trim().toLowerCase();
    const sev = document.getElementById('dba-filter-alert-sev')?.value || 'all';
    this.filterState.alertText = text;
    this.filterState.alertSev = sev;

    const items = document.querySelectorAll('#dba-alert-container .dba-alert-entry');
    let visible = 0;
    items.forEach(el => {
      const entryText = el.getAttribute('data-text') || '';
      const entrySev = el.getAttribute('data-sev') || '';

      const matchText = !text || entryText.includes(text);
      let matchSev = true;
      if (sev === 'WARNING') matchSev = entrySev === 'WARNING';
      else if (sev === 'INFO') matchSev = entrySev === 'INFO';
      else if (sev === 'ERROR') matchSev = entrySev.includes('ERROR') || entryText.includes('ora-');

      const show = matchText && matchSev;
      el.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const badge = document.getElementById('dba-alert-count');
    if (badge) {
      badge.textContent = `Exibindo ${visible} de ${items.length} entradas${(text || sev !== 'all') ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearAlertFilter() {
    const inp = document.getElementById('dba-filter-alert-text');
    if (inp) inp.value = '';
    const sel = document.getElementById('dba-filter-alert-sev');
    if (sel) sel.value = 'all';
    this.applyAlertFilter();
  }

  applyMonitorFilter() {
    const text = (document.getElementById('dba-filter-monitor-text')?.value || '').trim().toLowerCase();
    this.filterState.monitorText = text;

    const rows = document.querySelectorAll('#dba-event-table-body tr');
    let visible = 0;
    rows.forEach(tr => {
      const eventName = tr.getAttribute('data-event') || '';
      const show = !text || eventName.includes(text);
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const badge = document.getElementById('dba-monitor-count');
    if (badge) {
      badge.textContent = `Exibindo ${visible} de ${rows.length} eventos${text ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearMonitorFilter() {
    const inp = document.getElementById('dba-filter-monitor-text');
    if (inp) inp.value = '';
    this.applyMonitorFilter();
  }

  applySpaceFilter() {
    const text = (document.getElementById('dba-filter-space-text')?.value || '').trim().toLowerCase();
    const usage = document.getElementById('dba-filter-space-usage')?.value || 'all';
    this.filterState.spaceText = text;
    this.filterState.spaceUsage = usage;

    const rows = document.querySelectorAll('#dba-space-table-body tr');
    let visible = 0;
    rows.forEach(tr => {
      const name = tr.getAttribute('data-name') || '';
      const pct = parseFloat(tr.getAttribute('data-pct') || '0');

      const matchText = !text || name.includes(text);
      let matchUsage = true;
      if (usage === '50') matchUsage = pct >= 50;
      else if (usage === '80') matchUsage = pct >= 80;
      else if (usage === '90') matchUsage = pct >= 90;

      const show = matchText && matchUsage;
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const badge = document.getElementById('dba-space-count');
    if (badge) {
      badge.textContent = `Exibindo ${visible} de ${rows.length} tablespaces${(text || usage !== 'all') ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearSpaceFilter() {
    const inp = document.getElementById('dba-filter-space-text');
    if (inp) inp.value = '';
    const sel = document.getElementById('dba-filter-space-usage');
    if (sel) sel.value = 'all';
    this.applySpaceFilter();
  }

  applySegmentFilter() {
    const text = (document.getElementById('dba-filter-segment-text')?.value || '').trim().toLowerCase();
    const type = document.getElementById('dba-filter-segment-type')?.value || 'all';
    this.filterState.segmentText = text;
    this.filterState.segmentType = type;

    const rows = document.querySelectorAll('#dba-segment-table-body tr');
    let visible = 0;
    rows.forEach(tr => {
      const owner = tr.getAttribute('data-owner') || '';
      const name = tr.getAttribute('data-name') || '';
      const segType = tr.getAttribute('data-type') || '';
      const recom = tr.getAttribute('data-recom') || '';

      const matchText = !text || name.includes(text) || owner.includes(text) || recom.includes(text);
      const matchType = type === 'all' || segType === type;

      const show = matchText && matchType;
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const badge = document.getElementById('dba-segment-count');
    if (badge) {
      badge.textContent = `Exibindo ${visible} de ${rows.length} segmentos${(text || type !== 'all') ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearSegmentFilter() {
    const inp = document.getElementById('dba-filter-segment-text');
    if (inp) inp.value = '';
    const sel = document.getElementById('dba-filter-segment-type');
    if (sel) sel.value = 'all';
    this.applySegmentFilter();
  }

  applyFlashbackFilter() {
    const text = (document.getElementById('dba-filter-flashback-text')?.value || '').trim().toLowerCase();
    const type = document.getElementById('dba-filter-flashback-type')?.value || 'all';
    this.filterState.flashbackText = text;
    this.filterState.flashbackType = type;

    const rows = document.querySelectorAll('#dba-flashback-table-body tr');
    let visible = 0;
    rows.forEach(tr => {
      const orig = tr.getAttribute('data-orig') || '';
      const obj = tr.getAttribute('data-obj') || '';
      const objType = tr.getAttribute('data-type') || '';

      const matchText = !text || orig.includes(text) || obj.includes(text);
      const matchType = type === 'all' || objType === type;

      const show = matchText && matchType;
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const badge = document.getElementById('dba-flashback-count');
    if (badge) {
      badge.textContent = `Exibindo ${visible} de ${rows.length} objetos${(text || type !== 'all') ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearFlashbackFilter() {
    const inp = document.getElementById('dba-filter-flashback-text');
    if (inp) inp.value = '';
    const sel = document.getElementById('dba-filter-flashback-type');
    if (sel) sel.value = 'all';
    this.applyFlashbackFilter();
  }

  applyLogMinerFilter() {
    const text = (document.getElementById('dba-filter-logminer-text')?.value || '').trim().toLowerCase();
    const op = document.getElementById('dba-filter-logminer-op')?.value || 'all';
    this.filterState.logminerText = text;
    this.filterState.logminerOp = op;

    const items = document.querySelectorAll('#dba-logminer-container .dba-logminer-item');
    let visible = 0;
    items.forEach(el => {
      const tbl = el.getAttribute('data-table') || '';
      const usr = el.getAttribute('data-user') || '';
      const scn = el.getAttribute('data-scn') || '';
      const entryOp = el.getAttribute('data-op') || '';
      const redo = el.getAttribute('data-redo') || '';
      const undo = el.getAttribute('data-undo') || '';

      const matchText = !text || tbl.includes(text) || usr.includes(text) || scn.includes(text) || redo.includes(text) || undo.includes(text);
      const matchOp = op === 'all' || entryOp === op;

      const show = matchText && matchOp;
      el.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const badge = document.getElementById('dba-logminer-count');
    if (badge) {
      badge.textContent = `Exibindo ${visible} de ${items.length} transações${(text || op !== 'all') ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearLogMinerFilter() {
    const inp = document.getElementById('dba-filter-logminer-text');
    if (inp) inp.value = '';
    const sel = document.getElementById('dba-filter-logminer-op');
    if (sel) sel.value = 'all';
    this.applyLogMinerFilter();
  }

  applyAsmFilter() {
    const text = (document.getElementById('dba-filter-asm-text')?.value || '').trim().toLowerCase();
    const state = document.getElementById('dba-filter-asm-state')?.value || 'all';
    this.filterState.asmText = text;
    this.filterState.asmState = state;

    const rows = document.querySelectorAll('#dba-asm-table-body tr');
    let visible = 0;
    rows.forEach(tr => {
      const name = tr.getAttribute('data-name') || '';
      const dgState = tr.getAttribute('data-state') || '';

      const matchText = !text || name.includes(text);
      const matchState = state === 'all' || dgState === state;

      const show = matchText && matchState;
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const badge = document.getElementById('dba-asm-count');
    if (badge) {
      badge.textContent = `Exibindo ${visible} de ${rows.length} diskgroups${(text || state !== 'all') ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearAsmFilter() {
    const inp = document.getElementById('dba-filter-asm-text');
    if (inp) inp.value = '';
    const sel = document.getElementById('dba-filter-asm-state');
    if (sel) sel.value = 'all';
    this.applyAsmFilter();
  }

  applyRacFilter() {
    const text = (document.getElementById('dba-filter-rac-text')?.value || '').trim().toLowerCase();
    this.filterState.racText = text;

    const instRows = document.querySelectorAll('#dba-rac-inst-body tr');
    let visibleInst = 0;
    instRows.forEach(tr => {
      const name = tr.getAttribute('data-name') || '';
      const host = tr.getAttribute('data-host') || '';
      const show = !text || name.includes(text) || host.includes(text);
      tr.style.display = show ? '' : 'none';
      if (show) visibleInst++;
    });

    const servRows = document.querySelectorAll('#dba-rac-serv-body tr');
    servRows.forEach(tr => {
      const srv = tr.getAttribute('data-srv') || '';
      const show = !text || srv.includes(text);
      tr.style.display = show ? '' : 'none';
    });

    const badge = document.getElementById('dba-rac-count');
    if (badge) {
      badge.textContent = `Exibindo ${visibleInst} de ${instRows.length} instâncias${text ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearRacFilter() {
    const inp = document.getElementById('dba-filter-rac-text');
    if (inp) inp.value = '';
    this.applyRacFilter();
  }

  applyAuditFilter() {
    const text = (document.getElementById('dba-filter-audit-text')?.value || '').trim().toLowerCase();
    const act = document.getElementById('dba-filter-audit-action')?.value || 'all';
    const status = document.getElementById('dba-filter-audit-status')?.value || 'all';
    this.filterState.auditText = text;
    this.filterState.auditAction = act;
    this.filterState.auditStatus = status;

    const rows = document.querySelectorAll('#dba-audit-table-body tr');
    let visible = 0;
    rows.forEach(tr => {
      const user = tr.getAttribute('data-user') || '';
      const obj = tr.getAttribute('data-obj') || '';
      const entryAct = tr.getAttribute('data-act') || '';
      const entryStatus = tr.getAttribute('data-status') || '';

      const matchText = !text || user.includes(text) || obj.includes(text);
      const matchAct = act === 'all' || entryAct === act;
      const matchStatus = status === 'all' || entryStatus === status;

      const show = matchText && matchAct && matchStatus;
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const badge = document.getElementById('dba-audit-count');
    if (badge) {
      badge.textContent = `Exibindo ${visible} de ${rows.length} registros${(text || act !== 'all' || status !== 'all') ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearAuditFilter() {
    const inp = document.getElementById('dba-filter-audit-text');
    if (inp) inp.value = '';
    const selA = document.getElementById('dba-filter-audit-action');
    if (selA) selA.value = 'all';
    const selS = document.getElementById('dba-filter-audit-status');
    if (selS) selS.value = 'all';
    this.applyAuditFilter();
  }

  applySchemaCompareFilter() {
    const text = (document.getElementById('dba-filter-schema-text')?.value || '').trim().toLowerCase();
    const type = document.getElementById('dba-filter-schema-type')?.value || 'all';
    this.filterState.schemaText = text;
    this.filterState.schemaType = type;

    const rows = document.querySelectorAll('#dba-schema-table-body tr');
    let visible = 0;
    rows.forEach(tr => {
      const obj = tr.getAttribute('data-obj') || '';
      const diffType = tr.getAttribute('data-type') || '';

      const matchText = !text || obj.includes(text) || diffType.toLowerCase().includes(text);
      const matchType = type === 'all' || diffType.includes(type);

      const show = matchText && matchType;
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const badge = document.getElementById('dba-schema-count');
    if (badge) {
      badge.textContent = `Exibindo ${visible} de ${rows.length} diferenças${(text || type !== 'all') ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearSchemaCompareFilter() {
    const inp = document.getElementById('dba-filter-schema-text');
    if (inp) inp.value = '';
    const sel = document.getElementById('dba-filter-schema-type');
    if (sel) sel.value = 'all';
    this.applySchemaCompareFilter();
  }

  applyDataCompareFilter() {
    const text = (document.getElementById('dba-filter-data-text')?.value || '').trim().toLowerCase();
    const status = document.getElementById('dba-filter-data-status')?.value || 'all';
    this.filterState.dataText = text;
    this.filterState.dataStatus = status;

    const rows = document.querySelectorAll('#dba-data-table-body tr');
    let visible = 0;
    rows.forEach(tr => {
      const pk = tr.getAttribute('data-pk') || '';
      const rowStatus = tr.getAttribute('data-status') || '';
      const val = tr.getAttribute('data-val') || '';

      const matchText = !text || pk.includes(text) || val.includes(text);
      const matchStatus = status === 'all' || rowStatus.includes(status);

      const show = matchText && matchStatus;
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const badge = document.getElementById('dba-data-count');
    if (badge) {
      badge.textContent = `Exibindo ${visible} de ${rows.length} linhas${(text || status !== 'all') ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearDataCompareFilter() {
    const inp = document.getElementById('dba-filter-data-text');
    if (inp) inp.value = '';
    const sel = document.getElementById('dba-filter-data-status');
    if (sel) sel.value = 'all';
    this.applyDataCompareFilter();
  }

  applyDbCompareFilter() {
    const text = (document.getElementById('dba-filter-dbcompare-text')?.value || '').trim().toLowerCase();
    const diff = document.getElementById('dba-filter-dbcompare-diff')?.value || 'all';
    this.filterState.dbcompareText = text;
    this.filterState.dbcompareDiff = diff;

    const rows = document.querySelectorAll('#dba-dbcompare-table-body tr');
    let visible = 0;
    rows.forEach(tr => {
      const name = tr.getAttribute('data-name') || '';
      const isDiff = tr.getAttribute('data-diff') === 'true';

      const matchText = !text || name.includes(text);
      let matchDiff = true;
      if (diff === 'diff') matchDiff = isDiff;
      else if (diff === 'match') matchDiff = !isDiff;

      const show = matchText && matchDiff;
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const badge = document.getElementById('dba-dbcompare-count');
    if (badge) {
      badge.textContent = `Exibindo ${visible} de ${rows.length} parâmetros${(text || diff !== 'all') ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearDbCompareFilter() {
    const inp = document.getElementById('dba-filter-dbcompare-text');
    if (inp) inp.value = '';
    const sel = document.getElementById('dba-filter-dbcompare-diff');
    if (sel) sel.value = 'all';
    this.applyDbCompareFilter();
  }

  applyAwrFilter() {
    const text = (document.getElementById('dba-filter-awr-text')?.value || '').trim().toLowerCase();
    this.filterState.awrText = text;

    const rows = document.querySelectorAll('#dba-awr-table-body tr');
    let visible = 0;
    rows.forEach(tr => {
      const snap = tr.getAttribute('data-snap') || '';
      const time = tr.getAttribute('data-time') || '';

      const show = !text || snap.includes(text) || time.includes(text);
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const badge = document.getElementById('dba-awr-count');
    if (badge) {
      badge.textContent = `Exibindo ${visible} de ${rows.length} snapshots${text ? ' (Filtro ativo)' : ''}`;
    }
  }

  clearAwrFilter() {
    const inp = document.getElementById('dba-filter-awr-text');
    if (inp) inp.value = '';
    this.applyAwrFilter();
  }

  // =========================================================================
  // 20. RMAN BACKUP & RECOVERY (VERIFICATIONS + INTERACTIVE RMAN> TERMINAL)
  // =========================================================================
  renderRman(data) {
    const d = data || this.cachedData['rman'] || {};
    const dbInfo = d.dbInfo || {};
    const fra = d.fraSummary || {};
    const jobs = d.jobs || [];
    const corruptions = d.corruptions || [];
    const recoverFiles = d.recoverFiles || [];
    const datafilesNeed = (d.datafilesNeedBackup || []).filter(f => f.needsBackup);

    const logMode = dbInfo.logMode || 'ARCHIVELOG';
    const isArch = logMode === 'ARCHIVELOG';
    const fbOn = dbInfo.flashbackOn || 'NO';
    const fraPct = Number(fra.pctUsed || 0);
    const fraColor = fraPct >= 85 ? '#dc2626' : fraPct >= 70 ? '#d97706' : '#16a34a';

    if (!this._rmanTerminalHistory) {
      this._rmanTerminalHistory = `Recovery Manager: Release ${dbInfo.version || '19.0.0.0.0'} - Interactive Terminal Ready\nConnected to target database: ${dbInfo.dbName || 'ORCL'} (${dbInfo.openMode || 'READ WRITE'})\nDigite qualquer comando RMAN (ex: SHOW ALL;, LIST BACKUP SUMMARY;, REPORT NEED BACKUP;, VALIDATE DATABASE;, HELP;) ou clique nos botões de verificação acima.\n\nRMAN> `;
    }

    const jobsRowsHtml = jobs.length === 0 ? `
      <tr><td colspan="9" style="text-align:center; padding:18px; color:#64748b;">Nenhum job de backup registrado em V$RMAN_BACKUP_JOB_DETAILS.</td></tr>
    ` : jobs.map(j => {
      const st = String(j.status || '').toUpperCase();
      const stColor = st.includes('COMPLETED') ? '#15803d' : st.includes('RUNNING') ? '#0284c7' : '#dc2626';
      const stBg = st.includes('COMPLETED') ? '#dcfce7' : st.includes('RUNNING') ? '#e0f2fe' : '#fee2e2';
      return `
        <tr>
          <td><b>#${j.sessionKey || '-'}</b></td>
          <td><span style="font-weight:700; color:#1e293b;">${j.inputType || 'DB FULL'}</span></td>
          <td><span style="background:${stBg}; color:${stColor}; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10px;">${st}</span></td>
          <td>${j.startTime || '-'}</td>
          <td>${j.endTime || '-'}</td>
          <td>${j.elapsedMin ?? 0} min</td>
          <td>${j.inputMb ?? 0} MB</td>
          <td><b>${j.outputMb ?? 0} MB</b> (${j.compressionRatio || 1}x)</td>
          <td>
            <button class="btn" style="padding:1px 6px; font-size:10px;" onclick="window.TracesApp.dbaTools.viewRmanJobLog(${j.sessionRecid || 0}, ${j.sessionStamp || 0});">📜 Ver Log</button>
          </td>
        </tr>
      `;
    }).join('');

    const verificationsHtml = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:8px; margin-bottom:10px;">
        <div class="toad-interactive-card" title="Clique para listar Archive Logs no Terminal RMAN (LIST ARCHIVELOG ALL;)" onclick="window.TracesApp.dbaTools.executeRmanCommand('LIST ARCHIVELOG ALL;')" style="background:#fff; border:1px solid #cbd5e1; border-left:4px solid ${isArch ? '#16a34a' : '#dc2626'}; padding:8px 10px; border-radius:4px;">
          <div style="font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase;">Archive Log &amp; Flashback (Clique)</div>
          <div style="font-size:14px; font-weight:800; color:${isArch ? '#15803d' : '#dc2626'}; margin-top:2px;">${logMode}</div>
          <div style="font-size:11px; color:#475569;">Flashback: <b>${fbOn}</b> | Force Logging: <b>${dbInfo.forceLogging || 'NO'}</b></div>
        </div>
        <div class="toad-interactive-card" title="Clique para inspecionar parâmetros da FRA ou executar CROSSCHECK BACKUP" onclick="window.TracesApp.smartInspect('db_recovery_file_dest_size', 'parameter')" style="background:#fff; border:1px solid #cbd5e1; border-left:4px solid ${fraColor}; padding:8px 10px; border-radius:4px;">
          <div style="font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase;">Fast Recovery Area (FRA — Clique)</div>
          <div style="font-size:14px; font-weight:800; color:${fraColor}; margin-top:2px;">${fraPct}% Usado (${fra.usedGb || 0} / ${fra.limitGb || 0} GB)</div>
          <div style="font-size:11px; color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${fra.name || ''}">Reclaimable: ${fra.reclaimableGb || 0} GB | Path: ${fra.name || 'N/A'}</div>
        </div>
        <div class="toad-interactive-card" title="Clique para validar integridade física/lógica dos Datafiles (VALIDATE DATABASE;)" onclick="window.TracesApp.dbaTools.executeRmanCommand('VALIDATE DATABASE;')" style="background:#fff; border:1px solid #cbd5e1; border-left:4px solid ${corruptions.length === 0 ? '#16a34a' : '#dc2626'}; padding:8px 10px; border-radius:4px;">
          <div style="font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase;">Integridade de Blocos (Clique)</div>
          <div style="font-size:14px; font-weight:800; color:${corruptions.length === 0 ? '#15803d' : '#dc2626'}; margin-top:2px;">${corruptions.length === 0 ? '✅ 0 Blocos Corrompidos' : `🚨 ${corruptions.length} Blocos Corrompidos`}</div>
          <div style="font-size:11px; color:#475569;">Arquivos p/ Recovery: <b>${recoverFiles.length}</b> (V$RECOVER_FILE)</div>
        </div>
        <div class="toad-interactive-card" title="Clique para verificar Datafiles pendentes de backup (REPORT NEED BACKUP;)" onclick="window.TracesApp.dbaTools.executeRmanCommand('REPORT NEED BACKUP;')" style="background:#fff; border:1px solid #cbd5e1; border-left:4px solid ${datafilesNeed.length === 0 ? '#16a34a' : '#d97706'}; padding:8px 10px; border-radius:4px;">
          <div style="font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase;">Cobertura de Backup 7d (Clique)</div>
          <div style="font-size:14px; font-weight:800; color:${datafilesNeed.length === 0 ? '#15803d' : '#d97706'}; margin-top:2px;">${datafilesNeed.length === 0 ? '✅ 100% Coberto' : `⚠️ ${datafilesNeed.length} Datafile(s) Sem Backup Recente`}</div>
          <div style="font-size:11px; color:#475569;">Total Datafiles Inspecionados: <b>${(d.datafilesNeedBackup || []).length}</b></div>
        </div>
      </div>
    `;

    return `
      <div style="display:flex; flex-direction:column; gap:8px; height:100%;">
        <!-- Top Header & Quick Verification Buttons -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <div>
            <span style="font-weight:700; font-size:13px;">🛡️ RMAN Recovery Manager — Verificações de Saúde &amp; Terminal Interativo</span>
          </div>
          <div style="display:flex; gap:5px; flex-wrap:wrap;">
            <button class="btn" style="height:24px; padding:0 8px; font-weight:600;" onclick="window.TracesApp.dbaTools.executeRmanCommand('SHOW ALL;');">⚙️ SHOW ALL</button>
            <button class="btn" style="height:24px; padding:0 8px; font-weight:600;" onclick="window.TracesApp.dbaTools.executeRmanCommand('REPORT SCHEMA;');">🗂 REPORT SCHEMA</button>
            <button class="btn" style="height:24px; padding:0 8px; font-weight:600; color:#b45309;" onclick="window.TracesApp.dbaTools.executeRmanCommand('REPORT NEED BACKUP;');">⚠️ REPORT NEED BACKUP</button>
            <button class="btn" style="height:24px; padding:0 8px; font-weight:600;" onclick="window.TracesApp.dbaTools.executeRmanCommand('REPORT OBSOLETE;');">🧹 REPORT OBSOLETE</button>
            <button class="btn" style="height:24px; padding:0 8px; font-weight:600; color:#0369a1;" onclick="window.TracesApp.dbaTools.executeRmanCommand('LIST BACKUP SUMMARY;');">📦 LIST BACKUP SUMMARY</button>
            <button class="btn" style="height:24px; padding:0 8px; font-weight:600;" onclick="window.TracesApp.dbaTools.executeRmanCommand('CROSSCHECK BACKUP;');">🔍 CROSSCHECK BACKUP</button>
            <button class="btn" style="height:24px; padding:0 8px; font-weight:600; color:#15803d;" onclick="window.TracesApp.dbaTools.executeRmanCommand('VALIDATE DATABASE;');">✅ VALIDATE DATABASE</button>
            <button class="btn" style="height:24px; padding:0 8px; font-weight:600;" onclick="window.TracesApp.dbaTools.executeRmanCommand('LIST ARCHIVELOG ALL;');">📜 LIST ARCHIVELOG</button>
            <button class="btn" style="height:24px; padding:0 8px; font-weight:600;" onclick="window.TracesApp.dbaTools.executeRmanCommand('LIST FAILURE;');">🩺 LIST FAILURE (DRA)</button>
          </div>
        </div>

        ${verificationsHtml}

        <!-- Resizable Upper Table: Recent RMAN Jobs -->
        <div style="height:175px; min-height:95px; overflow-y:auto; background:#fff; border:1px solid #cbd5e1; resize:vertical;">
          <table class="meta-table" style="width:100%;">
            <thead>
              <tr>
                <th>Session Key</th>
                <th>Tipo de Backup</th>
                <th>Status</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Duração</th>
                <th>Input Size</th>
                <th>Output Size (Ratio)</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>${jobsRowsHtml}</tbody>
          </table>
        </div>

        <!-- Interactive RMAN> Terminal Console -->
        <div style="display:flex; flex-direction:column; flex:1; min-height:220px; background:#0c111d; border:1px solid #1e293b; border-radius:4px; overflow:hidden;">
          <div style="background:#1e293b; color:#e2e8f0; padding:5px 10px; display:flex; justify-content:space-between; align-items:center; font-size:11px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color:#4ade80; font-weight:800;">● RMAN&gt; Interactive Shell</span>
              <span style="color:#94a3b8;">Conectado ao catálogo/controlfile da instância ativa (${dbInfo.dbName || 'ORCL'})</span>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn" style="height:20px; padding:0 8px; font-size:10px; background:#334155; color:#fff; border:1px solid #475569;" onclick="window.TracesApp.dbaTools.executeRmanCommand('HELP;');">❓ Help</button>
              <button class="btn" style="height:20px; padding:0 8px; font-size:10px; background:#334155; color:#fff; border:1px solid #475569;" onclick="window.TracesApp.dbaTools.copyToClipboard(document.getElementById('rman-terminal-output')?.textContent || '', 'Saída do RMAN copiada!');">📋 Copiar Saída</button>
              <button class="btn" style="height:20px; padding:0 8px; font-size:10px; background:#7f1d1d; color:#fff; border:1px solid #991b1b;" onclick="window.TracesApp.dbaTools.clearRmanTerminal();">🗑 Clear Terminal</button>
            </div>
          </div>
          <pre id="rman-terminal-output" style="flex:1; margin:0; padding:10px 12px; overflow-y:auto; font-family:var(--toad-font-code, 'Consolas', monospace); font-size:12px; line-height:1.45; color:#a7f3d0; white-space:pre-wrap;">${this.escapeHtml(this._rmanTerminalHistory)}</pre>
          <div style="display:flex; align-items:center; background:#111827; border-top:1px solid #334155; padding:6px 10px; gap:8px;">
            <span style="font-family:var(--toad-font-code, monospace); font-weight:800; color:#38bdf8; font-size:12px;">RMAN&gt;</span>
            <input type="text" id="rman-terminal-input" placeholder="Digite um comando RMAN (ex: SHOW ALL; REPORT NEED BACKUP; LIST BACKUP SUMMARY; VALIDATE DATABASE; SQL 'ALTER SYSTEM ARCHIVE LOG CURRENT';) e pressione Enter..." style="flex:1; background:#030712; color:#f8fafc; border:1px solid #334155; border-radius:3px; height:28px; padding:0 10px; font-family:var(--toad-font-code, monospace); font-size:12px;" onkeydown="if(event.key==='Enter'){ event.preventDefault(); window.TracesApp.dbaTools.executeRmanCommand(); }">
            <button class="btn btn-primary" style="height:28px; padding:0 14px; font-weight:700;" onclick="window.TracesApp.dbaTools.executeRmanCommand();">▶ Executar</button>
          </div>
        </div>
      </div>
    `;
  }

  async executeRmanCommand(cmdOverride) {
    const inp = document.getElementById('rman-terminal-input');
    const outEl = document.getElementById('rman-terminal-output');
    const cmd = (cmdOverride !== undefined ? cmdOverride : (inp?.value || '')).trim();
    if (!cmd) return;
    if (inp && cmdOverride === undefined) inp.value = '';

    if (cmd.toUpperCase().replace(/;$/, '') === 'CLEAR' || cmd.toUpperCase().replace(/;$/, '') === 'CLS') {
      this.clearRmanTerminal();
      return;
    }

    if (outEl) {
      outEl.textContent += `${cmd}\n⏳ Executando no RMAN Target...\n`;
      outEl.scrollTop = outEl.scrollHeight;
    }

    try {
      const activeConn = window.TracesApp?.getActiveConnection?.();
      const resp = await fetch('/api/dba/rman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'command', command: cmd, conn_id: activeConn?.id })
      });
      const data = await resp.json();
      const block = `\n${data.output || data.error || 'Comando finalizado.'}\n\nRMAN> `;
      this._rmanTerminalHistory = (this._rmanTerminalHistory || '') + `${cmd}\n` + block;
      if (outEl) {
        outEl.textContent = this._rmanTerminalHistory;
        outEl.scrollTop = outEl.scrollHeight;
      }
    } catch (e) {
      const errBlock = `\nRMAN-03002: erro de comunicação: ${e.message}\n\nRMAN> `;
      this._rmanTerminalHistory = (this._rmanTerminalHistory || '') + errBlock;
      if (outEl) {
        outEl.textContent = this._rmanTerminalHistory;
        outEl.scrollTop = outEl.scrollHeight;
      }
    }
  }

  async viewRmanJobLog(sessionRecid, sessionStamp) {
    return this.executeRmanCommand(`SHOW JOB LOG ${sessionRecid}`);
  }

  clearRmanTerminal() {
    this._rmanTerminalHistory = 'RMAN> ';
    const outEl = document.getElementById('rman-terminal-output');
    if (outEl) outEl.textContent = this._rmanTerminalHistory;
  }
}

window.DbaTools = DbaTools;
