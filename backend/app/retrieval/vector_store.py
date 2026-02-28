import os
import json
import numpy as np
import faiss


class FAISSVectorStore:
    """
    FAISS-based vector store with chunk ID mapping.
    Uses IndexFlatL2 (exact search) — good up to ~100K vectors.
    """

    def __init__(self, dimension: int = 1536, index_path: str = "faiss_index"):
        self.dimension = dimension
        self.index_path = index_path
        self.index_file = os.path.join(index_path, "index.faiss")
        self.mapping_file = os.path.join(index_path, "chunk_mapping.json")

        os.makedirs(index_path, exist_ok=True)

        if os.path.exists(self.index_file) and os.path.exists(self.mapping_file):
            self.index = faiss.read_index(self.index_file)
            with open(self.mapping_file, "r") as f:
                self.chunk_mapping = json.load(f)
            print(f"✅ Loaded FAISS index: {self.index.ntotal} vectors")
        else:
            self.index = faiss.IndexFlatL2(dimension)
            self.chunk_mapping = []
            print("🆕 Created new FAISS index")

    def add_embeddings(self, embeddings: list[list[float]], chunk_ids: list[str]):
        """Add embeddings with their corresponding chunk IDs."""
        vectors = np.array(embeddings, dtype="float32")
        self.index.add(vectors)
        self.chunk_mapping.extend(chunk_ids)
        self.save()
        print(f"   Added {len(chunk_ids)} vectors (total: {self.index.ntotal})")

    def search(self, query_embedding: list[float], top_k: int = 5) -> list[dict]:
        """Return the top_k most similar chunks."""
        query_vector = np.array([query_embedding], dtype="float32")
        distances, indices = self.index.search(query_vector, top_k)

        results = []
        for i, idx in enumerate(indices[0]):
            if 0 <= idx < len(self.chunk_mapping):
                results.append(
                    {
                        "chunk_id": self.chunk_mapping[idx],
                        "distance": float(distances[0][i]),
                        "rank": i + 1,
                    }
                )
        return results

    def save(self):
        """Persist index and mapping to disk."""
        faiss.write_index(self.index, self.index_file)
        with open(self.mapping_file, "w") as f:
            json.dump(self.chunk_mapping, f)

    @property
    def total_vectors(self) -> int:
        return self.index.ntotal
