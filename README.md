# TOAD for Oracle (DBA Suite & Xpert Edition) - Re-engineered with TRACES

> **Authentic Toad for Oracle Desktop Layout & All Functional Capabilities**
> Preserving the exact UI, toolbars, menus, grids, and technical nuances across all editions (Base, Pro, Xpert, DBA Edition, and DBA Suite), powered by the **TRACES** brand logo.

---

## 🎯 Architecture & Visual Parity

The application matches the layout and behavior of **Toad for Oracle** desktop down to every toolbar button, menu dropdown, MDI tab, and dialog:

1. **Titlebar & Brand Logo**:
   - Window title: `Toad for Oracle - [Editor (SYSTEM@sales_prod.db.corp)]`
   - Official **TRACES** logo replacing the original Toad frog emblem.
   - Classic Windows window controls (Minimize, Maximize, Close).

2. **Connection Color Coding Band & Read-Only Safety Mode**:
   - Environment color band across the top of windows (Red `#ef4444` for PROD, Green `#10b981` for DEV, Amber `#f59e0b` for UAT).
   - Read-Only Mode toggle blocking DML/DDL execution and grid edits.

3. **Classic Windows Dropdown Menus**:
   - Interactive dropdown menus with icons, shortcuts, separators, and flyout submenus:
     - `File` `Edit` `Search` `View` `Database` `Schema` `Editor` `Debug` `Session` `Tools` `Window` `Help`

4. **Multi-Row Desktop Toolbars**:
   - **Row 1 (Application)**: Connect, Disconnect, Connection Selector, Commit (F11), Rollback (Shift+F11), Editor, Schema Browser, Session Browser, Database Probe, Rule Universe, Spotlight, Modeler, DBA Hub, SQL Optimizer, Automation, Profiler, Traces AI Copilot.
   - **Row 2 (Editor)**: Execute Statement (F9), Execute Script (F5), Execute at Cursor (Ctrl+Enter), Stop/Cancel, Explain Plan (Ctrl+E), Format (Ctrl+Shift+F), Clear, Describe (F4), SQL Recall (F8), Bind Variables (`:bind`), Substitution Variables (`&subst`), AutoCommit toggle.

5. **MDI Window Tab Bar**:
   - `[ 📝 Editor ]` `[ 🗄 Schema Browser ]` `[ 🌳 Explain Plan ]` `[ 👥 Session Browser ]` `[ 🩺 Database Probe ]` `[ 🛡 Rule Universe ]` `[ 💡 Spotlight ]` `[ 📐 Data Modeler ]` `[ 🏛 DBA Hub ]` `[ ⚡ SQL Optimizer ]` `[ ⚙ Automation ]` `[ ⏱ Profiler ]`

---

## 🚀 The 8 Consolidated Functional Modules

### 1. Desenvolvimento, Edição e Qualidade de Código
- **Editor**: F9 (OCI cursor single-statement grid), F5 (SQL*Plus engine script output), Ctrl+Enter (statement at cursor).
- **Bind Variables Modal (`:var`)**: Intercepts queries, opens typing modal (VARCHAR2, NUMBER, DATE, CLOB, REFCURSOR), session cache, Shared Pool Cursor Sharing notice.
- **Substitution Variables (`&var` and `&&var`)**: Intercepts literal text replacement with session `DEFINE`/`UNDEFINE`.
- **Code Folding & Beautifier**: Formats keywords and clauses based on `FmtPlus.opt` rules (Ctrl+Shift+F).
- **PL/SQL Debugger**: Supports `DBMS_DEBUG_JDWP` and `DBMS_DEBUG` with watches, call stack, breakpoints, and `%ROWTYPE` inspection.
- **PL/SQL Profiler**: `DBMS_PROFILER` line-by-line runtime analysis table with execution counts, microsecond durations, and loop bottleneck detection.
- **Code Analysis (CodeXpert)**: XPath AST analysis calculating **McCabe Cyclomatic Complexity**, **Halstead Volume**, and **Maintainability Index (MI)** with severity categories.
- **Team Coding**: VCS provider integration (Git / GitLab) with `TCX_OBJECTS` lock tables and DDL trigger interception.
- **Code Tester for Oracle**: Automated unit test scenarios with transaction isolation via automatic `ROLLBACK`.

### 2. Navegação, Manipulação de Dados e Modelagem
- **Schema Browser**: Dropdown, Tabbed, Treeview; RHS tabs: Columns, Indexes, Constraints, Triggers, Data, Script (DDL with STORAGE clauses), Grants, Dependencies, Partitions.
- **Data Grid**: ROWID direct editability, OCI Array Buffer (500 records/fetch batching), LOB/XML/JSON viewer, Pivot Grid & Quick Charts.
- **Query Builder & ER Diagrammer**: Drag-and-drop table entities with visual Foreign Key connectors, WHERE/HAVING criteria, and dynamic SQL query generation.
- **Master-Detail Browser**: Cascading parent-child table link (DEPARTMENTS -> EMPLOYEES) with synchronized filtering and editing.
- **Import / Export Wizards**: Export Dataset (.xlsx, CSV, XML, JSON, INSERT, MERGE, SQL*Loader) and Import Table Data with commit mode batching.
- **Data Generator**: Generates thousands of realistic rows respecting FK and CHECK constraints.

