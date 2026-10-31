import multer from 'multer'
import type { RequestHandler } from 'express'
import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { ensureKnowledgeStorageDirectory, knowledgeStorageDirectory } from '../utils/knowledgeStorage.js'
import { AppError } from '../utils/appError.js'

const allowedTypes: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    void ensureKnowledgeStorageDirectory()
      .then(() => callback(null, knowledgeStorageDirectory))
      .catch((error: unknown) => callback(error as Error, knowledgeStorageDirectory))
  },
  filename: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase()
    callback(null, `${randomUUID()}${extension}`)
  },
})

const parser = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 5,
    fieldSize: 16 * 1024,
    parts: 6,
  },
  fileFilter: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase()
    const expectedMimeType = allowedTypes[extension]

    if (!expectedMimeType || file.mimetype !== expectedMimeType) {
      return callback(new AppError(
        'Only PDF, DOCX and TXT files with matching content types are allowed.',
        400,
        'UNSUPPORTED_FILE_TYPE',
      ))
    }

    callback(null, true)
  },
}).single('file')

export const uploadKnowledgeDocument: RequestHandler = (request, response, next) => {
  parser(request, response, (error) => {
    if (!error) return next()

    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'File size cannot exceed 10 MB.'
        : 'File upload was rejected. Please check the uploaded file.'
      return next(new AppError(message, 400, 'FILE_UPLOAD_REJECTED'))
    }

    next(error)
  })
}
