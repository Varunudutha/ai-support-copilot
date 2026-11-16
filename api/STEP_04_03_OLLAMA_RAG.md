# Step 04.3 — Ollama-powered RAG answer generation

## What this step adds

- Calls the local Ollama `/api/chat` endpoint from the Node.js API.
- Retrieves workspace-scoped chunks through the existing Atlas Vector Search service.
- Builds bounded JSON context with request-local source identifiers (`S1`, `S2`, ...).
- Requires a structured answer with citation IDs.
- Validates all returned citation IDs against retrieved chunks before returning citations.
- Abstains when no chunks are retrieved or the model returns no verifiable citations.

## Local Ollama setup

Recommended starter model for a memory-constrained development machine:

```powershell
ollama pull qwen2.5:1.5b-instruct
ollama run qwen2.5:1.5b-instruct
```

The Ollama daemon must be running and the configured model must be available locally.
The API calls Ollama at `http://127.0.0.1:11434` by default. No Ollama API key is needed for local use.

## API configuration

Add these variables to `api/.env` (keep all existing values):

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:1.5b-instruct
OLLAMA_TIMEOUT_MS=180000
OLLAMA_KEEP_ALIVE=5m
```

Do not commit `api/.env`.

## Start services

Terminal 1 — MongoDB (if using Docker):

```powershell
docker compose up -d mongodb
```

Terminal 2 — Python embedding service:

```powershell
cd ai-service
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Terminal 3 — Node API:

```powershell
cd api
npm run dev
```

Terminal 4 — Frontend:

```powershell
cd web
npm run dev
```

## Endpoint

`POST /api/workspaces/:workspaceId/knowledge-documents/answer`

Headers:

```text
Authorization: Bearer <access-token>
X-Workspace-Id: <workspace-id>
Content-Type: application/json
```

Request:

```json
{
  "question": "How can I return an order?",
  "limit": 5
}
```

`limit` is optional and must be between 1 and 10.

The endpoint requires an authenticated user who is an active member of the workspace.

## Verification

From `api/`:

```powershell
npm run typecheck
npm test
npm run build
```

Then use Postman or the frontend to test a question whose answer exists in an uploaded and processed knowledge document.

Expected response shape:

```json
{
  "question": "How can I return an order?",
  "answer": "Eligible orders can be returned within 30 days.",
  "grounded": true,
  "model": "qwen2.5:1.5b-instruct",
  "citations": [
    {
      "citationId": "S1",
      "id": "<chunk-id>",
      "documentId": "<document-id>",
      "chunkIndex": 0,
      "sourceName": "returns-policy.txt",
      "mimeType": "text/plain",
      "pageCount": null,
      "score": 0.87,
      "excerpt": "Returns are accepted within 30 days."
    }
  ]
}
```

The values above are illustrative. Citation identifiers are generated per request. The model's citation identifiers are accepted only when they match retrieved chunks.

## Limitations in this sub-step

- This is a single-turn answer endpoint; conversation history and persisted chats are not included.
- Streaming responses are not included.
- Retrieval relevance thresholds and answer-quality evaluation are deferred to the evaluation milestone.
- Ollama must be reachable from the Node API host. A remote deployment will need a reachable, secured Ollama service rather than `127.0.0.1`.
