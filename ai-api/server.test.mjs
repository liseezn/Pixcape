import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'

async function startApi(port, extraEnv = {}) {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('.', import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      GEMINI_API_KEY: '',
      OPENAI_API_KEY: '',
      OPENROUTER_API_KEY: '',
      ARK_API_KEY: '',
      VOLCENGINE_ARK_API_KEY: '',
      SEEDREAM_IMAGE_MODELS: '',
      SEEDREAM_IMAGE_MODEL: '',
      OPENROUTER_IMAGE_MODEL: '',
      AI_ALLOWED_ORIGINS: 'http://localhost:5173',
      ...extraEnv,
    },
    stdio: 'ignore',
  })
  const base = `http://127.0.0.1:${port}`
  let ready = false
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error('AI API process exited before becoming ready')
    try {
      const response = await fetch(`${base}/health`)
      if (response.ok) { ready = true; break }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.equal(ready, true, 'health endpoint should become available')
  return { child, base }
}

test('AI API health and provider inventory work without provider secrets', async () => {
  const port = 18787
  const { child, base } = await startApi(port)
  try {
    const health = await fetch(`${base}/health`)
    assert.deepEqual(await health.json(), { status: 'ok' })
    const response = await fetch(`${base}/api/ai/models`, { headers: { Origin: 'http://localhost:5173' } })
    assert.equal(response.status, 200)
    const inventory = await response.json()
    assert.deepEqual(inventory.models, [])
    assert.equal(inventory.providers.length, 4)
    const denied = await fetch(`${base}/api/ai/models`, { headers: { Origin: 'https://untrusted.example' } })
    assert.equal(denied.status, 403)
  } finally {
    child.kill('SIGTERM')
  }
})

test('AI API advertises configured Seedream model IDs without exposing the API key', async () => {
  const port = 18788
  const { child, base } = await startApi(port, {
    ARK_API_KEY: 'test-secret-not-for-output',
    SEEDREAM_IMAGE_MODELS: 'doubao-seedream-test,ep-test-endpoint',
  })
  try {
    const response = await fetch(`${base}/api/ai/models`, { headers: { Origin: 'http://localhost:5173' } })
    assert.equal(response.status, 200)
    const inventory = await response.json()
    assert.deepEqual(inventory.models.map(item => item.id), [
      'seedream:doubao-seedream-test',
      'seedream:ep-test-endpoint',
    ])
    assert.equal(inventory.providers.find(item => item.id === 'seedream').configured, true)
    assert.equal(JSON.stringify(inventory).includes('test-secret-not-for-output'), false)
  } finally {
    child.kill('SIGTERM')
  }
})
