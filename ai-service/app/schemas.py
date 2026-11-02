from pydantic import BaseModel, Field, field_validator


class EmbeddingRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=32)

    @field_validator("texts")
    @classmethod
    def validate_texts(cls, texts: list[str]) -> list[str]:
        cleaned = [text.strip() for text in texts]
        if any(not text for text in cleaned):
            raise ValueError("Texts must not be empty or whitespace-only.")
        if any(len(text) > 2000 for text in cleaned):
            raise ValueError("Each text must be 2,000 characters or fewer.")
        return cleaned


class EmbeddingResponse(BaseModel):
    model: str
    dimensions: int
    count: int
    embeddings: list[list[float]]
