import os
import shutil
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
