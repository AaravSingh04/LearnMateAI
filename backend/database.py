"""Database setup and connection management for LearnMate AI.

Provides seamless dual-mode connectivity:
1. Turso Cloud LibSQL (Permanent Cloud Database for Vercel/Production via Pure Sync HTTP Pipeline)
2. Local SQLite with row factory and foreign key enforcement (Development/Offline Fallback)
"""

import base64
import json
import os
import shutil
import sqlite3
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Generator, Optional

from dotenv import load_dotenv

# Resolve paths relative to project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Load local .env if present
ENV_PATH = PROJECT_ROOT / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()

# Detect serverless environment (Vercel, AWS Lambda) where project root is read-only
IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

if IS_SERVERLESS:
    DATA_DIR = Path("/tmp/data")
    DB_PATH = DATA_DIR / "learnmate.db"
    UPLOADS_DIR = DATA_DIR / "uploads"
else:
    DATA_DIR = PROJECT_ROOT / "data"
    DB_PATH = DATA_DIR / "learnmate.db"
    UPLOADS_DIR = DATA_DIR / "uploads"


def ensure_directories() -> None:
    """Ensure data/ and data/uploads/ directories exist and are writable."""
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        print(f"Notice: Directory creation warning: {e}")


class TursoRow(dict):
    """Dictionary-like row that also supports integer indexing like sqlite3.Row."""

    def __init__(self, cols, values):
        super().__init__()
        self._values = values
        self._cols = cols
        for col, val in zip(cols, values):
            self[col] = val

    def __getitem__(self, item):
        if isinstance(item, int):
            return self._values[item]
        return super().__getitem__(item)


def _parse_turso_value(v):
    if not isinstance(v, dict):
        return v
    t = v.get("type")
    if t == "null":
        return None
    elif t == "integer":
        return int(v["value"])
    elif t == "float":
        return float(v["value"])
    elif t == "text":
        return str(v["value"])
    elif t == "blob":
        return base64.b64decode(v.get("base64", ""))
    return v.get("value")


def _format_turso_arg(arg):
    if arg is None:
        return {"type": "null"}
    elif isinstance(arg, bool):
        return {"type": "integer", "value": "1" if arg else "0"}
    elif isinstance(arg, int):
        return {"type": "integer", "value": str(arg)}
    elif isinstance(arg, float):
        return {"type": "float", "value": arg}
    elif isinstance(arg, (bytes, bytearray)):
        return {"type": "blob", "base64": base64.b64encode(arg).decode("ascii")}
    else:
        return {"type": "text", "value": str(arg)}


