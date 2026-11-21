import { useCallback, useEffect, useMemo, useState, type FormEvent, type ChangeEvent } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  X,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

type CustomerStatus = 'active' | 'inactive' | 'blocked'

interface Address {
  street: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

interface Social {
  twitter: string | null
  linkedin: string | null
  facebook: string | null
  instagram: string | null
}

interface CustomField {
  key: string
  value: string | null
}

interface Customer {
  _id: string
  workspaceId: string
  displayName: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  externalId: string | null
  address: Address | null
  social: Social | null
  tags: string[]
  customFields: CustomField[]
  notes: string | null
  status: CustomerStatus
  source: string
  firstConversationAt: string | null
  lastConversationAt: string | null
  conversationCount: number
  totalMessages: number
  createdAt: string
  updatedAt: string
}

interface ListCustomersResponse {
  customers: Customer[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface GetCustomerResponse {
  customer: Customer
  recentConversations: Array<{
    _id: string
    status: string
    subject: string | null
    lastMessageAt: string
    messageCount: number
    channel: string
  }>
}

interface CreateCustomerResponse {
  message: string
  customer: Customer
}

const STATUS_LABELS: Record<CustomerStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  blocked: 'Blocked',
}

const STATUS_TONES: Record<CustomerStatus, string> = {
  active: 'status-active',
  inactive: 'status-inactive',
  blocked: 'status-blocked',
}

const SOURCE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  widget: 'Website',
  import: 'Import',
  api: 'API',
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function formatRelativeTime(value: string | null): string {
  if (!value) return 'Never'
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

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U'
}

function getStatusTone(status: CustomerStatus): string {
  return STATUS_TONES[status]
}

export function CustomerPage() {
  const { activeWorkspace, activeWorkspaceRole, apiRequest } = useAuth()
  const workspaceId = activeWorkspace?.id ?? ''

  // Customer list state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [customersError, setCustomersError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const PAGE_LIMIT = 20

  // Selected customer state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [loadingCustomer, setLoadingCustomer] = useState(false)
  const [customerError, setCustomerError] = useState('')

  // New customer modal state
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newExternalId, setNewExternalId] = useState('')
  const [newStatus, setNewStatus] = useState<CustomerStatus>('active')
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [newCustomerError, setNewCustomerError] = useState('')

  // Edit customer modal state
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Partial<Customer> | null>(null)
  const [editingCustomer, setEditingCustomer] = useState(false)
  const [editCustomerError, setEditCustomerError] = useState('')

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState(false)

  const canManageCustomers = ['owner', 'admin', 'agent'].includes(activeWorkspaceRole ?? '')

