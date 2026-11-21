import { Schema, model, type InferSchemaType } from 'mongoose'

export const widgetTheme = ['light', 'dark', 'system'] as const
export const widgetPosition = ['bottom-right', 'bottom-left'] as const

const widgetConfigSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    unique: true,
    index: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    trim: true,
    maxlength: 80,
    default: 'Chat with us',
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: 160,
    default: 'We typically reply within a few minutes',
  },
  primaryColor: {
    type: String,
    trim: true,
    maxlength: 7,
    match: /^#[0-9A-Fa-f]{6}$/,
    default: '#5968e8',
  },
  position: {
    type: String,
    enum: widgetPosition,
    default: 'bottom-right',
  },
  theme: {
    type: String,
    enum: widgetTheme,
    default: 'system',
  },
  greetingMessage: {
    type: String,
    trim: true,
    maxlength: 500,
    default: 'Hi! How can we help you today?',
  },
  offlineMessage: {
    type: String,
    trim: true,
    maxlength: 500,
    default: 'We\'re not online right now. Leave a message and we\'ll get back to you via email.',
  },
  requireEmail: {
    type: Boolean,
    default: true,
  },
  showAgentAvatar: {
    type: Boolean,
    default: true,
  },
  allowedOrigins: [{
    type: String,
    trim: true,
    maxlength: 255,
  }],
  rateLimit: {
    maxMessagesPerMinute: {
      type: Number,
      min: 1,
      max: 60,
      default: 10,
    },
    maxConversationsPerHour: {
      type: Number,
      min: 1,
      max: 100,
      default: 5,
    },
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

widgetConfigSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

export type WidgetConfigDocument = InferSchemaType<typeof widgetConfigSchema>
export const WidgetConfig = model('WidgetConfig', widgetConfigSchema)