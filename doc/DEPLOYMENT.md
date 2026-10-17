# Pixcape 单镜像部署与环境变量

## 部署目标

Pixcape、Blockbench Web 编辑器和 AI API 由同一个 Docker 镜像运行，Zeabur 只需创建一个 Docker Image 服务。

- 仓库：`liseezn/Pixcape`
- 镜像：`ghcr.io/liseezn/pixcape:latest`
- 容器端口：`80`
- 健康检查：`/health`
- Pixcape 工作台：`/`
- Blockbench：`/blockbench/`
- AI API：`/api/ai/`

推送到 `main` 后，`.github/workflows/docker-publish.yml` 会自动构建并推送 GHCR 镜像。部署前确认 GitHub Actions 构建成功，且 GHCR 的 `pixcape` Container package 允许 Zeabur 拉取。

## Zeabur 部署

1. 创建一个 Docker Image 服务。
2. 镜像填写 `ghcr.io/liseezn/pixcape:latest`。
3. 服务端口填写 `80`，使用镜像默认启动命令。
4. 按需配置下面的 AI 环境变量。API Key 必须配置在服务端环境变量中，不要写入前端代码或提交到 Git。
5. 部署后检查服务日志，并访问 `/health`；确认工作台、`/blockbench/` 和 AI 模型列表可访问。

## 环境变量

### AI 服务基础配置

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `8787` | 容器内部 AI API 端口，通常无需修改 |
| `AI_ALLOWED_ORIGINS` | 空 | 额外允许的跨域来源，多个来源用逗号分隔；同源请求无需配置 |
| `AI_DEFAULT_PROVIDER` | `auto` | 默认供应商：`auto`、`gemini`、`openai`、`openrouter` 或 `seedream` |
| `AI_DEFAULT_MODEL` | 空 | 可选的默认模型 ID 或模型名 |
| `AI_MAX_UPLOAD_MB` | `8` | 参考图上传大小限制，服务端最大限制为 10 MB |
| `AI_RATE_LIMIT_PER_MINUTE` | `5` | 每个客户端每分钟请求限制，服务端最大限制为 30 |
| `AI_TIMEOUT_MS` | `90000` | 模型请求超时，允许范围 10–180 秒 |

### Google Gemini

| 变量 | 默认值 | 说明 |
|---|---|---|
| `GEMINI_API_KEY` | 空 | Gemini API 密钥 |
| `GEMINI_IMAGE_MODELS` | `gemini-2.5-flash-image` | 逗号分隔的图像模型 ID |

### OpenAI

| 变量 | 默认值 | 说明 |
|---|---|---|
| `OPENAI_API_KEY` | 空 | OpenAI API 密钥 |
| `OPENAI_IMAGE_MODELS` | `gpt-image-1,gpt-image-1.5` | 逗号分隔的图像模型 ID |

### OpenRouter

| 变量 | 默认值 | 说明 |
|---|---|---|
| `OPENROUTER_API_KEY` | 空 | OpenRouter API 密钥 |
| `OPENROUTER_IMAGE_MODELS` | 空 | 可用的图像生成模型 ID，逗号分隔 |
| `OPENROUTER_IMAGE_TO_IMAGE_MODELS` | 空 | 明确支持参考图输入的模型 ID，逗号分隔 |
| `OPENROUTER_SITE_URL` | `https://pixcape.app` | 发送给 OpenRouter 的站点标识 |

### 豆包 Seedream（火山引擎 Ark）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `ARK_API_KEY` | 空 | Ark API 密钥，优先使用此变量 |
| `VOLCENGINE_ARK_API_KEY` | 空 | Ark API 密钥的兼容变量 |
| `ARK_BASE_URL` | `https://ark.cn-beijing.volces.com/api/v3` | Ark API 基础地址 |
| `SEEDREAM_IMAGE_MODELS` | `doubao-seedream-4-0-250828` | Seedream 模型 ID，逗号分隔 |
| `SEEDREAM_IMAGE_SIZE` | `2K` | 图像生成尺寸参数 |

AI 图像生成功能至少需要配置一个供应商的有效 API Key，并确保账户有对应模型的调用权限。未配置 Key 时，网站和编辑器仍可运行，但 AI 生成接口会返回未配置提示。

## 本地 Docker

构建并启动单镜像：

```bash
docker build -t ghcr.io/liseezn/pixcape:latest .
docker run -d --name pixcape --restart unless-stopped -p 8080:80 \
  -e GEMINI_API_KEY=your_key_here \
  ghcr.io/liseezn/pixcape:latest
```

上例仅展示环境变量传递方式；将 `your_key_here` 替换为自己的密钥，不要将真实密钥提交到仓库。也可以使用更新后的 `docker-compose.yml` 和本地未提交的 `.env` 文件。

## 故障排查

- 镜像拉取失败：确认 GHCR Container package 可见性、标签是否存在以及 Zeabur 是否有拉取权限。
- 容器无法启动：查看启动日志，检查 Docker 构建是否成功；容器监听外部 HTTP 端口 80。
- `/health` 失败：检查内部 AI API 是否正常启动及 Nginx 日志。
- AI 模型列表为空或生成提示未配置：设置至少一个供应商 API Key，并检查模型 ID、账户权限和额度。
- Blockbench 页面资源 404：确认访问路径为 `/blockbench/`，并检查 Docker 构建日志。

## 重要文件

- `Dockerfile`：将前端、Blockbench 和 AI API 打包进同一镜像。
- `docker-entrypoint-single.sh`：在单容器中启动 AI API 与 Nginx。
- `nginx.conf`：静态文件、SPA 路由和内部 AI API 代理。
- `ai-api/`：AI 图像生成 API。
- `docker-compose.yml`：本地单服务运行配置。
- `.github/workflows/docker-publish.yml`：自动构建并发布镜像。
