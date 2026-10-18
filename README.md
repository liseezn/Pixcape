# Pixcape｜我的世界皮肤工坊

Pixcape 是面向 Minecraft 皮肤的预制与编辑工作台，支持披肩、外套、披风分类、皮肤合成与 PNG 导出、3D 角色预览，并提供 Blockbench Web 编辑器入口。

## 当前项目入口

- **文档中心：** [docs/README.md](docs/README.md)
- **单镜像部署与环境变量：** [docs/SINGLE-IMAGE-PRODUCTION.md](docs/SINGLE-IMAGE-PRODUCTION.md)
- **用户系统与角色迁移：** [docs/NEXTJS-USER-ROLES-MIGRATION.md](docs/NEXTJS-USER-ROLES-MIGRATION.md)
- **生产安全验收：** [docs/PRODUCTION-SECURITY-ROLLOUT.md](docs/PRODUCTION-SECURITY-ROLLOUT.md)
- **第三方许可证：** [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

## 功能概览

- 披肩 / 外套 / 披风独立分类，按当前选中分类展示素材。
- 皮肤 PNG 导入、预制合成与导出。
- Steve / Alex 角色与实时 3D 预览。
- 内置 Blockbench Web 编辑器入口：/blockbench/。
- PWA 安装支持、Service Worker 与 Open Graph 分享元数据。
- Next.js 用户系统、创作者和管理员功能正在按独立部署/单镜像方案分阶段验证；生产启用状态以真实部署验收为准。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 编辑器前端 | React、TypeScript、Vite |
| 3D 预览 | Three.js、skinview3d |
| UI | Radix UI、Lucide React |
| PWA | vite-plugin-pwa、Workbox |
| Web 服务 | Docker、Nginx |
| 账户与 API | Next.js、NextAuth、Prisma |
| 数据库适配 | PostgreSQL、MySQL/MariaDB、SQLite |
| CI / 依赖 | GitHub Actions、Dependabot |

准确版本以根目录 package.json、锁文件、Dockerfile 和工作流为准。不要仅凭文档中的技术栈判断某个生产服务已启用。

## 本地开发

```bash
npm install
npm run dev
```

## 构建与测试

```bash
npm run build
npm run test
npm run test:e2e
```

脚本的完整列表以 package.json 为准。数据库专项测试需要配置对应的测试数据库；CI 未运行或环境不可用时，不应将其描述为已通过。

## 部署提示

当前仓库同时包含主站/编辑器和 Next.js 账户相关代码。部署入口、端口、环境变量和迁移策略请以单镜像生产部署文档为准；不要混用根目录 Dockerfile 与 Dockerfile.nextjs 的配置。生产数据库迁移前必须确认目标环境和可恢复备份。

## 声明与素材署名

Pixcape 是非官方 Minecraft 社区项目，与 Mojang Studios / Microsoft 无关联。外套与披肩素材署名：**邹陈云飞、Th千**。第三方代码与素材按各自许可证使用，详情见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
