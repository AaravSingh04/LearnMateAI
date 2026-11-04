# LearnMate AI — Personal Learning Hub

> **A student-friendly study workspace to organize course materials across multiple subjects and generate AI study packs with summaries, key concepts, revision notes, and server-graded quizzes.**

---

## 1. What LearnMate AI Does

Students receive lecture slides and reading materials across multiple university courses throughout a semester. Keeping notes, core definitions, revision summaries, and practice quizzes organized across subjects can become chaotic.

**LearnMate AI** solves this problem by providing:
- **Multi-Subject Management:** Add, open, rename, and delete subjects with strictly isolated workspaces.
- **Course Material Ingestion:** Upload lecture slides (`.pptx`) and documents (`.pdf`), extracting selectable text immediately.
- **AI-Powered Study Packs:** With Google Gemini AI configured on the backend, automatically generate:
  - An executive summary of the lecture.
  - Core key concepts with plain-English definitions.
  - Structured, bulleted revision notes with headings.
  - At least 5 multiple-choice practice questions.
- **Interactive Knowledge Checks:** Take quizzes in the workspace where answers are evaluated and graded strictly by the backend server, tracking previous attempt history.
- **Local Persistence:** All subjects, files, study packs, questions, and quiz attempts are saved locally in SQLite and persist across server restarts.

---

## 2. System Architecture in Plain English

```
┌────────────────────────────────────────────────────────┐
│             FRONTEND (Client / Browser)                │
│  - HTML5 + Tailwind CSS (Responsive Desktop & Mobile)  │
│  - Vanilla JavaScript (app.js, subject.js)             │
│  - Renders dashboard, subject workspaces, and quizzes  │
└───────────────────────────▲────────────────────────────┘
                            │ REST API (JSON / FormData)
┌───────────────────────────▼────────────────────────────┐
│              BACKEND (FastAPI / Python)                │
│  - REST Endpoints (/api/subjects, /api/materials, etc) │
│  - File Processing (pypdf, python-pptx)                │
│  - Server-Side Quiz Grading & Input Validation         │
└─────────────▲───────────────────────────▲──────────────┘
              │                           │ Official SDK
┌─────────────▼───────────────┐ ┌─────────▼──────────────┐
│     DATABASE & STORAGE      │ │   AI SERVICE (Backend) │
│  - SQLite (data/learnmate.db)│ │  - Google GenAI SDK   │
│  - Foreign Keys & Cascades  │ │  - Structured Output   │
│  - Local Uploads Directory  │ │  - Gemini 2.5 Flash    │
└─────────────────────────────┘ └────────────────────────┘
```

- **Frontend / Client (`frontend/`):** A lightweight, reactive single-page experience using HTML, Tailwind CSS, and standard JavaScript. It communicates with the backend exclusively via asynchronous `fetch()` API calls and never holds database credentials or AI API keys.
- **Backend / Server (`backend/main.py`):** Built with Python and FastAPI. Serves as the central controller for validating client inputs, extracting document text, coordinating AI generation, grading student quiz answers, and serving the frontend.
- **Database (`backend/database.py`):** A local SQLite database (`data/learnmate.db`) configured with foreign-key cascades. Deleting a subject cleanly cascades to delete materials, study packs, quiz questions, and attempts.
- **AI Service (`backend/ai_service.py`):** Uses the current official Google GenAI Python SDK (`google-genai`). Prompts the model with strict grounding instructions to only use uploaded material and return valid structured JSON schemas.

---

## 3. Required Software

- **Operating System:** Windows 10/11, macOS, or Linux.
- **Python:** Python 3.10+ (tested with Python 3.13.1).
- **Web Browser:** Any modern browser (Chrome, Edge, Firefox, Safari).
- **Postman:** Optional, for automated or manual API testing.

---

## 4. Windows Setup Commands

Open PowerShell or Command Prompt in the `LearnMateAI_Project` directory:

