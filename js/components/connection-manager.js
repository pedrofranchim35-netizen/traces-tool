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
    this.activeConnections = new Map(); // Mapa de conexões simultaneamente ativas { conn_id -> { config, data } }
    this.editingConn = this.connections[0] ? JSON.parse(JSON.stringify(this.connections[0])) : null;
    this.activeTab = 'db'; // 'db' | 'bridge' | 'gateway'

    this.initElements();
    this.bindEvents();
    this.renderHeaderPill();
    this.updateSelectorDropdown();
    setTimeout(() => {
      this.syncSavedConnectionsFromDisk();
      this.syncWithServerState();
    }, 200);
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
        savePassword: true,
        lastConnected: null,
        useThick: true,
        // Configuração de Ponte (Jump Host / Túnel Bastion)
        useBridge: false,
        bridgeType: 'ssh',
        bridgeHost: '',
        bridgePort: 22,
        bridgeUser: '',
        bridgePassword: '',
        bridgeKeyPath: '',
        saveBridgePassword: true
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
            savePassword: c.savePassword !== false,
            lastConnected: c.lastConnected || null,
            useThick: c.useThick !== false,
            useBridge: Boolean(c.useBridge),
            bridgeType: c.bridgeType || 'ssh',
            bridgeHost: c.bridgeHost || '',
            bridgePort: c.bridgePort || 22,
            bridgeUser: c.bridgeUser || '',
            bridgePassword: c.bridgePassword || '',
            bridgeKeyPath: c.bridgeKeyPath || '',
            saveBridgePassword: c.saveBridgePassword !== false
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
      console.warn('[ConnectionManager] Could not persist connections to localStorage', e);
    }

    // Persiste também no disco (assets/connections.json) via backend bridge
    try {
      fetch('/api/saved-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connections: this.connections })
      }).catch(err => {
        // Silently catch if offline
      });
    } catch (e) {
      // Offline fallback
    }
  }

  async syncSavedConnectionsFromDisk() {
    try {
      const resp = await fetch('/api/saved-connections');
      const data = await resp.json();
      if (data && data.success && Array.isArray(data.connections) && data.connections.length > 0) {
        // O arquivo no disco possui conexões persistidas: atualiza preservando senhas locais
        const merged = data.connections.map(dc => {
          const local = this.connections.find(lc => lc.id === dc.id);
          return {
            ...dc,
            password: dc.password || (local ? local.password : '') || '',
            bridgePassword: dc.bridgePassword || (local ? local.bridgePassword : '') || '',
            savePassword: dc.savePassword !== false,
            saveBridgePassword: dc.saveBridgePassword !== false
          };
        });
        this.connections = merged;
        localStorage.setItem(this.storageKey, JSON.stringify(this.connections));
        if (!this.editingConn || !this.connections.some(c => c.id === this.editingConn.id)) {
          this.editingConn = JSON.parse(JSON.stringify(this.connections[0]));
        }
        this.updateSelectorDropdown();
        if (this.connModal && this.connModal.classList.contains('open')) {
          this.renderModal();
        }
      } else if (this.connections && this.connections.length > 0) {
        // Disco está vazio, mas localStorage tem perfis: grava no disco imediatamente!
        this.saveConnections();
      }
    } catch (err) {
      // Offline / startup
    }
  }

  openModal() {
    this.editingConn = JSON.parse(JSON.stringify(this.activeConn || this.connections[0]));
    this.activeTab = 'db';
    this.renderModal();
    if (this.connModal) this.connModal.classList.add('open');
  }

  closeModal() {
    this.readFormData();
    this.saveConnections();
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
      name: `Conexão ${this.connections.length + 1}`,
      host: 'localhost',
      port: 1521,
      serviceName: 'ORCL',
      user: 'SYSTEM',
      role: 'NORMAL',
      color: '#0078d7',
      password: '',
      savePassword: true,
      lastConnected: null,
      useThick: true,
      useBridge: false,
      bridgeType: 'ssh',
      bridgeHost: '',
      bridgePort: 22,
      bridgeUser: '',
      bridgePassword: '',
      bridgeKeyPath: '',
      saveBridgePassword: true
    };
    this.connections.push(newProfile);
    this.saveConnections();
    this.selectProfile(newId);
    this.updateSelectorDropdown();
  }

  saveCurrentProfile(showNotification = true) {
    const c = this.readFormData();
    this.saveConnections();
    this.renderModal();
    this.updateSelectorDropdown();
    const statusEl = document.getElementById('real-test-status');
    if (statusEl) {
      statusEl.innerHTML = `<span style="color: #15803d; font-weight: 700;">💾 Perfil "${c ? c.name : ''}" salvo com sucesso!</span>`;
    }
    if (showNotification && window.TracesApp && typeof window.TracesApp.notify === 'function') {
      window.TracesApp.notify(`Perfil "${c ? c.name : ''}" salvo permanentemente!`, 'success');
    }
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

  onBridgeTypeChange(type) {
    if (this.editingConn) {
      this.editingConn.bridgeType = type;
      const portEl = document.getElementById('form-bridge-port');
      const sshFields = document.getElementById('bridge-ssh-credentials');
      if (type === 'cman') {
        if (portEl && (portEl.value === '22' || !portEl.value)) {
          portEl.value = '1521';
          this.editingConn.bridgePort = 1521;
        }
        if (sshFields) sshFields.style.display = 'none';
      } else {
        if (portEl && (portEl.value === '1521' || !portEl.value)) {
          portEl.value = '22';
          this.editingConn.bridgePort = 22;
        }
        if (sshFields) sshFields.style.display = 'flex';
      }
    }
    this.updateRoutePreview();
  }

  updateRoutePreview() {
    const routeEl = document.getElementById('conn-route-summary');
    if (!routeEl) return;
    const c = this.editingConn || {};
    const useBridge = document.getElementById('form-use-bridge')?.checked ?? c.useBridge;
    const bType = document.getElementById('form-bridge-type')?.value || c.bridgeType || 'ssh';
    const bHost = document.getElementById('form-bridge-host')?.value || c.bridgeHost;
    const bPort = document.getElementById('form-bridge-port')?.value || c.bridgePort || (bType === 'cman' ? 1521 : 22);
    const dHost = document.getElementById('form-host')?.value || c.host || 'localhost';
    const dPort = document.getElementById('form-port')?.value || c.port || 1521;
    const dSvc = document.getElementById('form-service')?.value || c.serviceName || 'ORCL';
    const bLabel = bType === 'cman' ? 'Ponte Oracle CMAN' : 'Ponte SSH';

    if (useBridge && bHost) {
      routeEl.innerHTML = `
        <span class="conn-route-badge badge-bridge-active">🌉 VIA PONTE ATIVA</span>
        <span>Seu PC</span> ➔ <strong>${bLabel} [${bHost}:${bPort}]</strong> ➔ <strong>Oracle Real [${dHost}:${dPort}/${dSvc}]</strong>
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
              <span>Conexões (${this.connections.length})</span>
              <span style="font-size: 10px; color: ${this.activeConnections.size > 0 ? '#15803d' : '#6b7280'}; font-weight: 700;">
                ${this.activeConnections.size > 0 ? `🟢 ${this.activeConnections.size} Ativa(s)` : '⚪ 0 Conectada'}
              </span>
              <button class="btn btn-primary" style="padding: 2px 6px; font-size: 10px;" onclick="window.TracesApp.connectionManager.createNewProfile();">+ Nova</button>
            </div>
            <div style="overflow-y: auto; max-height: 360px; display: flex; flex-direction: column; gap: 4px;">
              ${this.connections.map(item => {
                const isConn = this.activeConnections.has(item.id);
                const isActive = this.activeConn && this.activeConn.id === item.id;
                return `
                <div style="
                  padding: 8px 10px;
                  border-radius: 3px;
                  cursor: pointer;
                  border-left: 4px solid ${item.color || '#0078d7'};
                  background: ${item.id === c.id ? '#e0f2fe' : (isConn ? '#f0fdf4' : '#f9fafb')};
                  border: 1px solid ${item.id === c.id ? '#38bdf8' : (isConn ? '#86efac' : '#e5e7eb')};
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                " onclick="window.TracesApp.connectionManager.selectProfile('${item.id}')">
                  <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <span style="font-weight: 700; color: #111; font-size: 11px;">${item.name}</span>
                      ${isActive ? '<span style="font-size: 8.5px; background: #16a34a; color: #fff; padding: 1px 4px; border-radius: 3px; font-weight: 700;">ATIVO</span>' : (isConn ? '<span style="font-size: 8.5px; background: #0284c7; color: #fff; padding: 1px 4px; border-radius: 3px; font-weight: 700;">CONECTADO</span>' : '')}
                    </div>
                    <div style="font-size: 10px; color: #666; font-family: var(--toad-font-code);">${item.user}@${item.serviceName}</div>
                    ${item.useBridge && item.bridgeHost ? `
                      <div style="font-size: 9.5px; color: #0284c7; font-weight: 600;">🌉 via ${item.bridgeHost}</div>
                    ` : ''}
                  </div>
                  <div style="display: flex; gap: 2px;">
                    ${isConn && !isActive ? `
                      <button class="btn" style="padding: 1px 4px; font-size: 9px; color: #0284c7; background: #fff;" onclick="event.stopPropagation(); window.TracesApp.connectionManager.switchConnection('${item.id}')" title="Alternar para este banco ativo">⚡</button>
                    ` : ''}
                    ${this.connections.length > 1 ? `
                      <button class="btn" style="padding: 1px 4px; font-size: 9px; color: #ef4444;" onclick="event.stopPropagation(); window.TracesApp.connectionManager.deleteProfile('${item.id}')" title="Excluir">✕</button>
                    ` : ''}
                  </div>
                </div>
              `}).join('')}
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
                  <input type="text" id="form-name" value="${c.name || ''}" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-weight: 600;" oninput="window.TracesApp.connectionManager.updateRoutePreview();" onchange="window.TracesApp.connectionManager.readFormData();">
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Host do Banco (Destino):</label>
                  <input type="text" id="form-host" value="${c.host || 'localhost'}" placeholder="e.g. localhost ou IP do servidor Oracle" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" oninput="window.TracesApp.connectionManager.updateRoutePreview();" onchange="window.TracesApp.connectionManager.readFormData();">
                  <label style="font-weight: 600;">Porta:</label>
                  <input type="number" id="form-port" value="${c.port || 1521}" style="width: 75px; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" oninput="window.TracesApp.connectionManager.updateRoutePreview();" onchange="window.TracesApp.connectionManager.readFormData();">
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Service Name / SID:</label>
                  <input type="text" id="form-service" value="${c.serviceName || 'ORCL'}" placeholder="e.g. RMPROD ou ORCL" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" oninput="window.TracesApp.connectionManager.updateRoutePreview();" onchange="window.TracesApp.connectionManager.readFormData();">
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Usuário do Banco:</label>
                  <input type="text" id="form-user" value="${c.user || 'SYS'}" placeholder="e.g. SYS ou SYSTEM" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" onchange="window.TracesApp.connectionManager.readFormData();">
                  <label style="font-weight: 600;">Conectar Como:</label>
                  <select id="form-role" class="toad-conn-combobox" style="width: 105px; height: 26px;" onchange="window.TracesApp.connectionManager.readFormData();">
                    <option value="SYSDBA" ${c.role === 'SYSDBA' ? 'selected' : ''}>SYSDBA</option>
                    <option value="NORMAL" ${c.role === 'NORMAL' ? 'selected' : ''}>Normal</option>
                    <option value="SYSOPER" ${c.role === 'SYSOPER' ? 'selected' : ''}>SYSOPER</option>
                  </select>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Senha do Banco:</label>
                  <input type="password" id="form-password" value="${c.password || ''}" placeholder="Senha do banco de dados" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc;" oninput="window.TracesApp.connectionManager.readFormData();">
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Ambiente (Cor):</label>
                  <select id="form-color" class="toad-conn-combobox" style="flex: 1; height: 26px;" onchange="window.TracesApp.connectionManager.readFormData();">
                    <option value="#dc2626" ${c.color === '#dc2626' ? 'selected' : ''}>🔴 Produção (Vermelho)</option>
                    <option value="#f59e0b" ${c.color === '#f59e0b' ? 'selected' : ''}>🟡 Homologação / Teste (Amarelo)</option>
                    <option value="#10b981" ${c.color === '#10b981' ? 'selected' : ''}>🟢 Desenvolvimento (Verde)</option>
                    <option value="#0078d7" ${c.color === '#0078d7' ? 'selected' : ''}>🔵 Corporativo (Azul)</option>
                    <option value="#6366f1" ${c.color === '#6366f1' ? 'selected' : ''}>🟣 Disaster Recovery (Roxo)</option>
                  </select>
                </div>

                <div style="display: flex; gap: 8px; align-items: center; margin-left: 148px;">
                  <input type="checkbox" id="form-save-pwd" ${c.savePassword !== false ? 'checked' : ''} onchange="window.TracesApp.connectionManager.readFormData();">
                  <label for="form-save-pwd" style="color: #4b5563;">Lembrar senha do banco localmente</label>
                </div>

                <div style="display: flex; gap: 8px; align-items: center; margin-left: 148px; margin-top: 2px;">
                  <input type="checkbox" id="form-use-thick" ${c.useThick !== false ? 'checked' : ''} style="cursor: pointer;">
                  <label for="form-use-thick" style="color: #0369a1; font-weight: 600; cursor: pointer; font-size: 11px;">
                    🛡️ Modo Thick (Oracle Instant Client 19.23 Embutido - Suporte 10g a 23ai, Verificador 0x939)
                  </label>
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
                  <label style="width: 140px; font-weight: 600;">Tipo de Ponte:</label>
                  <select id="form-bridge-type" class="toad-conn-combobox" style="flex: 1; height: 26px;" onchange="window.TracesApp.connectionManager.onBridgeTypeChange(this.value);">
                    <option value="ssh" ${c.bridgeType !== 'cman' ? 'selected' : ''}>🔐 Túnel SSH / Jump Host (Bastion - porta 22 padrão)</option>
                    <option value="cman" ${c.bridgeType === 'cman' ? 'selected' : ''}>🔄 Oracle Connection Manager (CMAN / Net8 Hop - porta 1521)</option>
                  </select>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                  <label style="width: 140px; font-weight: 600;">Host da Ponte (IP/DNS):</label>
                  <input type="text" id="form-bridge-host" value="${c.bridgeHost || ''}" placeholder="e.g. 10.100.10.39 ou bastion.empresa.com" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" oninput="window.TracesApp.connectionManager.updateRoutePreview();" onchange="window.TracesApp.connectionManager.readFormData();">
                  <label style="font-weight: 600;">Porta:</label>
                  <input type="number" id="form-bridge-port" value="${c.bridgePort || (c.bridgeType === 'cman' ? 1521 : 22)}" style="width: 75px; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" oninput="window.TracesApp.connectionManager.updateRoutePreview();" onchange="window.TracesApp.connectionManager.readFormData();">
                </div>

                <div id="bridge-ssh-credentials" style="display: ${c.bridgeType === 'cman' ? 'none' : 'flex'}; flex-direction: column; gap: 8px;">
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="width: 140px; font-weight: 600;">Usuário da Ponte (SSH):</label>
                    <input type="text" id="form-bridge-user" value="${c.bridgeUser || ''}" placeholder="e.g. root, ubuntu, oracle ou usuário corporativo" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" onchange="window.TracesApp.connectionManager.readFormData();">
                  </div>

                  <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="width: 140px; font-weight: 600;">Senha da Ponte:</label>
                    <input type="password" id="form-bridge-password" value="${c.bridgePassword || ''}" placeholder="Senha SSH da máquina intermediária" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc;" oninput="window.TracesApp.connectionManager.readFormData();">
                  </div>

                  <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="width: 140px; font-weight: 600;">Chave Privada (Opcional):</label>
                    <input type="text" id="form-bridge-key" value="${c.bridgeKeyPath || ''}" placeholder="Caminho do arquivo .pem, .ppk ou id_rsa (se não usar senha)" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" onchange="window.TracesApp.connectionManager.readFormData();">
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 8px; border-top: 1px dashed #cbd5e1;">
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="checkbox" id="form-save-bridge-pwd" ${c.saveBridgePassword !== false ? 'checked' : ''} onchange="window.TracesApp.connectionManager.readFormData();">
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
            <span id="real-test-status" style="font-size: 11px; color: #555; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${this.activeConnections.has(c.id) ? `🟢 Conectado ao vivo (${this.activeConnections.size} bancos ativos)` : 'Pronto para conectar ao banco real.'}
            </span>
            <div style="display: flex; gap: 6px; align-items: center;">
              ${this.activeConnections.has(c.id) ? `
                <button class="btn" style="color: #dc2626; border-color: #fca5a5; font-size: 11px;" onclick="window.TracesApp.connectionManager.disconnect('${c.id}');">🔌 Desconectar Este</button>
              ` : ''}
              ${this.activeConnections.size > 1 ? `
                <button class="btn" style="color: #6b7280; font-size: 11px;" onclick="window.TracesApp.connectionManager.disconnectAll();">Desconectar Todos</button>
              ` : ''}
              <button class="btn" style="background: #0284c7; color: #fff; border-color: #0369a1; font-weight: 700; padding: 5px 12px;" onclick="window.TracesApp.connectionManager.saveCurrentProfile(true);">
                💾 Salvar Conexão
              </button>
              <button class="btn" onclick="window.TracesApp.connectionManager.testCurrentProfile();">🔍 Testar</button>
              <button class="btn btn-primary" style="font-weight: 700; background: #15803d; border-color: #166534;" onclick="window.TracesApp.connectionManager.connectCurrentProfile();">
                ${this.activeConnections.has(c.id) ? '⚡ Reconectar Banco' : '⚡ Conectar ao Banco'}
              </button>
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
    const savePwdEl = document.getElementById('form-save-pwd');
    if (savePwdEl) c.savePassword = savePwdEl.checked;
    const pwdEl = document.getElementById('form-password');
    if (pwdEl && pwdEl.value !== undefined) c.password = pwdEl.value;
    const thickEl = document.getElementById('form-use-thick');
    if (thickEl) c.useThick = thickEl.checked;

    // Bridge settings
    const bridgeEl = document.getElementById('form-use-bridge');
    if (bridgeEl) c.useBridge = bridgeEl.checked;
    const bridgeTypeEl = document.getElementById('form-bridge-type');
    if (bridgeTypeEl) c.bridgeType = bridgeTypeEl.value;
    const bridgeHostEl = document.getElementById('form-bridge-host');
    if (bridgeHostEl) c.bridgeHost = bridgeHostEl.value;
    const bridgePortEl = document.getElementById('form-bridge-port');
    if (bridgePortEl) c.bridgePort = parseInt(bridgePortEl.value || (c.bridgeType === 'cman' ? '1521' : '22'));
    const bridgeUserEl = document.getElementById('form-bridge-user');
    if (bridgeUserEl) c.bridgeUser = bridgeUserEl.value;
    const bridgePwdEl = document.getElementById('form-bridge-password');
    if (bridgePwdEl && bridgePwdEl.value !== undefined) c.bridgePassword = bridgePwdEl.value;
    const bridgeKeyEl = document.getElementById('form-bridge-key');
    if (bridgeKeyEl) c.bridgeKeyPath = bridgeKeyEl.value;
    const saveBridgePwdEl = document.getElementById('form-save-bridge-pwd');
    if (saveBridgePwdEl) c.saveBridgePassword = saveBridgePwdEl.checked;

    // Update in connections array
    const idx = this.connections.findIndex(item => item.id === c.id);
    if (idx !== -1) {
      const copy = JSON.parse(JSON.stringify(c));
      if (c.savePassword === false) copy.password = '';
      if (c.saveBridgePassword === false) copy.bridgePassword = '';
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
          bridge_type: c.bridgeType || 'ssh',
          bridge_host: c.bridgeHost,
          bridge_port: c.bridgePort || (c.bridgeType === 'cman' ? 1521 : 22),
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
      const msg = err.message || '';
      const displayMsg = (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed'))
        ? 'Serviço Bridge local (porta 3033) não respondeu. O servidor pode estar inicializando.'
        : msg;
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: #ef4444;">✕ Erro de comunicação: ${displayMsg}</span>`;
      }
      window.TracesApp.notify(`Erro de comunicação: ${displayMsg}`, 'error');
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
          id: c.id,
          conn_id: c.id,
          name: c.name,
          host: c.host,
          port: c.port,
          service_name: c.serviceName,
          user: c.user,
          role: c.role,
          password: c.password,
          use_thick: c.useThick !== false,
          use_bridge: Boolean(c.useBridge),
          bridge_type: c.bridgeType || 'ssh',
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
      const msg = err.message || '';
      const displayMsg = (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed'))
        ? 'Serviço Bridge local (porta 3033) não respondeu. O servidor pode estar inicializando.'
        : msg;
      if (statusEl) {
        statusEl.textContent = `✕ Erro no servidor: ${displayMsg}`;
        statusEl.style.color = '#c00000';
      }
      window.TracesApp.notify(`Erro de comunicação com o servidor: ${displayMsg}`, 'error');
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
          id: c.id,
          conn_id: c.id,
          name: c.name,
          host: c.host,
          port: c.port,
          service_name: c.serviceName,
          user: c.user,
          role: c.role,
          password: c.password,
          use_thick: c.useThick !== false,
          use_bridge: Boolean(c.useBridge),
          bridge_type: c.bridgeType || 'ssh',
          bridge_host: c.bridgeHost,
          bridge_port: c.bridgePort,
          bridge_user: c.bridgeUser,
          bridge_password: c.bridgePassword,
          bridge_key_path: c.bridgeKeyPath
        })
      });
      const data = await resp.json();

      if (data.success) {
        c.lastConnected = new Date().toISOString();
        this.saveConnections();

        // Registra no mapa de conexões simultaneamente ativas
        this.activeConnections.set(c.id, { config: c, data: data });
        this.activeConn = c;

        window.TracesApp.isRealDatabase = true;
        window.TracesApp.realDatabaseConfig = c;
        if (data.os) {
          window.TracesApp.setServerOs(data.os);
        }

        // Atualizar Titlebar com contagem de conexões
        const titleEl = document.getElementById('toad-window-title');
        const multiCount = this.activeConnections.size > 1 ? ` [${this.activeConnections.size} Bancos Conectados]` : '';
        if (titleEl) {
          if (c.useBridge && c.bridgeHost) {
            titleEl.textContent = `Toad for Oracle - [REAL ORACLE: ${c.user}@${c.host}:${c.port}/${c.serviceName} (via Ponte: ${c.bridgeHost})]${multiCount}`;
          } else {
            titleEl.textContent = `Toad for Oracle - [REAL ORACLE: ${c.user}@${c.host}:${c.port}/${c.serviceName} (${c.role})]${multiCount}`;
          }
        }

        // Atualizar Statusbar
        const dbVerEl = document.getElementById('status-db-version');
        const userEl = document.getElementById('status-db-user');
        const latencyEl = document.getElementById('status-db-latency');

        if (dbVerEl) dbVerEl.textContent = `${data.version} (${data.mode || 'THICK'})`;
        if (userEl) {
          const multiText = this.activeConnections.size > 1 ? ` | +${this.activeConnections.size - 1} banco(s)` : '';
          userEl.textContent = `${c.user}@${c.serviceName} (${c.role})${c.useBridge && c.bridgeHost ? ' 🌉 Ponte: ' + c.bridgeHost : ''}${multiText}`;
        }
        if (latencyEl) latencyEl.textContent = `${data.latency_ms} ms`;

        // Update Color Band
        const band = document.getElementById('toad-color-band');
        if (band) band.style.backgroundColor = c.color || '#dc2626';

        this.renderHeaderPill();
        this.updateSelectorDropdown();
        this.closeModal();

        const successMsg = this.activeConnections.size > 1
          ? `Conectado ao Banco Real ${c.name} (${data.mode || 'THICK'})! (${this.activeConnections.size} bancos conectados simultaneamente)`
          : (c.useBridge && c.bridgeHost
              ? `Conectado ao Banco Real ${c.serviceName} através da Ponte ${c.bridgeHost}! (${data.mode || 'THICK'})`
              : `Conectado ao Banco Real ${c.serviceName} com sucesso! (${data.mode || 'THICK'})`);
        window.TracesApp.notify(successMsg, 'success');

        // Atualizar Schema Browser, Sessions e DBA Hub
        if (window.TracesApp.schemaBrowser && typeof window.TracesApp.schemaBrowser.loadRealSchemas === 'function') {
          window.TracesApp.schemaBrowser.loadRealSchemas();
        }
        if (window.TracesApp.sessionMonitor && typeof window.TracesApp.sessionMonitor.loadRealSessions === 'function') {
          window.TracesApp.sessionMonitor.loadRealSessions();
        }
        if (window.TracesApp.databaseProbe && typeof window.TracesApp.databaseProbe.loadRealProbe === 'function') {
          window.TracesApp.databaseProbe.loadRealProbe();
        }
        if (window.TracesApp && typeof window.TracesApp.updateConnectionState === 'function') {
          window.TracesApp.updateConnectionState();
        }

        if (window.TracesApp && typeof window.TracesApp.openWindow === 'function') {
          window.TracesApp.openWindow('editor');
          setTimeout(() => {
            if (window.TracesApp.sqlEditor?.textarea) {
              window.TracesApp.sqlEditor.textarea.focus();
            }
          }, 150);
        }
      } else {
        window.TracesApp.notify(`Falha na conexão: ${data.error}`, 'error');
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        window.TracesApp.notify(`Erro de comunicação com o Bridge local (porta 3033). O servidor pode estar inicializando. Aguarde 2 segundos e tente novamente.`, 'error');
      } else {
        window.TracesApp.notify(`Erro de comunicação: ${msg}`, 'error');
      }
    }
  }

  async switchConnection(id) {
    const found = this.activeConnections.get(id);
    if (!found) {
      this.selectProfile(id);
      this.openModal();
      return;
    }

    try {
      const resp = await fetch('/api/switch-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conn_id: id })
      });
      const data = await resp.json();
      if (data.success) {
        this.activeConn = found.config;
        window.TracesApp.isRealDatabase = true;
        window.TracesApp.realDatabaseConfig = found.config;
        if (data.connection && data.connection.os) {
          window.TracesApp.setServerOs(data.connection.os);
        }

        // Atualizar título
        const titleEl = document.getElementById('toad-window-title');
        const c = found.config;
        const multiCount = this.activeConnections.size > 1 ? ` [${this.activeConnections.size} Bancos Conectados]` : '';
        if (titleEl) {
          if (c.useBridge && c.bridgeHost) {
            titleEl.textContent = `Toad for Oracle - [REAL ORACLE: ${c.user}@${c.host}:${c.port}/${c.serviceName} (via Ponte: ${c.bridgeHost})]${multiCount}`;
          } else {
            titleEl.textContent = `Toad for Oracle - [REAL ORACLE: ${c.user}@${c.host}:${c.port}/${c.serviceName} (${c.role})]${multiCount}`;
          }
        }

        // Atualizar barra de status
        const dbVerEl = document.getElementById('status-db-version');
        const userEl = document.getElementById('status-db-user');
        if (dbVerEl) dbVerEl.textContent = `${data.connection.banner || 'Oracle Database'} (${data.connection.mode || 'THICK'})`;
        if (userEl) {
          const multiText = this.activeConnections.size > 1 ? ` | +${this.activeConnections.size - 1} banco(s)` : '';
          userEl.textContent = `${c.user}@${c.serviceName} (${c.role})${c.useBridge && c.bridgeHost ? ' 🌉 Ponte: ' + c.bridgeHost : ''}${multiText}`;
        }

        // Color band
        const band = document.getElementById('toad-color-band');
        if (band) band.style.backgroundColor = c.color || '#0078d7';

        this.renderHeaderPill();
        this.updateSelectorDropdown();
        this.renderModal();

        if (window.TracesApp && typeof window.TracesApp.updateConnectionState === 'function') {
          window.TracesApp.updateConnectionState();
        }

        // Atualizar Schema Browser, Sessions e DBA Hub para a nova conexão ativa
        if (window.TracesApp.schemaBrowser?.loadRealSchemas) window.TracesApp.schemaBrowser.loadRealSchemas();
        if (window.TracesApp.sessionMonitor?.loadRealSessions) window.TracesApp.sessionMonitor.loadRealSessions();
        if (window.TracesApp.databaseProbe?.loadRealProbe) window.TracesApp.databaseProbe.loadRealProbe();

        window.TracesApp.notify(`Banco ativo alterado para: ${c.name} (${c.user}@${c.serviceName})`, 'info');
      }
    } catch (err) {
      console.error('Falha ao alternar conexão:', err);
    }
  }

  renderHeaderPill() {
    const pill = this.headerPill || document.getElementById('header-connection-pill');
    if (!pill) return;
    this.headerPill = pill;
    const isConn = window.TracesApp?.isConnected?.() || Boolean(this.activeConn);
    const c = this.activeConn || window.TracesApp?.realDatabaseConfig;
    if (!isConn || !c) {
      pill.innerHTML = `
        <span class="toad-conn-indicator" style="background: #9ca3af;"></span>
        <span style="font-weight: 700; color: #555;">Desconectado</span>
        <span style="color: #888; font-size: 10px;">(Clique para Conectar)</span>
      `;
      return;
    }
    const bridgeBadge = c.useBridge && c.bridgeHost ? ` <span style="font-size: 9px; background: #e0f2fe; color: #0284c7; padding: 1px 4px; border-radius: 3px; border: 1px solid #bae6fd;">🌉 ${c.bridgeHost}</span>` : '';
    const multiBadge = this.activeConnections.size > 1 ? ` <span style="font-size: 9.5px; background: #15803d; color: #fff; padding: 1px 6px; border-radius: 10px; font-weight: 800;">${this.activeConnections.size} Bancos</span>` : '';
    pill.innerHTML = `
      <span class="toad-conn-indicator" style="background: ${c.color || '#16a34a'};"></span>
      <span style="font-weight: 700; color: #15803d;">${c.user}@${c.serviceName || c.service_name || 'ORCL'}</span>
      ${bridgeBadge}
      ${multiBadge}
      <span style="color: #4b5563; font-size: 10px;">(${c.role || 'NORMAL'})</span>
    `;
  }

  updateSelectorDropdown() {
    if (!this.selectorEl) return;
    const totalActive = this.activeConnections.size;
    let html = '';

    if (totalActive === 0) {
      html += `<option value="" selected>-- Desconectado (Clique para Conectar) --</option>`;
    } else {
      html += `<option value="">-- [${totalActive} Banco(s) Conectado(s)] --</option>`;
    }

    const connectedList = this.connections.filter(c => this.activeConnections.has(c.id));
    const unconnectedList = this.connections.filter(c => !this.activeConnections.has(c.id));

    if (connectedList.length > 0) {
      html += `<optgroup label="Bancos Conectados">`;
      connectedList.forEach(c => {
        const isCurrent = (this.activeConn && this.activeConn.id === c.id);
        const bridgeText = c.useBridge && c.bridgeHost ? ` [🌉 ${c.bridgeHost}]` : '';
        html += `
          <option value="${c.id}" ${isCurrent ? 'selected' : ''}>
            ${isCurrent ? '🟢 [ATIVO]' : '🟢 [CONECTADO]'} ${c.name} (${c.user}@${c.serviceName})${bridgeText}
          </option>
        `;
      });
      html += `</optgroup>`;
    }

    if (unconnectedList.length > 0) {
      html += `<optgroup label="Outras Conexões Salvas">`;
      unconnectedList.forEach(c => {
        html += `
          <option value="${c.id}">
            ⚪ [Salvo] ${c.name} (${c.user}@${c.serviceName}) - ${c.host}
          </option>
        `;
      });
      html += `</optgroup>`;
    }

    this.selectorEl.innerHTML = html;

    this.selectorEl.onchange = (e) => {
      const selectedId = e.target.value;
      if (!selectedId) return;

      if (this.activeConnections.has(selectedId)) {
        this.switchConnection(selectedId);
      } else {
        this.selectProfile(selectedId);
        this.openModal();
      }
    };
  }

  async disconnect(id) {
    const targetId = id || this.activeConn?.id;
    if (!targetId) return;

    try {
      await fetch('/api/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conn_id: targetId })
      });
    } catch (e) {
      console.warn('Disconnect request error', e);
    }

    const wasActive = (this.activeConn && this.activeConn.id === targetId);
    this.activeConnections.delete(targetId);

    if (this.activeConnections.size > 0) {
      if (wasActive) {
        const nextEntry = this.activeConnections.values().next().value;
        if (nextEntry && nextEntry.config) {
          await this.switchConnection(nextEntry.config.id);
        }
      } else {
        this.renderHeaderPill();
        this.updateSelectorDropdown();
        this.renderModal();
      }
      window.TracesApp?.notify(`Conexão desconectada. (${this.activeConnections.size} banco(s) restante(s))`, 'info');
    } else {
      this.activeConn = null;
      if (window.TracesApp) {
        window.TracesApp.isRealDatabase = false;
        window.TracesApp.realDatabaseConfig = null;
      }
      this.renderHeaderPill();
      this.updateSelectorDropdown();
      this.renderModal();
      const titleEl = document.getElementById('toad-window-title');
      if (titleEl) titleEl.textContent = 'Toad for Oracle - [Desconectado]';
      const userEl = document.getElementById('status-db-user');
      const verEl = document.getElementById('status-db-version');
      const latEl = document.getElementById('status-db-latency');
      if (userEl) userEl.textContent = '[Desconectado]';
      if (verEl) verEl.textContent = 'Pronto para conectar ao banco de dados';
      if (latEl) latEl.textContent = '-- ms';
      const osEl = document.getElementById('status-db-os');
      if (osEl) {
        osEl.innerHTML = `<span>🖥️</span> <span>[SO: Auto]</span>`;
        osEl.title = 'Host OS: Detectado automaticamente ao conectar (Linux, Windows, AIX)';
      }
      if (window.TracesApp && typeof window.TracesApp.updateConnectionState === 'function') {
        window.TracesApp.updateConnectionState();
      }
      window.TracesApp?.notify('Sessão desconectada e túnel encerrado.', 'info');
    }
  }

  async disconnectAll() {
    try {
      await fetch('/api/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
    } catch (e) {
      console.warn('Disconnect all error', e);
    }
    this.activeConnections.clear();
    this.activeConn = null;
    if (window.TracesApp) {
      window.TracesApp.isRealDatabase = false;
      window.TracesApp.realDatabaseConfig = null;
    }
    this.renderHeaderPill();
    this.updateSelectorDropdown();
    this.renderModal();
    const titleEl = document.getElementById('toad-window-title');
    if (titleEl) titleEl.textContent = 'Toad for Oracle - [Desconectado]';
    const userEl = document.getElementById('status-db-user');
    const verEl = document.getElementById('status-db-version');
    const latEl = document.getElementById('status-db-latency');
    if (userEl) userEl.textContent = '[Desconectado]';
    if (verEl) verEl.textContent = 'Pronto para conectar ao banco de dados';
    if (latEl) latEl.textContent = '-- ms';
    if (window.TracesApp && typeof window.TracesApp.updateConnectionState === 'function') {
      window.TracesApp.updateConnectionState();
    }
    window.TracesApp?.notify('Todas as sessões e túneis foram desconectados.', 'info');
  }

  async syncWithServerState() {
    try {
      const resp = await fetch('/api/connections');
      const data = await resp.json();
      if (data.success && Array.isArray(data.connections) && data.connections.length > 0) {
        this.activeConnections.clear();
        data.connections.forEach(item => {
          const profile = this.connections.find(c => c.id === item.id) || {
            id: item.id,
            name: item.name,
            host: item.host,
            port: item.port,
            serviceName: item.service_name,
            user: item.user,
            role: item.role,
            useBridge: item.use_bridge,
            bridgeHost: item.bridge_host
          };
          this.activeConnections.set(item.id, { config: profile, data: item });
          if (item.is_active || item.id === data.active_id) {
            this.activeConn = profile;
          }
        });
        if (!this.activeConn && this.activeConnections.size > 0) {
          this.activeConn = this.activeConnections.values().next().value.config;
        }
        if (this.activeConn) {
          window.TracesApp.isRealDatabase = true;
          window.TracesApp.realDatabaseConfig = this.activeConn;
          if (window.TracesApp.sessionMonitor?.loadRealSessions) {
            window.TracesApp.sessionMonitor.loadRealSessions();
          }
          if (window.TracesApp.schemaBrowser?.loadRealSchemas) {
            window.TracesApp.schemaBrowser.loadRealSchemas();
          }
          if (window.TracesApp.updateConnectionState) {
            window.TracesApp.updateConnectionState();
          }
        }
        this.renderHeaderPill();
        this.updateSelectorDropdown();
      }
    } catch (e) {
      // Offline / startup
    }
  }

  getActive() {
    return this.activeConn;
  }
}

window.ConnectionManager = ConnectionManager;
