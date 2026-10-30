import { Router } from 'express'
import { login, logout, logoutAll, me, refresh, register } from '../controllers/authController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTrustedOrigin } from '../middleware/requireTrustedOrigin.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh', requireTrustedOrigin, refresh)
router.post('/logout', requireTrustedOrigin, logout)
router.post('/logout-all', requireAuth, logoutAll)
router.get('/me', requireAuth, me)

export default router
