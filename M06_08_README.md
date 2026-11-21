# M06.08 — Embeddable Website Chat Widget

## Objective

Create a fully functional, embeddable chat widget that customers can add to their websites with a simple script tag. The widget connects to the existing conversation and RAG pipeline for AI-powered customer support.

## Features Implemented

### Backend (API)

- **Widget Configuration Model** (`WidgetConfig`):
  - Per-workspace configuration stored in MongoDB
  - Appearance: title, subtitle, primary color, position, theme
  - Messages: greeting, offline message, email requirement, agent avatar
  - Security: allowed origins (CORS), rate limiting
  - Defaults provided if not configured

- **Public Widget API** (no auth required, but validates origin):
  - `GET /api/workspaces/:workspaceId/widget/config` — Fetch widget configuration
  - `POST /api/workspaces/:workspaceId/widget/conversations` — Create conversation + initial message
  - `POST /api/workspaces/:workspaceId/widget/conversations/:conversationId/messages` — Send message
  - `GET /api/workspaces/:workspaceId/widget/conversations/:conversationId` — Load conversation history

- **Widget Config Management API** (auth required, owner/admin):
  - `GET /api/workspaces/:workspaceId/widget-config` — Get configuration
  - `PATCH /api/workspaces/:workspaceId/widget-config` — Update configuration
  - `GET /api/workspaces/:workspaceId/widget-config/embed` — Generate embed code snippet

- **Security Features**:
  - Origin validation (exact hostname match against allowed origins)
  - Rate limiting:
    - 30 requests/minute per IP (general)
    - 10 messages/minute per conversation
    - 5 conversations/hour per IP
  - No authentication required for public endpoints
  - Customer identified by session ID (localStorage) + IP address

- **AI Integration**:
  - Reuses existing RAG pipeline (`generateRagAnswer`)
  - AI responds automatically to customer messages when conversation is `open` and unassigned
  - Citations stored with AI messages

### Frontend

- **Embeddable Widget** (`web/public/widget/widget.js`):
  - Single script tag: `<script src="/widget.js" data-workspace-id="WORKSPACE_ID" async></script>`
  - Auto-initializes on page load
  - Floating chat button (bottom-right or bottom-left)
  - Expandable panel with message history
  - Real-time messaging with typing indicator
  - Session persistence via localStorage
  - Conversation history persistence
  - Responsive design (mobile-friendly)
  - Configurable theme (light/dark/system)

- **Widget Configuration Page** (`WidgetConfigPage`):
  - Enable/disable widget
  - Appearance: title, subtitle, primary color, position, theme
  - Messages: greeting, offline message, email requirement, agent avatar
  - Rate limiting configuration
  - Allowed origins management (up to 50)
  - Live preview of widget appearance
  - Embed code generator with copy-to-clipboard

- **Navigation Integration**:
  - Added "Widget" to workspace management nav (LayoutDashboard icon)
  - Route: `/widget` → `WidgetConfigPage`

### Files Created

| File | Description |
|------|-------------|
| `api/src/models/WidgetConfig.ts` | MongoDB model for widget configuration |
| `api/src/controllers/widgetController.ts` | Public widget API endpoints |
| `api/src/routes/widgetRoutes.ts` | Public routes with rate limiting |
| `api/src/controllers/widgetConfigController.ts` | Auth-protected widget config management |
| `api/src/routes/widgetConfigRoutes.ts` | Auth-protected widget config routes |
| `web/public/widget/widget.js` | Embeddable widget JavaScript |
| `web/src/components/dashboard/WidgetConfigPage.tsx` | Widget configuration UI |

### Files Modified

| File | Description |
|------|-------------|
| `api/src/app.ts` | Added widget routes |
| `web/src/App.tsx` | Added WidgetConfigPage import, route, nav item |
| `web/src/conversations.css` | Added widget config styles |

## API Endpoints

### Public Widget API (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workspaces/:workspaceId/widget/config` | Get widget configuration |
| POST | `/api/workspaces/:workspaceId/widget/conversations` | Create conversation + first message |
| POST | `/api/workspaces/:workspaceId/widget/conversations/:conversationId/messages` | Send message in conversation |
| GET | `/api/workspaces/:workspaceId/widget/conversations/:conversationId` | Get conversation history |

### Widget Config Management (Auth Required, Owner/Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workspaces/:workspaceId/widget-config` | Get configuration |
| PATCH | `/api/workspaces/:workspaceId/widget-config` | Update configuration |
| GET | `/api/workspaces/:workspaceId/widget-config/embed` | Get embed code snippet |

## Embedding the Widget

Add to any website:

```html
<script src="https://your-domain.com/widget.js" data-workspace-id="YOUR_WORKSPACE_ID" async></script>
```

Or programmatically:

```javascript
window.AISupportCopilot = { workspaceId: 'YOUR_WORKSPACE_ID' };
(function() {
  var s = document.createElement('script');
  s.src = 'https://your-domain.com/widget.js';
  s.async = true;
  document.head.appendChild(s);
})();
```

The widget will:
1. Load configuration from the API
2. Create a floating chat button
3. On click, show chat panel with greeting message
4. Persist session in localStorage
5. Send messages to the API with AI responses
6. Store conversation ID for return visits

## Validation Results

### Frontend
```bash
cd web
npm run typecheck  # ✓ Passed
npm run build      # ✓ Built successfully (367.69 kB JS, 81.87 kB CSS)
```

### Backend
```bash
cd api
npm run typecheck  # ✓ Passed
npm test           # ✓ 13 test files, 69 tests passed
npm run build      # ✓ Built successfully
```

## Known Limitations / Future Work

1. **Real-time updates** — No WebSocket/polling for new messages when widget is open. Could add SSE or WebSocket.

2. **File attachments** — Customers can't upload files/images in widget.

3. **Agent typing indicator** — Only shows "AI is typing...", not agent typing.

4. **Conversation transfer** — No UI to transfer widget conversations to agents.

5. **Analytics** — No widget-specific analytics (conversion rate, response time, etc.).

6. **Custom fields** — No custom pre-chat form fields beyond name/email.

7. **Multi-language** — Widget text is from config only, no i18n support.

8. **Widget customization API** — No programmatic API for widget behavior.

## Architecture Notes

- **Reused existing services**: `generateRagAnswer`, `Conversation`, `Message` models
- **No new database indexes needed** — Uses existing conversation/message indexes
- **Tenant isolation** — All queries scoped by `workspaceId`
- **Stateless public API** — Uses session ID + IP for identification
- **Widget served statically** — `web/public/widget/widget.js` served by Vite/dev server

## Next Milestone

**M06.09 — Tenant Isolation, Security & End-to-End Testing**

- Comprehensive workspace isolation tests
- Public API security tests
- Widget origin validation tests
- Rate limiting tests
- Unauthorized access prevention
- End-to-end conversation testing
- Cross-workspace data access prevention