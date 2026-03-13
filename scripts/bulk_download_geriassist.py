#!/usr/bin/env python3
"""
GeriAssist Bulk Document Collector

  Wave 1: NIA publications crawler          — downloads PDFs from NIA website
  Wave 2: PubMed Central XML full-text      — fetches full text via efetch API
                                              (works for ALL open-access articles,
                                               saves as .txt, "View Source" links
                                               to the real PMC article page)
  Wave 3: CORE Open Access API              — downloads PDFs from CORE

Run:
  python3 scripts/bulk_download_geriassist.py --wave 1
  python3 scripts/bulk_download_geriassist.py --wave 2
  python3 scripts/bulk_download_geriassist.py --wave 3
  python3 scripts/bulk_download_geriassist.py --all

Environment variables (optional but recommended):
  NCBI_API_KEY   — raises PMC rate limit 3 → 10 req/s
                   get free key: https://www.ncbi.nlm.nih.gov/account/
  NCBI_EMAIL     — required by NCBI policy
  CORE_API_KEY   — raises CORE rate limit significantly
                   get free key: https://core.ac.uk/services/api
"""

import argparse
import csv
import hashlib
import os
import re
import time
import warnings
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

# Suppress BeautifulSoup warning about parsing XML with HTML parser
warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

# ══════════════════════════════════════════════════════════════════════════════
# Paths
# ══════════════════════════════════════════════════════════════════════════════

BASE_DIR      = Path(__file__).resolve().parents[1]
RAW_DIR       = BASE_DIR / "data" / "raw"
LOG_DIR       = BASE_DIR / "data" / "logs"
MANIFEST_PATH = LOG_DIR / "download_manifest.csv"

DIRS = {
    "nia":  RAW_DIR / "nia",
    "pmc":  RAW_DIR / "pmc",
    "core": RAW_DIR / "core",
    "cdc":  RAW_DIR / "cdc",
    "who":  RAW_DIR / "who",
}

for d in list(DIRS.values()) + [LOG_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ══════════════════════════════════════════════════════════════════════════════
# HTTP session
# ══════════════════════════════════════════════════════════════════════════════

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "GeriAssist-Research-Tool/1.0 (mamathomas594@gmail.com)",
    "Accept": "application/pdf,application/xml,application/json,text/html;q=0.8,*/*;q=0.6",
})

TIMEOUT = 45
SLEEP   = 1.0

# ══════════════════════════════════════════════════════════════════════════════
# API credentials & rate limits
# ══════════════════════════════════════════════════════════════════════════════

NCBI_API_KEY    = os.getenv("NCBI_API_KEY", "")
NCBI_EMAIL      = os.getenv("NCBI_EMAIL", "mamathomas594@gmail.com")
NCBI_TOOL       = "geriassist-bulk-downloader"
PMC_DELAY       = 0.12 if NCBI_API_KEY else 0.4   # 10/s with key, 3/s without

PMC_SEARCH_URL  = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PMC_SUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
PMC_FETCH_URL   = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"

CORE_API_KEY    = os.getenv("CORE_API_KEY", "")
CORE_SEARCH_URL = "https://api.core.ac.uk/v3/search/works"
CORE_DELAY      = 0.15 if CORE_API_KEY else 1.2

# ══════════════════════════════════════════════════════════════════════════════
# Search terms
# ══════════════════════════════════════════════════════════════════════════════

PMC_SEARCH_TERMS = [
    "geriatrics",
    "geriatric medicine",
    "older adults health",
    "elderly care",
    "fall prevention elderly",
    "dementia management",
    "frailty syndrome",
    "aging mobility",
    "caregiver burden",
    "gerontology",
    "nursing home care",
    "polypharmacy elderly",
    "healthy aging",
    "rehabilitation geriatric",
    "elder abuse",
    "depression older adults",
    "sleep disorders elderly",
    "chronic disease management elderly",
    "cognitive decline aging",
    "osteoporosis elderly",
]

CORE_SEARCH_TERMS = [
    "geriatrics clinical care",
    "geriatric assessment",
    "older adults dementia",
    "elderly fall prevention",
    "aging chronic disease",
    "gerontology care",
    "frailty elderly treatment",
    "palliative care elderly",
    "medication management elderly",
    "cognitive impairment aging",
]

# ══════════════════════════════════════════════════════════════════════════════
# Shared utilities
# ══════════════════════════════════════════════════════════════════════════════

