import Link from 'next/link'

export default function RegisterPage() {
  return <main className="inventory-shell"><header className="topbar"><div><p className="eyebrow">PIX CAPE ACCOUNT</p><h1>创建账户</h1></div><Link className="pixel-button" href="/">返回工作台</Link></header><section className="hero inventory-panel"><h2>从普通用户开始</h2><p>新账户将默认分配普通用户角色。创作者资格通过申请与审核获得；管理员权限不能通过公开注册表单申请或自行修改。</p><p>注册表单将在数据库与认证配置完成后启用。</p><div className="actions"><Link className="pixel-button primary" href="/login">已有账户？登录</Link></div></section></main>
}
