import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ChangeEvent } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Search,
  Send,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

type ConversationStatus = 'open' | 'pending' | 'closed'
type SenderType = 'customer' | 'assistant' | 'agent' | 'system'

interface Customer {
  displayName: string
  email: string | null
  externalId: string | null
}

interface Conversation {
  _id: string
  workspaceId: string
  channel: 'dashboard' | 'widget'
  status: ConversationStatus
  subject: string | null
  customer: Customer
  assignedTo: string | null
  lastMessageAt: string
  messageCount: number
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

interface Message {
  _id: string
  workspaceId: string
  conversationId: string
  senderType: SenderType
  senderId: string | null
  content: string
  citations: Array<{
    citationId: string
    id: string
    documentId: string
    chunkIndex: number
    sourceName: string
    mimeType: string
    pageCount: number | null
    score: number
    excerpt: string
  }>
  createdAt: string
  updatedAt: string
}

interface ListConversationsResponse {
  conversations: Conversation[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface GetConversationResponse {
  conversation: Conversation
  messages: Message[]
  pagination: {
    limit: number
    total: number
    hasMore: boolean
  }
}

interface CreateConversationResponse {
  message: string
  conversation: Conversation
  messages: Message[]
}

interface SendMessageResponse {
  message: string
  conversation: Conversation
  savedMessage: Message
  aiMessage?: Message
}

const STATUS_LABELS: Record<ConversationStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  closed: 'Closed',
}

const SENDER_LABELS: Record<SenderType, string> = {
  customer: 'Customer',
  assistant: 'AI Assistant',
  agent: 'Agent',
  system: 'System',
}

const SENDER_ICONS: Record<SenderType, React.ReactNode> = {
  customer: <User size={14} />,
  assistant: <Bot size={14} />,
  agent: <ShieldCheck size={14} />,
  system: <CircleHelp size={14} />,
}

const CHANNEL_LABELS: Record<'dashboard' | 'widget', string> = {
  dashboard: 'Dashboard',
  widget: 'Website',
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatRelativeTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(value)
}

function getStatusTone(status: ConversationStatus): string {
  switch (status) {
    case 'open': return 'status-open'
    case 'pending': return 'status-pending'
    case 'closed': return 'status-closed'
  }
}

function getSenderTone(senderType: SenderType): string {
  switch (senderType) {
    case 'customer': return 'message-customer'
    case 'assistant': return 'message-assistant'
    case 'agent': return 'message-agent'
    case 'system': return 'message-system'
  }
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U'
}

export function ConversationsPage() {
  const { activeWorkspace, activeWorkspaceRole, apiRequest } = useAuth()
  const workspaceId = activeWorkspace?.id ?? ''

  // Conversation list state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [conversationsError, setConversationsError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalConversations, setTotalConversations] = useState(0)
  const PAGE_LIMIT = 20

  // Selected conversation state
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messagesError, setMessagesError] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

  // New conversation modal state
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [newInitialMessage, setNewInitialMessage] = useState('')
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [newConversationError, setNewConversationError] = useState('')

  // Message composer state
  const [composerContent, setComposerContent] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [composerError, setComposerError] = useState('')

  const canCreateConversation = ['owner', 'admin', 'agent'].includes(activeWorkspaceRole ?? '')

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!workspaceId) {
      setConversations([])
      setLoadingConversations(false)
      setTotalConversations(0)
      setTotalPages(1)
      return
    }

