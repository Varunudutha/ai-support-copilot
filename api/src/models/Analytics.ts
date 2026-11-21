import { Schema, model, type InferSchemaType } from 'mongoose'

// Pre-aggregated daily conversation metrics
const dailyConversationMetricsSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  totalConversations: { type: Number, default: 0 },
  aiResolved: { type: Number, default: 0 },
  humanResolved: { type: Number, default: 0 },
  escalated: { type: Number, default: 0 },
  open: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  closed: { type: Number, default: 0 },
  avgResponseTimeMs: { type: Number, default: 0 },
  avgResolutionTimeMs: { type: Number, default: 0 },
  customerSatisfactionSum: { type: Number, default: 0 },
  customerSatisfactionCount: { type: Number, default: 0 },
  channelDashboard: { type: Number, default: 0 },
  channelWidget: { type: Number, default: 0 },
  aiMessages: { type: Number, default: 0 },
  humanMessages: { type: Number, default: 0 },
  customerMessages: { type: Number, default: 0 },
}, { timestamps: true })

dailyConversationMetricsSchema.index({ workspaceId: 1, date: 1 }, { unique: true })
dailyConversationMetricsSchema.index({ workspaceId: 1, date: -1 })

// Agent performance metrics
const agentPerformanceSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  agentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  conversationsAssigned: { type: Number, default: 0 },
  conversationsResolved: { type: Number, default: 0 },
  conversationsEscalated: { type: Number, default: 0 },
  avgResponseTimeMs: { type: Number, default: 0 },
  avgResolutionTimeMs: { type: Number, default: 0 },
  messagesSent: { type: Number, default: 0 },
  customerSatisfactionSum: { type: Number, default: 0 },
  customerSatisfactionCount: { type: Number, default: 0 },
  firstResponseTimeMs: { type: Number, default: 0 },
}, { timestamps: true })

agentPerformanceSchema.index({ workspaceId: 1, agentId: 1, date: 1 }, { unique: true })

// Customer satisfaction surveys
const satisfactionSurveySchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: 2000,
    default: null,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true })

satisfactionSurveySchema.index({ workspaceId: 1, conversationId: 1 }, { unique: true })

// AI response feedback
const aiFeedbackSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
    index: true,
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  feedback: {
    type: String,
    enum: ['helpful', 'not_helpful'],
    required: true,
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: null,
  },
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true })

aiFeedbackSchema.index({ workspaceId: 1, messageId: 1 }, { unique: true })

export type DailyConversationMetricsDocument = InferSchemaType<typeof dailyConversationMetricsSchema>
export const DailyConversationMetrics = model('DailyConversationMetrics', dailyConversationMetricsSchema)

export type AgentPerformanceDocument = InferSchemaType<typeof agentPerformanceSchema>
export const AgentPerformance = model('AgentPerformance', agentPerformanceSchema)

export type SatisfactionSurveyDocument = InferSchemaType<typeof satisfactionSurveySchema>
export const SatisfactionSurvey = model('SatisfactionSurvey', satisfactionSurveySchema)

export type AIFeedbackDocument = InferSchemaType<typeof aiFeedbackSchema>
export const AIFeedback = model('AIFeedback', aiFeedbackSchema)