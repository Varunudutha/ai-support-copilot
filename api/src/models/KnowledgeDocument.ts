import { Schema, model, type InferSchemaType } from 'mongoose'

export const knowledgeDocumentMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const

const knowledgeDocumentSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  originalName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
  },
  storageKey: {
    type: String,
    required: true,
    unique: true,
  },
  mimeType: {
    type: String,
    required: true,
    enum: knowledgeDocumentMimeTypes,
  },
  fileSize: {
    type: Number,
    required: true,
    min: 1,
    max: 10 * 1024 * 1024,
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'ready', 'failed'],
    default: 'uploaded',
    index: true,
  },
  errorMessage: {
    type: String,
    maxlength: 500,
    default: null,
  },
}, { timestamps: true })

knowledgeDocumentSchema.index({ workspaceId: 1, createdAt: -1 })

export type KnowledgeDocumentDocument = InferSchemaType<typeof knowledgeDocumentSchema>
export const KnowledgeDocument = model('KnowledgeDocument', knowledgeDocumentSchema)
