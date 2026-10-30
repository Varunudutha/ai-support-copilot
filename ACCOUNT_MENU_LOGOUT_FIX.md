# Account menu and logout fix

This patch fixes the top-right initials avatar: it was rendered as a plain `<div>`, so it could not open an account menu. It is now a real button that opens a menu with the signed-in user's name, email, and a Sign out action.

It also makes client-side sign-out immediate if the API is slow or unavailable, while sending the backend logout request to revoke the refresh session and clear its HttpOnly cookie. The development-only trusted-origin middleware accepts Vite localhost/loopback ports when Vite chooses a fallback port. Production remains restricted to `FRONTEND_ORIGIN`.

## Apply

Merge the `web` and `api` folders from this patch into the existing project, replacing matching files. Keep your existing `.env` files.

## Run checks

```bash
cd web
npm run typecheck
npm run build
```

In another terminal:

```bash
cd api
npm run typecheck
npm test
npm run build
```

Restart both development servers and test: avatar click -> Sign out -> redirected to `/login` -> refreshing stays logged out.
