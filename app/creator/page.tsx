import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { applyForCreator } from './actions'

export default async function CreatorPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true, status: true } })
  if (!user || user.status !== 'ACTIVE') redirect('/login?error=account_unavailable')
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: user.id } })

  return <main className="inventory-shell">
    <header className="topbar"><div><p className="eyebrow">CREATOR WORKSHOP</p><h1>创作者工作台</h1></div><Link className="pixel-button" href="/">返回</Link></header>
    {user.role === 'CREATOR' || user.role === 'ADMIN' ? <section className="hero inventory-panel"><h2>欢迎回来，创作者</h2><p>账户：{user.name ?? user.email ?? user.id}</p><p>创作者身份已通过服务端数据库校验。作品编辑和发布功能会在后续接入。</p></section> : <section className="hero inventory-panel">
      <h2>申请成为创作者</h2><p>填写展示名称与简介，管理员审核通过后才会授予创作者权限。提交申请不会立即提升账户角色。</p>
      {profile?.reviewStatus === 'PENDING' ? <p role="status">申请已提交，正在等待管理员审核。你可以更新资料后重新提交。</p> : null}
      {profile?.reviewStatus === 'REJECTED' ? <p role="status">上次申请未通过。你可以修改资料后再次申请。</p> : null}
      <form action={applyForCreator} className="application-form">
        <label htmlFor="displayName">创作者展示名称</label><input id="displayName" name="displayName" required minLength={2} maxLength={48} defaultValue={profile?.displayName ?? user.name ?? ''} />
        <label htmlFor="bio">创作简介（最多 500 字）</label><textarea id="bio" name="bio" rows={4} maxLength={500} defaultValue={profile?.bio ?? ''} />
        <button className="pixel-button primary" type="submit">提交 / 更新申请</button>
      </form>
    </section>}
  </main>
}
