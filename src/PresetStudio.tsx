import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Shirt, Upload, RotateCcw, UserRound, Layers, ArrowRight, X } from 'lucide-react'
import ThreeCapePreview from './ThreeCapePreview'
import './preset-studio.css'

type GarmentKind = 'shawl' | 'coat'
type Preset = { id: string; label: string; file: string; slimFile: string; kind: GarmentKind }

const ASSET_ROOT = 'https://raw.githubusercontent.com/lonelyang/CapeSkinImage/master/examples/img/'
const BASE_SKIN = ASSET_ROOT + 'stevea.png'
const CAPES = [
  { id: 'cape_office.png', label: '眼眸花披风' },
  { id: 'cape_MCC.png', label: 'MCC 披风' },
  { id: 'cape_creeper.png', label: '苦力怕披风' },
  { id: 'cape_tiktok.png', label: 'TikTok 披风' },
  { id: 'cape_twitch.png', label: 'Twitch 披风' },
]
const PRESETS: Preset[] = [
  { id: 'office-shawl', label: '眼眸花披肩', file: 'office_shawl_default_64.png', slimFile: 'office_shawl_slim_64.png', kind: 'shawl' },
  { id: 'mcc-shawl', label: 'MCC 披肩', file: 'MCC_shawl_default_64.png', slimFile: 'MCC_shawl_slim_64.png', kind: 'shawl' },
  { id: 'creeper-shawl', label: '苦力怕披肩', file: 'creeper_shawl_default_64.png', slimFile: 'creeper_shawl_slim_64.png', kind: 'shawl' },
  { id: 'tiktok-shawl', label: 'TikTok 披肩', file: 'tiktok_shawl_default_64.png', slimFile: 'tiktok_shawl_slim_64.png', kind: 'shawl' },
  { id: 'twitch-shawl', label: 'Twitch 披肩', file: 'twitch_shawl_default_64.png', slimFile: 'twitch_shawl_slim_64.png', kind: 'shawl' },
  { id: 'creeper-coat', label: '苦力怕外套', file: 'creeper_coat_default_64.png', slimFile: 'creeper_coat_slim_64.png', kind: 'coat' },
  { id: 'tiktok-coat', label: 'TikTok 外套', file: 'tiktok_coat_default_64.png', slimFile: 'tiktok_coat_slim_64.png', kind: 'coat' },
  { id: 'twitch-coat', label: 'Twitch 外套', file: 'twitch_coat_default_64.png', slimFile: 'twitch_coat_slim_64.png', kind: 'coat' },
]

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    if (/^https?:/.test(src)) image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败：' + src))
    image.src = src
  })
}

function canvasPixels(canvas: HTMLCanvasElement): string[] {
  const context = canvas.getContext('2d')
  if (!context) return Array(4096).fill('')
  const data = context.getImageData(0, 0, 64, 64).data
  return Array.from({ length: 4096 }, (_, index) => {
    const offset = index * 4
    if (data[offset + 3] < 24) return ''
    return '#' + [data[offset], data[offset + 1], data[offset + 2]].map(value => value.toString(16).padStart(2, '0')).join('')
  })
}

type Props = { onOpenEditor: () => void }

