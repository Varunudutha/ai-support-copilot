# Milestone 02 — Authentication & Workspaces

## Included

- Account registration and login with server-side validation.
- bcrypt password hashing (12 rounds).
- Short-lived access JWTs held in browser memory.
- HttpOnly refresh cookie with hashed-at-rest token storage and rotation.
- Current-session logout and logout-all endpoint.
- User, workspace, membership, and refresh-session MongoDB models.
- Workspace creation onboarding and workspace list/read/update endpoints.
- Roles: owner, admin, agent, viewer.
- Server-side workspace membership checks and owner/admin workspace update restrictions.
- Frontend auth restoration, protected dashboard routes, registration/login pages, and first-workspace onboarding.
- Workspace and account labels populated from the authenticated user instead of hardcoded demo profile details.
- Workspace authorization unit tests.

## API routes

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | API health check |
| POST | `/api/auth/register` | Public | Create an account |
| POST | `/api/auth/login` | Public | Sign in |
| POST | `/api/auth/refresh` | Refresh cookie | Rotate refresh session and issue access token |
| POST | `/api/auth/logout` | Refresh cookie | Revoke current session |
| POST | `/api/auth/logout-all` | Access token | Revoke all sessions for current user |
| GET | `/api/auth/me` | Access token | Get user and workspace memberships |
| GET | `/api/workspaces` | Access token | List current user's active workspaces |
| POST | `/api/workspaces` | Access token | Create workspace and owner membership |
| GET | `/api/workspaces/:workspaceId` | Access token + membership | Read an accessible workspace |
| PATCH | `/api/workspaces/:workspaceId` | Owner/admin membership | Update workspace details |

Workspace-scoped endpoints must verify both the authenticated user and membership in the requested workspace. A client-provided workspace ID is a selector, not proof of authorization.

## Run locally

Start MongoDB (Docker option from repository root):

```bash
docker compose up -d mongodb
```

Then configure and start the API:

```bash
cd api
cp .env.example .env
# Set a strong JWT_ACCESS_SECRET in .env
npm install
npm run dev
```

Start the frontend in a second terminal:

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173`. Register an account, create a workspace, and the app will open the dashboard.

## Important limitations

- This milestone does not implement email verification, password reset, invitations, billing, or external identity providers.
- Workspace provisioning creates the workspace and owner membership as separate operations with compensating cleanup, not a multi-document MongoDB transaction. Use transactions for future workflows that modify multiple tenant records.
- Refresh-session reuse detection, browser Origin checks for cookie-authenticated endpoints, and access control are implemented, but production deployment still needs HTTPS, secrets management, monitoring, and a deployment-specific CORS/cookie configuration.
- Dashboard metrics and conversations remain clearly marked sample data until later milestones connect them to persisted product data.
