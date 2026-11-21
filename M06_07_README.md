# M06.07 — Agent Inbox & Reply Interface

## Objective

Create a dedicated agent inbox for managing assigned conversations, with conversation views, agent reply interface, and inbox navigation (assigned/unassigned/all tabs).

## Features Implemented

### Backend (API)

- **Reuses existing endpoints** from M06.02–M06.06:
  - `GET /conversations` — List with pagination & status filter
  - `GET /conversations/:id` — Get conversation + messages
  - `GET /conversations/:id/messages` — Pagination for long conversations
  - `POST /conversations/:id/messages` — Send message (works for agent replies)
  - `PATCH /conversations/:id` — Status/assignment updates

- **Agent replies** use same `POST /messages` endpoint with `senderType: 'agent'` (handled by frontend)

### Frontend (AgentInboxPage)

- **Three-tab inbox navigation**:
  - **Assigned** — Conversations with `status=pending` or `assignedTo` set
  - **Unassigned** — Conversations with `status=open` and no `assignedTo`
  - **All** — All conversations
  - Badge counts update in real-time

- **Conversation list** (same as ConversationsPage):
  - Search across customer name, email, subject, ID, status
  - Status filter (All/Open/Pending/Closed)
  - Pagination (20 per page)
  - Visual indicator for assigned conversations (green checkmark)

- **Conversation detail panel**:
  - Customer info, status badge, channel, assignment badge
  - Message history with sender-specific styling (customer, AI, agent, system)
  - "Load earlier messages" pagination
  - System messages for handoff transitions

- **Agent reply composer**:
  - Multi-line textarea
  - Send button with loading state
  - Disabled when conversation closed
  - Messages sent as `senderType: 'agent'` via existing API

- **Status & assignment controls** (in conversation header):
  - Status dropdown (Open/Pending/Closed)
  - "Take" button (open → pending, assign to current user)
  - "Assign to Me" / "Unassign" for pending conversations
  - Calls existing `PATCH /conversations/:id` endpoint

- **Responsive design**:
  - Desktop: Side-by-side (380px sidebar + detail)
  - Tablet (≤1050px): Stacked panels
  - Mobile (≤760px): Full-width, compact tabs

### Navigation Integration

- **Sidebar**: Added "Agent inbox" to primary navigation with `ShieldCheck` icon
- **Route**: `/agent-inbox` maps to `AgentInboxPage`
- **Page description**: Added to `pageDescriptions` object

## Files Created

| File | Description |
|------|-------------|
| `web/src/components/dashboard/AgentInboxPage.tsx` | Main agent inbox component |

## Files Modified

| File | Description |
|------|-------------|
| `web/src/App.tsx` | Added AgentInboxPage import, route, sidebar nav item, page description |
| `web/src/conversations.css` | Added agent inbox styles (tabs, badges, assigned indicators, responsive) |

## API Endpoints Used (all existing)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/workspaces/:workspaceId/conversations` | List conversations |
| GET | `/api/workspaces/:workspaceId/conversations/:id` | Get conversation + messages |
| GET | `/api/workspaces/:workspaceId/conversations/:id/messages` | Load more messages |
| POST | `/api/workspaces/:workspaceId/conversations/:id/messages` | Send agent reply |
| PATCH | `/api/workspaces/:workspaceId/conversations/:id` | Update status/assignment |

## Validation Results

### Frontend
```bash
cd web
npm run typecheck  # ✓ Passed
npm run build      # ✓ Built successfully (354.48 kB JS, 72.22 kB CSS)
```

### Backend
```bash
cd api
npm run typecheck  # ✓ Passed
npm test           # ✓ 13 test files, 69 tests passed
npm run build      # ✓ Built successfully
```

## Known Limitations / Future Work

1. **Agent picker** — "Take" button assigns to current user only. Full agent selection dropdown needed (M07).

2. **Real-time updates** — Inbox doesn't auto-refresh when new conversations arrive or status changes. Would need WebSocket/polling.

3. **Agent availability** — No online/offline status or capacity management.

4. **Conversation transfer** — No "transfer to another agent" workflow.

5. **SLA/response time** — No SLA timers or breach alerts in inbox.

6. **Bulk actions** — No bulk assign/unassign/status change.

7. **Keyboard shortcuts** — No shortcuts for common actions (next/prev conversation, reply, etc.).

8. **Unread indicators** — No unread message count per conversation.

## Next Milestone

**M06.08 — Embeddable Website Chat Widget**

- Public website chat widget (JavaScript snippet)
- Widget configuration per workspace
- Public conversation creation API (no auth required)
- Customer session identification (cookies/localStorage)
- Trusted origin validation
- Rate limiting & abuse prevention
- Mobile-responsive widget UI
- Integration with existing conversation/RAG pipeline