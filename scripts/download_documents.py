#!/usr/bin/env python3
"""
GeriAssist Document Downloader
Downloads curated geriatric documents from authoritative sources.
Usage: python3 scripts/download_documents.py
"""

import json
import os
import re
import time
import requests
from pathlib import Path

# Configuration
URLS_FILE = "scripts/document_urls.json"
DATA_DIR = "data/raw"
TIMEOUT = 30
RETRY_ATTEMPTS = 2
DELAY_BETWEEN_DOWNLOADS = 1  # seconds, be polite to servers

# PDF headers to avoid blocks
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.ncbi.nlm.nih.gov/",
}


def sanitize_filename(title: str, ext: str = ".pdf") -> str:
    """Convert a title to a safe filename."""
    # Remove special chars, keep alphanumeric and spaces
    clean = re.sub(r"[^\w\s-]", "", title)
    # Replace spaces with underscores
    clean = re.sub(r"\s+", "_", clean.strip())
    # Limit length
    clean = clean[:80]
    return f"{clean}{ext}"


def download_file(url: str, save_path: str, retries: int = RETRY_ATTEMPTS) -> bool:
    """Download a single file with retry logic."""
    for attempt in range(retries + 1):
        try:
            response = requests.get(
                url, headers=HEADERS, timeout=TIMEOUT,
                stream=True, allow_redirects=True
            )
            response.raise_for_status()

            with open(save_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            file_size = os.path.getsize(save_path)

            # Check if we got an HTML error page instead of a PDF
            if file_size < 5000:
                with open(save_path, 'rb') as f:
                    header = f.read(20)
                if b'%PDF' not in header and b'<!DOCTYPE' in header.lower() or b'<html' in header.lower():
                    os.remove(save_path)
                    print(f"      Skipped (HTML error page, not PDF)")
                    return False

            size_kb = file_size / 1024
            print(f"      OK ({size_kb:.0f} KB)")
            return True

        except requests.exceptions.RequestException as e:
            if attempt < retries:
                print(f"      Retry {attempt + 1}/{retries}...")
                time.sleep(3)
            else:
                print(f"      FAILED: {e}")
                return False

    return False


def main():
    # Load URL list
    with open(URLS_FILE, "r") as f:
        url_data = json.load(f)

    total_docs = sum(len(docs) for docs in url_data.values())
    print(f"\nGeriAssist Document Downloader")
    print(f"{'=' * 50}")
    print(f"Total documents to download: {total_docs}")
    print()

    stats = {"downloaded": 0, "failed": 0, "skipped": 0}

    for category, documents in url_data.items():
        category_dir = os.path.join(DATA_DIR, category)
        os.makedirs(category_dir, exist_ok=True)

        print(f"\n--- {category.upper()} ({len(documents)} documents) ---")

        for i, doc in enumerate(documents, 1):
            url = doc["url"]
            title = doc["title"]
            filename = sanitize_filename(title)
            save_path = os.path.join(category_dir, filename)

            # Skip if already downloaded
            if os.path.exists(save_path) and os.path.getsize(save_path) > 5000:
                print(f"   [{i}/{len(documents)}] SKIP (exists): {filename}")
                stats["skipped"] += 1
                continue

            print(f"   [{i}/{len(documents)}] {title}")
            print(f"      URL: {url}")

            success = download_file(url, save_path)

            if success:
                stats["downloaded"] += 1
            else:
                stats["failed"] += 1

            # Be polite to servers
            time.sleep(DELAY_BETWEEN_DOWNLOADS)

    # Summary
    print(f"\n{'=' * 50}")
    print(f"DOWNLOAD COMPLETE")
    print(f"  Downloaded: {stats['downloaded']}")
    print(f"  Skipped:    {stats['skipped']}")
    print(f"  Failed:     {stats['failed']}")
    print(f"{'=' * 50}")

    # List what we got
    print(f"\nFiles by category:")
    for category in url_data.keys():
        category_dir = os.path.join(DATA_DIR, category)
        if os.path.isdir(category_dir):
            files = [f for f in os.listdir(category_dir) if f.endswith(".pdf")]
            total_size = sum(
                os.path.getsize(os.path.join(category_dir, f)) for f in files
            )
            print(f"  {category}: {len(files)} files ({total_size / (1024*1024):.1f} MB)")


if __name__ == "__main__":
    main()