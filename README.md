# AI Support Copilot

A multi-tenant AI customer support SaaS platform. Businesses create a workspace, add their knowledge, configure an assistant, and support customers through an embeddable chat experience with citations and human escalation.

## Repository structure

```text
ai-support-copilot/
├── web/                 # React + TypeScript + Vite application
├── api/                 # Node.js + Express + TypeScript API
├── docker-compose.yml   # Local MongoDB service
├── README.md
└── MILESTONE_02.md
```

## Current progress

- **Milestone 01:** Frontend foundation and professional dashboard UI.
- **Milestone 02:** Registration, login, session management, workspace onboarding, roles, and workspace authorization.
- **Next:** Knowledge base upload and processing, then RAG chat and controlled tools.

## Technology

| Area | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Lucide |
| API | Node.js, Express, TypeScript, Zod |
| Database | MongoDB + Mongoose |
| Authentication | bcrypt password hashing, short-lived JWT access tokens, rotating HttpOnly refresh cookies |
| Local database | Docker Compose / MongoDB Atlas |

## Run locally

Requirements: Node.js 20.19+ (or 22.12+) and Docker with Compose, or a reachable MongoDB instance.

1. Start MongoDB from the repository root:

   ```bash
   docker compose up -d mongodb
   ```

2. Configure and start the API in one terminal:

   ```bash
   cd api
   cp .env.example .env
   # Replace JWT_ACCESS_SECRET with a strong random value in .env
   npm install
   npm run dev
   ```

3. Install and start the frontend in another terminal:

   ```bash
   cd web
   npm install
   npm run dev
   ```

4. Open `http://localhost:5173`, create an account, and create your first workspace.

The Vite development server proxies `/api` to `http://localhost:4000`.

## Checks

API:

```bash
cd api
npm run typecheck
npm test
npm run build
```

Frontend:

```bash
cd web
npm run typecheck
npm run build
```

## Security principles

- Tenant isolation is enforced by backend membership checks for workspace-scoped requests.
- Roles are checked by the API, not only by frontend navigation.
- Refresh tokens are stored hashed in MongoDB and sent to the browser only in an HttpOnly cookie; refresh/logout also validate the configured frontend Origin.
- Passwords are hashed and never logged.
- Secrets belong in local environment files, never in the repository or browser-exposed `VITE_` variables.

See [Milestone 02](./MILESTONE_02.md) and [API documentation](./api/README.md) for route details and limitations.
