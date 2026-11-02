"""Lazy-loaded local sentence-transformer embedding model."""

from functools import lru_cache
from typing import Sequence

from sentence_transformers import SentenceTransformer

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS = 384


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """Load the embedding model once per process."""
    model = SentenceTransformer(MODEL_NAME, device="cpu")
    dimension = model.get_sentence_embedding_dimension()
    if dimension != EMBEDDING_DIMENSIONS:
        raise RuntimeError(
            f"Unexpected embedding dimension: {dimension}; "
            f"expected {EMBEDDING_DIMENSIONS}"
        )
    return model


def embed_texts(texts: Sequence[str]) -> list[list[float]]:
    """Convert a batch of non-empty strings into normalized 384-D vectors."""
    cleaned = [text.strip() for text in texts]
    if not cleaned:
        return []
    if any(not text for text in cleaned):
        raise ValueError("Input texts must not be empty or whitespace-only.")

    vectors = get_embedding_model().encode(
        cleaned,
        batch_size=8,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return vectors.tolist()
