import bcrypt from 'bcryptjs'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { User } from '../models/User.js'
import { Membership } from '../models/Membership.js'
import { RefreshSession } from '../models/RefreshSession.js'
import { AppError } from '../utils/appError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { hashRefreshToken } from '../utils/tokens.js'
import { clearRefreshCookie, issueSession, REFRESH_COOKIE_NAME } from '../services/sessionService.js'

const passwordSchema = z.string()
  .min(10, 'Password must be at least 10 characters')
  .max(72, 'Password must be 72 characters or fewer')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number')

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: passwordSchema,
})

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72),
})

function publicUser(user: { _id: unknown; fullName: string; email: string }) {
  return { id: String(user._id), fullName: user.fullName, email: user.email }
}

export const register = asyncHandler(async (request: Request, response: Response) => {
  const input = registerSchema.parse(request.body)
  const passwordHash = await bcrypt.hash(input.password, 12)

  let user
  try {
    user = await User.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
    })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_ALREADY_EXISTS')
    }
    throw error
  }

  const tokens = await issueSession(String(user._id), request, response)
  response.status(201).json({ ...tokens, user: publicUser(user) })
})

export const login = asyncHandler(async (request: Request, response: Response) => {
  const input = loginSchema.parse(request.body)
  const user = await User.findOne({ email: input.email }).select('+passwordHash')

  if (!user || user.status !== 'active') {
    throw new AppError('Email or password is incorrect', 401, 'INVALID_CREDENTIALS')
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash)
  if (!passwordMatches) {
    throw new AppError('Email or password is incorrect', 401, 'INVALID_CREDENTIALS')
  }

  const tokens = await issueSession(String(user._id), request, response)
  response.json({ ...tokens, user: publicUser(user) })
})

export const refresh = asyncHandler(async (request: Request, response: Response) => {
  const token = request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined
  if (!token) throw new AppError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED')

  const tokenHash = hashRefreshToken(token)
  const existing = await RefreshSession.findOne({ tokenHash }).select('+tokenHash')

  if (!existing) {
    clearRefreshCookie(response)
    throw new AppError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED')
  }

  if (existing.revokedAt) {
    await RefreshSession.updateMany({ userId: existing.userId, revokedAt: null }, { $set: { revokedAt: new Date() } })
    clearRefreshCookie(response)
    throw new AppError('Session reuse was detected. Please sign in again.', 401, 'SESSION_REUSE_DETECTED')
  }

  const now = new Date()
  const rotation = await RefreshSession.updateOne(
    { _id: existing._id, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now } },
  )

  if (rotation.modifiedCount !== 1) {
    clearRefreshCookie(response)
    throw new AppError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED')
  }

  const user = await User.findById(existing.userId)
  if (!user || user.status !== 'active') {
    clearRefreshCookie(response)
    throw new AppError('This account is unavailable', 401, 'ACCOUNT_UNAVAILABLE')
  }

  const tokens = await issueSession(String(user._id), request, response)
  response.json({ ...tokens, user: publicUser(user) })
})

export const logout = asyncHandler(async (request: Request, response: Response) => {
  const token = request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined
  if (token) {
    await RefreshSession.updateOne(
      { tokenHash: hashRefreshToken(token), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    )
  }
  clearRefreshCookie(response)
  response.status(204).send()
})

export const logoutAll = asyncHandler(async (request: Request, response: Response) => {
  if (!request.authUser) throw new AppError('Authentication required', 401)
  await RefreshSession.updateMany(
    { userId: request.authUser.id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  )
  clearRefreshCookie(response)
  response.status(204).send()
})

export const me = asyncHandler(async (request: Request, response: Response) => {
  if (!request.authUser) throw new AppError('Authentication required', 401)
  const memberships = await Membership.find({ userId: request.authUser.id, status: 'active' })
    .populate({ path: 'workspaceId', match: { status: 'active' }, select: 'name slug industry plan status' })
    .lean()

  const activeMemberships = memberships
    .filter((membership) => membership.workspaceId)
    .map((membership) => {
      const workspace = membership.workspaceId as unknown as { _id: unknown; name: string; slug: string; industry: string; plan: string }
      return {
        role: membership.role,
        workspace: {
          id: String(workspace._id),
          name: workspace.name,
          slug: workspace.slug,
          industry: workspace.industry,
          plan: workspace.plan,
        },
      }
    })

  response.json({ user: request.authUser, memberships: activeMemberships })
})

