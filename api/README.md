# API service

Node.js + Express + TypeScript API for AI Support Copilot.

## Requirements

- Node.js 20.19+ (or 22.12+)
- MongoDB 7+ locally, or a MongoDB Atlas database

## Setup

```bash
cd api
npm install
cp .env.example .env
```

Set `MONGODB_URI` in `.env`. Replace `JWT_ACCESS_SECRET` with a random value of at least 32 characters. With Git Bash, generate one using:

```bash
openssl rand -base64 48
```

For a local MongoDB instance, the default URI is `mongodb://127.0.0.1:27017/ai_support_copilot`.

## Run

```bash
npm run dev
```

The API starts at `http://localhost:4000`. Check `GET /api/health`.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## Authentication design

- Passwords are hashed with bcrypt (12 rounds); plaintext passwords are never stored.
- Access tokens are short-lived JWTs returned to the frontend and held in memory.
- Refresh tokens are random opaque values in an HttpOnly cookie. Only their SHA-256 hashes are stored in MongoDB.
- Refresh tokens rotate on use. Reuse of a revoked refresh token revokes the user's remaining sessions.
- Logout revokes the current refresh session; logout-all revokes all active sessions.
- Authentication endpoints have a rate limit. Cookie-authenticated refresh and logout requests also validate the browser Origin against the configured frontend origin.

## Workspace isolation

A user can belong to multiple workspaces through `Membership` records. Workspace-scoped requests must include `X-Workspace-Id`. The API checks both an active workspace and an active membership for the authenticated user. Never rely on frontend route protection as authorization; enforce access on the API for each tenant-scoped operation.

Roles: `owner`, `admin`, `agent`, `viewer`. Only owners and admins can update workspace settings in this milestone.

## Knowledge Base API (Milestone 03 foundation)

All endpoints require a Bearer access token and an active workspace membership. The `:workspaceId` route parameter and `X-Workspace-Id` header must match.

| Method | Route | Allowed roles |
| --- | --- | --- |
| POST | `/api/workspaces/:workspaceId/knowledge-documents` | owner, admin, agent |
| GET | `/api/workspaces/:workspaceId/knowledge-documents?page=1&limit=20` | any active member |
| DELETE | `/api/workspaces/:workspaceId/knowledge-documents/:documentId` | owner, admin |

Upload with `multipart/form-data`, using the field name `file`. Supported formats are PDF, DOCX and UTF-8 TXT, up to 10 MB each. Files are stored privately under `api/storage/knowledge` with generated names; that folder is excluded from Git.

This stage does not yet extract text, split chunks, create embeddings, or index vectors. Those are later Milestone 03 tasks. Local disk storage is for development only.

## Cookie deployment note

Local development uses `COOKIE_SECURE=false` and `COOKIE_SAME_SITE=lax`. When the frontend and API are deployed on different sites, configure HTTPS, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, and an exact `FRONTEND_ORIGIN`. Prefer routing `/api` through the same site when possible. Do not use wildcard credentialed CORS origins.
