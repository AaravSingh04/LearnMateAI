"""Database setup and SQLite connection management for LearnMate AI.

Provides connection helpers with foreign key enforcement enabled,
database initialization, and schema creation for all 5 core tables.
"""

import os
import shutil
import sqlite3
from pathlib import Path
from typing import Generator

# Resolve paths relative to project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent

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


def seed_initial_data(conn: sqlite3.Connection) -> None:
    """Seed initial demo subjects, materials, and study packs if database is empty."""
    seed_file = PROJECT_ROOT / "data" / "seed_data.sql"
    if seed_file.exists():
        try:
            with open(seed_file, "r", encoding="utf-8") as f:
                sql_script = f.read()
            conn.executescript(sql_script)
        except Exception as e:
            print(f"Notice: Could not load seed data: {e}")


def get_db_connection() -> sqlite3.Connection:
    """Create and return a SQLite database connection with row factory

    and foreign key constraints enabled.
    """
    ensure_directories()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Crucial for cascade deletion and relational integrity
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    """Initialize SQLite database tables if they do not exist."""
    ensure_directories()
    conn = get_db_connection()
    try:
        with conn:
            # 1. subjects table
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS subjects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) > 0),
                    description TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
                    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
                );
                """
            )

            # Ensure self_notes column exists if table was created earlier
            mat_cols = [c[1] for c in conn.execute("PRAGMA table_info(materials);").fetchall()]
            if "self_notes" not in mat_cols:
                conn.execute("ALTER TABLE materials ADD COLUMN self_notes TEXT DEFAULT '';")

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

            # Ensure results_json column exists if created earlier
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
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
