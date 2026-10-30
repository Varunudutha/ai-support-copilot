import { afterEach, describe, expect, it, vi } from 'vitest'
import { Membership } from '../src/models/Membership.js'
import { Workspace } from '../src/models/Workspace.js'
import { authorizeWorkspaceAccess } from '../src/services/workspaceService.js'

const activeWorkspace = { _id: 'workspace-a', name: 'Acme', slug: 'acme', status: 'active' }

afterEach(() => vi.restoreAllMocks())

describe('authorizeWorkspaceAccess', () => {
  it('allows a user with an active membership in the requested workspace', async () => {
    vi.spyOn(Workspace, 'findOne').mockResolvedValue(activeWorkspace as never)
    vi.spyOn(Membership, 'findOne').mockResolvedValue({ role: 'owner', status: 'active' } as never)

    await expect(authorizeWorkspaceAccess('user-a', 'workspace-a')).resolves.toMatchObject({
      workspace: activeWorkspace,
      membership: { role: 'owner' },
    })
  })

  it('denies access when the user has no membership in that workspace', async () => {
    vi.spyOn(Workspace, 'findOne').mockResolvedValue(activeWorkspace as never)
    vi.spyOn(Membership, 'findOne').mockResolvedValue(null)

    await expect(authorizeWorkspaceAccess('user-b', 'workspace-a')).rejects.toMatchObject({
      statusCode: 403,
      code: 'WORKSPACE_ACCESS_DENIED',
    })
    expect(Membership.findOne).toHaveBeenCalledWith({ userId: 'user-b', workspaceId: 'workspace-a', status: 'active' })
  })

  it('denies access to a suspended or missing workspace', async () => {
    vi.spyOn(Workspace, 'findOne').mockResolvedValue(null)
    vi.spyOn(Membership, 'findOne').mockResolvedValue({ role: 'owner', status: 'active' } as never)

    await expect(authorizeWorkspaceAccess('user-a', 'workspace-a')).rejects.toMatchObject({
      statusCode: 403,
      code: 'WORKSPACE_ACCESS_DENIED',
    })
  })

  it('enforces workspace roles for privileged operations', async () => {
    vi.spyOn(Workspace, 'findOne').mockResolvedValue(activeWorkspace as never)
    vi.spyOn(Membership, 'findOne').mockResolvedValue({ role: 'agent', status: 'active' } as never)

    await expect(authorizeWorkspaceAccess('user-agent', 'workspace-a', ['owner', 'admin'])).rejects.toMatchObject({
      statusCode: 403,
      code: 'INSUFFICIENT_WORKSPACE_ROLE',
    })
  })
})