    setLoadingConversations(true)
    setConversationsError('')

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_LIMIT),
      })
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const response = await apiRequest<ListConversationsResponse>(
        `/workspaces/${workspaceId}/conversations?${params.toString()}`,
      )

      setConversations(response.conversations ?? [])
      setTotalConversations(response.pagination.total ?? 0)
      setTotalPages(response.pagination.pages ?? 1)
    } catch (cause) {
      setConversationsError(cause instanceof Error ? cause.message : 'Unable to load conversations.')
      setConversations([])
      setTotalConversations(0)
      setTotalPages(1)
    } finally {
      setLoadingConversations(false)
    }
  }, [apiRequest, workspaceId, currentPage, statusFilter])

  // Load selected conversation messages
  const loadConversationMessages = useCallback(async (conversation: Conversation) => {
    if (!workspaceId) return

    setSelectedConversation(conversation)
    setLoadingMessages(true)
    setMessagesError('')

    try {
      const response = await apiRequest<GetConversationResponse>(
        `/workspaces/${workspaceId}/conversations/${conversation._id}?limit=100`,
      )

      setMessages(response.messages ?? [])
    } catch (cause) {
      setMessagesError(cause instanceof Error ? cause.message : 'Unable to load messages.')
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [apiRequest, workspaceId])

  // Handle workspace change - clear selected conversation
  useEffect(() => {
    setSelectedConversation(null)
    setMessages([])
    setMessagesError('')
  }, [workspaceId])

  // Load conversations on page/filter change
  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Filter conversations client-side for search
  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter((conversation) =>
      [
        conversation.customer.displayName,
        conversation.customer.email ?? '',
        conversation.subject ?? '',
        conversation._id,
        conversation.status,
      ].some((value) => value.toLowerCase().includes(query))
    )
  }, [conversations, searchQuery])

  // Create new conversation
  const handleCreateConversation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = newCustomerName.trim()
    const trimmedMessage = newInitialMessage.trim()

    if (!trimmedName || !trimmedMessage || !workspaceId || creatingConversation) return

    setCreatingConversation(true)
    setNewConversationError('')

    try {
      const response = await apiRequest<CreateConversationResponse>(
        `/workspaces/${workspaceId}/conversations`,
        {
          method: 'POST',
          body: JSON.stringify({
            customer: {
              displayName: trimmedName,
              email: newCustomerEmail.trim() || null,
              externalId: null,
            },
            subject: newSubject.trim() || null,
            initialMessage: trimmedMessage,
          }),
        },
      )

      setShowNewConversationModal(false)
      setNewCustomerName('')
      setNewCustomerEmail('')
      setNewSubject('')
      setNewInitialMessage('')

      // Load the new conversation
      await loadConversationMessages(response.conversation)
      // Refresh conversation list
      await loadConversations()
    } catch (cause) {
      setNewConversationError(cause instanceof Error ? cause.message : 'Failed to create conversation.')
    } finally {
      setCreatingConversation(false)
    }
  }

  // Send customer message in selected conversation
  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedContent = composerContent.trim()

    if (!trimmedContent || !selectedConversation || !workspaceId || sendingMessage) return

    setSendingMessage(true)
    setComposerError('')
    setComposerContent('')

    try {
      const response = await apiRequest<SendMessageResponse>(
        `/workspaces/${workspaceId}/conversations/${selectedConversation._id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content: trimmedContent }),
        },
      )

      // Add customer message and AI response (if any) to local state immediately
      if (response.savedMessage) {
        setMessages((prev) => [...prev, response.savedMessage])
      }
      if (response.aiMessage) {
        setMessages((prev) => [...prev, response.aiMessage!])
      }

      // Update conversation in list (last message time, count)
      await loadConversations()
    } catch (cause) {
      setComposerError(cause instanceof Error ? cause.message : 'Failed to send message.')
      // Restore composer content on error
      setComposerContent(trimmedContent)
    } finally {
      setSendingMessage(false)
    }
  }

  // Handle status filter change
  const handleStatusFilterChange = (status: ConversationStatus | 'all') => {
    setStatusFilter(status)
    setCurrentPage(1)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Open new conversation modal
  const handleOpenNewConversation = () => {
    setShowNewConversationModal(true)
    setNewConversationError('')
  }

  // Close new conversation modal
  const handleCloseNewConversation = () => {
    setShowNewConversationModal(false)
    setNewConversationError('')
    setNewCustomerName('')
    setNewCustomerEmail('')
    setNewSubject('')
    setNewInitialMessage('')
  }

  // Handle selecting a conversation from the list
  const handleSelectConversation = (conversation: Conversation) => {
    if (selectedConversation?._id === conversation._id) return
    loadConversationMessages(conversation)
  }

  const activeConversationsCount = conversations.filter((c) => c.status !== 'closed').length

  return (
    <div className="conversations-page" aria-busy={loadingConversations || loadingMessages || creatingConversation || sendingMessage}>
      {/* Conversation List Panel */}
      <aside className="conversations-sidebar" aria-label="Conversations list">
        <div className="conversations-sidebar-header">
          <div>
            <div className="eyebrow page-eyebrow">CONVERSATIONS</div>
            <h1>Conversations</h1>
            <p className="conversations-count">
              {totalConversations} total · {activeConversationsCount} active
            </p>
          </div>
          {canCreateConversation && (
            <button
              className="button button-primary"
              type="button"
              onClick={handleOpenNewConversation}
              disabled={creatingConversation}
            >
              <Plus size={15} /> New conversation
            </button>
          )}
        </div>

        <div className="conversations-search-filter">
          <label className="conversations-search">
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
              placeholder="Search conversations..."
              aria-label="Search conversations"
            />
          </label>
          <div className="conversations-filter">
            <select
              value={statusFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => handleStatusFilterChange(event.target.value as ConversationStatus | 'all')}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {conversationsError && (
          <div className="conversations-alert conversations-alert-error" role="alert">
            <span>{conversationsError}</span>
            <button type="button" onClick={() => void loadConversations()} aria-label="Retry">
              <LoaderCircle size={14} className="spin" />
            </button>
          </div>
        )}

        <div className="conversations-list-wrap">
          {loadingConversations && filteredConversations.length === 0 ? (
            <div className="conversations-loading">
              <LoaderCircle size={22} className="spin" />
              Loading conversations…
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="conversations-empty">
              <MessageSquareText size={28} />
              <strong>{searchQuery ? 'No matching conversations' : 'No conversations yet'}</strong>
              <p>
                {searchQuery
                  ? 'Try a different search term or clear the filter.'
                  : 'Start a new conversation with a customer to begin.'}
              </p>
              {canCreateConversation && !searchQuery && (
                <button className="button button-primary" type="button" onClick={handleOpenNewConversation}>
                  <Plus size={15} /> Create conversation
                </button>
              )}
            </div>
          ) : (
            <ul className="conversations-list" role="list">
              {filteredConversations.map((conversation) => (
                <li
                  key={conversation._id}
                  className={`conversation-item ${selectedConversation?._id === conversation._id ? 'conversation-item-selected' : ''}`}
                  onClick={() => handleSelectConversation(conversation)}
                >
                  <div className="conversation-item-main">
                    <div className="conversation-customer">
                      <span className="conversation-avatar">{getInitials(conversation.customer.displayName)}</span>
                      <div className="conversation-customer-info">
                        <strong>{conversation.customer.displayName}</strong>
                        <small>
                          {conversation.customer.email ? <span>{conversation.customer.email}</span> : <span className="no-email">No email</span>}
                        </small>
                      </div>
                    </div>
                    <div className="conversation-meta">
                      <span className={`conversation-status ${getStatusTone(conversation.status)}`}>
                        {STATUS_LABELS[conversation.status]}
                      </span>
                      <span className="conversation-time">{formatRelativeTime(conversation.lastMessageAt)}</span>
                    </div>
                  </div>
                  <div className="conversation-preview">
                    <span className="conversation-channel">
                      <MessageSquareText size={12} /> {CHANNEL_LABELS[conversation.channel]}
                    </span>
                    {conversation.subject && (
                      <span className="conversation-subject">{conversation.subject}</span>
                    )}
                    <span className="conversation-message-count">{conversation.messageCount} messages</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="conversations-pagination">
              <button
                className="pagination-button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="pagination-button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Conversation Detail Panel */}
      <section className="conversation-detail" aria-label="Conversation messages">
        {selectedConversation ? (
          <>
            <div className="conversation-detail-header">
              <div className="conversation-header-left">
                <span className="conversation-detail-avatar">{getInitials(selectedConversation.customer.displayName)}</span>
                <div className="conversation-header-info">
                  <div className="conversation-header-name-row">
                    <strong>{selectedConversation.customer.displayName}</strong>
                    <span className={`conversation-status ${getStatusTone(selectedConversation.status)}`}>
                      {STATUS_LABELS[selectedConversation.status]}
                    </span>
                  </div>
                  <div className="conversation-header-meta">
                    {selectedConversation.customer.email && (
                      <span className="conversation-email">{selectedConversation.customer.email}</span>
                    )}
                    <span className="conversation-channel-badge">
                      <MessageSquareText size={12} /> {CHANNEL_LABELS[selectedConversation.channel]}
                    </span>
                    <span className="conversation-id">#{selectedConversation._id.slice(-6)}</span>
                  </div>
                </div>
              </div>
              <div className="conversation-header-actions">
                {selectedConversation.status !== 'closed' && canCreateConversation && (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => {}}
                    disabled
                    title="Status management coming soon"
                  >
                    <ChevronDown size={14} /> Status
                  </button>
                )}
              </div>
            </div>

            <div className="conversation-messages" role="log" aria-live="polite" aria-label="Messages">
              {loadingMessages && messages.length === 0 ? (
                <div className="messages-loading">
                  <LoaderCircle size={22} className="spin" />
                  Loading messages…
                </div>
              ) : messagesError ? (
                <div className="messages-error">
                  <AlertCircle size={22} />
                  <p>{messagesError}</p>
                  <button className="button button-secondary" type="button" onClick={() => selectedConversation && loadConversationMessages(selectedConversation)}>
                    <ArrowRight size={14} /> Retry
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="messages-empty">
                  <MessageSquareText size={28} />
                  <strong>No messages yet</strong>
                  <p>This conversation is empty. Send the first message below.</p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <article
                      key={message._id}
                      className={`message-bubble ${getSenderTone(message.senderType)}`}
                    >
                      <div className="message-header">
                        <span className="message-sender">
                          {SENDER_ICONS[message.senderType]}
                          {SENDER_LABELS[message.senderType]}
                        </span>
                        <time className="message-time" dateTime={message.createdAt}>
                          {formatRelativeTime(message.createdAt)}
                        </time>
                      </div>
                      <div className="message-content">
                        <p>{message.content}</p>
                      </div>
                      {message.citations && message.citations.length > 0 && (
                        <details className="message-citations">
                          <summary>Sources <span>({message.citations.length})</span></summary>
                          <div className="citations-list">
                            {message.citations.map((citation) => (
                              <details className="citation-item" key={citation.id}>
                                <summary>
                                  <span className="citation-id">{citation.citationId}</span>
                                  <strong title={citation.sourceName}>{citation.sourceName}</strong>
                                  <span className="citation-toggle">View excerpt</span>
                                </summary>
                                <p>{citation.excerpt}</p>
                              </details>
                            ))}
                          </div>
                        </details>
                      )}
                    </article>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Composer */}
            <form className="conversation-composer" onSubmit={handleSendMessage}>
              {composerError && (
                <div className="composer-error" role="alert">
                  <AlertCircle size={14} />
                  <span>{composerError}</span>
                </div>
              )}
              <div className="composer-input-wrap">
                <label htmlFor="composer-message" className="sr-only">Write a message</label>
                <textarea
                  id="composer-message"
                  value={composerContent}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setComposerContent(event.target.value)}
                  placeholder={selectedConversation.status === 'closed' ? 'This conversation is closed' : 'Write a message…'}
                  rows={3}
                  maxLength={20000}
                  disabled={selectedConversation.status === 'closed' || sendingMessage || !selectedConversation}
                  aria-label="Message composer"
                />
                <button
                  className="button button-primary composer-submit"
                  type="submit"
                  disabled={sendingMessage || !composerContent.trim() || selectedConversation?.status === 'closed' || !selectedConversation}
                >
                  {sendingMessage ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}
                  {sendingMessage ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="conversation-detail-empty">
            <MessageSquareText size={48} />
            <strong>Select a conversation</strong>
            <p>Choose a conversation from the list to view messages and reply.</p>
            {canCreateConversation && (
              <button className="button button-primary" type="button" onClick={handleOpenNewConversation}>
                <Plus size={16} /> Start a new conversation
              </button>
            )}
          </div>
        )}
      </section>

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <div className="modal-backdrop" role="presentation" onClick={handleCloseNewConversation}>
          <section className="conversation-modal" role="dialog" aria-modal="true" aria-labelledby="new-conversation-title" onClick={(event) => event.stopPropagation()}>
            <div className="conversation-modal-header">
              <div>
                <strong id="new-conversation-title">New conversation</strong>
                <p>Create a conversation with a customer and send the first message.</p>
              </div>
              <button className="icon-button" onClick={handleCloseNewConversation} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <form className="conversation-modal-form" onSubmit={handleCreateConversation}>
              {newConversationError && (
                <div className="modal-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{newConversationError}</span>
                </div>
              )}

              <div className="modal-field">
                <label htmlFor="new-customer-name">Customer name <span className="required">*</span></label>
                <input
                  id="new-customer-name"
                  type="text"
                  value={newCustomerName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setNewCustomerName(event.target.value)}
                  placeholder="Customer's full name"
                  maxLength={100}
                  required
                  disabled={creatingConversation}
                />
              </div>

              <div className="modal-field">
                <label htmlFor="new-customer-email">Customer email</label>
                <input
                  id="new-customer-email"
                  type="email"
                  value={newCustomerEmail}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setNewCustomerEmail(event.target.value)}
                  placeholder="customer@example.com (optional)"
                  maxLength={254}
                  disabled={creatingConversation}
                />
              </div>

              <div className="modal-field">
                <label htmlFor="new-subject">Subject</label>
                <input
                  id="new-subject"
                  type="text"
                  value={newSubject}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setNewSubject(event.target.value)}
                  placeholder="Brief subject (optional)"
                  maxLength={160}
                  disabled={creatingConversation}
                />
              </div>

              <div className="modal-field modal-field-full">
                <label htmlFor="new-initial-message">First message <span className="required">*</span></label>
                <textarea
                  id="new-initial-message"
                  value={newInitialMessage}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNewInitialMessage(event.target.value)}
                  placeholder="What is the customer asking?"
                  rows={4}
                  maxLength={20000}
                  required
                  disabled={creatingConversation}
                />
              </div>

              <div className="modal-actions">
                <button className="button button-secondary" type="button" onClick={handleCloseNewConversation} disabled={creatingConversation}>
                  Cancel
                </button>
                <button className="button button-primary" type="submit" disabled={creatingConversation || !newCustomerName.trim() || !newInitialMessage.trim()}>
                  {creatingConversation ? <LoaderCircle size={15} className="spin" /> : <Plus size={15} />}
                  {creatingConversation ? 'Creating…' : 'Create conversation'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}