export default function PresetStudio({ onOpenEditor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const skinInputRef = useRef<HTMLInputElement>(null)
  const [skinUrl, setSkinUrl] = useState(BASE_SKIN)
  const [skinName, setSkinName] = useState('Steve 默认皮肤')
  const [shawlId, setShawlId] = useState('office-shawl')
  const [coatId, setCoatId] = useState('none')
  const [capeId, setCapeId] = useState('cape_office.png')
  const [modelType, setModelType] = useState<'steve' | 'alex'>('steve')
  const [rotation, setRotation] = useState(-13)
  const [pixels, setPixels] = useState<string[]>(Array(4096).fill(''))
  const [status, setStatus] = useState('正在加载模板…')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  const shawls = useMemo(() => PRESETS.filter(item => item.kind === 'shawl'), [])
  const coats = useMemo(() => PRESETS.filter(item => item.kind === 'coat'), [])
  const layers = useMemo(() => [{ pixels, visible: true, opacity: 100 }], [pixels])

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context) return
      setReady(false)
      setError('')
      try {
        const base = await loadImage(skinUrl)
        const selected = [PRESETS.find(item => item.id === coatId), PRESETS.find(item => item.id === shawlId)].filter((item): item is Preset => Boolean(item))
        const overlays = await Promise.all(selected.map(item => loadImage(ASSET_ROOT + (modelType === 'alex' ? item.slimFile : item.file))))
        if (cancelled) return
        context.clearRect(0, 0, 64, 64)
        context.imageSmoothingEnabled = false
        context.drawImage(base, 0, 0, 64, 64)
        overlays.forEach(image => context.drawImage(image, 0, 0, 64, 64))
        setPixels(canvasPixels(canvas))
        setReady(true)
        setStatus('模板已应用，可旋转预览或导出 PNG')
      } catch {
        if (!cancelled) {
          setError('模板图片加载失败。请检查网络连接，或重新导入一张皮肤 PNG。')
          setStatus('加载失败')
        }
      }
    }
    void render()
    return () => { cancelled = true }
  }, [skinUrl, shawlId, coatId, modelType])

  const exportCape = async () => {
    try {
      const image = await loadImage(ASSET_ROOT + capeId)
      const output = document.createElement('canvas')
      output.width = image.naturalWidth || 64
      output.height = image.naturalHeight || 32
      const context = output.getContext('2d')
      if (!context) throw new Error('canvas unavailable')
      context.drawImage(image, 0, 0)
      const link = document.createElement('a')
      link.download = capeId
      link.href = output.toDataURL('image/png')
      link.click()
      setStatus('已单独导出披风纹理 PNG')
    } catch { setError('披风纹理加载失败，暂时无法导出。请检查网络连接。') }
  }

  const exportPng = () => {
    const canvas = canvasRef.current
    if (!canvas || !ready) return
    const link = document.createElement('a')
    link.download = 'pixcape-preset-skin.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
    setStatus('已导出合成皮肤 PNG')
  }

  const importSkin = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('请选择 PNG 或其他图片文件。')
      return
    }
    const url = URL.createObjectURL(file)
    setSkinUrl(previous => {
      if (previous.startsWith('blob:')) URL.revokeObjectURL(previous)
      return url
    })
    setSkinName(file.name)
    setStatus('已导入皮肤，正在应用模板…')
  }

  const reset = () => {
    setSkinUrl(BASE_SKIN)
    setSkinName('Steve 默认皮肤')
    setShawlId('office-shawl')
    setCoatId('none')
    setCapeId('cape_office.png')
    setModelType('steve')
    setRotation(-13)
    setStatus('已恢复默认模板')
  }

  return <div className="preset-shell">
    <header className="preset-topbar">
      <a className="preset-brand" href="#" onClick={event => event.preventDefault()}><span>✦</span> Pixcape <small>PRESET STUDIO</small></a>
      <div className="preset-top-actions">
        <button className="preset-secondary" onClick={onOpenEditor}><Layers size={16}/> 像素编辑器 <ArrowRight size={15}/></button>
        <button className="preset-primary" onClick={exportPng} disabled={!ready}><Download size={16}/> 导出皮肤 PNG</button>
      </div>
    </header>
    <main className="preset-layout">
      <aside className="preset-library">
        <div className="preset-heading"><div><small>LIBRARY</small><h1>预制服装</h1></div><Shirt size={22}/></div>
        <p className="preset-description">选择披肩和外套，实时合成到皮肤纹理。披风作为独立纹理单独选择与导出，不会覆盖披肩或外套。</p>
        <section className="preset-section">
          <div className="preset-section-title">披肩 <span>SHAWL</span></div>
          <div className="preset-options">
            <button className={'preset-option ' + (shawlId === 'none' ? 'chosen' : '')} onClick={() => setShawlId('none')}><span className="preset-swatch no-swatch"><X size={18}/></span><span>不使用披肩</span></button>
            {shawls.map(item => <button key={item.id} className={'preset-option ' + (shawlId === item.id ? 'chosen' : '')} onClick={() => setShawlId(item.id)}><span className="preset-swatch" style={{ backgroundImage: 'url(' + ASSET_ROOT + item.file + ')' }}/><span>{item.label}</span></button>)}
          </div>
        </section>
        <section className="preset-section">
          <div className="preset-section-title">外套 <span>COAT</span></div>
          <div className="preset-options">
            <button className={'preset-option ' + (coatId === 'none' ? 'chosen' : '')} onClick={() => setCoatId('none')}><span className="preset-swatch no-swatch"><X size={18}/></span><span>不使用外套</span></button>
            {coats.map(item => <button key={item.id} className={'preset-option ' + (coatId === item.id ? 'chosen' : '')} onClick={() => setCoatId(item.id)}><span className="preset-swatch" style={{ backgroundImage: 'url(' + ASSET_ROOT + item.file + ')' }}/><span>{item.label}</span></button>)}
          </div>
        </section>
        <section className="preset-section">
          <div className="preset-section-title">披风 <span>CAPE · 独立纹理</span></div>
          <div className="preset-options">
            {CAPES.map(item => <button key={item.id} className={'preset-option ' + (capeId === item.id ? 'chosen' : '')} onClick={() => setCapeId(item.id)}><span className="preset-swatch" style={{ backgroundImage: 'url(' + ASSET_ROOT + item.id + ')' }}/><span>{item.label}</span></button>)}
          </div>
          <button className="preset-import" onClick={exportCape}><Download size={15}/> 单独导出披风 PNG</button>
        </section>
        <div className="preset-attribution">服装纹理参考与素材来源：<a href="https://github.com/lonelyang/CapeSkinImage" target="_blank" rel="noreferrer">CapeSkinImage</a>。素材作者信息见原项目说明。</div>
      </aside>
      <section className="preset-preview-column">
        <div className="preset-preview-heading"><div><small>LIVE PREVIEW</small><h2>角色预览</h2></div><div className="preset-model-switch"><button className={modelType === 'steve' ? 'active' : ''} onClick={() => setModelType('steve')}>Steve 粗臂</button><button className={modelType === 'alex' ? 'active' : ''} onClick={() => setModelType('alex')}>Alex 细臂</button></div></div>
        <div className="preset-model-stage"><ThreeCapePreview layers={layers} side="front" rotation={rotation} modelType={modelType} onRotationChange={setRotation}/><div className="preset-model-caption">拖动角色旋转 · 64 × 64 皮肤纹理</div></div>
        {error && <div className="preset-error">{error}</div>}
        <div className="preset-preview-footer"><span className={ready ? 'preset-status-ready' : ''}><i/> {status}</span><button onClick={reset}><RotateCcw size={14}/> 重置</button></div>
      </section>
      <aside className="preset-properties">
        <div className="preset-heading"><div><small>YOUR SKIN</small><h2>当前皮肤</h2></div><UserRound size={21}/></div>
        <div className="preset-skin-card"><div className="preset-skin-thumb"><canvas ref={canvasRef} width={64} height={64}/></div><div className="preset-skin-meta"><strong>{skinName}</strong><small>64 × 64 · PNG</small></div></div>
        <button className="preset-import" onClick={() => skinInputRef.current?.click()}><Upload size={16}/> 导入自己的皮肤</button>
        <input ref={skinInputRef} hidden type="file" accept="image/png,image/*" onChange={event => { importSkin(event.target.files?.[0]); event.currentTarget.value = '' }}/>
        <div className="preset-tip"><strong>使用提示</strong><p>导入标准 Minecraft 64 × 64 皮肤后，选择披肩或外套。导出结果是合成后的皮肤 PNG，可继续用于 Minecraft 皮肤工具。</p></div>
        <div className="preset-next"><span>下一阶段</span><strong>完整皮肤编辑器</strong><p>后续增加逐像素绘制、图层管理和更完整的纹理编辑。</p></div>
      </aside>
    </main>
    <footer className="preset-footer"><span>Pixcape · 预制服装工作台</span><span>披肩 / 外套模板 · 实时 3D 预览</span></footer>
  </div>
}
