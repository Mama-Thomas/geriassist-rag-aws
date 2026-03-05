"""
Agent Orchestrator
Combines the Query Router and Research Agent into a single pipeline.
"""

import time
from sqlalchemy.orm import Session

from app.agent.router import route_query
from app.agent.researcher import research_query
from app.retrieval.vector_store import FAISSVectorStore


def agent_query(
    question: str,
    vector_store: FAISSVectorStore,
    db: Session,
    top_k: int = 5,
    max_rounds: int = 3,
) -> dict:
    """
    Full agentic RAG pipeline:
    1. Router Agent: classify, validate scope, plan search strategy
    2. Research Agent: iterative retrieval with sufficiency checks
    3. Return answer with full agent trace
    """
    start_time = time.time()

    # Stage 1: Route the query
    routing_plan = route_query(question)

    # Handle out-of-scope questions
    if not routing_plan.get("is_in_scope", True):
        return {
            "answer": (
                "This question appears to be outside the scope of GeriAssist's "
                "geriatric clinical knowledge base. I can help with topics like "
                "fall prevention, medication safety, dementia care, healthy aging, "
                "and aging policy. Please rephrase your question or ask about "
                "one of these topics."
            ),
            "citations": [],
            "latency_ms": int((time.time() - start_time) * 1000),
            "tokens_used": routing_plan.get("router_tokens", 0),
            "chunks_used": 0,
            "agent_metadata": {
                "routing_plan": routing_plan,
                "research_steps": [],
                "out_of_scope": True,
            },
        }

    # Stage 2: Research with iterative retrieval
    search_queries = routing_plan.get("search_queries", [question])
    result = research_query(
        question=question,
        search_queries=search_queries,
        vector_store=vector_store,
        db=db,
        max_rounds=max_rounds,
        top_k=top_k,
    )

    # Add routing info to metadata
    total_latency = int((time.time() - start_time) * 1000)
    result["latency_ms"] = total_latency
    result["tokens_used"] += routing_plan.get("router_tokens", 0)
    result["agent_metadata"]["routing_plan"] = routing_plan

    return result