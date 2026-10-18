/* ==========================================================================
   TRACES AI COPILOT COMPONENT
   ========================================================================== */

class TracesCopilot {
  constructor() {
    this.isOpen = false;
    this.messages = [
      {
        role: 'assistant',
        text: `Hello Pedro! I am **TRACES AI Copilot**, your native Oracle Database & PL/SQL engineering assistant.\n\nI can analyze execution plans, compose high-performance SQL, refactor procedures according to Toad's Rule Universe, or diagnose wait events. How can I assist you today?`,
        code: null
      }
    ];

    this.initElements();
    this.bindEvents();
    this.renderMessages();
  }

  initElements() {
    this.drawer = document.getElementById('copilot-drawer');
    this.btnToggle = document.getElementById('btn-toggle-copilot');
    this.btnClose = document.getElementById('btn-close-copilot');
    this.messagesContainer = document.getElementById('copilot-messages-container');
    this.textarea = document.getElementById('copilot-input-textarea');
    this.btnSend = document.getElementById('copilot-btn-send');
    this.promptChips = document.querySelectorAll('.prompt-chip');
  }

  bindEvents() {
    this.btnToggle.addEventListener('click', () => this.toggleDrawer());
    this.btnClose.addEventListener('click', () => this.closeDrawer());

    this.btnSend.addEventListener('click', () => this.sendMessage());
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.promptChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        const promptText = e.currentTarget.textContent.trim();
        this.textarea.value = promptText;
        this.sendMessage();
      });
    });
  }

  toggleDrawer() {
    this.isOpen = !this.isOpen;
    this.drawer.classList.toggle('open', this.isOpen);
    if (this.isOpen) {
      this.textarea.focus();
    }
  }

  closeDrawer() {
    this.isOpen = false;
    this.drawer.classList.remove('open');
  }

  sendMessage() {
    const text = this.textarea.value.trim();
    if (!text) return;

    // User Message
    this.messages.push({
      role: 'user',
      text: text,
      code: null
    });

    this.textarea.value = '';
    this.renderMessages();

    // AI Response generation based on keywords
    setTimeout(() => {
      this.generateAiResponse(text);
    }, 400);
  }

  generateAiResponse(userInput) {
    const query = userInput.toLowerCase();
    let replyText = '';
    let replyCode = null;

    if (query.includes('top paying') || query.includes('highest salary')) {
      replyText = `Here is an optimized Oracle SQL query utilizing the \`DENSE_RANK()\` analytic window function to retrieve the highest earners per department:`;
      replyCode = `SELECT 
    department_id,
    department_name,
    first_name || ' ' || last_name AS employee_name,
    salary,
    dept_rank
FROM (
    SELECT 
        e.department_id,
        d.department_name,
        e.first_name,
        e.last_name,
        e.salary,
        DENSE_RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS dept_rank
    FROM 
        hr.employees e
        JOIN hr.departments d ON e.department_id = d.department_id
)
WHERE dept_rank <= 3
ORDER BY department_id, dept_rank;`;
    } else if (query.includes('full table scan') || query.includes('slow') || query.includes('explain')) {
      replyText = `Looking at your execution plan on **HR.EMPLOYEES**: the Cost 24 bottleneck is caused by an unindexed \`salary >= 6000\` filter predicate that scans all 24 blocks. Adding a composite index eliminates the full table scan:`;
      replyCode = `-- Create B-Tree composite index
CREATE INDEX hr.emp_dept_sal_ix 
ON hr.employees (department_id, salary) 
TABLESPACE users;

-- Or add optimizer hint in query:
SELECT /*+ INDEX(e emp_dept_sal_ix) */ * FROM hr.employees e;`;
    } else if (query.includes('billing') || query.includes('package')) {
      replyText = `Here is a production-ready Oracle PL/SQL package specification and body following Toad Rule Universe standards (Native dynamic SQL, BULK COLLECT with LIMIT, explicit cursor handling):`;
      replyCode = `CREATE OR REPLACE PACKAGE sales_admin.billing_engine_pkg AS
    PROCEDURE process_monthly_settlements(
        p_batch_size IN NUMBER DEFAULT 500,
        p_processed  OUT NUMBER
    );
END billing_engine_pkg;
/

CREATE OR REPLACE PACKAGE BODY sales_admin.billing_engine_pkg AS
    PROCEDURE process_monthly_settlements(
        p_batch_size IN NUMBER DEFAULT 500,
        p_processed  OUT NUMBER
    ) IS
        CURSOR c_pending IS 
            SELECT tx_id, customer_id, amount 
            FROM sales_transactions 
            WHERE status = 'PENDING';
        
        TYPE t_tx_list IS TABLE OF c_pending%ROWTYPE;
        l_batch t_tx_list;
    BEGIN
        p_processed := 0;
        OPEN c_pending;
        LOOP
            FETCH c_pending BULK COLLECT INTO l_batch LIMIT p_batch_size;
            EXIT WHEN l_batch.COUNT = 0;

            FORALL i IN 1..l_batch.COUNT
                UPDATE sales_transactions
                SET status = 'SETTLED'
                WHERE tx_id = l_batch(i).tx_id;

            p_processed := p_processed + l_batch.COUNT;
            COMMIT;
        END LOOP;
        CLOSE c_pending;
    EXCEPTION
        WHEN OTHERS THEN
            IF c_pending%ISOPEN THEN CLOSE c_pending; END IF;
            RAISE;
    END process_monthly_settlements;
END billing_engine_pkg;
/`;
    } else {
      replyText = `Understood. Analyzing your request against Oracle Database 23ai schema \`${window.TRACES_DB.activeSchema}\`.\n\nYou can run this in your worksheet with F9 or inspect its cost in the Explain Plan tool.`;
      replyCode = `SELECT 
    owner, object_name, object_type, status, last_ddl_time
FROM 
    all_objects
WHERE 
    owner = '${window.TRACES_DB.activeSchema}'
ORDER BY 
    object_type, object_name;`;
    }

    this.messages.push({
      role: 'assistant',
      text: replyText,
      code: replyCode
    });

    this.renderMessages();
  }

  renderMessages() {
    this.messagesContainer.innerHTML = this.messages.map((m, idx) => `
      <div class="chat-bubble ${m.role}">
        <div>${this.formatMarkdown(m.text)}</div>
        ${m.code ? `
          <div class="bubble-code-block">
            <pre style="margin: 0; font-family: inherit; font-size: inherit;">${this.escapeHtml(m.code)}</pre>
            <div class="code-actions-bar">
              <button class="code-action-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(m.code)}')); window.TracesApp.notify('SQL copied to clipboard', 'info');">
                Copy
              </button>
              <button class="code-action-btn" onclick="window.TracesApp.sqlEditor.textarea.value = decodeURIComponent('${encodeURIComponent(m.code)}'); window.TracesApp.sqlEditor.saveActiveTabContent(); window.TracesApp.sqlEditor.updateHighlighting(); window.TracesApp.switchDockView('editor'); window.TracesApp.notify('SQL inserted into active Worksheet', 'success');">
                Insert into Worksheet
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `).join('');

    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  formatMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 3px; font-family: var(--font-code); color: #38bdf8;">$1</code>')
      .replace(/\n/g, '<br/>');
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.TracesCopilot = TracesCopilot;
