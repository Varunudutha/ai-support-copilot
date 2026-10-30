# Web application

React + TypeScript + Vite frontend for AI Support Copilot.

## Run locally

```bash
npm install
npm run dev
```

The Vite development server proxies `/api` to `http://localhost:4000`. Start the API in the `api` folder in a separate terminal.

## Checks

```bash
npm run typecheck
npm run build
```

## Authentication flow

- `/register` creates a user account.
- `/login` signs in an existing user.
- `/onboarding` creates the first workspace for a newly registered user.
- The dashboard is protected and redirects unauthenticated users to sign in.
- Access tokens are kept in application memory. Refresh tokens are sent only as HttpOnly cookies.

## UI notes

The workspace overview still uses sample analytics and conversations. Authentication and workspace identity are API-backed; product metrics will become live in later milestones.
