"""File validation and text extraction services for LearnMate AI.

Designed to be resilient, clear, and approachable for non-engineering Product Management students.
Extracts text from lecture slides (.pptx, .ppt) and documents (.pdf) while enforcing
safe storage and clean validation boundaries.
"""

import os
import re
import uuid
from pathlib import Path
from typing import Optional
from pypdf import PdfReader
from pptx import Presentation

# Maximum allowed file upload size: 25 Megabytes
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

# Supported file extensions (case-insensitive)
ALLOWED_EXTENSIONS = {".pdf", ".pptx", ".ppt", ".docx", ".txt"}

# Common MIME types for validation
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/octet-stream",
    "application/x-zip-compressed",
}


def validate_file_metadata(original_filename: str, file_size: int, content_type: Optional[str] = None) -> str:
    """Validate upload filename, file extension, and file size.

    Returns the normalized lower-case extension (e.g. '.pdf', '.pptx', '.ppt', '.docx', '.txt') if valid.
    Raises ValueError with a friendly explanation if invalid.
    """
    if not original_filename or not original_filename.strip():
        raise ValueError("Filename is missing. Please select a valid file to upload.")

    ext = Path(original_filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file format '{ext}'. StudyAI LMS accepts PowerPoint (.pptx, .ppt), PDF (.pdf), Word (.docx), and Text (.txt) files."
        )

    if file_size <= 0:
        raise ValueError("The selected file is empty (0 bytes). Please upload a file with content.")

    if file_size > MAX_FILE_SIZE_BYTES:
        max_mb = MAX_FILE_SIZE_BYTES // (1024 * 1024)
        actual_mb = round(file_size / (1024 * 1024), 2)
        raise ValueError(
            f"File is too large ({actual_mb} MB). The maximum allowed upload size is {max_mb} MB."
        )

    return ext


def generate_safe_filename(original_filename: str) -> str:
    """Create a unique, unguessable filename using a UUID to prevent path traversal

    and filesystem collisions. Keeps the original extension.
    """
    ext = Path(original_filename).suffix.lower()
    unique_id = uuid.uuid4().hex
    return f"{unique_id}{ext}"


def extract_text_from_pdf(file_path: Path) -> str:
    """Extract selectable text from a PDF document using pypdf.

    Reads page by page and concatenates extracted text.
    """
    try:
        reader = PdfReader(str(file_path))
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:
                raise ValueError("This PDF is password-protected and cannot be read.")

        extracted_pages = []
        for index, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_pages.append(f"--- Page {index + 1} ---\n{page_text.strip()}")

        return "\n\n".join(extracted_pages).strip()
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Could not read PDF file: {str(exc)}")


def _extract_shape_text(shape) -> list[str]:
    """Recursively extract text from a PowerPoint shape, including group shapes and tables."""
    texts = []
    # 1. Text frame (titles, text boxes, callouts)
    if shape.has_text_frame:
        for paragraph in shape.text_frame.paragraphs:
            t = paragraph.text.strip()
            if t:
                texts.append(t)
    # 2. Table cells
    elif shape.has_table:
        for row in shape.table.rows:
            row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_text:
                texts.append(" | ".join(row_text))
    # 3. Group shape (recursive extraction for nested shapes)
    elif hasattr(shape, "shapes"):
        for sub_shape in shape.shapes:
            texts.extend(_extract_shape_text(sub_shape))

    return texts


def extract_text_from_pptx(file_path: Path) -> str:
    """Extract text from a PowerPoint presentation (.pptx) using python-pptx.

    Gathers text from all shapes, slide titles, notes, tables, and nested group shapes.
    """
    try:
        presentation = Presentation(str(file_path))
        slide_texts = []

        for slide_num, slide in enumerate(presentation.slides, start=1):
            current_slide_parts = []

            for shape in slide.shapes:
                current_slide_parts.extend(_extract_shape_text(shape))

            # Inspect speaker notes if available
            if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                notes_text = slide.notes_slide.notes_text_frame.text.strip()
                if notes_text:
                    current_slide_parts.append(f"[Notes: {notes_text}]")

            if current_slide_parts:
                slide_content = "\n".join(current_slide_parts)
                slide_texts.append(f"--- Slide {slide_num} ---\n{slide_content}")

        return "\n\n".join(slide_texts).strip()
    except Exception as exc:
        # If python-pptx fails (e.g. legacy binary ppt named pptx), attempt binary fallback
        fallback = extract_text_from_ppt_binary(file_path)
        if fallback:
            return fallback
        raise ValueError(f"Could not read PowerPoint presentation: {str(exc)}")


