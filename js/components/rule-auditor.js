/* ==========================================================================
   TOAD RULE UNIVERSE (CODE QUALITY AUDITOR) COMPONENT
   ========================================================================== */

class RuleAuditor {
  constructor() {
    this.rules = window.TRACES_RULES.rules;
    this.selectedRuleId = 'RULE-2006';
    this.currentCode = `CREATE OR REPLACE PROCEDURE process_customer_ledger (
    p_customer_id IN NUMBER,
    p_batch_size  IN NUMBER
) AS
    TYPE t_tx_tab IS TABLE OF sales_transactions%ROWTYPE;
    l_transactions t_tx_tab;
    v_cursor INTEGER;
BEGIN
    -- Violation 1: RULE-2006 (DBMS_SQL used instead of Native Dynamic SQL)
    v_cursor := dbms_sql.open_cursor;
    dbms_sql.parse(v_cursor, 'DELETE FROM staging_ledger WHERE customer_id = ' || p_customer_id, dbms_sql.native);
    dbms_sql.close_cursor(v_cursor);

    -- Violation 2: RULE-2012 (BULK COLLECT without LIMIT clause)
    SELECT * 
    BULK COLLECT INTO l_transactions
    FROM sales_transactions
    WHERE customer_id = p_customer_id;

    -- Violation 3: RULE-2185 (N+1 SQL inside loop)
    FOR i IN 1..l_transactions.COUNT LOOP
        UPDATE customer_stats 
        SET total_revenue = total_revenue + l_transactions(i).amount 
        WHERE customer_id = p_customer_id;
    END LOOP;

EXCEPTION
    -- Violation 4: RULE-2045 (WHEN OTHERS without re-raising exception)
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Error processing customer: ' || SQLERRM);
END process_customer_ledger;`;

    this.initElements();
    this.render();
  }

  initElements() {
    this.violationsList = document.getElementById('rules-violations-list');
    this.detailTitle = document.getElementById('rule-detail-title');
    this.tipBox = document.getElementById('rule-tip-content');
    this.codeView = document.getElementById('rule-code-inspector');
  }

  render() {
    this.renderViolationsList();
    this.renderDetail();
    this.renderCodeView();
  }

  renderViolationsList() {
    this.violationsList.innerHTML = this.rules.map(rule => {
      const isSelected = this.selectedRuleId === rule.id;
      return `
        <div class="violation-card sev-${rule.severity} ${isSelected ? 'active' : ''}"
             onclick="window.TracesApp.ruleAuditor.selectRule('${rule.id}')">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span class="violation-rule-id">${rule.id}</span>
            <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: ${this.getSeverityColor(rule.severity)};">
              ${rule.severityName}
            </span>
          </div>
          <div class="violation-title">${rule.title}</div>
          <div class="violation-location">${rule.category}</div>
        </div>
      `;
    }).join('');
  }

  getSeverityColor(sev) {
    if (sev === 0) return 'var(--traces-red)';
    if (sev === 1) return '#f59e0b';
    return '#38bdf8';
  }

  selectRule(ruleId) {
    this.selectedRuleId = ruleId;
    this.render();
  }

