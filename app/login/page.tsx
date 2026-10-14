import Link from 'next/link'

export default function LoginPage() {
  return <main className="inventory-shell"><header className="topbar"><div><p className="eyebrow">PIX CAPE ACCOUNT</p><h1>登录</h1></div><Link className="pixel-button" href="/">返回工作台</Link></header><section className="hero inventory-panel"><h2>账户登录正在接入</h2><p>此页面暂不收集密码，也不会假装登录成功。下一阶段将接入服务端认证、数据库会话、密码安全存储和退出登录。</p><div className="actions"><Link className="pixel-button primary" href="/register">创建账户</Link></div></section></main>
}
