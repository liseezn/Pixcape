# PWA、Open Graph 与部署检查清单

## PWA

- Manifest 由 `vite-plugin-pwa` 根据 `vite.config.ts` 生成。
- `registerType: autoUpdate` 启用 Service Worker 更新机制。
- `public/pixcape-icon.svg` 用作应用图标。
- 部署后使用浏览器开发者工具的 Application / Manifest 与 Service Workers 页面确认安装信息和 Service Worker 状态。
- 首次访问需要联网下载应用资源；远程托管的服装纹理不保证离线可用。
- 不要让 Service Worker 把 `/blockbench/` 导航请求回退到 Pixcape 的 `index.html`。

## 页面白屏 / 资源加载故障排查

1. 确认 Docker 镜像发布完成，并确认托管平台已经拉取最新 `ghcr.io/liseezn/pixcape:latest`；仅发布镜像不代表线上服务已经更新。
2. 在手机浏览器中重新加载页面；若旧版 PWA 仍被缓存，可在浏览器站点设置中清除 Pixcape 的站点数据后重新打开。
3. 如果工作台能打开但模板缩略图缺失，检查对 `raw.githubusercontent.com` 的网络访问。第三方素材失败时页面应显示备用皮肤，而不是无限停留在加载中。
4. 检查 `/` 返回的 HTML、`/assets/` 下 JS/CSS 是否为同一构建版本；不要让 CDN 或代理把旧 HTML 与新 JS 混用。

## Open Graph

根目录 `index.html` 维护以下元数据：

- 页面标题与描述。
- `og:type`、`og:site_name`、`og:title`、`og:description`。
- `og:image`、宽度和高度。
- Twitter/X 的 `summary_large_image` 分享卡片字段。

当前分享图位于 `public/pixcape-og.svg`。部分社交平台只稳定支持 PNG/JPEG；如果预览抓取器不接受 SVG，应转换并发布 1200 × 630 的 PNG/JPEG。部署到真实域名后，将 `og:image` 与 `twitter:image` 改为绝对 HTTPS URL，并通过相应平台的分享预览调试器重新抓取缓存。

## Vite 与 Webpack

项目现有构建链为 Vite：`npm run build` 会执行 `tsc -b && vite build`。当前没有 Webpack 配置，也没有必要为了添加 PWA 再并行引入 Webpack。PWA 已通过 Vite 插件集成。若未来要求迁移至 Webpack，需要同步替换开发服务器、构建脚本、PWA 集成和 Docker 构建，并单独验证。

## 发布前验证

1. 执行 `npm install`。
2. 执行 `npm run build`，检查 TypeScript 与 PWA 生成步骤。
3. 检查 `dist/manifest.webmanifest`、Service Worker 文件及应用图标是否生成。
4. 执行 Docker 构建，确认 `/` 与 `/blockbench/` 均能正常访问。
5. 在手机浏览器检查添加到主屏幕、横竖屏布局和触控操作。
6. 在社交平台预览调试器检查 Open Graph 标题、描述和分享图。
