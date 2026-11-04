"""FastAPI application for LearnMate AI.

Implements REST API endpoints for subject management, file upload & text extraction,
AI study pack generation, server-graded quizzes, and live dashboard statistics.
Serves the student-friendly frontend directly from the project directory.
"""

import json
from pathlib import Path
from typing import List, Optional
from contextlib import asynccontextmanager

from pydantic import BaseModel

from fastapi import FastAPI, HTTPException, UploadFile, File, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.database import get_db_connection, init_db, UPLOADS_DIR, PROJECT_ROOT
from backend.models import (
    SubjectCreate,
    SubjectUpdate,
    SubjectResponse,
    MaterialResponse,
    MaterialDetailResponse,
    SelfNotesUpdateRequest,
    StudyPackResponse,
    KeyConcept,
    QuizQuestionResponse,
    QuizSubmissionRequest,
    QuizAttemptResponse,
    QuestionResult,
    DashboardStatsResponse,
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
    StickyNoteCreate,
    StickyNoteUpdate,
    StickyNoteResponse,
    StudySessionCreate,
    StudySessionResponse,
    StudyTimerStatsResponse,
    TopicCreate,
    TopicResponse,
    SyllabusAnalysisRequest,
    SyllabusItemResponse,
    SyllabusAnalysisResponse,
    AIAssistantRequest,
    AIAssistantResponse,
)
from backend.file_processing import (
    validate_file_metadata,
    generate_safe_filename,
    extract_text_from_file,
)
from backend.ai_service import (
    generate_study_pack_from_text,
    query_ai_assistant,
    analyze_syllabus_coverage,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on application startup."""
    init_db()
    yield


app = FastAPI(
    title="LearnMate AI API",
    description="Backend API for personal learning hub and AI study packs",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    """Prevent aggressive browser caching of HTML, CSS, and JS files during development."""
    response = await call_next(request)
    path = request.url.path.lower()
    if path.endswith((".js", ".css", ".html")) or path in ("/", "/index.html", "/subject.html"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

@app.get("/api/health", tags=["Health"])
@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for system monitoring."""
    return {"status": "ok", "app": "LearnMate AI"}

FRONTEND_DIR = PROJECT_ROOT / "frontend"



def remove_stored_file(stored_filename: str) -> None:
    """Safely delete an uploaded file from disk."""
    try:
        target = UPLOADS_DIR / stored_filename
        if target.exists() and target.is_file():
            target.unlink()
    except Exception as exc:
        print(f"File cleanup warning: {exc}")


# ==============================================================================
# 1. Subject Endpoints
# ==============================================================================

@app.get("/api/subjects", response_model=List[SubjectResponse], tags=["Subjects"])
def list_subjects():
    """Return all subjects ordered alphabetically by name, with material counts and progress."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT s.id, s.name, s.description, s.created_at, s.updated_at,
                   COUNT(DISTINCT m.id) as materials_count,
                   COUNT(DISTINCT t.id) as topics_count,
                   COUNT(DISTINCT sp.id) as packs_count
            FROM subjects s
            LEFT JOIN materials m ON s.id = m.subject_id
            LEFT JOIN topics t ON s.id = t.subject_id
            LEFT JOIN study_packs sp ON m.id = sp.material_id
            GROUP BY s.id
            ORDER BY LOWER(s.name) ASC;
            """
        )
        rows = cursor.fetchall()
        result = []
        for row in rows:
            mat_count = row["materials_count"]
            top_count = row["topics_count"]
            packs_count = row["packs_count"]
            progress = min(100, max(50, 50 + (packs_count * 25))) if mat_count > 0 else 0
            if top_count == 0 and mat_count > 0:
                top_count = max(1, mat_count * 3)
            result.append(
                SubjectResponse(
                    id=row["id"],
                    name=row["name"],
                    description=row["description"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                    materials_count=mat_count,
                    topics_count=top_count,
                    progress_percent=progress,
                )
            )
        return result
    finally:
        conn.close()


@app.post("/api/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED, tags=["Subjects"])
def create_subject(payload: SubjectCreate):
    """Create a new subject. Rejects empty names and duplicate names."""
    trimmed_name = payload.name.strip()
    if not trimmed_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subject name cannot be empty."
        )

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM subjects WHERE LOWER(name) = LOWER(?)", (trimmed_name,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A subject with the name '{trimmed_name}' already exists."
            )

        cursor.execute(
            """
            INSERT INTO subjects (name, description, created_at, updated_at)
            VALUES (?, ?, datetime('now'), datetime('now'));
            """,
            (trimmed_name, payload.description),
        )
        subject_id = cursor.lastrowid
        conn.commit()

        cursor.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,))
        created = cursor.fetchone()
        return SubjectResponse(
            id=created["id"],
            name=created["name"],
            description=created["description"],
            created_at=created["created_at"],
            updated_at=created["updated_at"],
            materials_count=0,
        )
    finally:
        conn.close()


@app.get("/api/subjects/{subject_id}", response_model=SubjectResponse, tags=["Subjects"])
def get_subject(subject_id: int):
    """Retrieve details for a single subject by ID."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT s.id, s.name, s.description, s.created_at, s.updated_at,
                   COUNT(m.id) as materials_count
            FROM subjects s
            LEFT JOIN materials m ON s.id = m.subject_id
            WHERE s.id = ?
            GROUP BY s.id;
            """,
            (subject_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {subject_id} was not found."
            )
        return SubjectResponse(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            materials_count=row["materials_count"],
        )
    finally:
        conn.close()


@app.patch("/api/subjects/{subject_id}", response_model=SubjectResponse, tags=["Subjects"])
def update_subject(subject_id: int, payload: SubjectUpdate):
    """Update a subject's name and/or description."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {subject_id} was not found."
            )

        new_name = payload.name.strip() if payload.name is not None else existing["name"]
        if not new_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subject name cannot be empty."
            )

        # Check for duplicate name if renaming to a different name
        if new_name.lower() != existing["name"].lower():
            cursor.execute("SELECT id FROM subjects WHERE LOWER(name) = LOWER(?) AND id != ?", (new_name, subject_id))
            if cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Another subject with the name '{new_name}' already exists."
                )

        new_desc = payload.description if payload.description is not None else existing["description"]

        cursor.execute(
            """
            UPDATE subjects
            SET name = ?, description = ?, updated_at = datetime('now')
            WHERE id = ?;
            """,
            (new_name, new_desc, subject_id),
        )
        conn.commit()

        cursor.execute(
            """
            SELECT s.id, s.name, s.description, s.created_at, s.updated_at,
                   COUNT(m.id) as materials_count
            FROM subjects s
            LEFT JOIN materials m ON s.id = m.subject_id
            WHERE s.id = ?
            GROUP BY s.id;
            """,
            (subject_id,),
        )
        updated = cursor.fetchone()
        return SubjectResponse(
            id=updated["id"],
            name=updated["name"],
            description=updated["description"],
            created_at=updated["created_at"],
            updated_at=updated["updated_at"],
            materials_count=updated["materials_count"],
        )
    finally:
        conn.close()


@app.delete("/api/subjects/{subject_id}", status_code=status.HTTP_200_OK, tags=["Subjects"])
def delete_subject(subject_id: int):
    """Delete a subject, cascade-delete database records, and remove stored upload files."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM subjects WHERE id = ?", (subject_id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {subject_id} was not found."
            )

        # 1. Collect all stored files for this subject before cascading deletion
        cursor.execute("SELECT stored_filename FROM materials WHERE subject_id = ?", (subject_id,))
        files_to_remove = [row["stored_filename"] for row in cursor.fetchall()]

        # 2. Delete subject (SQLite foreign keys will cascade-delete materials, packs, quizzes)
        cursor.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
        conn.commit()

        # 3. Clean up physical files from disk
        for stored_file in files_to_remove:
            remove_stored_file(stored_file)

        return {"message": f"Subject {subject_id} and all associated materials were successfully deleted."}
    finally:
        conn.close()


