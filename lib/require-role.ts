import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { assertMinimumRole, type AppRole } from '@/lib/authorization'

export async function requireRole(required: AppRole) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.status !== 'ACTIVE') redirect('/login?error=account_unavailable')
  assertMinimumRole(session.user.role, required)
  return session.user
}
