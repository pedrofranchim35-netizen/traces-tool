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

    this.tabs.forEach(t => {
      t.history = [{ content: t.content, selStart: 0, selEnd: 0 }];
      t.future = [];
    });

    this.activeTabId = 'tab-1';
    this.transactionActive = false;
    this._historyTimer = null;

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

    this.initCodeInsight();
  }

  bindEvents() {
    if (this.textarea) {
      this.textarea.addEventListener('input', (e) => {
        this.saveActiveTabContent();
        this.scheduleGutterUpdate();
        this.updateCursorPosition();
        this.scheduleCodeInsight(e);
        this.scheduleHistorySnapshot();
      });

      this.textarea.addEventListener('keyup', () => this.updateCursorPosition());
      this.textarea.addEventListener('click', () => {
        this.updateCursorPosition();
        this.hideInsight();
      });
      this.textarea.addEventListener('select', () => this.updateCursorPosition());

      this.textarea.addEventListener('scroll', () => {
        if (this.highlightEl) {
          this.highlightEl.scrollTop = this.textarea.scrollTop;
          this.highlightEl.scrollLeft = this.textarea.scrollLeft;
        }
        if (this.gutterEl) {
          this.gutterEl.scrollTop = this.textarea.scrollTop;
        }
        this.hideInsight();
      });

      // Keyboard Shortcuts inside Editor
      this.textarea.addEventListener('keydown', (e) => {
        // Handle Code Insight autocomplete navigation
        if (this.isInsightVisible()) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.navigateInsight(1);
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateInsight(-1);
            return;
          }
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            this.applySelectedInsight();
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            this.hideInsight();
            return;
          }
        }

        // Trigger Code Insight manually via Ctrl+Space
        if ((e.ctrlKey || e.metaKey) && (e.code === 'Space' || e.key === ' ')) {
          e.preventDefault();
          this.triggerCodeInsight(true);
          return;
        }

        // Standard Windows Editing Commands:
        // 1. Ctrl+Z: Undo (Desfazer)
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          this.undo();
          return;
        }

        // 2. Ctrl+Y or Ctrl+Shift+Z: Redo (Refazer)
        if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
            ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
          e.preventDefault();
          this.redo();
          return;
        }

        // 3. Tab: Indent current line or selected block (2 spaces)
        if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault();
          this.indentSelection();
          return;
        }

        // 4. Shift+Tab: Unindent current line or selected block
        if (e.key === 'Tab' && e.shiftKey) {
          e.preventDefault();
          this.unindentSelection();
          return;
        }

        // 5. Ctrl+/ or Ctrl+;: Toggle SQL comments (-- )
        if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key === ';')) {
          e.preventDefault();
          this.toggleComment();
          return;
        }

        // 6. Ctrl+D: Duplicate current line or selection
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          this.duplicateLine();
          return;
        }

        // 7. Ctrl+Shift+K: Delete current line
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          this.deleteLine();
          return;
        }

        // 8. Alt+ArrowUp: Move line up
        if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowUp') {
          e.preventDefault();
          this.moveLine(-1);
          return;
        }

        // 9. Alt+ArrowDown: Move line down
        if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowDown') {
          e.preventDefault();
          this.moveLine(1);
          return;
        }

        // 10. Ctrl+F: Open Find dialog
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'f') {
          e.preventDefault();
          window.TracesApp?.toadModals?.openFindDialog(false);
          return;
        }

        // 11. Ctrl+H: Open Replace dialog
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
          e.preventDefault();
          window.TracesApp?.toadModals?.openFindDialog(true);
          return;
        }

        // 12. Ctrl+G: Go to line
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
          e.preventDefault();
          this.gotoLine();
          return;
        }

        // 13. Ctrl+C when no text selected: copy whole line
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'c') {
          if (this.textarea.selectionStart === this.textarea.selectionEnd) {
            e.preventDefault();
            this.copy();
            return;
          }
        }

        // 14. Ctrl+X when no text selected: cut whole line
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'x') {
          if (this.textarea.selectionStart === this.textarea.selectionEnd) {
            e.preventDefault();
            this.cut();
            return;
          }
        }

        // Teclas tratadas aqui NÃO podem subir para o handler global da janela (app.js),
        // senão o mesmo statement é executado duas vezes (DML duplicado).
        if (e.key === 'F9') {
          e.preventDefault(); e.stopPropagation();
          this.executeStatement();
        } else if (e.key === 'F5') {
          e.preventDefault(); e.stopPropagation();
          this.executeScript();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault(); e.stopPropagation();
          this.executeStatement();
        } else if (e.key === 'F4') {
          e.preventDefault(); e.stopPropagation();
          const pos = this.textarea.selectionStart;
          const text = this.textarea.value;
          const match = text.slice(Math.max(0, pos - 20), pos + 20).match(/[a-zA-Z0-9_.]+/);
          const objName = match ? match[0] : 'HR.EMPLOYEES';
          window.TracesApp.toadModals.openDescribe(objName);
        } else if (e.key === 'F7') {
          e.preventDefault(); e.stopPropagation();
          window.TracesApp.dataGrid.openRecordViewer();
        } else if (e.key === 'F8') {
          e.preventDefault(); e.stopPropagation();
          window.TracesApp.toadModals.openSqlRecall();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
          e.preventDefault(); e.stopPropagation();
          this.explainPlan();
        } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
          e.preventDefault(); e.stopPropagation();
          this.formatSql();
        }
      });

      // Context Menu on right click
      this.textarea.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e.clientX, e.clientY);
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
    const defaultContent = `-- Worksheet ${newNum}\nSELECT * FROM hr.departments;`;
    this.tabs.push({
      id: newId,
      title: `worksheet_${newNum}.sql`,
      content: defaultContent,
      history: [{ content: defaultContent, selStart: 0, selEnd: 0 }],
      future: []
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

  getActiveTab() {
    return this.tabs.find(t => t.id === this.activeTabId) || this.tabs[0];
  }

  saveActiveTabContent() {
    const tab = this.getActiveTab();
    if (tab && this.textarea) {
      tab.content = this.textarea.value;
    }
  }

  loadTabContent() {
    const tab = this.getActiveTab();
    if (!tab || !this.textarea) return;

    this.textarea.value = tab.content;
    if (!tab.history || tab.history.length === 0) {
      tab.history = [{ content: tab.content, selStart: 0, selEnd: 0 }];
      tab.future = [];
    }
    this._lastLineCount = null;
    this.updateHighlighting();
    this.updateGutter();
  }

  // ---------------------------------------------------------------------------
  // UNDO / REDO HISTORY ENGINE & WINDOWS EDIT COMMANDS
  // ---------------------------------------------------------------------------
  pushHistorySnapshot(force = false) {
    if (!this.textarea) return;
    const tab = this.getActiveTab();
    if (!tab) return;
    if (!tab.history) tab.history = [];
    if (!tab.future) tab.future = [];

    const val = this.textarea.value;
    const selStart = this.textarea.selectionStart || 0;
    const selEnd = this.textarea.selectionEnd || 0;

    const last = tab.history[tab.history.length - 1];
    if (last && last.content === val) {
      last.selStart = selStart;
      last.selEnd = selEnd;
      return;
    }

    tab.history.push({
      content: val,
      selStart,
      selEnd
    });

    if (tab.history.length > 150) {
      tab.history.shift();
    }

    if (!force) {
      tab.future = [];
    }
  }

  scheduleHistorySnapshot() {
    if (this._historyTimer) clearTimeout(this._historyTimer);
    this._historyTimer = setTimeout(() => {
      this.pushHistorySnapshot();
    }, 350);
  }

  undo() {
    if (!this.textarea) return;
    const tab = this.getActiveTab();
    if (!tab) return;
    if (!tab.history) tab.history = [];
    if (!tab.future) tab.future = [];

    const currentVal = this.textarea.value;
    const currentSelStart = this.textarea.selectionStart || 0;
    const currentSelEnd = this.textarea.selectionEnd || 0;

    const last = tab.history[tab.history.length - 1];
    if (!last || last.content !== currentVal) {
      this.pushHistorySnapshot();
    }

    if (tab.history.length <= 1) {
      try { document.execCommand('undo'); } catch (e) {}
      this.saveActiveTabContent();
      this.updateHighlighting();
      this.updateGutter();
      return;
    }

    const currentState = tab.history.pop();
    tab.future.push({
      content: currentVal,
      selStart: currentSelStart,
      selEnd: currentSelEnd
    });

    const prevState = tab.history[tab.history.length - 1];
    if (prevState) {
      this.textarea.value = prevState.content;
      this.textarea.setSelectionRange(prevState.selStart, prevState.selEnd);
      this.saveActiveTabContent();
      this.updateHighlighting();
      this.updateGutter();
      this.updateCursorPosition();
    }
  }

  redo() {
    if (!this.textarea) return;
    const tab = this.getActiveTab();
    if (!tab || !tab.future || tab.future.length === 0) {
      try { document.execCommand('redo'); } catch (e) {}
      this.saveActiveTabContent();
      this.updateHighlighting();
      this.updateGutter();
      return;
    }

    const nextState = tab.future.pop();
    if (nextState) {
      tab.history.push({
        content: this.textarea.value,
        selStart: this.textarea.selectionStart || 0,
        selEnd: this.textarea.selectionEnd || 0
      });

      this.textarea.value = nextState.content;
      this.textarea.setSelectionRange(nextState.selStart, nextState.selEnd);
      this.saveActiveTabContent();
      this.updateHighlighting();
      this.updateGutter();
      this.updateCursorPosition();
    }
  }

  selectAll() {
    if (!this.textarea) return;
    this.textarea.focus();
    this.textarea.select();
  }

  async copy() {
    if (!this.textarea) return;
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    let textToCopy = '';
    if (start !== end) {
      textToCopy = this.textarea.value.substring(start, end);
    } else {
      const val = this.textarea.value;
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = val.indexOf('\n', start);
      if (lineEnd === -1) lineEnd = val.length;
      textToCopy = val.substring(lineStart, lineEnd);
    }
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
      } catch (e) {
        document.execCommand('copy');
      }
    }
  }

  async cut() {
    if (!this.textarea) return;
    this.pushHistorySnapshot();
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    if (start !== end) {
      const textToCut = this.textarea.value.substring(start, end);
      try {
        await navigator.clipboard.writeText(textToCut);
      } catch (e) {}
      this.textarea.value = this.textarea.value.substring(0, start) + this.textarea.value.substring(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start;
    } else {
      const val = this.textarea.value;
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = val.indexOf('\n', start);
      const hasNewline = lineEnd !== -1;
      if (lineEnd === -1) lineEnd = val.length;
      const textToCut = val.substring(lineStart, lineEnd);
      try {
        await navigator.clipboard.writeText(textToCut);
      } catch (e) {}
      const cutEnd = hasNewline ? lineEnd + 1 : lineEnd;
      this.textarea.value = val.substring(0, lineStart) + val.substring(cutEnd);
      this.textarea.selectionStart = this.textarea.selectionEnd = Math.min(lineStart, this.textarea.value.length);
    }
    this.saveActiveTabContent();
    this.updateHighlighting();
    this.updateGutter();
    this.pushHistorySnapshot();
  }

  async paste() {
    if (!this.textarea) return;
    this.pushHistorySnapshot();
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const start = this.textarea.selectionStart || 0;
        const end = this.textarea.selectionEnd || 0;
        const val = this.textarea.value;
        this.textarea.value = val.substring(0, start) + text + val.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
        this.saveActiveTabContent();
        this.updateHighlighting();
        this.updateGutter();
        this.pushHistorySnapshot();
        return;
      }
    } catch (e) {}
    document.execCommand('paste');
  }

  indentSelection() {
    this.pushHistorySnapshot();
    const val = this.textarea.value;
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;

    if (start === end) {
      this.textarea.value = val.substring(0, start) + '  ' + val.substring(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
    } else {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = val.indexOf('\n', end);
      const actualEnd = lineEnd === -1 ? val.length : lineEnd;
      const selectedBlock = val.substring(lineStart, actualEnd);
      const lines = selectedBlock.split('\n');
      const indented = lines.map(l => '  ' + l).join('\n');

      this.textarea.value = val.substring(0, lineStart) + indented + val.substring(actualEnd);
      this.textarea.selectionStart = start + 2;
      this.textarea.selectionEnd = end + (lines.length * 2);
    }
    this.saveActiveTabContent();
    this.updateHighlighting();
    this.updateGutter();
    this.pushHistorySnapshot();
  }

  unindentSelection() {
    this.pushHistorySnapshot();
    const val = this.textarea.value;
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;

    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = val.indexOf('\n', end);
    const actualEnd = lineEnd === -1 ? val.length : lineEnd;
    const selectedBlock = val.substring(lineStart, actualEnd);
    const lines = selectedBlock.split('\n');
    let removedCharsFirstLine = 0;
    let totalRemoved = 0;

    const unindented = lines.map((l, i) => {
      let remove = 0;
      if (l.startsWith('  ')) remove = 2;
      else if (l.startsWith(' ') || l.startsWith('\t')) remove = 1;
      totalRemoved += remove;
      if (i === 0) removedCharsFirstLine = remove;
      return l.substring(remove);
    }).join('\n');

    this.textarea.value = val.substring(0, lineStart) + unindented + val.substring(actualEnd);
    this.textarea.selectionStart = Math.max(lineStart, start - removedCharsFirstLine);
    this.textarea.selectionEnd = Math.max(lineStart, end - totalRemoved);
    this.saveActiveTabContent();
    this.updateHighlighting();
    this.updateGutter();
    this.pushHistorySnapshot();
  }

  toggleComment() {
    this.pushHistorySnapshot();
    const val = this.textarea.value;
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;

    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = val.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = val.length;

    const block = val.substring(lineStart, lineEnd);
    const lines = block.split('\n');

    const allCommented = lines.every(l => l.trim().length === 0 || l.trim().startsWith('--'));
    let diffTotal = 0;
    let diffFirst = 0;

    const processed = lines.map((l, i) => {
      if (allCommented) {
        const match = l.match(/^(\s*)--\s?(.*)$/);
        if (match) {
          const cleaned = match[1] + match[2];
          const diff = l.length - cleaned.length;
          diffTotal += diff;
          if (i === 0) diffFirst = diff;
          return cleaned;
        }
        return l;
      } else {
        const match = l.match(/^(\s*)(.*)$/);
        const commented = (match ? match[1] : '') + '-- ' + (match ? match[2] : l);
        const diff = commented.length - l.length;
        diffTotal += diff;
        if (i === 0) diffFirst = diff;
        return commented;
      }
    }).join('\n');

    this.textarea.value = val.substring(0, lineStart) + processed + val.substring(lineEnd);
    if (allCommented) {
      this.textarea.selectionStart = Math.max(lineStart, start - diffFirst);
      this.textarea.selectionEnd = Math.max(lineStart, end - diffTotal);
    } else {
      this.textarea.selectionStart = start + diffFirst;
      this.textarea.selectionEnd = end + diffTotal;
    }
    this.saveActiveTabContent();
    this.updateHighlighting();
    this.updateGutter();
    this.pushHistorySnapshot();
  }

  duplicateLine() {
    this.pushHistorySnapshot();
    const val = this.textarea.value;
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;

    if (start !== end) {
      const sel = val.substring(start, end);
      this.textarea.value = val.substring(0, end) + sel + val.substring(end);
      this.textarea.selectionStart = end;
      this.textarea.selectionEnd = end + sel.length;
    } else {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = val.indexOf('\n', start);
      if (lineEnd === -1) lineEnd = val.length;
      const line = val.substring(lineStart, lineEnd);
      this.textarea.value = val.substring(0, lineEnd) + '\n' + line + val.substring(lineEnd);
      const newPos = start + line.length + 1;
      this.textarea.selectionStart = this.textarea.selectionEnd = newPos;
    }
    this.saveActiveTabContent();
    this.updateHighlighting();
    this.updateGutter();
    this.pushHistorySnapshot();
  }

  deleteLine() {
    this.pushHistorySnapshot();
    const val = this.textarea.value;
    const start = this.textarea.selectionStart;

    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = val.indexOf('\n', start);
    if (lineEnd === -1) {
      lineEnd = val.length;
    } else {
      lineEnd += 1;
    }

    this.textarea.value = val.substring(0, lineStart) + val.substring(lineEnd);
    this.textarea.selectionStart = this.textarea.selectionEnd = Math.min(lineStart, this.textarea.value.length);
    this.saveActiveTabContent();
    this.updateHighlighting();
    this.updateGutter();
    this.pushHistorySnapshot();
  }

  moveLine(dir) {
    this.pushHistorySnapshot();
    const val = this.textarea.value;
    const start = this.textarea.selectionStart;
    const lines = val.split('\n');

    let charCount = 0;
    let currentLineIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      const len = lines[i].length + 1;
      if (start >= charCount && start < charCount + len) {
        currentLineIdx = i;
        break;
      }
      charCount += len;
    }

    const targetLineIdx = currentLineIdx + dir;
    if (targetLineIdx < 0 || targetLineIdx >= lines.length) return;

    let currentLineStart = 0;
    for (let i = 0; i < currentLineIdx; i++) {
      currentLineStart += lines[i].length + 1;
    }
    const colOffset = start - currentLineStart;

    const temp = lines[currentLineIdx];
    lines[currentLineIdx] = lines[targetLineIdx];
    lines[targetLineIdx] = temp;

    this.textarea.value = lines.join('\n');

    let newCharCount = 0;
    for (let i = 0; i < targetLineIdx; i++) {
      newCharCount += lines[i].length + 1;
    }
    const newPos = Math.min(newCharCount + colOffset, newCharCount + lines[targetLineIdx].length);
    this.textarea.selectionStart = this.textarea.selectionEnd = newPos;

    this.saveActiveTabContent();
    this.updateHighlighting();
    this.updateGutter();
    this.pushHistorySnapshot();
  }

  gotoLine() {
    const lineStr = prompt('Toad for Oracle - Ir para Linha:\nDigite o número da linha:', '1');
    if (!lineStr) return;
    const lineNum = parseInt(lineStr, 10);
    if (isNaN(lineNum) || lineNum < 1) return;

    const val = this.textarea.value;
    const lines = val.split('\n');
    if (lineNum > lines.length) {
      window.TracesApp?.notify(`A linha ${lineNum} excede o total de linhas (${lines.length}).`, 'warning');
      return;
    }

    let charPos = 0;
    for (let i = 0; i < lineNum - 1; i++) {
      charPos += lines[i].length + 1;
    }

    this.textarea.focus();
    this.textarea.setSelectionRange(charPos, charPos);
    this.updateCursorPosition();
    this.textarea.scrollTop = Math.max(0, (lineNum - 5) * 18);
  }

  showContextMenu(x, y) {
    const tab = this.getActiveTab();
    const canUndo = Boolean(tab && tab.history && tab.history.length > 1);
    const canRedo = Boolean(tab && tab.future && tab.future.length > 0);

    const items = [
      { label: 'Desfazer', icon: '↶', shortcut: 'Ctrl+Z', disabled: !canUndo, action: () => this.undo() },
      { label: 'Refazer', icon: '↷', shortcut: 'Ctrl+Y', disabled: !canRedo, action: () => this.redo() },
      { separator: true },
      { label: 'Recortar', icon: '✂', shortcut: 'Ctrl+X', action: () => this.cut() },
      { label: 'Copiar', icon: '📋', shortcut: 'Ctrl+C', action: () => this.copy() },
      { label: 'Colar', icon: '📄', shortcut: 'Ctrl+V', action: () => this.paste() },
      { label: 'Selecionar Tudo', icon: '🔲', shortcut: 'Ctrl+A', action: () => this.selectAll() },
      { separator: true },
      { label: 'Comentar / Descomentar', icon: '💬', shortcut: 'Ctrl+/', action: () => this.toggleComment() },
      { label: 'Duplicar Linha', icon: '📑', shortcut: 'Ctrl+D', action: () => this.duplicateLine() },
      { label: 'Excluir Linha', icon: '🗑', shortcut: 'Ctrl+Shift+K', action: () => this.deleteLine() },
      { label: 'Formatar Código SQL', icon: '🧹', shortcut: 'Ctrl+Shift+F', action: () => this.formatSql() },
      { separator: true },
      { label: 'Executar Statement', icon: '▶', shortcut: 'F9', action: () => this.executeStatement() },
      { label: 'Explain Plan', icon: '🌳', shortcut: 'Ctrl+E', action: () => this.explainPlan() }
    ];

    if (typeof window.showToadContextMenu === 'function') {
      window.showToadContextMenu(x, y, items);
    }
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
      'ALL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'PARTITION', 'RETURNING', 'LIMIT', 'BULK', 'COLLECT',
      'SHOW', 'PARAMETER', 'PARAMETERS', 'SPPARAMETER', 'SPPARAMETERS', 'DESCRIBE', 'SGA', 'ERRORS', 'RECYCLEBIN', 'PDBS'
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

    // Check if the current line at cursorPos is a standalone SQL*Plus / Toad client command
    const textBeforeCursor = fullText.substring(0, cursorPos);
    const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
    let lineEnd = fullText.indexOf('\n', cursorPos);
    if (lineEnd === -1) lineEnd = fullText.length;
    const currentLine = fullText.substring(lineStart, lineEnd).trim();
    if (/^(?:show|desc|describe|spool|conn|connect|disc|disconnect)\b/i.test(currentLine)) {
      return currentLine.replace(/;+$/, '').trim();
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

  getMockParameters() {
    return [
      { NUM: 1, NAME: 'audit_trail', TYPE: 'string', VALUE: 'DB', DISPLAY_VALUE: 'DB', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'FALSE', DESCRIPTION: 'enable system auditing' },
      { NUM: 2, NAME: 'compatible', TYPE: 'string', VALUE: '19.0.0', DISPLAY_VALUE: '19.0.0', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'FALSE', DESCRIPTION: 'Database will be completely compatible with this software release' },
      { NUM: 3, NAME: 'control_files', TYPE: 'file', VALUE: '/u01/app/oracle/oradata/ORCL/control01.ctl', DISPLAY_VALUE: '/u01/app/oracle/oradata/ORCL/control01.ctl', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'FALSE', DESCRIPTION: 'control file names list' },
      { NUM: 4, NAME: 'cursor_sharing', TYPE: 'string', VALUE: 'EXACT', DISPLAY_VALUE: 'EXACT', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'cursor sharing mode' },
      { NUM: 5, NAME: 'db_block_buffers', TYPE: 'integer', VALUE: '0', DISPLAY_VALUE: '0', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'FALSE', DESCRIPTION: 'Number of database blocks cached in SGA' },
      { NUM: 6, NAME: 'db_block_checking', TYPE: 'string', VALUE: 'FALSE', DISPLAY_VALUE: 'FALSE', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'header checking and data checking when block changes' },
      { NUM: 7, NAME: 'db_block_checksum', TYPE: 'string', VALUE: 'TYPICAL', DISPLAY_VALUE: 'TYPICAL', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'store checksum in db blocks and verify during reads' },
      { NUM: 8, NAME: 'db_block_size', TYPE: 'integer', VALUE: '8192', DISPLAY_VALUE: '8192', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'FALSE', DESCRIPTION: 'Size of database block in bytes' },
      { NUM: 9, NAME: 'db_cache_size', TYPE: 'big integer', VALUE: '2147483648', DISPLAY_VALUE: '2G', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'Size of DEFAULT buffer pool for standard block size' },
      { NUM: 10, NAME: 'db_name', TYPE: 'string', VALUE: 'ORCL', DISPLAY_VALUE: 'ORCL', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'FALSE', DESCRIPTION: 'database identification name' },
      { NUM: 11, NAME: 'db_recovery_file_dest_size', TYPE: 'big integer', VALUE: '53687091200', DISPLAY_VALUE: '50G', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'db recovery file dest size limit' },
      { NUM: 12, NAME: 'diagnostic_dest', TYPE: 'string', VALUE: '/u01/app/oracle', DISPLAY_VALUE: '/u01/app/oracle', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'FALSE', DESCRIPTION: 'diagnostic directory' },
      { NUM: 13, NAME: 'log_buffer', TYPE: 'big integer', VALUE: '14680064', DISPLAY_VALUE: '14M', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'FALSE', DESCRIPTION: 'redo log buffer size' },
      { NUM: 14, NAME: 'memory_max_target', TYPE: 'big integer', VALUE: '0', DISPLAY_VALUE: '0', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'FALSE', DESCRIPTION: 'max size for Memory Target' },
      { NUM: 15, NAME: 'memory_target', TYPE: 'big integer', VALUE: '0', DISPLAY_VALUE: '0', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'Target size of Oracle SGA and PGA aggregate memory' },
      { NUM: 16, NAME: 'nls_date_format', TYPE: 'string', VALUE: 'YYYY-MM-DD HH24:MI:SS', DISPLAY_VALUE: 'YYYY-MM-DD HH24:MI:SS', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'NLS date format' },
      { NUM: 17, NAME: 'open_cursors', TYPE: 'integer', VALUE: '300', DISPLAY_VALUE: '300', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'max # of open cursors per session' },
      { NUM: 18, NAME: 'optimizer_mode', TYPE: 'string', VALUE: 'ALL_ROWS', DISPLAY_VALUE: 'ALL_ROWS', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'optimizer mode' },
      { NUM: 19, NAME: 'pga_aggregate_limit', TYPE: 'big integer', VALUE: '2147483648', DISPLAY_VALUE: '2G', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'limit on aggregate PGA memory' },
      { NUM: 20, NAME: 'pga_aggregate_target', TYPE: 'big integer', VALUE: '1073741824', DISPLAY_VALUE: '1G', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'Target size for the aggregate PGA memory used by the instance' },
      { NUM: 21, NAME: 'processes', TYPE: 'integer', VALUE: '500', DISPLAY_VALUE: '500', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'FALSE', DESCRIPTION: 'user processes' },
      { NUM: 22, NAME: 'recyclebin', TYPE: 'string', VALUE: 'ON', DISPLAY_VALUE: 'ON', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'enable or disable the recyclebin' },
      { NUM: 23, NAME: 'result_cache_mode', TYPE: 'string', VALUE: 'MANUAL', DISPLAY_VALUE: 'MANUAL', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'Result cache mode' },
      { NUM: 24, NAME: 'session_cached_cursors', TYPE: 'integer', VALUE: '50', DISPLAY_VALUE: '50', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'session cached cursors' },
      { NUM: 25, NAME: 'sessions', TYPE: 'integer', VALUE: '772', DISPLAY_VALUE: '772', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'FALSE', DESCRIPTION: 'user and system sessions' },
      { NUM: 26, NAME: 'sga_max_size', TYPE: 'big integer', VALUE: '4294967296', DISPLAY_VALUE: '4G', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'FALSE', DESCRIPTION: 'max size of SGA' },
      { NUM: 27, NAME: 'sga_target', TYPE: 'big integer', VALUE: '4294967296', DISPLAY_VALUE: '4G', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'Target size of SGA' },
      { NUM: 28, NAME: 'shared_pool_size', TYPE: 'big integer', VALUE: '536870912', DISPLAY_VALUE: '512M', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'size of shared pool' },
      { NUM: 29, NAME: 'undo_management', TYPE: 'string', VALUE: 'AUTO', DISPLAY_VALUE: 'AUTO', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'FALSE', DESCRIPTION: 'instance-starting undo management mode' },
      { NUM: 30, NAME: 'undo_retention', TYPE: 'integer', VALUE: '900', DISPLAY_VALUE: '900', IS_DEFAULT: 'TRUE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'undo retention in seconds' },
      { NUM: 31, NAME: 'undo_tablespace', TYPE: 'string', VALUE: 'UNDOTBS1', DISPLAY_VALUE: 'UNDOTBS1', IS_DEFAULT: 'FALSE', IS_MODIFIABLE: 'IMMEDIATE', DESCRIPTION: 'use/switch undo tablespace' }
    ];
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

    // Check for Describe modal
    const descMatch = text.trim().match(/^(?:desc|describe)\s+([a-zA-Z0-9_$.#]+)/i);
    if (descMatch && window.TracesApp?.toadModals?.openDescribe) {
      window.TracesApp.toadModals.openDescribe(descMatch[1].trim());
    }

    // Record executed query
    this.lastExecutedQuery = text.trim();
    if (window.TracesApp) {
      window.TracesApp.lastExecutedQuery = text.trim();
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

    const cleanCmd = text.replace(/;+$/, '').trim();

    // 1. SHOW PARAMETER / PARAMETERS (Local Mode)
    if (/^SHOW\s+PARAMETER(?:S)?(?:\s+(.+))?$/i.test(cleanCmd)) {
      const pMatch = cleanCmd.match(/^SHOW\s+PARAMETER(?:S)?(?:\s+(.+))?$/i);
      const filter = (pMatch[1] || '').trim().toLowerCase().replace(/['"]/g, '');
      let params = this.getMockParameters();
      if (filter) {
        params = params.filter(p => p.NAME.toLowerCase().includes(filter) || (p.DESCRIPTION && p.DESCRIPTION.toLowerCase().includes(filter)));
      }
      window.TracesApp.dataGrid.setData(params, 'V$PARAMETER', { sql: text, hasMore: false, elapsedMs });
      this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Executando comando SQL*Plus/Toad: ${cleanCmd}`);
      this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Statement executed successfully in ${elapsedMs} ms. Rows fetched: ${params.length}. (V$PARAMETER - Modo Local)`);
      this.switchOutputTab('grid');
      const latEl = document.getElementById('status-db-latency');
      if (latEl) latEl.textContent = `${elapsedMs} ms`;
      const rowsEl = document.getElementById('status-grid-rows');
      if (rowsEl) rowsEl.textContent = `${params.length} rows`;
      window.TracesApp.notify(`SHOW PARAMETER: ${params.length} parâmetros encontrados (V$PARAMETER).`, 'success');
      this.updateAutotrace();
      return;
    }

    // 2. SHOW SGA (Local Mode)
    if (/^SHOW\s+SGA$/i.test(cleanCmd)) {
      const sgaData = [
        { NAME: 'Fixed Size', BYTES: 8945664, MB: 8.53, GB: 0.008 },
        { NAME: 'Variable Size', BYTES: 1073741824, MB: 1024.0, GB: 1.0 },
        { NAME: 'Database Buffers', BYTES: 3204448256, MB: 3056.0, GB: 2.984 },
        { NAME: 'Redo Buffers', BYTES: 7815168, MB: 7.45, GB: 0.007 }
      ];
      window.TracesApp.dataGrid.setData(sgaData, 'V$SGA', { sql: text, hasMore: false, elapsedMs });
      this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Statement executed successfully in ${elapsedMs} ms. Rows fetched: 4. (V$SGA - Modo Local)`);
      this.switchOutputTab('grid');
      window.TracesApp.notify('SHOW SGA: Estatísticas da SGA carregadas.', 'success');
      this.updateAutotrace();
      return;
    }

    // 3. SHOW USER (Local Mode)
    if (/^SHOW\s+USER$/i.test(cleanCmd)) {
      const userData = [
        { CURRENT_USER: 'HR', SESSION_USER: 'HR', CURRENT_SCHEMA: 'HR', DB_NAME: 'ORCL', SERVICE_NAME: 'ORCLPDB', CON_NAME: 'ORCLPDB' }
      ];
      window.TracesApp.dataGrid.setData(userData, 'USERENV', { sql: text, hasMore: false, elapsedMs });
      this.logScriptOutput(`[${new Date().toLocaleTimeString()}] USER is "HR"`);
      this.switchOutputTab('grid');
      window.TracesApp.notify('USER is "HR"', 'success');
      this.updateAutotrace();
      return;
    }

    // 4. SHOW ERRORS (Local Mode)
    if (/^SHOW\s+ERR(?:ORS)?(?:\s+(.+))?$/i.test(cleanCmd)) {
      const errData = [
        { NAME: 'CALC_BONUS_PKG', TYPE: 'PACKAGE BODY', LINE: 42, POSITION: 15, ERROR_TEXT: 'PLS-00201: identifier TOTAL_SALARY must be declared', ATTRIBUTE: 'ERROR', MESSAGE_NUMBER: 201 }
      ];
      window.TracesApp.dataGrid.setData(errData, 'USER_ERRORS', { sql: text, hasMore: false, elapsedMs });
      this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Statement executed successfully in ${elapsedMs} ms. Errors: 1.`);
      this.switchOutputTab('grid');
      window.TracesApp.notify('SHOW ERRORS: 1 erro listado.', 'info');
      this.updateAutotrace();
      return;
    }

    // 5. SHOW RECYCLEBIN (Local Mode)
    if (/^SHOW\s+RECYCLEBIN$/i.test(cleanCmd)) {
      const recData = [
        { OBJECT_NAME: 'BIN$8fKx9m4t==$0', ORIGINAL_NAME: 'OLD_EMP_BACKUP', OPERATION: 'DROP', TYPE: 'TABLE', TABLESPACE: 'USERS', CREATETIME: '2026-10-15 10:20:00', DROPTIME: '2026-10-19 14:02:11', MB_APPROX: 12.5, CAN_UNDROP: 'YES', CAN_PURGE: 'YES' }
      ];
      window.TracesApp.dataGrid.setData(recData, 'USER_RECYCLEBIN', { sql: text, hasMore: false, elapsedMs });
      this.logScriptOutput(`[${new Date().toLocaleTimeString()}] Statement executed successfully in ${elapsedMs} ms. Rows fetched: 1.`);
      this.switchOutputTab('grid');
      window.TracesApp.notify('SHOW RECYCLEBIN: Objetos na lixeira carregados.', 'success');
      this.updateAutotrace();
      return;
    }

    // 6. DESCRIBE (Local Mode)
    if (descMatch) {
      const targetObj = descMatch[1].trim().toUpperCase();
      const schemaName = targetObj.includes('.') ? targetObj.split('.')[0] : 'HR';
      const tblName = targetObj.includes('.') ? targetObj.split('.')[1] : targetObj;
      const schema = window.TRACES_DB.schemas[schemaName] || window.TRACES_DB.schemas['HR'];
      const tbl = schema?.tables?.find(t => t.name.toUpperCase() === tblName);
      const cols = tbl ? tbl.columns.map((c, i) => ({
        ID: i + 1,
        NAME: c.name,
        DATA_TYPE: c.type,
        NULL_ALLOWED: c.pk ? 'N' : 'Y',
        DEFAULT_VALUE: null
      })) : [
        { ID: 1, NAME: 'EMPLOYEE_ID', DATA_TYPE: 'NUMBER(6)', NULL_ALLOWED: 'N', DEFAULT_VALUE: null },
        { ID: 2, NAME: 'FIRST_NAME', DATA_TYPE: 'VARCHAR2(20)', NULL_ALLOWED: 'Y', DEFAULT_VALUE: null },
        { ID: 3, NAME: 'LAST_NAME', DATA_TYPE: 'VARCHAR2(25)', NULL_ALLOWED: 'N', DEFAULT_VALUE: null },
        { ID: 4, NAME: 'EMAIL', DATA_TYPE: 'VARCHAR2(25)', NULL_ALLOWED: 'N', DEFAULT_VALUE: null },
        { ID: 5, NAME: 'SALARY', DATA_TYPE: 'NUMBER(8,2)', NULL_ALLOWED: 'Y', DEFAULT_VALUE: null }
      ];
      window.TracesApp.dataGrid.setData(cols, `DESCRIBE ${targetObj}`, { sql: text, hasMore: false, elapsedMs });
      this.logScriptOutput(`[${new Date().toLocaleTimeString()}] DESCRIBE ${targetObj} executado com sucesso.`);
      this.switchOutputTab('grid');
      window.TracesApp.notify(`DESCRIBE: Estrutura de ${targetObj} carregada.`, 'success');
      this.updateAutotrace();
      return;
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
    this.lastExecutedQuery = sql.trim();
    if (window.TracesApp) {
      window.TracesApp.lastExecutedQuery = sql.trim();
    }
    try {
      window.TracesApp.notify('Executing statement on Real Oracle Database via Bridge Gateway...', 'info');
      const payload = { sql };
      if (params) payload.params = params;
      if (window.TracesApp?.dataGrid?.fetchLimit !== undefined) {
        payload.limit = window.TracesApp.dataGrid.fetchLimit;
      }

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
        window.TracesApp.dataGrid.setData(data.rows, data.tableName || 'QUERY_RESULT', {
          sql,
          hasMore: Boolean(data.hasMore),
          elapsedMs: data.elapsedMs || elapsedMs
        });
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
    const firstStmt = text.split(';')[0]?.trim() || text.trim();
    this.lastExecutedQuery = firstStmt;
    if (window.TracesApp) {
      window.TracesApp.lastExecutedQuery = firstStmt;
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

    const cleanScript = text.replace(/;+$/, '').trim();
    if (/^SHOW\s+PARAMETER(?:S)?(?:\s+(.+))?$/i.test(cleanScript)) {
      const pMatch = cleanScript.match(/^SHOW\s+PARAMETER(?:S)?(?:\s+(.+))?$/i);
      const filter = (pMatch[1] || '').trim().toLowerCase().replace(/['"]/g, '');
      let params = this.getMockParameters();
      if (filter) {
        params = params.filter(p => p.NAME.toLowerCase().includes(filter) || (p.DESCRIPTION && p.DESCRIPTION.toLowerCase().includes(filter)));
      }
      const lines = [
        'NAME                             TYPE        VALUE',
        '-------------------------------- ----------- ------------------------------',
        ...params.map(p => `${p.NAME.padEnd(32)} ${p.TYPE.padEnd(11)} ${p.VALUE}`),
        '',
        `${params.length} rows selected.`
      ];
      this.consoleDbms.innerHTML = lines.map(line => `
        <div class="console-line dbms" style="font-family: var(--toad-font-code); white-space: pre;">${this.escapeHtml(line)}</div>
      `).join('') + `
        <div class="console-line info" style="margin-top: 8px;">Command ${cleanScript} executed successfully. Elapsed: 10.0 ms.</div>
      `;
      this.switchOutputTab('dbms');
      window.TracesApp.notify(`Script SHOW PARAMETER executado com sucesso.`, 'success');
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

    // Determine query to explain:
    // 1. If user explicitly highlighted text in the editor, prioritize that selection
    let sql = '';
    let sourceLabel = '';
    if (this.textarea) {
      const selStart = this.textarea.selectionStart;
      const selEnd = this.textarea.selectionEnd;
      if (typeof selStart === 'number' && typeof selEnd === 'number' && selStart !== selEnd) {
        sql = this.textarea.value.substring(selStart, selEnd).trim();
        sourceLabel = 'QUERY SELECIONADA NO EDITOR';
      }
    }

    // 2. Otherwise prioritize the last executed query (user requirement)
    if (!sql) {
      sql = this.lastExecutedQuery 
        || window.TracesApp?.lastExecutedQuery 
        || window.TracesApp?.dataGrid?.lastSql;
      if (sql) sourceLabel = 'ÚLTIMA QUERY EXECUTADA';
    }

    // 3. Fallback to statement at cursor
    if (!sql) {
      sql = this.getStatementAtCursor();
      if (sql) sourceLabel = 'STATEMENT NO CURSOR';
    }

    // 4. Fallback to active worksheet content
    if (!sql && this.textarea) {
      sql = this.textarea.value.trim();
      if (sql) sourceLabel = 'WORKSHEET ATIVA';
    }

    // Open Explain Plan MDI window
    if (window.TracesApp?.openWindow) {
      window.TracesApp.openWindow('explain');
    } else {
      window.TracesApp?.switchDockView('explain');
    }

    // Generate execution plan through ExplainPlan component
    if (window.TracesApp?.explainPlan) {
      await window.TracesApp.explainPlan.generatePlan(sql, sourceLabel);
    }
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

    this.pushHistorySnapshot();
    this.textarea.value = sql;
    this.saveActiveTabContent();
    this.updateHighlighting();
    this.updateGutter();
    this.pushHistorySnapshot();
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

  /* --------------------------------------------------------------------------
     TOAD CODE INSIGHT (INTELLISENSE AUTOCOMPLETE ENGINE)
     -------------------------------------------------------------------------- */
  initCodeInsight() {
    this.insightEl = document.getElementById('toad-code-insight');
    if (!this.insightEl) {
      this.insightEl = document.createElement('div');
      this.insightEl.id = 'toad-code-insight';
      this.insightEl.className = 'toad-code-insight';
      const container = document.querySelector('.editor-textarea-container');
      if (container) {
        container.appendChild(this.insightEl);
      } else {
        document.body.appendChild(this.insightEl);
      }
    }

    this.insightItems = [];
    this.insightSelectedIndex = 0;
    this.insightTimer = null;

    // Toad Standard Oracle Autocomplete Dictionary
    this.insightDictionary = [
      // SQL*Plus & Toad Commands
      { text: 'SHOW PARAMETER', type: 'Command', icon: '⚡', snippet: 'SHOW PARAMETER ' },
      { text: 'SHOW PARAMETERS', type: 'Command', icon: '⚡', snippet: 'SHOW PARAMETERS ' },
      { text: 'SHOW USER', type: 'Command', icon: '⚡', snippet: 'SHOW USER;' },
      { text: 'SHOW SGA', type: 'Command', icon: '⚡', snippet: 'SHOW SGA;' },
      { text: 'SHOW ERRORS', type: 'Command', icon: '⚡', snippet: 'SHOW ERRORS;' },
      { text: 'SHOW RECYCLEBIN', type: 'Command', icon: '⚡', snippet: 'SHOW RECYCLEBIN;' },
      { text: 'SHOW PDBS', type: 'Command', icon: '⚡', snippet: 'SHOW PDBS;' },
      { text: 'DESCRIBE', type: 'Command', icon: '⚡', snippet: 'DESCRIBE ' },
      { text: 'DESC', type: 'Command', icon: '⚡', snippet: 'DESC ' },

      // SQL & PL/SQL Keywords
      { text: 'SELECT', type: 'Keyword', icon: '🔤' },
      { text: 'FROM', type: 'Keyword', icon: '🔤' },
      { text: 'WHERE', type: 'Keyword', icon: '🔤' },
      { text: 'ORDER BY', type: 'Keyword', icon: '🔤' },
      { text: 'GROUP BY', type: 'Keyword', icon: '🔤' },
      { text: 'HAVING', type: 'Keyword', icon: '🔤' },
      { text: 'INSERT INTO', type: 'Keyword', icon: '🔤' },
      { text: 'VALUES', type: 'Keyword', icon: '🔤' },
      { text: 'UPDATE', type: 'Keyword', icon: '🔤' },
      { text: 'SET', type: 'Keyword', icon: '🔤' },
      { text: 'DELETE FROM', type: 'Keyword', icon: '🔤' },
      { text: 'MERGE INTO', type: 'Keyword', icon: '🔤' },
      { text: 'CREATE TABLE', type: 'Keyword', icon: '🔤' },
      { text: 'ALTER TABLE', type: 'Keyword', icon: '🔤' },
      { text: 'DROP TABLE', type: 'Keyword', icon: '🔤' },
      { text: 'TRUNCATE TABLE', type: 'Keyword', icon: '🔤' },
      { text: 'BEGIN', type: 'Keyword', icon: '🔤' },
      { text: 'DECLARE', type: 'Keyword', icon: '🔤' },
      { text: 'END;', type: 'Keyword', icon: '🔤' },
      { text: 'EXCEPTION', type: 'Keyword', icon: '🔤' },
      { text: 'WHEN OTHERS THEN', type: 'Keyword', icon: '🔤' },
      { text: 'COMMIT;', type: 'Keyword', icon: '🔤' },
      { text: 'ROLLBACK;', type: 'Keyword', icon: '🔤' },
      { text: 'DISTINCT', type: 'Keyword', icon: '🔤' },
      { text: 'INNER JOIN', type: 'Keyword', icon: '🔤' },
      { text: 'LEFT OUTER JOIN', type: 'Keyword', icon: '🔤' },
      { text: 'RIGHT OUTER JOIN', type: 'Keyword', icon: '🔤' },
      { text: 'UNION ALL', type: 'Keyword', icon: '🔤' },
      { text: 'UNION', type: 'Keyword', icon: '🔤' },
      { text: 'INTERSECT', type: 'Keyword', icon: '🔤' },
      { text: 'MINUS', type: 'Keyword', icon: '🔤' },
      { text: 'ROWNUM', type: 'Keyword', icon: '🔤' },
      { text: 'ROWID', type: 'Keyword', icon: '🔤' },
      { text: 'SYSDATE', type: 'Keyword', icon: '🔤' },
      { text: 'SYSTIMESTAMP', type: 'Keyword', icon: '🔤' },
      { text: 'DUAL', type: 'Table', icon: '📦' },

      // Functions
      { text: 'COUNT()', type: 'Function', icon: '⚙', snippet: 'COUNT(*)' },
      { text: 'SUM()', type: 'Function', icon: '⚙', snippet: 'SUM()' },
      { text: 'AVG()', type: 'Function', icon: '⚙', snippet: 'AVG()' },
      { text: 'MIN()', type: 'Function', icon: '⚙', snippet: 'MIN()' },
      { text: 'MAX()', type: 'Function', icon: '⚙', snippet: 'MAX()' },
      { text: 'NVL()', type: 'Function', icon: '⚙', snippet: 'NVL(, 0)' },
      { text: 'NVL2()', type: 'Function', icon: '⚙', snippet: 'NVL2(, , )' },
      { text: 'COALESCE()', type: 'Function', icon: '⚙', snippet: 'COALESCE()' },
      { text: 'DECODE()', type: 'Function', icon: '⚙', snippet: 'DECODE()' },
      { text: 'TO_CHAR()', type: 'Function', icon: '⚙', snippet: "TO_CHAR(, 'YYYY-MM-DD')" },
      { text: 'TO_DATE()', type: 'Function', icon: '⚙', snippet: "TO_DATE(, 'YYYY-MM-DD')" },
      { text: 'TO_NUMBER()', type: 'Function', icon: '⚙', snippet: 'TO_NUMBER()' },
      { text: 'SUBSTR()', type: 'Function', icon: '⚙', snippet: 'SUBSTR(, 1, )' },
      { text: 'INSTR()', type: 'Function', icon: '⚙', snippet: 'INSTR()' },
      { text: 'LENGTH()', type: 'Function', icon: '⚙', snippet: 'LENGTH()' },
      { text: 'TRIM()', type: 'Function', icon: '⚙', snippet: 'TRIM()' },
      { text: 'UPPER()', type: 'Function', icon: '⚙', snippet: 'UPPER()' },
      { text: 'LOWER()', type: 'Function', icon: '⚙', snippet: 'LOWER()' },
      { text: 'REPLACE()', type: 'Function', icon: '⚙', snippet: 'REPLACE()' },
      { text: 'ROUND()', type: 'Function', icon: '⚙', snippet: 'ROUND(, 2)' },
      { text: 'TRUNC()', type: 'Function', icon: '⚙', snippet: 'TRUNC()' },
      { text: 'ROW_NUMBER()', type: 'Function', icon: '⚙', snippet: 'ROW_NUMBER() OVER (ORDER BY )' },
      { text: 'LISTAGG()', type: 'Function', icon: '⚙', snippet: "LISTAGG(, ', ') WITHIN GROUP (ORDER BY )" },

      // System / Data Dictionary Views
      { text: 'V$SESSION', type: 'View', icon: '👁' },
      { text: 'V$PROCESS', type: 'View', icon: '👁' },
      { text: 'V$SQL', type: 'View', icon: '👁' },
      { text: 'V$SQLAREA', type: 'View', icon: '👁' },
      { text: 'V$INSTANCE', type: 'View', icon: '👁' },
      { text: 'V$DATABASE', type: 'View', icon: '👁' },
      { text: 'V$LOCK', type: 'View', icon: '👁' },
      { text: 'V$LATCH', type: 'View', icon: '👁' },
      { text: 'V$VERSION', type: 'View', icon: '👁' },
      { text: 'ALL_TABLES', type: 'View', icon: '👁' },
      { text: 'ALL_TAB_COLUMNS', type: 'View', icon: '👁' },
      { text: 'ALL_VIEWS', type: 'View', icon: '👁' },
      { text: 'ALL_OBJECTS', type: 'View', icon: '👁' },
      { text: 'ALL_INDEXES', type: 'View', icon: '👁' },
      { text: 'ALL_CONSTRAINTS', type: 'View', icon: '👁' },
      { text: 'ALL_USERS', type: 'View', icon: '👁' },
      { text: 'ALL_SOURCE', type: 'View', icon: '👁' },
      { text: 'ALL_SEQUENCES', type: 'View', icon: '👁' },
      { text: 'ALL_SYNONYMS', type: 'View', icon: '👁' },
      { text: 'ALL_TRIGGERS', type: 'View', icon: '👁' },
      { text: 'DBA_TABLES', type: 'View', icon: '👁' },
      { text: 'DBA_USERS', type: 'View', icon: '👁' },
      { text: 'DBA_DATA_FILES', type: 'View', icon: '👁' },
      { text: 'DBA_TABLESPACES', type: 'View', icon: '👁' },
      { text: 'USER_TABLES', type: 'View', icon: '👁' },
      { text: 'USER_TAB_COLUMNS', type: 'View', icon: '👁' },
      { text: 'USER_VIEWS', type: 'View', icon: '👁' },

      // Common Packages
      { text: 'DBMS_OUTPUT.PUT_LINE', type: 'Procedure', icon: '⚡', snippet: "DBMS_OUTPUT.PUT_LINE('');" },
      { text: 'DBMS_OUTPUT.ENABLE', type: 'Procedure', icon: '⚡', snippet: 'DBMS_OUTPUT.ENABLE(NULL);' },
      { text: 'DBMS_LOCK.SLEEP', type: 'Procedure', icon: '⚡', snippet: 'DBMS_LOCK.SLEEP(1);' },
      { text: 'DBMS_METADATA.GET_DDL', type: 'Function', icon: '⚙', snippet: "DBMS_METADATA.GET_DDL('TABLE', 'TABLE_NAME', 'SCHEMA')" }
    ];
  }

  isInsightVisible() {
    return this.insightEl && this.insightEl.classList.contains('visible') && this.insightItems.length > 0;
  }

  scheduleCodeInsight(e) {
    if (this.insightTimer) clearTimeout(this.insightTimer);
    
    // Se o usuário digitou espaço, quebra de linha ou pontuação final, esconde o insight
    const char = e && e.data;
    if (char === ' ' || char === '\n' || char === ';' || char === ',') {
      this.hideInsight();
      return;
    }

    this.insightTimer = setTimeout(() => {
      this.triggerCodeInsight(false);
    }, 70);
  }

  getWordBeforeCaret() {
    if (!this.textarea) return { word: '', start: 0, end: 0, dotContext: null };
    const pos = this.textarea.selectionStart || 0;
    const text = this.textarea.value;
    
    let start = pos;
    while (start > 0 && /[a-zA-Z0-9_$#.]/.test(text[start - 1])) {
      start--;
    }
    const raw = text.substring(start, pos);
    let dotContext = null;
    let word = raw;
    if (raw.includes('.')) {
      const parts = raw.split('.');
      word = parts.pop();
      dotContext = parts.join('.');
    }
    return { word, start: pos - word.length, end: pos, dotContext, fullToken: raw };
  }

  triggerCodeInsight(force = false) {
    if (!this.textarea || !this.insightEl) return;

    const info = this.getWordBeforeCaret();
    const token = info.word.toUpperCase();
    const dot = info.dotContext ? info.dotContext.toUpperCase() : null;

    if (!force && token.length < 2 && !dot) {
      this.hideInsight();
      return;
    }

    let candidates = [];

    // Se temos contexto de ponto (ex: TABELA. ou DBMS_OUTPUT.)
    if (dot) {
      if (dot.includes('DBMS_OUTPUT')) {
        candidates = [
          { text: 'PUT_LINE', type: 'Procedure', icon: '⚡', snippet: "PUT_LINE('');" },
          { text: 'ENABLE', type: 'Procedure', icon: '⚡', snippet: 'ENABLE(NULL);' },
          { text: 'DISABLE', type: 'Procedure', icon: '⚡', snippet: 'DISABLE;' },
          { text: 'GET_LINE', type: 'Procedure', icon: '⚡', snippet: 'GET_LINE(, );' }
        ];
      } else if (dot.includes('V$SESSION')) {
        candidates = [
          { text: 'SID', type: 'Column', icon: '📄' },
          { text: 'SERIAL#', type: 'Column', icon: '📄' },
          { text: 'USERNAME', type: 'Column', icon: '📄' },
          { text: 'STATUS', type: 'Column', icon: '📄' },
          { text: 'OSUSER', type: 'Column', icon: '📄' },
          { text: 'MACHINE', type: 'Column', icon: '📄' },
          { text: 'PROGRAM', type: 'Column', icon: '📄' },
          { text: 'SQL_ID', type: 'Column', icon: '📄' },
          { text: 'EVENT', type: 'Column', icon: '📄' }
        ];
      } else {
        // Tentar obter colunas do Schema Browser
        const sb = window.TracesApp && window.TracesApp.schemaBrowser;
        if (sb && sb.tableColumns && sb.tableColumns[dot]) {
          candidates = sb.tableColumns[dot].map(c => ({
            text: c.name || c.COLUMN_NAME,
            type: 'Column',
            icon: '📄'
          }));
        } else {
          // Colunas padrão genéricas para tabelas Oracle
          candidates = [
            { text: 'ID', type: 'Column', icon: '📄' },
            { text: 'NAME', type: 'Column', icon: '📄' },
            { text: 'STATUS', type: 'Column', icon: '📄' },
            { text: 'CREATED_DATE', type: 'Column', icon: '📄' },
            { text: 'UPDATED_DATE', type: 'Column', icon: '📄' },
            { text: 'DESCRIPTION', type: 'Column', icon: '📄' }
          ];
        }
      }
    } else {
      // Palavras do dicionário padrão
      candidates = [...this.insightDictionary];

      // Adicionar tabelas conhecidas do Schema Browser
      const sb = window.TracesApp && window.TracesApp.schemaBrowser;
      if (sb && Array.isArray(sb.cachedObjects)) {
        sb.cachedObjects.slice(0, 100).forEach(obj => {
          candidates.push({
            text: obj.name || obj.OBJECT_NAME,
            type: obj.type || 'Table',
            icon: obj.type === 'VIEW' ? '👁' : (obj.type === 'PROCEDURE' ? '⚡' : '📦')
          });
        });
      }
    }

    // Filtrar candidatos pelo que o usuário já digitou
    let filtered = candidates.filter(item => {
      if (!token) return true;
      return item.text.toUpperCase().startsWith(token) || item.text.toUpperCase().includes(token);
    });

    if (filtered.length === 0) {
      this.hideInsight();
      return;
    }

    // Limitar a 18 sugestões para alta performance
    this.insightItems = filtered.slice(0, 18);
    this.insightSelectedIndex = 0;
    this.renderInsightItems();

    // Posicionar o popup perto do cursor
    this.positionInsightPopup();
    this.insightEl.classList.add('visible');
  }

  positionInsightPopup() {
    if (!this.textarea || !this.insightEl) return;

    const pos = this.textarea.selectionStart || 0;
    const text = this.textarea.value.substring(0, pos);
    const lines = text.split('\n');
    const lineIndex = lines.length - 1;
    const colIndex = lines[lineIndex].length;

    const lineHeight = 19;
    const charWidth = 7.8;

    const container = this.textarea.parentElement || this.textarea;
    const containerRect = container.getBoundingClientRect();

    let top = (lineIndex * lineHeight) - this.textarea.scrollTop + lineHeight + 12;
    let left = (colIndex * charWidth) - this.textarea.scrollLeft + 12;

    // Manter dentro dos limites da tela/container
    if (left + 300 > containerRect.width) {
      left = Math.max(10, containerRect.width - 310);
    }
    if (top + 240 > containerRect.height && top > 240) {
      top = top - 240 - lineHeight;
    }

    this.insightEl.style.top = `${Math.max(4, top)}px`;
    this.insightEl.style.left = `${Math.max(4, left)}px`;
  }

  renderInsightItems() {
    if (!this.insightEl) return;
    this.insightEl.innerHTML = this.insightItems.map((item, idx) => `
      <div class="insight-item ${idx === this.insightSelectedIndex ? 'selected' : ''}" data-index="${idx}" onmousedown="event.preventDefault(); window.TracesApp.sqlEditor.applyInsightByIndex(${idx})">
        <div class="insight-item-left">
          <span class="insight-item-icon">${item.icon || '🔤'}</span>
          <span class="insight-item-text">${this.escapeHtml(item.text)}</span>
        </div>
        <span class="insight-item-type">${item.type}</span>
      </div>
    `).join('');

    // Rolar item selecionado para a visão
    const selEl = this.insightEl.querySelector('.insight-item.selected');
    if (selEl) {
      selEl.scrollIntoView({ block: 'nearest' });
    }
  }

  navigateInsight(delta) {
    if (this.insightItems.length === 0) return;
    this.insightSelectedIndex = (this.insightSelectedIndex + delta + this.insightItems.length) % this.insightItems.length;
    this.renderInsightItems();
  }

  applyInsightByIndex(idx) {
    this.insightSelectedIndex = idx;
    this.applySelectedInsight();
  }

  applySelectedInsight() {
    if (!this.isInsightVisible() || !this.insightItems[this.insightSelectedIndex]) {
      this.hideInsight();
      return;
    }

    const item = this.insightItems[this.insightSelectedIndex];
    const info = this.getWordBeforeCaret();
    const insertText = item.snippet || item.text;

    const text = this.textarea.value;
    const before = text.substring(0, info.start);
    const after = text.substring(info.end);

    this.textarea.value = before + insertText + after;
    
    // Posicionar cursor: se inseriu com parênteses, posicionar entre parênteses
    let newCursorPos = before.length + insertText.length;
    if (insertText.endsWith("');")) {
      newCursorPos = before.length + insertText.length - 3;
    } else if (insertText.endsWith(");")) {
      newCursorPos = before.length + insertText.length - 2;
    } else if (insertText.endsWith("')")) {
      newCursorPos = before.length + insertText.length - 2;
    } else if (insertText.endsWith(')')) {
      newCursorPos = before.length + insertText.length - 1;
    }

    this.textarea.selectionStart = this.textarea.selectionEnd = newCursorPos;
    this.hideInsight();
    this.saveActiveTabContent();
    this.updateHighlighting();
    this.updateGutter();
    this.textarea.focus();
  }

  hideInsight() {
    if (this.insightTimer) clearTimeout(this.insightTimer);
    if (this.insightEl) {
      this.insightEl.classList.remove('visible');
      this.insightEl.innerHTML = '';
    }
    this.insightItems = [];
    this.insightSelectedIndex = 0;
  }
}

window.SqlEditor = SqlEditor;

