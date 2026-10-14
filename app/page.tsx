import Link from 'next/link'

const roles = [
  { title: '普通用户', detail: '保存个人作品、管理自己的项目与资料。', href: '/account' },
  { title: '创作者', detail: '编辑创作者资料、整理素材并管理发布作品。', href: '/creator' },
  { title: '管理员', detail: '审核内容、管理用户与处理账号状态。', href: '/admin' },
]

export default function MigrationHome() {
  return <main className="inventory-shell">
    <header className="topbar"><span className="grass-icon" aria-hidden="true">▦</span><div><p className="eyebrow">PIX CAPE WORKSHOP</p><h1>Pixcape 创作中心</h1></div><span className="version">NEXT.JS PREVIEW</span></header>
    <section className="hero inventory-panel">
      <p className="eyebrow">皮肤 · 披肩 · 外套 · 披风</p>
      <h2>你的作品，由你掌控。</h2>
      <p>这是 Next.js 迁移工作区，用于逐步接入用户账户、创作者工作台和管理后台。现有 Vite 工作台仍是当前生产入口。</p>
      <div className="actions"><Link className="pixel-button primary" href="/login">登录入口</Link><Link className="pixel-button" href="/register">创建账户</Link></div>
    </section>
    <section className="role-grid" aria-label="角色入口">{roles.map((role) => <article className="inventory-panel role-card" key={role.href}><div className="slot" aria-hidden="true">{role.title === '普通用户' ? '♙' : role.title === '创作者' ? '✎' : '⚒'}</div><h3>{role.title}</h3><p>{role.detail}</p><Link href={role.href}>查看入口 →</Link></article>)}</section>
    <p className="notice">迁移预览：这些页面当前是界面骨架，不代表已启用真实登录或授权。上线前必须接入数据库会话并通过服务端权限测试。</p>
  </main>
}
