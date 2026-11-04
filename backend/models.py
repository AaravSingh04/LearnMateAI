"""Pydantic data models for LearnMate AI.

Defines typed request and response schemas for subjects, materials,
study packs, quizzes, and dashboard metrics with clear validation rules.
"""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# ==========================================
# Subject Models
# ==========================================

class SubjectCreate(BaseModel):
    """Payload to create a new subject."""
    name: str = Field(..., min_length=1, max_length=100, description="Subject name")
    description: Optional[str] = Field(None, max_length=500, description="Optional subject description")

    @field_validator("name")
    @classmethod
    def validate_name_not_blank(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Subject name cannot be empty or only whitespace.")
        return trimmed

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            trimmed = value.strip()
            return trimmed if trimmed else None
        return None


class SubjectUpdate(BaseModel):
    """Payload to rename or update a subject's description."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            trimmed = value.strip()
            if not trimmed:
                raise ValueError("Subject name cannot be empty or only whitespace.")
            return trimmed
        return None


class SubjectResponse(BaseModel):
    """Subject details returned to the frontend."""
    id: int
    name: str
    description: Optional[str] = None
    created_at: str
    updated_at: str
    materials_count: int = 0
    topics_count: int = 0
    progress_percent: int = 0


# ==========================================
# Calendar & Reminder Models
# ==========================================

class CalendarEventCreate(BaseModel):
    """Payload to create a new calendar event."""
    title: str = Field(..., min_length=1, max_length=200)
    event_type: str = Field("exam", description="exam, assignment, project, presentation, study")
    event_date: str = Field(..., description="YYYY-MM-DD")
    event_time: Optional[str] = None
    subject_id: Optional[int] = None
    notes: Optional[str] = None
    reminder_offset_days: int = 1


class CalendarEventUpdate(BaseModel):
    """Payload to update calendar event."""
    title: Optional[str] = None
    event_type: Optional[str] = None
    event_date: Optional[str] = None
    event_time: Optional[str] = None
    is_completed: Optional[bool] = None
    notes: Optional[str] = None


class CalendarEventResponse(BaseModel):
    """Calendar event item."""
    id: int
    title: str
    event_type: str
    event_date: str
    event_time: Optional[str] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    notes: Optional[str] = None
    reminder_offset_days: int = 1
    is_completed: bool = False
    created_at: str


# ==========================================
# Sticky Notes Models
# ==========================================

class StickyNoteCreate(BaseModel):
    """Payload to create a sticky note."""
    content: str = Field(..., min_length=1, max_length=300)
    color: str = Field("purple", description="yellow, purple, cyan, green, pink")
    is_pinned: bool = False


class StickyNoteUpdate(BaseModel):
    """Payload to update sticky note."""
    content: Optional[str] = None
    color: Optional[str] = None
    is_completed: Optional[bool] = None
    is_pinned: Optional[bool] = None


class StickyNoteResponse(BaseModel):
    """Sticky note item."""
    id: int
    content: str
    color: str
    is_completed: bool
    is_pinned: bool
    created_at: str


# ==========================================
# Study Timer & Productivity Models
# ==========================================

class StudySessionCreate(BaseModel):
    """Log a completed focus or Pomodoro session."""
    subject_id: Optional[int] = None
    duration_seconds: int = Field(..., ge=1)
    session_type: str = Field("pomodoro", description="pomodoro or custom")
    notes: Optional[str] = None


class StudySessionResponse(BaseModel):
    """Logged study session."""
    id: int
    subject_id: Optional[int] = None
    duration_seconds: int
    session_type: str
    notes: Optional[str] = None
    completed_at: str


class StudyTimerStatsResponse(BaseModel):
    """Productivity metrics."""
    today_seconds: int = 0
    week_seconds: int = 0
    total_sessions: int = 0
    subject_breakdown: List[dict] = []


# ==========================================
# Topic Management Models
# ==========================================

class TopicCreate(BaseModel):
    """Create a structured topic within a subject."""
    title: str = Field(..., min_length=1, max_length=200)
    summary: Optional[str] = None
    notes_markdown: Optional[str] = None
    sort_order: int = 0


class TopicResponse(BaseModel):
    """Topic item."""
    id: int
    subject_id: int
    title: str
    summary: Optional[str] = None
    notes_markdown: Optional[str] = None
    sort_order: int = 0
    created_at: str


# ==========================================
# Syllabus Mapping Models
# ==========================================

class SyllabusAnalysisRequest(BaseModel):
    """Input syllabus text or topics to analyze."""
    syllabus_text: str = Field(..., min_length=5)


class SyllabusItemResponse(BaseModel):
    """Individual syllabus topic coverage."""
    topic_name: str
    status: str = Field(..., description="completed, in_progress, missing")
    coverage_notes: Optional[str] = None


class SyllabusAnalysisResponse(BaseModel):
    """Syllabus coverage report."""
    subject_id: int
    completion_percentage: int
    total_topics: int
    completed_count: int
    in_progress_count: int
    missing_count: int
    topics: List[SyllabusItemResponse]


# ==========================================
# AI Voice / Chat Assistant Models
# ==========================================

class AIAssistantRequest(BaseModel):
    """Message sent to the personal AI study companion."""
    query: str = Field(..., min_length=1)
    subject_id: Optional[int] = None
    language: Optional[str] = Field("auto", description="auto, en, hi, hinglish")


class AIAssistantResponse(BaseModel):
    """Response from AI study companion."""
    reply: str
    detected_language: str = "en"
    action_type: Optional[str] = None  # e.g., 'calendar_event', 'study_tip', 'explanation'
    suggested_actions: Optional[List[str]] = None


# ==========================================
# Material Models
# ==========================================

class MaterialResponse(BaseModel):
    """Summary metadata of an uploaded study material."""
    id: int
    subject_id: int
    original_filename: str
    stored_filename: str
    file_type: str
    uploaded_at: str
    processing_status: str
    has_study_pack: bool = False
    self_notes: Optional[str] = ""


class SelfNotesUpdateRequest(BaseModel):
    """Payload to update student's personal typed notes."""
    self_notes: str = Field(default="", description="Student's personal typed notes")


class MaterialDetailResponse(MaterialResponse):
    """Detailed material information including extracted text (internal use)."""
    extracted_text: Optional[str] = None


# ==========================================
# Key Concept & Question Sub-models
# ==========================================

class KeyConcept(BaseModel):
    """A key concept extracted from course material."""
    title: str = Field(..., description="Concept heading / title")
    explanation: str = Field(..., description="In-depth, plain-English conceptual explanation of the mechanism and importance")
    example: Optional[str] = Field(default=None, description="Concrete real-world or lecture-based example illustrating the concept in practice")


class QuizQuestionItem(BaseModel):
    """Single question structure for AI generation and storage."""
    question_text: str = Field(..., description="Clear, scenario-based or conceptual question prompt directly testing the material")
    options: List[str] = Field(..., min_length=4, max_length=4, description="Four plausible, distinct answer choices (one correct, three plausible distractors)")
    correct_option_index: int = Field(..., ge=0, le=3, description="0-indexed indicator of the correct choice")
    explanation: str = Field(
        ...,
        description="Comprehensive pedagogical breakdown explaining why the correct choice is true, why the distractors are incorrect/misconceptions, and the key rule to remember"
    )


class QuizQuestionResponse(BaseModel):
    """Quiz question sent to the user when taking a quiz."""
    id: int
    material_id: int
    question_text: str
    options: List[str]
    # explanation and correct_option_index omitted or optional during active test


# ==========================================
# Study Pack Models
# ==========================================

class StudyPackContent(BaseModel):
    """Structured AI output schema for study pack generation."""
    summary: str = Field(..., description="Comprehensive academic executive summary covering core themes and frameworks")
    key_concepts: List[KeyConcept] = Field(..., description="Core conceptual pillars with deep mechanisms and applied examples")
    revision_notes: str = Field(
        ...,
        description="Exhaustive, deeply detailed textbook-grade pedagogical revision notes in Markdown. For every topic, provide an intuitive conceptual explanation, real-life analogies, underlying mechanisms, formulas/models walkthroughs, step-by-step numerical calculations where applicable, and high-yield exam traps."
    )
    practice_questions: List[QuizQuestionItem] = Field(
        ..., min_length=5, description="At least 5 multiple choice questions with thorough 3-part pedagogical explanations"
    )


class StudyPackResponse(BaseModel):
    """Full study pack payload delivered to the workspace UI."""
    id: int
    material_id: int
    summary: str
    key_concepts: List[KeyConcept]
    revision_notes: str
    generated_at: str
    model_name: str
    questions: List[QuizQuestionResponse] = []
    self_notes: Optional[str] = ""


# ==========================================
# Quiz Attempt & Submission Models
# ==========================================

class QuizAnswerSubmission(BaseModel):
    """User choice for a single question."""
    question_id: int
    selected_option_index: int = Field(..., ge=0, le=3)


class QuizSubmissionRequest(BaseModel):
    """Submitted quiz containing answers for all questions."""
    answers: List[QuizAnswerSubmission] = Field(..., min_length=1)


class QuestionResult(BaseModel):
    """Graded result for one question."""
    question_id: int
    question_text: str
    options: List[str]
    selected_option_index: int
    correct_option_index: int
    is_correct: bool
    explanation: str


class QuizAttemptResponse(BaseModel):
    """Server-graded quiz result."""
    id: int
    material_id: int
    material_title: Optional[str] = None
    subject_name: Optional[str] = None
    score: int
    total_questions: int
    percentage: float
    attempted_at: str
    results: Optional[List[QuestionResult]] = None


# ==========================================
# Dashboard Statistics Model
# ==========================================

class DashboardStatsResponse(BaseModel):
    """Live statistics displayed on the home dashboard."""
    total_subjects: int
    total_materials: int
    total_study_packs: int
    total_quiz_attempts: int
