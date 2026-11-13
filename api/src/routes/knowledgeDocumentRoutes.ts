import { Router } from 'express'
import {
  deleteKnowledgeDocument,
  listKnowledgeDocuments,
  processKnowledgeDocument,
  uploadKnowledgeDocument as createKnowledgeDocument,
} from '../controllers/knowledgeDocumentController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireWorkspaceAccess, requireWorkspaceRoles } from '../middleware/workspaceAccess.js'
import { uploadKnowledgeDocument as parseKnowledgeUpload } from '../middleware/uploadKnowledgeDocument.js'
import { validateKnowledgeFile } from '../middleware/validateKnowledgeFile.js'
import { searchKnowledgeDocuments } from '../controllers/knowledgeSearchController.js'

// The parent route contains :workspaceId, so mergeParams is required for the
// workspace authorization middleware to see and verify that identifier.
const router = Router({ mergeParams: true })

router.use(requireAuth, requireWorkspaceAccess)

router.get('/', listKnowledgeDocuments)
router.post('/search', searchKnowledgeDocuments)
router.post(
  '/',
  requireWorkspaceRoles('owner', 'admin', 'agent'),
  parseKnowledgeUpload,
  validateKnowledgeFile,
  createKnowledgeDocument,
)
router.post(
  '/:documentId/process',
  requireWorkspaceRoles('owner', 'admin', 'agent'),
  processKnowledgeDocument,
)
router.delete(
  '/:documentId',
  requireWorkspaceRoles('owner', 'admin'),
  deleteKnowledgeDocument,
)

export default router
