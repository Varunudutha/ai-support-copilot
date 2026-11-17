import { Schema, model, type InferSchemaType } from 'mongoose'

export const conversationChannels = ['dashboard', 'widget'] as const
export const conversationStatuses = ['open', 'pending', 'closed'] as const

const customerSchema = new Schema({
  displayName: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  email: { type: String, lowercase: true, trim: true, maxlength: 254, default: null },
  externalId: { type: String, trim: true, maxlength: 160, default: null },
}, { _id: false })

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
  customer: {
    type: customerSchema,
    required: true,
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
conversationSchema.index({ workspaceId: 1, 'customer.email': 1, updatedAt: -1 })
conversationSchema.index({ workspaceId: 1, channel: 1, createdAt: -1 })

export type ConversationDocument = InferSchemaType<typeof conversationSchema>
export const Conversation = model('Conversation', conversationSchema)
