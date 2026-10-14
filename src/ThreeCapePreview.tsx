import { useEffect, useRef } from 'react'
import { FlyingAnimation, SkinViewer } from 'skinview3d'

type LayerData = { pixels: string[]; visible: boolean; opacity: number }
type ModelType = 'steve' | 'alex'
type Pose = 'idle' | 'wave' | 'walk' | 'fly'
type Props = {
  layers: LayerData[]
  side: 'front' | 'back'
  rotation: number
  tilt: number
  zoom: number
  modelType: ModelType
  onRotationChange: (value: number) => void
  onTiltChange: (value: number) => void
  onZoomChange: (value: number) => void
  capeTextureUrl?: string
  capeVisible?: boolean
  elytraVisible?: boolean
  pose?: Pose
  backgroundImageUrl?: string
  backgroundColor?: string
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
  tilt,
  zoom,
  modelType,
  onRotationChange,
  onTiltChange,
  onZoomChange,
  capeTextureUrl,
  capeVisible = true,
  elytraVisible = false,
  pose = 'idle',
  backgroundImageUrl,
  backgroundColor = '#76b9ee',
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<SkinViewer | null>(null)
  const rotationRef = useRef(rotation)
  const sideRef = useRef(side)
  const tiltRef = useRef(tilt)
  const zoomRef = useRef(zoom)
  const onRotationChangeRef = useRef(onRotationChange)
  const onTiltChangeRef = useRef(onTiltChange)
  const onZoomChangeRef = useRef(onZoomChange)
  const capeVisibleRef = useRef(capeVisible)
  const elytraVisibleRef = useRef(elytraVisible)
  const capeLoadIdRef = useRef(0)

  useEffect(() => { rotationRef.current = rotation }, [rotation])
  useEffect(() => { sideRef.current = side }, [side])
  useEffect(() => { tiltRef.current = tilt }, [tilt])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { onRotationChangeRef.current = onRotationChange }, [onRotationChange])
  useEffect(() => { onTiltChangeRef.current = onTiltChange }, [onTiltChange])
  useEffect(() => { onZoomChangeRef.current = onZoomChange }, [onZoomChange])
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
      viewer.playerObject.rotation.y = (rotationRef.current + (sideRef.current === 'back' ? 180 : 0)) * Math.PI / 180
      viewer.playerObject.rotation.x = tiltRef.current * Math.PI / 180
      viewer.camera.zoom = zoomRef.current
      viewer.camera.updateProjectionMatrix()
    }
    applyRotation()

    let drag: { x: number; y: number; rotation: number; tilt: number } | null = null
    const canvas = viewer.canvas
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return
      drag = { x: event.clientX, y: event.clientY, rotation: rotationRef.current, tilt: tiltRef.current }
      canvas.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (!drag) return
      const next = drag.rotation + (event.clientX - drag.x) * 0.8
      const nextTilt = Math.max(-35, Math.min(35, drag.tilt + (event.clientY - drag.y) * 0.45))
      rotationRef.current = next
      tiltRef.current = nextTilt
      viewer.playerObject.rotation.y = (next + (sideRef.current === 'back' ? 180 : 0)) * Math.PI / 180
      viewer.playerObject.rotation.x = nextTilt * Math.PI / 180
      onRotationChangeRef.current(next)
      onTiltChangeRef.current(nextTilt)
    }
    const up = () => { drag = null }
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const next = Math.max(0.65, Math.min(1.8, zoomRef.current - event.deltaY * 0.0015))
      zoomRef.current = next
      viewer.camera.zoom = next
      viewer.camera.updateProjectionMatrix()
      onZoomChangeRef.current(next)
    }
    canvas.addEventListener('wheel', wheel, { passive: false })
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)

    return () => {
      observer.disconnect()
      canvas.removeEventListener('wheel', wheel)
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
    viewer.playerObject.rotation.y = (rotation + (side === 'back' ? 180 : 0)) * Math.PI / 180
    viewer.playerObject.rotation.x = tilt * Math.PI / 180
  }, [rotation, side, tilt])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.camera.zoom = zoom
    viewer.camera.updateProjectionMatrix()
  }, [zoom])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const fallbackColor = Number.parseInt(backgroundColor.replace('#', ''), 16)
    if (!backgroundImageUrl) {
      viewer.background = fallbackColor
      return
    }
    void viewer.loadBackground(backgroundImageUrl).catch(() => {
      // Keep the viewer usable if the official screenshot host is unavailable.
      viewer.background = fallbackColor
      if (hostRef.current) hostRef.current.dataset.backgroundFallback = 'true'
    })
  }, [backgroundImageUrl, backgroundColor])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    // skinview3d's built-in FlyingAnimation implements the same whole-player
    // pitch and elytra-wing spread used by its own demo; hand-rotating only
    // individual limbs produced a broken, disconnected-looking flight pose.
    if (pose === 'fly') {
      viewer.animation = new FlyingAnimation()
      return () => {
        viewer.animation = null
      }
    }
    viewer.animation = null
    let frame = 0
    const startedAt = performance.now()
    const animate = (now: number) => {
      const skin = viewer.playerObject.skin
      if (skin) {
        const t = (now - startedAt) / 1000
        const { leftArm, rightArm, leftLeg, rightLeg } = skin
        leftArm.rotation.set(0, 0, 0)
        rightArm.rotation.set(0, 0, 0)
        leftLeg.rotation.set(0, 0, 0)
        rightLeg.rotation.set(0, 0, 0)
        skin.body.rotation.x = 0
        skin.head.rotation.x = 0
        if (pose === 'wave') {
          rightArm.rotation.z = -2.35 + Math.sin(t * 5) * 0.22
          rightArm.rotation.x = Math.sin(t * 3) * 0.12
        } else if (pose === 'walk') {
          leftArm.rotation.x = Math.sin(t * 5) * 0.65
          rightArm.rotation.x = -Math.sin(t * 5) * 0.65
          leftLeg.rotation.x = -Math.sin(t * 5) * 0.72
          rightLeg.rotation.x = Math.sin(t * 5) * 0.72
        } else {
          skin.body.rotation.x = 0
          skin.head.rotation.x = 0
        }
        // Animate attached back equipment too: otherwise limbs move while the
        // cape/elytra look frozen. Reset to a neutral pose each frame first.
        viewer.playerObject.traverse((object: any) => {
          const name = String(object.name || '').toLowerCase()
          if (name.includes('cape')) {
            object.rotation.x = (pose === 'walk' ? 0.12 : 0.04) + Math.sin(t * (pose === 'walk' ? 5 : 2.2)) * (pose === 'idle' ? 0.025 : 0.09)
            object.rotation.z = pose === 'wave' ? Math.sin(t * 2.5) * 0.05 : Math.sin(t * 2) * 0.035
          } else if (name.includes('leftwing') || name.includes('left_wing')) {
            object.rotation.x = Math.sin(t * 2) * 0.015
          } else if (name.includes('rightwing') || name.includes('right_wing')) {
            object.rotation.x = Math.sin(t * 2) * 0.015
          }
        })
      }
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [pose, modelType])

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
