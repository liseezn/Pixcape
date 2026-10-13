import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type LayerData = { pixels: string[]; visible: boolean; opacity: number }
type FaceRegion = { x: number; y: number; w: number; h: number }
type ModelType = 'steve' | 'alex'
type Props = { layers: LayerData[]; side: 'front' | 'back'; rotation: number; modelType: ModelType; onRotationChange: (value: number) => void; capeTextureUrl?: string; capeVisible?: boolean; elytraVisible?: boolean }

const UV = {
  head: [
    { x: 0, y: 8, w: 8, h: 8 }, { x: 16, y: 8, w: 8, h: 8 },
    { x: 8, y: 0, w: 8, h: 8 }, { x: 16, y: 0, w: 8, h: 8 },
    { x: 8, y: 8, w: 8, h: 8 }, { x: 24, y: 8, w: 8, h: 8 },
  ] as FaceRegion[],
  torso: [
    { x: 16, y: 20, w: 4, h: 12 }, { x: 28, y: 20, w: 4, h: 12 },
    { x: 20, y: 16, w: 8, h: 4 }, { x: 28, y: 16, w: 8, h: 4 },
    { x: 20, y: 20, w: 8, h: 12 }, { x: 32, y: 20, w: 8, h: 12 },
  ] as FaceRegion[],
  rightLeg: [
    { x: 0, y: 20, w: 4, h: 12 }, { x: 8, y: 20, w: 4, h: 12 },
    { x: 4, y: 16, w: 4, h: 4 }, { x: 8, y: 16, w: 4, h: 4 },
    { x: 4, y: 20, w: 4, h: 12 }, { x: 12, y: 20, w: 4, h: 12 },
  ] as FaceRegion[],
  leftLeg: [
    { x: 16, y: 52, w: 4, h: 12 }, { x: 24, y: 52, w: 4, h: 12 },
    { x: 20, y: 48, w: 4, h: 4 }, { x: 24, y: 48, w: 4, h: 4 },
    { x: 20, y: 52, w: 4, h: 12 }, { x: 28, y: 52, w: 4, h: 12 },
  ] as FaceRegion[],
  rightArm: [
    { x: 40, y: 20, w: 4, h: 12 }, { x: 48, y: 20, w: 4, h: 12 },
    { x: 44, y: 16, w: 4, h: 4 }, { x: 48, y: 16, w: 4, h: 4 },
    { x: 44, y: 20, w: 4, h: 12 }, { x: 52, y: 20, w: 4, h: 12 },
  ] as FaceRegion[],
  leftArm: [
    { x: 32, y: 52, w: 4, h: 12 }, { x: 40, y: 52, w: 4, h: 12 },
    { x: 36, y: 48, w: 4, h: 4 }, { x: 40, y: 48, w: 4, h: 4 },
    { x: 36, y: 52, w: 4, h: 12 }, { x: 44, y: 52, w: 4, h: 12 },
  ] as FaceRegion[],
}

const OUTER_UV = {
  head: UV.head.map(region => ({ ...region, x: region.x + 32 })),
  torso: [
    { x: 16, y: 36, w: 4, h: 12 }, { x: 28, y: 36, w: 4, h: 12 },
    { x: 20, y: 32, w: 8, h: 4 }, { x: 28, y: 32, w: 8, h: 4 },
    { x: 20, y: 36, w: 8, h: 12 }, { x: 32, y: 36, w: 8, h: 12 },
  ] as FaceRegion[],
  rightLeg: [
    { x: 0, y: 36, w: 4, h: 12 }, { x: 8, y: 36, w: 4, h: 12 },
    { x: 4, y: 32, w: 4, h: 4 }, { x: 8, y: 32, w: 4, h: 4 },
    { x: 4, y: 36, w: 4, h: 12 }, { x: 12, y: 36, w: 4, h: 12 },
  ] as FaceRegion[],
  leftLeg: [
    { x: 0, y: 52, w: 4, h: 12 }, { x: 8, y: 52, w: 4, h: 12 },
    { x: 4, y: 48, w: 4, h: 4 }, { x: 8, y: 48, w: 4, h: 4 },
    { x: 4, y: 52, w: 4, h: 12 }, { x: 12, y: 52, w: 4, h: 12 },
  ] as FaceRegion[],
  rightArm: [
    { x: 40, y: 36, w: 4, h: 12 }, { x: 48, y: 36, w: 4, h: 12 },
    { x: 44, y: 32, w: 4, h: 4 }, { x: 48, y: 32, w: 4, h: 4 },
    { x: 44, y: 36, w: 4, h: 12 }, { x: 52, y: 36, w: 4, h: 12 },
  ] as FaceRegion[],
  leftArm: [
    { x: 32, y: 52, w: 4, h: 12 }, { x: 40, y: 52, w: 4, h: 12 },
    { x: 36, y: 48, w: 4, h: 4 }, { x: 40, y: 48, w: 4, h: 4 },
    { x: 36, y: 52, w: 4, h: 12 }, { x: 44, y: 52, w: 4, h: 12 },
  ] as FaceRegion[],
}

