# GeriAssist — Cloud-Deployed Geriatric RAG Clinical Knowledge System

![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat-square&logo=amazonwebservices&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white)

A **Retrieval-Augmented Generation (RAG)** system designed to answer geriatric clinical questions by indexing 2,000+ authoritative medical documents. Built with a scalable cloud architecture on AWS with semantic vector search and citation-grounded LLM responses.

## Features

- **Semantic Search** — FAISS vector search with OpenAI embeddings for high-relevance document retrieval
- **Citation-Grounded Responses** — LLM-generated answers include source citations for clinical reliability
- **Scalable Backend** — FastAPI + SQLAlchemy with async endpoints and structured error handling
- **Cloud-Native Storage** — AWS RDS (PostgreSQL) for metadata, S3 for document storage
- **Security** — AWS IAM roles, VPC security groups, and SSL encryption
- **Containerized Deployment** — Docker for reproducible builds and deployment

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Client     │────▶│   FastAPI    │────▶│  FAISS Vector    │
│   Request    │     │   Backend    │     │  Search Index    │
└──────────────┘     └──────┬───────┘     └────────┬─────────┘
                            │                      │
                     ┌──────▼───────┐     ┌────────▼─────────┐
                     │  AWS RDS     │     │  OpenAI API      │
                     │ (PostgreSQL) │     │  (Embeddings +   │
                     └──────────────┘     │   LLM Response)  │
                                          └──────────────────┘
                     ┌──────────────┐
                     │   AWS S3     │
                     │  (Documents) │
                     └──────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend Framework | FastAPI, SQLAlchemy |
| Database | AWS RDS (PostgreSQL) |
| Document Storage | AWS S3 |
| Vector Search | FAISS |
| Embeddings & LLM | OpenAI API |
| Auth & Security | AWS IAM, VPC, SSL |
| Containerization | Docker |
| Language | Python |

## Getting Started

### Prerequisites

- Python 3.10+
- Docker
- AWS account with RDS, S3, and IAM configured
- OpenAI API key

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/Mama-Thomas/geriassist-rag-aws.git
   cd geriassist-rag-aws
   ```

2. Create environment file
   ```bash
   cp .env.example .env
   # Fill in your AWS credentials and OpenAI API key
   ```

3. Run with Docker
   ```bash
   docker build -t geriassist .
   docker run -p 8000:8000 --env-file .env geriassist
   ```

4. Access the API at `http://localhost:8000/docs`

## Project Structure

```
geriassist-rag-aws/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Config, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── services/     # RAG pipeline, embeddings
│   │   └── main.py       # FastAPI app entry
│   └── requirements.txt
├── .env.example
├── Dockerfile
├── LICENSE
└── README.md
```

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Author

**Mama Thomas** — [GitHub](https://github.com/Mama-Thomas) · [LinkedIn](https://www.linkedin.com/in/mama-thomas-89b0a321b)
