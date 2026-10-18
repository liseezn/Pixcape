# 部署文档入口

本文件保留为便于查找的部署入口，避免维护重复的部署说明。

- **当前单镜像部署、环境变量、数据库选择与路由：** [SINGLE-IMAGE-PRODUCTION.md](./SINGLE-IMAGE-PRODUCTION.md)
- **独立 Next.js 容器部署（仅在确实使用 Dockerfile.nextjs 时）：** [NEXTJS-CONTAINER-DEPLOYMENT.md](./NEXTJS-CONTAINER-DEPLOYMENT.md)
- **生产迁移、备份、安全检查和回滚：** [PRODUCTION-SECURITY-ROLLOUT.md](./PRODUCTION-SECURITY-ROLLOUT.md)

旧部署说明中有关“纯 Vite 静态站点”的部分不再作为当前生产架构依据。发布状态和多数据库兼容性必须通过当前提交的工作流与真实部署验证，不能只凭文档判断。
