import os
import shutil
import json
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

from app.db.database import get_db, init_db
from app.db.models import Document, Chunk, QueryLog
from app.retrieval.vector_store import FAISSVectorStore
from app.generation.rag import query_rag
from app.ingestion.pipeline import ingest_document

# --- App Setup ---

app = FastAPI(
    title="GeriAssist RAG API",
    description="Geriatric Clinical Knowledge Retrieval-Augmented Generation System",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global vector store
vector_store = FAISSVectorStore(
    dimension=1536,
    index_path=os.getenv("FAISS_INDEX_PATH", "faiss_index"),
)


@app.on_event("startup")
async def startup():
    init_db()


# --- Request Models ---


class QueryRequest(BaseModel):
    question: str
    top_k: int = 5


# --- Routes ---


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
async def query_endpoint(request: QueryRequest, db: Session = Depends(get_db)):
    """Ask a question — retrieves relevant chunks and generates a grounded answer."""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if vector_store.total_vectors == 0:
        raise HTTPException(
            status_code=400, detail="No documents ingested yet. Ingest documents first."
        )

    result = query_rag(
        question=request.question,
        vector_store=vector_store,
        db=db,
        top_k=request.top_k,
    )
    return result


@app.post("/ingest")
async def ingest_endpoint(
    file: UploadFile = File(...),
    title: str = Form("Untitled"),
    source: str = Form("Unknown"),
    category: str = Form("general"),
    db: Session = Depends(get_db),
):
    """Upload and ingest a PDF or TXT document."""
    if not file.filename.lower().endswith((".pdf", ".txt")):
        raise HTTPException(status_code=400, detail="Only .pdf and .txt files supported")

    # Save uploaded file temporarily
    os.makedirs("data/uploads", exist_ok=True)
    file_path = f"data/uploads/{file.filename}"
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = ingest_document(
            file_path=file_path,
            title=title,
            source=source,
            category=category,
            db=db,
        )

        # Add to FAISS
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
async def stats_endpoint(db: Session = Depends(get_db)):
    """Get system statistics."""
    doc_count = db.query(Document).count()
    chunk_count = db.query(Chunk).count()
    query_count = db.query(QueryLog).count()

    return {
        "documents": doc_count,
        "chunks": chunk_count,
        "vectors": vector_store.total_vectors,
        "queries_logged": query_count,
    }


@app.get("/documents")
async def list_documents(db: Session = Depends(get_db)):
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

#phase 3; step 5
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
async def list_s3_docs(category: str = None):
    docs = s3_list_documents(category=category)
    return {"bucket": os.getenv("AWS_S3_BUCKET"), "count": len(docs), "documents": docs}


@app.post("/s3/upload")
async def upload_to_s3(
    file: UploadFile = File(...),
    category: str = Form("other"),
):
    os.makedirs("data/uploads", exist_ok=True)
    local_path = f"data/uploads/{file.filename}"
    with open(local_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        s3_key = s3_upload_document(local_path, category=category)
        return {"message": "Uploaded to S3", "s3_key": s3_key, "bucket": os.getenv("AWS_S3_BUCKET")}
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)


@app.post("/s3/ingest")
async def ingest_from_s3_endpoint(category: str = None, db: Session = Depends(get_db)):
    return ingest_from_s3(vector_store=vector_store, db=db, category=category)

@app.post("/s3/ingest-file")
async def ingest_single_file_endpoint(
    s3_key: str,
    title: str,
    source: str = "PMC",
    category: str = "pmc",
    source_url_override: str = None,
    db: Session = Depends(get_db),
):
    """
    Ingest a single file from S3 by key.
    source_url_override: if provided, stores this URL in the document record
    instead of the s3_key (used for PMC articles so 'View Source' links to
    the real PMC article page, not the S3 path).
    """
    from app.aws.s3 import download_document, backup_faiss_index
    from app.db.models import Document

    download_dir = "data/s3_downloads"
    os.makedirs(download_dir, exist_ok=True)

    try:
        local_path = download_document(s3_key, local_dir=download_dir)
        result = ingest_document(
            file_path=local_path,
            title=title,
            source=source,
            category=category,
            db=db,
        )

        # If a source URL override is provided, update the document record
        if source_url_override:
            doc_record = db.query(Document).filter(
                Document.id == result["document_id"]
            ).first()
            if doc_record:
                doc_record.s3_path = source_url_override
                db.commit()
        else:
            doc_record = db.query(Document).filter(
                Document.id == result["document_id"]
            ).first()
            if doc_record:
                doc_record.s3_path = s3_key
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
async def backup_index_endpoint():
    success = backup_faiss_index()
    return {"message": "Backed up" if success else "Failed", "success": success}


@app.post("/s3/restore-index")
async def restore_index_endpoint():
    success = restore_faiss_index()
    if success:
        global vector_store
        vector_store = FAISSVectorStore(
            dimension=1536, index_path=os.getenv("FAISS_INDEX_PATH", "faiss_index"))
    return {"success": success, "total_vectors": vector_store.total_vectors}


@app.get("/s3/backup-info")
async def backup_info_endpoint():
    return {"bucket": os.getenv("AWS_S3_BUCKET"), "backup": get_faiss_backup_info()}

#phase 5
# ── Evaluation Routes ─────────────────────────

from app.evaluation.evaluator import (
    run_full_evaluation,
    load_benchmark_questions,
)


@app.get("/evaluation/questions")
async def list_eval_questions():
    """List all benchmark questions."""
    questions = load_benchmark_questions()
    return {"count": len(questions), "questions": questions}


@app.post("/evaluation/run")
async def run_evaluation(
    run_rag: bool = True,
    db: Session = Depends(get_db),
):
    """
    Run the full evaluation suite.
    Warning: with run_rag=True, this calls OpenAI 30 times (~$0.05-0.10).
    """
    report = run_full_evaluation(
        vector_store=vector_store,
        db=db,
        run_rag=run_rag,
    )
    return report


@app.get("/evaluation/results")
async def get_eval_results():
    """Get the most recent evaluation results."""
    path = "evaluation_results.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No evaluation results found. Run /evaluation/run first.")
    with open(path, "r") as f:
        return json.load(f)
    

# ── Agent Routes ──────────────────────────────

from app.agent.orchestrator import agent_query


@app.post("/query/agent")
async def agent_query_endpoint(
    request: QueryRequest,
    db: Session = Depends(get_db),
):
    """
    Agentic RAG pipeline:
    1. Router Agent classifies intent and plans search strategy
    2. Research Agent iteratively retrieves and evaluates sufficiency
    3. Returns answer with full agent trace
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if vector_store.total_vectors == 0:
        raise HTTPException(status_code=400, detail="No documents ingested yet")

    result = agent_query(
        question=request.question,
        vector_store=vector_store,
        db=db,
        top_k=request.top_k,
    )
    return result