import Link from 'next/link'
import { requireRole } from '@/lib/require-role'

export default async function AdminPage(){
  const user = await requireRole('ADMIN')
  return <main className="inventory-shell"><header className="topbar"><div><p className="eyebrow">SERVER OPERATIONS</p><h1>管理员后台</h1></div><Link className="pixel-button" href="/">返回</Link></header><section className="hero inventory-panel"><h2>管理控制台</h2><p>已通过服务端管理员角色检查。当前账号：{user.name ?? user.email ?? user.id}</p><p>用户管理、作品审核和审计日志功能仍在开发中；此页面暂不执行管理写操作。</p></section></main>
}
