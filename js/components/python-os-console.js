/* ==========================================================================
   TRACES TOAD FOR ORACLE - PYTHON CONSOLE & OPERATING SYSTEM AUTOMATION
   Interactive Python script execution with complete host OS access,
   Oracle automation, system diagnostic utilities, and shell command runner.
   ========================================================================== */

class PythonOsConsole {
  constructor() {
    this.snippets = [
      {
        name: '💾 Espaço em Disco & Volumes',
        desc: 'Verifica partições e espaço livre/usado via shutil',
        code: `import shutil, os

total, used, free = shutil.disk_usage("/")
print("=" * 55)
print("  DIAGNÓSTICO DE ARMAZENAMENTO DO SISTEMA OPERACIONAL")
print("=" * 55)
print(f"Total no Volume:  {total / (1024**3):.2f} GB")
print(f"Espaço Ocupado:   {used / (1024**3):.2f} GB ({(used/total)*100:.1f}%)")
print(f"Espaço Livre:     {free / (1024**3):.2f} GB ({(free/total)*100:.1f}%)")
print(f"Diretório Atual:  {os.getcwd()}")
print("=" * 55)`
      },
      {
        name: '🖥️ Specs do Servidor & S.O.',
        desc: 'Plataforma, CPU, arquitetura e versão do Python',
        code: `import platform, os, sys

print("=" * 55)
print("  INFORMAÇÕES DA MÁQUINA HOSPEDEIRA")
print("=" * 55)
print(f"Sistema Operacional: {platform.system()} {platform.release()} ({platform.version()})")
print(f"Arquitetura:         {platform.machine()} / {platform.architecture()[0]}")
print(f"Nome do Host:        {platform.node()}")
print(f"Processador / CPU:   {platform.processor() or os.cpu_count()} núcleos lógicos")
print(f"Versão do Python:    {sys.version.split()[0]} ({sys.executable})")
print("=" * 55)`
      },
      {
        name: '🌐 Variáveis de Ambiente Oracle',
        desc: 'Inspeciona ORACLE_HOME, ORACLE_SID, TNS_ADMIN e PATH',
        code: `import os

print("=" * 55)
print("  VARIÁVEIS DE AMBIENTE ORACLE NO S.O.")
print("=" * 55)
oracle_vars = ["ORACLE_HOME", "ORACLE_SID", "ORACLE_BASE", "TNS_ADMIN", "LD_LIBRARY_PATH", "PATH"]
for var in oracle_vars:
    val = os.environ.get(var)
    if val:
        print(f"{var:<18} = {val}")
    else:
        print(f"{var:<18} = (não definida)")
print("=" * 55)`
      },
      {
        name: '⚙️ Processos Ativos no S.O.',
        desc: 'Executa comando nativo do sistema para listar processos',
        code: `import subprocess, sys

cmd = "tasklist" if sys.platform == "win32" else "ps -ef | head -n 25"
res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
print(res.stdout[:2000])`
      },
      {
        name: '⚡ Consulta ao Banco via oracledb',
        desc: 'Usa a conexão ativa do Toad diretamente pelo script Python',
        code: `# O objeto 'conn' da conexão ativa com o Oracle já está injetado no escopo!
if conn:
    with conn.cursor() as cur:
        cur.execute("SELECT banner FROM v$version")
        row = cur.fetchone()
        print("Conectado ao Oracle com sucesso via Python:")
        print(f"Versão: {row[0]}")
        
        cur.execute("SELECT username, account_status FROM dba_users WHERE rownum <= 5")
        print("\nPrimeiros 5 usuários do banco:")
        for u, st in cur.fetchall():
            print(f" - {u:<20} [{st}]")
else:
    print("Nenhuma conexão ativa no momento. Conecte pelo Toad ou passe credenciais.")`
      },
      {
        name: '📡 Teste de Porta de Rede TCP',
        desc: 'Testa conectividade direta de socket com listener Oracle',
        code: `import socket, time

host = "localhost"
port = 1521
t0 = time.time()
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(2.0)
    s.connect((host, port))
    latency = (time.time() - t0) * 1000
    s.close()
    print(f"✔ Porta {port} em {host} está ABERTA e acessível! (Latência: {latency:.2f} ms)")
except Exception as e:
    print(f"✖ Falha ao conectar na porta {port} em {host}: {e}")`
      }
    ];
    this.history = [];
    this.lastOutput = null;
  }

