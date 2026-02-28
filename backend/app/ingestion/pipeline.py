import os
import uuid
from sqlalchemy.orm import Session

from app.db.models import Document, Chunk
from app.ingestion.pdf_parser import extract_text_from_pdf, extract_text_from_txt
from app.ingestion.chunker import chunk_text
from app.ingestion.embeddings import generate_embeddings_batch


def ingest_document(
    file_path: str,
    title: str,
    source: str,
    category: str,
    db: Session,
    chunk_size: int = 500,
) -> dict:
    """
    Full ingestion pipeline for a single document:
    1. Extract text
    2. Chunk
    3. Store metadata in RDS
    4. Generate embeddings
    5. Return embeddings + chunk IDs for FAISS
    """

    # 1. Extract text
    if file_path.lower().endswith(".pdf"):
        text = extract_text_from_pdf(file_path)
    elif file_path.lower().endswith(".txt"):
        text = extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_path}")

    if not text or len(text.strip()) < 50:
        raise ValueError(f"Insufficient text extracted from {file_path}")

    # 2. Chunk
    chunks = chunk_text(text, chunk_size=chunk_size)
    print(f"   📄 {title}: {len(chunks)} chunks from {len(text)} chars")

    # 3. Store document metadata in RDS
    doc = Document(
        id=uuid.uuid4(),
        title=title,
        source=source,
        category=category,
        s3_path=file_path,
    )
    db.add(doc)
    db.flush()  # Get the ID without committing

    # 4. Store chunks in RDS
    chunk_records = []
    for i, chunk in enumerate(chunks):
        chunk_record = Chunk(
            id=uuid.uuid4(),
            document_id=doc.id,
            chunk_text=chunk,
            chunk_index=i,
        )
        db.add(chunk_record)
        chunk_records.append(chunk_record)

    db.commit()

    # 5. Generate embeddings
    chunk_texts = [c.chunk_text for c in chunk_records]
    embeddings = generate_embeddings_batch(chunk_texts)

    return {
        "document_id": str(doc.id),
        "title": title,
        "chunks_created": len(chunks),
        "embeddings": embeddings,
        "chunk_ids": [str(c.id) for c in chunk_records],
    }
