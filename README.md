# Pixcape｜我的世界皮肤工坊

Pixcape 是面向 Minecraft 皮肤的预制与编辑工作台。当前主站使用 Vite + React，提供披肩、外套、披风分类、皮肤合成与 PNG 导出、3D 角色预览，并将完整模型编辑器放在 `/blockbench/`。另有独立 Next.js 用户系统服务，用于账号、创作者和管理员功能的分阶段部署与验证。

## 功能概览

- 披肩 / 外套 / 披风独立分类，按当前选中分类展示素材。
- 皮肤 PNG 导入、预制合成与导出。
- Steve / Alex 角色与实时 3D 预览。
- 内置 Blockbench Web 编辑器入口：`/blockbench/`。
- PWA 安装支持、Service Worker 与 Open Graph 分享元数据。
- 独立 Next.js 服务：GitHub OAuth、数据库会话、账号/创作者/管理员角色与资源所有权控制；生产启用前须完成独立环境验收。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 主站前端 | React 19、TypeScript、Vite 8 |
| 3D 预览 | Three.js、skinview3d |
| UI | Radix UI Tabs / Tooltip、Lucide React |
| PWA | vite-plugin-pwa、Workbox |
| 主站生产托管 | Docker、Nginx、内置 Blockbench Web 资源 |
| 账户服务 | Next.js 16、NextAuth、Prisma 7 |
| 数据库适配 | PostgreSQL、MySQL/MariaDB、SQLite |
| CI / 依赖 | GitHub Actions、Dependabot |

具体版本以 `package.json`、锁文件及各 Dockerfile 为准。主站仍使用 Vite；没有将 Webpack 作为第二套前端构建器引入。

## 本地开发

需要与项目依赖兼容的 Node.js 版本和 npm。

```bash
npm install
npm run dev
```

## 构建与测试

```bash
npm run build
npm run test
npm run test:e2e
npm run preview
```

- `npm run build` 同时构建 Blockbench Web 资源和主站。
- `npm run test` 运行单元测试与安全集成测试。
- `npm run test:e2e` 运行端到端测试。
- MySQL / SQLite 限流集成测试可分别通过 `npm run test:mysql-rate-limit` 与 `npm run test:sqlite-rate-limit` 执行；测试结果取决于对应数据库环境配置。

## Docker 部署

```bash
docker compose up --build -d
```

根目录 `Dockerfile` 用于当前 Vite + Nginx 主站；`Dockerfile.nextjs` 用于独立 Next.js 服务，容器端口为 3000。两者应分开部署和配置环境变量。不要在没有预览验收、备份与批准的情况下将 Next.js 服务切换为生产入口或执行生产数据库迁移。

详细说明：
- [项目架构与 UI 约定](docs/PROJECT_OVERVIEW.md)
- [Next.js 用户系统与角色迁移方案](docs/NEXTJS-USER-ROLES-MIGRATION.md)
- [Next.js 独立容器部署](docs/NEXTJS-CONTAINER-DEPLOYMENT.md)
- [生产安全上线清单](docs/PRODUCTION-SECURITY-ROLLOUT.md)
- [PWA、Open Graph 与部署检查](docs/PWA-SEO-DEPLOYMENT.md)
- [AI 模型接入架构](docs/AI-MODEL-ARCHITECTURE.md)
- [第三方许可证声明](THIRD_PARTY_NOTICES.md)

## 常见问题

- 更新后仍显示旧页面：确认托管平台部署了最新镜像；必要时清除旧 PWA / Service Worker 缓存。
- 模板图片加载失败：检查对远程素材源的访问；这与主站构建是否成功是不同问题。
- Blockbench 路径异常：确认 Nginx 将 `/blockbench/` 指向编辑器资源，而不是 SPA 的离线导航回退。
- 登录 / 角色功能不可用：检查独立 Next.js 服务、OAuth 回调、数据库 provider、迁移状态和服务端 Secret。

## 声明与素材署名

Pixcape 是非官方 Minecraft 社区项目，与 Mojang Studios / Microsoft 无关联。外套与披肩素材署名：**邹陈云飞、Th千**。部分素材与第三方编辑器按其各自许可证使用，详情见 `THIRD_PARTY_NOTICES.md`。

## License

Pixcape 自有代码采用 MIT 许可证；第三方代码与素材按各自许可证执行。
