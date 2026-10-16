# Next.js 独立容器部署指南

## 目的与隔离原则

本仓库有两套应用入口：

- 根目录 `Dockerfile`：现有 Vite + Nginx + `/blockbench/`，继续作为当前生产入口。
- `Dockerfile.nextjs`：独立的 Next.js Node.js 服务，监听容器端口 `3000`，用于账户、创作者和管理员功能的预览/分阶段验证。

不要把 `Dockerfile.nextjs` 改名覆盖根目录 `Dockerfile`，也不要在验证完成前将现有生产域名切换到新服务。

## 数据库选择：PostgreSQL、MySQL 或 SQLite

Next.js 用户系统支持通过 `DATABASE_PROVIDER` 选择数据库。每个环境只选择一种数据库，不要混用同一数据库的迁移目录。SQLite 适合本地开发和单机轻量部署；多副本或高并发生产环境优先选择 PostgreSQL 或 MySQL。

| 变量 | PostgreSQL | MySQL |
| --- | --- | --- |
| 配置项 | PostgreSQL | MySQL | SQLite |
| --- | --- | --- | --- |
| `DATABASE_PROVIDER` | `postgresql`（默认） | `mysql` | `sqlite` |
| `DATABASE_URL` 示例 | `postgresql://USER:PASSWORD@HOST:5432/pixcape?schema=public` | `mysql://USER:PASSWORD@HOST:3306/pixcape` | `file:/data/pixcape.db` |
| Prisma schema | `prisma/schema.prisma` | `prisma/schema.mysql.prisma` | `prisma/schema.sqlite.prisma` |
| Migration 目录 | `prisma/migrations/` | `prisma/migrations-mysql/` | `prisma/migrations-sqlite/` |

构建与迁移命令会根据 `DATABASE_PROVIDER` 选择 schema 和迁移目录：

```bash
# PostgreSQL（默认）
DATABASE_PROVIDER=postgresql npm run db:generate
DATABASE_PROVIDER=postgresql npm run db:migrate

# MySQL
DATABASE_PROVIDER=mysql DATABASE_URL='mysql://USER:PASSWORD@HOST:3306/pixcape' npm run db:generate
DATABASE_PROVIDER=mysql DATABASE_URL='mysql://USER:PASSWORD@HOST:3306/pixcape' npm run db:migrate

# SQLite (single host; persist /data as a volume)
DATABASE_PROVIDER=sqlite DATABASE_URL='file:/data/pixcape.db' npm run db:generate
DATABASE_PROVIDER=sqlite DATABASE_URL='file:/data/pixcape.db' npm run db:migrate
```

每种数据库都应使用独立数据库实例/数据库名、独立备份和对应迁移目录。切换 provider 后必须重新生成 Prisma Client 并重新构建应用；不要把 PostgreSQL 生成的构建产物直接用于 MySQL 环境，反之亦然。

## 镜像构建与本地检查

需要 Node.js 24、Docker 和所选数据库。构建时指定 provider：

```bash
# PostgreSQL preview image (default)
docker build -f Dockerfile.nextjs -t pixcape-nextjs:preview .

# MySQL preview image
DOCKER_BUILDKIT=1 docker build --build-arg DATABASE_PROVIDER=mysql -f Dockerfile.nextjs -t pixcape-nextjs:mysql .

# SQLite preview image (mount persistent volume at /data)
DOCKER_BUILDKIT=1 docker build --build-arg DATABASE_PROVIDER=sqlite -f Dockerfile.nextjs -t pixcape-nextjs:sqlite .
```

注意：Dockerfile 必须把 build arg 传给 Prisma generate/build；在对应 CI 验证完成前，将 MySQL 镜像命令视为预期用法，不应直接用于生产。

## 部署环境变量

| 变量 | 要求 |
| --- | --- |
| `DATABASE_PROVIDER` | `postgresql`、`mysql` 或 `sqlite`；默认 PostgreSQL |
| `DATABASE_URL` | 与 provider 匹配的专用数据库连接串；应用运行用户不要使用超级用户 |
| `NEXTAUTH_SECRET` | 高熵随机密钥，使用密钥管理功能保存 |
| `NEXTAUTH_URL` | 部署后的 HTTPS 根 URL |
| `AUTH_GITHUB_ID` | GitHub OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `LOGIN_RATE_LIMIT_IP_HEADER` | 默认 `x-real-ip`；只在可信代理会覆盖此头时使用 |
| `LOGIN_RATE_LIMIT_MAX` | 可选，默认每 IP 每 15 分钟 10 次 |
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | 可选，默认 900 秒 |

在 GitHub OAuth App 中，将 Authorization callback URL 设置为：

```
https://<你的预览域名>/api/auth/callback/github
```

不要把真实密钥写入仓库、Docker build args、镜像层、聊天消息或日志。

## Zeabur / Vercel / 其他平台

1. 新建独立预览服务，连接 `liseezn/Pixcape` 的 `feat/nextjs-auth-foundation` 分支。
2. Docker 部署选择 `Dockerfile.nextjs`；Vercel 使用项目环境变量选择 provider，并确保 install/build 阶段运行 `npm run db:generate`（`next:build` 已包含此步骤）。
3. 将容器内部端口设置为 `3000`。先用平台预览域名，不要绑定或替换生产域名。
4. 在服务 Secret / Environment 页面配置上述变量。不要将 OAuth secret 或生产数据库 URL 配到前端公开变量。
5. 使用隔离的预览数据库；不要直接使用生产库。
6. 在预览数据库确认后，手动运行与当前 provider 和提交匹配的 `npm run db:migrate`。不要把迁移命令放入每个容器的启动命令。
7. 配置可信代理的客户端 IP 头后，验证登录限流；若无法确认平台会覆盖 `x-real-ip`，先不要对公网开放 OAuth 登录。
8. 检查容器健康状态、`/login`、未登录访问 `/account` / `/creator` / `/admin` 的拒绝行为，再测试 OAuth 登录、退出、创作者申请、管理员审核、封禁与资源所有权。
9. 只有所选数据库的迁移、集成测试和预览验收全部通过后，才制定生产迁移计划；生产数据库迁移必须先备份并由操作者明确批准。

## SQLite 持久化与限制

- 容器部署 SQLite 时设置 `DATABASE_URL=file:/data/pixcape.db`，并将 `/data` 挂载到持久化卷；不要将数据库放在容器临时文件系统中。
- SQLite 适用于单机/单副本和较低写入量场景；多副本部署、共享写入或高并发生产环境请使用 PostgreSQL 或 MySQL。
- SQLite 不支持 Prisma enum 类型，因此 `role`、`status`、`reviewStatus` 在 SQLite schema 中存为字符串；应用层仍必须校验允许的角色值。

## 当前边界

- 不同数据库使用不同 Prisma schema 和 migration history；不要将一种 provider 的 migration 用在另一种数据库。
- CI 的 PostgreSQL 验证不自动代表 MySQL 兼容验证完成。MySQL provider 需要单独的 schema generation、migration、限流原子性和权限集成测试通过后，才可视为生产就绪。
- Docker 镜像构建仅证明镜像可构建，不等于已在 Zeabur/Vercel 部署成功。
- 初始管理员应先用配置的 OAuth 登录创建账户，再在受控环境执行 `npm run db:bootstrap-admin`，只通过 `BOOTSTRAP_ADMIN_EMAIL` 指定确切账户；完成后立即移除该环境变量。
- 根目录 `Dockerfile` 和现有生产入口保持不变。
