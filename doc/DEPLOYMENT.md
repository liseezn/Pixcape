# Pixcape 单镜像部署与环境变量

## 当前架构

一个 Docker 镜像包含 Next.js、Vite 静态编辑器、Blockbench、AI API 和 Nginx：

- `/`：Next.js 主站与创作中心
- `/login`、`/register`、`/account`、`/creator`、`/admin`：Next.js 页面
- `/studio/`：Vite 构建的像素编辑器
- `/blockbench/`：Blockbench Web 编辑器
- `/api/ai/`：AI API
- `/_next/static/`：Next.js 带哈希静态资源
- `/health`：容器 HTTP 健康检查

Nginx 统一接入请求。Vite 不再单独充当生产主服务器；它负责构建编辑器静态文件。带内容哈希的 Vite/Next.js 资源采用一年不可变缓存，编辑器入口 HTML 禁止长期缓存，避免发布后继续引用旧资源。

## 镜像与数据库类型

同一个镜像会同时包含 PostgreSQL、MySQL、SQLite 三个 Prisma Client 和对应驱动，运行时由 `DATABASE_PROVIDER` 选择，不需要按数据库重新构建镜像：

| 数据库 | GHCR 镜像 | `DATABASE_PROVIDER` |
|---|---|---|
| PostgreSQL（默认推荐） | `ghcr.io/liseezn/pixcape:latest` | `postgresql` |
| MySQL / MariaDB | `ghcr.io/liseezn/pixcape:latest` | `mysql` |
| SQLite（单实例） | `ghcr.io/liseezn/pixcape:latest` | `sqlite` |

GitHub Actions 会用同一个镜像分别启动三种数据库配置，并检查启动迁移、路由和 SQLite 文件持久化；所有测试通过后只发布一个镜像。

## Zeabur 部署

1. 创建一个 Docker Image 服务。
2. 三种数据库均使用 `ghcr.io/liseezn/pixcape:latest`。
3. 服务容器端口设置为 `80`。
4. 按下方配置数据库与认证环境变量。
5. 首次启动时，如果配置了 `DATABASE_URL`，容器会执行 `prisma migrate deploy`。迁移失败会导致容器启动失败，需先检查数据库连通性和迁移日志。
6. 部署后验证主页、`/login`、`/studio/`、`/blockbench/` 和 `/api/ai/models`。

SQLite 只适合单实例持久化部署，必须把容器的 `/data` 挂载到持久化卷，并设置 `DATABASE_URL=file:/data/pixcape.db`。若服务会扩容到多个副本，请使用 PostgreSQL 或 MySQL。

## 必需的数据库与认证变量

| 变量 | 示例 | 说明 |
|---|---|---|
| `DATABASE_PROVIDER` | `postgresql` | 选择 `postgresql`、`mysql` 或 `sqlite`，不需要更换镜像 |
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST:5432/pixcape?schema=public` | 生产数据库连接串，使用服务商提供的内网连接地址优先 |
| `NEXTAUTH_SECRET` | 随机高强度密钥 | 会话签名密钥，不要公开或提交到 Git |
| `NEXTAUTH_URL` | `https://你的域名` | 对外访问的规范站点 URL |
| `AUTH_GITHUB_ID` | GitHub OAuth Client ID | 启用 GitHub 登录所需 |
| `AUTH_GITHUB_SECRET` | GitHub OAuth Client Secret | 启用 GitHub 登录所需 |
| `LOGIN_RATE_LIMIT_MAX` | `10` | 每个 IP 的尝试次数上限 |
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | `900` | 限流窗口，单位秒 |
| `LOGIN_RATE_LIMIT_IP_HEADER` | `x-real-ip` | 仅在可信反向代理会覆盖该头部时使用 |
| `BOOTSTRAP_ADMIN_EMAIL` | 已登录账户的邮箱 | 仅在手动执行管理员初始化脚本时临时设置，操作后移除 |

### PostgreSQL 示例

```dotenv
PIXSCAPE_IMAGE_TAG=latest
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/pixcape?schema=public
NEXTAUTH_SECRET=替换为高强度随机密钥
NEXTAUTH_URL=https://你的域名
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
LOGIN_RATE_LIMIT_MAX=10
LOGIN_RATE_LIMIT_WINDOW_SECONDS=900
LOGIN_RATE_LIMIT_IP_HEADER=x-real-ip
```

### MySQL 示例

```dotenv
PIXSCAPE_IMAGE_TAG=latest
DATABASE_PROVIDER=mysql
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/pixcape
```

### SQLite 示例

