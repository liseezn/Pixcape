# Pixcape 项目说明

更新日期：2026-10-17

Pixcape 是面向 Minecraft 皮肤的预制与编辑工作台。仓库当前包含两个独立应用入口：Vite 主站与 Next.js 账户服务。它们共用代码仓库，但应分别构建、配置和部署。

## 架构与运行边界

| 入口 | 技术 | 用途 | 生产状态原则 |
| --- | --- | --- | --- |
| 根目录 `Dockerfile` | Vite + Nginx | 皮肤工作台、静态资源、`/blockbench/` | 现有主站入口，保持独立 |
| `Dockerfile.nextjs` | Next.js Node 服务，端口 3000 | 账户、创作者、管理员功能 | 独立预览与验收；切换生产需另行审批 |

不要用 `Dockerfile.nextjs` 覆盖根目录 `Dockerfile`。代码合并、CI 通过、镜像构建成功和真实生产部署成功是不同状态，文档与发布说明必须分别记录。

## 技术栈

- React 19 + TypeScript：主站界面与交互。
- Vite 8：主站开发服务器与前端构建；项目没有 Webpack 构建配置。
- Three.js + skinview3d：Minecraft 角色 3D 预览。
- Lucide React、Radix UI Tabs / Tooltip：图标、分类切换与操作提示。
- vite-plugin-pwa + Workbox：Web App Manifest、Service Worker 与静态资源缓存。
- Nginx + Docker：主站静态托管与 Blockbench Web 编辑器资源。
- Next.js 16 + NextAuth + Prisma 7：独立账号服务、GitHub OAuth、数据库会话、角色与资源授权。
- 数据库 provider：PostgreSQL、MySQL/MariaDB、SQLite。各 provider 使用独立 Prisma schema 和迁移历史，禁止跨 provider 复用迁移目录。
- GitHub Actions：构建、测试和安全检查；依赖更新由 Dependabot 管理。

依赖的具体版本以 `package.json` 与 lockfile 为准。版本号会持续更新，不应把本文中的技术栈摘要视为精确的锁定版本清单。

## 主要功能

- 披肩、外套、披风分类分离；选择分类后只展示该类素材。
- 导入标准 64 × 64 PNG 皮肤，预制合成并导出 PNG。
- Steve / Alex 角色 3D 预览与动作预览。
- 将预制传递到完整 Blockbench Web 编辑器。
- PWA 安装、Service Worker 更新和 Open Graph 分享元数据。
- 独立账户服务规划与实现账号、创作者、管理员角色、会话、资源所有权和安全限流。

功能是否在生产域名启用，应以部署配置与线上验收为准，不能仅依据仓库中存在代码作判断。

## UI 设计约定

- 采用 Minecraft Java 物品栏的视觉语言：石头灰色面板、凸起/凹陷边框、方形物品槽、紧凑文字层级和高对比选中态。
- 草方块绿用于选中与重点交互，避免普通 SaaS 圆角卡片和大面积渐变。
- 当前皮肤与角色预览应优先展示；分类内容随当前选项切换。
- `src/minecraft-inventory.css` 维护主要物品栏风格。
- 窄屏采用纵向布局，关键操作保持易触控；桌面与移动端均需回归测试。
- Radix Tooltip 组件必须置于 `Tooltip.Provider` 内，避免运行时异常造成工作台白屏。

## 加载错误处理与排查

- 远程模板素材失败时，应有备用纹理或明确错误提示，不应无限加载。
- React 运行时错误应显示可诊断信息与重新加载入口。
- 线上白屏时先检查浏览器控制台、部署镜像版本、路由与资源路径，再判断是否为 PWA / Service Worker 旧缓存；清缓存不能代替代码修复。
- `/blockbench/` 必须指向编辑器资源，不应被 SPA 离线导航回退规则吞掉。

## PWA 与分享预览

- `vite.config.ts` 配置 `vite-plugin-pwa`。
- 图标：`public/pixcape-icon.svg`。
- 分享预览图：`public/pixcape-og.svg`。
- Open Graph / Twitter 元数据在根目录 `index.html` 中维护。
- 正式域名应使用绝对 HTTPS 分享图 URL；需验证目标平台是否支持 SVG，否则提供 PNG/JPEG 版本。

## 本地开发与构建

```bash
npm install
npm run dev
npm run build
npm run test
npm run test:e2e
npm run preview
```

`npm run build` 包含 Blockbench Web 资源与主站构建。账户服务可通过 `npm run next:dev`、`npm run next:build`、`npm run next:start` 独立运行；运行数据库迁移前必须确认当前 provider、目标数据库和备份。

## 安全与上线边界

- 不在仓库、聊天、Docker 镜像层或日志中保存密钥。
- OAuth 登录必须使用 HTTPS、正确回调地址和高熵 Secret。
- 登录限流依赖可信代理提供的客户端 IP 头；未确认代理会覆盖该头前，不应公开开放登录。
- 生产迁移必须先备份并由操作者明确批准；不要在每个应用容器启动时自动迁移。
- 生产启用前检查会话撤销、RBAC、资源所有权、封禁行为、审计日志与并发状态转换。
- 详细执行清单见 [生产安全上线操作手册](./PRODUCTION-SECURITY-ROLLOUT.md)。
