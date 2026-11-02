import { Schema, model, type InferSchemaType } from 'mongoose'

const knowledgeChunkSchema = new Schema({
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
  documentId: {
    type: Schema.Types.ObjectId,
    ref: 'KnowledgeDocument',
    required: true,
  },
  chunkIndex: {
    type: Number,
    required: true,
    min: 0,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2_000,
  },
  sourceName: {
    type: String,
    required: true,
    maxlength: 255,
  },
  mimeType: {
    type: String,
    required: true,
  },
  pageCount: {
    type: Number,
    min: 1,
    default: null,
  },
  // Populated by the embedding step in Milestone 04. Kept optional for now.
  embedding: {
    type: [Number],
    default: undefined,
  },
}, { timestamps: true })

knowledgeChunkSchema.index(
  { workspaceId: 1, documentId: 1, chunkIndex: 1 },
  { unique: true },
)
knowledgeChunkSchema.index({ workspaceId: 1, documentId: 1 })

export type KnowledgeChunkDocument = InferSchemaType<typeof knowledgeChunkSchema>
export const KnowledgeChunk = model('KnowledgeChunk', knowledgeChunkSchema)
