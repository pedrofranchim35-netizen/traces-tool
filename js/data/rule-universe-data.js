/* ==========================================================================
   TRACES ORACLE STUDIO - TOAD RULE UNIVERSE & PROBE ENGINE
   Extracted from Toad for Oracle 2026 R2 (RuleUniverse.xml & DatabaseProbe.txt)
   ========================================================================== */

window.TRACES_RULES = {
  version: '5.435 (Toad Rule Universe Compatible)',
  rules: [
    {
      id: 'RULE-2006',
      title: 'Use Native Dynamic SQL rather than DBMS_SQL',
      category: 'Efficiency / Performance',
      severity: 0, // Severe
      severityName: 'Severe',
      description: 'Native dynamic SQL (EXECUTE IMMEDIATE) is significantly faster, easier to maintain, and eliminates manual cursor allocations required by DBMS_SQL.',
      xpath: '//QNAME/IDENTIFIER[@dbvalue="DBMS_SQL"]',
      tipText: 'In Oracle 8i and higher, replace direct DBMS_SQL.PARSE and DBMS_SQL.OPEN_CURSOR calls with EXECUTE IMMEDIATE :sql USING :binds; Native Dynamic SQL executes directly in the PL/SQL engine.',
      fixSuggestion: 'EXECUTE IMMEDIATE \'DROP TABLE \' || dbms_assert.enquote_name(p_table);'
    },
    {
      id: 'RULE-2012',
      title: 'Use BULK COLLECT with LIMIT Clause',
      category: 'Efficiency / Performance',
      severity: 1, // Warning
      severityName: 'Warning',
      description: 'Using BULK COLLECT without a LIMIT clause can consume excessive PGA memory and cause ORA-04030 process memory exhausted errors when fetching large datasets.',
      xpath: '//BULK_COLLECT[not(following-sibling::LIMIT)]',
      tipText: 'Always paginate bulk collections using FETCH cur BULK COLLECT INTO l_records LIMIT 500; within a LOOP ... EXIT WHEN cur%NOTFOUND construct.',
      fixSuggestion: 'FETCH c_emp BULK COLLECT INTO l_emp_tbl LIMIT 500;'
    },
    {
      id: 'RULE-2045',
      title: 'Avoid Unhandled WHEN OTHERS Without RAISE',
      category: 'Code Correctness',
      severity: 0, // Severe
      severityName: 'Severe',
      description: 'An exception block with WHEN OTHERS that swallows errors or only logs to DBMS_OUTPUT without re-raising (RAISE;) can hide critical system exceptions and corrupt transactions.',
      xpath: '//EXCEPTION_HANDLER[NAME="OTHERS" and not(.//RAISE)]',
      tipText: 'Always re-raise the exception using RAISE or RAISE_APPLICATION_ERROR after logging the error stack with DBMS_UTILITY.FORMAT_ERROR_BACKTRACE.',
      fixSuggestion: 'EXCEPTION\n  WHEN OTHERS THEN\n    log_error(SQLCODE, SQLERRM);\n    RAISE;'
    },
    {
      id: 'RULE-2088',
      title: 'Close Explicit Cursors in All Execution Paths',
      category: 'Code Correctness',
      severity: 0, // Severe
      severityName: 'Severe',
      description: 'Leaving explicit cursors open can exhaust the OPEN_CURSORS database initialization parameter (ORA-01000).',
      xpath: '//OPEN_CURSOR[not(ancestor::BLOCK//CLOSE_CURSOR)]',
      tipText: 'Ensure IF c_cur%ISOPEN THEN CLOSE c_cur; END IF; is placed in clean-up sections and exception handlers, or consider using Cursor FOR Loops.',
      fixSuggestion: 'IF c_emp%ISOPEN THEN\n  CLOSE c_emp;\nEND IF;'
    },
    {
      id: 'RULE-2110',
      title: 'Specify Explicit Columns in INSERT Statements',
      category: 'Maintainability',
      severity: 1, // Warning
      severityName: 'Warning',
      description: 'Writing INSERT INTO tbl VALUES (...) without an explicit column list breaks code whenever columns are added or table structure evolves.',
      xpath: '//INSERT_STATEMENT[not(COLUMN_LIST)]',
      tipText: 'Always enumerate table columns explicitly: INSERT INTO employees (id, name, salary) VALUES (...)',
      fixSuggestion: 'INSERT INTO employees (employee_id, first_name, last_name, email) VALUES (...);'
    },
    {
      id: 'RULE-2140',
      title: 'Avoid SELECT * in Programmatic SQL',
      category: 'Efficiency / Readability',
      severity: 2, // Informational
      severityName: 'Informational',
      description: 'Using SELECT * fetches unnecessary columns over SQL*Net network buffers, increases PGA allocation, and creates tight schema coupling.',
      xpath: '//SELECT_LIST/STAR',
      tipText: 'Only project the specific columns required by your business logic.',
      fixSuggestion: 'SELECT employee_id, first_name, salary FROM employees;'
    },
    {
      id: 'RULE-2185',
      title: 'Avoid SQL Queries Inside Loops (N+1 Query Antipatern)',
      category: 'Efficiency / Performance',
      severity: 0, // Severe
      severityName: 'Severe',
      description: 'Executing single-row queries inside a FOR or WHILE loop causes context switching between the PL/SQL and SQL execution engines.',
      xpath: '//LOOP//SELECT_STATEMENT',
      tipText: 'Join the tables in a single SQL statement or use FORALL / BULK COLLECT constructs to batch database interactions.',
      fixSuggestion: 'SELECT e.*, d.department_name FROM employees e JOIN departments d ON e.department_id = d.department_id;'
    }
  ],

  // Toad Database Probe Diagnostics (from DatabaseProbe.txt)
  probeAlerts: [
    { id: 1, name: 'Async I/O Check', desc: 'Generally speaking, set DISK_ASYNC_IO = TRUE. Even when DBWR_IO_SLAVES > 0 or DB_WRITER_PROCESSES > 1.', status: 'PASS', value: 'TRUE', alertLevel: 'Low' },
    { id: 2, name: 'DBWR Proc Slave Check', desc: 'Excessive DBWR activity has been requested if setting DB_WRITER_PROCESSES > 1 and DBWR_IO_SLAVES > 0 simultaneously.', status: 'PASS', value: 'DBWR=4, Slaves=0', alertLevel: 'Low' },
    { id: 3, name: 'DBWR Proc Count High', desc: 'Number of DBWR processes should not exceed maximum host CPU count (current: 4 / 32 CPUs).', status: 'PASS', value: '4 processes', alertLevel: 'Low' },
    { id: 4, name: 'Auditing Overhead', desc: 'Auditing has been activated via AUDIT_TRAIL. Internal database operations info imposes minimal overhead.', status: 'WARN', value: 'AUDIT_TRAIL=DB,EXTENDED', alertLevel: 'Medium' },
    { id: 5, name: 'Timed OS Statistics', desc: 'Timed OS statistics activated. Ensure TIMED_STATISTICS=TRUE for Oracle performance monitoring.', status: 'PASS', value: 'TRUE', alertLevel: 'Low' },
    { id: 6, name: 'Redo Log Switch Frequency', desc: 'Redo log switch intervals should ideally occur every 15 to 30 minutes under regular OLTP workload.', status: 'PASS', value: '22.4 mins avg', alertLevel: 'Low' },
    { id: 7, name: 'Tablespace Autoextend Threshold', desc: 'Alert if any permanent tablespace exceeds 85% full without autoextensible datafiles.', status: 'WARN', value: 'SALES_2026 at 88%', alertLevel: 'High' },
    { id: 8, name: 'Invalid Database Objects', desc: 'Checks DBA_OBJECTS for STATUS = INVALID across compiled packages, triggers, views.', status: 'PASS', value: '0 Invalid Objects', alertLevel: 'Low' },
    { id: 9, name: 'Shared Pool Free Memory', desc: 'Shared pool free memory should be maintained between 10% and 30% to prevent ORA-04031.', status: 'PASS', value: '24.5% Free', alertLevel: 'Low' },
    { id: 10, name: 'Buffer Cache Hit Ratio', desc: 'Buffer cache hit ratio measures memory efficiency. Should exceed 95% in typical transactional systems.', status: 'PASS', value: '99.4%', alertLevel: 'Low' },
    { id: 11, name: 'Library Cache Hit Ratio', desc: 'Library cache hit ratio measures SQL parse reuse and bind variable efficiency. Should exceed 95%.', status: 'PASS', value: '98.9%', alertLevel: 'Low' },
    { id: 12, name: 'Unindexed Foreign Keys', desc: 'Foreign key constraints without corresponding child indexes can cause full table locks on parent table DML.', status: 'PASS', value: 'All 42 FKs Indexed', alertLevel: 'Low' }
  ]
};
