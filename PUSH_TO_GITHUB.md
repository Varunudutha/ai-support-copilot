# Push milestone changes to GitHub

Run commands from the repository root (`ai-support-copilot`), not from `web` or `api`.

After the checks pass:

```bash
git status
git add .
git commit -m "feat: add authentication and workspaces"
git push origin main
```

If Git reports there is nothing to commit, the changes may already be committed. Check `git status` before creating another commit.

Never add `.env`, database credentials, access tokens, or API keys. Commit `.env.example` files only.
