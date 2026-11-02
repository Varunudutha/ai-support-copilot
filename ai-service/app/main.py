from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool

from app.embedding_model import (
    EMBEDDING_DIMENSIONS,
    MODEL_NAME,
    embed_texts,
)
from app.schemas import EmbeddingRequest, EmbeddingResponse

app = FastAPI(
    title="AI Support Copilot - AI Service",
    description="Local AI services for document embeddings and retrieval.",
    version="0.3.0",
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ai-support-copilot-ai",
        "stage": "step-03-03",
    }


@app.get("/model/info", tags=["Embeddings"])
async def model_info() -> dict[str, str | int]:
    return {
        "provider": "local",
        "model": MODEL_NAME,
        "dimensions": EMBEDDING_DIMENSIONS,
        "device": "cpu",
    }


@app.post("/embeddings", response_model=EmbeddingResponse, tags=["Embeddings"])
async def create_embeddings(payload: EmbeddingRequest) -> EmbeddingResponse:
    try:
        vectors = await run_in_threadpool(embed_texts, payload.texts)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="The local embedding model could not generate embeddings.",
        ) from exc

    return EmbeddingResponse(
        model=MODEL_NAME,
        dimensions=EMBEDDING_DIMENSIONS,
        count=len(vectors),
        embeddings=vectors,
    )


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "message": "AI Support Copilot AI service is running.",
        "health": "/health",
        "docs": "/docs",
    }
