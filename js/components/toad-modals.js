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
    this.currentBindVars = detectedVars;
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
    const params = {};
    if (this.currentBindVars) {
      this.currentBindVars.forEach((v, i) => {
        const valInput = document.getElementById(`bind-val-${i}`);
        const cleanName = v.replace(/^:/, '');
        params[cleanName] = valInput ? valInput.value : '';
      });
    }
    this.close();
    window.TracesApp.sqlEditor.executeWithBinds(params);
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
  async openDescribe(objectName = 'HR.EMPLOYEES') {
    const [schema, name] = objectName.includes('.') ? objectName.split('.') : ['HR', objectName];
    
    // Live dictionary resolution if connected to Oracle
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        const resp = await fetch(`/api/object-details?schema=${encodeURIComponent(schema)}&name=${encodeURIComponent(name)}&type=TABLE`);
        const details = await resp.json();
        if (!details.error) {
          this.activeDescribeObj = details;
          this.renderDescribeModal(schema, name, details);
          return;
        }
      } catch (e) {
        console.warn('Real describe fetch error', e);
      }
    }

    const table = window.TRACES_DB.schemas[schema] ? window.TRACES_DB.schemas[schema].tables.find(t => t.name === name) : null;
    this.activeDescribeObj = table || { columns: [] };
    this.renderDescribeModal(schema, name, this.activeDescribeObj);
  }

  renderDescribeModal(schema, name, obj) {
    const columns = obj.columns || [];
    let columnsHtml = columns.map(c => `
      <tr>
        <td>${c.pk ? '🔑 ' : ''}<b>${c.name}</b></td>
        <td style="color: #2b91af;">${c.type}</td>
        <td>${c.nullable}</td>
        <td>${c.defaultVal || '-'}</td>
        <td style="color: #666;">${c.comments || ''}</td>
      </tr>
    `).join('');

    const body = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 6px; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 13px; color: #0078d7;">${schema}.${name}</span>
        <span class="toad-conn-badge-indicator" style="background:#e0f2fe; color:#0369a1; border-color:#bae6fd;">TABLE [VALID]</span>
      </div>
      <div style="display: flex; gap: 4px; border-bottom: 1px solid #bfbfbf; margin-bottom: 8px; font-size: 11px;">
        <button class="btn active" id="desc-tab-cols" onclick="window.TracesApp.toadModals.switchDescribeTab('cols');" style="font-weight: 700;">Columns (${columns.length})</button>
        <button class="btn" id="desc-tab-indexes" onclick="window.TracesApp.toadModals.switchDescribeTab('indexes');">Indexes (${obj.indexes ? obj.indexes.length : 0})</button>
        <button class="btn" id="desc-tab-constraints" onclick="window.TracesApp.toadModals.switchDescribeTab('constraints');">Constraints (${obj.constraints ? obj.constraints.length : 0})</button>
        <button class="btn" id="desc-tab-ddl" onclick="window.TracesApp.toadModals.switchDescribeTab('ddl');">Script (DDL)</button>
        <button class="btn" id="desc-tab-grants" onclick="window.TracesApp.toadModals.switchDescribeTab('grants');">Grants (${obj.grants ? obj.grants.length : 0})</button>
        <button class="btn" id="desc-tab-part" onclick="window.TracesApp.toadModals.switchDescribeTab('part');">Partitions (${obj.partitions ? obj.partitions.length : 0})</button>
      </div>
      <div id="desc-pane-content" style="height: 250px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf;">
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
          <tbody>${columnsHtml || '<tr><td colspan="5" style="text-align:center; padding:16px;">No columns found</td></tr>'}</tbody>
        </table>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 10px; color: #555;">
        <span>Resolved via ALL_TAB_COLUMNS &amp; ALL_SYNONYMS</span>
        <button class="btn" onclick="window.TracesApp.openObjectInWorksheet('${name}'); window.TracesApp.toadModals.close();">Query Data in Editor (F9)</button>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Close (Esc)</button>
    `;

    this.show(`Describe ${schema}.${name} (F4)`, body, footer, '700px');
  }

  switchDescribeTab(tab) {
    const pane = document.getElementById('desc-pane-content');
    if (!pane || !this.activeDescribeObj) return;

    ['cols', 'indexes', 'constraints', 'ddl', 'grants', 'part'].forEach(t => {
      const btn = document.getElementById(`desc-tab-${t}`);
      if (btn) btn.classList.toggle('active', t === tab);
    });

    const obj = this.activeDescribeObj;
    if (tab === 'cols') {
      const columns = obj.columns || [];
      pane.innerHTML = `
        <table class="meta-table" style="width: 100%;">
          <thead>
            <tr><th>Column Name</th><th>Data Type</th><th>Null?</th><th>Default</th><th>Comments</th></tr>
          </thead>
          <tbody>
            ${columns.map(c => `<tr><td>${c.pk ? '🔑 ' : ''}<b>${c.name}</b></td><td style="color: #2b91af;">${c.type}</td><td>${c.nullable}</td><td>${c.defaultVal || '-'}</td><td>${c.comments || ''}</td></tr>`).join('')}
          </tbody>
        </table>
      `;
    } else if (tab === 'indexes') {
      const idxs = obj.indexes || [];
      pane.innerHTML = `
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Index Name</th><th>Uniqueness</th><th>Columns</th><th>Tablespace</th><th>Status</th></tr></thead>
          <tbody>
            ${idxs.length > 0 ? idxs.map(i => `<tr><td><b>${i.name}</b></td><td>${i.type}</td><td>${i.columns}</td><td>${i.tablespace || '-'}</td><td><span class="status-indicator valid">${i.status || 'VALID'}</span></td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center; padding:16px;">No indexes found</td></tr>'}
          </tbody>
        </table>
      `;
    } else if (tab === 'constraints') {
      const constrs = obj.constraints || [];
      pane.innerHTML = `
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Constraint Name</th><th>Type</th><th>Columns</th><th>Details</th><th>Status</th></tr></thead>
          <tbody>
            ${constrs.length > 0 ? constrs.map(c => `<tr><td><b>${c.name}</b></td><td style="color:#800080; font-weight:700;">${c.type}</td><td>${c.columns || '-'}</td><td>${c.details || '-'}</td><td>${c.status || 'ENABLED'}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center; padding:16px;">No constraints found</td></tr>'}
          </tbody>
        </table>
      `;
    } else if (tab === 'ddl') {
      const ddl = obj.ddl || '-- DDL extraction for object';
      pane.innerHTML = `<pre style="padding: 10px; font-family: var(--toad-font-code); font-size: 11px; margin: 0; line-height: 1.4; white-space: pre-wrap; height: 100%; box-sizing: border-box;">${this.escapeHtml(ddl)}</pre>`;
    } else if (tab === 'grants') {
      const grants = obj.grants || [];
      pane.innerHTML = `
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Grantee</th><th>Privilege</th><th>Grantable</th></tr></thead>
          <tbody>
            ${grants.length > 0 ? grants.map(g => `<tr><td><b>${g.grantee}</b></td><td>${g.privilege}</td><td>${g.grantable}</td></tr>`).join('') : '<tr><td colspan="3" style="text-align:center; padding:16px;">No grants found</td></tr>'}
          </tbody>
        </table>
      `;
    } else if (tab === 'part') {
      const parts = obj.partitions || [];
      pane.innerHTML = `
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th>Partition Name</th><th>Tablespace</th><th>Rows</th><th>High Value</th></tr></thead>
          <tbody>
            ${parts.length > 0 ? parts.map(p => `<tr><td><b>${p.name}</b></td><td>${p.tablespace}</td><td>${(p.numRows || 0).toLocaleString()}</td><td>${p.highValue}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center; padding:16px;">Non-partitioned table</td></tr>'}
          </tbody>
        </table>
      `;
    }
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
        <div style="font-weight: 700; color: #0078d7;">Oracle Data Pump Export &amp; Import Wizard (expdp / impdp)</div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Operation:</label>
          <select id="dp-operation" class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option value="EXPORT">EXPORT (expdp)</option>
            <option value="IMPORT">IMPORT (impdp)</option>
          </select>
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Export Scope:</label>
          <select id="dp-mode" class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option value="SCHEMA">SCHEMA (HR, SALES_ADMIN)</option>
            <option value="TABLES">TABLES (Selected)</option>
            <option value="FULL">FULL DATABASE</option>
            <option value="TABLESPACES">TABLESPACES (USERS)</option>
          </select>
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Directory Object:</label>
          <input id="dp-dir" type="text" value="DATA_PUMP_DIR" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Parallelism Degree:</label>
          <input id="dp-parallel" type="number" value="4" style="width: 60px; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Compression:</label>
          <select id="dp-compression" class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option value="ALL">ALL (Metadata &amp; Data)</option>
            <option value="METADATA_ONLY">METADATA_ONLY</option>
            <option value="NONE">NONE</option>
          </select>
        </div>
        <div>
          <input type="checkbox" id="dp-flashback" checked>
          <label for="dp-flashback"><b>Consistent Export via Flashback SCN (FLASHBACK_TIME=SYSTIMESTAMP)</b></label>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn" onclick="window.TracesApp.toadModals.generateDataPumpScript();">Generate Script to Editor</button>
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.startDataPumpJob();">Start Data Pump Job</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('Oracle Data Pump Wizard', body, footer, '580px');
  }

  generateDataPumpScript() {
    const op = document.getElementById('dp-operation')?.value || 'EXPORT';
    const mode = document.getElementById('dp-mode')?.value || 'SCHEMA';
    const dir = document.getElementById('dp-dir')?.value || 'DATA_PUMP_DIR';
    const par = document.getElementById('dp-parallel')?.value || '4';
    const comp = document.getElementById('dp-compression')?.value || 'ALL';

    const cmd = `${op === 'EXPORT' ? 'expdp' : 'impdp'} \\"sys/*****@ORCL as sysdba\\" \\
  DIRECTORY=${dir} \\
  DUMPFILE=export_${mode.toLowerCase()}_%U.dmp \\
  LOGFILE=${mode.toLowerCase()}_pump.log \\
  SCHEMAS=HR,SALES_ADMIN \\
  PARALLEL=${par} \\
  COMPRESSION=${comp} \\
  FLASHBACK_TIME=SYSTIMESTAMP`;

    const plsql = `DECLARE
  h1 NUMBER;
BEGIN
  h1 := DBMS_DATAPUMP.OPEN(operation => '${op}', mode => '${mode}', job_name => 'TOAD_DP_JOB');
  DBMS_DATAPUMP.ADD_FILE(handle => h1, filename => 'toad_${mode.toLowerCase()}_%U.dmp', directory => '${dir}', filetype => DBMS_DATAPUMP.KU$_FILE_TYPE_DUMP_FILE);
  DBMS_DATAPUMP.ADD_FILE(handle => h1, filename => 'toad_${mode.toLowerCase()}.log', directory => '${dir}', filetype => DBMS_DATAPUMP.KU$_FILE_TYPE_LOG_FILE);
  DBMS_DATAPUMP.SET_PARAMETER(handle => h1, name => 'DEGREE', value => ${par});
  DBMS_DATAPUMP.START_JOB(handle => h1);
END;
/`;

    const full = `-- Oracle Data Pump Command Line:
/*
${cmd}
*/

-- PL/SQL DBMS_DATAPUMP Automation:
${plsql}`;

    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.switchDockView('editor');
      window.TracesApp.sqlEditor.setQuery(full);
      window.TracesApp.notify('Script do Data Pump gerado no Editor SQL.', 'success');
      this.close();
    }
  }

  async startDataPumpJob() {
    if (window.TracesApp?.isRealDatabase) {
      try {
        const resp = await fetch('/api/dba/datapump', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: document.getElementById('dp-operation')?.value || 'EXPORT',
            mode: document.getElementById('dp-mode')?.value || 'SCHEMA',
            directory: document.getElementById('dp-dir')?.value || 'DATA_PUMP_DIR',
            parallel: parseInt(document.getElementById('dp-parallel')?.value || '4', 10),
            compression: document.getElementById('dp-compression')?.value || 'ALL'
          })
        });
        const res = await resp.json();
        window.TracesApp.notify(res.message || 'Job Data Pump iniciado.', 'success');
        this.close();
      } catch (e) {
        window.TracesApp.notify(`Erro: ${e.message}`, 'error');
      }
    } else {
      window.TracesApp.notify('Job Data Pump DBMS_DATAPUMP_01 iniciado com Parallel=4 (Mock).', 'success');
      this.close();
    }
  }

  // 11. SQL*Loader Wizard
  openSqlLoaderWizard() {
    const body = `
      <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px;">
        <div style="font-weight: 700; color: #0078d7;">Generate SQL*Loader Control File (.ctl) &amp; Execution Command</div>
        <textarea id="sqlldr-ctl" style="height: 140px; font-family: var(--toad-font-code); font-size: 11px; padding: 6px; border: 1px solid #ccc;">LOAD DATA
INFILE 'sales_data_oct2026.csv'
BADFILE 'sales_data.bad'
DISCARDFILE 'sales_data.dsc'
INTO TABLE sales_admin.sales_transactions
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
(tx_id, customer_id, amount, tx_date DATE "YYYY-MM-DD", status)</textarea>
        <div style="display: flex; gap: 12px;">
          <div>
            <input type="checkbox" id="sqlldr-direct" checked>
            <label for="sqlldr-direct"><b>DIRECT=TRUE (Direct Path Load)</b></label>
          </div>
          <div>
            <input type="checkbox" id="sqlldr-multithread" checked>
            <label for="sqlldr-multithread"><b>MULTITHREADING=TRUE</b></label>
          </div>
        </div>
        <div style="background: #e5f1fb; padding: 6px; border: 1px solid #b8d6f5;">
          Direct Path bypasses the SGA buffer cache and formats data blocks directly, maximizing ingest speed for millions of rows.
        </div>
      </div>
    `;

    const footer = `
      <button class="btn" onclick="window.TracesApp.toadModals.sendSqlLoaderToEditor();">Send .ctl to Editor</button>
      <button class="btn btn-primary" onclick="window.TracesApp.notify('Executando sqlldr DIRECT=TRUE...', 'success'); window.TracesApp.toadModals.close();">Run SQL*Loader</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('SQL*Loader Control File Wizard', body, footer, '580px');
  }

  sendSqlLoaderToEditor() {
    const ctl = document.getElementById('sqlldr-ctl')?.value || '';
    const script = `-- SQL*Loader Control File (.ctl)
/*
${ctl}
*/

-- Host execution command:
-- sqlldr userid=sales_admin/*****@ORCL control=sales_data.ctl direct=true log=sales_load.log
`;
    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.switchDockView('editor');
      window.TracesApp.sqlEditor.setQuery(script);
      window.TracesApp.notify('Arquivo de controle do SQL*Loader enviado para o Editor SQL.', 'success');
      this.close();
    }
  }

  // 12. Master-Detail Browser
  openMasterDetail() {
    const body = `
      <div style="display: flex; flex-direction: column; height: 380px; gap: 8px;">
        <div style="height: 140px; border: 1px solid #ccc; display: flex; flex-direction: column; background: #fff;">
          <div style="padding: 4px 8px; background: #e4e4e4; font-weight: 700; font-size: 11px;">Parent: HR.DEPARTMENTS (Click to Filter Children)</div>
          <div style="flex: 1; overflow-y: auto;">
            <table class="oracle-data-table" style="width: 100%;">
              <thead><tr><th>DEPARTMENT_ID</th><th>DEPARTMENT_NAME</th><th>MANAGER_ID</th><th>LOCATION_ID</th></tr></thead>
              <tbody>
                <tr class="selected" style="background:#e0f2fe; cursor:pointer;" onclick="window.TracesApp.toadModals.filterMasterDetail(90);"><td>90</td><td>Executive</td><td>100</td><td>1700</td></tr>
                <tr style="cursor:pointer;" onclick="window.TracesApp.toadModals.filterMasterDetail(60);"><td>60</td><td>IT</td><td>103</td><td>1400</td></tr>
                <tr style="cursor:pointer;" onclick="window.TracesApp.toadModals.filterMasterDetail(80);"><td>80</td><td>Sales</td><td>145</td><td>2500</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div style="flex: 1; border: 1px solid #ccc; display: flex; flex-direction: column; background: #fff;">
          <div id="md-child-header" style="padding: 4px 8px; background: #e4e4e4; font-weight: 700; font-size: 11px;">Child: HR.EMPLOYEES (Filtered by DEPARTMENT_ID = 90)</div>
          <div style="flex: 1; overflow-y: auto;">
            <table class="oracle-data-table" style="width: 100%;">
              <thead><tr><th>EMPLOYEE_ID</th><th>FIRST_NAME</th><th>LAST_NAME</th><th>SALARY</th><th>JOB_ID</th></tr></thead>
              <tbody id="md-child-tbody">
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

  filterMasterDetail(deptId) {
    const hdr = document.getElementById('md-child-header');
    const tbody = document.getElementById('md-child-tbody');
    if (hdr) hdr.textContent = `Child: HR.EMPLOYEES (Filtered by DEPARTMENT_ID = ${deptId})`;
    if (tbody) {
      if (deptId === 60) {
        tbody.innerHTML = `
          <tr><td>103</td><td>Alexander</td><td>Hunold</td><td>9000.00</td><td>IT_PROG</td></tr>
          <tr><td>104</td><td>Bruce</td><td>Ernst</td><td>6000.00</td><td>IT_PROG</td></tr>
          <tr><td>105</td><td>David</td><td>Austin</td><td>4800.00</td><td>IT_PROG</td></tr>
        `;
      } else if (deptId === 80) {
        tbody.innerHTML = `
          <tr><td>145</td><td>John</td><td>Russell</td><td>14000.00</td><td>SA_MAN</td></tr>
          <tr><td>146</td><td>Karen</td><td>Partners</td><td>13500.00</td><td>SA_MAN</td></tr>
          <tr><td>176</td><td>Jonathon</td><td>Taylor</td><td>8600.00</td><td>SA_REP</td></tr>
        `;
      } else {
        tbody.innerHTML = `
          <tr><td>100</td><td>Steven</td><td>King</td><td>24000.00</td><td>AD_PRES</td></tr>
          <tr><td>101</td><td>Neena</td><td>Kochhar</td><td>17000.00</td><td>AD_VP</td></tr>
          <tr><td>102</td><td>Lex</td><td>De Haan</td><td>17000.00</td><td>AD_VP</td></tr>
        `;
      }
    }
  }

  // 13. Generate Test Data
  openDataGenerator() {
    const body = `
      <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px;">
        <div>Generate realistic test data respecting constraints &amp; foreign keys:</div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 110px;">Target Table:</label>
          <select id="gen-table" class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option value="HR.EMPLOYEES">HR.EMPLOYEES</option>
            <option value="SALES_ADMIN.CUSTOMERS">SALES_ADMIN.CUSTOMERS</option>
            <option value="SALES_ADMIN.SALES_TRANSACTIONS">SALES_ADMIN.SALES_TRANSACTIONS</option>
          </select>
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 110px;">Number of Rows:</label>
          <input id="gen-rows" type="number" value="1000" style="width: 80px; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 110px;">Foreign Key Rule:</label>
          <select class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option>Sample from existing parent table (DEPARTMENT_ID)</option>
            <option>Null allowed where applicable</option>
          </select>
        </div>
        <div style="padding: 6px; background: #e5f1fb; border: 1px solid #b8d6f5;">
          Generators: First Name (Brazilian/English), Email (RFC compliant), Salary (Between $2,500 and $25,000).
        </div>
      </div>
    `;

    const footer = `
      <button class="btn" onclick="window.TracesApp.toadModals.generateDatagenScript();">Generate Script to Editor</button>
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.executeDataGeneration();">Generate &amp; Insert</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('Generate Test Data (Data Generator)', body, footer, '540px');
  }

  generateDatagenScript() {
    const table = document.getElementById('gen-table')?.value || 'HR.EMPLOYEES';
    const rows = document.getElementById('gen-rows')?.value || '1000';
    const plsql = `-- Toad for Oracle 2026 R2 - Synthetic Data Generator Block
-- Utilizing TOAD_DATAGEN (data_gen.pks/pkb) / DBMS_RANDOM engine specifications
DECLARE
  v_count NUMBER := ${rows};
BEGIN
  FOR i IN 1..v_count LOOP
    INSERT INTO ${table} (
      EMPLOYEE_ID, FIRST_NAME, LAST_NAME, EMAIL, SALARY, DEPARTMENT_ID, HIRE_DATE
    ) VALUES (
      20000 + i,
      CASE MOD(i, 5) WHEN 0 THEN 'Carlos' WHEN 1 THEN 'Mariana' WHEN 2 THEN 'Rafael' WHEN 3 THEN 'Fernanda' ELSE 'Lucas' END,
      CASE MOD(i, 4) WHEN 0 THEN 'Silva' WHEN 1 THEN 'Santos' WHEN 2 THEN 'Oliveira' ELSE 'Souza' END,
      'user_' || i || '@empresa.com.br',
      ROUND(DBMS_RANDOM.VALUE(3500, 18500), 2),
      CASE MOD(i, 3) WHEN 0 THEN 10 WHEN 1 THEN 20 ELSE 30 END,
      TRUNC(SYSDATE - DBMS_RANDOM.VALUE(30, 1800))
    );
    
    IF MOD(i, 500) = 0 THEN
      COMMIT;
    END IF;
  END LOOP;
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('Successfully inserted ' || v_count || ' synthetic test records into ${table}.');
END;
/`;
    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.switchDockView('editor');
      window.TracesApp.sqlEditor.setQuery(plsql);
      window.TracesApp.notify(`Script de geração de dados para ${table} inserido no Editor.`, 'success');
      this.close();
    }
  }

  executeDataGeneration() {
    const table = document.getElementById('gen-table')?.value || 'HR.EMPLOYEES';
    const rows = document.getElementById('gen-rows')?.value || '1000';
    window.TracesApp.notify(`Geradas ${rows} linhas de teste sintéticas para ${table} respeitando constraints.`, 'success');
    this.close();
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
            Status: Unrestricted (Traces Edition) - Full DBA Suite &amp; Xpert Capabilities.
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">OK</button>
    `;

    this.show('About Toad for Oracle', body, footer, '480px');
  }

  // 15. Clone User Wizard (Create Like)
  openCloneUser() {
    const body = `
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
        <div style="font-weight: 700; color: #0078d7;">Clone Oracle User / Role (Create Like Wizard)</div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 130px;">Template (Source User):</label>
          <input id="clone-src-user" type="text" value="HR" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc; font-weight:700;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 130px;">New Username:</label>
          <input id="clone-tgt-user" type="text" value="HR_COPY" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc; font-weight:700;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 130px;">Temporary Password:</label>
          <input id="clone-pwd" type="password" value="Oracle2026#Temp" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 130px;">Default Tablespace:</label>
          <input id="clone-ts" type="text" value="USERS" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div>
          <input type="checkbox" id="clone-roles" checked>
          <label for="clone-roles">Replicate Granted Roles (DBA_ROLE_PRIVS)</label>
        </div>
        <div>
          <input type="checkbox" id="clone-sysprivs" checked>
          <label for="clone-sysprivs">Replicate System Privileges (DBA_SYS_PRIVS)</label>
        </div>
        <div>
          <input type="checkbox" id="clone-tabprivs" checked>
          <label for="clone-tabprivs">Replicate Object Grants (DBA_TAB_PRIVS)</label>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.generateCloneUserScript();">Generate Script to Editor</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('Clone User Wizard (Create Like)', body, footer, '540px');
  }

  generateCloneUserScript() {
    const src = document.getElementById('clone-src-user')?.value || 'HR';
    const tgt = document.getElementById('clone-tgt-user')?.value || 'HR_COPY';
    const pwd = document.getElementById('clone-pwd')?.value || 'Oracle2026#Temp';
    const ts = document.getElementById('clone-ts')?.value || 'USERS';

    const sql = `-- Toad Clone User DDL (Replicated from ${src})
CREATE USER ${tgt} IDENTIFIED BY "${pwd}"
  DEFAULT TABLESPACE ${ts}
  TEMPORARY TABLESPACE TEMP
  QUOTA UNLIMITED ON ${ts}
  PASSWORD EXPIRE;

-- Replicated Role Privileges:
GRANT CONNECT, RESOURCE TO ${tgt};

-- Replicated System Privileges:
GRANT CREATE VIEW, CREATE PROCEDURE, CREATE SEQUENCE TO ${tgt};

-- Replicated Object Grants:
GRANT SELECT, INSERT, UPDATE, DELETE ON ${src}.EMPLOYEES TO ${tgt};
GRANT SELECT ON ${src}.DEPARTMENTS TO ${tgt};
`;
    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.switchDockView('editor');
      window.TracesApp.sqlEditor.setQuery(sql);
      window.TracesApp.notify(`Script de clonagem do usuário ${src} para ${tgt} gerado no Editor.`, 'success');
      this.close();
    }
  }

  // 16. RMAN Script Generator
  openRmanGenerator() {
    const body = `
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
        <div style="font-weight: 700; color: #0078d7;">RMAN Backup &amp; Recovery Template Generator</div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 130px;">Backup Level:</label>
          <select id="rman-level" class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option value="0">Incremental Level 0 (Full Baseline)</option>
            <option value="1">Incremental Level 1 (Differential)</option>
            <option value="ARCH">Archive Logs Only</option>
          </select>
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 130px;">Parallel Channels:</label>
          <input id="rman-channels" type="number" value="4" style="width: 60px; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 130px;">Compression Algorithm:</label>
          <select id="rman-comp" class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option value="BASIC">BASIC (ZLIB)</option>
            <option value="HIGH">HIGH (BZIP2 / Advanced Compression)</option>
            <option value="MEDIUM">MEDIUM (ZSTD)</option>
          </select>
        </div>
        <div>
          <input type="checkbox" id="rman-delete-input" checked>
          <label for="rman-delete-input"><b>DELETE ALL INPUT (Purge archived logs after backup)</b></label>
        </div>
        <div>
          <input type="checkbox" id="rman-plus-arch" checked>
          <label for="rman-plus-arch"><b>PLUS ARCHIVELOG</b></label>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.generateRmanScript();">Generate RMAN Script to Editor</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('RMAN Template Generator & Script Builder', body, footer, '540px');
  }

  generateRmanScript() {
    const lvl = document.getElementById('rman-level')?.value || '0';
    const chan = parseInt(document.getElementById('rman-channels')?.value || '4', 10);
    const comp = document.getElementById('rman-comp')?.value || 'BASIC';

    let allocs = '';
    for (let i = 1; i <= chan; i++) {
      allocs += `  ALLOCATE CHANNEL c${i} DEVICE TYPE DISK FORMAT '+RECO/backup_%U';\n`;
    }

    const script = `-- Toad RMAN Script Generator
RUN {
${allocs}
  BACKUP AS COMPRESSED BACKUPSET
    INCREMENTAL LEVEL ${lvl}
    DATABASE
    PLUS ARCHIVELOG DELETE ALL INPUT;

  CROSSCHECK BACKUP;
  DELETE NOPROMPT OBSOLETE;
}
`;
    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.switchDockView('editor');
      window.TracesApp.sqlEditor.setQuery(script);
      window.TracesApp.notify('Script RMAN gerado no Editor.', 'success');
      this.close();
    }
  }

  // 17. TKProf Wizard
  openTkprofWizard() {
    const body = `
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
        <div style="font-weight: 700; color: #0078d7;">TKProf Trace Analyzer Wizard (Event 10046 Profiling)</div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Trace File (.trc):</label>
          <input id="tk-input" type="text" value="/u01/app/oracle/diag/rdbms/orcl/ORCL/trace/orcl_ora_14829.trc" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Output Text (.prf):</label>
          <input id="tk-output" type="text" value="tkprof_analysis_output.prf" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Sort Order:</label>
          <select id="tk-sort" class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option value="fchela">fchela (Elapsed time spent fetching)</option>
            <option value="exeela">exeela (Elapsed time executing)</option>
            <option value="prscpu">prscpu (CPU time parsing)</option>
            <option value="exeqry">exeqry (Number of consistent reads)</option>
          </select>
        </div>
        <div>
          <input type="checkbox" id="tk-sys" checked>
          <label for="tk-sys"><b>SYS=NO (Exclude internal dictionary recursive queries)</b></label>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.generateTkprofCommand();">Generate Command to Editor</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('TKProf Trace Analyzer Wizard', body, footer, '560px');
  }

  generateTkprofCommand() {
    const inp = document.getElementById('tk-input')?.value || 'trace.trc';
    const out = document.getElementById('tk-output')?.value || 'output.prf';
    const sort = document.getElementById('tk-sort')?.value || 'fchela';

    const cmd = `-- TKProf Analysis Command Line:
-- tkprof ${inp} ${out} sort=${sort} sys=no explain=hr/hr@ORCL

-- Generated TKProf Top Section:
/*
OVERALL TOTALS FOR ALL NON-RECURSIVE STATEMENTS

call     count       cpu    elapsed       disk      query    current        rows
------- ------  -------- ---------- ---------- ---------- ----------  ----------
Parse        1      0.00       0.00          0          0          0           0
Execute      1      0.00       0.00          0          0          0           0
Fetch       15      0.01       0.03          4        184          0         107
------- ------  -------- ---------- ---------- ---------- ----------  ----------
total       17      0.01       0.03          4        184          0         107

Misses in library cache during parse: 0
Optimizer mode: ALL_ROWS
Parsing user id: 104  (HR)
*/`;
    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.switchDockView('editor');
      window.TracesApp.sqlEditor.setQuery(cmd);
      window.TracesApp.notify('Comando TKProf e análise inicial gerados no Editor.', 'success');
      this.close();
    }
  }

  // 18. Generate Schema DDL Script
  openGenerateScript() {
    const body = `
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
        <div style="font-weight: 700; color: #0078d7;">Generate Topological Schema DDL Script (DBMS_METADATA)</div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Target Schema:</label>
          <input id="gen-ddl-schema" type="text" value="HR" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc; font-weight:700;">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 6px; background:#fff; border:1px solid #ccc;">
          <div><input type="checkbox" id="g-tables" checked> <label for="g-tables">Tables &amp; Constraints</label></div>
          <div><input type="checkbox" id="g-indexes" checked> <label for="g-indexes">Indexes</label></div>
          <div><input type="checkbox" id="g-views" checked> <label for="g-views">Views</label></div>
          <div><input type="checkbox" id="g-packages" checked> <label for="g-packages">Packages &amp; Procedures</label></div>
          <div><input type="checkbox" id="g-triggers" checked> <label for="g-triggers">Triggers</label></div>
          <div><input type="checkbox" id="g-grants" checked> <label for="g-grants">Grants &amp; Synonyms</label></div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.generateSchemaDdlScript();">Generate Schema Script to Editor</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('Generate Schema DDL Script Wizard', body, footer, '500px');
  }

  generateSchemaDdlScript() {
    const schema = document.getElementById('gen-ddl-schema')?.value || 'HR';
    const sql = `-- Toad Topological Schema DDL Script
-- Extracted via DBMS_METADATA.GET_DDL for Schema: ${schema}

SET DEFINE OFF;

-- ===================================================
-- 1. TABLES & PRIMARY KEYS
-- ===================================================
CREATE TABLE ${schema}.DEPARTMENTS (
    DEPARTMENT_ID NUMBER(4) CONSTRAINT DEPT_ID_PK PRIMARY KEY,
    DEPARTMENT_NAME VARCHAR2(30) NOT NULL,
    MANAGER_ID NUMBER(6),
    LOCATION_ID NUMBER(4)
);

CREATE TABLE ${schema}.EMPLOYEES (
    EMPLOYEE_ID NUMBER(6) CONSTRAINT EMP_EMP_ID_PK PRIMARY KEY,
    FIRST_NAME VARCHAR2(20),
    LAST_NAME VARCHAR2(25) NOT NULL,
    EMAIL VARCHAR2(25) NOT NULL CONSTRAINT EMP_EMAIL_UK UNIQUE,
    PHONE_NUMBER VARCHAR2(20),
    HIRE_DATE DATE NOT NULL,
    JOB_ID VARCHAR2(10) NOT NULL,
    SALARY NUMBER(8,2),
    COMMISSION_PCT NUMBER(2,2),
    MANAGER_ID NUMBER(6),
    DEPARTMENT_ID NUMBER(4) CONSTRAINT EMP_DEPT_FK REFERENCES ${schema}.DEPARTMENTS(DEPARTMENT_ID)
);

-- ===================================================
-- 2. INDEXES
-- ===================================================
CREATE INDEX ${schema}.EMP_DEPARTMENT_IX ON ${schema}.EMPLOYEES(DEPARTMENT_ID);
CREATE INDEX ${schema}.EMP_NAME_IX ON ${schema}.EMPLOYEES(LAST_NAME, FIRST_NAME);

-- ===================================================
-- 3. GRANTS
-- ===================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ${schema}.EMPLOYEES TO PUBLIC;
GRANT SELECT ON ${schema}.DEPARTMENTS TO PUBLIC;
`;
    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.switchDockView('editor');
      window.TracesApp.sqlEditor.setQuery(sql);
      window.TracesApp.notify(`Script DDL do Schema ${schema} gerado com sucesso no Editor.`, 'success');
      this.close();
    }
  }

  // 19. Benchmark Factory
  openBenchmarkFactory() {
    const body = `
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
        <div style="font-weight: 700; color: #0078d7;">Quest Benchmark Factory for Oracle</div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 130px;">Workload Profile:</label>
          <select id="bm-workload" class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option>TPC-C Standard OLTP Workload (New-Order, Payment)</option>
            <option>TPC-E Financial Brokerage Benchmark</option>
            <option>Custom SQL Workload Replay from SQL Editor</option>
          </select>
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 130px;">Virtual Users:</label>
          <input id="bm-users" type="range" min="10" max="500" value="100" style="flex: 1;" oninput="document.getElementById('bm-u-val').textContent = this.value + ' Users';">
          <span id="bm-u-val" style="width: 70px; font-weight:700;">100 Users</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 130px;">Duration:</label>
          <input type="text" value="5 minutes (Ramp-up 30s)" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div id="bm-results" style="background:#fff; border:1px solid #ccc; padding:8px; display:none;">
          <div style="font-weight:700; color:#008000; margin-bottom:4px;">Benchmark Run Complete:</div>
          <div>Throughput: <b>1,482 Transactions / sec (TPS)</b></div>
          <div>Average Response Time: <b>4.2 ms</b></div>
          <div>Error Rate: <b>0.00%</b></div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.runBenchmarkSimulation();">Run Benchmark</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Close</button>
    `;

    this.show('Benchmark Factory for Oracle Database', body, footer, '540px');
  }

  runBenchmarkSimulation() {
    const res = document.getElementById('bm-results');
    if (res) {
      res.style.display = 'block';
      window.TracesApp.notify('Executando teste de carga com 100 usuários virtuais concorrentes...', 'info');
    }
  }

  // 20. Scheduler Manager (DBMS_SCHEDULER)
  openSchedulerManager() {
    const body = `
      <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px;">
        <div style="font-weight: 700; color: #0078d7;">Oracle Scheduler Manager (DBMS_SCHEDULER &amp; DBA_SCHEDULER_JOBS)</div>
        <div style="max-height: 240px; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf;">
          <table class="meta-table" style="width: 100%;">
            <thead><tr><th>Job Name</th><th>State</th><th>Last Run</th><th>Next Run</th><th>Repeat Interval</th><th>Actions</th></tr></thead>
            <tbody>
              <tr>
                <td><b>DAILY_SALES_AGG</b></td>
                <td><span style="color:#008000; font-weight:700;">SCHEDULED</span></td>
                <td>2026-10-18 01:00:00</td>
                <td>2026-10-19 01:00:00</td>
                <td>FREQ=DAILY;BYHOUR=1</td>
                <td><button class="btn" onclick="window.TracesApp.notify('DBMS_SCHEDULER.RUN_JOB(DAILY_SALES_AGG) executado.', 'success');">Run Now</button></td>
              </tr>
              <tr>
                <td><b>PURGE_AUDIT_LOGS</b></td>
                <td><span style="color:#008000; font-weight:700;">SCHEDULED</span></td>
                <td>2026-10-18 03:00:00</td>
                <td>2026-10-19 03:00:00</td>
                <td>FREQ=DAILY;BYHOUR=3</td>
                <td><button class="btn" onclick="window.TracesApp.notify('DBMS_SCHEDULER.RUN_JOB(PURGE_AUDIT_LOGS) executado.', 'success');">Run Now</button></td>
              </tr>
              <tr>
                <td><b>GATHER_STATS_JOB</b></td>
                <td><span style="color:#666;">DISABLED</span></td>
                <td>2026-10-17 22:00:00</td>
                <td>-</td>
                <td>FREQ=WEEKLY;BYDAY=SUN</td>
                <td><button class="btn" onclick="window.TracesApp.notify('DBMS_SCHEDULER.ENABLE(GATHER_STATS_JOB) executado.', 'info');">Enable</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Close</button>
    `;

    this.show('Oracle Scheduler Manager (DBMS_SCHEDULER)', body, footer, '680px');
  }

  openCrontabManager() {
    const jobs = [
      { sched: '0 2 * * *', cmd: '/u01/app/oracle/scripts/daily_rman_lvl0.sh', desc: 'Daily Level 0 RMAN Backup (02:00)' },
      { sched: '*/15 * * * *', cmd: '/u01/app/oracle/scripts/archive_gap_monitor.sh', desc: 'Data Guard Archive Log Gap Check (Every 15m)' },
      { sched: '0 6 * * 0', cmd: '/u01/app/oracle/scripts/gather_system_stats.sh', desc: 'Weekly Oracle Dictionary Stats (Sun 06:00)' },
      { sched: '30 23 * * *', cmd: '/u01/app/oracle/scripts/purge_audit_logs.sh', desc: 'Audit Trail Cleanup (> 90 days retention)' }
    ];

    const body = `
      <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 700; color: #0078d7;">Linux / Unix Server Crontab Manager (Oracle Host)</div>
          <span style="font-size: 10.5px; color: #666;">Host: sales-prod.oracle.corp (User: oracle)</span>
        </div>
        <div style="background: #fff; border: 1px solid #bfbfbf; max-height: 200px; overflow-y: auto;">
          <table class="meta-table" style="width: 100%;">
            <thead><tr><th style="width: 110px;">Schedule</th><th>Command Script</th><th>Description</th></tr></thead>
            <tbody>
              ${jobs.map(j => `
                <tr>
                  <td style="font-family: var(--toad-font-code); font-weight: 600; color: #0284c7;">${j.sched}</td>
                  <td style="font-family: var(--toad-font-code);">${j.cmd}</td>
                  <td>${j.desc}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; background: #f8fafc; padding: 6px; border: 1px solid #e2e8f0;">
          <input id="new-cron-sched" type="text" placeholder="* * * * *" style="width: 90px; padding: 2px 4px; font-family: var(--toad-font-code); border: 1px solid #ccc;">
          <input id="new-cron-cmd" type="text" placeholder="/path/to/script.sh" style="flex: 1; padding: 2px 4px; font-family: var(--toad-font-code); border: 1px solid #ccc;">
          <button class="btn" onclick="window.TracesApp.notify('Novo cronjob registrado com sucesso no host.', 'success');">+ Adicionar Cron</button>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.notify('Crontab salvo e ativado no servidor Oracle Linux.', 'success'); window.TracesApp.toadModals.close();">Save Crontab to Host</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('Unix / Linux Crontab Manager - Toad for Oracle', body, footer, '680px');
  }

  openExternalTools() {
    const tools = [
      { name: 'PuTTY / SSH Bastion', path: '/usr/bin/ssh', args: '$USER@$HOST -p $PORT' },
      { name: 'Visual Studio Code', path: '/Applications/Visual Studio Code.app', args: '$FILE' },
      { name: 'Git Bash / Terminal', path: '/bin/zsh', args: '--login' },
      { name: 'SQL*Plus Interactive CLI', path: '$ORACLE_HOME/bin/sqlplus', args: '$USER/$PASS@$TNS' },
      { name: 'Oracle SQL Developer', path: '/Applications/SQLDeveloper.app', args: '' }
    ];

    const body = `
      <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px;">
        <div style="font-weight: 700; color: #0078d7;">Configure External Applications &amp; Command Line Tools</div>
        <div style="background: #fff; border: 1px solid #bfbfbf; max-height: 180px; overflow-y: auto;">
          <table class="meta-table" style="width: 100%;">
            <thead><tr><th>Tool Name</th><th>Executable Path</th><th>Parameters / Macros</th></tr></thead>
            <tbody>
              ${tools.map(t => `
                <tr>
                  <td style="font-weight: 600;">${t.name}</td>
                  <td style="font-family: var(--toad-font-code);">${t.path}</td>
                  <td style="font-family: var(--toad-font-code); color: #0284c7;">${t.args}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="font-size: 10px; color: #666; background: #e0f2fe; padding: 6px; border: 1px solid #bae6fd;">
          Macros disponíveis: <code>$HOST</code>, <code>$PORT</code>, <code>$USER</code>, <code>$TNS</code>, <code>$FILE</code>, <code>$ORACLE_HOME</code>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.notify('Executando ferramenta externa selecionada...', 'info'); window.TracesApp.toadModals.close();">Launch Selected Tool</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Close</button>
    `;

    this.show('Configure External Tools - Toad for Oracle', body, footer, '620px');
  }

  openShortcutsCheatsheet() {
    const body = `
      <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px; max-height: 420px; overflow-y: auto;">
        <div style="font-weight: 700; color: #0078d7;">Toad for Oracle 2026 R2 - Keybindings &amp; Keyboard Shortcuts</div>
        
        <table class="meta-table" style="width: 100%; margin-bottom: 6px;">
          <thead><tr><th colspan="2" style="background: #e2e8f0; color: #334155;">SQL Editor &amp; Query Execution</th></tr></thead>
          <tbody>
            <tr><td style="font-weight: 700; width: 140px; font-family: var(--toad-font-code);">F9</td><td>Execute current statement at cursor into Data Grid (OCI Cursor)</td></tr>
            <tr><td style="font-weight: 700; font-family: var(--toad-font-code);">F5</td><td>Execute entire worksheet as SQL*Plus script (Script Output)</td></tr>
            <tr><td style="font-weight: 700; font-family: var(--toad-font-code);">Ctrl + Enter</td><td>Execute statement at cursor</td></tr>
            <tr><td style="font-weight: 700; font-family: var(--toad-font-code);">Ctrl + E</td><td>Visual Explain Plan &amp; Cost Analysis</td></tr>
            <tr><td style="font-weight: 700; font-family: var(--toad-font-code);">F4</td><td>Describe Object (Popup table columns, indexes, DDL)</td></tr>
            <tr><td style="font-weight: 700; font-family: var(--toad-font-code);">F8</td><td>SQL Recall history (SavedSQL.dat)</td></tr>
            <tr><td style="font-weight: 700; font-family: var(--toad-font-code);">Ctrl + Shift + F</td><td>Format SQL Code (FmtPlus Beautifier)</td></tr>
            <tr><td style="font-weight: 700; font-family: var(--toad-font-code);">F11</td><td>Commit Active Transaction</td></tr>
            <tr><td style="font-weight: 700; font-family: var(--toad-font-code);">Shift + F11</td><td>Rollback Active Transaction</td></tr>
          </tbody>
        </table>

        <table class="meta-table" style="width: 100%;">
          <thead><tr><th colspan="2" style="background: #e2e8f0; color: #334155;">Navigation &amp; Windows</th></tr></thead>
          <tbody>
            <tr><td style="font-weight: 700; width: 140px; font-family: var(--toad-font-code);">Ctrl + B</td><td>Open Schema Browser</td></tr>
            <tr><td style="font-weight: 700; font-family: var(--toad-font-code);">Ctrl + T</td><td>New SQL Worksheet Tab</td></tr>
            <tr><td style="font-weight: 700; font-family: var(--toad-font-code);">Ctrl + W</td><td>Close Current Tab</td></tr>
            <tr><td style="font-weight: 700; font-family: var(--toad-font-code);">Ctrl + F</td><td>Find text in active worksheet</td></tr>
            <tr><td style="font-weight: 700; font-family: var(--toad-font-code);">Ctrl + R</td><td>Find and Replace text</td></tr>
            <tr><td style="font-weight: 700; font-family: var(--toad-font-code);">F1</td><td>Help Topics &amp; Reference</td></tr>
          </tbody>
        </table>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Close</button>
    `;

    this.show('Toad Keyboard Shortcuts Cheatsheet', body, footer, '580px');
  }

  openHtmlDocGen() {
    const body = `
      <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px;">
        <div style="font-weight: 700; color: #0078d7;">HTML Schema Documentation Generator</div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 110px;">Target Schemas:</label>
          <input type="text" id="doc-schemas" value="HR, SALES_ADMIN" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="border: 1px solid #e2e8f0; padding: 8px; background: #f8fafc; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
          <label><input type="checkbox" checked> Tables &amp; Column Comments</label>
          <label><input type="checkbox" checked> Primary &amp; Foreign Key Constraints</label>
          <label><input type="checkbox" checked> B-Tree &amp; Bitmap Indexes</label>
          <label><input type="checkbox" checked> Views &amp; Materialized Views</label>
          <label><input type="checkbox" checked> Packages, Procedures &amp; Functions</label>
          <label><input type="checkbox" checked> Interactive SVG ER Diagram</label>
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 110px;">Output Path:</label>
          <input type="text" value="./docs/schema_documentation.html" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="
        const schemas = document.getElementById('doc-schemas').value;
        const html = '<!DOCTYPE html><html><head><title>Oracle Schema Documentation - ' + schemas + '</title></head><body style=\\'font-family:sans-serif;padding:20px;\\'><h1>Schema Documentation: ' + schemas + '</h1><p>Gerado via Traces Toad for Oracle Engine.</p><h2>Tabelas</h2><ul><li>HR.EMPLOYEES (107 linhas, 11 colunas)</li><li>HR.DEPARTMENTS (27 linhas, 4 colunas)</li><li>SALES_ADMIN.CUSTOMERS (12.450 linhas, 8 colunas)</li></ul></body></html>';
        const blob = new Blob([html], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'schema_documentation.html';
        a.click();
        window.TracesApp.notify('Documentação HTML gerada e baixada com sucesso!', 'success');
        window.TracesApp.toadModals.close();
      ">Generate &amp; Download HTML Doc</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('HTML Schema Documentation Wizard', body, footer, '540px');
  }

  openCopyData() {
    const body = `
      <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px;">
        <div style="font-weight: 700; color: #0078d7;">Copy Table Data between Databases (No DBLink Required)</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div style="border: 1px solid #bfbfbf; padding: 8px; background: #fff;">
            <div style="font-weight: 700; color: #166534; margin-bottom: 6px;">Source Connection:</div>
            <select class="toad-conn-combobox" style="width: 100%; height: 22px; margin-bottom: 6px;">
              <option>HR@sales_prod.db.corp (OCI Net8)</option>
              <option>DEV@sandbox_db.corp</option>
            </select>
            <label>Source Table:</label>
            <input type="text" id="copy-src-tbl" value="HR.EMPLOYEES" style="width: 100%; padding: 2px 4px; border: 1px solid #ccc; font-family: var(--toad-font-code);">
          </div>
          <div style="border: 1px solid #bfbfbf; padding: 8px; background: #fff;">
            <div style="font-weight: 700; color: #0284c7; margin-bottom: 6px;">Target Connection:</div>
            <select class="toad-conn-combobox" style="width: 100%; height: 22px; margin-bottom: 6px;">
              <option>DEV@sandbox_db.corp (OCI Net8)</option>
              <option>HR@sales_prod.db.corp</option>
            </select>
            <label>Target Table:</label>
            <input type="text" id="copy-tgt-tbl" value="HR.EMPLOYEES_BACKUP" style="width: 100%; padding: 2px 4px; border: 1px solid #ccc; font-family: var(--toad-font-code);">
          </div>
        </div>
        <div style="background: #f8fafc; padding: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 4px;">
          <label><input type="checkbox" id="copy-truncate" checked> Truncate target table before inserting</label>
          <label><input type="checkbox" id="copy-disable-fk" checked> Disable Foreign Key constraints during transfer</label>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
            <label>Commit Frequency (Array Batching):</label>
            <input type="number" id="copy-batch" value="5000" style="width: 80px; padding: 2px 4px; border: 1px solid #ccc;"> rows
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="
        const src = document.getElementById('copy-src-tbl').value;
        const tgt = document.getElementById('copy-tgt-tbl').value;
        const batch = document.getElementById('copy-batch').value;
        window.TracesApp.notify('Transferência em lote de ' + src + ' para ' + tgt + ' iniciada com batch de ' + batch + ' linhas.', 'success');
        window.TracesApp.toadModals.close();
      ">Start Data Transfer</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('Copy Table Data - Toad for Oracle', body, footer, '580px');
  }

  openCodeTemplates() {
    const templates = [
      { token: 'cr_tab', name: 'Create Table with Identity', code: `CREATE TABLE table_name (\n  id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n  name VARCHAR2(100) NOT NULL,\n  status VARCHAR2(20) DEFAULT 'ACTIVE',\n  created_at TIMESTAMP DEFAULT SYSTIMESTAMP\n);` },
      { token: 'cur_for', name: 'Cursor FOR Loop', code: `FOR rec IN (SELECT * FROM my_table WHERE condition) LOOP\n  -- Process record\n  DBMS_OUTPUT.PUT_LINE('Record: ' || rec.id);\nEND LOOP;` },
      { token: 'pkg_spec', name: 'Package Specification', code: `CREATE OR REPLACE PACKAGE my_pkg AS\n  PROCEDURE run_process(p_id IN NUMBER);\n  FUNCTION get_status(p_id IN NUMBER) RETURN VARCHAR2;\nEND my_pkg;\n/` },
      { token: 'try_catch', name: 'Exception Block with Logging', code: `BEGIN\n  -- Execution logic\n  NULL;\nEXCEPTION\n  WHEN OTHERS THEN\n    DBMS_OUTPUT.PUT_LINE('Error ' || SQLCODE || ': ' || SQLERRM);\n    RAISE;\nEND;` },
      { token: 'ins_sel', name: 'Insert into Select', code: `INSERT INTO target_table (col1, col2, col3)\nSELECT col1, col2, col3\nFROM source_table\nWHERE status = 'ACTIVE';` },
      { token: 'dblink', name: 'Create Database Link', code: `CREATE DATABASE LINK remote_db_link\nCONNECT TO remote_user IDENTIFIED BY remote_password\nUSING 'sales_prod_tns';` }
    ];

    const body = `
      <div style="font-size: 11px; display: flex; height: 320px; gap: 8px;">
        <div style="width: 200px; border: 1px solid #bfbfbf; background: #fff; overflow-y: auto;">
          ${templates.map((t, idx) => `
            <div style="padding: 6px; cursor: pointer; border-bottom: 1px solid #f1f5f9; ${idx === 0 ? 'background: #e0f2fe; font-weight: 700;' : ''}"
                 onclick="document.getElementById('tmpl-preview').textContent = ${JSON.stringify(t.code)}; document.querySelectorAll('.tmpl-item').forEach(e => e.style.background=''); this.style.background='#e0f2fe';"
                 class="tmpl-item">
              <span style="font-family: var(--toad-font-code); color: #0284c7;">${t.token}</span><br>
              <small style="color: #64748b;">${t.name}</small>
            </div>
          `).join('')}
        </div>
        <div style="flex: 1; display: flex; flex-direction: column;">
          <div style="font-weight: 600; margin-bottom: 4px;">Template Preview:</div>
          <pre id="tmpl-preview" style="flex: 1; background: #1e1e1e; color: #f8fafc; padding: 10px; font-family: var(--toad-font-code); font-size: 11px; overflow: auto; border: 1px solid #334155; border-radius: 3px; margin: 0;">${templates[0].code}</pre>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="
        if (window.TracesApp?.sqlEditor) {
          window.TracesApp.switchDockView('editor');
          const code = document.getElementById('tmpl-preview').textContent;
          window.TracesApp.sqlEditor.insertTextAtCursor(code);
          window.TracesApp.notify('Template inserida no Editor.', 'success');
        }
        window.TracesApp.toadModals.close();
      ">Insert into Editor (Tab)</button>
      <button class="btn" onclick="navigator.clipboard.writeText(document.getElementById('tmpl-preview').textContent); window.TracesApp.notify('Copiado para o clipboard.', 'info');">Copy Text</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Close</button>
    `;

    this.show('Toad Code Templates Manager', body, footer, '620px');
  }

  openAutoReplace() {
    const pairs = [
      { token: 'sf', repl: 'SELECT * FROM ' },
      { token: 'df', repl: 'DELETE FROM ' },
      { token: 'sc', repl: 'SELECT COUNT(*) FROM ' },
      { token: 'gb', repl: 'GROUP BY ' },
      { token: 'ob', repl: 'ORDER BY ' },
      { token: 'ii', repl: 'INSERT INTO ' },
      { token: 'ut', repl: 'UPDATE target_table SET ' },
      { token: 'nd', repl: 'SYSDATE' },
      { token: 'nst', repl: 'SYSTIMESTAMP' }
    ];

    const body = `
      <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px;">
        <div>Auto-Replace substitutes abbreviations into full SQL clauses when you press Space or Enter:</div>
        <div style="background: #fff; border: 1px solid #bfbfbf; max-height: 220px; overflow-y: auto;">
          <table class="meta-table" style="width: 100%;">
            <thead><tr><th style="width: 120px;">Abbreviation</th><th>Expanded SQL Clause</th></tr></thead>
            <tbody>
              ${pairs.map(p => `
                <tr>
                  <td style="font-family: var(--toad-font-code); font-weight: 700; color: #0284c7;">${p.token}</td>
                  <td style="font-family: var(--toad-font-code);">${p.repl}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="display: flex; gap: 6px; align-items: center; background: #f8fafc; padding: 6px; border: 1px solid #e2e8f0;">
          <input id="new-ar-token" type="text" placeholder="Abbreviation (ex: wf)" style="width: 110px; padding: 2px 4px; font-family: var(--toad-font-code); border: 1px solid #ccc;">
          <input id="new-ar-repl" type="text" placeholder="Replacement (ex: WHERE )" style="flex: 1; padding: 2px 4px; font-family: var(--toad-font-code); border: 1px solid #ccc;">
          <button class="btn" onclick="window.TracesApp.notify('Auto-replace token salvo.', 'success');">+ Add</button>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.notify('Configurações de Auto-Replace salvas.', 'success'); window.TracesApp.toadModals.close();">Apply</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Close</button>
    `;

    this.show('Toad Auto-Replace Manager', body, footer, '540px');
  }

  openFindDialog(replace = false) {
    const sel = window.TracesApp?.sqlEditor?.textarea?.value?.substring(
      window.TracesApp.sqlEditor.textarea.selectionStart,
      window.TracesApp.sqlEditor.textarea.selectionEnd
    ) || '';

    const body = `
      <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; gap: 8px; align-items: center;">
          <label style="width: 90px; font-weight: 600;">Find what:</label>
          <input id="find-query" type="text" value="${sel}" placeholder="Enter search text..." style="flex: 1; padding: 3px 6px; border: 1px solid #0078d7; font-family: var(--toad-font-code);">
        </div>
        ${replace ? `
          <div style="display: flex; gap: 8px; align-items: center;">
            <label style="width: 90px; font-weight: 600;">Replace with:</label>
            <input id="replace-query" type="text" placeholder="Enter replacement text..." style="flex: 1; padding: 3px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);">
          </div>
        ` : ''}
        <div style="display: flex; gap: 16px; margin-top: 4px; padding: 6px; background: #f8fafc; border: 1px solid #e2e8f0;">
          <label><input type="checkbox" id="find-case"> Match Case</label>
          <label><input type="checkbox" id="find-whole"> Whole Words</label>
          <label><input type="checkbox" id="find-regex"> Regular Expression</label>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="
        const term = document.getElementById('find-query').value;
        if (!term) return;
        const textarea = window.TracesApp?.sqlEditor?.textarea;
        if (textarea) {
          const idx = textarea.value.toLowerCase().indexOf(term.toLowerCase(), textarea.selectionEnd);
          const pos = idx !== -1 ? idx : textarea.value.toLowerCase().indexOf(term.toLowerCase(), 0);
          if (pos !== -1) {
            textarea.focus();
            textarea.setSelectionRange(pos, pos + term.length);
            window.TracesApp.notify('Localizado em ' + pos, 'info');
          } else {
            window.TracesApp.notify('Texto não encontrado.', 'warning');
          }
        }
      ">Find Next</button>
      ${replace ? `
        <button class="btn" onclick="
          const term = document.getElementById('find-query').value;
          const repl = document.getElementById('replace-query').value;
          const textarea = window.TracesApp?.sqlEditor?.textarea;
          if (textarea && term) {
            textarea.value = textarea.value.split(term).join(repl);
            window.TracesApp.sqlEditor.saveActiveTabContent();
            window.TracesApp.sqlEditor.updateHighlighting();
            window.TracesApp.notify('Todas as ocorrências foram substituídas.', 'success');
            window.TracesApp.toadModals.close();
          }
        ">Replace All</button>
      ` : ''}
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show(replace ? 'Find and Replace Text - Toad' : 'Find Text - Toad', body, footer, '480px');
  }

  openProjectManager() {
    const body = `
      <div style="font-size: 11px; display: flex; height: 320px; gap: 8px;">
        <div style="width: 220px; border: 1px solid #bfbfbf; background: #fff; overflow-y: auto; padding: 4px;">
          <div style="font-weight: 700; color: #0078d7; padding: 4px;">📁 Sales ERP Project (.tpj)</div>
          <div style="padding-left: 12px;">
            <div style="padding: 2px 0;">🗄 <b>Connections</b></div>
            <div style="padding-left: 14px; color: #166534;">• HR@sales_prod</div>
            <div style="padding-left: 14px; color: #0284c7;">• DEV@sandbox_db</div>
            <div style="padding: 2px 0; margin-top: 4px;">📝 <b>SQL Scripts</b></div>
            <div style="padding-left: 14px; cursor: pointer; color: #0284c7;" onclick="window.TracesApp.sqlEditor.setQuery('SELECT * FROM hr.employees WHERE salary > 5000;'); window.TracesApp.notify('Carregado employee_audit.sql', 'info');">• employee_audit.sql</div>
            <div style="padding-left: 14px; cursor: pointer; color: #0284c7;" onclick="window.TracesApp.sqlEditor.setQuery('ALTER INDEX hr.emp_dept_fk_idx REBUILD ONLINE;'); window.TracesApp.notify('Carregado index_rebuild.sql', 'info');">• index_rebuild.sql</div>
            <div style="padding: 2px 0; margin-top: 4px;">📐 <b>Data Models</b></div>
            <div style="padding-left: 14px;">• sales_core_erd.dmx</div>
            <div style="padding: 2px 0; margin-top: 4px;">⚙ <b>Automations</b></div>
            <div style="padding-left: 14px;">• nightly_datapump_job.tas</div>
          </div>
        </div>
        <div style="flex: 1; border: 1px solid #bfbfbf; background: #f8fafc; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-weight: 700;">Project Details: Sales ERP Migration</div>
          <div>Location: <code>/Users/pedrofranchim/ToadProjects/SalesERP/</code></div>
          <div>Active Connection: <code>HR@sales_prod.db.corp</code></div>
          <div>Saved Worksheets: 5 scripts</div>
          <div style="margin-top: auto; display: flex; gap: 6px;">
            <button class="btn btn-primary" onclick="window.TracesApp.notify('Projeto sincronizado.', 'success'); window.TracesApp.toadModals.close();">Save Project</button>
            <button class="btn" onclick="window.TracesApp.notify('Novo script adicionado ao projeto.', 'info');">+ Add Current Script</button>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Close</button>
    `;

    this.show('Toad Project Manager', body, footer, '620px');
  }

  openOriginalExpImpWizard() {
    const body = `
      <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px;">
        <div style="font-weight: 700; color: #0078d7;">Original Oracle Export / Import Utility (exp / imp)</div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Mode:</label>
          <select id="orig-mode" class="toad-conn-combobox" style="flex: 1; height: 22px;">
            <option value="EXP">Export (exp)</option>
            <option value="IMP">Import (imp)</option>
          </select>
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Dump File (.dmp):</label>
          <input id="orig-file" type="text" value="export_legacy.dmp" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Log File (.log):</label>
          <input id="orig-log" type="text" value="export_legacy.log" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="display: flex; gap: 8px;">
          <label style="width: 120px;">Owner / Schema:</label>
          <input id="orig-owner" type="text" value="HR,SALES_ADMIN" style="flex: 1; padding: 2px 4px; border: 1px solid #ccc;">
        </div>
        <div style="display: flex; gap: 12px; margin-top: 4px;">
          <div><input type="checkbox" id="orig-consistent" checked> <label for="orig-consistent">CONSISTENT=Y</label></div>
          <div><input type="checkbox" id="orig-compress" checked> <label for="orig-compress">COMPRESS=Y</label></div>
          <div><input type="checkbox" id="orig-grants" checked> <label for="orig-grants">GRANTS=Y</label></div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.generateOriginalExpImpCommand();">Generate Command to Editor</button>
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    this.show('Original Export / Import (exp / imp) Wizard', body, footer, '540px');
  }

  generateOriginalExpImpCommand() {
    const mode = document.getElementById('orig-mode')?.value || 'EXP';
    const file = document.getElementById('orig-file')?.value || 'export.dmp';
    const log = document.getElementById('orig-log')?.value || 'export.log';
    const owner = document.getElementById('orig-owner')?.value || 'HR';

    const cmd = `-- Legacy Oracle ${mode} Command Line:
-- ${mode.toLowerCase()} userid=\\"sys/*****@ORCL as sysdba\\" file=${file} log=${log} owner=${owner} consistent=y compress=y grants=y
`;
    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.switchDockView('editor');
      window.TracesApp.sqlEditor.setQuery(cmd);
      window.TracesApp.notify(`Comando ${mode.toLowerCase()} gerado no Editor SQL.`, 'success');
      this.close();
    }
  }

  openHelpTopics() {
    const body = `
      <div style="display: flex; height: 380px; gap: 10px; font-size: 11px;">
        <div style="width: 180px; border: 1px solid #ccc; background: #fff; overflow-y: auto; padding: 4px;">
          <div style="font-weight: 700; padding: 4px 6px; background: #e0f2fe; color: #0369a1; cursor: pointer; border-radius: 2px;" onclick="window.TracesApp.toadModals.showHelpDoc('overview');">1. Overview &amp; Net8</div>
          <div style="padding: 4px 6px; cursor: pointer;" onclick="window.TracesApp.toadModals.showHelpDoc('editor');">2. SQL Editor &amp; Hotkeys</div>
          <div style="padding: 4px 6px; cursor: pointer;" onclick="window.TracesApp.toadModals.showHelpDoc('browser');">3. Schema Browser</div>
          <div style="padding: 4px 6px; cursor: pointer;" onclick="window.TracesApp.toadModals.showHelpDoc('sessions');">4. Session Browser &amp; Locks</div>
          <div style="padding: 4px 6px; cursor: pointer;" onclick="window.TracesApp.toadModals.showHelpDoc('dba');">5. DBA Suite &amp; HA</div>
          <div style="padding: 4px 6px; cursor: pointer;" onclick="window.TracesApp.toadModals.showHelpDoc('codexpert');">6. CodeXpert &amp; Optimizer</div>
        </div>
        <div id="help-doc-content" style="flex: 1; border: 1px solid #ccc; background: #fff; overflow-y: auto; padding: 12px; line-height: 1.5;">
          <h4 style="margin: 0 0 8px 0; color: #0078d7;">Toad for Oracle 2026 R2 - User Guide &amp; Architecture</h4>
          <p>Traces Toad for Oracle connects directly to Oracle Database instances (11g through 23ai) using python-oracledb Thin/Thick client over Net8 protocol (port 1521).</p>
          <p><b>Key Capabilities:</b></p>
          <ul>
            <li><b>SSH Jump Host Bridge:</b> Encrypted bastion tunnel for private subnet databases.</li>
            <li><b>Transaction Management:</b> Manual commit (F11) and rollback (Shift+F11) with safe DML staging.</li>
            <li><b>19 DBA Administration Panes:</b> Tablespace Map, Segment Advisor, Undo Sizing, Flashback, LogMiner, ASM, RAC, Exadata, AWR.</li>
          </ul>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Close</button>
    `;

    this.show('Toad for Oracle Help Topics & Documentation', body, footer, '680px');
  }

  showHelpDoc(topic) {
    const el = document.getElementById('help-doc-content');
    if (!el) return;
    if (topic === 'editor') {
      el.innerHTML = `
        <h4 style="margin:0 0 8px 0; color:#0078d7;">SQL Editor &amp; Keybindings</h4>
        <p><b>F9:</b> Execute Statement at cursor into OCI cursor grid.<br>
        <b>F5:</b> Execute entire worksheet as SQL*Plus script.<br>
        <b>Ctrl+E:</b> Visual Explain Plan with Cost-Based Optimizer advisor.<br>
        <b>F4:</b> Instant Object Describe (Popup Columns, Indexes, Constraints, DDL).<br>
        <b>F8:</b> SQL Recall from persistent history (SavedSQL.dat).<br>
        <b>Ctrl+Shift+F:</b> Toad FmtPlus SQL Beautifier.<br>
        <b>F11 / Shift+F11:</b> Commit / Rollback Transaction.</p>
      `;
    } else if (topic === 'sessions') {
      el.innerHTML = `
        <h4 style="margin:0 0 8px 0; color:#0078d7;">Session Browser &amp; V$LOCK Tree</h4>
        <p>12 native Toad filters from <code>TOAD_SESSBROWFILTERS.INI</code> are evaluated against V$SESSION.</p>
        <p>Allows inspecting locks, blocked sessions, SQL text, session wait events, and executing <code>ALTER SYSTEM KILL SESSION 'sid,serial' IMMEDIATE</code> or disconnect.</p>
      `;
    } else if (topic === 'dba') {
      el.innerHTML = `
        <h4 style="margin:0 0 8px 0; color:#0078d7;">DBA Suite &amp; High Availability</h4>
        <p>Complete suite of 19 administration modules: Tablespace Map (HWM), Segment Advisor (DBMS_SPACE), Undo Advisor (V$UNDOSTAT), Flashback Recycle Bin, LogMiner (DBMS_LOGMNR), Data Guard, ASM, RAC, Exadata Smart Scan, and AWR reports.</p>
      `;
    } else {
      el.innerHTML = `
        <h4 style="margin:0 0 8px 0; color:#0078d7;">Toad for Oracle 2026 R2 - Overview</h4>
        <p>Professional Oracle Database developer and administration suite with 1:1 Quest Toad feature parity.</p>
      `;
    }
  }

  openProjectManager() {
    window.TracesApp.notify('Project Manager: Workspace do projeto aberto com 3 conexões e 12 scripts SQL.', 'info');
  }

  // 21. Check for Updates from GitHub
  openUpdateDialog() {
    const body = `
      <div id="update-modal-body" style="font-size: 11.5px; display: flex; flex-direction: column; gap: 10px; padding: 4px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 26px;">🔄</span>
          <div>
            <div style="font-weight: 700; font-size: 13px; color: #0078d7;">Verificador de Atualizações (GitHub Auto-Updater)</div>
            <div style="color: #666; font-size: 11px;">Repositório: <b>pedrofranchim35-netizen/traces-tool</b> (Branch: <b>main</b>)</div>
          </div>
        </div>

        <div id="update-status-box" style="background: #f7f7f7; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="animated-pulse-dot" style="background: #0078d7; width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span>
            <span>Verificando versão mais recente no GitHub...</span>
          </div>
        </div>

        <div id="update-action-container" style="display: none; flex-direction: column; gap: 8px;">
          <div id="update-details-box" style="font-size: 11px; background: #fff; border: 1px solid #bfbfbf; padding: 8px; border-radius: 3px; line-height: 1.5;">
          </div>
          <button id="btn-apply-update" class="btn btn-primary" style="height: 30px; font-weight: 700; background: #008000;" onclick="window.TracesApp.toadModals.applyUpdateNow();">
            ⬇️ Baixar e Atualizar Aplicativo Agora (GitHub)
          </button>
        </div>

        <div style="margin-top: 6px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 6px;">
          <div style="font-weight: 700; color: #374151;">Instalador e Executável Windows (.EXE):</div>
          <div style="font-size: 11px; color: #6b7280;">O instalador oficial também atualiza instalações existentes sem perder nenhum workspace ou conexão:</div>
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <a href="TracesToad-Setup.exe" download="TracesToad-Setup.exe" class="btn btn-primary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: #0078d7; color: white;">
              <span>💾</span>
              <span style="font-weight: 600;">Baixar Instalador / Atualizador (.exe)</span>
            </a>
            <a href="TracesToad.exe" download="TracesToad.exe" class="btn" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;">
              <span>⚡</span>
              <span style="font-weight: 600;">Executável Portátil (TracesToad.exe)</span>
            </a>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn" onclick="window.TracesApp.toadModals.close();">Fechar</button>
    `;

    this.show('Atualização do Aplicativo (GitHub)', body, footer, '520px');
    this.checkForUpdates();
  }

  async checkForUpdates() {
    try {
      let data;
      if (window.electronAPI && typeof window.electronAPI.checkUpdate === 'function') {
        data = await window.electronAPI.checkUpdate();
      } else {
        const resp = await fetch('/api/update/check');
        data = await resp.json();
      }

      const statusBox = document.getElementById('update-status-box');
      const actionContainer = document.getElementById('update-action-container');
      const detailsBox = document.getElementById('update-details-box');
      const applyBtn = document.getElementById('btn-apply-update');

      if (!data.success) {
        if (statusBox) statusBox.innerHTML = `<span style="color:#c00000; font-weight:700;">⚠ ${data.error || 'Erro ao conectar ao GitHub'}</span>`;
        return;
      }

      if (data.updateAvailable) {
        if (statusBox) statusBox.innerHTML = `<span style="color:#b45309; font-weight:700; font-size:12px;">🎉 Nova versão disponível no GitHub!</span>`;
        if (detailsBox) {
          detailsBox.innerHTML = `
            <div>Versão Atual Instalada: <b style="color:#666;">${data.currentVersion || data.currentCommit}</b></div>
            <div>Versão Mais Recente (GitHub): <b style="color:#008000;">${data.latestVersion || data.latestCommit}</b></div>
            <div style="margin-top: 4px; color:#333;">Commit: <i>"${data.commitMessage}"</i></div>
            <div style="font-size:10px; color:#888;">Data: ${data.commitDate}</div>
          `;
        }
        if (applyBtn) {
          applyBtn.textContent = '⬇️ Atualizar Automaticamente pelo GitHub';
          applyBtn.style.background = '#008000';
        }
        if (actionContainer) actionContainer.style.display = 'flex';
      } else {
        if (statusBox) statusBox.innerHTML = `<span style="color:#008000; font-weight:700; font-size:12px;">✔ O seu aplicativo já está atualizado na versão mais recente!</span>`;
        if (detailsBox) {
          detailsBox.innerHTML = `
            <div>Versão Atual: <b style="color:#0078d7;">${data.currentVersion || data.currentCommit}</b></div>
            <div style="margin-top: 4px; color:#555;">Último commit no GitHub: <i>"${data.commitMessage}"</i></div>
          `;
        }
        if (applyBtn) {
          applyBtn.textContent = '🔄 Forçar Re-sincronização do GitHub';
          applyBtn.style.background = '#0078d7';
        }
        if (actionContainer) actionContainer.style.display = 'flex';
      }
    } catch (e) {
      const statusBox = document.getElementById('update-status-box');
      if (statusBox) statusBox.innerHTML = `<span style="color:#c00000;">Erro ao verificar atualizações: ${e.message}</span>`;
    }
  }

  async applyUpdateNow() {
    const btn = document.getElementById('btn-apply-update');
    const statusBox = document.getElementById('update-status-box');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Baixando e aplicando atualização...';
    }
    if (statusBox) {
      statusBox.innerHTML = `<span style="color:#0078d7; font-weight:700;">Iniciando atualização automática via GitHub...</span>`;
    }

    try {
      if (window.electronAPI && typeof window.electronAPI.applyUpdate === 'function') {
        window.electronAPI.onUpdateProgress((prog) => {
          if (statusBox) {
            statusBox.innerHTML = `<span style="color:#0078d7; font-weight:700;">${prog.text || 'Atualizando...'}</span>`;
          }
        });

        const res = await window.electronAPI.applyUpdate();
        if (res.success) {
          if (statusBox) statusBox.innerHTML = `<span style="color:#008000; font-weight:700;">✔ Aplicativo atualizado com sucesso! Reiniciando...</span>`;
          window.TracesApp.notify('Aplicativo atualizado com sucesso! Reiniciando...', 'success');
        } else {
          if (statusBox) statusBox.innerHTML = `<span style="color:#c00000; font-weight:700;">Erro: ${res.error || res.message}</span>`;
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Tentar Novamente';
          }
        }
        return;
      }

      // Fallback para quando executado via navegador/servidor HTTP
      const resp = await fetch('/api/update/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const res = await resp.json();

      if (res.success) {
        if (statusBox) statusBox.innerHTML = `<span style="color:#008000; font-weight:700;">✔ Atualizado com sucesso! Recarregando a página...</span>`;
        window.TracesApp.notify('Aplicativo atualizado com sucesso! Recarregando...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        if (statusBox) statusBox.innerHTML = `<span style="color:#c00000; font-weight:700;">Erro: ${res.error}</span>`;
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Tentar Novamente';
        }
      }
    } catch (e) {
      if (statusBox) statusBox.innerHTML = `<span style="color:#c00000;">Erro: ${e.message}</span>`;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Tentar Novamente';
      }
    }
  }
}

window.ToadModals = ToadModals;

