import test from 'node:test'
import assert from 'node:assert/strict'

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'

test('security headers are sent on public pages', async () => {
  const response = await fetch(base, { redirect: 'manual' })
  assert.ok(response.status < 500, `home should not return server error (got ${response.status})`)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('x-frame-options'), 'DENY')
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
})

for (const path of ['/account', '/creator', '/admin']) {
  test(`anonymous access to ${path} is denied`, async () => {
    const response = await fetch(new URL(path, base), { redirect: 'manual' })
    assert.ok([302, 307, 308].includes(response.status), `${path} should redirect unauthenticated users (got ${response.status})`)
    assert.match(response.headers.get('location') || '', /login/)
  })
}

test('login entry point is rate-limited and emits Retry-After', async () => {
  let finalResponse
  for (let i = 0; i < 12; i++) {
    finalResponse = await fetch(new URL('/api/auth/signin/github', base), {
      method: 'GET',
      redirect: 'manual',
      headers: { 'x-real-ip': '198.51.100.77' },
    })
  }
  assert.equal(finalResponse.status, 429)
  assert.ok(Number(finalResponse.headers.get('retry-after')) > 0)
  assert.equal(finalResponse.headers.get('cache-control'), 'no-store')
})
