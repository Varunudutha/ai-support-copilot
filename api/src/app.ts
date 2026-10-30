import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { env } from './config/env.js'
import authRoutes from './routes/authRoutes.js'
import workspaceRoutes from './routes/workspaceRoutes.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { AppError } from './utils/appError.js'

export const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin: env.FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id'],
}))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'ai-support-copilot-api' })
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_request, _response, next) => next(new AppError('Too many authentication attempts. Please try again later.', 429, 'RATE_LIMITED')),
})

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/workspaces', workspaceRoutes)
app.use(notFound)
app.use(errorHandler)
