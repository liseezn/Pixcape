# Pixcape 项目说明

Pixcape 是面向 Minecraft 皮肤的预制与编辑工作台，主流程为：选择披肩 / 外套 / 披风 → 实时查看角色 → 导出皮肤 PNG 或将预制发送到内置 Blockbench。

## 技术栈

- React 18 + TypeScript：界面与交互。
- Vite：开发服务器、TypeScript 前端构建与静态资源打包。
- Three.js + skinview3d：Minecraft 角色 3D 预览。
- Lucide React：工具栏图标。
- Radix UI Tabs：支持键盘导航和无障碍属性的披肩 / 外套 / 披风分类切换。
- Radix UI Tooltip：为操作提供上下文提示。
- vite-plugin-pwa + Workbox：Web App Manifest、Service Worker 和静态资源预缓存。
- Nginx + Docker：生产环境托管 Pixcape 与独立的 Blockbench Web 编辑器。

## UI 设计约定

界面采用 Minecraft Java 物品栏的视觉结构，而不是只把普通网页换成绿色：

- 草方块顶部条、草地/泥土色背景、石头灰色物品栏面板。
- 方角像素边框、物品槽高光/暗边、绿色选中槽、像素化皮肤纹理与紧凑的游戏内字体层级。
- 当前皮肤始终位于所有模块上方。
- 预制服装采用 Radix Tabs；每次只显示当前分类的内容。
- 桌面端使用物品栏式分类面板与角色预览；窄屏切换为纵向布局，操作按钮保持易触控。
- 独立样式文件 `src/minecraft-inventory.css` 覆盖通用工作台样式，避免主题规则散落在多个文件中。
- 远程模板图片不可用时，工作台显示备用皮肤纹理并保留导入、预览与导出入口，不应因第三方素材加载失败而停留在加载状态。

## PWA 与分享预览

- `vite.config.ts` 通过 `vite-plugin-pwa` 生成 Web App Manifest 和 Service Worker。
- 图标：`public/pixcape-icon.svg`。
- 分享预览图：`public/pixcape-og.svg`。
- Open Graph / Twitter 元数据在根目录 `index.html` 中维护。
- `display: standalone` 用于支持的浏览器中以独立应用窗口打开。
- 目前分享图使用 SVG；如果目标社交平台不接受 SVG，应再提供同设计的 PNG/JPEG。
- 部署到正式域名后，建议将 `og:image` 和 `twitter:image` 设置为完整的 HTTPS 绝对 URL，便于社交平台抓取。

## 构建工具说明

本项目使用 **Vite**，没有 Webpack 配置。Vite 已负责开发服务器和生产构建；不建议在同一个前端入口额外混用 Webpack，以免产生重复的依赖解析、资源路径和构建产物。如果未来明确要迁移到 Webpack，应作为单独迁移任务，连同 PWA 插件、静态资源路径和 Docker 构建一起验证。

## 本地开发

```bash
npm install
npm run dev
```

## 生产构建

```bash
npm run build
npm run preview
```

Docker 生产构建会先执行前端构建，再将 Pixcape 静态资源和 Blockbench Web 资源放入 Nginx 镜像。路径 `/blockbench/` 是完整编辑器入口，不应被 SPA 的离线导航回退规则覆盖。
