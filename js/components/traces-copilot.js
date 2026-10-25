/* ==========================================================================
   TRACES AI COPILOT COMPONENT - POWERED BY GOOGLE GEMINI
   Oracle Database & PL/SQL Autonomous Engineering Assistant
   ========================================================================== */

class TracesCopilot {
  constructor() {
    this.isOpen = false;
    this.apiKey = localStorage.getItem('traces_gemini_api_key') || '';
    this.model = localStorage.getItem('traces_gemini_model') || 'gemini-2.5-flash';
    this.messages = [
      {
        role: 'assistant',
        text: `Olá! Sou o **TRACES AI Copilot**, alimentado pelo Google Gemini.\n\nSou seu assistente sênior de Engenharia de Banco de Dados Oracle. Posso **montar consultas complexas**, otimizar planos de execução, criar pacotes PL/SQL, diagnosticar erros ORA- e auditar a saúde da sua instância. Como posso ajudar você hoje?`,
        code: null
      }
    ];

    this.initElements();
    this.bindEvents();
    this.renderMessages();
    this.syncBackendConfig();
  }

  async syncBackendConfig() {
    try {
      const resp = await fetch('/api/ai/config');
      const data = await resp.json();
      if (data.success && data.config) {
        if (!this.apiKey && data.config.apiKey) {
          this.apiKey = data.config.apiKey;
          localStorage.setItem('traces_gemini_api_key', this.apiKey);
        }
        if (data.config.model) {
          this.model = data.config.model;
        }
      }
    } catch (_) {}
  }

  initElements() {
    this.drawer = document.getElementById('copilot-drawer');
    this.btnToggle = document.getElementById('btn-toggle-copilot');
    this.btnClose = document.getElementById('btn-close-copilot');
    this.messagesContainer = document.getElementById('copilot-messages-container');
    this.textarea = document.getElementById('copilot-input-textarea');
    this.btnSend = document.getElementById('copilot-btn-send');
    this.promptChips = document.querySelectorAll('.prompt-chip');

    // Injetar botão de configurações no cabeçalho do drawer se ainda não existir
    const headerTitle = this.drawer?.querySelector('.copilot-title-wrapper');
    if (headerTitle && !document.getElementById('btn-copilot-settings')) {
      const btnSettings = document.createElement('button');
      btnSettings.id = 'btn-copilot-settings';
      btnSettings.className = 'btn';
      btnSettings.style.cssText = 'padding: 1px 7px; font-size: 10px; font-weight: 700; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; border-radius: 3px; cursor: pointer; margin-left: 8px;';
      btnSettings.title = 'Configurar Chave de API do Gemini';
      btnSettings.innerHTML = '🔑 Gemini Key';
      btnSettings.onclick = () => this.openSettingsModal();
      headerTitle.appendChild(btnSettings);
    }
  }

