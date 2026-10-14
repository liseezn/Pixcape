import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { hasMinimumRole, type AppRole } from '@/lib/authorization'

export async function requireRole(required: AppRole) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.status !== 'ACTIVE') redirect('/login?error=account_unavailable')
  if (!hasMinimumRole(session.user.role, required)) redirect('/?error=forbidden')
  return session.user
}
