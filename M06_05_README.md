# M06.05 — Conversation History & Persistence

## Objective

Ensure conversation history persists correctly across browser reloads, add pagination for long conversations, and verify edge case handling.

## Features Implemented

### Backend (API)

- **New endpoint**: `GET /api/workspaces/:workspaceId/conversations/:conversationId/messages`
  - Supports pagination with `limit` (default 50, max 100)
  - Supports `before` parameter for cursor-based pagination (load older messages)
  - Returns messages in chronological order (oldest first)
  - Includes pagination info: `limit`, `total`, `hasMore`

- **Validation**:
  - `limit`: 1-100 (coerced to int)
  - `before`: Optional ObjectId string for cursor pagination
  - Workspace-scoped authorization (tenant isolation)
  - Invalid ObjectId handling for `before` parameter

### Frontend (ConversationsPage)

- **State additions**:
  - `messagesHasMore`: Tracks if more messages available
  - `loadingMoreMessages`: Loading state for pagination
  - `earliestMessageId`: Cursor for "load more" queries

- **"Load earlier messages" button**:
  - Appears at top of message list when `messagesHasMore` is true
  - Fetches older messages via `before` cursor
  - Prepends messages to existing list (preserves scroll position)
  - Shows loading spinner during fetch
  - Disabled while loading

- **Persistence verification**:
  - Initial load: `GET /conversations/:id?limit=100` (last 100 messages)
  - Pagination: `GET /conversations/:id/messages?before=<earliest_id>&limit=50`
  - Messages persist across browser reloads (stored in MongoDB)
  - Workspace switching clears state and reloads correctly

- **Edge case handling**:
  - Empty conversations: Shows "No messages yet" state
  - Loading states: Initial load and pagination loading
  - Error states: Retry button for failed loads
  - Conversations with < 100 messages: No pagination button shown
  - Very long conversations: Load 50 at a time

## Files Modified

| File | Description |
|------|-------------|
| `api/src/controllers/conversationController.ts` | Added `loadConversationMessages` endpoint |
| `api/src/routes/conversationRoutes.ts` | Added GET route for message pagination |
| `web/src/components/dashboard/ConversationsPage.tsx` | Added pagination state, load more logic, UI |
| `web/src/conversations.css` | Added `.load-more-messages` button styles |

## API Endpoints

### `GET /api/workspaces/:workspaceId/conversations/:conversationId`

**Query params**: `limit` (1-100, default 50)
**Returns**: Conversation + last `limit` messages (chronological) + pagination

### `GET /api/workspaces/:workspaceId/conversations/:conversationId/messages` (NEW)

**Query params**:
- `limit` (1-100, default 50)
- `before` (ObjectId string, optional) — load messages older than this ID

**Returns**:
```json
{
  "messages": [...],
  "pagination": {
    "limit": 50,
    "total": 150,
    "hasMore": true
  }
}
```

## Validation Results

### Frontend
```bash
cd web
npm run typecheck  # ✓ Passed
npm run build      # ✓ Built successfully (339.02 kB JS, 68.19 kB CSS)
```

### Backend
```bash
cd api
npm run typecheck  # ✓ Passed
npm test           # ✓ 13 test files, 69 tests passed
npm run build      # ✓ Built successfully
```

## Message Loading Flow

```
1. User selects conversation
   → GET /conversations/:id?limit=100
   → Shows last 100 messages
   → Sets earliestMessageId = messages[0]._id
   → messagesHasMore = pagination.hasMore

2. User clicks "Load earlier messages"
   → GET /conversations/:id/messages?before=<earliestMessageId>&limit=50
   → Prepends returned messages to list
   → Updates earliestMessageId and messagesHasMore
   → Scroll position preserved (messages added at top)

3. Browser reload
   → Step 1 repeats
   → Full history preserved in database
```

## Known Limitations / Future Work

1. **No infinite scroll** — Manual "Load more" button only. Could add IntersectionObserver for auto-load.

2. **No message search within conversation** — Only conversation list has search.

3. **No jump to date** — Can't jump to specific time period.

4. **Initial load limit fixed at 100** — Could make configurable.

5. **Real-time updates** — New messages from other sources (widget, other agents) don't auto-appear. Would need WebSocket/polling (M06.08+).

## Next Milestone

**M06.06 — Human Handoff & Conversation Status**

- AI-to-human escalation
- Conversation assignment to agents
- Status management (open/pending/closed)
- Pause AI when human agent is handling
- Return conversation to AI handling
- System messages for transitions
- Permission checks