function makeSource(layers: LayerData[]) {
  const canvas = document.createElement('canvas')
  canvas.width = 64; canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, 64, 64)
    for (const layer of layers) {
      if (!layer.visible) continue
      ctx.globalAlpha = layer.opacity / 100
      layer.pixels.forEach((color, index) => {
        if (color) { ctx.fillStyle = color; ctx.fillRect(index % 64, Math.floor(index / 64), 1, 1) }
      })
    }
    ctx.globalAlpha = 1
  }
  return canvas
}

function makeTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function makeFaceMaterials(source: HTMLCanvasElement, regions: FaceRegion[], materials: THREE.MeshBasicMaterial[]) {
  return regions.map(region => {
    const canvas = document.createElement('canvas')
    canvas.width = 64; canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.drawImage(source, region.x, region.y, region.w, region.h, 0, 0, 64, 64)
    const material = new THREE.MeshBasicMaterial({ map: makeTexture(canvas), side: THREE.DoubleSide, transparent: true, alphaTest: 0.02 })
    materials.push(material)
    return material
  })
}

export default function ThreeCapePreview({ layers, side, rotation, modelType, onRotationChange, capeTextureUrl, capeVisible = true, elytraVisible = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef(rotation)
  const sideRef = useRef(side)
  const modelTypeRef = useRef(modelType)
  const onRotationChangeRef = useRef(onRotationChange)
  const sceneRef = useRef<{ renderer: THREE.WebGLRenderer; model: THREE.Group; materials: THREE.MeshBasicMaterial[]; armMeshes: THREE.Mesh[]; outerArmMeshes: THREE.Mesh[]; capeMaterial: THREE.MeshBasicMaterial; capeMesh: THREE.Mesh; elytraMeshes: THREE.Mesh[] } | null>(null)

  useEffect(() => { rotationRef.current = rotation }, [rotation])
  useEffect(() => { sideRef.current = side }, [side])
  useEffect(() => { modelTypeRef.current = modelType }, [modelType])
  useEffect(() => { onRotationChangeRef.current = onRotationChange }, [onRotationChange])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true }) }
    catch { host.dataset.webglUnavailable = 'true'; return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0, 1.2, 7)
    scene.add(new THREE.AmbientLight(0xffffff, 1.8))
    const key = new THREE.DirectionalLight(0xffffff, 1.6)
    key.position.set(-3, 5, 6); scene.add(key)
    const fill = new THREE.DirectionalLight(0x7198ff, 0.7)
    fill.position.set(4, 2, -4); scene.add(fill)

    const model = new THREE.Group()
    scene.add(model)
    const edge = new THREE.LineBasicMaterial({ color: 0x111c2b, transparent: true, opacity: 0.25 })
    const materials: THREE.MeshBasicMaterial[] = []
    const source = makeSource(layers)
    const box = (size: [number, number, number], position: [number, number, number], regions: FaceRegion[], outline = true) => {
      const geometry = new THREE.BoxGeometry(...size)
      const mesh = new THREE.Mesh(geometry, makeFaceMaterials(source, regions, materials))
      mesh.position.set(...position)
      model.add(mesh)
      if (outline) {
        const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edge)
        lines.position.copy(mesh.position); model.add(lines)
      }
      return mesh
    }
    box([0.78, 0.78, 0.78], [0, 1.28, 0], UV.head)
    box([0.8, 1.18, 0.42], [0, 0.3, 0], UV.torso)
    const armWidth = modelType === 'alex' ? 0.22 : 0.29
    const leftArm = box([armWidth, 1.18, 0.38], [-0.54, 0.3, 0], UV.rightArm)
    const rightArm = box([armWidth, 1.18, 0.38], [0.54, 0.3, 0], UV.leftArm)
    box([0.34, 1.18, 0.4], [-0.22, -0.88, 0], UV.rightLeg)
    box([0.34, 1.18, 0.4], [0.22, -0.88, 0], UV.leftLeg)

    // Classic skin outer layer (hat, jacket, sleeves and trouser legs).
    // Slightly enlarged boxes avoid z-fighting; transparent pixels reveal the base skin.
    box([0.84, 0.84, 0.84], [0, 1.28, 0], OUTER_UV.head, false)
    box([0.84, 1.22, 0.46], [0, 0.3, 0], OUTER_UV.torso, false)
    const leftArmOverlay = box([armWidth + 0.04, 1.22, 0.42], [-0.54, 0.3, 0], OUTER_UV.rightArm, false)
    const rightArmOverlay = box([armWidth + 0.04, 1.22, 0.42], [0.54, 0.3, 0], OUTER_UV.leftArm, false)
    box([0.38, 1.22, 0.44], [-0.22, -0.88, 0], OUTER_UV.rightLeg, false)
    box([0.38, 1.22, 0.44], [0.22, -0.88, 0], OUTER_UV.leftLeg, false)

    // Minecraft cape art occupies a 10x16 pixel UV rectangle inside a 64x32 texture.
    // Crop that rectangle before mapping it to a matching 10:16 plane to avoid stretching.
    const capeCanvas = document.createElement('canvas')
    capeCanvas.width = 64; capeCanvas.height = 64
    const capeCtx = capeCanvas.getContext('2d')
    if (capeCtx) capeCtx.imageSmoothingEnabled = false
    if (capeCtx) capeCtx.drawImage(source, 1, 33, 10, 16, 0, 0, 64, 64)
    const capeMaterial = new THREE.MeshBasicMaterial({ map: makeTexture(capeCanvas), transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.01 })
    materials.push(capeMaterial)
    const capeGeometry = new THREE.PlaneGeometry(0.94, 1.5)
    const cape = new THREE.Mesh(capeGeometry, capeMaterial)
    cape.position.set(0, 0.35, -0.29); cape.rotation.x = -0.06; model.add(cape)

    // Independent pixel-art elytra accessory, visible on the back and toggleable separately.
    const wingCanvas = document.createElement('canvas')
    wingCanvas.width = 16; wingCanvas.height = 16
    const wingCtx = wingCanvas.getContext('2d')
    if (wingCtx) {
      wingCtx.imageSmoothingEnabled = false
      wingCtx.clearRect(0, 0, 16, 16)
      wingCtx.fillStyle = '#49352b'; wingCtx.fillRect(1, 1, 14, 14)
      wingCtx.fillStyle = '#77513a'; wingCtx.fillRect(2, 2, 12, 12)
      wingCtx.fillStyle = '#9a704b'; wingCtx.fillRect(3, 3, 9, 10)
      wingCtx.fillStyle = '#c19a68'; wingCtx.fillRect(4, 4, 6, 8)
      wingCtx.fillStyle = '#5d4132'; wingCtx.fillRect(2, 12, 12, 2)
      wingCtx.fillStyle = '#d0b07d'; wingCtx.fillRect(5, 5, 3, 5)
      wingCtx.fillStyle = '#352a25'; wingCtx.fillRect(7, 2, 2, 12)
    }
    const wingMaterial = new THREE.MeshBasicMaterial({ map: makeTexture(wingCanvas), transparent: true, side: THREE.DoubleSide, alphaTest: 0.01 })
    const wingShape = new THREE.Shape()
    wingShape.moveTo(0, 0.48)
    wingShape.lineTo(0.35, 0.38)
    wingShape.lineTo(0.63, -0.24)
    wingShape.lineTo(0.34, -0.42)
    wingShape.lineTo(0.08, -0.12)
    wingShape.closePath()
    const leftWing = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), wingMaterial)
    leftWing.position.set(-0.08, 0.42, -0.38)
    leftWing.rotation.y = -0.12
    model.add(leftWing)
    const rightWing = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), wingMaterial)
    rightWing.position.set(0.08, 0.42, -0.38)
    rightWing.scale.x = -1
    rightWing.rotation.y = 0.12
    model.add(rightWing)
    leftWing.visible = elytraVisible
    rightWing.visible = elytraVisible

    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.25, 32), new THREE.MeshBasicMaterial({ color: 0x172438, transparent: true, opacity: 0.45 }))
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.55; scene.add(floor)

    const resize = () => {
      const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight)
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize); observer.observe(host); resize()
    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      model.rotation.y = (rotationRef.current + (sideRef.current === 'back' ? 180 : 0)) * Math.PI / 180
      // Body proportions and texture regions follow the selected classic model layout.
      renderer.render(scene, camera)
    }
    animate()
    sceneRef.current = { renderer, model, materials, armMeshes: [leftArm, rightArm], outerArmMeshes: [leftArmOverlay, rightArmOverlay], capeMaterial, capeMesh: cape, elytraMeshes: [leftWing, rightWing] }

    let drag: { x: number; rotation: number } | null = null
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return
      drag = { x: event.clientX, rotation: rotationRef.current }
      renderer.domElement.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (!drag) return
      const next = drag.rotation + (event.clientX - drag.x) * 0.8
      rotationRef.current = next; onRotationChangeRef.current(next)
    }
    const up = () => { drag = null }
    renderer.domElement.addEventListener('pointerdown', down)
    renderer.domElement.addEventListener('pointermove', move)
    renderer.domElement.addEventListener('pointerup', up)
    renderer.domElement.addEventListener('pointercancel', up)

    return () => {
      cancelAnimationFrame(frame); observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', down)
      renderer.domElement.removeEventListener('pointermove', move)
      renderer.domElement.removeEventListener('pointerup', up)
      renderer.domElement.removeEventListener('pointercancel', up)
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose()
          const list = Array.isArray(object.material) ? object.material : [object.material]
          list.forEach(material => material.dispose())
        }
      })
      renderer.dispose(); renderer.domElement.remove(); sceneRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    const source = makeSource(layers)
    const regionSets = [UV.head, UV.torso, UV.rightArm, UV.leftArm, UV.rightLeg, UV.leftLeg, OUTER_UV.head, OUTER_UV.torso, OUTER_UV.rightArm, OUTER_UV.leftArm, OUTER_UV.rightLeg, OUTER_UV.leftLeg]
    let materialIndex = 0
    for (const regions of regionSets) {
      for (const region of regions) {
        const material = current.materials[materialIndex++]
        if (!material) continue
        const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.drawImage(source, region.x, region.y, region.w, region.h, 0, 0, 64, 64)
        const old = material.map
        material.map = makeTexture(canvas); material.needsUpdate = true; old?.dispose()
      }
    }
  }, [layers])

  useEffect(() => {
    const current = sceneRef.current
    if (current) current.capeMesh.visible = capeVisible
  }, [capeVisible])

  useEffect(() => {
    const current = sceneRef.current
    if (current) current.elytraMeshes.forEach(wing => { wing.visible = elytraVisible })
  }, [elytraVisible])

  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    let cancelled = false
    const applyCape = async () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 64
        const context = canvas.getContext('2d')
        if (!context) return
        context.imageSmoothingEnabled = false
        if (capeTextureUrl) {
          const image = new Image()
          image.crossOrigin = 'anonymous'
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve()
            image.onerror = () => reject(new Error('cape texture failed'))
            image.src = capeTextureUrl
          })
          if (cancelled) return
          // Crop the official 10x16 front-face UV region instead of stretching the atlas.
          context.drawImage(image, 1, 1, 10, 16, 0, 0, 64, 64)
        } else {
          const source = makeSource(layers)
          context.drawImage(source, 1, 33, 10, 16, 0, 0, 64, 64)
        }
        const old = current.capeMaterial.map
        current.capeMaterial.map = makeTexture(canvas)
        current.capeMaterial.needsUpdate = true
        old?.dispose()
      } catch {
        // Keep the last valid cape texture if a remote texture fails to load.
      }
    }
    void applyCape()
    return () => { cancelled = true }
  }, [capeTextureUrl, layers])

  useEffect(() => {
    const current = sceneRef.current
    if (current) {
      const width = modelType === 'alex' ? 0.22 : 0.29
      current.armMeshes.forEach(arm => { arm.scale.x = width / (arm.geometry as THREE.BoxGeometry).parameters.width })
      current.outerArmMeshes.forEach(arm => { arm.scale.x = (width + 0.04) / (arm.geometry as THREE.BoxGeometry).parameters.width })
    }
  }, [modelType])

  useEffect(() => {
    const current = sceneRef.current
    if (current) current.model.rotation.y = (rotation + (side === 'back' ? 180 : 0)) * Math.PI / 180
  }, [rotation, side])

  return <div ref={hostRef} className="three-preview-canvas" role="img" aria-label={modelType === 'steve' ? 'Steve 模型 3D 皮肤与披风预览' : 'Alex 模型 3D 皮肤与披风预览'}>
    <div className="webgl-fallback">当前设备无法启用 WebGL，请尝试更新浏览器或开启硬件加速。</div>
  </div>
}
