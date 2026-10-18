# 登录方式、OAuth 与管理员初始化配置指南

本文对应当前仓库的 NextAuth v4 实现。配置项以根目录 `.env.example` 和 `auth.ts` 为准。

> **重要：** 当前版本的登录方式通过部署环境变量启用。管理后台里的 OAuth / SMTP / AI 配置区域如果仍显示占位内容，就不代表它已经能保存或更新这些密钥。请在 Zeabur、Docker 部署平台的环境变量 / Secrets 页面配置，并在修改后重启或重新部署服务。

## 1. 配置前准备

1. 确认主站使用 HTTPS，并记下公开网址，例如 `https://pixcape.example.com`。
2. 在部署平台配置数据库，先阅读[单镜像生产部署](./SINGLE-IMAGE-PRODUCTION.md)。数据库必须使用持久化存储；不要在生产环境使用临时 SQLite 文件。
3. 配置稳定的 `NEXTAUTH_SECRET`。可使用密码管理器生成至少 32 字节随机值；也可在可信终端运行：
   ```bash
   openssl rand -base64 48
   ```
   把输出保存到部署平台 Secret 中。**不要每次启动时重新生成**，否则会影响会话和加密相关配置。
4. 设置 `NEXTAUTH_URL` 为主站的完整公开 URL，不要带末尾路径，例如 `https://pixcape.example.com`。
5. 只启用你已完成配置的登录方式。对应 ID 和 Secret 必须成对填写；未配置完整的提供商不会显示在登录页。

本地开发时可以把 `.env.example` 复制为未提交的 `.env.local`。不要把真实密钥提交到 Git。

## 2. OAuth 提供商设置

所有提供商的回调地址均使用：

```text
https://你的主站域名/api/auth/callback/提供商ID
```

在各提供商后台登记的地址必须与实际主站 URL 完全匹配，包括 HTTPS、域名和路径。不要使用下面的示例域名作为真实地址。

### GitHub

1. 打开 GitHub Developer settings，进入 OAuth Apps，创建或选择应用。
2. Homepage URL 填主站网址。
3. Authorization callback URL 填 `https://你的域名/api/auth/callback/github`。
4. 将 Client ID、Client Secret 配到部署环境：

```dotenv
AUTH_GITHUB_ID="你的 GitHub OAuth Client ID"
AUTH_GITHUB_SECRET="你的 GitHub OAuth Client Secret"
```

### Google

1. 在 Google Cloud Console 中配置 OAuth consent screen，并创建 OAuth Client ID（Web application）。
2. Authorized JavaScript origins 填主站网址。
3. Authorized redirect URIs 填 `https://你的域名/api/auth/callback/google`。
4. 设置：

```dotenv
AUTH_GOOGLE_ID="你的 Google Client ID"
AUTH_GOOGLE_SECRET="你的 Google Client Secret"
```

若应用处于测试发布状态，只允许 OAuth 同意屏幕中添加的测试用户登录；上线前检查应用受众、验证状态和 Google 的最新要求。

### Microsoft

1. 在 Microsoft Entra 管理中心注册应用。
2. 添加 Web 平台的 Redirect URI：`https://你的域名/api/auth/callback/azure-ad`。
3. 创建客户端密码，并按租户策略配置支持的账户类型。
4. 设置：

```dotenv
AUTH_MICROSOFT_ENTRA_ID_ID="你的 Application (client) ID"
AUTH_MICROSOFT_ENTRA_ID_SECRET="你的客户端密码值"
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID="common"
```

`AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` 可用 `common`、`organizations`、`consumers` 或特定租户 UUID。若只允许组织内部账户，选择对应组织租户配置。客户端密码应填写创建时显示的 **Value**，不是 Secret ID。

### Apple

1. 在 Apple Developer 中配置 Sign in with Apple，按 Apple 要求准备已启用的 App ID / Services ID、域名与回调地址。
2. Return URL 填 `https://你的域名/api/auth/callback/apple`。
3. Apple 的客户端密钥涉及 Team ID、Key ID 和私钥生成的 client-secret JWT。按 Apple 当前开发者文档生成有效密钥，再将其配置为：

```dotenv
AUTH_APPLE_ID="你的 Apple Services ID"
AUTH_APPLE_SECRET="按 Apple 要求生成的 client-secret JWT"
```

Apple 密钥可能会过期，需要设置到期提醒并在失效前更新。Apple 控制台中的域名验证、HTTPS 和回调地址要求必须按其当前文档完成。

## 3. 邮箱魔法链接（SMTP）

邮箱登录不是密码登录。用户提交邮箱后，系统发送一次性登录链接；当前代码把链接有效期设为 **15 分钟**。只有能够接收该邮箱邮件的人才能使用链接。

需要一个允许应用发送邮件的 SMTP 服务商，并获取服务器地址、端口、用户名和密码。将 SMTP 连接 URL 放进 `EMAIL_SERVER`，发件人放进 `EMAIL_FROM`：

```dotenv
EMAIL_SERVER="smtp://SMTP用户名:URL编码后的密码@smtp.example.com:587"
EMAIL_FROM="Pixcape <no-reply@example.com>"
```

