import { Schema, model, type InferSchemaType } from 'mongoose'

export const workspaceRoles = ['owner', 'admin', 'agent', 'viewer'] as const
export type WorkspaceRole = typeof workspaceRoles[number]

const membershipSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  role: { type: String, enum: workspaceRoles, required: true, default: 'agent' },
  status: { type: String, enum: ['active', 'invited', 'suspended'], default: 'active', index: true },
  joinedAt: { type: Date, default: Date.now },
}, { timestamps: true })

membershipSchema.index({ userId: 1, workspaceId: 1 }, { unique: true })

export type MembershipDocument = InferSchemaType<typeof membershipSchema>
export const Membership = model('Membership', membershipSchema)
