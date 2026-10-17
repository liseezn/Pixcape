# Next.js 独立容器部署与环境变量指南

更新日期：2026-10-17

## 1. 先确认部署的是哪一个服务

本仓库有两套独立应用入口，环境变量不能混为一谈：

- 根目录 `Dockerfile`：现有 Vite + Nginx 主站，包含 `/blockbench/`。
- `Dockerfile.nextjs`：Next.js Node.js 服务，容器端口为 `3000`，用于账户、创作者和管理员功能。

如果部署现有主站，不要因为 Next.js 文档而改用 `Dockerfile.nextjs`。如果部署账户系统，才选择 `Dockerfile.nextjs`。两者分别配置域名、变量、数据库和健康检查。

## 2. Next.js 必需环境变量

在 Zeabur、Vercel 或其他平台的服务设置中添加以下变量。值请在目标平台的 Secret / Environment Variables 页面填写，不要提交真实值到 Git。

| 变量 | 必需 | 示例 / 默认值 | 用途 |
| --- | --- | --- | --- |
| `DATABASE_PROVIDER` | 是 | `postgresql` | 选择 `postgresql`、`mysql` 或 `sqlite`，必须与构建时选择的 schema/provider 一致 |
| `DATABASE_URL` | 是 | 见数据库章节 | 数据库连接串；密码应 URL 编码，数据库账号遵循最小权限 |
| `NEXTAUTH_SECRET` | 是 | 随机高熵密钥 | NextAuth 会话/令牌签名密钥；生产环境不得使用示例值 |
| `NEXTAUTH_URL` | 是 | `https://你的账户服务域名` | NextAuth 服务的公开根 URL，必须与真实部署域名一致 |
| `AUTH_GITHUB_ID` | 使用 GitHub 登录时必需 | GitHub OAuth Client ID | GitHub OAuth 应用的 Client ID |
| `AUTH_GITHUB_SECRET` | 使用 GitHub 登录时必需 | GitHub OAuth Client Secret | GitHub OAuth 应用的密钥，只放服务端 Secret |
| `LOGIN_RATE_LIMIT_MAX` | 否 | `10` | 每个 IP 在限流窗口内允许的登录尝试次数 |
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | 否 | `900` | 登录限流窗口秒数；默认 15 分钟 |
| `LOGIN_RATE_LIMIT_IP_HEADER` | 否 | `x-real-ip` | 从可信反向代理读取客户端 IP 的请求头；仅当代理会覆盖此头时使用 |
| `BOOTSTRAP_ADMIN_EMAIL` | 仅初始化管理员时 | 不设置 | 一次性管理员引导命令所使用的确切邮箱；完成后必须删除 |

`NODE_ENV` 由生产镜像/运行环境设置为 `production`。不要将 `NEXTAUTH_SECRET`、`AUTH_GITHUB_SECRET` 或数据库密码设置成 `NEXT_PUBLIC_*` 变量。不要把 Secret 放进 Docker build args、前端代码、日志或聊天消息。

生成随机密钥示例（在自己的终端运行；不要把生成结果发到聊天中）：

```bash
openssl rand -base64 32
```

将命令输出作为 `NEXTAUTH_SECRET` 的值。

## 3. 数据库连接配置

每个部署环境只选择一种数据库。下面的 URL 是占位示例，必须替换用户名、密码、主机、端口和数据库名。

| 数据库 | `DATABASE_PROVIDER` | `DATABASE_URL` 示例 | Prisma schema | 迁移目录 |
| --- | --- | --- | --- | --- |
| PostgreSQL | `postgresql` | `postgresql://USER:PASSWORD@HOST:5432/pixcape?schema=public` | `prisma/schema.prisma` | `prisma/migrations/` |
| MySQL / MariaDB | `mysql` | `mysql://USER:PASSWORD@HOST:3306/pixcape` | `prisma/schema.mysql.prisma` | `prisma/migrations-mysql/` |
| SQLite | `sqlite` | `file:/data/pixcape.db` | `prisma/schema.sqlite.prisma` | `prisma/migrations-sqlite/` |

切换数据库 provider 后，必须按对应 schema 重新生成 Prisma Client 并重新构建镜像。不能将一种数据库的生成客户端或迁移用于另一种数据库。

SQLite 仅建议单实例、单副本部署。必须将容器 `/data` 挂载到持久化卷，否则容器重建可能丢失数据库文件；多副本或较高写入量场景优先使用 PostgreSQL 或 MySQL/MariaDB。

