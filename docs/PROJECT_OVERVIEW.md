# Pixcape 项目说明

Pixcape 是面向 Minecraft 皮肤的预制与编辑工作台，主流程为：选择披肩 / 外套 / 披风 → 实时查看角色 → 导出皮肤 PNG 或将预制发送到内置 Blockbench。

## 技术栈

- React 18 + TypeScript：界面与交互。
- Vite：开发服务器、TypeScript 前端构建与静态资源打包。
- Three.js + skinview3d：Minecraft 角色 3D 预览。
- Lucide React：工具栏图标。
- Radix UI Tabs：披肩 / 外套 / 披风分类切换。
- Radix UI Tooltip：操作提示。
- vite-plugin-pwa + Workbox：Web App Manifest、Service Worker 和静态资源预缓存。
- Nginx + Docker：生产环境托管 Pixcape 与独立的 Blockbench Web 编辑器。

## UI 设计约定

目标是把工作台做成 Minecraft 游戏内物品栏的视觉语言，而不是普通 SaaS 网页加绿色装饰：

- 采用 Minecraft Java 物品栏的石头灰色面板、凸起/凹陷边框、方形物品槽、紧凑文字层级和高对比选中态。
- 顶部采用草方块配色，背景使用像素块纹理；选中项目使用草方块绿，焦点态使用高亮边框。
- 角色预览区域保留天空与草地方块的游戏场景感。
- 当前皮肤位于页面上方，披肩、外套、披风分栏展示；每次只显示当前分类内容。
- 独立样式文件 `src/minecraft-inventory.css` 统一控制游戏内物品栏视觉，避免现代圆角卡片、渐变按钮等通用网页风格覆盖主题。
- 窄屏切换为纵向布局，操作按钮保持易触控。

## 加载错误处理

- 远程模板素材加载失败时，工作台会显示备用皮肤纹理，保留导入、预览与导出入口。
- React 组件发生运行时渲染错误时，入口 `src/main.tsx` 显示错误信息和重新加载按钮，不再只留下空白页面。
- 若线上页面仍旧白屏，需检查浏览器控制台、最新 Docker 镜像是否已部署，以及是否仍有旧版 PWA/Service Worker 缓存。清除站点数据只能作为诊断步骤，不能替代修复代码。

## PWA 与分享预览

- `vite.config.ts` 通过 `vite-plugin-pwa` 生成 Web App Manifest 和 Service Worker。
- 图标：`public/pixcape-icon.svg`。
- 分享预览图：`public/pixcape-og.svg`。
- Open Graph / Twitter 元数据在根目录 `index.html` 中维护。
- `display: standalone` 用于支持的浏览器中以独立应用窗口打开。
- 目前分享图使用 SVG；如果目标社交平台不接受 SVG，应再提供同设计的 PNG/JPEG。

## 构建工具说明

本项目使用 **Vite**，没有 Webpack 配置。Vite 已负责开发服务器和生产构建；不建议为了添加 PWA 再并行引入 Webpack。若未来明确要迁移到 Webpack，需要连同开发服务器、PWA 集成、静态资源路径和 Docker 构建一起验证。

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
