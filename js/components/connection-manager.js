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
    this.renderConnectionBar();
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
    this.connectionBarEl = document.getElementById('toad-connection-bar');
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

  openNewConnectionModal() {
    this.readFormData();
    const newId = `conn-${Date.now()}`;
    const newProfile = {
      id: newId,
      name: `Novo Host / Banco (${this.connections.length + 1})`,
      host: 'localhost',
      port: 1521,
      serviceName: 'ORCL',
      user: 'SYS',
      role: 'SYSDBA',
      color: '#10b981',
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
    this.editingConn = JSON.parse(JSON.stringify(newProfile));
    this.activeTab = 'db';
    this.saveConnections();
    this.renderModal();
    this.updateSelectorDropdown();
    if (this.connModal) this.connModal.classList.add('open');
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

  async connectToProfile(profileData) {
    if (!profileData) return;
    let target = this.connections.find(p => p.host === profileData.host && (p.serviceName === profileData.serviceName || p.sid === profileData.sid));
    if (!target) {
      target = {
        id: `conn-${Date.now()}`,
        name: profileData.name || `${profileData.user || 'SYSTEM'}@${profileData.serviceName || profileData.sid || 'orcl'}`,
        host: profileData.host || 'localhost',
        port: profileData.port || 1521,
        serviceName: profileData.serviceName || profileData.sid || 'orcl',
        user: profileData.user || 'SYSTEM',
        role: profileData.role || 'NORMAL',
        color: profileData.color || '#10b981',
        password: profileData.password || '',
        savePassword: true,
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
      this.connections.push(target);
      this.saveConnections();
    }
    this.editingConn = JSON.parse(JSON.stringify(target));
    this.selectProfile(target.id);

    if (!target.password) {
      this.openModal();
      window.TracesApp?.notify(`Informe a senha para conectar a ${target.name}`, 'info');
      setTimeout(() => { document.getElementById('form-password')?.focus(); }, 150);
    } else {
      await this.connectCurrentProfile();
    }
  }

  populateFromInventory(invId) {
    const inv = window.TracesApp?.inventoryManager?.inventory || [];
    const item = inv.find(i => i.id === invId);
    if (!item || !this.editingConn) return;

    this.editingConn.name = item.name;
    this.editingConn.host = item.host;
    this.editingConn.port = item.port || 1521;
    this.editingConn.serviceName = item.serviceName || item.sid || 'orcl';
    this.editingConn.user = item.user || 'SYSTEM';
    this.editingConn.color = item.color || (item.environment === 'PROD' ? '#dc2626' : '#10b981');
    this.editingConn.environment = item.environment || 'DEV';

    this.renderModal();
    window.TracesApp?.notify(`Dados carregados do inventário: ${item.name}`, 'success');
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
        <!-- Left: Connections List -->
        <div style="width: 250px; border-right: 1px solid #d4d4d4; padding-right: 10px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; flex-direction: column; height: 100%;">
            <div style="font-weight: 700; color: #1e293b; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; gap: 4px;">
              <span>Conexões (${this.connections.length})</span>
              <div style="display: flex; gap: 3px; align-items: center;">
                <button class="btn" style="padding: 2px 5px; font-size: 9.5px; font-weight: 700; color: #0284c7; background: #e0f2fe; border-color: #bae6fd;" onclick="window.TracesApp.inventoryManager.openInventoryModal();" title="Abrir Catálogo &amp; Inventário Corporativo de Bancos">📋 Inventário</button>
                <button class="btn btn-primary" style="padding: 2px 6px; font-size: 9.5px; font-weight: 700;" onclick="window.TracesApp.connectionManager.openNewConnectionModal();" title="Adicionar e conectar a um novo host">+ Nova</button>
              </div>
            </div>

            <div style="overflow-y: auto; flex: 1; max-height: 380px; display: flex; flex-direction: column; gap: 4px; padding-right: 2px;">
              ${this.activeConnections.size > 0 ? `
                <div style="font-size: 9.5px; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px; margin: 4px 0 2px 2px; display: flex; align-items: center; justify-content: space-between;">
                  <span>🟢 BANCOS CONECTADOS AGORA (${this.activeConnections.size})</span>
                </div>
                ${Array.from(this.activeConnections.entries()).map(([connId, entry]) => {
                  const item = entry.config;
                  const isActive = (this.activeConn && this.activeConn.id === connId);
                  const isSelected = (c && c.id === connId);
                  return `
                    <div style="
                      padding: 6px 8px;
                      border-radius: 4px;
                      cursor: pointer;
                      border-left: 4px solid ${item.color || '#16a34a'};
                      background: ${isSelected ? '#e0f2fe' : (isActive ? '#f0fdf4' : '#ffffff')};
                      border-top: 1px solid ${isActive ? '#86efac' : '#cbd5e1'};
                      border-right: 1px solid ${isActive ? '#86efac' : '#cbd5e1'};
                      border-bottom: 1px solid ${isActive ? '#86efac' : '#cbd5e1'};
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
                    " onclick="window.TracesApp.connectionManager.selectProfile('${connId}')">
                      <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                        <div style="display: flex; align-items: center; gap: 4px;">
                          <span style="font-weight: 700; color: #111; font-size: 11px;">${item.name || item.user}</span>
                          ${isActive ? '<span style="font-size: 8px; background: #16a34a; color: #fff; padding: 1px 4px; border-radius: 3px; font-weight: 700;">★ ATIVO</span>' : '<span style="font-size: 8px; background: #0284c7; color: #fff; padding: 1px 4px; border-radius: 3px; font-weight: 700;">ON</span>'}
                        </div>
                        <div style="font-size: 10px; color: #475569; font-family: var(--toad-font-code);">${item.user}@${item.serviceName}</div>
                        <div style="font-size: 9.5px; color: #64748b;">${item.host}:${item.port}${item.useBridge && item.bridgeHost ? ` 🌉 via ${item.bridgeHost}` : ''}</div>
                      </div>
                      <div style="display: flex; gap: 2px; align-items: center; margin-left: 4px;">
                        ${!isActive ? `
                          <button class="btn" style="padding: 2px 5px; font-size: 9.5px; color: #0284c7; font-weight: 700; background: #f0f9ff; border-color: #bae6fd;" onclick="event.stopPropagation(); window.TracesApp.connectionManager.switchConnection('${connId}')" title="Alternar para este banco (0ms lag)">⚡</button>
                        ` : ''}
                        <button class="btn" style="padding: 2px 4px; font-size: 9px; color: #ef4444; border-color: #fca5a5;" onclick="event.stopPropagation(); window.TracesApp.connectionManager.disconnect('${connId}')" title="Desconectar este banco">✕</button>
                      </div>
                    </div>
                  `;
                }).join('')}
                <div style="height: 6px;"></div>
              ` : ''}

              <div style="font-size: 9.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 4px 0 2px 2px;">
                📁 PERFIS SALVOS (${this.connections.length})
              </div>
              ${this.connections.map(item => {
                const isConn = this.activeConnections.has(item.id);
                const isActive = this.activeConn && this.activeConn.id === item.id;
                const isSelected = (c && c.id === item.id);
                return `
                <div style="
                  padding: 6px 8px;
                  border-radius: 3px;
                  cursor: pointer;
                  border-left: 4px solid ${item.color || '#0078d7'};
                  background: ${isSelected ? '#e0f2fe' : (isConn ? '#f0fdf4' : '#f9fafb')};
                  border-top: 1px solid ${isSelected ? '#38bdf8' : (isConn ? '#86efac' : '#e5e7eb')};
                  border-right: 1px solid ${isSelected ? '#38bdf8' : (isConn ? '#86efac' : '#e5e7eb')};
                  border-bottom: 1px solid ${isSelected ? '#38bdf8' : (isConn ? '#86efac' : '#e5e7eb')};
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                " onclick="window.TracesApp.connectionManager.selectProfile('${item.id}')">
                  <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <span style="font-weight: 700; color: #111; font-size: 11px;">${item.name}</span>
                      ${isActive ? '<span style="font-size: 8px; background: #16a34a; color: #fff; padding: 1px 4px; border-radius: 3px; font-weight: 700;">★ ATIVO</span>' : (isConn ? '<span style="font-size: 8px; background: #0284c7; color: #fff; padding: 1px 4px; border-radius: 3px; font-weight: 700;">ON</span>' : '')}
                    </div>
                    <div style="font-size: 10px; color: #666; font-family: var(--toad-font-code);">${item.user}@${item.serviceName} (${item.host})</div>
                    ${item.useBridge && item.bridgeHost ? `
                      <div style="font-size: 9px; color: #0284c7; font-weight: 600;">🌉 via ${item.bridgeHost}</div>
                    ` : ''}
                  </div>
                  <div style="display: flex; gap: 2px; margin-left: 4px;">
                    ${isConn && !isActive ? `
                      <button class="btn" style="padding: 1px 4px; font-size: 9px; color: #0284c7; background: #fff;" onclick="event.stopPropagation(); window.TracesApp.connectionManager.switchConnection('${item.id}')" title="Alternar para este banco">⚡</button>
                    ` : ''}
                    ${this.connections.length > 1 ? `
                      <button class="btn" style="padding: 1px 4px; font-size: 9px; color: #ef4444;" onclick="event.stopPropagation(); window.TracesApp.connectionManager.deleteProfile('${item.id}')" title="Excluir Perfil">✕</button>
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
                  <select class="toad-conn-combobox" style="height: 25px; font-size: 10px; min-width: 155px; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; font-weight: 600;" onchange="if(this.value){window.TracesApp.connectionManager.populateFromInventory(this.value);this.value='';}">
                    <option value="">📋 Do Inventário...</option>
                    ${(window.TracesApp?.inventoryManager?.inventory || []).map(inv => `
                      <option value="${inv.id}">${inv.environment}: ${inv.name}</option>
                    `).join('')}
                  </select>
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
                    Ative quando o banco Oracle estiver em uma rede privada ou VPC isolada, exigindo conexão prévia em um servidor intermediário (ex: <strong>bastion.empresa.com</strong>) para rotear o tráfego.
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
                  <input type="text" id="form-bridge-host" value="${c.bridgeHost || ''}" placeholder="e.g. bastion.empresa.com ou jump-host.corp" style="flex: 1; padding: 4px 6px; border: 1px solid #ccc; font-family: var(--toad-font-code);" oninput="window.TracesApp.connectionManager.updateRoutePreview();" onchange="window.TracesApp.connectionManager.readFormData();">
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
                ${this.activeConnections.has(c.id) ? '⚡ Reconectar Banco' : (this.activeConnections.size > 0 ? '➕ Conectar Também Neste' : '⚡ Conectar ao Banco')}
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
    let c = this.readFormData();
    if (!c) return;

    // Multi-connection safe guard: If this ID is already connected, but host/port/service/user changed,
    // clone to a fresh profile so the previous active database stays intact!
    if (this.activeConnections.has(c.id)) {
      const activeEntry = this.activeConnections.get(c.id);
      const prevCfg = activeEntry?.config;
      if (prevCfg && (prevCfg.host !== c.host || prevCfg.port !== c.port || prevCfg.serviceName !== c.serviceName || prevCfg.user !== c.user)) {
        const newId = `conn-${Date.now()}`;
        const cloned = JSON.parse(JSON.stringify(c));
        cloned.id = newId;
        cloned.name = `${cloned.user}@${cloned.serviceName} (${cloned.host})`;
        this.connections.push(cloned);
        this.saveConnections();
        this.editingConn = cloned;
        c = cloned;
      }
    }

    const statusEl = document.getElementById('real-test-status');
    const viaText = c.useBridge && c.bridgeHost ? ` via Ponte ${c.bridgeHost}` : '';
    if (statusEl) {
      statusEl.innerHTML = `<span style="color: #0284c7; font-weight: 600;">⏳ Conectando em ${c.host}:${c.port}/${c.serviceName}${viaText}...</span>`;
    }
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
        if (data.cdb) {
          c.cdb = data.cdb;
          c.isCdb = Boolean(data.cdb.is_cdb);
        }
        this.saveConnections();

        // Registra no mapa de conexões simultaneamente ativas
        const prevConnId = this.activeConn?.id;
        const isNewConn = !this.activeConnections.has(c.id);
        this.activeConnections.set(c.id, { config: c, data: data, cdb: data.cdb });
        this.activeConn = c;
        if (prevConnId && prevConnId !== c.id && window.TracesApp.swapWorkspace) {
          if (isNewConn) window.TracesApp.dropWorkspace(c.id);
          window.TracesApp.swapWorkspace(prevConnId, c.id);
        }

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
        this.renderConnectionBar();
        if (window.TracesApp.sqlEditor?.renderTabs) window.TracesApp.sqlEditor.renderTabs();
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
        if (statusEl) {
          statusEl.innerHTML = `<span style="color: #dc2626; font-weight: 600;">✕ Falha: ${data.error}</span>`;
        }
        window.TracesApp.notify(`Falha na conexão: ${data.error}`, 'error');
      }
    } catch (err) {
      const msg = err.message || '';
      if (statusEl) {
        statusEl.innerHTML = `<span style="color: #dc2626; font-weight: 600;">✕ Erro: ${msg}</span>`;
      }
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

    const c = found.config;
    const prevId = this.activeConn?.id;

    // Instant 0ms visual switch
    this.activeConn = c;
    window.TracesApp.isRealDatabase = true;
    window.TracesApp.realDatabaseConfig = c;
    if (prevId !== id && window.TracesApp.swapWorkspace) {
      window.TracesApp.swapWorkspace(prevId, id);
    }

    // Atualizar título
    const titleEl = document.getElementById('toad-window-title');
    const multiCount = this.activeConnections.size > 1 ? ` [${this.activeConnections.size} Bancos Conectados]` : '';
    if (titleEl) {
      if (c.useBridge && c.bridgeHost) {
        titleEl.textContent = `Toad for Oracle - [REAL ORACLE: ${c.user}@${c.host}:${c.port}/${c.serviceName} (via Ponte: ${c.bridgeHost})]${multiCount}`;
      } else {
        titleEl.textContent = `Toad for Oracle - [REAL ORACLE: ${c.user}@${c.host}:${c.port}/${c.serviceName} (${c.role})]${multiCount}`;
      }
    }

    // Atualizar barra de status
    const userEl = document.getElementById('status-db-user');
    if (userEl) {
      const multiText = this.activeConnections.size > 1 ? ` | +${this.activeConnections.size - 1} banco(s)` : '';
      userEl.textContent = `${c.user}@${c.serviceName} (${c.role})${c.useBridge && c.bridgeHost ? ' 🌉 Ponte: ' + c.bridgeHost : ''}${multiText}`;
    }

    // Color band
    const band = document.getElementById('toad-color-band');
    if (band) band.style.backgroundColor = c.color || '#0078d7';

    this.renderHeaderPill();
    this.updateSelectorDropdown();
    this.renderConnectionBar();
    if (window.TracesApp.sqlEditor?.renderTabs) window.TracesApp.sqlEditor.renderTabs();
    this.renderModal();

    try {
      const resp = await fetch('/api/switch-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conn_id: id })
      });
      const data = await resp.json();
      if (data.success && data.connection) {
        if (data.connection.os) {
          window.TracesApp.setServerOs(data.connection.os);
        }
        const dbVerEl = document.getElementById('status-db-version');
        if (dbVerEl) dbVerEl.textContent = `${data.connection.banner || 'Oracle Database'} (${data.connection.mode || 'THICK'})`;
      }
    } catch (err) {
      console.error('Falha ao alternar conexão no backend:', err);
    }

    if (window.TracesApp && typeof window.TracesApp.updateConnectionState === 'function') {
      window.TracesApp.updateConnectionState();
    }

    // Atualizar Schema Browser, Sessions e DBA Hub para a nova conexão ativa
    if (window.TracesApp.schemaBrowser?.loadRealSchemas) window.TracesApp.schemaBrowser.loadRealSchemas();
    if (window.TracesApp.sessionMonitor?.loadRealSessions) window.TracesApp.sessionMonitor.loadRealSessions();
    if (window.TracesApp.databaseProbe?.loadRealProbe) window.TracesApp.databaseProbe.loadRealProbe();

    window.TracesApp.notify(`Banco ativo alterado para: ${c.name} (${c.user}@${c.serviceName} em ${c.host})`, 'info');
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

  renderConnectionBar() {
    if (!this.connectionBarEl) {
      this.connectionBarEl = document.getElementById('toad-connection-bar');
    }
    if (!this.connectionBarEl) return;

    const totalActive = this.activeConnections.size;
    if (totalActive === 0) {
      this.connectionBarEl.innerHTML = `
        <div class="toad-conn-bar-label">
          <span>🔌 Conexões:</span>
        </div>
        <span style="color: #94a3b8; font-size: 10.5px; font-style: italic; margin-right: 8px;">Nenhum banco conectado</span>
        <button class="toad-conn-bar-add" onclick="window.TracesApp.connectionManager.openModal()" title="Abrir Gerenciador de Conexões">
          <span>⚡ Conectar ao Banco de Dados...</span>
        </button>
      `;
      return;
    }

    let html = `
      <div class="toad-conn-bar-label" title="${totalActive} conexão(ões) Oracle simultaneamente ativa(s)">
        <span>🔌 Conexões (${totalActive}):</span>
      </div>
    `;

    this.activeConnections.forEach((entry, connId) => {
      const c = entry.config;
      const isActive = Boolean(this.activeConn && this.activeConn.id === connId);
      const envColor = c.color || '#16a34a';
      const bridgeBadge = (c.useBridge && c.bridgeHost) ? ' 🌉' : '';
      const isCdb = Boolean(entry.cdb?.is_cdb || entry.data?.cdb?.is_cdb || c.isCdb || c.cdb?.is_cdb);
      const isPdbChild = Boolean(entry.cdb?.is_pdb_child || c.is_pdb_child || c.isPdbChild);
      const pdbBadge = isPdbChild ? `<span class="toad-conn-bar-pdb-badge" title="Sessão conectada no Pluggable Database ${c.pdb_name || c.serviceName}">📦 PDB</span>` : '';
      const cdbButton = isCdb ? `
        <button class="toad-conn-bar-pdb-btn" 
                onclick="event.stopPropagation(); window.TracesApp.connectionManager.openPdbChildSessionModal('${connId}');" 
                title="Container Database (CDB) detectado. Clique para abrir uma Sessão Filha em um PDB">
          <span>📦 PDB ▾</span>
        </button>
      ` : '';
      const titleText = `${c.name || 'Oracle'}\nUsuário: ${c.user} (${c.role || 'NORMAL'})\nDestino: ${c.host}:${c.port}/${c.serviceName}${c.useBridge ? '\nPonte: ' + c.bridgeHost : ''}${isCdb ? '\n[Arquitetura: Oracle CDB Multitenant (Container Database)]' : ''}${isPdbChild ? '\n[Sessão Filha no PDB: ' + (c.pdb_name || c.serviceName) + ']' : ''}\nStatus: ${isActive ? 'BANCO ATIVO ATUAL (0ms switch)' : 'Conectado (Clique para alternar sem desconectar)'}`;

      html += `
        <div class="toad-conn-bar-tab ${isActive ? 'active' : ''} ${isCdb ? 'is-cdb' : ''}" 
             onclick="window.TracesApp.connectionManager.switchConnection('${connId}')"
             title="${titleText}">
          <span class="toad-conn-bar-indicator" style="background: ${envColor};"></span>
          <span style="font-weight: ${isActive ? '700' : '600'};">${c.user}@${c.serviceName || 'ORCL'}</span>
          ${pdbBadge}
          <span class="toad-conn-bar-host">(${c.host}${bridgeBadge})</span>
          ${cdbButton}
          <span class="toad-conn-bar-close" 
                onclick="event.stopPropagation(); window.TracesApp.connectionManager.disconnect('${connId}');" 
                title="Desconectar apenas este banco (${c.name})">✕</span>
        </div>
      `;
    });

    html += `
      <button class="toad-conn-bar-add" onclick="window.TracesApp.connectionManager.openNewConnectionModal()" title="Conectar em mais um banco ou host simultaneamente sem desconectar dos outros (estilo TOAD for Oracle)">
        <span>➕ Conectar em Mais um Banco / Host...</span>
      </button>
    `;

    this.connectionBarEl.innerHTML = html;
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

    // Atualiza visibilidade do botão de Sessão Filha PDB na Toolbar
    const activeEntry = this.activeConn ? this.activeConnections.get(this.activeConn.id) : null;
    const isCurrentCdb = Boolean(activeEntry?.cdb?.is_cdb || activeEntry?.data?.cdb?.is_cdb || this.activeConn?.isCdb || this.activeConn?.cdb?.is_cdb);
    const btnCdb = document.getElementById('btn-toolbar-cdb-pdb');
    if (btnCdb) {
      btnCdb.style.display = isCurrentCdb ? 'inline-flex' : 'none';
      if (isCurrentCdb) {
        const pdbs = activeEntry?.cdb?.pdbs || activeEntry?.data?.cdb?.pdbs || [];
        btnCdb.title = `Banco Container (CDB) detectado com ${pdbs.length} PDB(s) disponível(is). Clique para abrir uma Sessão Filha em um PDB.`;
      }
    }

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
    if (window.TracesApp?.dropWorkspace) window.TracesApp.dropWorkspace(targetId);
    if (wasActive) this.activeConn = null;

    if (this.activeConnections.size > 0) {
      if (wasActive) {
        const nextEntry = this.activeConnections.values().next().value;
        if (nextEntry && nextEntry.config) {
          await this.switchConnection(nextEntry.config.id);
        }
      } else {
        this.renderHeaderPill();
        this.updateSelectorDropdown();
        this.renderConnectionBar();
        if (window.TracesApp.sqlEditor?.renderTabs) window.TracesApp.sqlEditor.renderTabs();
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
      this.renderConnectionBar();
      if (window.TracesApp.sqlEditor?.renderTabs) window.TracesApp.sqlEditor.renderTabs();
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
    this.renderConnectionBar();
    if (window.TracesApp.sqlEditor?.renderTabs) window.TracesApp.sqlEditor.renderTabs();
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
          if (item.cdb) {
            profile.cdb = item.cdb;
            profile.isCdb = Boolean(item.cdb.is_cdb);
          }
          this.activeConnections.set(item.id, { config: profile, data: item, cdb: item.cdb });
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
          if (window.TracesApp.dbaTools?.updateConnectionState) {
            window.TracesApp.dbaTools.updateConnectionState(true);
          }
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
        this.renderConnectionBar();
        if (window.TracesApp.sqlEditor?.renderTabs) window.TracesApp.sqlEditor.renderTabs();
      } else {
        this.renderConnectionBar();
      }
    } catch (e) {
      // Offline / startup
      this.renderConnectionBar();
    }
  }

  openCurrentPdbChildSessionModal() {
    if (!this.activeConn) {
      window.TracesApp?.notify('Nenhum banco conectado no momento.', 'warning');
      return;
    }
    this.openPdbChildSessionModal(this.activeConn.id);
  }

  async openPdbChildSessionModal(connId) {
    const entry = this.activeConnections.get(connId);
    if (!entry) {
      window.TracesApp?.notify('Conexão CDB não encontrada entre os bancos ativos.', 'error');
      return;
    }

    const c = entry.config;
    let cdbData = entry.cdb || entry.data?.cdb || { is_cdb: true, con_name: 'CDB$ROOT', con_id: 1, pdbs: [] };

    // Remove existing modal if any
    const existing = document.getElementById('toad-modal-cdb-pdb');
    if (existing) existing.remove();

    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'toad-modal-cdb-pdb';
    modal.className = 'modal-backdrop';
    modal.style.display = 'flex';
    modal.style.zIndex = '99999';

    modal.innerHTML = `
      <div class="modal-dialog" style="width: 650px; max-width: 95vw; background: #ffffff; border-radius: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); border: 1px solid #94a3b8; overflow: hidden; display: flex; flex-direction: column;">
        <!-- Header -->
        <div style="background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%); padding: 10px 14px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">📦</span>
            <span style="font-weight: 700; font-size: 13px; color: #0f172a;">Sessão Filha no PDB (Pluggable Database)</span>
            <span style="background: #10b981; color: #fff; font-size: 9.5px; font-weight: 700; padding: 1px 6px; border-radius: 3px;">CDB DETECTADO</span>
          </div>
          <button class="modal-close-btn" onclick="document.getElementById('toad-modal-cdb-pdb')?.remove();" style="border: none; background: transparent; font-size: 14px; cursor: pointer; color: #64748b;">✕</button>
        </div>

        <!-- Body -->
        <div style="padding: 14px; font-size: 11px; display: flex; flex-direction: column; gap: 12px; max-height: 80vh; overflow-y: auto;">
          <!-- CDB Context Info Banner -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 10px; display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 20px; line-height: 1;">🏛</span>
            <div style="flex: 1;">
              <div style="font-weight: 700; color: #166534; font-size: 12px;">
                Conexão Pai: ${c.name} (${c.user}@${c.serviceName || 'CDB'})
              </div>
              <div style="color: #15803d; font-size: 11px; margin-top: 2px;">
                Container Ativo: <strong>${cdbData.con_name || 'CDB$ROOT'}</strong> (CON_ID: ${cdbData.con_id || 1}) | Host: <code>${c.host}:${c.port}</code>
              </div>
              <div style="color: #475569; font-size: 10.5px; margin-top: 4px;">
                Selecione abaixo o Pluggable Database desejado para criar uma <strong>nova conexão/aba filha</strong> ou alternar o container atual. A sessão filha herdará automaticamente a autenticação e o túnel sem impactar a conexão CDB raiz.
              </div>
            </div>
          </div>

          <!-- PDBs List Container -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: #1e293b;">Pluggable Databases (PDBs) Detectados no Dicionário:</span>
              <button class="btn" style="padding: 2px 7px; font-size: 10px;" onclick="window.TracesApp.connectionManager.refreshPdbList('${connId}')">🔄 Atualizar Lista</button>
            </div>
            
            <div id="pdb-list-container" style="border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; max-height: 220px; overflow-y: auto;">
              ${this.renderPdbListHtml(connId, cdbData.pdbs || [])}
            </div>
          </div>

          <!-- Manual / Custom PDB Input -->
          <div style="border-top: 1px solid #e2e8f0; padding-top: 10px;">
            <div style="font-weight: 700; color: #1e293b; margin-bottom: 4px;">Ou informe o nome do PDB manualmente:</div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="text" id="manual-pdb-name" placeholder="Ex: FREEPDB1, ORCLPDB, PDB1..." style="flex: 1; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: var(--toad-font-code); font-size: 11px; text-transform: uppercase;">
              <button class="btn btn-primary" style="padding: 5px 12px; font-weight: 700;" onclick="const val = document.getElementById('manual-pdb-name')?.value?.trim(); if(val) window.TracesApp.connectionManager.launchPdbChildSession('${connId}', val, false); else alert('Informe o nome do PDB.');">
                ⚡ Abrir Sessão Filha
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 8px 14px; border-top: 1px solid #cbd5e1; display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn" onclick="document.getElementById('toad-modal-cdb-pdb')?.remove();" style="padding: 4px 12px;">Fechar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // If PDB list was empty or needs fresh check, fetch from backend
    if (!cdbData.pdbs || cdbData.pdbs.length === 0) {
      this.refreshPdbList(connId);
    }
  }

  renderPdbListHtml(connId, pdbs) {
    if (!pdbs || pdbs.length === 0) {
      return `
        <div style="padding: 16px; text-align: center; color: #64748b; font-style: italic;">
          Nenhum PDB retornado automaticamente por v$pdbs. Digite o nome do PDB no campo abaixo.
        </div>
      `;
    }

    return `
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
        <thead>
          <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-weight: 700; color: #475569;">
            <th style="padding: 6px 8px; width: 65px;">CON_ID</th>
            <th style="padding: 6px 8px;">Nome do PDB</th>
            <th style="padding: 6px 8px; width: 100px;">Status</th>
            <th style="padding: 6px 8px; width: 75px;">Restrito</th>
            <th style="padding: 6px 8px; text-align: right; width: 220px;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${pdbs.map(p => {
            const isRw = (p.open_mode || '').toUpperCase().includes('WRITE');
            const statusColor = isRw ? '#15803d' : '#b45309';
            const statusBg = isRw ? '#dcfce7' : '#fef3c7';
            return `
              <tr style="border-bottom: 1px solid #f1f5f9;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                <td style="padding: 6px 8px; font-family: var(--toad-font-code); color: #64748b;">${p.con_id != null ? '#' + p.con_id : '-'}</td>
                <td style="padding: 6px 8px; font-weight: 700; color: #0f172a; font-family: var(--toad-font-code);">
                  📦 ${p.name}
                </td>
                <td style="padding: 6px 8px;">
                  <span style="background: ${statusBg}; color: ${statusColor}; font-weight: 700; font-size: 9.5px; padding: 2px 6px; border-radius: 3px;">
                    ${p.open_mode || 'OPEN'}
                  </span>
                </td>
                <td style="padding: 6px 8px; color: ${p.restricted === 'YES' ? '#dc2626' : '#64748b'}; font-weight: ${p.restricted === 'YES' ? '700' : '400'};">
                  ${p.restricted || 'NO'}
                </td>
                <td style="padding: 6px 8px; text-align: right;">
                  <button class="btn btn-primary" style="padding: 2px 8px; font-size: 10px; font-weight: 700; margin-right: 4px;" onclick="window.TracesApp.connectionManager.launchPdbChildSession('${connId}', '${p.name}', false)" title="Abrir como uma nova aba de conexão independente para este PDB">
                    ⚡ Nova Conexão
                  </button>
                  <button class="btn" style="padding: 2px 6px; font-size: 10px;" onclick="window.TracesApp.connectionManager.launchPdbChildSession('${connId}', '${p.name}', true)" title="Executar ALTER SESSION SET CONTAINER nesta mesma sessão">
                    🔄 Alternar
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  async refreshPdbList(connId) {
    const listEl = document.getElementById('pdb-list-container');
    if (listEl) {
      listEl.innerHTML = `<div style="padding: 14px; text-align: center; color: #0284c7;">⏳ Consultando v$pdbs no Oracle Database...</div>`;
    }
    try {
      const resp = await fetch(`/api/cdb/pdbs?conn_id=${encodeURIComponent(connId)}`);
      const data = await resp.json();
      if (data.success && listEl) {
        const entry = this.activeConnections.get(connId);
        if (entry) {
          if (!entry.cdb) entry.cdb = {};
          entry.cdb.pdbs = data.pdbs || [];
          entry.cdb.is_cdb = data.is_cdb;
          entry.cdb.con_name = data.cdb?.con_name || entry.cdb.con_name;
        }
        listEl.innerHTML = this.renderPdbListHtml(connId, data.pdbs || []);
      } else if (listEl) {
        listEl.innerHTML = `<div style="padding: 12px; color: #dc2626; text-align: center;">✕ Erro: ${data.error || 'Falha ao consultar PDBs'}</div>`;
      }
    } catch (e) {
      if (listEl) {
        listEl.innerHTML = `<div style="padding: 12px; color: #dc2626; text-align: center;">✕ Falha de comunicação: ${e.message}</div>`;
      }
    }
  }

  async launchPdbChildSession(parentConnId, pdbName, switchOnly = false) {
    const modal = document.getElementById('toad-modal-cdb-pdb');
    const actionDesc = switchOnly ? `Alternando container para ${pdbName}...` : `Abrindo sessão filha no PDB ${pdbName}...`;
    window.TracesApp?.notify(`⏳ ${actionDesc}`, 'info');

    try {
      const resp = await fetch('/api/cdb/open_child_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conn_id: parentConnId,
          pdb_name: pdbName,
          switch_only: switchOnly
        })
      });
      const data = await resp.json();

      if (!data.success) {
        window.TracesApp?.notify(`Falha ao abrir sessão no PDB: ${data.error}`, 'error');
        alert(`Falha ao abrir sessão no PDB ${pdbName}:\n${data.error}`);
        return;
      }

      if (switchOnly) {
        const parentEntry = this.activeConnections.get(parentConnId);
        if (parentEntry) {
          parentEntry.cdb = data.cdb || { is_cdb: false, is_pdb_child: true, pdb_name: pdbName };
          if (parentEntry.config) {
            parentEntry.config.isCdb = false;
            parentEntry.config.is_pdb_child = true;
            parentEntry.config.pdb_name = pdbName;
            parentEntry.config.serviceName = pdbName;
          }
        }
        this.renderConnectionBar();
        this.updateSelectorDropdown();
        window.TracesApp?.notify(`Container alternado com sucesso para ${pdbName} (ALTER SESSION)!`, 'success');
        modal?.remove();
        return;
      }

      // Adiciona o novo perfil da sessão filha no ConnectionManager
      const childConfig = data.config || {
        id: data.conn_id,
        name: data.name || `PDB: ${pdbName}`,
        host: this.activeConn?.host || 'localhost',
        port: this.activeConn?.port || 1521,
        serviceName: pdbName,
        user: this.activeConn?.user || 'SYSTEM',
        role: this.activeConn?.role || 'NORMAL',
        color: '#8b5cf6',
        isCdb: false,
        isPdbChild: true,
        pdbName: pdbName,
        parentCdbId: parentConnId
      };

      if (!this.connections.some(c => c.id === childConfig.id)) {
        this.connections.push(childConfig);
      }

      this.activeConnections.set(childConfig.id, {
        config: childConfig,
        data: data,
        cdb: data.cdb || { is_cdb: false, is_pdb_child: true, pdb_name: pdbName, parent_cdb_id: parentConnId }
      });

      this.activeConn = childConfig;
      this.renderConnectionBar();
      this.updateSelectorDropdown();

      // Alterna workspace para a nova conexão filha
      if (window.TracesApp?.swapWorkspace) {
        window.TracesApp.swapWorkspace(parentConnId, childConfig.id);
      }
      if (window.TracesApp?.openWindow) {
        window.TracesApp.openWindow('editor');
      }

      modal?.remove();
      window.TracesApp?.notify(`🟢 Sessão filha no PDB '${pdbName}' conectada com sucesso! (${data.latency_ms || 0} ms)`, 'success');
    } catch (err) {
      window.TracesApp?.notify(`Erro ao abrir sessão filha no PDB: ${err.message}`, 'error');
    }
  }

  getActive() {
    return this.activeConn;
  }
}

window.ConnectionManager = ConnectionManager;
