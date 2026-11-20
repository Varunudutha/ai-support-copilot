# M06.03 — Dashboard Customer Chat UI

## Objective

Replace the existing placeholder "Conversations" page (ComingSoonPage) with a fully functional dashboard customer conversation interface connected to the M06.02 conversation APIs.

## Features Implemented

### Conversation List Panel (Left Sidebar)

- **Conversation loading** — Fetches conversations from `/api/workspaces/:workspaceId/conversations` with pagination
- **Search** — Client-side search across customer name, email, subject, conversation ID, and status
- **Status filtering** — Filter by All / Open / Pending / Closed statuses
- **Pagination** — Server-side pagination (20 per page) with Previous/Next navigation
- **Conversation items** — Display customer name, avatar with initials, email, status badge, relative time, channel, subject preview, and message count
- **Empty states** — Helpful empty states for no conversations, no search matches, and loading
- **Error handling** — Inline error display with retry button
- **New conversation button** — Opens modal to create a new customer conversation

### Conversation Detail Panel (Main Area)

- **Conversation header** — Customer avatar, name, email, status badge, channel badge, conversation ID
- **Message history** — Loads messages from `/api/workspaces/:workspaceId/conversations/:conversationId` with newest messages at bottom
- **Message bubbles** — Styled by sender type:
  - Customer (right-aligned, purple theme)
  - AI Assistant (left-aligned, white with border)
  - Agent (left-aligned, blue theme)
  - System (left-aligned, muted, italic)
- **Timestamps** — Relative time formatting (e.g., "2m ago", "3h ago", "Jan 15")
- **Citations** — Expandable source citations with excerpts for AI messages
- **Auto-scroll** — Automatically scrolls to newest messages
- **Loading/error/empty states** — Proper UX for all states

### Message Composer

- **Textarea** — Multi-line input with auto-resize
- **Send button** — Primary action with loading state
- **Disabled states** — Disabled when conversation is closed, empty, or sending
- **Error handling** — Inline error display with composer content preserved on failure

### New Conversation Modal

- **Customer name** (required)
- **Customer email** (optional)
- **Subject** (optional)
- **Initial message** (required)
- **Validation** — Client-side validation matching backend schema
- **Creates conversation** — POSTs to `/api/workspaces/:workspaceId/conversations` with customer details and initial message
- **Auto-opens** — After creation, loads the new conversation in the detail panel and refreshes the list

### Workspace Switching

- Clears selected conversation and messages when active workspace changes
- Reloads conversation list for new workspace
- Respects workspace authorization (only conversations for active workspace)

### Responsive Design

- **Desktop** — Two-panel side-by-side layout (380px sidebar + flexible detail)
- **Tablet (≤1050px)** — Stacked panels, each with minimum heights
- **Mobile (≤760px)** — Full-width panels, compact spacing
- **Small mobile (≤480px)** — Further compacted, stacked modal actions

### Accessibility

- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Live region for new messages
- Screen-reader-only labels where appropriate

## Files Created

| File | Description |
|------|-------------|
| `web/src/components/dashboard/ConversationsPage.tsx` | Main conversations page component |
| `web/src/conversations.css` | Complete styling for conversations page |

## Files Modified

| File | Description |
|------|-------------|
| `web/src/App.tsx` | Added ConversationsPage import, added conversations.css import, routed `/conversations` to ConversationsPage |

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workspaces/:workspaceId/conversations` | List conversations with pagination & status filter |
| POST | `/api/workspaces/:workspaceId/conversations` | Create new conversation with initial customer message |
| GET | `/api/workspaces/:workspaceId/conversations/:conversationId` | Get conversation details and messages |
| POST | `/api/workspaces/:workspaceId/conversations/:conversationId/messages` | Send customer message in existing conversation |

All endpoints use the existing `apiRequest()` from AuthContext which automatically includes:
- Authorization Bearer token
- X-Workspace-Id header
- Credentials for cookie-based refresh token
- Automatic token refresh on 401

## Validation Results

### Frontend
```bash
cd web
npm run typecheck  # ✓ Passed
npm run build      # ✓ Built successfully (338.27 kB JS, 67.70 kB CSS)
```

### Backend (no regressions)
```bash
cd api
npm run typecheck  # ✓ Passed
npm test           # ✓ 13 test files, 69 tests passed
npm run build      # ✓ Built successfully
```

## Known Limitations / Future Work

1. **Real-time updates** — Conversation list and messages don't auto-refresh when new messages arrive from other sources (widget, AI replies). Will be addressed in M06.04 (RAG AI replies) and M06.08 (widget).

2. **Message pagination** — Currently loads last 100 messages. Infinite scroll / "load more" can be added if needed.

3. **Conversation status management** — Status dropdown in header is placeholder (disabled). Will be implemented in M06.06 (Human Handoff).

4. **Agent assignment** — No UI for assigning conversations to agents. Will be implemented in M06.07 (Agent Inbox).

5. **Conversation deletion** — No delete conversation functionality. Can be added if needed.

6. **Unread indicators** — No unread message tracking. Can be enhanced.

## Next Milestone

**M06.04 — RAG-Powered AI Customer Replies**

- Connect customer messages to existing RAG pipeline
- Generate AI responses with citations
- Store AI messages in conversation history
- Handle grounded vs. ungrounded responses
- Pause AI when human agent takes over