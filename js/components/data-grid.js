/* ==========================================================================
   DATA GRID (ORACLE TABLE DATA EDITOR) COMPONENT
   Supports: Live editing persistence (UPDATE/INSERT/DELETE with ROWID/PK),
   Exports (XLSX SpreadsheetML, XML, CSV, JSON, INSERT, MERGE, SQL*Loader),
   LOB/JSON/XML Viewer Modal, and Row Selection/Sorting/Filtering.
   ========================================================================== */

class DataGrid {
  constructor() {
    this.data = [];
    this.originalData = [];
    this.tableName = 'EMPLOYEES';
    this.sortCol = null;
    this.sortAsc = true;
    this.filterText = '';
    this.page = 1;
    this.pageSize = 25;
    this.selectedRowIdx = null;
    this.pendingChanges = { updates: [], inserts: [], deletes: [] };

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
    this.countLabel = document.getElementById('grid-rows-count');
    this.pageLabel = document.getElementById('grid-page-indicator');
    this.btnPrev = document.getElementById('grid-btn-prev');
    this.btnNext = document.getElementById('grid-btn-next');
    this.btnExport = document.getElementById('grid-btn-export');
    this.btnAddRow = document.getElementById('grid-btn-add-row');
    this.btnDeleteRow = document.getElementById('grid-btn-delete-row');
  }

