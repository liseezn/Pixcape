# Pixcape AI 多模型架构方案

## 目标

在 Pixcape 现有 Vite/React 前端中加入 AI 皮肤工坊，同时将模型接入做成可扩展的服务端能力。第一阶段支持文字生成和参考图转换；生成结果必须通过 Minecraft 皮肤纹理映射与校验流程，再进入现有 3D 预览和编辑器。

## 架构原则

1. 浏览器不得持有任何供应商 API Key。
2. 前端只调用 Pixcape 自己的服务端 API，不直接请求模型供应商。
3. 统一 ImageGenerationProvider 接口，供应商适配器可单独启停。
4. 用户可选模型；“自动”模式按任务、可用密钥、能力和成本路由。
5. 模型生成的角色概念图不能直接当作皮肤 PNG。必须经过 UV/面板映射、Classic/Slim 适配、透明像素规则校验和 3D 预览。
6. 失败切换只对可重试错误启用；用户主动选择的模型失败时，默认明确报错，不应静默更换模型。
7. 记录 provider/model、耗时、状态和成本估算，不记录 API Key；对上传文件设大小、格式和速率限制。

## 推荐第一批接入

| 适配器 | 用途 | 注意事项 |
|---|---|---|
| Google Gemini 图像 API | 文字生成、参考图理解与转换 | 需要服务端 GEMINI_API_KEY；模型 ID 应可配置，避免写死过期型号 |
| OpenAI Images API | 文字生成、图像编辑/重绘 | 需要服务端 OPENAI_API_KEY；模型与图像编辑能力按实际 API 支持配置 |
| OpenRouter 图像 API | 提供多供应商/多模型的统一选择入口 | 需要 OPENROUTER_API_KEY；模型清单首期由服务端环境变量配置并按能力过滤；后续再接入服务商目录发现 |
| Hugging Face Inference Providers（后续可选） | FLUX 等开放模型试验 | 各模型对图像输入、输出尺寸、许可与可用供应商的支持不同，逐模型验证 |

不应把某个模型名或供应商写死为整个系统的唯一选择。OpenRouter、Hugging Face 等聚合服务也不能保证其目录内每个模型都支持图像输入或图像编辑。

## 统一接口草案

- listModels()：返回当前已配置供应商实际可用的模型及能力。
- generateFromText({ prompt, model, variant })：从文本生成角色概念图。
- transformReference({ prompt, image, model, variant })：基于参考图生成/转换。
- normalizeToSkin({ image, variant })：将概念图或面板图映射为 64×64 皮肤纹理。
- validateSkin({ png, variant })：校验尺寸、基础层不透明区域、未使用区域透明度。
- renderPreview({ png, variant })：交给 Pixcape 已有的 skinview3d 预览流程。

variant 统一为 classic 或 slim。生成任务与纹理映射任务分离，以便更换模型而不重写皮肤处理逻辑。

## 配置

仅在服务端环境变量中设置密钥：

- GEMINI_API_KEY
- OPENAI_API_KEY
- OPENROUTER_API_KEY
- AI_DEFAULT_PROVIDER=auto
- AI_DEFAULT_MODEL（可选，需与配置的供应商匹配）
- AI_MAX_UPLOAD_MB
- AI_RATE_LIMIT_PER_MINUTE

生产环境不应将这些变量以 VITE_ 前缀暴露给浏览器。密钥缺失时，应禁用对应供应商并向用户显示可操作的配置提示。

## UI 设计

- 模型选择：自动 / Gemini / OpenAI / OpenRouter 内可用模型。
- 生成方式：文字生成 / 参考图转换 / 重设计现有皮肤。
- 模型卡片展示：供应商、模型名、支持输入、输出能力、状态及成本提示（仅展示可验证的数据）。
- 输出：概念图、皮肤纹理、校验结果、3D 预览；支持重新生成和进入现有编辑器。
- 对用户显示“生成中、映射中、校验失败、可编辑、可导出”等明确状态。

## 交付与验证顺序

1. 核对当前仓库的后端形态与部署入口。当前实际仓库读取结果显示前端仍为 React + TypeScript + Vite，不能假定 Next.js API 路由已经存在。
2. 选择/建立受保护的服务端 API（独立 Node 服务或经过核实后的 Next.js 服务端迁移方案）；保留现有 Nginx、Docker 与 Zeabur 链路。
3. 接入一个真实供应商并跑通文字、参考图两条链路。
4. 加入其他供应商适配器和动态模型清单。
5. 实现并测试纹理映射、Classic/Slim、上传校验、限流、超时、错误处理与模型回退。
6. 运行现有构建与自动化测试；确认无密钥泄漏、现有编辑器路由不回归后，再合并和部署。

## 实施状态（2026-10-17）

开发分支 `feature/ai-skin-generator` 已加入独立 `ai-api/` Node.js 服务、Gemini / OpenAI Images / OpenRouter 适配器、可配置的多模型 ID、参考图上传、AI 工坊前端、限流与上传限制、Docker Compose 和 CI 冒烟测试。草稿 PR：#18。

当前已加入第一版正背面双视图到 64×64 UV 的转换器，支持 Classic/Slim 手臂宽度，填充基础面并合成侧面/顶底面，未使用 UV 区域透明。它目前只做结构性处理，图像模型未必严格遵守正背面布局，仍需要 3D 预览人工检查；自动 3D 预览衔接和真实 API Key 的端到端调用尚未验证。Vercel 预览部署也受平台构建速率限制，不能视为已部署验证。每个供应商都需要真实密钥、有效模型权限和可用额度才能进行端到端验证。
