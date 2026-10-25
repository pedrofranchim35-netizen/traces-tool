/* ==========================================================================
   TRACES ORACLE STUDIO - DATABASE INFRASTRUCTURE INVENTORY
   Comprehensive Oracle Catalog: Servers, Hosts, RAC, Data Guard, Environments,
   TCP Ping Connectivity Testing, and 1-Click Connect into Toad.
   ========================================================================== */

class InventoryManager {
  constructor() {
    this.inventory = [];
    this.filterEnv = 'ALL';
    this.searchTerm = '';
    this.selectedItem = null;
    this.pingResults = {}; // { [id]: { online: bool, latency_ms: number, lastCheck: string } }
    this.init();
  }

  async init() {
    await this.loadInventory();
  }

  openModal() {
    this.openInventoryModal();
  }

  async loadInventory() {
    try {
      const resp = await fetch('/api/inventory');
      const data = await resp.json();
      if (data.success && Array.isArray(data.inventory) && data.inventory.length > 0) {
        this.inventory = data.inventory;
      } else {
        // Fallback to localStorage or default
        const local = localStorage.getItem('traces_db_inventory');
        if (local) {
          this.inventory = JSON.parse(local);
        } else {
          this.inventory = this.getDefaultInventory();
          this.saveInventory();
        }
      }
    } catch (e) {
      const local = localStorage.getItem('traces_db_inventory');
      if (local) {
        try { this.inventory = JSON.parse(local); } catch (_) { this.inventory = this.getDefaultInventory(); }
      } else {
        this.inventory = this.getDefaultInventory();
      }
    }
  }

  getDefaultInventory() {
    return [
      {
        id: 'inv-prod-crm',
        name: 'PROD - CRM Core Database',
        host: 'crm-prod.corp.internal',
        port: 1521,
        serviceName: 'crm_prod.corp',
        sid: 'CRM1',
        user: 'SYSTEM',
        environment: 'PROD',
        version: 'Oracle Database 19c Enterprise Edition (19.19 RU)',
        architecture: 'RAC (2 Nodes)',
        os: 'Oracle Linux 8.8 x86_64',
        status: 'ONLINE',
        color: '#ef4444',
        contact: 'dba-team@empresa.com',
        backupStatus: 'RMAN Level 0 Daily 02:00 (Sucesso)',
        autoextend: 'YES',
        storageGb: 2048,
        notes: 'Banco crítico de faturamento e CRM clientes.'
      },
      {
        id: 'inv-prod-dwh',
        name: 'PROD - Data Warehouse & Analytics',
        host: 'dwh-prod.corp.internal',
        port: 1521,
        serviceName: 'dwh_prod.corp',
        sid: 'DWH1',
        user: 'SYSTEM',
        environment: 'PROD',
        version: 'Oracle Database 19c Enterprise Edition (19.20 RU)',
        architecture: 'Exadata X8M',
        os: 'Oracle Linux 8.8',
        status: 'ONLINE',
        color: '#ef4444',
        contact: 'bi-infra@empresa.com',
        backupStatus: 'RMAN Incremental + Archivelog (Sucesso)',
        autoextend: 'YES',
        storageGb: 16384,
        notes: 'Cluster Exadata para relatórios e BI analítico.'
      },
      {
        id: 'inv-dr-standby',
        name: 'DR - Disaster Recovery (Physical Standby)',
        host: 'dr-standby.corp.internal',
        port: 1521,
        serviceName: 'crm_dr.corp',
        sid: 'CRM2',
        user: 'SYS',
        environment: 'DR',
        version: 'Oracle Database 19c Enterprise Edition',
        architecture: 'Data Guard Physical Standby (Real-time Apply)',
        os: 'Oracle Linux 8.8',
        status: 'ONLINE',
        color: '#6366f1',
        contact: 'dba-team@empresa.com',
        backupStatus: 'Data Guard Sync (0s Lag)',
        autoextend: 'YES',
        storageGb: 2048,
        notes: 'Replicação ativa Data Guard em datacenter secundário.'
      },
      {
        id: 'inv-uat-erp',
        name: 'UAT - ERP Staging & Homologação',
        host: 'erp-stage.corp.internal',
        port: 1521,
        serviceName: 'erp_stage.corp',
        sid: 'ERPSTAGE',
        user: 'SYSTEM',
        environment: 'UAT',
        version: 'Oracle Database 21c Enterprise Edition',
        architecture: 'Single Instance ASM',
        os: 'Red Hat Enterprise Linux 8.6',
        status: 'ONLINE',
        color: '#f59e0b',
        contact: 'homolog-support@empresa.com',
        backupStatus: 'RMAN Weekly Full + Export DP',
        autoextend: 'YES',
        storageGb: 1024,
        notes: 'Ambiente de homologação integrado com ERP SAP/Totvs.'
      },
      {
        id: 'inv-dev-23ai',
        name: 'DEV - Oracle Database 23ai Innovation',
        host: 'localhost',
        port: 1521,
        serviceName: 'freepdb1',
        sid: 'FREE',
        user: 'SYSTEM',
        environment: 'DEV',
        version: 'Oracle Database 23ai Free (23.4)',
        architecture: 'Multitenant (CDB/PDB)',
        os: 'Oracle Linux 9.2',
        status: 'ONLINE',
        color: '#10b981',
        contact: 'devs@empresa.com',
        backupStatus: 'Cold Backup Local',
        autoextend: 'YES',
        storageGb: 512,
        notes: 'Instância moderna 23ai com suporte a vetores e JSON relacional.'
      }
    ];
  }

