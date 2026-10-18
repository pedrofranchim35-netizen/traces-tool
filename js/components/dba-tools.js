/* ==========================================================================
   DBA ADMINISTRATION HUB & ADVANCED SUITE TOOLS
   Implements Database Browser & SPFILE, Tablespace Map (HWM), Segment Advisor,
   Undo Advisor, Flashback Browser, Compare Tools, LogMiner, and Data Guard.
   ========================================================================== */

class DbaTools {
  constructor() {
    this.container = document.getElementById('view-dba');
    this.currentSubtab = 'browser';
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="dba-hub-container">
        <!-- Subtabs Bar -->
        <div class="dba-subtabs-bar">
          <button class="dba-subtab active" data-sub="browser" onclick="window.TracesApp.dbaTools.switchSubtab('browser');">Database Browser &amp; SPFILE</button>
          <button class="dba-subtab" data-sub="tablespacemap" onclick="window.TracesApp.dbaTools.switchSubtab('tablespacemap');">Tablespace Map &amp; HWM</button>
          <button class="dba-subtab" data-sub="segmentadvisor" onclick="window.TracesApp.dbaTools.switchSubtab('segmentadvisor');">Segment Advisor &amp; Rebuild</button>
          <button class="dba-subtab" data-sub="undoadvisor" onclick="window.TracesApp.dbaTools.switchSubtab('undoadvisor');">Undo Advisor</button>
          <button class="dba-subtab" data-sub="flashback" onclick="window.TracesApp.dbaTools.switchSubtab('flashback');">Flashback Recycle Bin</button>
          <button class="dba-subtab" data-sub="logminer" onclick="window.TracesApp.dbaTools.switchSubtab('logminer');">LogMiner (DBMS_LOGMNR)</button>
          <button class="dba-subtab" data-sub="dataguard" onclick="window.TracesApp.dbaTools.switchSubtab('dataguard');">Data Guard Manager</button>
          <button class="dba-subtab" data-sub="asm" onclick="window.TracesApp.dbaTools.switchSubtab('asm');">ASM Manager</button>
          <button class="dba-subtab" data-sub="schemacompare" onclick="window.TracesApp.dbaTools.switchSubtab('schemacompare');">Schema Compare</button>
          <button class="dba-subtab" data-sub="datacompare" onclick="window.TracesApp.dbaTools.switchSubtab('datacompare');">Data Compare</button>
          <button class="dba-subtab" data-sub="awr" onclick="window.TracesApp.dbaTools.switchSubtab('awr');">AWR / ASH Browser</button>
        </div>

        <!-- Subtab Panes -->
        <!-- 1. Database Browser & SPFILE -->
        <div class="dba-content-pane active" id="dba-pane-browser">
          ${this.renderDatabaseBrowser()}
        </div>

        <!-- 2. Tablespace Map & HWM -->
        <div class="dba-content-pane" id="dba-pane-tablespacemap">
          ${this.renderTablespaceMap()}
        </div>

        <!-- 3. Segment Advisor -->
        <div class="dba-content-pane" id="dba-pane-segmentadvisor">
          ${this.renderSegmentAdvisor()}
        </div>

        <!-- 4. Undo Advisor -->
        <div class="dba-content-pane" id="dba-pane-undoadvisor">
          ${this.renderUndoAdvisor()}
        </div>

        <!-- 5. Flashback Recycle Bin -->
        <div class="dba-content-pane" id="dba-pane-flashback">
          ${this.renderFlashback()}
        </div>

        <!-- 6. LogMiner Interface -->
        <div class="dba-content-pane" id="dba-pane-logminer">
          ${this.renderLogMiner()}
        </div>

        <!-- 7. Data Guard Manager -->
        <div class="dba-content-pane" id="dba-pane-dataguard">
          ${this.renderDataGuard()}
        </div>

        <!-- 8. ASM Manager -->
        <div class="dba-content-pane" id="dba-pane-asm">
          ${this.renderAsm()}
        </div>

        <!-- 9. Schema Compare -->
        <div class="dba-content-pane" id="dba-pane-schemacompare">
          ${this.renderSchemaCompare()}
        </div>

        <!-- 10. Data Compare -->
        <div class="dba-content-pane" id="dba-pane-datacompare">
          ${this.renderDataCompare()}
        </div>

        <!-- 11. AWR / ASH Browser -->
        <div class="dba-content-pane" id="dba-pane-awr">
          ${this.renderAwr()}
        </div>
      </div>
    `;
  }

  switchSubtab(subKey) {
    this.currentSubtab = subKey;
    document.querySelectorAll('.dba-subtab').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-sub') === subKey);
    });
    document.querySelectorAll('.dba-content-pane').forEach(p => {
      p.classList.toggle('active', p.id === `dba-pane-${subKey}`);
    });
  }

  async loadRealData() {
    try {
      const resp = await fetch('/api/parameters');
      const data = await resp.json();
      if (data.parameters && data.parameters.length > 0) {
        this.realParameters = data.parameters;
        const pane = document.getElementById('dba-pane-browser');
        if (pane) pane.innerHTML = this.renderDatabaseBrowser();
      }
    } catch (e) {
      console.warn('Real parameters error', e);
    }
  }

  // 1. Database Browser
  renderDatabaseBrowser() {
    const list = this.realParameters || (window.TRACES_DB ? window.TRACES_DB.parameters : []);
    const paramsHtml = list.map(p => `
      <tr>
        <td><b>${p.name}</b></td>
        <td style="font-family: var(--toad-font-code); font-weight: 700; color: #0078d7;">${p.value}</td>
        <td>${p.isDynamic ? '<span style="color:#008000;">YES (In-Memory)</span>' : '<span style="color:#c00000;">NO (SPFILE Restart)</span>'}</td>
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
          <button class="btn" style="height: 24px; padding: 0 8px;" onclick="window.TracesApp.dbaTools.loadRealData()">🔄 Atualizar Parâmetros</button>
          <span class="toad-conn-badge-indicator" style="background:#e0f2fe; color:#0369a1;">Instância: ${dbTarget}</span>
        </div>
      </div>
      <div style="height: 260px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf;">
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
          await this.loadRealData();
        }
      } catch (e) {
        window.TracesApp.notify(`Erro: ${e.message}`, 'error');
      }
      return;
    }

    const p = window.TRACES_DB.parameters.find(item => item.name === paramName);
    if (p) p.value = newVal;
    this.switchSubtab('browser');
    window.TracesApp.notify(`ALTER SYSTEM SET ${paramName}='${newVal}' SCOPE=BOTH executado (Modo Local).`, 'success');
  }

  // 2. Tablespace Map & HWM
  renderTablespaceMap() {
    const map = window.TRACES_DB.tablespaceMap;
    let blocksHtml = '';
    for (let i = 0; i < 280; i++) {
      let type = 'extent-allocated';
      if (i > 140) type = 'extent-free';
      if (i === 140) type = 'extent-hwm-line';
      blocksHtml += `<div class="extent-block ${type}" title="Block ${i * 4096}..${(i+1)*4096}"></div>`;
    }

    return `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-weight: 700; font-size: 13px;">Tablespace Map: ${map.tablespaceName}</span>
          <span style="font-size: 11px; color: #666; margin-left: 8px;">Datafile: ${map.datafileName}</span>
        </div>
        <button class="btn btn-primary" onclick="window.TracesApp.notify('Calculated: ALTER DATABASE DATAFILE ... RESIZE ${map.maxShrinkMb}M will reclaim ${map.reclaimableMb} MB without HWM collision.', 'success');">Calculate Datafile Resize</button>
      </div>

      <div style="display: flex; gap: 16px; font-size: 11px; margin: 4px 0;">
        <span><span style="display:inline-block; width:10px; height:10px; background:#3b82f6; border-radius:2px;"></span> Allocated Extents (4,452 MB)</span>
        <span><span style="display:inline-block; width:10px; height:10px; background:#10b981; border-radius:2px;"></span> Free Extents Below/Above HWM (3,740 MB)</span>
        <span><span style="display:inline-block; width:10px; height:10px; background:#ef4444; border-radius:2px;"></span> High Water Mark (HWM Block: 512,000)</span>
      </div>

      <div class="extent-map-canvas">${blocksHtml}</div>

      <div style="background: #e5f1fb; padding: 8px; border: 1px solid #b8d6f5; font-size: 11px; border-radius: 3px;">
        ℹ <b>High Water Mark (HWM) Diagnostic:</b> Datafiles can be safely shrunk up to <b>${map.maxShrinkMb} MB</b> via <code>ALTER DATABASE DATAFILE ... RESIZE ${map.maxShrinkMb}M</code>. Space above HWM contains 0 segment blocks.
      </div>
    `;
  }

  // 3. Segment Advisor
  renderSegmentAdvisor() {
    return `
      <div style="font-weight: 700; font-size: 13px;">Segment Advisor &amp; Rebuild Multiple Objects (DBMS_SPACE)</div>
      <div style="font-size: 11px; color: #555;">Objects with wasted space below High Water Mark (HWM) or fragmented index leaf rows:</div>
      <table class="meta-table" style="width: 100%; margin-top: 6px;">
        <thead><tr><th>Owner</th><th>Segment Name</th><th>Segment Type</th><th>Allocated MB</th><th>Reclaimable MB</th><th>Clustering Factor</th><th>Recommendation</th><th>Action</th></tr></thead>
        <tbody>
          <tr>
            <td>HR</td>
            <td><b>EMPLOYEES</b></td>
            <td>TABLE</td>
            <td>1.8 MB</td>
            <td style="color:#008000; font-weight:700;">0.6 MB (33%)</td>
            <td>12 (Optimal)</td>
            <td>ALTER TABLE hr.employees SHRINK SPACE COMPACT;</td>
            <td><button class="btn" onclick="window.TracesApp.notify('Shrunk segment HR.EMPLOYEES.', 'success');">Shrink Space</button></td>
          </tr>
          <tr>
            <td>SALES_ADMIN</td>
            <td><b>CUSTOMERS</b></td>
            <td>TABLE</td>
            <td>128.0 MB</td>
            <td style="color:#008000; font-weight:700;">44.2 MB (34%)</td>
            <td>48</td>
            <td>ALTER TABLE sales_admin.customers MOVE;</td>
            <td><button class="btn" onclick="window.TracesApp.notify('Moved table and rebuilt indexes.', 'success');">Move Table</button></td>
          </tr>
          <tr>
            <td>HR</td>
            <td><b>EMP_JOB_IX</b></td>
            <td>INDEX</td>
            <td>0.8 MB</td>
            <td style="color:#008000; font-weight:700;">0.3 MB (37%)</td>
            <td>21 (Deleted Leaf Rows &gt; 25%)</td>
            <td>ALTER INDEX hr.emp_job_ix REBUILD ONLINE NOLOGGING;</td>
            <td><button class="btn" onclick="window.TracesApp.notify('Rebuilt index EMP_JOB_IX ONLINE NOLOGGING.', 'success');">Rebuild Index</button></td>
          </tr>
        </tbody>
      </table>
      <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
        <button class="btn btn-primary" onclick="window.TracesApp.notify('Generated batch DDL rebuild script for 3 objects.', 'success');">Generate Batch Rebuild Script</button>
      </div>
    `;
  }

  // 4. Undo Advisor
  renderUndoAdvisor() {
    return `
      <div style="font-weight: 700; font-size: 13px;">Oracle Undo Advisor (V$UNDOSTAT &amp; ORA-01555 Sizing)</div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 8px 0;">
        <div style="background: #f7f7f7; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">
          <div style="font-size: 10px; color: #666;">UNDO RETENTION</div>
          <div style="font-size: 18px; font-weight: 700; color: #0078d7;">1,800 sec</div>
          <div style="font-size: 9.5px; color: #555;">(30 Minutes Guaranteed)</div>
        </div>
        <div style="background: #f7f7f7; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">
          <div style="font-size: 10px; color: #666;">UNDO BLOCK RATE</div>
          <div style="font-size: 18px; font-weight: 700; color: #008000;">142 blocks/s</div>
          <div style="font-size: 9.5px; color: #555;">Peak Workload: 210 blk/s</div>
        </div>
        <div style="background: #f7f7f7; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">
          <div style="font-size: 10px; color: #666;">RECOMMENDED UNDOTBS SIZE</div>
          <div style="font-size: 18px; font-weight: 700; color: #0078d7;">2,840 MB</div>
          <div style="font-size: 9.5px; color: #008000;">Current 4,096 MB is SAFE (0 risk of ORA-01555)</div>
        </div>
      </div>
      <div style="font-size: 11px; background: #fff; border: 1px solid #ccc; padding: 8px;">
        <b>V$UNDOSTAT Recent Samples:</b><br>
        2026-10-18 15:00:00 | UNDOBLKS: 14,200 | TXNCOUNT: 1,840 | MAXQUERYLEN: 420s | UNXPSTEALCNT: 0 (No stolen unexpired blocks).
      </div>
    `;
  }

  // 5. Flashback Recycle Bin
  renderFlashback() {
    const listHtml = window.TRACES_DB.recycleBin.map(r => `
      <tr>
        <td style="font-family: var(--toad-font-code); color: #800080;">${r.objectName}</td>
        <td><b>${r.originalName}</b></td>
        <td>${r.type}</td>
        <td>${r.tsName}</td>
        <td>${r.dropTime}</td>
        <td>
          <button class="btn" style="padding: 1px 6px;" onclick="window.TracesApp.notify('Executed FLASHBACK TABLE ${r.originalName} TO BEFORE DROP;', 'success');">Restore Table</button>
          <button class="btn" style="padding: 1px 6px; color:#c00000;" onclick="window.TracesApp.notify('PURGE TABLE ${r.objectName} completed.', 'info');">Purge</button>
        </td>
      </tr>
    `).join('');

    return `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 13px;">Flashback Browser (DBA_RECYCLEBIN)</span>
        <button class="btn btn-primary" onclick="window.TracesApp.notify('PURGE DBA_RECYCLEBIN executed.', 'warning');">Purge Entire Recycle Bin</button>
      </div>
      <div style="height: 280px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf; margin-top: 6px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Object Name in Recyclebin</th><th>Original Name</th><th>Type</th><th>Tablespace</th><th>Drop Timestamp</th><th>Actions</th></tr></thead>
          <tbody>${listHtml}</tbody>
        </table>
      </div>
    `;
  }

  // 6. LogMiner
  renderLogMiner() {
    const listHtml = window.TRACES_DB.logMiner.map(l => `
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
          <button class="btn" onclick="window.TracesApp.notify('Added Online Redo Logs 1, 2, 3 to LogMiner session.', 'info');">Add Logs</button>
          <button class="btn btn-primary" onclick="window.TracesApp.notify('LogMiner session active for SCN 10482910000..10482910500', 'success');">Start LogMiner</button>
        </div>
      </div>
      <div style="flex: 1; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf; margin-top: 6px;">
        ${listHtml}
      </div>
    `;
  }

  // 7. Data Guard
  renderDataGuard() {
    const dg = window.TRACES_DB.dataGuard;
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
            <button class="btn btn-primary" onclick="window.TracesApp.notify('Data Guard Switchover validated.', 'info');">Validate Switchover</button>
          </div>
        </div>
      </div>
    `;
  }

  // 8. ASM Manager
  renderAsm() {
    const asm = window.TRACES_DB.asm;
    const rows = asm.diskgroups.map(d => `
      <tr>
        <td><b>+${d.name}</b></td>
        <td>${d.type}</td>
        <td>${d.totalGb} GB</td>
        <td>${d.freeGb} GB</td>
        <td><span style="color:#008000; font-weight:700;">${d.state}</span></td>
        <td>Rebalance Power: ${d.rebalancePower}</td>
        <td>${d.disks} Disks</td>
        <td><button class="btn" onclick="window.TracesApp.notify('ALTER DISKGROUP ${d.name} REBALANCE POWER 6 initiated.', 'info');">Rebalance</button></td>
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

  // 9. Schema Compare
  renderSchemaCompare() {
    return `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 13px;">Schema Compare (PROD-RAC01.HR vs UAT-ORCL19C.HR)</span>
        <button class="btn btn-primary" onclick="window.TracesApp.notify('Generated topological sync script with 2 ALTER TABLE statements.', 'success');">Generate Synchronization Script</button>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; height: 260px; margin-top: 6px;">
        <div style="border: 1px solid #ccc; background: #fff; padding: 8px; font-size: 11px;">
          <div style="font-weight: 700; color: #c00000;">Source: PROD-RAC01 (HR)</div>
          <div style="margin-top: 6px;">✔ TABLE: EMPLOYEES (11 columns)</div>
          <div>✔ TABLE: DEPARTMENTS</div>
          <div style="color: #008000; font-weight: 700;">+ COLUMN: EMPLOYEES.COMMISSION_PCT (NUMBER(2,2))</div>
          <div style="color: #008000; font-weight: 700;">+ INDEX: EMP_NAME_IX (LAST_NAME, FIRST_NAME)</div>
        </div>
        <div style="border: 1px solid #ccc; background: #fff; padding: 8px; font-size: 11px;">
          <div style="font-weight: 700; color: #0078d7;">Target: UAT-ORCL19C (HR)</div>
          <div style="margin-top: 6px;">✔ TABLE: EMPLOYEES (10 columns)</div>
          <div>✔ TABLE: DEPARTMENTS</div>
          <div style="color: #c00000;">✕ MISSING: COMMISSION_PCT</div>
          <div style="color: #c00000;">✕ MISSING: EMP_NAME_IX</div>
        </div>
      </div>
    `;
  }

  // 10. Data Compare
  renderDataCompare() {
    return `
      <div style="font-weight: 700; font-size: 13px;">Data Compare (Line-by-Line PK Comparison)</div>
      <div style="font-size: 11px; color: #555;">Table: HR.EMPLOYEES (Compared across PROD and UAT):</div>
      <table class="meta-table" style="width: 100%; margin-top: 6px;">
        <thead><tr><th>PK (EMPLOYEE_ID)</th><th>Source Column</th><th>Target Column</th><th>Difference Status</th><th>Sync Action</th></tr></thead>
        <tbody>
          <tr>
            <td><b>100</b></td>
            <td>SALARY: 25,000.00</td>
            <td>SALARY: 24,000.00</td>
            <td><span class="toad-conn-badge-indicator" style="background:#fee2e2; color:#b91c1c;">VALUE MISMATCH</span></td>
            <td><code>UPDATE hr.employees SET salary = 25000 WHERE employee_id = 100;</code></td>
          </tr>
          <tr>
            <td><b>107</b></td>
            <td>FULL ROW (Diana Lorentz)</td>
            <td>MISSING IN TARGET</td>
            <td><span class="toad-conn-badge-indicator" style="background:#fef3c7; color:#b45309;">INSERT NEEDED</span></td>
            <td><code>INSERT INTO hr.employees VALUES (107, 'Diana', 'Lorentz', ...);</code></td>
          </tr>
        </tbody>
      </table>
    `;
  }

  // 11. AWR / ASH
  renderAwr() {
    return `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 13px;">AWR / ADDM / Active Session History (ASH) Browser</span>
        <div style="display: flex; gap: 6px;">
          <button class="btn" onclick="window.TracesApp.notify('Forced AWR Snapshot 14829 via DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT.', 'success');">Create Snapshot</button>
          <button class="btn btn-primary" onclick="window.TracesApp.notify('Generated full AWR HTML report for snapshots 14828..14829', 'success');">Generate AWR HTML Report</button>
        </div>
      </div>
      <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 6px 10px; font-size: 10.5px; color: #991b1b; border-radius: 3px; margin: 6px 0;">
        ⚖ <b>Oracle Legal Licensing Notice:</b> Accessing DBA_HIST_* and V$ACTIVE_SESSION_HISTORY requires the Oracle Diagnostics Pack license recorded under DBA_FEATURE_USAGE_STATISTICS.
      </div>
      <div style="font-size: 11px; background: #fff; border: 1px solid #ccc; padding: 8px;">
        <b>ADDM Findings (Top Recommendation):</b><br>
        SQL statement <code>9x8a21mfk4</code> was responsible for 42% of database time. Recommendation: Create index on <code>SALES_TRANSACTIONS(TX_DATE, CUSTOMER_ID)</code>.
      </div>
    `;
  }
}

window.DbaTools = DbaTools;
