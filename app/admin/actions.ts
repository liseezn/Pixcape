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
