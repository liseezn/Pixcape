# Next.js 独立容器部署指南

## 目的与隔离原则

本仓库目前有两套应用入口：

- 根目录 `Dockerfile`：现有 Vite + Nginx + `/blockbench/`，继续作为当前生产入口。
- `Dockerfile.nextjs`：独立的 Next.js Node.js 服务，监听容器端口 `3000`，用于账户、创作者和管理员功能的预览/分阶段验证。

不要把 `Dockerfile.nextjs` 改名覆盖根目录 `Dockerfile`，也不要在验证完成前将现有生产域名切换到新服务。

## 镜像构建与本地检查

需要 Node.js 24、Docker 和可用的 PostgreSQL 数据库。构建镜像：

```bash
docker build -f Dockerfile.nextjs -t pixcape-nextjs:preview .
```

镜像构建不执行生产迁移，也不会自动创建管理员。部署后应用需要在环境变量中配置：

| 变量 | 要求 |
| --- | --- |
| `DATABASE_URL` | 专用 PostgreSQL 数据库连接串；应用运行用户不要使用超级用户 |
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

## Zeabur / 其他 Docker 平台

1. 新建独立服务，连接 `liseezn/Pixcape` 仓库的 `feat/nextjs-auth-foundation` 分支。
2. 将 Dockerfile 路径设置为 `Dockerfile.nextjs`。如果平台无法指定 Dockerfile 路径，应先在 CI 构建并发布单独的镜像，再将镜像部署到新服务；不要修改当前生产服务的 Dockerfile。
3. 服务内部端口设置为 `3000`。使用平台生成的预览域名，先不要绑定或替换生产域名。
4. 在服务 Secret / Environment 页面配置上述变量。不要将 OAuth secret 或生产数据库 URL 配到前端公开变量。
5. 使用独立的预览 PostgreSQL 数据库；不要直接使用生产库。
6. 在预览数据库完成备份/确认后，手动运行与当前提交匹配的迁移命令：`npm run db:migrate`。不要把迁移命令放入每个容器的启动命令。
7. 配置可信代理的客户端 IP 头后，验证登录限流；若无法确认平台会覆盖 `x-real-ip`，先不要对公网开放 OAuth 登录。
8. 检查容器健康状态、`/login`、未登录访问 `/account` / `/creator` / `/admin` 的拒绝行为，再测试 OAuth 登录、退出、创作者申请、管理员审核、封禁与资源所有权。
9. 只有所有预览验收项通过后，才制定独立的生产迁移计划；生产数据库迁移必须先备份并由操作者明确批准。

## 当前边界

- Docker 镜像构建仅证明镜像可构建，不等于已在 Zeabur/Vercel 部署成功。
- 自动化 CI 使用的是临时 PostgreSQL，不代表真实 OAuth、预览域名代理头或生产数据库已验证。
- 初始管理员应先用配置的 OAuth 登录创建账户，再在受控环境执行 `npm run db:bootstrap-admin`，只通过 `BOOTSTRAP_ADMIN_EMAIL` 指定确切账户；完成后立即移除该环境变量。
- 根目录 `Dockerfile` 和现有生产入口保持不变。
