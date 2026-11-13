import type { Request, Response } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/appError.js'
import { searchKnowledgeChunks } from '../services/vectorSearchService.js'

const searchSchema = z.object({
  query: z.string().trim().min(3).max(2000),
  limit: z.coerce.number().int().min(1).max(10).default(5),
})

export const searchKnowledgeDocuments = asyncHandler(async (
  request: Request,
  response: Response,
) => {
  if (!request.workspace) {
    throw new AppError('Workspace context is required', 400, 'WORKSPACE_REQUIRED')
  }

  const input = searchSchema.parse(request.body)

  const results = await searchKnowledgeChunks(
    request.workspace.id,
    input.query,
    input.limit,
  )

  response.json({
    query: input.query,
    count: results.length,
    results,
  })
})