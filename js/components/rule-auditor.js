/* ==========================================================================
   TOAD RULE UNIVERSE (CODE QUALITY AUDITOR) COMPONENT
   Analyzes live SQL/PLSQL code from SQL Editor or sample unit against
   Toad CodeXpert / Quest Code Analysis rules, provides line highlighting,
   auto-fixes, and metrics.
   ========================================================================== */

class RuleAuditor {
  constructor() {
    this.rules = window.TRACES_RULES ? window.TRACES_RULES.rules : [];
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

    -- Violation 4: RULE-2088 (COUNT(*) instead of EXISTS)
    IF (SELECT count(*) FROM sales_transactions WHERE customer_id = p_customer_id) > 0 THEN
        NULL;
    END IF;

EXCEPTION
    -- Violation 5: RULE-2045 (WHEN OTHERS without re-raising exception)
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('Error processing customer: ' || SQLERRM);
END process_customer_ledger;`;

    this.activeViolations = [];
    this.initElements();
    this.analyzeCode();
    this.loadRuleUniverse();
  }

  async loadRuleUniverse() {
    try {
      const resp = await fetch('assets/rule_universe.json');
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          this.fullCatalog = data;
          // Populate rule map with rich tips from asset
          data.forEach(r => {
            const ruleId = `RULE-${r.id}`;
            const existing = this.rules.find(x => x.id === ruleId);
            if (existing) {
              existing.tip = r.tip;
              existing.title = r.def || existing.title;
            }
          });
          this.renderDetail();
        }
      }
    } catch (e) {
      // offline fallback
    }
  }

  initElements() {
    this.violationsList = document.getElementById('rules-violations-list');
    this.detailTitle = document.getElementById('rule-detail-title');
    this.tipBox = document.getElementById('rule-tip-content');
    this.codeView = document.getElementById('rule-code-inspector');
  }

  loadCodeFromEditor() {
    if (window.TracesApp?.sqlEditor) {
      const q = window.TracesApp.sqlEditor.getQuery().trim();
      if (q) {
        this.currentCode = q;
        this.analyzeCode();
        window.TracesApp.notify('Código carregado do Editor SQL e analisado.', 'success');
        return;
      }
    }
    window.TracesApp.notify('Editor SQL está vazio. Usando procedimento modelo.', 'info');
    this.analyzeCode();
  }

  analyzeCode() {
    const code = this.currentCode;
    const lines = code.split('\n');
    const detected = [];

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      // RULE-2006: dbms_sql
      if (/dbms_sql\./i.test(line)) {
        detected.push({
          id: 'RULE-2006',
          title: 'Avoid DBMS_SQL, use Native Dynamic SQL (EXECUTE IMMEDIATE)',
          category: 'Maintainability',
          severity: 1,
          severityName: 'Warning',
          line: lineNum,
          lineContent: line.trim(),
          fix: line.replace(/dbms_sql\.parse\(.*customer_id\s*=\s*'\s*\|\|\s*p_customer_id.*/i, "EXECUTE IMMEDIATE 'DELETE FROM staging_ledger WHERE customer_id = :id' USING p_customer_id;")
        });
      }
      // RULE-2012: BULK COLLECT without LIMIT
      if (/BULK\s+COLLECT\s+INTO/i.test(line)) {
        const nextLines = lines.slice(idx, idx + 5).join(' ');
        if (!/LIMIT/i.test(nextLines)) {
          detected.push({
            id: 'RULE-2012',
            title: 'BULK COLLECT clause must be accompanied by LIMIT clause',
            category: 'Performance',
            severity: 0,
            severityName: 'High',
            line: lineNum,
            lineContent: line.trim(),
            fix: line + ' LIMIT 500'
          });
        }
      }
      // RULE-2185: SQL inside LOOP
      if (/(UPDATE|INSERT|DELETE)\s+/i.test(line)) {
        // check if inside loop
        const prev = lines.slice(Math.max(0, idx - 8), idx).join('\n');
        if (/FOR\s+.*\s+LOOP/i.test(prev)) {
          detected.push({
            id: 'RULE-2185',
            title: 'DML statement executed inside loop; convert to FORALL batch',
            category: 'Performance',
            severity: 0,
            severityName: 'Critical',
            line: lineNum,
            lineContent: line.trim(),
            fix: 'FORALL i IN 1..l_transactions.COUNT ' + line.trim()
          });
        }
      }
      // RULE-2045: WHEN OTHERS without RAISE
      if (/WHEN\s+OTHERS\s+THEN/i.test(line)) {
        const following = lines.slice(idx, idx + 6).join('\n');
        if (!/RAISE/i.test(following)) {
          detected.push({
            id: 'RULE-2045',
            title: 'WHEN OTHERS exception handler does not re-raise or log',
            category: 'Security & Integrity',
            severity: 0,
            severityName: 'Critical',
            line: lineNum,
            lineContent: line.trim(),
            fix: line + '\n        RAISE;'
          });
        }
      }
      // RULE-2001: SELECT *
      if (/SELECT\s+\*\s+FROM/i.test(line)) {
        detected.push({
          id: 'RULE-2001',
          title: 'Avoid SELECT * in production code, declare column list',
          category: 'Efficiency',
          severity: 2,
          severityName: 'Info',
          line: lineNum,
          lineContent: line.trim(),
          fix: line.replace('SELECT *', 'SELECT id, created_at, status')
        });
      }
    });

    this.activeViolations = detected;
    if (this.activeViolations.length > 0 && !this.activeViolations.some(v => v.id === this.selectedRuleId)) {
      this.selectedRuleId = this.activeViolations[0].id;
    }
    this.render();
  }

  render() {
    this.initElements();
    if (!this.violationsList) return;
    this.renderViolationsList();
    this.renderDetail();
    this.renderCodeView();
  }

  renderViolationsList() {
    const list = this.activeViolations.length > 0 ? this.activeViolations : this.rules;
    this.violationsList.innerHTML = `
      <div style="padding: 6px 8px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; background: #fafafa;">
        <span style="font-weight: 700; font-size: 11px;">${list.length} Violações Detectadas</span>
        <button class="btn" style="padding: 1px 6px;" onclick="window.TracesApp.ruleAuditor.loadCodeFromEditor();">Auditar Editor SQL</button>
      </div>
      <div style="overflow-y: auto; flex: 1;">
        ${list.map(rule => {
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
              <div class="violation-location">${rule.category} ${rule.line ? `(Linha ${rule.line})` : ''}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  getSeverityColor(sev) {
    if (sev === 0) return 'var(--traces-red, #ef4444)';
    if (sev === 1) return '#f59e0b';
    return '#38bdf8';
  }

  selectRule(ruleId) {
    this.selectedRuleId = ruleId;
    this.render();
  }

  renderDetail() {
    const rule = this.activeViolations.find(r => r.id === this.selectedRuleId) ||
                 this.rules.find(r => r.id === this.selectedRuleId);
    if (!rule || !this.detailTitle) return;

    this.detailTitle.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span>${rule.id}: ${rule.title}</span>
        <span style="font-size: 11px; font-weight: 700; background: ${this.getSeverityColor(rule.severity)}22; color: ${this.getSeverityColor(rule.severity)}; padding: 2px 8px; border-radius: 12px;">
          ${rule.severityName}
        </span>
      </div>
      <div style="font-size: 11px; color: #666; font-weight: 400; margin-top: 4px;">
        Toad Rule Category: ${rule.category} ${rule.line ? `| Local: Linha ${rule.line}` : ''}
      </div>
    `;

    if (this.tipBox) {
      const guidanceHtml = rule.tip || `<div>${rule.title}. Violations of this rule in Oracle Database often degrade buffer cache efficiency, cause PGA exhaustion, or introduce transaction rollback locks.</div>`;
      this.tipBox.innerHTML = `
        <div style="font-size: 11.5px; line-height: 1.5; color: #333; max-height: 220px; overflow-y: auto;">
          <div style="font-weight: 700; margin-bottom: 4px; color: #0078d7;">Toad CodeXpert Guidance:</div>
          <div>${guidanceHtml}</div>
          <div style="margin-top: 8px; display: flex; gap: 8px; position: sticky; bottom: 0; background: #fff; padding-top: 4px;">
            <button class="btn btn-primary" onclick="window.TracesApp.ruleAuditor.applyFix('${rule.id}');">Apply Auto-Fix</button>
            <button class="btn" onclick="window.TracesApp.ruleAuditor.sendCodeToEditor();">Send to SQL Editor</button>
          </div>
        </div>
      `;
    }
  }

  renderCodeView() {
    if (!this.codeView) return;
    const lines = this.currentCode.split('\n');
    const activeRule = this.activeViolations.find(v => v.id === this.selectedRuleId);

    const formatted = lines.map((l, i) => {
      const lineNum = i + 1;
      const isTarget = activeRule && activeRule.line === lineNum;
      return `<div style="${isTarget ? 'background: #fef08a; font-weight: 700; color: #111;' : ''}"><span style="display:inline-block; width:35px; color:#888; text-align:right; margin-right:12px; user-select:none;">${lineNum}</span>${this.escapeHtml(l)}</div>`;
    }).join('');

    this.codeView.innerHTML = formatted;
  }

  escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  applyFix(ruleId) {
    const v = this.activeViolations.find(item => item.id === ruleId);
    if (!v) {
      window.TracesApp.notify('Nenhuma correção automática aplicável.', 'info');
      return;
    }

    if (ruleId === 'RULE-2006') {
      this.currentCode = this.currentCode.replace(
        /v_cursor\s*:=\s*dbms_sql\.open_cursor;[\s\S]*?dbms_sql\.close_cursor\(v_cursor\);/m,
        "EXECUTE IMMEDIATE 'DELETE FROM staging_ledger WHERE customer_id = :id' USING p_customer_id;"
      );
    } else if (ruleId === 'RULE-2012') {
      this.currentCode = this.currentCode.replace(/BULK COLLECT INTO l_transactions/g, 'BULK COLLECT INTO l_transactions LIMIT p_batch_size');
    } else if (ruleId === 'RULE-2185') {
      this.currentCode = this.currentCode.replace(
        /FOR i IN 1\.\.l_transactions\.COUNT LOOP[\s\S]*?END LOOP;/m,
        "FORALL i IN 1..l_transactions.COUNT\n        UPDATE customer_stats SET total_revenue = total_revenue + l_transactions(i).amount WHERE customer_id = p_customer_id;"
      );
    } else if (ruleId === 'RULE-2045') {
      this.currentCode = this.currentCode.replace(
        /DBMS_OUTPUT\.PUT_LINE\('Error processing customer: ' \|\| SQLERRM\);/g,
        "DBMS_OUTPUT.PUT_LINE('Error: ' || SQLERRM);\n        RAISE;"
      );
    } else if (ruleId === 'RULE-2001') {
      this.currentCode = this.currentCode.replace(/SELECT\s+\*\s+FROM/g, 'SELECT transaction_id, amount, tx_date FROM');
    }

    this.analyzeCode();
    window.TracesApp.notify(`Correção automática aplicada para ${ruleId}.`, 'success');
  }

  sendCodeToEditor() {
    if (window.TracesApp?.sqlEditor) {
      window.TracesApp.switchDockView('editor');
      window.TracesApp.sqlEditor.setQuery(this.currentCode);
      window.TracesApp.notify('Código auditado enviado para o Editor SQL.', 'success');
    }
  }
}

window.RuleAuditor = RuleAuditor;
