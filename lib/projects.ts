import 'server-only'
import { prisma } from '@/lib/prisma'
import { canSetProjectVisibility, isActiveProjectActor, projectAccessWhere } from '@/lib/project-access'

async function loadActor(actorId: string) {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, role: true, status: true },
  })
  if (!isActiveProjectActor(actor)) return null
  return actor
}

export async function listProjectsForActor(actorId: string) {
  const actor = await loadActor(actorId)
  if (!actor) return null
  return prisma.project.findMany({ where: projectAccessWhere(actor), orderBy: { updatedAt: 'desc' } })
}

export async function getProjectForActor(actorId: string, projectId: string) {
  const actor = await loadActor(actorId)
  if (!actor) return null
  return prisma.project.findFirst({ where: projectAccessWhere(actor, projectId) })
}

export async function createProjectForActor(
  actorId: string,
  input: { title: string; description?: string; visibility?: 'PRIVATE' | 'PUBLIC' },
) {
  const actor = await loadActor(actorId)
  if (!actor) return null
  const title = input.title.trim()
  const description = (input.description ?? '').trim()
  const visibility = input.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE'
  if (!canSetProjectVisibility(actor.role, visibility)) throw new Error('Creator approval is required to publish projects.')
  if (title.length < 1 || title.length > 100 || description.length > 2000) {
    throw new Error('Invalid project title or description.')
  }
  return prisma.project.create({
    data: {
      ownerId: actor.id,
      title,
      description,
      visibility,
    },
  })
}

export async function updateProjectForActor(
  actorId: string,
  projectId: string,
  input: { title?: string; description?: string; visibility?: 'PRIVATE' | 'PUBLIC' },
) {
  const actor = await loadActor(actorId)
  if (!actor) return null
  const data: { title?: string; description?: string; visibility?: string } = {}
  if (input.title !== undefined) {
    const title = input.title.trim()
    if (!title || title.length > 100) throw new Error('Invalid project title.')
    data.title = title
  }
  if (input.description !== undefined) {
    const description = input.description.trim()
    if (description.length > 2000) throw new Error('Invalid project description.')
    data.description = description
  }
  if (input.visibility !== undefined) {
    if (!canSetProjectVisibility(actor.role, input.visibility)) throw new Error('Creator approval is required to publish projects.')
    data.visibility = input.visibility
  }
  if (Object.keys(data).length === 0) throw new Error('No project changes were provided.')
  const result = await prisma.project.updateMany({ where: projectAccessWhere(actor, projectId), data })
  if (result.count !== 1) return null
  return getProjectForActor(actorId, projectId)
}

export async function deleteProjectForActor(actorId: string, projectId: string) {
  const actor = await loadActor(actorId)
  if (!actor) return false
  const result = await prisma.project.deleteMany({ where: projectAccessWhere(actor, projectId) })
  return result.count === 1
}