def sanitize(name: str) -> str:
    name = re.sub(r"[^\w\s.-]", "", name)
    name = re.sub(r"\s+", "_", name.strip())
    return name[:150] or "document"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_seen_urls() -> set:
    seen = set()
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row.get("url"):
                    seen.add(row["url"])
    return seen


def append_manifest(rows: list):
    exists = MANIFEST_PATH.exists()
    with open(MANIFEST_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["source", "title", "url", "local_path", "sha256", "size_bytes"],
        )
        if not exists:
            writer.writeheader()
        for row in rows:
            writer.writerow(row)


def save_pdf_bytes(data: bytes, title: str, url: str,
                   out_dir: Path, source: str, seen: set) -> dict | None:
    """Validate raw bytes as PDF, write to disk, return manifest row."""
    if url in seen:
        return None
    if len(data) < 5000:
        print(f"      Skipped (too small: {len(data)} bytes)")
        return None
    if data[:4] != b"%PDF":
        print(f"      Skipped (not a PDF — starts with {data[:8]!r})")
        return None

    filename = sanitize(title)
    if not filename.lower().endswith(".pdf"):
        filename += ".pdf"
    out_path = out_dir / filename

    out_path.write_bytes(data)
    seen.add(url)
    size = out_path.stat().st_size
    print(f"      OK ({size // 1024} KB)")
    return {
        "source":     source,
        "title":      title,
        "url":        url,
        "local_path": str(out_path),
        "sha256":     sha256_file(out_path),
        "size_bytes": size,
    }


def download_pdf_url(title: str, url: str,
                     out_dir: Path, source: str, seen: set) -> dict | None:
    """Stream a PDF from a direct URL and save it."""
    if url in seen:
        return None
    try:
        resp = SESSION.get(url, timeout=TIMEOUT, stream=True, allow_redirects=True)
        resp.raise_for_status()
        return save_pdf_bytes(resp.content, title, url, out_dir, source, seen)
    except requests.RequestException as e:
        print(f"      FAILED download: {e}")
        return None


def save_text_file(text: str, title: str, url: str,
                   out_dir: Path, source: str, seen: set) -> dict | None:
    """
    Save extracted plain text as a .txt file.

    The `url` stored here is always the original PMC article page URL:
      https://pmc.ncbi.nlm.nih.gov/articles/PMC.../
    NOT the S3 path. This is what gets stored in RDS as source_url so
    the frontend "View Source" button opens the real PMC article page.
    """
    if url in seen:
        return None

    filename = sanitize(title) + ".txt"
    out_path = out_dir / filename

    if out_path.exists() and out_path.stat().st_size > 500:
        seen.add(url)
        return None

    out_path.write_text(text, encoding="utf-8")
    seen.add(url)
    size = out_path.stat().st_size
    print(f"      OK ({size // 1024} KB, {len(text.split())} words)")
    return {
        "source":     source,
        "title":      title,
        "url":        url,          # ← PMC article page (used as source_url in RAG metadata)
        "local_path": str(out_path),
        "sha256":     sha256_file(out_path),
        "size_bytes": size,
    }


# ══════════════════════════════════════════════════════════════════════════════
# WAVE 1: NIA Publications
# ══════════════════════════════════════════════════════════════════════════════

NIA_PAGES = [
    "https://order.nia.nih.gov/view-all-publications",
]


def extract_nia_download_link(soup, page_url):
    meta_title = soup.find("meta", attrs={"property": "og:title"})
    if meta_title and meta_title.get("content"):
        title = meta_title["content"].strip()
    else:
        h1    = soup.find("h1")
        title = (h1.get_text(" ", strip=True) if h1 else None) or \
                (soup.title.get_text(strip=True) if soup.title else "NIA Document")

    # First pass: prefer links explicitly labelled download/pdf/printable
    for a in soup.find_all("a", href=True):
        full_url = urljoin(page_url, a["href"])
        text     = a.get_text(" ", strip=True).lower()
        if not urlparse(full_url).netloc.endswith("nia.nih.gov"):
            continue
        if not full_url.lower().endswith(".pdf"):
            continue
        if "spanish" in full_url.lower() or "espanol" in full_url.lower():
            continue
        if "download" in text or text == "pdf" or "printable" in text:
            return title, full_url

    # Second pass: any NIA PDF link
    for a in soup.find_all("a", href=True):
        full_url = urljoin(page_url, a["href"])
        if (urlparse(full_url).netloc.endswith("nia.nih.gov")
                and full_url.lower().endswith(".pdf")
                and "spanish" not in full_url.lower()
                and "espanol" not in full_url.lower()):
            return title, full_url

    return title, None


