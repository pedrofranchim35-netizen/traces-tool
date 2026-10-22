/* ==========================================================================
   SESSION BROWSER & INSTANCE MONITOR COMPONENT - TOAD FOR ORACLE 1:1
   Implements all 12 native Toad filters (TOAD_SESSBROWFILTERS.INI),
   resizable & collapsible panels (Gauges, Lock Tree, Detail Inspector, OS Cmd),
   side-by-side / stacked layout rotation, customizable & resizable columns,
   live V$SESSION, V$SQL, V$OPEN_CURSOR, V$SESSION_LONGOPS, V$SESSION_WAIT,
   V$LOCKED_OBJECT, V$SESS_IO, and ALTER SYSTEM KILL SESSION.
   ========================================================================== */

class SessionMonitor {
  constructor() {
    this.sessions = window.TRACES_DB ? window.TRACES_DB.sessions : [];
    this.locks = [];
    this.metrics = window.TRACES_DB ? window.TRACES_DB.instanceMetrics : {
      bufferCacheHitRatio: 99.4,
      libraryCacheHitRatio: 99.8,
      activeSessionsCount: 1,
      totalSessionsCount: 15,
      blockingSessionsCount: 0
    };
    this.selectedSid = null;
    this.selectedSerial = null;
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.hideBackground = false;
    this.autoRefreshInterval = 10;
    this.isAutoRefreshPaused = false;
    this.isFetchingSessions = false;
    this.lastRefreshTime = 0;
    this.autoRefreshTimer = null;
    this.currentDetailTab = 'sql';
    this.sessionDetails = null;

    // Panel visibility & layout state (Toad Docking)
    this.panelVisible = {
      gauges: true,
      locks: true,
      detail: true,
      oscmd: true
    };
    this.sideBySide = false;
    this.isDetailMaximized = false;

    // Sorting & Column customization
    this.sortCol = 'status';
    this.sortDir = 'asc';
    this.colWidths = {};
    this.columns = [
      { key: 'sid', label: 'SID', visible: true, width: 58, align: 'left' },
      { key: 'serial', label: 'Serial#', visible: true, width: 64, align: 'left' },
      { key: 'status', label: 'Status', visible: true, width: 82, align: 'left' },
      { key: 'username', label: 'Username', visible: true, width: 115, align: 'left' },
      { key: 'osuser', label: 'OS User', visible: true, width: 95, align: 'left' },
      { key: 'machine', label: 'Machine', visible: true, width: 135, align: 'left' },
      { key: 'program', label: 'Program', visible: true, width: 155, align: 'left' },
      { key: 'module', label: 'Module', visible: true, width: 130, align: 'left' },
      { key: 'action', label: 'Action', visible: false, width: 110, align: 'left' },
      { key: 'spid', label: 'SPID', visible: true, width: 68, align: 'left' },
      { key: 'sqlId', label: 'SQL ID', visible: true, width: 108, align: 'left' },
      { key: 'waitClass', label: 'Wait Class', visible: false, width: 95, align: 'left' },
      { key: 'event', label: 'Wait Event', visible: true, width: 195, align: 'left' },
      { key: 'lastCallEt', label: 'Last Call (s)', visible: true, width: 86, align: 'right' },
      { key: 'logonTime', label: 'Logon Time', visible: true, width: 135, align: 'left' },
      { key: 'pgaMb', label: 'PGA Memory', visible: true, width: 90, align: 'right' },
      { key: 'physicalReads', label: 'Phys Reads', visible: false, width: 90, align: 'right' },
      { key: 'blockChanges', label: 'Block Chg', visible: false, width: 85, align: 'right' },
      { key: 'server', label: 'Server', visible: false, width: 85, align: 'left' },
      { key: 'locks', label: 'Locks / Contention', visible: true, width: 130, align: 'left' }
    ];

    this.initElements();
    this.bindEvents();
    this.initSessionSplitters();
    this.render();
    this.setupAutoRefresh();
  }

