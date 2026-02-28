import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_embedding(text: str, model: str = None) -> list[float]:
    """Generate embedding for a single text string."""
    model = model or os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    response = client.embeddings.create(input=text, model=model)
    return response.data[0].embedding


def generate_embeddings_batch(texts: list[str], model: str = None) -> list[list[float]]:
    """Generate embeddings for a batch of texts. Handles OpenAI's 2048-per-request limit."""
    model = model or os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    all_embeddings = []
    batch_size = 2048

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = client.embeddings.create(input=batch, model=model)
        batch_embeddings = [item.embedding for item in response.data]
        all_embeddings.extend(batch_embeddings)
        print(f"   Embedded batch {i // batch_size + 1} ({len(batch)} chunks)")

    return all_embeddings
