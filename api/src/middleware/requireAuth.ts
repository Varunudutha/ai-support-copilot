import type { RequestHandler } from 'express'
import { User } from '../models/User.js'
import { AppError } from '../utils/appError.js'
import { verifyAccessToken } from '../utils/tokens.js'

export const requireAuth: RequestHandler = async (request, _response, next) => {
  try {
    const authorization = request.header('authorization')
    if (!authorization?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED')
    }

    const token = authorization.slice('Bearer '.length).trim()
    const payload = verifyAccessToken(token)
    const user = await User.findById(payload.sub)

    if (!user || user.status !== 'active') {
      throw new AppError('Your account is unavailable', 401, 'ACCOUNT_UNAVAILABLE')
    }

    request.authUser = { id: String(user._id), fullName: user.fullName, email: user.email }
    next()
  } catch (error) {
    if (error instanceof AppError) return next(error)
    return next(new AppError('Your session is invalid or has expired', 401, 'INVALID_ACCESS_TOKEN'))
  }
}
