import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import {
  WorkspaceSettings,
  WebhookEndpoint,
  WebhookDeliveryLog,
  Integration,
  EmailTemplate,
  UserNotificationPreference,
} from '../models/Settings.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/appError.js'
import { createHmac } from 'crypto'

const workspaceSettingsSchema = z.object({
  workspaceName: z.string().trim().max(100).optional(),
  workspaceDescription: z.string().trim().max(500).optional(),
  timezone: z.string().trim().max(50).optional(),
  language: z.string().trim().max(10).optional(),
  dateFormat: z.string().trim().max(20).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),

  emailFromName: z.string().trim().max(100).optional(),
  emailFromAddress: z.string().trim().email().max(254).optional().nullable(),
  emailReplyToAddress: z.string().trim().email().max(254).optional().nullable(),
  emailSignature: z.string().trim().max(2000).optional(),

  notifyNewConversation: z.boolean().optional(),
  notifyConversationAssigned: z.boolean().optional(),
  notifyConversationEscalated: z.boolean().optional(),
  notifyConversationResolved: z.boolean().optional(),
  notifyCustomerSatisfaction: z.boolean().optional(),
  notifyAiFeedback: z.boolean().optional(),
  notifyDailyDigest: z.boolean().optional(),
  notifyWeeklyReport: z.boolean().optional(),

  sessionTimeoutMinutes: z.number().int().min(15).max(1440).optional(),
  requireMfa: z.boolean().optional(),
  allowedIpRanges: z.array(z.string().trim().max(50)).optional(),
  passwordMinLength: z.number().int().min(8).max(128).optional(),
  passwordRequireUppercase: z.boolean().optional(),
  passwordRequireLowercase: z.boolean().optional(),
  passwordRequireNumbers: z.boolean().optional(),
  passwordRequireSpecialChars: z.boolean().optional(),

  logoUrl: z.string().trim().url().max(500).optional().nullable(),
  faviconUrl: z.string().trim().url().max(500).optional().nullable(),
  primaryColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).optional(),

  customDomain: z.string().trim().max(255).optional(),
  enableWidget: z.boolean().optional(),
  enableKnowledgeBase: z.boolean().optional(),
  enableAiAssistant: z.boolean().optional(),
  enableCustomerPortal: z.boolean().optional(),
  enableSatisfactionSurveys: z.boolean().optional(),
  enableAiFeedback: z.boolean().optional(),
  enableConversationExport: z.boolean().optional(),
  enableConversationImport: z.boolean().optional(),

  maxAgents: z.number().int().min(1).max(1000).optional(),
  maxKnowledgeDocuments: z.number().int().min(0).max(10000).optional(),
  maxStorageMb: z.number().int().min(0).max(100000).optional(),
  maxApiCallsPerMinute: z.number().int().min(10).max(10000).optional(),
})

const webhookEndpointSchema = z.object({
  name: z.string().trim().min(1).max(100),
  url: z.string().trim().url().max(500),
  events: z.array(z.enum([
    'conversation.created',
    'conversation.updated',
    'conversation.closed',
    'conversation.escalated',
    'conversation.assigned',
    'message.created',
    'message.ai_generated',
    'customer.created',
    'customer.updated',
    'satisfaction.submitted',
    'ai_feedback.submitted',
  ])).min(1),
  isActive: z.boolean().nullable().optional(),
  maxDeliveryAttempts: z.number().int().min(1).max(10).optional(),
  retryIntervalMinutes: z.number().int().min(1).max(1440).optional(),
  headers: z.unknown().optional(),
})

const webhookUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  url: z.string().trim().url().max(500).optional(),
  events: z.array(z.enum([
    'conversation.created',
    'conversation.updated',
    'conversation.closed',
    'conversation.escalated',
    'conversation.assigned',
    'message.created',
    'message.ai_generated',
    'customer.created',
    'customer.updated',
    'satisfaction.submitted',
    'ai_feedback.submitted',
  ])).min(1).optional(),
  isActive: z.boolean().nullable().optional(),
  maxDeliveryAttempts: z.number().int().min(1).max(10).optional(),
  retryIntervalMinutes: z.number().int().min(1).max(1440).optional(),
  headers: z.unknown().optional(),
})

