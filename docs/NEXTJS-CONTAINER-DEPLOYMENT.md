# Next.js 独立容器部署指南

更新日期：2026-10-17

## 目的与隔离原则

本仓库有两套应用入口：

- 根目录 `Dockerfile`：Vite + Nginx + `/blockbench/`，继续作为现有主站入口。
- `Dockerfile.nextjs`：独立 Next.js Node.js 服务，监听容器端口 `3000)，用于账户、创作者和管理员功能。

两套服务需要分别构建、配置环境变量、健康检查与部署。不要将 `Dockerfile.nextjs` 覆盖根目录 `Dockerfile`，也不要在预览验收完成前切换生产域名。

## 数据库选择

通过 `DATABASE_PROVIDER` 选择数据库。每个环境只使用一个 provider；不同 provider 必须使用对应的 Prisma schema、生成的客户端和迁移目录。

| 配置 | PostgreSQL | MySQL / MariaDB | SQLite |
| --- | --- | --- | --- |
| `DATABASE_PROVIDER` | `postgresql` | `mysql` | `sqlite` |
| `DATABASE_URL` 示例 | `postgresql://USER:PASSWORD@HOST:5432/pixcape?schema=public` | `mysql://USER:PASSWORD@HOST:3306/pixcape` | `file:/data/pixcape.db` |
| Prisma schema | `prisma/schema.prisma` | `prisma/schema.mysql.prisma` | `prisma/schema.sqlite.prisma` |
| Migration 目录 | `prisma/migrations/` | `prisma/migrations-mysql/` | `prisma/migrations-sqlite/` |

示例命令：

```bash
# PostgreSQL
DATABASE_PROVIDER=postgresql npm run db:generate
DATABASE_PROVIDER=postgresql npm run db:migrate

# MySQL / MariaDB
DATABASE_PROVIDER=mysql DATABASE_URL='mysql://USER:PASSWORD@HOST:3306/pixcape' npm run db:generate
DATABASE_PROVIDER=mysql DATABASE_URL='mysql://USER:PASSWORD@HOST:3306/pixcape' npm run db:migrate

# SQLite：单机部署并持久化 /data
DATABASE_PROVIDER=sqlite DATABASE_URL='file:/data/pixcape.db' npm run db:generate
DATABASE_PROVIDER=sqlite DATABASE_URL='file:/data/pixcape.db' npm run db:migrate
```

切换 provider 后必须重新生成 Prisma Client 并重新构建。不要将一个 provider 生成的客户端或迁移用于另一种数据库。

## 构建镜像

需要 Docker、与项目依赖兼容的 Node.js，以及所选数据库环境。

```bash
# 默认 PostgreSQL preview image
docker build -f Dockerfile.nextjs -t pixcape-nextjs:preview .

# MySQL / MariaDB preview image
DOCKER_BUILDKIT=1 docker build --build-arg DATABASE_PROVIDER=mysql -f Dockerfile.nextjs -t pixcape-nextjs:mysql .

# SQLite preview image
DOCKER_BUILDKIT=1 docker build --build-arg DATABASE_PROVIDER=sqlite -f Dockerfile.nextjs -t pixcape-nextjs:sqlite .
```

镜像能构建不代表对应数据库的迁移、运行时连接或生产部署已验证。各 provider 必须分别运行 schema、migration、集成测试和安全测试。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_PROVIDER` | `postgresql`、`mysql` 或 `sqlite` |
| `DATABASE_URL` | 与 provider 匹配的连接串；应用账号仅授予必要权限 |
| `NEXTAUTH_SECRET` | 高熵随机密钥，通过部署平台 Secret 管理 |
| `NEXTAUTH_URL` | 部署后的 HTTPS 根 URL |
| `AUTH_GITHUB_ID` | GitHub OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `LOGIN_RATE_LIMIT_IP_HEADER` | 默认 `x-real-ip)，只允许配置为可信代理会重写的头 |
| `LOGIN_RATE_LIMIT_MAX` | 可选，默认每 IP 每 15 分钟 10 次 |
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | 可选，默认 900 秒 |

GitHub OAuth callback URL 应为：

```
https://<预览域名>/api/auth/callback/github
```

不要把真实密钥写入仓库、Docker build args、镜像层、聊天消息或日志。

## Zeabur / Vercel / 其他平台

1. 创建独立预览服务，并选择包含 Next.js 服务代码的分支或提交。
2. Docker 部署使用 `Dockerfile.nextjs`；容器端口设为 `3000`。
3. 使用隔离的预览数据库，不要连接生产库。
4. 在平台 Secret 中配置上述变量，避免把服务端密钥放进公开前端变量。
5. 先执行与当前 provider、提交版本相匹配的迁移状态检查；确认目标数据库后再执行迁移。
6. 验证代理会覆盖客户端 IP 头，再测试登录限流；无法确认可信代理配置时，不要向公网开放登录。
7. 检查健康状态、登录、OAuth 回调、退出、创作者流程、管理员审核/封禁及资源所有权。
8. 只有迁移、自动化测试和预览验收全部通过后，才规划生产迁移。生产迁移必须先备份并由操作者明确批准。

## SQLite 持久化与限制

- 使用 `DATABASE_URL=file:/data/pixcape.db`，并将容器 `/data` 挂载到持久化卷。
- SQLite 适合单机、单副本和较低写入量场景；多副本或高并发部署优先考虑 PostgreSQL 或 MySQL/MariaDB。
- SQLite schema 将部分枚举字段保存为字符串，应用层仍必须校验允许的角色与状态值。

## 验收边界

- CI 中某一数据库通过，不代表其他 provider 自动通过。
- CI 或镜像构建成功不代表已在 Zeabur/Vercel 完成真实部署。
- 真实 OAuth 凭据、生产 Secret、代理头、生产域名和生产数据库状态必须在真实环境单独验证。
- 初始管理员引导仅在受控环境执行：先由目标邮箱完成 OAuth 登录，再使用 `BOOTSTRAP_ADMIN_EMAIL` 指定确切账户运行 `npm run db:bootstrap-admin`；完成后立即移除该环境变量。
- 保持根目录 `Dockerfile` 与现有主站入口不变，直至单独审批切换。
