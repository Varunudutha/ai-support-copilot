import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export interface AuthUser {
  id: string
  fullName: string
  email: string
}

export interface WorkspaceSummary {
  id: string
  name: string
  slug: string
  industry: string
  plan: string
}

export interface WorkspaceMembership {
  role: 'owner' | 'admin' | 'agent' | 'viewer'
  workspace: WorkspaceSummary
}

interface AuthContextValue {
  user: AuthUser | null
  memberships: WorkspaceMembership[]
  activeWorkspace: WorkspaceSummary | null
  activeWorkspaceRole: WorkspaceMembership['role'] | null
  loading: boolean
  accessToken: string | null
  setActiveWorkspace: (workspaceId: string) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (fullName: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  createWorkspace: (name: string, industry: string) => Promise<void>
  apiRequest: <T>(path: string, init?: RequestInit) => Promise<T>
}

interface ApiErrorBody {
  error?: { message?: string; code?: string; details?: Array<{ field: string; message: string }> }
}

const AuthContext = createContext<AuthContextValue | null>(null)
const ACTIVE_WORKSPACE_KEY = 'copilot.activeWorkspaceId'

async function readError(response: Response): Promise<Error> {
  let body: ApiErrorBody = {}
  try { body = await response.json() as ApiErrorBody } catch { /* response may be empty */ }
  const details = body.error?.details?.map((item) => item.message).filter(Boolean).join('. ')
  return new Error(details || body.error?.message || `Request failed (${response.status})`)
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await readError(response)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    try { return localStorage.getItem(ACTIVE_WORKSPACE_KEY) } catch { return null }
  })
  const [loading, setLoading] = useState(true)
  const bootstrapPromiseRef = useRef<Promise<{ token: string; user: AuthUser; memberships: WorkspaceMembership[] } | null> | null>(null)

  const acceptTokenAndLoadProfile = useCallback(async (token: string) => {
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
    const data = await readJson<{ user: AuthUser; memberships: WorkspaceMembership[] }>(response)
    setAccessToken(token)
    setUser(data.user)
    setMemberships(data.memberships)
  }, [])

  const refreshAccessToken = useCallback(async (): Promise<string> => {
    const response = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    const data = await readJson<{ accessToken: string }>(response)
    setAccessToken(data.accessToken)
    return data.accessToken
  }, [])

  useEffect(() => {
    let cancelled = false
    const bootstrapPromise = bootstrapPromiseRef.current ?? (bootstrapPromiseRef.current = (async () => {
      try {
        const response = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
        const tokenData = await readJson<{ accessToken: string }>(response)
        const profileResponse = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${tokenData.accessToken}` },
          credentials: 'include',
        })
        const profile = await readJson<{ user: AuthUser; memberships: WorkspaceMembership[] }>(profileResponse)
        return { token: tokenData.accessToken, ...profile }
      } catch {
        return null
      }
    })())

    void bootstrapPromise.then((result) => {
      if (cancelled) return
      if (result) {
        setAccessToken(result.token)
        setUser(result.user)
        setMemberships(result.memberships)
      } else {
        setAccessToken(null)
        setUser(null)
        setMemberships([])
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    const data = await readJson<{ accessToken: string }>(response)
    await acceptTokenAndLoadProfile(data.accessToken)
  }, [acceptTokenAndLoadProfile])

  const signUp = useCallback(async (fullName: string, email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ fullName, email, password }),
    })
    const data = await readJson<{ accessToken: string }>(response)
    await acceptTokenAndLoadProfile(data.accessToken)
  }, [acceptTokenAndLoadProfile])

  const apiRequest = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const perform = (token: string | null) => {
      const headers = new Headers(init.headers)
      if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
      if (token) headers.set('Authorization', `Bearer ${token}`)
      if (activeWorkspaceId) headers.set('X-Workspace-Id', activeWorkspaceId)
      return fetch(`/api${path}`, { ...init, headers, credentials: 'include' })
    }

    let response = await perform(accessToken)
    if (response.status === 401 && !path.startsWith('/auth/')) {
      try {
        const nextToken = await refreshAccessToken()
        response = await perform(nextToken)
      } catch {
        setUser(null)
        setMemberships([])
        setAccessToken(null)
        throw new Error('Your session has expired. Please sign in again.')
      }
    }
    return readJson<T>(response)
  }, [accessToken, activeWorkspaceId, refreshAccessToken])

  const signOut = useCallback(async () => {
    // Clear the client session immediately so a slow or unavailable API cannot
    // leave the user stuck on the dashboard. The server revokes the refresh
    // session and clears the HttpOnly cookie when the request reaches it.
    void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined)

    setUser(null)
    setMemberships([])
    setAccessToken(null)
    setActiveWorkspaceId(null)
    try { localStorage.removeItem(ACTIVE_WORKSPACE_KEY) } catch { /* storage can be unavailable */ }
  }, [])

  const createWorkspace = useCallback(async (name: string, industry: string) => {
    await apiRequest<{ workspace: WorkspaceSummary; role: string }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, industry }),
    })
    const token = accessToken ?? await refreshAccessToken()
    await acceptTokenAndLoadProfile(token)
  }, [accessToken, acceptTokenAndLoadProfile, apiRequest, refreshAccessToken])

  const setActiveWorkspace = useCallback((workspaceId: string) => {
    setActiveWorkspaceId(workspaceId)
    try { localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId) } catch { /* storage can be unavailable */ }
  }, [])

  const activeMembership = memberships.find((membership) => membership.workspace.id === activeWorkspaceId) ?? memberships[0] ?? null
  const value = useMemo<AuthContextValue>(() => ({
    user,
    memberships,
    activeWorkspace: activeMembership?.workspace ?? null,
    activeWorkspaceRole: activeMembership?.role ?? null,
    loading,
    accessToken,
    setActiveWorkspace,
    signIn,
    signUp,
    signOut,
    createWorkspace,
    apiRequest,
  }), [user, memberships, activeMembership, loading, accessToken, setActiveWorkspace, signIn, signUp, signOut, createWorkspace, apiRequest])

  useEffect(() => {
    if (!activeWorkspaceId && memberships.length > 0) setActiveWorkspace(memberships[0].workspace.id)
    if (activeWorkspaceId && memberships.length > 0 && !memberships.some((item) => item.workspace.id === activeWorkspaceId)) {
      setActiveWorkspace(memberships[0].workspace.id)
    }
  }, [activeWorkspaceId, memberships, setActiveWorkspace])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
