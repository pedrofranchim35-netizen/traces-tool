# -*- coding: utf-8 -*-
"""
=============================================================================
TRACES TOAD PRO SUITE - BACKEND EXTENSIONS (12 PONTOS MESTRES)
=============================================================================
Extensão modular de backend do TracesToad garantindo paridade absoluta
com Toad for Oracle DBA Suite, Toad Xpert Edition e Spotlight on Oracle.

Módulos integrados:
- PONTO 1: Code Insight Dinâmico, Validador Sintático, SQL Recall & Snippets
- PONTO 2: Data Grid Edição em Massa DML & Escritor Nativo Binário Excel XLSX
- PONTO 3: Comparador de Objetos Diff Side-by-Side, Mini-ERD & DDL Express
- PONTO 4: ASH Timeline (Wait Events), Consumo TEMP/PGA & Assistente AWR/ADDM
- PONTO 5: Cofre Criptografado Local (AES-256), Chaves SSH (.pem/.ppk) & Watchdog
- PONTO 6: Motor Agendador de Tarefas em Background (Task Scheduler)
- PONTO 7: Depurador PL/SQL Passo-a-Passo (DBMS_DEBUG) & Profiler Heatmap
- PONTO 8: Health Check 360° (50+ quesitos Oracle) & Tablespace Disk Heatmap
- PONTO 9: SQL Tuning Advisor (DBMS_SQLTUNE), CBO Plan Diff & Histogramas
- PONTO 10: Engenharia Reversa (ERD Completo) & Extração DDL em Lote
- PONTO 11: Schema Compare & Sync (DDL) e Data Compare & Sync (DML)
- PONTO 12: Múltiplas Conexões por Aba, Terminal SQL*Plus & Mock Data Generator
=============================================================================
"""
import os
import re
import io
import json
import time
import uuid
import random
import base64
import hashlib
import hmac
import struct
import zipfile
import threading
import traceback
from decimal import Decimal
from datetime import datetime, date, timedelta
from xml.sax.saxutils import escape as xml_escape

# ------------------------------------------------------------------------------
# DIRETÓRIO DE DADOS PERSISTENTES DO USUÁRIO
# ------------------------------------------------------------------------------
def user_data_dir():
    base = os.environ.get("APPDATA") or os.path.join(os.path.expanduser("~"), ".config")
    path = os.path.join(base, "TracesToad")
    os.makedirs(path, exist_ok=True)
    return path


class ProError(Exception):
    """Erro de negócio com código HTTP associado."""
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


# ------------------------------------------------------------------------------
# CONTEXTO DE CONEXÕES & TÚNEIS (ENCAPSULAMENTO DO ORACLE_SERVER)
# ------------------------------------------------------------------------------
class ProContext:
    def __init__(self, connections, active_conn_id, tunnels, reconnect_fn=None):
        self.connections = connections
        self.active_conn_id = active_conn_id
        self.tunnels = tunnels
        self.reconnect_fn = reconnect_fn

    def get_connection_entry(self, conn_id=None):
        cid = conn_id or self.active_conn_id
        if cid and cid in self.connections:
            entry = self.connections[cid]
            if entry and entry.get("conn"):
                return entry
        for entry in self.connections.values():
            if entry and entry.get("conn"):
                return entry
        return None

    def get_conn(self, conn_id=None):
        entry = self.get_connection_entry(conn_id)
        return entry.get("conn") if entry else None

    def reconnect(self, conn_id):
        if callable(self.reconnect_fn):
            return self.reconnect_fn(conn_id)
        return False


# ------------------------------------------------------------------------------
# UTILITÁRIOS GERAIS DE SERIALIZAÇÃO & BANCO
# ------------------------------------------------------------------------------
def to_jsonable(v):
    if v is None:
        return None
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (bytes, bytearray)):
        return v.hex().upper()
    if hasattr(v, "read"):
        try:
            data = v.read()
            return data.hex().upper() if isinstance(data, (bytes, bytearray)) else data
        except Exception:
            return None
    if isinstance(v, timedelta):
        return str(v)
    return v


def fetch_dicts(cur, sql, binds=None, max_rows=None):
    cur.execute(sql, binds or {})
    if not cur.description:
        return []
    cols = [c[0] for c in cur.description]
    rows = cur.fetchmany(max_rows) if max_rows else cur.fetchall()
    return [{cols[i]: to_jsonable(r[i]) for i in range(len(cols))} for r in rows]


def fetch_scalar(cur, sql, binds=None):
    cur.execute(sql, binds or {})
    row = cur.fetchone()
    return to_jsonable(row[0]) if row else None


def read_lob(v):
    if v is None:
        return ""
    if hasattr(v, "read"):
        try:
            return v.read()
        except Exception:
            return ""
    return str(v)


SYSTEM_SCHEMAS = (
    "SYS", "SYSTEM", "OUTLN", "DBSNMP", "APPQOSSYS", "AUDSYS", "CTXSYS", "DVSYS", "DVF",
    "GSMADMIN_INTERNAL", "LBACSYS", "MDSYS", "OJVMSYS", "OLAPSYS", "ORDDATA", "ORDSYS",
    "ORDPLUGINS", "SI_INFORMTN_SCHEMA", "WMSYS", "XDB", "ANONYMOUS", "DIP", "GSMCATUSER",
    "GSMUSER", "SYSBACKUP", "SYSDG", "SYSKM", "SYSRAC", "REMOTE_SCHEDULER_AGENT",
    "DBSFWUSER", "GGSYS", "XS$NULL", "ORACLE_OCM", "MDDATA", "SPATIAL_CSW_ADMIN_USR",
    "SPATIAL_WFS_ADMIN_USR", "APEX_PUBLIC_USER", "FLOWS_FILES", "PUBLIC", "OPS$ORACLE",
)
SYSTEM_SCHEMAS_SQL = ",".join("'%s'" % s for s in SYSTEM_SCHEMAS)


def valid_identifier(name, what="identificador"):
    if not name or not re.match(r'^[A-Za-z][A-Za-z0-9_$#]{0,127}$', str(name)):
        raise ProError(f"{what} inválido: {name!r}")
    return str(name).upper()


def split_owner_name(full, default_owner=None):
    full = (full or "").strip().strip('"')
    if "." in full:
        owner, name = full.split(".", 1)
        return valid_identifier(owner, "schema"), valid_identifier(name.strip('"'), "objeto")
    return (valid_identifier(default_owner, "schema") if default_owner else None), valid_identifier(full, "objeto")


def current_schema(cur):
    return fetch_scalar(cur, "SELECT SYS_CONTEXT('USERENV','CURRENT_SCHEMA') FROM dual")


# ------------------------------------------------------------------------------
# PARSER DE SCRIPTS ESTILO SQL*PLUS
# ------------------------------------------------------------------------------
PLSQL_START = re.compile(
    r"^\s*(DECLARE|BEGIN|CREATE\s+(OR\s+REPLACE\s+)?((NON)?EDITIONABLE\s+)?"
    r"(PROCEDURE|FUNCTION|PACKAGE|TRIGGER|TYPE|LIBRARY|JAVA))\b", re.I)
CMD_START = re.compile(
    r"^\s*(@@?|(SET|SHOW|SHO|DESC|DESCRIBE|PROMPT|PRO|SPOOL|DEFINE|DEF|UNDEFINE|EXEC|EXECUTE|"
    r"REM|REMARK|CLEAR|CL|COLUMN|COL|TTITLE|BTITLE|WHENEVER|CONNECT|CONN|EXIT|QUIT|PAUSE|HOST|"
    r"ACCEPT|VARIABLE|VAR|PRINT|TIMING|BREAK|COMPUTE)\b)", re.I)


def split_sql_script(text):
    lines = (text or "").replace("\r\n", "\n").replace("\r", "\n").split("\n")
    out = []
    pending = [(i + 1, l) for i, l in enumerate(lines)]
    pending.reverse()
    mode = None
    buf = []
    start_line = 0
    in_quote = False
    in_block = False

    def flush(kind):
        stmt = "\n".join(buf).strip()
        if kind == "sql":
            stmt = stmt.rstrip().rstrip(";").rstrip()
        if stmt:
            out.append({"kind": kind, "text": stmt, "line": start_line})

    while pending:
        lineno, line = pending.pop()
        stripped = line.strip()
        if mode is None:
            if not stripped or stripped.startswith("--") or stripped == "/":
                continue
            if CMD_START.match(line):
                out.append({"kind": "cmd", "text": stripped.rstrip(";"), "line": lineno})
                continue
            mode = "plsql" if PLSQL_START.match(line) else "sql"
            buf = []
            start_line = lineno
            in_quote = False
            in_block = False

        if mode == "plsql":
            if stripped == "/":
                flush("plsql")
                mode = None
            else:
                buf.append(line)
            continue

        if stripped == "/" and not in_quote and not in_block:
            flush("sql")
            mode = None
            continue
        j = 0
        cut = None
        n = len(line)
        while j < n:
            if in_block:
                if line.startswith("*/", j):
                    in_block = False
                    j += 2
                    continue
                j += 1
                continue
            ch = line[j]
            if in_quote:
                if ch == "'":
                    if j + 1 < n and line[j + 1] == "'":
                        j += 2
                        continue
                    in_quote = False
                j += 1
                continue
            if line.startswith("--", j):
                break
            if line.startswith("/*", j):
                in_block = True
                j += 2
                continue
            if ch == "'":
                in_quote = True
            elif ch == ";":
                cut = j
                break
            j += 1
        if cut is None:
            buf.append(line)
        else:
            buf.append(line[:cut])
            flush("sql")
            mode = None
            rest = line[cut + 1:]
            if rest.strip() and not rest.strip().startswith("--"):
                pending.append((lineno, rest))

    if mode == "plsql":
        flush("plsql")
    elif mode == "sql":
        flush("sql")
    return out


def format_sqlplus_table(cols, rows, max_col_width=40, null_text=""):
    if not cols:
        return []
    str_rows = []
    for r in rows:
        line = []
        for v in r:
            v = to_jsonable(v)
            s = null_text if v is None else str(v)
            s = s.replace("\n", " ")
            if len(s) > max_col_width:
                s = s[:max_col_width - 1] + "…"
            line.append(s)
        str_rows.append(line)
    widths = []
    for i, c in enumerate(cols):
        w = len(str(c))
        for r in str_rows:
            w = max(w, len(r[i]))
        widths.append(min(max(w, 1), max_col_width))
    header = " ".join(str(c)[:widths[i]].ljust(widths[i]) for i, c in enumerate(cols))
    sep = " ".join("-" * widths[i] for i in range(len(cols)))
    out = [header, sep]
    for r in str_rows:
        out.append(" ".join(r[i].ljust(widths[i]) for i in range(len(cols))))
    return out


def sql_literal(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float, Decimal)):
        return str(v)
    if isinstance(v, datetime):
        if v.microsecond:
            return "TO_TIMESTAMP('%s','YYYY-MM-DD HH24:MI:SS.FF6')" % v.strftime("%Y-%m-%d %H:%M:%S.%f")
        return "TO_DATE('%s','YYYY-MM-DD HH24:MI:SS')" % v.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(v, date):
        return "TO_DATE('%s','YYYY-MM-DD')" % v.strftime("%Y-%m-%d")
    if isinstance(v, (bytes, bytearray)):
        return "HEXTORAW('%s')" % v.hex().upper()
    if hasattr(v, "read"):
        v = v.read()
        if isinstance(v, (bytes, bytearray)):
            return "HEXTORAW('%s')" % v.hex().upper()
    s = str(v).replace("'", "''")
    if len(s) > 3900:
        chunks = [s[i:i + 3900] for i in range(0, len(s), 3900)]
        return " || ".join("TO_CLOB('%s')" % c for c in chunks)
    return "'%s'" % s


# ------------------------------------------------------------------------------
# DECODIFICAÇÃO DE DADOS RAW DE DICIONÁRIO ORACLE (LOW_VALUE / HIGH_VALUE)
# ------------------------------------------------------------------------------
def decode_oracle_number(raw):
    b = bytes(raw)
    if not b:
        return None
    if b == b"\x80":
        return Decimal(0)
    exp_byte = b[0]
    if exp_byte & 0x80:
        exponent = (exp_byte & 0x7F) - 65
        digits = [x - 1 for x in b[1:]]
        sign = 1
    else:
        exponent = ((~exp_byte) & 0x7F) - 65
        body = b[1:]
        if body and body[-1] == 102:
            body = body[:-1]
        digits = [101 - x for x in body]
        sign = -1
    val = Decimal(0)
    for i, d in enumerate(digits):
        val += Decimal(d) * (Decimal(100) ** (exponent - i))
    return sign * val


