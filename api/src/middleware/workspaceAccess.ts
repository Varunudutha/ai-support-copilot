import mongoose from 'mongoose'
import type { RequestHandler } from 'express'
import { authorizeWorkspaceAccess } from '../services/workspaceService.js'
import type { WorkspaceRole } from '../models/Membership.js'
import { AppError } from '../utils/appError.js'

export const requireWorkspaceAccess: RequestHandler = async (request, _response, next) => {
  try {
    if (!request.authUser) throw new AppError('Authentication required', 401)
    const headerWorkspaceId = request.header('x-workspace-id')
    const routeWorkspaceId = request.params.workspaceId
    if (headerWorkspaceId && routeWorkspaceId && headerWorkspaceId !== routeWorkspaceId) {
      throw new AppError('Workspace header does not match the requested workspace', 400, 'WORKSPACE_CONTEXT_MISMATCH')
    }
    const workspaceId = routeWorkspaceId || headerWorkspaceId
    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      throw new AppError('A valid workspace identifier is required', 400, 'WORKSPACE_REQUIRED')
    }

    const { workspace, role } = await authorizeWorkspaceAccess(request.authUser.id, workspaceId)
    request.workspace = {
      id: String(workspace._id),
      name: workspace.name,
      slug: workspace.slug,
      role,
    }
    next()
  } catch (error) {
    next(error)
  }
}

export function requireWorkspaceRoles(...roles: WorkspaceRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.workspace) return next(new AppError('Workspace context is required', 500, 'WORKSPACE_CONTEXT_MISSING'))
    if (!roles.includes(request.workspace.role)) {
      return next(new AppError('Your workspace role cannot perform this action', 403, 'INSUFFICIENT_WORKSPACE_ROLE'))
    }
    next()
  }
}
