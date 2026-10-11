import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import {
  Download, Eraser, Grid2X2, ImagePlus, Paintbrush, RotateCcw,
  Trash2, Upload, WandSparkles, MousePointer2, Palette,
} from 'lucide-react'

const SIZE = 64
const COLORS = ['#111318', '#ffffff', '#ff6b6b', '#ff9f43', '#feca57', '#1dd1a1', '#48dbfb', '#54a0ff', '#5f27cd', '#ff9ff3', '#a3cb38', '#8395a7']

type Tool = 'pencil' | 'eraser'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [color, setColor] = useState('#ff6b6b')
  const [tool, setTool] = useState<Tool>('pencil')
  const [showGrid, setShowGrid] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [pixels, setPixels] = useState<string[]>(() => Array(SIZE * SIZE).fill(''))
  const [projectName, setProjectName] = useState('untitled-pixel')
  const [importScale, setImportScale] = useState(1)

  const paintPixel = useCallback((index: number) => {
    setPixels(old => {
      if (old[index] === (tool === 'eraser' ? '' : color)) return old
      const next = [...old]
      next[index] = tool === 'eraser' ? '' : color
      return next
    })
  }, [tool, color])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, SIZE, SIZE)
    pixels.forEach((fill, i) => {
      if (fill) {
        ctx.fillStyle = fill
        ctx.fillRect(i % SIZE, Math.floor(i / SIZE), 1, 1)
      }
    })
  }, [pixels])

  const getIndex = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(SIZE - 1, Math.floor((event.clientX - rect.left) / rect.width * SIZE)))
    const y = Math.max(0, Math.min(SIZE - 1, Math.floor((event.clientY - rect.top) / rect.height * SIZE)))
    return y * SIZE + x
  }

  const importImage = (file?: File) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const temp = document.createElement('canvas')
      temp.width = SIZE
      temp.height = SIZE
      const ctx = temp.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, SIZE, SIZE)
        const scale = Math.min(SIZE / image.width, SIZE / image.height) * importScale
        const w = image.width * scale
        const h = image.height * scale
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(image, (SIZE - w) / 2, (SIZE - h) / 2, w, h)
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data
        const next = Array(SIZE * SIZE).fill('') as string[]
        for (let i = 0; i < next.length; i++) {
          if (data[i * 4 + 3] > 24) {
            const hex = (n: number) => n.toString(16).padStart(2, '0')
            next[i] = '#' + hex(data[i * 4]) + hex(data[i * 4 + 1]) + hex(data[i * 4 + 2])
          }
        }
        setPixels(next)
        setProjectName(file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9-_]+/g, '-') || 'imported-art')
      }
      URL.revokeObjectURL(url)
    }
    image.src = url
  }

  const exportPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const output = document.createElement('canvas')
    output.width = SIZE * 8
    output.height = SIZE * 8
    const ctx = output.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(canvas, 0, 0, output.width, output.height)
    const link = document.createElement('a')
    link.download = (projectName.trim() || 'pixcape-art') + '.png'
    link.href = output.toDataURL('image/png')
    link.click()
  }

  const clearCanvas = () => {
    if (window.confirm('Clear the whole canvas? This cannot be undone.')) setPixels(Array(SIZE * SIZE).fill(''))
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Pixcape home"><span className="brand-mark"><span /></span><span>pixcape<span className="brand-dot">.</span></span></a>
        <div className="topbar-right"><span className="save-state"><span className="status-dot" /> All changes saved locally</span><button className="export-btn" onClick={exportPng}><Download size={16} /> Export PNG</button></div>
      </header>
      <main>
        <section className="intro">
          <div><div className="eyebrow"><WandSparkles size={13} /> YOUR TINY CREATIVE STUDIO</div><h1>Make something <em>pixel-perfect.</em></h1><p>A little canvas for big ideas. Every pixel is yours.</p></div>
          <div className="canvas-meta"><span className="live-dot" /> CANVAS READY <span className="meta-divider">/</span> 64 × 64 PX</div>
        </section>
        <section className="workspace">
          <aside className="panel tools-panel">
            <div className="panel-heading"><span>01 / TOOLS</span><MousePointer2 size={15} /></div>
            <div className="tool-list">
              <button className={'tool-button ' + (tool === 'pencil' ? 'selected' : '')} onClick={() => setTool('pencil')}><Paintbrush size={17} /><span>Pencil</span><kbd>B</kbd></button>
              <button className={'tool-button ' + (tool === 'eraser' ? 'selected' : '')} onClick={() => setTool('eraser')}><Eraser size={17} /><span>Eraser</span><kbd>E</kbd></button>
            </div>
            <div className="panel-separator" />
            <div className="panel-heading"><span>02 / COLOR</span><Palette size={15} /></div>
            <div className="active-color"><span className="color-preview" style={{ background: color }} /><div><strong>{color.toUpperCase()}</strong><small>ACTIVE COLOR</small></div><input aria-label="Choose custom color" type="color" value={color} onChange={e => setColor(e.target.value)} /></div>
            <div className="swatches">{COLORS.map(c => <button key={c} aria-label={'Select color ' + c} title={c} className={'swatch ' + (c === color ? 'active' : '')} style={{ background: c }} onClick={() => { setColor(c); setTool('pencil') }} />)}</div>
            <div className="panel-separator" />
            <div className="panel-heading"><span>03 / CANVAS</span><Grid2X2 size={15} /></div>
            <button className={'setting-row ' + (showGrid ? 'setting-on' : '')} onClick={() => setShowGrid(!showGrid)}><Grid2X2 size={16} /><span>Pixel grid</span><span className={'toggle ' + (showGrid ? 'on' : '')}><i /></span></button>
            <button className="setting-row danger-row" onClick={clearCanvas}><Trash2 size={16} /><span>Clear canvas</span></button>
            <div className="panel-separator" />
            <div className="panel-heading"><span>04 / IMPORT</span><ImagePlus size={15} /></div>
            <label className="scale-label" htmlFor="scale">Image scale <span>{Math.round(importScale * 100)}%</span></label>
            <input id="scale" className="scale-slider" type="range" min="0.5" max="2" step="0.25" value={importScale} onChange={e => setImportScale(Number(e.target.value))} />
            <button className="import-btn" onClick={() => inputRef.current?.click()}><Upload size={15} /> Import image</button>
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => { importImage(e.target.files?.[0]); e.currentTarget.value = '' }} />
            <p className="hint">Images are centered and resized to fit the 64 × 64 canvas.</p>
          </aside>
          <section className="canvas-column">
            <div className="canvas-card">
              <div className="canvas-toolbar"><div className="canvas-title"><span className="file-icon">✳</span><input aria-label="Project filename" value={projectName} onChange={e => setProjectName(e.target.value)} spellCheck={false} /></div><div className="canvas-dimensions">64 × 64 <span>PX</span></div></div>
              <div className="canvas-stage">
                <div className="checkerboard">
                  <canvas ref={canvasRef} width={SIZE} height={SIZE} className={'pixel-canvas ' + (showGrid ? 'with-grid' : '')} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setDrawing(true); paintPixel(getIndex(e)) }} onPointerMove={e => { if (drawing) paintPixel(getIndex(e)) }} onPointerUp={() => setDrawing(false)} onPointerCancel={() => setDrawing(false)} aria-label="64 by 64 pixel drawing canvas" />
                </div>
              </div>
              <div className="canvas-footer"><span><span className="keyboard-dot" /> {tool === 'pencil' ? 'Pencil' : 'Eraser'} active</span><span>PNG · TRANSPARENT BACKGROUND</span></div>
            </div>
            <div className="bottom-row"><div className="tip-card"><span className="tip-icon">✦</span><div><strong>Small pixels, endless possibilities.</strong><p>Try a few colors, then export your creation as a crisp PNG.</p></div></div><button className="reset-btn" onClick={() => setPixels(Array(SIZE * SIZE).fill(''))}><RotateCcw size={14} /> Reset</button></div>
          </section>
        </section>
        <footer><span>PIX CAPE STUDIO <b>© 2026</b></span><span>MADE FOR THE LOVE OF LITTLE THINGS <span className="footer-heart">♥</span></span></footer>
      </main>
    </div>
  )
}
