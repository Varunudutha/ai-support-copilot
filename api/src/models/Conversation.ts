import { Schema, model, type InferSchemaType } from 'mongoose'

export const conversationChannels = ['dashboard', 'widget'] as const
export const conversationStatuses = ['open', 'pending', 'closed'] as const

const conversationSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  channel: {
    type: String,
    enum: conversationChannels,
    required: true,
  },
  status: {
    type: String,
    enum: conversationStatuses,
    default: 'open',
    index: true,
  },
  subject: {
    type: String,
    trim: true,
    maxlength: 160,
    default: null,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true,
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  messageCount: {
    type: Number,
    min: 0,
    default: 0,
  },
  closedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true })

// Include workspaceId in every operational index so inbox queries remain tenant-scoped.
conversationSchema.index({ workspaceId: 1, status: 1, lastMessageAt: -1 })
conversationSchema.index({ workspaceId: 1, customerId: 1, updatedAt: -1 })
conversationSchema.index({ workspaceId: 1, channel: 1, createdAt: -1 })

export type ConversationDocument = InferSchemaType<typeof conversationSchema>
export const Conversation = model('Conversation', conversationSchema)
