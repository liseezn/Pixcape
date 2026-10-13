import { useEffect, useMemo, useRef, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Download, Shirt, Upload, RotateCcw, X, ExternalLink } from 'lucide-react'
import ThreeCapePreview from './ThreeCapePreview'
import PresetThumbnail from './PresetThumbnail'
import './preset-studio.css'
import './minecraft-inventory.css'
import './preview-options.css'

type GarmentKind = 'shawl' | 'coat'
type Preset = { id: string; label: string; file: string; slimFile: string; kind: GarmentKind }

const ASSET_ROOT = 'https://raw.githubusercontent.com/lonelyang/CapeSkinImage/master/examples/img/'
const BASE_SKIN = ASSET_ROOT + 'stevea.png'
const CAPES = [
  { id: 'none', label: '不使用披风' },
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

export type PresetEditorPayload = {
  skinDataUrl: string
  skinName: string
  modelType: 'steve' | 'alex'
  shawlName: string
  coatName: string
  capeName?: string
  capeDataUrl?: string
}

type Props = { onOpenEditor: (payload: PresetEditorPayload) => void }

export default function PresetStudio({ onOpenEditor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const skinInputRef = useRef<HTMLInputElement>(null)
  const [skinUrl, setSkinUrl] = useState(BASE_SKIN)
  const [skinName, setSkinName] = useState('Steve 默认皮肤')
  const [shawlId, setShawlId] = useState('office-shawl')
  const [coatId, setCoatId] = useState('none')
  const [capeId, setCapeId] = useState('cape_office.png')
  const [activeCategory, setActiveCategory] = useState<'shawl' | 'coat' | 'cape'>('shawl')
  const [elytraVisible, setElytraVisible] = useState(false)
  const [modelType, setModelType] = useState<'steve' | 'alex'>('steve')
  const [viewSide, setViewSide] = useState<'front' | 'back'>('front')
  const [rotation, setRotation] = useState(-13)
  const [backgroundTheme, setBackgroundTheme] = useState<'day' | 'night' | 'plains' | 'desert' | 'forest' | 'nether' | 'end' | 'custom'>('day')
  const [customBackground, setCustomBackground] = useState('#76b9ee')
  const [tilt, setTilt] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pose, setPose] = useState<'idle' | 'wave' | 'walk' | 'fly'>('idle')
  const [pixels, setPixels] = useState<string[]>(Array(4096).fill(''))
  const [status, setStatus] = useState('正在加载模板…')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  const shawls = useMemo(() => PRESETS.filter(item => item.kind === 'shawl'), [])
  const coats = useMemo(() => PRESETS.filter(item => item.kind === 'coat'), [])
  const layers = useMemo(() => [{ pixels, visible: true, opacity: 100 }], [pixels])

  useEffect(() => () => {
    if (skinUrl.startsWith('blob:')) URL.revokeObjectURL(skinUrl)
  }, [skinUrl])

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context) return
      setReady(false)
      setError('')
      let baseImage: HTMLImageElement | null = null
      try {
        baseImage = await loadImage(skinUrl)
        const selected = [PRESETS.find(item => item.id === coatId), PRESETS.find(item => item.id === shawlId)].filter((item): item is Preset => Boolean(item))
        const overlays = await Promise.all(selected.map(item => loadImage(ASSET_ROOT + (modelType === 'alex' ? item.slimFile : item.file))))
        if (cancelled) return
        context.clearRect(0, 0, 64, 64)
        context.imageSmoothingEnabled = false
        context.drawImage(baseImage, 0, 0, 64, 64)
        overlays.forEach(image => context.drawImage(image, 0, 0, 64, 64))
        setPixels(canvasPixels(canvas))
        setReady(true)
        setStatus('模板已应用，可旋转预览或导出 PNG')
      } catch {
        if (!cancelled) {
          // Keep the editor usable if the third-party asset host is blocked or offline.
          context.clearRect(0, 0, 64, 64)
          context.imageSmoothingEnabled = false
          if (baseImage) {
            context.drawImage(baseImage, 0, 0, 64, 64)
          } else {
            const pixel = (x: number, y: number, w: number, h: number, color: string) => {
              context.fillStyle = color
              context.fillRect(x, y, w, h)
            }
            context.fillStyle = '#b98a62'; context.fillRect(0, 0, 64, 64)
            pixel(8, 0, 8, 8, '#513322'); pixel(16, 0, 8, 8, '#513322')
            pixel(8, 8, 8, 8, '#d9a477'); pixel(16, 8, 8, 8, '#d9a477')
            pixel(10, 10, 2, 2, '#3b3026'); pixel(18, 10, 2, 2, '#3b3026')
            pixel(12, 14, 8, 2, '#8d453a')
            pixel(20, 20, 8, 12, '#3768a5'); pixel(28, 20, 8, 12, '#3768a5')
            pixel(44, 20, 4, 12, '#d9a477'); pixel(48, 20, 4, 12, '#d9a477')
            pixel(4, 20, 4, 12, '#d9a477'); pixel(8, 20, 4, 12, '#d9a477')
            pixel(20, 36, 8, 12, '#3768a5'); pixel(28, 36, 8, 12, '#3768a5')
            pixel(4, 36, 4, 12, '#303f73'); pixel(8, 36, 4, 12, '#303f73')
            pixel(12, 36, 4, 12, '#303f73'); pixel(16, 36, 4, 12, '#303f73')
          }
          setPixels(canvasPixels(canvas))
          setReady(true)
          setError('部分远程模板素材加载失败，已显示备用皮肤；可继续编辑或重新导入 PNG。')
          setStatus('备用皮肤已就绪')
        }
      }
    }
    void render()
    return () => { cancelled = true }
  }, [skinUrl, shawlId, coatId, modelType])

  const openEditorWithPreset = async () => {
    const canvas = canvasRef.current
    if (!canvas || !ready) {
      setError('皮肤仍在加载，请稍后再打开编辑器。')
      return
    }
    try {
      let capeDataUrl: string | undefined
      if (capeId !== 'none') {
        const capeImage = await loadImage(ASSET_ROOT + capeId)
        const capeCanvas = document.createElement('canvas')
        capeCanvas.width = capeImage.naturalWidth || 64
        capeCanvas.height = capeImage.naturalHeight || 32
        const capeContext = capeCanvas.getContext('2d')
        if (!capeContext) throw new Error('cape canvas unavailable')
        capeContext.drawImage(capeImage, 0, 0)
        capeDataUrl = capeCanvas.toDataURL('image/png')
      }
      onOpenEditor({
        skinDataUrl: canvas.toDataURL('image/png'),
        skinName: 'pixcape-preset-skin.png',
        modelType,
        shawlName: PRESETS.find(item => item.id === shawlId)?.label || '不使用披肩',
        coatName: PRESETS.find(item => item.id === coatId)?.label || '不使用外套',
        capeName: capeId === 'none' ? undefined : (CAPES.find(item => item.id === capeId)?.label || capeId) + '.png',
        capeDataUrl,
      })
      setStatus('已将当前预制皮肤发送到 Blockbench')
    } catch {
      setError('无法打包当前预制，请检查皮肤与披风图片是否加载成功。')
    }
  }

  const exportCape = async () => {
    if (capeId === 'none') return
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
    if (file.type !== 'image/png') {
      setError('请导入 PNG 格式的 Minecraft 皮肤。')
      return
    }
    const url = URL.createObjectURL(file)
    const probe = new Image()
    probe.onload = () => {
      if (probe.naturalWidth !== 64 || probe.naturalHeight !== 64) {
        URL.revokeObjectURL(url)
        setError('皮肤尺寸必须是标准的 64 × 64 PNG，未修改当前皮肤。')
        return
      }
      setSkinUrl(previous => {
        if (previous.startsWith('blob:')) URL.revokeObjectURL(previous)
        return url
      })
      setSkinName(file.name)
      setError('')
      setStatus('已导入皮肤，正在应用模板…')
    }
    probe.onerror = () => {
      URL.revokeObjectURL(url)
      setError('无法读取这张 PNG 图片，请选择有效的皮肤文件。')
    }
    probe.src = url
  }

  const reset = () => {
    setSkinUrl(BASE_SKIN)
    setSkinName('Steve 默认皮肤')
    setShawlId('office-shawl')
    setCoatId('none')
    setCapeId('cape_office.png')
    setElytraVisible(false)
    setModelType('steve')
    setViewSide('front')
    setRotation(-13)
    setTilt(0)
    setZoom(1)
    setBackgroundTheme('day')
    setCustomBackground('#76b9ee')
    setPose('idle')
    setError('')
    setStatus('已恢复默认模板')
  }

  return <div className="preset-shell">
    <header className="preset-topbar">
      <a className="preset-brand" href="#" onClick={event => event.preventDefault()}><span>✦</span> Pixcape <small>PRESET STUDIO</small></a>
      <div className="preset-top-actions"><span className="preset-workspace-label">Minecraft 皮肤与服装工作台</span></div>
    </header>
        <section className="preset-current-skin">
      <div className="preset-current-skin-title"><div><small>YOUR SKIN</small><h2>当前皮肤</h2></div><span className={ready ? 'preset-current-ready' : ''}><i/> {ready ? '已就绪' : '正在加载'}</span></div>
      <div className="preset-skin-card"><div className="preset-skin-thumb"><canvas ref={canvasRef} width={64} height={64}/></div><div className="preset-skin-meta"><strong>{skinName}</strong><small>64 × 64 · PNG · 已应用所选披肩 / 外套</small></div></div>
      <div className="preset-current-actions">
        <button className="preset-import" onClick={() => skinInputRef.current?.click()}><Upload size={16}/> 导入皮肤</button>
        <Tooltip.Root><Tooltip.Trigger asChild><button className="preset-export-skin" onClick={exportPng} disabled={!ready}><Download size={16}/> 导出合成皮肤 PNG</button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="preset-tooltip" side="bottom" sideOffset={6}>将当前皮肤与所选披肩、外套合成为 64 × 64 PNG。<Tooltip.Arrow className="preset-tooltip-arrow"/></Tooltip.Content></Tooltip.Portal></Tooltip.Root>
        <button className="preset-open-blockbench" onClick={openEditorWithPreset} disabled={!ready}><ExternalLink size={15}/> 发送到 Blockbench 编辑</button>
      </div>
      <input ref={skinInputRef} hidden type="file" accept="image/png" onChange={event => { importSkin(event.target.files?.[0]); event.currentTarget.value = '' }}/>
      {error && <div className="preset-error">{error}</div>}
    </section>
    <main className="preset-layout">
      <aside className="preset-library">
        <div className="preset-heading"><div><small>LIBRARY</small><h1>预制服装</h1></div><Shirt size={22}/></div>
        <p className="preset-description">披肩、外套、披风分栏展示。披肩与外套可合成到皮肤；披风作为独立纹理选择与导出。完整模型、纹理和动画编辑请打开 Blockbench。</p>
        <Tabs.Root className="preset-tabs-root" value={activeCategory} onValueChange={value => setActiveCategory(value as 'shawl' | 'coat' | 'cape')}>
          <Tabs.List className="preset-category-tabs" aria-label="预制服装分类">
            <Tabs.Trigger value="shawl" className="preset-category-tab">披肩 <small>SHAWL</small></Tabs.Trigger>
            <Tabs.Trigger value="coat" className="preset-category-tab">外套 <small>COAT</small></Tabs.Trigger>
            <Tabs.Trigger value="cape" className="preset-category-tab">披风 <small>CAPE</small></Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="shawl" className="preset-tab-panel">
            <section className="preset-section">
              <div className="preset-section-title">选择披肩 <span>{shawls.length} 款</span></div>
              <div className="preset-options">
                <button className={'preset-option ' + (shawlId === 'none' ? 'chosen' : '')} onClick={() => setShawlId('none')}><span className="preset-swatch no-swatch"><X size={18}/></span><span>不使用披肩</span></button>
                {shawls.map(item => <button key={item.id} className={'preset-option ' + (shawlId === item.id ? 'chosen' : '')} onClick={() => setShawlId(item.id)}><PresetThumbnail kind="skin" imageUrl={ASSET_ROOT + item.file} slimImageUrl={ASSET_ROOT + item.slimFile} modelType={modelType}/><span>{item.label}</span></button>)}
              </div>
            </section>
          </Tabs.Content>
          <Tabs.Content value="coat" className="preset-tab-panel">
            <section className="preset-section">
              <div className="preset-section-title">选择外套 <span>{coats.length} 款</span></div>
              <div className="preset-options">
                <button className={'preset-option ' + (coatId === 'none' ? 'chosen' : '')} onClick={() => setCoatId('none')}><span className="preset-swatch no-swatch"><X size={18}/></span><span>不使用外套</span></button>
                {coats.map(item => <button key={item.id} className={'preset-option ' + (coatId === item.id ? 'chosen' : '')} onClick={() => setCoatId(item.id)}><PresetThumbnail kind="skin" imageUrl={ASSET_ROOT + item.file} slimImageUrl={ASSET_ROOT + item.slimFile} modelType={modelType}/><span>{item.label}</span></button>)}
              </div>
            </section>
          </Tabs.Content>
          <Tabs.Content value="cape" className="preset-tab-panel">
            <section className="preset-section">
              <div className="preset-section-title">选择披风 <span>独立纹理</span></div>
              <div className="preset-options">
                {CAPES.map(item => <button key={item.id} className={'preset-option ' + (capeId === item.id ? 'chosen' : '')} onClick={() => setCapeId(item.id)}>{item.id === 'none' ? <span className="preset-swatch no-swatch"><X size={18}/></span> : <PresetThumbnail kind="cape" imageUrl={ASSET_ROOT + item.id} showAuthor={false}/>}<span>{item.label}</span></button>)}
              </div>
              <button className="preset-import" onClick={exportCape} disabled={capeId === 'none'}><Download size={15}/> 单独导出披风 PNG</button>
            </section>
          </Tabs.Content>
        </Tabs.Root>
        <div className="preset-attribution">模板素材来源：<a href="https://github.com/lonelyang/CapeSkinImage" target="_blank" rel="noreferrer">CapeSkinImage</a>。披肩和外套使用角色 3D 渲染图；作者仅标注在披肩、外套预览图下方；披风不显示作者。</div>
      </aside>
      <section className="preset-preview-column">
        <div className="preset-preview-heading"><div><small>LIVE PREVIEW</small><h2>角色预览</h2></div><div className="preset-preview-controls"><div className="preset-model-switch"><button className={modelType === 'steve' ? 'active' : ''} onClick={() => setModelType('steve')}>Steve 粗臂</button><button className={modelType === 'alex' ? 'active' : ''} onClick={() => setModelType('alex')}>Alex 细臂</button></div><div className="preset-model-switch"><button className={viewSide === 'front' ? 'active' : ''} onClick={() => setViewSide('front')}>正面</button><button className={viewSide === 'back' ? 'active' : ''} onClick={() => setViewSide('back')}>背面</button></div><div className="preset-model-switch"><button className={elytraVisible ? 'active' : ''} onClick={() => setElytraVisible(value => !value)}>{elytraVisible ? '切换为披风' : '切换为鞘翅'}</button></div><div className="preset-model-switch preset-scene-switch preset-biome-switch" aria-label="Minecraft 背景区域"><button className={backgroundTheme === 'day' ? 'active' : ''} onClick={() => setBackgroundTheme('day')}>白天</button><button className={backgroundTheme === 'night' ? 'active' : ''} onClick={() => setBackgroundTheme('night')}>夜晚</button><button className={backgroundTheme === 'plains' ? 'active' : ''} onClick={() => setBackgroundTheme('plains')}>平原</button><button className={backgroundTheme === 'desert' ? 'active' : ''} onClick={() => setBackgroundTheme('desert')}>沙漠</button><button className={backgroundTheme === 'forest' ? 'active' : ''} onClick={() => setBackgroundTheme('forest')}>森林</button><button className={backgroundTheme === 'nether' ? 'active' : ''} onClick={() => setBackgroundTheme('nether')}>下界</button><button className={backgroundTheme === 'end' ? 'active' : ''} onClick={() => setBackgroundTheme('end')}>末地</button><button className={backgroundTheme === 'custom' ? 'active' : ''} onClick={() => setBackgroundTheme('custom')}>自定义</button></div>
          {backgroundTheme === 'custom' && <label className="preset-color-picker"><span>背景调色</span><input type="color" value={customBackground} onChange={event => setCustomBackground(event.target.value)}/><code>{customBackground.toUpperCase()}</code><button type="button" onClick={() => setCustomBackground('#76b9ee')}>恢复天空蓝</button></label>}<div className="preset-model-switch preset-scene-switch" aria-label="角色动作"><button className={pose === 'idle' ? 'active' : ''} onClick={() => setPose('idle')}>站立</button><button className={pose === 'wave' ? 'active' : ''} onClick={() => setPose('wave')}>挥手</button><button className={pose === 'walk' ? 'active' : ''} onClick={() => setPose('walk')}>行走</button><button className={pose === 'fly' ? 'active' : ''} onClick={() => setPose('fly')}>飞行</button></div></div></div>
        <div className={'preset-model-stage scene-' + backgroundTheme} style={backgroundTheme === 'custom' ? { background: 'linear-gradient(180deg, ' + customBackground + ' 0%, ' + customBackground + ' 55%, #263747 100%)' } : undefined}><ThreeCapePreview layers={layers} side={viewSide} rotation={rotation} tilt={tilt} zoom={zoom} modelType={modelType} onRotationChange={setRotation} onTiltChange={setTilt} onZoomChange={setZoom} capeTextureUrl={capeId === 'none' ? undefined : ASSET_ROOT + capeId} capeVisible={capeId !== 'none'} elytraVisible={elytraVisible} pose={pose}/><div className="preset-model-caption">拖动旋转 · 上下拖动俯仰 · 滚轮缩放 · 正面 / 背面</div></div>
        <div className="preset-view-adjust"><label>缩放 <input aria-label="预览缩放" type="range" min="0.65" max="1.8" step="0.05" value={zoom} onChange={event => setZoom(Number(event.target.value))}/><span>{Math.round(zoom * 100)}%</span></label><button type="button" onClick={() => { setRotation(-13); setTilt(0); setZoom(1) }}>重置视角</button></div>
        {error && <div className="preset-error">{error}</div>}
        <div className="preset-preview-footer"><span className={ready ? 'preset-status-ready' : ''}><i/> {status}</span><button onClick={reset}><RotateCcw size={14}/> 重置</button></div>
      </section>

    </main>
    <footer className="preset-footer"><span>Pixcape · 预制服装工作台</span><span>披肩 / 外套模板 · 实时 3D 预览</span></footer>
  </div>
}
