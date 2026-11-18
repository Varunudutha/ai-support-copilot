import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { Conversation, conversationStatuses } from '../models/Conversation.js'
import { Message } from '../models/Message.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/appError.js'

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(conversationStatuses).optional(),
})

export const createConversationSchema = z.object({
  customer: z.object({
    displayName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254).optional().nullable(),
    externalId: z.string().trim().min(1).max(160).optional().nullable(),
  }),
  subject: z.string().trim().max(160).optional().nullable(),
  initialMessage: z.string().trim().min(1).max(20_000),
})

export const sendConversationMessageSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
})

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

function requireWorkspace(request: Request) {
  if (!request.workspace) {
    throw new AppError('Workspace context is required', 400, 'WORKSPACE_REQUIRED')
  }
  return request.workspace
}

function requireConversationId(request: Request) {
  const conversationId = request.params.conversationId
  if (!mongoose.isValidObjectId(conversationId)) {
    throw new AppError('Conversation identifier is invalid', 400, 'INVALID_CONVERSATION_ID')
  }
  return conversationId
}

export const listConversations = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const { page, limit, status } = listQuerySchema.parse(request.query)
  const filter = { workspaceId: workspace.id, ...(status ? { status } : {}) }

  const [conversations, total] = await Promise.all([
    Conversation.find(filter).sort({ lastMessageAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Conversation.countDocuments(filter),
  ])

  response.json({
    conversations,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
})

export const createConversation = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const input = createConversationSchema.parse(request.body)
  const conversation = await Conversation.create({
    workspaceId: workspace.id,
    channel: 'dashboard',
    customer: input.customer,
    subject: input.subject ?? null,
  })

  let savedMessageId: mongoose.Types.ObjectId | null = null

  try {
    const savedMessage = await new Message({
      workspaceId: workspace.id,
      conversationId: conversation._id,
      senderType: 'customer',
      senderId: null,
      content: input.initialMessage,
      citations: [],
    }).save()

    savedMessageId = savedMessage._id
    conversation.messageCount = 1
    conversation.lastMessageAt = savedMessage.createdAt
    await conversation.save()

    response.status(201).json({
      message: 'Conversation created successfully',
      conversation,
      messages: [savedMessage],
    })
  } catch (error) {
    if (savedMessageId) {
      await Message.deleteOne({
        _id: savedMessageId,
        workspaceId: workspace.id,
      }).catch(() => undefined)
    }

    await Conversation.deleteOne({
      _id: conversation._id,
      workspaceId: workspace.id,
    }).catch(() => undefined)

    throw error
  }
})

export const getConversation = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const conversationId = requireConversationId(request)
  const { limit } = historyQuerySchema.parse(request.query)

  const conversation = await Conversation.findOne({
    _id: conversationId,
    workspaceId: workspace.id,
  }).lean()

  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND')
  }

  const messageFilter = { conversationId, workspaceId: workspace.id }
  const [messages, totalMessages] = await Promise.all([
    Message.find(messageFilter).sort({ createdAt: -1 }).limit(limit).lean(),
    Message.countDocuments(messageFilter),
  ])

  response.json({
    conversation,
    messages: messages.reverse(),
    pagination: { limit, total: totalMessages, hasMore: totalMessages > messages.length },
  })
})

export const sendConversationMessage = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const conversationId = requireConversationId(request)
  const input = sendConversationMessageSchema.parse(request.body)

  const existing = await Conversation.findOne({
    _id: conversationId,
    workspaceId: workspace.id,
  }).select('_id status')

  if (!existing) {
    throw new AppError('Conversation not found', 404, 'CONVERSATION_NOT_FOUND')
  }
  if (existing.status === 'closed') {
    throw new AppError('This conversation is closed', 409, 'CONVERSATION_CLOSED')
  }

  const savedMessage = await Message.create({
    workspaceId: workspace.id,
    conversationId,
    senderType: 'customer',
    senderId: null,
    content: input.content,
    citations: [],
  })

  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, workspaceId: workspace.id, status: { $ne: 'closed' } },
    { $set: { lastMessageAt: savedMessage.createdAt }, $inc: { messageCount: 1 } },
    { new: true },
  )

  if (!conversation) {
    await Message.deleteOne({ _id: savedMessage._id, workspaceId: workspace.id }).catch(() => undefined)
    throw new AppError('This conversation is no longer available', 409, 'CONVERSATION_UNAVAILABLE')
  }

  response.status(201).json({
    message: 'Message sent successfully',
    conversation,
    savedMessage,
  })
})
