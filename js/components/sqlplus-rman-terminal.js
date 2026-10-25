/* ==========================================================================
   TRACES TOAD FOR ORACLE - INTERACTIVE SQL*PLUS & RMAN TERMINAL
   Authentic Oracle Command-Line Interface Studio: SQL*Plus & Recovery Manager
   ========================================================================== */

class SqlplusRmanTerminal {
  constructor() {
    this.currentMode = 'sqlplus'; // 'sqlplus' or 'rman'
    this.history = {
      sqlplus: [],
      rman: []
    };
    this.historyIndex = {
      sqlplus: -1,
      rman: -1
    };
    this.outputLogs = {
      sqlplus: [
        "SQL*Plus: Release 2026.2.0 - Production on " + new Date().toLocaleString(),
        "Version 19.19.0.0.0 - Production / Unified Toad Client",
        "Copyright (c) 1982, 2026, Oracle.  All rights reserved.",
        "",
        "Conectado ao ambiente Toad for Oracle.",
        "Sessão pronta. Digite seus comandos ou use os botões rápidos acima."
      ],
      rman: [
        "Recovery Manager: Release 2026.2.0 - Production on " + new Date().toLocaleString(),
        "Version 19.19.0.0.0 - Production / Catalog & Controlfile Client",
        "Copyright (c) 1982, 2026, Oracle and/or its affiliates.  All rights reserved.",
        "",
        "RMAN> CONNECT TARGET /",
        "connected to target database: ORCL (DBID=1582941029)",
        "Sessão RMAN interativa ativa. Digite comandos ou use as ações rápidas."
      ]
    };
    this.init();
  }

  init() {
    // Carregar histórico salvo se houver
    try {
      const h = localStorage.getItem('traces_term_history');
      if (h) {
        const parsed = JSON.parse(h);
        if (parsed.sqlplus) this.history.sqlplus = parsed.sqlplus;
        if (parsed.rman) this.history.rman = parsed.rman;
      }
    } catch (_) {}
  }

  openModal(initialMode = 'sqlplus') {
    this.openTerminalModal(initialMode);
  }

