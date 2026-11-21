import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { AIConfig } from '../models/AIConfig.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/appError.js'

const aiConfigSchema = z.object({
  customInstructions: z.string().trim().max(5000).optional(),
  responseLength: z.enum(['short', 'medium', 'detailed']).optional(),
  tone: z.enum(['professional', 'friendly', 'casual', 'empathetic']).optional(),
  language: z.string().trim().max(50).optional(),
  escalationThreshold: z.number().int().min(0).max(100).optional(),
  autoEscalate: z.boolean().optional(),
  includeSources: z.boolean().optional(),
  maxSources: z.number().int().min(1).max(10).optional(),
  fallbackMessage: z.string().trim().max(500).optional(),
  maxConversationHistory: z.number().int().min(0).max(20).optional(),
  confidenceThreshold: z.number().int().min(0).max(100).optional(),
})

function requireWorkspace(request: Request) {
  if (!request.workspace) {
    throw new AppError('Workspace context is required', 400, 'WORKSPACE_REQUIRED')
  }
  return request.workspace
}

export const getAIConfig = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)

  let config = await AIConfig.findOne({ workspaceId: workspace.id }).lean()

  if (!config) {
    // Return default config if not exists
    const now = new Date()
    config = {
      _id: new mongoose.Types.ObjectId(),
      __v: 0,
      workspaceId: new mongoose.Types.ObjectId(workspace.id),
      customInstructions: '',
      responseLength: 'medium',
      tone: 'professional',
      language: 'auto',
      escalationThreshold: 70,
      autoEscalate: true,
      includeSources: true,
      maxSources: 5,
      fallbackMessage: 'I could not find that information in this workspace knowledge base.',
      maxConversationHistory: 5,
      confidenceThreshold: 50,
      createdAt: now,
      updatedAt: now,
    }
  }

  response.json(config)
})

export const updateAIConfig = asyncHandler(async (request: Request, response: Response) => {
  const workspace = requireWorkspace(request)
  if (!request.authUser) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
  }

  const input = aiConfigSchema.parse(request.body)

  const config = await AIConfig.findOneAndUpdate(
    { workspaceId: workspace.id },
    { $set: input },
    { new: true, upsert: true, runValidators: true },
  )

  response.json({
    message: 'AI configuration updated successfully',
    config,
  })
})