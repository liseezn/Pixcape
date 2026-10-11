# Pixcape 部署与运维文档

本文记录 Pixcape 当前的构建、容器镜像和 Zeabur 部署流程。项目技术栈为 React、TypeScript、Vite，使用 Docker + Nginx 运行生产构建，并通过 GitHub Actions 自动检查和发布镜像。

## 1. 当前部署信息

- GitHub 仓库：[`liseezn/Pixcape`](https://github.com/liseezn/Pixcape)
- 默认分支：`main`
- 容器镜像：`ghcr.io/liseezn/pixcape`
- 推荐镜像标签：`latest`
- 生产容器端口：`80`
- Web 服务：Nginx，提供 Vite 构建生成的静态文件
- 部署平台：Zeabur
- 计划使用的自定义域名：`pixcape.liseezn.top`（需以 Zeabur 与 Cloudflare 的实际配置为准）

## 2. 自动构建与镜像发布

仓库中的 GitHub Actions 工作流：

- `.github/workflows/ci.yml`：安装依赖并执行项目检查/构建。
- `.github/workflows/docker-publish.yml`：构建 Docker 镜像并发布到 GitHub Container Registry（GHCR）。

推送代码到默认分支后，检查 GitHub 仓库的 **Actions** 页面，确认对应工作流完成且状态为成功。工作流成功只表示构建/发布任务成功；镜像是否允许匿名拉取，还取决于 GHCR 包的可见性和访问权限。

镜像地址：

```text
ghcr.io/liseezn/pixcape:latest
```

如需指定某次提交对应的标签，请以 GHCR 包页面中实际存在的标签为准，不要自行猜测标签。

## 3. GHCR 镜像访问权限

Zeabur 使用自定义 Docker 镜像部署时，需要能够拉取镜像。

1. 打开 [GitHub Packages](https://github.com/liseezn?tab=packages)。
2. 进入名为 `pixcape` 的 Container 包，而不是只查看代码仓库的可见性。
3. 在 **Package settings** 中确认该包的 **Visibility** 为 **Public**。
4. 在包的版本/标签列表中确认存在需要部署的标签，例如 `latest`。
5. 可在支持 Docker 的终端中测试匿名拉取：

   ```bash
   docker pull ghcr.io/liseezn/pixcape:latest
   ```

注意：将 GHCR 包设为 Public 会让任何人都可以匿名拉取镜像。公开镜像包不等于必须公开源代码仓库。

### 常见错误：401 Unauthorized

若 Zeabur 日志包含以下信息：

```text
failed to authorize
failed to fetch anonymous token
401 Unauthorized
ErrImagePull
ImagePullBackOff
```

按顺序检查：

- GHCR 的 **Container 包本身**是否为 Public；
- Zeabur 配置的镜像名和标签是否与 GHCR 页面完全一致；
- 对应标签是否确实存在；
- 如包是公开的但匿名拉取仍失败，检查包的关联仓库与访问设置，然后重新部署。

`ImagePullBackOff` 通常表示容器平台多次拉取镜像失败后进入退避重试状态，它是结果状态，不是根因本身。

## 4. 在 Zeabur 创建服务

1. 在 Zeabur 项目中添加基于 Docker 镜像的服务。
2. 镜像填写：

   ```text
   ghcr.io/liseezn/pixcape:latest
   ```

3. 容器端口配置为 `80`，协议/服务类型按 Zeabur 界面选择 HTTP。
4. 使用镜像默认启动命令，不需要额外覆盖启动命令。
5. 部署并查看服务日志，确认镜像拉取成功且容器启动正常。
6. 打开 Zeabur 分配的默认域名，确认编辑器页面能正常显示。

## 5. 容器端口与 Nginx

- `Dockerfile` 使用 Node.js 镜像安装依赖并执行 `npm run build`。
- 生产阶段使用 Nginx 镜像提供 `dist/` 中的静态文件。
- `Dockerfile` 声明 `EXPOSE 80`。
- `nginx.conf` 监听容器内的 `80` 端口。
- SPA 路由通过 `try_files $uri $uri/ /index.html` 回退到入口页面。
- 健康检查访问本机 HTTP 服务；Nginx 配置提供 `/health` 路径。

因此，Zeabur 的容器服务端口应设置为 **80**，不应误设为 Vite 开发服务器端口（如 5173）。

## 6. 绑定 Cloudflare 自定义域名

计划域名：`pixcape.liseezn.top`。

1. 在 Zeabur 的 Pixcape 服务中打开 **Networking / Domains**，添加 `pixcape.liseezn.top`。
2. 读取 Zeabur 界面给出的 DNS 记录类型、主机名和目标值。
3. 登录 Cloudflare，选择 `liseezn.top` 区域，进入 **DNS → Records**。
4. 按 Zeabur 给出的实际值创建或修改记录；不要猜测目标地址，也不要覆盖无关记录。
5. DNS 生效后，回到 Zeabur 检查域名验证与 HTTPS 证书状态。
6. 通过 `https://pixcape.liseezn.top` 测试页面是否可以访问。

自定义域名是否已完成配置，应以 Zeabur 的域名状态、Cloudflare DNS 记录和实际 HTTPS 访问结果为准。

## 7. 更新与故障排查清单

每次发布后：

- [ ] GitHub Actions 的 CI 工作流成功。
- [ ] Docker 镜像发布工作流成功。
- [ ] GHCR 包中出现预期的新标签。
- [ ] Zeabur 成功拉取镜像并启动容器。
- [ ] Zeabur 默认域名可正常打开。
- [ ] 自定义域名 DNS 与 HTTPS 正常（配置完成后）。

排错顺序建议：

1. 查看 GitHub Actions 是否失败。
2. 检查 GHCR 包、可见性和镜像标签。
3. 检查 Zeabur 镜像配置及拉取日志。
4. 容器启动后检查端口是否为 80、Nginx 日志和页面资源加载情况。
5. 默认域名正常但自定义域名异常时，再检查 DNS、域名验证和 HTTPS 证书状态。

## 8. 相关文件

- `Dockerfile`：构建和运行生产镜像。
- `nginx.conf`：Nginx 静态站点、SPA 回退与健康检查配置。
- `docker-compose.yml`：本地容器运行配置。
- `.github/workflows/ci.yml`：持续集成工作流。
- `.github/workflows/docker-publish.yml`：镜像发布工作流。
- `package.json`：项目依赖与脚本。

