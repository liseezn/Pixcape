import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import {
  Download, Eraser, Grid2X2, Paintbrush, RotateCcw, RotateCw,
  Trash2, Upload, Minus, PaintBucket, Pipette,
  ZoomIn, ZoomOut, Maximize2, Layers3, Command, Check,
} from 'lucide-react'

const SIZE = 64
const EMPTY = () => Array<string>(SIZE * SIZE).fill('')
const COLORS = ['#111318', '#ffffff', '#ff6b6b', '#ff9f43', '#feca57', '#1dd1a1', '#48dbfb', '#54a0ff', '#5f27cd', '#ff9ff3', '#a3cb38', '#8395a7']
type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'line'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pixelsRef = useRef<string[]>(EMPTY())
  const undoRef = useRef<string[][]>([])
  const redoRef = useRef<string[][]>([])
  const startRef = useRef<number | null>(null)
  const drawingRef = useRef(false)
  const [pixels, setPixelsState] = useState<string[]>(pixelsRef.current)
  const [color, setColor] = useState('#ff6b6b')
  const [tool, setTool] = useState<Tool>('pencil')
  const [showGrid, setShowGrid] = useState(true)
  const [projectName, setProjectName] = useState('untitled-pixel')
  const [importScale, setImportScale] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [saved, setSaved] = useState(true)

  const setPixels = useCallback((next: string[] | ((old: string[]) => string[])) => {
    setSaved(false)
    setPixelsState(old => {
      const value = typeof next === 'function' ? next(old) : next
      pixelsRef.current = value
      return value
    })
  }, [])
  const checkpoint = useCallback(() => {
    undoRef.current = [...undoRef.current.slice(-79), [...pixelsRef.current]]
    redoRef.current = []
  }, [])
  const undo = useCallback(() => {
    if (!undoRef.current.length) return
    redoRef.current = [...redoRef.current, [...pixelsRef.current]]
    setPixels(undoRef.current.pop()!)
  }, [setPixels])
  const redo = useCallback(() => {
    if (!redoRef.current.length) return
    undoRef.current = [...undoRef.current, [...pixelsRef.current]]
    setPixels(redoRef.current.pop()!)
  }, [setPixels])

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, SIZE, SIZE)
    pixels.forEach((fill, i) => { if (fill) { ctx.fillStyle = fill; ctx.fillRect(i % SIZE, Math.floor(i / SIZE), 1, 1) } })
  }, [pixels])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.matches('input, textarea')) return
      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); return }
      if ((event.ctrlKey || event.metaKey) && key === 'y') { event.preventDefault(); redo(); return }
      if (key === 'b') setTool('pencil')
      if (key === 'e') setTool('eraser')
      if (key === 'g') setTool('fill')
      if (key === 'i') setTool('eyedropper')
      if (key === 'l') setTool('line')
      if (key === 'h') setShowGrid(v => !v)
      if (key === '[') setZoom(v => Math.max(50, v - 25))
      if (key === ']') setZoom(v => Math.min(400, v + 25))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const getIndex = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(SIZE - 1, Math.floor((event.clientX - rect.left) / rect.width * SIZE)))
    const y = Math.max(0, Math.min(SIZE - 1, Math.floor((event.clientY - rect.top) / rect.height * SIZE)))
    return y * SIZE + x
  }
  const lineIndices = (a: number, b: number) => {
    let x0 = a % SIZE, y0 = Math.floor(a / SIZE), x1 = b % SIZE, y1 = Math.floor(b / SIZE)
    const points: number[] = [], dx = Math.abs(x1-x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1-y0), sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    while (true) { points.push(y0 * SIZE + x0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx }; if (e2 <= dx) { err += dx; y0 += sy } }
    return points
  }
  const applyAt = (index: number) => {
    if (tool === 'eyedropper') { if (pixelsRef.current[index]) setColor(pixelsRef.current[index]); return }
    if (tool === 'fill') {
      const old = pixelsRef.current, target = old[index]
      if (target === color) return
      checkpoint()
      const next = [...old], stack = [index]
      while (stack.length) {
        const p = stack.pop()!
        if (next[p] !== target) continue
        next[p] = color
        const x = p % SIZE, y = Math.floor(p / SIZE)
        if (x > 0) stack.push(p-1); if (x < SIZE-1) stack.push(p+1)
        if (y > 0) stack.push(p-SIZE); if (y < SIZE-1) stack.push(p+SIZE)
      }
      setPixels(next); return
    }
    setPixels(old => { const next = [...old]; next[index] = tool === 'eraser' ? '' : color; return next })
  }
  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const index = getIndex(e)
    if (tool === 'eyedropper' || tool === 'fill') { applyAt(index); return }
    checkpoint(); drawingRef.current = true; startRef.current = index
    if (tool !== 'line') applyAt(index)
  }
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => { if (drawingRef.current && tool !== 'line') applyAt(getIndex(e)) }
  const onPointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    if (tool === 'line' && startRef.current !== null) {
      const points = lineIndices(startRef.current, getIndex(e))
      setPixels(old => { const next = [...old]; points.forEach(p => { next[p] = color }); return next })
    }
    drawingRef.current = false; startRef.current = null
  }

  const importImage = (file?: File) => {
    if (!file) return
    const url = URL.createObjectURL(file), image = new Image()
    image.onload = () => {
      const temp = document.createElement('canvas'); temp.width = SIZE; temp.height = SIZE
      const ctx = temp.getContext('2d')
      if (ctx) {
        const scale = Math.min(SIZE / image.width, SIZE / image.height) * importScale
        const w = image.width * scale, h = image.height * scale
        ctx.clearRect(0, 0, SIZE, SIZE); ctx.imageSmoothingEnabled = false
        ctx.drawImage(image, (SIZE-w)/2, (SIZE-h)/2, w, h)
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data, next = EMPTY()
        for (let i = 0; i < next.length; i++) if (data[i*4+3] > 24) next[i] = '#' + [data[i*4],data[i*4+1],data[i*4+2]].map(n=>n.toString(16).padStart(2,'0')).join('')
        checkpoint(); setPixels(next)
        setProjectName(file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9-_]+/g, '-') || 'imported-art')
      }
      URL.revokeObjectURL(url)
    }
    image.onerror = () => URL.revokeObjectURL(url)
    image.src = url
  }
  const exportPng = () => {
    const output = document.createElement('canvas'); output.width = SIZE * 8; output.height = SIZE * 8
    const ctx = output.getContext('2d'); if (!ctx) return
    pixelsRef.current.forEach((fill, i) => { if (fill) { ctx.fillStyle = fill; ctx.fillRect((i%SIZE)*8, Math.floor(i/SIZE)*8, 8, 8) } })
    const link = document.createElement('a'); link.download = (projectName.trim() || 'pixcape-art') + '.png'; link.href = output.toDataURL('image/png'); link.click()
    setSaved(true)
  }
  const clearCanvas = () => { if (window.confirm('Clear the entire canvas? You can undo this action.')) { checkpoint(); setPixels(EMPTY()) } }
  const toolList: { id: Tool; label: string; key: string; icon: typeof Paintbrush }[] = [
    { id: 'pencil', label: 'Pencil', key: 'B', icon: Paintbrush }, { id: 'eraser', label: 'Eraser', key: 'E', icon: Eraser },
    { id: 'fill', label: 'Fill', key: 'G', icon: PaintBucket }, { id: 'eyedropper', label: 'Eyedropper', key: 'I', icon: Pipette },
    { id: 'line', label: 'Line', key: 'L', icon: Minus },
  ]

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="Pixcape home"><span className="brand-mark"><span /></span><span>pixcape<span className="brand-dot">.</span></span><span className="brand-product">STUDIO</span></a>
      <div className="topbar-center"><span className="workspace-label">WORKSPACE</span><span className="crumb">My projects</span><span className="crumb-sep">/</span><span className="crumb current">{projectName}</span></div>
      <div className="topbar-right"><span className="save-state"><span className={'status-dot '+(!saved?'unsaved':'')}/>{saved?'Saved locally':'Unsaved changes'}</span><button className="export-btn" onClick={exportPng}><Download size={15}/> Export PNG</button></div>
    </header>
    <main>
      <section className="document-bar"><div><div className="eyebrow">PIXEL ART EDITOR <span className="eyebrow-divider">/</span> 2D WORKSPACE</div><input className="document-name" aria-label="Project filename" value={projectName} onChange={e=>setProjectName(e.target.value)} spellCheck={false}/><span className="document-subtitle">Transparent canvas · 64 × 64 pixels</span></div><div className="doc-actions"><button title="Undo (Ctrl+Z)" disabled={!undoRef.current.length} onClick={undo}><RotateCcw size={16}/></button><button title="Redo (Ctrl+Y)" disabled={!redoRef.current.length} onClick={redo}><RotateCw size={16}/></button><span className="action-divider"/><button title="Clear canvas" onClick={clearCanvas}><Trash2 size={16}/></button></div></section>
      <section className="workspace">
        <aside className="panel tools-panel">
          <div className="panel-heading"><span>TOOLS</span><span className="panel-index">01</span></div>
          <div className="tool-grid">{toolList.map(({id,label,key,icon:Icon})=><button key={id} title={label+' ('+key+')'} aria-pressed={tool===id} className={'tool-button '+(tool===id?'selected':'')} onClick={()=>setTool(id)}><Icon size={17}/><span>{label}</span><kbd>{key}</kbd></button>)}</div>
          <div className="panel-separator"/>
          <div className="panel-heading"><span>COLOR</span><span className="panel-index">02</span></div>
          <div className="active-color"><span className="color-preview" style={{background:color}}/><div className="color-values"><strong>{color.toUpperCase()}</strong><small>FOREGROUND</small></div><input aria-label="Choose custom color" type="color" value={color} onChange={e=>setColor(e.target.value)}/></div>
          <div className="swatches">{COLORS.map(c=><button key={c} aria-label={'Select '+c} title={c} className={'swatch '+(c===color?'active':'')} style={{background:c}} onClick={()=>{setColor(c);setTool('pencil')}}/>)}</div>
          <div className="panel-separator"/>
          <div className="panel-heading"><span>CANVAS</span><span className="panel-index">03</span></div>
          <button className="setting-row" onClick={()=>setShowGrid(v=>!v)}><Grid2X2 size={16}/><span>Pixel grid</span><span className={'toggle '+(showGrid?'on':'')}><i/></span></button>
          <div className="canvas-info"><span>Width</span><strong>64 px</strong><span>Height</span><strong>64 px</strong><span>Background</span><strong>Transparent</strong></div>
          <div className="panel-separator"/>
          <div className="panel-heading"><span>IMPORT IMAGE</span><span className="panel-index">04</span></div>
          <label className="scale-label" htmlFor="scale">Image scale <span>{Math.round(importScale*100)}%</span></label>
          <input id="scale" className="scale-slider" type="range" min=".5" max="2" step=".25" value={importScale} onChange={e=>setImportScale(Number(e.target.value))}/>
          <button className="import-btn" onClick={()=>inputRef.current?.click()}><Upload size={15}/> Import image</button>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={e=>{importImage(e.target.files?.[0]);e.currentTarget.value=''}}/>
          <p className="hint">Images are centered and resized to fit the canvas.</p>
        </aside>
        <section className="canvas-column">
          <div className="canvas-card">
            <div className="canvas-toolbar"><div className="canvas-title"><span className="file-icon">✳</span><span>{projectName || 'Untitled'}</span><span className="file-extension">.PNG</span></div><div className="canvas-toolbar-actions"><span className="canvas-dimensions">64 × 64 PX</span><span className="action-divider"/><button title="Zoom out" onClick={()=>setZoom(v=>Math.max(50,v-25))}><ZoomOut size={15}/></button><span className="zoom-value">{zoom}%</span><button title="Zoom in" onClick={()=>setZoom(v=>Math.min(400,v+25))}><ZoomIn size={15}/></button><button title="Reset zoom" onClick={()=>setZoom(100)}><Maximize2 size={14}/></button></div></div>
            <div className="canvas-stage"><div className="canvas-ruler ruler-top"><span>0</span><span>16</span><span>32</span><span>48</span><span>64</span></div><div className="canvas-workarea"><div className="canvas-ruler ruler-left"><span>0</span><span>16</span><span>32</span><span>48</span><span>64</span></div><div className="checkerboard" style={{width:'min('+ (440*zoom/100)+'px, calc(100vw - 100px))'}}><canvas ref={canvasRef} width={SIZE} height={SIZE} className={'pixel-canvas '+(showGrid?'with-grid':'')} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={()=>{drawingRef.current=false}} aria-label="64 by 64 pixel drawing canvas"/></div></div></div>
            <div className="canvas-footer"><span><span className="keyboard-dot"/>{toolList.find(t=>t.id===tool)?.label} tool active</span><span>RGBA · TRANSPARENT BACKGROUND</span><span>{pixels.filter(Boolean).length.toLocaleString()} / 4,096 PIXELS</span></div>
          </div>
          <div className="bottom-row"><div className="tip-card"><span className="tip-icon"><Command size={16}/></span><div><strong>Fast workflow</strong><p><kbd>B</kbd> Pencil <kbd>E</kbd> Eraser <kbd>G</kbd> Fill <kbd>I</kbd> Pick color <kbd>H</kbd> Grid · Ctrl/⌘ Z Undo</p></div></div><button className="reset-btn" onClick={()=>setZoom(100)}><Maximize2 size={14}/> Fit canvas</button></div>
          <div className="layer-panel"><div className="layer-heading"><span><Layers3 size={15}/> LAYERS</span><span className="layer-count">1 layer</span></div><div className="layer-row"><span className="layer-thumb"><Grid2X2 size={15}/></span><span className="layer-name">Layer 1 <small>64 × 64 px</small></span><span className="layer-visible"><Check size={14}/></span></div><p className="layer-note">Single-layer editing is active. Multi-layer support is not yet implemented.</p></div>
        </section>
      </section>
      <footer><span>PIX CAPE STUDIO <b>© 2026</b></span><span>64 × 64 · PIXEL-PERFECT BY DESIGN</span></footer>
    </main>
  </div>
}
