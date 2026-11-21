import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Code,
  Copy,
  Globe,
  LoaderCircle,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

interface WidgetConfig {
  workspaceId: string
  enabled: boolean
  title: string
  subtitle: string
  primaryColor: string
  position: 'bottom-right' | 'bottom-left'
  theme: 'light' | 'dark' | 'system'
  greetingMessage: string
  offlineMessage: string
  requireEmail: boolean
  showAgentAvatar: boolean
  allowedOrigins: string[]
  rateLimit: {
    maxMessagesPerMinute: number
    maxConversationsPerHour: number
  }
}

interface EmbedCodeResponse {
  embedCode: string
  workspaceId: string
  widgetUrl: string
}

export function WidgetConfigPage() {
  const { activeWorkspace, activeWorkspaceRole, apiRequest } = useAuth()
  const workspaceId = activeWorkspace?.id ?? ''

  const [config, setConfig] = useState<WidgetConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showEmbedModal, setShowEmbedModal] = useState(false)
  const [embedCode, setEmbedCode] = useState('')
  const [copied, setCopied] = useState(false)

  const canManageWidget = ['owner', 'admin'].includes(activeWorkspaceRole ?? '')

  const loadConfig = useCallback(async () => {
    if (!workspaceId) return

    setLoading(true)
    setError('')

    try {
      const response = await apiRequest<WidgetConfig>(`/workspaces/${workspaceId}/widget-config`)
      setConfig(response)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load widget configuration.')
    } finally {
      setLoading(false)
    }
  }, [apiRequest, workspaceId])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!workspaceId || !config || !canManageWidget || saving) return

    setSaving(true)
    setError('')
    setNotice('')

    try {
      await apiRequest<{ message: string; config: WidgetConfig }>(
        `/workspaces/${workspaceId}/widget-config`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            enabled: config.enabled,
            title: config.title,
            subtitle: config.subtitle,
            primaryColor: config.primaryColor,
            position: config.position,
            theme: config.theme,
            greetingMessage: config.greetingMessage,
            offlineMessage: config.offlineMessage,
            requireEmail: config.requireEmail,
            showAgentAvatar: config.showAgentAvatar,
            allowedOrigins: config.allowedOrigins,
            rateLimit: config.rateLimit,
          }),
        },
      )

      setNotice('Widget configuration saved successfully.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to save widget configuration.')
    } finally {
      setSaving(false)
    }
  }

  const fetchEmbedCode = async () => {
    if (!workspaceId) return

    try {
      const response = await apiRequest<EmbedCodeResponse>(`/workspaces/${workspaceId}/widget-config/embed`)
      setEmbedCode(response.embedCode)
      setShowEmbedModal(true)
      setCopied(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to generate embed code.')
    }
  }

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const addOrigin = () => {
    if (config && config.allowedOrigins.length < 50) {
      setConfig({ ...config, allowedOrigins: [...config.allowedOrigins, 'https://'] })
    }
  }

  const removeOrigin = (index: number) => {
    if (config) {
      setConfig({ ...config, allowedOrigins: config.allowedOrigins.filter((_, i) => i !== index) })
    }
  }

  const updateOrigin = (index: number, value: string) => {
    if (config) {
      const newOrigins = [...config.allowedOrigins]
      newOrigins[index] = value
      setConfig({ ...config, allowedOrigins: newOrigins })
    }
  }

  if (loading) {
    return (
      <div className="widget-config-page">
        <div className="widget-loading">
          <LoaderCircle size={22} className="spin" />
          Loading widget configuration...
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="widget-config-page">
        <div className="widget-empty">
          <SlidersHorizontal size={28} />
          <strong>Widget not configured</strong>
          <p>Save the form below to create your first widget configuration.</p>
        </div>
      </div>
    )
  }

  return (
    <section className="widget-config-page" aria-busy={saving}>
      <div className="widget-config-header">
        <div>
          <div className="eyebrow page-eyebrow">CHANNELS</div>
          <h1>Website Chat Widget</h1>
          <p>Configure the embeddable chat widget for your website.</p>
        </div>
        <div className="widget-config-actions">
          <button className="button button-secondary" type="button" onClick={fetchEmbedCode} disabled={!canManageWidget}>
            <Code size={15} /> Get embed code
          </button>
          {canManageWidget && (
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />}
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          )}
        </div>
      </div>

      <div className="widget-trust-note">
        <ShieldCheck size={17} />
        <span>This widget will be embedded on your website. Only the allowed origins below can load the widget.</span>
      </div>

      {error && <div className="widget-alert widget-alert-error" role="alert"><AlertCircle size={17} /><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
      {notice && <div className="widget-alert widget-alert-success" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}

      <form className="widget-config-form" onSubmit={handleSave}>
        <section className="widget-config-section">
          <h2>Widget Behavior</h2>
          <div className="widget-field">
            <label>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config!, enabled: e.target.checked })}
                disabled={!canManageWidget}
              />
              <span>Enable widget on website</span>
            </label>
          </div>
          <div className="widget-field-row">
            <div className="widget-field">
              <label htmlFor="widget-title">Widget title</label>
              <input
                id="widget-title"
                type="text"
                value={config.title}
                onChange={(e) => setConfig({ ...config!, title: e.target.value })}
                maxLength={80}
                disabled={!canManageWidget}
              />
            </div>
            <div className="widget-field">
              <label htmlFor="widget-subtitle">Subtitle</label>
              <input
                id="widget-subtitle"
                type="text"
                value={config.subtitle}
                onChange={(e) => setConfig({ ...config!, subtitle: e.target.value })}
                maxLength={160}
                disabled={!canManageWidget}
              />
            </div>
          </div>
        </section>

        <section className="widget-config-section">
          <h2>Appearance</h2>
          <div className="widget-field-row">
            <div className="widget-field">
              <label htmlFor="widget-primary-color">Primary color</label>
              <div className="color-input-wrap">
                <input
                  id="widget-primary-color"
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config!, primaryColor: e.target.value })}
                  disabled={!canManageWidget}
                />
                <input
                  type="text"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config!, primaryColor: e.target.value })}
                  maxLength={7}
                  disabled={!canManageWidget}
                  style={{ width: '80px', marginLeft: '8px' }}
                />
              </div>
            </div>
            <div className="widget-field">
              <label htmlFor="widget-position">Position</label>
              <select
                id="widget-position"
                value={config.position}
                onChange={(e) => setConfig({ ...config!, position: e.target.value as 'bottom-right' | 'bottom-left' })}
                disabled={!canManageWidget}
              >
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
              </select>
            </div>
            <div className="widget-field">
              <label htmlFor="widget-theme">Theme</label>
              <select
                id="widget-theme"
                value={config.theme}
                onChange={(e) => setConfig({ ...config!, theme: e.target.value as 'light' | 'dark' | 'system' })}
                disabled={!canManageWidget}
              >
                <option value="system">System (auto)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </section>

        <section className="widget-config-section">
          <h2>Messages</h2>
          <div className="widget-field-row">
            <div className="widget-field widget-field-full">
              <label htmlFor="widget-greeting">Greeting message</label>
              <textarea
                id="widget-greeting"
                value={config.greetingMessage}
                onChange={(e) => setConfig({ ...config!, greetingMessage: e.target.value })}
                maxLength={500}
                rows={3}
                disabled={!canManageWidget}
              />
            </div>
            <div className="widget-field widget-field-full">
              <label htmlFor="widget-offline">Offline message</label>
              <textarea
                id="widget-offline"
                value={config.offlineMessage}
                onChange={(e) => setConfig({ ...config!, offlineMessage: e.target.value })}
                maxLength={500}
                rows={3}
                disabled={!canManageWidget}
              />
            </div>
          </div>
          <div className="widget-field-row">
            <div className="widget-field">
              <label>
                <input
                  type="checkbox"
                  checked={config.requireEmail}
                  onChange={(e) => setConfig({ ...config!, requireEmail: e.target.checked })}
                  disabled={!canManageWidget}
                />
                <span>Require customer email</span>
              </label>
            </div>
            <div className="widget-field">
              <label>
                <input
                  type="checkbox"
                  checked={config.showAgentAvatar}
                  onChange={(e) => setConfig({ ...config!, showAgentAvatar: e.target.checked })}
                  disabled={!canManageWidget}
                />
                <span>Show agent avatar</span>
              </label>
            </div>
          </div>
        </section>

        <section className="widget-config-section">
          <h2>Rate Limiting</h2>
          <div className="widget-field-row">
            <div className="widget-field">
              <label htmlFor="widget-max-msgs">Max messages per minute (per user)</label>
              <input
                id="widget-max-msgs"
                type="number"
                value={config.rateLimit.maxMessagesPerMinute}
                onChange={(e) => setConfig({ ...config!, rateLimit: { ...config!.rateLimit, maxMessagesPerMinute: Math.max(1, Math.min(60, parseInt(e.target.value) || 10)) } })}
                min={1}
                max={60}
                disabled={!canManageWidget}
              />
            </div>
            <div className="widget-field">
              <label htmlFor="widget-max-convs">Max conversations per hour (per IP)</label>
              <input
                id="widget-max-convs"
                type="number"
                value={config.rateLimit.maxConversationsPerHour}
                onChange={(e) => setConfig({ ...config!, rateLimit: { ...config!.rateLimit, maxConversationsPerHour: Math.max(1, Math.min(100, parseInt(e.target.value) || 5)) } })}
                min={1}
                max={100}
                disabled={!canManageWidget}
              />
            </div>
          </div>
        </section>

        <section className="widget-config-section">
          <h2>Allowed Origins</h2>
          {canManageWidget && (
            <button type="button" className="button button-secondary button-sm" onClick={addOrigin}>
              <Globe size={14} /> Add origin
            </button>
          )}
          <p className="widget-origins-hint">Only these origins can load the widget. Use full URLs (e.g., https://example.com). Maximum 50 origins.</p>
          {config.allowedOrigins.length === 0 ? (
            <p className="widget-empty-origins">No origins configured. The widget will not load on any website until origins are added.</p>
          ) : (
            <div className="widget-origins-list">
              {config.allowedOrigins.map((origin, index) => (
                <div key={index} className="widget-origin-row">
                  <input
                    type="url"
                    value={origin}
                    onChange={(e) => updateOrigin(index, e.target.value)}
                    placeholder="https://example.com"
                    disabled={!canManageWidget}
                  />
                  {canManageWidget && (
                    <button type="button" className="widget-origin-delete" onClick={() => removeOrigin(index)} aria-label="Remove origin">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="widget-config-section">
          <h2>Preview</h2>
          <div className="widget-preview">
            <div className={`widget-preview-bubble ${config.position === 'bottom-left' ? 'widget-preview-left' : ''}`}>
              <div className="widget-preview-header">
                <div>
                  <strong>{config.title}</strong>
                  <small>{config.subtitle}</small>
                </div>
                <button className="widget-preview-close">x</button>
              </div>
              <div className="widget-preview-message">
                <div className="widget-preview-avatar">AI</div>
                <div className="widget-preview-bubble-text">{config.greetingMessage}</div>
              </div>
              <div className="widget-preview-input">
                <input type="text" placeholder="Type a message..." disabled />
                <button disabled style={{ background: config.primaryColor }}>Send</button>
              </div>
            </div>
          </div>
        </section>
      </form>

      {showEmbedModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowEmbedModal(false)}>
          <section className="widget-embed-modal" role="dialog" aria-modal="true" aria-labelledby="embed-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="widget-embed-modal-header">
              <strong id="embed-modal-title">Embed code</strong>
              <button className="icon-button" onClick={() => setShowEmbedModal(false)} aria-label="Close"><X size={19} /></button>
            </div>
            <div className="widget-embed-modal-body">
              <p>Copy this code and paste it into your website head or before the closing body tag.</p>
              <div className="widget-embed-code-wrap">
                <pre><code dangerouslySetInnerHTML={{ __html: embedCode }} /></pre>
                <button className="widget-embed-copy-btn" onClick={copyEmbedCode} disabled={copied}>
                  {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy to clipboard'}
                </button>
              </div>
              <p>Replace YOUR_WORKSPACE_ID with your actual workspace ID if not auto-filled.</p>
            </div>
            <div className="widget-embed-modal-footer">
              <button className="button button-secondary" type="button" onClick={() => setShowEmbedModal(false)}>Close</button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}