def run_wave_1(seen: set) -> list:
    print("\n=== WAVE 1: NIA Publications Crawler ===\n")
    downloaded:  list = []
    found_pages: set  = set()
    found_pdfs:  set  = set()

    for page_url in NIA_PAGES:
        print(f"  Crawling: {page_url}")
        try:
            resp = SESSION.get(page_url, timeout=TIMEOUT)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"    Failed: {e}")
            continue

        soup      = BeautifulSoup(resp.text, "html.parser")
        pub_links = []
        for a in soup.find_all("a", href=True):
            full_url = urljoin(page_url, a["href"])
            if "/publication/" in full_url and full_url not in found_pages:
                found_pages.add(full_url)
                pub_links.append(full_url)

        print(f"    Found {len(pub_links)} publication pages")

        for pub_url in pub_links:
            try:
                detail = SESSION.get(pub_url, timeout=TIMEOUT)
                detail.raise_for_status()
            except requests.RequestException:
                continue

            detail_soup = BeautifulSoup(detail.text, "html.parser")
            title, pdf_url = extract_nia_download_link(detail_soup, pub_url)

            if not pdf_url or pdf_url in found_pdfs:
                continue
            found_pdfs.add(pdf_url)
            if not title.startswith("NIA "):
                title = f"NIA {title}"

            print(f"    [{len(found_pdfs)}] {title[:60]}...")
            row = download_pdf_url(title, pdf_url, DIRS["nia"], "nia", seen)
            if row:
                downloaded.append(row)
            time.sleep(SLEEP)

    print(f"\n  Wave 1: {len(found_pdfs)} PDFs found, {len(downloaded)} new downloaded")
    return downloaded


# ══════════════════════════════════════════════════════════════════════════════
# WAVE 2: PubMed Central — XML full-text via efetch API
#
# Why XML instead of PDF:
#   - efetch XML works for ALL open-access PMC articles (PDFs often unavailable)
#   - Clean structured text = better RAG chunking, no PDF parse errors
#   - "View Source" links to the real PMC article page, not an S3 file
# ══════════════════════════════════════════════════════════════════════════════

def ncbi_get(url: str, params: dict) -> requests.Response:
    """NCBI E-utilities GET with retry and rate-limit handling."""
    params = dict(params)
    params["tool"]  = NCBI_TOOL
    params["email"] = NCBI_EMAIL
    if NCBI_API_KEY:
        params["api_key"] = NCBI_API_KEY

    for attempt in range(4):
        try:
            resp = SESSION.get(url, params=params, timeout=TIMEOUT)
            if resp.status_code == 429:
                wait = 2 ** (attempt + 1)
                print(f"    NCBI rate-limited — waiting {wait}s...")
                time.sleep(wait)
                continue
            return resp
        except requests.RequestException as e:
            time.sleep(2 ** attempt)
            if attempt == 3:
                raise e
    raise requests.RequestException("NCBI request failed after 4 attempts")


def search_pmc_ids(term: str, retmax: int = 100) -> list[str]:
    resp = ncbi_get(PMC_SEARCH_URL, {
        "db":      "pmc",
        "term":    term + "[Title/Abstract] AND open access[filter]",
        "retmode": "json",
        "retmax":  str(retmax),
        "sort":    "relevance",
    })
    resp.raise_for_status()
    return resp.json().get("esearchresult", {}).get("idlist", [])


def fetch_pmc_summaries(pmc_ids: list[str]) -> dict:
    if not pmc_ids:
        return {}
    resp = ncbi_get(PMC_SUMMARY_URL, {
        "db":      "pmc",
        "id":      ",".join(pmc_ids),
        "retmode": "json",
    })
    resp.raise_for_status()
    return resp.json().get("result", {})