  // Load customers list
  const loadCustomers = useCallback(async () => {
    if (!workspaceId) {
      setCustomers([])
      setLoadingCustomers(false)
      setTotalCustomers(0)
      setTotalPages(1)
      return
    }

    setLoadingCustomers(true)
    setCustomersError('')

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_LIMIT),
      })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())

      const response = await apiRequest<ListCustomersResponse>(
        `/workspaces/${workspaceId}/customers?${params.toString()}`,
      )

      setCustomers(response.customers ?? [])
      setTotalCustomers(response.pagination.total ?? 0)
      setTotalPages(response.pagination.pages ?? 1)
    } catch (cause) {
      setCustomersError(cause instanceof Error ? cause.message : 'Unable to load customers.')
      setCustomers([])
      setTotalCustomers(0)
      setTotalPages(1)
    } finally {
      setLoadingCustomers(false)
    }
  }, [apiRequest, workspaceId, currentPage, statusFilter, searchQuery])

  // Load selected customer details
  const loadCustomerDetails = useCallback(async (customer: Customer) => {
    if (!workspaceId) return

    setSelectedCustomer(customer)
    setLoadingCustomer(true)
    setCustomerError('')

    try {
      const response = await apiRequest<GetCustomerResponse>(
        `/workspaces/${workspaceId}/customers/${customer._id}`,
      )

      setSelectedCustomer(response.customer)
    } catch (cause) {
      setCustomerError(cause instanceof Error ? cause.message : 'Unable to load customer details.')
    } finally {
      setLoadingCustomer(false)
    }
  }, [apiRequest, workspaceId])

  // Handle workspace change - clear selected customer
  useEffect(() => {
    setSelectedCustomer(null)
    setCustomerError('')
  }, [workspaceId])

  // Load customers on page/filter change
  useEffect(() => {
    void loadCustomers()
  }, [loadCustomers])

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return customers
    return customers.filter((customer) =>
      [
        customer.displayName,
        customer.email ?? '',
        customer.phone ?? '',
        customer.externalId ?? '',
        customer.status,
        ...customer.tags,
      ].some((value) => value.toLowerCase().includes(query))
    )
  }, [customers, searchQuery])

  // Create new customer
  const handleCreateCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = newDisplayName.trim()
    if (!trimmedName || !workspaceId || creatingCustomer) return

    setCreatingCustomer(true)
    setNewCustomerError('')

    try {
      await apiRequest<CreateCustomerResponse>(
        `/workspaces/${workspaceId}/customers`,
        {
          method: 'POST',
          body: JSON.stringify({
            displayName: trimmedName,
            email: newEmail.trim() || null,
            phone: newPhone.trim() || null,
            externalId: newExternalId.trim() || null,
            status: newStatus,
          }),
        },
      )

      setShowNewCustomerModal(false)
      setNewDisplayName('')
      setNewEmail('')
      setNewPhone('')
      setNewExternalId('')
      setNewStatus('active')
      setNewCustomerError('')

      // Refresh customer list
      await loadCustomers()
    } catch (cause) {
      setNewCustomerError(cause instanceof Error ? cause.message : 'Failed to create customer.')
    } finally {
      setCreatingCustomer(false)
    }
  }

  // Update customer
  const handleUpdateCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!workspaceId || !editCustomer || editingCustomer) return

    setEditingCustomer(true)
    setEditCustomerError('')

    try {
      await apiRequest<{ message: string; customer: Customer }>(
        `/workspaces/${workspaceId}/customers/${editCustomer._id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            displayName: editCustomer.displayName,
            email: editCustomer.email,
            phone: editCustomer.phone,
            externalId: editCustomer.externalId,
            status: editCustomer.status,
          }),
        },
      )

      setShowEditCustomerModal(false)
      setEditCustomer(null)
      setEditCustomerError('')

      // Refresh customer list and selected customer
      await loadCustomers()
      if (selectedCustomer?._id === editCustomer._id) {
        await loadCustomerDetails({ ...selectedCustomer, ...editCustomer } as Customer)
      }
    } catch (cause) {
      setEditCustomerError(cause instanceof Error ? cause.message : 'Failed to update customer.')
    } finally {
      setEditingCustomer(false)
    }
  }

  // Delete customer
  const handleDeleteCustomer = async () => {
    if (!workspaceId || !deletingCustomerId || deletingCustomer) return

    setDeletingCustomer(true)

    try {
      await apiRequest<{ message: string }>(
        `/workspaces/${workspaceId}/customers/${deletingCustomerId}`,
        { method: 'DELETE' },
      )

      setShowDeleteModal(false)
      setDeletingCustomerId(null)

      // Clear selected customer if it was deleted
      if (selectedCustomer?._id === deletingCustomerId) {
        setSelectedCustomer(null)
      }

      await loadCustomers()
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'Failed to delete customer.')
    } finally {
      setDeletingCustomer(false)
    }
  }

  // Handle status filter change
  const handleStatusFilterChange = (status: CustomerStatus | 'all') => {
    setStatusFilter(status)
    setCurrentPage(1)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Open new customer modal
  const handleOpenNewCustomer = () => {
    setShowNewCustomerModal(true)
    setNewCustomerError('')
    setNewDisplayName('')
    setNewEmail('')
    setNewPhone('')
    setNewExternalId('')
    setNewStatus('active')
  }

  // Open edit customer modal
  const handleOpenEditCustomer = (customer: Customer) => {
    setEditCustomer({
      _id: customer._id,
      displayName: customer.displayName,
      email: customer.email,
      phone: customer.phone,
      externalId: customer.externalId,
      status: customer.status,
    })
    setShowEditCustomerModal(true)
    setEditCustomerError('')
  }

  // Open delete confirmation modal
  const handleOpenDeleteCustomer = (customer: Customer) => {
    setDeletingCustomerId(customer._id)
    setShowDeleteModal(true)
  }

  // Handle selecting a customer from the list
  const handleSelectCustomer = (customer: Customer) => {
    if (selectedCustomer?._id === customer._id) return
    loadCustomerDetails(customer)
  }

  const activeCustomersCount = customers.filter((c) => c.status === 'active').length

  return (
    <div className="customers-page" aria-busy={loadingCustomers || loadingCustomer || creatingCustomer || editingCustomer || deletingCustomer}>
      {/* Customer List Panel */}
      <aside className="customers-sidebar" aria-label="Customers list">
        <div className="customers-sidebar-header">
          <div>
            <div className="eyebrow page-eyebrow">CUSTOMERS</div>
            <h1>Customers</h1>
            <p className="customers-count">
              {totalCustomers} total · {activeCustomersCount} active
            </p>
          </div>
          {canManageCustomers && (
            <button
              className="button button-primary"
              type="button"
              onClick={handleOpenNewCustomer}
              disabled={creatingCustomer}
            >
              <UserPlus size={15} /> New customer
            </button>
          )}
        </div>

        <div className="customers-search-filter">
          <label className="customers-search">
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
              placeholder="Search customers..."
              aria-label="Search customers"
            />
          </label>
          <div className="customers-filter">
            <select
              value={statusFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => handleStatusFilterChange(event.target.value as CustomerStatus | 'all')}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        {customersError && (
          <div className="customers-alert customers-alert-error" role="alert">
            <span>{customersError}</span>
            <button type="button" onClick={() => void loadCustomers()} aria-label="Retry">
              <LoaderCircle size={14} className="spin" />
            </button>
          </div>
        )}

        <div className="customers-list-wrap">
          {loadingCustomers && filteredCustomers.length === 0 ? (
            <div className="customers-loading">
              <LoaderCircle size={22} className="spin" />
              Loading customers…
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="customers-empty">
              <User size={28} />
              <strong>{searchQuery ? 'No matching customers' : 'No customers yet'}</strong>
              <p>
                {searchQuery
                  ? 'Try a different search term or clear the filter.'
                  : 'Add your first customer to start building your contact list.'}
              </p>
              {canManageCustomers && !searchQuery && (
                <button className="button button-primary" type="button" onClick={handleOpenNewCustomer}>
                  <UserPlus size={15} /> Add customer
                </button>
              )}
            </div>
          ) : (
            <ul className="customers-list" role="list">
              {filteredCustomers.map((customer) => (
                <li
                  key={customer._id}
                  className={`customer-item ${selectedCustomer?._id === customer._id ? 'customer-item-selected' : ''}`}
                  onClick={() => handleSelectCustomer(customer)}
                >
                  <div className="customer-item-main">
                    <div className="customer-customer">
                      <span className="customer-avatar">{getInitials(customer.displayName)}</span>
                      <div className="customer-customer-info">
                        <strong>{customer.displayName}</strong>
                        <small>
                          {customer.email ? <span>{customer.email}</span> : <span className="no-email">No email</span>}
                        </small>
                      </div>
                    </div>
                    <div className="customer-meta">
                      <span className={`customer-status ${getStatusTone(customer.status)}`}>
                        {STATUS_LABELS[customer.status]}
                      </span>
                      <span className="customer-time">{formatRelativeTime(customer.lastConversationAt)}</span>
                    </div>
                  </div>
                  <div className="customer-preview">
                    <span className="customer-source">
                      <Globe size={12} /> {SOURCE_LABELS[customer.source] || customer.source}
                    </span>
                    <span className="customer-conversation-count">{customer.conversationCount} conversations</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="customers-pagination">
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

      {/* Customer Detail Panel */}
      <section className="customer-detail" aria-label="Customer details">
        {selectedCustomer ? (
          <>
            <div className="customer-detail-header">
              <div className="customer-header-left">
                <span className="customer-detail-avatar">{getInitials(selectedCustomer.displayName)}</span>
                <div className="customer-header-info">
                  <div className="customer-header-name-row">
                    <strong>{selectedCustomer.displayName}</strong>
                    <span className={`customer-status ${getStatusTone(selectedCustomer.status)}`}>
                      {STATUS_LABELS[selectedCustomer.status]}
                    </span>
                  </div>
                  <div className="customer-header-meta">
                    {selectedCustomer.email && (
                      <span className="customer-email">
                        <Mail size={12} /> {selectedCustomer.email}
                      </span>
                    )}
                    {selectedCustomer.phone && (
                      <span className="customer-phone">
                        <Phone size={12} /> {selectedCustomer.phone}
                      </span>
                    )}
                    {selectedCustomer.externalId && (
                      <span className="customer-external-id">
                        <ShieldCheck size={12} /> Ext: {selectedCustomer.externalId}
                      </span>
                    )}
                    <span className="customer-source-badge">
                      <Globe size={12} /> {SOURCE_LABELS[selectedCustomer.source] || selectedCustomer.source}
                    </span>
                    <span className="customer-id">#{selectedCustomer._id.slice(-6)}</span>
                  </div>
                </div>
              </div>
              <div className="customer-header-actions">
                {canManageCustomers && (
                  <>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => handleOpenEditCustomer(selectedCustomer)}
                      disabled={editingCustomer}
                    >
                      Edit
                    </button>
                    <button
                      className="button button-secondary button-danger"
                      type="button"
                      onClick={() => handleOpenDeleteCustomer(selectedCustomer)}
                      disabled={deletingCustomer}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="customer-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={true}
                className="customer-tab customer-tab-active"
                onClick={() => {}}
              >
                Profile
              </button>
              <button
                role="tab"
                aria-selected={false}
                className="customer-tab"
                onClick={() => {}}
              >
                Conversations
              </button>
              <button
                role="tab"
                aria-selected={false}
                className="customer-tab"
                onClick={() => {}}
              >
                Timeline
              </button>
            </div>

            <div className="customer-detail-content">
              {loadingCustomer ? (
                <div className="customer-loading">
                  <LoaderCircle size={22} className="spin" />
                  Loading customer details…
                </div>
              ) : customerError ? (
                <div className="customer-error">
                  <AlertCircle size={22} />
                  <p>{customerError}</p>
                  <button className="button button-secondary" type="button" onClick={() => selectedCustomer && loadCustomerDetails(selectedCustomer)}>
                    <ArrowRight size={14} /> Retry
                  </button>
                </div>
              ) : (
                <div className="customer-profile">
                  <div className="profile-section">
                    <h3>Contact Information</h3>
                    <div className="profile-fields">
                      {selectedCustomer.email && (
                        <div className="profile-field">
                          <Mail size={16} />
                          <div>
                            <label>Email</label>
                            <span>{selectedCustomer.email}</span>
                          </div>
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div className="profile-field">
                          <Phone size={16} />
                          <div>
                            <label>Phone</label>
                            <span>{selectedCustomer.phone}</span>
                          </div>
                        </div>
                      )}
                      {selectedCustomer.externalId && (
                        <div className="profile-field">
                          <ShieldCheck size={16} />
                          <div>
                            <label>External ID</label>
                            <span>{selectedCustomer.externalId}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedCustomer.address && (
                    <div className="profile-section">
                      <h3>Address</h3>
                      <div className="profile-address">
                        {selectedCustomer.address.street && (
                          <div>
                            <MapPin size={16} />
                            <span>{selectedCustomer.address.street}</span>
                          </div>
                        )}
                        {selectedCustomer.address.city && (
                          <div>
                            <MapPin size={16} />
                            <span>{selectedCustomer.address.city}{selectedCustomer.address.state ? `, ${selectedCustomer.address.state}` : ''} {selectedCustomer.address.postalCode || ''}</span>
                          </div>
                        )}
                        {selectedCustomer.address.country && (
                          <div>
                            <Globe size={16} />
                            <span>{selectedCustomer.address.country}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedCustomer.tags.length > 0 && (
                    <div className="profile-section">
                      <h3>Tags</h3>
                      <div className="profile-tags">
                        {selectedCustomer.tags.map((tag) => (
                          <span key={tag} className="profile-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCustomer.customFields.length > 0 && (
                    <div className="profile-section">
                      <h3>Custom Fields</h3>
                      <div className="profile-custom-fields">
                        {selectedCustomer.customFields.map((field) => (
                          <div key={field.key} className="custom-field">
                            <label>{field.key}</label>
                            <span>{field.value || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCustomer.notes && (
                    <div className="profile-section">
                      <h3>Notes</h3>
                      <div className="profile-notes">{selectedCustomer.notes}</div>
                    </div>
                  )}

                  <div className="profile-section">
                    <h3>Statistics</h3>
                    <div className="profile-stats">
                      <div className="stat-item">
                        <label>Conversations</label>
                        <span>{selectedCustomer.conversationCount}</span>
                      </div>
                      <div className="stat-item">
                        <label>Total Messages</label>
                        <span>{selectedCustomer.totalMessages}</span>
                      </div>
                      <div className="stat-item">
                        <label>First Conversation</label>
                        <span>{selectedCustomer.firstConversationAt ? formatDate(selectedCustomer.firstConversationAt) : '—'}</span>
                      </div>
                      <div className="stat-item">
                        <label>Last Activity</label>
                        <span>{formatRelativeTime(selectedCustomer.lastConversationAt)}</span>
                      </div>
                      <div className="stat-item">
                        <label>Source</label>
                        <span>{selectedCustomer.source ? (SOURCE_LABELS[selectedCustomer.source] || selectedCustomer.source) : '—'}</span>
                      </div>
                      <div className="stat-item">
                        <label>Member Since</label>
                        <span>{selectedCustomer.createdAt ? formatDate(selectedCustomer.createdAt) : '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="customer-detail-empty">
            <User size={48} />
            <strong>Select a customer</strong>
            <p>Choose a customer from the list to view their profile and conversation history.</p>
            {canManageCustomers && (
              <button className="button button-primary" type="button" onClick={handleOpenNewCustomer}>
                <UserPlus size={16} /> Add your first customer
              </button>
            )}
          </div>
        )}
      </section>

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => { setShowNewCustomerModal(false); setNewCustomerError('') }}>
          <section className="customer-modal" role="dialog" aria-modal="true" aria-labelledby="new-customer-title" onClick={(event) => event.stopPropagation()}>
            <div className="customer-modal-header">
              <div>
                <strong id="new-customer-title">New customer</strong>
                <p>Add a new customer to your contact list.</p>
              </div>
              <button className="icon-button" onClick={() => { setShowNewCustomerModal(false); setNewCustomerError('') }} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <form className="customer-modal-form" onSubmit={handleCreateCustomer}>
              {newCustomerError && (
                <div className="modal-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{newCustomerError}</span>
                </div>
              )}

              <div className="modal-field">
                <label htmlFor="new-display-name">Display name <span className="required">*</span></label>
                <input
                  id="new-display-name"
                  type="text"
                  value={newDisplayName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setNewDisplayName(event.target.value)}
                  placeholder="Customer's full name"
                  maxLength={100}
                  required
                  disabled={creatingCustomer}
                />
              </div>

              <div className="modal-field">
                <label htmlFor="new-email">Email</label>
                <input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setNewEmail(event.target.value)}
                  placeholder="customer@example.com (optional)"
                  maxLength={254}
                  disabled={creatingCustomer}
                />
              </div>

              <div className="modal-field">
                <label htmlFor="new-phone">Phone</label>
                <input
                  id="new-phone"
                  type="tel"
                  value={newPhone}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setNewPhone(event.target.value)}
                  placeholder="+1 (555) 123-4567 (optional)"
                  maxLength={50}
                  disabled={creatingCustomer}
                />
              </div>

              <div className="modal-field">
                <label htmlFor="new-external-id">External ID</label>
                <input
                  id="new-external-id"
                  type="text"
                  value={newExternalId}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setNewExternalId(event.target.value)}
                  placeholder="External system ID (optional)"
                  maxLength={160}
                  disabled={creatingCustomer}
                />
              </div>

              <div className="modal-field">
                <label htmlFor="new-status">Status</label>
                <select
                  id="new-status"
                  value={newStatus}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => setNewStatus(event.target.value as CustomerStatus)}
                  disabled={creatingCustomer}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div className="modal-actions">
                <button className="button button-secondary" type="button" onClick={() => { setShowNewCustomerModal(false); setNewCustomerError('') }} disabled={creatingCustomer}>
                  Cancel
                </button>
                <button className="button button-primary" type="submit" disabled={creatingCustomer || !newDisplayName.trim()}>
                  {creatingCustomer ? <LoaderCircle size={15} className="spin" /> : <UserPlus size={15} />}
                  {creatingCustomer ? 'Creating…' : 'Create customer'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditCustomerModal && editCustomer && (
        <div className="modal-backdrop" role="presentation" onClick={() => { setShowEditCustomerModal(false); setEditCustomerError('') }}>
          <section className="customer-modal" role="dialog" aria-modal="true" aria-labelledby="edit-customer-title" onClick={(event) => event.stopPropagation()}>
            <div className="customer-modal-header">
              <div>
                <strong id="edit-customer-title">Edit customer</strong>
                <p>Update customer information.</p>
              </div>
              <button className="icon-button" onClick={() => { setShowEditCustomerModal(false); setEditCustomerError('') }} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <form className="customer-modal-form" onSubmit={handleUpdateCustomer}>
              {editCustomerError && (
                <div className="modal-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{editCustomerError}</span>
                </div>
              )}

              <div className="modal-field">
                <label htmlFor="edit-display-name">Display name <span className="required">*</span></label>
                <input
                  id="edit-display-name"
                  type="text"
                  value={editCustomer.displayName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setEditCustomer({ ...editCustomer, displayName: event.target.value })}
                  maxLength={100}
                  required
                  disabled={editingCustomer}
                />
              </div>

              <div className="modal-field">
                <label htmlFor="edit-email">Email</label>
                <input
                  id="edit-email"
                  type="email"
                  value={editCustomer.email ?? ''}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setEditCustomer({ ...editCustomer, email: event.target.value })}
                  maxLength={254}
                  disabled={editingCustomer}
                />
              </div>

              <div className="modal-field">
                <label htmlFor="edit-phone">Phone</label>
                <input
                  id="edit-phone"
                  type="tel"
                  value={editCustomer.phone ?? ''}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setEditCustomer({ ...editCustomer, phone: event.target.value })}
                  maxLength={50}
                  disabled={editingCustomer}
                />
              </div>

              <div className="modal-field">
                <label htmlFor="edit-external-id">External ID</label>
                <input
                  id="edit-external-id"
                  type="text"
                  value={editCustomer.externalId ?? ''}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setEditCustomer({ ...editCustomer, externalId: event.target.value })}
                  maxLength={160}
                  disabled={editingCustomer}
                />
              </div>

              <div className="modal-field">
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  value={editCustomer.status}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => setEditCustomer({ ...editCustomer, status: event.target.value as CustomerStatus })}
                  disabled={editingCustomer}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div className="modal-actions">
                <button className="button button-secondary" type="button" onClick={() => { setShowEditCustomerModal(false); setEditCustomerError('') }} disabled={editingCustomer}>
                  Cancel
                </button>
                <button className="button button-primary" type="submit" disabled={editingCustomer}>
                  {editingCustomer ? <LoaderCircle size={15} className="spin" /> : <CheckCircle2 size={15} />}
                  {editingCustomer ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingCustomerId && (
        <div className="modal-backdrop" role="presentation" onClick={() => { setShowDeleteModal(false); setDeletingCustomerId(null) }}>
          <section className="customer-modal customer-modal-danger" role="dialog" aria-modal="true" aria-labelledby="delete-customer-title" onClick={(event) => event.stopPropagation()}>
            <div className="customer-modal-header">
              <strong id="delete-customer-title">Delete customer</strong>
              <button className="icon-button" onClick={() => { setShowDeleteModal(false); setDeletingCustomerId(null) }} aria-label="Close">
                <X size={19} />
              </button>
            </div>
            <div className="customer-modal-body">
              <AlertCircle size={32} className="danger-icon" />
              <p>Are you sure you want to delete this customer? This action cannot be undone.</p>
              <p className="delete-warning">Customers with existing conversations cannot be deleted. Block them instead.</p>
            </div>
            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={() => { setShowDeleteModal(false); setDeletingCustomerId(null) }} disabled={deletingCustomer}>
                Cancel
              </button>
              <button className="button button-primary button-danger" type="button" onClick={handleDeleteCustomer} disabled={deletingCustomer}>
                {deletingCustomer ? <LoaderCircle size={15} className="spin" /> : <Trash2 size={15} />}
                {deletingCustomer ? 'Deleting…' : 'Delete customer'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}