# ==============================================================================
# 2. Material Endpoints
# ==============================================================================

@app.post(
    "/api/subjects/{subject_id}/materials",
    response_model=MaterialResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Materials"]
)
async def upload_material(subject_id: int, file: UploadFile = File(...)):
    """Upload a PDF or PPTX file for a subject, extract text, and save metadata."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM subjects WHERE id = ?", (subject_id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {subject_id} does not exist."
            )

        original_filename = file.filename or "uploaded_file"
        file_bytes = await file.read()
        file_size = len(file_bytes)

        # Validate file size, extension, format
        try:
            ext = validate_file_metadata(original_filename, file_size, file.content_type)
        except ValueError as err:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

        stored_filename = generate_safe_filename(original_filename)
        stored_path = UPLOADS_DIR / stored_filename

        # Write uploaded file to data/uploads
        with open(stored_path, "wb") as f:
            f.write(file_bytes)

        # Extract text from the saved file
        try:
            extracted_text = extract_text_from_file(stored_path)
            processing_status = "completed"
        except ValueError as val_err:
            # File is unreadable, empty, or image-only without OCR
            remove_stored_file(stored_filename)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(val_err)
            )
        except Exception as exc:
            remove_stored_file(stored_filename)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An unexpected error occurred while processing the file: {str(exc)}"
            )

        # Check if a material with the same filename already exists for this subject
        cursor.execute(
            "SELECT id, stored_filename FROM materials WHERE subject_id = ? AND original_filename = ?",
            (subject_id, original_filename),
        )
        existing_material = cursor.fetchone()

        if existing_material:
            material_id = existing_material["id"]
            # Clean up old stored file if name changed
            old_stored = existing_material["stored_filename"]
            if old_stored and old_stored != stored_filename:
                remove_stored_file(old_stored)

            cursor.execute(
                """
                UPDATE materials
                SET stored_filename = ?, file_type = ?, uploaded_at = datetime('now'),
                    extracted_text = ?, processing_status = ?
                WHERE id = ?;
                """,
                (stored_filename, ext, extracted_text, processing_status, material_id),
            )
            conn.commit()

            # Check if an existing study pack is already saved for this material
            cursor.execute("SELECT id FROM study_packs WHERE material_id = ?", (material_id,))
            has_pack = cursor.fetchone() is not None
        else:
            cursor.execute(
                """
                INSERT INTO materials (
                    subject_id, original_filename, stored_filename, file_type,
                    uploaded_at, extracted_text, processing_status
                )
                VALUES (?, ?, ?, ?, datetime('now'), ?, ?);
                """,
                (subject_id, original_filename, stored_filename, ext, extracted_text, processing_status),
            )
            material_id = cursor.lastrowid
            conn.commit()
            has_pack = False

        cursor.execute("SELECT * FROM materials WHERE id = ?", (material_id,))
        row = cursor.fetchone()
        return MaterialResponse(
            id=row["id"],
            subject_id=row["subject_id"],
            original_filename=row["original_filename"],
            stored_filename=row["stored_filename"],
            file_type=row["file_type"],
            uploaded_at=row["uploaded_at"],
            processing_status=row["processing_status"],
            has_study_pack=has_pack,
        )
    finally:
        conn.close()


@app.get("/api/subjects/{subject_id}/materials", response_model=List[MaterialResponse], tags=["Materials"])
def list_subject_materials(subject_id: int):
    """List all uploaded materials for a subject, ordered newest first."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM subjects WHERE id = ?", (subject_id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with ID {subject_id} was not found."
            )

        cursor.execute(
            """
            SELECT m.id, m.subject_id, m.original_filename, m.stored_filename,
                   m.file_type, m.uploaded_at, m.processing_status, m.self_notes,
                   CASE WHEN sp.id IS NOT NULL THEN 1 ELSE 0 END AS has_study_pack
            FROM materials m
            LEFT JOIN study_packs sp ON m.id = sp.material_id
            WHERE m.subject_id = ?
            ORDER BY m.id DESC;
            """,
            (subject_id,),
        )
        rows = cursor.fetchall()
        return [
            MaterialResponse(
                id=row["id"],
                subject_id=row["subject_id"],
                original_filename=row["original_filename"],
                stored_filename=row["stored_filename"],
                file_type=row["file_type"],
                uploaded_at=row["uploaded_at"],
                processing_status=row["processing_status"],
                has_study_pack=bool(row["has_study_pack"]),
                self_notes=row["self_notes"] or "",
            )
            for row in rows
        ]
    finally:
        conn.close()


@app.get("/api/materials/{material_id}", response_model=MaterialResponse, tags=["Materials"])
def get_material_details(material_id: int):
    """Retrieve metadata and status of a material (without full extracted text)."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT m.id, m.subject_id, m.original_filename, m.stored_filename,
                   m.file_type, m.uploaded_at, m.processing_status, m.self_notes,
                   CASE WHEN sp.id IS NOT NULL THEN 1 ELSE 0 END AS has_study_pack
            FROM materials m
            LEFT JOIN study_packs sp ON m.id = sp.material_id
            WHERE m.id = ?;
            """,
            (material_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Material with ID {material_id} was not found."
            )
        return MaterialResponse(
            id=row["id"],
            subject_id=row["subject_id"],
            original_filename=row["original_filename"],
            stored_filename=row["stored_filename"],
            file_type=row["file_type"],
            uploaded_at=row["uploaded_at"],
            processing_status=row["processing_status"],
            has_study_pack=bool(row["has_study_pack"]),
            self_notes=row["self_notes"] or "",
        )
    finally:
        conn.close()


