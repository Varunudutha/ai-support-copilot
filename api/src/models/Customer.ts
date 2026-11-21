import { Schema, model, type InferSchemaType } from 'mongoose'

const customerAddressSchema = new Schema({
  street: { type: String, trim: true, maxlength: 200, default: null },
  city: { type: String, trim: true, maxlength: 100, default: null },
  state: { type: String, trim: true, maxlength: 100, default: null },
  postalCode: { type: String, trim: true, maxlength: 20, default: null },
  country: { type: String, trim: true, maxlength: 100, default: null },
}, { _id: false })

const customerSocialSchema = new Schema({
  twitter: { type: String, trim: true, maxlength: 100, default: null },
  linkedin: { type: String, trim: true, maxlength: 100, default: null },
  facebook: { type: String, trim: true, maxlength: 100, default: null },
  instagram: { type: String, trim: true, maxlength: 100, default: null },
}, { _id: false })

const customerCustomFieldSchema = new Schema({
  key: { type: String, required: true, trim: true, maxlength: 50 },
  value: { type: String, trim: true, maxlength: 500, default: null },
}, { _id: false })

const customerSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    maxlength: 254,
    default: null,
    index: true,
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 50,
    default: null,
  },
  avatarUrl: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null,
  },
  externalId: {
    type: String,
    trim: true,
    maxlength: 160,
    default: null,
    index: true,
  },
  address: {
    type: customerAddressSchema,
    default: null,
  },
  social: {
    type: customerSocialSchema,
    default: null,
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
  }],
  customFields: [customerCustomFieldSchema],
  notes: {
    type: String,
    trim: true,
    maxlength: 5000,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active',
    index: true,
  },
  source: {
    type: String,
    enum: ['dashboard', 'widget', 'import', 'api'],
    default: 'dashboard',
  },
  firstConversationAt: {
    type: Date,
    default: null,
  },
  lastConversationAt: {
    type: Date,
    default: null,
  },
  conversationCount: {
    type: Number,
    min: 0,
    default: 0,
  },
  totalMessages: {
    type: Number,
    min: 0,
    default: 0,
  },
}, { timestamps: true })

// Compound indexes for common queries
customerSchema.index({ workspaceId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $ne: null } } })
customerSchema.index({ workspaceId: 1, externalId: 1 }, { unique: true, partialFilterExpression: { externalId: { $ne: null } } })
customerSchema.index({ workspaceId: 1, status: 1, lastConversationAt: -1 })
customerSchema.index({ workspaceId: 1, tags: 1 })
customerSchema.index({ workspaceId: 1, displayName: 'text', email: 'text' })

export type CustomerDocument = InferSchemaType<typeof customerSchema>
export const Customer = model('Customer', customerSchema)