def extract_text_from_ppt_binary(file_path: Path) -> str:
    """Fallback text extraction for legacy binary PowerPoint files (.ppt).

    Scans the binary stream for UTF-16LE and ASCII text runs.
    """
    try:
        with open(file_path, "rb") as f:
            data = f.read()

        extracted_lines = []

        # Find UTF-16LE text sequences (standard in PowerPoint text atoms)
        for match in re.finditer(b"(?:[\x20-\x7E\n\r\t]\x00){4,}", data):
            try:
                text = match.group(0).decode("utf-16le", errors="ignore").strip()
                # Clean up and ignore binary noise
                if len(text) > 3 and not text.startswith(("\x00", "Font", "Default", "Arial", "Times", "Calibri")):
                    extracted_lines.append(text)
            except Exception:
                pass

        # Find ASCII text sequences
        for match in re.finditer(b"[\x20-\x7E\n\r\t]{5,}", data):
            try:
                text = match.group(0).decode("latin-1", errors="ignore").strip()
                if len(text) > 4 and not text.startswith(("Normal", "Default", "Courier", "Wingdings", "Symbol")):
                    extracted_lines.append(text)
            except Exception:
                pass

        # Deduplicate while preserving order
        seen = set()
        unique_lines = []
        for line in extracted_lines:
            if line not in seen:
                seen.add(line)
                unique_lines.append(line)

        return "\n".join(unique_lines).strip()
    except Exception as exc:
        raise ValueError(f"Could not read legacy PowerPoint file: {str(exc)}")


def extract_text_from_docx(file_path: Path) -> str:
    """Extract text from a Word document (.docx) using python-docx."""
    try:
        from docx import Document
        doc = Document(str(file_path))
        extracted_paragraphs = []
        for p in doc.paragraphs:
            text = p.text.strip()
            if text:
                extracted_paragraphs.append(text)
        for table in doc.tables:
            for row in table.rows:
                row_text = [c.text.strip() for c in row.cells if c.text.strip()]
                if row_text:
                    extracted_paragraphs.append(" | ".join(row_text))
        return "\n\n".join(extracted_paragraphs).strip()
    except Exception as exc:
        raise ValueError(f"Could not read Word document (.docx): {str(exc)}")


def extract_text_from_txt(file_path: Path) -> str:
    """Extract text from a plain text file (.txt)."""
    try:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read().strip()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="latin-1") as f:
                return f.read().strip()
    except Exception as exc:
        raise ValueError(f"Could not read text file (.txt): {str(exc)}")


def extract_text_from_file(file_path: Path) -> str:
    """Extract and validate text from a supported file (.pdf, .pptx, .ppt, .docx, .txt).

    Ensures meaningful textual content exists. Explains when OCR is needed.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"File not found at {file_path}")

    ext = file_path.suffix.lower()
    if ext == ".pdf":
        raw_text = extract_text_from_pdf(file_path)
    elif ext == ".pptx":
        raw_text = extract_text_from_pptx(file_path)
    elif ext == ".ppt":
        raw_text = extract_text_from_ppt_binary(file_path)
    elif ext == ".docx":
        raw_text = extract_text_from_docx(file_path)
    elif ext == ".txt":
        raw_text = extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")

    cleaned = raw_text.strip()
    if len(cleaned) < 10:
        raise ValueError(
            "No readable text could be extracted from this document. "
            "The file may be empty, password-protected, or composed entirely of scanned images. "
            "Note: Optical Character Recognition (OCR) is not supported in this classroom version."
        )

    return cleaned
