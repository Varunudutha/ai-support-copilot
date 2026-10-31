# Milestone 03 — Knowledge Base & Document Upload (API foundation)

## Included in this update

- Workspace-scoped `KnowledgeDocument` MongoDB model.
- Uploads for PDF, DOCX and UTF-8 TXT files, with a 10 MB file limit.
- Random storage filenames; original client filenames are never used as disk paths.
- Basic content-signature validation before document metadata is stored.
- Workspace membership checks on every Knowledge Base endpoint.
- Upload access for owner/admin/agent; deletion restricted to owner/admin; read access for all workspace roles.
- Paginated document listing, workspace-scoped deletion and cleanup of orphaned upload files on failed database writes.
- Unit tests for the file-signature validator.
- Local uploaded files are ignored by Git.
- `.env.example` now contains placeholders rather than credential-looking values.

## API endpoints

| Method | Endpoint | Workspace access |
| --- | --- | --- |
| POST | `/api/workspaces/:workspaceId/knowledge-documents` | owner, admin, agent |
| GET | `/api/workspaces/:workspaceId/knowledge-documents?page=1&limit=20` | any active member |
| DELETE | `/api/workspaces/:workspaceId/knowledge-documents/:documentId` | owner, admin |

Upload requests must use `multipart/form-data` with the file field named `file`, include a Bearer access token, and include the matching `X-Workspace-Id` header. The workspace ID in the route and header must match.

## Current limitations

- This API foundation stores uploaded files locally under `api/storage/knowledge` for development.
- Document text extraction, chunking, embeddings, vector indexing, asynchronous processing, and the Knowledge Base UI are not included yet.
- Signature checks are preliminary validation only. The later extraction pipeline must parse documents defensively and enforce CPU, memory, recursion, and decompression limits.
- For production, replace local disk storage with private object storage and malware scanning; do not expose the storage directory as a static web path.

## Verification

From `api/`:

```bash
npm install
npm run typecheck
npm test
npm run build
```
