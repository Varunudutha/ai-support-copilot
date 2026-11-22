import { Schema, model, type InferSchemaType } from 'mongoose'

// Workspace settings
const workspaceSettingsSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    unique: true,
    index: true,
  },
  // General settings
  workspaceName: { type: String, trim: true, maxlength: 100, default: '' },
  workspaceDescription: { type: String, trim: true, maxlength: 500, default: '' },
  timezone: { type: String, trim: true, maxlength: 50, default: 'UTC' },
  language: { type: String, trim: true, maxlength: 10, default: 'en' },
  dateFormat: { type: String, trim: true, maxlength: 20, default: 'YYYY-MM-DD' },
  timeFormat: { type: String, enum: ['12h', '24h'], default: '24h' },

  // Email settings
  emailFromName: { type: String, trim: true, maxlength: 100, default: '' },
  emailFromAddress: { type: String, trim: true, maxlength: 254, default: '' },
  emailReplyToAddress: { type: String, trim: true, maxlength: 254, default: '' },
  emailSignature: { type: String, trim: true, maxlength: 2000, default: '' },

  // Notification preferences
  notifyNewConversation: { type: Boolean, default: true },
  notifyConversationAssigned: { type: Boolean, default: true },
  notifyConversationEscalated: { type: Boolean, default: true },
  notifyConversationResolved: { type: Boolean, default: true },
  notifyCustomerSatisfaction: { type: Boolean, default: true },
  notifyAiFeedback: { type: Boolean, default: true },
  notifyDailyDigest: { type: Boolean, default: false },
  notifyWeeklyReport: { type: Boolean, default: false },

  // Security settings
  sessionTimeoutMinutes: { type: Number, min: 15, max: 1440, default: 480 },
  requireMfa: { type: Boolean, default: false },
  allowedIpRanges: [{ type: String, trim: true, maxlength: 50 }],
  passwordMinLength: { type: Number, min: 8, max: 128, default: 10 },
  passwordRequireUppercase: { type: Boolean, default: true },
  passwordRequireLowercase: { type: Boolean, default: true },
  passwordRequireNumbers: { type: Boolean, default: true },
  passwordRequireSpecialChars: { type: Boolean, default: true },

  // Branding
  logoUrl: { type: String, trim: true, maxlength: 500, default: '' },
  faviconUrl: { type: String, trim: true, maxlength: 500, default: '' },
  primaryColor: { type: String, trim: true, maxlength: 7, match: /^#[0-9A-Fa-f]{6}$/, default: '#5968e8' },
  secondaryColor: { type: String, trim: true, maxlength: 7, match: /^#[0-9A-Fa-f]{6}$/, default: '#4855d5' },

  // Custom domain
  customDomain: { type: String, trim: true, maxlength: 255, default: '' },
  customDomainVerified: { type: Boolean, default: false },
  customDomainVerificationToken: { type: String, trim: true, maxlength: 100, default: '' },

  // Feature flags
  enableWidget: { type: Boolean, default: true },
  enableKnowledgeBase: { type: Boolean, default: true },
  enableAiAssistant: { type: Boolean, default: true },
  enableCustomerPortal: { type: Boolean, default: false },
  enableSatisfactionSurveys: { type: Boolean, default: true },
  enableAiFeedback: { type: Boolean, default: true },
  enableConversationExport: { type: Boolean, default: true },
  enableConversationImport: { type: Boolean, default: false },

  // Limits
  maxAgents: { type: Number, min: 1, max: 1000, default: 10 },
  maxKnowledgeDocuments: { type: Number, min: 0, max: 10000, default: 100 },
  maxStorageMb: { type: Number, min: 0, max: 100000, default: 1000 },
  maxApiCallsPerMinute: { type: Number, min: 10, max: 10000, default: 60 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

// Webhook endpoints
const webhookEndpointSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  name: { type: String, trim: true, minlength: 1, maxlength: 100 },
  url: { type: String, trim: true, maxlength: 500 },
  secret: { type: String, trim: true, maxlength: 100 },
  events: [{
    type: String,
    enum: [
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
    ],
  }],
  isActive: { type: Boolean, default: true },
  secretRotationAt: { type: Date, default: null },
  lastDeliveryAt: { type: Date, default: null },
  lastDeliveryStatus: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },
  lastDeliveryError: { type: String, trim: true, maxlength: 500, default: '' },
  deliveryAttempts: { type: Number, default: 0 },
  maxDeliveryAttempts: { type: Number, min: 1, max: 10, default: 3 },
  retryIntervalMinutes: { type: Number, min: 1, max: 1440, default: 5 },
  headers: { type: Map, of: String, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

webhookEndpointSchema.index({ workspaceId: 1, isActive: 1 })

// Webhook delivery logs
const webhookDeliveryLogSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  webhookId: {
    type: Schema.Types.ObjectId,
    ref: 'WebhookEndpoint',
    required: true,
    index: true,
  },
  event: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  requestHeaders: { type: Map, of: String, default: {} },
  responseStatus: { type: Number },
  responseBody: { type: String, maxlength: 10000 },
  responseTimeMs: { type: Number },
  attempt: { type: Number, default: 1 },
  status: { type: String, enum: ['success', 'failed', 'retrying'], default: 'pending' },
  error: { type: String, trim: true, maxlength: 500, default: '' },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
}, { timestamps: true })

webhookDeliveryLogSchema.index({ workspaceId: 1, createdAt: -1 })
webhookDeliveryLogSchema.index({ webhookId: 1, createdAt: -1 })

// Integration configs (Slack, Teams, etc.)
const integrationSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['slack', 'teams', 'email', 'webhook', 'zapier', 'custom'],
    required: true,
  },
  name: { type: String, trim: true, minlength: 1, maxlength: 100 },
  config: { type: Schema.Types.Mixed, default: {} },
  credentials: { type: Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: false },
  lastSyncAt: { type: Date, default: null },
  lastSyncStatus: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },
  lastSyncError: { type: String, trim: true, maxlength: 500, default: '' },
  fieldMappings: { type: Map, of: String, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

integrationSchema.index({ workspaceId: 1, type: 1, isActive: 1 })

// Email templates
const emailTemplateSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  name: { type: String, trim: true, minlength: 1, maxlength: 100 },
  subject: { type: String, trim: true, maxlength: 200 },
  htmlContent: { type: String, maxlength: 50000 },
  textContent: { type: String, maxlength: 10000 },
  variables: [{ type: String, trim: true, maxlength: 50 }],
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

emailTemplateSchema.index({ workspaceId: 1, name: 1 }, { unique: true })

// Notification preferences per user
const userNotificationPreferenceSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  // Email notifications
  emailNewConversation: { type: Boolean, default: true },
  emailConversationAssigned: { type: Boolean, default: true },
  emailConversationEscalated: { type: Boolean, default: true },
  emailConversationResolved: { type: Boolean, default: true },
  emailCustomerSatisfaction: { type: Boolean, default: true },
  emailAiFeedback: { type: Boolean, default: true },
  emailDailyDigest: { type: Boolean, default: false },
  emailWeeklyReport: { type: Boolean, default: false },
  // In-app notifications
  inAppNewConversation: { type: Boolean, default: true },
  inAppConversationAssigned: { type: Boolean, default: true },
  inAppConversationEscalated: { type: Boolean, default: true },
  inAppConversationResolved: { type: Boolean, default: true },
  inAppCustomerSatisfaction: { type: Boolean, default: true },
  inAppAiFeedback: { type: Boolean, default: true },
  // Push notifications (future)
  pushNewConversation: { type: Boolean, default: false },
  pushConversationAssigned: { type: Boolean, default: false },
  pushConversationEscalated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

userNotificationPreferenceSchema.index({ userId: 1, workspaceId: 1 }, { unique: true })

export type WorkspaceSettingsDocument = InferSchemaType<typeof workspaceSettingsSchema>
export const WorkspaceSettings = model('WorkspaceSettings', workspaceSettingsSchema)

export type WebhookEndpointDocument = InferSchemaType<typeof webhookEndpointSchema>
export const WebhookEndpoint = model('WebhookEndpoint', webhookEndpointSchema)

export type WebhookDeliveryLogDocument = InferSchemaType<typeof webhookDeliveryLogSchema>
export const WebhookDeliveryLog = model('WebhookDeliveryLog', webhookDeliveryLogSchema)

export type IntegrationDocument = InferSchemaType<typeof integrationSchema>
export const Integration = model('Integration', integrationSchema)

export type EmailTemplateDocument = InferSchemaType<typeof emailTemplateSchema>
export const EmailTemplate = model('EmailTemplate', emailTemplateSchema)

export type UserNotificationPreferenceDocument = InferSchemaType<typeof userNotificationPreferenceSchema>
export const UserNotificationPreference = model('UserNotificationPreference', userNotificationPreferenceSchema)