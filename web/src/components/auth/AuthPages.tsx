import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Check, Eye, EyeOff, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

function AuthBrandPanel() {
  return (
    <aside className="auth-brand-panel">
      <div className="auth-brand-top"><span className="brand-mark"><Sparkles size={19} /></span><span className="brand-name">copilot<span>.</span></span></div>
      <div className="auth-brand-content">
        <div className="auth-kicker"><span /> CUSTOMER SUPPORT, REIMAGINED</div>
        <h1>Every customer deserves a <span>great answer.</span></h1>
        <p>Bring your business knowledge, AI assistance, and human support together in one thoughtful workspace.</p>
        <div className="auth-benefits">
          <div><span><Check size={15} /></span> Answers grounded in your business knowledge</div>
          <div><span><Check size={15} /></span> Human support whenever it matters</div>
          <div><span><Check size={15} /></span> One secure workspace for your team</div>
        </div>
      </div>
      <div className="auth-brand-footer"><ShieldCheck size={15} /> Designed for secure, team-based support</div>
      <div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" />
    </aside>
  )
}

function AuthLayout({ children, eyebrow, title, description }: {
  children: ReactNode
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <main className="auth-page">
      <AuthBrandPanel />
      <section className="auth-form-panel">
        <div className="auth-mobile-brand"><span className="brand-mark"><Sparkles size={18} /></span><span className="brand-name">copilot<span>.</span></span></div>
        <div className="auth-form-wrap">
          <div className="auth-form-heading"><div className="auth-eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div>
          {children}
        </div>
        <footer className="auth-legal"><span>© 2026 Copilot Inc.</span><span><a href="#privacy">Privacy</a><a href="#terms">Terms</a></span></footer>
      </section>
    </main>
  )
}

function FormError({ message }: { message: string }) {
  if (!message) return null
  return <div className="auth-form-error" role="alert">{message}</div>
}

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout eyebrow="WELCOME BACK" title="Sign in to your workspace" description="Enter your details to continue to AI Support Copilot.">
      <form className="auth-form" onSubmit={submit}>
        <FormError message={error} />
        <label className="auth-field"><span>Work email</span><input type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="auth-field"><span>Password</span><div className="auth-password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
        <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} /></button>
      </form>
      <div className="auth-switch">New to Copilot? <Link to="/register">Create an account</Link></div>
      <div className="auth-secure-note"><ShieldCheck size={15} /> Your workspace is protected with secure authentication.</div>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signUp(fullName, email, password)
      navigate('/onboarding', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create your account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout eyebrow="GET STARTED" title="Create your account" description="Start building a better support experience for your customers.">
      <form className="auth-form" onSubmit={submit}>
        <FormError message={error} />
        <label className="auth-field"><span>Full name</span><input autoComplete="name" placeholder="Your name" value={fullName} onChange={(event) => setFullName(event.target.value)} minLength={2} maxLength={80} required /></label>
        <label className="auth-field"><span>Work email</span><input type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="auth-field"><span>Password</span><div className="auth-password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Create a strong password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} maxLength={72} required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><small className="auth-field-hint">At least 10 characters, including uppercase, lowercase, and a number.</small></label>
        <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'} <ArrowRight size={16} /></button>
      </form>
      <div className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></div>
      <div className="auth-secure-note"><ShieldCheck size={15} /> Your account details are encrypted in transit.</div>
    </AuthLayout>
  )
}

export function WorkspaceOnboardingPage() {
  const { user, createWorkspace, signOut } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('General')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await createWorkspace(name, industry)
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create your workspace. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-topbar"><div className="auth-mobile-brand"><span className="brand-mark"><Sparkles size={18} /></span><span className="brand-name">copilot<span>.</span></span></div><div className="onboarding-user"><span>{user?.fullName}</span><button onClick={() => void signOut()}>Sign out</button></div></header>
      <section className="onboarding-card">
        <div className="onboarding-step"><span>01</span><i /><span>02</span><i /><span>03</span></div>
        <div className="onboarding-icon"><Building2 size={24} /></div>
        <div className="auth-eyebrow">YOUR WORKSPACE</div>
        <h1>Give your team a home.</h1>
        <p className="onboarding-description">Create a workspace for your business. Your documents, assistant settings, conversations, and team access will live here.</p>
        <form className="auth-form onboarding-form" onSubmit={submit}>
          <FormError message={error} />
          <label className="auth-field"><span>Business or workspace name</span><input autoFocus placeholder="e.g. Acme Studio" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required /></label>
          <label className="auth-field"><span>Industry</span><select value={industry} onChange={(event) => setIndustry(event.target.value)}><option>General</option><option>E-commerce</option><option>Healthcare</option><option>Education</option><option>Travel & hospitality</option><option>Software & technology</option><option>Financial services</option><option>Other</option></select></label>
          <div className="onboarding-owner-note"><ShieldCheck size={16} /><span><strong>{user?.fullName}</strong> will be the workspace owner. You can invite teammates later.</span></div>
          <button className="auth-submit" type="submit" disabled={submitting || name.trim().length < 2}>{submitting ? 'Creating workspace…' : 'Create workspace'} <ArrowRight size={16} /></button>
        </form>
        <div className="onboarding-footnote"><Zap size={14} /> Your workspace starts on the free plan. No payment details required.</div>
      </section>
      <footer className="onboarding-footer">© 2026 Copilot Inc. <span>Secure workspace setup</span></footer>
    </main>
  )
}

