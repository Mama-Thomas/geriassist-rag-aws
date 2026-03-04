#!/usr/bin/env python3
"""
GeriAssist S3 Upload & Ingestion Script
Uploads downloaded documents to S3 and triggers batch ingestion.
Usage: python3 scripts/upload_and_ingest.py
"""

import os
import subprocess
import json
import requests

DATA_DIR = "data/raw"
API_BASE = "http://localhost:8000"
CATEGORIES = ["cdc", "nia", "who", "nih", "other"]


def upload_to_s3():
    """Upload all downloaded documents to S3 using AWS CLI."""
    print("\n=== Uploading to S3 ===\n")

    for category in CATEGORIES:
        local_dir = os.path.join(DATA_DIR, category)
        if not os.path.isdir(local_dir):
            continue

        files = [f for f in os.listdir(local_dir) if f.lower().endswith((".pdf", ".txt"))]
        if not files:
            print(f"  {category}: no files, skipping")
            continue

        s3_path = f"s3://geriassist-docs-mamathomas/documents/{category}/"
        print(f"  {category}: uploading {len(files)} files to {s3_path}")

        result = subprocess.run(
            ["aws", "s3", "cp", local_dir, s3_path, "--recursive",
             "--exclude", "*", "--include", "*.pdf", "--include", "*.txt"],
            capture_output=True, text=True
        )

        if result.returncode == 0:
            print(f"    Done!")
        else:
            print(f"    Error: {result.stderr}")


def trigger_ingestion():
    """Trigger batch ingestion via the API."""
    print("\n=== Triggering Batch Ingestion ===\n")

    # Check if backend is running
    try:
        health = requests.get(f"{API_BASE}/health", timeout=5)
        health_data = health.json()
        print(f"  Backend is running. Current vectors: {health_data.get('total_vectors', 0)}")
    except Exception as e:
        print(f"  ERROR: Backend not running at {API_BASE}")
        print(f"  Start it first: cd backend && uvicorn app.main:app --reload")
        return

    # Ingest each category
    for category in CATEGORIES:
        print(f"\n  Ingesting {category}...")
        try:
            response = requests.post(
                f"{API_BASE}/s3/ingest",
                params={"category": category},
                timeout=300  # 5 min timeout for large batches
            )
            result = response.json()
            print(f"    {result.get('message', 'Done')}")
            if result.get("total_chunks"):
                print(f"    Chunks: {result['total_chunks']}, Vectors: {result.get('total_vectors', '?')}")
            if result.get("errors"):
                for err in result["errors"][:3]:
                    print(f"    Error: {err['file']} - {err['error']}")
        except Exception as e:
            print(f"    Failed: {e}")

    # Backup FAISS
    print("\n  Backing up FAISS index to S3...")
    try:
        backup = requests.post(f"{API_BASE}/s3/backup-index", timeout=60)
        print(f"    {backup.json().get('message', 'Done')}")
    except Exception as e:
        print(f"    Backup failed: {e}")

    # Final stats
    print("\n=== Final Stats ===\n")
    try:
        stats = requests.get(f"{API_BASE}/stats", timeout=10)
        data = stats.json()
        print(f"  Documents: {data['documents']}")
        print(f"  Chunks:    {data['chunks']}")
        print(f"  Vectors:   {data['vectors']}")
        print(f"  Queries:   {data['queries_logged']}")
    except Exception as e:
        print(f"  Could not get stats: {e}")


if __name__ == "__main__":
    upload_to_s3()
    trigger_ingestion()