  openTerminalModal(initialMode = 'sqlplus') {
    this.currentMode = initialMode;
    let modal = document.getElementById('modal-interactive-terminal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-interactive-terminal';
      modal.className = 'toad-modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="toad-modal-dialog" style="max-width: 1050px; width: 94%; height: 86vh; display: flex; flex-direction: column; background: #0f172a; border: 1px solid #334155; border-radius: 6px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); overflow: hidden;">
        <!-- Header -->
        <div style="background: #1e293b; padding: 8px 14px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 15px;">📟</span>
              <span style="color: #f8fafc; font-weight: 700; font-size: 12.5px;">Sessão Interativa: SQL*Plus &amp; RMAN Console</span>
            </div>

            <!-- Mode Switcher Tabs -->
            <div style="display: flex; background: #0f172a; padding: 2px; border-radius: 4px; border: 1px solid #334155;">
              <button id="tab-btn-sqlplus" 
                      style="padding: 3px 12px; font-size: 11px; font-weight: 700; border: none; border-radius: 3px; cursor: pointer; background: ${this.currentMode === 'sqlplus' ? '#0284c7' : 'transparent'}; color: ${this.currentMode === 'sqlplus' ? '#fff' : '#94a3b8'};"
                      onclick="window.TracesApp.sqlplusRmanTerminal.switchMode('sqlplus')">
                ⚡ SQL*Plus (SQL&gt;)
              </button>
              <button id="tab-btn-rman" 
                      style="padding: 3px 12px; font-size: 11px; font-weight: 700; border: none; border-radius: 3px; cursor: pointer; background: ${this.currentMode === 'rman' ? '#0284c7' : 'transparent'}; color: ${this.currentMode === 'rman' ? '#fff' : '#94a3b8'};"
                      onclick="window.TracesApp.sqlplusRmanTerminal.switchMode('rman')">
                🛡️ RMAN (RMAN&gt;)
              </button>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <!-- Color Theme Selector -->
            <select class="toad-conn-combobox" id="term-color-theme" style="height: 22px; font-size: 10px; background: #0f172a; color: #cbd5e1; border-color: #475569;" onchange="window.TracesApp.sqlplusRmanTerminal.changeTheme(this.value)">
              <option value="green">🟢 Fósforo Verde</option>
              <option value="amber">🟠 Âmbar Clássico</option>
              <option value="white">⚪ Branco Puro</option>
              <option value="cyan">🔵 Ciano Moderno</option>
            </select>

            <button class="btn" style="padding: 2px 8px; font-size: 10px; background: #334155; color: #f8fafc; border: none;" onclick="window.TracesApp.sqlplusRmanTerminal.copyTerminalOutput()">
              📋 Copiar
            </button>
            <button class="btn" style="padding: 2px 8px; font-size: 10px; background: #334155; color: #f8fafc; border: none;" onclick="window.TracesApp.sqlplusRmanTerminal.exportTerminalLog()">
              💾 Salvar .log
            </button>
            <button class="btn" style="padding: 2px 8px; font-size: 10px; background: #334155; color: #f8fafc; border: none;" onclick="window.TracesApp.sqlplusRmanTerminal.clearScreen()">
              ✕ Limpar Tela (Ctrl+L)
            </button>
            <span class="toad-modal-close" style="color: #94a3b8; font-size: 18px; cursor: pointer; margin-left: 6px;" onclick="document.getElementById('modal-interactive-terminal').classList.remove('open')">✕</span>
          </div>
        </div>

        <!-- Quick Action Bar -->
        <div id="term-quick-bar" style="background: #111827; padding: 6px 12px; border-bottom: 1px solid #1f2937; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
          ${this.renderQuickButtonsHtml()}
        </div>

        <!-- Terminal Output Area -->
        <div id="term-console-screen" 
             style="flex: 1; overflow-y: auto; background: #090d16; padding: 12px 14px; font-family: 'Consolas', 'Courier New', monospace; font-size: 12.5px; line-height: 19px; color: #22c55e; white-space: pre-wrap; word-break: break-all; user-select: text;">
          ${this.getOutputTextHtml()}
        </div>

        <!-- Terminal Input Prompt -->
        <div style="background: #0f172a; border-top: 1px solid #334155; padding: 8px 12px; display: flex; align-items: center; gap: 8px;">
          <span id="term-prompt-label" style="font-family: 'Consolas', monospace; font-weight: 700; font-size: 13px; color: #38bdf8;">
            ${this.currentMode === 'sqlplus' ? 'SQL>' : 'RMAN>'}
          </span>
          <input type="text" id="term-command-input" 
                 placeholder="Digite comando SQL, PL/SQL ou RMAN... (Pressione Enter para executar, ↑/↓ para histórico)" 
                 style="flex: 1; background: #090d16; border: 1px solid #334155; border-radius: 3px; color: #f8fafc; font-family: 'Consolas', monospace; font-size: 12.5px; padding: 6px 10px; outline: none;"
                 onkeydown="window.TracesApp.sqlplusRmanTerminal.onInputKey(event)">
          <button class="btn btn-primary" style="font-weight: 700; font-size: 11px; padding: 6px 12px;" onclick="window.TracesApp.sqlplusRmanTerminal.executeFromInput()">
            ▶ Executar
          </button>
        </div>
      </div>
    `;

    modal.classList.add('open');
    this.scrollToBottom();
    setTimeout(() => {
      document.getElementById('term-command-input')?.focus();
    }, 100);
  }

  switchMode(mode) {
    this.currentMode = mode;
    const btnSql = document.getElementById('tab-btn-sqlplus');
    const btnRman = document.getElementById('tab-btn-rman');
    if (btnSql && btnRman) {
      btnSql.style.background = mode === 'sqlplus' ? '#0284c7' : 'transparent';
      btnSql.style.color = mode === 'sqlplus' ? '#fff' : '#94a3b8';
      btnRman.style.background = mode === 'rman' ? '#0284c7' : 'transparent';
      btnRman.style.color = mode === 'rman' ? '#fff' : '#94a3b8';
    }

    const promptLbl = document.getElementById('term-prompt-label');
    if (promptLbl) {
      promptLbl.textContent = mode === 'sqlplus' ? 'SQL>' : 'RMAN>';
    }

    const quickBar = document.getElementById('term-quick-bar');
    if (quickBar) {
      quickBar.innerHTML = this.renderQuickButtonsHtml();
    }

    this.renderScreen();
    document.getElementById('term-command-input')?.focus();
  }

  renderQuickButtonsHtml() {
    if (this.currentMode === 'sqlplus') {
      return `
        <span style="font-size: 10.5px; color: #94a3b8; font-weight: 600;">Atalhos SQL*Plus:</span>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #38bdf8; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('SHOW USER')">SHOW USER</button>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #38bdf8; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('SHOW SGA')">SHOW SGA</button>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #38bdf8; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('SHOW PARAMETER sga')">SHOW PARAMETER sga</button>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #38bdf8; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('ARCHIVE LOG LIST')">ARCHIVE LOG LIST</button>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #38bdf8; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('SELECT instance_name, status, version, host_name FROM v$instance;')">V$INSTANCE</button>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #38bdf8; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('DESC HR.EMPLOYEES')">DESC HR.EMPLOYEES</button>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #38bdf8; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('SET SERVEROUTPUT ON')">SET SERVEROUTPUT ON</button>
      `;
    } else {
      return `
        <span style="font-size: 10.5px; color: #94a3b8; font-weight: 600;">Atalhos RMAN:</span>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #fbbf24; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('SHOW ALL;')">SHOW ALL;</button>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #fbbf24; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('REPORT NEED BACKUP;')">REPORT NEED BACKUP;</button>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #fbbf24; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('REPORT OBSOLETE;')">REPORT OBSOLETE;</button>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #fbbf24; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('LIST BACKUP SUMMARY;')">LIST BACKUP SUMMARY;</button>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #fbbf24; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('LIST ARCHIVELOG ALL;')">LIST ARCHIVELOG ALL;</button>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #fbbf24; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('CROSSCHECK BACKUP;')">CROSSCHECK BACKUP;</button>
        <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #fbbf24; border: 1px solid #374151;" onclick="window.TracesApp.sqlplusRmanTerminal.runQuickCmd('LIST FAILURE;')">LIST FAILURE;</button>
      `;
    }
  }

  getOutputTextHtml() {
    const lines = this.outputLogs[this.currentMode] || [];
    return lines.map(line => this.escapeHtml(line)).join('\n');
  }

  renderScreen() {
    const el = document.getElementById('term-console-screen');
    if (el) {
      el.innerHTML = this.getOutputTextHtml();
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    const el = document.getElementById('term-console-screen');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  changeTheme(theme) {
    const el = document.getElementById('term-console-screen');
    if (!el) return;
    const colors = {
      green: '#22c55e',
      amber: '#f59e0b',
      white: '#f8fafc',
      cyan: '#38bdf8'
    };
    el.style.color = colors[theme] || '#22c55e';
  }

  onInputKey(e) {
    const mode = this.currentMode;
    const list = this.history[mode];

    if (e.key === 'Enter') {
      e.preventDefault();
      this.executeFromInput();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.length === 0) return;
      if (this.historyIndex[mode] === -1) {
        this.historyIndex[mode] = list.length - 1;
      } else if (this.historyIndex[mode] > 0) {
        this.historyIndex[mode]--;
      }
      const val = list[this.historyIndex[mode]] || '';
      e.target.value = val;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex[mode] !== -1) {
        if (this.historyIndex[mode] < list.length - 1) {
          this.historyIndex[mode]++;
          e.target.value = list[this.historyIndex[mode]] || '';
        } else {
          this.historyIndex[mode] = -1;
          e.target.value = '';
        }
      }
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      this.clearScreen();
    }
  }

  runQuickCmd(cmd) {
    const input = document.getElementById('term-command-input');
    if (input) input.value = cmd;
    this.executeCommand(cmd);
  }

  executeFromInput() {
    const input = document.getElementById('term-command-input');
    if (!input) return;
    const cmd = input.value.trim();
    if (!cmd) return;
    input.value = '';
    this.executeCommand(cmd);
  }

  async executeCommand(cmd) {
    const mode = this.currentMode;
    // Adicionar ao histórico
    if (!this.history[mode].includes(cmd)) {
      this.history[mode].push(cmd);
      if (this.history[mode].length > 100) this.history[mode].shift();
      try {
        localStorage.setItem('traces_term_history', JSON.stringify(this.history));
      } catch (_) {}
    }
    this.historyIndex[mode] = -1;

    // Adicionar comando na tela imediatamente
    this.outputLogs[mode].push(`${mode === 'sqlplus' ? 'SQL>' : 'RMAN>'} ${cmd}`);
    this.renderScreen();

    const endpoint = mode === 'sqlplus' ? '/api/cli/sqlplus' : '/api/cli/rman';
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmd,
          conn_id: activeConn?.id || 'default'
        })
      });
      const data = await resp.json();
      if (data.output) {
        // Remover duplicata do cabeçalho se houver
        const lines = data.output.split('\n');
        this.outputLogs[mode].push(...lines);
      } else if (data.error) {
        this.outputLogs[mode].push(`ERROR: ${data.error}`);
      }
    } catch (e) {
      this.outputLogs[mode].push(`Falha de comunicação: ${e.message}`);
    }

    this.renderScreen();
  }

  clearScreen() {
    this.outputLogs[this.currentMode] = [];
    this.renderScreen();
  }

  copyTerminalOutput() {
    const text = (this.outputLogs[this.currentMode] || []).join('\n');
    navigator.clipboard.writeText(text);
    window.TracesApp?.notify('Conteúdo do terminal copiado para a área de transferência!', 'info');
  }

  exportTerminalLog() {
    const text = (this.outputLogs[this.currentMode] || []).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${this.currentMode}_session_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.log`;
    a.click();
    window.TracesApp?.notify(`Log da sessão ${this.currentMode.toUpperCase()} exportado com sucesso!`, 'success');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.SqlplusRmanTerminal = SqlplusRmanTerminal;
