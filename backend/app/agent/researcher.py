"""
Multi-Step Research Agent
Iteratively retrieves chunks, evaluates context sufficiency,
and reformulates queries when needed.
"""

import os
import json
import time
from openai import OpenAI
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.db.models import Chunk, Document, QueryLog
from app.retrieval.vector_store import FAISSVectorStore
from app.ingestion.embeddings import generate_embedding

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SUFFICIENCY_PROMPT = """You are evaluating whether retrieved context is sufficient to answer a question about geriatric medicine.

Question: {question}

Retrieved context:
{context}

Evaluate and respond with ONLY valid JSON (no markdown):
{{
  "is_sufficient": true/false,
  "confidence": 0.0-1.0,
  "missing_aspects": ["list of topics not covered"],
  "reformulated_query": "a new search query to find missing info (only if is_sufficient is false)"
}}

Rules:
- is_sufficient: true if the context contains enough information to give a useful, grounded answer
- confidence: how confident you are that a good answer can be generated (0.0 = no relevant info, 1.0 = perfect coverage)
- If is_sufficient is true, reformulated_query should be empty string
- If is_sufficient is false, suggest a different search angle to find the missing information
"""

GENERATION_PROMPT = """You are GeriAssist, a clinical knowledge assistant specialized in geriatric medicine.

Rules:
1. ONLY answer based on the provided context chunks below.
2. If the context doesn't contain enough information, say so clearly.
3. Always cite which source document(s) your answer draws from.
4. Be precise and use clinical language appropriate for healthcare professionals.
5. Never fabricate information not present in the provided context.
6. Structure your answer clearly with key points.
{sufficiency_note}
"""

CONFIDENT_NOTE = ""
CAUTIOUS_NOTE = """
IMPORTANT: The retrieval system found limited information on some aspects of this question.
Be transparent about what the available sources cover well and what they do not.
Start your answer with: "Based on the available sources in the knowledge base..."
If there are aspects you cannot address from the context, explicitly state what information is missing.
"""


def _fetch_chunks_with_metadata(
    search_results: list[dict], db: Session
) -> list[dict]:
    """Fetch chunk text and document metadata from DB."""
    chunks = []
    seen_ids = set()

    for result in search_results:
        chunk_id = result["chunk_id"]
        if chunk_id in seen_ids:
            continue
        seen_ids.add(chunk_id)

        chunk = db.query(Chunk).filter(Chunk.id == chunk_id).first()
        if chunk:
            doc = db.query(Document).filter(
                Document.id == chunk.document_id
            ).first()
            chunks.append({
                "chunk_id": str(chunk.id),
                "chunk_text": chunk.chunk_text,
                "title": doc.title if doc else "Unknown",
                "source": doc.source if doc else "Unknown",
                "distance": result["distance"],
            })

    return chunks


def _build_context_string(chunks: list[dict]) -> str:
    """Format chunks into context for the LLM."""
    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(
            f"[Source {i}: {c['title']} — {c['source']}]\n{c['chunk_text']}"
        )
    return "\n\n---\n\n".join(parts)