const integrationSchema = z.object({
  type: z.enum(['slack', 'teams', 'email', 'webhook', 'zapier', 'custom']),
  name: z.string().trim().min(1).max(100),
  config: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().nullable().optional(),
  fieldMappings: z.record(z.string(), z.string()).optional(),
})

const integrationUpdateSchema = z.object({
  type: z.enum(['slack', 'teams', 'email', 'webhook', 'zapier', 'custom']).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().nullable().optional(),
  fieldMappings: z.record(z.string(), z.string()).optional(),
})

const emailTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  subject: z.string().trim().max(200),
  htmlContent: z.string().max(50000).optional(),
  textContent: z.string().max(10000).optional(),
  variables: z.array(z.string().trim().max(50)).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().nullable().optional(),
})

const emailTemplateUpdateSchema = emailTemplateSchema.partial()

function requireWorkspace(request: Request) {
  if (!request.workspace) {
    throw new AppError('Workspace context is required', 400, 'WORKSPACE_REQUIRED')
  }
  return request.workspace
}

function requireObjectId(request: Request, param: string) {
  const id = request.params[param]
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`${param} is invalid`, 400, `INVALID_${param.toUpperCase()}`)
  }
  return id
}

// ============ Workspace Settings ============

export const getWorkspaceSettings = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)

  let settings = await WorkspaceSettings.findOne({ workspaceId: workspace.id }).lean()

  if (!settings) {
    // Return defaults
    const now = new Date()
    settings = {
      _id: new mongoose.Types.ObjectId(),
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      workspaceName: '',
      workspaceDescription: '',
      timezone: 'UTC',
      language: 'en',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      emailFromName: '',
      emailFromAddress: '',
      emailReplyToAddress: '',
      emailSignature: '',
      notifyNewConversation: true,
      notifyConversationAssigned: true,
      notifyConversationEscalated: true,
      notifyConversationResolved: true,
      notifyCustomerSatisfaction: true,
      notifyAiFeedback: true,
      notifyDailyDigest: false,
      notifyWeeklyReport: false,
      sessionTimeoutMinutes: 480,
      requireMfa: false,
      allowedIpRanges: [],
      passwordMinLength: 10,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecialChars: true,
      logoUrl: '',
      faviconUrl: '',
      primaryColor: '#5968e8',
      secondaryColor: '#4855d5',
      customDomain: '',
      customDomainVerified: false,
      customDomainVerificationToken: '',
      enableWidget: true,
      enableKnowledgeBase: true,
      enableAiAssistant: true,
      enableCustomerPortal: false,
      enableSatisfactionSurveys: true,
      enableAiFeedback: true,
      enableConversationExport: true,
      enableConversationImport: false,
      maxAgents: 10,
      maxKnowledgeDocuments: 100,
      maxStorageMb: 1000,
      maxApiCallsPerMinute: 60,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    }
  }

  response.json(settings)
})

export const updateWorkspaceSettings = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const input = workspaceSettingsSchema.parse(request.body)

  const settings = await WorkspaceSettings.findOneAndUpdate(
    { workspaceId: workspace.id },
    { $set: input },
    { new: true, upsert: true, runValidators: true },
  )

  response.json({
    message: 'Workspace settings updated successfully',
    settings,
  })
})

// ============ Webhook Endpoints ============

export const listWebhookEndpoints = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)

  const webhooks = await WebhookEndpoint.find({ workspaceId: workspace.id })
    .sort({ createdAt: -1 })
    .lean()

  response.json({ webhooks })
})

export const getWebhookEndpoint = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const webhookId = requireObjectId(request, 'webhookId')

  const webhook = await WebhookEndpoint.findOne({
    _id: webhookId,
    workspaceId: workspace.id,
  }).lean()

  if (!webhook) {
    throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND')
  }

  // Don't return the secret
  const { secret, ...webhookWithoutSecret } = webhook
  response.json({ webhook: webhookWithoutSecret })
})

