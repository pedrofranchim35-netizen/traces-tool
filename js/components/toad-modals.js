/* ==========================================================================
   TOAD FOR ORACLE CLASSIC MODALS & TECHNICAL DIALOGS
   Implements all specialized popup interfaces: Bind Variables (:var), 
   Describe (F4), SQL Recall (F8), Toad Options, Spool SQL, TSR, 
   TNS Names Editor, Sensitive Data Search, and Wizards.
   ========================================================================== */

class ToadModals {
  constructor() {
    this.sessionSubstitutionVars = {};
    this.initBackdrop();
  }

  initBackdrop() {
    if (!document.getElementById('toad-modal-backdrop')) {
      const backdrop = document.createElement('div');
      backdrop.id = 'toad-modal-backdrop';
      backdrop.className = 'toad-dialog-backdrop';
      backdrop.innerHTML = `
        <div class="toad-dialog" id="toad-active-dialog">
          <div class="toad-dialog-header">
            <span id="toad-dialog-title">Toad for Oracle Dialog</span>
            <button class="toad-dialog-close" onclick="window.TracesApp.toadModals.close()">✕</button>
          </div>
          <div class="toad-dialog-body" id="toad-dialog-body"></div>
          <div class="toad-dialog-footer" id="toad-dialog-footer"></div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }
    this.backdrop = document.getElementById('toad-modal-backdrop');
    this.dialogTitle = document.getElementById('toad-dialog-title');
    this.dialogBody = document.getElementById('toad-dialog-body');
    this.dialogFooter = document.getElementById('toad-dialog-footer');
  }

  show(title, bodyHtml, footerHtml, minWidth = '540px') {
    this.dialogTitle.textContent = title;
    this.dialogBody.innerHTML = bodyHtml;
    this.dialogFooter.innerHTML = footerHtml;
    document.getElementById('toad-active-dialog').style.minWidth = minWidth;
    this.backdrop.classList.add('active');
  }

  close() {
    if (this.backdrop) {
      this.backdrop.classList.remove('active');
    }
  }

  // 1. Bind Variables Dialog (:var)
  openBindVariables(detectedVars = [':min_amount']) {
    const varsHtml = detectedVars.map((v, i) => `
      <tr>
        <td style="font-weight: 700; color: #800080;">${v}</td>
        <td>
          <select id="bind-type-${i}" class="toad-conn-combobox" style="height: 22px; width: 120px;">
            <option value="NUMBER" selected>NUMBER</option>
            <option value="VARCHAR2">VARCHAR2</option>
            <option value="DATE">DATE</option>
            <option value="CLOB">CLOB</option>
            <option value="REFCURSOR">REFCURSOR</option>
          </select>
        </td>
        <td>
          <input type="text" id="bind-val-${i}" value="50000" style="width: 140px; padding: 2px 4px; font-family: var(--toad-font-code); border: 1px solid #7f9db9;">
        </td>
        <td style="text-align: center;">
          <input type="checkbox" id="bind-cache-${i}" checked>
        </td>
      </tr>
    `).join('');

    const body = `
      <div style="font-size: 11px; margin-bottom: 8px;">
        The SQL statement contains bind variables. Please supply types and values:
      </div>
      <table class="meta-table" style="width: 100%; margin-bottom: 10px;">
        <thead>
          <tr>
            <th>Variable</th>
            <th>Data Type</th>
            <th>Value</th>
            <th title="Retain value in session cache for cursor sharing">Cache in Session</th>
          </tr>
        </thead>
        <tbody>${varsHtml}</tbody>
      </table>
      <div style="font-size: 10.5px; color: #555; background: #e5f1fb; padding: 6px; border: 1px solid #b8d6f5; border-radius: 2px;">
        ℹ <b>Shared Pool Cursor Sharing:</b> Bind variables prevent Hard Parses by allowing Oracle CBO to reuse parent/child cursor execution plans.
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.applyBindVariables();">OK (Execute)</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('Bind Variables - Toad for Oracle', body, footer, '500px');
  }

  applyBindVariables() {
    this.close();
    window.TracesApp.sqlEditor.executeStatement();
  }

  // 2. Substitution Variables (&var / &&var)
  openSubstitutionDialog() {
    const body = `
      <div style="font-size: 11px; margin-bottom: 10px;">
        Manage SQL*Plus style substitution variables (&amp;prompt and &amp;&amp;cached):
      </div>
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <input type="text" id="subst-name" placeholder="Variable Name (e.g. dept_no)" style="flex: 1; padding: 4px; border: 1px solid #7f9db9;">
        <input type="text" id="subst-val" placeholder="Value (e.g. 90)" style="flex: 1; padding: 4px; border: 1px solid #7f9db9;">
        <button class="btn" onclick="window.TracesApp.toadModals.defineSubstitution();">DEFINE</button>
      </div>
      <div style="font-size: 11px; font-weight: 700; margin-bottom: 4px;">Active Session Substitution Variables:</div>
      <div id="subst-vars-list" style="background: #fff; border: 1px solid #ccc; height: 90px; overflow-y: auto; padding: 4px; font-family: var(--toad-font-code); font-size: 11px;">
        DEFINE &amp;&amp;schema_prefix = 'HR' (CHAR)<br>
        DEFINE &amp;&amp;default_ts = 'USERS' (CHAR)
      </div>
      <div style="margin-top: 8px; font-size: 10px; color: #666;">
        Notice: <code>&amp;&amp;</code> stores the value in memory until <code>UNDEFINE</code> is invoked.
      </div>
    `;

    const footer = `
      <button class="btn" onclick="document.getElementById('subst-vars-list').innerHTML='No variables defined.'; window.TracesApp.notify('UNDEFINE ALL executed.', 'info');">UNDEFINE ALL</button>
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Close</button>
    `;

    this.show('Substitution Variables (DEFINE / UNDEFINE)', body, footer, '480px');
  }

  defineSubstitution() {
    const name = document.getElementById('subst-name').value;
    const val = document.getElementById('subst-val').value;
    if (name && val) {
      this.sessionSubstitutionVars[name] = val;
      const list = document.getElementById('subst-vars-list');
      list.innerHTML += `<br>DEFINE &amp;&amp;${name} = '${val}' (CHAR)`;
      window.TracesApp.notify(`Defined &amp;&amp;${name} = ${val}`, 'success');
    }
  }

  // 3. Toad Describe (F4)
  openDescribe(objectName = 'HR.EMPLOYEES') {
    const [schema, name] = objectName.includes('.') ? objectName.split('.') : ['HR', objectName];
    const table = window.TRACES_DB.schemas[schema] ? window.TRACES_DB.schemas[schema].tables.find(t => t.name === name) : null;

    let columnsHtml = '';
    if (table) {
      columnsHtml = table.columns.map(c => `
        <tr>
          <td>${c.pk ? '🔑 ' : ''}<b>${c.name}</b></td>
          <td style="color: #2b91af;">${c.type}</td>
          <td>${c.nullable}</td>
          <td>${c.defaultVal || ''}</td>
          <td style="color: #666;">${c.comments || ''}</td>
        </tr>
      `).join('');
    }

    const body = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 6px; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 13px; color: #0078d7;">${schema}.${name}</span>
        <span class="toad-conn-badge-indicator" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">TABLE [VALID]</span>
      </div>
      <div style="display: flex; gap: 4px; border-bottom: 1px solid #bfbfbf; margin-bottom: 8px; font-size: 11px;">
        <button class="btn active" style="font-weight: 700;">Columns (${table ? table.columns.length : 0})</button>
        <button class="btn">Indexes</button>
        <button class="btn">Constraints</button>
        <button class="btn">Script (DDL)</button>
        <button class="btn">Grants</button>
        <button class="btn">Dependencies</button>
      </div>
      <div style="height: 240px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf;">
        <table class="meta-table" style="width: 100%;">
          <thead>
            <tr>
              <th>Column Name</th>
              <th>Data Type</th>
              <th>Null?</th>
              <th>Default</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>${columnsHtml}</tbody>
        </table>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 10px; color: #555;">
        <span>Resolved via ALL_TAB_COLUMNS &amp; ALL_SYNONYMS</span>
        <button class="btn" onclick="window.TracesApp.openObjectInWorksheet('${name}'); window.TracesApp.toadModals.close();">Query Data in Editor</button>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Close (Esc)</button>
    `;

    this.show(`Describe ${schema}.${name} (F4)`, body, footer, '680px');
  }

  // 4. SQL Recall (F8)
  openSqlRecall() {
    const listHtml = window.TRACES_DB.savedSql.map((s, idx) => `
      <div class="saved-sql-item" style="padding: 6px; border-bottom: 1px solid #e0e0e0; cursor: pointer;" onclick="document.getElementById('sql-recall-preview').textContent = window.TRACES_DB.savedSql[${idx}].text;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #666;">
          <span>${s.timestamp} | Schema: <b>${s.schema}</b></span>
          <span>Execs: ${s.executions}</span>
        </div>
        <div style="font-family: var(--toad-font-code); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #222;">
          ${s.text}
        </div>
      </div>
    `).join('');

    const body = `
      <div style="display: flex; gap: 8px; height: 320px;">
        <div style="flex: 1; display: flex; flex-direction: column; border: 1px solid #ccc; background: #fff;">
          <div style="padding: 4px; background: #f0f0f0; border-bottom: 1px solid #ccc; font-weight: 700; font-size: 11px;">
            Recent SQL (SavedSQL.dat)
          </div>
          <div style="flex: 1; overflow-y: auto;">${listHtml}</div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; border: 1px solid #ccc; background: #fff;">
          <div style="padding: 4px; background: #f0f0f0; border-bottom: 1px solid #ccc; font-weight: 700; font-size: 11px;">
            SQL Statement Preview
          </div>
          <pre id="sql-recall-preview" style="flex: 1; padding: 8px; margin: 0; font-family: var(--toad-font-code); font-size: 11px; overflow: auto; background: #fafafa;">${window.TRACES_DB.savedSql[0].text}</pre>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.sqlEditor.textarea.value = document.getElementById('sql-recall-preview').textContent; window.TracesApp.sqlEditor.saveActiveTabContent(); window.TracesApp.sqlEditor.updateHighlighting(); window.TracesApp.toadModals.close(); window.TracesApp.notify('SQL recalled into Editor.', 'success');">Paste to Editor</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('SQL Recall (F8) - SavedSQL.dat', body, footer, '740px');
  }

  // 5. Toad Options Dialog
  openOptions() {
    const body = `
      <div style="display: flex; gap: 10px; height: 360px;">
        <div style="width: 170px; border: 1px solid #ccc; background: #fff; padding: 4px; font-size: 11px;">
          <div style="font-weight: 700; padding: 3px; background: #e5f1fb; color: #0078d7;">Oracle</div>
          <div style="padding: 3px 8px; cursor: pointer;">└ Transactions</div>
          <div style="padding: 3px 8px; cursor: pointer;">└ General</div>
          <div style="padding: 3px 8px; cursor: pointer;">└ Login / Direct</div>
          <div style="font-weight: 700; padding: 3px; margin-top: 6px;">Environment</div>
          <div style="padding: 3px 8px; cursor: pointer;">└ Color Coding</div>
          <div style="padding: 3px 8px; cursor: pointer;">└ Read-Only Mode</div>
          <div style="font-weight: 700; padding: 3px; margin-top: 6px;">Files &amp; AppData</div>
          <div style="padding: 3px 8px; cursor: pointer;">└ User Files</div>
        </div>

        <div style="flex: 1; border: 1px solid #ccc; background: #fff; padding: 12px; overflow-y: auto; font-size: 11.5px; display: flex; flex-direction: column; gap: 10px;">
          <div style="font-weight: 700; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; color: #0078d7;">
            Transactions &amp; Execution Options
          </div>
          <div>
            <input type="checkbox" id="opt-threaded-queries" checked>
            <label for="opt-threaded-queries"><b>Execute queries in threads</b></label>
            <div style="font-size: 10.5px; color: #666; margin-left: 20px;">
              Opens a background session to prevent GUI freeze. Note: Session variables, SYS_CONTEXT, and GTTs may differ between threads.
            </div>
          </div>

          <div>
            <label><b>Commit / Rollback Behaviour on Window Close:</b></label>
            <select class="toad-conn-combobox" style="width: 100%; height: 24px; margin-top: 3px;">
              <option selected>Prompt for Commit / Rollback</option>
              <option>Automatically Commit</option>
              <option>Automatically Rollback</option>
            </select>
          </div>

          <div>
            <label><b>OCI Array Buffer Size (Fetch batch):</b></label>
            <input type="number" id="opt-array-buffer" value="500" style="width: 80px; padding: 2px 4px; margin-left: 8px;"> records
            <div style="font-size: 10.5px; color: #666; margin-top: 2px;">
              Controls records per network roundtrip. 500 balances VPN latency vs RAM consumption.
            </div>
          </div>

          <div style="font-weight: 700; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; color: #0078d7; margin-top: 6px;">
            Connection Color Coding Band
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>PROD Band Color:</span>
            <input type="color" id="opt-color-prod" value="#ef4444" style="width: 40px; height: 24px; border: none; cursor: pointer;">
            <span>UAT:</span>
            <input type="color" id="opt-color-uat" value="#f59e0b" style="width: 40px; height: 24px; border: none; cursor: pointer;">
            <span>DEV:</span>
            <input type="color" id="opt-color-dev" value="#10b981" style="width: 40px; height: 24px; border: none; cursor: pointer;">
          </div>

          <div style="margin-top: 6px;">
            <input type="checkbox" id="opt-read-only-toggle">
            <label for="opt-read-only-toggle" style="color: #b91c1c; font-weight: 700;">Enable Read-Only Safety Mode for Current Session</label>
            <div style="font-size: 10.5px; color: #666; margin-left: 20px;">
              Disables Data Grid editing, hides DROP/ALTER menus, and blocks DML/DDL statements.
            </div>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.applyOptions();">OK</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('Toad Options (Global Preferences)', body, footer, '680px');
  }

  applyOptions() {
    const isReadOnly = document.getElementById('opt-read-only-toggle').checked;
    const prodColor = document.getElementById('opt-color-prod').value;
    
    // Update color band
    const band = document.getElementById('toad-color-band');
    if (band) band.style.backgroundColor = prodColor;

    // Toggle Read-Only Banner
    const banner = document.getElementById('toad-read-only-banner');
    if (banner) banner.classList.toggle('active', isReadOnly);

    this.close();
    window.TracesApp.notify('Toad Options updated and applied.', 'success');
  }

  // 6. Spool SQL to Screen
  openSpoolSql() {
    const listHtml = window.TRACES_DB.spoolSql.map(s => `
      <div style="padding: 4px; border-bottom: 1px solid #e0e0e0; font-family: var(--toad-font-code); font-size: 10.5px;">
        <span style="color: #666;">[${s.time}]</span>
        <span style="color: #0078d7; font-weight: 700;">${s.type}</span>
        <span style="color: #888;">(${s.durationMs} ms)</span>
        <div style="color: #111; margin-top: 2px;">${s.sql}</div>
      </div>
    `).join('');

    const body = `
      <div style="font-size: 11px; margin-bottom: 6px;">
        Real-time capture of internal SQL &amp; OCI calls executed behind the scenes by Toad:
      </div>
      <div style="height: 280px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf; padding: 4px;" id="spool-sql-box">
        ${listHtml}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
        <span style="font-size: 10px; color: #555;">Spooling status: ACTIVE (Capturing OCI trace)</span>
        <div>
          <button class="btn" onclick="document.getElementById('spool-sql-box').innerHTML='';">Clear</button>
          <button class="btn" onclick="window.TracesApp.notify('Spool saved to spool_output.sql', 'success');">Save to File...</button>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Close</button>
    `;

    this.show('Spool SQL - Internal OCI Call Logger', body, footer, '650px');
  }

  // 7. Quest ScriptRunner (QSR / TSR)
  openTsr() {
    const body = `
      <div style="background: #111; color: #33ff33; font-family: var(--toad-font-code); font-size: 11px; padding: 12px; height: 260px; overflow-y: auto; border: 1px solid #333;">
        Toad Script Runner (TSR) v2026.2 - Standalone Executable Engine<br>
        Connected to: SYSTEM@PROD-RAC01 (Dedicated OCI Process)<br>
        ------------------------------------------------------------<br>
        SQL&gt; @execute_batch_payroll.sql<br>
        Processing 107 records in bulk collect batches...<br>
        Row 1..50 processed.<br>
        Row 51..100 processed.<br>
        Row 101..107 processed.<br>
        Commit complete.<br>
        SQL&gt; <span class="animated-pulse-dot" style="display:inline-block; vertical-align:middle;"></span>
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: #555;">
        TSR executes heavy SQL*Plus scripts in an independent OS process, freeing the Toad GUI completely.
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Dismiss TSR</button>
    `;

    this.show('Toad Script Runner (ToadScriptRunner.exe)', body, footer, '600px');
  }

  // 8. TNS Names Editor & TNS Ping
  openTnsEditor() {
    const body = `
      <div style="display: flex; gap: 8px; height: 320px;">
        <div style="width: 200px; border: 1px solid #ccc; background: #fff; padding: 4px; font-size: 11px;">
          <div style="font-weight: 700; margin-bottom: 4px; color: #0078d7;">TNS Aliases in tnsnames.ora:</div>
          <div style="padding: 4px; background: #e5f1fb; cursor: pointer; font-weight: 600;">SALES_PROD</div>
          <div style="padding: 4px; cursor: pointer;">UAT_ORCL19C</div>
          <div style="padding: 4px; cursor: pointer;">DEV_PDB01</div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
          <textarea id="tns-text-box" style="flex: 1; font-family: var(--toad-font-code); font-size: 11px; padding: 8px; border: 1px solid #ccc;">${window.TRACES_DB.tnsNames}</textarea>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <button class="btn btn-primary" onclick="window.TracesApp.toadModals.tnsPing();">Execute TNS Ping</button>
            <span id="tns-ping-result" style="font-weight: 700; font-size: 11px; color: #008000;"></span>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.notify('tnsnames.ora saved successfully.', 'success'); window.TracesApp.toadModals.close();">Save tnsnames.ora</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('TNS Names Editor & Network Diagnostics', body, footer, '680px');
  }

  tnsPing() {
    const res = document.getElementById('tns-ping-result');
    res.textContent = 'Pinging exadata-rac01.corp.internal:1521...';
    res.style.color = '#555';
    setTimeout(() => {
      res.textContent = 'OK (14 msec) - Net8 protocol acknowledged.';
      res.style.color = '#008000';
    }, 300);
  }

  // 9. Sensitive Column Search (LGPD / GDPR)
  openSensitiveSearch() {
    const listHtml = window.TRACES_DB.sensitiveColumns.map(c => `
      <tr>
        <td><b>${c.schema}.${c.table}</b></td>
        <td style="color: #800080; font-weight: 700;">${c.column}</td>
        <td>${c.category}</td>
        <td><span class="toad-conn-badge-indicator" style="background:#fee2e2; color:#b91c1c;">${c.risk}</span></td>
        <td>${c.redactionStatus}</td>
        <td>
          <button class="btn" style="padding: 1px 6px;" onclick="window.TracesApp.notify('Applied DBMS_REDACT policy on ${c.column}', 'success');">Mask</button>
        </td>
      </tr>
    `).join('');

    const body = `
      <div style="font-size: 11px; margin-bottom: 8px;">
        Scanned database dictionary for sensitive identifiers matching regex <code>*SALARY*</code>, <code>*TAX_ID*</code>, <code>*EMAIL*</code>, <code>*PHONE*</code>:
      </div>
      <div style="max-height: 240px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf;">
        <table class="meta-table" style="width: 100%;">
          <thead>
            <tr>
              <th>Object</th>
              <th>Sensitive Column</th>
              <th>Category</th>
              <th>Compliance Risk</th>
              <th>Redaction Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>${listHtml}</tbody>
        </table>
      </div>
      <div style="margin-top: 8px; font-size: 10.5px; color: #555;">
        ℹ <b>DBMS_REDACT:</b> Dynamic Data Masking masks sensitive data on-the-fly at query execution without altering physical blocks.
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.notify('Exported LGPD Compliance Report to PDF.', 'success'); window.TracesApp.toadModals.close();">Export Audit Report</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Close</button>
    `;

    this.show('Sensitive Column Search & Dynamic Data Redaction', body, footer, '720px');
  }

  // 10. Data Pump Wizard
  openDataPumpWizard() {
    const body = `
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
        <div style="font-weight: 700; color: #0078d7;">Oracle Data Pump Export Wizard (DBMS_DATAPUMP / expdp)</div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Export Mode:</label>
          <select class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option>SCHEMA (HR, SALES_ADMIN)</option>
            <option>TABLES (Selected)</option>
            <option>FULL DATABASE</option>
            <option>TABLESPACES (USERS)</option>
          </select>
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Directory Object:</label>
          <input type="text" value="DATA_PUMP_DIR (+DATA/dump)" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Parallelism Degree:</label>
          <input type="number" value="4" style="width: 60px; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Compression:</label>
          <select class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option>ALL (Metadata &amp; Data)</option>
            <option>METADATA_ONLY</option>
            <option>NONE</option>
          </select>
        </div>
        <div>
          <input type="checkbox" id="dp-flashback" checked>
          <label for="dp-flashback"><b>Consistent Export via Flashback SCN</b></label>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.notify('Data Pump Job DBMS_DATAPUMP_01 launched with Parallel=4.', 'success'); window.TracesApp.toadModals.close();">Start Data Pump Job</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('Oracle Data Pump Wizard', body, footer, '540px');
  }

  // 11. SQL*Loader Wizard
  openSqlLoaderWizard() {
    const body = `
      <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px;">
        <div><b>Generate Control File (.ctl) &amp; Execute sqlldr:</b></div>
        <textarea style="height: 160px; font-family: var(--toad-font-code); font-size: 11px; padding: 6px; border: 1px solid #ccc;">LOAD DATA
INFILE 'sales_data_oct2026.csv'
BADFILE 'sales_data.bad'
DISCARDFILE 'sales_data.dsc'
INTO TABLE sales_admin.sales_transactions
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
(tx_id, customer_id, amount, tx_date DATE "YYYY-MM-DD", status)</textarea>
        <div>
          <input type="checkbox" id="sqlldr-direct" checked>
          <label for="sqlldr-direct"><b>DIRECT=TRUE (Direct Path Load bypasses SGA buffer cache)</b></label>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.notify('Executing sqlldr DIRECT=TRUE...', 'success'); window.TracesApp.toadModals.close();">Run SQL*Loader</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('SQL*Loader Control File Wizard', body, footer, '560px');
  }

  // 12. Master-Detail Browser
  openMasterDetail() {
    const body = `
      <div style="display: flex; flex-direction: column; height: 380px; gap: 8px;">
        <div style="height: 140px; border: 1px solid #ccc; display: flex; flex-direction: column; background: #fff;">
          <div style="padding: 4px 8px; background: #e4e4e4; font-weight: 700; font-size: 11px;">Parent: HR.DEPARTMENTS</div>
          <div style="flex: 1; overflow-y: auto;">
            <table class="oracle-data-table" style="width: 100%;">
              <thead><tr><th>DEPARTMENT_ID</th><th>DEPARTMENT_NAME</th><th>MANAGER_ID</th><th>LOCATION_ID</th></tr></thead>
              <tbody>
                <tr class="selected"><td>90</td><td>Executive</td><td>100</td><td>1700</td></tr>
                <tr><td>60</td><td>IT</td><td>103</td><td>1400</td></tr>
                <tr><td>80</td><td>Sales</td><td>145</td><td>2500</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div style="flex: 1; border: 1px solid #ccc; display: flex; flex-direction: column; background: #fff;">
          <div style="padding: 4px 8px; background: #e4e4e4; font-weight: 700; font-size: 11px;">Child: HR.EMPLOYEES (Filtered by DEPARTMENT_ID = 90)</div>
          <div style="flex: 1; overflow-y: auto;">
            <table class="oracle-data-table" style="width: 100%;">
              <thead><tr><th>EMPLOYEE_ID</th><th>FIRST_NAME</th><th>LAST_NAME</th><th>SALARY</th><th>JOB_ID</th></tr></thead>
              <tbody>
                <tr><td>100</td><td>Steven</td><td>King</td><td>24000.00</td><td>AD_PRES</td></tr>
                <tr><td>101</td><td>Neena</td><td>Kochhar</td><td>17000.00</td><td>AD_VP</td></tr>
                <tr><td>102</td><td>Lex</td><td>De Haan</td><td>17000.00</td><td>AD_VP</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Close</button>
    `;

    this.show('Master-Detail Browser (Cascade Table Relations)', body, footer, '720px');
  }

  // 13. Generate Test Data
  openDataGenerator() {
    const body = `
      <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px;">
        <div>Generate realistic test data respecting constraints &amp; foreign keys:</div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 110px;">Target Table:</label>
          <select class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option>HR.EMPLOYEES</option>
            <option>SALES_ADMIN.CUSTOMERS</option>
            <option>SALES_ADMIN.SALES_TRANSACTIONS</option>
          </select>
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 110px;">Number of Rows:</label>
          <input type="number" value="1000" style="width: 80px; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 110px;">Foreign Key Rule:</label>
          <select class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option>Sample from existing parent table (DEPARTMENT_ID)</option>
            <option>Null allowed where applicable</option>
          </select>
        </div>
        <div style="padding: 6px; background: #e5f1fb; border: 1px solid #b8d6f5;">
          Generators: First Name (random Brazilian/English), Email (RFC compliant), Salary (Between $2,500 and $25,000).
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.notify('Generated 1,000 test rows in HR.EMPLOYEES.', 'success'); window.TracesApp.toadModals.close();">Generate &amp; Insert</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('Generate Test Data (Data Generator)', body, footer, '500px');
  }

  // 14. About Toad for Oracle
  openAboutDialog() {
    const body = `
      <div style="display: flex; gap: 16px; align-items: center; padding: 10px;">
        <img src="assets/traces-logo.png" alt="TRACES" style="height: 38px; width: auto;">
        <div>
          <div style="font-size: 14px; font-weight: 700; color: #111;">Toad for Oracle 2026 R2</div>
          <div style="font-size: 11px; color: #666;">DBA Suite &amp; Xpert Edition - Powered by TRACES</div>
          <div style="font-size: 10.5px; color: #444; margin-top: 6px;">
            Connected Database: Oracle Database 23ai Enterprise Edition Release 23.4.0.24.05<br>
            Client Architecture: 64-bit Net8 Direct Connection (OCI.dll supported)<br>
            Rule Universe: Version 5.435 (XPath AST &amp; McCabe Engine)<br>
            Status: Fully licensed with Diagnostic &amp; Tuning Packs.
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">OK</button>
    `;

    this.show('About Toad for Oracle', body, footer, '480px');
  }

  openCodeTemplates() {
    window.TracesApp.notify('Code Templates: cr_tab, cur_for, pkg_spec ready. Type template and press Tab in editor.', 'info');
  }

  openAutoReplace() {
    window.TracesApp.notify('Auto-Replace: Shortcuts configured (e.g. df -> DELETE FROM, sf -> SELECT * FROM).', 'info');
  }

  openFindDialog(replace = false) {
    const term = prompt(replace ? 'Toad Replace: Search for text:' : 'Toad Find: Search for text:');
    if (term) window.TracesApp.notify(`Searching for '${term}' in active worksheet.`, 'info');
  }

  openProjectManager() {
    window.TracesApp.notify('Project Manager: Project workspace open with 3 connections and 12 SQL scripts.', 'info');
  }

  openCloneUser() {
    const user = prompt('Clone User (Create Like)\nEnter template username to duplicate privileges from:', 'HR');
    if (user) window.TracesApp.notify(`Generated CREATE USER DDL replicating roles, grants, and tablespace quotas from ${user}.`, 'success');
  }

  openRmanGenerator() {
    window.TracesApp.notify('RMAN Template: Generated Incremental Level 0 Backup script with ARCHIVELOG ALL DELETE INPUT.', 'info');
  }

  openTkprofWizard() {
    window.TracesApp.notify('TKProf: Formatted trace output sorted by elapsed time (fchela).', 'success');
  }

  openGenerateScript() {
    window.TracesApp.notify('Extracted schema DDL ordered topographically by object dependencies.', 'success');
  }

  openBenchmarkFactory() {
    window.TracesApp.notify('Benchmark Factory: Simulated 250 concurrent virtual users executing TPC-C transactions.', 'info');
  }

  openSchedulerManager() {
    window.TracesApp.notify('DBMS_SCHEDULER: 14 Active Jobs, 4 Chains, 2 Windows scheduled.', 'info');
  }

  openCrontabManager() {
    window.TracesApp.notify('Crontab Manager: Connected via SSH to Oracle Linux host.', 'info');
  }

  openExternalTools() {
    window.TracesApp.notify('External Tools: Mapped PuTTY ($HOST:$PORT), VS Code ($FILEPATH), and Git Bash.', 'info');
  }

  openShortcutsCheatsheet() {
    alert('Toad for Oracle Essential Shortcuts:\n\nF9: Execute Statement (OCI Cursor Grid)\nF5: Execute as Script (SQL*Plus engine)\nCtrl+Enter: Execute statement at cursor\nCtrl+E: Explain Plan\nF4: Describe Object\nF8: SQL Recall (SavedSQL.dat)\nCtrl+Shift+F: Format Code (FmtPlus.opt)\nF11: Commit Transaction\nShift+F11: Rollback Transaction\nCtrl+B: Schema Browser');
  }

  openHtmlDocGen() {
    window.TracesApp.notify('HTML Schema Doc Generator: Built full Javadoc-style static schema documentation in /docs.', 'success');
  }

  openCopyData() {
    window.TracesApp.notify('Copy Data: Direct cursor cross-connection transfer initialized without DBLink.', 'info');
  }
}

window.ToadModals = ToadModals;
