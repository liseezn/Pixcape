import Link from 'next/link'
import { requireRole } from '@/lib/require-role'

export default async function CreatorPage(){
  const user = await requireRole('CREATOR')
  return <main className="inventory-shell"><header className="topbar"><div><p className="eyebrow">CREATOR WORKSHOP</p><h1>创作者工作台</h1></div><Link className="pixel-button" href="/">返回</Link></header><section className="hero inventory-panel"><h2>创作与作品管理</h2><p>欢迎，{user.name ?? user.email ?? user.id}。已通过服务端创作者角色检查。</p><p>作品草稿、纹理素材管理和发布操作将在后续阶段接入，并会检查作品所有权。</p></section></main>
}