def fetch_pmc_fulltext(pmc_id: str) -> str | None:
    """
    Fetch full-text XML via efetch and extract clean plain text.
    Works for ALL open-access articles — no PDF needed.
    Returns clean text string, or None if unavailable or too short.
    """
    resp = ncbi_get(PMC_FETCH_URL, {
        "db":      "pmc",
        "id":      pmc_id,
        "rettype": "full",
        "retmode": "xml",
    })
    if resp.status_code != 200:
        return None

    try:
        soup = BeautifulSoup(resp.content, "lxml-xml")
    except Exception:
        soup = BeautifulSoup(resp.content, "html.parser")

    # Strip non-content tags
    for tag in soup.find_all(["ref", "ref-list", "table", "table-wrap",
                               "fig", "supplementary-material", "mml:math",
                               "front", "back"]):
        tag.decompose()

    parts = []

    title_tag = soup.find("article-title")
    if title_tag:
        parts.append(title_tag.get_text(" ", strip=True))

    abstract = soup.find("abstract")
    if abstract:
        parts.append("ABSTRACT\n" + abstract.get_text(" ", strip=True))

    body = soup.find("body")
    if body:
        for sec in body.find_all("sec", recursive=False):
            heading      = sec.find(["title", "label"])
            heading_text = heading.get_text(" ", strip=True) if heading else ""
            body_text    = sec.get_text(" ", strip=True)
            if heading_text:
                parts.append(f"\n{heading_text.upper()}\n{body_text}")
            else:
                parts.append(body_text)
    elif not abstract:
        parts.append(soup.get_text(" ", strip=True))

    text = "\n\n".join(parts)
    text = re.sub(r" {2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() if len(text) > 500 else None


def run_wave_2(seen: set, limit: int = 1500) -> list:
    print("\n=== WAVE 2: PubMed Central — XML full-text (all open access) ===\n")
    if not NCBI_API_KEY:
        print("  TIP: Set NCBI_API_KEY env var to raise rate limit from 3→10 req/s\n")

    downloaded: list = []
    found_ids:  set  = set()
    skipped          = 0

    for ti, term in enumerate(PMC_SEARCH_TERMS, 1):
        if len(downloaded) >= limit:
            break

        print(f"  Search [{ti}/{len(PMC_SEARCH_TERMS)}]: '{term}'")
        time.sleep(PMC_DELAY)

        try:
            pmc_ids = search_pmc_ids(term, retmax=100)
        except requests.RequestException as e:
            print(f"    Search failed: {e}")
            continue

        new_ids = [pid for pid in pmc_ids if pid not in found_ids]
        print(f"    Found {len(pmc_ids)} IDs, {len(new_ids)} new")
        for pid in new_ids:
            found_ids.add(pid)

        try:
            summaries = fetch_pmc_summaries(new_ids)
        except requests.RequestException:
            summaries = {}

        for pmc_id in new_ids:
            if len(downloaded) >= limit:
                break

            summary     = summaries.get(pmc_id, {}) if isinstance(summaries, dict) else {}
            raw_title   = summary.get("title") or f"PMC Article {pmc_id}"
            title       = f"PMC {re.sub(r'\\s+', ' ', raw_title).strip()}"
            # Stored as source_url in RDS — opens the real PMC article in browser
            article_url = f"https://pmc.ncbi.nlm.nih.gov/articles/PMC{pmc_id}/"

            print(f"    [{len(downloaded)+1}] PMC{pmc_id}: {title[:55]}...")
            time.sleep(PMC_DELAY)

            text = fetch_pmc_fulltext(pmc_id)
            if not text:
                skipped += 1
                print(f"      No full text available (skipped {skipped} total)")
                continue

            row = save_text_file(text, title, article_url, DIRS["pmc"], "pmc", seen)
            if row:
                downloaded.append(row)

    print(f"\n  Wave 2 complete: {len(downloaded)} saved, {skipped} skipped (no content)")
    return downloaded


# ══════════════════════════════════════════════════════════════════════════════
# WAVE 3: CORE Open Access API
# ══════════════════════════════════════════════════════════════════════════════

def core_search(query: str, limit: int = 100, offset: int = 0) -> list[dict]:
    """Search CORE for open-access works with PDF download URLs."""
    headers = {"Accept": "application/json"}
    if CORE_API_KEY:
        headers["Authorization"] = f"Bearer {CORE_API_KEY}"

    params = {
        "q":      query,
        "limit":  limit,
        "offset": offset,
        "filter": "language.code:en",
    }

    try:
        resp = SESSION.get(CORE_SEARCH_URL, headers=headers,
                           params=params, timeout=TIMEOUT)
        if resp.status_code == 429:
            print(f"    CORE rate-limited — waiting 10s...")
            time.sleep(10)
            resp = SESSION.get(CORE_SEARCH_URL, headers=headers,
                               params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json().get("results", [])
    except requests.RequestException as e:
        print(f"    CORE search failed: {e}")
        return []


def get_core_pdf_url(work: dict) -> str | None:
    """Extract the best PDF URL from a CORE work result."""
    url = work.get("downloadUrl")
    if url and url.lower().endswith(".pdf"):
        return url
    for u in work.get("sourceFulltextUrls") or []:
        if u and u.lower().endswith(".pdf"):
            return u
    if url:
        return url
    return None


def run_wave_3(seen: set, limit: int = 1000) -> list:
    print("\n=== WAVE 3: CORE Open Access API ===\n")
    if not CORE_API_KEY:
        print("  TIP: Get a free CORE API key at https://core.ac.uk/services/api")
        print("       Set as CORE_API_KEY env var for higher rate limits.\n")

    downloaded:     list = []
    seen_core_urls: set  = set()

    for ti, term in enumerate(CORE_SEARCH_TERMS, 1):
        if len(downloaded) >= limit:
            break

        print(f"  Search [{ti}/{len(CORE_SEARCH_TERMS)}]: '{term}'")
        time.sleep(CORE_DELAY)

        works = core_search(term, limit=100)
        print(f"    Found {len(works)} works")

        for work in works:
            if len(downloaded) >= limit:
                break

            raw_title = (work.get("title") or "CORE Document").strip()
            title     = f"CORE {re.sub(r'\\s+', ' ', raw_title)}"
            pdf_url   = get_core_pdf_url(work)

            if not pdf_url or pdf_url in seen_core_urls or pdf_url in seen:
                continue
            seen_core_urls.add(pdf_url)

            print(f"    [{len(downloaded)+1}] {title[:65]}...")
            time.sleep(CORE_DELAY)

            row = download_pdf_url(title, pdf_url, DIRS["core"], "core", seen)
            if row:
                downloaded.append(row)

    print(f"\n  Wave 3 complete: {len(downloaded)} new CORE PDFs downloaded")
    return downloaded


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="GeriAssist Bulk Document Collector")
    parser.add_argument("--wave", type=int, choices=[1, 2, 3],
                        help="Run a specific wave (1=NIA, 2=PMC XML, 3=CORE)")
    parser.add_argument("--all", action="store_true", help="Run all waves")
    args = parser.parse_args()

    if not args.wave and not args.all:
        print("Usage:")
        print("  python3 scripts/bulk_download_geriassist.py --wave 1   (NIA publications)")
        print("  python3 scripts/bulk_download_geriassist.py --wave 2   (PMC XML full-text)")
        print("  python3 scripts/bulk_download_geriassist.py --wave 3   (CORE open access PDFs)")
        print("  python3 scripts/bulk_download_geriassist.py --all      (all waves)")
        return

    seen     = load_seen_urls()
    all_rows = []

    if args.all or args.wave == 1:
        rows = run_wave_1(seen)
        append_manifest(rows)
        all_rows.extend(rows)
        print(f"\n  Wave 1 result: {len(rows)} new NIA documents")

    if args.all or args.wave == 2:
        rows = run_wave_2(seen, limit=1500)
        append_manifest(rows)
        all_rows.extend(rows)
        print(f"\n  Wave 2 result: {len(rows)} new PMC documents")

    if args.all or args.wave == 3:
        rows = run_wave_3(seen, limit=1000)
        append_manifest(rows)
        all_rows.extend(rows)
        print(f"\n  Wave 3 result: {len(rows)} new CORE documents")

    total_mb = sum(r["size_bytes"] for r in all_rows) / (1024 * 1024) if all_rows else 0

    print(f"\n{'=' * 60}")
    print(f"DOWNLOAD COMPLETE")
    print(f"  New documents: {len(all_rows)}")
    print(f"  Total size:    {total_mb:.1f} MB")
    print(f"  Manifest:      {MANIFEST_PATH}")
    print(f"{'=' * 60}")

    for source, directory in DIRS.items():
        pdfs  = len(list(directory.glob("*.pdf")))
        txts  = len(list(directory.glob("*.txt")))
        total = pdfs + txts
        if total > 0:
            parts = []
            if pdfs: parts.append(f"{pdfs} PDFs")
            if txts: parts.append(f"{txts} text files")
            print(f"  {source.upper()}: {' + '.join(parts)} in {directory}")

    print(f"\nNext steps:")
    print(f"  1. python3 scripts/upload_and_ingest.py")
    print(f"  2. curl http://localhost:8000/stats | python3 -m json.tool")


if __name__ == "__main__":
    main()
