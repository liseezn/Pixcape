import Link from 'next/link'

const roles = [
  { title: '普通用户', detail: '保存个人作品、管理自己的项目与资料。', href: '/account' },
  { title: '创作者', detail: '编辑创作者资料、整理素材并管理发布作品。', href: '/creator' },
  { title: '管理员', detail: '审核内容、管理用户与处理账号状态。', href: '/admin' },
]

export default function MigrationHome() {
  return <main className="inventory-shell">
    <header className="topbar"><span className="grass-icon" aria-hidden="true">▦</span><div><p className="eyebrow">PIX CAPE WORKSHOP</p><h1>Pixcape 创作中心</h1></div><span className="version">NEXT.JS + VITE</span></header>
    <section className="hero inventory-panel">
      <p className="eyebrow">皮肤 · 披肩 · 外套 · 披风</p>
      <h2>你的作品，由你掌控。</h2>
      <p>Next.js 负责账户、创作中心与管理入口；现有 Vite 编辑器继续作为独立静态工作台运行。</p>
      <div className="actions"><Link className="pixel-button primary" href="/studio/">打开像素编辑器</Link><Link className="pixel-button" href="/login">登录入口</Link><Link className="pixel-button" href="/register">创建账户</Link></div>
    </section>
    <section className="role-grid" aria-label="角色入口">{roles.map((role) => <article className="inventory-panel role-card" key={role.href}><div className="slot" aria-hidden="true">{role.title === '普通用户' ? '♙' : role.title === '创作者' ? '✎' : '⚒'}</div><h3>{role.title}</h3><p>{role.detail}</p><Link href={role.href}>查看入口 →</Link></article>)}</section>
    <p className="notice">账户与角色功能依赖部署时配置的数据库及 OAuth 凭据；未配置时不要将界面入口视为认证已启用。</p>
  </main>
}
