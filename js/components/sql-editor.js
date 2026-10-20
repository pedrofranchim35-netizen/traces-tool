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
        this.scheduleGutterUpdate();
        this.updateCursorPosition();
      });

      this.textarea.addEventListener('keyup', () => this.updateCursorPosition());
      this.textarea.addEventListener('click', () => this.updateCursorPosition());
      this.textarea.addEventListener('select', () => this.updateCursorPosition());

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
        } else if (e.key === 'F7') {
          e.preventDefault();
          window.TracesApp.dataGrid.openRecordViewer();
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
    this._lastLineCount = null;
    this.updateHighlighting();
    this.updateGutter();
  }

  scheduleGutterUpdate() {
    if (this._rafGutter) cancelAnimationFrame(this._rafGutter);
    this._rafGutter = requestAnimationFrame(() => {
      this.updateGutter();
      this.updateHighlighting();
    });
  }

  updateGutter() {
    if (!this.gutterEl || !this.textarea) return;
    const lineCount = this.textarea.value.split('\n').length;
    if (this._lastLineCount === lineCount) return;
    this._lastLineCount = lineCount;

    let html = '';
    for (let i = 1; i <= lineCount; i++) {
      html += `<div class="gutter-line">${i}</div>`;
    }
    this.gutterEl.innerHTML = html;
  }

  updateHighlighting() {
    if (this.highlightEl && this.highlightEl.style.display !== 'none') {
      const code = this.textarea.value;
      this.highlightEl.innerHTML = this.highlightSql(code);
    }
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

  getStatementAtCursor() {
    if (!this.textarea) return '';
    const fullText = this.textarea.value;
    const cursorPos = this.textarea.selectionStart || 0;

    // If selection exists, return selection
    if (this.textarea.selectionStart !== this.textarea.selectionEnd) {
      return fullText.substring(this.textarea.selectionStart, this.textarea.selectionEnd).trim();
    }

    // Split text by semicolon preserving positions
    const statements = fullText.split(';');
    let charCount = 0;
    for (let stmt of statements) {
      const stmtStart = charCount;
      const stmtEnd = charCount + stmt.length + 1; // +1 for the semicolon
      if (cursorPos >= stmtStart && cursorPos <= stmtEnd) {
        return stmt.trim();
      }
      charCount = stmtEnd;
    }

    // Default to full text if nothing found
    return fullText.trim();
  }

  getQuery() {
    return this.textarea ? this.textarea.value : '';
  }

  setQuery(sql) {
    if (this.textarea) {
      this.textarea.value = sql;
      this.saveActiveTabContent();
      this.updateHighlighting();
      this.updateGutter();
    }
  }

  insertTextAtCursor(text) {
    if (!this.textarea) return;
    const start = this.textarea.selectionStart || 0;
    const end = this.textarea.selectionEnd || 0;
    const val = this.textarea.value;
    this.textarea.value = val.substring(0, start) + text + val.substring(end);
    this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
    this.saveActiveTabContent();
    this.updateHighlighting();
    this.updateGutter();
  }

  // Execution Handlers
  executeStatement() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Não há conexão ativa com o banco. Conecte-se para executar comandos SQL.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    let text = this.getStatementAtCursor();
    if (!text || !text.trim()) {
      text = this.textarea ? this.textarea.value.trim() : '';
    }
    if (!text) {
      window.TracesApp.notify('Nenhum comando SQL na worksheet para executar.', 'warning');
      return;
    }

    // 1. Check for substitution variables (&var or &&var)
    const substMatches = text.match(/&{1,2}[a-zA-Z0-9_]+/g);
    if (substMatches && substMatches.length > 0 && !window.__executingWithSubst) {
      let substitutedText = text;
      const uniqueSubsts = Array.from(new Set(substMatches));
      for (const sVar of uniqueSubsts) {
        const varName = sVar.replace(/^&&?/, '');
        let val = window.TracesApp.toadModals.sessionSubstitutionVars[varName];
        if (val === undefined || !sVar.startsWith('&&')) {
          val = prompt(`Oracle Substitution Variable Input\nEnter value for ${sVar}:`, '10');
          if (val === null) return;
          if (sVar.startsWith('&&')) {
            window.TracesApp.toadModals.sessionSubstitutionVars[varName] = val;
          }
        }
        const reg = new RegExp(sVar.replace(/&/g, '\\&'), 'g');
        substitutedText = substitutedText.replace(reg, val);
      }
      text = substitutedText;
    }

    // 2. Check for bind variables (:var)
    const bindMatches = text.match(/:[a-zA-Z0-9_]+/g);
    if (bindMatches && bindMatches.length > 0 && !window.__executingWithBinds) {
      const uniqueBinds = Array.from(new Set(bindMatches));
      this.currentPendingSql = text;
      window.TracesApp.toadModals.openBindVariables(uniqueBinds);
      return;
    }

    // Route to real database if connected
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      this.executeRealStatement(text);
      return;
    }

    const startTime = performance.now();
    const elapsedMs = ((performance.now() - startTime) + Math.random() * 30 + 15).toFixed(1);

    this.transactionActive = true;
    this.updateTransactionBadge();

    // Record into SavedSQL.dat for F8 SQL Recall
    if (window.TRACES_DB && window.TRACES_DB.savedSql) {
      window.TRACES_DB.savedSql.unshift({
        timestamp: new Date().toLocaleTimeString(),
        schema: window.TRACES_DB.activeSchema || 'HR',
        executions: 1,
        text: text.trim()
      });
    }

    // Route query results to Data Grid
    if (window.TRACES_DB && window.TRACES_DB.schemas) {
      if (text.toLowerCase().includes('sales_transactions') || text.toLowerCase().includes('sales_admin')) {
        const salesData = window.TRACES_DB.schemas['SALES_ADMIN']?.tables[1]?.data || [];
        window.TracesApp.dataGrid.setData(salesData, 'SALES_TRANSACTIONS');
      } else {
        const empData = window.TRACES_DB.schemas['HR']?.tables[0]?.data || [];
        window.TracesApp.dataGrid.setData(empData, 'EMPLOYEES');
      }
    }

    // Update Script output log
    this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Statement executed successfully in ${elapsedMs} ms. Rows fetched: 14. (Modo Local)`);
    
    // Switch to Data Grid tab
    this.switchOutputTab('grid');
    const latEl = document.getElementById('status-db-latency');
    if (latEl) latEl.textContent = `${elapsedMs} ms`;
    window.TracesApp.notify(`Executado em ${elapsedMs} ms (Modo Local). Conecte ao banco real no botão ⚡ Connect para dados ao vivo.`, 'success');

    this.updateAutotrace();
  }

  executeWithBinds(params) {
    const sql = this.currentPendingSql || this.getStatementAtCursor();
    this.currentPendingSql = null;
    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      this.executeRealStatement(sql, params);
    } else {
      window.__executingWithBinds = true;
      this.executeStatement();
      window.__executingWithBinds = false;
    }
  }

  async executeRealStatement(sql, params = null) {
    const startTime = performance.now();
    try {
      window.TracesApp.notify('Executing statement on Real Oracle Database via Bridge Gateway...', 'info');
      const payload = { sql };
      if (params) payload.params = params;

      const resp = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

      this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Real Oracle execution completed in ${data.elapsedMs || elapsedMs} ms. Rows returned: ${data.rows ? data.rows.length : (data.rowsAffected || 0)}`);
      const latEl = document.getElementById('status-db-latency');
      if (latEl) latEl.textContent = `${data.elapsedMs || elapsedMs} ms`;
      const rowsEl = document.getElementById('status-grid-rows');
      if (rowsEl && data.rows) rowsEl.textContent = `${data.rows.length.toLocaleString()} rows`;
      window.TracesApp.notify(`Real query executed in ${data.elapsedMs || elapsedMs} ms (${data.rows ? data.rows.length : (data.rowsAffected || 0)} rows).`, 'success');
      
      if (data.autotrace) {
        this.updateAutotrace(data.autotrace);
      } else {
        this.updateAutotrace();
      }
    } catch (err) {
      window.TracesApp.notify(`Connection Bridge Error: ${err.message}`, 'error');
      this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Bridge Communication Error: ${err.message}`);
    }
  }

  async executeScript() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Não há conexão ativa com o banco. Conecte-se para executar scripts SQL.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    const text = this.textarea ? this.textarea.value : '';
    if (!text || !text.trim()) {
      window.TracesApp.notify('Nenhum script na worksheet para executar.', 'warning');
      return;
    }
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
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Não há conexão ativa com o banco. Conecte-se para gerar Explain Plan.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

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
    let sql = this.textarea.value.trim();
    if (!sql) return;

    // Toad FmtPlus SQL Beautifier
    const majorKeywords = [
      'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY',
      'INNER JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN', 'JOIN',
      'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'MERGE INTO',
      'CREATE OR REPLACE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE',
      'DECLARE', 'BEGIN', 'EXCEPTION', 'END', 'COMMIT', 'ROLLBACK',
      'UNION ALL', 'UNION', 'MINUS', 'INTERSECT'
    ];

    const inlineKeywords = [
      'AND', 'OR', 'ON', 'AS', 'IN', 'IS NULL', 'IS NOT NULL', 'BETWEEN',
      'LIKE', 'EXISTS', 'NOT EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE',
      'DISTINCT', 'ALL', 'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST',
      'PARTITION BY', 'OVER', 'ROWNUM', 'SYSDATE', 'SYSTIMESTAMP',
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'NVL', 'NVL2', 'DECODE',
      'TO_CHAR', 'TO_DATE', 'TO_NUMBER', 'COALESCE', 'SUBSTR', 'INSTR', 'UPPER', 'LOWER'
    ];

    // Uppercase keywords
    majorKeywords.concat(inlineKeywords).forEach(kw => {
      const reg = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      sql = sql.replace(reg, kw);
    });

    // Formatting clauses onto new lines with indentation
    sql = sql
      .replace(/\s+/g, ' ')
      .replace(/\bSELECT\b/g, '\nSELECT\n  ')
      .replace(/,\s*/g, ',\n  ')
      .replace(/\bFROM\b/g, '\nFROM\n  ')
      .replace(/\b(INNER JOIN|LEFT OUTER JOIN|RIGHT OUTER JOIN|FULL OUTER JOIN|JOIN)\b/g, '\n$1 ')
      .replace(/\bON\b/g, '\n  ON ')
      .replace(/\bWHERE\b/g, '\nWHERE\n  ')
      .replace(/\bAND\b/g, '\n  AND ')
      .replace(/\bOR\b/g, '\n  OR ')
      .replace(/\bGROUP BY\b/g, '\nGROUP BY\n  ')
      .replace(/\bHAVING\b/g, '\nHAVING\n  ')
      .replace(/\bORDER BY\b/g, '\nORDER BY\n  ')
      .replace(/\bUNION ALL\b/g, '\n\nUNION ALL\n\n')
      .replace(/\bUNION\b/g, '\n\nUNION\n\n')
      .trim();

    this.textarea.value = sql;
    this.saveActiveTabContent();
    this.updateHighlighting();
    window.TracesApp.notify('Toad FmtPlus: SQL formatted with standard clause indentation.', 'info');
  }

  async commitTransaction() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Não há conexão ativa com o banco para efetuar COMMIT.', 'warning');
      return;
    }

    if (window.TracesApp && window.TracesApp.dataGrid) {
      await window.TracesApp.dataGrid.commitPendingChanges();
    } else if (window.TracesApp && window.TracesApp.isRealDatabase) {
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
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Não há conexão ativa com o banco para efetuar ROLLBACK.', 'warning');
      return;
    }

    if (window.TracesApp && window.TracesApp.dataGrid) {
      window.TracesApp.dataGrid.rollbackPendingChanges();
    } else if (window.TracesApp && window.TracesApp.isRealDatabase) {
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
      badge.textContent = '[Transaction: Active]';
      badge.className = 'status-cell cell-tx active';
    } else {
      badge.textContent = '[Transaction: Idle]';
      badge.className = 'status-cell cell-tx';
    }
  }

  updateCursorPosition() {
    if (!this.textarea) return;
    const pos = this.textarea.selectionStart || 0;
    const text = this.textarea.value.substring(0, pos);
    const lines = text.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    const posEl = document.getElementById('status-editor-pos');
    if (posEl) posEl.textContent = `Ln ${line}, Col ${col}`;
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

  updateAutotrace(metrics = null) {
    if (!this.autotraceTable) return;
    const list = metrics || [
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

    this.autotraceTable.innerHTML = list.map(m => `
      <tr>
        <td style="color: var(--text-secondary);">${m.name}</td>
        <td style="font-family: var(--font-code); font-weight: 600; text-align: right; color: var(--text-primary);">${typeof m.value === 'number' ? m.value.toLocaleString() : m.value}</td>
      </tr>
    `).join('');
  }

  // ---------------------------------------------------------------------------
  // TOAD CODE SNIPPETS LIBRARY
  // ---------------------------------------------------------------------------
  async openCodeSnippetsModal() {
    const modal = document.getElementById('modal-code-snippets');
    if (!modal) return;
    modal.classList.add('open');

    if (!this.snippetsData) {
      try {
        const resp = await fetch('assets/CodeSnippets.json');
        this.snippetsData = await resp.json();
      } catch (e) {
        console.warn('Could not load CodeSnippets.json', e);
      }
    }

    if (this.snippetsData && this.snippetsData.Categories) {
      const catSelect = document.getElementById('snippets-category-select');
      if (catSelect && catSelect.options.length === 0) {
        catSelect.innerHTML = this.snippetsData.Categories.map((c, i) => `
          <option value="${c.Category}" ${i === 0 ? 'selected' : ''}>${c.Category} (${c.Snippets ? c.Snippets.length : 0})</option>
        `).join('');
      }
      this.activeSnippetCategory = catSelect ? catSelect.value : this.snippetsData.Categories[0].Category;
      this.snippetSearchQuery = '';
      this.renderSnippetsTable();
    }
  }

  onSnippetCategoryChanged(category) {
    this.activeSnippetCategory = category;
    this.renderSnippetsTable();
  }

  onSnippetSearchChanged(query) {
    this.snippetSearchQuery = query.toLowerCase().trim();
    this.renderSnippetsTable();
  }

  renderSnippetsTable() {
    const tbody = document.getElementById('snippets-table-body');
    if (!tbody || !this.snippetsData) return;

    const catObj = this.snippetsData.Categories.find(c => c.Category === this.activeSnippetCategory);
    let snippets = catObj ? (catObj.Snippets || []) : [];

    if (this.snippetSearchQuery) {
      snippets = snippets.filter(s => 
        (s.DisplayName && s.DisplayName.toLowerCase().includes(this.snippetSearchQuery)) ||
        (s.Description && s.Description.toLowerCase().includes(this.snippetSearchQuery)) ||
        (s.Text && s.Text.toLowerCase().includes(this.snippetSearchQuery))
      );
    }

    if (snippets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 24px; color: var(--text-muted);">Nenhum snippet encontrado para "${this.snippetSearchQuery || this.activeSnippetCategory}".</td></tr>`;
      return;
    }

    tbody.innerHTML = snippets.map((s, idx) => `
      <tr style="cursor: pointer;" ondblclick="window.TracesApp.sqlEditor.insertSnippet('${encodeURIComponent(s.Text || s.DisplayName)}')">
        <td style="font-family: var(--font-code); font-weight: 700; color: #0078d7;">${this.escapeHtml(s.DisplayName || s.Text)}</td>
        <td style="font-size: 11px; color: var(--text-secondary);">${this.escapeHtml(s.Description || '-')}</td>
        <td style="text-align: center;">
          <button class="btn btn-primary" style="height: 22px; padding: 0 8px; font-size: 10px;" onclick="window.TracesApp.sqlEditor.insertSnippet('${encodeURIComponent(s.Text || s.DisplayName)}')">
            Inserir
          </button>
        </td>
      </tr>
    `).join('');
  }

  insertSnippet(encodedText) {
    const text = decodeURIComponent(encodedText);
    const modal = document.getElementById('modal-code-snippets');
    if (modal) modal.classList.remove('open');

    if (!this.textarea) return;

    const start = this.textarea.selectionStart || 0;
    const end = this.textarea.selectionEnd || 0;
    const current = this.textarea.value;

    const newText = current.substring(0, start) + text + current.substring(end);
    this.textarea.value = newText;
    this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;

    this.saveActiveTabContent();
    this.updateHighlighting();
    this.updateGutter();
    this.textarea.focus();

    window.TracesApp.notify(`Snippet "${text.split('(')[0]}" inserido no editor.`, 'info');
  }
}

window.SqlEditor = SqlEditor;