  initElements() {
    this.tableHead = document.getElementById('session-table-head');
    this.tableBody = document.getElementById('session-table-body');
    this.lockTreeContent = document.getElementById('lock-tree-content');
    this.detailPane = document.getElementById('session-detail-inspector');
    this.filterSelect = document.getElementById('session-native-filter-select');
    this.autoRefreshSelect = document.getElementById('session-autorefresh-select');
    this.bodySplit = document.getElementById('session-body-split');
    this.mainStack = document.getElementById('session-main-stack');
    this.locksPane = document.getElementById('session-locks-pane');
    this.locksSplitter = document.getElementById('splitter-session-locks');
    this.detailSplitter = document.getElementById('splitter-session-detail');
    this.gaugesStrip = document.getElementById('session-gauges-strip');
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('session-column-chooser-menu');
      const btn = document.getElementById('btn-sess-col-chooser');
      if (menu && menu.style.display === 'flex' && !menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
        menu.style.display = 'none';
      }
    });
  }

  initSessionSplitters() {
    // 1. Splitter between Sessions Table and Lock Tree
    if (this.locksSplitter && this.locksPane) {
      let draggingLocks = false;
      let startY = 0;
      let startH = 0;

      this.locksSplitter.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        if (!this.panelVisible.locks) {
          this.togglePanel('locks');
        }
        draggingLocks = true;
        startY = e.clientY;
        startH = this.locksPane.offsetHeight;
        this.locksSplitter.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
      });

      window.addEventListener('mousemove', (e) => {
        if (!draggingLocks) return;
        const dy = startY - e.clientY;
        const maxH = Math.max(120, (this.mainStack?.offsetHeight || 500) - 90);
        const newH = Math.max(48, Math.min(maxH, startH + dy));
        this.locksPane.style.height = `${newH}px`;
      });

      window.addEventListener('mouseup', () => {
        if (draggingLocks) {
          draggingLocks = false;
          this.locksSplitter.classList.remove('dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }

    // 2. Main Splitter between Sessions Stack and Detail Inspector (supports both Horizontal & Vertical Side-by-Side)
    if (this.detailSplitter && this.detailPane) {
      let draggingDetail = false;
      let startPos = 0;
      let startSize = 0;

      this.detailSplitter.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        if (!this.panelVisible.detail) {
          this.togglePanel('detail');
        }
        draggingDetail = true;
        this.isDetailMaximized = false;
        if (this.sideBySide) {
          startPos = e.clientX;
          startSize = this.detailPane.offsetWidth;
          document.body.style.cursor = 'col-resize';
        } else {
          startPos = e.clientY;
          startSize = this.detailPane.offsetHeight;
          document.body.style.cursor = 'row-resize';
        }
        this.detailSplitter.classList.add('dragging');
        document.body.style.userSelect = 'none';
      });

      window.addEventListener('mousemove', (e) => {
        if (!draggingDetail) return;
        const containerRect = this.bodySplit ? this.bodySplit.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight - 160 };
        if (this.sideBySide) {
          const dx = startPos - e.clientX;
          const maxW = Math.max(260, containerRect.width - 260);
          const newW = Math.max(220, Math.min(maxW, startSize + dx));
          this.detailPane.style.width = `${newW}px`;
        } else {
          const dy = startPos - e.clientY;
          const maxH = Math.max(180, containerRect.height - 95);
          const newH = Math.max(95, Math.min(maxH, startSize + dy));
          this.detailPane.style.height = `${newH}px`;
        }
      });

      window.addEventListener('mouseup', () => {
        if (draggingDetail) {
          draggingDetail = false;
          this.detailSplitter.classList.remove('dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }
  }

  togglePanel(panelKey) {
    if (!(panelKey in this.panelVisible)) return;
    this.panelVisible[panelKey] = !this.panelVisible[panelKey];
    this.applyPanelVisibility();
  }

  applyPanelVisibility() {
    // 1. Gauges Strip
    if (this.gaugesStrip) {
      this.gaugesStrip.style.display = this.panelVisible.gauges ? 'flex' : 'none';
    }
    const btnGauges = document.getElementById('btn-toggle-sess-gauges');
    if (btnGauges) btnGauges.classList.toggle('active', this.panelVisible.gauges);

    // 2. Lock Tree Panel
    if (this.locksPane) {
      this.locksPane.style.display = this.panelVisible.locks ? 'flex' : 'none';
    }
    if (this.locksSplitter) {
      this.locksSplitter.style.display = this.panelVisible.locks ? 'flex' : 'none';
    }
    const btnLocks = document.getElementById('btn-toggle-sess-locks');
    if (btnLocks) btnLocks.classList.toggle('active', this.panelVisible.locks);

    // 3. Session Detail Inspector
    if (this.detailPane) {
      this.detailPane.style.display = this.panelVisible.detail ? 'flex' : 'none';
    }
    const btnDetail = document.getElementById('btn-toggle-sess-detail');
    if (btnDetail) btnDetail.classList.toggle('active', this.panelVisible.detail);

    const splitHideBtn = document.getElementById('btn-splitter-hide-detail');
    if (splitHideBtn) {
      splitHideBtn.textContent = this.panelVisible.detail ? '▼ Ocultar Detalhes' : '▲ Mostrar Detalhes';
    }

    // 4. OS Command Box inside Detail Inspector
    const btnOsCmd = document.getElementById('btn-toggle-sess-oscmd');
    if (btnOsCmd) btnOsCmd.classList.toggle('active', this.panelVisible.oscmd);
    const osBanner = document.getElementById('session-os-cmd-banner');
    if (osBanner) {
      osBanner.style.display = this.panelVisible.oscmd ? 'block' : 'none';
    }
  }

  toggleOrientation() {
    this.sideBySide = !this.sideBySide;
    if (this.bodySplit) {
      this.bodySplit.classList.toggle('side-by-side', this.sideBySide);
    }
    const btnOrient = document.getElementById('btn-toggle-sess-orient');
    if (btnOrient) {
      btnOrient.classList.toggle('active', this.sideBySide);
      btnOrient.innerHTML = this.sideBySide ? '⬍ Empilhado' : '⬌ Lado a Lado';
    }
    if (this.detailPane) {
      if (this.sideBySide) {
        this.detailPane.style.width = '520px';
        this.detailPane.style.height = '100%';
      } else {
        this.detailPane.style.width = '100%';
        this.detailPane.style.height = '290px';
      }
    }
  }

  setLocksHeight(px) {
    if (!this.panelVisible.locks) {
      this.panelVisible.locks = true;
      this.applyPanelVisibility();
    }
    if (this.locksPane) {
      this.locksPane.style.height = `${px}px`;
    }
  }

  maximizeDetailPane() {
    if (!this.panelVisible.detail) {
      this.panelVisible.detail = true;
      this.applyPanelVisibility();
    }
    if (!this.detailPane || !this.bodySplit) return;
    const rect = this.bodySplit.getBoundingClientRect();
    if (this.isDetailMaximized) {
      this.resetSplitSizes();
      return;
    }
    this.isDetailMaximized = true;
    if (this.sideBySide) {
      this.detailPane.style.width = `${Math.max(420, Math.round(rect.width * 0.68))}px`;
    } else {
      this.detailPane.style.height = `${Math.max(300, Math.round(rect.height * 0.72))}px`;
    }
  }

  resetSplitSizes() {
    this.isDetailMaximized = false;
    this.panelVisible.detail = true;
    this.applyPanelVisibility();
    if (this.locksPane) {
      this.locksPane.style.height = '120px';
    }
    if (this.detailPane) {
      if (this.sideBySide) {
        this.detailPane.style.width = '520px';
        this.detailPane.style.height = '100%';
      } else {
        this.detailPane.style.width = '100%';
        this.detailPane.style.height = '290px';
      }
    }
  }

  setSearchQuery(val) {
    this.searchQuery = (val || '').trim().toLowerCase();
    const clearBtn = document.getElementById('session-search-clear');
    if (clearBtn) clearBtn.style.display = this.searchQuery ? 'block' : 'none';
    this.renderTable();
  }

  toggleHideBackground(checked) {
    this.hideBackground = !!checked;
    this.renderTable();
  }

  toggleColumnMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('session-column-chooser-menu');
    if (!menu) return;
    if (menu.style.display === 'flex') {
      menu.style.display = 'none';
      return;
    }
    this.renderColumnMenu();
    menu.style.display = 'flex';
  }

  renderColumnMenu() {
    const menu = document.getElementById('session-column-chooser-menu');
    if (!menu) return;
    menu.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; margin-bottom: 4px;">
        <strong style="font-size: 11px; color: #0f172a;">Colunas da Sessão</strong>
        <div style="display: flex; gap: 4px;">
          <button type="button" class="btn" style="height: 20px; padding: 0 6px; font-size: 9.5px;" onclick="window.TracesApp.sessionMonitor.setAllColumnsVisible(true)">Todas</button>
          <button type="button" class="btn" style="height: 20px; padding: 0 6px; font-size: 9.5px;" onclick="window.TracesApp.sessionMonitor.resetDefaultColumns()">Padrão</button>
        </div>
      </div>
      ${this.columns.map(col => `
        <label class="session-col-item">
          <input type="checkbox" ${col.visible ? 'checked' : ''} onchange="window.TracesApp.sessionMonitor.toggleColumnVisibility('${col.key}', this.checked)">
          <span>${col.label}</span>
        </label>
      `).join('')}
    `;
  }

  toggleColumnVisibility(colKey, visible) {
    const col = this.columns.find(c => c.key === colKey);
    if (col) {
      col.visible = !!visible;
      this.renderTable();
    }
  }

  setAllColumnsVisible(visible) {
    this.columns.forEach(c => {
      c.visible = visible || c.key === 'sid' || c.key === 'username';
    });
    this.renderColumnMenu();
    this.renderTable();
  }

  resetDefaultColumns() {
    const defaults = new Set(['sid', 'serial', 'status', 'username', 'osuser', 'machine', 'program', 'module', 'spid', 'sqlId', 'event', 'lastCallEt', 'logonTime', 'pgaMb', 'locks']);
    this.columns.forEach(c => {
      c.visible = defaults.has(c.key);
    });
    this.colWidths = {};
    this.renderColumnMenu();
    this.renderTable();
  }

  sortByColumn(colKey) {
    if (this.sortCol === colKey) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortCol = colKey;
      this.sortDir = 'asc';
    }
    this.renderTable();
  }

  startColumnResize(e, colKey) {
    e.stopPropagation();
    e.preventDefault();
    const th = e.target.closest('th');
    if (!th) return;
    const startX = e.clientX;
    const startW = th.offsetWidth;
    const resizer = e.target;
    resizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (moveEv) => {
      const newW = Math.max(42, startW + (moveEv.clientX - startX));
      this.colWidths[colKey] = newW;
      th.style.width = `${newW}px`;
      th.style.minWidth = `${newW}px`;
      th.style.maxWidth = `${newW}px`;
    };

    const onUp = () => {
      resizer.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  updateRefreshStatusBadge() {
    const badge = document.getElementById('session-refresh-status-badge');
    const pauseBtn = document.getElementById('btn-session-pause-refresh');
    if (pauseBtn) {
      if (this.isAutoRefreshPaused || this.autoRefreshInterval <= 0) {
        pauseBtn.innerHTML = '▶ Retomar';
        pauseBtn.style.background = '#fef3c7';
        pauseBtn.style.borderColor = '#f59e0b';
        pauseBtn.style.color = '#92400e';
      } else {
        pauseBtn.innerHTML = '⏸ Pausar';
        pauseBtn.style.background = '';
        pauseBtn.style.borderColor = '';
        pauseBtn.style.color = '';
      }
    }
    if (badge) {
      const timeStr = this.lastRefreshTime ? new Date(this.lastRefreshTime).toLocaleTimeString() : '--:--:--';
      if (this.autoRefreshInterval <= 0) {
        badge.textContent = `Auto: Off | Última: ${timeStr}`;
        badge.style.background = '#f1f5f9';
        badge.style.color = '#64748b';
      } else if (this.isAutoRefreshPaused) {
        badge.textContent = `Auto: Pausado (${this.autoRefreshInterval}s) | Última: ${timeStr}`;
        badge.style.background = '#fef3c7';
        badge.style.color = '#92400e';
      } else {
        badge.textContent = `Auto: ${this.autoRefreshInterval}s | Última: ${timeStr}`;
        badge.style.background = '#dcfce7';
        badge.style.color = '#166534';
      }
    }
  }

  togglePauseAutoRefresh() {
    if (this.autoRefreshInterval <= 0) {
      this.autoRefreshInterval = 10;
      if (this.autoRefreshSelect) this.autoRefreshSelect.value = '10';
      this.isAutoRefreshPaused = false;
    } else {
      this.isAutoRefreshPaused = !this.isAutoRefreshPaused;
    }
    this.setupAutoRefresh();
    window.TracesApp?.notify(
      this.isAutoRefreshPaused
        ? 'Auto-Refresh do Session Browser PAUSADO.'
        : `Auto-Refresh do Session Browser RETOMADO (a cada ${this.autoRefreshInterval}s).`,
      'info'
    );
  }

  setupAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
    this.updateRefreshStatusBadge();
    if (this.autoRefreshInterval > 0 && !this.isAutoRefreshPaused) {
      const intervalMs = Math.max(2000, this.autoRefreshInterval * 1000);
      this.autoRefreshTimer = setInterval(() => {
        const recentlyScrolled = this._lastUserScroll && (Date.now() - this._lastUserScroll < 4000);
        if (this._isViewVisible() && !this.isAutoRefreshPaused && !this.isFetchingSessions && !recentlyScrolled) {
          this.loadRealSessions(true);
        }
      }, intervalMs);
    }
  }

  setAutoRefresh(seconds) {
    const parsed = parseInt(seconds, 10);
    this.autoRefreshInterval = Number.isNaN(parsed) ? 0 : parsed;
    if (this.autoRefreshInterval > 0) {
      this.isAutoRefreshPaused = false;
    }
    this.setupAutoRefresh();
    window.TracesApp?.notify(`Auto-Refresh de sessões ajustado para ${this.autoRefreshInterval > 0 ? this.autoRefreshInterval + 's' : 'Desativado (Off)'}.`, 'info');
  }

  onFilterChanged(filterId) {
    this.currentFilter = filterId;
    this._forceNext = true;
    this.refresh(true);
  }

  async refresh(isSilent = false) {
    if (!window.TracesApp || !window.TracesApp.isConnected()) {
      if (!isSilent) window.TracesApp?.notify('Desconectado. Conecte-se a um banco de dados para monitorar sessões.', 'warning');
      this.render();
      return;
    }

    // Silent refreshes (view switch / connection events / timer) are throttled; explicit ones are forced.
    await this.loadRealSessions(!isSilent || this._forceNext === true);
    this._forceNext = false;
    if (!isSilent) window.TracesApp.notify('Sessões atualizadas ao vivo do Oracle.', 'info');
  }

  _isViewVisible() {
    if (document.hidden) return false;
    if (window.TracesApp && window.TracesApp.currentView !== 'sessions') return false;
    return true;
  }

  async loadRealSessions(force = false) {
    if (this.isFetchingSessions) return;
    if (this.autoRefreshSelect) {
      const selVal = parseInt(this.autoRefreshSelect.value, 10);
      if (!Number.isNaN(selVal) && selVal !== this.autoRefreshInterval) {
        this.autoRefreshInterval = selVal;
      }
    }
    // Guard against external callers hammering refresh:
    // ignore non-forced calls made inside the selected auto-refresh interval, or when hidden/Off.
    if (!force) {
      if (!this._isViewVisible()) return;
      if (this.autoRefreshInterval <= 0 || this.isAutoRefreshPaused) return;
      if (this.lastRefreshTime) {
        const minGap = Math.max(2000, this.autoRefreshInterval * 1000) - 200;
        if (Date.now() - this.lastRefreshTime < minGap) return;
      }
    }
    this.isFetchingSessions = true;
    this.lastRefreshTime = Date.now();
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/sessions?filter=${encodeURIComponent(this.currentFilter)}${connParam}`);
      const data = await resp.json();
      if (data.os && window.TracesApp?.setServerOs) {
        window.TracesApp.setServerOs(data.os);
      }
      if (data.success !== false && data.sessions) {
        this.sessions = data.sessions;
        this.locks = data.locks || [];
        this.lastRefreshTime = Date.now();
        this.updateRefreshStatusBadge();

        if (!this.selectedSid || !this.sessions.some(s => s.sid === this.selectedSid)) {
          const preferred = this.sessions.find(s => s.username && s.username !== 'BACKGROUND') || this.sessions[0];
          if (preferred) {
            this.selectedSid = preferred.sid;
            this.selectedSerial = preferred.serial;
            await this.loadSessionDetails(this.selectedSid, true);
          } else {
            this.selectedSid = null;
            this.selectedSerial = null;
            this.sessionDetails = null;
          }
        } else if (this.selectedSid) {
          await this.loadSessionDetails(this.selectedSid, true);
        }

        if (data.metrics) {
          this.metrics = Object.assign(this.metrics, {
            bufferCacheHitRatio: data.metrics.bufferCacheHitRatio ?? 99.4,
            libraryCacheHitRatio: data.metrics.libraryCacheHitRatio ?? 99.8,
            activeSessionsCount: data.metrics.activeSessions ?? 1,
            totalSessionsCount: data.metrics.totalSessions ?? this.sessions.length,
            blockingSessionsCount: data.metrics.blockingSessions ?? 0
          });
        }

        const tablePane = document.getElementById('session-table-pane');
        const prevScrollTop = tablePane ? tablePane.scrollTop : 0;
        const prevScrollLeft = tablePane ? tablePane.scrollLeft : 0;
        this.render();
        if (tablePane) {
          tablePane.scrollTop = prevScrollTop;
          tablePane.scrollLeft = prevScrollLeft;
        }
      }
    } catch (e) {
      console.warn('Real sessions fetch error', e);
    } finally {
      this.isFetchingSessions = false;
    }
  }

  render() {
    this.applyPanelVisibility();
    if (!window.TracesApp || !window.TracesApp.isConnected()) {
      if (this.tableHead) {
        this.tableHead.innerHTML = '';
      }
      if (this.tableBody) {
        this.tableBody.innerHTML = `
          <tr>
            <td colspan="15" style="text-align: center; padding: 48px 16px; color: var(--text-muted); font-size: 11px;">
              <div style="font-size: 24px; margin-bottom: 8px;">🔌</div>
              <strong style="font-size: 12px; color: #1e293b;">Session Browser - Desconectado</strong><br><br>
              Esta ferramenta requer uma conexão ativa com o banco Oracle para inspecionar sessões (V$SESSION), locks (V$LOCKED_OBJECT) e wait events.<br>
              <button class="btn btn-primary" style="margin-top: 12px; padding: 4px 14px; font-weight: 600;" onclick="window.TracesApp.connectionManager.openModal();">
                ⚡ Conectar ao Banco de Dados...
              </button>
            </td>
          </tr>
        `;
      }
      if (this.lockTreeContent) {
        this.lockTreeContent.innerHTML = `<div style="padding: 16px; text-align: center; color: #888; font-size: 11px;">Desconectado do banco de dados.</div>`;
      }
      if (this.detailPane) {
        this.detailPane.innerHTML = `<div style="padding: 16px; text-align: center; color: #888; font-size: 11px;">Nenhuma sessão ativa inspecionada.</div>`;
      }
      return;
    }
    this.renderGauges();
    this.renderTable();
    this.renderLockTree();
    this.renderDetail();
  }

  renderGauges() {
    const bufFill = document.getElementById('gauge-buf-fill');
    const bufVal = document.getElementById('gauge-buf-val');
    if (bufFill && bufVal) {
      const circ = 2 * Math.PI * 15;
      const offset = circ - (circ * (this.metrics.bufferCacheHitRatio / 100));
      bufFill.style.strokeDasharray = circ;
      bufFill.style.strokeDashoffset = offset;
      bufVal.textContent = `${this.metrics.bufferCacheHitRatio}%`;
    }

    const libFill = document.getElementById('gauge-lib-fill');
    const libVal = document.getElementById('gauge-lib-val');
    if (libFill && libVal) {
      const circ = 2 * Math.PI * 15;
      const offset = circ - (circ * (this.metrics.libraryCacheHitRatio / 100));
      libFill.style.strokeDasharray = circ;
      libFill.style.strokeDashoffset = offset;
      libVal.textContent = `${this.metrics.libraryCacheHitRatio}%`;
    }

    const userSessions = this.sessions.filter(s => s.username && s.username !== 'BACKGROUND');
    const activeUserCount = userSessions.filter(s => s.status === 'ACTIVE').length;
    const actVal = document.getElementById('gauge-act-val');
    if (actVal) {
      actVal.textContent = `${activeUserCount} Ativas / ${this.sessions.length} Total (${userSessions.length} User)`;
    }

    const lockCnt = (this.locks?.length || 0) + this.sessions.filter(s => s.blockingSession || s.lockwait).length;
    const redoVal = document.getElementById('gauge-redo-val');
    if (redoVal) {
      redoVal.textContent = lockCnt > 0 ? `⚠ ${lockCnt} Contenções` : '✔ 0 Locks';
      redoVal.style.color = lockCnt > 0 ? '#dc2626' : '#16a34a';
    }
  }

  getFilteredAndSortedSessions() {
    let list = Array.isArray(this.sessions) ? [...this.sessions] : [];
    if (this.hideBackground) {
      list = list.filter(s => s.username && s.username !== 'BACKGROUND' && s.sessionType !== 'BACKGROUND');
    }
    if (this.searchQuery) {
      const q = this.searchQuery;
      list = list.filter(s => {
        return (
          String(s.sid).includes(q) ||
          String(s.serial || '').includes(q) ||
          (s.username || '').toLowerCase().includes(q) ||
          (s.osuser || '').toLowerCase().includes(q) ||
          (s.machine || '').toLowerCase().includes(q) ||
          (s.program || '').toLowerCase().includes(q) ||
          (s.module || '').toLowerCase().includes(q) ||
          (s.sqlId || '').toLowerCase().includes(q) ||
          (s.event || '').toLowerCase().includes(q) ||
          (s.spid || '').toLowerCase().includes(q) ||
          (s.status || '').toLowerCase().includes(q)
        );
      });
    }

    const col = this.sortCol;
    const dir = this.sortDir === 'desc' ? -1 : 1;
    list.sort((a, b) => {
      if (col === 'status') {
        const sa = a.status === 'ACTIVE' ? 0 : 1;
        const sb = b.status === 'ACTIVE' ? 0 : 1;
        if (sa !== sb) return (sa - sb) * dir;
        const ua = a.username === 'BACKGROUND' ? 1 : 0;
        const ub = b.username === 'BACKGROUND' ? 1 : 0;
        if (ua !== ub) return ua - ub;
        return (a.sid - b.sid) * dir;
      }
      const va = a[col];
      const vb = b[col];
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }
      return String(va ?? '').localeCompare(String(vb ?? ''), undefined, { numeric: true }) * dir;
    });
    return list;
  }

  renderTable() {
    if (!this.tableBody) return;

    const visibleCols = this.columns.filter(c => c.visible);
    if (this.tableHead) {
      this.tableHead.innerHTML = `
        <tr>
          ${visibleCols.map(col => {
            const w = this.colWidths[col.key] || col.width || 100;
            const isSorted = this.sortCol === col.key;
            const arrow = isSorted ? (this.sortDir === 'asc' ? ' ▲' : ' ▼') : '';
            return `
              <th style="width:${w}px; min-width:${w}px; max-width:${w}px; text-align:${col.align || 'left'}; position:sticky; top:0;"
                  onclick="window.TracesApp.sessionMonitor.sortByColumn('${col.key}')"
                  title="Clique para ordenar por ${col.label} | Arraste a borda direita para redimensionar">
                <span>${col.label}${arrow}</span>
                <div class="session-col-resizer" onmousedown="window.TracesApp.sessionMonitor.startColumnResize(event, '${col.key}')" onclick="event.stopPropagation()"></div>
              </th>
            `;
          }).join('')}
        </tr>
      `;
    }

    const filtered = this.getFilteredAndSortedSessions();
    const summaryEl = document.getElementById('session-count-summary');
    if (summaryEl) {
      summaryEl.textContent = `Exibindo ${filtered.length} de ${this.sessions.length} sessões`;
    }

    if (filtered.length === 0) {
      this.tableBody.innerHTML = `
        <tr>
          <td colspan="${visibleCols.length || 11}" style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 11px;">
            Nenhuma sessão encontrada para o filtro selecionado.
          </td>
        </tr>
      `;
      return;
    }

    this.tableBody.innerHTML = filtered.map(s => {
      const isSelected = this.selectedSid === s.sid;
      const isBlocking = s.blockingSession !== null && s.blockingSession !== undefined;
      const isBlocked = s.lockwait !== null && s.lockwait !== undefined && s.lockwait !== '';

      let rowClass = '';
      if (isSelected) rowClass += ' selected';
      if (isBlocking) rowClass += ' blocking';

      return `
        <tr class="${rowClass}"
            onclick="window.TracesApp.sessionMonitor.selectSession(${s.sid}, ${s.serial})"
            oncontextmenu="window.TracesApp.sessionMonitor.openSessionContextMenu(event, ${s.sid}, ${s.serial}); return false;">
          ${visibleCols.map(col => {
            const w = this.colWidths[col.key] || col.width || 100;
            const baseStyle = `width:${w}px; min-width:${w}px; max-width:${w}px; text-align:${col.align || 'left'};`;
            switch (col.key) {
              case 'sid':
                return `<td style="${baseStyle} font-weight: 700; color: ${isBlocking ? '#f87171' : 'var(--text-primary)'};">${s.sid}</td>`;
              case 'serial':
                return `<td style="${baseStyle} color: var(--text-muted);">${s.serial}</td>`;
              case 'status':
                return `<td style="${baseStyle}"><span class="session-status-badge ${(s.status || 'INACTIVE').toLowerCase()} ${isBlocked ? 'blocked' : ''}">${isBlocked ? 'WAIT LOCK' : s.status}</span></td>`;
              case 'username':
                return `<td style="${baseStyle} font-weight: 700; color: ${s.username === 'BACKGROUND' ? '#64748b' : '#0284c7'}; font-family: var(--font-code);">${s.username || 'BACKGROUND'}</td>`;
              case 'osuser':
                return `<td style="${baseStyle}">${this.escapeHtml(s.osuser || '-')}</td>`;
              case 'machine':
                return `<td style="${baseStyle} color: var(--text-muted);" title="${this.escapeHtml(s.machine || '-')}">${this.escapeHtml(s.machine || '-')}</td>`;
              case 'program':
                return `<td style="${baseStyle} font-size: 11px;" title="${this.escapeHtml(s.program || '-')}">${this.escapeHtml(s.program || '-')}</td>`;
              case 'module':
                return `<td style="${baseStyle} font-size: 11px; color: #334155;" title="${this.escapeHtml(s.module || '-')}">${this.escapeHtml(s.module || '-')}</td>`;
              case 'action':
                return `<td style="${baseStyle} font-size: 11px; color: #475569;">${this.escapeHtml(s.action || '-')}</td>`;
              case 'spid':
                return `<td style="${baseStyle} font-family: var(--font-code); color: #4338ca; font-weight: 600;">${s.spid || '-'}</td>`;
              case 'sqlId':
                return `<td style="${baseStyle} font-family: var(--font-code); color: #0369a1; font-weight: 600;">${s.sqlId || '-'}</td>`;
              case 'waitClass':
                return `<td style="${baseStyle} font-size: 10.5px;">${this.escapeHtml(s.waitClass || '-')}</td>`;
              case 'event':
                return `<td style="${baseStyle} color: ${isBlocked ? '#dc2626' : 'var(--text-secondary)'}; font-size: 10.5px; font-family: var(--font-code);" title="${this.escapeHtml(s.event || 'None')}">${this.escapeHtml(s.event || 'None')}</td>`;
              case 'lastCallEt':
                return `<td style="${baseStyle} font-family: var(--font-code);">${(s.lastCallEt ?? 0).toLocaleString()}s</td>`;
              case 'logonTime':
                return `<td style="${baseStyle} font-size: 11px;">${s.logonTime || '-'}</td>`;
              case 'pgaMb':
                return `<td style="${baseStyle} font-family: var(--font-code);">${s.pgaMb || 0} MB</td>`;
              case 'physicalReads':
                return `<td style="${baseStyle} font-family: var(--font-code);">${(s.physicalReads || 0).toLocaleString()}</td>`;
              case 'blockChanges':
                return `<td style="${baseStyle} font-family: var(--font-code);">${(s.blockChanges || 0).toLocaleString()}</td>`;
              case 'server':
                return `<td style="${baseStyle} font-size: 10.5px;">${s.server || 'DEDICATED'}</td>`;
              case 'locks':
                return `<td style="${baseStyle}">
                  ${isBlocking ? `<span style="color: #ef4444; font-weight: 700;">BLOCKER (SID ${s.blockingSession})</span>` : ''}
                  ${isBlocked ? '<span style="color: #f59e0b; font-weight: 700;">WAITING ON LOCK</span>' : ''}
                  ${!isBlocking && !isBlocked ? '-' : ''}
                </td>`;
              default:
                return `<td style="${baseStyle}">${this.escapeHtml(String(s[col.key] ?? '-'))}</td>`;
            }
          }).join('')}
        </tr>
      `;
    }).join('');
  }

  openSessionContextMenu(e, sid, serial) {
    this.selectSession(sid, serial);
    const s = this.sessions.find(x => x.sid === sid) || { sid, serial };
    const osKill = window.TracesApp?.getOsKillCommand?.(s.spid, s.sid) || { cmd: `kill -9 ${s.spid || s.sid}` };
    if (window.showToadContextMenu) {
      window.showToadContextMenu(e.clientX, e.clientY, [
        {
          icon: '🔍',
          label: `Inspecionar SQL da Sessão (SID ${sid})`,
          action: () => {
            if (!this.panelVisible.detail) this.togglePanel('detail');
            this.switchSubtab('sql');
          }
        },
        {
          icon: '📝',
          label: 'Abrir SQL da Sessão na Worksheet',
          action: () => this.openCurrentSessionSqlInWorksheet()
        },
        {
          icon: '🌳',
          label: 'Gerar Explain Plan deste SQL',
          action: () => this.explainCurrentSessionSql()
        },
        { separator: true },
        {
          icon: '📋',
          label: `Copiar Comando Kill SO (${osKill.cmd})`,
          action: () => {
            navigator.clipboard.writeText(osKill.cmd);
            window.TracesApp?.notify(`Comando SO copiado: ${osKill.cmd}`, 'success');
          }
        },
        { separator: true },
        {
          icon: '⚡',
          label: `Kill Session IMMEDIATE ('${sid},${serial}')`,
          action: () => this.killSession(sid, serial, 'IMMEDIATE')
        },
        {
          icon: '🔌',
          label: `Disconnect Session POST_TRANSACTION`,
          action: () => this.killSession(sid, serial, 'POST_TRANSACTION')
        }
      ]);
    }
  }

  openCurrentSessionSqlInWorksheet() {
    const s = this.sessions.find(item => item.sid === this.selectedSid) || this.sessions[0];
    const sqlText = this.sessionDetails?.sql?.sqlText || s?.sqlText || '';
    if (!sqlText || sqlText.startsWith('-- Nenhuma')) {
      window.TracesApp?.notify('Esta sessão não possui instrução SQL capturada em V$SQL no momento.', 'warning');
      return;
    }
    window.TracesApp.openWindow('editor');
    if (window.TracesApp.sqlEditor?.textarea) {
      window.TracesApp.sqlEditor.textarea.value = sqlText.trim().endsWith(';') ? sqlText.trim() : sqlText.trim() + ';';
      window.TracesApp.sqlEditor.saveActiveTabContent();
      window.TracesApp.sqlEditor.updateHighlighting();
      window.TracesApp.sqlEditor.updateGutter();
      window.TracesApp.notify(`SQL da sessão SID ${s?.sid} carregado na Worksheet.`, 'success');
    }
  }

  explainCurrentSessionSql() {
    const s = this.sessions.find(item => item.sid === this.selectedSid) || this.sessions[0];
    const sqlText = this.sessionDetails?.sql?.sqlText || s?.sqlText || '';
    if (!sqlText || sqlText.startsWith('-- Nenhuma')) {
      window.TracesApp?.notify('Esta sessão não possui instrução SQL ativa para gerar Explain Plan.', 'warning');
      return;
    }
    window.TracesApp.openWindow('explain');
    if (window.TracesApp.explainPlan) {
      window.TracesApp.explainPlan.generatePlan(sqlText, `Sessão SID ${s?.sid} (${s?.username})`);
    }
  }

  async selectSession(sid, serial) {
    this.selectedSid = sid;
    this.selectedSerial = serial;
    this.renderTable();

    if (window.TracesApp && window.TracesApp.isConnected()) {
      await this.loadSessionDetails(sid);
    } else {
      this.renderDetail();
    }
  }

  async loadSessionDetails(sid, skipRender = false) {
    try {
      const activeConn = window.TracesApp?.connectionManager?.getActive?.();
      const connParam = activeConn?.id ? `&conn_id=${encodeURIComponent(activeConn.id)}` : '';
      const resp = await fetch(`/api/session-details?sid=${sid}${connParam}`);
      const data = await resp.json();
      this.sessionDetails = data.details || data;
      if (!skipRender) this.renderDetail();
    } catch (e) {
      console.warn('Session details load error', e);
      if (!skipRender) this.renderDetail();
    }
  }

  renderLockTree() {
    if (!this.lockTreeContent) return;

    const blockers = this.sessions.filter(s => s.blockingSession !== null || (s.lockwait && s.lockwait !== ''));
    const locks = this.locks || [];
    const totalLocks = blockers.length + locks.length;

    const lockBadge = document.getElementById('lock-tree-badge');
    if (lockBadge) {
      lockBadge.textContent = totalLocks > 0 ? `⚠ ${totalLocks} Bloqueios Ativos` : '✔ 0 Bloqueios';
      lockBadge.style.background = totalLocks > 0 ? '#fee2e2' : '#dcfce7';
      lockBadge.style.color = totalLocks > 0 ? '#991b1b' : '#166534';
    }

    if (blockers.length === 0 && locks.length === 0) {
      this.lockTreeContent.innerHTML = `
        <div style="padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; color: #15803d; font-size: 11px; font-weight: 600;">
          <span>✔ Nenhuma contenção de lock ou sessão bloqueada no momento (V$LOCKED_OBJECT / V$SESSION).</span>
          <button type="button" class="btn" style="height: 20px; padding: 0 8px; font-size: 10px;" onclick="window.TracesApp.sessionMonitor.togglePanel('locks')">
            Ocultar este painel para ampliar a tabela
          </button>
        </div>
      `;
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';

    if (blockers.length > 0) {
      html += blockers.map(b => `
        <div class="lock-node ${b.blockingSession ? 'root-blocker' : 'waiting-session'}" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; background: #fff5f5; padding: 6px 10px; border: 1px solid #fecaca; border-radius: 4px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="background: ${b.blockingSession ? 'var(--traces-red)' : '#f59e0b'}; color: #fff; font-size: 9px; padding: 2px 6px; border-radius: 3px; font-weight: 700;">
              ${b.blockingSession ? 'BLOCKER' : 'WAITING'}
            </span>
            <span>SID: <strong>${b.sid}</strong>, Serial#: ${b.serial} | User: <strong>${b.username}</strong> | Machine: ${b.machine}</span>
            <span style="color: #64748b; font-size: 10px;">Wait Event: ${b.event}</span>
          </div>
          <button class="btn btn-danger" style="height: 22px; padding: 0 8px; font-size: 10px;" onclick="window.TracesApp.sessionMonitor.killSession(${b.sid}, ${b.serial})">
            Kill (SID ${b.sid})
          </button>
        </div>
      `).join('');
    }

    if (locks.length > 0) {
      html += `
        <table class="meta-table" style="width: 100%; margin-top: 2px; font-size: 11px;">
          <thead>
            <tr>
              <th>SID</th>
              <th>Serial#</th>
              <th>User</th>
              <th>Program</th>
              <th>Object Locked</th>
              <th>Type</th>
              <th>Lock Mode</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${locks.map(lk => `
              <tr>
                <td style="font-weight: 700;">${lk.sid}</td>
                <td>${lk.serial || '-'}</td>
                <td style="color: #0078d7; font-weight: 600;">${lk.username}</td>
                <td>${lk.program}</td>
                <td style="font-family: var(--font-code); font-weight: 700;">${lk.owner}.${lk.objectName}</td>
                <td>${lk.objectType}</td>
                <td style="color: #b91c1c; font-weight: 700;">${lk.lockMode}</td>
                <td>
                  <button class="btn btn-danger" style="height: 20px; padding: 0 6px; font-size: 10px;" onclick="window.TracesApp.sessionMonitor.killSession(${lk.sid}, ${lk.serial || 0})">Kill</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    html += '</div>';
    this.lockTreeContent.innerHTML = html;
  }

  renderDetail() {
    const s = this.sessions.find(item => item.sid === this.selectedSid) || this.sessions[0];
    if (!s || !this.detailPane) return;

    const details = this.sessionDetails || {};
    const sqlObj = details.sql || {};
    const sqlText = sqlObj.sqlText || s.sqlText || '-- Nenhuma instrução SQL em cache (V$SQL) para esta sessão no momento.';
    const isPrevSql = !!sqlObj.isPrevSql;
    const waits = details.waits || [];
    const locks = details.locks || [];
    const openCursors = details.openCursors || [];
    const longOps = details.longOps || [];
    const io = details.io || {};

    const osInfo = window.TracesApp?.getServerOs?.() || { os_type: 'linux', os_name: 'Linux' };
    const osKill = window.TracesApp?.getOsKillCommand?.(s.spid, s.sid) || {
      cmd: `kill -9 ${s.spid || s.sid}`,
      osType: 'linux',
      osName: 'Linux',
      debugCmd: `pstack ${s.spid || s.sid}`,
      explanation: 'Finalize o processo no SO caso o ALTER SYSTEM KILL SESSION fique preso em KILLED.'
    };
    const osIcon = osInfo.os_type === 'windows' ? '🪟' : osInfo.os_type === 'aix' ? '🟣' : '🐧';
    const osBadgeClass = osInfo.os_type === 'windows' ? 'os-windows' : osInfo.os_type === 'aix' ? 'os-aix' : 'os-linux';

    this.detailPane.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden; background: #fff;">
        
        <!-- Pinned Header + Subtabs -->
        <div style="padding: 8px 12px 0 12px; background: #f8fafc; border-bottom: 1px solid #cbd5e1; flex-shrink: 0;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
              <span style="font-weight: 700; font-size: 12.5px; color: var(--text-primary);">
                Session Inspector: SID ${s.sid}, Serial# ${s.serial} (${s.username})
              </span>
              <span class="session-status-badge ${(s.status || 'INACTIVE').toLowerCase()}">${s.status}</span>
              <span class="toad-os-badge ${osBadgeClass}">${osIcon} ${osInfo.os_name}</span>
              <span style="font-size: 11px; color: var(--text-muted);">
                SPID: <strong style="color: #4338ca; font-family: var(--font-code);">${s.spid || '-'}</strong> |
                OS: <strong>${this.escapeHtml(s.osuser || '-')}</strong> @ ${this.escapeHtml(s.machine || '-')} |
                Prog: ${this.escapeHtml(s.program || '-')}
              </span>
            </div>
            <div style="display: flex; gap: 5px; align-items: center;">
              <button class="btn" style="height: 22px; padding: 0 7px; font-size: 10.5px;" onclick="window.TracesApp.sessionMonitor.togglePanel('oscmd')" title="Mostrar / Ocultar Caixa de Comando SO">
                ${this.panelVisible.oscmd ? '💻 Ocultar Cmd SO' : '💻 Mostrar Cmd SO'}
              </button>
              <button class="btn" style="height: 22px; padding: 0 7px; font-size: 10.5px; font-weight: 600;" onclick="window.TracesPro.openAwrWizardModal()">
                📑 AWR / ADDM
              </button>
              <button class="btn btn-danger" style="height: 22px; padding: 0 8px; font-size: 10.5px; font-weight: 700;" onclick="window.TracesApp.sessionMonitor.killSession(${s.sid}, ${s.serial})">
                ⚡ Kill Session
              </button>
              <button class="btn" style="height: 22px; padding: 0 6px; font-size: 10.5px;" onclick="window.TracesApp.sessionMonitor.togglePanel('detail')" title="Ocultar Painel de Detalhes">
                ✕
              </button>
            </div>
          </div>

          <!-- OS-Adapted Kill & Diagnostic Box (Collapsible) -->
          <div class="os-cmd-banner" id="session-os-cmd-banner" style="display: ${this.panelVisible.oscmd ? 'block' : 'none'}; margin-bottom: 6px; padding: 6px 10px;">
            <div class="os-cmd-row" style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 12px;">${osIcon}</span>
                <span style="font-size: 11px; font-weight: 700; color: #f8fafc;">Kill no SO (${osKill.osName}):</span>
                <code class="os-cmd-code" style="padding: 2px 8px; font-size: 11px;">${osKill.cmd}</code>
                <span style="font-size: 10.5px; color: #94a3b8;">Diagnóstico: <code style="color:#cbd5e1;">${osKill.debugCmd}</code></span>
              </div>
              <div style="display: flex; gap: 5px;">
                <button class="os-cmd-copy-btn" onclick="navigator.clipboard.writeText('${osKill.cmd}'); window.TracesApp.notify('Comando SO copiado: ${osKill.cmd}', 'success');">
                  📋 Copiar Kill SO
                </button>
                <button class="os-cmd-copy-btn" style="background:#475569; border-color:#64748b;" onclick="navigator.clipboard.writeText('${osKill.debugCmd}'); window.TracesApp.notify('Comando diagnóstico copiado: ${osKill.debugCmd}', 'info');">
                  🔍 Copiar Stack/Diag
                </button>
              </div>
            </div>
          </div>

          <!-- Subtabs Bar -->
          <div class="detail-tabs-bar" style="background: transparent; border-bottom: none; overflow-x: auto;">
            <button class="detail-tab ${this.currentDetailTab === 'sql' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('sql')">
              Current SQL ${sqlObj.sqlId ? `(${sqlObj.sqlId})` : ''}
            </button>
            <button class="detail-tab ${this.currentDetailTab === 'waits' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('waits')">
              Waits (${waits.length})
            </button>
            <button class="detail-tab ${this.currentDetailTab === 'locks' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('locks')">
              Session Locks (${locks.length})
            </button>
            <button class="detail-tab ${this.currentDetailTab === 'cursors' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('cursors')">
              Open Cursors (${openCursors.length})
            </button>
            <button class="detail-tab ${this.currentDetailTab === 'longops' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('longops')">
              Long Ops (${longOps.length})
            </button>
            <button class="detail-tab ${this.currentDetailTab === 'io' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('io')">
              I/O &amp; Memory
            </button>
            <button class="detail-tab ${this.currentDetailTab === 'ash' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('ash')">
              📈 ASH Timeline
            </button>
            <button class="detail-tab ${this.currentDetailTab === 'temp_pga' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('temp_pga')">
              💾 TEMP &amp; PGA
            </button>
            <button class="detail-tab ${this.currentDetailTab === 'info' ? 'active' : ''}" onclick="window.TracesApp.sessionMonitor.switchSubtab('info')">
              Session Info
            </button>
          </div>
        </div>

        <!-- Scrollable Subtab Body -->
        <div style="flex: 1; overflow-y: auto; padding: 10px 14px;">

          <!-- Subtab 1: Current / Previous SQL -->
          <div style="display: ${this.currentDetailTab === 'sql' ? 'flex' : 'none'}; flex-direction: column; gap: 6px; height: 100%;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 11px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>SQL ID: <strong style="font-family: var(--font-code); color: #0078d7;">${sqlObj.sqlId || s.sqlId || '-'}</strong></span>
                ${sqlObj.sqlId ? `<span style="background: ${isPrevSql ? '#fef3c7' : '#dcfce7'}; color: ${isPrevSql ? '#92400e' : '#166534'}; font-size: 9.5px; padding: 1px 6px; border-radius: 3px; font-weight: 700;">${isPrevSql ? 'PREVIOUS SQL (Última Executada)' : 'CURRENT ACTIVE SQL'}</span>` : ''}
                <span style="color: #475569;">Execuções: <strong>${(sqlObj.executions || 0).toLocaleString()}</strong> | Buffer Gets: <strong>${(sqlObj.bufferGets || 0).toLocaleString()}</strong> | Disk Reads: <strong>${(sqlObj.diskReads || 0).toLocaleString()}</strong></span>
              </div>
              <div style="display: flex; gap: 6px;">
                <button class="btn" style="height: 22px; padding: 0 8px; font-size: 10.5px;" onclick="navigator.clipboard.writeText(document.getElementById('session-sql-code-box')?.textContent || ''); window.TracesApp.notify('SQL copiado para a área de transferência.', 'info');">
                  📋 Copiar SQL
                </button>
                <button class="btn" style="height: 22px; padding: 0 8px; font-size: 10.5px;" onclick="window.TracesApp.sessionMonitor.openCurrentSessionSqlInWorksheet()">
                  📝 Abrir na Worksheet
                </button>
                <button class="btn btn-primary" style="height: 22px; padding: 0 8px; font-size: 10.5px;" onclick="window.TracesApp.sessionMonitor.explainCurrentSessionSql()">
                  🌳 Explain Plan
                </button>
              </div>
            </div>
            <div id="session-sql-code-box" style="flex: 1; min-height: 90px; background: #0f172a; color: #38bdf8; border: 1px solid #334155; border-radius: 4px; padding: 10px 12px; font-family: var(--font-code); font-size: 11.5px; overflow: auto; white-space: pre-wrap; line-height: 1.45;">${this.escapeHtml(sqlText)}</div>
          </div>

          <!-- Subtab 2: Session Waits -->
          <div style="display: ${this.currentDetailTab === 'waits' ? 'block' : 'none'};">
            <table class="meta-table" style="width: 100%;">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>State</th>
                  <th>Wait Time</th>
                  <th>Seconds in Wait</th>
                  <th>P1 (Text: Value)</th>
                  <th>P2 (Text: Value)</th>
                  <th>P3 (Text: Value)</th>
                </tr>
              </thead>
              <tbody>
                ${waits.length > 0 ? waits.map(w => `
                  <tr>
                    <td style="font-weight: 700; color: #c00000; font-family: var(--font-code);">${this.escapeHtml(w.event)}</td>
                    <td><span class="session-status-badge active">${this.escapeHtml(w.state || 'WAITING')}</span></td>
                    <td>${w.waitTime}</td>
                    <td style="font-weight: 700;">${w.secondsInWait}s</td>
                    <td style="font-family: var(--font-code); font-size: 10.5px;">${this.escapeHtml(w.p1Text || '-')}: ${w.p1 ?? 0}</td>
                    <td style="font-family: var(--font-code); font-size: 10.5px;">${this.escapeHtml(w.p2Text || '-')}: ${w.p2 ?? 0}</td>
                    <td style="font-family: var(--font-code); font-size: 10.5px;">${this.escapeHtml(w.p3Text || '-')}: ${w.p3 ?? 0}</td>
                  </tr>
                `).join('') : `<tr><td colspan="7" style="padding: 16px; text-align: center; color: var(--text-muted);">Nenhum wait event ativo reportado para SID ${s.sid}.</td></tr>`}
              </tbody>
            </table>
          </div>

          <!-- Subtab 3: Session Locks -->
          <div style="display: ${this.currentDetailTab === 'locks' ? 'block' : 'none'};">
            <table class="meta-table" style="width: 100%;">
              <thead>
                <tr>
                  <th>Object Owner</th>
                  <th>Object Name</th>
                  <th>Object Type</th>
                  <th>Lock Mode</th>
                  <th>OS User</th>
                </tr>
              </thead>
              <tbody>
                ${locks.length > 0 ? locks.map(lk => `
                  <tr>
                    <td style="font-weight: 600;">${this.escapeHtml(lk.owner)}</td>
                    <td style="font-weight: 700; color: #0078d7; font-family: var(--font-code);">${this.escapeHtml(lk.objectName)}</td>
                    <td>${this.escapeHtml(lk.objectType)}</td>
                    <td style="color: #c00000; font-weight: 700;">${this.escapeHtml(lk.lockMode)}</td>
                    <td>${this.escapeHtml(lk.osUser || '-')}</td>
                  </tr>
                `).join('') : `<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">Esta sessão não está retendo locks em objetos (V$LOCKED_OBJECT).</td></tr>`}
              </tbody>
            </table>
          </div>

          <!-- Subtab 4: Open Cursors (V$OPEN_CURSOR) -->
          <div style="display: ${this.currentDetailTab === 'cursors' ? 'block' : 'none'};">
            <table class="meta-table" style="width: 100%;">
              <thead>
                <tr>
                  <th style="width: 115px;">SQL ID</th>
                  <th style="width: 140px;">Cursor Type</th>
                  <th>SQL Text Preview (V$OPEN_CURSOR)</th>
                  <th style="width: 90px;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${openCursors.length > 0 ? openCursors.map(oc => `
                  <tr>
                    <td style="font-weight: 700; color: #0284c7; font-family: var(--font-code);">${this.escapeHtml(oc.sqlId)}</td>
                    <td style="font-size: 10.5px; color: #475569;">${this.escapeHtml(oc.cursorType)}</td>
                    <td style="font-family: var(--font-code); font-size: 11px; color: #0f172a;">${this.escapeHtml(oc.sqlText)}</td>
                    <td>
                      <button class="btn" style="height: 20px; padding: 0 6px; font-size: 10px;"
                              onclick="navigator.clipboard.writeText(${JSON.stringify(oc.sqlText || '')}); window.TracesApp.notify('SQL do cursor copiado!', 'info');">
                        📋 Copiar
                      </button>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="4" style="padding: 16px; text-align: center; color: var(--text-muted);">Nenhum cursor aberto encontrado em V$OPEN_CURSOR para SID ${s.sid}.</td></tr>`}
              </tbody>
            </table>
          </div>

          <!-- Subtab 5: Long Operations (V$SESSION_LONGOPS) -->
          <div style="display: ${this.currentDetailTab === 'longops' ? 'block' : 'none'};">
            <table class="meta-table" style="width: 100%;">
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Target</th>
                  <th style="width: 160px;">Progress</th>
                  <th>Elapsed</th>
                  <th>Remaining</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                ${longOps.length > 0 ? longOps.map(lo => `
                  <tr>
                    <td style="font-weight: 700;">${this.escapeHtml(lo.opname)}</td>
                    <td style="font-family: var(--font-code); color: #0284c7;">${this.escapeHtml(lo.target)}</td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                          <div style="height: 100%; width: ${Math.min(100, lo.pct || 0)}%; background: #0284c7;"></div>
                        </div>
                        <span style="font-weight: 700; font-size: 10.5px;">${lo.pct}%</span>
                      </div>
                    </td>
                    <td>${lo.elapsedSeconds}s</td>
                    <td style="font-weight: 700; color: ${lo.timeRemaining > 0 ? '#d97706' : '#16a34a'};">${lo.timeRemaining}s</td>
                    <td style="font-size: 10.5px; color: #475569;">${this.escapeHtml(lo.message)}</td>
                  </tr>
                `).join('') : `<tr><td colspan="6" style="padding: 16px; text-align: center; color: var(--text-muted);">Nenhuma operação longa registrada em V$SESSION_LONGOPS para SID ${s.sid}.</td></tr>`}
              </tbody>
            </table>
          </div>

          <!-- Subtab 6: I/O & Memory -->
          <div style="display: ${this.currentDetailTab === 'io' ? 'grid' : 'none'}; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px;">
            <div class="advisor-card" style="padding: 10px;">
              <div class="metric-label">Block Gets (V$SESS_IO)</div>
              <div class="metric-value" style="font-size: 17px;">${(io.blockGets || 0).toLocaleString()}</div>
            </div>
            <div class="advisor-card" style="padding: 10px;">
              <div class="metric-label">Consistent Gets</div>
              <div class="metric-value" style="font-size: 17px;">${(io.consistentGets || 0).toLocaleString()}</div>
            </div>
            <div class="advisor-card" style="padding: 10px;">
              <div class="metric-label">Physical Reads</div>
              <div class="metric-value" style="font-size: 17px; color: #0284c7;">${(io.physicalReads || s.physicalReads || 0).toLocaleString()}</div>
            </div>
            <div class="advisor-card" style="padding: 10px;">
              <div class="metric-label">Block Changes</div>
              <div class="metric-value" style="font-size: 17px;">${(io.blockChanges || s.blockChanges || 0).toLocaleString()}</div>
            </div>
            <div class="advisor-card" style="padding: 10px;">
              <div class="metric-label">PGA Memory Allocated</div>
              <div class="metric-value" style="font-size: 17px; color: #16a34a;">${s.pgaMb || 0} MB</div>
            </div>
          </div>

          <!-- Subtab 7: ASH Timeline -->
          <div style="display: ${this.currentDetailTab === 'ash' ? 'block' : 'none'};">
            <div id="session-ash-timeline-container" style="min-height: 200px;"></div>
          </div>

          <!-- Subtab 8: TEMP & PGA Inspector -->
          <div style="display: ${this.currentDetailTab === 'temp_pga' ? 'block' : 'none'};">
            <div id="session-temp-pga-container" style="min-height: 200px;"></div>
          </div>

          <!-- Subtab 9: Session Info -->
          <div style="display: ${this.currentDetailTab === 'info' ? 'grid' : 'none'}; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; font-size: 11.5px;">
            <div class="advisor-card" style="padding: 8px 12px;"><strong>SID / Serial#:</strong> ${s.sid} / ${s.serial}</div>
            <div class="advisor-card" style="padding: 8px 12px;"><strong>SPID (OS Process):</strong> ${s.spid || '-'}</div>
            <div class="advisor-card" style="padding: 8px 12px;"><strong>Oracle Username:</strong> ${s.username || 'BACKGROUND'}</div>
            <div class="advisor-card" style="padding: 8px 12px;"><strong>OS User @ Machine:</strong> ${this.escapeHtml(s.osuser || '-')} @ ${this.escapeHtml(s.machine || '-')}</div>
            <div class="advisor-card" style="padding: 8px 12px;"><strong>Client Program:</strong> ${this.escapeHtml(s.program || '-')}</div>
            <div class="advisor-card" style="padding: 8px 12px;"><strong>Module / Action:</strong> ${this.escapeHtml(s.module || '-')} / ${this.escapeHtml(s.action || '-')}</div>
            <div class="advisor-card" style="padding: 8px 12px;"><strong>Service Name:</strong> ${this.escapeHtml(s.serviceName || '-')}</div>
            <div class="advisor-card" style="padding: 8px 12px;"><strong>Server Mode:</strong> ${s.server || 'DEDICATED'}</div>
            <div class="advisor-card" style="padding: 8px 12px;"><strong>Logon Time:</strong> ${s.logonTime || '-'}</div>
            <div class="advisor-card" style="padding: 8px 12px;"><strong>Last Call Elapsed:</strong> ${(s.lastCallEt || 0).toLocaleString()} segundos</div>
            <div class="advisor-card" style="padding: 8px 12px;"><strong>Wait Class / Event:</strong> ${this.escapeHtml(s.waitClass || '-')} — ${this.escapeHtml(s.event || 'None')}</div>
            <div class="advisor-card" style="padding: 8px 12px;"><strong>Process Memory (PGA):</strong> ${s.pgaMb || 0} MB</div>
          </div>

        </div>
      </div>
    `;
  }

  switchSubtab(tabKey) {
    this.currentDetailTab = tabKey;
    this.renderDetail();
    if (tabKey === 'ash' && window.TracesPro) {
      window.TracesPro.renderAshTimeline('session-ash-timeline-container');
    } else if (tabKey === 'temp_pga' && window.TracesPro) {
      window.TracesPro.renderTempPgaInspector('session-temp-pga-container');
    }
  }

  async killSession(sid, serial, mode = 'IMMEDIATE') {
    if (!window.TracesApp || !window.TracesApp.isConnected()) {
      window.TracesApp?.notify('Nenhuma conexão Oracle ativa. Conecte-se para gerenciar sessões.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    const ok = confirm(`Deseja encerrar a Sessão Oracle?\nALTER SYSTEM ${mode === 'POST_TRANSACTION' ? 'DISCONNECT' : 'KILL'} SESSION '${sid},${serial}' ${mode};`);
    if (!ok) return;

    if (window.TracesApp && window.TracesApp.isConnected()) {
      try {
        const activeConn = window.TracesApp?.connectionManager?.getActive?.();
        const resp = await fetch('/api/kill-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sid, serial, mode, conn_id: activeConn?.id })
        });
        const data = await resp.json();
        if (data.error) {
          window.TracesApp.notify(`Erro ao finalizar sessão: ${data.error}`, 'error');
        } else {
          window.TracesApp.notify(`Sessão ${sid},${serial} encerrada com sucesso no Oracle.`, 'success');
          await this.refresh();
        }
      } catch (e) {
        window.TracesApp.notify(`Erro de comunicação: ${e.message}`, 'error');
      }
      return;
    }
  }

  killCurrentSession(mode = 'IMMEDIATE') {
    const s = this.sessions.find(x => x.sid === this.selectedSid) || this.sessions[0];
    if (!s) return;
    this.killSession(s.sid, s.serial, mode);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.SessionMonitor = SessionMonitor;