export const createWebhookEndpoint = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const input = webhookEndpointSchema.parse(request.body)

  // Generate secret
  const crypto = await import('crypto')
  const secret = crypto.randomBytes(32).toString('hex')

  const webhook = await WebhookEndpoint.create({
    workspaceId: workspace.id,
    name: input.name,
    url: input.url,
    secret,
    events: input.events,
    isActive: input.isActive ?? true,
    maxDeliveryAttempts: input.maxDeliveryAttempts ?? 3,
    retryIntervalMinutes: input.retryIntervalMinutes ?? 5,
    headers: input.headers ?? {},
  })

  const { secret: _, ...webhookWithoutSecret } = webhook.toObject()
  response.status(201).json({
    message: 'Webhook created successfully',
    webhook: webhookWithoutSecret,
    secret, // Only returned once on creation
  })
})

export const updateWebhookEndpoint = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const webhookId = requireObjectId(request, 'webhookId')
  const input = webhookUpdateSchema.parse(request.body)

  const webhook = await WebhookEndpoint.findOneAndUpdate(
    { _id: webhookId, workspaceId: workspace.id },
    { $set: input },
    { new: true, runValidators: true },
  )

  if (!webhook) {
    throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND')
  }

  const { secret, ...webhookWithoutSecret } = webhook.toObject()
  response.json({
    message: 'Webhook updated successfully',
    webhook: webhookWithoutSecret,
  })
})

export const deleteWebhookEndpoint = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const webhookId = requireObjectId(request, 'webhookId')

  const result = await WebhookEndpoint.deleteOne({
    _id: webhookId,
    workspaceId: workspace.id,
  })

  if (result.deletedCount === 0) {
    throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND')
  }

  response.json({ message: 'Webhook deleted successfully' })
})

export const rotateWebhookSecret = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const webhookId = requireObjectId(request, 'webhookId')

  const crypto = await import('crypto')
  const secret = crypto.randomBytes(32).toString('hex')

  const webhook = await WebhookEndpoint.findOneAndUpdate(
    { _id: webhookId, workspaceId: workspace.id },
    { $set: { secret, secretRotationAt: new Date() } },
    { new: true },
  )

  if (!webhook) {
    throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND')
  }

  const { secret: _, ...webhookWithoutSecret } = webhook.toObject()
  response.json({
    message: 'Webhook secret rotated successfully',
    webhook: webhookWithoutSecret,
    secret, // Only returned once on rotation
  })
})

export const getWebhookDeliveryLogs = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  // webhookId is validated by requireObjectId but not used directly in query
  requireObjectId(request, 'webhookId')

  const page = Math.max(1, Number(request.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 50))

  const filter: Record<string, unknown> = { workspaceId: workspace.id }
  filter.webhookId = new mongoose.Types.ObjectId(request.params.webhookId)

  const [logs, total] = await Promise.all([
    WebhookDeliveryLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WebhookDeliveryLog.countDocuments(filter),
  ])

  response.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
})

export const testWebhookEndpoint = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const webhookId = requireObjectId(request, 'webhookId')

  const webhook = await WebhookEndpoint.findOne({
    _id: webhookId,
    workspaceId: workspace.id,
  })

  if (!webhook) {
    throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND')
  }

  // Send test payload
  const testPayload = {
    event: 'webhook.test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook from AI Support Copilot',
      workspaceId: workspace.id.toString(),
      webhookId: webhookId.toString(),
    },
  }

  const startTime = Date.now()
  let status = 'failed'
  let error = ''
  let responseStatus = 0
  let responseBody = ''

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(webhook.url ?? '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': createHmac('sha256', webhook.secret ?? '')
          .update(JSON.stringify(testPayload))
          .digest('hex'),
        ...Object.fromEntries(webhook.headers ?? new Map()),
      },
      body: JSON.stringify(testPayload),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    responseStatus = response.status
    responseBody = await response.text()

    if (response.ok) {
      status = 'success'
    } else {
      status = 'failed'
      error = `HTTP ${response.status}: ${responseBody}`
    }
  } catch (err) {
    status = 'failed'
    error = err instanceof Error ? err.message : 'Unknown error'
  }

  const responseTimeMs = Date.now() - startTime

  // Log the delivery
  await WebhookDeliveryLog.create({
    workspaceId: workspace.id,
    webhookId: webhook._id,
    event: 'webhook.test',
    payload: testPayload,
    requestHeaders: { 'Content-Type': 'application/json' },
    responseStatus,
    responseBody: responseBody.slice(0, 10000),
    responseTimeMs,
    attempt: 1,
    status: status === 'success' ? 'success' : 'failed',
    error,
  })

  response.json({
    message: 'Test webhook sent',
    status,
    responseTimeMs,
    responseStatus,
    error: error || undefined,
  })
})

