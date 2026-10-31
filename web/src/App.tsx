import { useMemo, useState, type ChangeEvent as ReactChangeEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { Navigate, useLocation, useNavigate as useRouterNavigate } from 'react-router-dom'
import { useAuth, type WorkspaceMembership } from './auth/AuthContext'
import { LoginPage, RegisterPage, WorkspaceOnboardingPage } from './components/auth/AuthPages'
import {
  Activity,
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bot,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Command,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { ConversationChart } from './components/dashboard/ConversationChart'
import { ConversationTable } from './components/dashboard/ConversationTable'
import { MetricCard } from './components/dashboard/MetricCard'
import { AgentHealthPanel, ResolutionPanel } from './components/dashboard/ResolutionPanel'
import { conversations, type ChartRange } from './data/dashboard'
import { KnowledgeBasePage } from './components/knowledge/KnowledgeBasePage'

type NavItem = { label: string; icon: typeof LayoutDashboard; badge?: string }

const pagePaths: Record<string, string> = {
  Overview: '/',
  Conversations: '/conversations',
  'Knowledge base': '/knowledge-base',
  'AI assistant': '/assistant',
  'Support tickets': '/tickets',
  'Team members': '/team',
  Analytics: '/analytics',
  Settings: '/settings',
  'Help center': '/help',
}

const pathPages = Object.fromEntries(Object.entries(pagePaths).map(([page, path]) => [path, page])) as Record<string, string>

const primaryNav: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Conversations', icon: MessageSquareText, badge: '12' },
  { label: 'Knowledge base', icon: BookOpen },
  { label: 'AI assistant', icon: Bot },
  { label: 'Support tickets', icon: Ticket, badge: '4' },
]

const workspaceNav: NavItem[] = [
  { label: 'Team members', icon: Users },
  { label: 'Analytics', icon: Activity },
  { label: 'Settings', icon: Settings2 },
]

const pageDescriptions: Record<string, string> = {
  Conversations: 'Review customer conversations, follow up on escalations, and keep every customer moving forward.',
  'Knowledge base': 'Bring your business knowledge together so your AI assistant can answer with confidence and citations.',
  'AI assistant': 'Shape your copilot’s personality, response rules, and approved support actions.',
  'Support tickets': 'Keep track of requests that need a human touch, from first response to resolution.',
  'Team members': 'Invite teammates and decide who can manage your workspace and customer support.',
  Analytics: 'Understand support volume, customer satisfaction, and how your AI assistant is performing.',
  Settings: 'Manage your workspace profile, preferences, and integrations.',
}

function Sidebar({ activePage, onNavigate, open, onClose, workspaceName, plan, fullName, email, initials, onLogout, memberships, activeWorkspaceId, onWorkspaceChange }: {
  activePage: string
  onNavigate: (page: string) => void
  open: boolean
  onClose: () => void
  workspaceName: string
  plan: string
  fullName: string
  email: string
  initials: string
  onLogout: () => void
  memberships: WorkspaceMembership[]
  activeWorkspaceId: string
  onWorkspaceChange: (id: string) => void
}) {
  const renderNav = (items: NavItem[]) => items.map((item) => {
    const Icon = item.icon
    return (
      <button
        key={item.label}
        className={`nav-item ${activePage === item.label ? 'nav-item-active' : ''}`}
        onClick={() => { onNavigate(item.label); onClose() }}
      >
        <Icon size={18} strokeWidth={1.8} />
        <span>{item.label}</span>
        {item.badge && <span className={`nav-badge ${item.label === 'Conversations' ? 'nav-badge-primary' : ''}`}>{item.badge}</span>}
      </button>
    )
  })

  return (
    <>
      {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sparkles size={19} strokeWidth={2.1} /></div>
          <div className="brand-name">copilot<span>.</span></div>
          <button className="icon-button sidebar-collapse" aria-label="Close navigation" onClick={onClose}><ChevronLeft size={17} /></button>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-avatar"><Building2 size={17} /></span>
          <span className="workspace-copy"><strong>{workspaceName}</strong><small>{plan.charAt(0).toUpperCase() + plan.slice(1)} workspace</small></span>
          {memberships.length > 1 ? (
            <select className="workspace-select" aria-label="Switch workspace" value={activeWorkspaceId} onChange={(event) => onWorkspaceChange(event.target.value)}>
              {memberships.map((membership) => <option key={membership.workspace.id} value={membership.workspace.id}>{membership.workspace.name}</option>)}
            </select>
          ) : <ChevronDown size={16} className="workspace-chevron" />}
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">{renderNav(primaryNav)}</nav>

        <div className="sidebar-section-label workspace-label">MANAGE</div>
        <nav className="sidebar-nav" aria-label="Workspace management">{renderNav(workspaceNav)}</nav>

        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-card-heading"><span><Zap size={14} /> {plan.charAt(0).toUpperCase() + plan.slice(1)} plan</span><span>72%</span></div>
            <div className="usage-track"><span /></div>
            <p>7,200 of 10,000 AI messages used</p>
            <button onClick={() => onNavigate('Settings')}>Explore plans <ArrowUpRight size={13} /></button>
          </div>
          <button className="help-link" onClick={() => onNavigate('Help center')}><LifeBuoy size={17} /> Help & support <ArrowUpRight size={13} /></button>
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-copy"><strong>{fullName}</strong><small>{email}</small></div>
            <button className="icon-button user-menu-button" aria-label="Sign out" title="Sign out" onClick={onLogout}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
    </>
  )
}

function Header({ search, setSearch, onMenu, onNotifications, notificationsOpen, onHelp, activePage, initials, fullName, email, onLogout }: {
  search: string
  setSearch: (value: string) => void
  onMenu: () => void
  onNotifications: () => void
  notificationsOpen: boolean
  onHelp: () => void
  activePage: string
  initials: string
  fullName: string
  email: string
  onLogout: () => void
}) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-button mobile-menu-button" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button>
        <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{activePage}</strong></div>
      </div>
      <div className="topbar-right">
        <label className="global-search">
          <Search size={16} />
          <input value={search} onChange={(event: ReactChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Search anything..." aria-label="Search conversations" />
          <kbd><Command size={11} /> K</kbd>
        </label>
        <button className="icon-button topbar-help" aria-label="Help center" onClick={onHelp}><CircleHelp size={18} /></button>
        <div className="notification-wrap">
          <button className={`icon-button notification-button ${notificationsOpen ? 'icon-button-selected' : ''}`} onClick={onNotifications} aria-label="Notifications">
            <Bell size={18} /><i />
          </button>
          {notificationsOpen && (
            <div className="notification-popover">
              <div className="popover-heading"><strong>Notifications</strong><span className="new-dot-label">2 new</span></div>
              <div className="notification-item"><span className="notification-icon notification-blue"><MessageSquareText size={15} /></span><div><strong>New conversation escalated</strong><p>Phoenix Baker needs help with billing.</p><small>8 minutes ago</small></div></div>
              <div className="notification-item"><span className="notification-icon notification-green"><Check size={15} /></span><div><strong>Knowledge base synced</strong><p>All 24 sources are up to date.</p><small>1 hour ago</small></div></div>
              <button className="popover-footer">View notification history <ArrowRight size={14} /></button>
            </div>
          )}
        </div>
        <div className="account-menu-wrap">
          <button
            type="button"
            className="topbar-avatar"
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            onClick={() => setAccountMenuOpen((open) => !open)}
          >
            {initials}
          </button>
          {accountMenuOpen && (
            <div className="account-menu" role="menu" aria-label="Account menu">
              <div className="account-menu-identity">
                <strong>{fullName}</strong>
                <span>{email}</span>
              </div>
              <div className="account-menu-divider" />
              <button
                type="button"
                className="account-menu-logout"
                role="menuitem"
                onClick={() => { setAccountMenuOpen(false); onLogout() }}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function TopicsPanel({ onViewAll }: { onViewAll: () => void }) {
  const topics = [
    { name: 'Orders & delivery', count: '1,284', percent: 82, tone: 'topic-indigo' },
    { name: 'Billing & payments', count: '946', percent: 64, tone: 'topic-blue' },
    { name: 'Returns & refunds', count: '728', percent: 48, tone: 'topic-violet' },
    { name: 'Product questions', count: '512', percent: 34, tone: 'topic-teal' },
  ]
  return (
    <section className="panel topics-panel">
      <div className="panel-heading">
        <div><h2>Top conversation topics</h2><p>What customers ask about most.</p></div>
        <span className="icon-button subtle-button" aria-hidden="true"><MoreHorizontal size={18} /></span>
      </div>
      <div className="topic-list">
        {topics.map((topic) => (
          <div className="topic-row" key={topic.name}>
            <div className="topic-meta"><strong>{topic.name}</strong><span>{topic.count}</span></div>
            <div className="topic-track"><span className={topic.tone} style={{ width: `${topic.percent}%` }} /></div>
          </div>
        ))}
      </div>
      <button className="topic-footer" onClick={onViewAll}>Explore conversation insights <ArrowRight size={14} /></button>
    </section>
  )
}

function TestAssistantModal({ onClose, workspaceName }: { onClose: () => void; workspaceName: string }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
        <div className="preview-modal-header"><div className="preview-bot-icon"><Bot size={19} /></div><div><strong id="preview-title">Preview your assistant</strong><p>{workspaceName} · Demo conversation</p></div><button className="icon-button" onClick={onClose} aria-label="Close preview"><X size={19} /></button></div>
        <div className="preview-chat">
          <div className="preview-date">TODAY</div>
          <div className="preview-message assistant-message"><span className="mini-bot"><Sparkles size={13} /></span><div><strong>{workspaceName} Assistant</strong><p>Hi there! 👋 I'm your {workspaceName} assistant. How can I help you today?</p><small>Just now</small></div></div>
          <div className="preview-message customer-message"><div><p>What are your customer support hours?</p><small>Just now</small></div><span className="mini-customer">OR</span></div>
          <div className="preview-message assistant-message"><span className="mini-bot"><Sparkles size={13} /></span><div><strong>{workspaceName} Assistant</strong><p>I'd be happy to help! This is a visual preview. Once the knowledge base is connected, I'll answer using your business documents and include source references.</p><small>Just now</small></div></div>
        </div>
        <div className="preview-note"><Sparkles size={15} /> Preview uses sample content. Live AI responses will be enabled in the RAG milestone.</div>
        <div className="preview-input"><span>Write a message...</span><button disabled aria-label="Send preview message"><ArrowUpRight size={16} /></button></div>
      </section>
    </div>
  )
}

function Dashboard({ range, setRange, search, onViewAll, onViewAnalytics, firstName }: {
  range: ChartRange
  setRange: (value: ChartRange) => void
  search: string
  onViewAll: () => void
  onViewAnalytics: () => void
  firstName: string
}) {
  const filteredConversations = useMemo(() => conversations.filter((conversation) => {
    const query = search.trim().toLowerCase()
    return !query || [conversation.customer, conversation.email, conversation.subject, conversation.id, conversation.status].some((value) => value.toLowerCase().includes(query))
  }), [search])

  return (
    <>
      <div className="page-heading-row">
        <div><div className="eyebrow page-eyebrow">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()).toUpperCase()}</div><h1>Good morning, {firstName} <span>✦</span></h1><p>Here’s what’s happening with your support workspace today.</p></div>
        <div className="page-actions"><button className="button button-secondary" onClick={() => window.print()}><ArrowDownUp size={15} /> Export report</button><button className="button button-primary" onClick={onViewAll}><Plus size={16} /> View conversations</button></div>
      </div>

      <div className="metrics-grid">
        <MetricCard label="Total conversations" value="24,892" change="18.6%" comparison="Compared to last month" icon={<MessageSquareText size={18} />} iconTone="metric-icon-indigo" />
        <MetricCard label="AI resolution rate" value="82.4%" change="4.2%" comparison="Compared to last month" icon={<Sparkles size={18} />} iconTone="metric-icon-violet" />
        <MetricCard label="Avg. response time" value="1.8s" change="12.3%" comparison="Faster than last month" positive={false} icon={<Activity size={18} />} iconTone="metric-icon-blue" />
        <MetricCard label="Customer satisfaction" value="4.92" change="0.2" comparison="Out of 5.0 · Last 30 days" icon={<ShieldCheck size={18} />} iconTone="metric-icon-green" />
      </div>

      <div className="analytics-grid">
        <div className="analytics-main"><ConversationChart range={range} setRange={setRange} /></div>
        <div className="analytics-side"><ResolutionPanel /></div>
      </div>

      <div className="lower-grid">
        <div className="lower-main"><ConversationTable conversations={filteredConversations} onViewAll={onViewAll} /></div>
        <div className="lower-side"><TopicsPanel onViewAll={onViewAnalytics} /><AgentHealthPanel /></div>
      </div>
      <div className="dashboard-footnote"><span><i /> Live workspace overview</span><span>Data shown is sample data for the UI milestone</span></div>
    </>
  )
}

function ComingSoonPage({ title, onBack }: { title: string; onBack: () => void }) {
  const description = pageDescriptions[title] ?? 'Find product guidance and answers to common questions about your workspace.'
  const Icon = [...primaryNav, ...workspaceNav].find((item) => item.label === title)?.icon ?? FileText
  return (
    <div className="coming-soon-wrap">
      <div className="coming-soon-breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{title}</strong></div>
      <div className="coming-soon-card">
        <div className="coming-soon-icon"><Icon size={25} /></div>
        <span className="coming-soon-tag">ON THE ROADMAP</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="coming-soon-divider" />
        <div className="coming-soon-status"><span><i /> Foundation in progress</span><span>Milestone 01</span></div>
        <button className="button button-primary" onClick={onBack}><ChevronLeft size={16} /> Back to overview</button>
      </div>
    </div>
  )
}

function AppContent() {
  const { user, memberships, activeWorkspace, loading, signOut, setActiveWorkspace } = useAuth()
  const routerNavigate = useRouterNavigate()
  const location = useLocation()
  const activePage = pathPages[location.pathname] ?? 'Help center'
  const [range, setRange] = useState<ChartRange>('30 days')
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  if (loading) {
    return <div className="auth-loading"><span className="brand-mark"><Sparkles size={18} /></span><span>Preparing your workspace…</span></div>
  }

  if (location.pathname === '/login' || location.pathname === '/register') {
    if (user) return <Navigate to={memberships.length ? '/' : '/onboarding'} replace />
    return location.pathname === '/register' ? <RegisterPage /> : <LoginPage />
  }

  if (!user) return <Navigate to="/login" replace />
  if (memberships.length === 0 && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />
  if (memberships.length > 0 && location.pathname === '/onboarding') return <Navigate to="/" replace />
  if (location.pathname === '/onboarding') return <WorkspaceOnboardingPage />

  const displayName = user.fullName.trim()
  const firstName = displayName.split(/\s+/)[0] || 'there'
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'U'
  const workspaceName = activeWorkspace?.name ?? 'Workspace'
  const workspacePlan = activeWorkspace?.plan ?? 'free'
  const currentWorkspaceId = activeWorkspace?.id ?? ''

  const navigate = (page: string) => {
    routerNavigate(pagePaths[page] ?? '/help')
    setNotificationsOpen(false)
    setSearch('')
  }

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} workspaceName={workspaceName} plan={workspacePlan} fullName={user.fullName} email={user.email} initials={initials} onLogout={() => { void signOut().then(() => routerNavigate('/login', { replace: true })) }} memberships={memberships} activeWorkspaceId={currentWorkspaceId} onWorkspaceChange={setActiveWorkspace} />
      <div className="main-shell">
        <Header search={search} setSearch={setSearch} onMenu={() => setSidebarOpen(true)} onNotifications={() => setNotificationsOpen((value) => !value)} notificationsOpen={notificationsOpen} onHelp={() => navigate('Help center')} activePage={activePage} initials={initials} fullName={user.fullName} email={user.email} onLogout={() => { void signOut().then(() => routerNavigate('/login', { replace: true })) }} />
        <main className="main-content" onClick={() => { if (notificationsOpen) setNotificationsOpen(false) }}>
          {activePage === 'Overview' ? (
            <Dashboard range={range} setRange={setRange} search={search} onViewAll={() => navigate('Conversations')} onViewAnalytics={() => navigate('Analytics')} firstName={firstName} />
          ) : activePage === 'Knowledge base' ? (
            <KnowledgeBasePage />
          ) : (
            <ComingSoonPage title={activePage} onBack={() => navigate('Overview')} />
          )}
          <footer className="app-footer"><span>© 2026 Copilot Inc.</span><span><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="#status">System status <i /></a></span></footer>
        </main>
      </div>
      <button className="floating-test-button" onClick={() => setPreviewOpen(true)}><Sparkles size={16} /> Test assistant</button>
      {previewOpen && <TestAssistantModal onClose={() => setPreviewOpen(false)} workspaceName={workspaceName} />}
    </div>
  )
}


export default function App() {
  return <AppContent />
}
