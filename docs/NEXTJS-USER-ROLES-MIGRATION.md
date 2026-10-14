# Next.js 与用户 / 创作者 / 管理员系统迁移方案

## 目标

将 Pixcape 从 React + TypeScript + Vite 逐步迁移到 Next.js App Router，并增加有服务端鉴权的用户系统。Pixcape 现有皮肤预制、披肩/外套/披风分类、3D 预览、PNG 导出以及 `/blockbench/` 编辑器必须继续可用。

## 迁移原则

- 先在独立分支迁移，Vite 生产入口和现有 Docker 镜像暂不改动；完成构建与关键流程验证后再切换。
- 不能把角色权限只存在前端状态、localStorage 或用户可修改的 profile 字段中。
- 默认拒绝访问；所有写操作都必须在服务端检查会话和角色。
- 不在仓库提交数据库密码、OAuth secret 或其他环境密钥。
- Blockbench 保持独立静态路径 `/blockbench/`，避免 Next.js 路由和 Service Worker 抢占该路径。

## 推荐技术路线

- Next.js App Router + TypeScript。
- Auth.js 用于会话与登录集成；第一阶段可先支持邮箱登录或 OAuth provider，provider 与回调 URL 通过环境变量配置。
- PostgreSQL + Prisma 持久化用户、角色、创作者资料与作品元数据。
- 部署继续通过 Docker/nginx；Next.js 使用 standalone 输出，反向代理仍需保留 `/blockbench/` 静态资源路径。
- 生产数据库 URL、Auth secret、OAuth 凭据只通过部署平台 Secret 注入。

## 角色与权限

| 能力 | 游客 | 普通用户 | 创作者 | 管理员 |
| --- | --- | --- | --- | --- |
| 浏览公开预制与作品 | 是 | 是 | 是 | 是 |
| 保存个人作品 / 项目 | 否 | 是 | 是 | 是 |
| 使用创作者工作台、发布作品 | 否 | 否 | 是 | 是 |
| 管理用户、封禁账号、审核作品 | 否 | 否 | 否 | 是 |
| 修改角色与授予管理员权限 | 否 | 否 | 否 | 仅服务端受控操作 |

角色建议为 `user`、`creator`、`admin`。新注册账号一律是 `user`；创作者由申请/管理员审核流程升级；管理员只能通过受保护的服务端管理流程或一次性部署初始化命令授予，不能由公开注册参数指定。

## 数据模型基线

- `User`: id、name、email（唯一）、image、role、status、createdAt、updatedAt。
- `CreatorProfile`: userId（唯一）、displayName、bio、reviewStatus。
- `Project`: id、ownerId、title、description、visibility、asset metadata、createdAt、updatedAt。
- `AuditLog`: actorId、action、targetType、targetId、createdAt；记录角色变更、封禁、审核和删除等管理动作。

上传的纹理、皮肤和模型文件不应直接存进用户表；第一阶段保存文件元数据和存储键，文件存储由部署环境配置。

## 路由草案

- `/login`、`/register`、`/account`
- `/creator`、`/creator/projects`、`/creator/projects/[id]/edit`
- `/admin`、`/admin/users`、`/admin/projects`
- `/api/auth/*` 由 Auth.js 处理；其余写入 API / Server Actions 必须单独做权限检查。

## 实施顺序与验收

1. 建立 Next.js App Router 骨架和锁定依赖版本，先让 Next.js 独立构建通过。
2. 加入 Prisma schema、数据库迁移、Auth.js 会话和安全的注册/登录/退出流程。
3. 实现服务端 RBAC helper 与路由保护；覆盖未登录、普通用户、创作者、管理员四类测试。
4. 迁移 Pixcape 工作台页面，保留 skinview3d / Three.js 的客户端组件边界，并验证 PNG 导入导出。
5. 将现有 Blockbench 静态构建继续部署在 `/blockbench/`，验证刷新、深层路径和 PWA 缓存。
6. 更新 Docker、nginx、CI、环境变量示例和部署文档；完成构建、冒烟测试和预览部署后才合并主分支。

## 当前状态

此文件是迁移基线，不代表 Next.js、登录、数据库或角色管理已经部署。当前生产应用仍是 Vite；在 Next.js 页面和权限测试通过之前，不应直接切换生产 Docker 入口。
