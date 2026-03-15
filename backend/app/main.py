import os
import shutil
import json
import re
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

from app.db.database import get_db, init_db
from app.db.models import Document, Chunk, QueryLog
from app.retrieval.vector_store import FAISSVectorStore
from app.generation.rag import query_rag
from app.ingestion.pipeline import ingest_document

# ── Rate Limiter ──────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/hour"])

# ── App Setup ────────────────────────────────
app = FastAPI(
    title="GeriAssist RAG API",
    description="Geriatric Clinical Knowledge Retrieval-Augmented Generation System",
    version="0.1.0",
    # Hide docs in production — set HIDE_DOCS=true in .env to disable
    docs_url=None if os.getenv("HIDE_DOCS", "false").lower() == "true" else "/docs",
    redoc_url=None if os.getenv("HIDE_DOCS", "false").lower() == "true" else "/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────
# In production set ALLOWED_ORIGINS=https://yourdomain.com in .env
# For local dev, defaults to localhost:3000
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,          # No cookies needed
    allow_methods=["GET", "POST"],    # Only what we use
    allow_headers=["Content-Type"],
)

# ── Global vector store ───────────────────────
vector_store = FAISSVectorStore(
    dimension=1536,
    index_path=os.getenv("FAISS_INDEX_PATH", "faiss_index"),
)


@app.on_event("startup")
async def startup():
    init_db()


# ── Constants ────────────────────────────────
MAX_QUESTION_LENGTH = 500   # characters
MAX_TOP_K = 20
MIN_TOP_K = 1
MAX_FILE_SIZE_MB = 10
ALLOWED_FILE_EXTENSIONS = {".pdf", ".txt"}


# ── Input sanitization ───────────────────────
def sanitize_text(text: str) -> str:
    """Strip control characters and normalize whitespace."""
    # Remove null bytes and control chars (keep newlines/tabs)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    # Normalize whitespace
    text = " ".join(text.split())
    return text.strip()


# ── Request Models ───────────────────────────
class QueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=MAX_QUESTION_LENGTH)
    top_k: int = Field(default=5, ge=MIN_TOP_K, le=MAX_TOP_K)

    @field_validator("question")
    @classmethod
    def clean_question(cls, v: str) -> str:
        v = sanitize_text(v)
        if not v:
            raise ValueError("Question cannot be empty or whitespace only")
        return v


class FollowupRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=MAX_QUESTION_LENGTH)
    answer: str = Field(..., min_length=10, max_length=10000)

    @field_validator("question", "answer")
    @classmethod
    def clean_fields(cls, v: str) -> str:
        return sanitize_text(v)


# ── Routes ───────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "GeriAssist RAG API",
        "version": "0.1.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "total_vectors": vector_store.total_vectors,
    }


@app.post("/query")
@limiter.limit("20/minute")
async def query_endpoint(
    request: Request,
    body: QueryRequest,
    db: Session = Depends(get_db),
):
    """Standard RAG — single retrieval pass."""
    if vector_store.total_vectors == 0:
        raise HTTPException(
            status_code=503, detail="No documents ingested yet. Ingest documents first."
        )
    result = query_rag(
        question=body.question,
        vector_store=vector_store,
        db=db,
        top_k=body.top_k,
    )
    return result


@app.post("/followups")
@limiter.limit("30/minute")
async def get_followups(
    request: Request,
    payload: FollowupRequest,
):
    """Generate follow-up question suggestions."""
    from app.generation.rag import generate_followups
    suggestions = generate_followups(payload.question, payload.answer)
    return {"suggestions": suggestions}


