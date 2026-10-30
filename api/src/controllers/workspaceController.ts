import type { Request, Response } from 'express'
import { z } from 'zod'
import { Membership } from '../models/Membership.js'
import { Workspace } from '../models/Workspace.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/appError.js'
import { slugify } from '../utils/slug.js'
import { authorizeWorkspaceAccess } from '../services/workspaceService.js'

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Workspace name must contain at least 2 characters').max(80),
  industry: z.string().trim().max(80).default('General'),
})

const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  industry: z.string().trim().max(80).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required')

export const listWorkspaces = asyncHandler(async (request: Request, response: Response) => {
  if (!request.authUser) throw new AppError('Authentication required', 401)
  const memberships = await Membership.find({ userId: request.authUser.id, status: 'active' })
    .populate({ path: 'workspaceId', match: { status: 'active' }, select: 'name slug industry plan' })
    .lean()

  response.json({
    workspaces: memberships.filter((item) => item.workspaceId).map((item) => {
      const workspace = item.workspaceId as unknown as { _id: unknown; name: string; slug: string; industry: string; plan: string }
      return { id: String(workspace._id), name: workspace.name, slug: workspace.slug, industry: workspace.industry, plan: workspace.plan, role: item.role }
    }),
  })
})

export const createWorkspace = asyncHandler(async (request: Request, response: Response) => {
  if (!request.authUser) throw new AppError('Authentication required', 401)
  const input = createWorkspaceSchema.parse(request.body)
  const baseSlug = slugify(input.name)
  let slug = baseSlug
  let suffix = 2

  while (await Workspace.exists({ slug })) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  const workspace = await Workspace.create({
    name: input.name,
    slug,
    industry: input.industry || 'General',
    createdBy: request.authUser.id,
  })

  try {
    await Membership.create({ userId: request.authUser.id, workspaceId: workspace._id, role: 'owner', status: 'active' })
  } catch (error) {
    await Workspace.deleteOne({ _id: workspace._id })
    throw error
  }

  response.status(201).json({
    workspace: {
      id: String(workspace._id),
      name: workspace.name,
      slug: workspace.slug,
      industry: workspace.industry,
      plan: workspace.plan,
    },
    role: 'owner',
  })
})

export const getWorkspace = asyncHandler(async (request: Request, response: Response) => {
  if (!request.authUser) throw new AppError('Authentication required', 401)
  const { workspace } = await authorizeWorkspaceAccess(request.authUser.id, request.params.workspaceId)
  response.json({
    workspace: {
      id: String(workspace._id),
      name: workspace.name,
      slug: workspace.slug,
      industry: workspace.industry,
      plan: workspace.plan,
    },
  })
})

export const updateWorkspace = asyncHandler(async (request: Request, response: Response) => {
  if (!request.authUser) throw new AppError('Authentication required', 401)
  const input = updateWorkspaceSchema.parse(request.body)
  const { workspace } = await authorizeWorkspaceAccess(request.authUser.id, request.params.workspaceId, ['owner', 'admin'])

  if (input.name) {
    const nextSlug = slugify(input.name)
    const collision = await Workspace.findOne({ slug: nextSlug, _id: { $ne: workspace._id } })
    if (collision) throw new AppError('A workspace with a similar name already exists', 409, 'WORKSPACE_SLUG_TAKEN')
    workspace.name = input.name
    workspace.slug = nextSlug
  }
  if (input.industry !== undefined) workspace.industry = input.industry
  await workspace.save()

  response.json({
    workspace: { id: String(workspace._id), name: workspace.name, slug: workspace.slug, industry: workspace.industry, plan: workspace.plan },
  })
})