## 4. GitHub OAuth 配置

1. 在 GitHub Developer Settings 中创建 OAuth App。
2. Homepage URL 填账户服务的公开 HTTPS 根 URL。
3. Authorization callback URL 填：

```text
https://你的账户服务域名/api/auth/callback/github
```

4. 将 OAuth App 的 Client ID 写入 `AUTH_GITHUB_ID`，将 Client Secret 写入 `AUTH_GITHUB_SECRET`。
5. 将 `NEXTAUTH_URL` 设置为同一个账户服务根 URL；不要加上 callback 路径。
6. 部署后测试登录、回调和退出。预览域名和生产域名不同的话，应分别确认 OAuth App 的回调配置。

当前认证配置在未提供 GitHub OAuth ID 和 Secret 时不会注册 GitHub 登录提供方，因此登录功能不会正常可用。

## 5. Zeabur / Vercel Docker 部署步骤

1. 创建独立的 Next.js 预览服务，并选择包含对应代码的提交。
2. Docker 部署时指定仓库根目录下的 `Dockerfile.nextjs`，容器端口设置为 `3000`。
3. 创建隔离的预览数据库，按上表设置 `DATABASE_PROVIDER` 和 `DATABASE_URL`。
4. 在服务的 Variables / Environment Variables / Secrets 设置页逐项添加本节必需变量及需要的可选变量。变量名必须完全一致；修改后按平台要求重新部署。
5. 添加 GitHub OAuth 变量和匹配的 callback URL。
6. 先检查当前提交、数据库 provider 和迁移状态；确认目标数据库与备份策略后，才执行迁移。
7. 验证反向代理会覆盖 `x-real-ip`（或你配置的可信头）。若无法确认代理信任边界，不要把依赖 IP 限流的登录端点直接暴露到公网。
8. 检查健康状态、登录/OAuth 回调、退出、创作者流程、管理员审核/封禁及资源所有权。
9. 生产迁移前先备份数据库，并由维护者明确批准。预览构建成功不等于生产环境已部署或通过安全验收。

## 6. 迁移与初始化管理员

数据库 schema 变更需要使用与 provider 匹配的迁移目录。不要在生产启动时未经审查就自动执行开发迁移。

示例命令（请在有正确环境变量、且指向目标数据库的受控环境执行）：

```bash
# PostgreSQL
DATABASE_PROVIDER=postgresql npm run db:generate
DATABASE_PROVIDER=postgresql npm run db:migrate

# MySQL / MariaDB
DATABASE_PROVIDER=mysql DATABASE_URL='mysql://USER:PASSWORD@HOST:3306/pixcape' npm run db:generate
DATABASE_PROVIDER=mysql DATABASE_URL='mysql://USER:PASSWORD@HOST:3306/pixcape' npm run db:migrate

# SQLite
DATABASE_PROVIDER=sqlite DATABASE_URL='file:/data/pixcape.db' npm run db:generate
DATABASE_PROVIDER=sqlite DATABASE_URL='file:/data/pixcape.db' npm run db:migrate
```

管理员引导仅在受控环境进行：先使用目标邮箱完成 OAuth 登录，然后短暂设置 `BOOTSTRAP_ADMIN_EMAIL` 为该确切邮箱，并运行 `npm run db:bootstrap-admin`。确认成功后立即删除该变量，禁止长期保留或公开管理员引导开关。

## 7. 根目录 `.env.example` 与本地开发

仓库的 `.env.example` 可作为本地开发模板。复制为 `.env.local` 后再填写自己的值；不要把真实的 `.env.local` 提交到仓库。

```bash
cp .env.example .env.local
```

示例文件中的占位数据库凭据、随机密钥提示和空 OAuth 值不能直接用于生产。主站 Vite 环境变量与 Next.js 服务端环境变量应分别管理；不要假设为主站配置的变量会自动传入另一个服务。

## 8. 验收边界

- CI 或镜像构建成功不代表已在 Zeabur/Vercel 完成真实部署。
- 一个数据库 provider 的测试通过，不代表其他 provider 也通过。
- 生产 OAuth 凭据、Secret、代理头、域名、持久化卷、数据库迁移和回滚方案必须在真实环境单独验证。
- 保持根目录 `Dockerfile` 与现有主站入口不变，直到 Next.js 预览、迁移、安全测试和生产切换均经过单独审批。
