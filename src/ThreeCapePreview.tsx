import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FlyingAnimation, IdleAnimation, SkinViewer, WalkingAnimation } from 'skinview3d'

type LayerData = { pixels: string[]; visible: boolean; opacity: number }
type ModelType = 'steve' | 'alex'
type Pose = 'idle' | 'wave' | 'walk' | 'fly'
type SceneTheme = 'day' | 'night' | 'plains' | 'desert' | 'forest' | 'nether' | 'end' | 'custom'

type BiomePalette = { sky: string; top: string; dirt: string; stone: string; leaves: string; wood: string; accent: string }
function biomePalette(theme: SceneTheme, customBackground: string): BiomePalette {
  const palettes: Record<Exclude<SceneTheme, 'custom'>, BiomePalette> = {
    day: { sky: '#87ceeb', top: '#5f9b3d', dirt: '#80512e', stone: '#777d83', leaves: '#2f7d32', wood: '#76502d', accent: '#fff0a3' },
    plains: { sky: '#87ceeb', top: '#5f9b3d', dirt: '#80512e', stone: '#777d83', leaves: '#2f7d32', wood: '#76502d', accent: '#fff0a3' },
    night: { sky: '#101a3a', top: '#294c36', dirt: '#47352f', stone: '#343b50', leaves: '#183d2b', wood: '#49352b', accent: '#dce7ff' },
    desert: { sky: '#74c8ed', top: '#d8c27a', dirt: '#c2a15f', stone: '#a88d62', leaves: '#5e7541', wood: '#6d4a2e', accent: '#ffe4a1' },
    forest: { sky: '#80c5e5', top: '#39763b', dirt: '#68472e', stone: '#686f70', leaves: '#245b2c', wood: '#68452a', accent: '#fff0a3' },
    nether: { sky: '#321d35', top: '#713b32', dirt: '#4b2930', stone: '#513c49', leaves: '#4e292e', wood: '#4c2527', accent: '#ff7043' },
    end: { sky: '#211b42', top: '#817391', dirt: '#5a506c', stone: '#77708a', leaves: '#62516f', wood: '#51455f', accent: '#d4c4ff' },
  }
  return theme === 'custom' ? { ...palettes.plains, sky: customBackground } : palettes[theme]
}

function createVoxelBackdrop(theme: SceneTheme, customBackground: string): THREE.Group {
  const palette = biomePalette(theme, customBackground)
  const group = new THREE.Group()
  const geometry = new THREE.BoxGeometry(4, 4, 4)
  const materials = {
    top: new THREE.MeshStandardMaterial({ color: palette.top, roughness: 1, flatShading: true }),
    dirt: new THREE.MeshStandardMaterial({ color: palette.dirt, roughness: 1, flatShading: true }),
    stone: new THREE.MeshStandardMaterial({ color: palette.stone, roughness: 1, flatShading: true }),
    leaves: new THREE.MeshStandardMaterial({ color: palette.leaves, roughness: 1, flatShading: true }),
    wood: new THREE.MeshStandardMaterial({ color: palette.wood, roughness: 1, flatShading: true }),
    accent: new THREE.MeshBasicMaterial({ color: palette.accent }),
  }
  const addBlock = (x: number, y: number, z: number, material: THREE.Material, sx = 1, sy = 1, sz = 1) => {
    const block = new THREE.Mesh(geometry, material)
    block.position.set(x, y, z)
    block.scale.set(sx, sy, sz)
    group.add(block)
  }
  for (let x = -40; x <= 40; x += 4) {
    const column = Math.round((x + 40) / 4)
    const rise = theme === 'desert' ? (column % 5 === 0 ? 4 : 0) : (column % 7 === 0 ? 4 : column % 11 === 0 ? 8 : 0)
    for (let z = -40; z <= -20; z += 4) {
      const topY = -8 + rise + (z < -32 && column % 4 === 0 ? 4 : 0)
      addBlock(x, topY, z, materials.top)
      addBlock(x, topY - 4, z, materials.dirt)
      addBlock(x, topY - 8, z, materials.stone)
    }
  }
  if (theme === 'forest' || theme === 'plains' || theme === 'day' || theme === 'custom') {
    for (const [tx, tz, height] of [[-20, -28, 3], [20, -36, 4], [32, -24, 2]] as const) {
      for (let h = 0; h < height; h++) addBlock(tx, -4 + h * 4, tz, materials.wood)
      addBlock(tx, -4 + height * 4, tz, materials.leaves, 2, 1, 2)
      addBlock(tx - 4, -4 + height * 4, tz, materials.leaves)
      addBlock(tx + 4, -4 + height * 4, tz, materials.leaves)
      addBlock(tx, -4 + height * 4, tz - 4, materials.leaves)
      addBlock(tx, -4 + height * 4, tz + 4, materials.leaves)
    }
  }
  if (theme === 'desert') {
    addBlock(-24, -4, -32, materials.top, 2, 2, 2)
    addBlock(-24, 4, -32, materials.top, 2, 1, 2)
    addBlock(24, -4, -36, materials.top, 3, 2, 2)
  }
  if (theme === 'nether') {
    for (let i = 0; i < 8; i++) addBlock(-32 + i * 8, -1 + (i % 3) * 4, -36, materials.accent, 0.12, 0.12, 0.12)
  }
  if (theme === 'end') {
    addBlock(-24, -3, -32, materials.stone, 2, 2, 2)
    addBlock(24, -5, -36, materials.stone, 3, 1, 2)
  }
  if (theme === 'night') {
    const starGeometry = new THREE.BoxGeometry(0.45, 0.45, 0.45)
    const starMaterial = new THREE.MeshBasicMaterial({ color: '#f5f4d6' })
    for (let i = 0; i < 28; i++) {
      const star = new THREE.Mesh(starGeometry, starMaterial)
      star.position.set(-34 + ((i * 17) % 68), 5 + ((i * 11) % 18), -38 - (i % 4) * 2)
      group.add(star)
    }
    ;(group.userData as any).extraResources = [starGeometry, starMaterial]
  }
  ;(group.userData as any).resources = [geometry, ...Object.values(materials)]
  return group
}
function disposeVoxelBackdrop(group: THREE.Group) {
  group.removeFromParent()
  const resources = [...((group.userData as any).resources || []), ...((group.userData as any).extraResources || [])] as Array<{ dispose?: () => void }>
  resources.forEach(resource => resource.dispose?.())
}

