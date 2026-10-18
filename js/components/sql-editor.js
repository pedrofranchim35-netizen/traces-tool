/* ==========================================================================
   SQL WORKSHEET & PL/SQL STUDIO COMPONENT
   ========================================================================== */

class SqlEditor {
  constructor() {
    this.tabs = [
      {
        id: 'tab-1',
        title: 'database_status.sql',
        content: `-- TRACES Oracle Studio: Database Verification & Status
-- Press F9 to Execute Statement | F5 to Execute as Script
SELECT 
    banner AS oracle_version
FROM 
    v$version;`
      },
      {
        id: 'tab-2',
        title: 'schemas_and_tablespaces.sql',
        content: `-- List Database Users & Tablespaces
SELECT 
    username, 
    account_status, 
    default_tablespace, 
    created
FROM 
    all_users
ORDER BY 
    username;`
      },
      {
        id: 'tab-3',
        title: 'dbms_output_test.sql',
        content: `-- PL/SQL Block with DBMS_OUTPUT Execution (F5)
DECLARE
    v_db VARCHAR2(50);
BEGIN
    SELECT ora_database_name INTO v_db FROM dual;
    DBMS_OUTPUT.PUT_LINE('TRACES Oracle Studio: Connected to ' || v_db);
    DBMS_OUTPUT.PUT_LINE('Session Timestamp: ' || TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS'));
END;`
      }
    ];

    this.activeTabId = 'tab-1';
    this.transactionActive = false;

    this.initElements();
    this.bindEvents();
    this.renderTabs();
    this.loadTabContent();
  }

  initElements() {
    this.tabBar = document.getElementById('worksheet-tabs-bar');
    this.btnNewTab = document.getElementById('btn-new-tab');
    this.textarea = document.getElementById('sql-code-textarea');
    this.highlightEl = document.getElementById('sql-code-highlighted');
    this.gutterEl = document.getElementById('editor-gutter');
    this.btnRun = document.getElementById('btn-run-statement');
    this.btnRunScript = document.getElementById('btn-run-script');
    this.btnExplain = document.getElementById('btn-explain-plan');
    this.btnFormat = document.getElementById('btn-format-sql');
    this.btnCommit = document.getElementById('btn-commit');
    this.btnRollback = document.getElementById('btn-rollback');
    this.btnBindPrompt = document.getElementById('btn-bind-variables');

    this.outputTabs = document.querySelectorAll('.output-tab');
    this.consoleDbms = document.getElementById('console-dbms-output');
    this.consoleScript = document.getElementById('console-script-output');
    this.autotraceTable = document.getElementById('autotrace-metrics-body');
  }

  bindEvents() {
    if (this.textarea) {
      this.textarea.addEventListener('input', () => {
        this.saveActiveTabContent();
        this.updateHighlighting();
        this.updateGutter();
      });

      this.textarea.addEventListener('scroll', () => {
        if (this.highlightEl) {
          this.highlightEl.scrollTop = this.textarea.scrollTop;
          this.highlightEl.scrollLeft = this.textarea.scrollLeft;
        }
        if (this.gutterEl) {
          this.gutterEl.scrollTop = this.textarea.scrollTop;
        }
      });

      // Keyboard Shortcuts inside Editor
      this.textarea.addEventListener('keydown', (e) => {
        if (e.key === 'F9') {
          e.preventDefault();
          this.executeStatement();
        } else if (e.key === 'F5') {
          e.preventDefault();
          this.executeScript();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          this.executeStatement();
        } else if (e.key === 'F4') {
          e.preventDefault();
          const pos = this.textarea.selectionStart;
          const text = this.textarea.value;
          const match = text.slice(Math.max(0, pos - 20), pos + 20).match(/[a-zA-Z0-9_.]+/);
          const objName = match ? match[0] : 'HR.EMPLOYEES';
          window.TracesApp.toadModals.openDescribe(objName);
        } else if (e.key === 'F8') {
          e.preventDefault();
          window.TracesApp.toadModals.openSqlRecall();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
          e.preventDefault();
          this.explainPlan();
        } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
          e.preventDefault();
          this.formatSql();
        }
      });
    }

