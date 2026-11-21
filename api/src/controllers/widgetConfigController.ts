import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { WidgetConfig, widgetTheme, widgetPosition } from '../models/WidgetConfig.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/appError.js'

const widgetConfigSchema = z.object({
  enabled: z.boolean().optional(),
  title: z.string().trim().min(1).max(80).optional(),
  subtitle: z.string().trim().max(160).optional().nullable(),
  primaryColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  position: z.enum(widgetPosition).optional(),
  theme: z.enum(widgetTheme).optional(),
  greetingMessage: z.string().trim().max(500).optional(),
  offlineMessage: z.string().trim().max(500).optional(),
  requireEmail: z.boolean().optional(),
  showAgentAvatar: z.boolean().optional(),
  allowedOrigins: z.array(z.string().trim().url().max(255)).max(50).optional(),
  rateLimit: z.object({
    maxMessagesPerMinute: z.number().int().min(1).max(60).optional(),
    maxConversationsPerHour: z.number().int().min(1).max(100).optional(),
  }).optional(),
})

export const getWidgetConfig = asyncHandler(async (request: Request, response: Response) => {
  const { workspaceId } = request.params

  if (!mongoose.isValidObjectId(workspaceId)) {
    throw new AppError('Invalid workspace identifier', 400, 'INVALID_WORKSPACE_ID')
  }

  const config = await WidgetConfig.findOne({ workspaceId }).lean()

  if (!config) {
    // Return default config if not exists
    response.json({
      workspaceId,
      enabled: true,
      title: 'Chat with us',
      subtitle: 'We typically reply within a few minutes',
      primaryColor: '#5968e8',
      position: 'bottom-right',
      theme: 'system',
      greetingMessage: 'Hi! How can we help you today?',
      offlineMessage: 'We\'re not online right now. Leave a message and we\'ll get back to you via email.',
      requireEmail: true,
      showAgentAvatar: true,
      allowedOrigins: [],
      rateLimit: {
        maxMessagesPerMinute: 10,
        maxConversationsPerHour: 5,
      },
    })
    return
  }

  response.json(config)
})

export const updateWidgetConfig = asyncHandler(async (request: Request, response: Response) => {
  const { workspaceId } = request.params

  if (!mongoose.isValidObjectId(workspaceId)) {
    throw new AppError('Invalid workspace identifier', 400, 'INVALID_WORKSPACE_ID')
  }

  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const input = widgetConfigSchema.parse(request.body)

  const config = await WidgetConfig.findOneAndUpdate(
    { workspaceId },
    { $set: input },
    { new: true, upsert: true, runValidators: true },
  )

  response.json({
    message: 'Widget configuration updated successfully',
    config,
  })
})

export const getWidgetEmbedCode = asyncHandler(async (request: Request, response: Response) => {
  const { workspaceId } = request.params

  if (!mongoose.isValidObjectId(workspaceId)) {
    throw new AppError('Invalid workspace identifier', 400, 'INVALID_WORKSPACE_ID')
  }

  const config = await WidgetConfig.findOne({ workspaceId }).lean()

  if (!config) {
    throw new AppError('Widget not configured', 404, 'WIDGET_NOT_CONFIGURED')
  }

  const widgetScriptUrl = `${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/widget.js`
  const embedCode = `<!-- AI Support Copilot Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${widgetScriptUrl}';
    script.async = true;
    script.dataset.workspaceId = '${workspaceId}';
    document.head.appendChild(script);
  })();
</script>`

  response.json({
    embedCode,
    workspaceId,
    widgetUrl: widgetScriptUrl,
  })
})