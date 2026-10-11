import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import ThreeCapePreview from './ThreeCapePreview'
import {
  Download, Eraser, Paintbrush, RotateCcw, RotateCw, Upload, PaintBucket, Pipette,
  ZoomIn, ZoomOut, Maximize2, Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown,
  Minus, Square, Circle, Grid2X2, Save, FileImage, Copy,
} from 'lucide-react'

const SIZE = 64
type Tool = 'pencil' | 'eraser' | 'fill' | 'eyedropper' | 'line' | 'rectangle' | 'ellipse'
type Layer = { id: number; name: string; pixels: string[]; visible: boolean; opacity: number }
type Snapshot = { layers: Layer[]; activeId: number }
const emptyPixels = () => Array<string>(SIZE * SIZE).fill('')
const COLORS = ['#111318', '#ffffff', '#ff6b6b', '#ff9f43', '#feca57', '#1dd1a1', '#48dbfb', '#54a0ff', '#5f27cd', '#ff9ff3', '#a3cb38', '#8395a7']
let nextLayerId = 2
const cloneLayers = (layers: Layer[]): Layer[] => layers.map(layer => ({ ...layer, pixels: [...layer.pixels] }))
const firstLayer = (): Layer => ({ id: 1, name: '绘制图层 1', pixels: emptyPixels(), visible: true, opacity: 100 })

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const layersRef = useRef<Layer[]>([firstLayer()])
  const historyRef = useRef<Snapshot[]>([])
  const redoRef = useRef<Snapshot[]>([])
  const drawingRef = useRef(false)
  const startRef = useRef<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const [layers, setLayersState] = useState<Layer[]>(layersRef.current)
  const [activeId, setActiveId] = useState(1)
  const [color, setColor] = useState('#54a0ff')
  const [tool, setTool] = useState<Tool>('pencil')
  const [showGrid, setShowGrid] = useState(true)
  const [projectName, setProjectName] = useState('我的披风')
  const [zoom, setZoom] = useState(700)
  const [brushSize, setBrushSize] = useState(1)
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState('就绪')
  const [editorMode, setEditorMode] = useState<'simple' | 'professional'>(() => {
    try { return localStorage.getItem('pixcape-editor-mode') === 'professional' ? 'professional' : 'simple' } catch { return 'simple' }
  })
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('back')
  const [modelType, setModelType] = useState<'steve' | 'alex'>('steve')
  const [previewRotation, setPreviewRotation] = useState(-13)

  const setLayers = useCallback((next: Layer[] | ((old: Layer[]) => Layer[])) => {
    setLayersState(old => {
      const value = typeof next === 'function' ? next(old) : next
      layersRef.current = value
      setSaved(false)
      return value
    })
  }, [])
  const snapshot = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-79), { layers: cloneLayers(layersRef.current), activeId }]
    redoRef.current = []
  }, [activeId])
  const undo = useCallback(() => {
    const previous = historyRef.current.pop()
    if (!previous) return
    redoRef.current.push({ layers: cloneLayers(layersRef.current), activeId })
    setLayers(previous.layers); setActiveId(previous.activeId); setStatus('已撤销')
  }, [activeId, setLayers])
  const redo = useCallback(() => {
    const next = redoRef.current.pop()
    if (!next) return
    historyRef.current.push({ layers: cloneLayers(layersRef.current), activeId })
    setLayers(next.layers); setActiveId(next.activeId); setStatus('已重做')
  }, [activeId, setLayers])
  const activeLayer = layers.find(layer => layer.id === activeId) ?? layers[layers.length - 1]
  useEffect(() => { try { localStorage.setItem('pixcape-editor-mode', editorMode) } catch { /* storage may be unavailable */ } }, [editorMode])
  const pixelCount = layers.reduce((sum, layer) => sum + (layer.visible ? layer.pixels.filter(Boolean).length : 0), 0)

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, SIZE, SIZE)
    for (const layer of layers) {
      if (!layer.visible) continue
      ctx.globalAlpha = layer.opacity / 100
      layer.pixels.forEach((fill, i) => {
        if (fill) { ctx.fillStyle = fill; ctx.fillRect(i % SIZE, Math.floor(i / SIZE), 1, 1) }
      })
    }
    ctx.globalAlpha = 1
  }, [layers])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pixcape-project-v2')
      if (raw) {
        const data = JSON.parse(raw) as { layers?: Layer[]; activeId?: number; projectName?: string }
        if (data.layers?.length) {
          setLayersState(data.layers); layersRef.current = data.layers
          if (data.activeId) setActiveId(data.activeId)
          if (data.projectName) setProjectName(data.projectName)
          setSaved(true)
        }
      }
    } catch { /* ignore invalid local drafts */ }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.matches('input, textarea, select')) return
      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); return }
      if ((event.ctrlKey || event.metaKey) && key === 'y') { event.preventDefault(); redo(); return }
      if ((event.ctrlKey || event.metaKey) && key === 's') {
        event.preventDefault()
        localStorage.setItem('pixcape-project-v2', JSON.stringify({ layers: layersRef.current, activeId, projectName }))
        setSaved(true); setStatus('已保存到本机'); return
      }
      const shortcuts: Record<string, Tool> = { b: 'pencil', e: 'eraser', g: 'fill', i: 'eyedropper', l: 'line', u: 'rectangle', o: 'ellipse' }
      if (shortcuts[key]) setTool(shortcuts[key])
      if (key === '[') setBrushSize(v => Math.max(1, v - 1))
      if (key === ']') setBrushSize(v => Math.min(12, v + 1))
      if (key === 'x') setColor(v => v === '#ffffff' ? '#111318' : '#ffffff')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, activeId, projectName])

  const getIndex = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(SIZE - 1, Math.floor((event.clientX - rect.left) / rect.width * SIZE)))
    const y = Math.max(0, Math.min(SIZE - 1, Math.floor((event.clientY - rect.top) / rect.height * SIZE)))
    return y * SIZE + x
  }
  const lineIndices = (a: number, b: number) => {
    let x0 = a % SIZE, y0 = Math.floor(a / SIZE), x1 = b % SIZE, y1 = Math.floor(b / SIZE)
    const points: number[] = [], dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    while (true) {
      points.push(y0 * SIZE + x0)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) { err += dy; x0 += sx }
      if (e2 <= dx) { err += dx; y0 += sy }
    }
    return points
  }
  const brushIndices = (index: number) => {
    const cx = index % SIZE, cy = Math.floor(index / SIZE), radius = Math.floor((brushSize - 1) / 2)
    const points: number[] = []
    for (let y = Math.max(0, cy - radius); y <= Math.min(SIZE - 1, cy + radius); y++)
      for (let x = Math.max(0, cx - radius); x <= Math.min(SIZE - 1, cx + radius); x++)
        points.push(y * SIZE + x)
    return points
  }
  const paintIndices = (indices: number[], erase = false) => {
    setLayers(old => old.map(layer => {
      if (layer.id !== activeId) return layer
      const pixels = [...layer.pixels]
      indices.forEach(index => { pixels[index] = erase ? '' : color })
      return { ...layer, pixels }
    }))
  }
  const applyAt = (index: number) => {
    if (tool === 'eyedropper') {
      for (const layer of [...layersRef.current].reverse()) {
        if (layer.visible && layer.pixels[index]) { setColor(layer.pixels[index]); setStatus('已吸取颜色'); return }
      }
      return
    }
    if (tool === 'fill') {
      const layer = layersRef.current.find(item => item.id === activeId)
      if (!layer) return
      const target = layer.pixels[index]
      if (target === color) return
      snapshot()
      const next = [...layer.pixels], stack = [index]
      while (stack.length) {
        const p = stack.pop()!
        if (next[p] !== target) continue
        next[p] = color
        const x = p % SIZE, y = Math.floor(p / SIZE)
        if (x > 0) stack.push(p - 1)
        if (x < SIZE - 1) stack.push(p + 1)
        if (y > 0) stack.push(p - SIZE)
        if (y < SIZE - 1) stack.push(p + SIZE)
      }
      setLayers(old => old.map(item => item.id === activeId ? { ...item, pixels: next } : item))
      setStatus('已填充'); return
    }
    paintIndices(brushIndices(index), tool === 'eraser')
  }
  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const index = getIndex(event)
    if (tool === 'eyedropper' || tool === 'fill') { applyAt(index); return }
    snapshot(); drawingRef.current = true; startRef.current = index; lastRef.current = index
    if (tool === 'pencil' || tool === 'eraser') applyAt(index)
  }
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const index = getIndex(event)
    if ((tool === 'pencil' || tool === 'eraser') && index !== lastRef.current) {
      paintIndices(lineIndices(lastRef.current ?? index, index).flatMap(brushIndices), tool === 'eraser')
      lastRef.current = index
    }
  }
  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || startRef.current === null) return
    const start = startRef.current, end = getIndex(event)
    if (tool === 'line') paintIndices(lineIndices(start, end))
    if (tool === 'rectangle' || tool === 'ellipse') {
      const x0 = start % SIZE, y0 = Math.floor(start / SIZE), x1 = end % SIZE, y1 = Math.floor(end / SIZE)
      const left = Math.min(x0, x1), right = Math.max(x0, x1), top = Math.min(y0, y1), bottom = Math.max(y0, y1)
      const points: number[] = []
      for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
        const inside = tool === 'rectangle'
          ? x === left || x === right || y === top || y === bottom
          : Math.abs(((x + .5) - (left + right + 1) / 2) / Math.max(.5, (right - left + 1) / 2)) ** 2 +
            Math.abs(((y + .5) - (top + bottom + 1) / 2) / Math.max(.5, (bottom - top + 1) / 2)) ** 2 >= .55
        if (inside) points.push(y * SIZE + x)
      }
      paintIndices(points)
    }
    drawingRef.current = false; startRef.current = null; lastRef.current = null
    setStatus('绘制完成')
  }
  const addLayer = (duplicate = false) => {
    const source = layers.find(layer => layer.id === activeId)
    const id = Math.max(nextLayerId, ...layers.map(layer => layer.id + 1))
    nextLayerId = id + 1
    snapshot()
    const layer: Layer = { id, name: duplicate ? (source?.name ?? '图层') + ' 副本' : '新建图层', pixels: duplicate && source ? [...source.pixels] : emptyPixels(), visible: true, opacity: 100 }
    setLayers(old => [...old, layer]); setActiveId(id); setStatus('已添加图层')
  }
  const deleteLayer = (id: number) => {
    if (layers.length <= 1) { setStatus('至少保留一个图层'); return }
    snapshot()
    const next = layers.filter(layer => layer.id !== id)
    setLayers(next)
    if (activeId === id) setActiveId(next[next.length - 1].id)
  }
  const moveLayer = (id: number, direction: -1 | 1) => {
    const index = layers.findIndex(layer => layer.id === id), target = index + direction
    if (target < 0 || target >= layers.length) return
    snapshot()
    const next = [...layers]; [next[index], next[target]] = [next[target], next[index]]; setLayers(next)
  }
  const importImage = (file?: File) => {
    if (!file) return
    const url = URL.createObjectURL(file), image = new Image()
    image.onload = () => {
      const temp = document.createElement('canvas'); temp.width = SIZE; temp.height = SIZE
      const ctx = temp.getContext('2d')
      if (ctx) {
        ctx.imageSmoothingEnabled = false
        ctx.clearRect(0, 0, SIZE, SIZE)
        ctx.drawImage(image, 0, 0, SIZE, SIZE)
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data, pixels = emptyPixels()
        for (let i = 0; i < pixels.length; i++) if (data[i * 4 + 3] > 24) pixels[i] = '#' + [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]].map(n => n.toString(16).padStart(2, '0')).join('')
        snapshot()
        setLayers(old => old.map(layer => layer.id === activeId ? { ...layer, pixels, name: file.name.replace(/\.[^.]+$/, '') || layer.name } : layer))
        setStatus('图片已导入当前图层')
      }
      URL.revokeObjectURL(url)
    }
    image.onerror = () => { URL.revokeObjectURL(url); setStatus('图片导入失败') }
    image.src = url
  }
  const makeComposite = () => {
    const output = document.createElement('canvas'); output.width = SIZE; output.height = SIZE
    const ctx = output.getContext('2d')
    if (!ctx) return output
    for (const layer of layersRef.current) {
      if (!layer.visible) continue
      ctx.globalAlpha = layer.opacity / 100
      layer.pixels.forEach((fill, i) => { if (fill) { ctx.fillStyle = fill; ctx.fillRect(i % SIZE, Math.floor(i / SIZE), 1, 1) } })
    }
    ctx.globalAlpha = 1
    return output
  }
  const exportPng = () => {
    const output = makeComposite(), link = document.createElement('a')
    link.download = (projectName.trim() || 'pixcape-art') + '.png'
    link.href = output.toDataURL('image/png'); link.click(); setSaved(true); setStatus('PNG 已导出')
  }
  const saveLocal = () => {
    localStorage.setItem('pixcape-project-v2', JSON.stringify({ layers: layersRef.current, activeId, projectName }))
    setSaved(true); setStatus('已保存到本机')
  }
  const clearLayer = () => {
    if (!window.confirm('清空当前图层？此操作可以撤销。')) return
    snapshot(); setLayers(old => old.map(layer => layer.id === activeId ? { ...layer, pixels: emptyPixels() } : layer)); setStatus('图层已清空')
  }
  const toolList: { id: Tool; label: string; key: string; icon: typeof Paintbrush }[] = [
    { id: 'pencil', label: '画笔', key: 'B', icon: Paintbrush }, { id: 'eraser', label: '橡皮擦', key: 'E', icon: Eraser },
    { id: 'fill', label: '油漆桶', key: 'G', icon: PaintBucket }, { id: 'eyedropper', label: '吸管', key: 'I', icon: Pipette },
    { id: 'line', label: '直线', key: 'L', icon: Minus }, { id: 'rectangle', label: '矩形', key: 'U', icon: Square },
    { id: 'ellipse', label: '椭圆', key: 'O', icon: Circle },
  ]

  return <div className={'editor-shell ' + (editorMode === 'simple' ? 'simple-mode' : 'professional-mode')}>
    <header className="topbar">
      <a className="brand" href="#" onClick={e => e.preventDefault()}><span className="brand-mark">✦</span><span>Pixcape</span><small>STUDIO</small></a>
      <nav className="main-menu"><button onClick={saveLocal}>文件</button><button onClick={undo}>编辑</button><button onClick={() => setShowGrid(v => !v)}>视图</button><button onClick={() => setStatus('快捷键：B 画笔 / E 橡皮 / G 填充 / Ctrl+Z 撤销')}>帮助</button></nav>
      <div className="top-actions"><div className="mode-switch" role="group" aria-label="编辑器模式"><button className={editorMode === 'simple' ? 'active' : ''} aria-pressed={editorMode === 'simple'} onClick={() => setEditorMode('simple')}>简单模式</button><button className={editorMode === 'professional' ? 'active' : ''} aria-pressed={editorMode === 'professional'} onClick={() => setEditorMode('professional')}>专业模式</button></div><span className={'save-state ' + (saved ? 'is-saved' : '')}><span />{saved ? '已保存' : '未保存'}</span><button className="primary-btn" onClick={exportPng}><Download size={15}/> 导出 PNG</button></div>
    </header>
    <main className="editor-layout">
      <aside className="left-sidebar">
        <section className="panel tool-panel"><div className="section-title">工具 <span>TOOLS</span></div>
          <div className="tool-list">{toolList.map(({ id, label, key, icon: Icon }) => <button key={id} title={label + ' (' + key + ')'} aria-pressed={tool === id} className={'tool-button ' + (tool === id ? 'selected' : '')} onClick={() => setTool(id)}><Icon size={17}/><span>{label}</span><kbd>{key}</kbd></button>)}</div>
        </section>
        <section className="panel color-panel"><div className="section-title">颜色 <span>COLOR</span></div><div className="color-current"><input type="color" aria-label="选择颜色" value={color} onChange={e => setColor(e.target.value)}/><div><strong>{color.toUpperCase()}</strong><small>前景色</small></div></div><div className="swatches">{COLORS.map(c => <button key={c} title={c} aria-label={'选择颜色 ' + c} className={color === c ? 'active' : ''} style={{ background: c }} onClick={() => setColor(c)}/>)}</div><label className="range-label">画笔大小 <strong>{brushSize} px</strong></label><input className="range" type="range" min="1" max="12" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))}/></section>
      </aside>
      <section className="center-workspace">
        <div className="document-tabs"><div className="tab active"><FileImage size={14}/><input value={projectName} aria-label="项目名称" onChange={e => { setProjectName(e.target.value); setSaved(false) }}/><span>.png</span></div><div className="tab-meta">64 × 64 · RGBA</div><div className="tab-actions"><button title="撤销 Ctrl+Z" disabled={!historyRef.current.length} onClick={undo}><RotateCcw size={16}/></button><button title="重做 Ctrl+Y" disabled={!redoRef.current.length} onClick={redo}><RotateCw size={16}/></button><i/><button title="清空当前图层" onClick={clearLayer}><Trash2 size={16}/></button><button title="导入图片到当前图层" onClick={() => inputRef.current?.click()}><Upload size={16}/></button><input ref={inputRef} hidden type="file" accept="image/*" onChange={e => { importImage(e.target.files?.[0]); e.currentTarget.value = '' }}/></div></div>
        <div className="canvas-toolbar"><div className="toolbar-group"><span className="toolbar-label">画布</span><button onClick={() => setZoom(v => Math.max(200, v - 100))} title="缩小"><ZoomOut size={15}/></button><strong>{Math.round(zoom / 100)}×</strong><button onClick={() => setZoom(v => Math.min(1000, v + 100))} title="放大"><ZoomIn size={15}/></button><button onClick={() => setZoom(700)} title="适应画布"><Maximize2 size={15}/></button></div><div className="toolbar-group"><button className={showGrid ? 'tool-on' : ''} onClick={() => setShowGrid(v => !v)} title="显示/隐藏像素网格"><Grid2X2 size={15}/></button><span className="toolbar-label">64 × 64</span></div></div>
        <div className="canvas-stage"><div className="canvas-ruler top-ruler"><span>0</span><span>16</span><span>32</span><span>48</span><span>64</span></div><div className="canvas-workarea"><div className="side-ruler"><span>0</span><span>16</span><span>32</span><span>48</span><span>64</span></div><div className="checkerboard" style={{ width: 'min(' + zoom + 'px, calc(100vw - 390px))' }}><canvas ref={canvasRef} width={SIZE} height={SIZE} className={'pixel-canvas ' + (showGrid ? 'with-grid' : '')} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { drawingRef.current = false }} aria-label="64×64 像素画布"/></div></div><div className="canvas-help">{editorMode === 'simple' ? '① 选择颜色　② 在画布绘制　③ 导出 PNG' : '当前工具：' + (toolList.find(item => item.id === tool)?.label ?? '画笔') + ' · 拖动绘制 · Ctrl+Z 撤销'}</div></div>
        <div className="status-bar"><span><i className="live-dot"/>{status}</span><span>{pixelCount.toLocaleString()} 像素 · 当前图层：{activeLayer?.name ?? '图层'}</span><span>Ctrl + Z 撤销</span></div>
      </section>
      <aside className="right-sidebar">
        <section className="panel preview-panel"><div className="section-title">3D 预览 <span>PREVIEW</span></div><div className="preview-tabs"><button className={previewSide === 'front' ? 'active' : ''} onClick={() => setPreviewSide('front')}>正面</button><button className={previewSide === 'back' ? 'active' : ''} onClick={() => setPreviewSide('back')}>背面</button><span className="preview-tab-divider" /><button className={modelType === 'steve' ? 'active' : ''} onClick={() => setModelType('steve')}>Steve</button><button className={modelType === 'alex' ? 'active' : ''} onClick={() => setModelType('alex')}>Alex</button></div><div className="preview-note">{editorMode === 'simple' ? '拖动旋转 · 在左侧选颜色后直接绘制' : 'Three.js 实时 3D 模型 · 当前绘制内容映射到披风表面'}</div><div className="model-stage three-model-stage"><ThreeCapePreview layers={layers} side={previewSide} rotation={previewRotation} modelType={modelType} onRotationChange={setPreviewRotation}/><p>拖动模型可旋转视角</p><small>实时 3D · 披风纹理同步</small></div></section>
        <section className="panel layers-panel"><div className="section-title">图层 <span>{layers.length} LAYERS</span></div><div className="layer-actions"><button title="新建图层" onClick={() => addLayer()}><Plus size={16}/></button><button title="复制图层" onClick={() => addLayer(true)}><Copy size={15}/></button><button title="删除图层" onClick={() => deleteLayer(activeId)}><Trash2 size={15}/></button></div><div className="layer-list">{[...layers].reverse().map(layer => <div key={layer.id} className={'layer-row ' + (activeId === layer.id ? 'active' : '')} onClick={() => setActiveId(layer.id)}><button className="visibility-btn" title={layer.visible ? '隐藏图层' : '显示图层'} onClick={e => { e.stopPropagation(); setLayers(old => old.map(item => item.id === layer.id ? { ...item, visible: !item.visible } : item)) }}>{layer.visible ? <Eye size={15}/> : <EyeOff size={15}/>}</button><div className="layer-thumb"><canvas width="32" height="32" ref={node => { if (!node) return; const ctx = node.getContext('2d'); if (!ctx) return; ctx.clearRect(0, 0, 32, 32); layer.pixels.forEach((fill, i) => { if (fill) { ctx.fillStyle = fill; ctx.fillRect((i % 64) / 2, Math.floor(i / 64) / 2, .5, .5) } }) }}/></div><div className="layer-info"><span>{layer.name}</span><small>{layer.pixels.filter(Boolean).length} px · {layer.opacity}%</small></div><div className="layer-order"><button title="上移图层" onClick={e => { e.stopPropagation(); moveLayer(layer.id, 1) }}><ChevronUp size={13}/></button><button title="下移图层" onClick={e => { e.stopPropagation(); moveLayer(layer.id, -1) }}><ChevronDown size={13}/></button></div></div>)}</div>{activeLayer && <><label className="range-label">图层不透明度 <strong>{activeLayer.opacity}%</strong></label><input className="range" type="range" min="0" max="100" value={activeLayer.opacity} onChange={e => setLayers(old => old.map(layer => layer.id === activeId ? { ...layer, opacity: Number(e.target.value) } : layer))}/><div className="layer-footnote">图层独立编辑 · 可隐藏、复制、排序</div></>}</section>
        <section className="panel export-panel"><div className="section-title">导出 <span>EXPORT</span></div><div className="export-meta"><span>画布尺寸</span><strong>64 × 64 px</strong></div><button className="export-wide" onClick={exportPng}><Download size={15}/> 导出透明 PNG</button><button className="save-wide" onClick={saveLocal}><Save size={15}/> 保存到本机</button></section>
      </aside>
    </main>
    <footer className="app-footer"><span>Pixcape · Minecraft 披风 / 皮肤编辑器</span><span>{saved ? '本地草稿已保存' : '有未保存的修改'}</span></footer>
  </div>
}