  bindEvents() {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.filterText = e.target.value.toLowerCase().trim();
        this.page = 1;
        this.render();
      });
    }

    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => {
        if (this.page > 1) {
          this.page--;
          this.render();
        }
      });
    }

    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        const maxPage = Math.ceil(this.getFilteredData().length / this.pageSize);
        if (this.page < maxPage) {
          this.page++;
          this.render();
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
  }

  setData(dataArray, tableName = 'QUERY_RESULT') {
    this.data = JSON.parse(JSON.stringify(dataArray));
    this.originalData = JSON.parse(JSON.stringify(dataArray));
    this.tableName = tableName;
    this.sortCol = null;
    this.sortAsc = true;
    this.page = 1;
    this.selectedRowIdx = null;
    this.pendingChanges = { updates: [], inserts: [], deletes: [] };
    this.render();
  }

  getFilteredData() {
    if (!this.filterText) return this.data;
    return this.data.filter(row => {
      return Object.values(row).some(val => 
        val !== null && val !== undefined && String(val).toLowerCase().includes(this.filterText)
      );
    });
  }

  render() {
    if (!this.tableHeader || !this.tableBody) return;

    if (this.data.length === 0) {
      this.tableHeader.innerHTML = '<tr><th style="padding: 6px 12px;">Resultado de Dados</th></tr>';
      this.tableBody.innerHTML = `
        <tr>
          <td style="padding: 36px 16px; text-align: center; color: var(--text-muted); font-size: 11px;">
            ${window.TracesApp && window.TracesApp.isConnected() 
              ? 'Nenhum registro para exibir. Execute uma consulta SQL (F9) na worksheet para carregar dados.' 
              : 'Desconectado do banco de dados. Conecte-se e execute uma consulta SQL (F9) para visualizar dados no grid.'}
          </td>
        </tr>
      `;
      if (this.countLabel) this.countLabel.textContent = 'Rows: 0';
      if (this.pageLabel) this.pageLabel.textContent = 'Record 0 of 0';
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
        if (valA < valB) return this.sortAsc ? -1 : 1;
        if (valA > valB) return this.sortAsc ? 1 : -1;
        return 0;
      });
    }

    // Pagination
    const totalCount = filtered.length;
    const startIdx = (this.page - 1) * this.pageSize;
    const pagedRows = filtered.slice(startIdx, startIdx + this.pageSize);

    // Render Headers
    this.tableHeader.innerHTML = `
      <tr>
        <th class="row-num-cell" style="width: 44px;">#</th>
        ${columns.map(col => `
          <th onclick="window.TracesApp.dataGrid.sortBy('${col}')">
            <div class="th-content">
              <span>${col}</span>
              ${this.sortCol === col ? `<span class="sort-icon">${this.sortAsc ? '▲' : '▼'}</span>` : ''}
            </div>
          </th>
        `).join('')}
      </tr>
    `;

    // Render Body
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
            const isLong = strVal.length > 50 || strVal.includes('\n') || strVal.startsWith('{') || strVal.startsWith('<');
            return `
              <td ondblclick="window.TracesApp.dataGrid.handleCellDoubleClick(${globalIdx}, '${col}', this)" style="cursor: cell;">
                ${isNull ? '<span class="cell-null">(null)</span>' : this.escapeHtml(strVal)}
                ${isLong ? '<span title="View LOB/JSON/XML in Popup" onclick="event.stopPropagation(); window.TracesApp.dataGrid.openLobViewer(\'' + col + '\', ' + globalIdx + ');" style="margin-left: 4px; font-size: 10px; cursor: pointer; color: #0078d7;">📄</span>' : ''}
              </td>
            `;
          }).join('')}
        </tr>
      `;
    }).join('');

    // Update Pagination UI
    if (this.countLabel) {
      this.countLabel.textContent = `Rows: ${Math.min(totalCount, startIdx + 1)}-${Math.min(totalCount, startIdx + pagedRows.length)} of ${totalCount.toLocaleString()}`;
    }
    const maxPage = Math.max(1, Math.ceil(totalCount / this.pageSize));
    if (this.pageLabel) {
      const pendingCount = this.pendingChanges.updates.length + this.pendingChanges.inserts.length + this.pendingChanges.deletes.length;
      const pendingBadge = pendingCount > 0 ? ` | <b style="color: #c00000;">${pendingCount} pending edit(s)</b>` : '';
      this.pageLabel.innerHTML = `Page ${this.page} of ${maxPage} (${totalCount.toLocaleString()} rows)${pendingBadge}`;
    }
    if (this.btnPrev) this.btnPrev.disabled = this.page <= 1;
    if (this.btnNext) this.btnNext.disabled = this.page >= maxPage;
  }

  sortBy(col) {
    if (this.sortCol === col) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortCol = col;
      this.sortAsc = true;
    }
    this.render();
  }

  selectRow(idx) {
    this.selectedRowIdx = idx;
    this.render();
  }

  handleCellDoubleClick(rowIdx, colKey, tdElement) {
    const originalVal = this.data[rowIdx][colKey];
    const strVal = originalVal === null ? '' : String(originalVal);
    if (strVal.length > 80 || strVal.includes('\n') || strVal.startsWith('{') || strVal.startsWith('<')) {
      this.openLobViewer(colKey, rowIdx);
    } else {
      this.editCell(rowIdx, colKey, tdElement);
    }
  }

  editCell(rowIdx, colKey, tdElement) {
    const originalVal = this.data[rowIdx][colKey];
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalVal === null ? '' : originalVal;
    input.style.width = '100%';
    input.style.background = '#fff';
    input.style.color = '#000';
    input.style.border = '2px solid #0078d7';
    input.style.borderRadius = '2px';
    input.style.padding = '2px 4px';
    input.style.fontFamily = 'var(--toad-font-code)';
    input.style.fontSize = '11px';

    tdElement.innerHTML = '';
    tdElement.appendChild(input);
    input.focus();

    const commitEdit = () => {
      const newVal = input.value.trim();
      const castVal = newVal === '' ? null : (isNaN(newVal) ? newVal : Number(newVal));
      
      if (castVal !== originalVal) {
        this.data[rowIdx][colKey] = castVal;
        this.pendingChanges.updates.push({
          rowIdx,
          colKey,
          oldVal: originalVal,
          newVal: castVal,
          row: this.data[rowIdx],
          originalRow: this.originalData[rowIdx] || this.data[rowIdx]
        });

        window.TracesApp.sqlEditor.transactionActive = true;
        window.TracesApp.sqlEditor.updateTransactionBadge();
        window.TracesApp.notify(`Updated cell ${colKey}. Press ✓ or COMMIT (F11) to persist to Oracle.`, 'info');
      }
      this.render();
    };

    input.addEventListener('blur', commitEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') this.render();
    });
  }

  addNewRow() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Conecte-se a um banco de dados para editar dados de tabelas.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }
    if (this.data.length === 0) return;
    const newRow = {};
    Object.keys(this.data[0]).forEach(k => newRow[k] = null);
    this.data.unshift(newRow);
    this.pendingChanges.inserts.push({ row: newRow });
    this.page = 1;
    this.render();
    window.TracesApp.sqlEditor.transactionActive = true;
    window.TracesApp.sqlEditor.updateTransactionBadge();
    window.TracesApp.notify('New empty row inserted at top. Edit cells and press ✓ to persist.', 'info');
  }

  deleteSelectedRow() {
    if (!window.TracesApp?.isConnected()) {
      window.TracesApp?.notify('Conecte-se a um banco de dados para editar dados de tabelas.', 'warning');
      window.TracesApp?.connectionManager?.openModal();
      return;
    }
    if (this.selectedRowIdx === null) {
      window.TracesApp.notify('Please click a row to select it for deletion.', 'warning');
      return;
    }
    const deletedRow = this.data[this.selectedRowIdx];
    this.pendingChanges.deletes.push({
      row: deletedRow,
      originalRow: this.originalData[this.selectedRowIdx] || deletedRow
    });
    this.data.splice(this.selectedRowIdx, 1);
    this.selectedRowIdx = null;
    this.render();
    window.TracesApp.sqlEditor.transactionActive = true;
    window.TracesApp.sqlEditor.updateTransactionBadge();
    window.TracesApp.notify('Row removed from grid. Press ✓ to persist DELETE to Oracle.', 'info');
  }

  // ---------------------------------------------------------------------------
  // LIVE DATABASE COMMIT & PERSISTENCE
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
      window.TracesApp.sqlEditor.transactionActive = false;
      window.TracesApp.sqlEditor.updateTransactionBadge();
      window.TracesApp.notify('Commit complete. No pending grid DML changes.', 'success');
      return;
    }

    if (window.TracesApp && window.TracesApp.isRealDatabase) {
      window.TracesApp.notify(`Persisting ${totalPending} changes to Oracle Database...`, 'info');
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
            // Find key column or match all non-null original cols
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
        window.TracesApp.sqlEditor.transactionActive = false;
        window.TracesApp.sqlEditor.updateTransactionBadge();
        this.render();
        window.TracesApp.notify(`Successfully persisted and committed ${totalPending} changes to ${table}.`, 'success');
      } catch (err) {
        window.TracesApp.notify(`Error committing changes to database: ${err.message}`, 'error');
      }
    } else {
      // Local mode
      this.originalData = JSON.parse(JSON.stringify(this.data));
      this.pendingChanges = { updates: [], inserts: [], deletes: [] };
      window.TracesApp.sqlEditor.transactionActive = false;
      window.TracesApp.sqlEditor.updateTransactionBadge();
      this.render();
      window.TracesApp.notify(`Changes committed to local buffer. Connect to real Oracle Database for live persistence.`, 'success');
    }
  }

  rollbackPendingChanges() {
    this.data = JSON.parse(JSON.stringify(this.originalData));
    this.pendingChanges = { updates: [], inserts: [], deletes: [] };
    this.selectedRowIdx = null;
    this.render();
    window.TracesApp.sqlEditor.transactionActive = false;
    window.TracesApp.sqlEditor.updateTransactionBadge();
    window.TracesApp.notify('Rolled back all pending grid edits.', 'warning');
  }

  // ---------------------------------------------------------------------------
  // LOB / JSON / XML CELL VIEWER POPUP
  // ---------------------------------------------------------------------------
  openLobViewer(colKey, rowIdx) {
    const val = this.data[rowIdx][colKey];
    const strVal = val === null || val === undefined ? '(null)' : String(val);

    let formatted = strVal;
    let formatType = 'Text / CLOB';
    if (strVal.trim().startsWith('{') || strVal.trim().startsWith('[')) {
      try {
        formatted = JSON.stringify(JSON.parse(strVal), null, 2);
        formatType = 'JSON Document';
      } catch (e) {}
    } else if (strVal.trim().startsWith('<')) {
      formatType = 'XML Document';
    }

    const body = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 12px; color: #0078d7;">Column: ${colKey} (${formatType})</span>
        <span style="font-size: 11px; color: #666;">Length: ${strVal.length.toLocaleString()} characters</span>
      </div>
      <pre id="lob-viewer-text" style="height: 320px; overflow: auto; background: #1e1e1e; color: #f8fafc; padding: 12px; font-family: var(--toad-font-code); font-size: 11px; line-height: 1.4; border-radius: 4px; border: 1px solid #334155;">${this.escapeHtml(formatted)}</pre>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('lob-viewer-text').textContent); window.TracesApp.notify('LOB data copied to clipboard.', 'info');">Copy Text</button>
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Close</button>
    `;

    window.TracesApp.toadModals.show(`LOB / XML / JSON Viewer - ${colKey}`, body, footer, '680px');
  }

  // ---------------------------------------------------------------------------
  // TOAD EXPORT DATASET WIZARD (XLSX, XML, CSV, JSON, INSERT, MERGE, SQLLDR)
  // ---------------------------------------------------------------------------
  showExportMenu() {
    const body = `
      <div style="font-size: 11.5px; margin-bottom: 12px;">
        Select the target file format for exporting <b>${this.tableName}</b> (${this.data.length.toLocaleString()} records):
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
        <button class="btn" style="height: 38px; justify-content: flex-start; gap: 8px;" onclick="window.TracesApp.dataGrid.exportXlsx(); window.TracesApp.toadModals.close();">
          <span style="font-size: 18px;">📊</span>
          <div style="text-align: left;">
            <b>Excel (.xlsx)</b><br>
            <small style="color: #666;">Native SpreadsheetML with styling</small>
          </div>
        </button>
        <button class="btn" style="height: 38px; justify-content: flex-start; gap: 8px;" onclick="window.TracesApp.dataGrid.exportCsv(); window.TracesApp.toadModals.close();">
          <span style="font-size: 18px;">📑</span>
          <div style="text-align: left;">
            <b>Delimited Text (.csv)</b><br>
            <small style="color: #666;">Comma-separated values</small>
          </div>
        </button>
        <button class="btn" style="height: 38px; justify-content: flex-start; gap: 8px;" onclick="window.TracesApp.dataGrid.exportXml(); window.TracesApp.toadModals.close();">
          <span style="font-size: 18px;">📄</span>
          <div style="text-align: left;">
            <b>Oracle XML (.xml)</b><br>
            <small style="color: #666;">Standard ROWSET / ROW format</small>
          </div>
        </button>
        <button class="btn" style="height: 38px; justify-content: flex-start; gap: 8px;" onclick="window.TracesApp.dataGrid.exportJson(); window.TracesApp.toadModals.close();">
          <span style="font-size: 18px;">📦</span>
          <div style="text-align: left;">
            <b>JSON (.json)</b><br>
            <small style="color: #666;">Array of JSON objects</small>
          </div>
        </button>
        <button class="btn" style="height: 38px; justify-content: flex-start; gap: 8px;" onclick="window.TracesApp.dataGrid.exportSqlInserts(); window.TracesApp.toadModals.close();">
          <span style="font-size: 18px;">📝</span>
          <div style="text-align: left;">
            <b>SQL INSERT (.sql)</b><br>
            <small style="color: #666;">Executable INSERT statements</small>
          </div>
        </button>
        <button class="btn" style="height: 38px; justify-content: flex-start; gap: 8px;" onclick="window.TracesApp.dataGrid.exportSqlMerge(); window.TracesApp.toadModals.close();">
          <span style="font-size: 18px;">🔀</span>
          <div style="text-align: left;">
            <b>SQL MERGE (.sql)</b><br>
            <small style="color: #666;">Upsert MERGE INTO syntax</small>
          </div>
        </button>
        <button class="btn" style="height: 38px; justify-content: flex-start; gap: 8px; grid-column: 1 / -1;" onclick="window.TracesApp.dataGrid.exportSqlLoader(); window.TracesApp.toadModals.close();">
          <span style="font-size: 18px;">⚡</span>
          <div style="text-align: left;">
            <b>SQL*Loader (.ctl + .dat)</b><br>
            <small style="color: #666;">High-speed direct path bulk load files</small>
          </div>
        </button>
      </div>
    `;

    const footer = `
      <button class="btn btn-primary" onclick="window.TracesApp.toadModals.close();">Cancel</button>
    `;

    window.TracesApp.toadModals.show('Export Dataset - Toad for Oracle', body, footer, '480px');
  }

  exportCsv() {
    if (this.data.length === 0) return;
    const cols = Object.keys(this.data[0]);
    let csv = cols.join(',') + '\n';
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
    // Standard XML Spreadsheet 2003 (native Excel format supported by Excel, LibreOffice, Numbers)
    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0078D7" ss:Pattern="Solid"/>
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
    window.TracesApp.notify('Generated SQL*Loader Control (.ctl) and Data (.dat) files.', 'success');
  }

  downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    window.TracesApp.notify(`Exported ${fileName} successfully.`, 'success');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.DataGrid = DataGrid;