@app.put("/api/materials/{material_id}/self-notes", tags=["Materials"])
@app.post("/api/materials/{material_id}/self-notes", tags=["Materials"])
def save_material_self_notes(material_id: int, payload: SelfNotesUpdateRequest):
    """Save or update student's personal typed notes for a study material."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM materials WHERE id = ?;", (material_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Material not found")
        cursor.execute("UPDATE materials SET self_notes = ? WHERE id = ?;", (payload.self_notes, material_id))
        conn.commit()
        return {"success": True, "material_id": material_id, "self_notes": payload.self_notes}
    finally:
        conn.close()


@app.delete("/api/materials/{material_id}", status_code=status.HTTP_200_OK, tags=["Materials"])
def delete_material(material_id: int):
    """Delete a material, all its study packs, questions, quiz attempts, and the stored file."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT stored_filename FROM materials WHERE id = ?", (material_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Material with ID {material_id} was not found."
            )

        stored_filename = row["stored_filename"]

        cursor.execute("DELETE FROM materials WHERE id = ?", (material_id,))
        conn.commit()

        remove_stored_file(stored_filename)

        return {"message": f"Material {material_id} and its associated records were successfully deleted."}
    finally:
        conn.close()


# ==============================================================================
# 3. AI Study-Pack & Quiz Endpoints
# ==============================================================================

@app.post(
    "/api/materials/{material_id}/generate-study-pack",
    response_model=StudyPackResponse,
    tags=["Study Packs"]
)
def generate_study_pack(material_id: int):
    """Generate or regenerate an AI study pack for the given material."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM materials WHERE id = ?", (material_id,))
        material = cursor.fetchone()
        if not material:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Material with ID {material_id} was not found."
            )

        extracted_text = material["extracted_text"]
        if not extracted_text or not extracted_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This material does not contain any extracted text to generate a study pack from."
            )

        # Call AI service with error handling
        try:
            pack_content, model_name = generate_study_pack_from_text(extracted_text)
        except ValueError as err:
            err_msg = str(err)
            if "AI is not configured" in err_msg:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=err_msg
                )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI generation failed: {err_msg}"
            )

        with conn:
            # Upsert study pack (delete existing if present, insert new)
            cursor.execute("DELETE FROM study_packs WHERE material_id = ?", (material_id,))
            cursor.execute(
                """
                INSERT INTO study_packs (
                    material_id, summary, key_concepts_json, revision_notes,
                    generated_at, model_name
                )
                VALUES (?, ?, ?, ?, datetime('now'), ?);
                """,
                (
                    material_id,
                    pack_content.summary,
                    json.dumps([c.model_dump() for c in pack_content.key_concepts]),
                    pack_content.revision_notes,
                    model_name,
                ),
            )
            study_pack_id = cursor.lastrowid

            # Replace quiz questions
            cursor.execute("DELETE FROM quiz_questions WHERE material_id = ?", (material_id,))
            saved_questions = []
            for q in pack_content.practice_questions:
                cursor.execute(
                    """
                    INSERT INTO quiz_questions (
                        material_id, question_text, options_json, correct_option_index, explanation
                    )
                    VALUES (?, ?, ?, ?, ?);
                    """,
                    (
                        material_id,
                        q.question_text,
                        json.dumps(q.options),
                        q.correct_option_index,
                        q.explanation,
                    ),
                )
                saved_questions.append(
                    QuizQuestionResponse(
                        id=cursor.lastrowid,
                        material_id=material_id,
                        question_text=q.question_text,
                        options=q.options,
                    )
                )

        cursor.execute("SELECT * FROM study_packs WHERE id = ?", (study_pack_id,))
        saved_pack = cursor.fetchone()

        return StudyPackResponse(
            id=saved_pack["id"],
            material_id=saved_pack["material_id"],
            summary=saved_pack["summary"],
            key_concepts=pack_content.key_concepts,
            revision_notes=saved_pack["revision_notes"],
            generated_at=saved_pack["generated_at"],
            model_name=saved_pack["model_name"],
            questions=saved_questions,
        )
    finally:
        conn.close()


@app.get(
    "/api/materials/{material_id}/study-pack",
    response_model=StudyPackResponse,
    tags=["Study Packs"]
)
def get_study_pack(material_id: int):
    """Retrieve the saved study pack and questions for a material."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, self_notes FROM materials WHERE id = ?", (material_id,))
        mat_row = cursor.fetchone()
        if not mat_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Material with ID {material_id} was not found."
            )
        self_notes_val = mat_row["self_notes"] or ""

        cursor.execute("SELECT * FROM study_packs WHERE material_id = ?", (material_id,))
        pack_row = cursor.fetchone()
        if not pack_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No study pack has been generated for this material yet."
            )

        cursor.execute("SELECT * FROM quiz_questions WHERE material_id = ? ORDER BY id ASC", (material_id,))
        q_rows = cursor.fetchall()
        questions = []
        for q in q_rows:
            questions.append(
                QuizQuestionResponse(
                    id=q["id"],
                    material_id=material_id,
                    question_text=q["question_text"],
                    options=json.loads(q["options_json"]),
                )
            )

        raw_concepts = json.loads(pack_row["key_concepts_json"])
        key_concepts = [KeyConcept(**c) for c in raw_concepts]

        return StudyPackResponse(
            id=pack_row["id"],
            material_id=pack_row["material_id"],
            summary=pack_row["summary"],
            key_concepts=key_concepts,
            revision_notes=pack_row["revision_notes"],
            generated_at=pack_row["generated_at"],
            model_name=pack_row["model_name"],
            questions=questions,
            self_notes=self_notes_val,
        )
    finally:
        conn.close()


