export type ProjectRole = 'USER' | 'CREATOR' | 'ADMIN'
export type ProjectActor = { id: string; role: ProjectRole; status: 'ACTIVE' | 'SUSPENDED' | 'DELETED' }

/** Query constraints used for all project reads and mutations; non-admins are always owner-scoped. */
export function projectAccessWhere(actor: ProjectActor, projectId?: string) {
  return {
    ...(projectId ? { id: projectId } : {}),
    ...(actor.role === 'ADMIN' ? {} : { ownerId: actor.id }),
  }
}

export function isActiveProjectActor(actor: ProjectActor | null | undefined): actor is ProjectActor {
  return Boolean(actor && actor.status === 'ACTIVE')
}

/** Ordinary users may save private drafts; publishing requires creator approval or admin role. */
export function canSetProjectVisibility(role: ProjectRole, visibility: 'PRIVATE' | 'PUBLIC'): boolean {
  return visibility !== 'PUBLIC' || role === 'CREATOR' || role === 'ADMIN'
}
