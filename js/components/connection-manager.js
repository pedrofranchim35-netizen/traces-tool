/* ==========================================================================
   CONNECTION MANAGER COMPONENT - REAL ORACLE DATABASE & BRIDGE (JUMP HOST)
   Manages real Oracle Database connections via python-oracledb.
   Supports Direct Net8 and SSH Tunnel / Jump Host / Bastion bridges.
   ========================================================================== */

class ConnectionManager {
  constructor() {
    this.storageKey = 'traces_oracle_saved_connections';
    this.connections = this.loadSavedConnections();
    this.activeConn = null; // Start disconnected! Never force auto-connection
    this.editingConn = this.connections[0] ? JSON.parse(JSON.stringify(this.connections[0])) : null;
    this.activeTab = 'db'; // 'db' | 'bridge' | 'gateway'

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
        lastConnected: null,
        // Configuração de Ponte (Jump Host / Túnel Bastion)
        useBridge: false,
        bridgeType: 'ssh',
        bridgeHost: '',
        bridgePort: 22,
        bridgeUser: '',
        bridgePassword: '',
        bridgeKeyPath: '',
        saveBridgePassword: false
      }
    ];

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        let parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize entries and ensure bridge properties exist
          return parsed.map(c => ({
            id: c.id || `conn-${Date.now()}`,
            name: c.name || 'Conexão Oracle',
            host: c.host || 'localhost',
            port: c.port || 1521,
            serviceName: c.serviceName || 'ORCL',
            user: c.user || 'SYSTEM',
            role: c.role || 'NORMAL',
            color: c.color || '#0078d7',
            password: c.password || '',
            savePassword: Boolean(c.savePassword),
            lastConnected: c.lastConnected || null,
            useBridge: Boolean(c.useBridge),
            bridgeType: c.bridgeType || 'ssh',
            bridgeHost: c.bridgeHost || '',
            bridgePort: c.bridgePort || 22,
            bridgeUser: c.bridgeUser || '',
            bridgePassword: c.bridgePassword || '',
            bridgeKeyPath: c.bridgeKeyPath || '',
            saveBridgePassword: Boolean(c.saveBridgePassword)
          }));
        }
      }
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
    this.activeTab = 'db';
    this.renderModal();
    if (this.connModal) this.connModal.classList.add('open');
  }

  closeModal() {
    if (this.connModal) this.connModal.classList.remove('open');
  }

  selectProfile(id) {
    this.readFormData();
    const found = this.connections.find(c => c.id === id);
    if (found) {
      this.editingConn = JSON.parse(JSON.stringify(found));
      this.renderModal();
    }
  }

  createNewProfile() {
    this.readFormData();
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
      lastConnected: null,
      useBridge: false,
      bridgeType: 'ssh',
      bridgeHost: '',
      bridgePort: 22,
      bridgeUser: '',
      bridgePassword: '',
      bridgeKeyPath: '',
      saveBridgePassword: false
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

  switchTab(tabKey) {
    this.readFormData();
    this.activeTab = tabKey;
    this.renderModal();
  }

  toggleBridgeCheckbox(checked) {
    if (this.editingConn) {
      this.editingConn.useBridge = checked;
    }
    const bridgeContainer = document.getElementById('bridge-fields-container');
    if (bridgeContainer) {
      bridgeContainer.style.opacity = checked ? '1' : '0.45';
      bridgeContainer.style.pointerEvents = checked ? 'auto' : 'none';
    }
    this.updateRoutePreview();
  }

  updateRoutePreview() {
    const routeEl = document.getElementById('conn-route-summary');
    if (!routeEl) return;
    const c = this.editingConn || {};
    const useBridge = document.getElementById('form-use-bridge')?.checked ?? c.useBridge;
    const bHost = document.getElementById('form-bridge-host')?.value || c.bridgeHost;
    const bPort = document.getElementById('form-bridge-port')?.value || c.bridgePort || 22;
    const dHost = document.getElementById('form-host')?.value || c.host || 'localhost';
    const dPort = document.getElementById('form-port')?.value || c.port || 1521;
    const dSvc = document.getElementById('form-service')?.value || c.serviceName || 'ORCL';

    if (useBridge && bHost) {
      routeEl.innerHTML = `
        <span class="conn-route-badge badge-bridge-active">🌉 VIA PONTE ATIVA</span>
        <span>Seu PC</span> ➔ <strong>Ponte SSH [${bHost}:${bPort}]</strong> ➔ <strong>Oracle Real [${dHost}:${dPort}/${dSvc}]</strong>
      `;
    } else if (useBridge) {
      routeEl.innerHTML = `
        <span class="conn-route-badge badge-bridge-active">🌉 PONTE ATIVA</span>
        <span style="color: #d97706;">⚠️ Defina o IP/Host da ponte na aba "Ponte / Jump Host".</span>
      `;
    } else {
      routeEl.innerHTML = `
        <span class="conn-route-badge badge-bridge-inactive">🔗 CONEXÃO DIRETA</span>
        <span>Seu PC</span> ➔ <strong>Oracle Real [${dHost}:${dPort}/${dSvc}]</strong>
      `;
    }
  }

  renderModal() {
    if (!this.connListEl) return;
    const c = this.editingConn;
    if (!c) return;

    this.connListEl.innerHTML = `
      <div style="display: flex; height: 440px; gap: 14px; font-size: 11.5px;">
        <!-- Left: Saved Connections List -->
        <div style="width: 220px; border-right: 1px solid #d4d4d4; padding-right: 10px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-weight: 700; color: #333; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              <span>Conexões Salvas</span>
              <button class="btn btn-primary" style="padding: 2px 6px; font-size: 10px;" onclick="window.TracesApp.connectionManager.createNewProfile();">+ Nova</button>
            </div>
            <div style="overflow-y: auto; max-height: 360px; display: flex; flex-direction: column; gap: 4px;">
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
                  <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <div style="font-weight: 700; color: #111; font-size: 11px;">${item.name}</div>
                    <div style="font-size: 10px; color: #666; font-family: var(--toad-font-code);">${item.user}@${item.serviceName}</div>
                    ${item.useBridge && item.bridgeHost ? `
                      <div style="font-size: 9.5px; color: #0284c7; font-weight: 600;">🌉 via ${item.bridgeHost}</div>
                    ` : ''}
                  </div>
                  ${this.connections.length > 1 ? `
                    <button class="btn" style="padding: 1px 4px; font-size: 9px; color: #ef4444;" onclick="event.stopPropagation(); window.TracesApp.connectionManager.deleteProfile('${item.id}')" title="Excluir">✕</button>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          <div style="font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 6px;">
            Driver: <strong>python-oracledb 26.0.1 (Thin)</strong><br>
            Túnel: <strong>paramiko / sshtunnel</strong>
          </div>
        </div>

        <!-- Right: Tabbed Configuration Form -->
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <!-- Navigation Tabs -->
            <div class="conn-tabs-nav">
              <button class="conn-tab-btn ${this.activeTab === 'db' ? 'active' : ''}" onclick="window.TracesApp.connectionManager.switchTab('db');">
                <span>🏢 Banco Oracle (Destino)</span>
              </button>
              <button class="conn-tab-btn ${this.activeTab === 'bridge' ? 'active' : ''}" onclick="window.TracesApp.connectionManager.switchTab('bridge');">
                <span>🌉 Ponte / Jump Host</span>
                ${c.useBridge ? '<span style="font-size: 9px; background: #16a34a; color: #fff; padding: 0 4px; border-radius: 6px;">Ativa</span>' : ''}
              </button>
              <button class="conn-tab-btn ${this.activeTab === 'gateway' ? 'active' : ''}" onclick="window.TracesApp.connectionManager.switchTab('gateway');">
                <span>☁️ Gateway / SSO</span>
              </button>
            </div>

            <!-- Route Summary Header -->
            <div class="conn-route-banner" id="conn-route-summary" style="margin-top: 8px;">
              ${c.useBridge && c.bridgeHost ? `
                <span class="conn-route-badge badge-bridge-active">🌉 VIA PONTE ATIVA</span>
                <span>Seu PC</span> ➔ <strong>Ponte SSH [${c.bridgeHost}:${c.bridgePort || 22}]</strong> ➔ <strong>Oracle Real [${c.host}:${c.port}/${c.serviceName}]</strong>
              ` : `
                <span class="conn-route-badge badge-bridge-inactive">🔗 CONEXÃO DIRETA</span>
                <span>Seu PC</span> ➔ <strong>Oracle Real [${c.host}:${c.port}/${c.serviceName}]</strong>
              `}
            </div>

            <!-- TAB 1: BANCO DE DADOS ORACLE -->
            <div class="conn-tab-pane ${this.activeTab === 'db' ? 'active' : ''}" style="margin-top: 6px;">
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Nome do Perfil:</label>
                  <input type="text" id="form-name" value="${c.name || ''}" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-weight: 600;" oninput="window.TracesApp.connectionManager.updateRoutePreview();">
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Host do Banco (Destino):</label>
                  <input type="text" id="form-host" value="${c.host || 'localhost'}" placeholder="e.g. localhost ou IP do servidor Oracle" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" oninput="window.TracesApp.connectionManager.updateRoutePreview();">
                  <label style="font-weight: 600;">Porta:</label>
                  <input type="number" id="form-port" value="${c.port || 1521}" style="width: 75px; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" oninput="window.TracesApp.connectionManager.updateRoutePreview();">
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Service Name / SID:</label>
                  <input type="text" id="form-service" value="${c.serviceName || 'ORCL'}" placeholder="e.g. RMPROD ou ORCL" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" oninput="window.TracesApp.connectionManager.updateRoutePreview();">
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Usuário do Banco:</label>
                  <input type="text" id="form-user" value="${c.user || 'SYS'}" placeholder="e.g. SYS ou SYSTEM" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);">
                  <label style="font-weight: 600;">Conectar Como:</label>
                  <select id="form-role" class="toad-conn-combobox" style="width: 105px; height: 26px;">
                    <option value="SYSDBA" ${c.role === 'SYSDBA' ? 'selected' : ''}>SYSDBA</option>
                    <option value="NORMAL" ${c.role === 'NORMAL' ? 'selected' : ''}>Normal</option>
                    <option value="SYSOPER" ${c.role === 'SYSOPER' ? 'selected' : ''}>SYSOPER</option>
                  </select>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Senha do Banco:</label>
                  <input type="password" id="form-password" value="${c.password || ''}" placeholder="Senha do banco de dados" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc;">
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Ambiente (Cor):</label>
                  <select id="form-color" class="toad-conn-combobox" style="flex: 1; height: 26px;">
                    <option value="#dc2626" ${c.color === '#dc2626' ? 'selected' : ''}>🔴 Produção (Vermelho)</option>
                    <option value="#f59e0b" ${c.color === '#f59e0b' ? 'selected' : ''}>🟡 Homologação / Teste (Amarelo)</option>
                    <option value="#10b981" ${c.color === '#10b981' ? 'selected' : ''}>🟢 Desenvolvimento (Verde)</option>
                    <option value="#0078d7" ${c.color === '#0078d7' ? 'selected' : ''}>🔵 Corporativo (Azul)</option>
                    <option value="#6366f1" ${c.color === '#6366f1' ? 'selected' : ''}>🟣 Disaster Recovery (Roxo)</option>
                  </select>
                </div>

                <div style="display: flex; gap: 8px; align-items: center; margin-left: 148px;">
                  <input type="checkbox" id="form-save-pwd" ${c.savePassword ? 'checked' : ''}>
                  <label for="form-save-pwd" style="color: #4b5563;">Lembrar senha do banco localmente</label>
                </div>
              </div>
            </div>

            <!-- TAB 2: PONTE / JUMP HOST (SSH TUNNEL / BASTION) -->
            <div class="conn-tab-pane ${this.activeTab === 'bridge' ? 'active' : ''}" style="margin-top: 6px;">
              <!-- Toggle Header -->
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 12px; margin-bottom: 10px; display: flex; align-items: flex-start; gap: 10px;">
                <input type="checkbox" id="form-use-bridge" ${c.useBridge ? 'checked' : ''} style="margin-top: 2px; width: 16px; height: 16px; cursor: pointer;" onchange="window.TracesApp.connectionManager.toggleBridgeCheckbox(this.checked);">
                <div>
                  <label for="form-use-bridge" style="font-weight: 700; color: #0f172a; cursor: pointer; font-size: 12px;">
                    Conectar através de uma Ponte / Jump Host intermediário (Túnel SSH Bastion)
                  </label>
                  <div style="color: #64748b; font-size: 10.5px; margin-top: 2px;">
                    Ative quando o banco Oracle estiver em uma rede privada ou VPC isolada, exigindo conexão prévia em um servidor intermediário (ex: <strong>10.100.10.39</strong>) para rotear o tráfego.
                  </div>
                </div>
              </div>

              <!-- Bridge Form Fields Container -->
              <div id="bridge-fields-container" style="display: flex; flex-direction: column; gap: 8px; opacity: ${c.useBridge ? '1' : '0.45'}; pointer-events: ${c.useBridge ? 'auto' : 'none'}; transition: opacity 0.2s;">
                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Host da Ponte (IP/DNS):</label>
                  <input type="text" id="form-bridge-host" value="${c.bridgeHost || ''}" placeholder="e.g. 10.100.10.39 ou bastion.empresa.com" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" oninput="window.TracesApp.connectionManager.updateRoutePreview();">
                  <label style="font-weight: 600;">Porta SSH:</label>
                  <input type="number" id="form-bridge-port" value="${c.bridgePort || 22}" style="width: 75px; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" oninput="window.TracesApp.connectionManager.updateRoutePreview();">
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Usuário da Ponte (SSH):</label>
                  <input type="text" id="form-bridge-user" value="${c.bridgeUser || ''}" placeholder="e.g. root, ubuntu, oracle ou usuário corporativo" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);">
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Senha da Ponte:</label>
                  <input type="password" id="form-bridge-password" value="${c.bridgePassword || ''}" placeholder="Senha SSH da máquina intermediária" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc;">
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Chave Privada (Opcional):</label>
                  <input type="text" id="form-bridge-key" value="${c.bridgeKeyPath || ''}" placeholder="Caminho do arquivo .pem, .ppk ou id_rsa (se não usar senha)" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);">
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 8px; border-top: 1px dashed #cbd5e1;">
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="checkbox" id="form-save-bridge-pwd" ${c.saveBridgePassword ? 'checked' : ''}>
                    <label for="form-save-bridge-pwd" style="color: #4b5563;">Lembrar senha da ponte localmente</label>
                  </div>
                  <button class="btn" style="background: #0284c7; color: #fff; border-color: #0369a1; font-weight: 600; padding: 3px 10px;" onclick="window.TracesApp.connectionManager.testBridgeOnly();">
                    🔍 Testar Apenas a Ponte
                  </button>
                </div>
                <div id="bridge-test-status" style="font-size: 11px; margin-top: 2px;"></div>
              </div>
            </div>

            <!-- TAB 3: GATEWAY / SSO -->
            <div class="conn-tab-pane ${this.activeTab === 'gateway' ? 'active' : ''}" style="margin-top: 6px;">
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 3px; padding: 8px; font-size: 11px; color: #1e40af;">
                  ℹ️ Permite autenticação via Microsoft Corporate Gateway e Azure Entra ID SSO para bancos integrados a proxies corporativos.
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Gateway URL:</label>
                  <input type="text" id="form-gateway-url" placeholder="https://gateway.corp.net/oracle" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);">
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Tenant ID / Client ID:</label>
                  <input type="text" id="form-tenant-id" placeholder="GUID do Tenant Azure" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);">
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Actions Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e0e0e0; padding-top: 10px; margin-top: 10px;">
            <span id="real-test-status" style="font-size: 11px; color: #555; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              Pronto para conectar ao banco real.
            </span>
            <div style="display: flex; gap: 6px;">
              <button class="btn" onclick="window.TracesApp.connectionManager.testCurrentProfile();">🔍 Testar Conexão</button>
              <button class="btn btn-primary" style="font-weight: 700; background: #15803d; border-color: #166534;" onclick="window.TracesApp.connectionManager.connectCurrentProfile();">⚡ Conectar ao Banco</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  readFormData() {
    const c = this.editingConn;
    if (!c) return null;

    c.name = document.getElementById('form-name')?.value || c.name;
    c.host = document.getElementById('form-host')?.value || c.host || 'localhost';
    c.port = parseInt(document.getElementById('form-port')?.value || c.port || '1521');
    c.serviceName = document.getElementById('form-service')?.value || c.serviceName || 'ORCL';
    c.user = document.getElementById('form-user')?.value || c.user || 'SYSTEM';
    c.role = document.getElementById('form-role')?.value || c.role || 'NORMAL';
    c.color = document.getElementById('form-color')?.value || c.color || '#0078d7';
    c.savePassword = document.getElementById('form-save-pwd')?.checked ?? c.savePassword;
    c.password = document.getElementById('form-password')?.value ?? c.password ?? '';

    // Bridge settings
    c.useBridge = document.getElementById('form-use-bridge')?.checked ?? c.useBridge;
    c.bridgeHost = document.getElementById('form-bridge-host')?.value ?? c.bridgeHost ?? '';
    c.bridgePort = parseInt(document.getElementById('form-bridge-port')?.value || c.bridgePort || '22');
    c.bridgeUser = document.getElementById('form-bridge-user')?.value ?? c.bridgeUser ?? '';
    c.bridgePassword = document.getElementById('form-bridge-password')?.value ?? c.bridgePassword ?? '';
    c.bridgeKeyPath = document.getElementById('form-bridge-key')?.value ?? c.bridgeKeyPath ?? '';
    c.saveBridgePassword = document.getElementById('form-save-bridge-pwd')?.checked ?? c.saveBridgePassword;

    // Update in connections array
    const idx = this.connections.findIndex(item => item.id === c.id);
    if (idx !== -1) {
      const copy = JSON.parse(JSON.stringify(c));
      if (!c.savePassword) copy.password = '';
      if (!c.saveBridgePassword) copy.bridgePassword = '';
      this.connections[idx] = copy;
      this.saveConnections();
      this.updateSelectorDropdown();
    }

    return c;
  }

  async testBridgeOnly() {
    const c = this.readFormData();
    const statusEl = document.getElementById('bridge-test-status');
    if (!c.bridgeHost) {
      if (statusEl) {
        statusEl.innerHTML = '<span style="color: #ef4444; font-weight: 600;">✕ Informe o Host da Ponte (IP ou DNS).</span>';
      }
      window.TracesApp.notify('Informe o Host da Ponte para realizar o teste.', 'warning');
      return;
    }

    if (statusEl) {
      statusEl.innerHTML = `<span style="color: #0284c7;">⏳ Conectando na ponte ${c.bridgeHost}:${c.bridgePort} e verificando destino ${c.host}:${c.port}...</span>`;
    }

    try {
      const resp = await fetch('/api/test-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bridge_host: c.bridgeHost,
          bridge_port: c.bridgePort || 22,
          bridge_user: c.bridgeUser,
          bridge_password: c.bridgePassword,
          bridge_key_path: c.bridgeKeyPath,
          host: c.host,
          port: c.port
        })
      });
      const data = await resp.json();

      if (data.success) {
        if (statusEl) {
          statusEl.innerHTML = `<span style="color: #15803d; font-weight: 600;">✔ ${data.message} (${data.latency_ms} ms)</span>`;
        }
        window.TracesApp.notify(`Ponte validada com sucesso! (${data.latency_ms} ms)`, 'success');
      } else {
        if (statusEl) {
          statusEl.innerHTML = `<span style="color: #ef4444; font-weight: 600;">✕ ${data.error}</span>`;
        }
        window.TracesApp.notify(`Falha na ponte: ${data.error}`, 'error');
      }
    } catch (err) {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: #ef4444;">✕ Erro de comunicação: ${err.message}</span>`;
      }
      window.TracesApp.notify(`Erro de comunicação com o servidor: ${err.message}`, 'error');
    }
  }

  async testCurrentProfile() {
    const c = this.readFormData();
    const statusEl = document.getElementById('real-test-status');
    const viaText = c.useBridge && c.bridgeHost ? ` (via Ponte ${c.bridgeHost})` : '';
    if (statusEl) {
      statusEl.textContent = `Testando conexão em ${c.host}:${c.port}/${c.serviceName}${viaText}...`;
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
          password: c.password,
          use_bridge: Boolean(c.useBridge),
          bridge_host: c.bridgeHost,
          bridge_port: c.bridgePort,
          bridge_user: c.bridgeUser,
          bridge_password: c.bridgePassword,
          bridge_key_path: c.bridgeKeyPath
        })
      });
      const data = await resp.json();

      if (data.success) {
        if (statusEl) {
          statusEl.textContent = `✔ Conectado com sucesso! (${data.version}, ${data.latency_ms} ms)`;
          statusEl.style.color = '#008000';
        }
        window.TracesApp.notify(`Conexão com sucesso! Oracle DB respondeu em ${data.latency_ms} ms`, 'success');
      } else {
        if (statusEl) {
          statusEl.textContent = `✕ Falha: ${data.error}`;
          statusEl.style.color = '#c00000';
        }
        window.TracesApp.notify(`Falha ao conectar no Oracle: ${data.error}`, 'error');
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = `✕ Erro no servidor: ${err.message}`;
        statusEl.style.color = '#c00000';
      }
      window.TracesApp.notify(`Erro de comunicação com o servidor: ${err.message}`, 'error');
    }
  }

  async connectCurrentProfile() {
    const c = this.readFormData();
    const viaText = c.useBridge && c.bridgeHost ? ` via Ponte ${c.bridgeHost}` : '';
    window.TracesApp.notify(`Conectando ao banco ${c.name} (${c.host}:${c.port}${viaText})...`, 'info');

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
          password: c.password,
          use_bridge: Boolean(c.useBridge),
          bridge_host: c.bridgeHost,
          bridge_port: c.bridgePort,
          bridge_user: c.bridgeUser,
          bridge_password: c.bridgePassword,
          bridge_key_path: c.bridgeKeyPath
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
          if (c.useBridge && c.bridgeHost) {
            titleEl.textContent = `Toad for Oracle - [REAL ORACLE: ${c.user}@${c.host}:${c.port}/${c.serviceName} (via Ponte: ${c.bridgeHost})]`;
          } else {
            titleEl.textContent = `Toad for Oracle - [REAL ORACLE: ${c.user}@${c.host}:${c.port}/${c.serviceName} (${c.role})]`;
          }
        }

        // Update Statusbar
        const dbVerEl = document.getElementById('status-db-version');
        const userEl = document.getElementById('status-db-user');
        const latencyEl = document.getElementById('status-db-latency');

        if (dbVerEl) dbVerEl.textContent = data.version;
        if (userEl) {
          userEl.textContent = `${c.user}@${c.serviceName} (${c.role})${c.useBridge && c.bridgeHost ? ' 🌉 Ponte: ' + c.bridgeHost : ''}`;
        }
        if (latencyEl) latencyEl.textContent = `${data.latency_ms} ms`;

        // Update Color Band
        const band = document.getElementById('toad-color-band');
        if (band) band.style.backgroundColor = c.color || '#dc2626';

        this.renderHeaderPill();
        this.updateSelectorDropdown();
        this.closeModal();

        const successMsg = c.useBridge && c.bridgeHost
          ? `Conectado ao Banco Real ${c.serviceName} através da Ponte ${c.bridgeHost}! Consultas ao vivo ativas.`
          : `Conectado ao Banco Real ${c.serviceName} com sucesso! Consultas ao vivo ativas.`;
        window.TracesApp.notify(successMsg, 'success');

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
    const bridgeBadge = c.useBridge && c.bridgeHost ? ` <span style="font-size: 9px; background: #e0f2fe; color: #0284c7; padding: 1px 4px; border-radius: 3px; border: 1px solid #bae6fd;">🌉 ${c.bridgeHost}</span>` : '';
    this.headerPill.innerHTML = `
      <span class="toad-conn-indicator" style="background: ${c.color || '#0078d7'};"></span>
      <span style="font-weight: 700; color: #111;">${c.user}@${c.serviceName}</span>
      ${bridgeBadge}
      <span style="color: #666; font-size: 10px;">(${c.role})</span>
    `;
  }

  updateSelectorDropdown() {
    if (!this.selectorEl) return;
    let html = `<option value="" ${!this.activeConn ? 'selected' : ''}>-- Desconectado (Clique em ⚡ Conectar) --</option>`;
    html += this.connections.map(c => {
      const bridgeText = c.useBridge && c.bridgeHost ? ` [Ponte: ${c.bridgeHost}]` : '';
      return `
        <option value="${c.id}" ${this.activeConn && this.activeConn.id === c.id ? 'selected' : ''}>
          ${c.user}@${c.serviceName} (${c.role}) - ${c.host}${bridgeText}
        </option>
      `;
    }).join('');
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
    // Call server disconnect to terminate Oracle session and bridge tunnel
    fetch('/api/disconnect', { method: 'POST' }).catch(() => {});

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
    window.TracesApp?.notify('Sessão desconectada e túnel encerrado.', 'info');
  }

  getActive() {
    return this.activeConn;
  }
}

window.ConnectionManager = ConnectionManager;