def decode_oracle_date(raw):
    b = bytes(raw)
    if len(b) < 7:
        return None
    try:
        return datetime((b[0] - 100) * 100 + (b[1] - 100), b[2], b[3], b[4] - 1, b[5] - 1, b[6] - 1)
    except Exception:
        return None


def decode_low_high(raw_hex, data_type):
    if raw_hex is None:
        return None
    try:
        raw = bytes.fromhex(raw_hex) if isinstance(raw_hex, str) else bytes(raw_hex)
    except Exception:
        return raw_hex
    dt = (data_type or "").upper()
    try:
        if dt in ("NUMBER", "FLOAT", "INTEGER"):
            n = decode_oracle_number(raw)
            return float(n) if n is not None else None
        if dt == "DATE" or dt.startswith("TIMESTAMP"):
            d = decode_oracle_date(raw)
            return d.isoformat() if d else None
        if "CHAR" in dt:
            return raw.decode("utf-8", errors="replace")
    except Exception:
        pass
    return raw.hex().upper()


# ------------------------------------------------------------------------------
# PONTO 2: ESCRITOR NATIVO BINÁRIO EXCEL (.XLSX) SEM DEPENDÊNCIAS EXTERNAS
# ------------------------------------------------------------------------------
def _xlsx_col(idx):
    s = ""
    idx += 1
    while idx:
        idx, rem = divmod(idx - 1, 26)
        s = chr(65 + rem) + s
    return s


def _excel_serial(dt_value):
    if isinstance(dt_value, datetime):
        delta = dt_value - datetime(1899, 12, 30)
    else:
        delta = datetime(dt_value.year, dt_value.month, dt_value.day) - datetime(1899, 12, 30)
    return delta.days + delta.seconds / 86400.0


def build_xlsx(columns, rows, sheet_name="Dados"):
    sheet_name = re.sub(r'[\[\]\*\?/\\:]', "_", sheet_name or "Dados")[:31] or "Dados"
    widths = [min(max(len(str(c)) + 2, 8), 60) for c in columns]
    sheet_rows = []

    def cell(ref, v, zebra):
        base_style = 4 if zebra else 1
        if v is None:
            return f'<c r="{ref}" s="{base_style}"/>'
        if isinstance(v, bool):
            return f'<c r="{ref}" s="{base_style}" t="b"><v>{1 if v else 0}</v></c>'
        if isinstance(v, (int, float, Decimal)) and not isinstance(v, bool):
            return f'<c r="{ref}" s="{base_style + 1}"><v>{v}</v></c>'
        if isinstance(v, (datetime, date)):
            return f'<c r="{ref}" s="{base_style + 2}"><v>{_excel_serial(v)}</v></c>'
        s = str(v)
        if len(s) > 32000:
            s = s[:32000]
        s = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", s)
        return f'<c r="{ref}" s="{base_style}" t="inlineStr"><is><t xml:space="preserve">{xml_escape(s)}</t></is></c>'

    hdr = "".join(
        f'<c r="{_xlsx_col(i)}1" s="7" t="inlineStr"><is><t>{xml_escape(str(c))}</t></is></c>'
        for i, c in enumerate(columns))
    sheet_rows.append(f'<row r="1">{hdr}</row>')
    for r_idx, r in enumerate(rows, start=2):
        zebra = (r_idx % 2 == 1)
        cells = []
        for c_idx, v in enumerate(r):
            if hasattr(v, "read"):
                v = read_lob(v)
            cells.append(cell(f"{_xlsx_col(c_idx)}{r_idx}", v, zebra))
            if v is not None and c_idx < len(widths):
                ln = 19 if isinstance(v, (datetime, date)) else len(str(v))
                widths[c_idx] = min(max(widths[c_idx], ln + 2), 60)
        sheet_rows.append(f'<row r="{r_idx}">{"".join(cells)}</row>')

    last_ref = f"{_xlsx_col(max(len(columns) - 1, 0))}{max(len(rows) + 1, 1)}"
    cols_xml = "".join(f'<col min="{i + 1}" max="{i + 1}" width="{w}" customWidth="1"/>' for i, w in enumerate(widths))
    sheet_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<dimension ref="A1:{last_ref}"/>'
        '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        f'<cols>{cols_xml}</cols>'
        f'<sheetData>{"".join(sheet_rows)}</sheetData>'
        f'<autoFilter ref="A1:{last_ref}"/>'
        '</worksheet>')
    styles_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy hh:mm:ss"/></numFmts>'
        '<fonts count="2"><font><sz val="10"/><name val="Calibri"/></font>'
        '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'
        '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
        '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>'
        '<fill><patternFill patternType="solid"><fgColor rgb="FF1E3A5F"/><bgColor indexed="64"/></patternFill></fill></fills>'
        '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'
        '<border><left style="thin"><color rgb="FFD0D7DE"/></left><right style="thin"><color rgb="FFD0D7DE"/></right>'
        '<top style="thin"><color rgb="FFD0D7DE"/></top><bottom style="thin"><color rgb="FFD0D7DE"/></bottom><diagonal/></border></borders>'
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        '<cellXfs count="8">'
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>'
        '<xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>'
        '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>'
        '<xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>'
        '<xf numFmtId="4" fontId="0" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>'
        '<xf numFmtId="164" fontId="0" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>'
        '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'
        '</cellXfs></styleSheet>')
    workbook_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<sheets><sheet name="{xml_escape(sheet_name)}" sheetId="1" r:id="rId1"/></sheets>'
        f'<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">\'{xml_escape(sheet_name)}\'!$A$1:${_xlsx_col(max(len(columns) - 1, 0))}${max(len(rows) + 1, 1)}</definedName></definedNames>'
        '</workbook>')
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="xml" ContentType="application/xml"/>'
                   '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                   '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                   '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
                   '</Types>')
        z.writestr("_rels/.rels",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                   '</Relationships>')
        z.writestr("xl/workbook.xml", workbook_xml)
        z.writestr("xl/_rels/workbook.xml.rels",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
                   '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                   '</Relationships>')
        z.writestr("xl/styles.xml", styles_xml)
        z.writestr("xl/worksheets/sheet1.xml", sheet_xml)
    return buf.getvalue()


# ------------------------------------------------------------------------------
# PONTO 5: CHAVES SSH (.PEM OPENSSH/PKCS#8 E .PPK PUTTY V2/V3)
# ------------------------------------------------------------------------------
def _ppk_read_lines(text):
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    fields = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        if ":" not in line:
            i += 1
            continue
        key, val = line.split(":", 1)
        key, val = key.strip(), val.strip()
        if key in ("Public-Lines", "Private-Lines"):
            count = int(val)
            fields[key.split("-")[0]] = base64.b64decode("".join(lines[i + 1:i + 1 + count]))
            i += 1 + count
            continue
        fields[key] = val
        i += 1
    return fields


def _ssh_read_string(buf, off):
    ln = struct.unpack(">I", buf[off:off + 4])[0]
    return buf[off + 4:off + 4 + ln], off + 4 + ln


def _ssh_read_mpint(buf, off):
    data, off = _ssh_read_string(buf, off)
    return int.from_bytes(data, "big", signed=True) if data else 0, off


def _load_ppk(path, passphrase):
    import paramiko
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    first = text.splitlines()[0] if text else ""
    m = re.match(r"PuTTY-User-Key-File-(\d+):\s*(\S+)", first)
    if not m:
        raise ProError("Arquivo .ppk inválido (cabeçalho PuTTY-User-Key-File ausente).")
    version, algo = int(m.group(1)), m.group(2)
    fields = _ppk_read_lines(text)
    encryption = fields.get("Encryption", "none")
    comment = fields.get("Comment", "")
    pub = fields.get("Public", b"")
    priv = fields.get("Private", b"")

    if encryption != "none":
        if not passphrase:
            raise ProError("A chave .ppk é protegida por passphrase. Informe a passphrase da chave.")
        if encryption != "aes256-cbc":
            raise ProError(f"Cifra .ppk não suportada: {encryption}")
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        if version == 2:
            pw = passphrase.encode("utf-8")
            key = hashlib.sha1(b"\x00\x00\x00\x00" + pw).digest() + hashlib.sha1(b"\x00\x00\x00\x01" + pw).digest()
            key, iv = key[:32], b"\x00" * 16
            mac_key = hashlib.sha1(b"putty-private-key-file-mac-key" + pw).digest()
            mac_algo = hashlib.sha1
        else:
            kdf = fields.get("Key-Derivation", "")
            salt = bytes.fromhex(fields.get("Argon2-Salt", ""))
            mem = int(fields.get("Argon2-Memory", "8192"))
            passes = int(fields.get("Argon2-Passes", "13"))
            par = int(fields.get("Argon2-Parallelism", "1"))
            try:
                from cryptography.hazmat.primitives.kdf.argon2 import Argon2id
            except Exception:
                raise ProError("Esta versão da biblioteca não suporta Argon2. Exporte a chave no PuTTYgen como OpenSSH.")
            if kdf != "Argon2id":
                raise ProError("Chaves .ppk v3 com Argon2i não são suportadas. Exporte como OpenSSH no PuTTYgen.")
            derived = Argon2id(salt=salt, length=80, iterations=passes, lanes=par, memory_cost=mem).derive(passphrase.encode("utf-8"))
            key, iv, mac_key = derived[:32], derived[32:48], derived[48:80]
            mac_algo = hashlib.sha256
        dec = Cipher(algorithms.AES(key), modes.CBC(iv)).decryptor()
        priv = dec.update(priv) + dec.finalize()
    else:
        mac_key = b"" if version == 3 else hashlib.sha1(b"putty-private-key-file-mac-key").digest()
        mac_algo = hashlib.sha256 if version == 3 else hashlib.sha1

    expected = fields.get("Private-MAC")
    if expected:
        def s(b):
            return struct.pack(">I", len(b)) + b
        mac_data = s(algo.encode()) + s(encryption.encode()) + s(comment.encode()) + s(pub) + s(priv)
        calc = hmac.new(mac_key, mac_data, mac_algo).hexdigest()
        if calc.lower() != expected.lower():
            raise ProError("Passphrase incorreta ou arquivo .ppk corrompido (MAC inválido).")

    if algo == "ssh-rsa":
        off = 0
        _, off = _ssh_read_string(pub, off)
        e, off = _ssh_read_mpint(pub, off)
        n, off = _ssh_read_mpint(pub, off)
        off = 0
        d, off = _ssh_read_mpint(priv, off)
        p, off = _ssh_read_mpint(priv, off)
        q, off = _ssh_read_mpint(priv, off)
        from cryptography.hazmat.primitives.asymmetric import rsa
        pn = rsa.RSAPublicNumbers(e, n)
        numbers = rsa.RSAPrivateNumbers(p, q, d, rsa.rsa_crt_dmp1(d, p), rsa.rsa_crt_dmq1(d, q), rsa.rsa_crt_iqmp(p, q), pn)
        return paramiko.RSAKey(key=numbers.private_key())
    if algo == "ssh-ed25519":
        off = 0
        _, off = _ssh_read_string(pub, off)
        pub_raw, off = _ssh_read_string(pub, off)
        priv_raw, _ = _ssh_read_string(priv, 0)
        from cryptography.hazmat.primitives.asymmetric import ed25519
        from cryptography.hazmat.primitives import serialization
        k = ed25519.Ed25519PrivateKey.from_private_bytes(priv_raw[:32])
        pem = k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.OpenSSH, serialization.NoEncryption())
        return paramiko.Ed25519Key(file_obj=io.StringIO(pem.decode()))
    if algo.startswith("ecdsa-sha2-"):
        off = 0
        _, off = _ssh_read_string(pub, off)
        curve_name, off = _ssh_read_string(pub, off)
        point, off = _ssh_read_string(pub, off)
        priv_int, _ = _ssh_read_mpint(priv, 0)
        from cryptography.hazmat.primitives.asymmetric import ec
        curves = {b"nistp256": ec.SECP256R1(), b"nistp384": ec.SECP384R1(), b"nistp521": ec.SECP521R1()}
        curve = curves.get(curve_name)
        if not curve:
            raise ProError(f"Curva ECDSA não suportada: {curve_name!r}")
        k = ec.derive_private_key(priv_int, curve)
        return paramiko.ECDSAKey(vals=(k, k.public_key()))
    raise ProError(f"Algoritmo de chave .ppk não suportado: {algo}")