// ============ Integrations ============

export const listIntegrations = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)

  const integrations = await Integration.find({ workspaceId: workspace.id })
    .sort({ createdAt: -1 })
    .lean()

  // Don't return credentials
  const safeIntegrations = integrations.map((i) => {
    const { credentials, ...rest } = i
    return rest
  })

  response.json({ integrations: safeIntegrations })
})

export const getIntegration = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const integrationId = requireObjectId(request, 'integrationId')

  const integration = await Integration.findOne({
    _id: integrationId,
    workspaceId: workspace.id,
  }).lean()

  if (!integration) {
    throw new AppError('Integration not found', 404, 'INTEGRATION_NOT_FOUND')
  }

  const { credentials, ...safeIntegration } = integration
  response.json({ integration: safeIntegration })
})

export const createIntegration = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const input = integrationSchema.parse(request.body)

  const integration = await Integration.create({
    workspaceId: workspace.id,
    type: input.type,
    name: input.name,
    config: input.config ?? {},
    credentials: {},
    isActive: input.isActive ?? false,
    fieldMappings: input.fieldMappings ?? {},
  })

  const { credentials, ...safeIntegration } = integration.toObject()
  response.status(201).json({
    message: 'Integration created successfully',
    integration: safeIntegration,
  })
})

export const updateIntegration = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const integrationId = requireObjectId(request, 'integrationId')
  const input = integrationUpdateSchema.parse(request.body)

  const integration = await Integration.findOneAndUpdate(
    { _id: integrationId, workspaceId: workspace.id },
    { $set: input },
    { new: true, runValidators: true },
  )

  if (!integration) {
    throw new AppError('Integration not found', 404, 'INTEGRATION_NOT_FOUND')
  }

  const { credentials, ...safeIntegration } = integration.toObject()
  response.json({
    message: 'Integration updated successfully',
    integration: safeIntegration,
  })
})

export const deleteIntegration = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const integrationId = requireObjectId(request, 'integrationId')

  const result = await Integration.deleteOne({
    _id: integrationId,
    workspaceId: workspace.id,
  })

  if (result.deletedCount === 0) {
    throw new AppError('Integration not found', 404, 'INTEGRATION_NOT_FOUND')
  }

  response.json({ message: 'Integration deleted successfully' })
})

export const testIntegration = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const integrationId = requireObjectId(request, 'integrationId')

  const integration = await Integration.findOne({
    _id: integrationId,
    workspaceId: workspace.id,
  })

  if (!integration) {
    throw new AppError('Integration not found', 404, 'INTEGRATION_NOT_FOUND')
  }

  // Test based on integration type
  let status = 'failed'
  let error = ''

  try {
    // This would be implemented based on integration type
    // For now, just validate config
    if (!integration.config || Object.keys(integration.config).length === 0) {
      throw new Error('Integration not configured')
    }
    status = 'success'
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error'
  }

  // Update last sync
  await Integration.findByIdAndUpdate(integration._id, {
    $set: {
      lastSyncAt: new Date(),
      lastSyncStatus: status,
      lastSyncError: error,
    },
  })

  response.json({
    message: 'Integration test completed',
    status,
    error: error || undefined,
  })
})

// ============ Email Templates ============

export const listEmailTemplates = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)

  const templates = await EmailTemplate.find({ workspaceId: workspace.id })
    .sort({ createdAt: -1 })
    .lean()

  response.json({ templates })
})

export const getEmailTemplate = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  const templateId = requireObjectId(request, 'templateId')

  const template = await EmailTemplate.findOne({
    _id: templateId,
    workspaceId: workspace.id,
  }).lean()

  if (!template) {
    throw new AppError('Email template not found', 404, 'TEMPLATE_NOT_FOUND')
  }

  response.json({ template })
})

