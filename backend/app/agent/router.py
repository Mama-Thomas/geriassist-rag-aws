"""
Query Router Agent
Classifies user intent, validates scope, and plans search strategy.
This is the "planning" stage of the agent.
"""

import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

ROUTER_SYSTEM_PROMPT = """You are a query routing agent for GeriAssist, a geriatric clinical knowledge system.

Your job is to analyze the user's question and produce a routing plan in JSON format.

The knowledge base contains documents from:
- CDC: Fall prevention (STEADI program), injury prevention
- NIA: Healthy aging, Alzheimer's/dementia, caregiving, medications, exercise, sleep, pain, depression, nutrition
- WHO: Aging policy, integrated care (ICOPE), age-friendly environments, ageism, healthy ageing decade

You MUST respond with ONLY valid JSON (no markdown, no explanation), using this exact structure:
{
  "is_in_scope": true/false,
  "category": "fall_prevention|medication_safety|dementia|caregiving|healthy_aging|chronic_conditions|cognitive_health|policy|nutrition|mental_health|safety|assessment|other",
  "complexity": "simple|moderate|complex",
  "search_queries": ["primary search query", "optional second angle"],
  "reasoning": "brief explanation of your routing decision"
}

Rules:
- is_in_scope: false if the question is not about geriatric medicine, aging, or older adult health
- search_queries: rewrite the user's question into 1-2 optimized search queries for semantic retrieval
- For simple questions, one search query is enough
- For complex questions, provide 2 queries from different angles to maximize recall
- complexity: simple = single-topic factual, moderate = multi-factor, complex = requires synthesis across domains
"""


def route_query(question: str) -> dict:
    """
    Route a user query through the planning agent.
    Returns a structured routing plan.
    """
    try:
        response = client.chat.completions.create(
            model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
            temperature=0.0,
            max_tokens=300,
        )

        raw = response.choices[0].message.content.strip()

        # Clean potential markdown wrapping
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            raw = raw.rsplit("```", 1)[0]

        plan = json.loads(raw)

        # Validate required fields
        plan.setdefault("is_in_scope", True)
        plan.setdefault("category", "other")
        plan.setdefault("complexity", "moderate")
        plan.setdefault("search_queries", [question])
        plan.setdefault("reasoning", "")

        plan["router_tokens"] = response.usage.total_tokens if response.usage else 0

        return plan

    except (json.JSONDecodeError, Exception) as e:
        # Fallback: treat as in-scope, use original question
        return {
            "is_in_scope": True,
            "category": "other",
            "complexity": "moderate",
            "search_queries": [question],
            "reasoning": f"Router fallback due to: {str(e)}",
            "router_tokens": 0,
        }