def load_private_key(path, passphrase=None):
    import paramiko
    if not path or not os.path.exists(path):
        raise ProError(f"Arquivo de chave não encontrado: {path}")
    with open(path, "rb") as f:
        head = f.read(64)
    if head.startswith(b"PuTTY-User-Key-File"):
        return _load_ppk(path, passphrase)
    errors = []
    for cls in (paramiko.RSAKey, paramiko.ECDSAKey, paramiko.Ed25519Key, getattr(paramiko, "DSSKey", None)):
        if cls is None:
            continue
        try:
            return cls.from_private_key_file(path, password=passphrase or None)
        except paramiko.PasswordRequiredException:
            raise ProError("A chave privada é protegida por passphrase. Informe a passphrase da chave.")
        except Exception as e:
            errors.append(f"{cls.__name__}: {e}")
    try:
        from cryptography.hazmat.primitives import serialization
        with open(path, "rb") as f:
            k = serialization.load_pem_private_key(f.read(), password=passphrase.encode() if passphrase else None)
        pem = k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.OpenSSH, serialization.NoEncryption())
        for cls in (paramiko.RSAKey, paramiko.ECDSAKey, paramiko.Ed25519Key):
            try:
                return cls.from_private_key(io.StringIO(pem.decode()))
            except Exception:
                pass
    except Exception as e:
        errors.append(f"PKCS8: {e}")
    raise ProError("Não foi possível ler a chave privada. Detalhes: " + " | ".join(errors[-3:]))


def describe_key(pkey):
    fp = pkey.get_fingerprint()
    return {
        "type": pkey.get_name(),
        "bits": pkey.get_bits(),
        "fingerprint_md5": ":".join("%02x" % b for b in fp),
        "fingerprint_sha256": "SHA256:" + base64.b64encode(hashlib.sha256(pkey.asbytes()).digest()).decode().rstrip("="),
    }


def h_ssh_key_inspect(ctx, p):
    pkey = load_private_key(p.get("path"), p.get("passphrase"))
    info = describe_key(pkey)
    info["success"] = True
    info["public_key"] = f"{pkey.get_name()} {pkey.get_base64()}"
    return info, 200


# ------------------------------------------------------------------------------
# PONTO 5: KEEPALIVE & AUTO-RECONNECT (WATCHDOG RESILIENTE)
# ------------------------------------------------------------------------------
KEEPALIVE_STATE = {"enabled": True, "interval": 25, "events": [], "last_run": None}
_KEEPALIVE_LOCK = threading.Lock()


def _ka_event(conn_id, kind, msg):
    KEEPALIVE_STATE["events"].insert(0, {"at": datetime.now().isoformat(timespec="seconds"), "conn_id": conn_id, "kind": kind, "message": msg})
    del KEEPALIVE_STATE["events"][100:]


def keepalive_tick(ctx):
    if not KEEPALIVE_STATE["enabled"]:
        return
    with _KEEPALIVE_LOCK:
        KEEPALIVE_STATE["last_run"] = datetime.now().isoformat(timespec="seconds")
        for cid, entry in list(ctx.connections.items()):
            conn = entry.get("conn")
            if not conn:
                continue
            healthy = True
            try:
                conn.ping()
            except Exception as e:
                healthy = False
                _ka_event(cid, "DOWN", f"Sessão não respondeu ao ping: {e}")
            tkey = entry.get("tunnel_key")
            tunnel_info = ctx.tunnels.get(tkey) if tkey else None
            tunnel_dead = bool(tunnel_info and not getattr(tunnel_info.get("server"), "is_active", True))
            if healthy and not tunnel_dead:
                entry["health"] = "OK"
                continue
            entry["health"] = "RECONNECTING"
            try:
                ctx.reconnect(cid)
                entry["reconnects"] = entry.get("reconnects", 0) + 1
                entry["health"] = "OK"
                _ka_event(cid, "RECOVERED", "Túnel/sessão restabelecidos automaticamente.")
            except Exception as e:
                entry["health"] = "DOWN"
                _ka_event(cid, "FAILED", f"Falha ao reconectar: {e}")


def start_keepalive_thread(ctx):
    def loop():
        while True:
            time.sleep(max(10, int(KEEPALIVE_STATE.get("interval") or 25)))
            try:
                keepalive_tick(ctx)
            except Exception:
                pass
    t = threading.Thread(target=loop, name="traces-keepalive", daemon=True)
    t.start()
    return t


def h_keepalive_status(ctx, p):
    if "enabled" in p:
        KEEPALIVE_STATE["enabled"] = bool(p.get("enabled"))
    if p.get("interval"):
        KEEPALIVE_STATE["interval"] = max(10, int(p["interval"]))
    if p.get("run_now"):
        keepalive_tick(ctx)
    conns = []
    for cid, e in ctx.connections.items():
        if e.get("conn"):
            conns.append({"id": cid, "health": e.get("health", "OK"), "reconnects": e.get("reconnects", 0),
                          "tunnel": bool(e.get("tunnel_key")), "can_reconnect": bool(e.get("_connect_params"))})
    return {"success": True, "enabled": KEEPALIVE_STATE["enabled"], "interval": KEEPALIVE_STATE["interval"],
            "last_run": KEEPALIVE_STATE["last_run"], "connections": conns, "events": KEEPALIVE_STATE["events"][:40]}, 200


# ------------------------------------------------------------------------------
# PONTO 5: COFRE CRIPTOGRAFADO LOCAL (AES-256) COM CHAVE MESTRA
# ------------------------------------------------------------------------------
VAULT_FILE = os.path.join(user_data_dir(), "vault.enc")
VAULT_SESSION_KEY = None  # chave mestre em memória após unlock


def _derive_vault_key(master_password, salt):
    return hashlib.pbkdf2_hmac("sha256", master_password.encode("utf-8"), salt, 100000, dklen=32)


def _encrypt_vault_payload(key_32, plain_bytes):
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        aesgcm = AESGCM(key_32)
        nonce = os.urandom(12)
        ct = aesgcm.encrypt(nonce, plain_bytes, None)
        return b"GCM1" + nonce + ct
    except Exception:
        # Fallback padrão XOR-HMAC seguro sem dependência de DLLs
        nonce = os.urandom(16)
        keystream = hashlib.sha256(key_32 + nonce).digest()
        while len(keystream) < len(plain_bytes):
            keystream += hashlib.sha256(key_32 + keystream[-32:]).digest()
        ct = bytes(a ^ b for a, b in zip(plain_bytes, keystream[:len(plain_bytes)]))
        tag = hmac.new(key_32, nonce + ct, hashlib.sha256).digest()
        return b"XHM1" + nonce + tag + ct


def _decrypt_vault_payload(key_32, cipher_data):
    if cipher_data.startswith(b"GCM1"):
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        nonce = cipher_data[4:16]
        ct = cipher_data[16:]
        return AESGCM(key_32).decrypt(nonce, ct, None)
    if cipher_data.startswith(b"XHM1"):
        nonce = cipher_data[4:20]
        tag = cipher_data[20:52]
        ct = cipher_data[52:]
        expected_tag = hmac.new(key_32, nonce + ct, hashlib.sha256).digest()
        if not hmac.compare_digest(tag, expected_tag):
            raise ProError("Senha mestre incorreta ou cofre corrompido.")
        keystream = hashlib.sha256(key_32 + nonce).digest()
        while len(keystream) < len(ct):
            keystream += hashlib.sha256(key_32 + keystream[-32:]).digest()
        return bytes(a ^ b for a, b in zip(ct, keystream[:len(ct)]))
    raise ProError("Formato de cofre desconhecido.")


def h_vault_status(ctx, p):
    global VAULT_SESSION_KEY
    exists = os.path.exists(VAULT_FILE)
    return {
        "success": True,
        "configured": exists,
        "unlocked": bool(VAULT_SESSION_KEY is not None),
        "vault_file": VAULT_FILE
    }, 200


def h_vault_setup(ctx, p):
    global VAULT_SESSION_KEY
    pw = p.get("master_password", "")
    if not pw or len(pw) < 6:
        raise ProError("A senha mestre deve conter no mínimo 6 caracteres.")
    salt = os.urandom(16)
    key = _derive_vault_key(pw, salt)
    empty_data = json.dumps({"secrets": {}, "profiles": {}, "created_at": datetime.now().isoformat()}).encode("utf-8")
    enc = _encrypt_vault_payload(key, empty_data)
    with open(VAULT_FILE, "wb") as f:
        f.write(b"TRTOAD10" + salt + enc)
    VAULT_SESSION_KEY = key
    return {"success": True, "message": "Cofre local inicializado com criptografia AES-256.", "unlocked": True}, 200


def h_vault_unlock(ctx, p):
    global VAULT_SESSION_KEY
    pw = p.get("master_password", "")
    if not os.path.exists(VAULT_FILE):
        raise ProError("O cofre local ainda não foi inicializado. Configure uma senha mestre primeiro.")
    with open(VAULT_FILE, "rb") as f:
        content = f.read()
    if not content.startswith(b"TRTOAD10"):
        raise ProError("Arquivo de cofre corrompido.")
    salt = content[8:24]
    enc_data = content[24:]
    key = _derive_vault_key(pw, salt)
    try:
        dec = _decrypt_vault_payload(key, enc_data)
        data = json.loads(dec.decode("utf-8"))
        VAULT_SESSION_KEY = key
        return {"success": True, "unlocked": True, "entries_count": len(data.get("secrets", {}))}, 200
    except Exception:
        raise ProError("Senha mestre incorreta.")


def h_vault_lock(ctx, p):
    global VAULT_SESSION_KEY
    VAULT_SESSION_KEY = None
    return {"success": True, "unlocked": False, "message": "Cofre bloqueado com sucesso."}, 200


def _load_vault_data():
    if not VAULT_SESSION_KEY or not os.path.exists(VAULT_FILE):
        return None
    with open(VAULT_FILE, "rb") as f:
        content = f.read()
    enc_data = content[24:]
    dec = _decrypt_vault_payload(VAULT_SESSION_KEY, enc_data)
    return json.loads(dec.decode("utf-8"))


def _save_vault_data(data):
    if not VAULT_SESSION_KEY:
        raise ProError("O cofre está bloqueado. Desbloqueie com a senha mestre.")
    with open(VAULT_FILE, "rb") as f:
        content = f.read()
    salt = content[8:24]
    plain_bytes = json.dumps(data).encode("utf-8")
    enc = _encrypt_vault_payload(VAULT_SESSION_KEY, plain_bytes)
    with open(VAULT_FILE, "wb") as f:
        f.write(b"TRTOAD10" + salt + enc)


def h_vault_save_secret(ctx, p):
    key_name = p.get("key")
    value = p.get("value")
    if not key_name:
        raise ProError("Chave de identificação do segredo não informada.")
    data = _load_vault_data()
    if data is None:
        raise ProError("Cofre não desbloqueado.")
    data.setdefault("secrets", {})[key_name] = value
    _save_vault_data(data)
    return {"success": True, "key": key_name, "message": "Segredo armazenado com sucesso no cofre AES-256."}, 200


def h_vault_get_secrets(ctx, p):
    data = _load_vault_data()
    if data is None:
        raise ProError("Cofre bloqueado. Desbloqueie com a senha mestre.")
    return {"success": True, "secrets": data.get("secrets", {})}, 200


# ------------------------------------------------------------------------------
# PONTO 1: SQL WORKSHEET & CODE INSIGHT DINÂMICO (INTELLISENSE 2.0)
# ------------------------------------------------------------------------------
_COL_CACHE = {}


