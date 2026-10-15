# Next.js 与用户 / 创作者 / 管理员系统迁移方案

## 当前进度（更新于 2026-10-15）

- [x] 创建隔离迁移分支，保留现有 Vite 生产入口。
- [x] 增加 Next.js App Router 页面骨架：主页、登录、注册、账户、创作者、管理员入口。
- [x] 增加 Prisma PostgreSQL 数据模型草案：用户、角色、创作者资料、项目、审计日志及 Auth.js Adapter 表。
- [x] 增加服务端授权原语与环境变量示例。
- [x] 增加独立 Next.js 构建工作流。
- [x] 接入 Auth.js 数据库会话与条件启用的 GitHub OAuth provider（仍需部署端密钥和数据库）。
- [x] 为 Auth.js 数据库会话设置 8 小时最长有效期、1 小时更新间隔，并在生产环境使用安全 Cookie。
- [x] 添加基础 HTTP 安全响应头，生产环境启用当前主机的 HSTS（不默认覆盖其他子域名）。
- [x] 管理员审核和封禁操作加入条件更新，降低并发重复审核和状态竞争风险。
- [x] 封禁用户时删除其数据库会话并记录审计日志。
- [x] 建立独立的登录限流增量迁移，避免修改可能已执行过的初始 migration。
- [x] 增加 PostgreSQL 持久化限流，按可信反向代理提供的 IP 标识做原子固定窗口计数；默认每 IP 每 15 分钟 10 次，数据库不可用时认证入口失败关闭。
- [x] 增加 Node.js 内置测试运行器的 RBAC / 资源所有权单元测试、PostgreSQL 集成测试和 HTTP 安全 E2E 测试。
- [x] CI 使用真实 PostgreSQL 服务执行 migrate deploy、RBAC/所有权测试、并发限流测试、Vite/Next 构建与 E2E。
- [x] GitHub Actions Run #92（基线验证）与 Run #96（最新提交验证）：PostgreSQL 迁移、RBAC / 资源所有权单元测试、PostgreSQL 集成测试、Vite / Next.js 构建和 HTTP 安全 E2E 全部通过。Run #96 的所有步骤均成功。
- [ ] 配置 GitHub OAuth 与数据库后端，完成真实登录、会话撤销、审核和封禁端到端测试。
- [x] 增加 RBAC / 资源所有权自动化测试与安全回归测试。
- [x] 将构建运行时切换为 Node.js 24 LTS，并更新 GitHub Actions checkout/setup-node 到稳定主版本。
- [x] 将 Next.js、React、Vite、TypeScript、skinview3d、Three.js、Radix UI、Lucide、PWA 插件和 PostgreSQL 驱动升级到已发布稳定版本。
- [x] 将 Prisma 升级到 7.10 稳定版，增加 prisma.config.ts 与 PostgreSQL driver adapter；需由 CI 验证生成、schema 与构建兼容性。
- [x] 将 NextAuth 从 v5 beta API 迁移到稳定版 v4.24.15，并调整 App Router 会话与退出登录代码。
- [x] 本轮依赖升级后的 Next.js 构建、现有 Vite 构建、npm 高危/严重漏洞门禁与 Docker 镜像构建已通过；CI Run #244 全部步骤成功。
- [x] CodeQL Run #69 成功完成扫描，并将 SARIF 结果保存为 14 天 artifact；此方式不向 GitHub Security 页面上传告警。若需要 Security 页面告警，仍需为私有仓库启用 GitHub Code Security。
- [ ] 完成 Next.js 与现有 Vite / Blockbench 的整合、Docker 预览和回归验证。

## 技术路线

Next.js App Router + TypeScript、Auth.js、PostgreSQL + Prisma。部署仍需保证现有 `/blockbench/` 静态编辑器路径可访问。新 Next.js 入口在完成测试之前不替换当前 Vite 生产入口。

## 角色与权限

角色为 `USER`、`CREATOR`、`ADMIN`。新用户必须默认是 `USER`；创作者由申请和审核流程授予；管理员只能通过受保护的管理操作或一次性受控初始化流程授予。角色来源必须是服务端验证的会话与数据库记录，不可信任客户端传入的 role。

| 能力 | 游客 | 普通用户 | 创作者 | 管理员 |
| --- | --- | --- | --- | --- |
| 浏览公开作品 | 是 | 是 | 是 | 是 |
| 保存个人作品 | 否 | 是 | 是 | 是 |
| 发布创作者作品 | 否 | 否 | 是 | 是 |
| 管理用户与审核作品 | 否 | 否 | 否 | 是 |

## 安全要求

- 默认拒绝访问；每个 Server Action / Route Handler 都必须校验会话、角色和资源所有权。
- 管理操作写入审计日志；封禁用户后删除现存数据库会话，并在每次敏感操作时重新读取角色和状态。
- 密钥只通过部署平台 Secret 或本地未提交的环境文件提供；不得提交真实 OAuth 密钥或数据库凭据。
- 生产环境只在确认 HTTPS 后启用 HSTS；部署到多子域名环境前单独核对 HTTPS 覆盖情况。
- 安全响应头是纵深防御，不替代输入校验、CSRF/Origin 检查、限流、资源所有权检查和安全测试。
- 不在认证和数据库尚未接通时声称登录或角色授权已经生效。

## 验收清单

1. 现有 `npm run build` 仍然通过。
2. `npm run next:build` 通过，页面可打开并刷新。
3. 游客访问受限资源得到登录引导；普通用户不能进入创作者写操作或管理员写操作。
4. 并发重复审核只能成功一次；非管理员无法修改用户状态；封禁后原数据库会话失效。
5. 创作者只能编辑自己的项目；管理员操作有审计记录。
6. 验证皮肤 PNG 导入导出、skinview3d 预览、Blockbench 深层路径、PWA 缓存和 Docker 镜像。

> 登录限流和自动化测试已加入。CI 已在隔离的 PostgreSQL 服务中成功执行迁移、权限测试、并发限流测试、Vite/Next 构建和 HTTP 安全 E2E；Docker 镜像构建也已通过。该 PostgreSQL 是 CI 临时数据库，不是生产数据库。OAuth 真实提供商登录、生产数据库迁移、生产反向代理 IP 头配置，以及生产部署后的 Blockbench/PWA 回归仍需真实环境验证。CodeQL 已完成扫描但当前仓库未启用 GitHub Code Scanning，故结果暂存为 SARIF artifact，不能误称为已出现在 Security 告警页。未完成这些验证前，不应切换生产入口。
