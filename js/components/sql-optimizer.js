/* ==========================================================================
   QUEST SQL OPTIMIZER FOR ORACLE
   Implements SQL Rewrite variations, Optimizer Hints exploration,
   Batch Test Runs benchmark matrix, and SQL Plan Baselines (DBMS_SPM).
   ========================================================================== */

class SqlOptimizer {
  constructor() {
    this.container = document.getElementById('view-optimizer');
    this.render();
  }

  render() {
    if (!this.container) return;

    const alternatives = window.TRACES_DB.sqlOptimizer;
    const rows = alternatives.map(a => `
      <tr class="${a.winner ? 'winner-row' : ''}">
        <td><b>${a.id}</b></td>
        <td>${a.label}</td>
        <td><code style="font-family: var(--toad-font-code); color: #800080;">${a.hint}</code></td>
        <td style="text-align: right; font-weight: 600;">${a.cost}</td>
        <td style="text-align: right; font-weight: 700; color: ${a.winner ? '#008000' : '#111'};">${a.elapsedMs} ms</td>
        <td style="text-align: right;">${a.cpuSec}s</td>
        <td style="text-align: right;">${a.logicalReads.toLocaleString()}</td>
        <td>
          ${a.winner ? '<span class="toad-conn-badge-indicator" style="background:#dcfce7; color:#15803d;">BEST ALTERNATIVE</span>' : '<span style="color:#666;">Evaluated</span>'}
        </td>
      </tr>
    `).join('');

    this.container.innerHTML = `
      <div class="optimizer-suite-container">
        <!-- Top Toolbar -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #d4d4d4; padding-bottom: 8px;">
          <div>
            <span style="font-weight: 700; font-size: 14px; color: #0078d7;">Quest SQL Optimizer for Oracle (Xpert / DBA Edition)</span>
            <div style="font-size: 11px; color: #555;">Evaluates semantic rewrites, hint combinations, and fixes execution plans without code changes.</div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn" onclick="window.TracesApp.notify('Generated 14 candidate rewrites using relational equivalence rules.', 'info');">Generate Rewrites</button>
            <button class="btn btn-primary" onclick="window.TracesApp.sqlOptimizer.runBatchTest();">Run Batch Test Benchmark</button>
            <button class="btn btn-primary" style="background: #008000;" onclick="window.TracesApp.sqlOptimizer.createBaseline();">Create SQL Plan Baseline (DBMS_SPM)</button>
          </div>
        </div>

        <!-- Original Query vs Rewritten Candidate -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; height: 160px;">
          <div style="border: 1px solid #ccc; background: #fff; display: flex; flex-direction: column;">
            <div style="padding: 4px 8px; background: #e4e4e4; font-weight: 700; font-size: 11px;">Original SQL Query (Cost: 24 | Elapsed: 38.4 ms)</div>
            <pre style="flex: 1; margin: 0; padding: 8px; font-family: var(--toad-font-code); font-size: 11px; overflow: auto; background: #fafafa;">SELECT e.employee_id, e.first_name, e.salary, d.department_name
FROM hr.employees e
JOIN hr.departments d ON e.department_id = d.department_id
WHERE e.salary >= 6000;</pre>
          </div>

          <div style="border: 1px solid #008000; background: #fff; display: flex; flex-direction: column;">
            <div style="padding: 4px 8px; background: #dcfce7; color: #15803d; font-weight: 700; font-size: 11px;">Winning Rewrite: ALT-3 (61% Faster | 70% Less Logical Reads)</div>
            <pre style="flex: 1; margin: 0; padding: 8px; font-family: var(--toad-font-code); font-size: 11px; overflow: auto; background: #f0fdf4;">SELECT /*+ INDEX_FFS(e EMP_EMP_ID_PK) PARALLEL(e 2) */
    e.employee_id, e.first_name, e.salary, d.department_name
FROM hr.employees e
JOIN hr.departments d ON e.department_id = d.department_id
WHERE e.salary >= 6000;</pre>
          </div>
        </div>

        <!-- Benchmark Matrix -->
        <div style="font-weight: 700; font-size: 12px; margin-top: 4px;">Batch Test Benchmark Matrix (Terminated if slower than original)</div>
        <div style="flex: 1; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf;">
          <table class="rewrite-alternatives-table">
            <thead>
              <tr>
                <th>Rewrite ID</th>
                <th>Transformation Strategy</th>
                <th>Optimizer Hint Injected</th>
                <th style="text-align: right;">CBO Cost</th>
                <th style="text-align: right;">Elapsed Time</th>
                <th style="text-align: right;">CPU Time</th>
                <th style="text-align: right;">Consistent Gets</th>
                <th>Classification</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <!-- Virtual Indexes & SPM info -->
        <div style="background: #e5f1fb; border: 1px solid #b8d6f5; padding: 8px; font-size: 11px; border-radius: 3px;">
          ℹ <b>Plan Control (SQL Plan Baselines):</b> Clicking <b>Create SQL Plan Baseline</b> calls <code>DBMS_SPM.LOAD_PLANS_FROM_CURSOR_CACHE</code>, instructing the Oracle Cost-Based Optimizer to enforce the ALT-3 plan forever, even across application software releases without touching application code.
        </div>
      </div>
    `;
  }

  runBatchTest() {
    window.TracesApp.notify('Executing batch test on Oracle Database 23ai RAC...', 'info');
    setTimeout(() => {
      window.TracesApp.notify('Batch run complete: ALT-3 won with 14.8 ms elapsed time (61% speedup).', 'success');
    }, 800);
  }

  createBaseline() {
    window.TracesApp.notify('SQL Plan Baseline created: SQL_HANDLE_89f0291a locked in DBMS_SPM.', 'success');
  }
}

window.SqlOptimizer = SqlOptimizer;
