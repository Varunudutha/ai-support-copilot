import type { RequestHandler } from 'express'
import { env } from '../config/env.js'
import { AppError } from '../utils/appError.js'

function parseOrigin(value: string | undefined): URL | null {
  if (!value) return null
  try {
    return new URL(value)
  } catch {
    return null
  }
}

/**
 * Check cookie-authenticated requests against the configured frontend origin.
 * In local development Vite may move from 5173 to 5174 (or another port) when
 * the default port is occupied. Permit HTTP loopback origins in development
 * only; production remains restricted to FRONTEND_ORIGIN exactly.
 */
export function isTrustedFrontendOrigin(
  requestOrigin: string | undefined,
  configuredOrigin: string,
  nodeEnv: string,
): boolean {
  const requestUrl = parseOrigin(requestOrigin)
  const configuredUrl = parseOrigin(configuredOrigin)
  if (!requestUrl || !configuredUrl) return false

  if (requestUrl.origin === configuredUrl.origin) return true

  if (nodeEnv !== 'development') return false

  const isLoopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(requestUrl.hostname)
  return requestUrl.protocol === 'http:' && isLoopback
}

/** Cookie-authenticated endpoints must originate from the configured frontend. */
export const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  if (!isTrustedFrontendOrigin(request.header('origin'), env.FRONTEND_ORIGIN, env.NODE_ENV)) {
    return next(new AppError('Request origin is not allowed. Check FRONTEND_ORIGIN and the URL used to open the frontend.', 403, 'UNTRUSTED_ORIGIN'))
  }
  next()
}
