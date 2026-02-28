import os
import boto3
from dotenv import load_dotenv

load_dotenv()

s3_client = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-west-2"))
BUCKET_NAME = os.getenv("AWS_S3_BUCKET", "geriassist-docs-mamathomas")


def upload_file_to_s3(local_path: str, s3_key: str) -> str:
    """Upload a file to S3. Returns the S3 path."""
    s3_client.upload_file(local_path, BUCKET_NAME, s3_key)
    s3_path = f"s3://{BUCKET_NAME}/{s3_key}"
    print(f"   ☁️  Uploaded to {s3_path}")
    return s3_path


def download_file_from_s3(s3_key: str, local_path: str) -> str:
    """Download a file from S3 to local path."""
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    s3_client.download_file(BUCKET_NAME, s3_key, local_path)
    return local_path


def list_s3_documents(prefix: str = "documents/") -> list[str]:
    """List all document keys under a prefix."""
    response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=prefix)
    if "Contents" not in response:
        return []
    return [obj["Key"] for obj in response["Contents"]]


def upload_faiss_index(index_path: str = "faiss_index"):
    """Backup FAISS index files to S3."""
    for filename in ["index.faiss", "chunk_mapping.json"]:
        local_file = os.path.join(index_path, filename)
        if os.path.exists(local_file):
            s3_key = f"faiss_backup/{filename}"
            upload_file_to_s3(local_file, s3_key)
    print("   ☁️  FAISS index backed up to S3")


def download_faiss_index(index_path: str = "faiss_index"):
    """Restore FAISS index from S3 backup."""
    os.makedirs(index_path, exist_ok=True)
    for filename in ["index.faiss", "chunk_mapping.json"]:
        s3_key = f"faiss_backup/{filename}"
        local_file = os.path.join(index_path, filename)
        try:
            download_file_from_s3(s3_key, local_file)
        except Exception as e:
            print(f"   ⚠️  Could not download {s3_key}: {e}")
    print("   ☁️  FAISS index restored from S3")
