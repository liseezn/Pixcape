# Pixcape 生产安全上线操作手册

更新日期：2026-10-17

> 本文是生产执行清单，不代表已访问或修改生产数据库。PR #16 已合并到 `main`，但代码合并和 CI 通过不等于生产环境已迁移或已启用 Next.js 服务。现有主站入口仍由根目录 `Dockerfile` 提供 Vite 静态应用与 `/blockbench/`；不要未经单独验收就切换生产入口。

## 当前架构

- 根目录 `Dockerfile`：现有 Vite + Nginx 主站，包含 Blockbench Web 资源。
- `Dockerfile.nextjs`：独立账户服务，容器端口 3000。
- 数据库 provider：PostgreSQL、MySQL/MariaDB、SQLite；每种数据库有独立 schema 和迁移历史。
- 部署指南：[Next.js 独立容器部署](./NEXTJS-CONTAINER-DEPLOYMENT.md)。

## 上线前必须满足

- [ ] 创建隔离的预览数据库和最小权限数据库用户。
- [ ] 在部署平台 Secret 中设置 `DATABASE_URL`、`NEXTAUTH_SECRET`、`NEXTAUTH_URL`、`AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET`。
- [ ] GitHub OAuth 回调地址与预览 HTTPS 域名完全一致。
- [ ] 独立 Next.js 服务健康检查通过；根目录生产入口保持不变。
- [ ] 登录限流所使用的 IP 头由可信代理/CDN 覆盖，不能允许客户端伪造。未确认前不要向公网开放登录。
- [ ] 对当前发布提交运行自动化测试、依赖漏洞检查和镜像构建，并保存运行链接/结果。
- [ ] 按当前安全工作流要求检查 CodeQL/SARIF 结果；不要仅凭 workflow 名称宣称已启用 GitHub Code Scanning。

## 数据库迁移（必须手动批准）

1. 确认目标数据库实例、数据库名称、迁移身份和备份位置。
2. 使用数据库托管平台创建可恢复备份，记录备份 ID、时间与恢复方式。
3. 使用与发布提交一致的代码和 Secret 检查迁移状态：`npx prisma migrate status`。
4. 操作者再次确认目标库与备份后，执行一次 `npx prisma migrate deploy`。
5. 再次检查迁移状态，并核对 `_prisma_migrations`、表、索引和外键。
6. 迁移成功且烟雾测试通过后才考虑切换流量。失败时停止发布并按托管平台恢复流程处理；不要删除迁移记录或在生产运行 `migrate reset`。

不要将迁移命令放入每个应用副本的启动命令中。

## 上线后安全与功能烟雾测试

- [ ] 未登录访问 `/account`、`/creator`、`/admin` 均被拒绝或重定向到登录。
- [ ] GitHub OAuth 登录、回调、退出和数据库会话创建/删除正常。
- [ ] 超过登录限额返回 HTTP 429、正数 `Retry-After` 与 `Cache-Control: no-store`。
- [ ] 限流数据库故障时认证入口失败关闭，不得绕过限流。
- [ ] 普通用户无法执行管理员操作；创作者不能读取或修改其他用户的私有资源。
- [ ] 账号封禁后，旧会话不能继续访问受保护页面或执行写操作。
- [ ] 管理员审核/封禁产生审计日志；并发重复审核仅允许一次有效状态转换。
- [ ] 主站皮肤 PNG 导入/导出、3D 预览、`/blockbench/`、PWA 缓存与健康检查仍正常。

## 自动化验证状态

仓库记录显示，截至 2026-10-17，PR #16 合并前的安全工作流已对 PostgreSQL、MySQL 和 SQLite 的 schema/migration、数据库限流并发、RBAC/资源所有权、集成测试、Vite/Next.js 构建、独立 Next.js 镜像构建和 HTTP 安全 E2E 进行检查；另有主站构建、依赖漏洞门禁、包含 Blockbench 的 Docker 构建与 CodeQL 分析记录。请在发布时针对当前 `main` 提交重新核对对应 workflow run，不能把旧提交的成功结果自动视为当前提交结果。

自动化结果不代表真实生产 OAuth、生产代理配置、部署平台 Secret、生产数据库迁移或生产域名验收已经完成。

## 上线记录模板

每次发布至少记录：

- 发布提交 SHA 与镜像标签：
- 预览环境 / 生产环境：
- 数据库 provider 与迁移状态（不得记录密码或完整连接串）：
- CI / 安全工作流链接：
- OAuth 与可信代理验证结果：
- 备份标识与恢复验证：
- 烟雾测试结果：
- 执行人、时间与回滚决定：

在真实环境证据补齐前，保持现有生产入口不变。
