import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type LayerData = { pixels: string[]; visible: boolean; opacity: number }
type Props = { layers: LayerData[]; side: 'front' | 'back'; rotation: number; onRotationChange: (value: number) => void }

function makeTexture(layers: LayerData[]) {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
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
  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export default function ThreeCapePreview({ layers, side, rotation, onRotationChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef(rotation)
  const sideRef = useRef(side)
  const onRotationChangeRef = useRef(onRotationChange)
  const sceneRef = useRef<{ scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; model: THREE.Group; capeMaterial: THREE.MeshBasicMaterial } | null>(null)

  useEffect(() => { rotationRef.current = rotation }, [rotation])
  useEffect(() => { sideRef.current = side }, [side])
  useEffect(() => { onRotationChangeRef.current = onRotationChange }, [onRotationChange])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    } catch {
      host.dataset.webglUnavailable = 'true'
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0, 1.3, 6.8)
    const ambient = new THREE.AmbientLight(0xffffff, 2.1)
    scene.add(ambient)
    const key = new THREE.DirectionalLight(0xffffff, 2.4)
    key.position.set(-3, 5, 6)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x7198ff, 1.1)
    fill.position.set(4, 2, -4)
    scene.add(fill)

    const model = new THREE.Group()
    scene.add(model)
    const skin = new THREE.MeshStandardMaterial({ color: 0x91a4ba, roughness: 1, metalness: 0 })
    const skinLight = new THREE.MeshStandardMaterial({ color: 0xb7c3d2, roughness: 1 })
    const clothes = new THREE.MeshStandardMaterial({ color: 0x486b9b, roughness: 1 })
    const pants = new THREE.MeshStandardMaterial({ color: 0x354761, roughness: 1 })
    const edge = new THREE.LineBasicMaterial({ color: 0x111c2b, transparent: true, opacity: 0.55 })
    const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
      const geometry = new THREE.BoxGeometry(w, h, d)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x, y, z)
      model.add(mesh)
      const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edge)
      lines.position.copy(mesh.position)
      model.add(lines)
      return mesh
    }

    addBox(0.78, 0.78, 0.78, 0, 1.22, 0, skinLight)
    addBox(0.8, 0.82, 0.42, 0, 0.39, 0, clothes)
    addBox(0.29, 0.8, 0.38, -0.57, 0.4, 0, skin)
    addBox(0.29, 0.8, 0.38, 0.57, 0.4, 0, skin)
    addBox(0.34, 0.82, 0.4, -0.22, -0.48, 0, pants)
    addBox(0.34, 0.82, 0.4, 0.22, -0.48, 0, pants)

    const capeTexture = makeTexture(layers)
    const capeMaterial = new THREE.MeshBasicMaterial({ map: capeTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false })
    const capeGeometry = new THREE.PlaneGeometry(0.95, 1.5)
    const cape = new THREE.Mesh(capeGeometry, capeMaterial)
    cape.position.set(0, 0.37, -0.29)
    cape.rotation.x = -0.06
    model.add(cape)
    // A small collar visually anchors the cape to the shoulders.
    addBox(0.66, 0.13, 0.48, 0, 0.78, -0.06, clothes)

    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.25, 32), new THREE.MeshBasicMaterial({ color: 0x172438, transparent: true, opacity: 0.55 }))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.93
    scene.add(floor)

    const resize = () => {
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      model.rotation.y = (rotationRef.current + (sideRef.current === 'front' ? 180 : 0)) * Math.PI / 180
      renderer.render(scene, camera)
    }
    animate()
    sceneRef.current = { scene, camera, renderer, model, capeMaterial }

    let drag: { x: number; rotation: number } | null = null
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return
      drag = { x: event.clientX, rotation: rotationRef.current }
      renderer.domElement.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (!drag) return
      const next = drag.rotation + (event.clientX - drag.x) * 0.8
      rotationRef.current = next
      onRotationChangeRef.current(next)
    }
    const up = () => { drag = null }
    renderer.domElement.addEventListener('pointerdown', down)
    renderer.domElement.addEventListener('pointermove', move)
    renderer.domElement.addEventListener('pointerup', up)
    renderer.domElement.addEventListener('pointercancel', up)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', down)
      renderer.domElement.removeEventListener('pointermove', move)
      renderer.domElement.removeEventListener('pointerup', up)
      renderer.domElement.removeEventListener('pointercancel', up)
      capeTexture.dispose()
      capeGeometry.dispose()
      capeMaterial.dispose()
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach(material => material.dispose())
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
      sceneRef.current = null
    }
  // Scene construction is intentionally mount-only; texture updates happen below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const current = sceneRef.current
    if (!current) return
    const texture = makeTexture(layers)
    const old = current.capeMaterial.map
    current.capeMaterial.map = texture
    current.capeMaterial.needsUpdate = true
    old?.dispose()
  }, [layers])

  useEffect(() => {
    const current = sceneRef.current
    if (current) current.model.rotation.y = (rotation + (side === 'front' ? 180 : 0)) * Math.PI / 180
  }, [rotation, side])

  return <div ref={hostRef} className="three-preview-canvas" role="img" aria-label="可旋转的 Minecraft 风格 3D 角色和披风预览">
    <div className="webgl-fallback">当前设备无法启用 WebGL，请尝试更新浏览器或开启硬件加速。</div>
  </div>
}
