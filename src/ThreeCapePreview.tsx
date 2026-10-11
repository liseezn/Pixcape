import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type LayerData = { pixels: string[]; visible: boolean; opacity: number }
type FaceRegion = { x: number; y: number; w: number; h: number }
type ModelType = 'steve' | 'alex'
type Props = { layers: LayerData[]; side: 'front' | 'back'; rotation: number; modelType: ModelType; onRotationChange: (value: number) => void }

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

export default function ThreeCapePreview({ layers, side, rotation, modelType, onRotationChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef(rotation)
  const sideRef = useRef(side)
  const modelTypeRef = useRef(modelType)
  const onRotationChangeRef = useRef(onRotationChange)
  const sceneRef = useRef<{ renderer: THREE.WebGLRenderer; model: THREE.Group; materials: THREE.MeshBasicMaterial[]; armMeshes: THREE.Mesh[] } | null>(null)

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
    const box = (size: [number, number, number], position: [number, number, number], regions: FaceRegion[]) => {
      const geometry = new THREE.BoxGeometry(...size)
      const mesh = new THREE.Mesh(geometry, makeFaceMaterials(source, regions, materials))
      mesh.position.set(...position)
      model.add(mesh)
      const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edge)
      lines.position.copy(mesh.position); model.add(lines)
      return mesh
    }
    box([0.78, 0.78, 0.78], [0, 1.28, 0], UV.head)
    box([0.8, 1.18, 0.42], [0, 0.3, 0], UV.torso)
    const armWidth = modelType === 'alex' ? 0.22 : 0.29
    const leftArm = box([armWidth, 1.18, 0.38], [-0.54, 0.3, 0], UV.rightArm)
    const rightArm = box([armWidth, 1.18, 0.38], [0.54, 0.3, 0], UV.leftArm)
    box([0.34, 1.18, 0.4], [-0.22, -0.88, 0], UV.rightLeg)
    box([0.34, 1.18, 0.4], [0.22, -0.88, 0], UV.leftLeg)

    // The cape remains a separate accessory, using the lower half of the texture canvas.
    const capeCanvas = document.createElement('canvas')
    capeCanvas.width = 64; capeCanvas.height = 64
    const capeCtx = capeCanvas.getContext('2d')
    if (capeCtx) capeCtx.drawImage(source, 0, 32, 64, 32, 0, 0, 64, 64)
    const capeMaterial = new THREE.MeshBasicMaterial({ map: makeTexture(capeCanvas), transparent: true, side: THREE.DoubleSide, depthWrite: false })
    materials.push(capeMaterial)
    const capeGeometry = new THREE.PlaneGeometry(0.95, 1.5)
    const cape = new THREE.Mesh(capeGeometry, capeMaterial)
    cape.position.set(0, 0.35, -0.29); cape.rotation.x = -0.06; model.add(cape)

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
      // Alex's slimmer arms are rebuilt by selecting the model option on the component.
      renderer.render(scene, camera)
    }
    animate()
    sceneRef.current = { renderer, model, materials, armMeshes: [leftArm, rightArm] }

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
    const regionSets = [UV.head, UV.torso, UV.rightArm, UV.leftArm, UV.rightLeg, UV.leftLeg]
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
    const capeMaterial = current.materials[current.materials.length - 1]
    if (capeMaterial) {
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.drawImage(source, 0, 32, 64, 32, 0, 0, 64, 64)
      const old = capeMaterial.map
      capeMaterial.map = makeTexture(canvas); capeMaterial.needsUpdate = true; old?.dispose()
    }
  }, [layers])

  useEffect(() => {
    const current = sceneRef.current
    if (current) {
      const width = modelType === 'alex' ? 0.22 : 0.29
      current.armMeshes.forEach(arm => { arm.scale.x = width / (arm.geometry as THREE.BoxGeometry).parameters.width })
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
