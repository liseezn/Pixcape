/** Server-only authorization primitives. Pass a role read from a verified server session/database, never from request input. */
export type AppRole = 'USER' | 'CREATOR' | 'ADMIN'

export class AuthorizationError extends Error {
  readonly statusCode = 403
  constructor(message = 'You do not have permission to perform this action.') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

const roleRank: Record<AppRole, number> = { USER: 0, CREATOR: 1, ADMIN: 2 }

export function hasMinimumRole(role: AppRole | null | undefined, required: AppRole): boolean {
  if (!role || !(role in roleRank)) return false
  return roleRank[role] >= roleRank[required]
}

export function assertMinimumRole(role: AppRole | null | undefined, required: AppRole): asserts role is AppRole {
  if (!hasMinimumRole(role, required)) throw new AuthorizationError()
}

/** Ownership checks must be combined with a verified session and an actual database record. */
export function assertOwnerOrAdmin(input: { actorId: string; ownerId: string; role: AppRole | null | undefined }): void {
  if (input.actorId !== input.ownerId && input.role !== 'ADMIN') throw new AuthorizationError('Only the owner or an administrator may change this resource.')
}
