"""
GeriAssist Evaluation Module
Measures retrieval quality, latency, and citation grounding.
"""

import os
import json
import time
from datetime import datetime
from sqlalchemy.orm import Session

from app.retrieval.vector_store import FAISSVectorStore
from app.ingestion.embeddings import generate_embedding
from app.db.models import Chunk, Document


def load_benchmark_questions(path: str = None) -> list[dict]:
    """Load benchmark questions from JSON file."""
    if path is None:
        path = os.path.join(
            os.path.dirname(__file__), "benchmark_questions.json"
        )
    with open(path, "r") as f:
        return json.load(f)


def evaluate_retrieval(
    question: dict,
    vector_store: FAISSVectorStore,
    db: Session,
    top_k_values: list[int] = [3, 5, 8],
) -> dict:
    """
    Evaluate retrieval quality for a single question.
    Measures:
    - Whether retrieved chunks contain expected topics
    - Source accuracy (did we retrieve from expected sources?)
    - Retrieval latency
    """
    q_text = question["question"]
    expected_topics = [t.lower() for t in question["expected_topics"]]
    expected_sources = [s.lower() for s in question["expected_sources"]]

    # Embed the question
    start_time = time.time()
    query_embedding = generate_embedding(q_text)
    embed_latency_ms = int((time.time() - start_time) * 1000)

    results_by_k = {}

    for k in top_k_values:
        search_start = time.time()
        search_results = vector_store.search(query_embedding, top_k=k)
        search_latency_ms = int((time.time() - search_start) * 1000)

        # Fetch chunk text and metadata
        retrieved_chunks = []
        retrieved_sources = set()

        for result in search_results:
            chunk = db.query(Chunk).filter(Chunk.id == result["chunk_id"]).first()
            if chunk:
                doc = db.query(Document).filter(
                    Document.id == chunk.document_id
                ).first()
                source_name = doc.source.lower() if doc else "unknown"
                retrieved_sources.add(source_name)
                retrieved_chunks.append({
                    "chunk_text": chunk.chunk_text.lower(),
                    "source": source_name,
                    "distance": result["distance"],
                })

        # Calculate topic recall: how many expected topics appear
        # in the retrieved chunks?
        combined_text = " ".join(c["chunk_text"] for c in retrieved_chunks)
        topics_found = [t for t in expected_topics if t in combined_text]
        topic_recall = len(topics_found) / len(expected_topics) if expected_topics else 0

        # Calculate source accuracy: did we retrieve from expected sources?
        sources_found = [
            s for s in expected_sources if s in retrieved_sources
        ]
        source_accuracy = (
            len(sources_found) / len(expected_sources)
            if expected_sources
            else 0
        )

        results_by_k[f"top_{k}"] = {
            "topic_recall": round(topic_recall, 3),
            "topics_found": topics_found,
            "topics_missed": [
                t for t in expected_topics if t not in topics_found
            ],
            "source_accuracy": round(source_accuracy, 3),
            "sources_found": list(retrieved_sources),
            "search_latency_ms": search_latency_ms,
            "avg_distance": round(
                sum(c["distance"] for c in retrieved_chunks) / len(retrieved_chunks),
                4,
            )
            if retrieved_chunks
            else None,
        }

    return {
        "question_id": question["id"],
        "question": q_text,
        "category": question["category"],
        "embed_latency_ms": embed_latency_ms,
        "results": results_by_k,
    }


def evaluate_rag_response(
    question: dict,
    rag_result: dict,
) -> dict:
    """
    Evaluate a full RAG response for citation grounding.
    Checks if the answer references its source documents.
    """
    answer = rag_result.get("answer", "").lower()
    citations = rag_result.get("citations", [])

    # Check if answer acknowledges insufficient info
    insufficient_markers = [
        "not enough information",
        "context doesn't contain",
        "cannot find",
        "no information available",
    ]
    acknowledges_limits = any(m in answer for m in insufficient_markers)

    # Check citation grounding: does the answer mention source names?
    cited_sources = [c.get("source", "").lower() for c in citations]
    sources_mentioned_in_answer = sum(
        1 for s in cited_sources if s.lower() in answer
    )

    # Check expected topic coverage in the answer
    expected_topics = [t.lower() for t in question["expected_topics"]]
    topics_in_answer = [t for t in expected_topics if t in answer]

    return {
        "question_id": question["id"],
        "answer_length": len(answer.split()),
        "citations_count": len(citations),
        "sources_cited": cited_sources,
        "citation_grounding_rate": round(
            sources_mentioned_in_answer / len(cited_sources), 3
        )
        if cited_sources
        else 0,
        "topic_coverage": round(
            len(topics_in_answer) / len(expected_topics), 3
        )
        if expected_topics
        else 0,
        "topics_in_answer": topics_in_answer,
        "acknowledges_limits": acknowledges_limits,
        "latency_ms": rag_result.get("latency_ms", 0),
        "tokens_used": rag_result.get("tokens_used", 0),
    }