### Step 1 — Check Python and Pip
```powershell
py --version
py -m pip --version
```

### Step 2 — (Optional) Create a Virtual Environment
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Step 3 — Install Required Dependencies
```powershell
py -m pip install -r requirements.txt
```

---

## 5. Configuring Google Gemini AI (.env)

The AI study-pack generator requires a free Google Gemini API key:

1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. In the `LearnMateAI_Project` root, copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Open `.env` and insert your API key:
   ```env
   GEMINI_API_KEY=AIzaSy...YourRealKeyHere
   GEMINI_MODEL=gemini-2.5-flash
   ```

> **Security Note:** `.env` is listed in `.gitignore` and is never committed to version control or exposed to the frontend browser. If no key is configured, the rest of the app (subject management, file uploads, text extraction) remains fully functional, displaying a friendly configuration message when a study pack is requested.

---

## 6. Starting the Server

Run the application using Uvicorn:

```powershell
py -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Web Application URL:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Interactive Swagger API Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative ReDoc Documentation:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 7. REST API Endpoints

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `GET` | `/api/dashboard/stats` | Live counts for subjects, materials, packs, and quiz attempts |
| **Subjects** | `GET` | `/api/subjects` | List all subjects alphabetically with material counts |
| | `POST` | `/api/subjects` | Create a new subject (rejects duplicates & empty names) |
| | `GET` | `/api/subjects/{subject_id}` | Retrieve single subject metadata |
| | `PATCH` | `/api/subjects/{subject_id}` | Update subject name or description |
| | `DELETE` | `/api/subjects/{subject_id}` | Delete subject, cascading records and disk files |
| **Materials** | `POST` | `/api/subjects/{subject_id}/materials` | Upload PDF or PPTX, extract text, store file safely |
| | `GET` | `/api/subjects/{subject_id}/materials` | List uploads for a specific subject (newest first) |
| | `GET` | `/api/materials/{material_id}` | Retrieve material processing status |
| | `DELETE` | `/api/materials/{material_id}` | Delete material, associated study packs, and disk file |
| **Study Packs** | `POST` | `/api/materials/{material_id}/generate-study-pack` | Generate AI summary, concepts, notes, and quiz |
| | `GET` | `/api/materials/{material_id}/study-pack` | Retrieve saved study pack and questions |
| **Quizzes** | `POST` | `/api/materials/{material_id}/quiz-attempts` | Submit answers for server-side score calculation |
| | `GET` | `/api/materials/{material_id}/quiz-attempts` | View past quiz attempt history |

---

## 8. Current Limitations (Classroom MVP)

1. **Supported Formats:** Only `.pdf` and `.pptx` documents are supported.
2. **Selectable Text Only:** Documents must have selectable text. Scanned or image-only documents require Optical Character Recognition (OCR), which is outside the scope of this classroom version.
3. **Local Storage:** Files are stored under `data/uploads/` and data in SQLite `data/learnmate.db`.
4. **AI Generation:** Requires an internet connection and a configured `GEMINI_API_KEY`.
5. **Single Student MVP:** User authentication, multi-tenancy, and cloud databases are deferred to future production versions.

---

## 9. Product Architecture Reflection

- **Frontend / Client:** Presents a clean, distraction-free user interface for the student. Formulates requests, visualizes live data, and provides immediate responsive feedback without requiring full-page reloads.
- **Backend / Server:** Acts as the authority for business logic. Enforces validation rules (e.g. unique subject names, max 20MB file limits), protects secrets like the Gemini API key, and calculates quiz scores securely so students cannot tamper with grades in the browser.
- **APIs:** Act as the contract between the frontend and backend. Predictable status codes (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `409 Conflict`, `503 Service Unavailable`) ensure both layers communicate reliably.
- **Database:** Delivers persistent state. Ensures that when the server restarts or a student refreshes their browser, all subjects, uploaded slides, generated notes, and past quiz attempts remain intact.
