
import os
from sqlalchemy.orm import Session
from app.aws.s3 import download_document, list_documents, backup_faiss_index
from app.ingestion.pipeline import ingest_document
from app.retrieval.vector_store import FAISSVectorStore


def ingest_from_s3(
    vector_store: FAISSVectorStore,
    db: Session,
    category: str = None,
    chunk_size: int = 500,
) -> dict:
    from app.db.models import Document

    s3_docs = list_documents(category=category)
    print(f"\nFound {len(s3_docs)} documents in S3")
    if not s3_docs:
        return {"message": "No documents found in S3", "ingested": 0}

    existing_paths = set(row[0] for row in db.query(Document.s3_path).all() if row[0])
    new_docs = [d for d in s3_docs if d["key"] not in existing_paths]
    print(f"   {len(new_docs)} new, {len(existing_paths)} already ingested")

    if not new_docs:
        return {"message": "All S3 documents already ingested", "ingested": 0}

    results = {"ingested": 0, "failed": 0, "errors": [], "total_chunks": 0}
    download_dir = "data/s3_downloads"
    os.makedirs(download_dir, exist_ok=True)

    for i, doc_info in enumerate(new_docs, 1):
        s3_key = doc_info["key"]
        filename = os.path.basename(s3_key)
        parts = s3_key.split("/")
        doc_category = parts[1] if len(parts) > 2 else "general"
        title = (filename.replace(".pdf", "").replace(".txt", "")
                 .replace("_", " ").replace("-", " ").title())

        print(f"\n[{i}/{len(new_docs)}] Ingesting: {filename}")
        try:
            local_path = download_document(s3_key, local_dir=download_dir)
            
            # Skip files that are too large to embed
            file_size_mb = os.path.getsize(local_path) / (1024 * 1024)
            if file_size_mb > 5:
                print(f"   Skipped (too large: {file_size_mb:.1f} MB)")
                os.remove(local_path)
                continue
            
            result = ingest_document(
                file_path=local_path, title=title,
                source=doc_category.upper(), category=doc_category,
                db=db, chunk_size=chunk_size,
            )

            doc_record = db.query(Document).filter(
                Document.id == result["document_id"]).first()
            if doc_record:
                doc_record.s3_path = s3_key
                db.commit()

            vector_store.add_embeddings(
                embeddings=result["embeddings"], chunk_ids=result["chunk_ids"])

            results["ingested"] += 1
            results["total_chunks"] += result["chunks_created"]
            if os.path.exists(local_path):
                os.remove(local_path)

        except Exception as e:
            print(f"   Failed: {e}")
            results["failed"] += 1
            results["errors"].append({"file": filename, "error": str(e)})

    print("\nBacking up FAISS index to S3...")
    backup_faiss_index()
    results["total_vectors"] = vector_store.total_vectors
    results["message"] = f"Ingested {results['ingested']}, {results['failed']} failed"
    return results