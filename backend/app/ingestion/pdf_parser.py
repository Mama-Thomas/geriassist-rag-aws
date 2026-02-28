from PyPDF2 import PdfReader
import re


def extract_text_from_pdf(file_path: str) -> str:
    """Extract and clean text from a PDF file."""
    reader = PdfReader(file_path)
    text_parts = []

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)

    raw_text = "\n".join(text_parts)
    return clean_text(raw_text)


def extract_text_from_txt(file_path: str) -> str:
    """Read and clean a plain text file."""
    with open(file_path, "r", encoding="utf-8") as f:
        return clean_text(f.read())


def clean_text(text: str) -> str:
    """Normalize whitespace, remove common PDF artifacts."""
    text = text.replace("\x00", "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)   # Collapse excessive newlines
    text = re.sub(r"[ \t]+", " ", text)       # Collapse spaces/tabs
    return text.strip()
