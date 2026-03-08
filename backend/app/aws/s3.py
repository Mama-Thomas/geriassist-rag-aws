import os
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

BUCKET_NAME = os.getenv("AWS_S3_BUCKET", "geriassist-docs-mamathomas")
REGION = os.getenv("AWS_REGION", "us-west-2")
s3_client = boto3.client("s3", region_name=REGION)


def upload_document(local_path: str, category: str = "other") -> str:
    filename = os.path.basename(local_path)
    s3_key = f"documents/{category}/{filename}"
    s3_client.upload_file(local_path, BUCKET_NAME, s3_key)
    print(f"   Uploaded -> s3://{BUCKET_NAME}/{s3_key}")
    return s3_key


def download_document(s3_key: str, local_dir: str = "data/downloads") -> str:
    os.makedirs(local_dir, exist_ok=True)
    filename = os.path.basename(s3_key)
    local_path = os.path.join(local_dir, filename)
    s3_client.download_file(BUCKET_NAME, s3_key, local_path)
    return local_path


def list_documents(category: str = None) -> list[dict]:
    prefix = f"documents/{category}/" if category else "documents/"
    results = []
    paginator = s3_client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=prefix):
        for obj in page.get("Contents", []):
            if obj["Key"].endswith("/"):
                continue
            results.append({
                "key": obj["Key"],
                "size_kb": round(obj["Size"] / 1024, 1),
                "last_modified": obj["LastModified"].isoformat(),
            })
    return results


def delete_document(s3_key: str) -> bool:
    try:
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
        return True
    except ClientError:
        return False


def document_exists(s3_key: str) -> bool:
    try:
        s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
        return True
    except ClientError:
        return False


FAISS_FILES = ["index.faiss", "chunk_mapping.json"]


def backup_faiss_index(index_path: str = None) -> bool:
    index_path = index_path or os.getenv("FAISS_INDEX_PATH", "faiss_index")
    success = True
    for filename in FAISS_FILES:
        local_file = os.path.join(index_path, filename)
        if os.path.exists(local_file):
            try:
                s3_client.upload_file(local_file, BUCKET_NAME, f"faiss_backup/{filename}")
                size_mb = os.path.getsize(local_file) / (1024 * 1024)
                print(f"   Backed up {filename} ({size_mb:.1f} MB)")
            except ClientError as e:
                print(f"   Failed: {e}")
                success = False
    return success


def restore_faiss_index(index_path: str = None) -> bool:
    index_path = index_path or os.getenv("FAISS_INDEX_PATH", "faiss_index")
    os.makedirs(index_path, exist_ok=True)
    success = True
    for filename in FAISS_FILES:
        local_file = os.path.join(index_path, filename)
        try:
            s3_client.download_file(BUCKET_NAME, f"faiss_backup/{filename}", local_file)
            print(f"   Restored {filename}")
        except ClientError as e:
            print(f"   Could not restore {filename}: {e}")
            success = False
    return success


def get_faiss_backup_info() -> dict:
    info = {}
    for filename in FAISS_FILES:
        try:
            resp = s3_client.head_object(Bucket=BUCKET_NAME, Key=f"faiss_backup/{filename}")
            info[filename] = {
                "exists": True,
                "size_kb": round(resp["ContentLength"] / 1024, 1),
                "last_modified": resp["LastModified"].isoformat(),
            }
        except ClientError:
            info[filename] = {"exists": False}
    return info


def bulk_upload_directory(local_dir: str, category: str = "other") -> list[str]:
    uploaded = []
    supported = (".pdf", ".txt")
    if not os.path.isdir(local_dir):
        return uploaded
    files = [f for f in os.listdir(local_dir) if f.lower().endswith(supported)]
    print(f"   Found {len(files)} documents in {local_dir}")
    for i, fn in enumerate(sorted(files), 1):
        s3_key = upload_document(os.path.join(local_dir, fn), category=category)
        uploaded.append(s3_key)
        if i % 10 == 0:
            print(f"   ... uploaded {i}/{len(files)}")
    return uploaded

def generate_presigned_url(s3_key: str, expiration: int = 3600) -> str:
    """
    Generate a temporary presigned URL for a document.
    Default expiration: 1 hour (3600 seconds).
    """
    try:
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET_NAME, "Key": s3_key},
            ExpiresIn=expiration,
        )
        return url
    except ClientError:
        return None