  bindEvents() {
    if (this.btnToggle) {
      this.btnToggle.addEventListener('click', () => this.toggleDrawer());
    }
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.closeDrawer());
    }

    if (this.btnSend) {
      this.btnSend.addEventListener('click', () => this.sendMessage());
    }
    if (this.textarea) {
      this.textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    if (this.promptChips) {
      this.promptChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
          const promptText = e.currentTarget.textContent.trim();
          if (this.textarea) {
            this.textarea.value = promptText;
            this.sendMessage();
          }
        });
      });
    }
  }

  toggleDrawer() {
    this.isOpen = !this.isOpen;
    if (this.drawer) {
      this.drawer.classList.toggle('open', this.isOpen);
      if (this.isOpen && this.textarea) {
        this.textarea.focus();
      }
    }
  }

  closeDrawer() {
    this.isOpen = false;
    if (this.drawer) {
      this.drawer.classList.remove('open');
    }
  }

  openSettingsModal() {
    let modal = document.getElementById('modal-gemini-ai-settings');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-gemini-ai-settings';
      modal.className = 'toad-modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="toad-modal-dialog" style="max-width: 540px; width: 92%;">
        <div class="toad-modal-header" style="background: linear-gradient(135deg, #1e293b, #0f172a); color: #fff;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">✨</span>
            <span style="font-weight: 700; font-size: 13px;">Configuração da Inteligência Artificial (Google Gemini)</span>
          </div>
          <span class="toad-modal-close" style="color: #cbd5e1; cursor: pointer;" onclick="document.getElementById('modal-gemini-ai-settings').classList.remove('open')">×</span>
        </div>
        <div class="modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #fff;">
          <div>
            <div style="font-size: 12px; color: #475569; margin-bottom: 8px;">
              O TRACES Toad for Oracle integra diretamente com os modelos <strong>Google Gemini</strong> para geração autônoma de consultas SQL, tuning avançado de planos de execução e resolução de incidentes DBA.
            </div>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 4px;">
              Google Gemini API Key:
            </label>
            <div style="display: flex; gap: 6px;">
              <input type="password" id="gemini-api-key-input" value="${this.apiKey}" 
                     placeholder="AIzaSy..." 
                     style="flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11.5px; font-family: var(--font-code);">
              <button class="btn" style="font-size: 11px; padding: 4px 8px;" onclick="const inp=document.getElementById('gemini-api-key-input');inp.type=inp.type==='password'?'text':'password';">
                👁
              </button>
            </div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 4px;">
              Não tem uma chave? <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #0284c7; font-weight: 600;">Obtenha uma Gemini API Key gratuita no Google AI Studio ↗</a>
            </div>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 700; color: #0f172a; display: block; margin-bottom: 4px;">
              Modelo Gemini:
            </label>
            <select class="toad-conn-combobox" id="gemini-model-select" style="width: 100%; height: 30px; font-size: 11px;">
              <option value="gemini-2.5-flash" ${this.model === 'gemini-2.5-flash' ? 'selected' : ''}>⚡ Gemini 2.5 Flash (Ultrarrápido &amp; Mais Inteligente - Recomendado)</option>
              <option value="gemini-2.0-flash" ${this.model === 'gemini-2.0-flash' ? 'selected' : ''}>🚀 Gemini 2.0 Flash</option>
              <option value="gemini-1.5-flash" ${this.model === 'gemini-1.5-flash' ? 'selected' : ''}>🔹 Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro" ${this.model === 'gemini-1.5-pro' ? 'selected' : ''}>🧠 Gemini 1.5 Pro (Raciocínio Profundo &amp; Auditoria Complexa)</option>
            </select>
          </div>

          <div id="gemini-test-result" style="display: none; padding: 8px 10px; border-radius: 4px; font-size: 11px;"></div>
        </div>

        <div class="modal-footer" style="padding: 10px 16px; background: #f8fafc; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
          <button class="btn" style="font-size: 11px; padding: 5px 12px;" onclick="window.TracesApp.tracesCopilot.testGeminiKey()">
            ⚡ Testar Chave
          </button>
          <div style="display: flex; gap: 8px;">
            <button class="btn" onclick="document.getElementById('modal-gemini-ai-settings').classList.remove('open')">Cancelar</button>
            <button class="btn btn-primary" style="font-weight: 700; font-size: 11px; padding: 5px 14px;" onclick="window.TracesApp.tracesCopilot.saveSettingsFromModal()">
              💾 Salvar Chave
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');
  }

  async testGeminiKey() {
    const key = document.getElementById('gemini-api-key-input')?.value.trim();
    const model = document.getElementById('gemini-model-select')?.value || 'gemini-2.5-flash';
    const resultEl = document.getElementById('gemini-test-result');
    if (!resultEl) return;

    if (!key) {
      resultEl.style.display = 'block';
      resultEl.style.background = '#fef2f2';
      resultEl.style.color = '#991b1b';
      resultEl.style.border = '1px solid #fecaca';
      resultEl.textContent = 'Por favor, informe a chave da API antes de testar.';
      return;
    }

    resultEl.style.display = 'block';
    resultEl.style.background = '#f0f9ff';
    resultEl.style.color = '#0369a1';
    resultEl.style.border = '1px solid #bae6fd';
    resultEl.textContent = '⏳ Conectando à API do Google Gemini para validação...';

    const t0 = performance.now();
    try {
      const resp = await fetch('/api/ai/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Responda com exatamente uma palavra: OK.',
          model: model,
          api_key: key
        })
      });
      const data = await resp.json();
      const elapsed = Math.round(performance.now() - t0);

      if (data.success) {
        resultEl.style.background = '#f0fdf4';
        resultEl.style.color = '#15803d';
        resultEl.style.border = '1px solid #bbf7d0';
        resultEl.innerHTML = `✔ <strong>Chave Válida!</strong> Conexão estabelecida com sucesso com o modelo <strong>${data.model}</strong> (${elapsed} ms).`;
      } else {
        resultEl.style.background = '#fef2f2';
        resultEl.style.color = '#991b1b';
        resultEl.style.border = '1px solid #fecaca';
        resultEl.textContent = `Falha ao validar: ${data.error || 'Erro desconhecido'}`;
      }
    } catch (e) {
      // Fallback direto via fetch para o Google caso o bridge não esteja respondendo
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const gResp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Responda apenas OK' }] }]
          })
        });
        const gData = await gResp.json();
        if (gData.candidates && gData.candidates.length > 0) {
          resultEl.style.background = '#f0fdf4';
          resultEl.style.color = '#15803d';
          resultEl.style.border = '1px solid #bbf7d0';
          resultEl.innerHTML = `✔ <strong>Chave Válida via Direct Connection!</strong> Conexão estabelecida com o modelo ${model}.`;
          return;
        }
      } catch (_) {}

      resultEl.style.background = '#fef2f2';
      resultEl.style.color = '#991b1b';
      resultEl.style.border = '1px solid #fecaca';
      resultEl.textContent = `Erro de conexão: ${e.message}`;
    }
  }

  saveSettingsFromModal() {
    const key = document.getElementById('gemini-api-key-input')?.value.trim();
    const model = document.getElementById('gemini-model-select')?.value || 'gemini-2.5-flash';

    this.apiKey = key;
    this.model = model;
    localStorage.setItem('traces_gemini_api_key', key);
    localStorage.setItem('traces_gemini_model', model);

    // Persistir no backend
    fetch('/api/ai/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key, model: model })
    }).catch(() => {});

    document.getElementById('modal-gemini-ai-settings')?.classList.remove('open');
    window.TracesApp?.notify('Configurações da IA Gemini salvas com sucesso!', 'success');
  }

  async callGeminiApi(promptText, customSystemPrompt = null) {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('traces_gemini_api_key') || '';
    }

    if (!this.apiKey) {
      this.openSettingsModal();
      throw new Error('Chave de API do Gemini não configurada. Por favor, insira sua chave.');
    }

    const dbContext = this.getDatabaseContextPrompt();
    const fullSystemPrompt = customSystemPrompt || (
      `Você é o TRACES AI Copilot para o Toad for Oracle. ` +
      `Você é um Engenheiro de Dados e DBA Sênior especialista em Oracle Database (11g, 12c, 19c, 21c e 23ai). ` +
      `Responda em português com comandos SQL / PL/SQL precisos, explicando planos de execução, hints de otimização e boas práticas. ` +
      dbContext
    );

    // 1. Tentar chamar via backend bridge
    try {
      const resp = await fetch('/api/ai/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          system_prompt: fullSystemPrompt,
          model: this.model,
          api_key: this.apiKey
        })
      });
      const data = await resp.json();
      if (data.success && data.text) {
        return data.text;
      }
    } catch (_) {}

    // 2. Fallback direto via Direct Fetch ao endpoint REST do Google
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const reqBody = {
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      systemInstruction: { parts: [{ text: fullSystemPrompt }] },
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
    };

    const gResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    });
    const gData = await gResp.json();

    if (gData.candidates && gData.candidates[0]?.content?.parts) {
      return gData.candidates[0].content.parts.map(p => p.text || '').join('');
    } else if (gData.error) {
      throw new Error(gData.error.message || 'Erro retornado pela API do Gemini');
    }

    throw new Error('Não foi possível obter resposta da IA Gemini.');
  }

  getDatabaseContextPrompt() {
    const conn = window.TracesApp?.getActiveConnection?.();
    let ctx = '';
    if (conn) {
      ctx += `\nContexto do Banco Conectado: Usuário ativo: ${conn.user || 'SYSTEM'}, Serviço: ${conn.serviceName || conn.name || 'ORCL'}, Versão: ${conn.banner || 'Oracle 19c'}.`;
    }
    const sb = window.TracesApp?.schemaBrowser;
    if (sb && sb.currentSchema) {
      ctx += ` Schema ativo na sessão: ${sb.currentSchema}.`;
    }
    return ctx;
  }

  async sendMessage() {
    const text = this.textarea ? this.textarea.value.trim() : '';
    if (!text) return;

    if (!this.apiKey) {
      this.openSettingsModal();
      return;
    }

    // Adiciona mensagem do usuário
    this.messages.push({
      role: 'user',
      text: text,
      code: null
    });

    if (this.textarea) this.textarea.value = '';
    this.renderMessages();

    // Mensagem temporária de "pensando"
    const thinkingMsg = {
      role: 'assistant',
      text: '⏳ *Consultando Gemini AI & analisando metadados do Oracle...*',
      code: null
    };
    this.messages.push(thinkingMsg);
    this.renderMessages();

    try {
      const reply = await this.callGeminiApi(text);
      // Remove o thinkingMsg
      this.messages.pop();

      // Extrai blocos de código se houver
      const { textClean, code } = this.extractCodeBlock(reply);
      this.messages.push({
        role: 'assistant',
        text: textClean,
        code: code
      });
    } catch (err) {
      this.messages.pop();
      this.messages.push({
        role: 'assistant',
        text: `⚠️ **Erro na comunicação com a IA:** ${err.message}`,
        code: null
      });
    }

    this.renderMessages();
  }

  extractCodeBlock(markdownText) {
    const codeMatch = markdownText.match(/```(?:sql|plsql|oracle)?\n([\s\S]*?)```/i);
    let code = null;
    let textClean = markdownText;

    if (codeMatch) {
      code = codeMatch[1].trim();
      textClean = markdownText.replace(/```(?:sql|plsql|oracle)?\n([\s\S]*?)```/i, '').trim();
    }
    return { textClean, code };
  }

  renderMessages() {
    if (!this.messagesContainer) return;

    this.messagesContainer.innerHTML = this.messages.map((m, idx) => `
      <div class="chat-bubble ${m.role}">
        <div>${this.formatMarkdown(m.text)}</div>
        ${m.code ? `
          <div class="bubble-code-block" style="margin-top: 8px; border: 1px solid #334155; border-radius: 4px; overflow: hidden; background: #090d16;">
            <div style="background: #1e293b; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8; font-weight: 700;">
              <span>ORACLE SQL / PL/SQL</span>
              <div style="display: flex; gap: 6px;">
                <button class="code-action-btn" style="padding: 2px 7px; font-size: 10px; background: #334155; color: #f8fafc; border: none; border-radius: 3px; cursor: pointer;" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(m.code)}')); window.TracesApp.notify('SQL copiado para a área de transferência', 'info');">
                  📋 Copiar
                </button>
                <button class="code-action-btn" style="padding: 2px 7px; font-size: 10px; background: #0284c7; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-weight: 700;" onclick="window.TracesApp.tracesCopilot.insertSqlIntoWorksheet(decodeURIComponent('${encodeURIComponent(m.code)}'))">
                  📝 Inserir na Worksheet
                </button>
              </div>
            </div>
            <pre style="margin: 0; padding: 8px 10px; font-family: 'Consolas', monospace; font-size: 11.5px; line-height: 16px; color: #38bdf8; overflow-x: auto;">${this.escapeHtml(m.code)}</pre>
          </div>
        ` : ''}
      </div>
    `).join('');

    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  insertSqlIntoWorksheet(sql) {
    if (window.TracesApp?.sqlEditor) {
      const editor = window.TracesApp.sqlEditor;
      if (editor.textarea) {
        editor.textarea.value = sql;
        editor.saveActiveTabContent();
        editor.updateHighlighting();
        editor.updateGutter();
      }
      window.TracesApp.switchDockView('editor');
      window.TracesApp.notify('SQL inserido na Worksheet ativa!', 'success');
    }
  }

  formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.15); padding: 1px 4px; border-radius: 3px; font-family: monospace; color: #0284c7;">$1</code>')
      .replace(/\n/g, '<br/>');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.TracesCopilot = TracesCopilot;
