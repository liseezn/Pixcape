# Pixcape｜我的世界皮肤工坊

Pixcape 是 Minecraft 皮肤预制与编辑工作台，支持披肩、外套、披风分类选择、皮肤合成导出、实时 3D 预览，以及向内置 Blockbench 模型编辑器传递预制。

## 功能

- 披肩 / 外套 / 披风分栏展示，每次只显示选中的分类。
- Steve / Alex 角色、动作、正反面与 Minecraft 风格场景预览。
- 导入标准 64 × 64 PNG 皮肤、合成预制并导出 PNG。
- 将当前皮肤和披风纹理传入完整 Blockbench 编辑器。
- Minecraft 方块物品栏风格 UI，适配手机和桌面。
- PWA 安装支持、Service Worker 更新与 Open Graph 分享元数据。

## 技术栈

React、TypeScript、Vite、Three.js、skinview3d、Lucide React、Radix UI Tabs / Tooltip、vite-plugin-pwa / Workbox。

> 构建系统使用 Vite；当前没有 Webpack 配置。请参阅 `docs/PROJECT_OVERVIEW.md`，了解为什么不将两套打包器混在同一个前端入口。

## 本地开发

```bash
npm install
npm run dev
```

## 构建与预览

```bash
npm run build
npm run preview
```

构建后应检查 PWA Manifest、Service Worker 和 `dist/pixcape-icon.svg` 是否生成。

## Docker

```bash
docker compose up --build -d
```

默认可从 `http://localhost:8080` 访问，具体端口以仓库 Docker Compose 配置为准。Pixcape 位于 `/`，完整 Blockbench 编辑器位于 `/blockbench/`。

## PWA / Open Graph 文档

- [项目架构与 UI 约定](docs/PROJECT_OVERVIEW.md)
- [PWA、Open Graph 与发布检查清单](docs/PWA-SEO-DEPLOYMENT.md)

部署到正式域名后，建议将 Open Graph 图片 URL 设置为绝对 HTTPS 地址，并验证目标社交平台是否支持 SVG 分享图。

## 素材归属

预制服装与示例皮肤素材来源于 [lonelyang/CapeSkinImage](https://github.com/lonelyang/CapeSkinImage)。请在重新分发相关素材前核对上游许可证和归属要求。

## 第三方编辑器

内置完整模型编辑器基于 Blockbench，第三方许可证和版本信息见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## License

Pixcape 自有代码采用 MIT 许可证；第三方代码与素材按各自许可证执行。
