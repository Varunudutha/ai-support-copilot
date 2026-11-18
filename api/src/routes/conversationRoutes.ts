import { Router } from 'express'
import {
  createConversation,
  getConversation,
  listConversations,
  sendConversationMessage,
} from '../controllers/conversationController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireWorkspaceAccess } from '../middleware/workspaceAccess.js'

const router = Router({ mergeParams: true })

router.use(requireAuth, requireWorkspaceAccess)
router.get('/', listConversations)
router.post('/', createConversation)
router.get('/:conversationId', getConversation)
router.post('/:conversationId/messages', sendConversationMessage)

export default router
