import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { convertPanelToSkin } from './converter.mjs'

test('panel converter returns a structurally sized skin PNG for Classic and Slim', async () => {
  const width = 512
  const height = 512
  const svg = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/><g fill="#6b4c35"><rect x="90" y="40" width="76" height="76"/><rect x="84" y="116" width="88" height="140"/><rect x="54" y="116" width="30" height="125"/><rect x="172" y="116" width="30" height="125"/><rect x="92" y="256" width="35" height="150"/><rect x="132" y="256" width="35" height="150"/><rect x="346" y="40" width="76" height="76"/><rect x="340" y="116" width="88" height="140"/><rect x="310" y="116" width="30" height="125"/><rect x="428" y="116" width="30" height="125"/><rect x="348" y="256" width="35" height="150"/><rect x="388" y="256" width="35" height="150"/></g><g fill="#e9c39e"><rect x="100" y="78" width="12" height="8"/><rect x="145" y="78" width="12" height="8"/></g></svg>`)
  const input = await sharp(svg).png().toBuffer()
  for (const variant of ['classic', 'slim']) {
    const output = await convertPanelToSkin(input, variant)
    const meta = await sharp(output).metadata()
    assert.equal(meta.width, 64)
    assert.equal(meta.height, 64)
    assert.equal(meta.format, 'png')
  }
})
