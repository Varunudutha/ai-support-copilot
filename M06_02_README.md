# M06.02 — Workspace Conversation APIs

## Included
- Authenticated, workspace-scoped conversation listing and creation.
- Dashboard conversation creation requires customer identity and an initial message.
- Customer messages are persisted against the same workspace and conversation.
- Conversation history is returned in chronological order with a bounded result limit.
- Closed conversations reject new customer messages.
- Every conversation/message database filter includes `workspaceId`.
- Request validation tests.

## API routes

All routes require a valid access token and workspace membership.

Base path: `/api/workspaces/:workspaceId/conversations`

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List workspace conversations; optional `page`, `limit`, `status` |
| POST | `/` | Create a dashboard conversation with `customer` and `initialMessage` |
| GET | `/:conversationId` | Get one conversation and its latest messages; optional `limit` |
| POST | `/:conversationId/messages` | Add a customer message |

### Create conversation body
```json
{
  "customer": {
    "displayName": "Website visitor",
    "email": "visitor@example.com"
  },
  "subject": "Order help",
  "initialMessage": "I need help tracking my order."
}
```

### Send message body
```json
{
  "content": "Can you check my order?"
}
```

## Validate
From `api/`:
```powershell
npm run typecheck
npm test
npm run build
```
