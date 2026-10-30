import { Membership, type WorkspaceRole } from '../models/Membership.js'
import { Workspace } from '../models/Workspace.js'
import { AppError } from '../utils/appError.js'

export async function authorizeWorkspaceAccess(
  userId: string,
  workspaceId: string,
  allowedRoles?: WorkspaceRole[],
) {
  const [workspace, membership] = await Promise.all([
    Workspace.findOne({ _id: workspaceId, status: 'active' }),
    Membership.findOne({ userId, workspaceId, status: 'active' }),
  ])

  if (!workspace || !membership) {
    throw new AppError('You do not have access to this workspace', 403, 'WORKSPACE_ACCESS_DENIED')
  }

  const role = membership.role as WorkspaceRole
  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new AppError('Your workspace role cannot perform this action', 403, 'INSUFFICIENT_WORKSPACE_ROLE')
  }

  return { workspace, membership, role }
}