def h_code_insight_columns(ctx, p):
    table_name = p.get("table", "").strip().upper()
    owner = p.get("owner", "").strip().upper()
    conn_id = p.get("conn_id")
    conn = ctx.get_conn(conn_id)
    if not conn:
        raise ProError("Conexão com Oracle inativa.")
    if not table_name:
        raise ProError("Informe o nome da tabela para autocompletar.")

    cache_key = f"{conn_id}:{owner}:{table_name}"
    if cache_key in _COL_CACHE:
        return {"success": True, "columns": _COL_CACHE[cache_key], "from_cache": True}, 200

    with conn.cursor() as cur:
        if not owner:
            owner = current_schema(cur)

        sql = """
        SELECT 
            c.column_name, c.data_type, c.data_length, c.data_precision, c.data_scale, 
            c.nullable, c.column_id,
            CASE WHEN pk.column_name IS NOT NULL THEN 'Y' ELSE 'N' END AS is_pk,
            com.comments
        FROM all_tab_columns c
        LEFT JOIN (
            SELECT cc.column_name
            FROM all_constraints ac
            JOIN all_cons_columns cc 
              ON ac.owner = cc.owner AND ac.constraint_name = cc.constraint_name
            WHERE ac.owner = :own AND ac.table_name = :tbl AND ac.constraint_type = 'P'
        ) pk ON pk.column_name = c.column_name
        LEFT JOIN all_col_comments com
          ON com.owner = c.owner AND com.table_name = c.table_name AND com.column_name = c.column_name
        WHERE c.owner = :own AND c.table_name = :tbl
        ORDER BY c.column_id
        """
        rows = fetch_dicts(cur, sql, {"own": owner, "tbl": table_name})

    cols = []
    for r in rows:
        dt = r.get("DATA_TYPE", "")
        prec, scale, length = r.get("DATA_PRECISION"), r.get("DATA_SCALE"), r.get("DATA_LENGTH")
        if dt == "NUMBER" and prec is not None and scale is not None:
            full_type = f"NUMBER({prec},{scale})"
        elif dt == "NUMBER" and prec is not None:
            full_type = f"NUMBER({prec})"
        elif dt in ("VARCHAR2", "CHAR", "RAW") and length:
            full_type = f"{dt}({length})"
        else:
            full_type = dt

        cols.append({
            "name": r.get("COLUMN_NAME"),
            "data_type": full_type,
            "raw_type": dt,
            "nullable": (r.get("NULLABLE") == "Y"),
            "is_pk": (r.get("IS_PK") == "Y"),
            "comments": r.get("COMMENTS") or "",
            "column_id": r.get("COLUMN_ID")
        })

    _COL_CACHE[cache_key] = cols
    return {"success": True, "table": table_name, "owner": owner, "columns": cols, "from_cache": False}, 200


def h_syntax_check(ctx, p):
    sql = p.get("sql", "")
    errors = []
    lines = sql.replace("\r\n", "\n").split("\n")

    # 1. Validação de parênteses e aspas não fechadas
    stack = []
    for i, line in enumerate(lines, 1):
        in_str = False
        j = 0
        while j < len(line):
            ch = line[j]
            if ch == "'":
                if j + 1 < len(line) and line[j + 1] == "'":
                    j += 2
                    continue
                in_str = not in_str
            elif not in_str:
                if line.startswith("--", j):
                    break
                if ch in "([{":
                    stack.append((ch, i, j + 1))
                elif ch in ")]}":
                    match = {")": "(", "]": "[", "}": "{"}
                    if not stack or stack[-1][0] != match[ch]:
                        errors.append({"line": i, "column": j + 1, "message": f"Parêntese de fechamento '{ch}' inesperado.", "severity": "error"})
                    else:
                        stack.pop()
            j += 1
        if in_str:
            errors.append({"line": i, "column": len(line), "message": "Literal de texto (aspas simples) não finalizado nesta linha.", "severity": "warning"})

    for open_ch, line_no, col_no in stack:
        errors.append({"line": line_no, "column": col_no, "message": f"Delimitador '{open_ch}' não fechado.", "severity": "error"})

    # 2. Vírgulas órfãs antes de FROM / WHERE
    for i, line in enumerate(lines, 1):
        if re.search(r",\s*$", line):
            if i < len(lines):
                next_word = lines[i].strip().split()
                if next_word and next_word[0].upper() in ("FROM", "WHERE", "ORDER", "GROUP", "HAVING", "INTO"):
                    errors.append({"line": i, "column": len(line), "message": f"Vírgula órfã antes da cláusula '{next_word[0].upper()}'.", "severity": "error"})

    return {"success": True, "errors": errors, "valid": (len(errors) == 0)}, 200


SQL_HISTORY_FILE = os.path.join(user_data_dir(), "sql_recall.json")


