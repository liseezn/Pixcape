# Pixcape 文档中心

本目录 **docs/** 是项目文档的唯一主索引。新增或更新文档时，请优先维护这里的链接；根目录 README 只保留项目简介和入口链接。

## 快速入口

| 你要做什么 | 从这里开始 | 适用场景 |
| --- | --- | --- |
| 了解项目和当前架构 | [项目概览](./PROJECT_OVERVIEW.md) | 功能范围、目录职责、主站与账户服务边界 |
| 使用编辑器 | [根目录 README](../README.md) | 功能入口；具体操作说明以实际 UI 为准 |
| 本地开发与构建 | [package.json](../package.json) | 命令以仓库脚本为准 |
| 部署单镜像 | [单镜像生产部署](./SINGLE-IMAGE-PRODUCTION.md) | 根目录 Dockerfile、Nginx、服务入口和环境变量 |
| 部署独立 Next.js | [Next.js 容器部署](./NEXTJS-CONTAINER-DEPLOYMENT.md) | 仅在使用 Dockerfile.nextjs 时阅读 |
| 用户/创作者/管理员功能 | [角色与迁移方案](./NEXTJS-USER-ROLES-MIGRATION.md) | 身份认证、角色、资源所有权和迁移 |
| 生产安全验收 | [生产安全上线清单](./PRODUCTION-SECURITY-ROLLOUT.md) | 预览验收、备份、迁移、安全测试与回滚 |
| AI 图片模型接口 | [AI 模型架构](./AI-MODEL-ARCHITECTURE.md) | AI API、提供商和服务端配置 |
| PWA 与分享元数据 | [PWA / SEO 部署](./PWA-SEO-DEPLOYMENT.md) | Service Worker、安装、Open Graph |
| 第三方许可和署名 | [第三方声明](../THIRD_PARTY_NOTICES.md) | 依赖、编辑器、素材的许可信息 |

## 文档分组

- **产品与架构**：PROJECT_OVERVIEW.md
- **部署与运维**：SINGLE-IMAGE-PRODUCTION.md、NEXTJS-CONTAINER-DEPLOYMENT.md、PRODUCTION-SECURITY-ROLLOUT.md
- **功能与集成**：NEXTJS-USER-ROLES-MIGRATION.md、AI-MODEL-ARCHITECTURE.md、PWA-SEO-DEPLOYMENT.md
- **许可与合规**：根目录 THIRD_PARTY_NOTICES.md；品牌声明与素材署名也应与此文件保持一致。

## 当前架构阅读顺序

1. 先读项目概览，了解 Vite 编辑器、Blockbench 资源和 Next.js 服务的边界。
2. 若目标是当前单镜像，读单镜像生产部署。
3. 若涉及用户系统、数据库或权限，继续读角色迁移方案和生产安全清单。
4. 发布前按生产清单验收。文档描述的步骤不等于线上已执行或测试已通过。

## 文档维护规则

- docs/ 为规范文档目录；旧的 doc/ 仅保留兼容入口，避免维护两套内容。
- 环境变量名称以根目录 .env.example、实际读取代码和对应部署文档交叉核对；示例值不是生产值。
- 代码、工作流或 Docker 入口发生变化时，同一 PR 必须更新相关文档和本索引。
- 将内容明确区分为**已实现**、**需部署配置**、**尚待验证**；不能因构建成功就声称生产部署、数据库迁移或安全验收已完成。
- 不在文档、提交、截图或日志中写入真实密码、API Key、OAuth Secret、数据库连接凭据。
- 不要随意删除历史说明；如文档过期，应标记替代文档并更新链接。