```dotenv
PIXSCAPE_IMAGE_TAG=latest
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:/data/pixcape.db
```

创建 GitHub OAuth App 时，将授权回调 URL 设置为 `https://你的域名/api/auth/callback/github`。请使用真实域名；不要将生产环境的 `NEXTAUTH_SECRET` 或 OAuth Secret 提交到仓库。

若没有设置 `DATABASE_URL`，容器会记录警告并允许公开页面启动，但用户系统、会话和数据库功能不可用；生产部署必须配置真实数据库。不要把成功打开主页当作数据库迁移成功的证据。

## AI 环境变量

至少配置一个图像模型供应商的有效 API Key，未配置时普通编辑器仍可访问，但 AI 生成接口会提示未配置。

| 变量 | 默认值 | 说明 |
|---|---|---|
| `AI_ALLOWED_ORIGINS` | 空 | 额外允许的跨域来源，逗号分隔；同源通常无需配置 |
| `AI_DEFAULT_PROVIDER` | `auto` | `auto`、`gemini`、`openai`、`openrouter` 或 `seedream` |
| `AI_DEFAULT_MODEL` | 空 | 可选默认模型 ID |
| `AI_MAX_UPLOAD_MB` | `8` | 参考图上传大小限制 |
| `AI_RATE_LIMIT_PER_MINUTE` | `5` | 每客户端每分钟请求限制 |
| `AI_TIMEOUT_MS` | `90000` | 模型请求超时 |
| `GEMINI_API_KEY` | 空 | Google Gemini API Key |
| `GEMINI_IMAGE_MODELS` | `gemini-2.5-flash-image` | Gemini 图像模型列表 |
| `OPENAI_API_KEY` | 空 | OpenAI API Key |
| `OPENAI_IMAGE_MODELS` | `gpt-image-1,gpt-image-1.5` | OpenAI 图像模型列表 |
| `OPENROUTER_API_KEY` | 空 | OpenRouter API Key |
| `OPENROUTER_IMAGE_MODELS` | 空 | OpenRouter 图像模型列表 |
| `OPENROUTER_IMAGE_TO_IMAGE_MODELS` | 空 | 支持参考图输入的模型列表 |
| `ARK_API_KEY` | 空 | 火山引擎 Ark API Key，优先使用 |
| `VOLCENGINE_ARK_API_KEY` | 空 | Ark API Key 兼容变量 |
| `ARK_BASE_URL` | `https://ark.cn-beijing.volces.com/api/v3` | Ark API 基础地址 |
| `SEEDREAM_IMAGE_MODELS` | `doubao-seedream-4-0-250828` | Seedream 模型列表 |
| `SEEDREAM_IMAGE_SIZE` | `2K` | 图像生成尺寸 |

## 本地 Docker Compose

复制 `.env.example` 为 `.env`，按实际数据库和域名填写。不要提交含有真实密钥的 `.env` 文件。

```bash
docker compose pull
docker compose up -d
docker compose logs -f pixcape
```

本地构建只构建一次并包含三种客户端。切换数据库时修改 `DATABASE_PROVIDER` 和 `DATABASE_URL` 后重启容器即可；切换到 SQLite 时确保 `/data` 已挂载持久化卷。

## 安全与故障排查

- 数据库连接失败或迁移失败：检查镜像标签、`DATABASE_PROVIDER`、`DATABASE_URL`、数据库访问白名单及迁移日志。
- 登录入口没有 GitHub 按钮：确认 `AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET` 和 OAuth 回调 URL。
- 静态编辑器白屏或资源 404：访问 `/studio/`，检查构建日志与浏览器网络请求；不要直接将 Vite 构建产物放到根路径覆盖 Next.js。
- AI 模型列表为空：检查供应商 API Key、模型 ID、权限和余额。
- SQLite 数据丢失：检查是否把 `/data` 挂载为持久化卷。
- 健康检查成功但登录失败：`/health` 只检查 HTTP 网关可响应，不代表数据库、OAuth 或 AI 服务已经通过端到端验证。

## 关键文件

- `Dockerfile`：构建 Next.js、Vite、Blockbench 和 AI API 单镜像。
- `nginx.conf`：Next.js 反向代理、Vite/Blockbench 静态服务和缓存策略。
- `docker-entrypoint-single.sh`：执行数据库迁移并启动三个服务。
- `docker-compose.yml`：传入数据库、认证和 AI 环境变量。
- `.github/workflows/docker-publish.yml`：构建一个包含三种 Prisma Client 的镜像，依次使用 PostgreSQL、MySQL、SQLite 配置进行冒烟测试，通过后发布同一镜像。
