import { Router } from 'express'
import { createWorkspace, getWorkspace, listWorkspaces, updateWorkspace } from '../controllers/workspaceController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireWorkspaceAccess, requireWorkspaceRoles } from '../middleware/workspaceAccess.js'

const router = Router()

router.use(requireAuth)
router.get('/', listWorkspaces)
router.post('/', createWorkspace)
router.get('/:workspaceId', getWorkspace)
router.patch('/:workspaceId', requireWorkspaceAccess, requireWorkspaceRoles('owner', 'admin'), updateWorkspace)

export default router
