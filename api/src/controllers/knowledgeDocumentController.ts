import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { basename, isAbsolute, resolve, sep } from 'node:path'
import { rm } from 'node:fs/promises'
import { z } from 'zod'
import { KnowledgeDocument } from '../models/KnowledgeDocument.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/appError.js'
import { knowledgeStorageDirectory } from '../utils/knowledgeStorage.js'

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

type KnowledgeDocumentView = {
  _id: unknown
  originalName: string
  mimeType: string
  fileSize: number
  status: string
  uploadedBy: unknown
  createdAt: Date
}

function formatDocument(document: KnowledgeDocumentView) {
  return {
    id: String(document._id),
    originalName: document.originalName,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    status: document.status,
    uploadedBy: String(document.uploadedBy),
    createdAt: document.createdAt,
  }
}

export const uploadKnowledgeDocument = asyncHandler(async (request: Request, response: Response) => {
  if (!request.authUser || !request.workspace) {
    throw new AppError('Workspace context is required', 400, 'WORKSPACE_REQUIRED')
  }
  if (!request.file) {
    throw new AppError('Please select a document to upload', 400, 'FILE_REQUIRED')
  }

  const originalName = basename(request.file.originalname.replace(/\\/g, '/'))
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 255)

  try {
    const document = await KnowledgeDocument.create({
      workspaceId: request.workspace.id,
      uploadedBy: request.authUser.id,
      originalName: originalName || 'uploaded-document',
      storageKey: request.file.filename,
      mimeType: request.file.mimetype,
      fileSize: request.file.size,
      status: 'uploaded',
    })

    response.status(201).json({
      message: 'Document uploaded successfully',
      document: formatDocument(document),
    })
  } catch (error) {
    await rm(request.file.path, { force: true }).catch(() => undefined)
    throw error
  }
})

export const listKnowledgeDocuments = asyncHandler(async (request: Request, response: Response) => {
  if (!request.workspace) {
    throw new AppError('Workspace context is required', 400, 'WORKSPACE_REQUIRED')
  }

  const { page, limit } = listQuerySchema.parse(request.query)
  const filter = { workspaceId: request.workspace.id }
  const [documents, total] = await Promise.all([
    KnowledgeDocument.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    KnowledgeDocument.countDocuments(filter),
  ])

  response.json({
    documents: documents.map(formatDocument),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  })
})

export const deleteKnowledgeDocument = asyncHandler(async (request: Request, response: Response) => {
  if (!request.workspace) {
    throw new AppError('Workspace context is required', 400, 'WORKSPACE_REQUIRED')
  }
  if (!mongoose.isValidObjectId(request.params.documentId)) {
    throw new AppError('Document identifier is invalid', 400, 'INVALID_DOCUMENT_ID')
  }

  const document = await KnowledgeDocument.findOne({
    _id: request.params.documentId,
    workspaceId: request.workspace.id,
  })

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND')
  }

  const safeFilename = basename(document.storageKey)
  const filePath = resolve(knowledgeStorageDirectory, safeFilename)
  const storagePrefix = `${resolve(knowledgeStorageDirectory)}${sep}`
  if (isAbsolute(safeFilename) || !filePath.startsWith(storagePrefix)) {
    throw new AppError('Stored document path is invalid', 500, 'INVALID_STORAGE_KEY')
  }

  await rm(filePath, { force: true })
  await document.deleteOne()

  response.json({ message: 'Document deleted successfully' })
})
