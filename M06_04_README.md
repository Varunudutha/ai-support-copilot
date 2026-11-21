# M06.04 — RAG-Powered AI Customer Replies

## Objective

Connect customer conversations to the existing RAG pipeline so that when a customer sends a message, the AI automatically generates a grounded response using the workspace's knowledge base.

## Features Implemented

### Backend (API)

- **Automatic AI response generation** in `sendConversationMessage` endpoint
- **Trigger conditions**: AI replies only when:
  - Conversation status is `open`
  - Conversation is not assigned to a human agent (`assignedTo` is null)
- **RAG pipeline reuse**: Uses existing `generateRagAnswer()` service (search → context → Ollama → citations)
- **Citation storage**: AI message citations stored in Message model (matches knowledge base citation format)
- **Graceful failure**: Customer message succeeds even if AI generation fails (logged, not thrown)
- **Conversation updates**: `lastMessageAt` and `messageCount` updated for AI response
- **Response includes AI message**: `aiMessage` field in response for immediate UI update

### Frontend (ConversationsPage)

- **Optimistic UI update**: Customer message and AI response added to local state immediately from API response
- **No polling needed**: AI response returns in same request (synchronous generation)
- **Citation display**: AI messages show expandable source citations with excerpts (reuses existing message bubble citation rendering)
- **Grounded/ungrounded handling**: AI "not found" response displayed as regular AI message
- **Human handoff ready**: AI pauses when conversation is assigned to agent or status changes to `pending`/`closed`

## Files Modified

| File | Description |
|------|-------------|
| `api/src/controllers/conversationController.ts` | Added AI response generation to `sendConversationMessage` |
| `web/src/components/dashboard/ConversationsPage.tsx` | Updated `SendMessageResponse` type, handle `aiMessage` in response |

## API Changes

### `POST /api/workspaces/:workspaceId/conversations/:conversationId/messages`

**Request** (unchanged):
```json
{ "content": "Customer question here" }
```

**Response** (extended):
```json
{
  "message": "Message sent successfully",
  "conversation": { ... },
  "savedMessage": { ... },          // Customer message
  "aiMessage": { ... } | undefined  // AI response (only if conditions met)
}
```

**AI message structure**:
```json
{
  "_id": "...",
  "workspaceId": "...",
  "conversationId": "...",
  "senderType": "assistant",
  "senderId": null,
  "content": "AI answer text...",
  "citations": [
    {
      "citationId": "S1",
      "id": "...",
      "documentId": "...",
      "chunkIndex": 0,
      "sourceName": "FAQ.pdf",
      "mimeType": "application/pdf",
      "pageCount": 5,
      "score": 0.89,
      "excerpt": "Relevant excerpt from knowledge base..."
    }
  ],
  "createdAt": "2026-11-21T...",
  "updatedAt": "2026-11-21T..."
}
```

## AI Response Conditions

| Condition | AI Responds? |
|-----------|--------------|
| Conversation status = `open`, `assignedTo` = null | ✅ Yes |
| Conversation status = `pending` | ❌ No (human handling) |
| Conversation status = `closed` | ❌ No (closed) |
| Conversation `assignedTo` = agent ID | ❌ No (agent assigned) |

## Validation Results

### Frontend
```bash
cd web
npm run typecheck  # ✓ Passed
npm run build      # ✓ Built successfully
```

### Backend
```bash
cd api
npm run typecheck  # ✓ Passed
npm test           # ✓ 13 test files, 69 tests passed
npm run build      # ✓ Built successfully
```

## Known Limitations / Future Work

1. **No streaming** — AI response is generated synchronously. For production, consider streaming for better UX.

2. **No retry on failure** — If Ollama is unavailable, AI response is silently skipped. Could add retry logic or queue.

3. **Rate limiting** — No per-conversation or per-workspace AI rate limiting. Consider adding for cost control.

4. **Conversation context** — Current RAG uses only the latest customer message. Future: include conversation history for context-aware answers.

5. **Human handoff UI** — Agent assignment/status change UI not yet implemented (M06.06).

6. **AI confidence/escalation** — No automatic escalation when AI confidence is low (M06.09).

## Architecture Notes

- **Reused existing services**: `ragService`, `vectorSearchService`, `ollamaService`, `citationBuilder`, `ragContextBuilder`
- **No new database schemas** — Message model already supports `senderType: 'assistant'` and citations array
- **Tenant isolation preserved** — `workspaceId` passed through all layers
- **Synchronous by design** — Keeps API simple; streaming can be added later via separate endpoint or SSE

## Next Milestone

**M06.05 — Conversation History & Persistence**

- Verify persistent conversation history across reloads
- Message ordering and timestamps
- Pagination for long conversations
- Conversation reopening behavior