import type { WorkspaceRole } from '../models/Membership.js'

declare global {
  namespace Express {
    interface Request {
      authUser?: { id: string; fullName: string; email: string }
      workspace?: { id: string; name: string; slug: string; role: WorkspaceRole }
    }
  }
}

export {}
