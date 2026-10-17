import express from 'express'
import helmet from 'helmet'
import multer from 'multer'
import { randomUUID } from 'node:crypto'

const app = express()
const port = Number(process.env.PORT || 8787)
const maxUploadMb = Math.min(10, Math.max(1, Number(process.env.AI_MAX_UPLOAD_MB || 8)))
const rateLimitPerMinute = Math.min(30, Math.max(1, Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 5)))
const requestTimeoutMs = Math.min(180_000, Math.max(10_000, Number(process.env.AI_TIMEOUT_MS || 90_000)))
const allowedOrigins = (process.env.AI_ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    const valid = ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)
    if (!valid) return callback(new Error('仅支持 PNG、JPEG 或 WebP 图片'))
    callback(null, true)
  },
})

app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(express.json({ limit: '32kb' }))
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) return res.status(403).json({ error: '此来源未获允许访问 AI 服务' })
  next()
})

const buckets = new Map()
app.use('/api/ai', (req, res, next) => {
  const now = Date.now()
  const key = req.ip || req.socket.remoteAddress || 'unknown'
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 })
  } else if (current.count >= rateLimitPerMinute) {
    res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)))
    return res.status(429).json({ error: '请求过于频繁，请稍后重试' })
  } else {
    current.count += 1
  }
  if (buckets.size > 5000) {
    for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey)
  }
  next()
})

const configured = {
  gemini: Boolean(process.env.GEMINI_API_KEY),
  openai: Boolean(process.env.OPENAI_API_KEY),
  openrouter: Boolean(process.env.OPENROUTER_API_KEY),
}
function modelList(pluralName, singularName, fallback = '') {
  const raw = process.env[pluralName] || process.env[singularName] || fallback
  return [...new Set(raw.split(/[;,]/).map(value => value.trim()).filter(Boolean))]
}
const openRouterImageToImageModels = modelList('OPENROUTER_IMAGE_TO_IMAGE_MODELS', 'OPENROUTER_IMAGE_TO_IMAGE_MODEL')
const configuredModels = {
  gemini: modelList('GEMINI_IMAGE_MODELS', 'GEMINI_IMAGE_MODEL', 'gemini-2.5-flash-image'),
  openai: modelList('OPENAI_IMAGE_MODELS', 'OPENAI_IMAGE_MODEL', 'gpt-image-1'),
  openrouter: modelList('OPENROUTER_IMAGE_MODELS', 'OPENROUTER_IMAGE_MODEL'),
}

function getModels() {
  const models = []
  if (configured.gemini) for (const model of configuredModels.gemini) models.push({ id: `gemini:${model}`, provider: 'gemini', model, label: 'Google Gemini', textToImage: true, imageToImage: true })
  if (configured.openai) for (const model of configuredModels.openai) models.push({ id: `openai:${model}`, provider: 'openai', model, label: 'OpenAI Images', textToImage: true, imageToImage: true })
  if (configured.openrouter) for (const model of configuredModels.openrouter) models.push({ id: `openrouter:${model}`, provider: 'openrouter', model, label: 'OpenRouter', textToImage: true, imageToImage: openRouterImageToImageModels.includes(model) })
  return models
}

function parseModel(modelId) {
  if (!modelId || modelId === 'auto') {
    const available = getModels()
    if (!available.length) throw new Error('AI_PROVIDER_NOT_CONFIGURED')
    const defaultModelId = process.env.AI_DEFAULT_MODEL
    const explicitDefault = defaultModelId ? available.find(item => item.id === defaultModelId || item.model === defaultModelId) : null
    const preferred = process.env.AI_DEFAULT_PROVIDER
    return explicitDefault || (preferred && preferred !== 'auto' ? available.find(item => item.provider === preferred) : null) || available[0]
  }
  const model = getModels().find(item => item.id === modelId)
  if (!model) throw new Error('所选模型未配置或不可用，请检查服务端 API Key 与模型 ID')
  return model
}

function timeoutSignal() {
  return AbortSignal.timeout(requestTimeoutMs)
}

async function responseError(response, provider) {
  // Avoid logging provider response bodies: they may echo prompts or other user-supplied data.
  console.error('[ai-provider-error]', { provider, status: response.status, requestId: randomUUID() })
  if (response.status === 401 || response.status === 403) throw new Error(`${provider} API 认证失败，请检查服务端密钥与权限`)
  if (response.status === 429) throw new Error(`${provider} 当前请求受限或额度不足，请稍后重试`)
  throw new Error(`${provider} 生成失败（HTTP ${response.status}）`)
}

function imageFromParts(parts = []) {
  for (const part of parts) {
    const data = part.inlineData?.data || part.inline_data?.data
    const mime = part.inlineData?.mimeType || part.inline_data?.mime_type || 'image/png'
    if (data && mime.startsWith('image/')) return { mime, data }
  }
  return null
}

async function generateGemini(model, prompt, image) {
  const parts = [{ text: prompt }]
  if (image) parts.push({ inlineData: { mimeType: image.mimetype, data: image.buffer.toString('base64') } })
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
    signal: timeoutSignal(),
  })
  if (!response.ok) await responseError(response, 'Gemini')
  const body = await response.json()
  const result = imageFromParts(body.candidates?.flatMap(candidate => candidate.content?.parts || []) || [])
  if (!result) throw new Error('Gemini 没有返回图像。请尝试更明确的提示词或更换模型。')
  return { mimeType: result.mime, imageDataUrl: `data:${result.mime};base64,${result.data}` }
}

