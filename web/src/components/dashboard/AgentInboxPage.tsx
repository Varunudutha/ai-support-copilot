import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ChangeEvent } from 'react'
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LoaderCircle,
  MessageSquareText,
  Search,
  Send,
  ShieldCheck,
  User,
  UserCheck,
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

interface LoadMoreMessagesResponse {
  messages: Message[]
  pagination: {
    limit: number
    total: number
    hasMore: boolean
  }
}

interface SendMessageResponse {
  message: string
  conversation: Conversation
  savedMessage: Message
}

interface UpdateConversationResponse {
  message: string
  conversation: Conversation
  systemMessages?: Message[]
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
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
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

type InboxTab = 'assigned' | 'unassigned' | 'all'

export function AgentInboxPage() {
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
  const [activeTab, setActiveTab] = useState<InboxTab>('assigned')
  const PAGE_LIMIT = 20

  // Selected conversation state
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messagesError, setMessagesError] = useState('')
  const [messagesHasMore, setMessagesHasMore] = useState(false)
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false)
  const [earliestMessageId, setEarliestMessageId] = useState<string | null>(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Message composer state
  const [composerContent, setComposerContent] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [composerError, setComposerError] = useState('')

  const canManageConversations = ['owner', 'admin', 'agent'].includes(activeWorkspaceRole ?? '')

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
      setMessagesHasMore(response.pagination.hasMore ?? false)
      setEarliestMessageId(response.messages.length > 0 ? response.messages[0]._id : null)
    } catch (cause) {
      setMessagesError(cause instanceof Error ? cause.message : 'Unable to load messages.')
      setMessages([])
      setMessagesHasMore(false)
      setEarliestMessageId(null)
    } finally {
      setLoadingMessages(false)
    }
  }, [apiRequest, workspaceId])

  // Load more messages (pagination for long conversations)
  const loadMoreMessages = useCallback(async () => {
    if (!workspaceId || !selectedConversation || !earliestMessageId || loadingMoreMessages || !messagesHasMore) return

    setLoadingMoreMessages(true)

    try {
      const response = await apiRequest<LoadMoreMessagesResponse>(
        `/workspaces/${workspaceId}/conversations/${selectedConversation._id}/messages?before=${earliestMessageId}&limit=50`,
      )

      setMessages((prev) => [...response.messages, ...prev])
      setMessagesHasMore(response.pagination.hasMore ?? false)
      if (response.messages.length > 0) {
        setEarliestMessageId(response.messages[0]._id)
      }
    } catch (cause) {
      console.error('Failed to load more messages:', cause)
    } finally {
      setLoadingMoreMessages(false)
    }
  }, [apiRequest, workspaceId, selectedConversation, earliestMessageId, loadingMoreMessages, messagesHasMore])

  // Handle workspace change - clear selected conversation
  useEffect(() => {
    setSelectedConversation(null)
    setMessages([])
    setMessagesError('')
  }, [workspaceId])

  // Load conversations on page/filter/tab change
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

  // Filter conversations based on active tab
  const filteredConversations = useMemo(() => {
    let result = conversations

    // Apply tab filter
    if (activeTab === 'assigned') {
      // TODO: Check if assigned to current user - for now show pending + assigned
      result = result.filter((c) => c.status === 'pending' || c.assignedTo)
    } else if (activeTab === 'unassigned') {
      result = result.filter((c) => c.status === 'open' && !c.assignedTo)
    }
    // 'all' shows everything

    // Apply search
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      result = result.filter((conversation) =>
        [
          conversation.customer.displayName,
          conversation.customer.email ?? '',
          conversation.subject ?? '',
          conversation._id,
          conversation.status,
        ].some((value) => value.toLowerCase().includes(query))
      )
    }

    return result
  }, [conversations, activeTab, searchQuery])

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      assigned: conversations.filter((c) => c.status === 'pending' || c.assignedTo).length,
      unassigned: conversations.filter((c) => c.status === 'open' && !c.assignedTo).length,
      all: conversations.length,
    }
  }, [conversations])

  // Send agent message in selected conversation
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

      // Add agent message to local state
      if (response.savedMessage) {
        setMessages((prev) => [...prev, response.savedMessage])
      }

      // Update conversation in list
      await loadConversations()
    } catch (cause) {
      setComposerError(cause instanceof Error ? cause.message : 'Failed to send message.')
      setComposerContent(trimmedContent)
    } finally {
      setSendingMessage(false)
    }
  }

  // Update conversation status/assignment
  const updateConversation = async (updates: { status?: ConversationStatus; assignedTo?: string | null }) => {
    if (!selectedConversation || !workspaceId) return

    try {
      const response = await apiRequest<UpdateConversationResponse>(
        `/workspaces/${workspaceId}/conversations/${selectedConversation._id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        },
      )

      setSelectedConversation(response.conversation)

      if (response.systemMessages) {
        setMessages((prev) => [...prev, ...response.systemMessages!])
      }

      await loadConversations()
    } catch (cause) {
      console.error('Failed to update conversation:', cause)
      alert(cause instanceof Error ? cause.message : 'Failed to update conversation.')
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

  // Handle tab change
  const handleTabChange = (tab: InboxTab) => {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  // Handle selecting a conversation
  const handleSelectConversation = (conversation: Conversation) => {
    if (selectedConversation?._id === conversation._id) return
    loadConversationMessages(conversation)
  }

  // Check if conversation is assigned to current user (simplified)
  const isAssignedToMe = (conversation: Conversation) => {
    return conversation.assignedTo !== null
  }

  return (
    <div className="agent-inbox-page" aria-busy={loadingConversations || loadingMessages || sendingMessage}>
      {/* Inbox Sidebar */}
      <aside className="agent-inbox-sidebar" aria-label="Agent inbox conversations">
        <div className="agent-inbox-header">
          <div>
            <div className="eyebrow page-eyebrow">AGENT INBOX</div>
            <h1>Agent Inbox</h1>
            <p className="inbox-count">{totalConversations} total conversations</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="inbox-tabs" role="tablist">
          {([
            { id: 'assigned', label: 'Assigned', count: tabCounts.assigned },
            { id: 'unassigned', label: 'Unassigned', count: tabCounts.unassigned },
            { id: 'all', label: 'All', count: tabCounts.all },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`inbox-tab ${activeTab === tab.id ? 'inbox-tab-active' : ''}`}
              onClick={() => handleTabChange(tab.id as InboxTab)}
            >
              <span>{tab.label}</span>
              <span className="inbox-tab-badge">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="inbox-search-filter">
          <label className="inbox-search">
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
              placeholder="Search conversations..."
              aria-label="Search conversations"
            />
          </label>
          <div className="inbox-filter">
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
              <strong>{searchQuery ? 'No matching conversations' : activeTab === 'unassigned' ? 'No unassigned conversations' : 'No assigned conversations'}</strong>
              <p>
                {searchQuery
                  ? 'Try a different search term.'
                  : activeTab === 'unassigned'
                    ? 'All conversations are assigned. Great work!'
                    : 'No conversations assigned to you yet.'}
              </p>
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
                      <span className={`conversation-avatar ${isAssignedToMe(conversation) ? 'avatar-assigned' : ''}`}>
                        {getInitials(conversation.customer.displayName)}
                        {isAssignedToMe(conversation) && <UserCheck size={10} className="assigned-indicator" />}
                      </span>
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
                    {selectedConversation.assignedTo && (
                      <span className="conversation-assigned-badge">
                        <UserCheck size={12} /> Assigned
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="conversation-header-actions">
                {selectedConversation.status !== 'closed' && canManageConversations && (
                  <>
                    {/* Status dropdown */}
                    <div className="dropdown">
                      <button
                        className="button button-secondary dropdown-toggle"
                        type="button"
                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                        aria-haspopup="true"
                        aria-expanded={showStatusDropdown}
                      >
                        <ChevronDown size={14} /> Status
                      </button>
                      {showStatusDropdown && (
                        <div className="dropdown-menu" role="menu">
                          {(['open', 'pending', 'closed'] as ConversationStatus[]).map((status) => (
                            <button
                              key={status}
                              className={`dropdown-item ${selectedConversation.status === status ? 'dropdown-item-active' : ''}`}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                updateConversation({ status })
                                setShowStatusDropdown(false)
                              }}
                              disabled={selectedConversation.status === status}
                            >
                              {STATUS_LABELS[status]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assign/Unassign */}
                    {selectedConversation.status === 'pending' && (
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                          updateConversation({ assignedTo: null })
                        }}
                        disabled={!selectedConversation.assignedTo}
                      >
                        {selectedConversation.assignedTo ? 'Unassign' : 'Assign to Me'}
                      </button>
                    )}
                    {selectedConversation.status === 'open' && !selectedConversation.assignedTo && (
                      <button
                        className="button button-primary"
                        type="button"
                        onClick={() => {
                          updateConversation({ assignedTo: 'me', status: 'pending' })
                        }}
                      >
                        <UserCheck size={14} /> Take
                      </button>
                    )}
                  </>
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
                  {messagesHasMore && (
                    <button
                      className="load-more-messages"
                      type="button"
                      onClick={loadMoreMessages}
                      disabled={loadingMoreMessages}
                    >
                      {loadingMoreMessages ? (
                        <LoaderCircle size={14} className="spin" />
                      ) : (
                        <>
                          <ArrowUpRight size={14} />
                          Load earlier messages
                        </>
                      )}
                    </button>
                  )}
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

            {/* Message Composer - Agent Reply */}
            <form className="conversation-composer" onSubmit={handleSendMessage}>
              {composerError && (
                <div className="composer-error" role="alert">
                  <AlertCircle size={14} />
                  <span>{composerError}</span>
                </div>
              )}
              <div className="composer-input-wrap">
                <label htmlFor="composer-message" className="sr-only">Write a reply</label>
                <textarea
                  id="composer-message"
                  value={composerContent}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setComposerContent(event.target.value)}
                  placeholder={selectedConversation.status === 'closed' ? 'This conversation is closed' : 'Write a reply…'}
                  rows={3}
                  maxLength={20000}
                  disabled={selectedConversation.status === 'closed' || sendingMessage || !selectedConversation}
                  aria-label="Agent reply composer"
                />
                <button
                  className="button button-primary composer-submit"
                  type="submit"
                  disabled={sendingMessage || !composerContent.trim() || selectedConversation?.status === 'closed' || !selectedConversation}
                >
                  {sendingMessage ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}
                  {sendingMessage ? 'Sending…' : 'Send reply'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="conversation-detail-empty">
            <MessageSquareText size={48} />
            <strong>Select a conversation</strong>
            <p>Choose a conversation from the inbox to view messages and reply.</p>
          </div>
        )}
      </section>
    </div>
  )
}