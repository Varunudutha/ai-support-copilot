import type { ErrorRequestHandler, RequestHandler } from 'express'
import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { AppError } from '../utils/appError.js'
import { env } from '../config/env.js'

export const notFound: RequestHandler = (_request, _response, next) => {
  next(new AppError('The requested resource was not found', 404, 'NOT_FOUND'))
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check the submitted information',
        details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
      },
    })
    return
  }

  if (error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Submitted data is invalid' } })
    return
  }

  if (error instanceof mongoose.Error.CastError) {
    response.status(400).json({ error: { code: 'INVALID_ID', message: 'A supplied identifier is invalid' } })
    return
  }

  const appError = error instanceof AppError ? error : new AppError('An unexpected error occurred')
  if (appError.statusCode >= 500) console.error(error)
  response.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.statusCode >= 500 && env.NODE_ENV === 'production' ? 'An unexpected error occurred' : appError.message,
    },
  })
}
