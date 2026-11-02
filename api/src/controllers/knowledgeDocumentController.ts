import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { basename } from 'node:path'
import { readFile, rm } from 'node:fs/promises'
import { z } from 'zod'
import { KnowledgeDocument } from '../models/KnowledgeDocument.js'
import { KnowledgeChunk } from '../models/KnowledgeChunk.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/appError.js'
import { resolveKnowledgeDocumentPath } from '../utils/knowledgeStorage.js'
import { extractDocumentText, splitTextIntoChunks } from '../services/documentExtractionService.js'

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

export const processKnowledgeDocument = asyncHandler(async (request: Request, response: Response) => {
  if (!request.workspace) {
    throw new AppError('Workspace context is required', 400, 'WORKSPACE_REQUIRED')
  }
  if (!mongoose.isValidObjectId(request.params.documentId)) {
    throw new AppError('Document identifier is invalid', 400, 'INVALID_DOCUMENT_ID')
  }

  // Atomically claim the document so two requests cannot process it at once.
  const document = await KnowledgeDocument.findOneAndUpdate(
    {
      _id: request.params.documentId,
      workspaceId: request.workspace.id,
      status: { $ne: 'processing' },
    },
    { $set: { status: 'processing', errorMessage: null } },
    { new: true },
  )

  if (!document) {
    const existingDocument = await KnowledgeDocument.findOne({
      _id: request.params.documentId,
      workspaceId: request.workspace.id,
    }).select('_id status')

    if (!existingDocument) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND')
    }
    throw new AppError('This document is already being processed', 409, 'DOCUMENT_PROCESSING')
  }

  try {
    const filePath = resolveKnowledgeDocumentPath(document.storageKey)
    const buffer = await readFile(filePath)
    const extracted = await extractDocumentText(buffer, document.mimeType)
    const chunks = splitTextIntoChunks(extracted.text)

    if (chunks.length === 0) {
      throw new AppError('No text chunks were created from this document.', 422, 'NO_DOCUMENT_CHUNKS')
    }
    if (chunks.length > 2_000) {
      throw new AppError('Document produced too many chunks to process safely.', 413, 'TOO_MANY_DOCUMENT_CHUNKS')
    }

    await KnowledgeChunk.deleteMany({
      workspaceId: document.workspaceId,
      documentId: document._id,
    })

    await KnowledgeChunk.insertMany(chunks.map((content, chunkIndex) => ({
      workspaceId: document.workspaceId,
      documentId: document._id,
      chunkIndex,
      content,
      sourceName: document.originalName,
      mimeType: document.mimeType,
      pageCount: extracted.pageCount,
    })))

    document.status = 'ready'
    document.errorMessage = null
    await document.save()

    response.json({
      message: 'Document processed successfully',
      document: {
        id: String(document._id),
        originalName: document.originalName,
        status: document.status,
      },
      processing: {
        extractedCharacters: extracted.text.length,
        chunksCreated: chunks.length,
        pageCount: extracted.pageCount,
      },
    })
  } catch (error) {
    await KnowledgeChunk.deleteMany({
      workspaceId: document.workspaceId,
      documentId: document._id,
    }).catch(() => undefined)

    document.status = 'failed'
    document.errorMessage = error instanceof Error
      ? error.message.slice(0, 500)
      : 'Document processing failed.'
    await document.save().catch(() => undefined)
    throw error
  }
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

  await KnowledgeChunk.deleteMany({
    workspaceId: request.workspace.id,
    documentId: document._id,
  })

  const filePath = resolveKnowledgeDocumentPath(document.storageKey)
  await rm(filePath, { force: true })
  await document.deleteOne()

  response.json({ message: 'Document deleted successfully' })
})
