/* ==========================================================================
   CONNECTION MANAGER COMPONENT - REAL ORACLE DATABASE
   Manages real Oracle Database connections via python-oracledb.
   Stores profiles in localStorage, pre-configured for Traces RMPROD.
   ========================================================================== */

class ConnectionManager {
  constructor() {
    this.storageKey = 'traces_oracle_saved_connections';
    this.connections = this.loadSavedConnections();
    this.activeConn = null; // Start disconnected! Never force auto-connection
    this.editingConn = this.connections[0] ? JSON.parse(JSON.stringify(this.connections[0])) : null;

    this.initElements();
    this.bindEvents();
    this.renderHeaderPill();
    this.updateSelectorDropdown();
  }

  initElements() {
    this.headerPill = document.getElementById('header-connection-pill');
    this.selectorEl = document.getElementById('toad-conn-selector');
    this.connModal = document.getElementById('connection-modal');
    this.connListEl = document.getElementById('connection-profiles-list');
  }

  bindEvents() {
    if (this.headerPill) {
      this.headerPill.addEventListener('click', () => this.openModal());
    }
  }

  loadSavedConnections() {
    const defaultConnections = [
      {
        id: 'conn-default',
        name: 'Conexão Oracle',
        host: 'localhost',
        port: 1521,
        serviceName: 'ORCL',
        user: 'SYSTEM',
        role: 'NORMAL',
        color: '#0078d7',
        password: '',
        savePassword: false,
        lastConnected: null
      }
    ];

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        let parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove any legacy hardcoded 10.100.10.39 entries
          parsed = parsed.filter(c => c.host !== '10.100.10.39' && c.id !== 'rmprod-traces');
          if (parsed.length > 0) {
            return parsed;
          }
        }
      }
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn('Could not read saved connections from localStorage', e);
    }

    return defaultConnections;
  }

  saveConnections() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.connections));
    } catch (e) {
      console.warn('Could not persist connections to localStorage', e);
    }
  }

  openModal() {
    this.editingConn = JSON.parse(JSON.stringify(this.activeConn || this.connections[0]));
    this.renderModal();
    if (this.connModal) this.connModal.classList.add('open');
  }

  closeModal() {
    if (this.connModal) this.connModal.classList.remove('open');
  }

  selectProfile(id) {
    const found = this.connections.find(c => c.id === id);
    if (found) {
      this.editingConn = JSON.parse(JSON.stringify(found));
      this.renderModal();
    }
  }

  createNewProfile() {
    const newId = `conn-${Date.now()}`;
    const newProfile = {
      id: newId,
      name: 'Nova Conexão Oracle',
      host: 'localhost',
      port: 1521,
      serviceName: 'ORCL',
      user: 'SYSTEM',
      role: 'NORMAL',
      color: '#0078d7',
      password: '',
      savePassword: false,
      lastConnected: null
    };
    this.connections.push(newProfile);
    this.saveConnections();
    this.selectProfile(newId);
  }

  deleteProfile(id) {
    if (this.connections.length <= 1) {
      window.TracesApp.notify('Não é possível excluir o único perfil de conexão.', 'warning');
      return;
    }
    if (confirm('Deseja realmente excluir este perfil de conexão?')) {
      this.connections = this.connections.filter(c => c.id !== id);
      this.saveConnections();
      this.selectProfile(this.connections[0].id);
      this.updateSelectorDropdown();
    }
  }

  renderModal() {
    if (!this.connListEl) return;
    const c = this.editingConn;

    this.connListEl.innerHTML = `
      <div style="display: flex; height: 380px; gap: 12px; font-size: 11.5px;">
        <!-- Left: Saved Connections List -->
        <div style="width: 220px; border-right: 1px solid #d4d4d4; padding-right: 10px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-weight: 700; color: #333; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              <span>Conexões Salvas</span>
              <button class="btn btn-primary" style="padding: 2px 6px; font-size: 10px;" onclick="window.TracesApp.connectionManager.createNewProfile();">+ Nova</button>
            </div>
            <div style="overflow-y: auto; max-height: 310px; display: flex; flex-direction: column; gap: 4px;">
              ${this.connections.map(item => `
                <div style="
                  padding: 8px 10px;
                  border-radius: 3px;
                  cursor: pointer;
                  border-left: 4px solid ${item.color || '#0078d7'};
                  background: ${item.id === c.id ? '#e0f2fe' : '#f9fafb'};
                  border: 1px solid ${item.id === c.id ? '#38bdf8' : '#e5e7eb'};
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                " onclick="window.TracesApp.connectionManager.selectProfile('${item.id}')">
                  <div>
                    <div style="font-weight: 700; color: #111; font-size: 11px;">${item.name}</div>
                    <div style="font-size: 10px; color: #666; font-family: var(--toad-font-code);">${item.user}@${item.serviceName}</div>
                  </div>
                  ${this.connections.length > 1 ? `
                    <button class="btn" style="padding: 1px 4px; font-size: 9px; color: #ef4444;" onclick="event.stopPropagation(); window.TracesApp.connectionManager.deleteProfile('${item.id}')" title="Excluir">✕</button>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          <div style="font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 6px;">
            Driver: <strong>python-oracledb 26.0.1 (Thin)</strong>
          </div>
        </div>

        <!-- Right: Connection Details Form -->
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; flex-direction: column; gap: 9px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="width: 130px; font-weight: 600;">Nome do Perfil:</label>
              <input type="text" id="form-name" value="${c.name || ''}" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-weight: 600;">
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="width: 130px; font-weight: 600;">Host (IP/DNS):</label>
              <input type="text" id="form-host" value="${c.host || 'localhost'}" placeholder="e.g. localhost ou IP do servidor" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);">
              <label style="font-weight: 600;">Porta:</label>
              <input type="number" id="form-port" value="${c.port || 1521}" style="width: 75px; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);">
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="width: 130px; font-weight: 600;">Service Name / SID:</label>
              <input type="text" id="form-service" value="${c.serviceName || 'RMPROD'}" placeholder="e.g. RMPROD" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);">
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="width: 130px; font-weight: 600;">Usuário do Banco:</label>
              <input type="text" id="form-user" value="${c.user || 'SYS'}" placeholder="e.g. SYS ou SYSTEM" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);">
              <label style="font-weight: 600;">Conectar Como:</label>
              <select id="form-role" class="toad-conn-combobox" style="width: 100px; height: 26px;">
                <option value="SYSDBA" ${c.role === 'SYSDBA' ? 'selected' : ''}>SYSDBA</option>
                <option value="NORMAL" ${c.role === 'NORMAL' ? 'selected' : ''}>Normal</option>
                <option value="SYSOPER" ${c.role === 'SYSOPER' ? 'selected' : ''}>SYSOPER</option>
              </select>
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="width: 130px; font-weight: 600;">Senha:</label>
              <input type="password" id="form-password" value="${c.password || ''}" placeholder="Senha do banco de dados" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc;">
            </div>

            <div style="display: flex; gap: 8px; align-items: center; margin-top: 2px;">
              <label style="width: 130px; font-weight: 600;">Ambiente (Cor):</label>
              <select id="form-color" class="toad-conn-combobox" style="flex: 1; height: 26px;">
                <option value="#dc2626" ${c.color === '#dc2626' ? 'selected' : ''}>🔴 Produção (Vermelho)</option>
                <option value="#f59e0b" ${c.color === '#f59e0b' ? 'selected' : ''}>🟡 Homologação / Teste (Amarelo)</option>
                <option value="#10b981" ${c.color === '#10b981' ? 'selected' : ''}>🟢 Desenvolvimento (Verde)</option>
                <option value="#6366f1" ${c.color === '#6366f1' ? 'selected' : ''}>🟣 Disaster Recovery (Roxo)</option>
              </select>
            </div>

            <div style="display: flex; gap: 8px; align-items: center; margin-left: 138px;">
              <input type="checkbox" id="form-save-pwd" ${c.savePassword ? 'checked' : ''}>
              <label for="form-save-pwd" style="color: #4b5563;">Lembrar senha localmente</label>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 12px;">
            <span id="real-test-status" style="font-size: 11px; color: #555;">Pronto para conectar ao banco real.</span>
            <div style="display: flex; gap: 6px;">
              <button class="btn" onclick="window.TracesApp.connectionManager.testCurrentProfile();">Testar Conexão</button>
              <button class="btn btn-primary" style="font-weight: 700; background: #15803d; border-color: #166534;" onclick="window.TracesApp.connectionManager.connectCurrentProfile();">⚡ Conectar ao Banco</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  readFormData() {
    const c = this.editingConn;
    c.name = document.getElementById('form-name')?.value || c.name;
    c.host = document.getElementById('form-host')?.value || 'localhost';
    c.port = parseInt(document.getElementById('form-port')?.value || '1521');
    c.serviceName = document.getElementById('form-service')?.value || c.serviceName || 'ORCL';
    c.user = document.getElementById('form-user')?.value || c.user || 'SYSTEM';
    c.role = document.getElementById('form-role')?.value || c.role || 'NORMAL';
    c.color = document.getElementById('form-color')?.value || c.color || '#0078d7';
    c.savePassword = document.getElementById('form-save-pwd')?.checked || false;
    c.password = document.getElementById('form-password')?.value || '';

    // Update in connections array
    const idx = this.connections.findIndex(item => item.id === c.id);
    if (idx !== -1) {
      this.connections[idx] = JSON.parse(JSON.stringify(c));
      if (!c.savePassword) {
        this.connections[idx].password = '';
      }
      this.saveConnections();
      this.updateSelectorDropdown();
    }

    return c;
  }

  async testCurrentProfile() {
    const c = this.readFormData();
    const statusEl = document.getElementById('real-test-status');
    if (statusEl) {
      statusEl.textContent = `Testando conexão em ${c.host}:${c.port}/${c.serviceName}...`;
      statusEl.style.color = '#0078d7';
    }

    try {
      const resp = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: c.host,
          port: c.port,
          service_name: c.serviceName,
          user: c.user,
          role: c.role,
          password: c.password
        })
      });
      const data = await resp.json();

      if (data.success) {
        if (statusEl) {
          statusEl.textContent = `✔ Conectado com sucesso! (${data.version}, ${data.latency_ms} ms)`;
          statusEl.style.color = '#008000';
        }
        window.TracesApp.notify(`Teste com sucesso! Oracle DB respondeu em ${data.latency_ms} ms`, 'success');
      } else {
        if (statusEl) {
          statusEl.textContent = `✕ Falha: ${data.error}`;
          statusEl.style.color = '#c00000';
        }
        window.TracesApp.notify(`Falha ao conectar no Oracle: ${data.error}`, 'error');
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = `✕ Erro no servidor ponte: ${err.message}`;
        statusEl.style.color = '#c00000';
      }
      window.TracesApp.notify(`Erro de comunicação com o servidor: ${err.message}`, 'error');
    }
  }

  async connectCurrentProfile() {
    const c = this.readFormData();
    window.TracesApp.notify(`Conectando ao banco ${c.name} (${c.host}:${c.port})...`, 'info');

    try {
      const resp = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: c.host,
          port: c.port,
          service_name: c.serviceName,
          user: c.user,
          role: c.role,
          password: c.password
        })
      });
      const data = await resp.json();

      if (data.success) {
        this.activeConn = c;
        c.lastConnected = new Date().toISOString();
        this.saveConnections();

        window.TracesApp.isRealDatabase = true;
        window.TracesApp.realDatabaseConfig = c;

        // Update Titlebar
        const titleEl = document.getElementById('toad-window-title');
        if (titleEl) {
          titleEl.textContent = `Toad for Oracle - [REAL ORACLE: ${c.user}@${c.host}:${c.port}/${c.serviceName} (${c.role})]`;
        }

        // Update Statusbar
        const dbVerEl = document.getElementById('status-db-version');
        const userEl = document.getElementById('status-db-user');
        const latencyEl = document.getElementById('status-db-latency');

        if (dbVerEl) dbVerEl.textContent = data.version;
        if (userEl) userEl.textContent = `${c.user}@${c.serviceName} (${c.role})`;
        if (latencyEl) latencyEl.textContent = `${data.latency_ms} ms`;

        // Update Color Band
        const band = document.getElementById('toad-color-band');
        if (band) band.style.backgroundColor = c.color || '#dc2626';

        this.renderHeaderPill();
        this.updateSelectorDropdown();
        this.closeModal();

        window.TracesApp.notify(`Conectado ao Banco Real ${c.serviceName} com sucesso! Todas as consultas serão executadas ao vivo.`, 'success');

        // Refresh Schema Browser with real schemas
        if (window.TracesApp.schemaBrowser && typeof window.TracesApp.schemaBrowser.loadRealSchemas === 'function') {
          window.TracesApp.schemaBrowser.loadRealSchemas();
        }

        // Refresh Session Monitor with real sessions
        if (window.TracesApp.sessionMonitor && typeof window.TracesApp.sessionMonitor.loadRealSessions === 'function') {
          window.TracesApp.sessionMonitor.loadRealSessions();
        }
      } else {
        window.TracesApp.notify(`Falha na conexão: ${data.error}`, 'error');
      }
    } catch (err) {
      window.TracesApp.notify(`Erro de comunicação: ${err.message}`, 'error');
    }
  }

  renderHeaderPill() {
    if (!this.headerPill) return;
    if (!this.activeConn) {
      this.headerPill.innerHTML = `
        <span class="toad-conn-indicator" style="background: #9ca3af;"></span>
        <span style="font-weight: 700; color: #555;">Desconectado</span>
        <span style="color: #888; font-size: 10px;">(Clique para Conectar)</span>
      `;
      return;
    }
    const c = this.activeConn;
    this.headerPill.innerHTML = `
      <span class="toad-conn-indicator" style="background: ${c.color || '#0078d7'};"></span>
      <span style="font-weight: 700; color: #111;">${c.user}@${c.serviceName}</span>
      <span style="color: #666; font-size: 10px;">(${c.role})</span>
    `;
  }

  updateSelectorDropdown() {
    if (!this.selectorEl) return;
    let html = `<option value="" ${!this.activeConn ? 'selected' : ''}>-- Desconectado (Clique em ⚡ Conectar) --</option>`;
    html += this.connections.map(c => `
      <option value="${c.id}" ${this.activeConn && this.activeConn.id === c.id ? 'selected' : ''}>
        ${c.user}@${c.serviceName} (${c.role}) - ${c.host}
      </option>
    `).join('');
    this.selectorEl.innerHTML = html;

    this.selectorEl.onchange = (e) => {
      const selectedId = e.target.value;
      if (selectedId) {
        this.selectProfile(selectedId);
        this.openModal();
      } else {
        this.disconnect();
      }
    };
  }

  disconnect() {
    this.activeConn = null;
    if (window.TracesApp) {
      window.TracesApp.isRealDatabase = false;
      window.TracesApp.realDatabaseConfig = null;
    }
    this.renderHeaderPill();
    this.updateSelectorDropdown();
    const titleEl = document.getElementById('toad-window-title');
    if (titleEl) {
      titleEl.textContent = 'Toad for Oracle - [Desconectado]';
    }
    const userEl = document.getElementById('status-db-user');
    const verEl = document.getElementById('status-db-version');
    const latEl = document.getElementById('status-db-latency');
    if (userEl) userEl.textContent = '[Desconectado]';
    if (verEl) verEl.textContent = 'Pronto para conectar ao banco de dados';
    if (latEl) latEl.textContent = '-- ms';
    window.TracesApp?.notify('Sessão desconectada.', 'info');
  }

  getActive() {
    return this.activeConn;
  }
}

window.ConnectionManager = ConnectionManager;
