/* ==========================================================================
   TOAD FOR ORACLE - ENTERPRISE DATA GRID COMPONENT
   Supports: Live editing persistence (UPDATE/INSERT/DELETE with ROWID/PK),
   Fetch All Rows (unlimited Oracle streaming), Page Size Selector,
   Instant Search/Filter, Column Sorting, Single Record Viewer (F7),
   Quick Math, Full Range of Exports (Excel XLSX/SpreadsheetML, CSV, JSON,
   XML, INSERT statements, MERGE upserts, SQL*Loader), and Copy Menu.
   ========================================================================== */

class DataGrid {
  constructor() {
    this.data = [];
    this.originalData = [];
    this.tableName = 'EMPLOYEES';
    this.lastSql = '';
    this.hasMoreOnServer = false;
    this.lastElapsedMs = null;
    this.sortCol = null;
    this.sortAsc = true;
    this.filterText = '';
    this.page = 1;
    this.pageSize = 50;
    this.fetchLimit = 1000;
    this.selectedRowIdx = null;
    this.selectedColKey = null;
    this.pendingChanges = { updates: [], inserts: [], deletes: [] };
    this.modifiedCells = new Set(); // Stores "rowIdx:colKey"
    this.columnFilters = {}; // Stores "colKey" -> Set of allowed values (Excel-style)

    this.initElements();
    this.bindEvents();

    // Initial data: only load if connected
    if (window.TracesApp && window.TracesApp.isConnected() && window.TRACES_DB && window.TRACES_DB.schemas && window.TRACES_DB.schemas['HR']) {
      const initialData = window.TRACES_DB.schemas['HR'].tables[0].data;
      this.setData(initialData, 'EMPLOYEES');
    } else {
      this.render();
    }
  }

  initElements() {
    this.tableHeader = document.getElementById('grid-thead');
    this.tableBody = document.getElementById('grid-tbody');
    this.searchInput = document.getElementById('grid-search-filter');
    this.filterClearBtn = document.getElementById('grid-filter-clear');
    this.countLabel = document.getElementById('grid-rows-count');
    this.pageLabel = document.getElementById('grid-page-indicator');
    this.selectionInfo = document.getElementById('grid-selection-info');
    this.fetchStatus = document.getElementById('grid-fetch-status');
    this.pageSizeSelect = document.getElementById('grid-page-size');

    this.btnFirst = document.getElementById('grid-btn-first');
    this.btnPrev = document.getElementById('grid-btn-prev');
    this.btnNext = document.getElementById('grid-btn-next');
    this.btnLast = document.getElementById('grid-btn-last');

    this.btnAddRow = document.getElementById('grid-btn-add-row');
    this.btnDeleteRow = document.getElementById('grid-btn-delete-row');
    this.btnCommit = document.getElementById('grid-btn-commit');
    this.btnRollback = document.getElementById('grid-btn-rollback');

    this.btnRefresh = document.getElementById('grid-btn-refresh');
    this.btnFetchAll = document.getElementById('grid-btn-fetch-all');
    this.btnSingleRecord = document.getElementById('grid-btn-single-record');
    this.btnExport = document.getElementById('grid-btn-export');
    this.btnCopyMenu = document.getElementById('grid-btn-copy-menu');
  }

