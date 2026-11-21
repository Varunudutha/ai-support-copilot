import { Router } from 'express'
import { getWidgetConfig, createPublicConversation, sendPublicMessage, getPublicConversation } from '../controllers/widgetController.js'
import { rateLimit } from 'express-rate-limit'
import { AppError } from '../utils/appError.js'

const router = Router({ mergeParams: true })

// Widget config endpoint (public, but validates origin)
router.get('/config', getWidgetConfig)

// Public conversation endpoints (no auth required, but validates origin and rate limits)
const publicRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // 30 requests per minute per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_request, _response, next) => next(new AppError('Too many requests. Please wait a moment.', 429, 'RATE_LIMITED')),
})

router.use(publicRateLimit)

router.post('/conversations', createPublicConversation)
router.post('/conversations/:conversationId/messages', sendPublicMessage)
router.get('/conversations/:conversationId', getPublicConversation)

export default router