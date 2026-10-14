'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

async function requireActiveAdmin() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const actor = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, status: true } })
  if (!actor || actor.status !== 'ACTIVE' || actor.role !== 'ADMIN') redirect('/?error=forbidden')
  return actor
}

export async function reviewCreatorApplication(formData: FormData) {
  const actor = await requireActiveAdmin()
  const profileId = String(formData.get('profileId') ?? '')
  const decision = String(formData.get('decision') ?? '')
  if (!profileId || !['approve', 'reject'].includes(decision)) redirect('/admin?error=invalid_request')

  const profile = await prisma.creatorProfile.findUnique({ where: { id: profileId }, select: { id: true, userId: true, reviewStatus: true } })
  if (!profile || profile.reviewStatus !== 'PENDING') redirect('/admin?error=already_reviewed')
  const approved = decision === 'approve'
  await prisma.$transaction(async (tx) => {
    await tx.creatorProfile.update({ where: { id: profile.id }, data: { reviewStatus: approved ? 'APPROVED' : 'REJECTED' } })
    await tx.user.update({ where: { id: profile.userId }, data: { role: approved ? 'CREATOR' : 'USER' } })
    await tx.auditLog.create({ data: {
      actorId: actor.id,
      action: approved ? 'CREATOR_APPLICATION_APPROVED' : 'CREATOR_APPLICATION_REJECTED',
      targetType: 'CreatorProfile',
      targetId: profile.id,
      details: { userId: profile.userId },
    } })
  })
  redirect('/admin?reviewed=1')
}

export async function setUserStatus(formData: FormData) {
  const actor = await requireActiveAdmin()
  const targetId = String(formData.get('userId') ?? '')
  const requestedStatus = String(formData.get('status') ?? '')
  if (!targetId || !['ACTIVE', 'SUSPENDED'].includes(requestedStatus)) redirect('/admin?error=invalid_request')
  if (targetId === actor.id) redirect('/admin?error=cannot_change_own_status')

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, status: true, role: true } })
  if (!target) redirect('/admin?error=user_not_found')
  if (target.role === 'ADMIN') redirect('/admin?error=admin_status_protected')
  const nextStatus = requestedStatus as 'ACTIVE' | 'SUSPENDED'
  if (target.status === nextStatus) redirect('/admin?notice=no_change')

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { status: nextStatus } })
    await tx.auditLog.create({ data: {
      actorId: actor.id,
      action: nextStatus === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
      targetType: 'User',
      targetId: target.id,
      details: { previousStatus: target.status, nextStatus },
    } })
    if (nextStatus === 'SUSPENDED') {
      await tx.session.deleteMany({ where: { userId: target.id } })
    }
  })
  redirect('/admin?userUpdated=1')
}