def _evaluate_sufficiency(
    question: str, context: str
) -> dict:
    """Ask the LLM if the retrieved context is sufficient."""
    try:
        response = client.chat.completions.create(
            model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
            messages=[
                {
                    "role": "user",
                    "content": SUFFICIENCY_PROMPT.format(
                        question=question, context=context[:3000]
                    ),
                }
            ],
            temperature=0.0,
            max_tokens=200,
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            raw = raw.rsplit("```", 1)[0]

        result = json.loads(raw)
        result["eval_tokens"] = (
            response.usage.total_tokens if response.usage else 0
        )
        return result

    except Exception:
        return {
            "is_sufficient": True,
            "confidence": 0.5,
            "missing_aspects": [],
            "reformulated_query": "",
            "eval_tokens": 0,
        }


def research_query(
    question: str,
    search_queries: list[str],
    vector_store: FAISSVectorStore,
    db: Session,
    max_rounds: int = 3,
    top_k: int = 5,
) -> dict:
    """
    Multi-step research agent.

    Flow:
    1. Search with each query from the router
    2. Evaluate if context is sufficient
    3. If not, reformulate and search again
    4. Repeat up to max_rounds
    5. Generate final answer with all collected context
    """
    start_time = time.time()
    all_chunks = []
    seen_chunk_ids = set()
    agent_steps = []
    total_eval_tokens = 0

    # Round 1: Execute all search queries from the router
    for i, query in enumerate(search_queries):
        query_embedding = generate_embedding(query)
        search_results = vector_store.search(query_embedding, top_k=top_k)

        new_chunks = _fetch_chunks_with_metadata(search_results, db)
        added = 0
        for chunk in new_chunks:
            if chunk["chunk_id"] not in seen_chunk_ids:
                seen_chunk_ids.add(chunk["chunk_id"])
                all_chunks.append(chunk)
                added += 1

        agent_steps.append({
            "round": 1,
            "action": "search",
            "query": query,
            "chunks_found": len(new_chunks),
            "new_chunks_added": added,
        })

    # Evaluate sufficiency and potentially do more rounds
    current_round = 2
    while current_round <= max_rounds:
        context = _build_context_string(all_chunks)
        eval_result = _evaluate_sufficiency(question, context)
        total_eval_tokens += eval_result.get("eval_tokens", 0)

        agent_steps.append({
            "round": current_round,
            "action": "evaluate",
            "is_sufficient": eval_result.get("is_sufficient", True),
            "confidence": eval_result.get("confidence", 0),
            "missing_aspects": eval_result.get("missing_aspects", []),
        })

        # If sufficient or no reformulated query, stop
        if eval_result.get("is_sufficient", True):
            break

        reformulated = eval_result.get("reformulated_query", "")
        if not reformulated:
            break

        # Search with reformulated query
        query_embedding = generate_embedding(reformulated)
        search_results = vector_store.search(query_embedding, top_k=top_k)

        new_chunks = _fetch_chunks_with_metadata(search_results, db)
        added = 0
        for chunk in new_chunks:
            if chunk["chunk_id"] not in seen_chunk_ids:
                seen_chunk_ids.add(chunk["chunk_id"])
                all_chunks.append(chunk)
                added += 1

        agent_steps.append({
            "round": current_round,
            "action": "search",
            "query": reformulated,
            "chunks_found": len(new_chunks),
            "new_chunks_added": added,
        })

        # If no new chunks found, stop
        if added == 0:
            break

        current_round += 1

    # Determine if we should be cautious based on last sufficiency eval
    last_confidence = 1.0
    for step in reversed(agent_steps):
        if step.get("action") == "evaluate":
            last_confidence = step.get("confidence", 1.0)
            break

    sufficiency_note = CAUTIOUS_NOTE if last_confidence < 0.7 else CONFIDENT_NOTE

    # Generate final answer with all collected context
    context = _build_context_string(all_chunks)
    user_prompt = (
        f"Context:\n{context}\n\n---\n\n"
        f"Question: {question}\n\n"
        f"Provide a detailed, citation-grounded answer."
    )

    system_prompt = GENERATION_PROMPT.format(sufficiency_note=sufficiency_note)

    gen_response = client.chat.completions.create(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=1000,
    )
    

    answer = gen_response.choices[0].message.content
    gen_tokens = gen_response.usage.total_tokens if gen_response.usage else 0
    total_latency_ms = int((time.time() - start_time) * 1000)

    # Log to database
    log_entry = QueryLog(
        question=question,
        answer=answer,
        latency_ms=total_latency_ms,
        tokens_used=gen_tokens + total_eval_tokens,
        chunks_used=len(all_chunks),
    )
    db.add(log_entry)
    db.commit()

    # Build citations
    # Build deduplicated citations (max 2 per source)
    source_counts = {}
    citations = []
    for c in all_chunks:
        source_name = c["title"]
        count = source_counts.get(source_name, 0)
        if count < 2:
            citations.append({
                "source": source_name,
                "snippet": c["chunk_text"][:200] + "...",
            })
            source_counts[source_name] = count + 1

    return {
        "answer": answer,
        "citations": citations,
        "latency_ms": total_latency_ms,
        "tokens_used": gen_tokens + total_eval_tokens,
        "chunks_used": len(all_chunks),
        "sufficiency_confidence": last_confidence,
        "agent_metadata": {
            "total_rounds": current_round - 1 if current_round <= max_rounds else max_rounds,
            "total_unique_chunks": len(all_chunks),
            "steps": agent_steps,
        },
    }