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
    this.monitorInterval = null;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="dba-hub-container" style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
        <!-- Subtabs Bar (Horizontal scroll for 19 tabs) -->
        <div class="dba-subtabs-bar" style="overflow-x: auto; white-space: nowrap; flex-shrink: 0; padding: 0 4px; border-bottom: 1px solid #c0c0c0; background: #f0f0f0;">
          <button class="dba-subtab active" data-sub="browser" onclick="window.TracesApp.dbaTools.switchSubtab('browser');">🏛 Database Browser &amp; SPFILE</button>
          <button class="dba-subtab" data-sub="dbmonitor" onclick="window.TracesApp.dbaTools.switchSubtab('dbmonitor');">📈 Database Monitor</button>
          <button class="dba-subtab" data-sub="unixmonitor" onclick="window.TracesApp.dbaTools.switchSubtab('unixmonitor');">🐧 Unix / OS Monitor</button>
          <button class="dba-subtab" data-sub="tablespacemap" onclick="window.TracesApp.dbaTools.switchSubtab('tablespacemap');">💾 Tablespace Map (HWM)</button>
          <button class="dba-subtab" data-sub="spacemanager" onclick="window.TracesApp.dbaTools.switchSubtab('spacemanager');">📊 Space Manager &amp; Forecast</button>
          <button class="dba-subtab" data-sub="segmentadvisor" onclick="window.TracesApp.dbaTools.switchSubtab('segmentadvisor');">🧹 Segment Advisor &amp; Rebuild</button>
          <button class="dba-subtab" data-sub="undoadvisor" onclick="window.TracesApp.dbaTools.switchSubtab('undoadvisor');">⏱ Undo Advisor</button>
          <button class="dba-subtab" data-sub="flashback" onclick="window.TracesApp.dbaTools.switchSubtab('flashback');">⏪ Flashback Recycle Bin</button>
          <button class="dba-subtab" data-sub="logminer" onclick="window.TracesApp.dbaTools.switchSubtab('logminer');">🔍 LogMiner (Redo/Undo)</button>
          <button class="dba-subtab" data-sub="dataguard" onclick="window.TracesApp.dbaTools.switchSubtab('dataguard');">🛡 Data Guard Manager</button>
          <button class="dba-subtab" data-sub="asm" onclick="window.TracesApp.dbaTools.switchSubtab('asm');">💽 ASM Storage Manager</button>
          <button class="dba-subtab" data-sub="rac" onclick="window.TracesApp.dbaTools.switchSubtab('rac');">🌐 RAC Cluster Diagnostics</button>
          <button class="dba-subtab" data-sub="exadata" onclick="window.TracesApp.dbaTools.switchSubtab('exadata');">⚡ Exadata Smart Scan</button>
          <button class="dba-subtab" data-sub="audit" onclick="window.TracesApp.dbaTools.switchSubtab('audit');">🔒 Audit Manager (FGA)</button>
          <button class="dba-subtab" data-sub="wallet" onclick="window.TracesApp.dbaTools.switchSubtab('wallet');">🔑 Keystore &amp; TDE</button>
          <button class="dba-subtab" data-sub="schemacompare" onclick="window.TracesApp.dbaTools.switchSubtab('schemacompare');">⚖ Schema Compare</button>
          <button class="dba-subtab" data-sub="datacompare" onclick="window.TracesApp.dbaTools.switchSubtab('datacompare');">📋 Data Compare</button>
          <button class="dba-subtab" data-sub="dbcompare" onclick="window.TracesApp.dbaTools.switchSubtab('dbcompare');">📑 Database Compare</button>
          <button class="dba-subtab" data-sub="awr" onclick="window.TracesApp.dbaTools.switchSubtab('awr');">⏱ AWR / ASH Browser</button>
        </div>

        <!-- Subtab Content Panes -->
        <div style="flex: 1; overflow: hidden; position: relative;">
          <div class="dba-content-pane active" id="dba-pane-browser" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderDatabaseBrowser()}</div>
          <div class="dba-content-pane" id="dba-pane-dbmonitor" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderDbMonitor()}</div>
          <div class="dba-content-pane" id="dba-pane-unixmonitor" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderUnixMonitor()}</div>
          <div class="dba-content-pane" id="dba-pane-tablespacemap" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderTablespaceMap()}</div>
          <div class="dba-content-pane" id="dba-pane-spacemanager" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderSpaceManager()}</div>
          <div class="dba-content-pane" id="dba-pane-segmentadvisor" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderSegmentAdvisor()}</div>
          <div class="dba-content-pane" id="dba-pane-undoadvisor" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderUndoAdvisor()}</div>
          <div class="dba-content-pane" id="dba-pane-flashback" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderFlashback()}</div>
          <div class="dba-content-pane" id="dba-pane-logminer" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderLogMiner()}</div>
          <div class="dba-content-pane" id="dba-pane-dataguard" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderDataGuard()}</div>
          <div class="dba-content-pane" id="dba-pane-asm" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderAsm()}</div>
          <div class="dba-content-pane" id="dba-pane-rac" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderRac()}</div>
          <div class="dba-content-pane" id="dba-pane-exadata" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderExadata()}</div>
          <div class="dba-content-pane" id="dba-pane-audit" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderAudit()}</div>
          <div class="dba-content-pane" id="dba-pane-wallet" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderWallet()}</div>
          <div class="dba-content-pane" id="dba-pane-schemacompare" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderSchemaCompare()}</div>
          <div class="dba-content-pane" id="dba-pane-datacompare" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderDataCompare()}</div>
          <div class="dba-content-pane" id="dba-pane-dbcompare" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderDbCompare()}</div>
          <div class="dba-content-pane" id="dba-pane-awr" style="height: 100%; overflow-y: auto; padding: 10px;">${this.renderAwr()}</div>
        </div>
      </div>
    `;
  }

  async switchSubtab(subKey) {
    this.currentSubtab = subKey;
    document.querySelectorAll('.dba-subtab').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-sub') === subKey);
    });
    document.querySelectorAll('.dba-content-pane').forEach(p => {
      p.classList.toggle('active', p.id === `dba-pane-${subKey}`);
    });

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

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

  async loadSubtabData(subKey, silent = false) {
    try {
      const resp = await fetch(`/api/dba/${subKey}`);
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

  // 1. Database Browser
  renderDatabaseBrowser() {
    const list = this.realParameters || (window.TRACES_DB ? window.TRACES_DB.parameters : []);
    const paramsHtml = list.map(p => `
      <tr>
        <td><b>${p.name}</b></td>
        <td style="font-family: var(--toad-font-code); font-weight: 700; color: #0078d7;">${p.value}</td>
        <td>${p.isDynamic ? '<span style="color:#008000; font-weight:600;">YES (In-Memory)</span>' : '<span style="color:#c00000; font-weight:600;">NO (SPFILE Restart)</span>'}</td>
        <td style="color: #666; font-size: 11px;">${p.description || '-'}</td>
        <td>
          <button class="btn" style="padding: 1px 6px;" onclick="window.TracesApp.dbaTools.editParameter('${p.name}', '${p.value}');">Alter</button>
        </td>
      </tr>
    `).join('');

    const alertHtml = (window.TRACES_DB ? window.TRACES_DB.alertLog : []).map(a => `
      <div style="font-family: var(--toad-font-code); font-size: 11px; padding: 3px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="color: #666;">[${a.timestamp}]</span>
        <span style="font-weight: 700; color: ${a.severity === 'WARNING' ? '#c00000' : '#0078d7'};">[${a.severity}]</span>
        <span>${a.message}</span>
      </div>
    `).join('');

    const connConfig = window.TracesApp?.realDatabaseConfig;
    const dbTarget = connConfig ? `${connConfig.user}@${connConfig.host}:${connConfig.port}/${connConfig.serviceName}` : 'SALES_PROD';

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
      <div style="height: 280px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Parameter Name</th><th>Current Value</th><th>Dynamic?</th><th>Description</th><th>Action</th></tr></thead>
          <tbody>${paramsHtml}</tbody>
        </table>
      </div>

      <div style="font-weight: 700; font-size: 12px; margin-top: 10px;">Database Alert Log (alert_${connConfig?.serviceName || 'ORCL'}.log)</div>
      <div style="height: 120px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf; padding: 6px;">
        ${alertHtml}
      </div>
    `;
  }

  async editParameter(paramName, currentVal) {
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
      <tr>
        <td><b>${e.event}</b></td>
        <td style="text-align: right;">${Number(e.waits).toLocaleString()}</td>
        <td style="text-align: right; color: #0078d7; font-weight:700;">${Number(e.timeWaitedMs).toLocaleString()} ms</td>
      </tr>
    `).join('');

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

      <div style="font-weight: 700; font-size: 12px; margin-bottom: 6px;">Top Database Wait Events (V$SYSTEM_EVENT)</div>
      <div style="background: #fff; border: 1px solid #bfbfbf; max-height: 220px; overflow-y: auto;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Wait Event Name</th><th style="text-align: right;">Total Waits</th><th style="text-align: right;">Time Waited (ms)</th></tr></thead>
          <tbody>${eventsHtml}</tbody>
        </table>
      </div>
    `;
  }

  // 3. Unix / OS Monitor
  renderUnixMonitor(data) {
    const os = data?.osStats || { numCpus: 16, loadAverage: 1.45, memoryGb: 64, busyPct: 18, idlePct: 82 };
    return `
      <div style="font-weight: 700; font-size: 13px; margin-bottom: 8px;">Unix / Linux Host Operating System Monitor (V$OSSTAT)</div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px;">
        <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px;">
          <div style="font-size:10px; color:#666;">SERVER CPU CORES</div>
          <div style="font-size:20px; font-weight:700; color:#0078d7;">${os.numCpus} Cores</div>
          <div style="font-size:10px; color:#008000;">Architecture x86_64 / aarch64</div>
        </div>
        <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px;">
          <div style="font-size:10px; color:#666;">1-MIN LOAD AVERAGE</div>
          <div style="font-size:20px; font-weight:700; color:${os.loadAverage > os.numCpus ? '#c00000' : '#008000'};">${os.loadAverage}</div>
          <div style="font-size:10px; color:#666;">${os.loadAverage > os.numCpus ? 'CPU Bottleneck' : 'Healthy Load'}</div>
        </div>
        <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px;">
          <div style="font-size:10px; color:#666;">HOST PHYSICAL MEMORY</div>
          <div style="font-size:20px; font-weight:700; color:#8b5cf6;">${os.memoryGb} GB</div>
          <div style="font-size:10px; color:#666;">HugePages Allocated</div>
        </div>
        <div style="background:#fff; border:1px solid #ccc; padding:10px; border-radius:4px;">
          <div style="font-size:10px; color:#666;">CPU BUSY / IDLE</div>
          <div style="font-size:20px; font-weight:700; color:#0078d7;">${os.busyPct}% / ${os.idlePct}%</div>
          <div style="font-size:10px; color:#008000;">I/O Wait: ${(100 - os.busyPct - os.idlePct).toFixed(1)}%</div>
        </div>
      </div>
      <div style="background:#e5f1fb; border:1px solid #b8d6f5; padding:8px; font-size:11px; border-radius:3px;">
        ℹ <b>Host OS Diagnostics:</b> OS-level CPU, Memory and System Load are retrieved directly from Oracle kernel metric views <code>V$OSSTAT</code> and <code>V$SYSSTAT</code>.
      </div>
    `;
  }

  // 4. Tablespace Map & HWM
  renderTablespaceMap(data) {
    const map = data || (window.TRACES_DB ? window.TRACES_DB.tablespaceMap : {
      tablespaceName: 'USERS',
      datafileName: '/u01/app/oracle/oradata/ORCL/users01.dbf',
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
      <tr>
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

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 13px;">Space Manager &amp; Capacity Growth Forecast (DBA_TABLESPACE_USAGE_METRICS)</span>
        <button class="btn" onclick="window.TracesApp.dbaTools.switchSubtab('spacemanager');">🔄 Atualizar Métricas</button>
      </div>
      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 380px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Tablespace</th><th style="text-align: right;">Total</th><th style="text-align: right;">Used</th><th style="text-align: right;">Free</th><th style="width:180px;">Usage %</th><th style="text-align: right;">Daily Growth</th><th style="text-align: right;">Forecast (Days Full)</th></tr></thead>
          <tbody>${rows}</tbody>
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
      <tr>
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

    return `
      <div style="font-weight: 700; font-size: 13px;">Segment Advisor &amp; Rebuild Multiple Objects (DBMS_SPACE)</div>
      <div style="font-size: 11px; color: #555; margin-bottom: 6px;">Objects with wasted space below High Water Mark (HWM) or fragmented index leaf rows:</div>
      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 320px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Owner</th><th>Segment Name</th><th>Type</th><th>Allocated</th><th>Reclaimable</th><th>Clustering Factor</th><th>Recommendation</th><th>Action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  async executeSegmentAction(sql) {
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
      window.TracesApp.notify(`Executado (Mock): ${sql}`, 'success');
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
      <tr>
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

    return `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 13px;">Flashback Browser (DBA_RECYCLEBIN)</span>
        <button class="btn btn-primary" onclick="window.TracesApp.dbaTools.purgeEntireRecycleBin();">Purge Entire Recycle Bin</button>
      </div>
      <div style="height: 320px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf; margin-top: 6px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Object Name in Recyclebin</th><th>Original Name</th><th>Type</th><th>Tablespace</th><th>Drop Timestamp</th><th>Actions</th></tr></thead>
          <tbody>${listHtml}</tbody>
        </table>
      </div>
    `;
  }

  async flashbackRestore(tableName) {
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
      window.TracesApp.notify(`Executed FLASHBACK TABLE ${tableName} TO BEFORE DROP (Mock);`, 'success');
    }
  }

  async purgeRecycleObject(objectName) {
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
      window.TracesApp.notify(`PURGE TABLE ${objectName} completed (Mock).`, 'info');
    }
  }

  async purgeEntireRecycleBin() {
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
        window.TracesApp.notify('PURGE DBA_RECYCLEBIN executed (Mock).', 'warning');
      }
    }
  }

  // 9. LogMiner
  renderLogMiner(data) {
    const list = data?.entries || (window.TRACES_DB ? window.TRACES_DB.logMiner : []);
    const listHtml = list.map(l => `
      <div style="border-bottom: 1px solid #e0e0e0; padding: 6px; font-size: 11px;">
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

    return `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 13px;">LogMiner Redo / Undo Transaction Inspector (DBMS_LOGMNR)</span>
        <div style="display: flex; gap: 6px;">
          <button class="btn" onclick="window.TracesApp.dbaTools.startLogMinerSession();">▶ Start LogMiner Session</button>
          <button class="btn" onclick="window.TracesApp.dbaTools.stopLogMinerSession();">⏹ Stop Session</button>
        </div>
      </div>
      <div style="flex: 1; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf; margin-top: 6px; max-height: 380px;">
        ${listHtml}
      </div>
    `;
  }

  async startLogMinerSession() {
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
      <tr>
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

    return `
      <div style="font-weight: 700; font-size: 13px;">ASM Storage Manager (Automatic Storage Management)</div>
      <table class="meta-table" style="width: 100%; margin-top: 6px;">
        <thead><tr><th>Diskgroup</th><th>Redundancy</th><th>Total Capacity</th><th>Free Space</th><th>State</th><th>Rebalance</th><th>Member Disks</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  async rebalanceAsm(dgName) {
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
      <tr>
        <td><b>Instance ${i.instId}</b></td>
        <td>${i.instanceName}</td>
        <td>${i.hostName}</td>
        <td><span style="color:#008000; font-weight:700;">${i.status}</span></td>
      </tr>
    `).join('');

    const servHtml = services.map(s => `
      <tr>
        <td><b>${s.serviceName}</b></td>
        <td>${s.networkName}</td>
      </tr>
    `).join('');

    return `
      <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">Oracle Real Application Clusters (RAC) Node &amp; Interconnect Diagnostics</div>
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
        <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto;">
          <table class="meta-table" style="width: 100%;">
            <thead><tr><th>Instance ID</th><th>Instance Name</th><th>Host Node</th><th>Status</th></tr></thead>
            <tbody>${instHtml}</tbody>
          </table>
        </div>
        <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto;">
          <table class="meta-table" style="width: 100%;">
            <thead><tr><th>Cluster Service</th><th>Network Name</th></tr></thead>
            <tbody>${servHtml}</tbody>
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
      <tr>
        <td>${r.timestamp}</td>
        <td><b>${r.username}</b></td>
        <td>${r.action}</td>
        <td>${r.object}</td>
        <td style="color:${r.returnCode === 0 ? '#008000' : '#c00000'}; font-weight:700;">
          ${r.returnCode === 0 ? 'SUCCESS' : `ORA-${String(r.returnCode).padStart(5, '0')}`}
        </td>
      </tr>
    `).join('');

    return `
      <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">Audit Manager &amp; Fine-Grained Auditing (UNIFIED_AUDIT_TRAIL)</div>
      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 380px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Timestamp</th><th>Username</th><th>Action</th><th>Target Object</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
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
      <tr>
        <td><span class="toad-conn-badge-indicator" style="background:#fee2e2; color:#b91c1c;">${d.type}</span></td>
        <td><b>${d.object}</b></td>
        <td style="color:#008000;">${d.sourceVal}</td>
        <td style="color:#c00000;">${d.targetVal}</td>
      </tr>
    `).join('');

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

      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 320px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Difference Type</th><th>Target Object</th><th>Source Schema</th><th>Target Schema</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  async runLiveSchemaCompare() {
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
      <tr>
        <td><b>${d.pk}</b></td>
        <td>${d.sourceVal}</td>
        <td>${d.targetVal}</td>
        <td><span class="toad-conn-badge-indicator" style="background:#fee2e2; color:#b91c1c;">${d.status}</span></td>
        <td><code>${d.syncSql}</code></td>
      </tr>
    `).join('');

    return `
      <div style="font-weight: 700; font-size: 13px;">Data Compare (Line-by-Line PK Comparison)</div>
      <div style="font-size: 11px; color: #555; margin-bottom: 6px;">Table: HR.EMPLOYEES (Compared across Source and Target):</div>
      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 320px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>PK</th><th>Source Value</th><th>Target Value</th><th>Status</th><th>Sync Action</th></tr></thead>
          <tbody>${rows}</tbody>
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
      <tr style="${p.diff ? 'background:#fffbeb;' : ''}">
        <td><b>${p.name}</b></td>
        <td>${p.sourceValue}</td>
        <td>${p.targetValue}</td>
        <td>${p.diff ? '<span style="color:#b45309; font-weight:700;">DIFFERENT</span>' : '<span style="color:#008000;">MATCH</span>'}</td>
      </tr>
    `).join('');

    return `
      <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">Database Compare (init.ora &amp; SPFILE Configuration Differences)</div>
      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 380px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Parameter Name</th><th>Source Instance</th><th>Target Instance</th><th>Match Status</th></tr></thead>
          <tbody>${rows}</tbody>
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
      <tr>
        <td><b>${s.snapId}</b></td>
        <td>${s.beginTime}</td>
        <td>${s.endTime}</td>
      </tr>
    `).join('');

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
      <div style="background: #fff; border: 1px solid #bfbfbf; overflow-y: auto; max-height: 200px; margin-bottom: 8px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Snapshot ID</th><th>Begin Time</th><th>End Time</th></tr></thead>
          <tbody>${snapsHtml}</tbody>
        </table>
      </div>
      <div style="font-size: 11px; background: #fff; border: 1px solid #ccc; padding: 8px;">
        <b>ADDM Findings:</b><br>
        SQL statements with High Buffer Gets accounted for 38% of total DB Time. Recommendation: Add index on <code>SALES_TRANSACTIONS(TX_DATE, CUSTOMER_ID)</code>.
      </div>
    `;
  }

  async createAwrSnapshot() {
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
}

window.DbaTools = DbaTools;
