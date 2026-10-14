import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { redirect } from 'next/navigation'
import { SignOutButton } from './sign-out-button'

export default async function AccountPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  return <main className="inventory-shell"><header className="topbar"><div><p className="eyebrow">PLAYER PROFILE</p><h1>个人账户</h1></div><Link className="pixel-button" href="/">返回</Link></header><section className="hero inventory-panel"><h2>个人中心</h2><p>账户：{session.user.name ?? session.user.email ?? session.user.id}</p><p>角色：{session.user.role}</p><p>状态：{session.user.status}</p><SignOutButton /></section></main>
}