以上为格式示例，不能直接照抄。请使用邮件服务商提供的主机、端口和 TLS 要求。若密码含有 `@`、`:`、`/`、`#` 等保留字符，应进行 URL 编码。不同 SMTP 服务商的连接 URL / TLS 要求可能不同；严格按服务商文档填写，不要把 SMTP 密码贴到聊天或提交到仓库。

如果服务商要求隐式 TLS（常见端口 465），通常使用 `smtps://`；若使用 STARTTLS（常见端口 587），按服务商支持的配置填写。配置完成后，重启应用，在登录页选择邮箱登录，并检查收件箱、垃圾邮件和应用日志。日志中不应出现 SMTP 密码或完整魔法链接。

`EMAIL_SERVER` 与 `EMAIL_FROM` 都填写后，邮箱登录选项才会显示。

## 4. 首次管理员初始化

新用户首次登录默认是普通用户，不会自动成为管理员。项目提供一次性脚本 `npm run db:bootstrap-admin`：

1. 先完成数据库连接和至少一种登录方式配置。
2. 使用该登录方式登录一次，确保数据库中已创建对应用户记录。
3. 在运行应用脚本的同一部署版本/容器中，临时设置 `BOOTSTRAP_ADMIN_EMAIL` 为该账户的**实际登录邮箱**。
4. 在部署容器的终端或受控运维环境执行：
   ```bash
   npm run db:bootstrap-admin
   ```
5. 确认脚本成功并核对管理员账户后，立即从环境变量中删除 `BOOTSTRAP_ADMIN_EMAIL`，再重新部署/重启服务。

注意事项：

- 这是受控的一次性初始化步骤，不是普通登录密码，也不应长期保留该变量。
- 必须确保邮箱与已登录用户记录完全匹配。OAuth 提供商返回的邮箱若为空或不一致，先检查账户记录，不要猜测。
- 不要把自己的管理员权限撤销，也不要在未确认还有其他有效管理员之前操作。
- 生产环境执行前先备份数据库，并确认执行目标是正确的实例。
- 如果部署平台没有交互式终端，使用其受控一次性任务/运维入口执行；不要为了运行脚本把数据库公开到互联网。

## 5. 登录限流与代理 IP

当前示例默认：

```dotenv
LOGIN_RATE_LIMIT_MAX="10"
LOGIN_RATE_LIMIT_WINDOW_SECONDS="900"
LOGIN_RATE_LIMIT_IP_HEADER="x-real-ip"
```

即默认每个识别到的 IP 在 15 分钟窗口内最多 10 次尝试。应用应只信任由自己控制的反向代理覆盖写入的 IP 头。如果服务直接暴露公网，不能信任用户可自行伪造的 `X-Real-IP` 或 `X-Forwarded-For`。先确认 Zeabur / Nginx / 负载均衡器的实际代理行为，再选择可信头；不要盲目更改默认值。

## 6. 部署验证清单

- [ ] `NEXTAUTH_URL` 与实际公开主站地址一致，生产环境使用 HTTPS。
- [ ] `NEXTAUTH_SECRET` 是随机、持久的 Secret，且没有提交到 Git。
- [ ] OAuth 控制台回调 URL 与 `/api/auth/callback/<provider>` 完全一致。
- [ ] 登录页只显示已配置的提供商；未配置的方式不会显示。
- [ ] OAuth 登录能完成授权、回调、数据库用户创建与会话建立。
- [ ] 邮箱魔法链接可投递、15 分钟内可使用，过期后不可再用于登录。
- [ ] 新用户默认是 USER；只有通过受保护的管理员流程才能授予 ADMIN。
- [ ] 首次管理员初始化完成后已移除 `BOOTSTRAP_ADMIN_EMAIL`。
- [ ] 生产数据库有持久化与备份；代理 IP 头配置经过验证。
- [ ] 检查部署日志、Git 历史和错误追踪中没有泄露密钥、SMTP 凭据或魔法链接。

## 7. 常见问题

**登录页没有显示某个提供商？** 检查其 ID 与 Secret 是否都已设置，变量名是否完全匹配，修改后是否重启/重新部署。

**回调 URL 错误或反复跳转？** 核对 `NEXTAUTH_URL`、部署域名、HTTPS、提供商控制台回调 URL 以及代理的 HTTPS 转发设置。

**邮箱收不到链接？** 检查 SMTP 主机、端口、TLS、凭据、发件人域名验证、服务商发送限制和垃圾邮件文件夹；不要公开粘贴包含凭据的 SMTP URL。

**能否直接在管理员后台填写 OAuth/SMTP 密钥？** 当前以部署环境变量为准。除非后续版本实现并通过安全验收的加密配置存储功能，否则不要假设后台占位配置卡片能保存密钥。

**登录成功但没有管理员入口？** 确认数据库中用户状态为 ACTIVE、角色确为 ADMIN，并重新登录刷新数据库会话。不要通过修改客户端页面或请求参数赋予自己管理员权限。

## 相关文档

- [环境变量模板](../.env.example)
- [单镜像生产部署](./SINGLE-IMAGE-PRODUCTION.md)
- [用户、创作者与管理员迁移方案](./NEXTJS-USER-ROLES-MIGRATION.md)
- [生产安全上线清单](./PRODUCTION-SECURITY-ROLLOUT.md)
