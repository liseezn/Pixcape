# 开发环境与贡献指南

## 1. 技术栈

- React 18
- TypeScript 5.6
- Vite 6
- lucide-react 图标库
- Canvas 2D API
- Docker + Nginx
- GitHub Actions 与 GitHub Container Registry（GHCR）

## 2. 环境要求

建议安装受支持的 Node.js LTS 版本和 npm。Docker 不是本地前端开发的必需条件，但构建容器镜像和验证生产环境时需要 Docker。

## 3. 本地启动

在仓库根目录执行：

```bash
npm install
npm run dev
```

Vite 开发服务器会监听可访问地址。终端会显示本机 URL；如在容器或局域网内测试，应使用终端输出的可访问地址。

## 4. 构建与预览

```bash
npm run build
npm run preview
```

构建命令先执行 TypeScript 项目检查，再生成 Vite 生产文件到 `dist/`。提交前应确认构建成功。

## 5. 主要目录

```text
.
├── .github/workflows/   # CI 与镜像发布工作流
├── docs/               # 项目文档（唯一规范目录）
├── src/
│   ├── App.tsx         # 编辑器交互与像素数据逻辑
│   ├── main.tsx        # React 应用入口
│   └── styles.css      # 工作区样式
├── Dockerfile          # 单镜像生产构建入口
├── nginx.conf          # Nginx 配置
├── docker-compose.yml  # 本地容器运行
├── package.json        # 依赖与脚本
└── vite.config.ts      # Vite 配置
```

## 6. 修改建议

- 保持组件与交互逻辑清晰，避免将不相关的功能耦合在一起。
- 像素数组与 Canvas 渲染应保持一致；涉及绘制操作时测试鼠标/触控指针事件。
- 新增工具时同步更新工具类型、操作逻辑、快捷键和 `docs/USER_GUIDE.md`。
- 修改导入或导出逻辑时，测试透明像素、边缘尺寸与异常文件情况。
- 避免把秘密、访问令牌、私钥或生产凭据提交到 Git。
- 保持 Docker 生产阶段通过 Nginx 提供静态文件，不要将开发服务器当作生产服务。

## 7. 提交前检查

```bash
npm install
npm run build
```

如果修改了容器配置，建议额外执行：

```bash
docker compose up --build -d
```

然后打开本地映射端口测试页面，并在完成后执行：

```bash
docker compose down
```

## 8. Pull Request / 代码审查

提交说明应概括变更内容。PR 描述建议包含：

- 修改目的和主要变更；
- 手动测试步骤及结果；
- UI 修改的截图（如适用）；
- 对文档、Docker、CI 或部署配置的影响。
