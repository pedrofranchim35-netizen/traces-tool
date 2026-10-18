/* ==========================================================================
   CODE QUALITY, PROFILER & DEBUGGER COMPONENT
   Implements DBMS_PROFILER line-by-line execution breakdown, CodeXpert AST
   metrics (McCabe, Halstead, MI), Team Coding (TCX_OBJECTS), and Code Tester.
   ========================================================================== */

class CodeQuality {
  constructor() {
    this.container = document.getElementById('view-profiler');
    this.currentSubtab = 'profiler';
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="dba-hub-container">
        <!-- Subtabs -->
        <div class="dba-subtabs-bar">
          <button class="dba-subtab active" data-sub="profiler" onclick="window.TracesApp.codeQuality.switchSubtab('profiler');">PL/SQL Profiler (DBMS_PROFILER)</button>
          <button class="dba-subtab" data-sub="debug" onclick="window.TracesApp.codeQuality.switchSubtab('debug');">PL/SQL Debugger (DBMS_DEBUG_JDWP)</button>
          <button class="dba-subtab" data-sub="codexpert" onclick="window.TracesApp.codeQuality.switchSubtab('codexpert');">CodeXpert AST Metrics</button>
          <button class="dba-subtab" data-sub="teamcoding" onclick="window.TracesApp.codeQuality.switchSubtab('teamcoding');">Team Coding (TCX_OBJECTS)</button>
          <button class="dba-subtab" data-sub="tester" onclick="window.TracesApp.codeQuality.switchSubtab('tester');">Code Tester for Oracle</button>
        </div>

        <!-- Subtab Panes -->
        <!-- 1. PL/SQL Profiler -->
        <div class="dba-content-pane active" id="cq-pane-profiler">
          ${this.renderProfiler()}
        </div>

        <!-- 2. PL/SQL Debugger -->
        <div class="dba-content-pane" id="cq-pane-debug">
          ${this.renderDebugger()}
        </div>

        <!-- 3. CodeXpert AST Metrics -->
        <div class="dba-content-pane" id="cq-pane-codexpert">
          ${this.renderCodeXpert()}
        </div>

        <!-- 4. Team Coding -->
        <div class="dba-content-pane" id="cq-pane-teamcoding">
          ${this.renderTeamCoding()}
        </div>

        <!-- 5. Code Tester -->
        <div class="dba-content-pane" id="cq-pane-tester">
          ${this.renderCodeTester()}
        </div>
      </div>
    `;
  }

  switchSubtab(subKey) {
    this.currentSubtab = subKey;
    document.querySelectorAll('#view-profiler .dba-subtab').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-sub') === subKey);
    });
    document.querySelectorAll('#view-profiler .dba-content-pane').forEach(p => {
      p.classList.toggle('active', p.id === `cq-pane-${subKey}`);
    });
  }

  // 1. PL/SQL Profiler
  renderProfiler() {
    const rows = window.TRACES_DB.plsqlProfiler.map(r => `
      <tr style="${r.pct > 50 ? 'background: #fee2e2;' : ''}">
        <td style="text-align: right; color: #888;">${r.line}</td>
        <td style="font-family: var(--toad-font-code); color: #111;">${r.text}</td>
        <td style="text-align: right; font-weight: 600;">${r.execs}</td>
        <td style="text-align: right; font-weight: 600;">${r.totalTimeUs.toLocaleString()} µs</td>
        <td style="width: 140px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
              <div style="width: ${r.pct}%; height: 100%; background: ${r.pct > 50 ? '#ef4444' : '#3b82f6'};"></div>
            </div>
            <span style="font-size: 10px; width: 36px; text-align: right; font-weight: 700;">${r.pct}%</span>
          </div>
        </td>
      </tr>
    `).join('');

    return `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-weight: 700; font-size: 13px;">DBMS_PROFILER Line-by-Line Execution Analysis</span>
          <span style="font-size: 11px; color: #666; margin-left: 8px;">Unit: HR.CALCULATE_DEPARTMENT_BONUS</span>
        </div>
        <button class="btn btn-primary" onclick="window.TracesApp.notify('Profiler Run 42 captured into PLSQL_PROFILER_RUNS.', 'success');">Run Profiler</button>
      </div>
      <div style="flex: 1; overflow-y: auto; background: #fff; border: 1px solid #bfbfbf; margin-top: 6px;">
        <table class="meta-table" style="width: 100%;">
          <thead><tr><th style="width: 40px;">Line</th><th>PL/SQL Statement Source</th><th style="text-align: right;">Executions</th><th style="text-align: right;">Total Time (µs)</th><th>Time Distribution</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 6px 10px; font-size: 11px; color: #991b1b; border-radius: 3px; margin-top: 6px;">
        ⚠ <b>Bottleneck Alert:</b> Line 6 (<code>UPDATE hr.employees ...</code> inside the loop) accounts for <b>77.0%</b> of the entire subprogram execution time. Recommendation: Convert row-by-row loop to bulk <code>FORALL</code> statement.
      </div>
    `;
  }

  // 2. PL/SQL Debugger
  renderDebugger() {
    return `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 13px;">PL/SQL Debugger Engine: DBMS_DEBUG_JDWP (Java Debug Wire Protocol)</span>
        <div style="display: flex; gap: 6px;">
          <button class="btn" onclick="window.TracesApp.notify('Debugger attached to port 4000.', 'info');">Step Into (F7)</button>
          <button class="btn" onclick="window.TracesApp.notify('Step Over line completed.', 'info');">Step Over (F8)</button>
          <button class="btn btn-primary" onclick="window.TracesApp.notify('Resumed execution until next breakpoint.', 'success');">Continue (F9)</button>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; height: 260px; margin-top: 8px;">
        <div style="border: 1px solid #ccc; background: #fff; display: flex; flex-direction: column;">
          <div style="padding: 4px 8px; background: #e4e4e4; font-weight: 700; font-size: 11px;">Active Watches &amp; Scope Variables</div>
          <div style="flex: 1; overflow-y: auto; padding: 6px; font-family: var(--toad-font-code); font-size: 11px;">
            <div>p_dept_id = <b>90</b> (NUMBER)</div>
            <div>v_bonus = <b>3600.00</b> (NUMBER)</div>
            <div>rec.employee_id = <b>100</b> (NUMBER)</div>
            <div>rec.salary = <b>24000.00</b> (NUMBER)</div>
            <div style="color: #666; margin-top: 6px;">%ROWTYPE: rec = (first_name='Steven', last_name='King')</div>
          </div>
        </div>

        <div style="border: 1px solid #ccc; background: #fff; display: flex; flex-direction: column;">
          <div style="padding: 4px 8px; background: #e4e4e4; font-weight: 700; font-size: 11px;">Call Stack (DBMS_DEBUG)</div>
          <div style="flex: 1; overflow-y: auto; padding: 6px; font-family: var(--toad-font-code); font-size: 11px;">
            <div>1: HR.CALCULATE_DEPARTMENT_BONUS (Line 6)</div>
            <div>2: HR.PAYROLL_BATCH_PKG.RUN_DAILY (Line 142)</div>
            <div>3: __anonymous_block (Line 2)</div>
          </div>
        </div>
      </div>
    `;
  }

  // 3. CodeXpert AST Metrics
  renderCodeXpert() {
    const m = window.TRACES_DB.codeXpertMetrics;
    return `
      <div style="font-weight: 700; font-size: 13px;">Code Analysis (CodeXpert AST Abstract Syntax Tree Evaluator)</div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 8px 0;">
        <div style="background: #fff; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">
          <div style="font-size: 10px; color: #666; text-transform: uppercase;">McCabe Cyclomatic Complexity</div>
          <div style="font-size: 22px; font-weight: 800; color: #f59e0b;">${m.mccabeCyclomatic}</div>
          <div style="font-size: 10px; color: #555;">${m.mccabeRisk}</div>
        </div>
        <div style="background: #fff; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">
          <div style="font-size: 10px; color: #666; text-transform: uppercase;">Halstead Volume</div>
          <div style="font-size: 22px; font-weight: 800; color: #0078d7;">${m.halsteadVolume}</div>
          <div style="font-size: 10px; color: #555;">${m.halsteadMentalEffort}</div>
        </div>
        <div style="background: #fff; border: 1px solid #ccc; padding: 10px; border-radius: 4px;">
          <div style="font-size: 10px; color: #666; text-transform: uppercase;">Maintainability Index (MI)</div>
          <div style="font-size: 22px; font-weight: 800; color: #008000;">${m.maintainabilityIndex}</div>
          <div style="font-size: 10px; color: #008000;">${m.maintainabilityRating}</div>
        </div>
      </div>
      <div style="font-size: 11px; background: #fff; border: 1px solid #ccc; padding: 8px;">
        <b>Toad Rule Universe 5.435 Evaluation:</b> Evaluated 142 XPath syntax rules across PL/SQL packages. 3 Severe, 2 Warning, 2 Info violations found.
      </div>
    `;
  }

  // 4. Team Coding
  renderTeamCoding() {
    const rows = window.TRACES_DB.teamCoding.map(t => `
      <tr>
        <td><b>${t.schema}.${t.objectName}</b></td>
        <td>${t.objectType}</td>
        <td>${t.lockedBy}</td>
        <td>${t.lockDate}</td>
        <td>${t.vcsProvider} (${t.vcsBranch})</td>
        <td><span class="toad-conn-badge-indicator" style="background:${t.status === 'LOCKED_BY_YOU' ? '#dcfce7; color:#15803d;' : '#fee2e2; color:#b91c1c;'}">${t.status}</span></td>
        <td>
          <button class="btn" onclick="window.TracesApp.notify('Check-in committed to Git repository.', 'success');">Check-In</button>
        </td>
      </tr>
    `).join('');

    return `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 13px;">Team Coding Object Locks (TCX_OBJECTS &amp; Git Integration)</span>
        <button class="btn btn-primary" onclick="window.TracesApp.notify('Database DDL Triggers verified: Direct DDL compilation outside Toad is blocked.', 'info');">Verify DDL Triggers</button>
      </div>
      <table class="meta-table" style="width: 100%; margin-top: 6px;">
        <thead><tr><th>Object Name</th><th>Type</th><th>Locked By</th><th>Lock Timestamp</th><th>VCS Provider &amp; Branch</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // 5. Code Tester
  renderCodeTester() {
    const rows = window.TRACES_DB.codeTesterScenarios.map(s => `
      <tr>
        <td><b>${s.id}</b></td>
        <td>${s.name}</td>
        <td><code>${s.input}</code></td>
        <td><code>${s.expected}</code></td>
        <td><code>${s.actual}</code></td>
        <td><span class="toad-conn-badge-indicator" style="background:#dcfce7; color:#15803d;">PASSED</span></td>
        <td><span style="font-size:10px; color:#008000;">${s.isolation}</span></td>
      </tr>
    `).join('');

    return `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 13px;">Code Tester for Oracle (Automated PL/SQL Unit Tests)</span>
        <button class="btn btn-primary" onclick="window.TracesApp.notify('Executed 3 test scenarios with automatic ROLLBACK transaction isolation.', 'success');">Run Test Suite</button>
      </div>
      <table class="meta-table" style="width: 100%; margin-top: 6px;">
        <thead><tr><th>Test ID</th><th>Scenario Name</th><th>Input Parameters</th><th>Expected Result</th><th>Actual Result</th><th>Status</th><th>Transaction Isolation</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }
}

window.CodeQuality = CodeQuality;
