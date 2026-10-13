import { useEffect, useRef } from 'react'
import { SkinViewer } from 'skinview3d'

type LayerData = { pixels: string[]; visible: boolean; opacity: number }
type ModelType = 'steve' | 'alex'
type Props = {
  layers: LayerData[]
  side: 'front' | 'back'
  rotation: number
  modelType: ModelType
  onRotationChange: (value: number) => void
  capeTextureUrl?: string
  capeVisible?: boolean
  elytraVisible?: boolean
}

function makeSkinCanvas(layers: LayerData[]) {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (!context) return canvas

  context.clearRect(0, 0, 64, 64)
  for (const layer of layers) {
    if (!layer.visible) continue
    context.globalAlpha = layer.opacity / 100
    layer.pixels.forEach((color, index) => {
      if (color) {
        context.fillStyle = color
        context.fillRect(index % 64, Math.floor(index / 64), 1, 1)
      }
    })
  }
  context.globalAlpha = 1
  return canvas
}

function makeFallbackCape(skin: HTMLCanvasElement) {
  // CapeSkinImage uses the official skinview3d cape model/UV layout.
  // Keep the fallback texture in the standard 64x32 cape atlas format.
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 32
  const context = canvas.getContext('2d')
  if (context) {
    context.imageSmoothingEnabled = false
    context.clearRect(0, 0, 64, 32)
    context.drawImage(skin, 1, 33, 10, 16, 1, 1, 10, 16)
  }
  return canvas
}

export default function ThreeCapePreview({
  layers,
  side,
  rotation,
  modelType,
  onRotationChange,
  capeTextureUrl,
  capeVisible = true,
  elytraVisible = false,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<SkinViewer | null>(null)
  const rotationRef = useRef(rotation)
  const sideRef = useRef(side)
  const onRotationChangeRef = useRef(onRotationChange)
  const capeVisibleRef = useRef(capeVisible)
  const elytraVisibleRef = useRef(elytraVisible)
  const capeLoadIdRef = useRef(0)

  useEffect(() => { rotationRef.current = rotation }, [rotation])
  useEffect(() => { sideRef.current = side }, [side])
  useEffect(() => { onRotationChangeRef.current = onRotationChange }, [onRotationChange])
  useEffect(() => { capeVisibleRef.current = capeVisible }, [capeVisible])
  useEffect(() => { elytraVisibleRef.current = elytraVisible }, [elytraVisible])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let viewer: SkinViewer
    try {
      const canvas = document.createElement('canvas')
      host.prepend(canvas)
      viewer = new SkinViewer({
        canvas,
        width: Math.max(1, host.clientWidth),
        height: Math.max(1, host.clientHeight),
        enableControls: false,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      })
    } catch {
      host.dataset.webglUnavailable = 'true'
      return
    }

    viewer.controls.enabled = false
    viewerRef.current = viewer

    const resize = () => {
      viewer.width = Math.max(1, host.clientWidth)
      viewer.height = Math.max(1, host.clientHeight)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const applyRotation = () => {
      viewer.playerObject.rotation.y =
        (rotationRef.current + (sideRef.current === 'back' ? 180 : 0)) * Math.PI / 180
    }
    applyRotation()

    let drag: { x: number; rotation: number } | null = null
    const canvas = viewer.canvas
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return
      drag = { x: event.clientX, rotation: rotationRef.current }
      canvas.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (!drag) return
      const next = drag.rotation + (event.clientX - drag.x) * 0.8
      rotationRef.current = next
      viewer.playerObject.rotation.y =
        (next + (sideRef.current === 'back' ? 180 : 0)) * Math.PI / 180
      onRotationChangeRef.current(next)
    }
    const up = () => { drag = null }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)

    return () => {
      observer.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      viewer.dispose()
      canvas.remove()
      viewerRef.current = null
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const skin = makeSkinCanvas(layers)
    viewer.loadSkin(skin, { model: modelType === 'alex' ? 'slim' : 'default' })
  }, [layers, modelType])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const loadId = ++capeLoadIdRef.current
    viewer.resetCape()

    const source = capeTextureUrl || makeFallbackCape(makeSkinCanvas(layers))
    const result = viewer.loadCape(source, { makeVisible: false })
    void Promise.resolve(result).then(() => {
      if (loadId !== capeLoadIdRef.current) return
      // Cape and elytra are mutually exclusive in skinview3d. Switching to
      // elytra changes the back equipment instead of drawing a second mesh.
      viewer.playerObject.backEquipment = elytraVisibleRef.current
        ? 'elytra'
        : capeVisibleRef.current
          ? 'cape'
          : null
    }).catch(() => {
      if (loadId === capeLoadIdRef.current) viewer.playerObject.backEquipment = null
    })
    return () => { capeLoadIdRef.current += 1 }
  }, [capeTextureUrl, layers])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.playerObject.backEquipment = elytraVisible
      ? 'elytra'
      : capeVisible
        ? 'cape'
        : null
  }, [capeVisible, elytraVisible])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.playerObject.rotation.y =
      (rotation + (side === 'back' ? 180 : 0)) * Math.PI / 180
  }, [rotation, side])

  return (
    <div
      ref={hostRef}
      className="three-preview-canvas"
      role="img"
      aria-label={modelType === 'steve' ? 'Steve 模型 3D 皮肤、披风与鞘翅预览' : 'Alex 模型 3D 皮肤、披风与鞘翅预览'}
    >
      <div className="webgl-fallback">当前设备无法启用 WebGL，请尝试更新浏览器或开启硬件加速。</div>
    </div>
  )
}