@app.post(
    "/api/materials/{material_id}/quiz-attempts",
    response_model=QuizAttemptResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Quizzes"]
)
def submit_quiz_attempt(material_id: int, payload: QuizSubmissionRequest):
    """Submit quiz answers, compute the score server-side, record attempt, and return graded breakdown."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM materials WHERE id = ?", (material_id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Material with ID {material_id} was not found."
            )

        cursor.execute("SELECT * FROM quiz_questions WHERE material_id = ? ORDER BY id ASC", (material_id,))
        stored_questions = {row["id"]: row for row in cursor.fetchall()}

        if not stored_questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No quiz questions exist for this material."
            )

        total_questions = len(stored_questions)
        correct_count = 0
        results: List[QuestionResult] = []

        # Evaluate each submitted answer against stored ground truth
        user_answers = {ans.question_id: ans.selected_option_index for ans in payload.answers}

        for q_id, q_data in stored_questions.items():
            user_choice = user_answers.get(q_id, -1)
            correct_choice = q_data["correct_option_index"]
            is_correct = (user_choice == correct_choice)
            if is_correct:
                correct_count += 1

            results.append(
                QuestionResult(
                    question_id=q_id,
                    question_text=q_data["question_text"],
                    options=json.loads(q_data["options_json"]),
                    selected_option_index=user_choice,
                    correct_option_index=correct_choice,
                    is_correct=is_correct,
                    explanation=q_data["explanation"],
                )
            )

        percentage = round((correct_count / total_questions) * 100, 1) if total_questions > 0 else 0.0
        results_serialized = json.dumps([r.model_dump() for r in results])

        with conn:
            cursor.execute(
                """
                INSERT INTO quiz_attempts (material_id, score, total_questions, attempted_at, results_json)
                VALUES (?, ?, ?, datetime('now'), ?);
                """,
                (material_id, correct_count, total_questions, results_serialized),
            )
            attempt_id = cursor.lastrowid

        cursor.execute(
            """
            SELECT qa.*, m.original_filename as material_title, s.name as subject_name
            FROM quiz_attempts qa
            LEFT JOIN materials m ON qa.material_id = m.id
            LEFT JOIN subjects s ON m.subject_id = s.id
            WHERE qa.id = ?;
            """,
            (attempt_id,),
        )
        attempt_row = cursor.fetchone()

        return QuizAttemptResponse(
            id=attempt_row["id"],
            material_id=material_id,
            material_title=attempt_row["material_title"] if attempt_row else None,
            subject_name=attempt_row["subject_name"] if attempt_row else None,
            score=correct_count,
            total_questions=total_questions,
            percentage=percentage,
            attempted_at=attempt_row["attempted_at"],
            results=results,
        )
    finally:
        conn.close()


@app.get(
    "/api/materials/{material_id}/quiz-attempts",
    response_model=List[QuizAttemptResponse],
    tags=["Quizzes"]
)
def list_quiz_attempts(material_id: int):
    """Retrieve history of quiz attempts for this material, newest first, including full answer breakdown."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM materials WHERE id = ?", (material_id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Material with ID {material_id} was not found."
            )

        cursor.execute(
            """
            SELECT qa.*, m.original_filename as material_title, s.name as subject_name
            FROM quiz_attempts qa
            LEFT JOIN materials m ON qa.material_id = m.id
            LEFT JOIN subjects s ON m.subject_id = s.id
            WHERE qa.material_id = ?
            ORDER BY qa.id DESC;
            """,
            (material_id,),
        )
        rows = cursor.fetchall()
        attempts = []
        for row in rows:
            res_list = None
            if "results_json" in row.keys() and row["results_json"]:
                try:
                    res_raw = json.loads(row["results_json"])
                    res_list = [QuestionResult(**item) for item in res_raw]
                except Exception:
                    res_list = None
            attempts.append(
                QuizAttemptResponse(
                    id=row["id"],
                    material_id=row["material_id"],
                    material_title=row["material_title"],
                    subject_name=row["subject_name"],
                    score=row["score"],
                    total_questions=row["total_questions"],
                    percentage=round((row["score"] / row["total_questions"]) * 100, 1) if row["total_questions"] > 0 else 0.0,
                    attempted_at=row["attempted_at"],
                    results=res_list,
                )
            )
        return attempts
    finally:
        conn.close()