  openModal() {
    this.openConsoleModal();
  }

  openConsoleModal() {
    let modal = document.getElementById('modal-python-os-console');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-python-os-console';
      modal.className = 'toad-modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="toad-modal-dialog" style="max-width: 1100px; width: 94%; height: 88vh; display: flex; flex-direction: column; background: #0f172a; border: 1px solid #334155; border-radius: 6px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); overflow: hidden;">
        <!-- Header -->
        <div style="background: #1e293b; padding: 8px 14px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">🐍</span>
            <span style="color: #f8fafc; font-weight: 700; font-size: 13px;">Python Console &amp; Automação do Sistema Operacional (OS Access)</span>
            <span class="status-indicator valid" style="font-size: 10px;">ACESSO TOTAL AO S.O.</span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-primary" style="font-weight: 700; font-size: 11px; padding: 4px 12px; background: #16a34a; border-color: #15803d;" onclick="window.TracesApp.pythonOsConsole.executeScript()">
              ▶ Executar Script (F5)
            </button>
            <button class="btn" style="font-size: 11px; padding: 4px 8px; background: #334155; color: #f8fafc; border: none;" onclick="window.TracesApp.pythonOsConsole.clearOutput()">
              ✕ Limpar Saída
            </button>
            <span class="toad-modal-close" style="color: #94a3b8; font-size: 18px; cursor: pointer; margin-left: 6px;" onclick="document.getElementById('modal-python-os-console').classList.remove('open')">✕</span>
          </div>
        </div>

        <!-- Snippets Bar -->
        <div style="background: #111827; padding: 6px 12px; border-bottom: 1px solid #1f2937; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 10.5px; color: #94a3b8; font-weight: 600;">Templates Rápidos:</span>
          ${this.snippets.map((snip, idx) => `
            <button class="btn" style="font-size: 10px; padding: 2px 7px; background: #1f2937; color: #38bdf8; border: 1px solid #374151;" title="${snip.desc}" onclick="window.TracesApp.pythonOsConsole.loadSnippet(${idx})">
              ${snip.name}
            </button>
          `).join('')}
        </div>

        <!-- Body: Split into Editor (Top) and Output (Bottom) -->
        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
          <!-- Top: Code Editor -->
          <div style="height: 50%; display: flex; flex-direction: column; border-bottom: 2px solid #334155; position: relative;">
            <div style="background: #1e293b; padding: 3px 10px; font-size: 10.5px; color: #94a3b8; font-weight: 600; display: flex; justify-content: space-between;">
              <span>📝 Script Python (Módulos disponíveis: os, sys, subprocess, shutil, socket, oracledb, platform, json)</span>
              <span>Pressione F5 para executar</span>
            </div>
            <textarea id="python-code-editor" 
                      style="flex: 1; width: 100%; background: #090d16; color: #f8fafc; font-family: 'Consolas', monospace; font-size: 12.5px; line-height: 19px; padding: 10px; border: none; outline: none; resize: none; tab-size: 4;"
                      placeholder="# Digite seu código Python com acesso ao S.O. aqui..."
                      onkeydown="window.TracesApp.pythonOsConsole.onEditorKeyDown(event)">${this.snippets[0].code}</textarea>
          </div>

          <!-- Bottom: Console Output -->
          <div style="height: 50%; display: flex; flex-direction: column; background: #070a10;">
            <div style="background: #1e293b; padding: 3px 10px; font-size: 10.5px; color: #94a3b8; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
              <span>📟 Console de Saída (stdout / stderr)</span>
              <span id="py-exec-time" style="color: #38bdf8; font-size: 10px;">Pronto para executar</span>
            </div>
            <div id="python-console-output" 
                 style="flex: 1; overflow-y: auto; padding: 10px 12px; font-family: 'Consolas', monospace; font-size: 12px; line-height: 18px; color: #22c55e; white-space: pre-wrap; word-break: break-all; user-select: text;">
              Clique em ▶ Executar Script para rodar o código no ambiente hospedeiro.
            </div>
          </div>
        </div>

        <!-- Footer / One-Liner Prompt -->
        <div style="background: #0f172a; border-top: 1px solid #334155; padding: 6px 12px; display: flex; align-items: center; gap: 8px;">
          <span style="font-family: 'Consolas', monospace; font-weight: 700; font-size: 12px; color: #38bdf8;">py&gt;&gt;&gt;</span>
          <input type="text" id="python-oneliner-input" 
                 placeholder="Avaliar expressão Python rápida (ex: os.getcwd(), os.listdir('.'), platform.uname())..." 
                 style="flex: 1; background: #090d16; border: 1px solid #334155; border-radius: 3px; color: #f8fafc; font-family: 'Consolas', monospace; font-size: 12px; padding: 4px 8px; outline: none;"
                 onkeydown="if(event.key==='Enter'){event.preventDefault();window.TracesApp.pythonOsConsole.executeOneliner(this.value);this.value='';}">
          <button class="btn" style="font-size: 10.5px; padding: 4px 10px;" onclick="const inp=document.getElementById('python-oneliner-input');if(inp.value){window.TracesApp.pythonOsConsole.executeOneliner(inp.value);inp.value='';}">
            Executar
          </button>
        </div>
      </div>
    `;

    modal.classList.add('open');
    setTimeout(() => {
      document.getElementById('python-code-editor')?.focus();
    }, 100);
  }

  loadSnippet(idx) {
    const snip = this.snippets[idx];
    if (!snip) return;
    const editor = document.getElementById('python-code-editor');
    if (editor) {
      editor.value = snip.code;
      editor.focus();
    }
  }

  onEditorKeyDown(e) {
    if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
      e.preventDefault();
      this.executeScript();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const editor = e.target;
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 4;
    }
  }

  async executeScript() {
    const editor = document.getElementById('python-code-editor');
    const outEl = document.getElementById('python-console-output');
    const timeEl = document.getElementById('py-exec-time');
    if (!editor || !outEl) return;

    const code = editor.value.trim();
    if (!code) {
      window.TracesApp?.notify('O editor de código está vazio.', 'info');
      return;
    }

    if (timeEl) timeEl.textContent = 'Executando no servidor...';
    outEl.style.color = '#94a3b8';
    outEl.textContent = '⏳ Executando script Python no ambiente hospedeiro com acesso ao S.O...';

    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const resp = await fetch('/api/os/python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          conn_id: activeConn?.id || 'default'
        })
      });
      const data = await resp.json();

      let resultText = '';
      if (data.stdout) {
        resultText += data.stdout;
      }
      if (data.result && data.result !== 'None') {
        resultText += (resultText ? '\n' : '') + `Resultado da Expressão: ${data.result}`;
      }
      if (data.stderr) {
        resultText += (resultText ? '\n' : '') + `[STDERR]:\n${data.stderr}`;
      }
      if (data.error) {
        resultText += (resultText ? '\n' : '') + `[ERRO]: ${data.error}\n${data.traceback || ''}`;
      }

      if (!resultText) {
        resultText = 'Script executado com sucesso (sem saída no stdout).';
      }

      outEl.style.color = data.success ? '#22c55e' : '#f87171';
      outEl.textContent = resultText;
      if (timeEl) timeEl.textContent = `Concluído em ${data.elapsed_ms || 0} ms`;
    } catch (e) {
      outEl.style.color = '#f87171';
      outEl.textContent = `Erro de comunicação ao executar script: ${e.message}`;
      if (timeEl) timeEl.textContent = 'Falha';
    }
  }

  async executeOneliner(cmd) {
    if (!cmd.trim()) return;
    const outEl = document.getElementById('python-console-output');
    if (!outEl) return;

    outEl.textContent += `\npy>>> ${cmd}\n`;
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const resp = await fetch('/api/os/python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cmd, conn_id: activeConn?.id || 'default' })
      });
      const data = await resp.json();
      if (data.result && data.result !== 'None') {
        outEl.textContent += data.result + '\n';
      } else if (data.stdout) {
        outEl.textContent += data.stdout;
      } else if (data.error) {
        outEl.textContent += `Erro: ${data.error}\n`;
      }
      outEl.scrollTop = outEl.scrollHeight;
    } catch (e) {
      outEl.textContent += `Erro: ${e.message}\n`;
      outEl.scrollTop = outEl.scrollHeight;
    }
  }

  clearOutput() {
    const outEl = document.getElementById('python-console-output');
    if (outEl) outEl.textContent = '';
  }
}

window.PythonOsConsole = PythonOsConsole;
