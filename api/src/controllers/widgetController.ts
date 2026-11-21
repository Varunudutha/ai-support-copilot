import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { WidgetConfig } from '../models/WidgetConfig.js'
import { Conversation } from '../models/Conversation.js'
import { Message } from '../models/Message.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/appError.js'
import { generateRagAnswer } from '../services/ragService.js'

const createPublicConversationSchema = z.object({
  customer: z.object({
    displayName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254).optional().nullable(),
    externalId: z.string().trim().min(1).max(160).optional().nullable(),
  }),
  initialMessage: z.string().trim().min(1).max(20_000),
})

const sendPublicMessageSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
})


function getClientIp(request: Request): string {
  return (
    request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    request.headers['x-real-ip']?.toString() ||
    request.socket.remoteAddress ||
    'unknown'
  )
}

function validateOrigin(allowedOrigins: string[], origin: string | undefined): boolean {
  if (!origin) return false
  try {
    const originUrl = new URL(origin)
    return allowedOrigins.some((allowed) => {
      if (allowed === '*') return true
      const allowedUrl = new URL(allowed)
      return allowedUrl.hostname === originUrl.hostname
    })
  } catch {
    return false
  }
}

export const getWidgetConfig = asyncHandler(async (request: Request, response: Response) => {
  const { workspaceId } = request.params

  if (!mongoose.isValidObjectId(workspaceId)) {
    throw new AppError('Invalid workspace identifier', 400, 'INVALID_WORKSPACE_ID')
  }

  const config = await WidgetConfig.findOne({ workspaceId }).lean()

  if (!config) {
    throw new AppError('Widget not configured for this workspace', 404, 'WIDGET_NOT_FOUND')
  }

  if (!config.enabled) {
    throw new AppError('Widget is disabled', 403, 'WIDGET_DISABLED')
  }

  // Validate origin
  const origin = request.headers.origin
  if (!validateOrigin(config.allowedOrigins, origin)) {
    throw new AppError('Origin not allowed', 403, 'ORIGIN_NOT_ALLOWED')
  }

  response.json({
    workspaceId: config.workspaceId,
    title: config.title,
    subtitle: config.subtitle,
    primaryColor: config.primaryColor,
    position: config.position,
    theme: config.theme,
    greetingMessage: config.greetingMessage,
    offlineMessage: config.offlineMessage,
    requireEmail: config.requireEmail,
    showAgentAvatar: config.showAgentAvatar,
  })
})

export const createPublicConversation = asyncHandler(async (request: Request, response: Response) => {
  const { workspaceId } = request.params

  if (!mongoose.isValidObjectId(workspaceId)) {
    throw new AppError('Invalid workspace identifier', 400, 'INVALID_WORKSPACE_ID')
  }

  const config = await WidgetConfig.findOne({ workspaceId })

  if (!config || !config.enabled) {
    throw new AppError('Widget not available', 404, 'WIDGET_NOT_AVAILABLE')
  }

  const origin = request.headers.origin
  if (!validateOrigin(config.allowedOrigins, origin)) {
    throw new AppError('Origin not allowed', 403, 'ORIGIN_NOT_ALLOWED')
  }

  const input = createPublicConversationSchema.parse(request.body)

  // Check rate limit: max conversations per hour per IP
  const clientIp = getClientIp(request)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentConversations = await Conversation.countDocuments({
    workspaceId,
    channel: 'widget',
    'customer.externalId': clientIp,
    createdAt: { $gte: oneHourAgo },
  })

  if (recentConversations >= (config.rateLimit?.maxConversationsPerHour ?? 5)) {
    throw new AppError('Too many conversations started. Please wait before starting a new one.', 429, 'RATE_LIMITED')
  }

  const conversation = await Conversation.create({
    workspaceId,
    channel: 'widget',
    customer: input.customer,
    subject: null,
  })

  const savedMessage = await new Message({
    workspaceId,
    conversationId: conversation._id,
    senderType: 'customer',
    senderId: null,
    content: input.initialMessage,
    citations: [],
  }).save()

  conversation.messageCount = 1
  conversation.lastMessageAt = savedMessage.createdAt
  await conversation.save()

  // Generate AI response
  let aiMessage = null
  if (conversation.status === 'open' && !conversation.assignedTo) {
    try {
      const ragResult = await generateRagAnswer(workspaceId, input.initialMessage, 5)

      const citationsForStorage = ragResult.grounded
        ? ragResult.citations.map((c) => ({
            citationId: c.citationId,
            id: c.id,
            documentId: c.documentId,
            chunkIndex: c.chunkIndex,
            sourceName: c.sourceName,
            mimeType: c.mimeType,
            pageCount: c.pageCount,
            score: c.score,
            excerpt: c.excerpt,
          }))
        : []

      aiMessage = await Message.create({
        workspaceId,
        conversationId: conversation._id,
        senderType: 'assistant',
        senderId: null,
        content: ragResult.answer,
        citations: citationsForStorage,
      })

      await Conversation.findOneAndUpdate(
        { _id: conversation._id, workspaceId, status: { $ne: 'closed' } },
        { $set: { lastMessageAt: aiMessage.createdAt }, $inc: { messageCount: 1 } },
        { new: true },
      ).catch(() => undefined)
    } catch (error) {
      console.error('Widget AI response generation failed:', error)
    }
  }

  response.status(201).json({
    message: 'Conversation created successfully',
    conversation,
    messages: [savedMessage, aiMessage].filter(Boolean),
  })
})

