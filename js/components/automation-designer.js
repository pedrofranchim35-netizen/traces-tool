/* ==========================================================================
   TOAD AUTOMATION DESIGNER (APP DESIGNER)
   Visual workflow orchestrator for DBA and ETL tasks:
   Action blocks: Execute Script, Export Dataset, Compare Schemas, Gather Stats,
   Health Check, Send Email, While Loop, Iterator, and Windows Task Scheduler CLI.
   ========================================================================== */

class AutomationDesigner {
  constructor() {
    this.container = document.getElementById('view-automation');
    this.workflowNodes = [
      { id: 'step-1', icon: '📝', title: '1. Execute Maintenance Script', desc: 'Run purge_temp_tables.sql on SYSTEM@PROD-RAC01' },
      { id: 'step-2', icon: '⚖', title: '2. Compare Schemas', desc: 'Compare PROD.HR against UAT.HR and alert on drift' },
      { id: 'step-3', icon: '📊', title: '3. Gather Optimizer Statistics', desc: 'DBMS_STATS.GATHER_SCHEMA_STATS(ownname => \'HR\', estimate_percent => AUTO)' },
      { id: 'step-4', icon: '📦', title: '4. Export Dataset to Delimited Text', desc: 'Export sales_transactions to S3/SFTP storage' },
      { id: 'step-5', icon: '🩺', title: '5. Database Health Check', desc: 'Verify 70 database probe diagnostics and tablespaces' },
      { id: 'step-6', icon: '✉', title: '6. Send Status Email Report', desc: 'SMTP Notification to dba-team@corp.internal' }
    ];

    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="automation-container">
        <!-- Palette -->
        <div class="automation-palette">
          <div style="font-weight: 700; font-size: 11px; margin-bottom: 4px; color: #0078d7;">
            Action Palette (Drag into App)
          </div>
          <div class="action-palette-item" onclick="window.TracesApp.automationDesigner.addNode('Execute Script', '📝');">
            <span>📝</span>
            <span>Execute SQL Script</span>
          </div>
          <div class="action-palette-item" onclick="window.TracesApp.automationDesigner.addNode('Export Dataset', '📦');">
            <span>📦</span>
            <span>Export Dataset</span>
          </div>
          <div class="action-palette-item" onclick="window.TracesApp.automationDesigner.addNode('Compare Schemas', '⚖');">
            <span>⚖</span>
            <span>Compare Schemas</span>
          </div>
          <div class="action-palette-item" onclick="window.TracesApp.automationDesigner.addNode('Gather Statistics', '📊');">
            <span>📊</span>
            <span>Gather Statistics</span>
          </div>
          <div class="action-palette-item" onclick="window.TracesApp.automationDesigner.addNode('Health Check', '🩺');">
            <span>🩺</span>
            <span>Health Check</span>
          </div>
          <div class="action-palette-item" onclick="window.TracesApp.automationDesigner.addNode('Send Email', '✉');">
            <span>✉</span>
            <span>Send Email (SMTP)</span>
          </div>
          <div class="action-palette-item" onclick="window.TracesApp.automationDesigner.addNode('If..Then..Else', '🔀');">
            <span>🔀</span>
            <span>If..Then..Else Logic</span>
          </div>
          <div class="action-palette-item" onclick="window.TracesApp.automationDesigner.addNode('While Loop', '🔁');">
            <span>🔁</span>
            <span>While / Iterator Loop</span>
          </div>

          <div style="margin-top: auto; padding-top: 10px; border-top: 1px solid #ccc; font-size: 10px; color: #555;">
            <b>CLI Scheduling Macro:</b><br>
            <code>Toad.exe -a "DailyMaintApp"</code>
          </div>
        </div>

        <!-- Canvas -->
        <div class="automation-workflow-canvas" id="automation-canvas">
          <div style="width: 100%; max-width: 600px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div>
              <span style="font-weight: 700; font-size: 13px;">App: Daily_Production_Maintenance_Workflow</span>
              <span class="toad-conn-badge-indicator" style="background:#e0f2fe; color:#0369a1; margin-left: 8px;">6 STEPS</span>
            </div>
            <div>
              <button class="btn btn-primary" onclick="window.TracesApp.automationDesigner.runWorkflow();">Run Workflow Now</button>
              <button class="btn" onclick="window.TracesApp.automationDesigner.exportTaskScheduler();">Export CLI Task</button>
            </div>
          </div>

          <div id="workflow-nodes-container" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            ${this.renderNodes()}
          </div>
        </div>
      </div>
    `;
  }

  renderNodes() {
    return this.workflowNodes.map((n, i) => `
      <div class="workflow-node">
        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 12px; color: #0078d7;">
          <span>${n.icon} ${n.title}</span>
          <span style="font-size: 10px; color: #008000;">READY</span>
        </div>
        <div style="font-size: 11px; color: #555; margin-top: 4px;">${n.desc}</div>
      </div>
      ${i < this.workflowNodes.length - 1 ? '<div class="workflow-arrow-down"></div>' : ''}
    `).join('');
  }

  addNode(title, icon) {
    this.workflowNodes.push({
      id: `step-${Date.now()}`,
      icon: icon,
      title: `${this.workflowNodes.length + 1}. ${title}`,
      desc: `Configured step parameters on active Oracle connection.`
    });
    this.render();
    window.TracesApp.notify(`Added ${title} step to workflow.`, 'success');
  }

  runWorkflow() {
    window.TracesApp.notify('Running Automation App: Daily_Production_Maintenance_Workflow...', 'info');
    setTimeout(() => {
      window.TracesApp.notify('Workflow completed: 6 actions executed with 0 errors.', 'success');
    }, 1200);
  }

  exportTaskScheduler() {
    prompt('Windows Task Scheduler / cron execution command line:', 'C:\\Program Files\\Quest Software\\Toad for Oracle 2026\\Toad.exe -a "Daily_Production_Maintenance_Workflow"');
  }
}

window.AutomationDesigner = AutomationDesigner;
