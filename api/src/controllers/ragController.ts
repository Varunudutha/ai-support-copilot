import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/appError.js'
import { generateRagAnswer } from '../services/ragService.js'

const answerSchema = z.object({
  question: z.string().trim().min(3).max(2_000),
  limit: z.coerce.number().int().min(1).max(10).default(5),
})

export const answerKnowledgeQuestion = asyncHandler(async (
  request: Request,
  response: Response,
) => {
  if (!request.workspace) {
    throw new AppError('Workspace context is required', 400, 'WORKSPACE_REQUIRED')
  }

  const input = answerSchema.parse(request.body)
  const result = await generateRagAnswer(
    request.workspace.id,
    input.question,
    input.limit,
  )

  response.json({
    question: input.question,
    ...result,
  })
})