export const sendPublicMessage = asyncHandler(async (request: Request, response: Response) => {
  const { workspaceId, conversationId } = request.params

  if (!mongoose.isValidObjectId(workspaceId) || !mongoose.isValidObjectId(conversationId)) {
    throw new AppError('Invalid identifier', 400, 'INVALID_IDENTIFIER')
  }

  const config = await WidgetConfig.findOne({ workspaceId })

  if (!config || !config.enabled) {
    throw new AppError('Widget not available', 404, 'WIDGET_NOT_AVAILABLE')
  }

  const origin = request.headers.origin
  if (!validateOrigin(config.allowedOrigins, origin)) {
    throw new AppError('Origin not allowed', 403, 'ORIGIN_NOT_ALLOWED')
  }

  const input = sendPublicMessageSchema.parse(request.body)

  // Check rate limit: max messages per minute per conversation
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
  const recentMessages = await Message.countDocuments({
    workspaceId,
    conversationId,
    senderType: 'customer',
    createdAt: { $gte: oneMinuteAgo },
  })

  if (recentMessages >= (config.rateLimit?.maxMessagesPerMinute ?? 10)) {
    throw new AppError('Too many messages sent. Please wait a moment.', 429, 'RATE_LIMITED')
  }

  const existing = await Conversation.findOne({
    _id: conversationId,
    workspaceId,
  }).select('_id status')

  if (!existing) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND')
  }
  if (existing.status === 'closed') {
    throw new AppError('This conversation is closed', 409, 'CONVERSATION_CLOSED')
  }

  const savedMessage = await Message.create({
    workspaceId,
    conversationId,
    senderType: 'customer',
    senderId: null,
    content: input.content,
    citations: [],
  })

  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, workspaceId, status: { $ne: 'closed' } },
    { $set: { lastMessageAt: savedMessage.createdAt }, $inc: { messageCount: 1 } },
    { new: true },
  )

  if (!conversation) {
    await Message.deleteOne({ _id: savedMessage._id, workspaceId }).catch(() => undefined)
    throw new AppError('This conversation is no longer available', 409, 'CONVERSATION_UNAVAILABLE')
  }

  // Generate AI response if conversation is open and not assigned
  let aiMessage = null
  if (conversation.status === 'open' && !conversation.assignedTo) {
    try {
      const ragResult = await generateRagAnswer(workspaceId, input.content, 5)

      const citationsForStorage = ragResult.grounded
        ? ragResult.citations.map((c) => ({
            citationId: c.citationId,
            id: c.id,
            documentId: c.documentId,
            chunkIndex: c.chunkIndex,
            sourceName: c.sourceName,
            mimeType: c.mimeType,
            pageCount: c.pageCount,
            score: c.score,
            excerpt: c.excerpt,
          }))
        : []

      aiMessage = await Message.create({
        workspaceId,
        conversationId,
        senderType: 'assistant',
        senderId: null,
        content: ragResult.answer,
        citations: citationsForStorage,
      })

      await Conversation.findOneAndUpdate(
        { _id: conversationId, workspaceId, status: { $ne: 'closed' } },
        { $set: { lastMessageAt: aiMessage.createdAt }, $inc: { messageCount: 1 } },
        { new: true },
      ).catch(() => undefined)
    } catch (error) {
      console.error('Widget AI response generation failed:', error)
    }
  }

  response.status(201).json({
    message: 'Message sent successfully',
    conversation,
    savedMessage,
    aiMessage: aiMessage ?? undefined,
  })
})

export const getPublicConversation = asyncHandler(async (request: Request, response: Response) => {
  const { workspaceId, conversationId } = request.params

  if (!mongoose.isValidObjectId(workspaceId) || !mongoose.isValidObjectId(conversationId)) {
    throw new AppError('Invalid identifier', 400, 'INVALID_IDENTIFIER')
  }

  const config = await WidgetConfig.findOne({ workspaceId })

  if (!config || !config.enabled) {
    throw new AppError('Widget not available', 404, 'WIDGET_NOT_AVAILABLE')
  }

  const origin = request.headers.origin
  if (!validateOrigin(config.allowedOrigins, origin)) {
    throw new AppError('Origin not allowed', 403, 'ORIGIN_NOT_ALLOWED')
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    workspaceId,
  }).lean()

  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND')
  }

  const messages = await Message.find({
    conversationId,
    workspaceId,
  }).sort({ createdAt: 1 }).limit(100).lean()

  response.json({
    conversation,
    messages,
  })
})