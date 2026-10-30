import { createHash, randomBytes } from 'node:crypto'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.js'

export interface AccessTokenPayload {
  sub: string
  typ: 'access'
}

export function createAccessToken(userId: string): string {
  return jwt.sign(
    { typ: 'access' } satisfies Omit<AccessTokenPayload, 'sub'>,
    env.JWT_ACCESS_SECRET,
    { subject: userId, expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'] },
  )
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET)
  if (typeof payload === 'string' || payload.typ !== 'access' || !payload.sub) {
    throw new Error('Invalid access token')
  }
  return { sub: payload.sub, typ: 'access' }
}

export function createRefreshToken(): string {
  return randomBytes(48).toString('base64url')
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
