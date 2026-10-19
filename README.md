# GeriAssist: Agentic RAG for Geriatric Clinical Knowledge

![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat-square&logo=amazonwebservices&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white)

A Retrieval-Augmented Generation system that answers geriatric care questions (falls, dementia, medication safety, caregiving, nutrition, and more) with citations back to authoritative sources from the CDC, NIA, WHO, and PubMed Central.

> **Live demo status:** The production deployment (AWS EC2, S3, CloudFront, RDS) is offline while I migrate hosting. The code, evaluation results, and data pipeline are all in this repo.

## Highlights

- **~2,000 source documents** collected by a custom multi-source pipeline (NIA, PubMed Central, CORE, CDC, WHO), each tracked with URL and SHA-256 checksum
- **Agentic retrieval:** a router agent plans the search, then a research agent retrieves iteratively and checks whether the context is actually sufficient before answering
- **Citation-grounded answers** that refuse to answer beyond the retrieved context
- **Built-in evaluation harness** with a 30-question benchmark across 14 clinical categories

## How it works

```
Question
   │
   ▼
Router agent ─── classifies intent, checks scope, plans search strategy
   │
   ▼
Research agent ─ FAISS search → sufficiency check → refine and search again (up to 3 rounds)
   │
   ▼
Answer generation ─ grounded in retrieved chunks, with source citations
```

**Ingestion:** PDFs and PMC full text are parsed, split into ~500-token chunks with overlap, embedded with OpenAI `text-embedding-3-small`, and indexed in FAISS. Chunk text and document metadata live in PostgreSQL; FAISS stores the vectors and maps results back to chunk IDs.

## Evaluation

Results from `backend/app/evaluation/evaluator.py` on the 30-question benchmark ([`evaluation_results.json`](backend/evaluation_results.json)):

| Retrieval | Topic recall | Source accuracy | Search latency |
|---|---|---|---|
| top-3 | 0.61 | 0.85 | ~1.5 ms |
| top-5 | 0.67 | 0.88 | ~0.8 ms |
| top-8 | 0.75 | 0.93 | ~0.9 ms |

**Agent vs. baseline RAG** ([`agent_comparison_results.json`](agent_comparison_results.json)): the agent pulled in more context per question (6.7 vs. 5.0 chunks) with an average self-assessed confidence of 0.86, at about 1.4x the latency and 1.7x the token cost of single-pass retrieval. Full benchmark cost was a few cents.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy, slowapi rate limiting |
| Retrieval | FAISS, OpenAI embeddings |
| Generation | OpenAI GPT-4o-mini |
| Data | PostgreSQL (metadata and chunk text), object storage for source documents |
| Frontend | React |
| Deployment | Docker, AWS EC2, S3, CloudFront, RDS |

## API

| Endpoint | Purpose |
|---|---|
| `POST /query` | Single-pass RAG answer with citations |
| `POST /query/agent` | Agentic RAG with routing and iterative research, returns full agent trace |
| `POST /followups` | Suggested follow-up questions |
| `POST /ingest` | Ingest a document |
| `GET /documents`, `GET /stats` | Browse the corpus and index stats |
| `GET /health` | Health check |

## Run it locally

```bash
git clone https://github.com/Mama-Thomas/geriassist-rag-aws.git
cd geriassist-rag-aws
cp .env.example .env          # add your OpenAI key and Postgres connection

# Collect documents (see script header for options)
python3 scripts/bulk_download_geriassist.py --all

# Start the API
docker compose up
```

API docs at `http://localhost:8000/docs`.

## Project structure

```
geriassist-rag-aws/
├── backend/
│   ├── app/
│   │   ├── agent/        # Router, research agent, orchestrator
│   │   ├── ingestion/    # PDF parsing, chunking, embeddings, pipeline
│   │   ├── retrieval/    # FAISS vector store
│   │   ├── generation/   # Grounded answer generation
│   │   ├── evaluation/   # Benchmark questions and evaluator
│   │   ├── db/           # SQLAlchemy models and connection
│   │   ├── aws/          # Object storage client
│   │   └── main.py       # FastAPI app
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             # React UI
├── scripts/              # Document collection, ingestion, agent comparison
├── data/logs/            # Download manifest (URL + checksum per document)
└── docker-compose.yml
```

## License

MIT, see [LICENSE](LICENSE).

## Author

**Mama Thomas** · [GitHub](https://github.com/Mama-Thomas) · [LinkedIn](https://www.linkedin.com/in/mama-thomas-89b0a321b)
