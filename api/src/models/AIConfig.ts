import { Schema, model, type InferSchemaType } from 'mongoose'

const aiConfigSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    unique: true,
    index: true,
  },
  // Custom instructions for the AI
  customInstructions: {
    type: String,
    trim: true,
    maxlength: 5000,
    default: '',
  },
  // Response behavior
  responseLength: {
    type: String,
    enum: ['short', 'medium', 'detailed'],
    default: 'medium',
  },
  tone: {
    type: String,
    enum: ['professional', 'friendly', 'casual', 'empathetic'],
    default: 'professional',
  },
  language: {
    type: String,
    trim: true,
    maxlength: 50,
    default: 'auto',
  },
  // Escalation settings
  escalationThreshold: {
    type: Number,
    min: 0,
    max: 100,
    default: 70,
  },
  autoEscalate: {
    type: Boolean,
    default: true,
  },
  // Response behavior
  includeSources: {
    type: Boolean,
    default: true,
  },
  maxSources: {
    type: Number,
    min: 1,
    max: 10,
    default: 5,
  },
  // Fallback behavior
  fallbackMessage: {
    type: String,
    trim: true,
    maxlength: 500,
    default: 'I could not find that information in this workspace knowledge base.',
  },
  // Conversation context
  maxConversationHistory: {
    type: Number,
    min: 0,
    max: 20,
    default: 5,
  },
  // Confidence scoring
  confidenceThreshold: {
    type: Number,
    min: 0,
    max: 100,
    default: 50,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

aiConfigSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

export type AIConfigDocument = InferSchemaType<typeof aiConfigSchema>
export const AIConfig = model('AIConfig', aiConfigSchema)