@app.get("/api/quiz-attempts/{attempt_id}", response_model=QuizAttemptResponse, tags=["Quizzes"])
def get_quiz_attempt(attempt_id: int):
    """Retrieve full details of a specific past quiz attempt including questions, answers, and explanations."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT qa.*, m.original_filename as material_title, s.name as subject_name
            FROM quiz_attempts qa
            LEFT JOIN materials m ON qa.material_id = m.id
            LEFT JOIN subjects s ON m.subject_id = s.id
            WHERE qa.id = ?;
            """,
            (attempt_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Quiz attempt not found.")

        res_list = []
        if "results_json" in row.keys() and row["results_json"]:
            try:
                res_raw = json.loads(row["results_json"])
                res_list = [QuestionResult(**item) for item in res_raw]
            except Exception:
                res_list = []

        return QuizAttemptResponse(
            id=row["id"],
            material_id=row["material_id"],
            material_title=row["material_title"],
            subject_name=row["subject_name"],
            score=row["score"],
            total_questions=row["total_questions"],
            percentage=round((row["score"] / row["total_questions"]) * 100, 1) if row["total_questions"] > 0 else 0.0,
            attempted_at=row["attempted_at"],
            results=res_list,
        )
    finally:
        conn.close()


# ==============================================================================
# 4. Dashboard Statistics Endpoint
# ==============================================================================

@app.get("/api/dashboard/stats", response_model=DashboardStatsResponse, tags=["Dashboard"])
@app.get("/api/stats", response_model=DashboardStatsResponse, tags=["Dashboard"], include_in_schema=False)
def get_dashboard_stats():
    """Return live database counts for subjects, materials, study packs, and quiz attempts."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM subjects;")
        total_subjects = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM materials;")
        total_materials = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM study_packs;")
        total_study_packs = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM quiz_attempts;")
        total_quiz_attempts = cursor.fetchone()[0]

        return DashboardStatsResponse(
            total_subjects=total_subjects,
            total_materials=total_materials,
            total_study_packs=total_study_packs,
            total_quiz_attempts=total_quiz_attempts,
        )
    finally:
        conn.close()


# ==============================================================================
# 5. Calendar & Reminder Endpoints
# ==============================================================================

@app.get("/api/calendar/events", response_model=List[CalendarEventResponse], tags=["Calendar"])
def list_calendar_events():
    """List all upcoming examinations, deadlines, and study targets ordered by date."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT c.*, s.name as subject_name
            FROM calendar_events c
            LEFT JOIN subjects s ON c.subject_id = s.id
            ORDER BY c.event_date ASC, c.event_time ASC;
            """
        )
        rows = cursor.fetchall()
        return [
            CalendarEventResponse(
                id=r["id"],
                title=r["title"],
                event_type=r["event_type"],
                event_date=r["event_date"],
                event_time=r["event_time"],
                subject_id=r["subject_id"],
                subject_name=r["subject_name"],
                notes=r["notes"],
                reminder_offset_days=r["reminder_offset_days"],
                is_completed=bool(r["is_completed"]),
                created_at=r["created_at"],
            )
            for r in rows
        ]
    finally:
        conn.close()


@app.post("/api/calendar/events", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED, tags=["Calendar"])
def create_calendar_event(payload: CalendarEventCreate):
    """Add a new examination date, assignment deadline, or study target."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        with conn:
            cursor.execute(
                """
                INSERT INTO calendar_events (title, event_type, event_date, event_time, subject_id, notes, reminder_offset_days)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    payload.title.strip(),
                    payload.event_type.strip(),
                    payload.event_date.strip(),
                    payload.event_time,
                    payload.subject_id,
                    payload.notes,
                    payload.reminder_offset_days,
                ),
            )
            new_id = cursor.lastrowid
        cursor.execute(
            "SELECT c.*, s.name as subject_name FROM calendar_events c LEFT JOIN subjects s ON c.subject_id = s.id WHERE c.id = ?",
            (new_id,),
        )
        r = cursor.fetchone()
        return CalendarEventResponse(
            id=r["id"],
            title=r["title"],
            event_type=r["event_type"],
            event_date=r["event_date"],
            event_time=r["event_time"],
            subject_id=r["subject_id"],
            subject_name=r["subject_name"],
            notes=r["notes"],
            reminder_offset_days=r["reminder_offset_days"],
            is_completed=bool(r["is_completed"]),
            created_at=r["created_at"],
        )
    finally:
        conn.close()


@app.put("/api/calendar/events/{event_id}", response_model=CalendarEventResponse, tags=["Calendar"])
@app.patch("/api/calendar/events/{event_id}", response_model=CalendarEventResponse, tags=["Calendar"])
def update_calendar_event(event_id: int, payload: CalendarEventUpdate):
    """Update calendar event completion or details."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM calendar_events WHERE id = ?", (event_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Event not found.")

        updates = []
        params = []
        if payload.title is not None:
            updates.append("title = ?")
            params.append(payload.title.strip())
        if payload.event_type is not None:
            updates.append("event_type = ?")
            params.append(payload.event_type.strip())
        if payload.event_date is not None:
            updates.append("event_date = ?")
            params.append(payload.event_date.strip())
        if payload.event_time is not None:
            updates.append("event_time = ?")
            params.append(payload.event_time.strip() if payload.event_time else None)
        if payload.notes is not None:
            updates.append("notes = ?")
            params.append(payload.notes.strip() if payload.notes else None)
        if payload.is_completed is not None:
            updates.append("is_completed = ?")
            params.append(1 if payload.is_completed else 0)

        if updates:
            params.append(event_id)
            with conn:
                cursor.execute(f"UPDATE calendar_events SET {', '.join(updates)} WHERE id = ?", params)

        cursor.execute(
            "SELECT c.*, s.name as subject_name FROM calendar_events c LEFT JOIN subjects s ON c.subject_id = s.id WHERE c.id = ?",
            (event_id,),
        )
        r = cursor.fetchone()
        return CalendarEventResponse(
            id=r["id"],
            title=r["title"],
            event_type=r["event_type"],
            event_date=r["event_date"],
            event_time=r["event_time"],
            subject_id=r["subject_id"],
            subject_name=r["subject_name"],
            notes=r["notes"],
            reminder_offset_days=r["reminder_offset_days"],
            is_completed=bool(r["is_completed"]),
            created_at=r["created_at"],
        )
    finally:
        conn.close()


@app.delete("/api/calendar/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Calendar"])
def delete_calendar_event(event_id: int):
    """Delete a calendar event."""
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("DELETE FROM calendar_events WHERE id = ?", (event_id,))
    finally:
        conn.close()


# ==============================================================================
# 6. Sticky Notes Endpoints
# ==============================================================================

@app.get("/api/sticky-notes", response_model=List[StickyNoteResponse], tags=["Sticky Notes"])
def list_sticky_notes():
    """Retrieve all sticky notes for the dashboard."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sticky_notes ORDER BY is_pinned DESC, id DESC;")
        rows = cursor.fetchall()
        return [
            StickyNoteResponse(
                id=r["id"],
                content=r["content"],
                color=r["color"],
                is_completed=bool(r["is_completed"]),
                is_pinned=bool(r["is_pinned"]),
                created_at=r["created_at"],
            )
            for r in rows
        ]
    finally:
        conn.close()


@app.post("/api/sticky-notes", response_model=StickyNoteResponse, status_code=status.HTTP_201_CREATED, tags=["Sticky Notes"])
def create_sticky_note(payload: StickyNoteCreate):
    """Create a new sticky note."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        with conn:
            cursor.execute(
                "INSERT INTO sticky_notes (content, color, is_pinned) VALUES (?, ?, ?);",
                (payload.content.strip(), payload.color.strip(), 1 if payload.is_pinned else 0),
            )
            new_id = cursor.lastrowid
        cursor.execute("SELECT * FROM sticky_notes WHERE id = ?", (new_id,))
        r = cursor.fetchone()
        return StickyNoteResponse(
            id=r["id"],
            content=r["content"],
            color=r["color"],
            is_completed=bool(r["is_completed"]),
            is_pinned=bool(r["is_pinned"]),
            created_at=r["created_at"],
        )
    finally:
        conn.close()


@app.patch("/api/sticky-notes/{note_id}", response_model=StickyNoteResponse, tags=["Sticky Notes"])
def update_sticky_note(note_id: int, payload: StickyNoteUpdate):
    """Update note content, color, or completion toggle."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sticky_notes WHERE id = ?", (note_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Sticky note not found.")

        updates = []
        params = []
        if payload.content is not None:
            updates.append("content = ?")
            params.append(payload.content.strip())
        if payload.color is not None:
            updates.append("color = ?")
            params.append(payload.color.strip())
        if payload.is_completed is not None:
            updates.append("is_completed = ?")
            params.append(1 if payload.is_completed else 0)
        if payload.is_pinned is not None:
            updates.append("is_pinned = ?")
            params.append(1 if payload.is_pinned else 0)

        if updates:
            params.append(note_id)
            with conn:
                cursor.execute(f"UPDATE sticky_notes SET {', '.join(updates)} WHERE id = ?", params)

        cursor.execute("SELECT * FROM sticky_notes WHERE id = ?", (note_id,))
        r = cursor.fetchone()
        return StickyNoteResponse(
            id=r["id"],
            content=r["content"],
            color=r["color"],
            is_completed=bool(r["is_completed"]),
            is_pinned=bool(r["is_pinned"]),
            created_at=r["created_at"],
        )
    finally:
        conn.close()


@app.delete("/api/sticky-notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Sticky Notes"])
def delete_sticky_note(note_id: int):
    """Delete a sticky note."""
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("DELETE FROM sticky_notes WHERE id = ?", (note_id,))
    finally:
        conn.close()


# ==============================================================================
# 7. Study Timer & Productivity Endpoints
# ==============================================================================

@app.post("/api/study-timer/sessions", response_model=StudySessionResponse, status_code=status.HTTP_201_CREATED, tags=["Study Timer"])
def log_study_session(payload: StudySessionCreate):
    """Record completed focus or Pomodoro session."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        with conn:
            cursor.execute(
                """
                INSERT INTO study_sessions (subject_id, duration_seconds, session_type, notes)
                VALUES (?, ?, ?, ?);
                """,
                (payload.subject_id, payload.duration_seconds, payload.session_type, payload.notes),
            )
            new_id = cursor.lastrowid
        cursor.execute("SELECT * FROM study_sessions WHERE id = ?", (new_id,))
        r = cursor.fetchone()
        return StudySessionResponse(
            id=r["id"],
            subject_id=r["subject_id"],
            duration_seconds=r["duration_seconds"],
            session_type=r["session_type"],
            notes=r["notes"],
            completed_at=r["completed_at"],
        )
    finally:
        conn.close()


@app.get("/api/study-timer/stats", response_model=StudyTimerStatsResponse, tags=["Study Timer"])
def get_study_timer_stats():
    """Retrieve daily, weekly, and subject-wise study metrics."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Today
        cursor.execute(
            "SELECT COALESCE(SUM(duration_seconds), 0) FROM study_sessions WHERE date(completed_at) = date('now');"
        )
        today_seconds = cursor.fetchone()[0]

        # Past 7 days
        cursor.execute(
            "SELECT COALESCE(SUM(duration_seconds), 0) FROM study_sessions WHERE completed_at >= datetime('now', '-7 days');"
        )
        week_seconds = cursor.fetchone()[0]

        # Total sessions
        cursor.execute("SELECT COUNT(*) FROM study_sessions;")
        total_sessions = cursor.fetchone()[0]

        # Subject breakdown
        cursor.execute(
            """
            SELECT s.name, COALESCE(SUM(sess.duration_seconds), 0) as total_sec
            FROM study_sessions sess
            LEFT JOIN subjects s ON sess.subject_id = s.id
            GROUP BY s.id
            ORDER BY total_sec DESC;
            """
        )
        subject_breakdown = [
            {"subject_name": r["name"] or "General Study", "duration_seconds": r["total_sec"]}
            for r in cursor.fetchall()
        ]

        return StudyTimerStatsResponse(
            today_seconds=today_seconds,
            week_seconds=week_seconds,
            total_sessions=total_sessions,
            subject_breakdown=subject_breakdown,
        )
    finally:
        conn.close()


@app.get("/api/study-timer/sessions", response_model=List[StudySessionResponse], tags=["Study Timer"])
def get_study_sessions(limit: int = 15):
    """Retrieve recent study timer sessions."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT sess.*, s.name as subject_name
            FROM study_sessions sess
            LEFT JOIN subjects s ON sess.subject_id = s.id
            ORDER BY sess.id DESC
            LIMIT ?;
            """,
            (limit,),
        )
        results = []
        for r in cursor.fetchall():
            results.append(
                StudySessionResponse(
                    id=r["id"],
                    subject_id=r["subject_id"],
                    duration_seconds=r["duration_seconds"],
                    session_type=r["session_type"] or "pomodoro",
                    notes=r["notes"] or (f"Subject: {r['subject_name']}" if r["subject_name"] else "General Study"),
                    completed_at=r["completed_at"] or "",
                )
            )
        return results
    finally:
        conn.close()


# ==============================================================================
# 8. AI Voice / Study Assistant Endpoint (Hindi + English + Hinglish)
# ==============================================================================

@app.post("/api/ai/assistant", response_model=AIAssistantResponse, tags=["AI Assistant"])
def ask_ai_study_assistant(payload: AIAssistantRequest):
    """Personal multi-lingual study companion supporting Hindi, English, and Hinglish."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Gather live student context: subjects, upcoming exams, recent materials
        cursor.execute("SELECT id, name FROM subjects;")
        subjects = [{"id": r["id"], "name": r["name"]} for r in cursor.fetchall()]

        cursor.execute("SELECT title, event_type, event_date FROM calendar_events WHERE is_completed = 0 ORDER BY event_date ASC LIMIT 5;")
        upcoming_events = [{"title": r["title"], "type": r["event_type"], "date": r["event_date"]} for r in cursor.fetchall()]

        cursor.execute("SELECT original_filename, file_type FROM materials ORDER BY id DESC LIMIT 5;")
        recent_materials = [r["original_filename"] for r in cursor.fetchall()]

        student_context = {
            "student_name": "Aarav",
            "enrolled_subjects": subjects,
            "upcoming_calendar_events": upcoming_events,
            "uploaded_materials": recent_materials,
        }

        result = query_ai_assistant(payload.query, student_context, payload.language or "auto")
        return AIAssistantResponse(
            reply=result["reply"],
            detected_language=result["detected_language"],
            action_type=result.get("action_type"),
            suggested_actions=result.get("suggested_actions"),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Assistant error: {str(exc)}"
        )
    finally:
        conn.close()


# ==============================================================================
# 9. Topics & Syllabus Management Endpoints
# ==============================================================================

@app.get("/api/subjects/{subject_id}/topics", response_model=List[TopicResponse], tags=["Topics"])
def list_subject_topics(subject_id: int):
    """List topics for a subject, with automatic fallback from study packs if no manual topics yet."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM topics WHERE subject_id = ? ORDER BY sort_order ASC, id ASC;", (subject_id,))
        rows = cursor.fetchall()
        if rows:
            return [
                TopicResponse(
                    id=r["id"],
                    subject_id=r["subject_id"],
                    title=r["title"],
                    summary=r["summary"],
                    notes_markdown=r["notes_markdown"],
                    sort_order=r["sort_order"],
                    created_at=r["created_at"],
                )
                for r in rows
            ]

        # If no explicit topics exist, synthesize topics from uploaded study pack key concepts
        cursor.execute(
            """
            SELECT sp.key_concepts_json, sp.revision_notes, m.original_filename
            FROM study_packs sp
            JOIN materials m ON sp.material_id = m.id
            WHERE m.subject_id = ?
            LIMIT 1;
            """,
            (subject_id,),
        )
        sp_row = cursor.fetchone()
        if sp_row and sp_row["key_concepts_json"]:
            try:
                concepts = json.loads(sp_row["key_concepts_json"])
                synthetic = []
                for idx, c in enumerate(concepts, start=1):
                    synthetic.append(
                        TopicResponse(
                            id=idx,
                            subject_id=subject_id,
                            title=c.get("title", f"Topic {idx}"),
                            summary=c.get("explanation", ""),
                            notes_markdown=sp_row["revision_notes"],
                            sort_order=idx,
                            created_at="2026-11-02",
                        )
                    )
                return synthetic
            except Exception:
                pass

        return []
    finally:
        conn.close()


@app.post("/api/subjects/{subject_id}/syllabus", response_model=SyllabusAnalysisResponse, tags=["Syllabus"])
def map_subject_syllabus(subject_id: int, payload: SyllabusAnalysisRequest):
    """Compare uploaded course syllabus against uploaded materials and track coverage."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT extracted_text FROM materials WHERE subject_id = ?;", (subject_id,))
        materials_texts = [r["extracted_text"] for r in cursor.fetchall() if r["extracted_text"]]
        combined_text = "\n\n".join(materials_texts)

        analysis = analyze_syllabus_coverage(subject_id, payload.syllabus_text, combined_text)
        
        # Persist syllabus items into DB
        with conn:
            cursor.execute("DELETE FROM syllabus_items WHERE subject_id = ?;", (subject_id,))
            for t in analysis.get("topics", []):
                cursor.execute(
                    """
                    INSERT INTO syllabus_items (subject_id, topic_name, status, coverage_notes)
                    VALUES (?, ?, ?, ?);
                    """,
                    (subject_id, t["topic_name"], t.get("status", "pending"), t.get("coverage_notes", "")),
                )
        
        return SyllabusAnalysisResponse(
            subject_id=subject_id,
            completion_percentage=analysis.get("completion_percentage", 75),
            total_topics=analysis.get("total_topics", len(analysis.get("topics", []))),
            completed_count=analysis.get("completed_count", 0),
            in_progress_count=analysis.get("in_progress_count", 0),
            missing_count=analysis.get("missing_count", 0),
            topics=[
                SyllabusItemResponse(
                    topic_name=t["topic_name"],
                    status=t["status"],
                    coverage_notes=t.get("coverage_notes"),
                )
                for t in analysis.get("topics", [])
            ],
        )
    finally:
        conn.close()


@app.get("/api/subjects/{subject_id}/syllabus", response_model=SyllabusAnalysisResponse, tags=["Syllabus"])
def get_subject_syllabus(subject_id: int):
    """Get current syllabus audit status or construct it from enrolled topics."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM syllabus_items WHERE subject_id = ? ORDER BY id ASC;", (subject_id,))
        rows = cursor.fetchall()

        if rows:
            topics = [
                SyllabusItemResponse(
                    topic_name=r["topic_name"],
                    status=r["status"],
                    coverage_notes=r["coverage_notes"],
                )
                for r in rows
            ]
            completed = sum(1 for t in topics if t.status == "completed")
            in_progress = sum(1 for t in topics if t.status == "in_progress")
            missing = sum(1 for t in topics if t.status == "missing")
            total = len(topics)
            pct = int((completed / total) * 100) if total > 0 else 0
            return SyllabusAnalysisResponse(
                subject_id=subject_id,
                completion_percentage=pct,
                total_topics=total,
                completed_count=completed,
                in_progress_count=in_progress,
                missing_count=missing,
                topics=topics,
            )

        # Fallback: check actual extracted topics from uploaded materials
        existing_topics = list_subject_topics(subject_id)
        if existing_topics:
            topics = [
                SyllabusItemResponse(
                    topic_name=t.title,
                    status="completed",
                    coverage_notes=f"Covered in lecture slides: {t.summary[:100]}..." if t.summary else "Covered in lecture materials.",
                )
                for t in existing_topics
            ]
            return SyllabusAnalysisResponse(
                subject_id=subject_id,
                completion_percentage=100,
                total_topics=len(topics),
                completed_count=len(topics),
                in_progress_count=0,
                missing_count=0,
                topics=topics,
            )

        return SyllabusAnalysisResponse(
            subject_id=subject_id,
            completion_percentage=0,
            total_topics=0,
            completed_count=0,
            in_progress_count=0,
            missing_count=0,
            topics=[],
        )
    finally:
        conn.close()


class SubjectSyllabusUpdate(BaseModel):
    syllabus_text: str


@app.get("/api/subjects/{subject_id}/syllabus-content", tags=["Syllabus"])
def get_subject_syllabus_content(subject_id: int):
    """Retrieve simplified syllabus text and topics for a subject."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, description, syllabus_text FROM subjects WHERE id = ?", (subject_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Subject not found.")

        topics = list_subject_topics(subject_id)
        syllabus_text = row["syllabus_text"] or ""
        if not syllabus_text and topics:
            syllabus_text = "\n\n".join([f"Unit {idx}: {t.title}\n{t.summary}" for idx, t in enumerate(topics, 1)])

        return {
            "subject_id": row["id"],
            "subject_name": row["name"],
            "syllabus_text": syllabus_text,
            "topics": [t.model_dump() for t in topics]
        }
    finally:
        conn.close()


@app.put("/api/subjects/{subject_id}/syllabus-content", tags=["Syllabus"])
def update_subject_syllabus_content(subject_id: int, payload: SubjectSyllabusUpdate):
    """Update syllabus text outline for a subject."""
    conn = get_db_connection()
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE subjects SET syllabus_text = ?, updated_at = datetime('now') WHERE id = ?",
                (payload.syllabus_text.strip(), subject_id)
            )
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Subject not found.")
        return {"status": "success", "message": "Syllabus updated successfully."}
    finally:
        conn.close()


@app.get("/api/recommendations", tags=["Recommendations"])
def get_study_recommendations():
    """AI study recommendations based on exams, deadlines, and weak quiz performance."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT title, event_date FROM calendar_events WHERE is_completed = 0 ORDER BY event_date ASC LIMIT 1;")
        exam_row = cursor.fetchone()

        cursor.execute("SELECT s.name FROM subjects s JOIN materials m ON s.id = m.subject_id LIMIT 1;")
        sub_row = cursor.fetchone()
        subject_name = sub_row[0] if sub_row else "Economics"

        if exam_row:
            rec_text = f"Your next major milestone is '{exam_row['title']}' on {exam_row['event_date']}. Recommended: Review {subject_name} Unit 1 & Circular-Flow Model today."
        else:
            rec_text = f"You are making steady progress in {subject_name}. Recommended: Take a 10-question practice quiz to test your concept retention."

        return {
            "recommended_action": rec_text,
            "target_subject": subject_name,
            "daily_focus_minutes": 50,
            "priority": "high",
        }
    finally:
        conn.close()


# ==============================================================================
# 5. Frontend Static File Routes (Mounted After API Routes)
# ==============================================================================

@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
@app.api_route("/index.html", methods=["GET", "HEAD"], include_in_schema=False)
def serve_index():
    """Serve the home dashboard."""
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "LearnMate AI API is running. Frontend index.html not yet found."}


@app.api_route("/subject.html", methods=["GET", "HEAD"], include_in_schema=False)
def serve_subject_page():
    """Serve the subject workspace page."""
    subject_file = FRONTEND_DIR / "subject.html"
    if subject_file.exists():
        return FileResponse(subject_file)
    return {"message": "Subject workspace page not yet found."}


@app.api_route("/calendar.html", methods=["GET", "HEAD"], include_in_schema=False)
def serve_calendar():
    """Serve the dedicated study calendar page."""
    cal_file = FRONTEND_DIR / "calendar.html"
    if cal_file.exists():
        return FileResponse(cal_file)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar page not found.")


@app.api_route("/quiz.html", methods=["GET", "HEAD"], include_in_schema=False)
def serve_quiz():
    """Serve the dedicated quiz and practice hub page."""
    quiz_file = FRONTEND_DIR / "quiz.html"
    if quiz_file.exists():
        return FileResponse(quiz_file)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz page not found.")


@app.api_route("/timer.html", methods=["GET", "HEAD"], include_in_schema=False)
def serve_timer():
    """Serve the dedicated focus timer page."""
    timer_file = FRONTEND_DIR / "timer.html"
    if timer_file.exists():
        return FileResponse(timer_file)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timer page not found.")


@app.api_route("/notes.html", methods=["GET", "HEAD"], include_in_schema=False)
def serve_notes():
    """Serve the 3-level structured notes page."""
    notes_file = FRONTEND_DIR / "notes.html"
    if notes_file.exists():
        return FileResponse(notes_file)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notes page not found.")


@app.get("/api/analytics", tags=["Analytics"])
def get_analytics_overview():
    """Retrieve comprehensive student academic performance, mastery, and study analytics."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # 1. Total Subjects count
        cursor.execute("SELECT COUNT(*) AS total FROM subjects;")
        total_subjects = cursor.fetchone()["total"]

        # 2. Total Materials count
        cursor.execute("SELECT COUNT(*) AS total FROM materials;")
        total_materials = cursor.fetchone()["total"]

        # 3. Total Study Packs generated
        cursor.execute("SELECT COUNT(*) AS total FROM study_packs;")
        total_study_packs = cursor.fetchone()["total"]

        # 4. Total Quiz Attempts & Average Score
        cursor.execute("""
            SELECT COUNT(*) AS total_attempts,
                   AVG(CASE WHEN total_questions > 0 THEN (score * 100.0 / total_questions) ELSE 0 END) AS avg_score,
                   SUM(CASE WHEN total_questions > 0 AND (score * 100.0 / total_questions) >= 60 THEN 1 ELSE 0 END) AS passed_attempts
            FROM quiz_attempts;
        """)
        quiz_stats = cursor.fetchone()
        total_quiz_attempts = quiz_stats["total_attempts"] or 0
        avg_quiz_score = round(quiz_stats["avg_score"] or 0, 1)
        passed_attempts = quiz_stats["passed_attempts"] or 0
        passing_rate = round((passed_attempts / total_quiz_attempts * 100), 1) if total_quiz_attempts > 0 else 0

        # 5. Study Timer Stats
        cursor.execute("""
            SELECT COUNT(*) AS total_sessions,
                   COALESCE(SUM(duration_seconds), 0) AS total_focus_seconds
            FROM study_sessions;
        """)
        timer_stats = cursor.fetchone()
        total_timer_sessions = timer_stats["total_sessions"] or 0
        total_focus_minutes = round((timer_stats["total_focus_seconds"] or 0) / 60)

        # 6. Subject-by-Subject Performance Breakdown
        cursor.execute("""
            SELECT s.id, s.name, s.description,
                   COUNT(DISTINCT m.id) AS materials_count,
                   COUNT(DISTINCT t.id) AS topics_count,
                   COUNT(DISTINCT qa.id) AS quiz_attempts_count,
                   ROUND(AVG(CASE WHEN qa.total_questions > 0 THEN (qa.score * 100.0 / qa.total_questions) ELSE NULL END), 1) AS subject_avg_score
            FROM subjects s
            LEFT JOIN materials m ON s.id = m.subject_id
            LEFT JOIN topics t ON s.id = t.subject_id
            LEFT JOIN quiz_attempts qa ON m.id = qa.material_id
            GROUP BY s.id
            ORDER BY s.id ASC;
        """)
        subject_rows = cursor.fetchall()
        subjects_data = []
        for row in subject_rows:
            subjects_data.append({
                "id": row["id"],
                "name": row["name"],
                "description": row["description"] or "",
                "materials_count": row["materials_count"] or 0,
                "topics_count": row["topics_count"] or 0,
                "quiz_attempts_count": row["quiz_attempts_count"] or 0,
                "avg_score": row["subject_avg_score"] if row["subject_avg_score"] is not None else 0,
            })

        # 7. Recent Quiz Attempts
        cursor.execute("""
            SELECT qa.id, qa.material_id, qa.score, qa.total_questions,
                   ROUND(CASE WHEN qa.total_questions > 0 THEN (qa.score * 100.0 / qa.total_questions) ELSE 0 END, 1) AS percentage,
                   qa.attempted_at,
                   m.original_filename AS material_title,
                   s.name AS subject_name,
                   s.id AS subject_id
            FROM quiz_attempts qa
            JOIN materials m ON qa.material_id = m.id
            JOIN subjects s ON m.subject_id = s.id
            ORDER BY qa.id DESC
            LIMIT 10;
        """)
        recent_attempts = [dict(r) for r in cursor.fetchall()]

        return {
            "total_subjects": total_subjects,
            "total_materials": total_materials,
            "total_study_packs": total_study_packs,
            "total_quiz_attempts": total_quiz_attempts,
            "avg_quiz_score": avg_quiz_score,
            "passing_rate": passing_rate,
            "total_focus_minutes": total_focus_minutes,
            "total_timer_sessions": total_timer_sessions,
            "subjects": subjects_data,
            "recent_quizzes": recent_attempts
        }
    finally:
        conn.close()


@app.api_route("/syllabus.html", methods=["GET", "HEAD"], include_in_schema=False)
def serve_syllabus():
    """Redirect legacy syllabus link to the modern Analytics dashboard."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/analytics.html", status_code=302)


@app.api_route("/{page}.html", methods=["GET", "HEAD"], include_in_schema=False)
def serve_any_html(page: str):
    """Fallback route for any HTML file in frontend root."""
    target = FRONTEND_DIR / f"{page}.html"
    if target.exists():
        return FileResponse(target)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found.")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """Return empty 204 for browser favicon requests."""
    from fastapi import Response
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/admin.html", include_in_schema=False)
def redirect_admin():
    """Redirect lingering browser tabs from earlier activity to LearnMate AI dashboard."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/")



# Mount css and js static directories
if FRONTEND_DIR.exists():
    css_dir = FRONTEND_DIR / "css"
    js_dir = FRONTEND_DIR / "js"
    css_dir.mkdir(parents=True, exist_ok=True)
    js_dir.mkdir(parents=True, exist_ok=True)

    app.mount("/css", StaticFiles(directory=str(css_dir)), name="css")
    app.mount("/js", StaticFiles(directory=str(js_dir)), name="js")

