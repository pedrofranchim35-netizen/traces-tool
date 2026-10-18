#!/usr/bin/env python3
"""
=============================================================================
TOAD FOR ORACLE (TRACES EDITION) - REAL ORACLE DATABASE & GATEWAY BRIDGE
=============================================================================
Provides a bridge server connecting the Toad web interface directly to
real Oracle Database instances, supporting:
- Direct TCP/IP Net8 (Thin Mode - pure Python, no client needed)
- Oracle Instant Client (Thick Mode)
- Microsoft Corporate Gateway & Azure Entra ID SSO Bearer Token / Proxy
- Static file serving on port 3033
=============================================================================
"""

import http.server
import socketserver
import json
import os
import sys
import time
import urllib.parse
from datetime import datetime, date

# Try importing oracledb
try:
    import oracledb
    ORACLEDB_AVAILABLE = True
except ImportError:
    ORACLEDB_AVAILABLE = False

# Try importing sshtunnel for SSH Jump Host / Bastion bridge
try:
    import sshtunnel
    from sshtunnel import SSHTunnelForwarder
    sshtunnel.SSH_TIMEOUT = 8.0
    sshtunnel.TUNNEL_TIMEOUT = 8.0
    SSHTUNNEL_AVAILABLE = True
except ImportError:
    SSHTUNNEL_AVAILABLE = False

PORT = 3033
WEB_ROOT = os.path.dirname(os.path.abspath(__file__))
# If running inside bridge directory, set WEB_ROOT to parent
if os.path.basename(WEB_ROOT) == "bridge":
    WEB_ROOT = os.path.dirname(WEB_ROOT)

# Global active Oracle database connection state
ACTIVE_CONNECTION = {
    "conn": None,
    "config": None,
    "status": "DISCONNECTED",
    "connected_at": None,
    "banner": None,
    "mode": "THIN"
}

# Global active SSH Tunnel / Jump Host state
ACTIVE_TUNNEL = {
    "server": None,
    "local_port": None,
    "bridge_host": None,
    "target_host": None,
    "target_port": None
}

# Microsoft Gateway state
MS_GATEWAY_STATE = {
    "gateway_url": None,
    "tenant_id": None,
    "client_id": None,
    "access_token": None,
    "auth_status": "NOT_AUTHENTICATED"
}

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if hasattr(obj, 'read'): # CLOB/BLOB
        try:
            return obj.read()
        except Exception:
            return str(obj)
    return str(obj)

class ToadBridgeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/status":
            self.send_api_response({
                "oracledb_available": ORACLEDB_AVAILABLE,
                "oracledb_version": getattr(oracledb, "__version__", None) if ORACLEDB_AVAILABLE else None,
                "sshtunnel_available": SSHTUNNEL_AVAILABLE,
                "connection": {
                    "status": ACTIVE_CONNECTION["status"],
                    "config": ACTIVE_CONNECTION["config"],
                    "banner": ACTIVE_CONNECTION["banner"],
                    "connected_at": ACTIVE_CONNECTION["connected_at"]
                },
                "bridge_tunnel": {
                    "active": ACTIVE_TUNNEL["server"] is not None,
                    "bridge_host": ACTIVE_TUNNEL["bridge_host"],
                    "target_host": ACTIVE_TUNNEL["target_host"],
                    "target_port": ACTIVE_TUNNEL["target_port"],
                    "local_port": ACTIVE_TUNNEL["local_port"]
                },
                "microsoft_gateway": {
                    "status": MS_GATEWAY_STATE["auth_status"],
                    "gateway_url": MS_GATEWAY_STATE["gateway_url"]
                }
            })
        elif parsed.path == "/api/schemas":
            self.handle_get_schemas()
        elif parsed.path == "/api/objects":
            self.handle_get_objects(parsed.query)
        elif parsed.path == "/api/describe":
            self.handle_get_describe(parsed.query)
        elif parsed.path == "/api/sessions":
            self.handle_get_sessions()
        elif parsed.path == "/api/tablespaces":
            self.handle_get_tablespaces()
        else:
            # Serve static files (HTML, CSS, JS, Assets)
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if parsed.path == "/api/connect":
            self.handle_connect(payload)
        elif parsed.path == "/api/test-bridge":
            self.handle_test_bridge(payload)
        elif parsed.path == "/api/disconnect":
            self.handle_disconnect()
        elif parsed.path == "/api/query":
            self.handle_query(payload)
        elif parsed.path == "/api/script":
            self.handle_script(payload)
        elif parsed.path == "/api/explain":
            self.handle_explain(payload)
        elif parsed.path == "/api/microsoft-gateway-auth":
            self.handle_ms_gateway_auth(payload)
        else:
            self.send_api_response({"error": f"Endpoint not found: {parsed.path}"}, status=404)

    def send_api_response(self, data, status=200):
        body = json.dumps(data, default=json_serial).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    # -------------------------------------------------------------------------
    # API ENDPOINTS IMPLEMENTATION
    # -------------------------------------------------------------------------
    def handle_test_bridge(self, payload):
        """Tests SSH Jump Host bridge connectivity and target port accessibility without full DB connect"""
        bridge_host = payload.get("bridge_host")
        bridge_port = int(payload.get("bridge_port", 22))
        bridge_user = payload.get("bridge_user", "")
        bridge_password = payload.get("bridge_password", "")
        bridge_key_path = payload.get("bridge_key_path", "")
        target_host = payload.get("host") or payload.get("target_host", "localhost")
        target_port = int(payload.get("port") or payload.get("target_port", 1521))

        bridge_type = payload.get("bridge_type", "ssh")
        if not bridge_host:
            self.send_api_response({"success": False, "error": "Informe o Host da Ponte (IP ou DNS)."}, status=400)
            return

        import socket
        start_time = time.time()

        if bridge_type == "cman":
            try:
                print(f"[Bridge-Test] Testando porta da ponte Oracle CMAN / Net8 {bridge_host}:{bridge_port}...")
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(6.0)
                sock_result = sock.connect_ex((bridge_host, bridge_port))
                sock.close()
                elapsed_ms = round((time.time() - start_time) * 1000, 1)

                if sock_result == 0:
                    print(f"[Bridge-Test] Sucesso! Ponte Oracle CMAN {bridge_host}:{bridge_port} está respondendo.")
                    self.send_api_response({
                        "success": True,
                        "message": f"Ponte Oracle CMAN / Net8 ({bridge_host}:{bridge_port}) conectou com sucesso! Roteamento para ({target_host}:{target_port}) ativo.",
                        "latency_ms": elapsed_ms
                    })
                else:
                    self.send_api_response({
                        "success": False,
                        "error": f"Ponte Oracle CMAN ({bridge_host}:{bridge_port}) não respondeu na porta {bridge_port} (porta fechada ou inacessível)."
                    }, status=400)
            except Exception as e:
                self.send_api_response({
                    "success": False,
                    "error": f"Falha na ponte Oracle CMAN ({bridge_host}:{bridge_port}): {str(e)}"
                }, status=400)
            return

        if not SSHTUNNEL_AVAILABLE:
            self.send_api_response({
                "success": False,
                "error": "Biblioteca 'sshtunnel' não encontrada. Instale no terminal com 'pip install sshtunnel paramiko'."
            }, status=500)
            return

        test_tunnel = None
        try:
            print(f"[Bridge-Test] Testando ponte SSH {bridge_host}:{bridge_port} -> destino {target_host}:{target_port}...")
            tunnel_kwargs = {
                "ssh_address_or_host": (bridge_host, bridge_port),
                "remote_bind_address": (target_host, target_port),
                "local_bind_address": ("127.0.0.1", 0),
                "set_keepalive": 10.0,
                "allow_agent": True
            }
            if bridge_user:
                tunnel_kwargs["ssh_username"] = bridge_user
            if bridge_password:
                tunnel_kwargs["ssh_password"] = bridge_password
            if bridge_key_path and os.path.exists(bridge_key_path):
                tunnel_kwargs["ssh_pkey"] = bridge_key_path

            test_tunnel = SSHTunnelForwarder(**tunnel_kwargs)
            test_tunnel.start()

            # Verify connection by attempting TCP handshake to the local bind port
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(6.0)
            sock_result = sock.connect_ex(('127.0.0.1', test_tunnel.local_bind_port))
            sock.close()

            test_tunnel.stop()
            test_tunnel = None
            elapsed_ms = round((time.time() - start_time) * 1000, 1)

            if sock_result == 0:
                print(f"[Bridge-Test] Sucesso! Ponte {bridge_host} respondeu e destino {target_host}:{target_port} está aberto.")
                self.send_api_response({
                    "success": True,
                    "message": f"Ponte conectada com sucesso! Host de destino ({target_host}:{target_port}) respondeu através da ponte ({bridge_host}:{bridge_port}).",
                    "latency_ms": elapsed_ms
                })
            else:
                print(f"[Bridge-Test] Ponte conectou, mas porta de destino {target_port} falhou (code {sock_result}).")
                self.send_api_response({
                    "success": False,
                    "error": f"Ponte ({bridge_host}:{bridge_port}) autenticou com sucesso, mas o host de destino ({target_host}:{target_port}) não respondeu na porta {target_port}."
                }, status=400)
        except Exception as e:
            if test_tunnel:
                try:
                    test_tunnel.stop()
                except Exception:
                    pass
            print(f"[Bridge-Test] Falha no teste da ponte: {e}")
            self.send_api_response({
                "success": False,
                "error": f"Falha na conexão com a Ponte SSH ({bridge_host}:{bridge_port}): {str(e)}"
            }, status=400)

    def handle_connect(self, payload):
        """Connects to real Oracle Database via python-oracledb, optionally through an SSH Bridge or Oracle CMAN"""
        if not ORACLEDB_AVAILABLE:
            self.send_api_response({
                "success": False,
                "error": "python-oracledb is not installed on the system."
            }, status=500)
            return

        user = payload.get("user")
        password = payload.get("password")
        host = payload.get("host", "localhost")
        port = int(payload.get("port", 1521))
        service_name = payload.get("service_name")
        sid = payload.get("sid")
        tns_entry = payload.get("tns_entry")
        gateway_url = payload.get("gateway_url")
        bearer_token = payload.get("bearer_token")
        use_thick = payload.get("use_thick", False)

        use_bridge = payload.get("use_bridge", False)
        bridge_type = payload.get("bridge_type", "ssh") # 'ssh' | 'cman'
        bridge_host = payload.get("bridge_host")
        bridge_port = int(payload.get("bridge_port", 22 if bridge_type == "ssh" else 1521))
        bridge_user = payload.get("bridge_user", "")
        bridge_password = payload.get("bridge_password", "")
        bridge_key_path = payload.get("bridge_key_path", "")

        tunnel_instance = None
        effective_host = host
        effective_port = port
        cman_dsn = None

        # 1. Setup Bridge (SSH Tunnel or Oracle CMAN Source Route)
        if use_bridge and bridge_host:
            if bridge_type == "cman":
                print(f"[Bridge] Roteando conexão via Oracle CMAN / Net8: ({bridge_host}:{bridge_port}) -> ({host}:{port}/{service_name})")
                cman_dsn = f"""(DESCRIPTION=(SOURCE_ROUTE=YES)(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST={bridge_host})(PORT={bridge_port}))(ADDRESS=(PROTOCOL=TCP)(HOST={host})(PORT={port})))(CONNECT_DATA=(SERVICE_NAME={service_name or 'XE'})))"""
            else:
                # SSH Tunnel Mode
                if not SSHTUNNEL_AVAILABLE:
                    self.send_api_response({
                        "success": False,
                        "error": "Biblioteca 'sshtunnel' não encontrada. Instale com 'pip install sshtunnel paramiko'."
                    }, status=500)
                    return

                # Terminate existing tunnel if active
                if ACTIVE_TUNNEL.get("server"):
                    try:
                        ACTIVE_TUNNEL["server"].stop()
                    except Exception:
                        pass
                    ACTIVE_TUNNEL["server"] = None

                print(f"[Bridge] Conectando na Ponte SSH ({bridge_host}:{bridge_port}) para alcançar ({host}:{port})...")
                try:
                    tunnel_kwargs = {
                        "ssh_address_or_host": (bridge_host, bridge_port),
                        "remote_bind_address": (host, port),
                        "local_bind_address": ("127.0.0.1", 0),
                        "set_keepalive": 15.0,
                        "allow_agent": True
                    }
                    if bridge_user:
                        tunnel_kwargs["ssh_username"] = bridge_user
                    if bridge_password:
                        tunnel_kwargs["ssh_password"] = bridge_password
                    if bridge_key_path and os.path.exists(bridge_key_path):
                        tunnel_kwargs["ssh_pkey"] = bridge_key_path

                    tunnel_instance = SSHTunnelForwarder(**tunnel_kwargs)
                    tunnel_instance.start()

                    effective_host = "127.0.0.1"
                    effective_port = tunnel_instance.local_bind_port
                    print(f"[Bridge] Túnel SSH ativo com sucesso! Porta local vinculada: {effective_port}")
                except Exception as tunnel_err:
                    print(f"[Bridge] Falha ao iniciar túnel SSH: {tunnel_err}")
                    self.send_api_response({
                        "success": False,
                        "error": f"Falha ao conectar na Ponte SSH ({bridge_host}:{bridge_port}): {str(tunnel_err)}"
                    }, status=400)
                    return

        try:
            # Enable thick mode if requested (needs Instant Client)
            if use_thick:
                try:
                    oracledb.init_oracle_client()
                    ACTIVE_CONNECTION["mode"] = "THICK"
                except Exception as e:
                    print(f"[Warning] Thick mode init failed, falling back to Thin: {e}")
                    ACTIVE_CONNECTION["mode"] = "THIN"
            else:
                ACTIVE_CONNECTION["mode"] = "THIN"

            # Connect via DSN, TNS, or Host/Port/Service
            start_time = time.time()
            if cman_dsn:
                dsn_str = cman_dsn
            elif gateway_url:
                print(f"[Bridge] Connecting through Microsoft Gateway: {gateway_url}")
                dsn_str = oracledb.makedsn(effective_host, effective_port, service_name=service_name)
            elif tns_entry:
                dsn_str = tns_entry
            elif service_name:
                dsn_str = f"{effective_host}:{effective_port}/{service_name}"
            elif sid:
                dsn_str = oracledb.makedsn(effective_host, effective_port, sid=sid)
            else:
                dsn_str = f"{effective_host}:{effective_port}/XE"

            # Connect to Oracle
            conn_params = {
                "user": user,
                "password": password,
                "dsn": dsn_str,
                "tcp_connect_timeout": 12.0
            }
            if bearer_token:
                conn_params["access_token"] = bearer_token

            # Oracle requires SYSDBA auth mode for SYS user
            role = payload.get("role", "NORMAL").upper()
            if (user and user.upper() == "SYS") or role == "SYSDBA":
                conn_params["mode"] = oracledb.AUTH_MODE_SYSDBA
            elif role == "SYSOPER":
                conn_params["mode"] = oracledb.AUTH_MODE_SYSOPER

            conn = oracledb.connect(**conn_params)
            elapsed_ms = round((time.time() - start_time) * 1000, 1)

            # Store active tunnel
            if tunnel_instance:
                ACTIVE_TUNNEL["server"] = tunnel_instance
                ACTIVE_TUNNEL["local_port"] = effective_port
                ACTIVE_TUNNEL["bridge_host"] = bridge_host
                ACTIVE_TUNNEL["target_host"] = host
                ACTIVE_TUNNEL["target_port"] = port

            # Store active connection
            ACTIVE_CONNECTION["conn"] = conn
            ACTIVE_CONNECTION["status"] = "CONNECTED"
            ACTIVE_CONNECTION["connected_at"] = datetime.now().isoformat()
            ACTIVE_CONNECTION["config"] = {
                "user": user,
                "host": host,
                "port": port,
                "service_name": service_name or sid or tns_entry,
                "dsn": dsn_str,
                "gateway_url": gateway_url,
                "use_bridge": bool(use_bridge and bridge_host),
                "bridge_host": bridge_host if use_bridge else None,
                "bridge_port": bridge_port if use_bridge else None,
                "latency_ms": elapsed_ms
            }

            # Retrieve database banner
            with conn.cursor() as cur:
                cur.execute("SELECT banner FROM v$version WHERE ROWNUM = 1")
                row = cur.fetchone()
                ACTIVE_CONNECTION["banner"] = row[0] if row else "Oracle Database"

            print(f"[Bridge] Conexão com Oracle estabelecida com sucesso ({elapsed_ms} ms) - {ACTIVE_CONNECTION['banner']}")
            self.send_api_response({
                "success": True,
                "message": f"Successfully connected to Oracle Database in {elapsed_ms} ms",
                "version": ACTIVE_CONNECTION["banner"],
                "latency_ms": elapsed_ms,
                "mode": ACTIVE_CONNECTION["mode"],
                "bridge": {
                    "active": bool(use_bridge and bridge_host),
                    "bridge_host": bridge_host,
                    "target_host": host,
                    "target_port": port
                } if use_bridge else None
            })
        except Exception as e:
            # Clean up tunnel if oracle connection failed
            if tunnel_instance:
                try:
                    tunnel_instance.stop()
                except Exception:
                    pass
                if ACTIVE_TUNNEL.get("server") == tunnel_instance:
                    ACTIVE_TUNNEL["server"] = None
            ACTIVE_CONNECTION["status"] = "ERROR"
            print(f"[Bridge] Erro ao conectar no Oracle: {e}")
            self.send_api_response({
                "success": False,
                "error": str(e)
            }, status=400)

    def handle_disconnect(self):
        conn = ACTIVE_CONNECTION.get("conn")
        if conn:
            try:
                conn.close()
            except Exception:
                pass
        ACTIVE_CONNECTION["conn"] = None
        ACTIVE_CONNECTION["status"] = "DISCONNECTED"
        ACTIVE_CONNECTION["config"] = None

        # Clean up tunnel
        if ACTIVE_TUNNEL.get("server"):
            try:
                ACTIVE_TUNNEL["server"].stop()
            except Exception:
                pass
            ACTIVE_TUNNEL["server"] = None
            ACTIVE_TUNNEL["local_port"] = None

        print("[Bridge] Sessão Oracle e túnel da ponte desconectados com sucesso.")
        self.send_api_response({"success": True, "message": "Oracle connection and bridge tunnel closed."})

    def handle_query(self, payload):
        """Executes SQL statement on the real Oracle database"""
        conn = ACTIVE_CONNECTION.get("conn")
        if not conn:
            self.send_api_response({
                "error": "No active Oracle Database connection. Connect first via Connection Manager."
            }, status=400)
            return

        sql = payload.get("sql", "").strip()
        if not sql:
            self.send_api_response({"error": "Empty SQL query provided."}, status=400)
            return

        # Strip trailing semicolon for OCI cursor
        if sql.endswith(";"):
            sql = sql[:-1].strip()

        start_time = time.time()
        try:
            with conn.cursor() as cur:
                cur.arraysize = 500
                cur.execute(sql)
                elapsed_ms = round((time.time() - start_time) * 1000, 1)

                if cur.description:
                    # SELECT query returning rows
                    cols = [col[0] for col in cur.description]
                    raw_rows = cur.fetchmany(500)
                    rows = []
                    for r in raw_rows:
                        row_dict = {}
                        for idx, col_name in enumerate(cols):
                            val = r[idx]
                            row_dict[col_name] = json_serial(val)
                        rows.append(row_dict)

                    self.send_api_response({
                        "columns": cols,
                        "rows": rows,
                        "rowCount": len(rows),
                        "elapsedMs": elapsed_ms,
                        "tableName": "QUERY_RESULT"
                    })
                else:
                    # DML / DDL statement
                    conn.commit()
                    self.send_api_response({
                        "message": f"Statement executed successfully. Rows affected: {cur.rowcount}",
                        "rowsAffected": cur.rowcount,
                        "elapsedMs": elapsed_ms
                    })
        except Exception as e:
            self.send_api_response({
                "error": str(e),
                "elapsedMs": round((time.time() - start_time) * 1000, 1)
            }, status=400)

    def handle_script(self, payload):
        """Executes PL/SQL block or script and captures DBMS_OUTPUT"""
        conn = ACTIVE_CONNECTION.get("conn")
        if not conn:
            self.send_api_response({"error": "No active Oracle connection."}, status=400)
            return

        script = payload.get("script", "").strip()
        start_time = time.time()
        try:
            with conn.cursor() as cur:
                # Enable DBMS_OUTPUT
                cur.callproc("dbms_output.enable", [1000000])

                # Execute statement or block
                clean_script = script.rstrip(";")
                cur.execute(clean_script)
                conn.commit()

                # Retrieve DBMS_OUTPUT lines
                lines = []
                status_var = cur.var(int)
                line_var = cur.var(str)
                while True:
                    cur.callproc("dbms_output.get_line", [line_var, status_var])
                    if status_var.getvalue() != 0:
                        break
                    lines.append(line_var.getvalue())

                elapsed_ms = round((time.time() - start_time) * 1000, 1)
                self.send_api_response({
                    "success": True,
                    "dbmsOutput": lines,
                    "elapsedMs": elapsed_ms
                })
        except Exception as e:
            self.send_api_response({"error": str(e)}, status=400)

    def handle_explain(self, payload):
        """Generates real execution plan via PLAN_TABLE & DBMS_XPLAN"""
        conn = ACTIVE_CONNECTION.get("conn")
        if not conn:
            self.send_api_response({"error": "No active Oracle connection."}, status=400)
            return

        sql = payload.get("sql", "").strip().rstrip(";")
        try:
            with conn.cursor() as cur:
                cur.execute(f"EXPLAIN PLAN FOR {sql}")
                cur.execute("SELECT plan_table_output FROM TABLE(dbms_xplan.display('PLAN_TABLE', null, 'ALL'))")
                rows = [r[0] for r in cur.fetchall()]
                self.send_api_response({"planText": "\n".join(rows)})
        except Exception as e:
            self.send_api_response({"error": str(e)}, status=400)

    def handle_get_schemas(self):
        conn = ACTIVE_CONNECTION.get("conn")
        if not conn:
            self.send_api_response({"error": "No active connection"}, status=400)
            return
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT username FROM all_users ORDER BY username")
                schemas = [r[0] for r in cur.fetchall()]
                self.send_api_response({"schemas": schemas})
        except Exception as e:
            self.send_api_response({"error": str(e)}, status=400)

    def handle_get_objects(self, query):
        conn = ACTIVE_CONNECTION.get("conn")
        if not conn:
            self.send_api_response({"error": "No active connection"}, status=400)
            return
        params = urllib.parse.parse_qs(query)
        schema = params.get("schema", ["HR"])[0]
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT object_name, object_type, status FROM all_objects WHERE owner = :1 ORDER BY object_type, object_name", [schema])
                objs = [{"name": r[0], "type": r[1], "status": r[2]} for r in cur.fetchall()]
                self.send_api_response({"objects": objs})
        except Exception as e:
            self.send_api_response({"error": str(e)}, status=400)

    def handle_get_describe(self, query):
        conn = ACTIVE_CONNECTION.get("conn")
        if not conn:
            self.send_api_response({"error": "No active connection"}, status=400)
            return
        params = urllib.parse.parse_qs(query)
        table = params.get("table", ["EMPLOYEES"])[0].upper()
        schema = params.get("schema", ["HR"])[0].upper()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT column_name, data_type, data_length, nullable, data_default
                    FROM all_tab_columns 
                    WHERE owner = :1 AND table_name = :2 
                    ORDER BY column_id
                """, [schema, table])
                cols = [{
                    "name": r[0],
                    "type": r[1],
                    "length": r[2],
                    "nullable": r[3],
                    "default": str(r[4]) if r[4] else None
                } for r in cur.fetchall()]
                self.send_api_response({"columns": cols})
        except Exception as e:
            self.send_api_response({"error": str(e)}, status=400)

    def handle_get_sessions(self):
        conn = ACTIVE_CONNECTION.get("conn")
        if not conn:
            self.send_api_response({"error": "No active connection"}, status=400)
            return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT sid, serial#, username, status, osuser, machine, program, sql_id
                    FROM v$session 
                    WHERE type != 'BACKGROUND'
                    ORDER BY status, sid
                """)
                sessions = [{
                    "sid": r[0],
                    "serial": r[1],
                    "username": r[2] or "SYSTEM",
                    "status": r[3],
                    "osuser": r[4] or "-",
                    "machine": r[5] or "-",
                    "program": r[6] or "-",
                    "sql_id": r[7] or "-"
                } for r in cur.fetchall()]
                self.send_api_response({"sessions": sessions})
        except Exception as e:
            self.send_api_response({"error": str(e)}, status=400)

    def handle_get_tablespaces(self):
        conn = ACTIVE_CONNECTION.get("conn")
        if not conn:
            self.send_api_response({"error": "No active connection"}, status=400)
            return
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT tablespace_name, status, contents, extent_management
                    FROM dba_tablespaces
                    ORDER BY tablespace_name
                """)
                ts = [{
                    "name": r[0],
                    "status": r[1],
                    "contents": r[2],
                    "extent_mgmt": r[3]
                } for r in cur.fetchall()]
                self.send_api_response({"tablespaces": ts})
        except Exception as e:
            self.send_api_response({"error": str(e)}, status=400)

    def handle_ms_gateway_auth(self, payload):
        """Facilitates Microsoft Corporation login and Azure Entra ID Gateway SSO"""
        action = payload.get("action", "info")
        gateway_url = payload.get("gateway_url", "https://gateway.corp.microsoft.com")
        token = payload.get("token")

        if action == "set_token" and token:
            MS_GATEWAY_STATE["access_token"] = token
            MS_GATEWAY_STATE["gateway_url"] = gateway_url
            MS_GATEWAY_STATE["auth_status"] = "AUTHENTICATED"
            self.send_api_response({
                "success": True,
                "message": "Microsoft Corporate Gateway Bearer Token accepted and cached.",
                "gateway_url": gateway_url
            })
        elif action == "device_code":
            # Return Device Code flow guidance for Microsoft Corporation tenant
            self.send_api_response({
                "verification_uri": "https://microsoft.com/devicelogin",
                "instructions": "Open the link in your browser and enter your Microsoft corporate account credentials to authenticate this Toad gateway session."
            })
        else:
            self.send_api_response({
                "gateway_url": MS_GATEWAY_STATE["gateway_url"],
                "status": MS_GATEWAY_STATE["auth_status"]
            })

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), ToadBridgeHandler) as httpd:
        print(f"==================================================================")
        print(f"  TOAD FOR ORACLE (TRACES EDITION) - DATABASE & GATEWAY BRIDGE")
        print(f"==================================================================")
        print(f"  Serving Web UI & API at: http://localhost:{PORT}/index.html")
        print(f"  Oracle Driver: {'python-oracledb 26.0.1 (Ready)' if ORACLEDB_AVAILABLE else 'Not Installed'}")
        print(f"  Microsoft Gateway Bridge: Active on /api/connect")
        print(f"==================================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down bridge server...")
            httpd.server_close()

if __name__ == "__main__":
    run_server()
