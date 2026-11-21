import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { Customer } from '../models/Customer.js'
import { Conversation } from '../models/Conversation.js'
import { Message } from '../models/Message.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/appError.js'

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
  search: z.string().trim().max(200).optional(),
  tags: z.string().optional(),
})

const createCustomerSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  avatarUrl: z.string().trim().url().max(500).optional().nullable(),
  externalId: z.string().trim().max(160).optional().nullable(),
  address: z.object({
    street: z.string().trim().max(200).optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    state: z.string().trim().max(100).optional().nullable(),
    postalCode: z.string().trim().max(20).optional().nullable(),
    country: z.string().trim().max(100).optional().nullable(),
  }).optional().nullable(),
  social: z.object({
    twitter: z.string().trim().max(100).optional().nullable(),
    linkedin: z.string().trim().max(100).optional().nullable(),
    facebook: z.string().trim().max(100).optional().nullable(),
    instagram: z.string().trim().max(100).optional().nullable(),
  }).optional().nullable(),
  tags: z.array(z.string().trim().max(50)).max(20).optional(),
  customFields: z.array(z.object({
    key: z.string().trim().min(1).max(50),
    value: z.string().trim().max(500).optional().nullable(),
  })).max(20).optional(),
  notes: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
  source: z.enum(['dashboard', 'widget', 'import', 'api']).optional(),
})

const updateCustomerSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(254).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  avatarUrl: z.string().trim().url().max(500).optional().nullable(),
  externalId: z.string().trim().max(160).optional().nullable(),
  address: z.object({
    street: z.string().trim().max(200).optional().nullable(),
    city: z.string().trim().max(100).optional().nullable(),
    state: z.string().trim().max(100).optional().nullable(),
    postalCode: z.string().trim().max(20).optional().nullable(),
    country: z.string().trim().max(100).optional().nullable(),
  }).optional().nullable(),
  social: z.object({
    twitter: z.string().trim().max(100).optional().nullable(),
    linkedin: z.string().trim().max(100).optional().nullable(),
    facebook: z.string().trim().max(100).optional().nullable(),
    instagram: z.string().trim().max(100).optional().nullable(),
  }).optional().nullable(),
  tags: z.array(z.string().trim().max(50)).max(20).optional(),
  customFields: z.array(z.object({
    key: z.string().trim().min(1).max(50),
    value: z.string().trim().max(500).optional().nullable(),
  })).max(20).optional(),
  notes: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
})

function requireWorkspace(request: Request) {
  if (!request.workspace) {
    throw new AppError('Workspace context is required', 400, 'WORKSPACE_REQUIRED')
  }
  return request.workspace
}

function requireCustomerId(request: Request) {
  const customerId = request.params.customerId
  if (!mongoose.isValidObjectId(customerId)) {
    throw new AppError('Customer identifier is invalid', 400, 'INVALID_CUSTOMER_ID')
  }
  return customerId
}

export const listCustomers = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const { page, limit, status, search, tags } = listQuerySchema.parse(request.query)

  const filter: Record<string, unknown> = { workspaceId: workspace.id }
  if (status) filter.status = status
  if (search) {
    filter.$text = { $search: search }
  }
  if (tags) {
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean)
    if (tagArray.length > 0) filter.tags = { $in: tagArray }
  }

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ lastConversationAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Customer.countDocuments(filter),
  ])

  response.json({
    customers,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
})

export const getCustomer = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const customerId = requireCustomerId(request)

  const customer = await Customer.findOne({
    _id: customerId,
    workspaceId: workspace.id,
  }).lean()

  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND')
  }

  // Get conversation count and recent conversations
  const [conversationCount, recentConversations] = await Promise.all([
    Conversation.countDocuments({ customerId: customer._id, workspaceId: workspace.id }),
    Conversation.find({ customerId: customer._id, workspaceId: workspace.id })
      .sort({ lastMessageAt: -1 })
      .limit(5)
      .select('_id status subject lastMessageAt messageCount channel')
      .lean(),
  ])

  response.json({
    customer: { ...customer, conversationCount },
    recentConversations,
  })
})

