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

    const isConn = window.TracesApp && window.TracesApp.isConnected();
    const connConfig = window.TracesApp?.realDatabaseConfig;
    const dbTarget = connConfig ? `${connConfig.user}@${connConfig.host}:${connConfig.port}/${connConfig.serviceName}` : 'Desconectado';

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
              <optgroup label="Flashback &amp; LogMiner">
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
              <div class="dba-nav-group-title">⏪ Flashback &amp; Recovery</div>
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

          <!-- Right Content Pane -->
          <div class="dba-main-content">
            ${!isConn ? `
              <div class="dba-content-pane active" id="dba-pane-${this.currentSubtab}">
                ${this.renderDisconnectedWatermark(this.getSubtabTitle(this.currentSubtab))}
              </div>
            ` : `
              <div class="dba-content-pane active" id="dba-pane-browser">${this.renderDatabaseBrowser()}</div>
              <div class="dba-content-pane" id="dba-pane-dbmonitor">${this.renderDbMonitor()}</div>
              <div class="dba-content-pane" id="dba-pane-unixmonitor">${this.renderUnixMonitor()}</div>
              <div class="dba-content-pane" id="dba-pane-tablespacemap">${this.renderTablespaceMap()}</div>
              <div class="dba-content-pane" id="dba-pane-spacemanager">${this.renderSpaceManager()}</div>
              <div class="dba-content-pane" id="dba-pane-segmentadvisor">${this.renderSegmentAdvisor()}</div>
              <div class="dba-content-pane" id="dba-pane-undoadvisor">${this.renderUndoAdvisor()}</div>
              <div class="dba-content-pane" id="dba-pane-flashback">${this.renderFlashback()}</div>
              <div class="dba-content-pane" id="dba-pane-logminer">${this.renderLogMiner()}</div>
              <div class="dba-content-pane" id="dba-pane-dataguard">${this.renderDataGuard()}</div>
              <div class="dba-content-pane" id="dba-pane-asm">${this.renderAsm()}</div>
              <div class="dba-content-pane" id="dba-pane-rac">${this.renderRac()}</div>
              <div class="dba-content-pane" id="dba-pane-exadata">${this.renderExadata()}</div>
              <div class="dba-content-pane" id="dba-pane-audit">${this.renderAudit()}</div>
              <div class="dba-content-pane" id="dba-pane-wallet">${this.renderWallet()}</div>
              <div class="dba-content-pane" id="dba-pane-schemacompare">${this.renderSchemaCompare()}</div>
              <div class="dba-content-pane" id="dba-pane-datacompare">${this.renderDataCompare()}</div>
              <div class="dba-content-pane" id="dba-pane-dbcompare">${this.renderDbCompare()}</div>
              <div class="dba-content-pane" id="dba-pane-awr">${this.renderAwr()}</div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  async switchSubtab(subKey) {
    this.currentSubtab = subKey;

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

    if (!window.TracesApp || !window.TracesApp.isConnected()) {
      const mainContent = this.container.querySelector('.dba-main-content');
      if (mainContent) {
        mainContent.innerHTML = `
          <div class="dba-content-pane active" id="dba-pane-${subKey}">
            ${this.renderDisconnectedWatermark(this.getSubtabTitle(subKey))}
          </div>
        `;
      }
      return;
    }

    // Switch pane
    document.querySelectorAll('.dba-content-pane').forEach(p => {
      p.classList.toggle('active', p.id === `dba-pane-${subKey}`);
    });

    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      await this.loadSubtabData(subKey);

      // Start periodic poll for DB Monitor
      if (subKey === 'dbmonitor') {
        this.monitorInterval = setInterval(() => {
          if (this.currentSubtab === 'dbmonitor') this.loadSubtabData('dbmonitor', true);
        }, 3000);
      }
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
      const apiUrl = urlMap[subKey] || `/api/dba/${subKey}`;
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
    if (!window.TracesApp?.isConnected()) {
      return this.renderDisconnectedWatermark('Database Browser & SPFILE Editor');
    }

    const list = this.realParameters || (window.TRACES_DB ? window.TRACES_DB.parameters : []);
    const paramsHtml = list.map(p => `
      <tr data-name="${(p.name || '').toLowerCase()}" data-desc="${(p.description || '').toLowerCase()}" data-dynamic="${p.isDynamic ? 'true' : 'false'}" data-default="${p.isDefault !== false ? 'true' : 'false'}">
        <td><b>${p.name}</b></td>
        <td style="font-family: var(--toad-font-code); font-weight: 700; color: #0078d7;">${p.value}</td>
        <td>${p.isDynamic ? '<span style="color:#008000; font-weight:600;">YES (In-Memory)</span>' : '<span style="color:#c00000; font-weight:600;">NO (SPFILE Restart)</span>'}</td>
        <td style="color: #666; font-size: 11px;">${p.description || '-'}</td>
        <td>
          <button class="btn" style="padding: 1px 6px;" onclick="window.TracesApp.dbaTools.editParameter('${p.name}', '${p.value}');">Alter</button>
        </td>
      </tr>
    `).join('');

    const alertList = window.TRACES_DB ? window.TRACES_DB.alertLog : [];
    const alertHtml = alertList.map(a => `
      <div class="dba-alert-entry" data-text="${(a.message || '').toLowerCase()} ${(a.timestamp || '').toLowerCase()}" data-sev="${a.severity || 'INFO'}" style="font-family: var(--toad-font-code); font-size: 11px; padding: 3px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="color: #666;">[${a.timestamp}]</span>
        <span style="font-weight: 700; color: ${a.severity === 'WARNING' ? '#c00000' : '#0078d7'};">[${a.severity}]</span>
        <span>${a.message}</span>
      </div>
    `).join('');

    const connConfig = window.TracesApp?.realDatabaseConfig;
    const dbTarget = connConfig ? `${connConfig.user}@${connConfig.host}:${connConfig.port}/${connConfig.serviceName}` : 'Desconectado';

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
          <input type="text" id="dba-filter-param-text" placeholder="Filtrar parâmetro por nome ou descrição..." oninput="window.TracesApp.dbaTools.applyParamFilter();" value="${this.filterState.paramText || ''}">
        </div>
        <select class="toad-conn-combobox" id="dba-filter-param-type" style="height: 24px; min-width: 175px;" onchange="window.TracesApp.dbaTools.applyParamFilter();">
          <option value="all" ${this.filterState.paramType === 'all' ? 'selected' : ''}>Todos os Parâmetros</option>
          <option value="dynamic" ${this.filterState.paramType === 'dynamic' ? 'selected' : ''}>Modificável em Memória (Dynamic)</option>
          <option value="static" ${this.filterState.paramType === 'static' ? 'selected' : ''}>Requer Reinicialização (Static)</option>
          <option value="modified" ${this.filterState.paramType === 'modified' ? 'selected' : ''}>Modificados (Não padrão)</option>
        </select>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearParamFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-param-count">Exibindo ${list.length} de ${list.length} parâmetros</span>
      </div>

      <div style="height: 260px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Parameter Name</th><th>Current Value</th><th>Dynamic?</th><th>Description</th><th>Action</th></tr></thead>
          <tbody id="dba-param-table-body">${paramsHtml}</tbody>
        </table>
      </div>

      <!-- Alert Log Header & Filter Strip -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; margin-bottom: 4px;">
        <span style="font-weight: 700; font-size: 12px;">Database Alert Log (alert_${connConfig?.serviceName || 'ORCL'}.log)</span>
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

      <div id="dba-alert-container" style="height: 120px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf; padding: 6px;">
        ${alertHtml}
      </div>
    `;
  }

  async editParameter(paramName, currentVal) {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se para alterar parâmetros.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    const newVal = prompt(`Alter Oracle System Parameter (${paramName}):\nALTER SYSTEM SET ${paramName} = <new_val> SCOPE=BOTH;`, currentVal);
    if (!newVal) return;

    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const sql = `ALTER SYSTEM SET ${paramName} = '${newVal}' SCOPE=BOTH;`;
        const resp = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro ao alterar parâmetro: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`ALTER SYSTEM SET ${paramName}='${newVal}' SCOPE=BOTH executado com sucesso no Oracle.`, 'success');
          await this.loadSubtabData('browser');
        }
      } catch (e) {
        window.TracesApp.notify(`Erro: ${e.message}`, 'error');
      }
      return;
    }

    const p = (window.TRACES_DB ? window.TRACES_DB.parameters : []).find(item => item.name === paramName);
    if (p) p.value = newVal;
    this.switchSubtab('browser');
    window.TracesApp.notify(`ALTER SYSTEM SET ${paramName}='${newVal}' SCOPE=BOTH executado (Modo Local).`, 'success');
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

  // 5. Space Manager & Capacity Growth Forecast
  renderSpaceManager(data) {
    const list = data?.tablespaces || [
      { name: 'SYSTEM', totalMb: 1200, usedMb: 1140, freeMb: 60, usedPct: 95.0, dailyGrowthMb: 0.8, daysUntilFull: 75 },
      { name: 'SYSAUX', totalMb: 2400, usedMb: 2180, freeMb: 220, usedPct: 90.8, dailyGrowthMb: 3.2, daysUntilFull: 68 },
      { name: 'UNDOTBS1', totalMb: 4096, usedMb: 1240, freeMb: 2856, usedPct: 30.2, dailyGrowthMb: 0.0, daysUntilFull: 999 },
      { name: 'USERS', totalMb: 8192, usedMb: 4452, freeMb: 3740, usedPct: 54.3, dailyGrowthMb: 12.5, daysUntilFull: 299 },
      { name: 'TEMP', totalMb: 4096, usedMb: 512, freeMb: 3584, usedPct: 12.5, dailyGrowthMb: 0.0, daysUntilFull: 999 }
    ];

    const rows = list.map(t => `
      <tr data-name="${(t.name || '').toLowerCase()}" data-pct="${t.usedPct}">
        <td><b>${t.name}</b></td>
        <td style="text-align: right;">${t.totalMb} MB</td>
        <td style="text-align: right;">${t.usedMb} MB</td>
        <td style="text-align: right;">${t.freeMb} MB</td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="flex:1; background:#e0e0e0; height:8px; border-radius:4px; overflow:hidden;">
              <div style="width:${Math.min(t.usedPct, 100)}%; background:${t.usedPct > 85 ? '#ef4444' : '#3b82f6'}; height:100%;"></div>
            </div>
            <span style="font-weight:700; font-size:11px; width:38px;">${t.usedPct}%</span>
          </div>
        </td>
        <td style="text-align: right; color:#666;">+${t.dailyGrowthMb} MB/dia</td>
        <td style="text-align: right; font-weight:700; color:${t.daysUntilFull < 60 ? '#c00000' : '#008000'};">
          ${t.daysUntilFull > 365 ? '> 1 ano' : `${t.daysUntilFull} dias`}
        </td>
      </tr>
    `).join('');

    setTimeout(() => this.applySpaceFilter(), 0);

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 13px;">Space Manager &amp; Capacity Growth Forecast (DBA_TABLESPACE_USAGE_METRICS)</span>
        <button class="btn" onclick="window.TracesApp.dbaTools.switchSubtab('spacemanager');">🔄 Atualizar Métricas</button>
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
          <thead><tr><th>Tablespace</th><th style="text-align: right;">Total</th><th style="text-align: right;">Used</th><th style="text-align: right;">Free</th><th style="width:180px;">Usage %</th><th style="text-align: right;">Daily Growth</th><th style="text-align: right;">Forecast (Days Full)</th></tr></thead>
          <tbody id="dba-space-table-body">${rows}</tbody>
        </table>
      </div>
    `;
  }

  // 6. Segment Advisor
  renderSegmentAdvisor(data) {
    const list = data?.segments || [
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

    return `
      <div style="font-weight: 700; font-size: 13px;">Oracle Undo Advisor (V$UNDOSTAT &amp; ORA-01555 Sizing)</div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 8px 0;">
        <div style="background: #f7f7f7; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">
          <div style="font-size: 10px; color: #666;">UNDO RETENTION</div>
          <div style="font-size: 18px; font-weight: 700; color: #0078d7;">${u.undoRetention.toLocaleString()} sec</div>
          <div style="font-size: 9.5px; color: #555;">(${Math.round(u.undoRetention / 60)} Minutes Guaranteed)</div>
        </div>
        <div style="background: #f7f7f7; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">
          <div style="font-size: 10px; color: #666;">UNDO BLOCK RATE</div>
          <div style="font-size: 18px; font-weight: 700; color: #008000;">${u.undoBlockRate} blocks/s</div>
          <div style="font-size: 9.5px; color: #555;">Peak Workload: ${Math.round(u.undoBlockRate * 1.5)} blk/s</div>
        </div>
        <div style="background: #f7f7f7; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">
          <div style="font-size: 10px; color: #666;">RECOMMENDED UNDOTBS SIZE</div>
          <div style="font-size: 18px; font-weight: 700; color: #0078d7;">${u.recommendedMb} MB</div>
          <div style="font-size: 9.5px; color: #008000;">Current ${u.currentMb} MB is ${u.safeStatus}</div>
        </div>
      </div>
      <div style="font-size: 11px; background: #fff; border: 1px solid #ccc; padding: 8px;">
        <b>V$UNDOSTAT Recent Samples:</b><br>
        ${(u.samples || []).join('<br>')}
      </div>
    `;
  }

  // 8. Flashback Recycle Bin
  renderFlashback(data) {
    const list = data?.recycleBin || (window.TRACES_DB ? window.TRACES_DB.recycleBin : []);
    const listHtml = list.map(r => `
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

  // 19. AWR / ASH
  renderAwr(data) {
    const snaps = data?.snapshots || [
      { snapId: 14829, beginTime: '2026-10-18 18:00:00', endTime: '2026-10-18 19:00:00' },
      { snapId: 14828, beginTime: '2026-10-18 17:00:00', endTime: '2026-10-18 18:00:00' }
    ];

    const snapsHtml = snaps.map(s => `
      <tr data-snap="${s.snapId}" data-time="${((s.beginTime || '') + ' ' + (s.endTime || '')).toLowerCase()}">
        <td><b>${s.snapId}</b></td>
        <td>${s.beginTime}</td>
        <td>${s.endTime}</td>
      </tr>
    `).join('');

    setTimeout(() => this.applyAwrFilter(), 0);

    return `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 13px;">AWR / ADDM / Active Session History (ASH) Browser</span>
        <div style="display: flex; gap: 6px;">
          <button class="btn" onclick="window.TracesApp.dbaTools.createAwrSnapshot();">📸 Create Snapshot</button>
          <button class="btn btn-primary" onclick="window.TracesApp.dbaTools.generateAwrReport();">Generate AWR HTML Report</button>
        </div>
      </div>
      <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 6px 10px; font-size: 10.5px; color: #166534; border-radius: 3px; margin: 6px 0;">
        ⚡ <b>Oracle AWR &amp; Active Session History (ASH):</b> Direct system view integration active. Unrestricted access enabled.
      </div>

      <div class="dba-filter-bar">
        <div class="dba-filter-input-wrap">
          <span style="font-size: 12px; color: #64748b;">🔍</span>
          <input type="text" id="dba-filter-awr-text" placeholder="Filtrar snapshot por ID ou data/hora..." oninput="window.TracesApp.dbaTools.applyAwrFilter();" value="${this.filterState.awrText || ''}">
        </div>
        <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.clearAwrFilter();" title="Limpar Filtro">✕ Limpar</button>
        <span class="dba-filter-count-badge" id="dba-awr-count">Exibindo ${snaps.length} de ${snaps.length} snapshots</span>
      </div>

      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 200px; margin-bottom: 8px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Snapshot ID</th><th>Begin Time</th><th>End Time</th></tr></thead>
          <tbody id="dba-awr-table-body">${snapsHtml}</tbody>
        </table>
      </div>
      <div style="font-size: 11px; background: #fff; border: 1px solid #ccc; padding: 8px;">
        <b>ADDM Findings:</b><br>
        SQL statements with High Buffer Gets accounted for 38% of total DB Time. Recommendation: Add index on <code>SALES_TRANSACTIONS(TX_DATE, CUSTOMER_ID)</code>.
      </div>
    `;
  }

  async createAwrSnapshot() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se ao banco de dados para criar snapshot AWR.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    if (window.TracesApp?.isRealDatabase) {
      try {
        const resp = await fetch('/api/dba/awr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_snapshot' })
        });
        const res = await resp.json();
        window.TracesApp.notify(res.message || 'Snapshot AWR criado com sucesso.', 'success');
        await this.loadSubtabData('awr');
      } catch (e) {
        window.TracesApp.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp.notify('Forced AWR Snapshot 14829 via DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT (Mock).', 'success');
    }
  }

  async generateAwrReport() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se ao banco de dados para gerar relatório AWR.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    if (window.TracesApp?.isRealDatabase) {
      try {
        const resp = await fetch('/api/dba/awr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate_report', snapStart: 14828, snapEnd: 14829 })
        });
        const res = await resp.json();
        if (res.html) {
          const w = window.open('', '_blank');
          w.document.write(res.html);
          w.document.close();
          window.TracesApp.notify('Relatório AWR gerado em nova aba.', 'success');
        } else {
          window.TracesApp.notify('Relatório AWR gerado com sucesso.', 'success');
        }
      } catch (e) {
        window.TracesApp.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp.notify('Generated full AWR HTML report for snapshots 14828..14829 (Mock).', 'success');
    }
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
      const isDefault = tr.getAttribute('data-default') === 'true';

      const matchText = !text || name.includes(text) || desc.includes(text);
      let matchType = true;
      if (type === 'dynamic') matchType = isDynamic;
      else if (type === 'static') matchType = !isDynamic;
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
}

window.DbaTools = DbaTools;
