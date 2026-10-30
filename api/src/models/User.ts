import { Schema, model, type InferSchemaType } from 'mongoose'

const userSchema = new Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
}, { timestamps: true })

export type UserDocument = InferSchemaType<typeof userSchema>
export const User = model('User', userSchema)
