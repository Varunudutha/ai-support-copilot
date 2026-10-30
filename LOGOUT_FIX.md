# Fix: logout blocked by local frontend origin mismatch

The development API originally required the browser's `Origin` header to match `FRONTEND_ORIGIN` exactly. Vite automatically uses another port (for example, 5174) when 5173 is occupied, and `localhost` and `127.0.0.1` are different origins. That caused the API to reject `/api/auth/logout` and leave the HttpOnly refresh cookie active.

## Apply

Copy `api/src/middleware/requireTrustedOrigin.ts` and `api/tests/trustedOrigin.test.ts` from this patch into the matching paths in your existing project, replacing the middleware file.

Then restart the API process:

```bash
cd api
npm run dev
```

The fix accepts HTTP loopback origins (`localhost`, `127.0.0.1`, `::1`) on any port **only in development**. In production, only the configured `FRONTEND_ORIGIN` is accepted.

Run tests:

```bash
npm test
npm run typecheck
```

Then try Sign out, refresh the login page, and confirm it stays logged out.

## Commit

From the repository root:

```bash
git add api/src/middleware/requireTrustedOrigin.ts api/tests/trustedOrigin.test.ts LOGOUT_FIX.md
git commit -m "fix: allow local Vite origin for logout"
git push origin main
```