def run_full_evaluation(
    vector_store: FAISSVectorStore,
    db: Session,
    run_rag: bool = True,
    top_k_values: list[int] = [3, 5, 8],
) -> dict:
    """
    Run the complete evaluation suite.
    Returns a full evaluation report.
    """
    from app.generation.rag import query_rag

    questions = load_benchmark_questions()
    print(f"\nRunning evaluation on {len(questions)} benchmark questions...")
    print(f"Top-K values: {top_k_values}")
    print(f"RAG evaluation: {'enabled' if run_rag else 'disabled'}")

    retrieval_results = []
    rag_results = []

    for i, q in enumerate(questions, 1):
        print(f"\n  [{i}/{len(questions)}] {q['question'][:60]}...")

        # Retrieval evaluation
        ret_result = evaluate_retrieval(q, vector_store, db, top_k_values)
        retrieval_results.append(ret_result)

        # RAG evaluation (optional — costs API tokens)
        if run_rag:
            try:
                rag_response = query_rag(
                    question=q["question"],
                    vector_store=vector_store,
                    db=db,
                    top_k=5,
                )
                rag_eval = evaluate_rag_response(q, rag_response)
                rag_results.append(rag_eval)
                print(f"    Latency: {rag_eval['latency_ms']}ms | "
                      f"Topics: {rag_eval['topic_coverage']:.0%} | "
                      f"Citations: {rag_eval['citations_count']}")
            except Exception as e:
                print(f"    RAG failed: {e}")

    # Aggregate metrics
    report = build_evaluation_report(
        retrieval_results, rag_results, top_k_values
    )

    # Save to file
    output_path = "evaluation_results.json"
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"\nResults saved to {output_path}")

    return report


def build_evaluation_report(
    retrieval_results: list[dict],
    rag_results: list[dict],
    top_k_values: list[int],
) -> dict:
    """Build aggregated evaluation report from individual results."""

    report = {
        "metadata": {
            "timestamp": datetime.utcnow().isoformat(),
            "total_questions": len(retrieval_results),
            "top_k_values_tested": top_k_values,
        },
        "retrieval_metrics": {},
        "rag_metrics": {},
        "by_category": {},
        "detailed_results": {
            "retrieval": retrieval_results,
            "rag": rag_results,
        },
    }

    # Aggregate retrieval metrics per top_k
    for k in top_k_values:
        key = f"top_{k}"
        recalls = [
            r["results"][key]["topic_recall"]
            for r in retrieval_results
            if key in r["results"]
        ]
        source_accs = [
            r["results"][key]["source_accuracy"]
            for r in retrieval_results
            if key in r["results"]
        ]
        latencies = [
            r["results"][key]["search_latency_ms"]
            for r in retrieval_results
            if key in r["results"]
        ]

        report["retrieval_metrics"][key] = {
            "avg_topic_recall": round(sum(recalls) / len(recalls), 3) if recalls else 0,
            "avg_source_accuracy": round(sum(source_accs) / len(source_accs), 3) if source_accs else 0,
            "avg_search_latency_ms": round(sum(latencies) / len(latencies), 1) if latencies else 0,
            "min_topic_recall": round(min(recalls), 3) if recalls else 0,
            "max_topic_recall": round(max(recalls), 3) if recalls else 0,
        }

    # Aggregate RAG metrics
    if rag_results:
        latencies = [r["latency_ms"] for r in rag_results]
        tokens = [r["tokens_used"] for r in rag_results]
        coverages = [r["topic_coverage"] for r in rag_results]
        grounding = [r["citation_grounding_rate"] for r in rag_results]

        report["rag_metrics"] = {
            "avg_latency_ms": round(sum(latencies) / len(latencies), 1),
            "p95_latency_ms": round(sorted(latencies)[int(len(latencies) * 0.95)], 1),
            "avg_tokens_used": round(sum(tokens) / len(tokens), 1),
            "avg_topic_coverage": round(sum(coverages) / len(coverages), 3),
            "avg_citation_grounding": round(sum(grounding) / len(grounding), 3),
            "total_cost_estimate_usd": round(sum(tokens) * 0.00000015, 4),
        }

    # Group by category
    categories = set(r["category"] for r in retrieval_results)
    for cat in categories:
        cat_retrieval = [r for r in retrieval_results if r["category"] == cat]
        cat_rag = [r for r in rag_results if r["question_id"] in
                   [cr["question_id"] for cr in cat_retrieval]]

        top5_recalls = [
            r["results"]["top_5"]["topic_recall"]
            for r in cat_retrieval
            if "top_5" in r["results"]
        ]

        report["by_category"][cat] = {
            "num_questions": len(cat_retrieval),
            "avg_recall_at_5": round(sum(top5_recalls) / len(top5_recalls), 3) if top5_recalls else 0,
        }

        if cat_rag:
            cat_latencies = [r["latency_ms"] for r in cat_rag]
            report["by_category"][cat]["avg_latency_ms"] = round(
                sum(cat_latencies) / len(cat_latencies), 1
            )

    return report