async function generateOpenAI(model, prompt, image) {
  const endpoint = image ? 'https://api.openai.com/v1/images/edits' : 'https://api.openai.com/v1/images/generations'
  const headers = { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
  let body
  if (image) {
    body = new FormData()
    body.set('model', model.model)
    body.set('prompt', prompt)
    body.append('image[]', new Blob([image.buffer], { type: image.mimetype }), image.originalname || 'reference.png')
    body.set('size', '1024x1024')
  } else {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify({ model: model.model, prompt, size: '1024x1024' })
  }
  const response = await fetch(endpoint, { method: 'POST', headers, body, signal: timeoutSignal() })
  if (!response.ok) await responseError(response, 'OpenAI')
  const payload = await response.json()
  const data = payload.data?.[0]?.b64_json
  if (!data) throw new Error('OpenAI 没有返回可读取的图像数据')
  return { mimeType: 'image/png', imageDataUrl: `data:image/png;base64,${data}` }
}

async function generateOpenRouter(model, prompt, image) {
  if (!configuredModels.openrouter.includes(model.model)) throw new Error('请在服务端设置 OPENROUTER_IMAGE_MODELS 中的有效模型 ID')
  const userContent = [{ type: 'text', text: prompt }]
  if (image) userContent.push({ type: 'image_url', image_url: { url: `data:${image.mimetype};base64,${image.buffer.toString('base64')}` } })
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://pixcape.app',
      'X-Title': 'Pixcape AI Skin Studio',
    },
    body: JSON.stringify({ model: model.model, modalities: ['image', 'text'], messages: [{ role: 'user', content: userContent }] }),
    signal: timeoutSignal(),
  })
  if (!response.ok) await responseError(response, 'OpenRouter')
  const payload = await response.json()
  const message = payload.choices?.[0]?.message
  const imageUrl = message?.images?.[0]?.image_url?.url || message?.images?.[0]?.url
  if (imageUrl?.startsWith('data:image/')) return { mimeType: imageUrl.slice(5, imageUrl.indexOf(';')), imageDataUrl: imageUrl }
  const text = typeof message?.content === 'string' ? message.content : ''
  const match = text.match(/data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)/)
  if (match) return { mimeType: `image/${match[1]}`, imageDataUrl: `data:image/${match[1]};base64,${match[2]}` }
  throw new Error('此 OpenRouter 模型没有返回图像。请在服务端选择支持图像输出的模型 ID。')
}

async function runProvider(model, prompt, image) {
  if (model.provider === 'gemini') return generateGemini(model, prompt, image)
  if (model.provider === 'openai') return generateOpenAI(model, prompt, image)
  if (model.provider === 'openrouter') return generateOpenRouter(model, prompt, image)
  throw new Error('不支持的模型供应商')
}

app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.get('/api/ai/models', (_req, res) => {
  const models = getModels()
  res.json({
    models,
    providers: [
      { id: 'gemini', label: 'Google Gemini', configured: configured.gemini },
      { id: 'openai', label: 'OpenAI Images', configured: configured.openai },
      { id: 'openrouter', label: 'OpenRouter', configured: configured.openrouter && configuredModels.openrouter.length > 0 },
    ],
  })
})

app.post('/api/ai/generate', upload.single('reference'), async (req, res) => {
  const startedAt = Date.now()
  const requestId = randomUUID()
  try {
    const prompt = String(req.body?.prompt || '').trim()
    if (prompt.length < 3 || prompt.length > 2000) return res.status(400).json({ error: '提示词长度需为 3–2000 个字符' })
    const task = req.body?.task === 'image-to-image' ? 'image-to-image' : 'text-to-image'
    if (task === 'image-to-image' && !req.file) return res.status(400).json({ error: '参考图转换模式需要上传一张图片' })
    if (task === 'text-to-image' && req.file) return res.status(400).json({ error: '文字生成模式不接受参考图，请切换到参考图转换模式' })
    const model = parseModel(String(req.body?.model || 'auto'))
    if (task === 'image-to-image' && !model.imageToImage) return res.status(400).json({ error: '所选模型未配置或不支持参考图输入，请选择支持参考图的模型。' })
    const started = Date.now()
    const result = await runProvider(model, prompt, req.file || null)
    console.info('[ai-generation]', { requestId, provider: model.provider, model: model.model, task, elapsedMs: Date.now() - started })
    res.json({ requestId, provider: model.provider, model: model.model, task, elapsedMs: Date.now() - startedAt, ...result, outputKind: 'concept-image', notice: '这是 AI 生成的概念图，不是已校验的 Minecraft 64×64 皮肤纹理。请先转换并校验纹理，再导出。' })
  } catch (error) {
    if (error instanceof multer.MulterError) return res.status(413).json({ error: '参考图过大或上传数量不正确' })
    const message = error instanceof Error ? error.message : 'AI 生成失败，请稍后重试'
    const status = message === 'AI_PROVIDER_NOT_CONFIGURED' ? 503 : 502
    if (message === 'AI_PROVIDER_NOT_CONFIGURED') return res.status(503).json({ error: '尚未配置 AI 模型。请在服务端设置至少一个供应商的 API Key。' })
    console.error('[ai-generation-failed]', { requestId, elapsedMs: Date.now() - startedAt, error: message })
    res.status(status).json({ error: message })
  }
})

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) return res.status(413).json({ error: '上传文件过大或格式不正确' })
  if (error instanceof SyntaxError) return res.status(400).json({ error: '请求格式无效' })
  res.status(400).json({ error: error instanceof Error ? error.message : '请求无效' })
})

app.listen(port, '0.0.0.0', () => console.info(`Pixcape AI API listening on :${port}`))
