# 发布与运维清单

## 1. 发布流程概览

```text
修改代码
  ↓
本地 npm run build
  ↓
提交并推送到 main
  ↓
GitHub Actions：CI 检查
  ↓
GitHub Actions：构建并发布 GHCR 镜像
  ↓
确认镜像标签存在
  ↓
Zeabur 部署新镜像
  ↓
验证默认域名、页面和自定义域名
```

## 2. 发布前

- [ ] 检查改动范围与代码差异。
- [ ] 执行 `npm install`。
- [ ] 执行 `npm run build` 并确认成功。
- [ ] 新增或变更的功能已更新 `docs/USER_GUIDE.md`。
- [ ] 变更构建或部署配置时已更新 `docs/SINGLE-IMAGE-PRODUCTION.md`。
- [ ] 未提交任何令牌、密码或其他机密信息。

## 3. GitHub Actions

推送到默认分支后，打开仓库的 Actions 页面，确认相关工作流已完成。若失败，先查看失败步骤和日志，修复后再发布。

- 仓库 Actions：<https://github.com/liseezn/Pixcape/actions>
- CI 工作流：`.github/workflows/ci.yml`
- 镜像发布：`.github/workflows/docker-publish.yml`

## 4. 镜像确认

- 镜像名称：`ghcr.io/liseezn/pixcape`
- 推荐标签：`latest`
- 生产容器端口：`80`

在 GHCR 包页面确认新镜像标签已出现。不要仅凭 Actions 成功就推断 Zeabur 一定能拉取镜像；还需确认包可见性、标签和访问权限。

## 5. Zeabur 发布后验证

- [ ] 部署状态为成功。
- [ ] 日志中没有镜像拉取失败或容器启动错误。
- [ ] 默认域名可以打开编辑器。
- [ ] 绘图、撤销/重做、导入图片和 PNG 导出等关键功能正常。
- [ ] 如果使用自定义域名，确认 DNS、域名验证和 HTTPS 均正常。

## 6. 回滚思路

若新版本发布后出现问题：

1. 查看 Zeabur 当前部署与上一可用部署记录。
2. 如平台提供历史部署回滚功能，可回退到已知可用版本。
3. 如需指定镜像标签，应选择 GHCR 中实际存在且已验证的标签。
4. 回滚后再次验证页面加载和关键编辑功能。
5. 记录故障原因，并在修复后重新发布。

避免删除仍在使用或用于回滚的镜像标签。
