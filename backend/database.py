"""Database setup and connection management for LearnMate AI.

Provides seamless dual-mode connectivity:
1. Turso Cloud LibSQL (Permanent Cloud Database for Vercel/Production)
2. Local SQLite with row factory and foreign key enforcement (Development/Offline Fallback)
"""

import base64
import os
import shutil
import sqlite3
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
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


class TursoCursor:
    """Cursor adapter wrapping LibSQL client ResultSet for sqlite3 compatibility."""

    def __init__(self, client):
        self.client = client
        self._result = None
        self._idx = 0
        self.lastrowid = None
        self.rowcount = 0

    def execute(self, sql: str, params=None):
        if params is None:
            params = []
        elif isinstance(params, tuple):
            params = list(params)
        self._result = self.client.execute(sql, params)
        self.lastrowid = self._result.last_insert_rowid
        self.rowcount = self._result.rows_affected
        self._idx = 0
        return self

    def fetchone(self):
        if not self._result or self._idx >= len(self._result.rows):
            return None
        row = self._result.rows[self._idx]
        self._idx += 1
        return row

    def fetchall(self):
        if not self._result:
            return []
        rows = self._result.rows[self._idx:]
        self._idx = len(self._result.rows)
        return rows


class TursoConnection:
    """Connection adapter wrapping LibSQL client for sqlite3 compatibility."""

    def __init__(self, client):
        self.client = client

    def cursor(self):
        return TursoCursor(self.client)

    def execute(self, sql: str, params=None):
        cur = self.cursor()
        return cur.execute(sql, params)

    def commit(self):
        # LibSQL auto-commits HTTP statements
        pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def close(self):
        try:
            self.client.close()
        except Exception:
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
    mat_cols = [c[1] for c in conn.execute("PRAGMA table_info(materials);").fetchall()]
    if "self_notes" not in mat_cols:
        conn.execute("ALTER TABLE materials ADD COLUMN self_notes TEXT DEFAULT '';")
    if "file_base64" not in mat_cols:
        conn.execute("ALTER TABLE materials ADD COLUMN file_base64 TEXT DEFAULT '';")

    # Ensure syllabus_text column exists on subjects if table was created earlier
    subj_cols = [c[1] for c in conn.execute("PRAGMA table_info(subjects);").fetchall()]
    if "syllabus_text" not in subj_cols:
        conn.execute("ALTER TABLE subjects ADD COLUMN syllabus_text TEXT DEFAULT '';")

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

    qa_cols = [c[1] for c in conn.execute("PRAGMA table_info(quiz_attempts);").fetchall()]
    if "results_json" not in qa_cols:
        conn.execute("ALTER TABLE quiz_attempts ADD COLUMN results_json TEXT DEFAULT '';")

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
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) AS cnt FROM subjects;")
    row = cursor.fetchone()
    if row and row["cnt"] == 0:
        seed_initial_data(conn)


_db_initialized = False


def get_db_connection():
    """Create and return a database connection.
    
    If TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set, connects to Turso Cloud LibSQL
    for 100% permanent cloud persistence across serverless cold starts and multiple devices.
    Otherwise, seamlessly connects to local SQLite.
    """
    global _db_initialized

    turso_url = os.environ.get("TURSO_DATABASE_URL", "").strip()
    turso_token = os.environ.get("TURSO_AUTH_TOKEN", "").strip()

    if turso_url and turso_token:
        try:
            import libsql_client
            url = turso_url
            if url.startswith("libsql://"):
                url = "https://" + url[len("libsql://"):]
            client = libsql_client.create_client_sync(url=url, auth_token=turso_token)
            conn = TursoConnection(client)
            if not _db_initialized:
                init_db_schema(conn)
                _db_initialized = True
            return conn
        except Exception as e:
            print(f"Notice: Turso Cloud DB connection error ({e}); using local SQLite fallback.")

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
