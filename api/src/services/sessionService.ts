import type { Response, Request } from 'express'
import { env } from '../config/env.js'
import { RefreshSession } from '../models/RefreshSession.js'
import { createAccessToken, createRefreshToken, hashRefreshToken } from '../utils/tokens.js'
import { durationToSeconds } from '../utils/duration.js'

export const REFRESH_COOKIE_NAME = 'copilot_refresh'

export function setRefreshCookie(response: Response, token: string): void {
  response.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/api/auth',
    domain: env.COOKIE_DOMAIN,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  })
}

export function clearRefreshCookie(response: Response): void {
  response.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/api/auth',
    domain: env.COOKIE_DOMAIN,
  })
}

export async function issueSession(userId: string, request: Request, response: Response) {
  const refreshToken = createRefreshToken()
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)

  await RefreshSession.create({
    userId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt,
    userAgent: request.get('user-agent')?.slice(0, 500),
  })

  setRefreshCookie(response, refreshToken)
  return {
    accessToken: createAccessToken(userId),
    tokenType: 'Bearer' as const,
    expiresIn: durationToSeconds(env.ACCESS_TOKEN_TTL),
  }
}