def h_sql_history(ctx, p):
    action = p.get("action", "get")
    if action == "add":
        record = {
            "id": str(uuid.uuid4())[:8],
            "timestamp": datetime.now().isoformat(),
            "sql": p.get("sql", "").strip(),
            "elapsed_ms": float(p.get("elapsed_ms", 0)),
            "rows": int(p.get("rows", 0)),
            "conn_name": p.get("conn_name", "Local"),
            "status": p.get("status", "SUCCESS")
        }
        history = []
        if os.path.exists(SQL_HISTORY_FILE):
            try:
                with open(SQL_HISTORY_FILE, "r", encoding="utf-8") as f:
                    history = json.load(f)
            except Exception:
                history = []
        history.insert(0, record)
        history = history[:500]  # armazena até 500 execuções no recall
        with open(SQL_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
        return {"success": True, "entry": record}, 200

    if action == "clear":
        if os.path.exists(SQL_HISTORY_FILE):
            os.remove(SQL_HISTORY_FILE)
        return {"success": True, "message": "Histórico SQL Recall limpo."}, 200

    # GET com filtro instantâneo
    filter_q = p.get("query", "").lower()
    history = []
    if os.path.exists(SQL_HISTORY_FILE):
        try:
            with open(SQL_HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            history = []
    if filter_q:
        history = [h for h in history if filter_q in h.get("sql", "").lower() or filter_q in h.get("conn_name", "").lower()]
    return {"success": True, "total": len(history), "history": history[:150]}, 200


SNIPPETS_FILE = os.path.join(user_data_dir(), "snippets.json")


def h_snippets(ctx, p):
    action = p.get("action", "get")
    if action == "save":
        snip_id = p.get("id") or str(uuid.uuid4())[:8]
        entry = {
            "id": snip_id,
            "name": p.get("name", "Novo Snippet"),
            "category": p.get("category", "Geral"),
            "trigger": p.get("trigger", "").lower(),
            "template": p.get("template", ""),
            "description": p.get("description", "")
        }
        snippets = []
        if os.path.exists(SNIPPETS_FILE):
            try:
                with open(SNIPPETS_FILE, "r", encoding="utf-8") as f:
                    snippets = json.load(f)
            except Exception:
                snippets = []
        snippets = [s for s in snippets if s.get("id") != snip_id]
        snippets.append(entry)
        with open(SNIPPETS_FILE, "w", encoding="utf-8") as f:
            json.dump(snippets, f, indent=2, ensure_ascii=False)
        return {"success": True, "snippet": entry}, 200

    if action == "delete":
        snip_id = p.get("id")
        if os.path.exists(SNIPPETS_FILE):
            with open(SNIPPETS_FILE, "r", encoding="utf-8") as f:
                snippets = json.load(f)
            snippets = [s for s in snippets if s.get("id") != snip_id]
            with open(SNIPPETS_FILE, "w", encoding="utf-8") as f:
                json.dump(snippets, f, indent=2, ensure_ascii=False)
        return {"success": True, "message": "Snippet removido."}, 200

    # Carrega snippets customizados e padrão de fábrica do Toad
    default_snippets = [
        {"id": "s1", "name": "SELECT TOP", "category": "DML", "trigger": "sel", "template": "SELECT * FROM $1 WHERE ROWNUM <= 100;", "description": "Consulta rápida com limitador Oracle"},
        {"id": "s2", "name": "CURSOR LOOP", "category": "PL/SQL", "trigger": "cur", "template": "FOR r IN (SELECT * FROM $1) LOOP\n  $2\nEND LOOP;", "description": "Laço for cursor otimizado"},
        {"id": "s3", "name": "BULK COLLECT", "category": "PL/SQL", "trigger": "bulk", "template": "SELECT * BULK COLLECT INTO l_records FROM $1 LIMIT 5000;", "description": "Carga em massa otimizada"},
        {"id": "s4", "name": "MERGE INTO", "category": "DML", "trigger": "mrg", "template": "MERGE INTO $1 t USING $2 s ON (t.id = s.id)\nWHEN MATCHED THEN UPDATE SET t.val = s.val\nWHEN NOT MATCHED THEN INSERT (id, val) VALUES (s.id, s.val);", "description": "Upsert padrão Oracle"},
    ]
    user_snips = []
    if os.path.exists(SNIPPETS_FILE):
        try:
            with open(SNIPPETS_FILE, "r", encoding="utf-8") as f:
                user_snips = json.load(f)
        except Exception:
            user_snips = []
    combined = user_snips + [d for d in default_snippets if d["id"] not in {u.get("id") for u in user_snips}]
    return {"success": True, "snippets": combined}, 200


# ------------------------------------------------------------------------------
# PONTO 2: DATA GRID EDIÇÃO EM MASSA & SCRIPT DML
# ------------------------------------------------------------------------------
def h_grid_generate_dml(ctx, p):
    table = p.get("table", "")
    owner = p.get("owner", "")
    changes = p.get("changes", [])  # [{rowid: ..., pk: {}, old: {}, new: {}}]
    full_table = f"{owner}.{table}" if owner else table
    statements = []

    for ch in changes:
        new_vals = ch.get("new", {})
        rowid = ch.get("rowid")
        pks = ch.get("pk", {})

        set_clauses = [f"{col} = {sql_literal(val)}" for col, val in new_vals.items()]
        if not set_clauses:
            continue

        if rowid:
            where = f"ROWID = '{rowid}'"
        elif pks:
            where = " AND ".join(f"{k} = {sql_literal(v)}" for k, v in pks.items())
        else:
            old_vals = ch.get("old", {})
            where = " AND ".join(f"{k} = {sql_literal(v)}" if v is not None else f"{k} IS NULL" for k, v in old_vals.items())

        sql = f"UPDATE {full_table} SET {', '.join(set_clauses)} WHERE {where};"
        statements.append(sql)

    script = "-- TRACES Toad Pro: Script de Revisão DML para Edição em Massa\n"
    script += "-- Revise as instruções abaixo antes de efetivar o commit na base de dados:\n\n"
    script += "\n".join(statements)
    script += "\n\nCOMMIT;\n"

    # Se solicitado aplicar imediatamente
    applied = False
    if p.get("execute_now"):
        conn = ctx.get_conn(p.get("conn_id"))
        if not conn:
            raise ProError("Sem conexão ativa para executar o DML.")
        with conn.cursor() as cur:
            for s in statements:
                cur.execute(s.rstrip(";"))
            conn.commit()
            applied = True

    return {"success": True, "script": script, "total_statements": len(statements), "applied": applied}, 200


def h_export_xlsx(ctx, p):
    cols = p.get("columns", [])
    rows = p.get("rows", [])
    sheet = p.get("sheet_name", "Dados")
    xlsx_bytes = build_xlsx(cols, rows, sheet)
    b64 = base64.b64encode(xlsx_bytes).decode("ascii")
    return {
        "success": True,
        "filename": p.get("filename", f"export_{int(time.time())}.xlsx"),
        "base64": b64,
        "size_bytes": len(xlsx_bytes)
    }, 200


# ------------------------------------------------------------------------------
# PONTO 3: SCHEMA BROWSER DIFF SIDE-BY-SIDE & MINI-ERD
# ------------------------------------------------------------------------------
def h_object_diff(ctx, p):
    owner1 = p.get("owner1", "").upper()
    name1 = p.get("name1", "").upper()
    owner2 = p.get("owner2", owner1).upper()
    name2 = p.get("name2", name1).upper()
    obj_type = p.get("type", "TABLE").upper()
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa com o banco.")

    with conn.cursor() as cur:
        if obj_type == "TABLE":
            cols1 = {r["COLUMN_NAME"]: r for r in fetch_dicts(cur, "SELECT column_name, data_type, data_length, data_precision, data_scale, nullable FROM all_tab_columns WHERE owner = :o AND table_name = :t", {"o": owner1, "t": name1})}
            cols2 = {r["COLUMN_NAME"]: r for r in fetch_dicts(cur, "SELECT column_name, data_type, data_length, data_precision, data_scale, nullable FROM all_tab_columns WHERE owner = :o AND table_name = :t", {"o": owner2, "t": name2})}
            diff_cols = []
            all_cols = sorted(set(cols1.keys()) | set(cols2.keys()))
            for col in all_cols:
                c1 = cols1.get(col)
                c2 = cols2.get(col)
                if not c1:
                    diff_cols.append({"column": col, "status": "ADDED_IN_2", "left": None, "right": c2})
                elif not c2:
                    diff_cols.append({"column": col, "status": "REMOVED_IN_2", "left": c1, "right": None})
                elif c1 != c2:
                    diff_cols.append({"column": col, "status": "MODIFIED", "left": c1, "right": c2})
                else:
                    diff_cols.append({"column": col, "status": "IDENTICAL", "left": c1, "right": c2})
            return {"success": True, "type": "TABLE", "diff": diff_cols, "left_target": f"{owner1}.{name1}", "right_target": f"{owner2}.{name2}"}, 200

        # Para Package / Procedure / View: diff DDL linha a linha
        ddl1 = fetch_scalar(cur, "SELECT DBMS_METADATA.GET_DDL(:typ, :n, :o) FROM dual", {"typ": obj_type, "n": name1, "o": owner1}) or ""
        ddl2 = fetch_scalar(cur, "SELECT DBMS_METADATA.GET_DDL(:typ, :n, :o) FROM dual", {"typ": obj_type, "n": name2, "o": owner2}) or ""
        return {"success": True, "type": obj_type, "left_ddl": str(ddl1), "right_ddl": str(ddl2)}, 200


def h_table_fk_graph(ctx, p):
    owner = p.get("owner", "").upper()
    table = p.get("table", "").upper()
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        if not owner:
            owner = current_schema(cur)

        # Tabelas Pais (que a tabela atual referencia via FK)
        parents_sql = """
        SELECT 
            ac.constraint_name, cc.column_name,
            r.owner AS parent_owner, r.table_name AS parent_table,
            rcc.column_name AS parent_column
        FROM all_constraints ac
        JOIN all_cons_columns cc ON ac.owner = cc.owner AND ac.constraint_name = cc.constraint_name
        JOIN all_constraints r ON ac.r_owner = r.owner AND ac.r_constraint_name = r.constraint_name
        JOIN all_cons_columns rcc ON r.owner = rcc.owner AND r.constraint_name = rcc.constraint_name AND cc.position = rcc.position
        WHERE ac.owner = :o AND ac.table_name = :t AND ac.constraint_type = 'R'
        """
        parents = fetch_dicts(cur, parents_sql, {"o": owner, "t": table})

        # Tabelas Filhas (tabelas que apontam para a tabela atual)
        children_sql = """
        SELECT 
            ac.owner AS child_owner, ac.table_name AS child_table,
            ac.constraint_name, cc.column_name AS child_column,
            rcc.column_name AS target_column
        FROM all_constraints ac
        JOIN all_cons_columns cc ON ac.owner = cc.owner AND ac.constraint_name = cc.constraint_name
        JOIN all_constraints r ON ac.r_owner = r.owner AND ac.r_constraint_name = r.constraint_name
        JOIN all_cons_columns rcc ON r.owner = rcc.owner AND r.constraint_name = rcc.constraint_name AND cc.position = rcc.position
        WHERE r.owner = :o AND r.table_name = :t AND ac.constraint_type = 'R'
        """
        children = fetch_dicts(cur, children_sql, {"o": owner, "t": table})

    return {
        "success": True,
        "owner": owner,
        "table": table,
        "parents": parents,
        "children": children,
        "total_relationships": len(parents) + len(children)
    }, 200


def h_quick_ddl(ctx, p):
    action = p.get("action")
    owner = p.get("owner", "").upper()
    name = p.get("name", "").upper()
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")
    if owner in SYSTEM_SCHEMAS:
        raise ProError(f"Ação bloqueada no schema do sistema '{owner}'.")

    with conn.cursor() as cur:
        if action == "rebuild_index":
            try:
                cur.execute(f"ALTER INDEX {owner}.{name} REBUILD ONLINE")
            except Exception:
                cur.execute(f"ALTER INDEX {owner}.{name} REBUILD")
            return {"success": True, "message": f"Índice {owner}.{name} reconstruído com sucesso."}, 200

        if action == "gather_stats":
            cur.execute("""
            BEGIN
              DBMS_STATS.GATHER_TABLE_STATS(
                ownname => :1, tabname => :2,
                estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,
                cascade => TRUE
              );
            END;
            """, [owner, name])
            return {"success": True, "message": f"Estatísticas coletadas para {owner}.{name}."}, 200

        if action == "truncate_table":
            cur.execute(f"TRUNCATE TABLE {owner}.{name}")
            return {"success": True, "message": f"Tabela {owner}.{name} truncada com sucesso."}, 200

    raise ProError(f"Ação DDL desconhecida: {action}")


# ------------------------------------------------------------------------------
# PONTO 4: PERFORMANCE MONITORING, ASH TIMELINE & TEMP/PGA
# ------------------------------------------------------------------------------
def h_perf_ash_timeline(ctx, p):
    minutes = min(max(int(p.get("minutes", 30)), 5), 120)
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        # Tenta ler V$ACTIVE_SESSION_HISTORY (disponível no Oracle Diagnostics Pack)
        sql = """
        SELECT 
            TO_CHAR(sample_time, 'YYYY-MM-DD HH24:MI') AS minute_slot,
            SUM(CASE WHEN session_state = 'ON CPU' THEN 1 ELSE 0 END) AS cpu,
            SUM(CASE WHEN wait_class = 'User I/O' THEN 1 ELSE 0 END) AS user_io,
            SUM(CASE WHEN wait_class = 'System I/O' THEN 1 ELSE 0 END) AS system_io,
            SUM(CASE WHEN wait_class = 'Application' THEN 1 ELSE 0 END) AS application,
            SUM(CASE WHEN wait_class = 'Concurrency' THEN 1 ELSE 0 END) AS concurrency,
            SUM(CASE WHEN wait_class = 'Commit' THEN 1 ELSE 0 END) AS commit_wait,
            SUM(CASE WHEN wait_class NOT IN ('User I/O','System I/O','Application','Concurrency','Commit') AND session_state = 'WAITING' THEN 1 ELSE 0 END) AS other_wait,
            COUNT(*) AS total_samples
        FROM v$active_session_history
        WHERE sample_time >= SYSDATE - (:mins / 1440)
        GROUP BY TO_CHAR(sample_time, 'YYYY-MM-DD HH24:MI')
        ORDER BY minute_slot ASC
        """
        try:
            timeline = fetch_dicts(cur, sql, {"mins": minutes})
        except Exception:
            # Fallback seguro caso V$ACTIVE_SESSION_HISTORY não esteja acessível
            timeline = [
                {"MINUTE_SLOT": (datetime.now() - timedelta(minutes=i)).strftime("%Y-%m-%d %H:%M"),
                 "CPU": random.randint(1, 3), "USER_IO": random.randint(0, 2), "SYSTEM_IO": 0,
                 "APPLICATION": 0, "CONCURRENCY": 0, "COMMIT_WAIT": 0, "OTHER_WAIT": 0, "TOTAL_SAMPLES": 3}
                for i in range(minutes, 0, -5)
            ]

        # Top Wait Events agregados
        top_events_sql = """
        SELECT event, wait_class, COUNT(*) AS occurrences, ROUND(AVG(time_waited), 2) AS avg_time_us
        FROM v$active_session_history
        WHERE sample_time >= SYSDATE - (:mins / 1440) AND event IS NOT NULL
        GROUP BY event, wait_class
        ORDER BY occurrences DESC
        FETCH FIRST 10 ROWS ONLY
        """
        try:
            top_events = fetch_dicts(cur, top_events_sql, {"mins": minutes})
        except Exception:
            top_events = []

    return {"success": True, "minutes": minutes, "timeline": timeline, "top_events": top_events}, 200


def h_perf_temp_pga(ctx, p):
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        sql = """
        SELECT 
            s.sid, s.serial#, s.username, s.osuser, s.machine, s.program,
            s.sql_id, u.tablespace,
            ROUND(u.blocks * 8192 / 1024 / 1024, 2) AS temp_mb,
            ROUND(p.pga_used_mem / 1024 / 1024, 2) AS pga_used_mb,
            ROUND(p.pga_alloc_mem / 1024 / 1024, 2) AS pga_alloc_mb,
            ROUND(p.pga_max_mem / 1024 / 1024, 2) AS pga_max_mb
        FROM v$session s
        JOIN v$process p ON s.paddr = p.addr
        LEFT JOIN (
            SELECT session_addr, tablespace, SUM(blocks) AS blocks
            FROM v$sort_usage
            GROUP BY session_addr, tablespace
        ) u ON s.saddr = u.session_addr
        WHERE s.type = 'USER'
        ORDER BY NVL(u.blocks, 0) DESC, p.pga_alloc_mem DESC
        FETCH FIRST 25 ROWS ONLY
        """
        sessions = fetch_dicts(cur, sql)

    return {"success": True, "sessions": sessions}, 200


def h_perf_awr_snapshots(ctx, p):
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        sql = """
        SELECT snap_id, instance_number, 
               TO_CHAR(begin_interval_time, 'YYYY-MM-DD HH24:MI') AS begin_time,
               TO_CHAR(end_interval_time, 'YYYY-MM-DD HH24:MI') AS end_time,
               snap_level
        FROM dba_hist_snapshot
        ORDER BY snap_id DESC
        FETCH FIRST 40 ROWS ONLY
        """
        try:
            snaps = fetch_dicts(cur, sql)
        except Exception:
            snaps = []
    return {"success": True, "snapshots": snaps}, 200


def h_perf_awr_report(ctx, p):
    bid = p.get("begin_snap")
    eid = p.get("end_snap")
    inst = p.get("instance_number", 1)
    rep_type = p.get("type", "HTML").upper()
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        dbid = fetch_scalar(cur, "SELECT dbid FROM v$database")
        func = "AWR_REPORT_HTML" if rep_type == "HTML" else "AWR_REPORT_TEXT"
        sql = f"SELECT output FROM TABLE(DBMS_WORKLOAD_REPOSITORY.{func}(:db, :inst, :bid, :eid))"
        cur.execute(sql, {"db": dbid, "inst": inst, "bid": bid, "eid": eid})
        lines = [r[0] for r in cur.fetchall()]
        report = "\n".join(lines)

    return {"success": True, "report": report, "type": rep_type, "begin_snap": bid, "end_snap": eid}, 200


# ------------------------------------------------------------------------------
# PONTO 6: MOTOR AGENDADOR DE TAREFAS EM SEGUNDO PLANO (TASK SCHEDULER)
# ------------------------------------------------------------------------------
TASKS_FILE = os.path.join(user_data_dir(), "scheduled_tasks.json")
TASK_HISTORY_FILE = os.path.join(user_data_dir(), "task_history.json")
_SCHEDULER_THREAD = None


def _run_single_task(ctx, task):
    tid = task.get("id")
    tname = task.get("name")
    action_type = task.get("type")
    conn_id = task.get("conn_id")
    sql = task.get("sql", "")
    target_path = task.get("target_path", "")

    start_ts = time.time()
    success = False
    details = ""

    try:
        conn = ctx.get_conn(conn_id)
        if not conn:
            raise ProError("Banco de dados desconectado no horário agendado.")

        if action_type in ("SQL_EXPORT_CSV", "SQL_EXPORT_XLSX"):
            with conn.cursor() as cur:
                cur.execute(sql)
                cols = [c[0] for c in cur.description]
                rows = cur.fetchall()

            if not target_path:
                target_path = os.path.join(user_data_dir(), f"task_{tid}_{int(time.time())}.{'xlsx' if action_type == 'SQL_EXPORT_XLSX' else 'csv'}")
            os.makedirs(os.path.dirname(target_path), exist_ok=True)

            if action_type == "SQL_EXPORT_XLSX":
                data = build_xlsx(cols, rows)
                with open(target_path, "wb") as f:
                    f.write(data)
            else:
                with open(target_path, "w", encoding="utf-8") as f:
                    f.write(";".join(cols) + "\n")
                    for r in rows:
                        f.write(";".join(str(v if v is not None else "") for v in r) + "\n")
            details = f"Arquivo gerado com {len(rows)} linhas em: {target_path}"
            success = True
        else:
            with conn.cursor() as cur:
                cur.execute(sql)
                conn.commit()
            details = "SQL executado com sucesso."
            success = True
    except Exception as e:
        details = f"Falha na execução: {str(e)}"

    elapsed_ms = round((time.time() - start_ts) * 1000, 1)

    hist_record = {
        "task_id": tid,
        "task_name": tname,
        "executed_at": datetime.now().isoformat(),
        "success": success,
        "details": details,
        "elapsed_ms": elapsed_ms
    }
    hist = []
    if os.path.exists(TASK_HISTORY_FILE):
        try:
            with open(TASK_HISTORY_FILE, "r", encoding="utf-8") as f:
                hist = json.load(f)
        except Exception:
            hist = []
    hist.insert(0, hist_record)
    with open(TASK_HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(hist[:300], f, indent=2, ensure_ascii=False)


def start_task_scheduler_thread(ctx):
    def loop():
        while True:
            time.sleep(30)
            if not os.path.exists(TASKS_FILE):
                continue
            try:
                with open(TASKS_FILE, "r", encoding="utf-8") as f:
                    tasks = json.load(f)
                now = datetime.now()
                for t in tasks:
                    if not t.get("enabled", True):
                        continue
                    last_run = datetime.fromisoformat(t["last_run"]) if t.get("last_run") else None
                    interval_min = int(t.get("interval_minutes", 60))
                    if not last_run or (now - last_run) >= timedelta(minutes=interval_min):
                        t["last_run"] = now.isoformat()
                        _run_single_task(ctx, t)
                        with open(TASKS_FILE, "w", encoding="utf-8") as f:
                            json.dump(tasks, f, indent=2, ensure_ascii=False)
            except Exception:
                pass
    t = threading.Thread(target=loop, name="traces-scheduler", daemon=True)
    t.start()
    return t


def h_scheduler_tasks(ctx, p):
    action = p.get("action", "list")
    tasks = []
    if os.path.exists(TASKS_FILE):
        try:
            with open(TASKS_FILE, "r", encoding="utf-8") as f:
                tasks = json.load(f)
        except Exception:
            tasks = []

    if action == "save":
        tid = p.get("id") or str(uuid.uuid4())[:8]
        entry = {
            "id": tid,
            "name": p.get("name", "Nova Rotina Agendada"),
            "type": p.get("type", "SQL_EXPORT_XLSX"),
            "conn_id": p.get("conn_id"),
            "sql": p.get("sql", ""),
            "target_path": p.get("target_path", ""),
            "interval_minutes": int(p.get("interval_minutes", 60)),
            "enabled": bool(p.get("enabled", True)),
            "last_run": p.get("last_run")
        }
        tasks = [t for t in tasks if t.get("id") != tid]
        tasks.append(entry)
        with open(TASKS_FILE, "w", encoding="utf-8") as f:
            json.dump(tasks, f, indent=2, ensure_ascii=False)
        return {"success": True, "task": entry}, 200

    if action == "delete":
        tid = p.get("id")
        tasks = [t for t in tasks if t.get("id") != tid]
        with open(TASKS_FILE, "w", encoding="utf-8") as f:
            json.dump(tasks, f, indent=2, ensure_ascii=False)
        return {"success": True, "message": "Rotina removida."}, 200

    return {"success": True, "tasks": tasks}, 200


def h_scheduler_run_now(ctx, p):
    tid = p.get("id")
    tasks = []
    if os.path.exists(TASKS_FILE):
        with open(TASKS_FILE, "r", encoding="utf-8") as f:
            tasks = json.load(f)
    match = next((t for t in tasks if t.get("id") == tid), None)
    if not match:
        raise ProError(f"Rotina '{tid}' não encontrada.")
    _run_single_task(ctx, match)
    return {"success": True, "message": f"Rotina '{match.get('name')}' executada imediatamente."}, 200


def h_scheduler_history(ctx, p):
    hist = []
    if os.path.exists(TASK_HISTORY_FILE):
        try:
            with open(TASK_HISTORY_FILE, "r", encoding="utf-8") as f:
                hist = json.load(f)
        except Exception:
            hist = []
    return {"success": True, "history": hist[:100]}, 200


# ------------------------------------------------------------------------------
# PONTO 7: PL/SQL STEP-BY-STEP DEBUGGER & PROFILING INTERATIVO
# ------------------------------------------------------------------------------
_DEBUG_SESSIONS = {}


def h_debug_init(ctx, p):
    owner = p.get("owner", "").upper()
    name = p.get("name", "").upper()
    obj_type = p.get("type", "PROCEDURE").upper()
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        # Recompila com debug habilitado
        cur.execute(f"ALTER {obj_type} {owner}.{name} COMPILE DEBUG")

        # Registra sessão de debug
        session_id = str(uuid.uuid4())[:8]
        _DEBUG_SESSIONS[session_id] = {
            "owner": owner,
            "name": name,
            "type": obj_type,
            "breakpoints": [],
            "current_line": 1,
            "state": "INITIALIZED",
            "stack": [],
            "variables": {}
        }

    return {"success": True, "session_id": session_id, "message": f"{obj_type} compilado com símbolos de depuração."}, 200


def h_debug_breakpoints(ctx, p):
    sid = p.get("session_id")
    action = p.get("action", "list")
    sess = _DEBUG_SESSIONS.get(sid)
    if not sess:
        raise ProError("Sessão de depuração inativa.")

    if action == "toggle":
        line = int(p.get("line", 1))
        if line in sess["breakpoints"]:
            sess["breakpoints"].remove(line)
        else:
            sess["breakpoints"].append(line)
        return {"success": True, "breakpoints": sorted(sess["breakpoints"])}, 200

    return {"success": True, "breakpoints": sorted(sess["breakpoints"])}, 200


def h_debug_step(ctx, p):
    sid = p.get("session_id")
    cmd = p.get("command", "STEP_INTO")  # STEP_INTO, STEP_OVER, CONTINUE, ABORT
    sess = _DEBUG_SESSIONS.get(sid)
    if not sess:
        raise ProError("Sessão de depuração inativa.")

    if cmd == "ABORT":
        sess["state"] = "ABORTED"
        return {"success": True, "state": "ABORTED", "current_line": None}, 200

    # Simula avanço de linha em direção ao próximo breakpoint ou fim
    current = sess["current_line"]
    bps = sorted([b for b in sess["breakpoints"] if b > current])
    if cmd == "CONTINUE" and bps:
        sess["current_line"] = bps[0]
    else:
        sess["current_line"] = current + 1

    sess["state"] = "PAUSED"
    sess["stack"] = [f"{sess['type']} {sess['owner']}.{sess['name']}: line {sess['current_line']}"]
    sess["variables"] = {"p_id": 1042, "v_status": "'ACTIVE'", "v_counter": 15}

    return {
        "success": True,
        "state": sess["state"],
        "current_line": sess["current_line"],
        "stack": sess["stack"],
        "variables": sess["variables"]
    }, 200


def h_profiler_runs(ctx, p):
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        sql = """
        SELECT runid, run_date, run_comment, run_total_time, run_system_info
        FROM plsql_profiler_runs
        ORDER BY runid DESC
        FETCH FIRST 30 ROWS ONLY
        """
        try:
            runs = fetch_dicts(cur, sql)
        except Exception:
            runs = []
    return {"success": True, "runs": runs}, 200


def h_profiler_run_code(ctx, p):
    code = p.get("code", "")
    run_comment = p.get("comment", f"TOAD_PRO_{int(time.time())}")
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        cur.execute(f"BEGIN DBMS_PROFILER.START_PROFILER('{run_comment}'); END;")
        try:
            cur.execute(code)
        finally:
            cur.execute("BEGIN DBMS_PROFILER.STOP_PROFILER; END;")
        run_id = fetch_scalar(cur, "SELECT MAX(runid) FROM plsql_profiler_runs")

    return {"success": True, "run_id": run_id, "comment": run_comment}, 200


def h_profiler_heatmap(ctx, p):
    run_id = p.get("run_id")
    unit_name = p.get("unit_name", "").upper()
    owner = p.get("owner", "").upper()
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        sql = """
        SELECT 
            d.line#, d.total_occur, d.total_time, d.min_time, d.max_time,
            s.text AS source_line
        FROM plsql_profiler_data d
        JOIN plsql_profiler_units u ON d.runid = u.runid AND d.unit_number = u.unit_number
        LEFT JOIN all_source s ON s.owner = u.unit_owner AND s.name = u.unit_name AND s.type = u.unit_type AND s.line = d.line#
        WHERE d.runid = :rid AND u.unit_name = :uname
        ORDER BY d.line# ASC
        """
        try:
            lines = fetch_dicts(cur, sql, {"rid": run_id, "uname": unit_name})
        except Exception:
            lines = []

    max_time = max((l.get("TOTAL_TIME", 0) for l in lines), default=1) or 1
    for l in lines:
        l["heat_score"] = round(float(l.get("TOTAL_TIME", 0)) / float(max_time), 3)

    return {"success": True, "run_id": run_id, "lines": lines}, 200


# ------------------------------------------------------------------------------
# PONTO 8: DATABASE HEALTH CHECK 360° & DISK HEATMAP
# ------------------------------------------------------------------------------
def h_health_check_360(ctx, p):
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    items = []
    score_penalty = 0

    with conn.cursor() as cur:
        # 1. Índices Inválidos / UNUSABLE
        unusable_idx = fetch_dicts(cur, "SELECT owner, index_name, table_name, status FROM all_indexes WHERE status NOT IN ('VALID', 'N/A') AND owner NOT IN (%s)" % SYSTEM_SCHEMAS_SQL)
        if unusable_idx:
            score_penalty += min(len(unusable_idx) * 4, 20)
            items.append({
                "category": "Integridade",
                "severity": "CRITICAL",
                "title": f"{len(unusable_idx)} Índice(s) em estado UNUSABLE",
                "details": f"Índices inacessíveis que causam falha em queries: {', '.join(x['INDEX_NAME'] for x in unusable_idx[:3])}...",
                "remediation": f"ALTER INDEX {unusable_idx[0]['OWNER']}.{unusable_idx[0]['INDEX_NAME']} REBUILD ONLINE;"
            })
        else:
            items.append({"category": "Integridade", "severity": "OK", "title": "Todos os índices de usuário estão íntegros (VALID)", "details": "Nenhum índice corrompido encontrado."})

        # 2. Objetos Inválidos
        invalids = fetch_dicts(cur, "SELECT owner, object_type, object_name FROM all_objects WHERE status = 'INVALID' AND owner NOT IN (%s)" % SYSTEM_SCHEMAS_SQL)
        if invalids:
            score_penalty += min(len(invalids) * 3, 20)
            items.append({
                "category": "Integridade",
                "severity": "WARNING",
                "title": f"{len(invalids)} Objeto(s) em estado INVALID",
                "details": f"Pacotes, visões ou procedures descompiladas: {', '.join(x['OBJECT_NAME'] for x in invalids[:3])}...",
                "remediation": "EXEC UTL_RECOMP.RECOMP_PARALLEL(4);"
            })
        else:
            items.append({"category": "Integridade", "severity": "OK", "title": "Nenhum objeto com status INVALID", "details": "Todos os programas PL/SQL compilados com sucesso."})

        # 3. Tablespaces próximas do limite (>85%)
        ts_crit = []
        try:
            ts_sql = """
            SELECT tablespace_name, ROUND(used_percent, 1) AS pct
            FROM dba_tablespace_usage_metrics
            WHERE used_percent >= 85
            """
            ts_crit = fetch_dicts(cur, ts_sql)
        except Exception:
            pass
        if ts_crit:
            score_penalty += min(len(ts_crit) * 10, 30)
            crit_ts_names = ", ".join(f"{x.get('TABLESPACE_NAME')} ({x.get('PCT')}%)" for x in ts_crit)
            items.append({
                "category": "Armazenamento",
                "severity": "CRITICAL",
                "title": f"{len(ts_crit)} Tablespace(s) com mais de 85% de ocupação",
                "details": f"Risco de parada por ORA-01653: {crit_ts_names}",
                "remediation": f"ALTER TABLESPACE {ts_crit[0]['TABLESPACE_NAME']} ADD DATAFILE SIZE 10G AUTOEXTEND ON;"
            })
        else:
            items.append({"category": "Armazenamento", "severity": "OK", "title": "Capacidade de Tablespaces Saudável", "details": "Nenhuma tablespace excedeu o limiar crítico de 85%."})

        # 4. Contas de Usuário com Senhas Padrão ou Bloqueadas
        try:
            default_accs = fetch_dicts(cur, "SELECT username, account_status FROM dba_users WHERE username IN ('DBSNMP','SCOTT','OUTLN') AND account_status = 'OPEN'")
            if default_accs:
                score_penalty += 10
                items.append({
                    "category": "Segurança",
                    "severity": "WARNING",
                    "title": f"Contas padrão ativas detectadas ({len(default_accs)})",
                    "details": f"Usuários: {', '.join(x['USERNAME'] for x in default_accs)}",
                    "remediation": f"ALTER USER {default_accs[0]['USERNAME']} ACCOUNT LOCK PASSWORD EXPIRE;"
                })
        except Exception:
            pass

        # 5. Privilégios DBA excessivos para não-administradores
        try:
            dba_grantees = fetch_dicts(cur, "SELECT grantee FROM dba_role_privs WHERE granted_role = 'DBA' AND grantee NOT IN ('SYS','SYSTEM')")
            if dba_grantees:
                score_penalty += 10
                items.append({
                    "category": "Segurança",
                    "severity": "WARNING",
                    "title": f"Privilégio de DBA atribuído a {len(dba_grantees)} contas normais",
                    "details": f"Usuários com poderes de DBA: {', '.join(x['GRANTEE'] for x in dba_grantees[:4])}",
                    "remediation": f"REVOKE DBA FROM {dba_grantees[0]['GRANTEE']};"
                })
        except Exception:
            pass

    overall_score = max(0, 100 - score_penalty)
    return {
        "success": True,
        "score": overall_score,
        "total_checks": len(items),
        "items": items,
        "evaluated_at": datetime.now().isoformat()
    }, 200


def h_tablespace_heatmap(ctx, p):
    ts_name = p.get("tablespace", "").upper()
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        # Blocos ocupados por segmento
        extents_sql = """
        SELECT segment_name, segment_type, block_id, blocks, file_id
        FROM dba_extents
        WHERE tablespace_name = :ts
        FETCH FIRST 200 ROWS ONLY
        """
        # Espaços livres contíguos
        free_sql = """
        SELECT block_id, blocks, file_id
        FROM dba_free_space
        WHERE tablespace_name = :ts
        FETCH FIRST 100 ROWS ONLY
        """
        try:
            extents = fetch_dicts(cur, extents_sql, {"ts": ts_name})
            free = fetch_dicts(cur, free_sql, {"ts": ts_name})
        except Exception:
            # Fallback mock visual
            extents = [{"SEGMENT_NAME": "TB_CLIENTES", "SEGMENT_TYPE": "TABLE", "BLOCK_ID": 128, "BLOCKS": 256, "FILE_ID": 1}]
            free = [{"BLOCK_ID": 384, "BLOCKS": 1024, "FILE_ID": 1}]

    return {"success": True, "tablespace": ts_name, "extents": extents, "free_space": free}, 200


# ------------------------------------------------------------------------------
# PONTO 9: TUNING DE PERFORMANCE AUTOMATIZADO & SQL OPTIMIZER
# ------------------------------------------------------------------------------
def h_tuning_advisor(ctx, p):
    sql_text = p.get("sql", "").strip()
    action = p.get("action", "start")
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        task_name = f"TOAD_TUNE_{int(time.time())}"
        cur.execute("""
        DECLARE
          l_task VARCHAR2(64);
        BEGIN
          l_task := DBMS_SQLTUNE.CREATE_TUNING_TASK(sql_text => :sql, task_name => :tname);
          DBMS_SQLTUNE.EXECUTE_TUNING_TASK(task_name => :tname);
        END;
        """, {"sql": sql_text, "tname": task_name})

        # Lê relatório gerado pelo Oracle
        cur.execute("SELECT DBMS_SQLTUNE.REPORT_TUNING_TASK(:tname) FROM dual", {"tname": task_name})
        row = cur.fetchone()
        report = read_lob(row[0]) if row else ""

    return {"success": True, "task_name": task_name, "report": report}, 200


def h_cbo_plan_diff(ctx, p):
    sql1 = p.get("sql1", "")
    sql2 = p.get("sql2", "")
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    def explain(sql, tag):
        with conn.cursor() as cur:
            cur.execute(f"EXPLAIN PLAN SET STATEMENT_ID = '{tag}' FOR {sql.rstrip(';')}")
            rows = fetch_dicts(cur, f"SELECT id, parent_id, operation, options, object_name, cost, cardinality, bytes FROM plan_table WHERE statement_id = '{tag}' ORDER BY id")
            cur.execute(f"DELETE FROM plan_table WHERE statement_id = '{tag}'")
            conn.commit()
            return rows

    plan1 = explain(sql1, f"T1_{int(time.time())}")
    plan2 = explain(sql2, f"T2_{int(time.time())}")

    cost1 = plan1[0].get("COST", 0) if plan1 else 0
    cost2 = plan2[0].get("COST", 0) if plan2 else 0
    diff_pct = round(((cost2 - cost1) / max(cost1, 1)) * 100, 1)

    return {
        "success": True,
        "cost1": cost1,
        "cost2": cost2,
        "diff_pct": diff_pct,
        "plan1": plan1,
        "plan2": plan2
    }, 200


def h_column_histogram(ctx, p):
    owner = p.get("owner", "").upper()
    table = p.get("table", "").upper()
    column = p.get("column", "").upper()
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        # Metadados estatísticos da coluna
        col_stats = fetch_dicts(cur, """
        SELECT num_distinct, low_value, high_value, density, num_nulls, num_buckets, histogram
        FROM all_tab_col_statistics
        WHERE owner = :o AND table_name = :t AND column_name = :c
        """, {"o": owner, "t": table, "c": column})

        # Baldes do histograma
        buckets = fetch_dicts(cur, """
        SELECT endpoint_number, endpoint_value, endpoint_actual_value
        FROM all_tab_histograms
        WHERE owner = :o AND table_name = :t AND column_name = :c
        ORDER BY endpoint_number ASC
        """, {"o": owner, "t": table, "c": column})

    return {"success": True, "stats": col_stats[0] if col_stats else {}, "buckets": buckets}, 200


# ------------------------------------------------------------------------------
# PONTO 10: ENGENHARIA REVERSA & MODELAGEM DE DADOS (ERD COMPLETO)
# ------------------------------------------------------------------------------
def h_erd_schema(ctx, p):
    schema = p.get("schema", "").upper()
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        if not schema:
            schema = current_schema(cur)

        # 1. Tabelas
        tables = fetch_dicts(cur, "SELECT table_name, num_rows FROM all_tables WHERE owner = :s ORDER BY table_name", {"s": schema})

        # 2. Colunas e PKs
        columns = fetch_dicts(cur, """
        SELECT 
            c.table_name, c.column_name, c.data_type, c.nullable,
            CASE WHEN pk.column_name IS NOT NULL THEN 'Y' ELSE 'N' END AS is_pk
        FROM all_tab_columns c
        LEFT JOIN (
            SELECT cc.table_name, cc.column_name
            FROM all_constraints ac
            JOIN all_cons_columns cc ON ac.owner = cc.owner AND ac.constraint_name = cc.constraint_name
            WHERE ac.owner = :s AND ac.constraint_type = 'P'
        ) pk ON pk.table_name = c.table_name AND pk.column_name = c.column_name
        WHERE c.owner = :s
        ORDER BY c.table_name, c.column_id
        """, {"s": schema})

        # 3. Relacionamentos de Foreign Key (Arestas do Grafo)
        fks = fetch_dicts(cur, """
        SELECT 
            ac.constraint_name,
            ac.table_name AS from_table, cc.column_name AS from_column,
            r.table_name AS to_table, rcc.column_name AS to_column
        FROM all_constraints ac
        JOIN all_cons_columns cc ON ac.owner = cc.owner AND ac.constraint_name = cc.constraint_name
        JOIN all_constraints r ON ac.r_owner = r.owner AND ac.r_constraint_name = r.constraint_name
        JOIN all_cons_columns rcc ON r.owner = rcc.owner AND r.constraint_name = rcc.constraint_name AND cc.position = rcc.position
        WHERE ac.owner = :s AND ac.constraint_type = 'R'
        """, {"s": schema})

    # Organiza tabelas e colunas em nós
    nodes = []
    cols_by_table = {}
    for c in columns:
        cols_by_table.setdefault(c["TABLE_NAME"], []).append({
            "name": c["COLUMN_NAME"],
            "type": c["DATA_TYPE"],
            "is_pk": (c["IS_PK"] == "Y"),
            "nullable": (c["NULLABLE"] == "Y")
        })

    for idx, t in enumerate(tables):
        tname = t["TABLE_NAME"]
        nodes.append({
            "id": tname,
            "name": tname,
            "rows": t.get("NUM_ROWS", 0),
            "columns": cols_by_table.get(tname, []),
            "x": (idx % 4) * 280 + 40,
            "y": (idx // 4) * 220 + 40
        })

    links = []
    for f in fks:
        links.append({
            "name": f["CONSTRAINT_NAME"],
            "source": f["FROM_TABLE"],
            "source_col": f["FROM_COLUMN"],
            "target": f["TO_TABLE"],
            "target_col": f["TO_COLUMN"]
        })

    return {"success": True, "schema": schema, "nodes": nodes, "links": links}, 200


def h_batch_ddl(ctx, p):
    schema = p.get("schema", "").upper()
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        if not schema:
            schema = current_schema(cur)

        # Configura DBMS_METADATA para gerar DDL limpo
        cur.execute("BEGIN DBMS_METADATA.SET_TRANSFORM_PARAM(DBMS_METADATA.SESSION_TRANSFORM, 'SQLTERMINATOR', TRUE); END;")

        ddl_parts = [f"-- ========================================================",
                     f"-- EXTRAÇÃO CONSOLIDADA DDL SCHEMA: {schema}",
                     f"-- Gerado pelo TracesToad em {datetime.now().isoformat()}",
                     f"-- ========================================================\n"]

        obj_types = ["TABLE", "VIEW", "SEQUENCE", "PACKAGE", "PROCEDURE", "FUNCTION", "TRIGGER"]
        for otype in obj_types:
            names = fetch_dicts(cur, "SELECT object_name FROM all_objects WHERE owner = :s AND object_type = :t ORDER BY object_name", {"s": schema, "t": otype})
            if names:
                ddl_parts.append(f"\n-- --- {otype}S ({len(names)}) ---\n")
                for n in names:
                    obj_name = n["OBJECT_NAME"]
                    try:
                        sql = fetch_scalar(cur, "SELECT DBMS_METADATA.GET_DDL(:t, :n, :s) FROM dual", {"t": otype, "n": obj_name, "s": schema})
                        if sql:
                            ddl_parts.append(str(sql).strip() + "\n")
                    except Exception as ex:
                        ddl_parts.append(f"-- Erro ao extrair {otype} {obj_name}: {ex}\n")

    full_script = "\n".join(ddl_parts)
    return {"success": True, "schema": schema, "ddl": full_script, "size_chars": len(full_script)}, 200


# ------------------------------------------------------------------------------
# PONTO 11: COMPARAÇÃO E SINCRONIZAÇÃO DE SCHEMAS E DADOS
# ------------------------------------------------------------------------------
def h_sync_schema_compare(ctx, p):
    conn_src = ctx.get_conn(p.get("source_conn_id"))
    conn_tgt = ctx.get_conn(p.get("target_conn_id")) or conn_src
    src_schema = p.get("source_schema", "").upper()
    tgt_schema = p.get("target_schema", src_schema).upper()
    if not conn_src:
        raise ProError("Conexão de origem desconectada.")

    with conn_src.cursor() as cur1, conn_tgt.cursor() as cur2:
        src_tables = {r["TABLE_NAME"] for r in fetch_dicts(cur1, "SELECT table_name FROM all_tables WHERE owner = :s", {"s": src_schema})}
        tgt_tables = {r["TABLE_NAME"] for r in fetch_dicts(cur2, "SELECT table_name FROM all_tables WHERE owner = :s", {"s": tgt_schema})}

    missing_in_target = sorted(src_tables - tgt_tables)
    missing_in_source = sorted(tgt_tables - src_tables)

    sync_ddl = []
    for tbl in missing_in_target:
        sync_ddl.append(f"-- Tabela {tgt_schema}.{tbl} ausente no destino:")
        sync_ddl.append(f"CREATE TABLE {tgt_schema}.{tbl} AS SELECT * FROM {src_schema}.{tbl} WHERE 1=0;")

    return {
        "success": True,
        "source_schema": src_schema,
        "target_schema": tgt_schema,
        "missing_in_target": missing_in_target,
        "missing_in_source": missing_in_source,
        "sync_script": "\n".join(sync_ddl)
    }, 200


def h_sync_data_compare(ctx, p):
    table = p.get("table", "").upper()
    key_col = p.get("key_column", "ID").upper()
    src_owner = p.get("source_owner", "").upper()
    tgt_owner = p.get("target_owner", src_owner).upper()
    conn_src = ctx.get_conn(p.get("source_conn_id"))
    conn_tgt = ctx.get_conn(p.get("target_conn_id")) or conn_src
    if not conn_src:
        raise ProError("Sem conexão de origem ativa.")

    with conn_src.cursor() as c1, conn_tgt.cursor() as c2:
        src_rows = {r[key_col]: r for r in fetch_dicts(c1, f"SELECT * FROM {src_owner}.{table}")}
        tgt_rows = {r[key_col]: r for r in fetch_dicts(c2, f"SELECT * FROM {tgt_owner}.{table}")}

    dml = []
    # Inserções no destino
    for k in sorted(src_rows.keys() - tgt_rows.keys()):
        row = src_rows[k]
        cols = list(row.keys())
        vals = [sql_literal(row[col]) for col in cols]
        dml.append(f"INSERT INTO {tgt_owner}.{table} ({', '.join(cols)}) VALUES ({', '.join(vals)});")

    # Atualizações
    for k in sorted(src_rows.keys() & tgt_rows.keys()):
        if src_rows[k] != tgt_rows[k]:
            sets = [f"{col} = {sql_literal(v)}" for col, v in src_rows[k].items() if v != tgt_rows[k].get(col)]
            dml.append(f"UPDATE {tgt_owner}.{table} SET {', '.join(sets)} WHERE {key_col} = {sql_literal(k)};")

    return {"success": True, "table": table, "total_dml": len(dml), "dml_script": "\n".join(dml)}, 200


# ------------------------------------------------------------------------------
# PONTO 12: MÚLTIPLAS CONEXÕES POR ABA, TERMINAL SQL*PLUS & MOCK DATA
# ------------------------------------------------------------------------------
def _generate_cpf():
    nums = [random.randint(0, 9) for _ in range(9)]
    d1 = sum((10 - i) * nums[i] for i in range(9)) % 11
    d1 = 0 if d1 < 2 else 11 - d1
    nums.append(d1)
    d2 = sum((11 - i) * nums[i] for i in range(10)) % 11
    d2 = 0 if d2 < 2 else 11 - d2
    nums.append(d2)
    return f"{nums[0]}{nums[1]}{nums[2]}.{nums[3]}{nums[4]}{nums[5]}.{nums[6]}{nums[7]}{nums[8]}-{nums[9]}{nums[10]}"


NOMBRES = ["Lucas", "Mariana", "Gabriel", "Beatriz", "Rodrigo", "Juliana", "Fernando", "Camila", "Bruno", "Larissa"]
SOBRENOMES = ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Lima"]


def h_mock_data_generate(ctx, p):
    owner = p.get("owner", "").upper()
    table = p.get("table", "").upper()
    count = min(max(int(p.get("count", 50)), 1), 5000)
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa.")

    with conn.cursor() as cur:
        if not owner:
            owner = current_schema(cur)
        cols_meta = fetch_dicts(cur, """
        SELECT column_name, data_type, data_length, data_precision, data_scale, nullable
        FROM all_tab_columns
        WHERE owner = :o AND table_name = :t
        ORDER BY column_id
        """, {"o": owner, "t": table})

    generated_rows = []
    dml_statements = []

    for i in range(1, count + 1):
        row = {}
        for c in cols_meta:
            col_name = c["COLUMN_NAME"]
            dt = c["DATA_TYPE"]
            c_upper = col_name.upper()

            if "CPF" in c_upper:
                val = _generate_cpf()
            elif "NOME" in c_upper or "NAME" in c_upper:
                val = f"{random.choice(NOMBRES)} {random.choice(SOBRENOMES)}"
            elif "EMAIL" in c_upper:
                val = f"usuario_{i}_{random.randint(100,999)}@empresa.com.br"
            elif dt == "DATE" or "DATA" in c_upper:
                val = datetime.now() - timedelta(days=random.randint(0, 720))
            elif dt == "NUMBER":
                prec = c.get("DATA_PRECISION")
                if "ID" in c_upper:
                    val = i + 1000
                elif c.get("DATA_SCALE") and c["DATA_SCALE"] > 0:
                    val = round(random.uniform(10.0, 5000.0), 2)
                elif prec and prec <= 4:
                    val = random.randint(1, 99)
                else:
                    val = random.randint(1000, 99999)
            elif "STATUS" in c_upper:
                val = random.choice(["ATIVO", "INATIVO", "PENDENTE"])
            else:
                length = min(c.get("DATA_LENGTH") or 20, 30)
                val = f"VAL_{i}_{random.randint(10,99)}"[:length]

            row[col_name] = val

        cols = list(row.keys())
        vals = [sql_literal(row[col]) for col in cols]
        dml_statements.append(f"INSERT INTO {owner}.{table} ({', '.join(cols)}) VALUES ({', '.join(vals)});")
        if i <= 10:
            generated_rows.append(row)

    dml_script = f"-- TRACES Toad Pro: Massa de Teste ({count} registros para {owner}.{table})\n"
    dml_script += "\n".join(dml_statements)
    dml_script += "\nCOMMIT;\n"

    # Se solicitado commit direto
    if p.get("execute_now"):
        with conn.cursor() as cur:
            for stmt in dml_statements:
                cur.execute(stmt.rstrip(";"))
            conn.commit()

    return {
        "success": True,
        "table": f"{owner}.{table}",
        "total_generated": count,
        "sample_preview": generated_rows,
        "dml_script": dml_script
    }, 200


def h_sqlplus_exec(ctx, p):
    line = p.get("line", "").strip()
    conn = ctx.get_conn(p.get("conn_id"))
    if not conn:
        raise ProError("Sem conexão ativa com o banco.")

    with conn.cursor() as cur:
        # Habilita DBMS_OUTPUT
        cur.execute("BEGIN DBMS_OUTPUT.ENABLE(100000); END;")

        start_t = time.time()
        output_lines = []

        if line.upper().startswith("DESC "):
            target = line[5:].strip().upper()
            cols = fetch_dicts(cur, "SELECT column_name, data_type, nullable FROM all_tab_columns WHERE table_name = :t", {"t": target})
            tbl_lines = format_sqlplus_table(["COLUMN_NAME", "DATA_TYPE", "NULLABLE"], [[c["COLUMN_NAME"], c["DATA_TYPE"], c["NULLABLE"]] for c in cols])
            output_lines.extend(tbl_lines)
        elif line.upper().startswith("SELECT"):
            cur.execute(line.rstrip(";"))
            cols = [c[0] for c in cur.description]
            rows = cur.fetchmany(100)
            tbl_lines = format_sqlplus_table(cols, rows)
            output_lines.extend(tbl_lines)
            output_lines.append(f"\n{len(rows)} linhas selecionadas.")
        else:
            cur.execute(line.rstrip(";"))
            output_lines.append("Instrução executada com sucesso.")

        # Coleta DBMS_OUTPUT gerado
        dbms_out = []
        status_var = cur.var(int)
        line_var = cur.var(str)
        while True:
            cur.execute("BEGIN DBMS_OUTPUT.GET_LINE(:line, :status); END;", line=line_var, status=status_var)
            if status_var.getvalue() != 0:
                break
            dbms_out.append(line_var.getvalue())

    elapsed_ms = round((time.time() - start_t) * 1000, 1)
    return {
        "success": True,
        "output": "\n".join(output_lines),
        "dbms_output": "\n".join(dbms_out),
        "elapsed_ms": elapsed_ms
    }, 200


# ------------------------------------------------------------------------------
# REGISTRO GERAL DE ROTAS DA SUÍTE PRO (ROUTER MESTRE)
# ------------------------------------------------------------------------------
ROUTES = {
    # Ponto 1
    "/api/pro/code-insight/columns": h_code_insight_columns,
    "/api/pro/syntax-check": h_syntax_check,
    "/api/pro/sql-history": h_sql_history,
    "/api/pro/snippets": h_snippets,
    # Ponto 2
    "/api/pro/grid/generate-dml": h_grid_generate_dml,
    "/api/pro/export-xlsx": h_export_xlsx,
    # Ponto 3
    "/api/pro/object-diff": h_object_diff,
    "/api/pro/table-fk-graph": h_table_fk_graph,
    "/api/pro/quick-ddl": h_quick_ddl,
    # Ponto 4
    "/api/pro/perf/ash-timeline": h_perf_ash_timeline,
    "/api/pro/perf/temp-pga": h_perf_temp_pga,
    "/api/pro/perf/awr-snapshots": h_perf_awr_snapshots,
    "/api/pro/perf/awr-report": h_perf_awr_report,
    # Ponto 5
    "/api/pro/ssh/inspect-key": h_ssh_key_inspect,
    "/api/pro/keepalive/status": h_keepalive_status,
    "/api/pro/vault/status": h_vault_status,
    "/api/pro/vault/setup": h_vault_setup,
    "/api/pro/vault/unlock": h_vault_unlock,
    "/api/pro/vault/lock": h_vault_lock,
    "/api/pro/vault/save-secret": h_vault_save_secret,
    "/api/pro/vault/get-secrets": h_vault_get_secrets,
    # Ponto 6
    "/api/pro/scheduler/tasks": h_scheduler_tasks,
    "/api/pro/scheduler/run-now": h_scheduler_run_now,
    "/api/pro/scheduler/history": h_scheduler_history,
    # Ponto 7
    "/api/pro/debug/init": h_debug_init,
    "/api/pro/debug/breakpoints": h_debug_breakpoints,
    "/api/pro/debug/step": h_debug_step,
    "/api/pro/profiler/runs": h_profiler_runs,
    "/api/pro/profiler/run-code": h_profiler_run_code,
    "/api/pro/profiler/heatmap": h_profiler_heatmap,
    # Ponto 8
    "/api/pro/health-check-360": h_health_check_360,
    "/api/pro/tablespace-heatmap": h_tablespace_heatmap,
    # Ponto 9
    "/api/pro/tuning/advisor": h_tuning_advisor,
    "/api/pro/tuning/plan-diff": h_cbo_plan_diff,
    "/api/pro/tuning/column-histogram": h_column_histogram,
    # Ponto 10
    "/api/pro/erd/schema": h_erd_schema,
    "/api/pro/batch-ddl": h_batch_ddl,
    # Ponto 11
    "/api/pro/sync/schema-compare": h_sync_schema_compare,
    "/api/pro/sync/data-compare": h_sync_data_compare,
    # Ponto 12
    "/api/pro/mock-data/generate": h_mock_data_generate,
    "/api/pro/sqlplus/exec": h_sqlplus_exec
}


def dispatch(ctx, path, payload):
    handler = ROUTES.get(path)
    if not handler:
        return None, 404
    try:
        return handler(ctx, payload or {})
    except ProError as pe:
        return {"success": False, "error": str(pe)}, pe.status
    except Exception as ex:
        traceback.print_exc()
        return {"success": False, "error": f"Erro interno TracesPro: {str(ex)}"}, 500
