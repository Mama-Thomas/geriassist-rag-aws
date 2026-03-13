#!/usr/bin/env python3
"""
GeriAssist S3 Upload & Ingestion Script
Uploads downloaded documents to S3 and triggers batch ingestion.

Changes from original:
  - Added "pmc" and "core" to CATEGORIES (were missing)
  - For .txt files (PMC articles), the original PMC article URL is passed
    as source_url to the ingestion API so "View Source" opens the real
    article page instead of an S3 path

Usage: python3 scripts/upload_and_ingest.py
"""

import os
import subprocess
import json
import requests

DATA_DIR = "data/raw"
API_BASE = "http://localhost:8000"

# Full category list — matches all subdirectories under data/raw/
CATEGORIES = ["nia", "pmc", "core", "cdc", "who"]

# Manifest path — used to look up original URLs for .txt files
MANIFEST_PATH = "data/logs/download_manifest.csv"


def load_manifest_urls() -> dict:
    """
    Load manifest CSV and return a dict mapping:
      local_filename → original_url

    This is used so that when we ingest a PMC .txt file, we pass the
    original PMC article URL as source_url instead of the S3 path.
    """
    import csv
    url_map = {}
    if not os.path.exists(MANIFEST_PATH):
        return url_map
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            local_path = row.get("local_path", "")
            url        = row.get("url", "")
            if local_path and url:
                # Key by just the filename so we can look up by basename
                url_map[os.path.basename(local_path)] = url
    return url_map


def upload_to_s3():
    """Upload all downloaded documents to S3 using AWS CLI."""
    print("\n=== Uploading to S3 ===\n")

    for category in CATEGORIES:
        local_dir = os.path.join(DATA_DIR, category)
        if not os.path.isdir(local_dir):
            continue

        files = [f for f in os.listdir(local_dir)
                 if f.lower().endswith((".pdf", ".txt"))]
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

    # Check backend is running
    try:
        health      = requests.get(f"{API_BASE}/health", timeout=5)
        health_data = health.json()
        print(f"  Backend running. Current vectors: {health_data.get('total_vectors', 0)}")
    except Exception:
        print(f"  ERROR: Backend not running at {API_BASE}")
        print(f"  Start it first: cd backend && uvicorn app.main:app --reload")
        return

    # Load manifest so we can pass original URLs for .txt files
    url_map = load_manifest_urls()
    print(f"  Loaded {len(url_map)} URL mappings from manifest\n")

    for category in CATEGORIES:
        local_dir = os.path.join(DATA_DIR, category)
        if not os.path.isdir(local_dir):
            continue

        files = [f for f in os.listdir(local_dir)
                 if f.lower().endswith((".pdf", ".txt"))]
        if not files:
            print(f"  {category}: no files to ingest, skipping")
            continue

        print(f"  Ingesting {category} ({len(files)} files)...")

        # For categories with .txt files (pmc), pass source_url overrides
        # so the ingestion API stores the real article URL, not the S3 path
        txt_files = [f for f in files if f.lower().endswith(".txt")]

        if txt_files and category == "pmc":
            # Ingest file by file so we can pass source_url per file
            ingested = 0
            errors   = []
            for filename in files:
                original_url = url_map.get(filename)
                try:
                    params = {"category": category}
                    # If we have the original URL for this file, pass it
                    # so RAG metadata stores the PMC article page, not S3
                    if original_url and filename.endswith(".txt"):
                        params["source_url_override"] = original_url
                        params["filename"] = filename

                    response = requests.post(
                        f"{API_BASE}/s3/ingest-file",
                        params=params,
                        timeout=120
                    )
                    result = response.json()
                    if result.get("chunks"):
                        ingested += 1
                    if result.get("error"):
                        errors.append({"file": filename, "error": result["error"]})
                except Exception as e:
                    errors.append({"file": filename, "error": str(e)})

            print(f"    Ingested: {ingested}/{len(files)} files")
            for err in errors[:3]:
                print(f"    Error: {err['file']} - {err['error']}")

        else:
            # Standard batch ingest for NIA/CORE PDFs (no URL override needed)
            try:
                response = requests.post(
                    f"{API_BASE}/s3/ingest",
                    params={"category": category},
                    timeout=300
                )
                result = response.json()
                print(f"    {result.get('message', 'Done')}")
                if result.get("total_chunks"):
                    print(f"    Chunks: {result['total_chunks']}, "
                          f"Vectors: {result.get('total_vectors', '?')}")
                if result.get("errors"):
                    for err in result["errors"][:3]:
                        print(f"    Error: {err['file']} - {err['error']}")
            except Exception as e:
                print(f"    Failed: {e}")

    # Backup FAISS index
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
        data  = stats.json()
        print(f"  Documents: {data['documents']}")
        print(f"  Chunks:    {data['chunks']}")
        print(f"  Vectors:   {data['vectors']}")
        print(f"  Queries:   {data['queries_logged']}")
    except Exception as e:
        print(f"  Could not get stats: {e}")


if __name__ == "__main__":
    upload_to_s3()
    trigger_ingestion()
