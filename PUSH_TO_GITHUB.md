# Publish the local project to GitHub

The GitHub repository is currently empty. The connected GitHub integration can inspect the repository but its attempted file write was rejected with `403 Resource not accessible by integration`, so this project has **not** been pushed yet.

After downloading and extracting this project folder, open a terminal in the `ai-support-copilot` folder.

## 1. Install and verify the frontend

```powershell
cd web
npm install
npm run typecheck
npm run build
npm run dev
```

Open the local Vite URL shown in the terminal (usually `http://localhost:5173`) and review the dashboard. Stop the server with `Ctrl+C` when finished.

## 2. Commit and push the first milestone

Return to the project root (`cd ..` if you are still inside `web`), then run:

```powershell
git init -b main
git remote add origin https://github.com/Varunudutha/ai-support-copilot.git
git add .
git commit -m "chore: initialize AI Support Copilot frontend"
git push -u origin main
```

GitHub may ask you to authenticate in your browser. Do not put a personal access token directly into these commands or commit it to the repository.

## 3. Confirm the push

Refresh the repository page and confirm that `README.md`, `web/`, and `.gitignore` appear on the `main` branch.

For later milestones, use a separate commit after the relevant checks pass. Do not commit `.env` files, API keys, passwords, or production secrets.
