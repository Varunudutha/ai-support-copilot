# AI Support Copilot

A multi-tenant AI customer support platform. Businesses create a workspace, add their knowledge, configure an assistant, and support customers through an embeddable chat experience with citations and human escalation.

## Project status

**Milestone 01 — Project foundation and UI system** is in progress. The initial React frontend scaffold and interactive dashboard shell are prepared locally; package installation and a full Vite build still need to be verified on a developer machine.

## Product goals

- Isolate every business's users, documents, conversations, and support tickets.
- Answer customer questions using each business's approved knowledge with source citations.
- Provide controlled tool calling for support workflows.
- Escalate uncertain or unsupported requests to a human agent.
- Measure retrieval quality, answer faithfulness, latency, and model usage.

## Planned architecture

| Area | Technology | Responsibility |
| --- | --- | --- |
| Web application | React, TypeScript, Vite | Admin dashboard and customer chat |
| UI | Tailwind CSS, shadcn/ui patterns, Lucide | Consistent responsive design system |
| Core API | Node.js, Express, TypeScript | Authentication, tenants, permissions, conversations, tickets |
| AI service | Python, FastAPI | Document processing, retrieval, RAG, agent orchestration |
| Database | MongoDB Atlas | Application data and tenant records |
| Retrieval | MongoDB Atlas Vector Search | Semantic and hybrid knowledge retrieval |
| Background work | Redis, BullMQ | Document processing and asynchronous jobs |
| Delivery | Docker, GitHub Actions | Repeatable builds, tests, and deployment |

Services will be introduced incrementally as each milestone requires them.

## Repository structure

```text
ai-support-copilot/
├── README.md
├── .gitignore
└── web/                   # React + TypeScript frontend
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── dashboard/
    │   │   └── layout/
    │   ├── data/
    │   ├── pages/
    │   ├── App.tsx
    │   ├── index.css
    │   └── main.tsx
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

## Local development

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
cd web
npm install
npm run dev
```

The app will be available at the local URL printed by Vite (usually `http://localhost:5173`). Run `npm run typecheck` and `npm run build` before committing.

## Development principles

- Build in small, reviewable increments.
- Run relevant checks before marking a step complete.
- Keep secrets out of source control; use environment variables and commit only safe examples.
- Enforce workspace authorization on the server for every tenant-scoped operation.
- Treat AI output as untrusted; validate every requested action on the backend.
- Do not claim quality metrics until they are measured against a documented evaluation set.

## Planned milestones

1. Project foundation and UI system.
2. Authentication and workspaces.
3. Knowledge base and document processing.
4. RAG chat, retrieval, and citations.
5. Agent tools, support tickets, and human escalation.
6. Analytics, usage tracking, and AI evaluation.
7. Security, automated tests, and performance checks.
8. Docker, CI/CD, and deployment.

## License

No license has been selected yet. Until one is added, all rights are reserved by the repository owner.
