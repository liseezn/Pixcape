import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'

test('AI API health and provider inventory work without provider secrets', async () => {
  const port = 18787
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('.', import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      GEMINI_API_KEY: '',
      OPENAI_API_KEY: '',
      OPENROUTER_API_KEY: '',
      OPENROUTER_IMAGE_MODEL: '',
      AI_ALLOWED_ORIGINS: 'http://localhost:5173',
    },
    stdio: 'ignore',
  })
  const base = `http://127.0.0.1:${port}`
  try {
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
    const health = await fetch(`${base}/health`)
    assert.deepEqual(await health.json(), { status: 'ok' })
    const response = await fetch(`${base}/api/ai/models`)
    assert.equal(response.status, 200)
    const inventory = await response.json()
    assert.deepEqual(inventory.models, [])
    assert.equal(inventory.providers.length, 3)
  } finally {
    child.kill('SIGTERM')
  }
})
