# Pixcape AI 多模型架构方案

## 目标

在 Pixcape 现有 Vite/React 前端中加入 AI 皮肤工坊，同时将模型接入做成可扩展的服务端能力。第一阶段支持文字生成和参考图转换；生成结果必须通过 Minecraft 皮肤纹理映射与校验流程，再进入现有 3D 预览和编辑器。

## 架构原则

1. 浏览器不得持有任何供应商 API Key。
2. 前端只调用 Pixcape 自己的服务端 API，不直接请求模型供应商。
3. 统一服务端 provider 路由，供应商适配器可单独启停。
4. 用户可选模型；“自动”模式按任务、可用密钥、能力和成本路由。
5. 模型生成的角色概念图不能直接当作皮肤 PNG。必须经过 UV/面板映射、Classic/Slim 适配、透明像素规则校验和 3D 预览。
6. 失败切换只对可重试错误启用；用户主动选择的模型失败时，默认明确报错，不应静默更换模型。
7. 记录 provider/model、耗时、状态和成本估算，不记录 API Key；对上传文件设大小、格式和速率限制。

## 当前支持的供应商

| 供应商 | 服务端密钥 | 默认模型示例 | 文生图 | 参考图编辑 |
|---|---|---|---|---|
| Google Gemini | `GEMINI_API_KEY` | `gemini-2.5-flash-image` | 是 | 是 |
| OpenAI Images | `OPENAI_API_KEY` | `gpt-image-1` | 是 | 是 |
| OpenRouter | `OPENROUTER_API_KEY` | 由账户配置 | 依模型而定 | 仅对配置允许的模型开放 |
| Doubao Seedream（火山方舟） | `ARK_API_KEY` | `doubao-seedream-5-0-lite-260128` | 是 | 依所选模型与账户权限 |

Seedream 通过火山方舟图片生成 API `POST /api/v3/images/generations` 调用；可用模型 ID、地域端点与账户权限应以火山方舟控制台为准。参考图以服务端生成的 data URL 传入，返回图像先做格式/尺寸限制，再进入统一皮肤转换器。

## 配置

所有密钥只在服务端环境变量中设置，不得加 `VITE_` 前缀：

- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- `ARK_API_KEY`（或 `VOLCENGINE_ARK_API_KEY`）
- `SEEDREAM_IMAGE_MODELS`（可配置多个模型 ID）
- `ARK_BASE_URL`（可选，默认为北京地域的 Ark API 基础地址）
- `AI_DEFAULT_PROVIDER=auto`
- `AI_DEFAULT_MODEL`（可选，需与配置的供应商匹配）
- `AI_MAX_UPLOAD_MB`
- `AI_RATE_LIMIT_PER_MINUTE`

## UI 设计

- 模型选择：自动 / Gemini / OpenAI / OpenRouter / Seedream 内已配置的具体模型。
- 生成方式：文字生成 / 参考图转换。
- 输出：概念图、皮肤纹理、校验结果、3D 预览；支持重新生成和进入现有编辑器。
- 对用户显示“生成中、映射中、校验失败、可编辑、可导出”等明确状态。

## 交付与验证顺序

1. 核对当前仓库后端与部署入口。当前前端仍为 React + TypeScript + Vite，不能假定 Next.js API 路由已经存在。
2. 由独立 `ai-api/` Node.js 服务调用各供应商，保留现有 Nginx、Docker 与 Zeabur 链路。
3. 逐个供应商用真实密钥验证文生图和参考图两条链路。
4. 测试纹理映射、Classic/Slim、上传校验、限流、超时、错误处理与模型选择。
5. 运行构建和自动化测试；确认没有密钥泄漏、现有编辑器路由无回归后，再合并和部署。

## 实施状态（2026-10-17）

开发分支 `feature/ai-skin-generator` / 草稿 PR #18 已加入独立 `ai-api/` 服务、Gemini / OpenAI Images / OpenRouter 适配器、Doubao Seedream 适配器、可配置模型 ID、参考图上传、皮肤 UV 转换、限流与上传限制，以及 Docker / CI 测试。Seedream 代码接入不代表真实 API 调用已验证；仍需在部署环境设置有效 Ark API Key 和账户可用的模型 ID，执行有可能计费的文生图与图生图测试。转换器是第一版，输出仍需 3D 预览人工检查。
