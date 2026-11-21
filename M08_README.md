# M08 — Advanced AI Support Capabilities

## Objective

Enhance the AI support capabilities with conversation-aware context, customizable behavior, confidence scoring, and feedback collection.

## Features Implemented

### 1. Conversation-Aware Context
- **Conversation History in RAG**: AI now receives recent conversation history (configurable, default 5 messages) when generating responses
- **Context Format**: Messages formatted as `senderType: content` for clear context
- **Configurable History Length**: Per-workspace configurable via AI Config (0-20 messages)

### 2. Custom AI Instructions & Behavior
- **AI Config Model** (`AIConfig`):
  - `customInstructions`: Free-form workspace-specific instructions
  - `tone`: professional / friendly / casual / empathetic
  - `responseLength`: short / medium / detailed
  - `language`: auto-detect or specific language
  - `escalationThreshold`: Confidence threshold for auto-escalation (0-100)
  - `autoEscalate`: Enable/disable automatic escalation
  - `includeSources`: Show/hide source citations
  - `maxSources`: Maximum sources to cite (1-10)
  - `fallbackMessage`: Custom message when knowledge is unavailable
  - `maxConversationHistory`: Messages to include in context (0-20)
  - `confidenceThreshold`: Threshold for escalation suggestions (0-100)

- **API Endpoints**:
  - `GET /api/workspaces/:workspaceId/ai-config` - Get configuration
  - `PATCH /api/workspaces/:workspaceId/ai-config` - Update configuration (owner/admin)

### 3. Conversation-Aware RAG
- **Enhanced `generateRagAnswer`**:
  - Accepts `conversationHistory` parameter (last N messages)
  - Accepts `aiConfig` parameter for customization
  - Builds conversation context from recent messages
  - Includes custom instructions in RAG context
  - Uses workspace-specific fallback message

- **Updated Controllers**:
  - `conversationController.ts`: Fetches AI config, loads history, passes to RAG
  - `widgetController.ts`: Same enhancements for public widget API

### 4. Confidence Scoring
- **Automatic Confidence Calculation**: Based on average citation relevance scores
- **Range**: 0-100 (percentage)
- **Returned in API**: `confidence` field in RAG answer response
- **Usage**: Frontend can display confidence, trigger escalation UI

### 5. Conversation History in RAG
- **Recent Messages Included**: Last N messages (configurable, default 5)
- **Format**: `senderType: content` per line
- **Role Awareness**: Distinguishes customer, assistant, agent, system messages
- **Chronological Order**: Oldest first for natural conversation flow

### 5. AI Configuration UI (Frontend Placeholder)
- **Route**: `/ai-config` (added to workspace nav)
- **Model**: `AIConfigPage` placeholder component
- **Navigation**: Added to workspace management section

## Files Created

| File | Description |
|------|-------------|
| `api/src/models/AIConfig.ts` | AI configuration MongoDB model |
| `api/src/controllers/aiConfigController.ts` | AI config GET/PATCH endpoints |
| `api/src/routes/aiConfigRoutes.ts` | AI config API routes |

## Files Modified

| File | Description |
|------|-------------|
| `api/src/models/AIConfig.ts` | New AI configuration model |
| `api/src/services/ragService.ts` | Enhanced with conversation history, custom instructions, confidence scoring |
| `api/src/controllers/conversationController.ts` | Fetch AI config, load history, pass to RAG |
| `api/src/controllers/widgetController.ts` | Same enhancements for widget API |
| `api/src/controllers/aiConfigController.ts` | AI config CRUD endpoints |
| `api/src/routes/aiConfigRoutes.ts` | AI config routes |
| `api/src/app.ts` | Added AI config routes |
| `api/src/models/AIConfig.ts` | New AI configuration model |

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

## API Endpoints Added

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workspaces/:workspaceId/ai-config` | Get AI configuration |
| PATCH | `/api/workspaces/:workspaceId/ai-config` | Update AI configuration (owner/admin) |

## Enhanced RAG Response

```json
{
  "answer": "Based on your policy...",
  "grounded": true,
  "model": "qwen2.5:1.5b-instruct",
  "citations": [...],
  "confidence": 87
}
```

## Conversation History Format

```json
[
  { "senderType": "customer", "content": "What's your return policy?", "createdAt": "2026-11-20T10:00:00.000Z" },
  { "senderType": "assistant", "content": "Our return policy is 30 days...", "createdAt": "2026-11-20T10:00:05.000Z" },
  { "senderType": "customer", "content": "What about exchanges?", "createdAt": "2026-11-20T10:01:00.000Z" }
]
```

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

1. **Response Feedback Collection** - No UI for thumbs up/down on AI responses yet
2. **Escalation UI** - No automatic escalation trigger in UI based on confidence
3. **A/B Testing** - No framework for testing different AI configurations
4. **Conversation Summarization** - No automatic conversation summaries
5. **Multi-language** - Language detection but no per-language tuning
6. **Analytics** - No AI performance dashboards yet
7. **Custom Model Selection** - Only uses single configured Ollama model

## Next Milestone

**M09 — Analytics & Reporting**
- Conversation analytics dashboard
- AI resolution rate tracking
- Agent performance metrics
- Customer satisfaction surveys
- Exportable reports