type Props = {
  sceneTheme: SceneTheme
  customBackground: string
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
  sceneTheme,
  customBackground,
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
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<SkinViewer | null>(null)
  const backdropRef = useRef<THREE.Group | null>(null)
  const poseRef = useRef(pose)
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
  useEffect(() => { poseRef.current = pose }, [pose])
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
        background: biomePalette(sceneTheme, customBackground).sky,
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
      if (poseRef.current !== 'fly') viewer.playerObject.rotation.x = tiltRef.current * Math.PI / 180
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
      if (poseRef.current !== 'fly') viewer.playerObject.rotation.x = nextTilt * Math.PI / 180
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
      if (backdropRef.current) {
        disposeVoxelBackdrop(backdropRef.current)
        backdropRef.current = null
      }
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
    if (pose !== 'fly') viewer.playerObject.rotation.x = tilt * Math.PI / 180
  }, [rotation, side, tilt, pose])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.camera.zoom = zoom
    viewer.camera.updateProjectionMatrix()
  }, [zoom])


  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const animation = pose === 'fly'
      ? new FlyingAnimation()
      : pose === 'walk'
        ? new WalkingAnimation()
        : new IdleAnimation()
    if (pose === 'wave') {
      animation.addAnimation((player, progress) => {
        player.skin.rightArm.rotation.z = -2.35 + Math.sin(progress * 5) * 0.22
        player.skin.rightArm.rotation.x = Math.sin(progress * 3) * 0.12
      })
    }
    if (pose === 'fly' && !elytraVisibleRef.current && capeVisibleRef.current) {
      animation.addAnimation((player, progress) => {
        player.cape.rotation.x = -0.85 + Math.sin(progress * 2.2) * 0.025
        player.cape.rotation.z = Math.sin(progress * 1.8) * 0.025
      })
    }
    animation.speed = pose === 'walk' ? 0.72 : 1
    viewer.animation = animation
    return () => {
      if (viewer.animation === animation) viewer.animation = null
    }
  }, [pose])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.scene.background = new THREE.Color(biomePalette(sceneTheme, customBackground).sky)
    if (backdropRef.current) disposeVoxelBackdrop(backdropRef.current)
    const backdrop = createVoxelBackdrop(sceneTheme, customBackground)
    viewer.scene.add(backdrop)
    backdropRef.current = backdrop
    return () => {
      if (backdropRef.current === backdrop) {
        disposeVoxelBackdrop(backdrop)
        backdropRef.current = null
      }
    }
  }, [sceneTheme, customBackground])



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
