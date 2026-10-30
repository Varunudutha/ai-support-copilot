import { Schema, model, type InferSchemaType } from 'mongoose'

const workspaceSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  industry: { type: String, trim: true, maxlength: 80, default: 'General' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: String, enum: ['free', 'pro', 'business'], default: 'free' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
}, { timestamps: true })

export type WorkspaceDocument = InferSchemaType<typeof workspaceSchema>
export const Workspace = model('Workspace', workspaceSchema)