export const createCustomer = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const input = createCustomerSchema.parse(request.body)

  // Check for duplicate email or externalId
  const existing = await Customer.findOne({
    workspaceId: workspace.id,
    $or: [
      { email: input.email },
      { externalId: input.externalId },
    ].filter(Boolean),
  })

  if (existing) {
    throw new AppError('Customer with this email or external ID already exists', 409, 'CUSTOMER_EXISTS')
  }

  const customer = await Customer.create({
    workspaceId: workspace.id,
    displayName: input.displayName,
    email: input.email ?? null,
    phone: input.phone ?? null,
    avatarUrl: input.avatarUrl ?? null,
    externalId: input.externalId ?? null,
    address: input.address ?? null,
    social: input.social ?? null,
    tags: input.tags ?? [],
    customFields: input.customFields ?? [],
    notes: input.notes ?? null,
    status: input.status ?? 'active',
    source: input.source ?? 'dashboard',
    conversationCount: 0,
    totalMessages: 0,
  })

  response.status(201).json({
    message: 'Customer created successfully',
    customer,
  })
})

export const updateCustomer = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const customerId = requireCustomerId(request)
  const input = updateCustomerSchema.parse(request.body)

  const customer = await Customer.findOne({
    _id: customerId,
    workspaceId: workspace.id,
  })

  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND')
  }

  // Check for duplicate email/externalId if being updated
  if (input.email || input.externalId) {
    const orConditions = []
    if (input.email) orConditions.push({ email: input.email })
    if (input.externalId) orConditions.push({ externalId: input.externalId })
    if (orConditions.length > 0) {
      const existing = await Customer.findOne({
        workspaceId: workspace.id,
        _id: { $ne: customer._id },
        $or: orConditions,
      })
      if (existing) {
        throw new AppError('Another customer with this email or external ID already exists', 409, 'CUSTOMER_EXISTS')
      }
    }
  }

  Object.assign(customer, input)
  await customer.save()

  response.json({
    message: 'Customer updated successfully',
    customer,
  })
})

export const deleteCustomer = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const customerId = requireCustomerId(request)

  const customer = await Customer.findOne({
    _id: customerId,
    workspaceId: workspace.id,
  })

  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND')
  }

  // Check if customer has conversations
  const conversationCount = await Conversation.countDocuments({
    customerId: customer._id,
    workspaceId: workspace.id,
  })

  if (conversationCount > 0) {
    throw new AppError('Cannot delete customer with existing conversations. Block the customer instead.', 409, 'CUSTOMER_HAS_CONVERSATIONS')
  }

  await Customer.deleteOne({ _id: customer._id, workspaceId: workspace.id })

  response.json({
    message: 'Customer deleted successfully',
  })
})

export const getCustomerConversations = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const customerId = requireCustomerId(request)

  const page = Math.max(1, Number(request.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 20))
  const status = request.query.status as string | undefined

  const filter: Record<string, unknown> = { customerId, workspaceId: workspace.id }
  if (status) filter.status = status

  const [conversations, total] = await Promise.all([
    Conversation.find(filter).sort({ lastMessageAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Conversation.countDocuments(filter),
  ])

  response.json({
    conversations,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  })
})

export const getCustomerTimeline = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const customerId = requireCustomerId(request)

  const customer = await Customer.findOne({
    _id: customerId,
    workspaceId: workspace.id,
  }).lean()

  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND')
  }

  const [conversations, messages] = await Promise.all([
    Conversation.find({ customerId, workspaceId: workspace.id })
      .sort({ lastMessageAt: -1 })
      .limit(20)
      .select('_id status subject lastMessageAt messageCount channel assignedTo')
      .lean(),
    Message.find({ customerId: customer._id, workspaceId: workspace.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('_id senderType content createdAt conversationId')
      .lean(),
  ])

  response.json({
    customer,
    conversations,
    recentMessages: messages.reverse(),
  })
})