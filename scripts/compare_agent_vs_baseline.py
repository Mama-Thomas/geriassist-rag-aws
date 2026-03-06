#!/usr/bin/env python3
"""
Compare standard RAG vs Agent RAG on benchmark questions.
Outputs a comparison table for your README.
"""

import json
import time
import requests

API = "http://localhost:8000"

# Load benchmark questions
response = requests.get(f"{API}/evaluation/questions")
questions = response.json()["questions"]

print(f"Comparing /query vs /query/agent on {len(questions)} questions...\n")

baseline_results = []
agent_results = []

for i, q in enumerate(questions, 1):
    question_text = q["question"]
    print(f"  [{i}/{len(questions)}] {question_text[:55]}...")

    # Baseline
    try:
        r = requests.post(
            f"{API}/query",
            json={"question": question_text, "top_k": 5},
            timeout=60,
        )
        baseline = r.json()
        baseline_results.append({
            "id": q["id"],
            "latency_ms": baseline.get("latency_ms", 0),
            "chunks_used": baseline.get("chunks_used", 0),
            "tokens_used": baseline.get("tokens_used", 0),
            "answer_length": len(baseline.get("answer", "").split()),
            "citations": len(baseline.get("citations", [])),
        })
    except Exception as e:
        print(f"    Baseline failed: {e}")
        baseline_results.append({"id": q["id"], "latency_ms": 0, "chunks_used": 0, "tokens_used": 0, "answer_length": 0, "citations": 0})

    # Agent
    try:
        r = requests.post(
            f"{API}/query/agent",
            json={"question": question_text, "top_k": 5},
            timeout=120,
        )
        agent = r.json()
        meta = agent.get("agent_metadata", {})
        agent_results.append({
            "id": q["id"],
            "latency_ms": agent.get("latency_ms", 0),
            "chunks_used": agent.get("chunks_used", 0),
            "tokens_used": agent.get("tokens_used", 0),
            "answer_length": len(agent.get("answer", "").split()),
            "citations": len(agent.get("citations", [])),
            "rounds": meta.get("total_rounds", 0),
            "confidence": agent.get("sufficiency_confidence", None),
            "was_in_scope": meta.get("routing_plan", {}).get("is_in_scope", True),
        })
    except Exception as e:
        print(f"    Agent failed: {e}")
        agent_results.append({"id": q["id"], "latency_ms": 0, "chunks_used": 0, "tokens_used": 0, "answer_length": 0, "citations": 0, "rounds": 0, "confidence": 0, "was_in_scope": True})

    # Small delay to avoid rate limits
    time.sleep(1)


# Calculate averages
def avg(lst, key):
    vals = [x[key] for x in lst if x.get(key, 0) > 0]
    return round(sum(vals) / len(vals), 1) if vals else 0


print("\n" + "=" * 70)
print("GERIASSIST: STANDARD RAG vs AGENT RAG COMPARISON")
print("=" * 70)

print(f"\n{'Metric':<30} {'Standard RAG':>15} {'Agent RAG':>15}")
print("-" * 60)
print(f"{'Avg Latency (ms)':<30} {avg(baseline_results, 'latency_ms'):>15} {avg(agent_results, 'latency_ms'):>15}")
print(f"{'Avg Chunks Used':<30} {avg(baseline_results, 'chunks_used'):>15} {avg(agent_results, 'chunks_used'):>15}")
print(f"{'Avg Tokens Used':<30} {avg(baseline_results, 'tokens_used'):>15} {avg(agent_results, 'tokens_used'):>15}")
print(f"{'Avg Answer Length (words)':<30} {avg(baseline_results, 'answer_length'):>15} {avg(agent_results, 'answer_length'):>15}")
print(f"{'Avg Citations':<30} {avg(baseline_results, 'citations'):>15} {avg(agent_results, 'citations'):>15}")

# Agent-specific metrics
agent_rounds = [x.get("rounds", 0) for x in agent_results if x.get("rounds", 0) > 0]
agent_confidences = [x.get("confidence", 0) for x in agent_results if x.get("confidence") is not None]

if agent_rounds:
    print(f"{'Avg Agent Rounds':<30} {'N/A':>15} {round(sum(agent_rounds)/len(agent_rounds), 1):>15}")
if agent_confidences:
    print(f"{'Avg Sufficiency Confidence':<30} {'N/A':>15} {round(sum(agent_confidences)/len(agent_confidences), 2):>15}")

# Cost estimate
baseline_cost = sum(x.get("tokens_used", 0) for x in baseline_results) * 0.00000015
agent_cost = sum(x.get("tokens_used", 0) for x in agent_results) * 0.00000015
print(f"\n{'Est. Total Cost (30 queries)':<30} ${baseline_cost:>14.4f} ${agent_cost:>14.4f}")

print("\n" + "=" * 70)

# Save detailed results
output = {
    "summary": {
        "baseline": {
            "avg_latency_ms": avg(baseline_results, "latency_ms"),
            "avg_chunks_used": avg(baseline_results, "chunks_used"),
            "avg_tokens_used": avg(baseline_results, "tokens_used"),
            "avg_answer_length": avg(baseline_results, "answer_length"),
            "total_cost_usd": round(baseline_cost, 4),
        },
        "agent": {
            "avg_latency_ms": avg(agent_results, "latency_ms"),
            "avg_chunks_used": avg(agent_results, "chunks_used"),
            "avg_tokens_used": avg(agent_results, "tokens_used"),
            "avg_answer_length": avg(agent_results, "answer_length"),
            "avg_rounds": round(sum(agent_rounds) / len(agent_rounds), 1) if agent_rounds else 0,
            "avg_confidence": round(sum(agent_confidences) / len(agent_confidences), 2) if agent_confidences else 0,
            "total_cost_usd": round(agent_cost, 4),
        },
    },
    "detailed": {
        "baseline": baseline_results,
        "agent": agent_results,
    },
}

with open("agent_comparison_results.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"\nDetailed results saved to agent_comparison_results.json")
print("Use these numbers in your README!")