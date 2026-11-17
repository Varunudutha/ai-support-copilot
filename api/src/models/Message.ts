import { Schema, model, type InferSchemaType } from 'mongoose'

export const messageSenderTypes = ['customer', 'assistant', 'agent', 'system'] as const

const messageCitationSchema = new Schema({
  citationId: { type: String, required: true, trim: true, maxlength: 120 },
  id: { type: String, required: true, trim: true, maxlength: 120 },
  documentId: {
    type: Schema.Types.ObjectId,
    ref: 'KnowledgeDocument',
    required: true,
  },
  chunkIndex: { type: Number, required: true, min: 0 },
  sourceName: { type: String, required: true, trim: true, maxlength: 255 },
  mimeType: { type: String, required: true, trim: true, maxlength: 160 },
  pageCount: { type: Number, min: 1, default: null },
  score: { type: Number, required: true, min: 0 },
  excerpt: { type: String, required: true, maxlength: 4000 },
}, { _id: false })

const messageSchema = new Schema({
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
  senderType: {
    type: String,
    enum: messageSenderTypes,
    required: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 20_000,
  },
  citations: {
    type: [messageCitationSchema],
    default: [],
  },
}, { timestamps: true })

messageSchema.index({ workspaceId: 1, conversationId: 1, createdAt: 1 })
messageSchema.index({ workspaceId: 1, createdAt: -1 })

export type MessageDocument = InferSchemaType<typeof messageSchema>
export const Message = model('Message', messageSchema)