  bindEvents() {
    // Search Filter with instant debounce
    if (this.searchInput) {
      let filterDebounceTimer = null;
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(filterDebounceTimer);
        filterDebounceTimer = setTimeout(() => {
          this.filterText = e.target.value.toLowerCase().trim();
          if (this.filterClearBtn) {
            this.filterClearBtn.style.display = this.filterText ? 'inline-block' : 'none';
          }
          this.page = 1;
          this.render();
        }, 80);
      });

      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.clearFilter();
        }
      });
    }

    if (this.btnExport) {
      this.btnExport.addEventListener('click', () => this.showExportMenu());
    }
    if (this.btnAddRow) {
      this.btnAddRow.addEventListener('click', () => this.addNewRow());
    }
    if (this.btnDeleteRow) {
      this.btnDeleteRow.addEventListener('click', () => this.deleteSelectedRow());
    }

    // Keyboard navigation in grid
    document.addEventListener('keydown', (e) => {
      const activePane = document.getElementById('output-pane-grid');
      if (!activePane || !activePane.classList.contains('active')) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key === 'F7') {
        e.preventDefault();
        this.openRecordViewer();
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        this.goToNext();
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        this.goToPrev();
      } else if (e.ctrlKey && e.key === 'Home') {
        e.preventDefault();
        this.goToFirst();
      } else if (e.ctrlKey && e.key === 'End') {
        e.preventDefault();
        this.goToLast();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.moveSelection(-1);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // DATA MANAGEMENT & REFRESH
  // ---------------------------------------------------------------------------
  setData(dataArray, tableName = 'QUERY_RESULT', meta = {}) {
    this.data = Array.isArray(dataArray) ? JSON.parse(JSON.stringify(dataArray)) : [];
    this.originalData = Array.isArray(dataArray) ? JSON.parse(JSON.stringify(dataArray)) : [];
    this.tableName = tableName || 'QUERY_RESULT';
    if (meta.sql) {
      this.lastSql = meta.sql;
      if (window.TracesApp) {
        window.TracesApp.lastExecutedQuery = meta.sql;
      }
    }
    this.hasMoreOnServer = Boolean(meta.hasMore);
    this.lastElapsedMs = meta.elapsedMs || null;

    this.sortCol = null;
    this.sortAsc = true;
    this.page = 1;
    this.selectedRowIdx = this.data.length > 0 ? 0 : null;
    this.selectedColKey = null;
    this.pendingChanges = { updates: [], inserts: [], deletes: [] };
    this.modifiedCells.clear();

    this.render();

    const rowsEl = document.getElementById('status-grid-rows');
    if (rowsEl) rowsEl.textContent = `${this.data.length.toLocaleString()} rows`;
  }

  async fetchAllRows() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Conecte-se a um banco de dados para carregar registros.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }

    const sql = this.lastSql || window.TracesApp?.sqlEditor?.textarea?.value?.trim();
    if (!sql) {
      window.TracesApp?.notify('Nenhuma consulta SQL ativa para carregar todas as linhas.', 'warning');
      return;
    }

    window.TracesApp?.notify('Carregando todas as linhas do banco Oracle (sem limite)...', 'info');
    const startTime = performance.now();

    try {
      const resp = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, limit: 0 })
      });
      const data = await resp.json();
      const elapsedMs = (performance.now() - startTime).toFixed(1);

      if (data.error) {
        window.TracesApp?.notify(`Erro ao carregar linhas: ${data.error}`, 'error');
        return;
      }

      if (data.rows) {
        this.setData(data.rows, data.tableName || this.tableName, {
          sql,
          hasMore: false,
          elapsedMs: data.elapsedMs || elapsedMs
        });
        window.TracesApp?.notify(`Todas as ${data.rows.length.toLocaleString()} linhas carregadas com sucesso (${data.elapsedMs || elapsedMs} ms)!`, 'success');
      }
    } catch (err) {
      window.TracesApp?.notify(`Erro de comunicação com o servidor: ${err.message}`, 'error');
    }
  }

  async refreshQuery() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Conecte-se para atualizar os dados da grade.', 'warning');
      return;
    }
    const sql = this.lastSql || window.TracesApp?.sqlEditor?.textarea?.value?.trim();
    if (sql && window.TracesApp?.sqlEditor) {
      window.TracesApp.notify('Re-executando consulta SQL na worksheet...', 'info');
      await window.TracesApp.sqlEditor.executeQuery(sql);
    } else {
      this.render();
    }
  }

  // ---------------------------------------------------------------------------
  // NAVIGATION & PAGINATION
  // ---------------------------------------------------------------------------
  goToFirst() {
    this.page = 1;
    this.selectRow(0);
    this.render();
    this.scrollToActiveRow();
  }

  goToPrev() {
    const filtered = this.getFilteredData();
    const maxPage = Math.max(1, Math.ceil(filtered.length / this.pageSize));

    if (this.pageSize >= filtered.length) {
      // Single page view: move selection backwards
      if (this.selectedRowIdx !== null && this.selectedRowIdx > 0) {
        this.selectRow(this.selectedRowIdx - 1);
      }
    } else {
      if (this.page > 1) {
        this.page--;
        const startIdx = (this.page - 1) * this.pageSize;
        this.selectRow(startIdx);
        this.render();
        this.scrollToActiveRow();
      } else if (this.selectedRowIdx !== null && this.selectedRowIdx > 0) {
        this.selectRow(this.selectedRowIdx - 1);
      }
    }
  }

  goToNext() {
    const filtered = this.getFilteredData();
    const maxPage = Math.max(1, Math.ceil(filtered.length / this.pageSize));

    if (this.pageSize >= filtered.length) {
      // Single page view: move selection forwards
      if (this.selectedRowIdx !== null && this.selectedRowIdx < filtered.length - 1) {
        this.selectRow(this.selectedRowIdx + 1);
      }
    } else {
      if (this.page < maxPage) {
        this.page++;
        const startIdx = (this.page - 1) * this.pageSize;
        this.selectRow(startIdx);
        this.render();
        this.scrollToActiveRow();
      } else if (this.selectedRowIdx !== null && this.selectedRowIdx < filtered.length - 1) {
        this.selectRow(this.selectedRowIdx + 1);
      }
    }
  }

  goToLast() {
    const filtered = this.getFilteredData();
    const maxPage = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    this.page = maxPage;
    this.selectRow(filtered.length - 1);
    this.render();
    this.scrollToActiveRow();
  }

  changePageSize(newSize) {
    this.pageSize = parseInt(newSize, 10) || 50;
    this.page = 1;
    this.render();
  }

  moveSelection(delta) {
    const filtered = this.getFilteredData();
    if (filtered.length === 0) return;
    let target = (this.selectedRowIdx === null ? 0 : this.selectedRowIdx) + delta;
    if (target < 0) target = 0;
    if (target >= filtered.length) target = filtered.length - 1;

    // Check if target is on current page
    const startIdx = (this.page - 1) * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    if (target < startIdx) {
      this.page = Math.max(1, Math.floor(target / this.pageSize) + 1);
      this.render();
    } else if (target >= endIdx) {
      this.page = Math.floor(target / this.pageSize) + 1;
      this.render();
    }
    this.selectRow(target);
    this.scrollToActiveRow();
  }

  scrollToActiveRow() {
    setTimeout(() => {
      const selectedTr = this.tableBody?.querySelector('tr.selected');
      if (selectedTr) {
        selectedTr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 20);
  }

  selectRow(globalIdx, colKey = null) {
    this.selectedRowIdx = globalIdx;
    if (colKey) this.selectedColKey = colKey;

    // Update row highlighted styles without full re-render for speed
    const rows = this.tableBody?.querySelectorAll('tr');
    if (rows) {
      const startIdx = (this.page - 1) * this.pageSize;
      rows.forEach((tr, idx) => {
        const rowNum = startIdx + idx;
        if (rowNum === globalIdx) {
          tr.classList.add('selected');
        } else {
          tr.classList.remove('selected');
        }
      });
    }

    this.updateStatusLabels();
  }

  // ---------------------------------------------------------------------------
  // FILTERING & SORTING
  // ---------------------------------------------------------------------------
  clearFilter() {
    if (this.searchInput) this.searchInput.value = '';
    if (this.filterClearBtn) this.filterClearBtn.style.display = 'none';
    this.filterText = '';
    this.columnFilters = {};
    this.page = 1;
    this.render();
  }

  getFilteredData() {
    let result = this.data;
    if (this.filterText) {
      result = result.filter(row => {
        return Object.values(row).some(val =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(this.filterText)
        );
      });
    }

    const filterKeys = Object.keys(this.columnFilters || {});
    if (filterKeys.length > 0) {
      result = result.filter(row => {
        for (const k of filterKeys) {
          const allowed = this.columnFilters[k];
          if (allowed && allowed.size > 0) {
            const val = row[k] === null || row[k] === undefined ? '(null)' : String(row[k]);
            if (!allowed.has(val)) return false;
          }
        }
        return true;
      });
    }

    return result;
  }

  sortBy(colKey) {
    if (this.sortCol === colKey) {
      if (this.sortAsc) {
        this.sortAsc = false;
      } else {
        // Reset sort
        this.sortCol = null;
        this.sortAsc = true;
      }
    } else {
      this.sortCol = colKey;
      this.sortAsc = true;
    }
    this.render();
  }

  openColumnFilterDropdown(event, colKey) {
    const old = document.getElementById('grid-column-filter-popup');
    if (old) old.remove();

    const distinct = new Map();
    this.data.forEach(r => {
      const v = r[colKey] === null || r[colKey] === undefined ? '(null)' : String(r[colKey]);
      distinct.set(v, (distinct.get(v) || 0) + 1);
    });

    const entries = Array.from(distinct.entries()).slice(0, 100);
    const activeFilter = this.columnFilters[colKey] || null;

    const popup = document.createElement('div');
    popup.id = 'grid-column-filter-popup';
    popup.className = 'grid-column-filter-popup';
    popup.style.position = 'fixed';
    popup.style.zIndex = '9999';
    popup.style.background = '#ffffff';
    popup.style.border = '1px solid #94a3b8';
    popup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    popup.style.padding = '8px';
    popup.style.fontSize = '11px';
    popup.style.width = '240px';
    popup.style.borderRadius = '3px';

    const rect = event.currentTarget.getBoundingClientRect();
    popup.style.top = `${Math.min(window.innerHeight - 300, rect.bottom + 4)}px`;
    popup.style.left = `${Math.min(window.innerWidth - 260, Math.max(10, rect.left - 100))}px`;

    const checkboxesHtml = entries.map(([val, cnt]) => {
      const isChecked = !activeFilter || activeFilter.has(val);
      return `
        <label style="display: flex; align-items: center; gap: 6px; padding: 2px 0; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          <input type="checkbox" class="col-filter-cb" value="${this.escapeHtml(val)}" ${isChecked ? 'checked' : ''}>
          <span style="flex: 1; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(val)}</span>
          <span style="color: #64748b; font-size: 10px;">(${cnt})</span>
        </label>
      `;
    }).join('');

    popup.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 6px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
        Filtro de Coluna: ${colKey}
      </div>
      <div style="margin-bottom: 6px;">
        <label style="display: flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer;">
          <input type="checkbox" id="col-filter-select-all" checked onchange="document.querySelectorAll('.col-filter-cb').forEach(cb => cb.checked = this.checked);">
          (Selecionar Tudo)
        </label>
      </div>
      <div style="max-height: 180px; overflow-y: auto; border: 1px solid #cbd5e1; padding: 4px 6px; margin-bottom: 8px; background: #f8fafc;">
        ${checkboxesHtml}
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 6px;">
        <button class="btn btn-sm" onclick="document.getElementById('grid-column-filter-popup')?.remove();">Cancelar</button>
        <button class="btn btn-sm" onclick="window.TracesApp.dataGrid.clearColumnFilter('${colKey}')">Limpar</button>
        <button class="btn btn-sm btn-primary" onclick="window.TracesApp.dataGrid.applyColumnFilterFromPopup('${colKey}')">OK</button>
      </div>
    `;

    document.body.appendChild(popup);

    const outsideClick = (e) => {
      if (!popup.contains(e.target) && e.target !== event.currentTarget) {
        popup.remove();
        document.removeEventListener('click', outsideClick);
      }
    };
    setTimeout(() => document.addEventListener('click', outsideClick), 50);
  }

  applyColumnFilterFromPopup(colKey) {
    const popup = document.getElementById('grid-column-filter-popup');
    if (!popup) return;
    const cbs = popup.querySelectorAll('.col-filter-cb');
    const allChecked = Array.from(cbs).every(cb => cb.checked);
    if (allChecked) {
      delete this.columnFilters[colKey];
    } else {
      const selected = new Set();
      cbs.forEach(cb => {
        if (cb.checked) selected.add(cb.value);
      });
      this.columnFilters[colKey] = selected;
    }
    popup.remove();
    this.page = 1;
    this.render();
  }

  clearColumnFilter(colKey) {
    delete this.columnFilters[colKey];
    const popup = document.getElementById('grid-column-filter-popup');
    if (popup) popup.remove();
    this.page = 1;
    this.render();
  }

  // ---------------------------------------------------------------------------
  // RENDER PIPELINE
  // ---------------------------------------------------------------------------
  render() {
    if (!this.tableHeader || !this.tableBody) return;

    if (this.data.length === 0) {
      this.tableHeader.innerHTML = '<tr><th style="padding: 6px 12px;">Resultado de Dados</th></tr>';
      this.tableBody.innerHTML = `
        <tr>
          <td style="padding: 40px 16px; text-align: center; color: var(--text-muted); font-size: 11.5px;">
            ${window.TracesApp && window.TracesApp.isConnected()
              ? 'Nenhum registro para exibir. Digite uma consulta SQL e execute (F9) na worksheet.'
              : 'Desconectado do banco de dados. Conecte-se pelo Gerenciador de Conexões para executar consultas.'}
          </td>
        </tr>
      `;
      if (this.countLabel) this.countLabel.textContent = '0 linhas';
      if (this.pageLabel) this.pageLabel.textContent = 'Registro 0 de 0';
      if (this.selectionInfo) this.selectionInfo.textContent = '';
      if (this.fetchStatus) this.fetchStatus.textContent = '';
      this.updateCommitBadge();
      return;
    }

    const columns = Object.keys(this.data[0]);
    let filtered = this.getFilteredData();

    // Sorting
    if (this.sortCol) {
      filtered.sort((a, b) => {
        let valA = a[this.sortCol];
        let valB = b[this.sortCol];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return this.sortAsc ? valA - valB : valB - valA;
        }
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        if (valA < valB) return this.sortAsc ? -1 : 1;
        if (valA > valB) return this.sortAsc ? 1 : -1;
        return 0;
      });
    }

    // Pagination Calculation
    const totalCount = filtered.length;
    const maxPage = Math.max(1, Math.ceil(totalCount / this.pageSize));
    if (this.page > maxPage) this.page = maxPage;
    const startIdx = (this.page - 1) * this.pageSize;
    const pagedRows = filtered.slice(startIdx, startIdx + this.pageSize);

    // Render Headers with Excel filter funnel icon
    this.tableHeader.innerHTML = `
      <tr>
        <th class="row-num-cell" style="width: 48px; text-align: center;">#</th>
        ${columns.map(col => {
          const isFiltered = Boolean(this.columnFilters && this.columnFilters[col] && this.columnFilters[col].size > 0);
          return `
            <th title="Clique para ordenar ou filtrar por ${col}">
              <div class="th-content" style="display: flex; justify-content: space-between; align-items: center; gap: 4px;">
                <span onclick="window.TracesApp.dataGrid.sortBy('${col}')" style="cursor: pointer; flex: 1;">${col}</span>
                <span class="sort-icon" onclick="window.TracesApp.dataGrid.sortBy('${col}')">${this.sortCol === col ? (this.sortAsc ? '▲' : '▼') : ''}</span>
                <span class="grid-col-filter-btn ${isFiltered ? 'active' : ''}" 
                      onclick="event.stopPropagation(); window.TracesApp.dataGrid.openColumnFilterDropdown(event, '${col}')" 
                      title="Filtrar valores da coluna ${col} (Estilo Excel)">
                  ${isFiltered ? '🔻' : '▿'}
                </span>
              </div>
            </th>
          `;
        }).join('')}
      </tr>
    `;

    // Render Body Rows
    this.tableBody.innerHTML = pagedRows.map((row, idx) => {
      const globalIdx = startIdx + idx;
      const isSelected = this.selectedRowIdx === globalIdx;

      return `
        <tr class="${isSelected ? 'selected' : ''}" onclick="window.TracesApp.dataGrid.selectRow(${globalIdx})">
          <td class="row-num-cell">${globalIdx + 1}</td>
          ${columns.map(col => {
            const val = row[col];
            const isNull = val === null || val === undefined;
            const strVal = isNull ? '' : String(val);
            const isModified = this.modifiedCells.has(`${globalIdx}:${col}`);
            const isLong = strVal.length > 50 || strVal.includes('\n') || strVal.startsWith('{') || strVal.startsWith('<');

            return `
              <td class="${isModified ? 'cell-modified' : ''}"
                  ondblclick="window.TracesApp.dataGrid.handleCellDoubleClick(${globalIdx}, '${col}', this)"
                  oncontextmenu="window.TracesApp.dataGrid.handleContextMenu(event, ${globalIdx}, '${col}', this); return false;"
                  title="${isModified ? 'Valor modificado pendente de COMMIT' : 'Clique duplo para editar'}"
                  style="cursor: cell;">
                ${isNull ? '<span class="cell-null">(null)</span>' : this.escapeHtml(strVal)}
                ${isLong ? '<span title="Visualizar LOB/JSON/XML em Janela" onclick="event.stopPropagation(); window.TracesApp.dataGrid.openLobViewer(\'' + col + '\', ' + globalIdx + ');" style="margin-left: 4px; font-size: 11px; cursor: pointer; color: #0078d7;">🔍</span>' : ''}
              </td>
            `;
          }).join('')}
        </tr>
      `;
    }).join('');

    this.updateStatusLabels();
    this.updateCommitBadge();
  }

  updateStatusLabels() {
    const filtered = this.getFilteredData();
    const totalCount = filtered.length;
    const startIdx = (this.page - 1) * this.pageSize;
    const pagedCount = Math.min(this.pageSize, totalCount - startIdx);

    // Tab Header badge
    if (this.countLabel) {
      this.countLabel.textContent = `${this.data.length.toLocaleString()} linhas`;
    }

    // Bottom page indicator
    if (this.pageLabel) {
      if (totalCount === 0) {
        this.pageLabel.textContent = 'Registro 0 de 0';
      } else {
        const fromRow = startIdx + 1;
        const toRow = startIdx + pagedCount;
        this.pageLabel.textContent = `Linhas ${fromRow}-${toRow} de ${totalCount.toLocaleString()}${this.filterText ? ' (filtradas)' : ''}`;
      }
    }

    // Active Selection details
    if (this.selectionInfo) {
      if (this.selectedRowIdx !== null && this.data[this.selectedRowIdx]) {
        const row = this.data[this.selectedRowIdx];
        let detail = `Linha selecionada: #${this.selectedRowIdx + 1}`;
        if (this.selectedColKey && row[this.selectedColKey] !== undefined) {
          const val = row[this.selectedColKey];
          detail += ` | ${this.selectedColKey} = "${String(val).slice(0, 30)}"`;
        }
        this.selectionInfo.textContent = detail;
      } else {
        this.selectionInfo.textContent = '';
      }
    }

    // Server Fetch Status
    if (this.fetchStatus) {
      if (this.hasMoreOnServer) {
        this.fetchStatus.innerHTML = `
          <span style="color: #d97706; font-weight: 600;">⚠️ ${this.data.length.toLocaleString()} linhas carregadas (Existem mais no banco)</span>
          <button class="grid-fetch-badge" onclick="window.TracesApp.dataGrid.fetchAllRows();" title="Carregar todas as linhas restantes do Oracle">⚡ Carregar Todas</button>
        `;
      } else if (this.data.length > 0) {
        this.fetchStatus.innerHTML = `
          <span style="color: #16a34a;">⚡ Todas as ${this.data.length.toLocaleString()} linhas carregadas${this.lastElapsedMs ? ' (' + this.lastElapsedMs + ' ms)' : ''}</span>
        `;
      } else {
        this.fetchStatus.innerHTML = '';
      }
    }
  }

  updateCommitBadge() {
    const totalPending = this.pendingChanges.updates.length + this.pendingChanges.inserts.length + this.pendingChanges.deletes.length;
    if (this.btnCommit) {
      if (totalPending > 0) {
        this.btnCommit.innerHTML = `💾 <span style="font-size: 10px; background: #16a34a; color: #ffffff; padding: 0 4px; border-radius: 3px; font-weight: 700;">${totalPending}</span>`;
        this.btnCommit.title = `Gravar ${totalPending} alteração(ões) no Banco Oracle (Commit)`;
      } else {
        this.btnCommit.innerHTML = '💾';
        this.btnCommit.title = 'Gravar Alterações no Banco Oracle (Commit)';
      }
    }
    if (this.btnRollback) {
      this.btnRollback.title = totalPending > 0 ? `Cancelar ${totalPending} alteração(ões) pendente(s)` : 'Cancelar Edições Pendentes (Rollback)';
    }
  }

  // ---------------------------------------------------------------------------
  // INLINE CELL EDITING
  // ---------------------------------------------------------------------------
  handleCellDoubleClick(rowIdx, colKey, tdElement) {
    if (!tdElement || tdElement.querySelector('input')) return;
    this.selectRow(rowIdx, colKey);

    const originalVal = this.data[rowIdx][colKey];
    const currentText = originalVal === null || originalVal === undefined ? '' : String(originalVal);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.style.width = '100%';
    input.style.height = '100%';
    input.style.boxSizing = 'border-box';
    input.style.padding = '1px 4px';
    input.style.fontFamily = 'var(--toad-font-code)';
    input.style.fontSize = '11px';
    input.style.border = '1px solid #0078d7';
    input.style.outline = 'none';
    input.style.background = '#ffffff';

    tdElement.innerHTML = '';
    tdElement.appendChild(input);
    input.focus();
    input.select();

    const commitEdit = () => {
      const newVal = input.value.trim();
      const castVal = newVal === '' ? null : (isNaN(newVal) ? newVal : Number(newVal));

      if (castVal !== originalVal) {
        this.data[rowIdx][colKey] = castVal;
        this.modifiedCells.add(`${rowIdx}:${colKey}`);

        this.pendingChanges.updates.push({
          rowIdx,
          colKey,
          oldVal: originalVal,
          newVal: castVal,
          row: this.data[rowIdx],
          originalRow: this.originalData[rowIdx] || this.data[rowIdx]
        });

        if (window.TracesApp?.sqlEditor) {
          window.TracesApp.sqlEditor.transactionActive = true;
          window.TracesApp.sqlEditor.updateTransactionBadge();
        }
        window.TracesApp?.notify(`Célula [${colKey}] alterada. Pressione 💾 Commit para persistir no Oracle.`, 'info');
      }
      this.render();
    };

    input.addEventListener('blur', commitEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        this.render();
      }
    });
  }

  addNewRow() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Conecte-se a um banco de dados para inserir registros.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }
    if (this.data.length === 0) return;

    const newRow = {};
    Object.keys(this.data[0]).forEach(k => newRow[k] = null);
    this.data.unshift(newRow);
    this.pendingChanges.inserts.push({ row: newRow });
    this.page = 1;
    this.selectedRowIdx = 0;
    this.render();

    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.sqlEditor.transactionActive = true;
      window.TracesApp.sqlEditor.updateTransactionBadge();
    }
    window.TracesApp?.notify('Nova linha inserida no topo. Preencha os campos e clique em 💾 Commit para gravar.', 'info');
  }

  deleteSelectedRow() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Conecte-se a um banco de dados para excluir registros.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }
    if (this.selectedRowIdx === null || !this.data[this.selectedRowIdx]) {
      window.TracesApp?.notify('Selecione uma linha na grade antes de excluir.', 'warning');
      return;
    }

    const rowNum = this.selectedRowIdx + 1;
    const deletedRow = this.data[this.selectedRowIdx];
    this.pendingChanges.deletes.push({
      row: deletedRow,
      originalRow: this.originalData[this.selectedRowIdx] || deletedRow
    });

    this.data.splice(this.selectedRowIdx, 1);
    if (this.selectedRowIdx >= this.data.length) {
      this.selectedRowIdx = this.data.length > 0 ? this.data.length - 1 : null;
    }

    this.render();

    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.sqlEditor.transactionActive = true;
      window.TracesApp.sqlEditor.updateTransactionBadge();
    }
    window.TracesApp?.notify(`Linha #${rowNum} removida da grade. Clique em 💾 Commit para persistir no Oracle.`, 'info');
  }

  // ---------------------------------------------------------------------------
  // COMMIT & ROLLBACK
  // ---------------------------------------------------------------------------
  async commitPendingChanges() {
    const totalPending = this.pendingChanges.updates.length + this.pendingChanges.inserts.length + this.pendingChanges.deletes.length;
    if (totalPending === 0) {
      if (window.TracesApp && window.TracesApp.isRealDatabase) {
        await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: 'COMMIT;' })
        });
      }
      if (window.TracesApp?.sqlEditor) {
        window.TracesApp.sqlEditor.transactionActive = false;
        window.TracesApp.sqlEditor.updateTransactionBadge();
      }
      window.TracesApp?.notify('Commit efetuado com sucesso no Oracle. Nenhuma alteração pendente na grade.', 'success');
      return;
    }

    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      window.TracesApp.notify(`Gravando ${totalPending} alteração(ões) no Banco Oracle...`, 'info');
      try {
        const table = this.tableName === 'QUERY_RESULT' ? 'HR.EMPLOYEES' : this.tableName;

        // 1. Process Updates
        for (const upd of this.pendingChanges.updates) {
          const rowid = upd.row['ROWID'] || upd.originalRow['ROWID'];
          let sql = '';
          const params = { val: upd.newVal };

          if (rowid) {
            sql = `UPDATE ${table} SET ${upd.colKey} = :val WHERE ROWID = :rid`;
            params['rid'] = rowid;
          } else {
            const pkCol = Object.keys(upd.originalRow).find(c => c.endsWith('_ID') || c === 'ID') || Object.keys(upd.originalRow)[0];
            sql = `UPDATE ${table} SET ${upd.colKey} = :val WHERE ${pkCol} = :pkVal`;
            params['pkVal'] = upd.originalRow[pkCol];
          }

          await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql, params, autocommit: false })
          });
        }

        // 2. Process Inserts
        for (const ins of this.pendingChanges.inserts) {
          const validCols = Object.keys(ins.row).filter(c => c !== 'ROWID' && ins.row[c] !== null);
          if (validCols.length > 0) {
            const colNames = validCols.join(', ');
            const bindPlaceholders = validCols.map(c => `:${c}`).join(', ');
            const sql = `INSERT INTO ${table} (${colNames}) VALUES (${bindPlaceholders})`;
            const params = {};
            validCols.forEach(c => params[c] = ins.row[c]);

            await fetch('/api/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sql, params, autocommit: false })
            });
          }
        }

        // 3. Process Deletes
        for (const del of this.pendingChanges.deletes) {
          const rowid = del.row['ROWID'] || del.originalRow['ROWID'];
          let sql = '';
          const params = {};
          if (rowid) {
            sql = `DELETE FROM ${table} WHERE ROWID = :rid`;
            params['rid'] = rowid;
          } else {
            const pkCol = Object.keys(del.originalRow).find(c => c.endsWith('_ID') || c === 'ID') || Object.keys(del.originalRow)[0];
            sql = `DELETE FROM ${table} WHERE ${pkCol} = :pkVal`;
            params['pkVal'] = del.originalRow[pkCol];
          }

          await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql, params, autocommit: false })
          });
        }

        // 4. Issue COMMIT
        await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: 'COMMIT;' })
        });

        this.originalData = JSON.parse(JSON.stringify(this.data));
        this.pendingChanges = { updates: [], inserts: [], deletes: [] };
        this.modifiedCells.clear();

        if (window.TracesApp?.sqlEditor) {
          window.TracesApp.sqlEditor.transactionActive = false;
          window.TracesApp.sqlEditor.updateTransactionBadge();
        }
        this.render();
        window.TracesApp?.notify(`Sucesso! ${totalPending} alteração(ões) gravadas e confirmadas no Oracle.`, 'success');
      } catch (err) {
        window.TracesApp?.notify(`Erro ao gravar alterações no banco: ${err.message}`, 'error');
      }
    } else {
      this.originalData = JSON.parse(JSON.stringify(this.data));
      this.pendingChanges = { updates: [], inserts: [], deletes: [] };
      this.modifiedCells.clear();
      if (window.TracesApp?.sqlEditor) {
        window.TracesApp.sqlEditor.transactionActive = false;
        window.TracesApp.sqlEditor.updateTransactionBadge();
      }
      this.render();
      window.TracesApp?.notify('Alterações confirmadas na grade local.', 'success');
    }
  }

  rollbackPendingChanges() {
    this.data = JSON.parse(JSON.stringify(this.originalData));
    this.pendingChanges = { updates: [], inserts: [], deletes: [] };
    this.modifiedCells.clear();
    this.render();

    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.sqlEditor.transactionActive = false;
      window.TracesApp.sqlEditor.updateTransactionBadge();
    }
    window.TracesApp?.notify('Todas as alterações pendentes foram canceladas (Rollback).', 'warning');
  }

  // ---------------------------------------------------------------------------
  // COPY MENU & OPERATIONS
  // ---------------------------------------------------------------------------
  showCopyMenu(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const row = (this.selectedRowIdx !== null && this.data[this.selectedRowIdx]) ? this.data[this.selectedRowIdx] : (this.data[0] || {});
    const col = this.selectedColKey || (Object.keys(row)[0] || '');
    const cellVal = row[col] !== undefined ? String(row[col]) : '';

    const items = [
      {
        label: `Copiar Valor da Célula ("${cellVal.length > 25 ? cellVal.slice(0, 25) + '...' : cellVal}")`,
        icon: '📋',
        shortcut: 'Ctrl+C',
        action: () => {
          navigator.clipboard.writeText(cellVal);
          window.TracesApp?.notify(`Valor copiado: "${cellVal.slice(0, 40)}"`, 'info');
        }
      },
      {
        label: 'Copiar Linha Atual (Nome: Valor)',
        icon: '📄',
        action: () => {
          const text = Object.entries(row).map(([k, v]) => `${k}: ${v}`).join('\n');
          navigator.clipboard.writeText(text);
          window.TracesApp?.notify(`Linha #${(this.selectedRowIdx || 0) + 1} copiada com nomes de colunas.`, 'info');
        }
      },
      {
        label: 'Copiar Linha Atual como TSV (Para Excel)',
        icon: '📊',
        action: () => {
          const text = Object.values(row).join('\t');
          navigator.clipboard.writeText(text);
          window.TracesApp?.notify('Linha copiada como TSV.', 'info');
        }
      },
      { separator: true },
      {
        label: `Copiar Todas as Linhas Filtradas (${this.getFilteredData().length.toLocaleString()} linhas TSV)`,
        icon: '📑',
        action: () => {
          const filtered = this.getFilteredData();
          if (filtered.length === 0) return;
          const cols = Object.keys(filtered[0]);
          let text = cols.join('\t') + '\n';
          filtered.forEach(r => {
            text += cols.map(c => r[c] !== null && r[c] !== undefined ? String(r[c]) : '').join('\t') + '\n';
          });
          navigator.clipboard.writeText(text);
          window.TracesApp?.notify(`${filtered.length.toLocaleString()} linhas copiadas para a Área de Transferência.`, 'success');
        }
      },
      {
        label: 'Copiar como Instruções SQL INSERT',
        icon: '💾',
        action: () => {
          const filtered = this.getFilteredData();
          if (filtered.length === 0) return;
          const cols = Object.keys(filtered[0]);
          let sql = '';
          filtered.forEach(r => {
            const vals = cols.map(c => {
              const v = r[c];
              if (v === null || v === undefined) return 'NULL';
              if (typeof v === 'number') return v;
              return `'${String(v).replace(/'/g, "''")}'`;
            });
            sql += `INSERT INTO ${this.tableName} (${cols.join(', ')}) VALUES (${vals.join(', ')});\n`;
          });
          navigator.clipboard.writeText(sql);
          window.TracesApp?.notify(`${filtered.length.toLocaleString()} comandos INSERT copiados.`, 'success');
        }
      }
    ];

    const rect = this.btnCopyMenu?.getBoundingClientRect();
    const x = rect ? rect.left : (e ? e.clientX : 200);
    const y = rect ? rect.bottom + 4 : (e ? e.clientY : 200);

    if (typeof window.showToadContextMenu === 'function') {
      window.showToadContextMenu(x, y, items);
    }
  }

  // ---------------------------------------------------------------------------
  // CONTEXT MENU (RIGHT CLICK)
  // ---------------------------------------------------------------------------
  handleContextMenu(e, rowIdx, colKey, tdElement) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    this.selectRow(rowIdx, colKey);

    const row = this.data[rowIdx] || {};
    const cellVal = row[colKey];
    const strVal = cellVal === null || cellVal === undefined ? '' : String(cellVal);
    const isNumeric = cellVal !== null && cellVal !== undefined && !isNaN(Number(cellVal));

    const items = [
      { label: 'Visualizador de Registro Individual (F7)', icon: '🔍', shortcut: 'F7', action: () => this.openRecordViewer(rowIdx) },
      { separator: true },
      { label: `Copiar Valor da Célula ("${strVal.length > 25 ? strVal.slice(0, 25) + '...' : strVal}")`, icon: '📋', shortcut: 'Ctrl+C', action: () => {
        navigator.clipboard.writeText(strVal);
        window.TracesApp?.notify(`Valor copiado: "${strVal.slice(0, 40)}"`, 'info');
      }},
      { label: 'Copiar Linha com Cabeçalhos', icon: '📄', shortcut: '', action: () => {
        const text = Object.entries(row).map(([k, v]) => `${k}: ${v}`).join('\n');
        navigator.clipboard.writeText(text);
        window.TracesApp?.notify(`Registro #${rowIdx + 1} copiado com cabeçalhos.`, 'info');
      }},
      { label: 'Copiar Linha como TSV (Para Excel)', icon: '📊', shortcut: '', action: () => {
        const text = Object.values(row).join('\t');
        navigator.clipboard.writeText(text);
        window.TracesApp?.notify(`Registro #${rowIdx + 1} copiado como TSV.`, 'info');
      }},
      { separator: true },
      { label: `Filtrar por este Valor (WHERE ${colKey} = '${strVal}')`, icon: '🔎', shortcut: '', action: () => {
        if (this.searchInput) {
          this.searchInput.value = strVal;
          if (this.filterClearBtn) this.filterClearBtn.style.display = 'inline-block';
          this.filterText = strVal.toLowerCase().trim();
          this.page = 1;
          this.render();
        }
      }},
      { label: `Excluir este Valor da Grade (WHERE ${colKey} <> '${strVal}')`, icon: '🚫', shortcut: '', action: () => {
        this.data = this.data.filter(r => String(r[colKey]) !== strVal);
        this.render();
        window.TracesApp?.notify(`Registros onde ${colKey} = '${strVal}' foram filtrados.`, 'info');
      }}
    ];

    if (isNumeric) {
      items.push({
        label: `Cálculo Rápido na Coluna "${colKey}" (Sum, Avg, Min, Max)...`,
        icon: '🧮',
        shortcut: '',
        action: () => this.showColumnMath(colKey)
      });
    }

    items.push(
      { separator: true },
      { label: 'Inserir Nova Linha', icon: '➕', shortcut: 'Insert', action: () => this.addNewRow() },
      { label: `Excluir Linha Selecionada (#${rowIdx + 1})`, icon: '🗑️', shortcut: 'Delete', action: () => this.deleteSelectedRow() },
      { separator: true },
      { label: 'Exportar Conjunto de Dados...', icon: '📤', shortcut: '', action: () => this.showExportMenu() },
      { label: `Total de Linhas no Grid: ${this.data.length.toLocaleString()}`, icon: '📊', disabled: true, shortcut: '' }
    );

    if (typeof window.showToadContextMenu === 'function') {
      window.showToadContextMenu(e.clientX, e.clientY, items);
    }
  }

  showColumnMath(colKey) {
    const vals = this.data.map(r => Number(r[colKey])).filter(v => !isNaN(v));
    if (vals.length === 0) return;
    const count = vals.length;
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const min = Math.min(...vals);
    const max = Math.max(...vals);

    alert(`TOAD QUICK COLUMN MATH [${colKey}]:\n\n` +
      `Contagem (Count): ${count.toLocaleString()}\n` +
      `Soma (Sum):       ${sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}\n` +
      `Média (Avg):      ${avg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}\n` +
      `Mínimo (Min):     ${min.toLocaleString()}\n` +
      `Máximo (Max):     ${max.toLocaleString()}`
    );
  }

  // ---------------------------------------------------------------------------
  // SINGLE RECORD VIEWER (F7)
  // ---------------------------------------------------------------------------
  openRecordViewer(targetIdx) {
    if (this.data.length === 0) {
      window.TracesApp?.notify('Nenhum registro na grade para exibir.', 'warning');
      return;
    }
    const idx = (typeof targetIdx === 'number' && targetIdx >= 0 && targetIdx < this.data.length)
      ? targetIdx
      : (this.selectedRowIdx !== null ? this.selectedRowIdx : 0);

    this.currentViewerIdx = idx;
    this.renderRecordViewerModal();
  }

  renderRecordViewerModal() {
    const total = this.data.length;
    const current = this.currentViewerIdx;
    const row = this.data[current] || {};
    const columns = Object.keys(row);

    const bodyHtml = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: #f8fafc; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 4px;">
        <div style="font-weight: 700; font-size: 12px; color: #0284c7;">
          Tabela: ${this.tableName} | Registro ${current + 1} de ${total.toLocaleString()}
        </div>
        <div style="display: flex; gap: 4px;">
          <button class="btn btn-sm" onclick="window.TracesApp.dataGrid.viewerPrevRecord();" ${current === 0 ? 'disabled' : ''}>◀ Anterior</button>
          <button class="btn btn-sm" onclick="window.TracesApp.dataGrid.viewerNextRecord();" ${current >= total - 1 ? 'disabled' : ''}>Próximo ▶</button>
        </div>
      </div>
      <div style="max-height: 400px; overflow-y: auto; border: 1px solid #cbd5e1; border-radius: 4px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; font-family: var(--toad-font-code);">
          <thead>
            <tr style="background: #f1f5f9; position: sticky; top: 0; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 6px 8px; text-align: left; width: 35%; color: #475569;">Nome da Coluna</th>
              <th style="padding: 6px 8px; text-align: left; color: #475569;">Valor do Campo</th>
            </tr>
          </thead>
          <tbody>
            ${columns.map(col => {
              const val = row[col];
              const isNull = val === null || val === undefined;
              return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 4px 8px; font-weight: 600; color: #334155; background: #f8fafc; border-right: 1px solid #e2e8f0;">${col}</td>
                  <td style="padding: 4px 8px; color: ${isNull ? '#94a3b8' : '#0f172a'}; font-style: ${isNull ? 'italic' : 'normal'};">
                    ${isNull ? '(null)' : this.escapeHtml(String(val))}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="navigator.clipboard.writeText(JSON.stringify(window.TracesApp.dataGrid.data[${current}], null, 2)); window.TracesApp.notify('Registro copiado como JSON.', 'info');">Copiar JSON</button>
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Fechar</button>
    `;

    window.TracesApp?.toadModals?.show(`Single Record Viewer (F7) - ${this.tableName}`, bodyHtml, footerHtml, '650px');
  }

  viewerPrevRecord() {
    if (this.currentViewerIdx > 0) {
      this.currentViewerIdx--;
      this.selectRow(this.currentViewerIdx);
      this.renderRecordViewerModal();
    }
  }

  viewerNextRecord() {
    if (this.currentViewerIdx < this.data.length - 1) {
      this.currentViewerIdx++;
      this.selectRow(this.currentViewerIdx);
      this.renderRecordViewerModal();
    }
  }

  // ---------------------------------------------------------------------------
  // LOB / JSON / XML CELL VIEWER POPUP
  // ---------------------------------------------------------------------------
  openLobViewer(colKey, rowIdx) {
    const val = this.data[rowIdx][colKey];
    const strVal = val === null || val === undefined ? '(null)' : String(val);

    let formatted = strVal;
    let formatType = 'Texto / CLOB';
    if (strVal.trim().startsWith('{') || strVal.trim().startsWith('[')) {
      try {
        formatted = JSON.stringify(JSON.parse(strVal), null, 2);
        formatType = 'Documento JSON';
      } catch (e) {}
    } else if (strVal.trim().startsWith('<')) {
      formatType = 'Documento XML';
    }

    const body = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 12px; color: #0284c7;">Coluna: ${colKey} (${formatType})</span>
        <span style="font-size: 11px; color: #64748b;">Tamanho: ${strVal.length.toLocaleString()} caracteres</span>
      </div>
      <pre id="lob-viewer-text" style="height: 320px; overflow: auto; background: #1e1e1e; color: #f8fafc; padding: 12px; font-family: var(--toad-font-code); font-size: 11px; line-height: 1.4; border-radius: 4px; border: 1px solid #334155;">${this.escapeHtml(formatted)}</pre>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('lob-viewer-text').textContent); window.TracesApp.notify('Conteúdo LOB copiado para a Área de Transferência.', 'info');">Copiar Texto</button>
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Fechar</button>
    `;

    window.TracesApp.toadModals.show(`LOB / XML / JSON Viewer - ${colKey}`, body, footer, '680px');
  }

  // ---------------------------------------------------------------------------
  // EXPORT WIZARD (XLSX, XML, CSV, JSON, INSERT, MERGE, SQLLDR)
  // ---------------------------------------------------------------------------
  showExportMenu() {
    const count = this.data.length;
    const body = `
      <div style="font-size: 12px; margin-bottom: 12px; color: #334155;">
        Selecione o formato para exportar o conjunto <b>${this.tableName}</b> (${count.toLocaleString()} registros):
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
        <button class="btn" style="height: 42px; justify-content: flex-start; gap: 10px; padding: 6px 12px; border-color: #0284c7; background: #f0f9ff;" onclick="window.TracesApp.dataGrid.exportXlsx(); window.TracesApp.toadModals.close();">
          <span style="font-size: 20px;">📊</span>
          <div style="text-align: left;">
            <b style="color: #0369a1;">Excel Nativo (.xlsx)</b><br>
            <small style="color: #64748b;">Planilha binária real OpenXML sem dependências</small>
          </div>
        </button>
        <button class="btn" style="height: 42px; justify-content: flex-start; gap: 10px; padding: 6px 12px;" onclick="window.TracesApp.dataGrid.exportLegacyXls(); window.TracesApp.toadModals.close();">
          <span style="font-size: 20px;">📈</span>
          <div style="text-align: left;">
            <b>Excel Legado (.xls)</b><br>
            <small style="color: #64748b;">Planilha SpreadsheetML padrão Toad</small>
          </div>
        </button>
        <button class="btn" style="height: 42px; justify-content: flex-start; gap: 10px; padding: 6px 12px;" onclick="window.TracesApp.dataGrid.exportCsv(); window.TracesApp.toadModals.close();">
          <span style="font-size: 20px;">📄</span>
          <div style="text-align: left;">
            <b>Texto Delimitado (.csv)</b><br>
            <small style="color: #64748b;">Valores separados por vírgula</small>
          </div>
        </button>
        <button class="btn" style="height: 42px; justify-content: flex-start; gap: 10px; padding: 6px 12px;" onclick="window.TracesApp.dataGrid.exportJson(); window.TracesApp.toadModals.close();">
          <span style="font-size: 20px;">📦</span>
          <div style="text-align: left;">
            <b>JSON (.json)</b><br>
            <small style="color: #64748b;">Array de objetos estruturados</small>
          </div>
        </button>
        <button class="btn" style="height: 42px; justify-content: flex-start; gap: 10px; padding: 6px 12px;" onclick="window.TracesApp.dataGrid.exportXml(); window.TracesApp.toadModals.close();">
          <span style="font-size: 20px;">🏷️</span>
          <div style="text-align: left;">
            <b>Oracle XML (.xml)</b><br>
            <small style="color: #64748b;">Formato padrão ROWSET / ROW</small>
          </div>
        </button>
        <button class="btn" style="height: 42px; justify-content: flex-start; gap: 10px; padding: 6px 12px;" onclick="window.TracesApp.dataGrid.exportSqlInserts(); window.TracesApp.toadModals.close();">
          <span style="font-size: 20px;">💾</span>
          <div style="text-align: left;">
            <b>Script SQL INSERT (.sql)</b><br>
            <small style="color: #64748b;">Instruções INSERT executáveis</small>
          </div>
        </button>
        <button class="btn" style="height: 42px; justify-content: flex-start; gap: 10px; padding: 6px 12px;" onclick="window.TracesApp.dataGrid.exportSqlMerge(); window.TracesApp.toadModals.close();">
          <span style="font-size: 20px;">🔄</span>
          <div style="text-align: left;">
            <b>Script SQL MERGE (.sql)</b><br>
            <small style="color: #64748b;">Sintaxe Upsert MERGE INTO</small>
          </div>
        </button>
        <button class="btn" style="height: 42px; justify-content: flex-start; gap: 10px; grid-column: 1 / -1; padding: 6px 12px;" onclick="window.TracesApp.dataGrid.exportSqlLoader(); window.TracesApp.toadModals.close();">
          <span style="font-size: 20px;">⚡</span>
          <div style="text-align: left;">
            <b>Oracle SQL*Loader (.ctl + .dat)</b><br>
            <small style="color: #64748b;">Carga rápida em massa de alto desempenho</small>
          </div>
        </button>
      </div>
    `;

    window.TracesApp?.toadModals?.show('Exportar Conjunto de Dados - Toad Data Grid', body, '', '560px');
  }

  exportCsv() {
    if (this.data.length === 0) return;
    const cols = Object.keys(this.data[0]);
    let csv = cols.map(c => `"${c.replace(/"/g, '""')}"`).join(',') + '\n';
    this.data.forEach(r => {
      csv += cols.map(c => `"${r[c] !== null && r[c] !== undefined ? String(r[c]).replace(/"/g, '""') : ''}"`).join(',') + '\n';
    });
    this.downloadFile(csv, `${this.tableName}_export.csv`, 'text/csv');
  }

  exportJson() {
    const jsonStr = JSON.stringify(this.data, null, 2);
    this.downloadFile(jsonStr, `${this.tableName}_export.json`, 'application/json');
  }

  exportXlsx() {
    if (this.data.length === 0) return;
    const cols = Object.keys(this.data[0]);
    if (window.TracesPro && typeof window.TracesPro.exportNativeXlsx === 'function') {
      window.TracesPro.exportNativeXlsx(cols, this.data, this.tableName, `${this.tableName}_export.xlsx`);
    } else {
      this.exportLegacyXls();
    }
  }

  exportLegacyXls() {
    if (this.data.length === 0) return;
    const cols = Object.keys(this.data[0]);
    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0284C7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Data"/>
 </Styles>
 <Worksheet ss:Name="${this.tableName.slice(0, 31)}">
  <Table>
   <Row ss:StyleID="Header">
    ${cols.map(c => `<Cell><Data ss:Type="String">${this.escapeHtml(c)}</Data></Cell>`).join('')}
   </Row>
`;
    this.data.forEach(r => {
      xml += '   <Row ss:StyleID="Data">\n';
      cols.forEach(c => {
        const val = r[c];
        const isNum = typeof val === 'number';
        const type = isNum ? 'Number' : 'String';
        const displayVal = val === null || val === undefined ? '' : this.escapeHtml(String(val));
        xml += `    <Cell><Data ss:Type="${type}">${displayVal}</Data></Cell>\n`;
      });
      xml += '   </Row>\n';
    });

    xml += `  </Table>
 </Worksheet>
</Workbook>`;
    this.downloadFile(xml, `${this.tableName}_export.xls`, 'application/vnd.ms-excel');
  }

  exportXml() {
    if (this.data.length === 0) return;
    const cols = Object.keys(this.data[0]);
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ROWSET table="${this.escapeHtml(this.tableName)}">\n`;
    this.data.forEach((r, idx) => {
      xml += `  <ROW num="${idx + 1}">\n`;
      cols.forEach(c => {
        const val = r[c] !== null && r[c] !== undefined ? this.escapeHtml(String(r[c])) : '';
        xml += `    <${c}>${val}</${c}>\n`;
      });
      xml += `  </ROW>\n`;
    });
    xml += `</ROWSET>\n`;
    this.downloadFile(xml, `${this.tableName}_export.xml`, 'application/xml');
  }

  exportSqlInserts() {
    if (this.data.length === 0) return;
    const cols = Object.keys(this.data[0]);
    let sql = `-- TOAD Data Export: INSERT statements for ${this.tableName}\n-- Generated on ${new Date().toLocaleString()}\n\n`;
    this.data.forEach(r => {
      const vals = cols.map(c => {
        const v = r[c];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return v;
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      sql += `INSERT INTO ${this.tableName} (${cols.join(', ')}) VALUES (${vals.join(', ')});\n`;
    });
    sql += '\nCOMMIT;\n';
    this.downloadFile(sql, `${this.tableName}_inserts.sql`, 'text/plain');
  }

  exportSqlMerge() {
    if (this.data.length === 0) return;
    const cols = Object.keys(this.data[0]);
    const pkCol = cols.find(c => c.endsWith('_ID') || c === 'ID') || cols[0];
    const nonPkCols = cols.filter(c => c !== pkCol);

    let sql = `-- TOAD Data Export: MERGE (UPSERT) statement for ${this.tableName}\n\n`;
    this.data.forEach(r => {
      const selectParts = cols.map(c => {
        const v = r[c];
        const valStr = v === null || v === undefined ? 'NULL' : (typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`);
        return `${valStr} as ${c}`;
      }).join(', ');

      const updateParts = nonPkCols.map(c => `t.${c} = s.${c}`).join(', ');
      const insertCols = cols.join(', ');
      const insertVals = cols.map(c => `s.${c}`).join(', ');

      sql += `MERGE INTO ${this.tableName} t
USING (SELECT ${selectParts} FROM dual) s
ON (t.${pkCol} = s.${pkCol})
WHEN MATCHED THEN
  UPDATE SET ${updateParts}
WHEN NOT MATCHED THEN
  INSERT (${insertCols}) VALUES (${insertVals});\n\n`;
    });

    sql += 'COMMIT;\n';
    this.downloadFile(sql, `${this.tableName}_merge.sql`, 'text/plain');
  }

  exportSqlLoader() {
    if (this.data.length === 0) return;
    const cols = Object.keys(this.data[0]);
    const ctl = `LOAD DATA
INFILE '${this.tableName.toLowerCase()}_data.dat'
BADFILE '${this.tableName.toLowerCase()}_bad.bad'
DISCARDFILE '${this.tableName.toLowerCase()}_dsc.dsc'
APPEND
INTO TABLE ${this.tableName}
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
TRAILING NULLCOLS
(${cols.map(c => `  ${c} CHAR(4000)`).join(',\n')})
`;
    let dat = '';
    this.data.forEach(r => {
      dat += cols.map(c => `"${r[c] !== null && r[c] !== undefined ? String(r[c]).replace(/"/g, '""') : ''}"`).join(',') + '\n';
    });

    this.downloadFile(ctl, `${this.tableName.toLowerCase()}.ctl`, 'text/plain');
    setTimeout(() => {
      this.downloadFile(dat, `${this.tableName.toLowerCase()}_data.dat`, 'text/plain');
    }, 500);
    window.TracesApp?.notify('Arquivos de controle (.ctl) e dados (.dat) do SQL*Loader gerados.', 'success');
  }

  downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    window.TracesApp?.notify(`Arquivo ${fileName} exportado com sucesso.`, 'success');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global initialization
window.DataGrid = DataGrid;
