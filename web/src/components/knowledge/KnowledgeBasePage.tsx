import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  CloudUpload,
  FileText,
  FileType,
  HardDrive,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import '../../knowledge-base.css'

type KnowledgeDocument = {
  id: string
  originalName: string
  mimeType: string
  fileSize: number
  status: 'uploaded' | 'processing' | 'ready' | 'failed'
  uploadedBy: string
  createdAt: string
}

type KnowledgeListResponse = {
  documents: KnowledgeDocument[]
  pagination?: { page: number; limit: number; total: number; pages: number }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt']

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot).toLowerCase() : ''
}

function statusLabel(status: KnowledgeDocument['status']): string {
  switch (status) {
    case 'ready': return 'Ready for AI'
    case 'processing': return 'Processing'
    case 'failed': return 'Processing failed'
    default: return 'Uploaded'
  }
}

export function KnowledgeBasePage() {
  const { activeWorkspace, activeWorkspaceRole, apiRequest } = useAuth()
  const workspaceId = activeWorkspace?.id ?? ''
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const canUpload = ['owner', 'admin', 'agent'].includes(activeWorkspaceRole ?? '')
  const canDelete = ['owner', 'admin'].includes(activeWorkspaceRole ?? '')

  const loadDocuments = useCallback(async () => {
    if (!workspaceId) {
      setDocuments([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await apiRequest<KnowledgeListResponse>(
        `/workspaces/${workspaceId}/knowledge-documents?limit=50`,
      )
      setDocuments(response.documents ?? [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load knowledge documents.')
    } finally {
      setLoading(false)
    }
  }, [apiRequest, workspaceId])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return documents
    return documents.filter((document) =>
      [document.originalName, document.mimeType, document.status].some((value) => value.toLowerCase().includes(query)),
    )
  }, [documents, search])

  const totalStorage = documents.reduce((total, document) => total + document.fileSize, 0)
  const readyCount = documents.filter((document) => document.status === 'ready').length

  const uploadFile = async (file?: File) => {
    if (!file) return
    setError('')
    setNotice('')

    const extension = getExtension(file.name)
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setError('Choose a PDF, DOCX or TXT file.')
      return
    }
    if (file.size === 0) {
      setError('The selected file is empty.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File size cannot exceed 10 MB.')
      return
    }
    if (!workspaceId) {
      setError('Select a workspace before uploading documents.')
      return
    }

    const body = new FormData()
    body.append('file', file)
    setUploading(true)
    try {
      await apiRequest<{ document: KnowledgeDocument }>(
        `/workspaces/${workspaceId}/knowledge-documents`,
        { method: 'POST', body },
      )
      setNotice(`${file.name} was uploaded successfully.`)
      await loadDocuments()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void uploadFile(event.target.files?.[0])
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    void uploadFile(event.dataTransfer.files?.[0])
  }

  const deleteDocument = async (document: KnowledgeDocument) => {
    if (!canDelete || !window.confirm(`Delete "${document.originalName}" from this workspace?`)) return
    setDeletingId(document.id)
    setError('')
    setNotice('')
    try {
      await apiRequest<{ message: string }>(
        `/workspaces/${workspaceId}/knowledge-documents/${document.id}`,
        { method: 'DELETE' },
      )
      setDocuments((current) => current.filter((item) => item.id !== document.id))
      setNotice(`${document.originalName} was deleted.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete this document.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="kb-page" aria-busy={loading || uploading}>
      <div className="kb-heading-row">
        <div>
          <div className="eyebrow page-eyebrow">CONTENT & SOURCES</div>
          <h1>Knowledge base</h1>
          <p>Manage the documents your support assistant will use to understand your business.</p>
        </div>
        <div className="kb-heading-actions">
          <button className="button button-secondary" type="button" onClick={() => void loadDocuments()} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'kb-spin' : ''} /> Refresh
          </button>
          {canUpload && (
            <button className="button button-primary" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload size={15} /> Upload document
            </button>
          )}
        </div>
      </div>

      <div className="kb-trust-note">
        <ShieldCheck size={17} />
        <span>Documents are private to <strong>{activeWorkspace?.name ?? 'this workspace'}</strong> and are only accessible to its members.</span>
      </div>

      {error && <div className="kb-alert kb-alert-error" role="alert"><AlertCircle size={17} /><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
      {notice && <div className="kb-alert kb-alert-success" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}

      <div className="kb-stat-grid">
        <article className="kb-stat-card"><span className="kb-stat-icon kb-stat-indigo"><BookOpen size={18} /></span><div><span className="kb-stat-label">Total documents</span><strong>{documents.length}</strong><small>In this workspace</small></div></article>
        <article className="kb-stat-card"><span className="kb-stat-icon kb-stat-blue"><HardDrive size={18} /></span><div><span className="kb-stat-label">Storage used</span><strong>{formatBytes(totalStorage)}</strong><small>Across uploaded files</small></div></article>
        <article className="kb-stat-card"><span className="kb-stat-icon kb-stat-green"><CheckCircle2 size={18} /></span><div><span className="kb-stat-label">Ready for AI</span><strong>{readyCount}</strong><small>Successfully processed</small></div></article>
      </div>

      {canUpload ? (
        <div
          className={`kb-upload-zone ${dragActive ? 'kb-upload-zone-active' : ''} ${uploading ? 'kb-upload-zone-busy' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false) }}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            className="kb-file-input"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={handleFileChange}
            disabled={uploading}
            aria-label="Choose a knowledge document"
          />
          <div className="kb-upload-icon">{uploading ? <LoaderCircle size={23} className="kb-spin" /> : <CloudUpload size={23} />}</div>
          <div className="kb-upload-copy">
            <strong>{uploading ? 'Uploading document…' : 'Drop your documents here, or browse files'}</strong>
            <span>Upload business policies, FAQs, product guides and support resources.</span>
          </div>
          <button type="button" className="kb-browse-button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Please wait' : 'Browse files'}
          </button>
          <div className="kb-upload-footnote"><span>PDF</span><span>DOCX</span><span>TXT</span><i /> Maximum file size: 10 MB</div>
        </div>
      ) : (
        <div className="kb-readonly-note"><ShieldCheck size={16} /> Your workspace role allows you to view documents but not upload or delete them.</div>
      )}

      <section className="kb-documents-panel">
        <div className="kb-documents-heading">
          <div><h2>Uploaded documents</h2><p>Files added to your workspace knowledge base.</p></div>
          <label className="kb-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents" aria-label="Search documents" /></label>
        </div>

        {loading ? (
          <div className="kb-loading-state"><LoaderCircle size={19} className="kb-spin" /> Loading documents…</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="kb-empty-state">
            <div className="kb-empty-icon"><BookOpen size={22} /></div>
            <strong>{search ? 'No matching documents' : 'Your knowledge base is waiting'}</strong>
            <p>{search ? 'Try a different search term.' : 'Upload your first business document to start building a trusted source of information for your assistant.'}</p>
            {!search && canUpload && <button type="button" className="button button-primary" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Upload your first document</button>}
          </div>
        ) : (
          <div className="kb-table-wrap">
            <table className="kb-table">
              <thead><tr><th>Document</th><th>File size</th><th>Date added</th><th>Status</th><th><span className="kb-sr-only">Actions</span></th></tr></thead>
              <tbody>
                {filteredDocuments.map((document) => {
                  const extension = getExtension(document.originalName)
                  return (
                    <tr key={document.id}>
                      <td><div className="kb-file-cell"><span className={`kb-file-icon ${extension === '.pdf' ? 'kb-file-pdf' : extension === '.docx' ? 'kb-file-docx' : 'kb-file-txt'}`}>{extension === '.docx' ? <FileType size={18} /> : <FileText size={18} />}</span><span><strong title={document.originalName}>{document.originalName}</strong><small>{extension.replace('.', '').toUpperCase()} document</small></span></div></td>
                      <td className="kb-secondary-cell">{formatBytes(document.fileSize)}</td>
                      <td className="kb-secondary-cell">{formatDate(document.createdAt)}</td>
                      <td><span className={`kb-status kb-status-${document.status}`}><i />{statusLabel(document.status)}</span></td>
                      <td className="kb-action-cell">{canDelete && <button type="button" className="kb-delete-button" onClick={() => void deleteDocument(document)} disabled={deletingId === document.id} aria-label={`Delete ${document.originalName}`} title="Delete document">{deletingId === document.id ? <LoaderCircle size={16} className="kb-spin" /> : <Trash2 size={16} />}</button>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="kb-table-footer">Showing {filteredDocuments.length} of {documents.length} documents</div>
          </div>
        )}
      </section>
      <div className="kb-processing-footnote"><FileText size={14} /> Uploaded files are stored securely. Document text extraction and AI indexing will be activated in the next processing step.</div>
    </section>
  )
}
