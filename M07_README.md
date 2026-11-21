# M07 — Customer & Contact Management

## Objective

Build a comprehensive customer management system with profiles, contact information, conversation history, and search capabilities.

## Features Implemented

### Backend (API)

- **Customer Model** (`Customer.ts`):
  - Core info: displayName, email, phone, avatar, externalId
  - Address: street, city, state, postalCode, country
  - Social links: twitter, linkedin, facebook, instagram
  - Tags and custom fields for flexibility
  - Notes and status (active/inactive/blocked)
  - Source tracking: dashboard/widget/import/api
  - Conversation analytics: count, messages, first/last activity timestamps
  - Unique indexes on email and externalId per workspace
  - Text search index on displayName and email

- **Customer Controller** (`customerController.ts`):
  - `GET /customers` - List with pagination, search, status filter, tag filter
  - `POST /customers` - Create customer (owner/admin/agent)
  - `GET /customers/:id` - Get customer with recent conversations
  - `PATCH /customers/:id` - Update customer (owner/admin/agent)
  - `DELETE /customers/:id` - Delete customer (owner/admin, blocks if has conversations)
  - `GET /customers/:id/conversations` - Paginated conversation list
  - `GET /customers/:id/timeline` - Unified view of conversations + messages

- **Conversation Model Updates**:
  - Replaced embedded customer with `customerId` reference
  - Updated indexes to use `customerId`
  - Maintains tenant isolation

- **Widget/Dashboard Integration**:
  - Creates/finds customer when new conversation starts
  - Updates customer stats (conversationCount, totalMessages, timestamps)
  - Uses externalId for widget session tracking

### Frontend (CustomerPage)

- **Customer List Panel** (Left Sidebar):
  - Search across name, email, phone, externalId, status, tags
  - Status filter (All/Active/Inactive/Blocked)
  - Pagination (20 per page)
  - Customer avatar with initials
  - Status badges with color coding
  - Source badge (Dashboard/Widget/Import/API)
  - Conversation count badge
  - Empty/loading/error states

- **Customer Detail Panel** (Main Area):
  - **Profile Tab**: Contact info, address, social links, tags, custom fields, notes, statistics
  - **Conversations Tab** (placeholder): Paginated conversation list
  - **Timeline Tab** (placeholder): Unified conversation + message view
  - Header with status badge, contact info, source, edit/delete actions

- **Modals**:
  - **New Customer**: Name (required), email, phone, externalId, status
  - **Edit Customer**: All fields editable
  - **Delete Confirmation**: Prevents deletion if conversations exist

- **Responsive Design**:
  - Desktop: Side-by-side (380px sidebar + detail)
  - Tablet: Stacked panels
  - Mobile: Full-width, compact tabs

### API Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/workspaces/:workspaceId/customers` | List customers | All |
| POST | `/api/workspaces/:workspaceId/customers` | Create customer | Owner/Admin/Agent |
| GET | `/api/workspaces/:workspaceId/customers/:id` | Get customer | All |
| PATCH | `/api/workspaces/:workspaceId/customers/:id` | Update customer | Owner/Admin/Agent |
| DELETE | `/api/workspaces/:workspaceId/customers/:id` | Delete customer | Owner/Admin |
| GET | `/api/workspaces/:workspaceId/customers/:id/conversations` | Customer conversations | All |
| GET | `/api/workspaces/:workspaceId/customers/:id/timeline` | Customer timeline | All |

### Navigation Integration

- Added "Customers" to primary navigation (User icon, badge count)
- Route: `/customers` → `CustomerPage`
- Added to `pageDescriptions` and `pagePaths`

### Styling

- Created `web/src/customers.css` with complete styling
- Consistent with existing design system
- Responsive breakpoints: 1250px, 1050px, 760px, 480px
- Modal styles shared with existing components

## Files Created

| File | Description |
|------|-------------|
| `api/src/models/Customer.ts` | Customer MongoDB model |
| `api/src/controllers/customerController.ts` | Customer CRUD + search + timeline |
| `api/src/routes/customerRoutes.ts` | Customer API routes |
| `web/src/components/dashboard/CustomerPage.tsx` | Customer management UI |
| `web/src/customers.css` | Complete styling |

## Files Modified

| File | Description |
|------|-------------|
| `api/src/models/Conversation.ts` | Replaced embedded customer with customerId reference |
| `api/src/controllers/conversationController.ts` | Find/create customer, update stats |
| `api/src/controllers/widgetController.ts` | Find/create customer, update stats |
| `api/src/app.ts` | Added customer routes |
| `web/src/App.tsx` | Added CustomerPage import, route, nav item, CSS import |
| `web/src/components/dashboard/CustomerPage.tsx` | Customer management UI |
| `web/src/customers.css` | Complete styling |

## Validation Results

### Frontend
```bash
cd web
npm run typecheck  # ✓ Passed
npm run build      # ✓ Built successfully (389.65 kB JS, 93.92 kB CSS)
```

### Backend
```bash
cd api
npm run typecheck  # ✓ Passed
npm test           # ✓ 13 test files, 69 tests passed
npm run build      # ✓ Built successfully
```

## Database Changes

- **New Collection**: `customers` with indexes
- **Conversation Collection**: 
  - Removed embedded `customer` field
  - Added `customerId` (ObjectId ref to Customer)
  - Updated compound indexes to use `customerId`
- **Unique Constraints**: 
  - `workspaceId + email` (partial, when email exists)
  - `workspaceId + externalId` (partial, when externalId exists)

## Known Limitations / Future Work

1. **Conversations/Timeline Tabs** - Placeholder only, need full implementation
2. **Bulk Operations** - No bulk import/export/tagging
3. **Customer Merge** - No duplicate detection/merge workflow
4. **Custom Field Validation** - No schema validation for custom fields
5. **Avatar Upload** - No image upload for customer avatars
6. **Customer Segments** - No saved filters/segments
7. **Activity Feed** - No detailed activity log per customer
8. **Email/Phone Validation** - Basic only, no deliverability check

## Next Milestone

**M08 — Advanced AI Support Capabilities**
- Improved RAG quality
- Conversation-aware context
- Follow-up question handling
- AI confidence scoring
- Custom instructions per workspace
- Response feedback collection