  async saveInventory() {
    localStorage.setItem('traces_db_inventory', JSON.stringify(this.inventory));
    try {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: this.inventory })
      });
    } catch (_) {}
  }

  openInventoryModal() {
    let modal = document.getElementById('modal-database-inventory');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-database-inventory';
      modal.className = 'toad-modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="toad-modal-dialog" style="max-width: 1100px; width: 94%; height: 86vh; display: flex; flex-direction: column;">
        <div class="toad-modal-header" style="background: linear-gradient(135deg, #1e293b, #0f172a); color: #fff; padding: 10px 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">📋</span>
            <span style="font-weight: 700; font-size: 13px;">Catálogo &amp; Inventário de Infraestrutura Oracle (Database Inventory)</span>
            <span class="status-indicator valid" style="font-size: 10px;">${this.inventory.length} ALVOS</span>
          </div>
          <span class="toad-modal-close" style="color: #cbd5e1; cursor: pointer; font-size: 18px;" onclick="document.getElementById('modal-database-inventory').classList.remove('open')">✕</span>
        </div>

        <!-- Toolbar -->
        <div style="background: #f1f5f9; padding: 8px 12px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="position: relative;">
              <span style="position: absolute; left: 7px; top: 5px; font-size: 11px; color: #64748b;">🔍</span>
              <input type="text" id="inv-search-input" placeholder="Filtrar por nome, host, SID..." 
                     value="${this.searchTerm}" 
                     style="padding: 3px 8px 3px 24px; border: 1px solid #cbd5e1; border-radius: 3px; font-size: 11px; width: 220px;"
                     oninput="window.TracesApp.inventoryManager.onSearch(this.value)">
            </div>

            <label style="font-size: 11px; font-weight: 600; color: #475569;">Ambiente:</label>
            <select class="toad-conn-combobox" id="inv-env-filter" style="height: 24px; font-size: 11px;" onchange="window.TracesApp.inventoryManager.onFilterEnv(this.value)">
              <option value="ALL" ${this.filterEnv === 'ALL' ? 'selected' : ''}>Todos os Ambientes</option>
              <option value="PROD" ${this.filterEnv === 'PROD' ? 'selected' : ''}>🔴 Produção (PROD)</option>
              <option value="DR" ${this.filterEnv === 'DR' ? 'selected' : ''}>🟣 Disaster Recovery (DR)</option>
              <option value="UAT" ${this.filterEnv === 'UAT' ? 'selected' : ''}>🟡 Homologação (UAT)</option>
              <option value="DEV" ${this.filterEnv === 'DEV' ? 'selected' : ''}>🟢 Desenvolvimento (DEV)</option>
            </select>

            <button class="btn" style="font-size: 11px; padding: 3px 8px;" onclick="window.TracesApp.inventoryManager.pingAllTargets()">
              ⚡ Ping em Todos
            </button>
          </div>

          <div style="display: flex; gap: 6px;">
            <button class="btn btn-primary" style="font-size: 11px; padding: 4px 10px; font-weight: 700;" onclick="window.TracesApp.inventoryManager.openAddTargetModal()">
              ➕ Adicionar Banco
            </button>
            <button class="btn" style="font-size: 11px; padding: 4px 8px;" onclick="window.TracesApp.inventoryManager.exportInventoryJson()">
              📥 Exportar JSON
            </button>
            <button class="btn" style="font-size: 11px; padding: 4px 8px;" onclick="window.TracesApp.inventoryManager.exportInventoryCsv()">
              📊 Exportar CSV
            </button>
            <button class="btn" style="font-size: 11px; padding: 4px 8px;" onclick="window.TracesApp.inventoryManager.importInventoryPrompt()">
              📤 Importar
            </button>
          </div>
        </div>

        <!-- Inventory Master Table -->
        <div style="flex: 1; overflow: auto; background: #fff;" id="inv-table-container">
          ${this.renderInventoryTableHtml()}
        </div>

        <!-- Footer -->
        <div style="padding: 8px 14px; background: #f8fafc; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; color: #64748b;">
            💡 Dica: Clique no botão <strong style="color: #0284c7;">⚡ Conectar</strong> para alternar imediatamente a sessão ativa do Toad para o banco desejado.
          </div>
          <button class="btn" onclick="document.getElementById('modal-database-inventory').classList.remove('open')">Fechar</button>
        </div>
      </div>
    `;

    modal.classList.add('open');
  }

  getFilteredInventory() {
    return this.inventory.filter(item => {
      if (this.filterEnv !== 'ALL' && item.environment !== this.filterEnv) {
        return false;
      }
      if (this.searchTerm) {
        const s = this.searchTerm.toLowerCase();
        const m1 = (item.name || '').toLowerCase().includes(s);
        const m2 = (item.host || '').toLowerCase().includes(s);
        const m3 = (item.serviceName || '').toLowerCase().includes(s);
        const m4 = (item.sid || '').toLowerCase().includes(s);
        const m5 = (item.architecture || '').toLowerCase().includes(s);
        return m1 || m2 || m3 || m4 || m5;
      }
      return true;
    });
  }

  renderInventoryTableHtml() {
    const list = this.getFilteredInventory();
    if (list.length === 0) {
      return `
        <div style="padding: 40px; text-align: center; color: #64748b; font-size: 12px;">
          Nenhum banco de dados encontrado para o filtro atual.
        </div>
      `;
    }

    return `
      <table class="meta-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 6px 8px; width: 60px; text-align: center;">Ambiente</th>
            <th style="padding: 6px 8px; min-width: 180px;">Identificação do Banco</th>
            <th style="padding: 6px 8px; min-width: 130px;">Host &amp; Porta</th>
            <th style="padding: 6px 8px; min-width: 130px;">Service Name / SID</th>
            <th style="padding: 6px 8px; min-width: 140px;">Versão &amp; Arquitetura</th>
            <th style="padding: 6px 8px; min-width: 110px;">Sistema Operacional</th>
            <th style="padding: 6px 8px; width: 90px; text-align: center;">Status / Ping</th>
            <th style="padding: 6px 8px; min-width: 140px;">Backup (RMAN)</th>
            <th style="padding: 6px 8px; width: 140px; text-align: right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(item => {
            const p = this.pingResults[item.id];
            let pingHtml = `<span style="color: #94a3b8; font-size: 10px;">--</span>`;
            if (p) {
              if (p.online) {
                pingHtml = `<span style="color: #16a34a; font-weight: 700; font-size: 10px;">🟢 Online (${p.latency_ms}ms)</span>`;
              } else {
                pingHtml = `<span style="color: #dc2626; font-weight: 700; font-size: 10px;" title="${p.error || 'Erro'}">🔴 Inacessível</span>`;
              }
            }

            const envColor = item.environment === 'PROD' ? '#ef4444' : (item.environment === 'DR' ? '#6366f1' : (item.environment === 'UAT' ? '#f59e0b' : '#10b981'));

            return `
              <tr style="border-bottom: 1px solid #e2e8f0; hover: background: #f8fafc;">
                <td style="text-align: center; padding: 6px 8px;">
                  <span style="background: ${envColor}; color: #fff; padding: 2px 6px; border-radius: 3px; font-weight: 700; font-size: 9.5px;">
                    ${item.environment}
                  </span>
                </td>
                <td style="padding: 6px 8px;">
                  <div style="font-weight: 700; color: #0f172a; font-size: 11.5px;">${item.name}</div>
                  <div style="color: #64748b; font-size: 10px;">${item.notes || ''}</div>
                </td>
                <td style="padding: 6px 8px; font-family: var(--font-code); color: #334155;">
                  ${item.host}:${item.port}
                </td>
                <td style="padding: 6px 8px; font-family: var(--font-code); color: #0284c7; font-weight: 600;">
                  ${item.serviceName || item.sid}
                </td>
                <td style="padding: 6px 8px;">
                  <div style="font-weight: 600; color: #334155;">${item.version}</div>
                  <div style="color: #64748b; font-size: 10px;">${item.architecture || 'Single Instance'}</div>
                </td>
                <td style="padding: 6px 8px; color: #475569;">
                  ${item.os || 'Linux'}
                </td>
                <td style="text-align: center; padding: 6px 8px;">
                  ${pingHtml}
                </td>
                <td style="padding: 6px 8px; font-size: 10.5px; color: #166534;">
                  🛡️ ${item.backupStatus || 'Configurado'}
                </td>
                <td style="text-align: right; padding: 6px 8px; white-space: nowrap;">
                  <button class="btn btn-primary" style="padding: 2px 7px; font-size: 10px; font-weight: 700;" title="Conectar neste banco no Toad" onclick="window.TracesApp.inventoryManager.connectToTarget('${item.id}')">
                    ⚡ Conectar
                  </button>
                  <button class="btn" style="padding: 2px 6px; font-size: 10px;" title="Testar ping TCP" onclick="window.TracesApp.inventoryManager.pingSingleTarget('${item.id}')">
                    📡 Ping
                  </button>
                  <button class="btn" style="padding: 2px 5px; font-size: 10px;" title="Editar dados" onclick="window.TracesApp.inventoryManager.openEditTargetModal('${item.id}')">
                    ✏️
                  </button>
                  <button class="btn btn-danger" style="padding: 2px 5px; font-size: 10px;" title="Remover" onclick="window.TracesApp.inventoryManager.deleteTarget('${item.id}')">
                    🗑️
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  onSearch(val) {
    this.searchTerm = val;
    this.refreshTable();
  }

  onFilterEnv(val) {
    this.filterEnv = val;
    this.refreshTable();
  }

  refreshTable() {
    const el = document.getElementById('inv-table-container');
    if (el) el.innerHTML = this.renderInventoryTableHtml();
  }

  async pingSingleTarget(id) {
    const item = this.inventory.find(i => i.id === id);
    if (!item) return;
    try {
      const resp = await fetch(`/api/inventory/ping?host=${encodeURIComponent(item.host)}&port=${encodeURIComponent(item.port)}`);
      const res = await resp.json();
      this.pingResults[id] = {
        online: res.online,
        latency_ms: res.latency_ms || 0,
        error: res.error || '',
        lastCheck: new Date().toLocaleTimeString()
      };
    } catch (e) {
      this.pingResults[id] = { online: false, error: e.message, lastCheck: new Date().toLocaleTimeString() };
    }
    this.refreshTable();
  }

  async pingAllTargets() {
    window.TracesApp?.notify('Executando ping TCP e teste de listener em todos os bancos do inventário...', 'info');
    const promises = this.inventory.map(item => this.pingSingleTarget(item.id));
    await Promise.all(promises);
    window.TracesApp?.notify('Ping do inventário concluído!', 'success');
  }

  connectToTarget(id) {
    const item = this.inventory.find(i => i.id === id);
    if (!item) return;

    // Conectar via connectionManager do Toad
    const connMgr = window.TracesApp?.connectionManager;
    if (connMgr) {
      document.getElementById('modal-database-inventory')?.classList.remove('open');
      connMgr.connectToProfile({
        name: item.name,
        user: item.user || 'SYSTEM',
        host: item.host,
        port: item.port,
        serviceName: item.serviceName,
        sid: item.sid,
        color: item.color,
        environment: item.environment
      });
      window.TracesApp?.notify(`Iniciando sessão do Toad conectando a: ${item.name}`, 'info');
    }
  }

  openAddTargetModal() {
    this.openEditTargetModal(null);
  }

  openEditTargetModal(id) {
    const item = id ? this.inventory.find(i => i.id === id) : {
      id: 'inv-' + Date.now(),
      name: '',
      host: 'localhost',
      port: 1521,
      serviceName: 'orcl',
      sid: '',
      user: 'SYSTEM',
      environment: 'DEV',
      version: 'Oracle Database 19c',
      architecture: 'Single Instance',
      os: 'Oracle Linux',
      status: 'ONLINE',
      color: '#10b981',
      contact: '',
      backupStatus: 'RMAN Daily',
      notes: ''
    };

    let modal = document.getElementById('modal-inv-edit-target');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-inv-edit-target';
      modal.className = 'toad-modal';
      document.body.appendChild(modal);
    }

    const isNew = !id;

    modal.innerHTML = `
      <div class="toad-modal-dialog" style="max-width: 580px; width: 92%;">
        <div class="toad-modal-header" style="background: #0078d7; color: #fff;">
          <span style="font-weight: 700; font-size: 13px;">${isNew ? '➕ Novo Banco no Inventário' : '✏️ Editar Dados do Banco'}</span>
          <span class="toad-modal-close" onclick="document.getElementById('modal-inv-edit-target').classList.remove('open')">×</span>
        </div>
        <div class="modal-body" style="padding: 14px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; gap: 10px;">
            <div style="flex: 2;">
              <label style="font-size: 11px; font-weight: 600;">Nome do Banco / Aplicação:</label>
              <input type="text" id="target-name" value="${item.name}" placeholder="Ex: PROD - Financeiro ERP" style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; font-size: 11px;">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 11px; font-weight: 600;">Ambiente:</label>
              <select class="toad-conn-combobox" id="target-env" style="width: 100%; height: 26px;">
                <option value="PROD" ${item.environment === 'PROD' ? 'selected' : ''}>🔴 Produção (PROD)</option>
                <option value="DR" ${item.environment === 'DR' ? 'selected' : ''}>🟣 Disaster Recovery (DR)</option>
                <option value="UAT" ${item.environment === 'UAT' ? 'selected' : ''}>🟡 Homologação (UAT)</option>
                <option value="DEV" ${item.environment === 'DEV' ? 'selected' : ''}>🟢 Desenvolvimento (DEV)</option>
              </select>
            </div>
          </div>

          <div style="display: flex; gap: 10px;">
            <div style="flex: 2;">
              <label style="font-size: 11px; font-weight: 600;">Host / IP:</label>
              <input type="text" id="target-host" value="${item.host}" placeholder="oracle.db.corp ou localhost" style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; font-size: 11px; font-family: var(--font-code);">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 11px; font-weight: 600;">Porta:</label>
              <input type="number" id="target-port" value="${item.port}" style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; font-size: 11px; font-family: var(--font-code);">
            </div>
          </div>

          <div style="display: flex; gap: 10px;">
            <div style="flex: 1;">
              <label style="font-size: 11px; font-weight: 600;">Service Name:</label>
              <input type="text" id="target-service" value="${item.serviceName || ''}" placeholder="orcl.corp" style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; font-size: 11px; font-family: var(--font-code);">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 11px; font-weight: 600;">SID (Opcional):</label>
              <input type="text" id="target-sid" value="${item.sid || ''}" placeholder="ORCL" style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; font-size: 11px; font-family: var(--font-code);">
            </div>
          </div>

          <div style="display: flex; gap: 10px;">
            <div style="flex: 1;">
              <label style="font-size: 11px; font-weight: 600;">Versão Oracle:</label>
              <input type="text" id="target-ver" value="${item.version}" placeholder="Oracle Database 19c Enterprise" style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; font-size: 11px;">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 11px; font-weight: 600;">Arquitetura:</label>
              <input type="text" id="target-arch" value="${item.architecture}" placeholder="RAC / Data Guard / Single" style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; font-size: 11px;">
            </div>
          </div>

          <div style="display: flex; gap: 10px;">
            <div style="flex: 1;">
              <label style="font-size: 11px; font-weight: 600;">Sistema Operacional:</label>
              <input type="text" id="target-os" value="${item.os}" placeholder="Oracle Linux 8.8 / AIX / Windows" style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; font-size: 11px;">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 11px; font-weight: 600;">Status do Backup:</label>
              <input type="text" id="target-backup" value="${item.backupStatus || ''}" placeholder="RMAN Level 0 Daily 02:00" style="width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; font-size: 11px;">
            </div>
          </div>

          <div>
            <label style="font-size: 11px; font-weight: 600;">Observações / Responsável:</label>
            <textarea id="target-notes" style="width: 100%; height: 50px; padding: 4px 8px; border: 1px solid #cbd5e1; font-size: 11px;">${item.notes || ''}</textarea>
          </div>
        </div>
        <div class="modal-footer" style="padding: 10px 14px; background: #f1f5f9; border-top: 1px solid #cbd5e1; display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn" onclick="document.getElementById('modal-inv-edit-target').classList.remove('open')">Cancelar</button>
          <button class="btn btn-primary" style="font-weight: 700;" onclick="window.TracesApp.inventoryManager.saveTargetFromModal('${item.id}')">💾 Salvar Alvo</button>
        </div>
      </div>
    `;

    modal.classList.add('open');
  }

  saveTargetFromModal(id) {
    const name = document.getElementById('target-name').value.trim();
    if (!name) {
      window.TracesApp?.notify('O nome do banco é obrigatório.', 'error');
      return;
    }

    const host = document.getElementById('target-host').value.trim();
    const port = parseInt(document.getElementById('target-port').value || '1521');
    const serviceName = document.getElementById('target-service').value.trim();
    const sid = document.getElementById('target-sid').value.trim();
    const env = document.getElementById('target-env').value;
    const version = document.getElementById('target-ver').value.trim();
    const arch = document.getElementById('target-arch').value.trim();
    const os = document.getElementById('target-os').value.trim();
    const backup = document.getElementById('target-backup').value.trim();
    const notes = document.getElementById('target-notes').value.trim();

    const existingIdx = this.inventory.findIndex(i => i.id === id);
    const targetObj = {
      id: id || 'inv-' + Date.now(),
      name,
      host,
      port,
      serviceName,
      sid,
      environment: env,
      version: version || 'Oracle Database 19c',
      architecture: arch || 'Single Instance',
      os: os || 'Linux',
      backupStatus: backup || 'RMAN Configurado',
      notes,
      color: env === 'PROD' ? '#ef4444' : (env === 'DR' ? '#6366f1' : (env === 'UAT' ? '#f59e0b' : '#10b981'))
    };

    if (existingIdx >= 0) {
      this.inventory[existingIdx] = targetObj;
    } else {
      this.inventory.push(targetObj);
    }

    this.saveInventory();
    document.getElementById('modal-inv-edit-target')?.classList.remove('open');
    this.refreshTable();
    window.TracesApp?.notify(`Banco "${name}" salvo no inventário com sucesso.`, 'success');
  }

  deleteTarget(id) {
    const item = this.inventory.find(i => i.id === id);
    if (!item) return;
    if (confirm(`Deseja remover "${item.name}" do inventário de infraestrutura?`)) {
      this.inventory = this.inventory.filter(i => i.id !== id);
      this.saveInventory();
      this.refreshTable();
      window.TracesApp?.notify(`Banco "${item.name}" removido do inventário.`, 'info');
    }
  }

  exportInventoryJson() {
    const str = JSON.stringify(this.inventory, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `oracle_inventory_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.TracesApp?.notify('Inventário exportado em formato JSON.', 'success');
  }

  exportInventoryCsv() {
    const headers = ['Ambiente', 'Nome', 'Host', 'Porta', 'Service Name', 'SID', 'Versão', 'Arquitetura', 'S.O.', 'Backup', 'Observações'];
    const rows = this.inventory.map(i => [
      i.environment,
      `"${(i.name || '').replace(/"/g, '""')}"`,
      i.host,
      i.port,
      i.serviceName || '',
      i.sid || '',
      `"${(i.version || '').replace(/"/g, '""')}"`,
      `"${(i.architecture || '').replace(/"/g, '""')}"`,
      `"${(i.os || '').replace(/"/g, '""')}"`,
      `"${(i.backupStatus || '').replace(/"/g, '""')}"`,
      `"${(i.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `oracle_inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.TracesApp?.notify('Inventário exportado em formato CSV.', 'success');
  }

  importInventoryPrompt() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const content = re.target.result;
          if (file.name.endsWith('.json')) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              this.inventory = parsed;
              this.saveInventory();
              this.refreshTable();
              window.TracesApp?.notify(`${parsed.length} bancos importados no inventário!`, 'success');
            }
          }
        } catch (err) {
          window.TracesApp?.notify(`Erro ao importar arquivo: ${err.message}`, 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
}

window.InventoryManager = InventoryManager;
