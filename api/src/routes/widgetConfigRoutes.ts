import { Router } from 'express'
import {
  getWidgetConfig,
  updateWidgetConfig,
  getWidgetEmbedCode,
} from '../controllers/widgetConfigController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireWorkspaceAccess, requireWorkspaceRoles } from '../middleware/workspaceAccess.js'

const router = Router({ mergeParams: true })

router.use(requireAuth, requireWorkspaceAccess)
router.get('/', getWidgetConfig)
router.patch('/', requireWorkspaceRoles('owner', 'admin'), updateWidgetConfig)
router.get('/embed', requireWorkspaceRoles('owner', 'admin'), getWidgetEmbedCode)

export default router