import { Router } from 'express'
import {
  getOverviewMetrics,
  getConversationTrends,
  getAgentPerformance,
  getSatisfaction,
  getAIFeedback,
  getChannelBreakdown,
  exportAnalytics,
} from '../controllers/analyticsController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireWorkspaceAccess } from '../middleware/workspaceAccess.js'

const router = Router({ mergeParams: true })

router.use(requireAuth, requireWorkspaceAccess)
router.get('/overview', getOverviewMetrics)
router.get('/trends', getConversationTrends)
router.get('/agents', getAgentPerformance)
router.get('/satisfaction', getSatisfaction)
router.get('/ai-feedback', getAIFeedback)
router.get('/channels', getChannelBreakdown)
router.get('/export', exportAnalytics)

export default router