# Pixcape 生产安全上线操作手册

> 本文是生产执行清单，不代表已访问或修改生产数据库。当前 PR #16 仍为 Draft；现有生产容器仍以 Nginx 提供 Vite 静态应用和 `/blockbench/`，并未运行 Next.js 服务。不要把本分支直接切换为生产入口。

## Next.js 独立预览服务

- 新增 `Dockerfile.nextjs`，用于独立运行账户/创作者/管理员 Next.js 服务（容器端口 3000）；根目录 `Dockerfile` 保持原有 Vite + Nginx + Blockbench 生产入口不变。
- 按照 [Next.js 独立容器部署指南](./NEXTJS-CONTAINER-DEPLOYMENT.md) 创建隔离的预览服务和预览 PostgreSQL，不要直接绑定生产域名或连接生产数据库。
- 当前提交新增 Next.js 运行时镜像构建步骤；需等待新一轮 Preview Security workflow 验证该镜像能完整构建后，再宣称容器构建通过。

## 上线前必须满足

- [ ] 选择并创建独立的 PostgreSQL 数据库/用户；应用用户只授予应用所需权限，不使用数据库超级用户。
- [ ] 在部署平台 Secret 中设置 `DATABASE_URL`、`NEXTAUTH_SECRET`、`NEXTAUTH_URL`、`AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET`。不要在聊天、工单、提交或构建日志中粘贴密钥。
- [ ] 配置 GitHub OAuth 回调地址为部署域名的 `/api/auth/callback/github`，并验证 HTTPS。
- [ ] 确认部署平台有独立的 Next.js Node 服务/容器。当前根目录 `Dockerfile` 只构建 Vite + Blockbench 静态内容，不提供 Next.js 运行时。
- [ ] 在代理/CDN 层覆盖应用配置的 IP 头。应用默认读取 `x-real-ip`；必须确认该值由可信代理重写，不能让外部客户端自行指定。若平台不提供可信头，需修改配置并验证后再开放登录。
- [ ] 确认 GitHub Actions 的安全测试与 Docker 构建通过；CodeQL SARIF artifact 需人工检查。当前仓库未启用 GitHub Code Scanning，因此不会出现 Security 页面告警。

## 生产数据库迁移（手动批准后执行）

1. 先在部署平台确认目标数据库实例、数据库名称、迁移身份和备份保留位置。不要把生产 URL 复制到公开终端记录。
2. 通过数据库托管平台的备份功能创建可恢复备份；记录备份 ID、时间和恢复方式。必要时在维护窗口内执行。
3. 在受控的临时运行环境中使用与发布版本相同的代码和 Secret，检查迁移状态：
   `npx prisma migrate status`
4. 由有权限的操作者确认目标数据库和备份无误后，执行一次：
   `npx prisma migrate deploy`
5. 检查迁移结果：
   `npx prisma migrate status`
   并核对 `_prisma_migrations` 记录及预期表、索引、外键。不要在每个应用副本启动时自动执行迁移。
6. 只有迁移成功且烟雾测试通过后，才允许将流量切到新 Next.js 服务。迁移失败时停止发布，保留日志与备份信息并按数据库平台恢复流程处理；不要手工删除迁移记录或在生产环境运行 `migrate reset`。

## 上线后烟雾测试

- [ ] 未登录访问 `/account`、`/creator`、`/admin` 均被拒绝或重定向到登录。
- [ ] GitHub OAuth 登录、回调、退出登录和数据库会话创建/删除正常。
- [ ] 对登录入口超过限额会返回 HTTP 429、正数 `Retry-After` 和 `Cache-Control: no-store`。
- [ ] 模拟限流数据库故障时认证入口失败关闭（503），不会绕过限流。
- [ ] 普通用户不能进入管理员操作；创作者不能读写其他用户的私有项目。
- [ ] 封禁账号后旧数据库会话不能继续访问受保护页面或执行写操作。
- [ ] 管理员审核/封禁会产生审计日志；并发重复审核只允许一次状态转换。
- [ ] 现有 Vite 首页、皮肤 PNG 导入导出、`/blockbench/`、PWA 缓存和健康检查仍正常。

## 当前已验证与未验证的边界

截至 2026-10-16，最新 Next.js Preview Security Run #99 已使用临时 PostgreSQL 服务成功执行 Prisma 迁移、RBAC/资源所有权单测、PostgreSQL 集成测试、Vite 与 Next.js 构建及 HTTP 安全 E2E。最新 CI Run #247 通过 Vite 构建、依赖高危/严重漏洞门禁和包含 Blockbench 的 Docker 镜像构建；CodeQL Run #72 分析成功并保留 SARIF artifact。这些结果不代表生产数据库已迁移，也不代表真实 GitHub OAuth 凭据或生产代理配置已验证。

生产数据库迁移、真实 OAuth、部署平台 Secret、可信代理头、生产域名及完整上线烟雾测试均需在真实环境执行并留存结果。没有这些证据前，保持当前生产入口不变。
