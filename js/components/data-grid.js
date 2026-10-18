/* ==========================================================================
   DATA GRID (ORACLE TABLE DATA EDITOR) COMPONENT
   ========================================================================== */

class DataGrid {
  constructor() {
    this.data = [];
    this.tableName = 'EMPLOYEES';
    this.sortCol = null;
    this.sortAsc = true;
    this.filterText = '';
    this.page = 1;
    this.pageSize = 25;
    this.selectedRowIdx = null;

    this.initElements();
    this.bindEvents();
    
    // Initial data
    const initialData = window.TRACES_DB.schemas['HR'].tables[0].data;
    this.setData(initialData, 'EMPLOYEES');
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
    this.searchInput.addEventListener('input', (e) => {
      this.filterText = e.target.value.toLowerCase().trim();
      this.page = 1;
      this.render();
    });

    this.btnPrev.addEventListener('click', () => {
      if (this.page > 1) {
        this.page--;
        this.render();
      }
    });

    this.btnNext.addEventListener('click', () => {
      const maxPage = Math.ceil(this.getFilteredData().length / this.pageSize);
      if (this.page < maxPage) {
        this.page++;
        this.render();
      }
    });

    this.btnExport.addEventListener('click', () => this.showExportMenu());
    this.btnAddRow.addEventListener('click', () => this.addNewRow());
    this.btnDeleteRow.addEventListener('click', () => this.deleteSelectedRow());
  }

  setData(dataArray, tableName = 'QUERY_RESULT') {
    this.data = JSON.parse(JSON.stringify(dataArray));
    this.tableName = tableName;
    this.sortCol = null;
    this.sortAsc = true;
    this.page = 1;
    this.selectedRowIdx = null;
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
    if (this.data.length === 0) {
      this.tableHeader.innerHTML = '<tr><th>No Data</th></tr>';
      this.tableBody.innerHTML = '<tr><td style="padding: 24px; text-align: center; color: var(--text-muted);">No records found</td></tr>';
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
            return `
              <td ondblclick="window.TracesApp.dataGrid.editCell(${globalIdx}, '${col}', this)">
                ${isNull ? '<span class="cell-null">(null)</span>' : this.escapeHtml(String(val))}
              </td>
            `;
          }).join('')}
        </tr>
      `;
    }).join('');

    // Update Pagination UI
    this.countLabel.textContent = `Rows: ${Math.min(totalCount, startIdx + 1)}-${Math.min(totalCount, startIdx + pagedRows.length)} of ${totalCount.toLocaleString()}`;
    const maxPage = Math.max(1, Math.ceil(totalCount / this.pageSize));
    this.pageLabel.textContent = `Page ${this.page} of ${maxPage}`;
    this.btnPrev.disabled = this.page <= 1;
    this.btnNext.disabled = this.page >= maxPage;
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

  editCell(rowIdx, colKey, tdElement) {
    const originalVal = this.data[rowIdx][colKey];
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalVal === null ? '' : originalVal;
    input.style.width = '100%';
    input.style.background = 'var(--bg-input)';
    input.style.color = '#fff';
    input.style.border = '1px solid var(--traces-red)';
    input.style.borderRadius = '2px';
    input.style.padding = '2px 4px';
    input.style.fontFamily = 'var(--font-code)';
    input.style.fontSize = '11px';

    tdElement.innerHTML = '';
    tdElement.appendChild(input);
    input.focus();

    const commitEdit = () => {
      const newVal = input.value.trim();
      this.data[rowIdx][colKey] = newVal === '' ? null : (isNaN(newVal) ? newVal : Number(newVal));
      tdElement.classList.add('cell-modified');
      this.render();
      window.TracesApp.sqlEditor.transactionActive = true;
      window.TracesApp.sqlEditor.updateTransactionBadge();
      window.TracesApp.notify(`Updated row cell ${colKey}. Press COMMIT to persist.`, 'info');
    };

    input.addEventListener('blur', commitEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') this.render();
    });
  }

  addNewRow() {
    if (this.data.length === 0) return;
    const newRow = {};
    Object.keys(this.data[0]).forEach(k => newRow[k] = null);
    this.data.unshift(newRow);
    this.page = 1;
    this.render();
    window.TracesApp.notify('New empty row inserted at top.', 'info');
  }

  deleteSelectedRow() {
    if (this.selectedRowIdx === null) {
      window.TracesApp.notify('Please click a row to select it for deletion.', 'warning');
      return;
    }
    this.data.splice(this.selectedRowIdx, 1);
    this.selectedRowIdx = null;
    this.render();
    window.TracesApp.notify('Row deleted from grid.', 'info');
  }

  showExportMenu() {
    const choice = prompt('Export Data Grid\nType 1 for CSV\nType 2 for JSON\nType 3 for SQL INSERT statements:', '1');
    if (!choice) return;

    if (choice === '1') this.exportCsv();
    else if (choice === '2') this.exportJson();
    else if (choice === '3') this.exportSqlInserts();
  }

  exportCsv() {
    if (this.data.length === 0) return;
    const cols = Object.keys(this.data[0]);
    let csv = cols.join(',') + '\n';
    this.data.forEach(r => {
      csv += cols.map(c => `"${r[c] !== null ? String(r[c]).replace(/"/g, '""') : ''}"`).join(',') + '\n';
    });
    this.downloadFile(csv, `${this.tableName}_export.csv`, 'text/csv');
  }

  exportJson() {
    const jsonStr = JSON.stringify(this.data, null, 2);
    this.downloadFile(jsonStr, `${this.tableName}_export.json`, 'application/json');
  }

  exportSqlInserts() {
    if (this.data.length === 0) return;
    const cols = Object.keys(this.data[0]);
    let sql = `-- TRACES Data Pump Export: ${this.tableName}\n`;
    this.data.forEach(r => {
      const vals = cols.map(c => {
        const v = r[c];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return v;
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      sql += `INSERT INTO ${this.tableName} (${cols.join(', ')}) VALUES (${vals.join(', ')});\n`;
    });
    sql += 'COMMIT;\n';
    this.downloadFile(sql, `${this.tableName}_inserts.sql`, 'text/plain');
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
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.DataGrid = DataGrid;