@app.post("/ingest")
@limiter.limit("10/minute")
async def ingest_endpoint(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form("Untitled"),
    source: str = Form("Unknown"),
    category: str = Form("general"),
    db: Session = Depends(get_db),
):
    """Upload and ingest a PDF or TXT document."""
    # Validate extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only .pdf and .txt files supported")

    # Validate file size (read content first)
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Maximum is {MAX_FILE_SIZE_MB} MB."
        )

    # Sanitize form fields
    title = sanitize_text(title)[:200]
    source = sanitize_text(source)[:200]
    category = sanitize_text(category)[:50]

    # Save and ingest
    os.makedirs("data/uploads", exist_ok=True)
    safe_filename = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename or "upload")
    file_path = f"data/uploads/{safe_filename}"
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        result = ingest_document(
            file_path=file_path,
            title=title,
            source=source,
            category=category,
            db=db,
        )
        vector_store.add_embeddings(
            embeddings=result["embeddings"],
            chunk_ids=result["chunk_ids"],
        )
        return {
            "message": "Document ingested successfully",
            "document_id": result["document_id"],
            "title": result["title"],
            "chunks_created": result["chunks_created"],
            "total_vectors": vector_store.total_vectors,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@app.get("/stats")
@limiter.limit("60/minute")
async def stats_endpoint(request: Request, db: Session = Depends(get_db)):
    """Get system statistics."""
    return {
        "documents": db.query(Document).count(),
        "chunks": db.query(Chunk).count(),
        "vectors": vector_store.total_vectors,
        "queries_logged": db.query(QueryLog).count(),
    }


@app.get("/documents")
@limiter.limit("30/minute")
async def list_documents(request: Request, db: Session = Depends(get_db)):
    """List all ingested documents."""
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    return [
        {
            "id": str(d.id),
            "title": d.title,
            "source": d.source,
            "category": d.category,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


# ── S3 Routes ─────────────────────────────────

from app.aws.s3 import (
    list_documents as s3_list_documents,
    backup_faiss_index,
    restore_faiss_index,
    get_faiss_backup_info,
    upload_document as s3_upload_document,
)
from app.ingestion.s3_ingest import ingest_from_s3


@app.get("/s3/documents")
@limiter.limit("30/minute")
async def list_s3_docs(request: Request, category: str = None):
    docs = s3_list_documents(category=category)
    return {"bucket": os.getenv("AWS_S3_BUCKET"), "count": len(docs), "documents": docs}


@app.post("/s3/upload")
@limiter.limit("10/minute")
async def upload_to_s3(
    request: Request,
    file: UploadFile = File(...),
    category: str = Form("other"),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only .pdf and .txt files supported")

    os.makedirs("data/uploads", exist_ok=True)
    safe_filename = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename or "upload")
    local_path = f"data/uploads/{safe_filename}"
    with open(local_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        s3_key = s3_upload_document(local_path, category=category)
        return {"message": "Uploaded to S3", "s3_key": s3_key, "bucket": os.getenv("AWS_S3_BUCKET")}
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)


@app.post("/s3/ingest")
@limiter.limit("5/minute")
async def ingest_from_s3_endpoint(
    request: Request,
    category: str = None,
    db: Session = Depends(get_db),
):
    return ingest_from_s3(vector_store=vector_store, db=db, category=category)


@app.post("/s3/ingest-file")
@limiter.limit("30/minute")
async def ingest_single_file_endpoint(
    request: Request,
    s3_key: str = Query(..., max_length=500),
    title: str = Query(..., max_length=300),
    source: str = Query("PMC", max_length=100),
    category: str = Query("pmc", max_length=50),
    source_url_override: str = Query(None, max_length=500),
    db: Session = Depends(get_db),
):
    """Ingest a single file from S3 by key."""
    from app.aws.s3 import download_document, backup_faiss_index
    from app.db.models import Document

    download_dir = "data/s3_downloads"
    os.makedirs(download_dir, exist_ok=True)

    try:
        local_path = download_document(s3_key, local_dir=download_dir)
        result = ingest_document(
            file_path=local_path,
            title=sanitize_text(title)[:300],
            source=sanitize_text(source)[:100],
            category=sanitize_text(category)[:50],
            db=db,
        )

        doc_record = db.query(Document).filter(
            Document.id == result["document_id"]
        ).first()
        if doc_record:
            doc_record.s3_path = source_url_override if source_url_override else s3_key
            db.commit()

        vector_store.add_embeddings(
            embeddings=result["embeddings"],
            chunk_ids=result["chunk_ids"],
        )

        if os.path.exists(local_path):
            os.remove(local_path)

        return {
            "message": "File ingested successfully",
            "document_id": result["document_id"],
            "title": title,
            "chunks_created": result["chunks_created"],
            "total_vectors": vector_store.total_vectors,
            "source_url": source_url_override or s3_key,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/s3/backup-index")
@limiter.limit("5/minute")
async def backup_index_endpoint(request: Request):
    success = backup_faiss_index()
    return {"message": "Backed up" if success else "Failed", "success": success}


@app.post("/s3/restore-index")
@limiter.limit("3/minute")
async def restore_index_endpoint(request: Request):
    success = restore_faiss_index()
    if success:
        global vector_store
        vector_store = FAISSVectorStore(
            dimension=1536, index_path=os.getenv("FAISS_INDEX_PATH", "faiss_index"))
    return {"success": success, "total_vectors": vector_store.total_vectors}


@app.get("/s3/backup-info")
@limiter.limit("10/minute")
async def backup_info_endpoint(request: Request):
    return {"bucket": os.getenv("AWS_S3_BUCKET"), "backup": get_faiss_backup_info()}


# ── Evaluation Routes ─────────────────────────

from app.evaluation.evaluator import run_full_evaluation, load_benchmark_questions


@app.get("/evaluation/questions")
@limiter.limit("10/minute")
async def list_eval_questions(request: Request):
    questions = load_benchmark_questions()
    return {"count": len(questions), "questions": questions}


@app.post("/evaluation/run")
@limiter.limit("2/minute")
async def run_evaluation(
    request: Request,
    run_rag: bool = True,
    db: Session = Depends(get_db),
):
    """Run the full evaluation suite. Warning: calls OpenAI ~30 times."""
    report = run_full_evaluation(
        vector_store=vector_store,
        db=db,
        run_rag=run_rag,
    )
    return report


@app.get("/evaluation/results")
@limiter.limit("10/minute")
async def get_eval_results(request: Request):
    path = "evaluation_results.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No evaluation results found.")
    with open(path, "r") as f:
        return json.load(f)


# ── Agent Routes ──────────────────────────────

from app.agent.orchestrator import agent_query


@app.post("/query/agent")
@limiter.limit("20/minute")
async def agent_query_endpoint(
    request: Request,
    body: QueryRequest,
    db: Session = Depends(get_db),
):
    """Agentic RAG — multi-step retrieval with sufficiency evaluation."""
    if vector_store.total_vectors == 0:
        raise HTTPException(status_code=503, detail="No documents ingested yet")

    result = agent_query(
        question=body.question,
        vector_store=vector_store,
        db=db,
        top_k=body.top_k,
    )
    return result
