import os
import time
from openai import OpenAI
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.db.models import Chunk, Document, QueryLog
from app.retrieval.vector_store import FAISSVectorStore
from app.ingestion.embeddings import generate_embedding
from app.aws.s3 import generate_presigned_url

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are GeriAssist, a clinical knowledge assistant specialized in geriatric medicine.

Rules:
1. ONLY answer based on the provided context chunks below.
2. If the context doesn't contain enough information, say so clearly.
3. Cite sources by their document TITLE (e.g., "according to the CDC STEADI Coordinated Care Plan"), NOT by source numbers like [Source 1]. Never use [Source 1], [Source 2] format.
4. Be precise and use clinical language appropriate for healthcare professionals.
5. Never fabricate information not present in the provided context.
6. Structure your answer clearly with key points.
"""


def build_context_prompt(chunks_with_metadata: list[dict]) -> str:
    """Format retrieved chunks into the context section of the prompt."""
    parts = []
    for i, item in enumerate(chunks_with_metadata, 1):
        parts.append(
            f"[Source {i}: {item['title']} — {item['source']}]\n{item['chunk_text']}"
        )
    return "\n\n---\n\n".join(parts)


def query_rag(
    question: str,
    vector_store: FAISSVectorStore,
    db: Session,
    top_k: int = 5,
    llm_model: str = None,
) -> dict:
    """
    Full RAG pipeline:
    1. Embed question
    2. FAISS search
    3. Fetch chunk metadata from RDS
    4. Build grounded prompt
    5. LLM generates answer
    6. Log query metrics
    7. Return answer + citations
    """
    start_time = time.time()
    llm_model = llm_model or os.getenv("LLM_MODEL", "gpt-4o-mini")

    # 1. Embed the question
    query_embedding = generate_embedding(question)

    # 2. FAISS search
    search_results = vector_store.search(query_embedding, top_k=top_k)

    # 3. Fetch chunk text + doc metadata from RDS
    chunks_with_metadata = []
    for result in search_results:
        chunk = db.query(Chunk).filter(Chunk.id == result["chunk_id"]).first()
        if chunk:
            doc = db.query(Document).filter(Document.id == chunk.document_id).first()
            chunks_with_metadata.append({
                "chunk_id": str(chunk.id),
                "chunk_text": chunk.chunk_text,
                "title": doc.title if doc else "Unknown",
                "source": doc.source if doc else "Unknown",
                "s3_path": doc.s3_path if doc else None,
                "distance": result["distance"],
                "rank": result["rank"],
            })

    # 4. Build prompt
    context = build_context_prompt(chunks_with_metadata)
    user_prompt = (
        f"Context:\n{context}\n\n---\n\n"
        f"Question: {question}\n\n"
        f"Provide a detailed, citation-grounded answer."
    )

    # 5. Call LLM
    response = client.chat.completions.create(
        model=llm_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=1000,
    )

    answer = response.choices[0].message.content
    tokens_used = response.usage.total_tokens if response.usage else 0
    latency_ms = int((time.time() - start_time) * 1000)

    # 6. Log to RDS
    log_entry = QueryLog(
        question=question,
        answer=answer,
        latency_ms=latency_ms,
        tokens_used=tokens_used,
        chunks_used=len(chunks_with_metadata),
    )
    db.add(log_entry)
    db.commit()

    # 7. Build response

    citations = [
        {
            "source": item["title"],
            "snippet": item["chunk_text"][:200] + "...",
            "rank": item["rank"],
            "pdf_url": generate_presigned_url(item["s3_path"]) if item.get("s3_path") else None,
        }
        for item in chunks_with_metadata
    ]

    return {
        "answer": answer,
        "citations": citations,
        "latency_ms": latency_ms,
        "tokens_used": tokens_used,
        "chunks_used": len(chunks_with_metadata),
    }