  renderDetail() {
    const rule = this.rules.find(r => r.id === this.selectedRuleId);
    if (!rule) return;

    this.detailTitle.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span>${rule.id}: ${rule.title}</span>
        <span style="font-size: 11px; font-weight: 700; background: ${this.getSeverityColor(rule.severity)}22; color: ${this.getSeverityColor(rule.severity)}; padding: 2px 8px; border-radius: var(--radius-full);">
          ${rule.severityName}
        </span>
      </div>
      <div style="font-size: 11px; color: var(--text-muted); font-weight: 400; margin-top: 4px;">
        Toad Rule Category: ${rule.category} | XPath Query: <code>${rule.xpath}</code>
      </div>
    `;

    this.tipBox.innerHTML = `
      <p style="margin-bottom: 8px;"><strong>Rule Explanation:</strong> ${rule.description}</p>
      <p style="margin-bottom: 8px; color: var(--text-secondary);"><strong>Toad Remediation Tip:</strong> ${rule.tipText}</p>
      <div style="margin-top: 8px;">
        <span style="font-size: 11px; font-weight: 600; color: #34d399;">Recommended Autofix Pattern:</span>
        <pre style="background: var(--bg-input); border: 1px solid var(--border-default); border-radius: var(--radius-xs); padding: 8px; margin-top: 4px; font-family: var(--font-code); font-size: 11px; color: #fbbf24;">${rule.fixSuggestion}</pre>
      </div>
      <div style="margin-top: 12px; display: flex; gap: 8px;">
        <button class="btn btn-primary" onclick="window.TracesApp.ruleAuditor.applyFix('${rule.id}')">
          Apply Autofix to Code
        </button>
        <button class="btn btn-secondary" onclick="window.TracesApp.ruleAuditor.sendToWorksheet()">
          Send to SQL Worksheet (F9)
        </button>
      </div>
    `;
  }

  renderCodeView() {
    const lines = this.currentCode.split('\n');
    this.codeView.innerHTML = lines.map((line, idx) => {
      const lineNum = idx + 1;
      let isViolation = false;

      if (this.selectedRuleId === 'RULE-2006' && (lineNum === 10 || lineNum === 11 || lineNum === 12)) {
        isViolation = true;
      } else if (this.selectedRuleId === 'RULE-2012' && lineNum === 16) {
        isViolation = true;
      } else if (this.selectedRuleId === 'RULE-2185' && (lineNum >= 22 && lineNum <= 25)) {
        isViolation = true;
      } else if (this.selectedRuleId === 'RULE-2045' && (lineNum === 30 || lineNum === 31)) {
        isViolation = true;
      }

      return `
        <div style="display: flex; line-height: 20px;" class="${isViolation ? 'code-line-violation' : ''}">
          <span style="width: 36px; color: var(--text-disabled); user-select: none; text-align: right; margin-right: 14px;">${lineNum}</span>
          <span style="white-space: pre;">${this.escapeHtml(line)}</span>
        </div>
      `;
    }).join('');
  }

  applyFix(ruleId) {
    if (ruleId === 'RULE-2006') {
      this.currentCode = this.currentCode.replace(
        /v_cursor := dbms_sql\.open_cursor;[\s\S]*?dbms_sql\.close_cursor\(v_cursor\);/,
        "EXECUTE IMMEDIATE 'DELETE FROM staging_ledger WHERE customer_id = :1' USING p_customer_id;"
      );
    } else if (ruleId === 'RULE-2012') {
      this.currentCode = this.currentCode.replace(
        "BULK COLLECT INTO l_transactions",
        "BULK COLLECT INTO l_transactions LIMIT p_batch_size"
      );
    } else if (ruleId === 'RULE-2045') {
      this.currentCode = this.currentCode.replace(
        "WHEN OTHERS THEN\n        DBMS_OUTPUT.PUT_LINE('Error processing customer: ' || SQLERRM);",
        "WHEN OTHERS THEN\n        DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);\n        RAISE;"
      );
    }

    this.render();
    window.TracesApp.notify(`Applied fix for ${ruleId}. Code Quality Score recalculated to 92/100!`, 'success');
  }

  sendToWorksheet() {
    window.TracesApp.switchDockView('editor');
    window.TracesApp.sqlEditor.textarea.value = this.currentCode;
    window.TracesApp.sqlEditor.saveActiveTabContent();
    window.TracesApp.sqlEditor.updateHighlighting();
    window.TracesApp.sqlEditor.updateGutter();
    window.TracesApp.notify('Code loaded into active SQL Worksheet.', 'info');
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.RuleAuditor = RuleAuditor;
