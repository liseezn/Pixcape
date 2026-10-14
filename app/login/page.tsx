import Link from 'next/link'
import { signIn } from '@/auth'

const githubEnabled = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET)

export default function LoginPage() {
  return <main className="inventory-shell"><header className="topbar"><div><p className="eyebrow">PIX CAPE ACCOUNT</p><h1>登录 / 注册</h1></div><Link className="pixel-button" href="/">返回工作台</Link></header><section className="hero inventory-panel"><h2>进入你的创作空间</h2>{githubEnabled ? <><p>使用 GitHub 安全登录。首次登录会自动创建普通用户账户。</p><form action={async()=>{'use server';await signIn('github',{redirectTo:'/account'});}}><button className="pixel-button primary" type="submit">使用 GitHub 继续</button></form></> : <><p>认证入口已经接入 Auth.js，但尚未配置 GitHub OAuth 凭据。请在部署环境中设置 AUTH_GITHUB_ID 与 AUTH_GITHUB_SECRET 后启用登录。</p><p>未配置认证凭据时不会创建假会话，也不会显示登录成功。</p></>}<p>新账户默认是普通用户；创作者需审核，管理员权限只能由受保护的管理流程授予。</p></section></main>
}