class PureTursoHttpClient:
    """Pure synchronous HTTP client for Turso Cloud LibSQL database.
    
    Zero dependencies beyond Python's standard library (no aiohttp, no background threads),
    ensuring 100% stability and zero deadlocks on Vercel Serverless / AWS Lambda.
    """

    def __init__(self, url: str, auth_token: str):
        url = url.strip()
        if url.startswith("libsql://"):
            url = "https://" + url[len("libsql://"):]
        if not url.endswith("/"):
            url += "/"
        self.base_url = url
        self.auth_token = auth_token

    def execute(self, sql: str, params=None):
        if params is None:
            params = []
        elif isinstance(params, tuple):
            params = list(params)

        args_proto = [_format_turso_arg(p) for p in params]
        payload = json.dumps({
            "requests": [
                {
                    "type": "execute",
                    "stmt": {
                        "sql": sql,
                        "args": args_proto,
                        "want_rows": True
                    }
                },
                {"type": "close"}
            ]
        }).encode("utf-8")

        req_url = urllib.parse.urljoin(self.base_url, "v2/pipeline")
        req = urllib.request.Request(
            req_url,
            data=payload,
            headers={
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            results = res_json.get("results", [])
            if not results:
                raise RuntimeError("Empty response from Turso")

            first_res = results[0]
            if first_res.get("type") == "error":
                raise RuntimeError(first_res.get("error", {}).get("message", "Turso query execution error"))

            exec_res = first_res.get("response", {}).get("result", {})
            cols = [c.get("name") or "" for c in exec_res.get("cols", [])]
            rows = [
                TursoRow(cols, [_parse_turso_value(val) for val in r])
                for r in exec_res.get("rows", [])
            ]
            affected = exec_res.get("affected_row_count", 0)
            last_id_str = exec_res.get("last_insert_rowid")
            last_id = int(last_id_str) if last_id_str is not None else None
            return cols, rows, affected, last_id


class TursoCursor:
    """Cursor adapter wrapping PureTursoHttpClient for sqlite3 compatibility."""

    def __init__(self, client: PureTursoHttpClient):
        self.client = client
        self.cols = []
        self._rows = []
        self._idx = 0
        self.lastrowid = None
        self.rowcount = 0

    def execute(self, sql: str, params=None):
        cols, rows, affected, last_id = self.client.execute(sql, params)
        self.cols = cols
        self._rows = rows
        self.rowcount = affected
        self.lastrowid = last_id
        self._idx = 0
        return self

    def fetchone(self):
        if not self._rows or self._idx >= len(self._rows):
            return None
        row = self._rows[self._idx]
        self._idx += 1
        return row

    def fetchall(self):
        if not self._rows:
            return []
        rows = self._rows[self._idx:]
        self._idx = len(self._rows)
        return rows


class TursoConnection:
    """Connection adapter wrapping PureTursoHttpClient for sqlite3 compatibility."""

    def __init__(self, client: PureTursoHttpClient):
        self.client = client

    def cursor(self):
        return TursoCursor(self.client)

    def execute(self, sql: str, params=None):
        cur = self.cursor()
        return cur.execute(sql, params)

    def commit(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def close(self):
        pass


def seed_initial_data(conn) -> None:
    """Seed initial demo subjects, materials, and study packs if database is empty."""
    try:
        from backend.seed_data import seed_database
        seed_database(conn)
    except Exception as e:
        print(f"Notice: Could not load seed data: {e}")


def init_db_schema(conn) -> None:
    """Initialize all schema tables and auto-seed if empty."""
    # 1. subjects table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) > 0),
            description TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            syllabus_text TEXT DEFAULT ''
        );
        """
    )

    # 2. materials table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            original_filename TEXT NOT NULL,
            stored_filename TEXT NOT NULL,
            file_type TEXT NOT NULL,
            uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
            extracted_text TEXT NOT NULL DEFAULT '',
            processing_status TEXT NOT NULL DEFAULT 'completed',
            self_notes TEXT DEFAULT '',
            file_base64 TEXT DEFAULT '',
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        );
        """
    )

    # Ensure self_notes and file_base64 columns exist if table was created earlier
    try:
        mat_cols = [c[1] for c in conn.execute("PRAGMA table_info(materials);").fetchall()]
        if "self_notes" not in mat_cols:
            conn.execute("ALTER TABLE materials ADD COLUMN self_notes TEXT DEFAULT '';")
        if "file_base64" not in mat_cols:
            conn.execute("ALTER TABLE materials ADD COLUMN file_base64 TEXT DEFAULT '';")
    except Exception:
        pass

    # Ensure syllabus_text column exists on subjects if table was created earlier
    try:
        subj_cols = [c[1] for c in conn.execute("PRAGMA table_info(subjects);").fetchall()]
        if "syllabus_text" not in subj_cols:
            conn.execute("ALTER TABLE subjects ADD COLUMN syllabus_text TEXT DEFAULT '';")
    except Exception:
        pass

    # 3. study_packs table (unique material_id: 1 current pack per material)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS study_packs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            material_id INTEGER NOT NULL UNIQUE,
            summary TEXT NOT NULL,
            key_concepts_json TEXT NOT NULL,
            revision_notes TEXT NOT NULL,
            generated_at TEXT NOT NULL DEFAULT (datetime('now')),
            model_name TEXT NOT NULL,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
        );
        """
    )

    # 4. quiz_questions table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS quiz_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            material_id INTEGER NOT NULL,
            question_text TEXT NOT NULL,
            options_json TEXT NOT NULL,
            correct_option_index INTEGER NOT NULL,
            explanation TEXT NOT NULL,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
        );
        """
    )

    # 5. quiz_attempts table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            material_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
            results_json TEXT DEFAULT '',
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
        );
        """
    )

    try:
        qa_cols = [c[1] for c in conn.execute("PRAGMA table_info(quiz_attempts);").fetchall()]
        if "results_json" not in qa_cols:
            conn.execute("ALTER TABLE quiz_attempts ADD COLUMN results_json TEXT DEFAULT '';")
    except Exception:
        pass

    # 6. calendar_events table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS calendar_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            event_type TEXT NOT NULL DEFAULT 'exam',
            event_date TEXT NOT NULL,
            event_time TEXT,
            subject_id INTEGER,
            notes TEXT,
            reminder_offset_days INTEGER DEFAULT 1,
            is_completed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
        );
        """
    )

    # 7. sticky_notes table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sticky_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT 'purple',
            is_completed INTEGER DEFAULT 0,
            is_pinned INTEGER DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        """
    )

    # 8. study_sessions table (tracks timer & Pomodoro duration)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS study_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER,
            duration_seconds INTEGER NOT NULL,
            session_type TEXT NOT NULL DEFAULT 'pomodoro',
            notes TEXT,
            completed_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
        );
        """
    )

    # 9. topics table (structured subject topics)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            summary TEXT,
            notes_markdown TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        );
        """
    )

    # 10. syllabus_items table (tracks syllabus coverage)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS syllabus_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            topic_name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            coverage_notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        );
        """
    )

    # Auto-seed initial subjects and study packs if database is newly initialized
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS cnt FROM subjects;")
        row = cursor.fetchone()
        if row and row["cnt"] == 0:
            seed_initial_data(conn)
    except Exception as e:
        print(f"Notice: Auto-seed skipped ({e})")


_db_initialized = False


def get_db_connection():
    """Create and return a database connection.
    
    If TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set, connects to Turso Cloud LibSQL
    via pure synchronous HTTP pipeline for 100% permanent cloud persistence across serverless cold starts.
    If Turso is not configured or encounters network errors, seamlessly falls back to local SQLite.
    """
    global _db_initialized

    turso_url = os.environ.get("TURSO_DATABASE_URL", "").strip()
    turso_token = os.environ.get("TURSO_AUTH_TOKEN", "").strip()

    if turso_url and turso_token:
        try:
            client = PureTursoHttpClient(turso_url, turso_token)
            conn = TursoConnection(client)
            if not _db_initialized:
                conn.execute("SELECT 1;")
                init_db_schema(conn)
                _db_initialized = True
            return conn
        except Exception as e:
            print(f"Notice: Turso Cloud DB connection notice ({e}); using local SQLite fallback.")

    # Local SQLite fallback
    ensure_directories()
    if not _db_initialized or not DB_PATH.exists():
        init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    """Initialize local SQLite database tables if they do not exist."""
    global _db_initialized
    ensure_directories()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        with conn:
            init_db_schema(conn)
        _db_initialized = True
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
