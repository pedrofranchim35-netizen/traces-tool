/* ==========================================================================
   TRACES ORACLE STUDIO - MOCK DATABASE & INSTANCE DATA
   ========================================================================== */

window.TRACES_DB = {
  // Connection Profiles
  connections: [
    {
      id: 'conn-prod-01',
      name: 'PROD-RAC01 (Exadata Cloud)',
      env: 'prod',
      host: 'exadata-rac01.corp.internal',
      port: 1521,
      serviceName: 'sales_prod.db.corp',
      instanceName: 'SALES_PROD1',
      osType: 'linux',
      osName: 'Linux Enterprise',
      platform: 'Linux x86 64-bit',
      user: 'SYSTEM',
      role: 'SYSDBA',
      mode: 'EZConnect',
      color: '#ef4444',
      status: 'connected',
      latencyMs: 14,
      version: 'Oracle Database 23ai Enterprise Edition Release 23.4.0.24.05 - 64bit Production',
      racNodes: 4,
      uptime: '42 days, 18 hours'
    },
    {
      id: 'conn-uat-01',
      name: 'UAT-ORCL19c (IBM AIX LPAR)',
      env: 'uat',
      host: 'aix-p9-host.corp.internal',
      port: 1521,
      serviceName: 'staging_pdb1',
      instanceName: 'ORCL19C',
      osType: 'aix',
      osName: 'IBM AIX 7.2 (POWER9)',
      platform: 'AIX-Based Systems (64-bit)',
      user: 'SALES_ADMIN',
      role: 'NORMAL',
      mode: 'TNS',
      color: '#a855f7',
      status: 'idle',
      latencyMs: 22,
      version: 'Oracle Database 19c Enterprise Edition (AIX-Based Systems 64-bit)',
      racNodes: 2,
      uptime: '15 days, 04 hours'
    },
    {
      id: 'conn-dev-01',
      name: 'DEV-WIN22 (Windows Server 2022)',
      env: 'dev',
      host: 'win-db-srv01.local',
      port: 1521,
      serviceName: 'dev_pdb',
      instanceName: 'DEVPDB',
      osType: 'windows',
      osName: 'Microsoft Windows Server 2022',
      platform: 'Microsoft Windows x64 (64-bit)',
      user: 'HR',
      role: 'NORMAL',
      mode: 'EZConnect',
      color: '#3b82f6',
      status: 'idle',
      latencyMs: 2,
      version: 'Oracle Database 23ai Free (Microsoft Windows x64 64-bit)',
      racNodes: 1,
      uptime: '3 days, 11 hours'
    }
  ],

  // Schemas & Objects
  activeConnectionId: 'conn-prod-01',
  activeSchema: 'HR',

  schemas: {
    'HR': {
      tables: [
        {
          name: 'EMPLOYEES',
          status: 'VALID',
          tablespace: 'USERS',
          numRows: 107,
          blocks: 24,
          avgRowLen: 133,
          lastAnalyzed: '2026-10-15 04:00:12',
          columns: [
            { name: 'EMPLOYEE_ID', type: 'NUMBER(6,0)', nullable: 'N', pk: true, fk: false, defaultVal: 'EMPLOYEES_SEQ.NEXTVAL', comments: 'Primary key of employees table.' },
            { name: 'FIRST_NAME', type: 'VARCHAR2(20 BYTE)', nullable: 'Y', pk: false, fk: false, defaultVal: null, comments: 'First name of the employee.' },
            { name: 'LAST_NAME', type: 'VARCHAR2(25 BYTE)', nullable: 'N', pk: false, fk: false, defaultVal: null, comments: 'Last name of the employee.' },
            { name: 'EMAIL', type: 'VARCHAR2(25 BYTE)', nullable: 'N', pk: false, fk: false, defaultVal: null, comments: 'Corporate email address.' },
            { name: 'PHONE_NUMBER', type: 'VARCHAR2(20 BYTE)', nullable: 'Y', pk: false, fk: false, defaultVal: null, comments: 'Phone number.' },
            { name: 'HIRE_DATE', type: 'DATE', nullable: 'N', pk: false, fk: false, defaultVal: 'SYSDATE', comments: 'Date when employee started.' },
            { name: 'JOB_ID', type: 'VARCHAR2(10 BYTE)', nullable: 'N', pk: false, fk: true, defaultVal: null, comments: 'Current job role identifier.' },
            { name: 'SALARY', type: 'NUMBER(8,2)', nullable: 'Y', pk: false, fk: false, defaultVal: null, comments: 'Monthly compensation in USD.' },
            { name: 'COMMISSION_PCT', type: 'NUMBER(2,2)', nullable: 'Y', pk: false, fk: false, defaultVal: null, comments: 'Commission percentage for sales reps.' },
            { name: 'MANAGER_ID', type: 'NUMBER(6,0)', nullable: 'Y', pk: false, fk: true, defaultVal: null, comments: 'Manager employee ID.' },
            { name: 'DEPARTMENT_ID', type: 'NUMBER(4,0)', nullable: 'Y', pk: false, fk: true, defaultVal: null, comments: 'Department identifier.' }
          ],
          indexes: [
            { name: 'EMP_EMP_ID_PK', type: 'UNIQUE', columns: 'EMPLOYEE_ID', status: 'VALID', clusteringFactor: 12 },
            { name: 'EMP_EMAIL_UK', type: 'UNIQUE', columns: 'EMAIL', status: 'VALID', clusteringFactor: 14 },
            { name: 'EMP_NAME_IX', type: 'NONUNIQUE', columns: 'LAST_NAME, FIRST_NAME', status: 'VALID', clusteringFactor: 18 },
            { name: 'EMP_DEPT_IX', type: 'NONUNIQUE', columns: 'DEPARTMENT_ID', status: 'VALID', clusteringFactor: 15 },
            { name: 'EMP_JOB_IX', type: 'NONUNIQUE', columns: 'JOB_ID', status: 'VALID', clusteringFactor: 21 }
          ],
          constraints: [
            { name: 'EMP_EMP_ID_PK', type: 'Primary Key', details: 'EMPLOYEE_ID', status: 'ENABLED' },
            { name: 'EMP_LAST_NAME_NN', type: 'Check', details: '"LAST_NAME" IS NOT NULL', status: 'ENABLED' },
            { name: 'EMP_EMAIL_NN', type: 'Check', details: '"EMAIL" IS NOT NULL', status: 'ENABLED' },
            { name: 'EMP_EMAIL_UK', type: 'Unique', details: 'EMAIL', status: 'ENABLED' },
            { name: 'EMP_SALARY_MIN', type: 'Check', details: 'salary > 0', status: 'ENABLED' },
            { name: 'EMP_DEPT_FK', type: 'Foreign Key', details: 'DEPARTMENT_ID -> DEPARTMENTS(DEPARTMENT_ID)', status: 'ENABLED' }
          ],
          triggers: [
            { name: 'SECURE_EMPLOYEES', timing: 'BEFORE', event: 'INSERT OR UPDATE OR DELETE', status: 'ENABLED' },
            { name: 'UPDATE_JOB_HISTORY', timing: 'AFTER', event: 'UPDATE OF JOB_ID, DEPARTMENT_ID', status: 'ENABLED' }
          ],
          ddl: `CREATE TABLE "HR"."EMPLOYEES" (
  "EMPLOYEE_ID" NUMBER(6,0) GENERATED ALWAYS AS IDENTITY,
  "FIRST_NAME" VARCHAR2(20 BYTE),
  "LAST_NAME" VARCHAR2(25 BYTE) CONSTRAINT "EMP_LAST_NAME_NN" NOT NULL,
  "EMAIL" VARCHAR2(25 BYTE) CONSTRAINT "EMP_EMAIL_NN" NOT NULL,
  "PHONE_NUMBER" VARCHAR2(20 BYTE),
  "HIRE_DATE" DATE DEFAULT SYSDATE CONSTRAINT "EMP_HIRE_DATE_NN" NOT NULL,
  "JOB_ID" VARCHAR2(10 BYTE) CONSTRAINT "EMP_JOB_NN" NOT NULL,
  "SALARY" NUMBER(8,2) CONSTRAINT "EMP_SALARY_MIN" CHECK (salary > 0),
  "COMMISSION_PCT" NUMBER(2,2),
  "MANAGER_ID" NUMBER(6,0),
  "DEPARTMENT_ID" NUMBER(4,0),
  CONSTRAINT "EMP_EMP_ID_PK" PRIMARY KEY ("EMPLOYEE_ID"),
  CONSTRAINT "EMP_EMAIL_UK" UNIQUE ("EMAIL"),
  CONSTRAINT "EMP_DEPT_FK" FOREIGN KEY ("DEPARTMENT_ID") REFERENCES "HR"."DEPARTMENTS" ("DEPARTMENT_ID")
) TABLESPACE "USERS"
STORAGE (INITIAL 64K NEXT 64K MINEXTENTS 1 MAXEXTENTS UNLIMITED);`,
          data: [
            { EMPLOYEE_ID: 100, FIRST_NAME: 'Steven', LAST_NAME: 'King', EMAIL: 'SKING', PHONE_NUMBER: '515.123.4567', HIRE_DATE: '2013-06-17', JOB_ID: 'AD_PRES', SALARY: 24000.00, COMMISSION_PCT: null, MANAGER_ID: null, DEPARTMENT_ID: 90 },
            { EMPLOYEE_ID: 101, FIRST_NAME: 'Neena', LAST_NAME: 'Kochhar', EMAIL: 'NKOCHHAR', PHONE_NUMBER: '515.123.4568', HIRE_DATE: '2015-09-21', JOB_ID: 'AD_VP', SALARY: 17000.00, COMMISSION_PCT: null, MANAGER_ID: 100, DEPARTMENT_ID: 90 },
            { EMPLOYEE_ID: 102, FIRST_NAME: 'Lex', LAST_NAME: 'De Haan', EMAIL: 'LDEHAAN', PHONE_NUMBER: '515.123.4569', HIRE_DATE: '2016-01-13', JOB_ID: 'AD_VP', SALARY: 17000.00, COMMISSION_PCT: null, MANAGER_ID: 100, DEPARTMENT_ID: 90 },
            { EMPLOYEE_ID: 103, FIRST_NAME: 'Alexander', LAST_NAME: 'Hunold', EMAIL: 'AHUNOLD', PHONE_NUMBER: '590.423.4567', HIRE_DATE: '2016-01-03', JOB_ID: 'IT_PROG', SALARY: 9000.00, COMMISSION_PCT: null, MANAGER_ID: 102, DEPARTMENT_ID: 60 },
            { EMPLOYEE_ID: 104, FIRST_NAME: 'Bruce', LAST_NAME: 'Ernst', EMAIL: 'BERNST', PHONE_NUMBER: '590.423.4568', HIRE_DATE: '2017-05-21', JOB_ID: 'IT_PROG', SALARY: 6000.00, COMMISSION_PCT: null, MANAGER_ID: 103, DEPARTMENT_ID: 60 },
            { EMPLOYEE_ID: 105, FIRST_NAME: 'David', LAST_NAME: 'Austin', EMAIL: 'DAUSTIN', PHONE_NUMBER: '590.423.4569', HIRE_DATE: '2017-06-25', JOB_ID: 'IT_PROG', SALARY: 4800.00, COMMISSION_PCT: null, MANAGER_ID: 103, DEPARTMENT_ID: 60 },
            { EMPLOYEE_ID: 106, FIRST_NAME: 'Valli', LAST_NAME: 'Pataballa', EMAIL: 'VPATABAL', PHONE_NUMBER: '590.423.4560', HIRE_DATE: '2018-02-05', JOB_ID: 'IT_PROG', SALARY: 4800.00, COMMISSION_PCT: null, MANAGER_ID: 103, DEPARTMENT_ID: 60 },
            { EMPLOYEE_ID: 107, FIRST_NAME: 'Diana', LAST_NAME: 'Lorentz', EMAIL: 'DLORENTZ', PHONE_NUMBER: '590.423.5567', HIRE_DATE: '2018-02-07', JOB_ID: 'IT_PROG', SALARY: 4200.00, COMMISSION_PCT: null, MANAGER_ID: 103, DEPARTMENT_ID: 60 },
            { EMPLOYEE_ID: 108, FIRST_NAME: 'Nancy', LAST_NAME: 'Greenberg', EMAIL: 'NGREENBE', PHONE_NUMBER: '515.124.4569', HIRE_DATE: '2014-08-17', JOB_ID: 'FI_MGR', SALARY: 12008.00, COMMISSION_PCT: null, MANAGER_ID: 101, DEPARTMENT_ID: 100 },
            { EMPLOYEE_ID: 109, FIRST_NAME: 'Daniel', LAST_NAME: 'Faviet', EMAIL: 'DFAVIET', PHONE_NUMBER: '515.124.4169', HIRE_DATE: '2014-08-16', JOB_ID: 'FI_ACCOUNT', SALARY: 9000.00, COMMISSION_PCT: null, MANAGER_ID: 108, DEPARTMENT_ID: 100 },
            { EMPLOYEE_ID: 110, FIRST_NAME: 'John', LAST_NAME: 'Chen', EMAIL: 'JCHEN', PHONE_NUMBER: '515.124.4269', HIRE_DATE: '2015-09-28', JOB_ID: 'FI_ACCOUNT', SALARY: 8200.00, COMMISSION_PCT: null, MANAGER_ID: 108, DEPARTMENT_ID: 100 },
            { EMPLOYEE_ID: 114, FIRST_NAME: 'Den', LAST_NAME: 'Raphaely', EMAIL: 'DRAPHEAL', PHONE_NUMBER: '515.127.4561', HIRE_DATE: '2014-12-07', JOB_ID: 'PU_MAN', SALARY: 11000.00, COMMISSION_PCT: null, MANAGER_ID: 100, DEPARTMENT_ID: 30 },
            { EMPLOYEE_ID: 120, FIRST_NAME: 'Matthew', LAST_NAME: 'Weiss', EMAIL: 'MWEISS', PHONE_NUMBER: '650.123.1234', HIRE_DATE: '2016-07-18', JOB_ID: 'ST_MAN', SALARY: 8000.00, COMMISSION_PCT: null, MANAGER_ID: 100, DEPARTMENT_ID: 50 },
            { EMPLOYEE_ID: 145, FIRST_NAME: 'John', LAST_NAME: 'Russell', EMAIL: 'JRUSSEL', PHONE_NUMBER: '011.44.1344.429268', HIRE_DATE: '2016-10-01', JOB_ID: 'SA_MAN', SALARY: 14000.00, COMMISSION_PCT: 0.40, MANAGER_ID: 100, DEPARTMENT_ID: 80 }
          ]
        },
        {
          name: 'DEPARTMENTS',
          status: 'VALID',
          tablespace: 'USERS',
          numRows: 27,
          blocks: 8,
          avgRowLen: 85,
          lastAnalyzed: '2026-10-15 04:00:12',
          columns: [
            { name: 'DEPARTMENT_ID', type: 'NUMBER(4,0)', nullable: 'N', pk: true, fk: false, defaultVal: null, comments: 'Primary key column.' },
            { name: 'DEPARTMENT_NAME', type: 'VARCHAR2(30 BYTE)', nullable: 'N', pk: false, fk: false, defaultVal: null, comments: 'Name of the department.' },
            { name: 'MANAGER_ID', type: 'NUMBER(6,0)', nullable: 'Y', pk: false, fk: true, defaultVal: null, comments: 'Manager of department.' },
            { name: 'LOCATION_ID', type: 'NUMBER(4,0)', nullable: 'Y', pk: false, fk: true, defaultVal: null, comments: 'Location identifier.' }
          ],
          indexes: [
            { name: 'DEPT_ID_PK', type: 'UNIQUE', columns: 'DEPARTMENT_ID', status: 'VALID', clusteringFactor: 4 },
            { name: 'DEPT_LOCATION_IX', type: 'NONUNIQUE', columns: 'LOCATION_ID', status: 'VALID', clusteringFactor: 5 }
          ],
          constraints: [
            { name: 'DEPT_ID_PK', type: 'Primary Key', details: 'DEPARTMENT_ID', status: 'ENABLED' },
            { name: 'DEPT_NAME_NN', type: 'Check', details: '"DEPARTMENT_NAME" IS NOT NULL', status: 'ENABLED' }
          ],
          triggers: [],
          ddl: `CREATE TABLE "HR"."DEPARTMENTS" (
  "DEPARTMENT_ID" NUMBER(4,0),
  "DEPARTMENT_NAME" VARCHAR2(30 BYTE) CONSTRAINT "DEPT_NAME_NN" NOT NULL,
  "MANAGER_ID" NUMBER(6,0),
  "LOCATION_ID" NUMBER(4,0),
  CONSTRAINT "DEPT_ID_PK" PRIMARY KEY ("DEPARTMENT_ID")
) TABLESPACE "USERS";`,
          data: [
            { DEPARTMENT_ID: 10, DEPARTMENT_NAME: 'Administration', MANAGER_ID: 200, LOCATION_ID: 1700 },
            { DEPARTMENT_ID: 20, DEPARTMENT_NAME: 'Marketing', MANAGER_ID: 201, LOCATION_ID: 1800 },
            { DEPARTMENT_ID: 30, DEPARTMENT_NAME: 'Purchasing', MANAGER_ID: 114, LOCATION_ID: 1700 },
            { DEPARTMENT_ID: 40, DEPARTMENT_NAME: 'Human Resources', MANAGER_ID: 203, LOCATION_ID: 2400 },
            { DEPARTMENT_ID: 50, DEPARTMENT_NAME: 'Shipping', MANAGER_ID: 121, LOCATION_ID: 1500 },
            { DEPARTMENT_ID: 60, DEPARTMENT_NAME: 'IT', MANAGER_ID: 103, LOCATION_ID: 1400 },
            { DEPARTMENT_ID: 80, DEPARTMENT_NAME: 'Sales', MANAGER_ID: 145, LOCATION_ID: 2500 },
            { DEPARTMENT_ID: 90, DEPARTMENT_NAME: 'Executive', MANAGER_ID: 100, LOCATION_ID: 1700 },
            { DEPARTMENT_ID: 100, DEPARTMENT_NAME: 'Finance', MANAGER_ID: 108, LOCATION_ID: 1700 }
          ]
        },
        {
          name: 'JOBS',
          status: 'VALID',
          tablespace: 'USERS',
          numRows: 19,
          blocks: 6,
          avgRowLen: 62,
          lastAnalyzed: '2026-10-15 04:00:12',
          columns: [
            { name: 'JOB_ID', type: 'VARCHAR2(10 BYTE)', nullable: 'N', pk: true, fk: false, defaultVal: null, comments: 'Job ID' },
            { name: 'JOB_TITLE', type: 'VARCHAR2(35 BYTE)', nullable: 'N', pk: false, fk: false, defaultVal: null, comments: 'Full job title' },
            { name: 'MIN_SALARY', type: 'NUMBER(6,0)', nullable: 'Y', pk: false, fk: false, defaultVal: null, comments: 'Minimum salary' },
            { name: 'MAX_SALARY', type: 'NUMBER(6,0)', nullable: 'Y', pk: false, fk: false, defaultVal: null, comments: 'Maximum salary' }
          ],
          indexes: [{ name: 'JOB_ID_PK', type: 'UNIQUE', columns: 'JOB_ID', status: 'VALID', clusteringFactor: 3 }],
          constraints: [{ name: 'JOB_ID_PK', type: 'Primary Key', details: 'JOB_ID', status: 'ENABLED' }],
          triggers: [],
          ddl: `CREATE TABLE "HR"."JOBS" (
  "JOB_ID" VARCHAR2(10 BYTE),
  "JOB_TITLE" VARCHAR2(35 BYTE) NOT NULL,
  "MIN_SALARY" NUMBER(6,0),
  "MAX_SALARY" NUMBER(6,0),
  CONSTRAINT "JOB_ID_PK" PRIMARY KEY ("JOB_ID")
) TABLESPACE "USERS";`,
          data: [
            { JOB_ID: 'AD_PRES', JOB_TITLE: 'President', MIN_SALARY: 20080, MAX_SALARY: 40000 },
            { JOB_ID: 'AD_VP', JOB_TITLE: 'Administration Vice President', MIN_SALARY: 15000, MAX_SALARY: 30000 },
            { JOB_ID: 'IT_PROG', JOB_TITLE: 'Programmer', MIN_SALARY: 4000, MAX_SALARY: 10000 },
            { JOB_ID: 'SA_MAN', JOB_TITLE: 'Sales Manager', MIN_SALARY: 10000, MAX_SALARY: 20080 },
            { JOB_ID: 'SA_REP', JOB_TITLE: 'Sales Representative', MIN_SALARY: 6000, MAX_SALARY: 12008 }
          ]
        }
      ],
      views: [
        {
          name: 'EMP_DETAILS_VIEW',
          status: 'VALID',
          ddl: `CREATE OR REPLACE FORCE VIEW "HR"."EMP_DETAILS_VIEW" AS 
SELECT 
  e.employee_id,
  e.job_id,
  e.manager_id,
  e.department_id,
  d.location_id,
  e.first_name,
  e.last_name,
  e.salary,
  e.commission_pct,
  d.department_name,
  j.job_title
FROM
  employees e
  JOIN departments d ON e.department_id = d.department_id
  JOIN jobs j ON e.job_id = j.job_id;`,
          columns: [
            { name: 'EMPLOYEE_ID', type: 'NUMBER(6,0)' },
            { name: 'FIRST_NAME', type: 'VARCHAR2(20)' },
            { name: 'LAST_NAME', type: 'VARCHAR2(25)' },
            { name: 'SALARY', type: 'NUMBER(8,2)' },
            { name: 'DEPARTMENT_NAME', type: 'VARCHAR2(30)' },
            { name: 'JOB_TITLE', type: 'VARCHAR2(35)' }
          ]
        }
      ],
      packages: [
        {
          name: 'EMP_MGMT_PKG',
          status: 'VALID',
          specDdl: `CREATE OR REPLACE PACKAGE "HR"."EMP_MGMT_PKG" AS
  PROCEDURE hire_employee(
    p_first_name IN VARCHAR2,
    p_last_name  IN VARCHAR2,
    p_email      IN VARCHAR2,
    p_job_id     IN VARCHAR2,
    p_salary     IN NUMBER,
    p_dept_id    IN NUMBER,
    p_emp_id     OUT NUMBER
  );
  
  FUNCTION get_annual_compensation(p_emp_id IN NUMBER) RETURN NUMBER;
  
  PROCEDURE reassign_department(
    p_emp_id  IN NUMBER,
    p_dept_id IN NUMBER
  );
END EMP_MGMT_PKG;`,
          bodyDdl: `CREATE OR REPLACE PACKAGE BODY "HR"."EMP_MGMT_PKG" AS
  PROCEDURE hire_employee(
    p_first_name IN VARCHAR2,
    p_last_name  IN VARCHAR2,
    p_email      IN VARCHAR2,
    p_job_id     IN VARCHAR2,
    p_salary     IN NUMBER,
    p_dept_id    IN NUMBER,
    p_emp_id     OUT NUMBER
  ) IS
  BEGIN
    INSERT INTO employees (
      first_name, last_name, email, hire_date, job_id, salary, department_id
    ) VALUES (
      p_first_name, p_last_name, p_email, SYSDATE, p_job_id, p_salary, p_dept_id
    ) RETURNING employee_id INTO p_emp_id;
    COMMIT;
  END hire_employee;

  FUNCTION get_annual_compensation(p_emp_id IN NUMBER) RETURN NUMBER IS
    v_sal NUMBER;
    v_comm NUMBER;
  BEGIN
    SELECT salary, NVL(commission_pct, 0)
    INTO v_sal, v_comm
    FROM employees
    WHERE employee_id = p_emp_id;
    
    RETURN (v_sal * 12) + (v_sal * 12 * v_comm);
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RETURN 0;
  END get_annual_compensation;

  PROCEDURE reassign_department(p_emp_id IN NUMBER, p_dept_id IN NUMBER) IS
  BEGIN
    UPDATE employees
    SET department_id = p_dept_id
    WHERE employee_id = p_emp_id;
  END reassign_department;
END EMP_MGMT_PKG;`
        }
      ],
      procedures: [
        {
          name: 'CALCULATE_BONUS',
          status: 'VALID',
          ddl: `CREATE OR REPLACE PROCEDURE "HR"."CALCULATE_BONUS" (
  p_emp_id IN NUMBER,
  p_rating IN NUMBER,
  p_bonus OUT NUMBER
) AS
  v_sal NUMBER;
BEGIN
  SELECT salary INTO v_sal FROM employees WHERE employee_id = p_emp_id;
  IF p_rating = 5 THEN
    p_bonus := v_sal * 0.25;
  ELSIF p_rating >= 4 THEN
    p_bonus := v_sal * 0.15;
  ELSE
    p_bonus := v_sal * 0.05;
  END IF;
END CALCULATE_BONUS;`
        }
      ],
      functions: [
        {
          name: 'GET_DEPT_HEADCOUNT',
          status: 'VALID',
          ddl: `CREATE OR REPLACE FUNCTION "HR"."GET_DEPT_HEADCOUNT" (p_dept_id NUMBER) RETURN NUMBER AS
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM employees WHERE department_id = p_dept_id;
  RETURN v_count;
END GET_DEPT_HEADCOUNT;`
        }
      ],
      sequences: [
        { name: 'EMPLOYEES_SEQ', minVal: 1, maxVal: 999999, lastVal: 206, increment: 1, cacheSize: 20 }
      ],
      triggers: [
        { name: 'SECURE_EMPLOYEES', status: 'VALID', table: 'EMPLOYEES', timing: 'BEFORE', event: 'INSERT OR UPDATE' }
      ],
      mviews: [
        {
          name: 'MV_EMP_SALARY_SUMMARY',
          status: 'VALID',
          refreshType: 'FAST',
          refreshMode: 'ON COMMIT',
          lastRefresh: '2026-10-20 00:00:00',
          ddl: `CREATE MATERIALIZED VIEW "HR"."MV_EMP_SALARY_SUMMARY"
BUILD IMMEDIATE
REFRESH FAST ON COMMIT
AS
SELECT department_id, COUNT(*) as headcount, SUM(salary) as total_salary, AVG(salary) as avg_salary
FROM employees
GROUP BY department_id;`,
          columns: [
            { name: 'DEPARTMENT_ID', type: 'NUMBER(4,0)', nullable: 'N' },
            { name: 'HEADCOUNT', type: 'NUMBER', nullable: 'N' },
            { name: 'TOTAL_SALARY', type: 'NUMBER(12,2)', nullable: 'Y' },
            { name: 'AVG_SALARY', type: 'NUMBER(10,2)', nullable: 'Y' }
          ],
          data: [
            { DEPARTMENT_ID: 10, HEADCOUNT: 1, TOTAL_SALARY: 4400.00, AVG_SALARY: 4400.00 },
            { DEPARTMENT_ID: 20, HEADCOUNT: 2, TOTAL_SALARY: 19000.00, AVG_SALARY: 9500.00 },
            { DEPARTMENT_ID: 50, HEADCOUNT: 45, TOTAL_SALARY: 156400.00, AVG_SALARY: 3475.55 },
            { DEPARTMENT_ID: 60, HEADCOUNT: 5, TOTAL_SALARY: 28800.00, AVG_SALARY: 5760.00 },
            { DEPARTMENT_ID: 80, HEADCOUNT: 34, TOTAL_SALARY: 304500.00, AVG_SALARY: 8955.88 },
            { DEPARTMENT_ID: 90, HEADCOUNT: 3, TOTAL_SALARY: 58000.00, AVG_SALARY: 19333.33 },
            { DEPARTMENT_ID: 100, HEADCOUNT: 6, TOTAL_SALARY: 51608.00, AVG_SALARY: 8601.33 }
          ]
        }
      ],
      types: [
        {
          name: 'EMP_ADDRESS_TYP',
          status: 'VALID',
          ddl: `CREATE OR REPLACE TYPE "HR"."EMP_ADDRESS_TYP" AS OBJECT (
  street_address VARCHAR2(40),
  postal_code    VARCHAR2(10),
  city           VARCHAR2(30),
  state_province VARCHAR2(10),
  country_id     CHAR(2)
);`
        }
      ],
      synonyms: [
        {
          name: 'SYN_DEPARTMENTS',
          status: 'VALID',
          targetSchema: 'HR',
          targetObject: 'DEPARTMENTS',
          ddl: `CREATE OR REPLACE SYNONYM "HR"."SYN_DEPARTMENTS" FOR "HR"."DEPARTMENTS";`
        },
        {
          name: 'SYN_GLOBAL_SALES',
          status: 'VALID',
          targetSchema: 'SALES_ADMIN',
          targetObject: 'SALES_TRANSACTIONS',
          targetDbLink: 'ERP_PROD_LINK',
          ddl: `CREATE OR REPLACE SYNONYM "HR"."SYN_GLOBAL_SALES" FOR "SALES_ADMIN"."SALES_TRANSACTIONS"@ERP_PROD_LINK;`
        }
      ],
      indexes: [
        { name: 'EMP_EMP_ID_PK', type: 'UNIQUE', columns: 'EMPLOYEE_ID', tablespace: 'USERS', status: 'VALID', clusteringFactor: 12 },
        { name: 'EMP_EMAIL_UK', type: 'UNIQUE', columns: 'EMAIL', tablespace: 'USERS', status: 'VALID', clusteringFactor: 14 },
        { name: 'EMP_NAME_IX', type: 'NONUNIQUE', columns: 'LAST_NAME, FIRST_NAME', tablespace: 'USERS', status: 'VALID', clusteringFactor: 18 },
        { name: 'EMP_DEPT_IX', type: 'NONUNIQUE', columns: 'DEPARTMENT_ID', tablespace: 'USERS', status: 'VALID', clusteringFactor: 15 },
        { name: 'EMP_JOB_IX', type: 'NONUNIQUE', columns: 'JOB_ID', tablespace: 'USERS', status: 'VALID', clusteringFactor: 21 },
        { name: 'DEPT_ID_PK', type: 'UNIQUE', columns: 'DEPARTMENT_ID', tablespace: 'USERS', status: 'VALID', clusteringFactor: 4 },
        { name: 'DEPT_LOCATION_IX', type: 'NONUNIQUE', columns: 'LOCATION_ID', tablespace: 'USERS', status: 'VALID', clusteringFactor: 6 }
      ],
      tablespaces: [
        { name: 'SYSTEM', status: 'ONLINE', totalMb: 2048, usedMb: 1740, autoextend: 'YES', datafiles: 1, pct: 85, contents: 'PERMANENT', extentManagement: 'LOCAL' },
        { name: 'SYSAUX', status: 'ONLINE', totalMb: 4096, usedMb: 2867, autoextend: 'YES', datafiles: 2, pct: 70, contents: 'PERMANENT', extentManagement: 'LOCAL' },
        { name: 'USERS', status: 'ONLINE', totalMb: 8192, usedMb: 3440, autoextend: 'YES', datafiles: 2, pct: 42, contents: 'PERMANENT', extentManagement: 'LOCAL' },
        { name: 'SALES_2026', status: 'ONLINE', totalMb: 32768, usedMb: 28835, autoextend: 'YES', datafiles: 4, pct: 88, contents: 'PERMANENT', extentManagement: 'LOCAL' },
        { name: 'UNDOTBS1', status: 'ONLINE', totalMb: 4096, usedMb: 940, autoextend: 'YES', datafiles: 1, pct: 23, contents: 'UNDO', extentManagement: 'LOCAL' },
        { name: 'TEMP', status: 'ONLINE', totalMb: 8192, usedMb: 1230, autoextend: 'YES', datafiles: 1, pct: 15, contents: 'TEMPORARY', extentManagement: 'LOCAL' }
      ],
      dblinks: [
        { name: 'ERP_PROD_LINK', status: 'VALID', host: 'erp-db.corp:1521/PROD', user: 'ERP_USER', created: '2025-01-15' },
        { name: 'DATA_LAKE_REMOTE', status: 'VALID', host: 'datalake-gateway:1521/ANALYTICS', user: 'LAKE_READER', created: '2025-06-20' },
        { name: 'CLOUD_AZURE_SYNC', status: 'VALID', host: 'azure-oracle.cloud:1521/DW', user: 'SYNC_SVC', created: '2026-03-10' }
      ],
      users: [
        { name: 'SYS', status: 'OPEN', defaultTablespace: 'SYSTEM', tempTablespace: 'TEMP', profile: 'DEFAULT', created: '2023-01-01' },
        { name: 'SYSTEM', status: 'OPEN', defaultTablespace: 'SYSTEM', tempTablespace: 'TEMP', profile: 'DEFAULT', created: '2023-01-01' },
        { name: 'HR', status: 'OPEN', defaultTablespace: 'USERS', tempTablespace: 'TEMP', profile: 'DEFAULT', created: '2024-04-12' },
        { name: 'SALES_ADMIN', status: 'OPEN', defaultTablespace: 'SALES_2026', tempTablespace: 'TEMP', profile: 'APP_PROFILE', created: '2024-05-18' },
        { name: 'SCOTT', status: 'EXPIRED', defaultTablespace: 'USERS', tempTablespace: 'TEMP', profile: 'DEFAULT', created: '2023-08-01' },
        { name: 'APEX_PUBLIC_USER', status: 'LOCKED', defaultTablespace: 'SYSAUX', tempTablespace: 'TEMP', profile: 'DEFAULT', created: '2024-01-10' }
      ],
      roles: [
        { name: 'CONNECT', status: 'VALID', authentication: 'NONE' },
        { name: 'RESOURCE', status: 'VALID', authentication: 'NONE' },
        { name: 'DBA', status: 'VALID', authentication: 'NONE' },
        { name: 'SELECT_CATALOG_ROLE', status: 'VALID', authentication: 'NONE' },
        { name: 'SALES_READER_ROLE', status: 'VALID', authentication: 'NONE' },
        { name: 'FINANCE_ADMIN', status: 'VALID', authentication: 'NONE' }
      ],
      jobs: [
        { name: 'PURGE_AUDIT_LOGS_JOB', status: 'SCHEDULED', jobType: 'PLSQL_BLOCK', repeatInterval: 'FREQ=DAILY;BYHOUR=2', nextRun: '2026-10-21 02:00:00', state: 'SCHEDULED' },
        { name: 'GATHER_SCHEMA_STATS_JOB', status: 'SCHEDULED', jobType: 'STORED_PROCEDURE', repeatInterval: 'FREQ=WEEKLY;BYDAY=SUN;BYHOUR=1', nextRun: '2026-10-25 01:00:00', state: 'SCHEDULED' },
        { name: 'REFRESH_SALES_MVIEWS_JOB', status: 'RUNNING', jobType: 'PLSQL_BLOCK', repeatInterval: 'FREQ=HOURLY;INTERVAL=4', nextRun: '2026-10-20 04:00:00', state: 'RUNNING' }
      ],
      directories: [
        { name: 'DATA_PUMP_DIR', status: 'VALID', path: '/u01/app/oracle/admin/sales/dpdump' },
        { name: 'ORACLE_BASE_DIR', status: 'VALID', path: '/u01/app/oracle' },
        { name: 'LOG_EXTRACT_DIR', status: 'VALID', path: '/u02/exports/logs' }
      ],
      queues: [
        { name: 'AQ$_HR_EVENT_QUEUE', status: 'VALID', queueType: 'NORMAL_QUEUE', maxRetries: 5 },
        { name: 'SALES_ORDER_QUEUE', status: 'VALID', queueType: 'NORMAL_QUEUE', maxRetries: 3 }
      ],
      recyclebin: [
        { name: 'BIN$9d8a3910$0 (TMP_CUSTOMERS_OCT)', originalName: 'TMP_CUSTOMERS_OCT', status: 'DROPPED', type: 'TABLE', tablespace: 'USERS', dropTime: '2026-10-18 11:42:19' },
        { name: 'BIN$aa11094f$0 (BACKUP_EMPLOYEES_Q3)', originalName: 'BACKUP_EMPLOYEES_Q3', status: 'DROPPED', type: 'TABLE', tablespace: 'USERS', dropTime: '2026-10-16 09:15:33' }
      ],
      java: [
        { name: 'OracleJsonUtil', status: 'VALID', type: 'JAVA SOURCE' },
        { name: 'CryptoProvider', status: 'VALID', type: 'JAVA CLASS' }
      ],
      clusters: [
        { name: 'EMP_DEPT_CLUSTER', status: 'VALID', tablespace: 'USERS' }
      ]
    },

    'SALES_ADMIN': {
      tables: [
        {
          name: 'CUSTOMERS',
          status: 'VALID',
          tablespace: 'SALES_2026',
          numRows: 54200,
          blocks: 1240,
          avgRowLen: 210,
          lastAnalyzed: '2026-10-18 01:00:00',
          columns: [
            { name: 'CUSTOMER_ID', type: 'NUMBER(10,0)', nullable: 'N', pk: true, fk: false, defaultVal: null, comments: 'Unique customer sequence number' },
            { name: 'NAME', type: 'VARCHAR2(100 BYTE)', nullable: 'N', pk: false, fk: false, defaultVal: null, comments: 'Full legal enterprise name' },
            { name: 'TIER', type: 'VARCHAR2(20 BYTE)', nullable: 'N', pk: false, fk: false, defaultVal: "'STANDARD'", comments: 'Tier: ENTERPRISE, PRO, STANDARD' },
            { name: 'CREDIT_LIMIT', type: 'NUMBER(12,2)', nullable: 'Y', pk: false, fk: false, defaultVal: '50000', comments: 'Approved commercial credit limit' },
            { name: 'COUNTRY_CODE', type: 'VARCHAR2(3 BYTE)', nullable: 'N', pk: false, fk: false, defaultVal: "'USA'", comments: 'ISO 3166-1 alpha-3 code' }
          ],
          indexes: [
            { name: 'CUST_PK', type: 'UNIQUE', columns: 'CUSTOMER_ID', status: 'VALID', clusteringFactor: 980 },
            { name: 'CUST_TIER_IX', type: 'NONUNIQUE', columns: 'TIER', status: 'VALID', clusteringFactor: 1120 }
          ],
          constraints: [{ name: 'CUST_PK', type: 'Primary Key', details: 'CUSTOMER_ID', status: 'ENABLED' }],
          triggers: [],
          ddl: `CREATE TABLE "SALES_ADMIN"."CUSTOMERS" (
  "CUSTOMER_ID" NUMBER(10,0),
  "NAME" VARCHAR2(100 BYTE) NOT NULL,
  "TIER" VARCHAR2(20 BYTE) DEFAULT 'STANDARD' NOT NULL,
  "CREDIT_LIMIT" NUMBER(12,2) DEFAULT 50000,
  "COUNTRY_CODE" VARCHAR2(3 BYTE) DEFAULT 'USA' NOT NULL,
  CONSTRAINT "CUST_PK" PRIMARY KEY ("CUSTOMER_ID")
) TABLESPACE "SALES_2026";`,
          data: [
            { CUSTOMER_ID: 10001, NAME: 'Acme Global Corp', TIER: 'ENTERPRISE', CREDIT_LIMIT: 500000.00, COUNTRY_CODE: 'USA' },
            { CUSTOMER_ID: 10002, NAME: 'Nova Cloud Systems', TIER: 'ENTERPRISE', CREDIT_LIMIT: 750000.00, COUNTRY_CODE: 'CAN' },
            { CUSTOMER_ID: 10003, NAME: 'Vertex Dynamics', TIER: 'PRO', CREDIT_LIMIT: 120000.00, COUNTRY_CODE: 'DEU' },
            { CUSTOMER_ID: 10004, NAME: 'Helios Industrial', TIER: 'STANDARD', CREDIT_LIMIT: 45000.00, COUNTRY_CODE: 'GBR' },
            { CUSTOMER_ID: 10005, NAME: 'Traces Tech AI Inc', TIER: 'ENTERPRISE', CREDIT_LIMIT: 1000000.00, COUNTRY_CODE: 'USA' }
          ]
        },
        {
          name: 'SALES_TRANSACTIONS',
          status: 'VALID',
          tablespace: 'SALES_2026',
          numRows: 1845000,
          blocks: 34500,
          avgRowLen: 160,
          lastAnalyzed: '2026-10-18 01:00:00',
          columns: [
            { name: 'TX_ID', type: 'NUMBER(12,0)', nullable: 'N', pk: true, fk: false, defaultVal: null, comments: 'Global Transaction ID' },
            { name: 'CUSTOMER_ID', type: 'NUMBER(10,0)', nullable: 'N', pk: false, fk: true, defaultVal: null, comments: 'Customer reference' },
            { name: 'AMOUNT', type: 'NUMBER(14,2)', nullable: 'N', pk: false, fk: false, defaultVal: null, comments: 'Net billed amount in USD' },
            { name: 'TX_DATE', type: 'TIMESTAMP(6)', nullable: 'N', pk: false, fk: false, defaultVal: 'SYSTIMESTAMP', comments: 'Timestamp recorded' },
            { name: 'STATUS', type: 'VARCHAR2(20 BYTE)', nullable: 'N', pk: false, fk: false, defaultVal: "'SETTLED'", comments: 'State: SETTLED, PENDING, REFUNDED' }
          ],
          indexes: [
            { name: 'SALES_TX_PK', type: 'UNIQUE', columns: 'TX_ID', status: 'VALID', clusteringFactor: 12400 },
            { name: 'SALES_TX_CUST_DATE_IX', type: 'NONUNIQUE', columns: 'CUSTOMER_ID, TX_DATE', status: 'VALID', clusteringFactor: 18900 }
          ],
          constraints: [
            { name: 'SALES_TX_PK', type: 'Primary Key', details: 'TX_ID', status: 'ENABLED' },
            { name: 'SALES_TX_CUST_FK', type: 'Foreign Key', details: 'CUSTOMER_ID -> CUSTOMERS(CUSTOMER_ID)', status: 'ENABLED' }
          ],
          triggers: [],
          ddl: `CREATE TABLE "SALES_ADMIN"."SALES_TRANSACTIONS" (
  "TX_ID" NUMBER(12,0),
  "CUSTOMER_ID" NUMBER(10,0) NOT NULL,
  "AMOUNT" NUMBER(14,2) NOT NULL,
  "TX_DATE" TIMESTAMP(6) DEFAULT SYSTIMESTAMP NOT NULL,
  "STATUS" VARCHAR2(20 BYTE) DEFAULT 'SETTLED' NOT NULL,
  CONSTRAINT "SALES_TX_PK" PRIMARY KEY ("TX_ID")
) TABLESPACE "SALES_2026"
PARTITION BY RANGE (TX_DATE) (
  PARTITION P_2026_Q1 VALUES LESS THAN (TIMESTAMP '2026-04-01 00:00:00'),
  PARTITION P_2026_Q2 VALUES LESS THAN (TIMESTAMP '2026-07-01 00:00:00'),
  PARTITION P_2026_Q3 VALUES LESS THAN (TIMESTAMP '2026-10-01 00:00:00'),
  PARTITION P_2026_Q4 VALUES LESS THAN (MAXVALUE)
);`,
          data: [
            { TX_ID: 9840112, CUSTOMER_ID: 10001, AMOUNT: 84500.00, TX_DATE: '2026-10-18 14:22:01', STATUS: 'SETTLED' },
            { TX_ID: 9840113, CUSTOMER_ID: 10005, AMOUNT: 342100.00, TX_DATE: '2026-10-18 14:25:34', STATUS: 'SETTLED' },
            { TX_ID: 9840114, CUSTOMER_ID: 10003, AMOUNT: 12800.50, TX_DATE: '2026-10-18 14:31:10', STATUS: 'PENDING' },
            { TX_ID: 9840115, CUSTOMER_ID: 10002, AMOUNT: 95400.00, TX_DATE: '2026-10-18 14:40:55', STATUS: 'SETTLED' },
            { TX_ID: 9840116, CUSTOMER_ID: 10004, AMOUNT: 4200.00, TX_DATE: '2026-10-18 15:02:12', STATUS: 'SETTLED' }
          ]
        }
      ],
      views: [],
      packages: [],
      procedures: [],
      functions: [],
      sequences: [],
      triggers: []
    }
  },

  // Tablespace Usage & Storage
  tablespaces: [
    { name: 'SYSTEM', totalMb: 2048, usedMb: 1740, autoextend: 'YES', datafiles: 1, pct: 85 },
    { name: 'SYSAUX', totalMb: 4096, usedMb: 2867, autoextend: 'YES', datafiles: 2, pct: 70 },
    { name: 'USERS', totalMb: 8192, usedMb: 3440, autoextend: 'YES', datafiles: 2, pct: 42 },
    { name: 'SALES_2026', totalMb: 32768, usedMb: 28835, autoextend: 'YES', datafiles: 4, pct: 88 },
    { name: 'UNDOTBS1', totalMb: 4096, usedMb: 940, autoextend: 'YES', datafiles: 1, pct: 23 },
    { name: 'TEMP', totalMb: 8192, usedMb: 1230, autoextend: 'YES', datafiles: 1, pct: 15 }
  ],

  // Live Oracle Sessions (V$SESSION + V$LOCK)
  sessions: [
    { sid: 142, serial: 50412, spid: '18492', status: 'ACTIVE', username: 'SALES_ADMIN', osuser: 'pfranchim', machine: 'macbook-pro.local', program: 'traces-oracle.exe', module: 'Traces Worksheet', event: 'SQL*Net message from client', lastCallEt: 0, logonTime: '14:10:02', pgaMb: 18.4, blocking: null, blockedBy: null, sqlText: 'SELECT e.first_name, e.last_name, d.department_name, e.salary FROM employees e JOIN departments d ON e.department_id = d.department_id ORDER BY e.salary DESC;' },
    { sid: 204, serial: 11029, spid: '20144', status: 'ACTIVE', username: 'HR', osuser: 'app_user', machine: 'prod-api-04.corp', program: 'node.exe', module: 'PayrollWorker', event: 'enq: TX - row lock contention', lastCallEt: 45, logonTime: '13:05:18', pgaMb: 12.2, blocking: null, blockedBy: 312, sqlText: 'UPDATE customers SET credit_limit = credit_limit + 5000 WHERE customer_id = 10001;' },
    { sid: 312, serial: 44018, spid: '21940', status: 'ACTIVE', username: 'SALES_ADMIN', osuser: 'batch_srv', machine: 'etl-node-02.corp', program: 'python-cx_oracle', module: 'DailyReconciliation', event: 'db file sequential read', lastCallEt: 120, logonTime: '12:44:30', pgaMb: 64.8, blocking: 204, blockedBy: null, sqlText: 'UPDATE customers SET tier = \'ENTERPRISE\' WHERE customer_id = 10001;' },
    { sid: 48, serial: 33921, spid: '12001', status: 'ACTIVE', username: 'SYS', osuser: 'oracle', machine: 'exadata-rac01', program: 'oracle@exadata-rac01 (DBW0)', module: 'BACKGROUND', event: 'rdbms ipc message', lastCallEt: 1, logonTime: '06:00:00', pgaMb: 8.5, blocking: null, blockedBy: null, sqlText: null },
    { sid: 52, serial: 12903, spid: '12005', status: 'ACTIVE', username: 'SYS', osuser: 'oracle', machine: 'exadata-rac01', program: 'oracle@exadata-rac01 (LGWR)', module: 'BACKGROUND', event: 'rdbms ipc message', lastCallEt: 0, logonTime: '06:00:00', pgaMb: 6.2, blocking: null, blockedBy: null, sqlText: null },
    { sid: 89, serial: 48102, spid: '24590', status: 'INACTIVE', username: 'SCOTT', osuser: 'developer', machine: 'dev-station-09', program: 'toad.exe', module: 'Schema Browser', event: 'SQL*Net message from client', lastCallEt: 1840, logonTime: '11:20:10', pgaMb: 9.8, blocking: null, blockedBy: null, sqlText: 'SELECT * FROM dept;' }
  ],

  // Real-time Instance Gauges
  instanceMetrics: {
    bufferCacheHitRatio: 99.4,
    libraryCacheHitRatio: 98.9,
    sharedPoolFreePct: 24.5,
    activeSessionsCount: 5,
    totalSessionsCount: 48,
    redoLogSwitchesPerHour: 3.2,
    pgaTotalMb: 1420
  },

  // 1. Initialization Parameters (V$PARAMETER / V$SPPARAMETER)
  parameters: [
    { name: 'sga_target', value: '16G', isDefault: false, isDynamic: true, type: 'BIG_INTEGER', description: 'Target size of SGA in memory' },
    { name: 'pga_aggregate_target', value: '4G', isDefault: false, isDynamic: true, type: 'BIG_INTEGER', description: 'Target aggregate PGA memory' },
    { name: 'db_block_size', value: '8192', isDefault: true, isDynamic: false, type: 'INTEGER', description: 'Size of database blocks in bytes' },
    { name: 'cursor_sharing', value: 'EXACT', isDefault: true, isDynamic: true, type: 'STRING', description: 'Converts literal values to bind variables (SIMILAR/FORCE/EXACT)' },
    { name: 'undo_retention', value: '1800', isDefault: false, isDynamic: true, type: 'INTEGER', description: 'Undo retention in seconds (minimizes ORA-01555)' },
    { name: 'optimizer_mode', value: 'ALL_ROWS', isDefault: true, isDynamic: true, type: 'STRING', description: 'Cost-based optimizer goal' },
    { name: 'open_cursors', value: '1000', isDefault: false, isDynamic: true, type: 'INTEGER', description: 'Max number of concurrent open cursors per session' },
    { name: 'processes', value: '800', isDefault: false, isDynamic: false, type: 'INTEGER', description: 'Max user processes (requires SPFILE restart)' },
    { name: 'db_writer_processes', value: '4', isDefault: false, isDynamic: false, type: 'INTEGER', description: 'Number of DBWn background slave writer processes' },
    { name: 'audit_trail', value: 'DB, EXTENDED', isDefault: false, isDynamic: false, type: 'STRING', description: 'Auditing storage and extended SQL statement capture' }
  ],

  // 2. Alert Log Entries (alert.log)
  alertLog: [
    { timestamp: '2026-10-18 15:12:04', severity: 'INFO', message: 'Thread 1 advanced to log sequence 14829 (LGWR switch).' },
    { timestamp: '2026-10-18 14:48:22', severity: 'INFO', message: 'Archived Log entry 14828 added for thread 1 sequence 14828 rlid 1.' },
    { timestamp: '2026-10-18 13:05:22', severity: 'WARNING', message: 'Session 204 waiting on enq: TX - row lock contention (blocking sid 312).' },
    { timestamp: '2026-10-18 11:20:00', severity: 'INFO', message: 'ALTER SYSTEM SET undo_retention=1800 SCOPE=BOTH completed.' },
    { timestamp: '2026-10-18 09:14:15', severity: 'INFO', message: 'Incremental checkpoint completed at SCN: 10482910482.' }
  ],

  // 3. Tablespace Map & High Water Mark (HWM) calculation
  tablespaceMap: {
    tablespaceName: 'USERS',
    datafileName: '+DATA/SALES_PROD/DATAFILE/users.259.10982348',
    totalBlocks: 1048576,
    allocatedBlocks: 440320,
    hwmBlock: 512000,
    maxShrinkMb: 4192,
    currentSizeMb: 8192,
    reclaimableMb: 3740,
    segments: [
      { owner: 'HR', name: 'EMPLOYEES', type: 'TABLE', startExt: 128, blocks: 24, status: 'FRAGMENTED' },
      { owner: 'HR', name: 'DEPARTMENTS', type: 'TABLE', startExt: 152, blocks: 16, status: 'CLEAN' },
      { owner: 'SALES_ADMIN', name: 'CUSTOMERS', type: 'TABLE', startExt: 168, blocks: 256, status: 'BELOW_HWM_GAP' },
      { owner: 'SALES_ADMIN', name: 'SALES_TRANSACTIONS', type: 'TABLE PARTITION', startExt: 424, blocks: 2048, status: 'CLEAN' }
    ]
  },

  // 4. LogMiner Interface (DBMS_LOGMNR)
  logMiner: [
    { scn: 10482910240, timestamp: '2026-10-18 14:52:10', username: 'SALES_ADMIN', table: 'CUSTOMERS', operation: 'UPDATE', sqlRedo: "UPDATE \"SALES_ADMIN\".\"CUSTOMERS\" SET \"TIER\" = 'VIP_GOLD' WHERE \"CUSTOMER_ID\" = 10002;", sqlUndo: "UPDATE \"SALES_ADMIN\".\"CUSTOMERS\" SET \"TIER\" = 'STANDARD' WHERE \"CUSTOMER_ID\" = 10002;" },
    { scn: 10482910312, timestamp: '2026-10-18 14:55:40', username: 'HR', table: 'EMPLOYEES', operation: 'UPDATE', sqlRedo: "UPDATE \"HR\".\"EMPLOYEES\" SET \"SALARY\" = 25000 WHERE \"EMPLOYEE_ID\" = 100;", sqlUndo: "UPDATE \"HR\".\"EMPLOYEES\" SET \"SALARY\" = 24000 WHERE \"EMPLOYEE_ID\" = 100;" },
    { scn: 10482910398, timestamp: '2026-10-18 15:02:18', username: 'SALES_ADMIN', table: 'SALES_TRANSACTIONS', operation: 'INSERT', sqlRedo: "INSERT INTO \"SALES_ADMIN\".\"SALES_TRANSACTIONS\" (\"TX_ID\",\"CUSTOMER_ID\",\"AMOUNT\",\"TX_DATE\",\"STATUS\") VALUES (99402, 10001, 45000.00, TO_DATE('2026-10-18','YYYY-MM-DD'), 'COMPLETED');", sqlUndo: "DELETE FROM \"SALES_ADMIN\".\"SALES_TRANSACTIONS\" WHERE \"TX_ID\" = 99402;" },
    { scn: 10482910440, timestamp: '2026-10-18 15:10:04', username: 'DEV_USER', table: 'OLD_PRICING', operation: 'DROP', sqlRedo: "DROP TABLE \"SALES_ADMIN\".\"OLD_PRICING\" PURGE;", sqlUndo: "-- DDL operation cannot be undone automatically via LogMiner" }
  ],

  // 5. Flashback Recycle Bin (DBA_RECYCLEBIN)
  recycleBin: [
    { objectName: 'BIN$9d8a3910$0', originalName: 'TMP_CUSTOMERS_OCT', type: 'TABLE', tsName: 'USERS', dropTime: '2026-10-18 11:42:19', canUndrop: true },
    { objectName: 'BIN$3c7f1288$0', originalName: 'IDX_SALES_OLD_AMT', type: 'INDEX', tsName: 'USERS', dropTime: '2026-10-17 18:22:10', canUndrop: false },
    { objectName: 'BIN$aa11094f$0', originalName: 'BACKUP_EMPLOYEES_Q3', type: 'TABLE', tsName: 'USERS', dropTime: '2026-10-16 09:15:33', canUndrop: true }
  ],

  // 6. Data Guard Manager Status
  dataGuard: {
    primary: {
      dbUniqueName: 'SALES_PROD',
      role: 'PRIMARY',
      protectionMode: 'MAXIMUM AVAILABILITY',
      mrpStatus: 'ACTIVE',
      transportLag: '0 seconds',
      applyLag: '0 seconds',
      archiveGaps: 'None'
    },
    standby: {
      dbUniqueName: 'SALES_STBY',
      role: 'PHYSICAL STANDBY',
      protectionMode: 'MAXIMUM AVAILABILITY',
      mrpStatus: 'APPLYING_LOG (MRP0)',
      transportLag: '0 seconds',
      applyLag: '2.4 seconds',
      archiveGaps: 'None',
      lastReceivedSeq: 14829,
      lastAppliedSeq: 14829
    }
  },

  // 7. ASM Diskgroups (V$ASM_DISKGROUP)
  asm: {
    diskgroups: [
      { name: 'DATA', totalGb: 8192, freeGb: 3410, type: 'NORMAL (2-way)', state: 'MOUNTED', rebalancePower: 4, disks: 8 },
      { name: 'RECO', totalGb: 4096, freeGb: 2150, type: 'NORMAL (2-way)', state: 'MOUNTED', rebalancePower: 2, disks: 4 }
    ]
  },

  // 8. Exadata Diagnostics
  exadata: {
    cellOffloadEfficiencyPct: 92.4,
    smartScanSavingsGb: 842.6,
    flashCacheHitRatioPct: 98.1,
    storageIndexBypassedBlocks: 1489200
  },

  // 9. Sensitive Column Search (LGPD / GDPR / Compliance)
  sensitiveColumns: [
    { schema: 'HR', table: 'EMPLOYEES', column: 'SALARY', type: 'NUMBER(8,2)', category: 'FINANCIAL (SALARY)', matchRule: '*SALARY*', redactionStatus: 'NOT REDACTED', risk: 'HIGH' },
    { schema: 'HR', table: 'EMPLOYEES', column: 'EMAIL', type: 'VARCHAR2(25)', category: 'PII (EMAIL)', matchRule: '*EMAIL*', redactionStatus: 'DBMS_REDACT (PARTIAL)', risk: 'MEDIUM' },
    { schema: 'HR', table: 'EMPLOYEES', column: 'PHONE_NUMBER', type: 'VARCHAR2(20)', category: 'PII (PHONE)', matchRule: '*PHONE*', redactionStatus: 'NOT REDACTED', risk: 'MEDIUM' },
    { schema: 'SALES_ADMIN', table: 'CUSTOMERS', column: 'TAX_ID', type: 'VARCHAR2(14)', category: 'GOV_ID (CPF/CNPJ)', matchRule: '*TAX_ID*', redactionStatus: 'DBMS_REDACT (FULL)', risk: 'CRITICAL' },
    { schema: 'SALES_ADMIN', table: 'CUSTOMERS', column: 'EMAIL', type: 'VARCHAR2(100)', category: 'PII (EMAIL)', matchRule: '*EMAIL*', redactionStatus: 'DBMS_REDACT (RANDOM)', risk: 'MEDIUM' }
  ],

  // 10. Quest SQL Optimizer Alternatives
  sqlOptimizer: [
    { id: 'ALT-1', label: 'Original Query', hint: '/* None */', cost: 24, elapsedMs: 38.4, cpuSec: 0.03, logicalReads: 1420, winner: false },
    { id: 'ALT-2', label: 'Hash Join Transformation', hint: '/*+ USE_HASH(e d) */', cost: 18, elapsedMs: 24.1, cpuSec: 0.02, logicalReads: 980, winner: false },
    { id: 'ALT-3', label: 'Index Fast Full Scan & Parallel', hint: '/*+ INDEX_FFS(e EMP_EMP_ID_PK) PARALLEL(e 2) */', cost: 11, elapsedMs: 14.8, cpuSec: 0.01, logicalReads: 420, winner: true },
    { id: 'ALT-4', label: 'Nested Loops Leading', hint: '/*+ LEADING(d e) USE_NL(e) */', cost: 29, elapsedMs: 44.2, cpuSec: 0.04, logicalReads: 1890, winner: false }
  ],

  // 11. SavedSQL.dat (F8 SQL Recall)
  savedSql: [
    { timestamp: '2026-10-18 15:10:20', schema: 'HR', executions: 42, text: "SELECT e.employee_id, e.first_name, e.last_name, e.salary, d.department_name FROM hr.employees e JOIN hr.departments d ON e.department_id = d.department_id WHERE e.salary >= 6000 ORDER BY e.salary DESC;" },
    { timestamp: '2026-10-18 14:30:15', schema: 'SALES_ADMIN', executions: 18, text: "SELECT t.tx_id, c.name, t.amount, t.tx_date FROM sales_admin.sales_transactions t JOIN sales_admin.customers c ON t.customer_id = c.customer_id WHERE t.amount >= :min_amount;" },
    { timestamp: '2026-10-18 13:45:00', schema: 'SYSTEM', executions: 9, text: "SELECT sid, serial#, username, osuser, status, event FROM v$session WHERE type != 'BACKGROUND' ORDER BY sid;" },
    { timestamp: '2026-10-18 12:12:40', schema: 'HR', executions: 5, text: "SET SERVEROUTPUT ON;\nBEGIN\n  DBMS_OUTPUT.PUT_LINE('Checking payroll totals...');\nEND;" }
  ],

  // 12. Named SQL
  namedSql: [
    { name: 'TopEarnersByDept', schema: 'HR', text: "SELECT department_id, MAX(salary) AS max_sal FROM hr.employees GROUP BY department_id;" },
    { name: 'CheckBlockingLocks', schema: 'SYSTEM', text: "SELECT b.sid blocking_sid, w.sid waiting_sid, w.event FROM v$lock b JOIN v$lock w ON b.id1 = w.id1 AND b.id2 = w.id2 WHERE b.block = 1;" },
    { name: 'TablespaceFreeSpace', schema: 'SYSTEM', text: "SELECT tablespace_name, ROUND(SUM(bytes)/1024/1024,2) AS free_mb FROM dba_free_space GROUP BY tablespace_name;" }
  ],

  // 13. PL/SQL Profiler (DBMS_PROFILER Line by Line)
  plsqlProfiler: [
    { line: 1, text: "PROCEDURE calculate_department_bonus (p_dept_id IN NUMBER) IS", execs: 1, totalTimeUs: 4, minTimeUs: 4, maxTimeUs: 4, pct: 0.1 },
    { line: 2, text: "    v_bonus NUMBER := 0;", execs: 1, totalTimeUs: 1, minTimeUs: 1, maxTimeUs: 1, pct: 0.0 },
    { line: 3, text: "BEGIN", execs: 1, totalTimeUs: 1, minTimeUs: 1, maxTimeUs: 1, pct: 0.0 },
    { line: 4, text: "    FOR rec IN (SELECT employee_id, salary FROM hr.employees WHERE department_id = p_dept_id) LOOP", execs: 45, totalTimeUs: 820, minTimeUs: 12, maxTimeUs: 48, pct: 21.2 },
    { line: 5, text: "        v_bonus := rec.salary * 0.15;", execs: 44, totalTimeUs: 18, minTimeUs: 0, maxTimeUs: 1, pct: 0.5 },
    { line: 6, text: "        UPDATE hr.employees SET commission_pct = 0.15 WHERE employee_id = rec.employee_id;", execs: 44, totalTimeUs: 2980, minTimeUs: 55, maxTimeUs: 98, pct: 77.0 },
    { line: 7, text: "    END LOOP;", execs: 45, totalTimeUs: 32, minTimeUs: 0, maxTimeUs: 2, pct: 0.8 },
    { line: 8, text: "    COMMIT;", execs: 1, totalTimeUs: 14, minTimeUs: 14, maxTimeUs: 14, pct: 0.4 },
    { line: 9, text: "END calculate_department_bonus;", execs: 1, totalTimeUs: 2, minTimeUs: 2, maxTimeUs: 2, pct: 0.0 }
  ],

  // 14. CodeXpert AST Metrics
  codeXpertMetrics: {
    mccabeCyclomatic: 14,
    mccabeRisk: 'Moderate Risk (Threshold <= 10)',
    halsteadVolume: 1842.5,
    halsteadMentalEffort: '12.4 Hours maintenance effort',
    maintainabilityIndex: 78.2,
    maintainabilityRating: 'Good (Threshold >= 65)',
    rulesEvaluated: 142,
    severeViolations: 3,
    warningViolations: 2,
    infoViolations: 2
  },

  // 15. Team Coding (TCX_OBJECTS Locks)
  teamCoding: [
    { objectName: 'EMPLOYEES_PKG', objectType: 'PACKAGE BODY', schema: 'HR', lockedBy: 'pfranchim', lockDate: '2026-10-18 10:14:00', vcsProvider: 'Git (Enterprise GitLab)', vcsBranch: 'feature/bonus-revamp', status: 'LOCKED_BY_YOU' },
    { objectName: 'SALES_RECONCILE_PRC', objectType: 'PROCEDURE', schema: 'SALES_ADMIN', lockedBy: 'jdoe', lockDate: '2026-10-18 08:30:11', vcsProvider: 'Git (Enterprise GitLab)', vcsBranch: 'fix/recon-rounding', status: 'LOCKED_BY_OTHER' }
  ],

  // 16. Code Tester for Oracle (Unit Test Scenarios)
  codeTesterScenarios: [
    { id: 'TEST-01', name: 'Bonus calculation with standard salary', input: 'p_dept_id = 90, salary = 10000', expected: 'commission_pct = 0.15', actual: 'commission_pct = 0.15', passed: true, isolation: 'AUTO ROLLBACK OK' },
    { id: 'TEST-02', name: 'Zero salary boundary condition', input: 'p_dept_id = 10, salary = 0', expected: 'ORA-20001: Invalid salary', actual: 'ORA-20001: Invalid salary', passed: true, isolation: 'AUTO ROLLBACK OK' },
    { id: 'TEST-03', name: 'Non-existent department exception', input: 'p_dept_id = 9999', expected: 'NO_DATA_FOUND handled', actual: 'NO_DATA_FOUND handled', passed: true, isolation: 'AUTO ROLLBACK OK' }
  ],

  // 17. TNS Names Configuration
  tnsNames: `SALES_PROD =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = exadata-rac01.corp.internal)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = sales_prod.db.corp)
    )
  )

UAT_ORCL19C =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = uat-db.staging.internal)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = staging_pdb1)
    )
  )

DEV_PDB01 =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = localhost)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = dev_pdb)
    )
  )`,

  // 18. Live Spool SQL Queue
  spoolSql: [
    { time: '15:35:12.104', type: 'OCIStmtPrepare', sql: "SELECT /*+ CACHE_INSIGHT */ table_name, column_name, data_type FROM all_tab_columns WHERE owner = 'HR';", durationMs: 4.2 },
    { time: '15:35:12.112', type: 'OCIStmtExecute', sql: "SELECT syn.synonym_name, syn.table_owner, syn.table_name FROM all_synonyms syn WHERE syn.owner IN ('PUBLIC', 'HR');", durationMs: 8.9 },
    { time: '15:36:04.420', type: 'OCIFetch2', sql: "SELECT * FROM (SELECT e.employee_id, e.first_name FROM hr.employees e) WHERE ROWNUM <= 500;", durationMs: 14.1 }
  ]
};

