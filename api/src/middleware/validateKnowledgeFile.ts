import type { RequestHandler } from 'express'
import { readFile, rm } from 'node:fs/promises'
import { extname } from 'node:path'
import { AppError } from '../utils/appError.js'
import { isValidKnowledgeFileContent } from '../utils/knowledgeFileValidation.js'

export const validateKnowledgeFile: RequestHandler = async (request, _response, next) => {
  const file = request.file
  if (!file) return next()

  try {
    const content = await readFile(file.path)
    const extension = extname(file.originalname).toLowerCase()

    if (!isValidKnowledgeFileContent(extension, content)) {
      await rm(file.path, { force: true })
      return next(new AppError(
        'The uploaded file content does not match a supported PDF, DOCX or TXT document.',
        400,
        'INVALID_FILE_CONTENT',
      ))
    }

    next()
  } catch (error) {
    await rm(file.path, { force: true }).catch(() => undefined)
    next(error)
  }
}
