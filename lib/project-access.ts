export type ProjectRole = 'USER' | 'CREATOR' | 'ADMIN'
export type ProjectActor = { id: string; role: ProjectRole; status: 'ACTIVE' | 'SUSPENDED' | 'DELETED' }

/** Query constraints used for all project reads and mutations; non-admins are always owner-scoped. */
export function projectAccessWhere(actor: ProjectActor, projectId?: string) {
  return {
    ...(projectId ? { id: projectId } : {}),
    ...(actor.role === 'ADMIN' ? {} : { ownerId: actor.id }),
  }
}

/** Validate database values before narrowing them to application-level role/status unions. */
export function isActiveProjectActor(
  actor: { id: string; role: string; status: string } | null | undefined,
): actor is ProjectActor {
  return Boolean(
    actor &&
    actor.status === 'ACTIVE' &&
    (actor.role === 'USER' || actor.role === 'CREATOR' || actor.role === 'ADMIN'),
  )
}

/** Ordinary users may save private drafts; publishing requires creator approval or admin role. */
export function canSetProjectVisibility(role: ProjectRole, visibility: 'PRIVATE' | 'PUBLIC'): boolean {
  return visibility !== 'PUBLIC' || role === 'CREATOR' || role === 'ADMIN'
}