export const createEmailTemplate = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const input = emailTemplateSchema.parse(request.body)

  // If this is default, unset other defaults
  if (input.isDefault) {
    await EmailTemplate.updateMany(
      { workspaceId: workspace.id, isDefault: true },
      { $set: { isDefault: false } },
    )
  }

  const template = await EmailTemplate.create({
    workspaceId: workspace.id,
    name: input.name,
    subject: input.subject,
    htmlContent: input.htmlContent ?? '',
    textContent: input.textContent ?? '',
    variables: input.variables ?? [],
    isDefault: input.isDefault ?? false,
    isActive: input.isActive ?? true,
  })

  response.status(201).json({
    message: 'Email template created successfully',
    template,
  })
})

export const updateEmailTemplate = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const templateId = requireObjectId(request, 'templateId')
  const input = emailTemplateUpdateSchema.parse(request.body)

  if (input.isDefault) {
    await EmailTemplate.updateMany(
      { workspaceId: workspace.id, isDefault: true, _id: { $ne: templateId } },
      { $set: { isDefault: false } },
    )
  }

  const template = await EmailTemplate.findOneAndUpdate(
    { _id: templateId, workspaceId: workspace.id },
    { $set: input },
    { new: true, runValidators: true },
  )

  if (!template) {
    throw new AppError('Email template not found', 404, 'TEMPLATE_NOT_FOUND')
  }

  response.json({
    message: 'Email template updated successfully',
    template,
  })
})

export const deleteEmailTemplate = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const templateId = requireObjectId(request, 'templateId')

  const template = await EmailTemplate.findOne({
    _id: templateId,
    workspaceId: workspace.id,
  })

  if (!template) {
    throw new AppError('Email template not found', 404, 'TEMPLATE_NOT_FOUND')
  }

  if (template.isDefault) {
    throw new AppError('Cannot delete default template', 409, 'CANNOT_DELETE_DEFAULT_TEMPLATE')
  }

  await EmailTemplate.deleteOne({ _id: templateId, workspaceId: workspace.id })

  response.json({ message: 'Email template deleted successfully' })
})

// ============ User Notification Preferences ============

export const getUserNotificationPreferences = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  let prefs = await UserNotificationPreference.findOne({
    userId: request.authUser.id,
    workspaceId: workspace.id,
  }).lean()

  if (!prefs) {
    // Return defaults
    const now = new Date()
    prefs = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(request.authUser.id),
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      emailNewConversation: true,
      emailConversationAssigned: true,
      emailConversationEscalated: true,
      emailConversationResolved: true,
      emailCustomerSatisfaction: true,
      emailAiFeedback: true,
      emailDailyDigest: false,
      emailWeeklyReport: false,
      inAppNewConversation: true,
      inAppConversationAssigned: true,
      inAppConversationEscalated: true,
      inAppConversationResolved: true,
      inAppCustomerSatisfaction: true,
      inAppAiFeedback: true,
      pushNewConversation: false,
      pushConversationAssigned: false,
      pushConversationEscalated: false,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    }
  }

  response.json({ preferences: prefs })
})

export const updateUserNotificationPreferences = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const allowedFields = [
    'emailNewConversation',
    'emailConversationAssigned',
    'emailConversationEscalated',
    'emailConversationResolved',
    'emailCustomerSatisfaction',
    'emailAiFeedback',
    'emailDailyDigest',
    'emailWeeklyReport',
    'inAppNewConversation',
    'inAppConversationAssigned',
    'inAppConversationEscalated',
    'inAppConversationResolved',
    'inAppCustomerSatisfaction',
    'inAppAiFeedback',
    'pushNewConversation',
    'pushConversationAssigned',
    'pushConversationEscalated',
  ]

  const updates: Record<string, boolean> = {}
  for (const field of allowedFields) {
    if (field in request.body) {
      updates[field] = request.body[field]
    }
  }

  const prefs = await UserNotificationPreference.findOneAndUpdate(
    { userId: request.authUser.id, workspaceId: workspace.id },
    { $set: updates },
    { new: true, upsert: true, runValidators: true },
  )

  response.json({
    message: 'Notification preferences updated successfully',
    preferences: prefs,
  })
})