### 3. Administração de Banco de Dados (Módulo DBA)
- **Database Browser**: Multi-instance status, V$OPTION, V$PARAMETER / SPFILE parameter editor with memory/spfile scope, alert.log viewer.
- **Session Browser**: V$SESSION, V$LOCK, V$SESSION_LONGOPS, `ALTER SYSTEM KILL SESSION IMMEDIATE` or `DISCONNECT POST_TRANSACTION`, SQL Trace Event 10046 (Levels 1, 4, 8, 12).
- **Tablespace Map & High Water Mark (HWM)**: Visual extent block grid (DBA_EXTENTS) calculating HWM and safe datafile resize reduction.
- **Segment Advisor & Rebuild**: Finds wasted space below HWM and fragmented index leaf rows with bulk `ALTER TABLE MOVE` and `ALTER INDEX REBUILD ONLINE NOLOGGING` scripts.
- **Undo Advisor & Flashback Tools**: UNDO retention vs V$UNDOSTAT block rate sizing, ORA-01555 alert, Flashback Recyclebin (`DBA_RECYCLEBIN`) with `PURGE` and `UNDROP`.
- **Compare Tools**: Schema Compare (live/snapshot diff with topological sync script), Data Compare (row PK diff with INSERT/UPDATE/DELETE), Database Compare.
- **LogMiner Interface**: `DBMS_LOGMNR` GUI displaying SCN, user, timestamp, `SQL_REDO`, and `SQL_UNDO` side-by-side.
- **Utilities**: Data Pump Wizard, Legacy Exp/Imp, RMAN Template Generator, SQL*Loader Wizard, TKProf Wizard, Full DDL script extractor.

### 4. Alta Disponibilidade, Replicação, Internals e Segurança
- **Data Guard Manager**: Primary / Standby monitoring, Transport Lag, Apply Lag, Archive Gaps, MRP process status.
- **RAC & ASM Diagnostics**: Multi-instance GV$ view switch, Global Cache latency, ASM Diskgroups (DATA, RECO) with rebalance power slider, Exadata Smart Scan and Flash Cache offloading metrics.
- **Security**: Audit Manager (DBA_AUDIT_TRAIL, DBMS_FGA), Virtual Private Database (VPD / DBMS_RLS), Dynamic Data Redaction (`DBMS_REDACT`), Sensitive Column Search (LGPD/GDPR regex scan for `*CPF*`, `*CARD*`, `*SALARIO*`, `*EMAIL*`), Oracle Wallet / TDE Keystore, User/Role Clone (`Create Like`).
- **AWR / ADDM / ASH Browser**: Snapshots, Top SQL, ADDM recommendations, and Oracle Diagnostics Pack licensing advisory.

### 5. Otimização de Performance e Tuning
- **Explain Plan (Ctrl+E)**: Plan tree, CBO cost, cardinality, I/O cost, CPU cost, and Bind Peeking caveat note.
- **AutoTrace**: Real session statistics (V$MYSTAT: Consistent Gets, Physical Reads, DB Block Gets, Redo Size, SQL*Net roundtrips).
- **Quest SQL Optimizer**: Relational query rewrites with Optimizer Hints (`/*+ INDEX */`, `/*+ USE_HASH */`, `/*+ LEADING */`), batch test benchmark matrix, and **SQL Plan Baselines (`DBMS_SPM`)** creation.

### 6. Automação, Utilitários Ocultos e Produtividade
- **Automation Designer (App Designer)**: Visual workflow canvas with drag-and-drop action blocks (Execute Script, Export Dataset, Compare Schemas, Gather Stats, Health Check, Email, Loops) and Windows Task Scheduler CLI parameter (`Toad.exe -a "App1"`).
- **Schedulers**: DBMS_SCHEDULER and DBMS_JOB manager (Jobs, Programs, Schedules, Chains).
- **TNS Names Editor & TNS Ping**: Visual `tnsnames.ora` editor with syntax validation and live ping latency testing.
- **SQL Recall (F8)**: `SavedSQL.dat` history and Named SQL favorites with instant pasting to editor.
- **Toad Describe (F4)**: Instant floating object inspector resolving synonyms, tables, packages, grants, and dependencies.
- **Toad Script Runner (TSR) & Quest ScriptRunner (QSR)**: Lightweight standalone execution engine with SQL*Plus compatibility.
- **Spool SQL**: Live real-time logger of internal OCI SQL Toad commands.

### 7. Variáveis Globais, Conexão e Nuances de Configuração
- **Toad Options Dialog**: Threaded Queries toggle & background session caveats, Commit/Rollback behaviour on exit (Prompt, Auto-commit, Auto-rollback), OCI Array Buffer size (500 records), Direct Connect (EZCONNECT TCP/IP) vs TNS/LDAP with oci.dll note, Color Coding Band picker, Read-Only Mode toggle, AppData directory paths (`%APPDATA%\Quest Software\Toad for Oracle\User Files`).

### 8. Ferramentas Acopladas da Suíte (Toad DBA Suite / Xpert)
- **Spotlight on Oracle**: Full-screen interactive animated NOC topology showing client connections, background processes (PMON, SMON, DBWn, LGWR, ARCn, CKPT), SGA (Buffer Cache, Shared Pool, Redo Log Buffer), PGA, disk I/O queues, and baseline alarms.
- **Toad Data Modeler**: Visual ER diagramming canvas with draggable entities, foreign key relationship connectors, and schema reverse-engineering.
- **Quest ScriptRunner (QSR)**: Dedicated lightweight script runner.

---

## 🌐 Running Locally

The local server is running on port `3033`:
```bash
cd /Users/pedrofranchim/.gemini/antigravity-ide/scratch/traces-oracle
python3 -m http.server 3033
```
Access via: **`http://localhost:3033/index.html`**
