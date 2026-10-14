import Link from 'next/link'
import { requireRole } from '@/lib/require-role'
import { prisma } from '@/lib/prisma'
import { reviewCreatorApplication } from './actions'

export default async function AdminPage() {
  const admin = await requireRole('ADMIN')
  const pending = await prisma.creatorProfile.findMany({
    where: { reviewStatus: 'PENDING' },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })
  return <main className="inventory-shell">
    <header className="topbar"><div><p className="eyebrow">SERVER OPERATIONS</p><h1>管理员后台</h1></div><Link className="pixel-button" href="/">返回</Link></header>
    <section className="hero inventory-panel"><h2>创作者申请审核</h2><p>管理员：{admin.name ?? admin.email ?? admin.id}</p><p>待审核申请：{pending.length}（最多显示 100 条）。每次审核都会记录审计日志。</p>
      {pending.length === 0 ? <p>目前没有待审核申请。</p> : <div className="application-list">{pending.map((profile) => <article className="application-card" key={profile.id}>
        <h3>{profile.displayName}</h3><p>{profile.bio || '未填写简介'}</p><p>申请账号：{profile.user.name ?? profile.user.email ?? profile.user.id}</p><p>提交时间：{profile.createdAt.toISOString().slice(0, 10)}</p>
        <form action={reviewCreatorApplication} className="actions"><input type="hidden" name="profileId" value={profile.id} /><button className="pixel-button primary" type="submit" name="decision" value="approve">通过申请</button><button className="pixel-button" type="submit" name="decision" value="reject">拒绝申请</button></form>
      </article>)}</div>}
    </section>
  </main>
}
