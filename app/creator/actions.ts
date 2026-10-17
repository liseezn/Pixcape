'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function applyForCreator(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, status: true } })
  if (!user || user.status !== 'ACTIVE') redirect('/login?error=account_unavailable')
  if (user.role === 'CREATOR' || user.role === 'ADMIN') redirect('/creator')

  const displayName = String(formData.get('displayName') ?? '').trim().slice(0, 48)
  const bio = String(formData.get('bio') ?? '').trim().slice(0, 500)
  if (displayName.length < 2) redirect('/creator?error=display_name')

  const existing = await prisma.creatorProfile.findUnique({ where: { userId: session.user.id } })
  if (existing?.reviewStatus === 'APPROVED') redirect('/creator')
  if (existing) {
    await prisma.creatorProfile.update({
      where: { userId: session.user.id },
      data: { displayName, bio, reviewStatus: 'PENDING' },
    })
  } else {
    await prisma.creatorProfile.create({ data: { userId: session.user.id, displayName, bio } })
  }
  redirect('/creator?submitted=1')
}
