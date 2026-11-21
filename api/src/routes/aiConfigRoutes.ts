import { Router } from 'express'
import {
  getAIConfig,
  updateAIConfig,
} from '../controllers/aiConfigController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireWorkspaceAccess, requireWorkspaceRoles } from '../middleware/workspaceAccess.js'

const router = Router({ mergeParams: true })

router.use(requireAuth, requireWorkspaceAccess)
router.get('/', getAIConfig)
router.patch('/', requireWorkspaceRoles('owner', 'admin'), updateAIConfig)

export default router