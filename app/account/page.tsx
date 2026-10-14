import Link from 'next/link'
import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'

export default async function AccountPage(){
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return <main className="inventory-shell"><header className="topbar"><div><p className="eyebrow">PLAYER PROFILE</p><h1>个人账户</h1></div><Link className="pixel-button" href="/">返回</Link></header><section className="hero inventory-panel"><h2>个人中心</h2><p>账户：{session.user.name ?? session.user.email ?? session.user.id}</p><p>角色：{session.user.role}</p><p>状态：{session.user.status}</p><form action={async()=>{'use server';await signOut({redirectTo:'/'});}}><button className="pixel-button" type="submit">退出登录</button></form></section></main>
}
