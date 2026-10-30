import { Schema, model } from 'mongoose'

const refreshSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, index: true },
  revokedAt: { type: Date, default: null, index: true },
  userAgent: { type: String, maxlength: 500 },
}, { timestamps: true })

refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const RefreshSession = model('RefreshSession', refreshSessionSchema)
