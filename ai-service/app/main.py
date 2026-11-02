from fastapi import FastAPI

app = FastAPI(
    title="AI Support Copilot - AI Service",
    description="Local AI services for document embeddings and retrieval.",
    version="0.1.0",
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ai-support-copilot-ai",
        "stage": "step-03-01",
    }


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "message": "AI Support Copilot AI service is running.",
        "health": "/health",
        "docs": "/docs",
    }