    if (this.btnNewTab) this.btnNewTab.addEventListener('click', () => this.addNewTab());
    if (this.btnRun) this.btnRun.addEventListener('click', () => this.executeStatement());
    if (this.btnRunScript) this.btnRunScript.addEventListener('click', () => this.executeScript());
    if (this.btnExplain) this.btnExplain.addEventListener('click', () => this.explainPlan());
    if (this.btnFormat) this.btnFormat.addEventListener('click', () => this.formatSql());
    if (this.btnCommit) this.btnCommit.addEventListener('click', () => this.commitTransaction());
    if (this.btnRollback) this.btnRollback.addEventListener('click', () => this.rollbackTransaction());

    if (this.outputTabs) {
      this.outputTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          const target = e.currentTarget.getAttribute('data-tab');
          this.switchOutputTab(target);
        });
      });
    }
  }

  renderTabs() {
    this.tabBar.innerHTML = this.tabs.map(tab => `
      <div class="worksheet-tab ${tab.id === this.activeTabId ? 'active' : ''}" 
           onclick="window.TracesApp.sqlEditor.switchTab('${tab.id}')">
        <span>${tab.title}</span>
        <span class="tab-close-btn" onclick="event.stopPropagation(); window.TracesApp.sqlEditor.closeTab('${tab.id}')">×</span>
      </div>
    `).join('') + `
      <button class="btn-new-tab" id="btn-new-tab" title="New SQL Worksheet" onclick="window.TracesApp.sqlEditor.addNewTab()">+</button>
    `;
  }

  switchTab(tabId) {
    this.saveActiveTabContent();
    this.activeTabId = tabId;
    this.renderTabs();
    this.loadTabContent();
  }

  addNewTab() {
    const newId = `tab-${Date.now()}`;
    const newNum = this.tabs.length + 1;
    this.tabs.push({
      id: newId,
      title: `worksheet_${newNum}.sql`,
      content: `-- Worksheet ${newNum}\nSELECT * FROM hr.departments;`
    });
    this.switchTab(newId);
  }

  closeTab(tabId) {
    if (this.tabs.length === 1) {
      window.TracesApp.notify('Cannot close the last open worksheet', 'warning');
      return;
    }
    const idx = this.tabs.findIndex(t => t.id === tabId);
    this.tabs.splice(idx, 1);
    if (this.activeTabId === tabId) {
      this.activeTabId = this.tabs[Math.max(0, idx - 1)].id;
    }
    this.renderTabs();
    this.loadTabContent();
  }

  saveActiveTabContent() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab) {
      tab.content = this.textarea.value;
    }
  }

  loadTabContent() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab) return;

    this.textarea.value = tab.content;
    this.updateHighlighting();
    this.updateGutter();
  }

  updateGutter() {
    const lineCount = this.textarea.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= lineCount; i++) {
      html += `<div class="gutter-line">${i}</div>`;
    }
    this.gutterEl.innerHTML = html;
  }

  updateHighlighting() {
    const code = this.textarea.value;
    this.highlightEl.innerHTML = this.highlightSql(code);
  }

  highlightSql(sql) {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON',
      'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'INSERT', 'INTO', 'VALUES',
      'UPDATE', 'SET', 'DELETE', 'CREATE', 'OR', 'REPLACE', 'TABLE', 'VIEW', 'PACKAGE',
      'BODY', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'ALTER', 'DROP', 'DECLARE', 'BEGIN',
      'END', 'IF', 'THEN', 'ELSE', 'ELSIF', 'LOOP', 'FOR', 'WHILE', 'EXCEPTION', 'WHEN',
      'COMMIT', 'ROLLBACK', 'AND', 'IN', 'IS', 'NULL', 'NOT', 'AS', 'DISTINCT', 'UNION',
      'ALL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'PARTITION', 'RETURNING', 'LIMIT', 'BULK', 'COLLECT'
    ];

    const oracleFunctions = [
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'NVL', 'TO_CHAR', 'TO_DATE', 'TO_NUMBER',
      'SYSDATE', 'SYSTIMESTAMP', 'UPPER', 'LOWER', 'SUBSTR', 'INSTR', 'DECODE', 'COALESCE',
      'ROW_NUMBER', 'DENSE_RANK', 'OVER', 'DBMS_OUTPUT', 'PUT_LINE'
    ];

    let escaped = sql
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Comments
    escaped = escaped.replace(/(--.*$)/gm, '<span class="syn-com">$1</span>');

    // Strings
    escaped = escaped.replace(/('([^'\\]|\\.)*')/g, '<span class="syn-str">$1</span>');

    // Numbers
    escaped = escaped.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="syn-num">$1</span>');

    // Bind variables
    escaped = escaped.replace(/(:[a-zA-Z0-9_]+)/g, '<span class="syn-var">$1</span>');

    // Oracle Functions
    oracleFunctions.forEach(fn => {
      const reg = new RegExp(`\\b(${fn})\\b`, 'gi');
      escaped = escaped.replace(reg, '<span class="syn-fn">$1</span>');
    });

    // Keywords
    keywords.forEach(kw => {
      const reg = new RegExp(`\\b(${kw})\\b`, 'gi');
      escaped = escaped.replace(reg, '<span class="syn-kw">$1</span>');
    });

    return escaped;
  }

  // Execution Handlers
  executeStatement() {
    const text = this.textarea.value;

    // Route to real database if connected
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      this.executeRealStatement(text);
      return;
    }

    const startTime = performance.now();

    // Check for bind variables (:var)
    const bindMatches = text.match(/:[a-zA-Z0-9_]+/g);
    if (bindMatches && bindMatches.length > 0 && !window.__executingWithBinds) {
      const uniqueBinds = Array.from(new Set(bindMatches));
      window.TracesApp.toadModals.openBindVariables(uniqueBinds);
      return;
    }

    // Check for substitution variables (&var or &&var)
    const substMatches = text.match(/&{1,2}[a-zA-Z0-9_]+/g);
    if (substMatches && substMatches.length > 0 && !window.__executingWithSubst) {
      const firstVar = substMatches[0];
      const val = prompt(`Oracle Substitution Variable Input\nEnter value for ${firstVar}:`, '90');
      if (val === null) return;
    }

    const elapsedMs = ((performance.now() - startTime) + Math.random() * 30 + 15).toFixed(1);

    this.transactionActive = true;
    this.updateTransactionBadge();

    // Record into SavedSQL.dat for F8 SQL Recall
    window.TRACES_DB.savedSql.unshift({
      timestamp: new Date().toLocaleTimeString(),
      schema: window.TRACES_DB.activeSchema || 'HR',
      executions: 1,
      text: text.trim()
    });

    // Route query results to Data Grid
    if (text.toLowerCase().includes('sales_transactions') || text.toLowerCase().includes('sales_admin')) {
      const salesData = window.TRACES_DB.schemas['SALES_ADMIN'].tables[1].data;
      window.TracesApp.dataGrid.setData(salesData, 'SALES_TRANSACTIONS');
    } else {
      const empData = window.TRACES_DB.schemas['HR'].tables[0].data;
      window.TracesApp.dataGrid.setData(empData, 'EMPLOYEES');
    }

    // Update Script output log
    this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Statement executed successfully in ${elapsedMs} ms. Rows fetched: 14.`);
    
    // Switch to Data Grid tab
    this.switchOutputTab('grid');
    window.TracesApp.notify(`Query executed in ${elapsedMs} ms. Data Grid updated.`, 'success');

    this.updateAutotrace();
  }

  async executeRealStatement(sql) {
    const startTime = performance.now();
    try {
      window.TracesApp.notify('Executing statement on Real Oracle Database via Bridge Gateway...', 'info');
      const resp = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      const data = await resp.json();
      const elapsedMs = (performance.now() - startTime).toFixed(1);

      if (data.error) {
        this.logScriptOutput(`[${new Date().toLocaleTimeString()}] ORA-ERROR: ${data.error}`);
        window.TracesApp.notify(`Oracle Error: ${data.error}`, 'error');
        return;
      }

      this.transactionActive = true;
      this.updateTransactionBadge();

      // Record in SavedSQL
      window.TRACES_DB.savedSql.unshift({
        timestamp: new Date().toLocaleTimeString(),
        schema: window.TracesApp.realDatabaseConfig?.user || 'ORACLE',
        executions: 1,
        text: sql.trim()
      });

      // Populate Data Grid with real rows and real columns
      if (data.rows) {
        window.TracesApp.dataGrid.setData(data.rows, data.tableName || 'QUERY_RESULT');
        this.switchOutputTab('grid');
      }

      this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Real Oracle execution completed in ${data.elapsedMs || elapsedMs} ms. Rows returned: ${data.rows ? data.rows.length : 0}`);
      window.TracesApp.notify(`Real query executed in ${data.elapsedMs || elapsedMs} ms (${data.rows ? data.rows.length : 0} rows).`, 'success');
      this.updateAutotrace();
    } catch (err) {
      window.TracesApp.notify(`Connection Bridge Error: ${err.message}`, 'error');
      this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Bridge Communication Error: ${err.message}`);
    }
  }

  async executeScript() {
    const text = this.textarea.value;
    const startTime = performance.now();

    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      window.TracesApp.notify('Executing PL/SQL script on Real Oracle Database...', 'info');
      try {
        const resp = await fetch('/api/script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script: text })
        });
        const data = await resp.json();
        const elapsed = data.elapsedMs || (performance.now() - startTime).toFixed(1);

        if (data.error) {
          this.logScriptOutput(`[${new Date().toLocaleTimeString()}] PL/SQL ERROR: ${data.error}`);
          window.TracesApp.notify(`Script Error: ${data.error}`, 'error');
          this.switchOutputTab('script');
          return;
        }

        if (data.dbmsOutput && data.dbmsOutput.length > 0) {
          this.consoleDbms.innerHTML = data.dbmsOutput.map(line => `
            <div class="console-line dbms">${this.escapeHtml(line)}</div>
          `).join('') + `
            <div class="console-line info" style="margin-top: 8px;">PL/SQL block executed successfully. Elapsed: ${elapsed} ms.</div>
          `;
          this.switchOutputTab('dbms');
        } else {
          this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Script executed successfully in ${elapsed} ms.`);
          this.switchOutputTab('script');
        }
        window.TracesApp.notify(`Script executed in ${elapsed} ms.`, 'success');
      } catch (err) {
        this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Error: ${err.message}`);
        window.TracesApp.notify(`Error: ${err.message}`, 'error');
      }
      return;
    }

    if (text.includes('DBMS_OUTPUT')) {
      this.consoleDbms.innerHTML = `
        <div class="console-line dbms">Session: Connected to Oracle Database</div>
        <div class="console-line info" style="margin-top: 8px;">PL/SQL procedure successfully completed.</div>
      `;
      this.switchOutputTab('dbms');
    } else {
      this.executeStatement();
      this.switchOutputTab('script');
    }

    const elapsed = ((performance.now() - startTime) + 38).toFixed(1);
    this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Script execution finished. Elapsed: ${elapsed} ms.`);
    window.TracesApp.notify(`Script completed in ${elapsed} ms.`, 'success');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async explainPlan() {
    window.TracesApp.switchDockView('explain');
    const sql = this.textarea.value;

    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      window.TracesApp.notify('Requesting DBMS_XPLAN execution plan from Oracle...', 'info');
      try {
        const resp = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await resp.json();
        if (data.planText) {
          const planContainer = document.getElementById('explain-plan-tree');
          if (planContainer) {
            planContainer.innerHTML = `<pre style="font-family: var(--toad-font-code); font-size: 11px; color: #1e293b; background: #fff; padding: 12px; border: 1px solid #cbd5e1; border-radius: 4px; overflow-x: auto; line-height: 1.4;">${this.escapeHtml(data.planText)}</pre>`;
          }
          window.TracesApp.notify('DBMS_XPLAN Execution Plan generated.', 'success');
          return;
        }
      } catch (err) {
        console.warn('Real explain plan fallback', err);
      }
    }

    window.TracesApp.explainPlan.generatePlan(sql);
    window.TracesApp.notify('Execution Plan generated for statement.', 'info');
  }

  formatSql() {
    let sql = this.textarea.value;
    const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'GROUP BY', 'ORDER BY', 'HAVING'];
    keywords.forEach(kw => {
      const reg = new RegExp(`\\b${kw}\\b`, 'gi');
      sql = sql.replace(reg, kw);
    });
    this.textarea.value = sql;
    this.saveActiveTabContent();
    this.updateHighlighting();
    window.TracesApp.notify('SQL Beautifier: Formatted keywords and clauses.', 'info');
  }

  async commitTransaction() {
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: 'COMMIT;' })
        });
      } catch (e) {
        console.warn('Commit error', e);
      }
    }
    this.transactionActive = false;
    this.updateTransactionBadge();
    this.logScriptOutput(`[${new Date().toLocaleTimeString()}] COMMIT complete.`);
    window.TracesApp.notify('Transaction Committed.', 'success');
  }

  async rollbackTransaction() {
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      try {
        await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: 'ROLLBACK;' })
        });
      } catch (e) {
        console.warn('Rollback error', e);
      }
    }
    this.transactionActive = false;
    this.updateTransactionBadge();
    this.logScriptOutput(`[${new Date().toLocaleTimeString()}] ROLLBACK complete.`);
    window.TracesApp.notify('Transaction Rolled Back.', 'warning');
  }

  updateTransactionBadge() {
    const badge = document.getElementById('status-db-transaction');
    if (!badge) return;
    if (this.transactionActive) {
      badge.textContent = 'TRANS: ACTIVE';
      badge.className = 'status-badge badge-tx';
    } else {
      badge.textContent = 'TRANS: IDLE';
      badge.className = 'status-badge';
    }
  }

  switchOutputTab(tabKey) {
    this.outputTabs.forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabKey);
    });

    const panes = document.querySelectorAll('.output-tab-content');
    panes.forEach(p => {
      p.classList.toggle('active', p.id === `output-pane-${tabKey}`);
    });
  }

  logScriptOutput(msg) {
    const div = document.createElement('div');
    div.className = 'console-line';
    div.innerHTML = `<span class="console-timestamp">${new Date().toLocaleTimeString()}</span> <span>${msg}</span>`;
    this.consoleScript.appendChild(div);
    this.consoleScript.scrollTop = this.consoleScript.scrollHeight;
  }

  updateAutotrace() {
    if (!this.autotraceTable) return;
    const metrics = [
      { name: 'recursive calls', value: 3 },
      { name: 'db block gets', value: 0 },
      { name: 'consistent gets', value: 18 },
      { name: 'physical reads', value: 2 },
      { name: 'redo size', value: 0 },
      { name: 'bytes sent via SQL*Net to client', value: 1482 },
      { name: 'bytes received via SQL*Net from client', value: 894 },
      { name: 'SQL*Net roundtrips to/from client', value: 2 },
      { name: 'sorts (memory)', value: 1 },
      { name: 'sorts (disk)', value: 0 },
      { name: 'rows processed', value: 14 }
    ];

    this.autotraceTable.innerHTML = metrics.map(m => `
      <tr>
        <td style="color: var(--text-secondary);">${m.name}</td>
        <td style="font-family: var(--font-code); font-weight: 600; text-align: right; color: var(--text-primary);">${m.value.toLocaleString()}</td>
      </tr>
    `).join('');
  }
}

window.SqlEditor = SqlEditor;
