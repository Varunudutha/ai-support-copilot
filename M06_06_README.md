# M06.06 — Human Handoff & Conversation Status

## Objective

Implement human handoff workflow: AI-to-human escalation, agent assignment, conversation status management, and system messages for transitions. Pause AI responses when a human agent is handling the conversation.

## Features Implemented

### Backend (API)

- **New endpoint**: `PATCH /api/workspaces/:workspaceId/conversations/:conversationId`
  - Update conversation `status` (open/pending/closed)
  - Update `assignedTo` (agent ObjectId or null)
  - Automatic status transitions:
    - Assigning agent → status becomes `pending`
    - Unassigning agent from `pending` → status becomes `open`
  - Creates system messages for audit trail
  - Returns updated conversation + system messages

- **Status workflow**:
  - `open` → `pending` (escalation/agent assigned): AI pauses
  - `pending` → `open` (return to AI): AI resumes
  - `open`/`pending` → `closed`: Conversation ends, `closedAt` timestamp set
  - `closed` is terminal (no further changes)

- **System messages** (senderType: `system`):
  - Status changes: "Conversation closed/escalated/returned to AI by [Agent Name]"
  - Assignment changes: "Conversation assigned/unassigned by [Agent Name]"
  - Stored in Message model, appear in conversation history

- **AI pause logic** (in `sendConversationMessage`):
  - AI only responds when `status === 'open' && !assignedTo`
  - No AI response when `pending` (human handling) or `assignedTo` set

### Frontend (ConversationsPage)

- **Status dropdown** (for open/pending conversations):
  - Shows current status
  - Options: Open / Pending / Closed
  - Disabled for current status
  - Calls `updateConversation({ status })`

- **Agent assignment button** (for pending conversations):
  - "Assign to Me" / "Unassign Agent"
  - Calls `updateConversation({ assignedTo: null })` to unassign
  - (Full agent picker UI for assignment in M07)

- **System message display**:
  - Italic, muted styling
  - Appears inline in message list
  - Shows transition context

- **Real-time updates**:
  - System messages added to local state immediately
  - Conversation list refreshed after changes
  - Selected conversation updated with new status/assignment

## Files Modified

| File | Description |
|------|-------------|
| `api/src/controllers/conversationController.ts` | Added `updateConversation` endpoint with system messages |
| `api/src/routes/conversationRoutes.ts` | Added PATCH route |
| `web/src/components/dashboard/ConversationsPage.tsx` | Added status dropdown, assign button, system message handling |
| `web/src/conversations.css` | Added dropdown styles |

## API Endpoints

### `PATCH /api/workspaces/:workspaceId/conversations/:conversationId`

**Request body**:
```json
{
  "status": "open" | "pending" | "closed",
  "assignedTo": "agentObjectId" | null
}
```

**Behavior**:
- Either field optional (partial updates)
- `assignedTo: null` unassigns agent
- Assigning agent on `open` → auto-sets `pending`
- Status `closed` sets `closedAt` timestamp
- System messages created for all changes

**Response**:
```json
{
  "message": "Conversation updated successfully",
  "conversation": { ...updatedConversation },
  "systemMessages": [ ... ]  // Only if changes triggered system messages
}
```

## Status & AI Behavior Matrix

| Conversation Status | Assigned To | AI Responds? |
|---------------------|-------------|--------------|
| `open` | null | ✅ Yes |
| `open` | agentId | ❌ No (assigned) |
| `pending` | null | ❌ No (escalated) |
| `pending` | agentId | ❌ No (agent handling) |
| `closed` | any | ❌ No (closed) |

## Validation Results

### Frontend
```bash
cd web
npm run typecheck  # ✓ Passed
npm run build      # ✓ Built successfully (339.99 kB JS, 68.85 kB CSS)
```

### Backend
```bash
cd api
npm run typecheck  # ✓ Passed
npm test           # ✓ 13 test files, 69 tests passed
npm run build      # ✓ Built successfully
```

## Known Limitations / Future Work

1. **Agent picker UI** — Currently "Assign to Me" only. Full agent selection dropdown needed (M07: Team & Agent Management).

2. **Notifications** — No real-time notification to assigned agent. Could add WebSocket/push.

3. **SLA/timers** — No automatic escalation timer or SLA tracking.

4. **Conversation reopening** — Closed conversations can't be reopened via API (would need new endpoint).

5. **Bulk operations** — No bulk status/assignment changes.

6. **Agent inbox** — No dedicated agent view showing assigned conversations (M06.07).

## Next Milestone

**M06.07 — Agent Inbox & Reply Interface**

- Agent inbox view (assigned/unassigned conversations)
- Conversation detail for agents
- Agent reply interface (senderType: `agent`)
- Conversation assignment from inbox
- Status changes from inbox
- Workspace role enforcement (agent/admin/owner)