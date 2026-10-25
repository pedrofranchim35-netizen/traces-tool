/* ==========================================================================
   TRACES TOAD FOR ORACLE - ENTERPRISE ORACLE AUTOCOMPLETE DICTIONARY
   Massive library with 2201+ keywords, PL/SQL constructs, built-in functions,
   DBMS/UTL packages, Data Dictionary (DBA/ALL/USER), Dynamic Views (V$/GV$),
   Database Parameters, Wait Events, Oracle Columns, Optimizer Hints, Data Types,
   Privileges, and Code Snippets.
   ========================================================================== */

window.TRACES_ORACLE_DICTIONARY = [
  {
    "text": "sel*",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "SELECT * FROM "
  },
  {
    "text": "selcount",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "SELECT COUNT(*) FROM "
  },
  {
    "text": "seltop10",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "SELECT * FROM  FETCH FIRST 10 ROWS ONLY;"
  },
  {
    "text": "ins",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "INSERT INTO  () VALUES ();"
  },
  {
    "text": "upd",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "UPDATE  SET  WHERE ;"
  },
  {
    "text": "del",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "DELETE FROM  WHERE ;"
  },
  {
    "text": "merge",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "MERGE INTO target_table t\nUSING source_table s ON (t.id = s.id)\nWHEN MATCHED THEN\n    UPDATE SET t.col = s.col\nWHEN NOT MATCHED THEN\n    INSERT (id, col) VALUES (s.id, s.col);"
  },
  {
    "text": "cur",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "CURSOR c_cur IS SELECT  FROM ;"
  },
  {
    "text": "curfor",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "FOR r IN (SELECT * FROM ) LOOP\n    \nEND LOOP;"
  },
  {
    "text": "bulkcoll",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "FETCH c_cur BULK COLLECT INTO l_list LIMIT 500;"
  },
  {
    "text": "anon",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "DECLARE\n    v_db VARCHAR2(100);\nBEGIN\n    SELECT ora_database_name INTO v_db FROM dual;\n    DBMS_OUTPUT.PUT_LINE('Conectado a: ' || v_db);\nEXCEPTION\n    WHEN OTHERS THEN\n        DBMS_OUTPUT.PUT_LINE('Erro ORA: ' || SQLERRM);\nEND;\n/"
  },
  {
    "text": "crproc",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "CREATE OR REPLACE PROCEDURE pr_exemplo (\n    p_id     IN NUMBER,\n    p_status OUT VARCHAR2\n)\nIS\nBEGIN\n    p_status := 'OK';\nEXCEPTION\n    WHEN OTHERS THEN\n        p_status := 'ERRO: ' || SQLERRM;\nEND pr_exemplo;\n/"
  },
  {
    "text": "crfunc",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "CREATE OR REPLACE FUNCTION fn_calculo (\n    p_val IN NUMBER\n)\nRETURN NUMBER\nDETERMINISTIC\nIS\n    v_res NUMBER;\nBEGIN\n    v_res := NVL(p_val, 0) * 1.1;\n    RETURN v_res;\nEND fn_calculo;\n/"
  },
  {
    "text": "crpkg",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "CREATE OR REPLACE PACKAGE pkg_exemplo AS\n    PROCEDURE execute_task(p_param IN VARCHAR2);\nEND pkg_exemplo;\n/\n\nCREATE OR REPLACE PACKAGE BODY pkg_exemplo AS\n    PROCEDURE execute_task(p_param IN VARCHAR2) IS\n    BEGIN\n        DBMS_OUTPUT.PUT_LINE('Executando: ' || p_param);\n    END execute_task;\nEND pkg_exemplo;\n/"
  },
  {
    "text": "crtab",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "CREATE TABLE  (\n    id          NUMBER(10) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n    name        VARCHAR2(100) NOT NULL,\n    created_at  DATE DEFAULT SYSDATE\n) TABLESPACE users;"
  },
  {
    "text": "crview",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "CREATE OR REPLACE VIEW vw_exemplo AS\nSELECT * FROM  WITH READ ONLY;"
  },
  {
    "text": "crix",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "CREATE INDEX ix_exemplo ON  () TABLESPACE users ONLINE NOLOGGING;"
  },
  {
    "text": "ts_usage",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "SELECT tablespace_name, ROUND(used_percent, 2) AS pct_used FROM dba_tablespace_usage_metrics ORDER BY pct_used DESC;"
  },
  {
    "text": "blocking_locks",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "SELECT s1.sid AS blocker_sid, s1.username AS blocker_user, s2.sid AS blocked_sid, s2.username AS blocked_user FROM v$lock l1, v$lock l2, v$session s1, v$session s2 WHERE l1.block = 1 AND l2.request > 0 AND l1.id1 = l2.id1 AND l1.id2 = l2.id2 AND l1.sid = s1.sid AND l2.sid = s2.sid;"
  },
  {
    "text": "kill_sess",
    "type": "Snippet",
    "icon": "📑",
    "snippet": "ALTER SYSTEM KILL SESSION 'sid,serial#' IMMEDIATE;"
  },
  {
    "text": "SHOW PARAMETER",
    "type": "Command",
    "icon": "⚡",
    "snippet": "SHOW PARAMETER "
  },
  {
    "text": "SHOW PARAMETERS",
    "type": "Command",
    "icon": "⚡",
    "snippet": "SHOW PARAMETERS "
  },
  {
    "text": "SHOW USER",
    "type": "Command",
    "icon": "⚡",
    "snippet": "SHOW USER;"
  },
  {
    "text": "SHOW SGA",
    "type": "Command",
    "icon": "⚡",
    "snippet": "SHOW SGA;"
  },
  {
    "text": "SHOW ERRORS",
    "type": "Command",
    "icon": "⚡",
    "snippet": "SHOW ERRORS;"
  },
  {
    "text": "SHOW RECYCLEBIN",
    "type": "Command",
    "icon": "⚡",
    "snippet": "SHOW RECYCLEBIN;"
  },
  {
    "text": "SHOW PDBS",
    "type": "Command",
    "icon": "⚡",
    "snippet": "SHOW PDBS;"
  },
  {
    "text": "DESCRIBE",
    "type": "Command",
    "icon": "⚡",
    "snippet": "DESCRIBE "
  },
  {
    "text": "DESC",
    "type": "Command",
    "icon": "⚡",
    "snippet": "DESC "
  },
  {
    "text": "SET SERVEROUTPUT ON",
    "type": "Command",
    "icon": "⚡",
    "snippet": "SET SERVEROUTPUT ON SIZE UNLIMITED;"
  },
  {
    "text": "SET TIMING ON",
    "type": "Command",
    "icon": "⚡",
    "snippet": "SET TIMING ON;"
  },
  {
    "text": "SET AUTOTRACE ON",
    "type": "Command",
    "icon": "⚡",
    "snippet": "SET AUTOTRACE ON;"
  },
  {
    "text": "SET LINESIZE",
    "type": "Command",
    "icon": "⚡",
    "snippet": "SET LINESIZE 200;"
  },
  {
    "text": "SET PAGESIZE",
    "type": "Command",
    "icon": "⚡",
    "snippet": "SET PAGESIZE 50000;"
  },
  {
    "text": "ARCHIVE LOG LIST",
    "type": "Command",
    "icon": "⚡",
    "snippet": "ARCHIVE LOG LIST;"
  },
  {
    "text": "SELECT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "FROM",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "WHERE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "GROUP BY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "HAVING",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ORDER BY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "INSERT INTO",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "VALUES",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "UPDATE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SET",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DELETE FROM",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "MERGE INTO",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "USING",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "WHEN MATCHED THEN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "WHEN NOT MATCHED THEN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CREATE TABLE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ALTER TABLE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DROP TABLE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "TRUNCATE TABLE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CREATE OR REPLACE VIEW",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CREATE MATERIALIZED VIEW",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "REFRESH COMPLETE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "REFRESH FAST",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "REFRESH FORCE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ON COMMIT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ON DEMAND",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CREATE INDEX",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ALTER INDEX",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DROP INDEX",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "REBUILD",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "REBUILD ONLINE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "COMPUTE STATISTICS",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CREATE SEQUENCE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ALTER SEQUENCE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DROP SEQUENCE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "START WITH",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "INCREMENT BY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "MAXVALUE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOMAXVALUE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "MINVALUE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOMINVALUE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CYCLE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOCYCLE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CACHE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOCACHE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ORDER",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOORDER",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CREATE SYNONYM",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CREATE PUBLIC SYNONYM",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DROP SYNONYM",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DROP PUBLIC SYNONYM",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CREATE DATABASE LINK",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DROP DATABASE LINK",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SHARED",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CONNECT TO",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "IDENTIFIED BY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CREATE TABLESPACE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ALTER TABLESPACE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DROP TABLESPACE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DATAFILE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SIZE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "AUTOEXTEND ON",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NEXT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "MAXSIZE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "EXTENT MANAGEMENT LOCAL",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SEGMENT SPACE MANAGEMENT AUTO",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "TEMPORARY TABLESPACE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "UNDO TABLESPACE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CREATE USER",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ALTER USER",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DROP USER",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DEFAULT TABLESPACE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "QUOTA UNLIMITED ON",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ACCOUNT LOCK",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ACCOUNT UNLOCK",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PASSWORD EXPIRE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "GRANT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "REVOKE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "WITH ADMIN OPTION",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "WITH GRANT OPTION",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "COMMIT;",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ROLLBACK;",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SAVEPOINT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "TO SAVEPOINT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SET TRANSACTION READ ONLY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SET TRANSACTION READ WRITE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DISTINCT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "UNIQUE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ALL",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "UNION ALL",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "UNION",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "INTERSECT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "MINUS",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "INNER JOIN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "LEFT OUTER JOIN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "RIGHT OUTER JOIN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "FULL OUTER JOIN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CROSS JOIN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NATURAL JOIN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "JOIN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ON",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "AS",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "AND",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "OR",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "IN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOT IN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "BETWEEN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOT BETWEEN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "LIKE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOT LIKE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "IS NULL",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "IS NOT NULL",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "EXISTS",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOT EXISTS",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ANY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SOME",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CASE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "WHEN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "THEN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ELSE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "END",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "OVER",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PARTITION BY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ROWS BETWEEN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "RANGE BETWEEN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "UNBOUNDED PRECEDING",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CURRENT ROW",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "UNBOUNDED FOLLOWING",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "FETCH FIRST",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "FETCH NEXT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ROWS ONLY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ROWS WITH TIES",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "OFFSET",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "FOR UPDATE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "FOR UPDATE NOWAIT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SKIP LOCKED",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "WITH",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "RECURSIVE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CONNECT BY PRIOR",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ORDER SIBLINGS BY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "LEVEL",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CONNECT_BY_ISLEAF",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CONNECT_BY_ISCYCLE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SYS_CONNECT_BY_PATH",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PIVOT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "UNPIVOT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "MATCH_RECOGNIZE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "MEASURES",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ONE ROW PER MATCH",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ALL ROWS PER MATCH",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "AFTER MATCH SKIP TO NEXT ROW",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PATTERN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DEFINE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "MODEL",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DIMENSION BY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "RULES",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SAMPLE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SAMPLE BLOCK",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "LATERAL",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CROSS APPLY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "OUTER APPLY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "FLASHBACK TABLE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "TO BEFORE DROP",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "VERSIONS BETWEEN SCN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "VERSIONS BETWEEN TIMESTAMP",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "AS OF SCN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "AS OF TIMESTAMP",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ENABLE CONSTRAINT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DISABLE CONSTRAINT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "VALIDATE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOVALIDATE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "RELY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NORELY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CASCADE CONSTRAINTS",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PURGE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOLOGGING",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "LOGGING",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PARALLEL",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOPARALLEL",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "MONITORING",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOMONITORING",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "COMPRESS",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOCOMPRESS",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ROW STORE COMPRESS ADVANCED",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ORGANIZATION INDEX",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ORGANIZATION HEAP",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ORGANIZATION EXTERNAL",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DEFAULT DIRECTORY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ACCESS PARAMETERS",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ADD CONSTRAINT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DROP CONSTRAINT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "MODIFY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "RENAME COLUMN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "RENAME TO",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DROP UNUSED COLUMNS",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SET UNUSED COLUMN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ALLOCATE EXTENT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DEALLOCATE UNUSED",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SHRINK SPACE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SHRINK SPACE COMPACT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "COALESCE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "FLASHBACK ON",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "FLASHBACK OFF",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "RETURNING",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "BULK COLLECT INTO",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "EXECUTE IMMEDIATE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PRAGMA AUTONOMOUS_TRANSACTION",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PRAGMA RESTRICT_REFERENCES",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PRAGMA SERIALLY_REUSABLE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PRAGMA INLINE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PRAGMA UDF",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PRAGMA COVERAGE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PRAGMA DEPRECATE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "AUTHID DEFINER",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "AUTHID CURRENT_USER",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "ACCESSIBLE BY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NOCOPY",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "DETERMINISTIC",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "RESULT_CACHE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "RELIES_ON",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "PIPE ROW",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "RAISE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "RAISE_APPLICATION_ERROR",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SQLCODE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SQLERRM",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SQL%FOUND",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SQL%NOTFOUND",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SQL%ROWCOUNT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SQL%ISOPEN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SQL%BULK_ROWCOUNT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "SQL%BULK_EXCEPTIONS",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "EXCEPTION_INIT",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "OPEN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "FETCH",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CLOSE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "LOOP",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "END LOOP;",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "WHILE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "FOR",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "IN REVERSE",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "EXIT WHEN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "CONTINUE WHEN",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "GOTO",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "NULL;",
    "type": "Keyword",
    "icon": "🔤"
  },
  {
    "text": "COUNT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "COUNT()"
  },
  {
    "text": "SUM()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "SUM()"
  },
  {
    "text": "AVG()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "AVG()"
  },
  {
    "text": "MIN()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "MIN()"
  },
  {
    "text": "MAX()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "MAX()"
  },
  {
    "text": "MEDIAN()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "MEDIAN()"
  },
  {
    "text": "STATS_MODE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "STATS_MODE()"
  },
  {
    "text": "STDDEV()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "STDDEV()"
  },
  {
    "text": "STDDEV_POP()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "STDDEV_POP()"
  },
  {
    "text": "STDDEV_SAMP()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "STDDEV_SAMP()"
  },
  {
    "text": "VARIANCE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "VARIANCE()"
  },
  {
    "text": "VAR_POP()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "VAR_POP()"
  },
  {
    "text": "VAR_SAMP()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "VAR_SAMP()"
  },
  {
    "text": "COVAR_POP()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "COVAR_POP()"
  },
  {
    "text": "COVAR_SAMP()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "COVAR_SAMP()"
  },
  {
    "text": "CORR()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "CORR()"
  },
  {
    "text": "REGR_SLOPE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "REGR_SLOPE()"
  },
  {
    "text": "REGR_INTERCEPT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "REGR_INTERCEPT()"
  },
  {
    "text": "REGR_R2()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "REGR_R2()"
  },
  {
    "text": "LISTAGG()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "LISTAGG()"
  },
  {
    "text": "XMLAGG()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "XMLAGG()"
  },
  {
    "text": "JSON_ARRAYAGG()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "JSON_ARRAYAGG()"
  },
  {
    "text": "JSON_OBJECTAGG()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "JSON_OBJECTAGG()"
  },
  {
    "text": "ROW_NUMBER()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "ROW_NUMBER()"
  },
  {
    "text": "RANK()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "RANK()"
  },
  {
    "text": "DENSE_RANK()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "DENSE_RANK()"
  },
  {
    "text": "NTILE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "NTILE()"
  },
  {
    "text": "LAG()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "LAG()"
  },
  {
    "text": "LEAD()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "LEAD()"
  },
  {
    "text": "FIRST_VALUE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "FIRST_VALUE()"
  },
  {
    "text": "LAST_VALUE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "LAST_VALUE()"
  },
  {
    "text": "NTH_VALUE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "NTH_VALUE()"
  },
  {
    "text": "RATIO_TO_REPORT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "RATIO_TO_REPORT()"
  },
  {
    "text": "CUME_DIST()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "CUME_DIST()"
  },
  {
    "text": "PERCENT_RANK()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "PERCENT_RANK()"
  },
  {
    "text": "PERCENTILE_CONT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "PERCENTILE_CONT()"
  },
  {
    "text": "PERCENTILE_DISC()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "PERCENTILE_DISC()"
  },
  {
    "text": "SUBSTR()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "SUBSTR()"
  },
  {
    "text": "INSTR()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "INSTR()"
  },
  {
    "text": "LENGTH()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "LENGTH()"
  },
  {
    "text": "TRIM()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TRIM()"
  },
  {
    "text": "LTRIM()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "LTRIM()"
  },
  {
    "text": "RTRIM()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "RTRIM()"
  },
  {
    "text": "LPAD()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "LPAD()"
  },
  {
    "text": "RPAD()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "RPAD()"
  },
  {
    "text": "UPPER()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "UPPER()"
  },
  {
    "text": "LOWER()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "LOWER()"
  },
  {
    "text": "INITCAP()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "INITCAP()"
  },
  {
    "text": "REPLACE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "REPLACE()"
  },
  {
    "text": "TRANSLATE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TRANSLATE()"
  },
  {
    "text": "CONCAT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "CONCAT()"
  },
  {
    "text": "SOUNDEX()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "SOUNDEX()"
  },
  {
    "text": "REGEXP_SUBSTR()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "REGEXP_SUBSTR()"
  },
  {
    "text": "REGEXP_INSTR()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "REGEXP_INSTR()"
  },
  {
    "text": "REGEXP_REPLACE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "REGEXP_REPLACE()"
  },
  {
    "text": "REGEXP_LIKE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "REGEXP_LIKE()"
  },
  {
    "text": "REGEXP_COUNT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "REGEXP_COUNT()"
  },
  {
    "text": "CHR()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "CHR()"
  },
  {
    "text": "ASCII()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "ASCII()"
  },
  {
    "text": "DUMP()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "DUMP()"
  },
  {
    "text": "VSIZE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "VSIZE()"
  },
  {
    "text": "DECODE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "DECODE()"
  },
  {
    "text": "NVL()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "NVL()"
  },
  {
    "text": "NVL2()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "NVL2()"
  },
  {
    "text": "COALESCE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "COALESCE()"
  },
  {
    "text": "NULLIF()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "NULLIF()"
  },
  {
    "text": "GREATEST()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "GREATEST()"
  },
  {
    "text": "LEAST()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "LEAST()"
  },
  {
    "text": "SYS_GUID()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "SYS_GUID()"
  },
  {
    "text": "USER()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "USER()"
  },
  {
    "text": "UID()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "UID()"
  },
  {
    "text": "USERENV()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "USERENV()"
  },
  {
    "text": "SYS_CONTEXT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "SYS_CONTEXT()"
  },
  {
    "text": "ABS()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "ABS()"
  },
  {
    "text": "CEIL()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "CEIL()"
  },
  {
    "text": "FLOOR()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "FLOOR()"
  },
  {
    "text": "ROUND()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "ROUND()"
  },
  {
    "text": "TRUNC()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TRUNC()"
  },
  {
    "text": "MOD()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "MOD()"
  },
  {
    "text": "POWER()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "POWER()"
  },
  {
    "text": "SQRT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "SQRT()"
  },
  {
    "text": "EXP()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "EXP()"
  },
  {
    "text": "LN()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "LN()"
  },
  {
    "text": "LOG()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "LOG()"
  },
  {
    "text": "SIGN()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "SIGN()"
  },
  {
    "text": "SIN()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "SIN()"
  },
  {
    "text": "COS()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "COS()"
  },
  {
    "text": "TAN()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TAN()"
  },
  {
    "text": "ASIN()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "ASIN()"
  },
  {
    "text": "ACOS()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "ACOS()"
  },
  {
    "text": "ATAN()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "ATAN()"
  },
  {
    "text": "ATAN2()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "ATAN2()"
  },
  {
    "text": "SINH()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "SINH()"
  },
  {
    "text": "COSH()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "COSH()"
  },
  {
    "text": "TANH()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TANH()"
  },
  {
    "text": "BITAND()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "BITAND()"
  },
  {
    "text": "NANVL()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "NANVL()"
  },
  {
    "text": "REMAINDER()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "REMAINDER()"
  },
  {
    "text": "WIDTH_BUCKET()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "WIDTH_BUCKET()"
  },
  {
    "text": "SYSDATE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "SYSDATE()"
  },
  {
    "text": "SYSTIMESTAMP()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "SYSTIMESTAMP()"
  },
  {
    "text": "CURRENT_DATE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "CURRENT_DATE()"
  },
  {
    "text": "CURRENT_TIMESTAMP()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "CURRENT_TIMESTAMP()"
  },
  {
    "text": "LOCALTIMESTAMP()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "LOCALTIMESTAMP()"
  },
  {
    "text": "ADD_MONTHS()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "ADD_MONTHS()"
  },
  {
    "text": "MONTHS_BETWEEN()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "MONTHS_BETWEEN()"
  },
  {
    "text": "NEXT_DAY()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "NEXT_DAY()"
  },
  {
    "text": "LAST_DAY()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "LAST_DAY()"
  },
  {
    "text": "EXTRACT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "EXTRACT()"
  },
  {
    "text": "NUMTODSINTERVAL()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "NUMTODSINTERVAL()"
  },
  {
    "text": "NUMTOYMINTERVAL()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "NUMTOYMINTERVAL()"
  },
  {
    "text": "TO_DSINTERVAL()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TO_DSINTERVAL()"
  },
  {
    "text": "TO_YMINTERVAL()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TO_YMINTERVAL()"
  },
  {
    "text": "FROM_TZ()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "FROM_TZ()"
  },
  {
    "text": "SYS_EXTRACT_UTC()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "SYS_EXTRACT_UTC()"
  },
  {
    "text": "TZ_OFFSET()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TZ_OFFSET()"
  },
  {
    "text": "DBTIMEZONE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "DBTIMEZONE()"
  },
  {
    "text": "SESSIONTIMEZONE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "SESSIONTIMEZONE()"
  },
  {
    "text": "NEW_TIME()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "NEW_TIME()"
  },
  {
    "text": "TO_CHAR()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TO_CHAR()"
  },
  {
    "text": "TO_NUMBER()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TO_NUMBER()"
  },
  {
    "text": "TO_DATE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TO_DATE()"
  },
  {
    "text": "TO_TIMESTAMP()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TO_TIMESTAMP()"
  },
  {
    "text": "TO_TIMESTAMP_TZ()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TO_TIMESTAMP_TZ()"
  },
  {
    "text": "TO_CLOB()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TO_CLOB()"
  },
  {
    "text": "TO_BLOB()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TO_BLOB()"
  },
  {
    "text": "TO_NCLOB()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TO_NCLOB()"
  },
  {
    "text": "TO_BINARY_FLOAT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TO_BINARY_FLOAT()"
  },
  {
    "text": "TO_BINARY_DOUBLE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TO_BINARY_DOUBLE()"
  },
  {
    "text": "CHARTOROWID()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "CHARTOROWID()"
  },
  {
    "text": "ROWIDTOCHAR()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "ROWIDTOCHAR()"
  },
  {
    "text": "HEXTORAW()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "HEXTORAW()"
  },
  {
    "text": "RAWTOHEX()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "RAWTOHEX()"
  },
  {
    "text": "CAST()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "CAST()"
  },
  {
    "text": "TREAT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "TREAT()"
  },
  {
    "text": "VALIDATE_CONVERSION()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "VALIDATE_CONVERSION()"
  },
  {
    "text": "JSON_VALUE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "JSON_VALUE()"
  },
  {
    "text": "JSON_QUERY()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "JSON_QUERY()"
  },
  {
    "text": "JSON_EXISTS()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "JSON_EXISTS()"
  },
  {
    "text": "JSON_TABLE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "JSON_TABLE()"
  },
  {
    "text": "JSON_OBJECT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "JSON_OBJECT()"
  },
  {
    "text": "JSON_ARRAY()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "JSON_ARRAY()"
  },
  {
    "text": "JSON_TRANSFORM()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "JSON_TRANSFORM()"
  },
  {
    "text": "JSON_MERGEPATCH()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "JSON_MERGEPATCH()"
  },
  {
    "text": "JSON_SERIALIZE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "JSON_SERIALIZE()"
  },
  {
    "text": "XMLPARSE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "XMLPARSE()"
  },
  {
    "text": "XMLSERIALIZE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "XMLSERIALIZE()"
  },
  {
    "text": "XMLELEMENT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "XMLELEMENT()"
  },
  {
    "text": "XMLATTRIBUTES()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "XMLATTRIBUTES()"
  },
  {
    "text": "XMLFOREST()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "XMLFOREST()"
  },
  {
    "text": "XMLQUERY()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "XMLQUERY()"
  },
  {
    "text": "XMLTABLE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "XMLTABLE()"
  },
  {
    "text": "EXTRACTVALUE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "EXTRACTVALUE()"
  },
  {
    "text": "VECTOR()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "VECTOR()"
  },
  {
    "text": "VECTOR_DISTANCE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "VECTOR_DISTANCE()"
  },
  {
    "text": "VECTOR_EMBEDDING()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "VECTOR_EMBEDDING()"
  },
  {
    "text": "VECTOR_CHUNKS()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "VECTOR_CHUNKS()"
  },
  {
    "text": "VECTOR_SERIALIZE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "VECTOR_SERIALIZE()"
  },
  {
    "text": "COSINE_DISTANCE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "COSINE_DISTANCE()"
  },
  {
    "text": "DOT_PRODUCT()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "DOT_PRODUCT()"
  },
  {
    "text": "EUCLIDEAN_DISTANCE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "EUCLIDEAN_DISTANCE()"
  },
  {
    "text": "MANHATTAN_DISTANCE()",
    "type": "Function",
    "icon": "🔧",
    "snippet": "MANHATTAN_DISTANCE()"
  },
  {
    "text": "NUMBER",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "VARCHAR2",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "CHAR",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "NCHAR",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "NVARCHAR2",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "DATE",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "TIMESTAMP",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "TIMESTAMP WITH TIME ZONE",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "TIMESTAMP WITH LOCAL TIME ZONE",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "INTERVAL YEAR TO MONTH",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "INTERVAL DAY TO SECOND",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "CLOB",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "BLOB",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "NCLOB",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "BFILE",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "RAW",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "LONG",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "LONG RAW",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "ROWID",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "UROWID",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "BOOLEAN",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "BINARY_INTEGER",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "PLS_INTEGER",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "SIMPLE_INTEGER",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "BINARY_FLOAT",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "BINARY_DOUBLE",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "XMLTYPE",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "JSON",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "VECTOR",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "SDO_GEOMETRY",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "ANYDATA",
    "type": "Type",
    "icon": "🏷"
  },
  {
    "text": "CONNECT",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "RESOURCE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "DBA",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "EXP_FULL_DATABASE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "IMP_FULL_DATABASE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "SELECT ANY TABLE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "INSERT ANY TABLE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "UPDATE ANY TABLE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "DELETE ANY TABLE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "EXECUTE ANY PROCEDURE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "CREATE SESSION",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "ALTER SESSION",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "ALTER SYSTEM",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "CREATE ANY TABLE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "DROP ANY TABLE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "CREATE VIEW",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "CREATE ANY VIEW",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "CREATE PROCEDURE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "CREATE ANY PROCEDURE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "CREATE TRIGGER",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "CREATE ANY TRIGGER",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "CREATE ANY SEQUENCE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "CREATE ANY SYNONYM",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "CREATE PUBLIC DATABASE LINK",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "UNLIMITED TABLESPACE",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "AUDIT SYSTEM",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "EXEMPT ACCESS POLICY",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "ADMINISTER DATABASE TRIGGER",
    "type": "Privilege",
    "icon": "🛡"
  },
  {
    "text": "db_block_size",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "db_cache_size",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "shared_pool_size",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "large_pool_size",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "java_pool_size",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "streams_pool_size",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "sga_target",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "sga_max_size",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "pga_aggregate_target",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "pga_aggregate_limit",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "memory_target",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "memory_max_target",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "processes",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "sessions",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "open_cursors",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "undo_management",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "undo_tablespace",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "undo_retention",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "compatible",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "db_name",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "db_unique_name",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "instance_name",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "control_files",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "log_buffer",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "db_files",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "db_file_multiblock_read_count",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "optimizer_mode",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "optimizer_features_enable",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "optimizer_index_cost_adj",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "optimizer_index_caching",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "optimizer_adaptive_plans",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "optimizer_adaptive_statistics",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "cursor_sharing",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "result_cache_mode",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "result_cache_max_size",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "parallel_max_servers",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "parallel_min_servers",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "parallel_degree_limit",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "audit_trail",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "audit_sys_operations",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "os_authent_prefix",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "remote_login_passwordfile",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "remote_os_authent",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "sec_case_sensitive_logon",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "resource_limit",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "diagnostic_dest",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "db_recovery_file_dest",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "db_recovery_file_dest_size",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "log_archive_dest_1",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "log_archive_format",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "nls_language",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "nls_territory",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "nls_date_format",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "nls_timestamp_format",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "nls_sort",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "query_rewrite_enabled",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "query_rewrite_integrity",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "star_transformation_enabled",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "inmemory_size",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "inmemory_max_populate_servers",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "vector_memory_size",
    "type": "Parameter",
    "icon": "⚙"
  },
  {
    "text": "db file sequential read",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "db file scattered read",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "direct path read",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "direct path write",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "direct path read temp",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "direct path write temp",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "log file sync",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "log file parallel write",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "enq: TX - row lock contention",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "enq: TX - index contention",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "enq: TX - allocate ITL entry",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "enq: TM - contention",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "enq: ST - contention",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "latch: cache buffers chains",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "latch: shared pool",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "latch: library cache",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "latch: redo allocation",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "latch: redo copy",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "library cache lock",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "library cache pin",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "cursor: pin S wait on X",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "cursor: mutex X",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "cursor: mutex S",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "SQL*Net message from client",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "SQL*Net message to client",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "SQL*Net more data from client",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "SQL*Net more data to client",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "buffer busy waits",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "read by other session",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "gc current block 2-way",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "gc current block 3-way",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "gc cr block 2-way",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "gc cr block 3-way",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "resmgr:cpu quantum",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "rdbms ipc message",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "pmon timer",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "smon timer",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "checkpoint completed",
    "type": "WaitEvent",
    "icon": "⏱"
  },
  {
    "text": "DBMS_OUTPUT",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_OUTPUT.PUT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_OUTPUT.PUT()"
  },
  {
    "text": "DBMS_OUTPUT.PUT_LINE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_OUTPUT.PUT_LINE()"
  },
  {
    "text": "DBMS_OUTPUT.NEW_LINE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_OUTPUT.NEW_LINE()"
  },
  {
    "text": "DBMS_OUTPUT.GET_LINE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_OUTPUT.GET_LINE()"
  },
  {
    "text": "DBMS_OUTPUT.GET_LINES()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_OUTPUT.GET_LINES()"
  },
  {
    "text": "DBMS_OUTPUT.ENABLE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_OUTPUT.ENABLE()"
  },
  {
    "text": "DBMS_OUTPUT.DISABLE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_OUTPUT.DISABLE()"
  },
  {
    "text": "DBMS_STATS",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_STATS.GATHER_TABLE_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.GATHER_TABLE_STATS()"
  },
  {
    "text": "DBMS_STATS.GATHER_SCHEMA_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.GATHER_SCHEMA_STATS()"
  },
  {
    "text": "DBMS_STATS.GATHER_DATABASE_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.GATHER_DATABASE_STATS()"
  },
  {
    "text": "DBMS_STATS.GATHER_INDEX_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.GATHER_INDEX_STATS()"
  },
  {
    "text": "DBMS_STATS.GATHER_SYSTEM_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.GATHER_SYSTEM_STATS()"
  },
  {
    "text": "DBMS_STATS.GATHER_DICTIONARY_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.GATHER_DICTIONARY_STATS()"
  },
  {
    "text": "DBMS_STATS.LOCK_TABLE_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.LOCK_TABLE_STATS()"
  },
  {
    "text": "DBMS_STATS.UNLOCK_TABLE_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.UNLOCK_TABLE_STATS()"
  },
  {
    "text": "DBMS_STATS.DELETE_TABLE_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.DELETE_TABLE_STATS()"
  },
  {
    "text": "DBMS_STATS.DELETE_SCHEMA_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.DELETE_SCHEMA_STATS()"
  },
  {
    "text": "DBMS_STATS.EXPORT_TABLE_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.EXPORT_TABLE_STATS()"
  },
  {
    "text": "DBMS_STATS.IMPORT_TABLE_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.IMPORT_TABLE_STATS()"
  },
  {
    "text": "DBMS_STATS.SET_TABLE_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.SET_TABLE_STATS()"
  },
  {
    "text": "DBMS_STATS.SET_INDEX_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.SET_INDEX_STATS()"
  },
  {
    "text": "DBMS_STATS.RESTORE_TABLE_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.RESTORE_TABLE_STATS()"
  },
  {
    "text": "DBMS_STATS.PURGE_STATS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_STATS.PURGE_STATS()"
  },
  {
    "text": "DBMS_METADATA",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_METADATA.GET_DDL()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_METADATA.GET_DDL()"
  },
  {
    "text": "DBMS_METADATA.GET_DEPENDENT_DDL()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_METADATA.GET_DEPENDENT_DDL()"
  },
  {
    "text": "DBMS_METADATA.GET_GRANTED_DDL()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_METADATA.GET_GRANTED_DDL()"
  },
  {
    "text": "DBMS_METADATA.SET_TRANSFORM_PARAM()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_METADATA.SET_TRANSFORM_PARAM()"
  },
  {
    "text": "DBMS_METADATA.OPEN()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_METADATA.OPEN()"
  },
  {
    "text": "DBMS_METADATA.FETCH_CLOB()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_METADATA.FETCH_CLOB()"
  },
  {
    "text": "DBMS_METADATA.CLOSE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_METADATA.CLOSE()"
  },
  {
    "text": "DBMS_SCHEDULER",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_SCHEDULER.CREATE_JOB()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SCHEDULER.CREATE_JOB()"
  },
  {
    "text": "DBMS_SCHEDULER.DROP_JOB()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SCHEDULER.DROP_JOB()"
  },
  {
    "text": "DBMS_SCHEDULER.RUN_JOB()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SCHEDULER.RUN_JOB()"
  },
  {
    "text": "DBMS_SCHEDULER.STOP_JOB()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SCHEDULER.STOP_JOB()"
  },
  {
    "text": "DBMS_SCHEDULER.ENABLE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SCHEDULER.ENABLE()"
  },
  {
    "text": "DBMS_SCHEDULER.DISABLE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SCHEDULER.DISABLE()"
  },
  {
    "text": "DBMS_SCHEDULER.SET_ATTRIBUTE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SCHEDULER.SET_ATTRIBUTE()"
  },
  {
    "text": "DBMS_SCHEDULER.CREATE_PROGRAM()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SCHEDULER.CREATE_PROGRAM()"
  },
  {
    "text": "DBMS_SCHEDULER.CREATE_SCHEDULE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SCHEDULER.CREATE_SCHEDULE()"
  },
  {
    "text": "DBMS_SCHEDULER.CREATE_CHAIN()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SCHEDULER.CREATE_CHAIN()"
  },
  {
    "text": "DBMS_SCHEDULER.DEFINE_CHAIN_STEP()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SCHEDULER.DEFINE_CHAIN_STEP()"
  },
  {
    "text": "DBMS_SCHEDULER.ALTER_JOB()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SCHEDULER.ALTER_JOB()"
  },
  {
    "text": "DBMS_SCHEDULER.COPY_JOB()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SCHEDULER.COPY_JOB()"
  },
  {
    "text": "DBMS_XPLAN",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_XPLAN.DISPLAY()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_XPLAN.DISPLAY()"
  },
  {
    "text": "DBMS_XPLAN.DISPLAY_CURSOR()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_XPLAN.DISPLAY_CURSOR()"
  },
  {
    "text": "DBMS_XPLAN.DISPLAY_AWR()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_XPLAN.DISPLAY_AWR()"
  },
  {
    "text": "DBMS_XPLAN.DISPLAY_SQL_PLAN_BASELINE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_XPLAN.DISPLAY_SQL_PLAN_BASELINE()"
  },
  {
    "text": "DBMS_XPLAN.FORMAT_NUMBER()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_XPLAN.FORMAT_NUMBER()"
  },
  {
    "text": "DBMS_XPLAN.PREPARE_RECORDS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_XPLAN.PREPARE_RECORDS()"
  },
  {
    "text": "DBMS_LOCK",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_LOCK.SLEEP()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOCK.SLEEP()"
  },
  {
    "text": "DBMS_LOCK.REQUEST()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOCK.REQUEST()"
  },
  {
    "text": "DBMS_LOCK.CONVERT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOCK.CONVERT()"
  },
  {
    "text": "DBMS_LOCK.RELEASE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOCK.RELEASE()"
  },
  {
    "text": "DBMS_LOCK.ALLOCATE_UNIQUE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOCK.ALLOCATE_UNIQUE()"
  },
  {
    "text": "DBMS_LOB",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_LOB.CREATETEMPORARY()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.CREATETEMPORARY()"
  },
  {
    "text": "DBMS_LOB.FREETEMPORARY()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.FREETEMPORARY()"
  },
  {
    "text": "DBMS_LOB.GETLENGTH()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.GETLENGTH()"
  },
  {
    "text": "DBMS_LOB.READ()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.READ()"
  },
  {
    "text": "DBMS_LOB.WRITE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.WRITE()"
  },
  {
    "text": "DBMS_LOB.WRITEAPPEND()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.WRITEAPPEND()"
  },
  {
    "text": "DBMS_LOB.COPY()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.COPY()"
  },
  {
    "text": "DBMS_LOB.SUBSTR()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.SUBSTR()"
  },
  {
    "text": "DBMS_LOB.INSTR()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.INSTR()"
  },
  {
    "text": "DBMS_LOB.TRIM()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.TRIM()"
  },
  {
    "text": "DBMS_LOB.ERASE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.ERASE()"
  },
  {
    "text": "DBMS_LOB.COMPARE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.COMPARE()"
  },
  {
    "text": "DBMS_LOB.LOADFROMFILE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.LOADFROMFILE()"
  },
  {
    "text": "DBMS_LOB.OPEN()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.OPEN()"
  },
  {
    "text": "DBMS_LOB.CLOSE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.CLOSE()"
  },
  {
    "text": "DBMS_LOB.ISOPEN()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_LOB.ISOPEN()"
  },
  {
    "text": "DBMS_SQL",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_SQL.OPEN_CURSOR()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQL.OPEN_CURSOR()"
  },
  {
    "text": "DBMS_SQL.PARSE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQL.PARSE()"
  },
  {
    "text": "DBMS_SQL.BIND_VARIABLE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQL.BIND_VARIABLE()"
  },
  {
    "text": "DBMS_SQL.DEFINE_COLUMN()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQL.DEFINE_COLUMN()"
  },
  {
    "text": "DBMS_SQL.EXECUTE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQL.EXECUTE()"
  },
  {
    "text": "DBMS_SQL.FETCH_ROWS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQL.FETCH_ROWS()"
  },
  {
    "text": "DBMS_SQL.COLUMN_VALUE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQL.COLUMN_VALUE()"
  },
  {
    "text": "DBMS_SQL.VARIABLE_VALUE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQL.VARIABLE_VALUE()"
  },
  {
    "text": "DBMS_SQL.CLOSE_CURSOR()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQL.CLOSE_CURSOR()"
  },
  {
    "text": "DBMS_SQL.IS_OPEN()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQL.IS_OPEN()"
  },
  {
    "text": "DBMS_SQL.DESCRIBE_COLUMNS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQL.DESCRIBE_COLUMNS()"
  },
  {
    "text": "DBMS_APPLICATION_INFO",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_APPLICATION_INFO.SET_MODULE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_APPLICATION_INFO.SET_MODULE()"
  },
  {
    "text": "DBMS_APPLICATION_INFO.SET_ACTION()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_APPLICATION_INFO.SET_ACTION()"
  },
  {
    "text": "DBMS_APPLICATION_INFO.SET_CLIENT_INFO()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_APPLICATION_INFO.SET_CLIENT_INFO()"
  },
  {
    "text": "DBMS_APPLICATION_INFO.READ_MODULE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_APPLICATION_INFO.READ_MODULE()"
  },
  {
    "text": "DBMS_APPLICATION_INFO.READ_CLIENT_INFO()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_APPLICATION_INFO.READ_CLIENT_INFO()"
  },
  {
    "text": "DBMS_APPLICATION_INFO.SET_SESSION_LONGOPS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_APPLICATION_INFO.SET_SESSION_LONGOPS()"
  },
  {
    "text": "DBMS_SESSION",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_SESSION.SET_IDENTIFIER()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SESSION.SET_IDENTIFIER()"
  },
  {
    "text": "DBMS_SESSION.CLEAR_IDENTIFIER()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SESSION.CLEAR_IDENTIFIER()"
  },
  {
    "text": "DBMS_SESSION.SET_CONTEXT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SESSION.SET_CONTEXT()"
  },
  {
    "text": "DBMS_SESSION.CLEAR_CONTEXT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SESSION.CLEAR_CONTEXT()"
  },
  {
    "text": "DBMS_SESSION.RESET_PACKAGE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SESSION.RESET_PACKAGE()"
  },
  {
    "text": "DBMS_SESSION.SET_NLS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SESSION.SET_NLS()"
  },
  {
    "text": "DBMS_SESSION.UNIQUE_SESSION_ID()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SESSION.UNIQUE_SESSION_ID()"
  },
  {
    "text": "DBMS_FLASHBACK",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_FLASHBACK.ENABLE_AT_TIME()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_FLASHBACK.ENABLE_AT_TIME()"
  },
  {
    "text": "DBMS_FLASHBACK.ENABLE_AT_SYSTEM_CHANGE_NUMBER()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_FLASHBACK.ENABLE_AT_SYSTEM_CHANGE_NUMBER()"
  },
  {
    "text": "DBMS_FLASHBACK.DISABLE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_FLASHBACK.DISABLE()"
  },
  {
    "text": "DBMS_FLASHBACK.GET_SYSTEM_CHANGE_NUMBER()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_FLASHBACK.GET_SYSTEM_CHANGE_NUMBER()"
  },
  {
    "text": "DBMS_REDEFINITION",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_REDEFINITION.CAN_REDEF_TABLE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_REDEFINITION.CAN_REDEF_TABLE()"
  },
  {
    "text": "DBMS_REDEFINITION.START_REDEF_TABLE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_REDEFINITION.START_REDEF_TABLE()"
  },
  {
    "text": "DBMS_REDEFINITION.SYNC_INTERIM_TABLE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_REDEFINITION.SYNC_INTERIM_TABLE()"
  },
  {
    "text": "DBMS_REDEFINITION.FINISH_REDEF_TABLE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_REDEFINITION.FINISH_REDEF_TABLE()"
  },
  {
    "text": "DBMS_REDEFINITION.ABORT_REDEF_TABLE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_REDEFINITION.ABORT_REDEF_TABLE()"
  },
  {
    "text": "DBMS_REDEFINITION.COPY_TABLE_DEPENDENTS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_REDEFINITION.COPY_TABLE_DEPENDENTS()"
  },
  {
    "text": "DBMS_MVIEW",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_MVIEW.REFRESH()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_MVIEW.REFRESH()"
  },
  {
    "text": "DBMS_MVIEW.REFRESH_ALL_MVIEWS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_MVIEW.REFRESH_ALL_MVIEWS()"
  },
  {
    "text": "DBMS_MVIEW.EXPLAIN_MVIEW()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_MVIEW.EXPLAIN_MVIEW()"
  },
  {
    "text": "DBMS_MVIEW.EXPLAIN_REWRITE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_MVIEW.EXPLAIN_REWRITE()"
  },
  {
    "text": "DBMS_SQLTUNE",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_SQLTUNE.CREATE_TUNING_TASK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQLTUNE.CREATE_TUNING_TASK()"
  },
  {
    "text": "DBMS_SQLTUNE.EXECUTE_TUNING_TASK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQLTUNE.EXECUTE_TUNING_TASK()"
  },
  {
    "text": "DBMS_SQLTUNE.REPORT_TUNING_TASK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQLTUNE.REPORT_TUNING_TASK()"
  },
  {
    "text": "DBMS_SQLTUNE.ACCEPT_SQL_PROFILE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQLTUNE.ACCEPT_SQL_PROFILE()"
  },
  {
    "text": "DBMS_SQLTUNE.DROP_TUNING_TASK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SQLTUNE.DROP_TUNING_TASK()"
  },
  {
    "text": "DBMS_AUTO_SQLTUNE",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_AUTO_SQLTUNE.EXECUTE_AUTO_TUNING_TASK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_AUTO_SQLTUNE.EXECUTE_AUTO_TUNING_TASK()"
  },
  {
    "text": "DBMS_AUTO_SQLTUNE.REPORT_AUTO_TUNING_TASK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_AUTO_SQLTUNE.REPORT_AUTO_TUNING_TASK()"
  },
  {
    "text": "DBMS_ADVISOR",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_ADVISOR.CREATE_TASK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_ADVISOR.CREATE_TASK()"
  },
  {
    "text": "DBMS_ADVISOR.EXECUTE_TASK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_ADVISOR.EXECUTE_TASK()"
  },
  {
    "text": "DBMS_ADVISOR.GET_TASK_REPORT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_ADVISOR.GET_TASK_REPORT()"
  },
  {
    "text": "DBMS_ADVISOR.DELETE_TASK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_ADVISOR.DELETE_TASK()"
  },
  {
    "text": "DBMS_ADVISOR.RESET_TASK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_ADVISOR.RESET_TASK()"
  },
  {
    "text": "DBMS_WORKLOAD_REPOSITORY",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT()"
  },
  {
    "text": "DBMS_WORKLOAD_REPOSITORY.DROP_SNAPSHOT_RANGE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_WORKLOAD_REPOSITORY.DROP_SNAPSHOT_RANGE()"
  },
  {
    "text": "DBMS_WORKLOAD_REPOSITORY.MODIFY_SNAPSHOT_SETTINGS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_WORKLOAD_REPOSITORY.MODIFY_SNAPSHOT_SETTINGS()"
  },
  {
    "text": "DBMS_WORKLOAD_REPOSITORY.AWR_REPORT_TEXT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_WORKLOAD_REPOSITORY.AWR_REPORT_TEXT()"
  },
  {
    "text": "DBMS_WORKLOAD_REPOSITORY.AWR_REPORT_HTML()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_WORKLOAD_REPOSITORY.AWR_REPORT_HTML()"
  },
  {
    "text": "DBMS_PROFILER",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_PROFILER.START_PROFILER()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_PROFILER.START_PROFILER()"
  },
  {
    "text": "DBMS_PROFILER.STOP_PROFILER()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_PROFILER.STOP_PROFILER()"
  },
  {
    "text": "DBMS_PROFILER.FLUSH_DATA()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_PROFILER.FLUSH_DATA()"
  },
  {
    "text": "DBMS_HPROF",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_HPROF.START_PROFILING()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_HPROF.START_PROFILING()"
  },
  {
    "text": "DBMS_HPROF.STOP_PROFILING()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_HPROF.STOP_PROFILING()"
  },
  {
    "text": "DBMS_HPROF.CREATE_TABLES()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_HPROF.CREATE_TABLES()"
  },
  {
    "text": "DBMS_SPACE",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_SPACE.UNUSED_SPACE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SPACE.UNUSED_SPACE()"
  },
  {
    "text": "DBMS_SPACE.FREE_BLOCKS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SPACE.FREE_BLOCKS()"
  },
  {
    "text": "DBMS_SPACE.SPACE_USAGE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SPACE.SPACE_USAGE()"
  },
  {
    "text": "DBMS_SPACE.OBJECT_GROWTH_TREND()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_SPACE.OBJECT_GROWTH_TREND()"
  },
  {
    "text": "DBMS_ROWID",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_ROWID.ROWID_CREATE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_ROWID.ROWID_CREATE()"
  },
  {
    "text": "DBMS_ROWID.ROWID_INFO()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_ROWID.ROWID_INFO()"
  },
  {
    "text": "DBMS_ROWID.ROWID_TYPE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_ROWID.ROWID_TYPE()"
  },
  {
    "text": "DBMS_ROWID.ROWID_OBJECT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_ROWID.ROWID_OBJECT()"
  },
  {
    "text": "DBMS_ROWID.ROWID_RELATIVE_FNO()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_ROWID.ROWID_RELATIVE_FNO()"
  },
  {
    "text": "DBMS_ROWID.ROWID_BLOCK_NUMBER()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_ROWID.ROWID_BLOCK_NUMBER()"
  },
  {
    "text": "DBMS_ROWID.ROWID_ROW_NUMBER()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_ROWID.ROWID_ROW_NUMBER()"
  },
  {
    "text": "DBMS_CRYPTO",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_CRYPTO.ENCRYPT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_CRYPTO.ENCRYPT()"
  },
  {
    "text": "DBMS_CRYPTO.DECRYPT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_CRYPTO.DECRYPT()"
  },
  {
    "text": "DBMS_CRYPTO.HASH()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_CRYPTO.HASH()"
  },
  {
    "text": "DBMS_CRYPTO.MAC()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_CRYPTO.MAC()"
  },
  {
    "text": "DBMS_CRYPTO.RANDOMBYTES()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_CRYPTO.RANDOMBYTES()"
  },
  {
    "text": "DBMS_CRYPTO.RANDOMNUMBER()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_CRYPTO.RANDOMNUMBER()"
  },
  {
    "text": "DBMS_UTILITY",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_UTILITY.FORMAT_ERROR_STACK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_UTILITY.FORMAT_ERROR_STACK()"
  },
  {
    "text": "DBMS_UTILITY.FORMAT_ERROR_BACKTRACE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_UTILITY.FORMAT_ERROR_BACKTRACE()"
  },
  {
    "text": "DBMS_UTILITY.FORMAT_CALL_STACK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_UTILITY.FORMAT_CALL_STACK()"
  },
  {
    "text": "DBMS_UTILITY.COMPILE_SCHEMA()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_UTILITY.COMPILE_SCHEMA()"
  },
  {
    "text": "DBMS_UTILITY.ANALYZE_SCHEMA()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_UTILITY.ANALYZE_SCHEMA()"
  },
  {
    "text": "DBMS_UTILITY.DB_VERSION()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_UTILITY.DB_VERSION()"
  },
  {
    "text": "DBMS_UTILITY.GET_TIME()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_UTILITY.GET_TIME()"
  },
  {
    "text": "DBMS_UTILITY.GET_CPU_TIME()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_UTILITY.GET_CPU_TIME()"
  },
  {
    "text": "DBMS_RANDOM",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_RANDOM.VALUE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_RANDOM.VALUE()"
  },
  {
    "text": "DBMS_RANDOM.STRING()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_RANDOM.STRING()"
  },
  {
    "text": "DBMS_RANDOM.SEED()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_RANDOM.SEED()"
  },
  {
    "text": "DBMS_RANDOM.NORMAL()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_RANDOM.NORMAL()"
  },
  {
    "text": "DBMS_PARALLEL_EXECUTE",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_PARALLEL_EXECUTE.CREATE_TASK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_PARALLEL_EXECUTE.CREATE_TASK()"
  },
  {
    "text": "DBMS_PARALLEL_EXECUTE.CREATE_CHUNKS_BY_ROWID()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_PARALLEL_EXECUTE.CREATE_CHUNKS_BY_ROWID()"
  },
  {
    "text": "DBMS_PARALLEL_EXECUTE.RUN_TASK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_PARALLEL_EXECUTE.RUN_TASK()"
  },
  {
    "text": "DBMS_PARALLEL_EXECUTE.TASK_STATUS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_PARALLEL_EXECUTE.TASK_STATUS()"
  },
  {
    "text": "DBMS_PARALLEL_EXECUTE.DROP_TASK()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_PARALLEL_EXECUTE.DROP_TASK()"
  },
  {
    "text": "DBMS_ERRLOG",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_ERRLOG.CREATE_ERROR_LOG()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_ERRLOG.CREATE_ERROR_LOG()"
  },
  {
    "text": "DBMS_AUDIT_MGMT",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_AUDIT_MGMT.CLEAN_AUDIT_TRAIL()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_AUDIT_MGMT.CLEAN_AUDIT_TRAIL()"
  },
  {
    "text": "DBMS_AUDIT_MGMT.SET_AUDIT_TRAIL_PROPERTY()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_AUDIT_MGMT.SET_AUDIT_TRAIL_PROPERTY()"
  },
  {
    "text": "DBMS_AUDIT_MGMT.CREATE_PURGE_JOB()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_AUDIT_MGMT.CREATE_PURGE_JOB()"
  },
  {
    "text": "DBMS_AUDIT_MGMT.DROP_PURGE_JOB()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_AUDIT_MGMT.DROP_PURGE_JOB()"
  },
  {
    "text": "DBMS_COMPRESSION",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_COMPRESSION.GET_COMPRESSION_TYPE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_COMPRESSION.GET_COMPRESSION_TYPE()"
  },
  {
    "text": "DBMS_COMPRESSION.GET_COMPRESSION_RATIO()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_COMPRESSION.GET_COMPRESSION_RATIO()"
  },
  {
    "text": "DBMS_XMLGEN",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "DBMS_XMLGEN.GETXML()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_XMLGEN.GETXML()"
  },
  {
    "text": "DBMS_XMLGEN.NEWCONTEXT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_XMLGEN.NEWCONTEXT()"
  },
  {
    "text": "DBMS_XMLGEN.SETROWTAG()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_XMLGEN.SETROWTAG()"
  },
  {
    "text": "DBMS_XMLGEN.SETROWSETTAG()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_XMLGEN.SETROWSETTAG()"
  },
  {
    "text": "DBMS_XMLGEN.CLOSECONTEXT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "DBMS_XMLGEN.CLOSECONTEXT()"
  },
  {
    "text": "UTL_FILE",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "UTL_FILE.FOPEN()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_FILE.FOPEN()"
  },
  {
    "text": "UTL_FILE.FCLOSE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_FILE.FCLOSE()"
  },
  {
    "text": "UTL_FILE.FCLOSE_ALL()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_FILE.FCLOSE_ALL()"
  },
  {
    "text": "UTL_FILE.GET_LINE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_FILE.GET_LINE()"
  },
  {
    "text": "UTL_FILE.PUT_LINE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_FILE.PUT_LINE()"
  },
  {
    "text": "UTL_FILE.PUT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_FILE.PUT()"
  },
  {
    "text": "UTL_FILE.PUTF()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_FILE.PUTF()"
  },
  {
    "text": "UTL_FILE.FFLUSH()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_FILE.FFLUSH()"
  },
  {
    "text": "UTL_FILE.FREMOVE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_FILE.FREMOVE()"
  },
  {
    "text": "UTL_FILE.FCOPY()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_FILE.FCOPY()"
  },
  {
    "text": "UTL_FILE.FRENAME()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_FILE.FRENAME()"
  },
  {
    "text": "UTL_FILE.IS_OPEN()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_FILE.IS_OPEN()"
  },
  {
    "text": "UTL_HTTP",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "UTL_HTTP.REQUEST()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_HTTP.REQUEST()"
  },
  {
    "text": "UTL_HTTP.REQUEST_PIECES()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_HTTP.REQUEST_PIECES()"
  },
  {
    "text": "UTL_HTTP.BEGIN_REQUEST()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_HTTP.BEGIN_REQUEST()"
  },
  {
    "text": "UTL_HTTP.SET_HEADER()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_HTTP.SET_HEADER()"
  },
  {
    "text": "UTL_HTTP.GET_RESPONSE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_HTTP.GET_RESPONSE()"
  },
  {
    "text": "UTL_HTTP.READ_TEXT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_HTTP.READ_TEXT()"
  },
  {
    "text": "UTL_HTTP.READ_LINE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_HTTP.READ_LINE()"
  },
  {
    "text": "UTL_HTTP.END_RESPONSE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_HTTP.END_RESPONSE()"
  },
  {
    "text": "UTL_HTTP.SET_TRANSFER_TIMEOUT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_HTTP.SET_TRANSFER_TIMEOUT()"
  },
  {
    "text": "UTL_TCP",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "UTL_TCP.OPEN_CONNECTION()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_TCP.OPEN_CONNECTION()"
  },
  {
    "text": "UTL_TCP.CLOSE_CONNECTION()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_TCP.CLOSE_CONNECTION()"
  },
  {
    "text": "UTL_TCP.WRITE_LINE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_TCP.WRITE_LINE()"
  },
  {
    "text": "UTL_TCP.READ_LINE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_TCP.READ_LINE()"
  },
  {
    "text": "UTL_TCP.FLUSH()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_TCP.FLUSH()"
  },
  {
    "text": "UTL_SMTP",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "UTL_SMTP.OPEN_CONNECTION()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_SMTP.OPEN_CONNECTION()"
  },
  {
    "text": "UTL_SMTP.HELO()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_SMTP.HELO()"
  },
  {
    "text": "UTL_SMTP.MAIL()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_SMTP.MAIL()"
  },
  {
    "text": "UTL_SMTP.RCPT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_SMTP.RCPT()"
  },
  {
    "text": "UTL_SMTP.DATA()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_SMTP.DATA()"
  },
  {
    "text": "UTL_SMTP.QUIT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_SMTP.QUIT()"
  },
  {
    "text": "UTL_MAIL",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "UTL_MAIL.SEND()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_MAIL.SEND()"
  },
  {
    "text": "UTL_MAIL.SEND_ATTACH_VARCHAR2()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_MAIL.SEND_ATTACH_VARCHAR2()"
  },
  {
    "text": "UTL_MAIL.SEND_ATTACH_RAW()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_MAIL.SEND_ATTACH_RAW()"
  },
  {
    "text": "UTL_RAW",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "UTL_RAW.CAST_TO_RAW()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_RAW.CAST_TO_RAW()"
  },
  {
    "text": "UTL_RAW.CAST_TO_VARCHAR2()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_RAW.CAST_TO_VARCHAR2()"
  },
  {
    "text": "UTL_RAW.CONCAT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_RAW.CONCAT()"
  },
  {
    "text": "UTL_RAW.SUBSTR()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_RAW.SUBSTR()"
  },
  {
    "text": "UTL_RAW.LENGTH()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_RAW.LENGTH()"
  },
  {
    "text": "UTL_RAW.COMPARE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_RAW.COMPARE()"
  },
  {
    "text": "UTL_RAW.BIT_AND()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_RAW.BIT_AND()"
  },
  {
    "text": "UTL_RAW.BIT_OR()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_RAW.BIT_OR()"
  },
  {
    "text": "UTL_RAW.BIT_XOR()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_RAW.BIT_XOR()"
  },
  {
    "text": "UTL_ENCODE",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "UTL_ENCODE.BASE64_ENCODE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_ENCODE.BASE64_ENCODE()"
  },
  {
    "text": "UTL_ENCODE.BASE64_DECODE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_ENCODE.BASE64_DECODE()"
  },
  {
    "text": "UTL_ENCODE.QUOTED_PRINTABLE_ENCODE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_ENCODE.QUOTED_PRINTABLE_ENCODE()"
  },
  {
    "text": "UTL_ENCODE.QUOTED_PRINTABLE_DECODE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_ENCODE.QUOTED_PRINTABLE_DECODE()"
  },
  {
    "text": "UTL_INADDR",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "UTL_INADDR.GET_HOST_NAME()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_INADDR.GET_HOST_NAME()"
  },
  {
    "text": "UTL_INADDR.GET_HOST_ADDRESS()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_INADDR.GET_HOST_ADDRESS()"
  },
  {
    "text": "UTL_I18N",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "UTL_I18N.STRING_TO_RAW()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_I18N.STRING_TO_RAW()"
  },
  {
    "text": "UTL_I18N.RAW_TO_CHAR()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_I18N.RAW_TO_CHAR()"
  },
  {
    "text": "UTL_I18N.MAP_CHARSET()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_I18N.MAP_CHARSET()"
  },
  {
    "text": "UTL_MATCH",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "UTL_MATCH.EDIT_DISTANCE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_MATCH.EDIT_DISTANCE()"
  },
  {
    "text": "UTL_MATCH.EDIT_DISTANCE_SIMILARITY()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_MATCH.EDIT_DISTANCE_SIMILARITY()"
  },
  {
    "text": "UTL_MATCH.JARO_WINKLER()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_MATCH.JARO_WINKLER()"
  },
  {
    "text": "UTL_MATCH.JARO_WINKLER_SIMILARITY()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "UTL_MATCH.JARO_WINKLER_SIMILARITY()"
  },
  {
    "text": "APEX_UTIL",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "APEX_UTIL.SET_SESSION_STATE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_UTIL.SET_SESSION_STATE()"
  },
  {
    "text": "APEX_UTIL.GET_SESSION_STATE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_UTIL.GET_SESSION_STATE()"
  },
  {
    "text": "APEX_UTIL.GET_USER_ID()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_UTIL.GET_USER_ID()"
  },
  {
    "text": "APEX_UTIL.GET_USERNAME()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_UTIL.GET_USERNAME()"
  },
  {
    "text": "APEX_UTIL.SET_SECURITY_GROUP_ID()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_UTIL.SET_SECURITY_GROUP_ID()"
  },
  {
    "text": "APEX_JSON",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "APEX_JSON.PARSE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_JSON.PARSE()"
  },
  {
    "text": "APEX_JSON.GET_VARCHAR2()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_JSON.GET_VARCHAR2()"
  },
  {
    "text": "APEX_JSON.GET_NUMBER()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_JSON.GET_NUMBER()"
  },
  {
    "text": "APEX_JSON.GET_BOOLEAN()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_JSON.GET_BOOLEAN()"
  },
  {
    "text": "APEX_JSON.OPEN_OBJECT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_JSON.OPEN_OBJECT()"
  },
  {
    "text": "APEX_JSON.CLOSE_OBJECT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_JSON.CLOSE_OBJECT()"
  },
  {
    "text": "APEX_JSON.WRITE()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_JSON.WRITE()"
  },
  {
    "text": "APEX_STRING",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "APEX_STRING.SPLIT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_STRING.SPLIT()"
  },
  {
    "text": "APEX_STRING.JOIN()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_STRING.JOIN()"
  },
  {
    "text": "APEX_STRING.GREP()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_STRING.GREP()"
  },
  {
    "text": "APEX_STRING.FORMAT()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_STRING.FORMAT()"
  },
  {
    "text": "APEX_WEB_SERVICE",
    "type": "Package",
    "icon": "📦"
  },
  {
    "text": "APEX_WEB_SERVICE.MAKE_REST_REQUEST()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_WEB_SERVICE.MAKE_REST_REQUEST()"
  },
  {
    "text": "APEX_WEB_SERVICE.MAKE_REST_REQUEST_B()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_WEB_SERVICE.MAKE_REST_REQUEST_B()"
  },
  {
    "text": "APEX_WEB_SERVICE.MAKE_REQUEST()",
    "type": "Procedure",
    "icon": "⚙",
    "snippet": "APEX_WEB_SERVICE.MAKE_REQUEST()"
  },
  {
    "text": "DBA_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TAB_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TAB_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TAB_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TAB_COMMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TAB_COMMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TAB_COMMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_COL_COMMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_COL_COMMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_COL_COMMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TAB_PARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TAB_PARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TAB_PARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TAB_SUBPARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TAB_SUBPARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TAB_SUBPARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_INDEXES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_INDEXES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_INDEXES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_IND_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_IND_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_IND_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_IND_PARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_IND_PARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_IND_PARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_IND_SUBPARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_IND_SUBPARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_IND_SUBPARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_IND_EXPRESSIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_IND_EXPRESSIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_IND_EXPRESSIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_CONSTRAINTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_CONSTRAINTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_CONSTRAINTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_CONS_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_CONS_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_CONS_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_OBJECTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_OBJECTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_OBJECTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SOURCE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SOURCE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SOURCE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_VIEWS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_VIEWS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_VIEWS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_MVIEWS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_MVIEWS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_MVIEWS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_MVIEW_LOGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_MVIEW_LOGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_MVIEW_LOGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_MVIEW_REFRESH_TIMES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_MVIEW_REFRESH_TIMES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_MVIEW_REFRESH_TIMES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TRIGGERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TRIGGERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TRIGGERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TRIGGER_COLS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TRIGGER_COLS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TRIGGER_COLS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SYNONYMS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SYNONYMS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SYNONYMS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SEQUENCES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SEQUENCES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SEQUENCES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_DEPENDENCIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_DEPENDENCIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_DEPENDENCIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ERRORS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ERRORS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ERRORS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_DB_LINKS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_DB_LINKS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_DB_LINKS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TYPES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TYPES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TYPES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TYPE_ATTRS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TYPE_ATTRS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TYPE_ATTRS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TYPE_METHODS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TYPE_METHODS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TYPE_METHODS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_COLL_TYPES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_COLL_TYPES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_COLL_TYPES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SEGMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SEGMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SEGMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_EXTENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_EXTENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_EXTENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_FREE_SPACE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_FREE_SPACE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_FREE_SPACE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_DATA_FILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_DATA_FILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_DATA_FILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TEMP_FILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TEMP_FILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TEMP_FILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TABLESPACES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TABLESPACES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TABLESPACES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TABLESPACE_USAGE_METRICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TABLESPACE_USAGE_METRICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TABLESPACE_USAGE_METRICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_USERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_USERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_USERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ROLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ROLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ROLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ROLE_PRIVS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ROLE_PRIVS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ROLE_PRIVS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SYS_PRIVS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SYS_PRIVS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SYS_PRIVS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TAB_PRIVS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TAB_PRIVS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TAB_PRIVS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_COL_PRIVS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_COL_PRIVS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_COL_PRIVS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_PROFILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_PROFILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_PROFILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_DIRECTORIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_DIRECTORIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_DIRECTORIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_LIBRARIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_LIBRARIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_LIBRARIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_LOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_LOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_LOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_LOB_PARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_LOB_PARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_LOB_PARTITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_PART_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_PART_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_PART_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_PART_INDEXES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_PART_INDEXES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_PART_INDEXES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_QUEUES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_QUEUES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_QUEUES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_QUEUE_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_QUEUE_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_QUEUE_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SCHEDULER_JOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SCHEDULER_JOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SCHEDULER_JOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SCHEDULER_PROGRAMS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SCHEDULER_PROGRAMS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SCHEDULER_PROGRAMS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SCHEDULER_SCHEDULES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SCHEDULER_SCHEDULES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SCHEDULER_SCHEDULES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SCHEDULER_JOB_RUN_DETAILS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SCHEDULER_JOB_RUN_DETAILS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SCHEDULER_JOB_RUN_DETAILS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SCHEDULER_RUNNING_JOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SCHEDULER_RUNNING_JOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SCHEDULER_RUNNING_JOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_JOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_JOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_JOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_JOBS_RUNNING",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_JOBS_RUNNING",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_JOBS_RUNNING",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_RESUMABLE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_RESUMABLE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_RESUMABLE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_RECYCLEBIN",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_RECYCLEBIN",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_RECYCLEBIN",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_REGISTRY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_REGISTRY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_REGISTRY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_FEATURE_USAGE_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_FEATURE_USAGE_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_FEATURE_USAGE_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_AUDIT_TRAIL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_AUDIT_TRAIL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_AUDIT_TRAIL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_FGA_AUDIT_TRAIL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_FGA_AUDIT_TRAIL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_FGA_AUDIT_TRAIL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_UNIFIED_AUDIT_TRAIL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_UNIFIED_AUDIT_TRAIL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_UNIFIED_AUDIT_TRAIL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_POLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_POLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_POLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_SNAPSHOT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_SNAPSHOT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_SNAPSHOT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_SYSSTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_SYSSTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_SYSSTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_SYSTEM_EVENT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_SYSTEM_EVENT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_SYSTEM_EVENT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_SQLSTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_SQLSTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_SQLSTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_SQLTEXT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_SQLTEXT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_SQLTEXT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_ACTIVE_SESS_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_ACTIVE_SESS_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_ACTIVE_SESS_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_DATABASE_INSTANCE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_DATABASE_INSTANCE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_DATABASE_INSTANCE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_SEG_STAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_SEG_STAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_SEG_STAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_TABLESPACE_STAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_TABLESPACE_STAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_TABLESPACE_STAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_PGASTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_PGASTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_PGASTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_SGASTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_SGASTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_SGASTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_OSSTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_OSSTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_OSSTAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_WR_CONTROL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_WR_CONTROL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_WR_CONTROL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_SEG_STAT_OBJ",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_SEG_STAT_OBJ",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_SEG_STAT_OBJ",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_ROWCACHE_SUMMARY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_ROWCACHE_SUMMARY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_ROWCACHE_SUMMARY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_IOSTAT_DETAIL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_IOSTAT_DETAIL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_IOSTAT_DETAIL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_LATCH",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_LATCH",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_LATCH",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_MUTEX_SLEEP",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_MUTEX_SLEEP",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_MUTEX_SLEEP",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_EVENT_HISTOGRAM",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_EVENT_HISTOGRAM",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_EVENT_HISTOGRAM",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_BG_EVENT_HISTOGRAM",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_BG_EVENT_HISTOGRAM",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_BG_EVENT_HISTOGRAM",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIST_INTERCONNECT_PINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIST_INTERCONNECT_PINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIST_INTERCONNECT_PINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_AUTOTASK_CLIENT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_AUTOTASK_CLIENT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_AUTOTASK_CLIENT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_AUTOTASK_SCHEDULE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_AUTOTASK_SCHEDULE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_AUTOTASK_SCHEDULE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_AUTOTASK_TASK",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_AUTOTASK_TASK",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_AUTOTASK_TASK",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_AUTOTASK_JOB_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_AUTOTASK_JOB_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_AUTOTASK_JOB_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_NETWORK_ACLS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_NETWORK_ACLS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_NETWORK_ACLS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_NETWORK_ACL_PRIVILEGES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_NETWORK_ACL_PRIVILEGES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_NETWORK_ACL_PRIVILEGES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_WALLET_ACLS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_WALLET_ACLS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_WALLET_ACLS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_EXTERNAL_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_EXTERNAL_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_EXTERNAL_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_EXTERNAL_LOCATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_EXTERNAL_LOCATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_EXTERNAL_LOCATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_XML_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_XML_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_XML_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_XML_VIEWS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_XML_VIEWS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_XML_VIEWS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_XML_TAB_COLS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_XML_TAB_COLS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_XML_TAB_COLS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_OUTLINES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_OUTLINES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_OUTLINES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SQL_PROFILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SQL_PROFILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SQL_PROFILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SQL_PLAN_BASELINES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SQL_PLAN_BASELINES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SQL_PLAN_BASELINES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SQL_PATCHES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SQL_PATCHES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SQL_PATCHES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SQLSET",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SQLSET",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SQLSET",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SQLSET_STATEMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SQLSET_STATEMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SQLSET_STATEMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ADVISOR_TASKS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ADVISOR_TASKS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ADVISOR_TASKS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ADVISOR_RECOMMENDATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ADVISOR_RECOMMENDATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ADVISOR_RECOMMENDATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ADVISOR_ACTIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ADVISOR_ACTIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ADVISOR_ACTIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ADDM_TASKS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ADDM_TASKS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ADDM_TASKS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ADDM_FINDINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ADDM_FINDINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ADDM_FINDINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_INMEMORY_OBJECTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_INMEMORY_OBJECTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_INMEMORY_OBJECTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_INMEMORY_FASTSTART_AREA",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_INMEMORY_FASTSTART_AREA",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_INMEMORY_FASTSTART_AREA",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_PDBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_PDBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_PDBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_PDB_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_PDB_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_PDB_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SERVICES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SERVICES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SERVICES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_CONTAINERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_CONTAINERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_CONTAINERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_RSRC_PLANS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_RSRC_PLANS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_RSRC_PLANS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_RSRC_PLAN_DIRECTIVES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_RSRC_PLAN_DIRECTIVES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_RSRC_PLAN_DIRECTIVES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_RSRC_CONSUMER_GROUPS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_RSRC_CONSUMER_GROUPS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_RSRC_CONSUMER_GROUPS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "V$SESSION",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SESSION",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$PROCESS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$PROCESS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SQL",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SQL",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SQLAREA",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SQLAREA",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SQL_PLAN",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SQL_PLAN",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SQL_PLAN_STATISTICS_ALL",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SQL_PLAN_STATISTICS_ALL",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SQLTEXT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SQLTEXT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SQL_MONITOR",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SQL_MONITOR",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SQL_WORKAREA",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SQL_WORKAREA",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SQL_WORKAREA_ACTIVE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SQL_WORKAREA_ACTIVE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SQL_BIND_CAPTURE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SQL_BIND_CAPTURE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SQL_SHARED_CURSOR",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SQL_SHARED_CURSOR",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$TRANSACTION",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$TRANSACTION",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$LOCK",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$LOCK",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$LOCKED_OBJECT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$LOCKED_OBJECT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ACTIVE_SESSION_HISTORY",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ACTIVE_SESSION_HISTORY",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SESSION_WAIT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SESSION_WAIT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SESSION_EVENT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SESSION_EVENT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SYSTEM_EVENT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SYSTEM_EVENT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SYSTEM_WAIT_CLASS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SYSTEM_WAIT_CLASS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SYSSTAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SYSSTAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SESSTAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SESSTAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$STATNAME",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$STATNAME",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$OSSTAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$OSSTAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$PARAMETER",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$PARAMETER",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$PARAMETER2",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$PARAMETER2",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SPPARAMETER",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SPPARAMETER",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SGA",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SGA",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SGAINFO",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SGAINFO",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SGA_TARGET_ADVICE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SGA_TARGET_ADVICE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$PGASTAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$PGASTAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$PGA_TARGET_ADVICE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$PGA_TARGET_ADVICE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$MEMORY_DYNAMIC_COMPONENTS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$MEMORY_DYNAMIC_COMPONENTS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$BUFFER_POOL",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$BUFFER_POOL",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$DB_CACHE_ADVICE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$DB_CACHE_ADVICE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SHARED_POOL_ADVICE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SHARED_POOL_ADVICE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ROWCACHE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ROWCACHE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$LIBRARYCACHE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$LIBRARYCACHE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$DATABASE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$DATABASE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$INSTANCE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$INSTANCE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$VERSION",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$VERSION",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$OPTION",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$OPTION",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$LICENSE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$LICENSE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$CONTROLFILE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$CONTROLFILE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$DATAFILE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$DATAFILE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$DATAFILE_HEADER",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$DATAFILE_HEADER",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$TEMPFILE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$TEMPFILE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$FILESTAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$FILESTAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$TEMPSTAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$TEMPSTAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$TABLESPACE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$TABLESPACE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$LOG",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$LOG",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$LOGFILE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$LOGFILE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$LOG_HISTORY",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$LOG_HISTORY",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ARCHIVED_LOG",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ARCHIVED_LOG",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ARCHIVE_DEST",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ARCHIVE_DEST",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ARCHIVE_DEST_STATUS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ARCHIVE_DEST_STATUS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$BACKUP",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$BACKUP",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$BACKUP_SET",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$BACKUP_SET",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$BACKUP_PIECE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$BACKUP_PIECE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$BACKUP_DATAFILE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$BACKUP_DATAFILE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RMAN_STATUS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RMAN_STATUS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RMAN_BACKUP_JOB_DETAILS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RMAN_BACKUP_JOB_DETAILS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RMAN_OUTPUT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RMAN_OUTPUT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$FAST_RECOVERY_AREA_USAGE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$FAST_RECOVERY_AREA_USAGE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$FLASH_RECOVERY_AREA_USAGE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$FLASH_RECOVERY_AREA_USAGE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RECOVERY_FILE_DEST",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RECOVERY_FILE_DEST",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RECOVERY_PROGRESS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RECOVERY_PROGRESS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RESTORE_POINT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RESTORE_POINT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ASM_DISKGROUP",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ASM_DISKGROUP",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ASM_DISK",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ASM_DISK",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ASM_OPERATION",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ASM_OPERATION",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$DATAGUARD_STATUS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$DATAGUARD_STATUS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$DATAGUARD_STATS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$DATAGUARD_STATS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$MANAGED_STANDBY",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$MANAGED_STANDBY",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$STANDBY_LOG",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$STANDBY_LOG",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SERVICES",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SERVICES",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ACCESS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ACCESS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$OPEN_CURSOR",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$OPEN_CURSOR",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SQL_CURSOR",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SQL_CURSOR",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$TEMP_EXTENT_MAP",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$TEMP_EXTENT_MAP",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SORT_USAGE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SORT_USAGE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$TEMPSEG_USAGE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$TEMPSEG_USAGE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$MUTEX_SLEEP",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$MUTEX_SLEEP",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$MUTEX_SLEEP_HISTORY",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$MUTEX_SLEEP_HISTORY",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$LATCH",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$LATCH",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$LATCH_CHILDREN",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$LATCH_CHILDREN",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$LATCH_HOLDER",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$LATCH_HOLDER",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ENQUEUE_STAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ENQUEUE_STAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$UNDOSTAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$UNDOSTAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ROLLSTAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ROLLSTAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ROLLNAME",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ROLLNAME",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RESOURCE_LIMIT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RESOURCE_LIMIT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$EVENT_NAME",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$EVENT_NAME",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$WAITCLASSMETRIC",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$WAITCLASSMETRIC",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SYSMETRIC",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SYSMETRIC",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SYSMETRIC_HISTORY",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SYSMETRIC_HISTORY",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ENCRYPTION_WALLET",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ENCRYPTION_WALLET",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$ENCRYPTED_TABLESPACES",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$ENCRYPTED_TABLESPACES",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$CONTAINERS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$CONTAINERS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$CONTEXT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$CONTEXT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$CORRUPT_CHECKSUM",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$CORRUPT_CHECKSUM",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$DATABASE_BLOCK_CORRUPTION",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$DATABASE_BLOCK_CORRUPTION",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$DATABASE_INCARNATION",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$DATABASE_INCARNATION",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$DATAFILE_COPY",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$DATAFILE_COPY",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$DB_PIPES",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$DB_PIPES",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$DIAG_INFO",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$DIAG_INFO",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$DISPATCHER",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$DISPATCHER",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$DYNAMIC_COMPONENTS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$DYNAMIC_COMPONENTS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$EDITION",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$EDITION",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$FAST_START_SERVERS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$FAST_START_SERVERS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$FAST_START_TRANSACTIONS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$FAST_START_TRANSACTIONS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$GLOBAL_TRANSACTION",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$GLOBAL_TRANSACTION",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$HANG_ANALYSIS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$HANG_ANALYSIS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$HANG_INFO",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$HANG_INFO",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$HEAT_MAP_SEGMENT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$HEAT_MAP_SEGMENT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$HM_RUN",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$HM_RUN",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$HM_FINDING",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$HM_FINDING",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$HM_RECOMMENDATION",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$HM_RECOMMENDATION",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$INMEMORY_AREA",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$INMEMORY_AREA",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$INMEMORY_FASTSTART_AREA",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$INMEMORY_FASTSTART_AREA",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$INSTANCE_CACHE_TRANSFER",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$INSTANCE_CACHE_TRANSFER",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$INSTANCE_RECOVERY",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$INSTANCE_RECOVERY",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$INTERCONNECT_PINGS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$INTERCONNECT_PINGS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$IO_CALIBRATION_STATUS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$IO_CALIBRATION_STATUS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$IOFUNCMETRIC",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$IOFUNCMETRIC",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$IOFUNCMETRIC_HISTORY",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$IOFUNCMETRIC_HISTORY",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$IOSTAT_CONSUMER_GROUP",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$IOSTAT_CONSUMER_GROUP",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$IOSTAT_FILE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$IOSTAT_FILE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$IOSTAT_FUNCTION",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$IOSTAT_FUNCTION",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$IOSTAT_NETWORK",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$IOSTAT_NETWORK",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$PX_PROCESS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$PX_PROCESS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$PX_PROCESS_SYSSTAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$PX_PROCESS_SYSSTAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$PX_SESSION",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$PX_SESSION",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$PX_SESSTAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$PX_SESSTAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RESERVED_WORDS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RESERVED_WORDS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RESOURCE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RESOURCE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RESULT_CACHE_DEPENDENCY",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RESULT_CACHE_DEPENDENCY",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RESULT_CACHE_MEMORY",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RESULT_CACHE_MEMORY",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RESULT_CACHE_OBJECTS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RESULT_CACHE_OBJECTS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RESULT_CACHE_STATISTICS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RESULT_CACHE_STATISTICS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RSRC_CONSUMER_GROUP",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RSRC_CONSUMER_GROUP",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RSRC_PLAN",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RSRC_PLAN",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$RSRC_SESSION_INFO",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$RSRC_SESSION_INFO",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SEGMENT_STATISTICS",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SEGMENT_STATISTICS",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SEGSTAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SEGSTAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SESS_TIME_MODEL",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SESS_TIME_MODEL",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SYS_TIME_MODEL",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SYS_TIME_MODEL",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$SYSTEM_FIX_CONTROL",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$SYSTEM_FIX_CONTROL",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$TEMP_CACHE_TRANSFER",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$TEMP_CACHE_TRANSFER",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$TEMP_SPACE_HEADER",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$TEMP_SPACE_HEADER",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$TEMPUNDOSTAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$TEMPUNDOSTAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$THREAD",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$THREAD",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$TOPLEVELCALL_NAME",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$TOPLEVELCALL_NAME",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$TRANSACTION_ENQUEUE",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$TRANSACTION_ENQUEUE",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$VPD_POLICY",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$VPD_POLICY",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$WAITSTAT",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$WAITSTAT",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$WALLET",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$WALLET",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "V$XML_AUDIT_TRAIL",
    "type": "DynamicView",
    "icon": "📊"
  },
  {
    "text": "GV$XML_AUDIT_TRAIL",
    "type": "DynamicView",
    "icon": "🌐"
  },
  {
    "text": "/*+ ALL_ROWS */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ ALL_ROWS */"
  },
  {
    "text": "/*+ FIRST_ROWS(10) */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ FIRST_ROWS(10) */"
  },
  {
    "text": "/*+ FULL() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ FULL( ) */"
  },
  {
    "text": "/*+ INDEX() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ INDEX(table_alias index_name) */"
  },
  {
    "text": "/*+ INDEX_FFS() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ INDEX_FFS(table_alias index_name) */"
  },
  {
    "text": "/*+ INDEX_SS() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ INDEX_SS(table_alias index_name) */"
  },
  {
    "text": "/*+ INDEX_ASC() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ INDEX_ASC(table_alias index_name) */"
  },
  {
    "text": "/*+ INDEX_DESC() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ INDEX_DESC(table_alias index_name) */"
  },
  {
    "text": "/*+ INDEX_COMBINE() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ INDEX_COMBINE( ) */"
  },
  {
    "text": "/*+ INDEX_JOIN() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ INDEX_JOIN( ) */"
  },
  {
    "text": "/*+ NO_INDEX() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_INDEX(table_alias index_name) */"
  },
  {
    "text": "/*+ NO_INDEX_FFS() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_INDEX_FFS(table_alias index_name) */"
  },
  {
    "text": "/*+ NO_INDEX_SS() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_INDEX_SS(table_alias index_name) */"
  },
  {
    "text": "/*+ LEADING() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ LEADING(t1 t2 t3) */"
  },
  {
    "text": "/*+ ORDERED */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ ORDERED */"
  },
  {
    "text": "/*+ USE_NL() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ USE_NL(t2) */"
  },
  {
    "text": "/*+ USE_NL_WITH_INDEX() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ USE_NL_WITH_INDEX(t2 ix_name) */"
  },
  {
    "text": "/*+ USE_HASH() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ USE_HASH(t2) */"
  },
  {
    "text": "/*+ USE_MERGE() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ USE_MERGE(t2) */"
  },
  {
    "text": "/*+ NO_USE_NL() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_USE_NL(t2) */"
  },
  {
    "text": "/*+ NO_USE_HASH() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_USE_HASH(t2) */"
  },
  {
    "text": "/*+ NO_USE_MERGE() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_USE_MERGE(t2) */"
  },
  {
    "text": "/*+ PARALLEL(4) */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ PARALLEL(t, 4) */"
  },
  {
    "text": "/*+ NOPARALLEL() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NOPARALLEL(t) */"
  },
  {
    "text": "/*+ PARALLEL_INDEX() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ PARALLEL_INDEX(t ix, 4) */"
  },
  {
    "text": "/*+ NOPARALLEL_INDEX() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NOPARALLEL_INDEX(t ix) */"
  },
  {
    "text": "/*+ PQ_DISTRIBUTE() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ PQ_DISTRIBUTE(t HASH HASH) */"
  },
  {
    "text": "/*+ APPEND */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ APPEND */"
  },
  {
    "text": "/*+ NOAPPEND */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NOAPPEND */"
  },
  {
    "text": "/*+ APPEND_VALUES */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ APPEND_VALUES */"
  },
  {
    "text": "/*+ MONITOR */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ MONITOR */"
  },
  {
    "text": "/*+ NO_MONITOR */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_MONITOR */"
  },
  {
    "text": "/*+ GATHER_PLAN_STATISTICS */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ GATHER_PLAN_STATISTICS */"
  },
  {
    "text": "/*+ RESULT_CACHE */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ RESULT_CACHE */"
  },
  {
    "text": "/*+ NO_RESULT_CACHE */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_RESULT_CACHE */"
  },
  {
    "text": "/*+ PUSH_PRED() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ PUSH_PRED(v) */"
  },
  {
    "text": "/*+ NO_PUSH_PRED() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_PUSH_PRED(v) */"
  },
  {
    "text": "/*+ PUSH_SUBQ() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ PUSH_SUBQ( ) */"
  },
  {
    "text": "/*+ NO_PUSH_SUBQ() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_PUSH_SUBQ( ) */"
  },
  {
    "text": "/*+ MERGE() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ MERGE(v) */"
  },
  {
    "text": "/*+ NO_MERGE() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_MERGE(v) */"
  },
  {
    "text": "/*+ UNNEST */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ UNNEST */"
  },
  {
    "text": "/*+ NO_UNNEST */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_UNNEST */"
  },
  {
    "text": "/*+ EXPAND_TABLE() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ EXPAND_TABLE(t) */"
  },
  {
    "text": "/*+ NO_EXPAND */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_EXPAND */"
  },
  {
    "text": "/*+ USE_CONCAT */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ USE_CONCAT */"
  },
  {
    "text": "/*+ CARDINALITY() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ CARDINALITY(t 1000) */"
  },
  {
    "text": "/*+ OPT_ESTIMATE() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ OPT_ESTIMATE(TABLE, t, SCALE_ROWS=10) */"
  },
  {
    "text": "/*+ OPT_PARAM() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ OPT_PARAM('_optimizer_cost_based_transformation', 'off') */"
  },
  {
    "text": "/*+ QB_NAME() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ QB_NAME(main_query) */"
  },
  {
    "text": "/*+ INLINE */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ INLINE */"
  },
  {
    "text": "/*+ NO_INLINE */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ NO_INLINE */"
  },
  {
    "text": "/*+ DRIVING_SITE() */",
    "type": "Hint",
    "icon": "💡",
    "snippet": "/*+ DRIVING_SITE(t) */"
  },
  {
    "text": "TABLESPACE_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TABLE_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "COLUMN_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DATA_TYPE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DATA_LENGTH",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DATA_PRECISION",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DATA_SCALE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "NULLABLE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "COLUMN_ID",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DEFAULT_LENGTH",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DATA_DEFAULT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "NUM_DISTINCT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "LOW_VALUE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "HIGH_VALUE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DENSITY",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "NUM_NULLS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "NUM_BUCKETS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "LAST_ANALYZED",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SAMPLE_SIZE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CHARACTER_SET_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CHAR_COL_DECL_LENGTH",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "GLOBAL_STATS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "USER_STATS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "AVG_COL_LEN",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CHAR_LENGTH",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CHAR_USED",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "V80_FMT_IMAGE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DATA_UPGRADED",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "HISTOGRAM",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "OWNER",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "INDEX_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "INDEX_TYPE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TABLE_OWNER",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TABLE_TYPE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "UNIQUENESS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "COMPRESSION",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "PREFIX_LENGTH",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "STATUS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "NUM_ROWS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "BLOCKS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "EMPTY_BLOCKS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "AVG_SPACE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CHAIN_CNT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "AVG_ROW_LEN",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "AVG_SPACE_FREELIST_BLOCKS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "NUM_FREELIST_BLOCKS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DEGREE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "INSTANCES",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "BUFFER_POOL",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "FLASH_CACHE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CELL_FLASH_CACHE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "PARTITIONED",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "IOT_TYPE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TEMPORARY",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SECONDARY",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "NESTED",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "USER_GENERATED",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DURATION",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CLUSTER_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CLUSTER_OWNER",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "OBJECT_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SUBOBJECT_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "OBJECT_ID",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DATA_OBJECT_ID",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "OBJECT_TYPE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CREATED",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "LAST_DDL_TIME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "GENERATED",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "NAMESPACE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "EDITION_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SHARING",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "EDITIONABLE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "ORACLE_MAINTAINED",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SID",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SERIAL#",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "USERNAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "COMMAND",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "OSUSER",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "PROCESS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "MACHINE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "PORT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TERMINAL",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "PROGRAM",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TYPE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SQL_ID",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SQL_CHILD_NUMBER",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SQL_EXEC_START",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SQL_EXEC_ID",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "PREV_SQL_ID",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "PREV_CHILD_NUMBER",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "MODULE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "MODULE_HASH",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "ACTION",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "ACTION_HASH",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CLIENT_INFO",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "FIXED_TABLE_SEQUENCE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "ROW_WAIT_OBJ#",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "ROW_WAIT_FILE#",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "ROW_WAIT_BLOCK#",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "ROW_WAIT_ROW#",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TOP_LEVEL_CALL#",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "LOGON_TIME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "LAST_CALL_ET",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "PDML_STATUS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "PDDL_STATUS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "PQ_STATUS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CURRENT_QUEUE_DURATION",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CLIENT_IDENTIFIER",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "BLOCKING_SESSION_STATUS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "BLOCKING_INSTANCE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "BLOCKING_SESSION",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "FINAL_BLOCKING_SESSION_STATUS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "FINAL_BLOCKING_INSTANCE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "FINAL_BLOCKING_SESSION",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SEQ#",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "EVENT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "EVENT#",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "P1TEXT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "P1",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "P1RAW",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "P2TEXT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "P2",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "P2RAW",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "P3TEXT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "P3",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "P3RAW",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "WAIT_CLASS_ID",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "WAIT_CLASS#",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "WAIT_CLASS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "WAIT_TIME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SECONDS_IN_WAIT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "STATE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "WAIT_TIME_MICRO",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TIME_REMAINING_MICRO",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TIME_SINCE_LAST_WAIT_MICRO",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SERVICE_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SQL_TRACE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SQL_TRACE_WAITS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SQL_TRACE_BINDS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SQL_TRACE_PLAN_STATS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "FILE_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "FILE_ID",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "BYTES",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "MAXBYTES",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "INCREMENT_BY",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "USER_BYTES",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "USER_BLOCKS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "ONLINE_STATUS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "AUTOEXTENSIBLE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "BLOCK_SIZE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "INITIAL_EXTENT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "NEXT_EXTENT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "MIN_EXTENTS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "MAX_EXTENTS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "MAX_SIZE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "PCT_INCREASE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "MIN_EXTLEN",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CONTENTS",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "FORCE_LOGGING",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "EXTENT_MANAGEMENT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "ALLOCATION_TYPE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "PLUGGED_IN",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SEGMENT_SPACE_MANAGEMENT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DEF_TAB_COMPRESSION",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "RETENTION",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "BIGFILE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "PREDICATE_EVALUATION",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "ENCRYPTED",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "COMPRESS_FOR",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DEF_INMEMORY",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DEF_INMEMORY_PRIORITY",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DEF_INMEMORY_DISTRIBUTE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DEF_INMEMORY_COMPRESSION",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DEF_INMEMORY_DUPLICATE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CONSTRAINT_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CONSTRAINT_TYPE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SEARCH_CONDITION",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "R_OWNER",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "R_CONSTRAINT_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DELETE_RULE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DEFERRABLE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DEFERRED",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "VALIDATED",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "VIEW_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TEXT_LENGTH",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TEXT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TEXT_VC",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TYPE_TEXT_LENGTH",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TYPE_TEXT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "OID_TEXT_LENGTH",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "OID_TEXT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "VIEW_TYPE_OWNER",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "VIEW_TYPE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SUPERVIEW_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "EDITIONING_VIEW",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "READ_ONLY",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CONTAINER_DATA",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "BEQUEATH",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "ORIGIN_CON_ID",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SEQUENCE_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "MIN_VALUE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "MAX_VALUE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CYCLE_FLAG",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "ORDER_FLAG",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "CACHE_SIZE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "LAST_NUMBER",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "SYNONYM_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DB_LINK",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TRIGGER_NAME",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TRIGGER_TYPE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TRIGGERING_EVENT",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "BASE_OBJECT_TYPE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "REFERENCING_NAMES",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "WHEN_CLAUSE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "ACTION_TYPE",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "TRIGGER_BODY",
    "type": "Column",
    "icon": "🔹"
  },
  {
    "text": "DBA_ADVISOR_LOG",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ADVISOR_LOG",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ADVISOR_LOG",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ADVISOR_PARAMETERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ADVISOR_PARAMETERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ADVISOR_PARAMETERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ALERT_ARGUMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ALERT_ARGUMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ALERT_ARGUMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ANALYTIC_VIEWS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ANALYTIC_VIEWS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ANALYTIC_VIEWS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_APPLICATION_ROLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_APPLICATION_ROLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_APPLICATION_ROLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_APPLY_CONFLICT_HANDLERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_APPLY_CONFLICT_HANDLERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_APPLY_CONFLICT_HANDLERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_APPLY_DML_HANDLERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_APPLY_DML_HANDLERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_APPLY_DML_HANDLERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_APPLY_ERROR",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_APPLY_ERROR",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_APPLY_ERROR",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_APPLY_PARAMETERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_APPLY_PARAMETERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_APPLY_PARAMETERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_AUDIT_MGMT_CLEANUP_JOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_AUDIT_MGMT_CLEANUP_JOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_AUDIT_MGMT_CLEANUP_JOBS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_AUDIT_MGMT_CLEAN_EVENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_AUDIT_MGMT_CLEAN_EVENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_AUDIT_MGMT_CLEAN_EVENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_AUDIT_MGMT_CONFIG_PARAMS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_AUDIT_MGMT_CONFIG_PARAMS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_AUDIT_MGMT_CONFIG_PARAMS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_AUDIT_POLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_AUDIT_POLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_AUDIT_POLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_AUTO_STAT_EXECUTIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_AUTO_STAT_EXECUTIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_AUTO_STAT_EXECUTIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_BLOCKERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_BLOCKERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_BLOCKERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_CHANGE_NOTIFICATION_REGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_CHANGE_NOTIFICATION_REGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_CHANGE_NOTIFICATION_REGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_CHECKPOINT_RUNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_CHECKPOINT_RUNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_CHECKPOINT_RUNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_COMPARISON",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_COMPARISON",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_COMPARISON",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_COMPARISON_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_COMPARISON_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_COMPARISON_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_COMPARISON_ROW_DIF",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_COMPARISON_ROW_DIF",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_COMPARISON_ROW_DIF",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_COMPARISON_SCAN",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_COMPARISON_SCAN",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_COMPARISON_SCAN",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_COMPARISON_SCAN_VALUES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_COMPARISON_SCAN_VALUES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_COMPARISON_SCAN_VALUES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_CONNECT_ROLE_GRANTEES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_CONNECT_ROLE_GRANTEES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_CONNECT_ROLE_GRANTEES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_CPU_USAGE_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_CPU_USAGE_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_CPU_USAGE_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_DATA_FILES_OFFLINE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_DATA_FILES_OFFLINE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_DATA_FILES_OFFLINE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_DB_ENCRYPTED_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_DB_ENCRYPTED_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_DB_ENCRYPTED_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_DML_LOCKS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_DML_LOCKS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_DML_LOCKS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ENABLED_TRACES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ENABLED_TRACES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ENABLED_TRACES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_EPG_DAD_AUTHORIZATION",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_EPG_DAD_AUTHORIZATION",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_EPG_DAD_AUTHORIZATION",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_EXP_FILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_EXP_FILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_EXP_FILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_FAILED_LOGIN_ATTEMPTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_FAILED_LOGIN_ATTEMPTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_FAILED_LOGIN_ATTEMPTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_FEATURE_USAGE_DETAILS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_FEATURE_USAGE_DETAILS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_FEATURE_USAGE_DETAILS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_FILE_GROUPS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_FILE_GROUPS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_FILE_GROUPS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_FLASHBACK_ARCHIVE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_FLASHBACK_ARCHIVE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_FLASHBACK_ARCHIVE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_FLASHBACK_ARCHIVE_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_FLASHBACK_ARCHIVE_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_FLASHBACK_ARCHIVE_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_FLASHBACK_ARCHIVE_TS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_FLASHBACK_ARCHIVE_TS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_FLASHBACK_ARCHIVE_TS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_FREE_EXTENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_FREE_EXTENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_FREE_EXTENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_GLOBAL_CONTEXT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_GLOBAL_CONTEXT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_GLOBAL_CONTEXT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIERARCHIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIERARCHIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIERARCHIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HIER_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HIER_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HIER_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_HOT_STANDBY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_HOT_STANDBY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_HOT_STANDBY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_IDENTITY_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_IDENTITY_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_IDENTITY_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ILMDATAMOVEMENTPOLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ILMDATAMOVEMENTPOLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ILMDATAMOVEMENTPOLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ILMPOLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ILMPOLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ILMPOLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ILMRESULTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ILMRESULTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ILMRESULTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_INMEMORY_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_INMEMORY_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_INMEMORY_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_JAVA_CLASSES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_JAVA_CLASSES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_JAVA_CLASSES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_JAVA_DERIVATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_JAVA_DERIVATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_JAVA_DERIVATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_JAVA_FIELDS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_JAVA_FIELDS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_JAVA_FIELDS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_JAVA_LAYOUTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_JAVA_LAYOUTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_JAVA_LAYOUTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_JAVA_METHODS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_JAVA_METHODS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_JAVA_METHODS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_JAVA_POLICY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_JAVA_POLICY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_JAVA_POLICY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_JSON_DATAGUIDES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_JSON_DATAGUIDES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_JSON_DATAGUIDES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_JVM_PERMISSIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_JVM_PERMISSIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_JVM_PERMISSIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_LOCK_INTERNAL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_LOCK_INTERNAL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_LOCK_INTERNAL",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_LOCKED_SEGMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_LOCKED_SEGMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_LOCKED_SEGMENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_LOGSTDBY_EVENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_LOGSTDBY_EVENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_LOGSTDBY_EVENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_LOGSTDBY_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_LOGSTDBY_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_LOGSTDBY_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_LOGSTDBY_NOT_UNIQUE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_LOGSTDBY_NOT_UNIQUE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_LOGSTDBY_NOT_UNIQUE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_LOGSTDBY_PARAMETERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_LOGSTDBY_PARAMETERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_LOGSTDBY_PARAMETERS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_LOGSTDBY_SKIP",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_LOGSTDBY_SKIP",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_LOGSTDBY_SKIP",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_LOGSTDBY_STATE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_LOGSTDBY_STATE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_LOGSTDBY_STATE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_METRIC_DEFINITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_METRIC_DEFINITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_METRIC_DEFINITIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_MINING_MODELS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_MINING_MODELS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_MINING_MODELS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_MUTEX_SLEEP_HIST",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_MUTEX_SLEEP_HIST",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_MUTEX_SLEEP_HIST",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_OBJ_AUDIT_OPTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_OBJ_AUDIT_OPTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_OBJ_AUDIT_OPTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_OPTSTAT_OPERATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_OPTSTAT_OPERATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_OPTSTAT_OPERATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_OUTLINE_HINTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_OUTLINE_HINTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_OUTLINE_HINTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_PARALLEL_EXECUTION_STAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_PARALLEL_EXECUTION_STAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_PARALLEL_EXECUTION_STAT",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_PART_COL_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_PART_COL_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_PART_COL_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_PASSWORD_LIMITS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_PASSWORD_LIMITS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_PASSWORD_LIMITS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_PENDING_CONV_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_PENDING_CONV_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_PENDING_CONV_TABLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_PGA_TARGET_ADVICE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_PGA_TARGET_ADVICE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_PGA_TARGET_ADVICE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_PLSQL_OBJECT_SETTINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_PLSQL_OBJECT_SETTINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_PLSQL_OBJECT_SETTINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_POLICY_CONTEXTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_POLICY_CONTEXTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_POLICY_CONTEXTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_PRIV_AUDIT_OPTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_PRIV_AUDIT_OPTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_PRIV_AUDIT_OPTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_RECOVERABLE_TRANSACTIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_RECOVERABLE_TRANSACTIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_RECOVERABLE_TRANSACTIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_REDOLOG_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_REDOLOG_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_REDOLOG_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_REFRESH",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_REFRESH",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_REFRESH",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_REFRESH_CHILDREN",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_REFRESH_CHILDREN",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_REFRESH_CHILDREN",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_RESOURCE_INCARNATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_RESOURCE_INCARNATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_RESOURCE_INCARNATIONS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ROLLING_EVENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ROLLING_EVENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ROLLING_EVENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_RSRC_CATEGORIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_RSRC_CATEGORIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_RSRC_CATEGORIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_RSRC_GROUP_MAPPINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_RSRC_GROUP_MAPPINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_RSRC_GROUP_MAPPINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_RSRC_MAPPING_PRIORITY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_RSRC_MAPPING_PRIORITY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_RSRC_MAPPING_PRIORITY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_RSRC_PLAN_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_RSRC_PLAN_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_RSRC_PLAN_HISTORY",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SECUREFILE_INFO",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SECUREFILE_INFO",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SECUREFILE_INFO",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SEGMENT_ADVISOR_RESULTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SEGMENT_ADVISOR_RESULTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SEGMENT_ADVISOR_RESULTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SERVER_REGISTRY_COMP",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SERVER_REGISTRY_COMP",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SERVER_REGISTRY_COMP",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SERVICES_ACTIVE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SERVICES_ACTIVE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SERVICES_ACTIVE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SGA_COMPONENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SGA_COMPONENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SGA_COMPONENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SHARED_OBJECTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SHARED_OBJECTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SHARED_OBJECTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SNAPSHOTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SNAPSHOTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SNAPSHOTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SQL_MONITOR_SAMPLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SQL_MONITOR_SAMPLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SQL_MONITOR_SAMPLES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SQL_QUARANTINE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SQL_QUARANTINE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SQL_QUARANTINE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SQL_TRANSLATION_PROFILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SQL_TRANSLATION_PROFILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SQL_TRANSLATION_PROFILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_STREAMS_ADMINISTRATOR",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_STREAMS_ADMINISTRATOR",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_STREAMS_ADMINISTRATOR",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_STREAMS_RULES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_STREAMS_RULES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_STREAMS_RULES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_STREAMS_SPLIT_MERGE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_STREAMS_SPLIT_MERGE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_STREAMS_SPLIT_MERGE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SYS_WAIT_HISTOGRAM",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SYS_WAIT_HISTOGRAM",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SYS_WAIT_HISTOGRAM",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_SYSTEM_PRIVILEGE_MAP",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_SYSTEM_PRIVILEGE_MAP",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_SYSTEM_PRIVILEGE_MAP",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TABLE_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TABLE_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TABLE_STATISTICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TABLESPACE_GROUPS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TABLESPACE_GROUPS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TABLESPACE_GROUPS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TABLESPACE_METRICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TABLESPACE_METRICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TABLESPACE_METRICS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TEMP_EXTENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TEMP_EXTENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TEMP_EXTENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TRACE_FILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TRACE_FILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TRACE_FILES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TRANSFORMATION_RULES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TRANSFORMATION_RULES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TRANSFORMATION_RULES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_TS_QUOTAS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_TS_QUOTAS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_TS_QUOTAS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_USED_EXTENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_USED_EXTENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_USED_EXTENTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_USED_FREE_SPACE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_USED_FREE_SPACE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_USED_FREE_SPACE",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_USERS_WITH_DEFAULTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_USERS_WITH_DEFAULTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_USERS_WITH_DEFAULTS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_VIEW_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_VIEW_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_VIEW_COLUMNS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_VPD_POLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_VPD_POLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_VPD_POLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_WAIT_CLASSES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_WAIT_CLASSES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_WAIT_CLASSES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_WALLETS_OPEN",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_WALLETS_OPEN",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_WALLETS_OPEN",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_WARNING_SETTINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_WARNING_SETTINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_WARNING_SETTINGS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_WORKFLOW_STEPS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_WORKFLOW_STEPS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_WORKFLOW_STEPS",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_XSTREAM_INBOUND",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_XSTREAM_INBOUND",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_XSTREAM_INBOUND",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_XSTREAM_OUTBOUND",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_XSTREAM_OUTBOUND",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_XSTREAM_OUTBOUND",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "DBA_ZDLRA_PROTECTION_POLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "ALL_ZDLRA_PROTECTION_POLICIES",
    "type": "Dictionary",
    "icon": "📚"
  },
  {
    "text": "USER_ZDLRA_PROTECTION_POLICIES",
    "type": "Dictionary",
    "icon": "📚"
  }
];
