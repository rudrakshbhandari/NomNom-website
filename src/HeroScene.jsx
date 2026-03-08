import {
  useRef, useState, useEffect, useMemo, useCallback,
  Suspense, Component,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'

/* ═══════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════ */

const DARK = '#050510'
const ACCENT = '#ff2a2a'
const ANIM_DURATION = 8

const CAMERA_CURVE_PTS = [
  [3, 4.5, -3],
  [8, 6, -10],
  [-3, 8, -17],
  [-16, 8, -2],
  [-14, 7, 8],
  [-6, 6, 14],
  [0, 5, 16],
  [0, 4.5, 14],
].map(p => new THREE.Vector3(...p))

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/* ═══════════════════════════════════════════════
   GLB loader with procedural fallback
   ═══════════════════════════════════════════════ */

class ModelErrorBoundary extends Component {
  state = { error: false }
  static getDerivedStateFromError() { return { error: true } }
  render() { return this.state.error ? this.props.fallback : this.props.children }
}

/* ═══════════════════════════════════════════════
   Holographic Geisel — GLB geometry with custom
   wireframe + transparent holographic materials
   ═══════════════════════════════════════════════ */

const EDGE_MAT_PROPS = { color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.8, toneMapped: false }
const DIM_EDGE_PROPS = { color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.9, toneMapped: false, transparent: true, opacity: 0.5 }

const holoFaceMat = new THREE.MeshStandardMaterial({
  color: '#0a0a12',
  emissive: new THREE.Color(ACCENT),
  emissiveIntensity: 0.15,
  transparent: true,
  opacity: 0.18,
  side: THREE.DoubleSide,
  depthWrite: false,
  toneMapped: false,
})

const holoWireMat = new THREE.MeshStandardMaterial({
  color: ACCENT,
  emissive: new THREE.Color(ACCENT),
  emissiveIntensity: 1.8,
  wireframe: true,
  toneMapped: false,
})

function HolographicGeisel() {
  const { scene } = useGLTF('/models/geisel.glb')
  const groupRef = useRef()
  const matsRef = useRef({ face: null, wire: null })

  const hologram = useMemo(() => {
    const root = scene.clone(true)

    root.traverse((child) => {
      if (!child.isMesh) return

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose && m.dispose())
        } else {
          child.material.dispose && child.material.dispose()
        }
      }
      child.material = holoFaceMat
    })

    return root
  }, [scene])

  const wireClone = useMemo(() => {
    const root = scene.clone(true)
    root.traverse((child) => {
      if (!child.isMesh) return
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose && m.dispose())
        } else {
          child.material.dispose && child.material.dispose()
        }
      }
      child.material = holoWireMat
    })
    return root
  }, [scene])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const pulse = 0.15 + Math.sin(clock.elapsedTime * 0.6) * 0.06
    holoFaceMat.emissiveIntensity = pulse
    const wirePulse = 1.6 + Math.sin(clock.elapsedTime * 0.8) * 0.25
    holoWireMat.emissiveIntensity = wirePulse
    groupRef.current.position.y = Math.sin(clock.elapsedTime * 0.3) * 0.04
  })

  return (
    <group ref={groupRef}>
      <primitive object={hologram} />
      <primitive object={wireClone} />
      <pointLight position={[0, 2.5, 0]} color={ACCENT} intensity={3} distance={8} decay={2} />
    </group>
  )
}

function GeiselModel() {
  return (
    <ModelErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <HolographicGeisel />
      </Suspense>
    </ModelErrorBoundary>
  )
}

/* ═══════════════════════════════════════════════
   Campus layout — UCSD campus map (1024×1024)
   Plane 28×28, offset so Geisel sits at world origin
   Geisel is at image fraction (0.34, 0.57)
   ═══════════════════════════════════════════════ */

const METERS_PER_UNIT = 50
const GEISEL_SCALE = 0.15
const CAMPUS_W = 28
const CAMPUS_H = 28

const LANDMARKS = [
  { id: 'geisel',   name: 'Geisel Library',    x:  0.0,  z:  0.0,  w: 0, d: 0, h: 0, isGeisel: true },
  { id: 'price',    name: 'Price Center',       x:  2.0,  z:  1.7,  w: 1.4, d: 1.0, h: 0.28 },
  { id: 'sixth',    name: 'Sixth College',      x:  3.6,  z:  3.9,  w: 1.3, d: 1.3, h: 0.25 },
  { id: 'seventh',  name: 'Seventh College',    x:  5.0,  z: -4.2,  w: 1.3, d: 1.0, h: 0.25 },
  { id: 'eighth',   name: 'Eighth College',     x: -2.0,  z: -7.0,  w: 1.2, d: 1.2, h: 0.25 },
  { id: 'rimac',    name: 'RIMAC',              x:  0.3,  z: -5.9,  w: 1.6, d: 1.2, h: 0.32 },
  { id: 'revelle',  name: 'Revelle College',    x: -4.5,  z:  8.4,  w: 1.3, d: 1.3, h: 0.25 },
  { id: 'muir',     name: 'Muir College',       x: -6.7,  z:  4.5,  w: 1.3, d: 1.0, h: 0.25 },
  { id: 'marshall', name: 'Marshall College',    x: -4.2,  z: -1.1,  w: 1.3, d: 1.0, h: 0.25 },
  { id: 'erc',      name: 'ERC',                x: -5.9,  z: -5.9,  w: 1.2, d: 1.0, h: 0.25 },
  { id: 'warren',   name: 'Warren College',     x:  2.0,  z: -2.0,  w: 1.3, d: 1.0, h: 0.25 },
  { id: 'libwalk',  name: 'Library Walk',       x:  0.3,  z:  0.8,  w: 0.10, d: 3.5, h: 0.015 },
]

/* ═══════════════════════════════════════════════
   Holographic grid — underneath the satellite plane
   ═══════════════════════════════════════════════ */

function CampusGrid() {
  const gridHalf = CAMPUS_W / 2 + 6

  const gridGeo = useMemo(() => {
    const pts = []
    const colors = []
    const c = new THREE.Color(ACCENT)
    for (let x = -gridHalf; x <= gridHalf; x += 1) {
      const fade = 1 - Math.abs(x) / gridHalf
      pts.push(x, 0, -gridHalf, x, 0, gridHalf)
      colors.push(c.r, c.g, c.b, fade * 0.3, c.r, c.g, c.b, fade * 0.3)
    }
    for (let z = -gridHalf; z <= gridHalf; z += 1) {
      const fade = 1 - Math.abs(z) / gridHalf
      pts.push(-gridHalf, 0, z, gridHalf, 0, z)
      colors.push(c.r, c.g, c.b, fade * 0.3, c.r, c.g, c.b, fade * 0.3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4))
    return g
  }, [])

  return (
    <group>
      <lineSegments geometry={gridGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.10} />
      </lineSegments>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[gridHalf - 0.5, gridHalf, 64]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT} emissiveIntensity={0.5}
          transparent opacity={0.08} toneMapped={false} side={THREE.DoubleSide}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[gridHalf * 2 + 4, gridHalf * 2 + 4]} />
        <meshStandardMaterial color="#010103" metalness={0.95} roughness={0.4} />
      </mesh>
    </group>
  )
}

/* ═══════════════════════════════════════════════
   Campus wireframe — glowing holographic blueprint
   All lines use the same emissive style as Geisel
   ═══════════════════════════════════════════════ */

function CampusWireframe() {
  const segments = useMemo(() => {
    const bright = []
    const normal = []
    const dim = []

    const poly = (arr, pts) => {
      for (let i = 0; i < pts.length - 1; i++) arr.push([pts[i], pts[i + 1]])
    }
    const rect = (arr, cx, cz, w, d) => {
      const hw = w / 2, hd = d / 2
      arr.push([[cx - hw, cz - hd], [cx + hw, cz - hd]])
      arr.push([[cx + hw, cz - hd], [cx + hw, cz + hd]])
      arr.push([[cx + hw, cz + hd], [cx - hw, cz + hd]])
      arr.push([[cx - hw, cz + hd], [cx - hw, cz - hd]])
    }
    const closedPoly = (arr, pts) => {
      for (let i = 0; i < pts.length; i++)
        arr.push([pts[i], pts[(i + 1) % pts.length]])
    }

    /* ══════════════════════════════════════════════
       CAMPUS PERIMETER — traced from map boundary
       ══════════════════════════════════════════════ */
    closedPoly(bright, [
      [-9.0, -9.5], [-7.0, -10.2], [-4.0, -9.8], [-1.0, -9.0],
      [2.5, -8.5], [5.0, -8.0], [7.0, -7.0], [8.5, -5.5],
      [9.0, -3.0], [9.0, -0.5], [8.5, 2.0], [8.0, 4.5],
      [7.0, 7.0], [5.5, 9.0], [3.0, 10.5], [0.0, 11.0],
      [-3.5, 11.0], [-6.0, 10.0], [-7.5, 8.5], [-8.0, 6.5],
      [-8.5, 4.0], [-8.8, 1.5], [-8.8, -1.0], [-8.8, -3.5],
      [-9.0, -6.0], [-9.2, -8.0],
    ])

    /* ══════════════════════════════════════════════
       ROADS — traced from map road network
       ══════════════════════════════════════════════ */

    /* N Torrey Pines Road — western arterial (N→S along coast) */
    poly(normal, [
      [-8.8, -9.5], [-8.6, -7.5], [-8.3, -5.5], [-8.0, -3.5],
      [-7.8, -1.5], [-7.5, 0.5], [-7.3, 2.5], [-7.0, 4.5],
      [-7.0, 6.5], [-7.2, 8.5], [-7.5, 10.0],
    ])

    /* Scholars Dr / N campus E-W — through ERC, past RIMAC */
    poly(normal, [
      [-8.0, -5.0], [-6.5, -5.5], [-5.0, -5.0], [-3.5, -4.8],
      [-2.0, -5.0], [-0.5, -5.5], [1.0, -5.8], [3.0, -5.5],
      [5.0, -5.0], [7.0, -5.5],
    ])

    /* Voigt Dr — E-W through central campus (Marshall → Warren) */
    poly(normal, [
      [-7.5, -1.5], [-5.5, -1.8], [-4.0, -1.5], [-2.5, -1.2],
      [-0.8, -1.0], [0.5, -1.2], [2.0, -1.5], [3.5, -2.0],
      [5.0, -2.5], [7.0, -3.0],
    ])

    /* Russell Ln / Gilman — E-W south of Geisel */
    poly(normal, [
      [-7.3, 2.5], [-5.5, 2.0], [-4.0, 1.8], [-2.5, 1.5],
      [-1.0, 1.2], [0.5, 1.0], [2.0, 1.2], [3.5, 2.0],
      [5.0, 2.5], [6.5, 3.0],
    ])

    /* La Jolla Village Dr — southern E-W arterial */
    poly(normal, [
      [-8.0, 8.0], [-6.0, 8.2], [-4.0, 8.0], [-2.0, 8.3],
      [0.0, 8.5], [2.0, 8.5], [4.0, 8.3], [6.0, 8.5], [8.0, 8.5],
    ])

    /* Eastern N-S connector (past Seventh, Warren, Sixth) */
    poly(normal, [
      [6.5, -7.0], [6.0, -5.0], [5.5, -3.0], [5.5, -1.0],
      [5.5, 1.0], [5.5, 3.0], [5.5, 5.0], [5.5, 7.0], [6.0, 8.5],
    ])

    /* Central N-S road (through campus core) */
    poly(normal, [
      [-0.3, -7.5], [-0.3, -5.5], [-0.2, -3.5], [0.0, -1.5],
      [0.0, 0.5], [0.0, 2.5], [-0.2, 4.5], [-0.3, 6.5], [-0.5, 8.0],
    ])

    /* NW spur — Rady / Torrey Pines Center road */
    poly(normal, [
      [-8.5, -9.0], [-7.0, -8.5], [-6.0, -8.0], [-5.0, -7.5],
      [-3.5, -7.2],
    ])

    /* SW connector — Muir to Marshall */
    poly(normal, [
      [-7.0, 5.0], [-6.5, 3.5], [-5.5, 2.0], [-5.0, 0.5],
      [-4.5, -0.5], [-4.5, -2.0],
    ])

    /* SE diagonal — Price area to Sixth */
    poly(normal, [
      [2.0, 2.0], [2.5, 2.8], [3.0, 3.5], [3.5, 4.0],
    ])

    /* ══════════════════════════════════════════════
       PATHS — pedestrian spines
       ══════════════════════════════════════════════ */

    /* Library Walk — main E-W pedestrian spine */
    poly(dim, [
      [-4.0, 0.5], [-2.5, 0.6], [-1.0, 0.7], [0.3, 0.8],
      [1.5, 0.8], [3.0, 0.7], [4.0, 0.5],
    ])

    /* Ridge Walk — N-S through center */
    poly(dim, [
      [0.0, -2.5], [0.0, -1.5], [0.0, -0.5], [0.2, 0.3],
      [0.3, 0.8], [0.3, 1.5], [0.2, 2.5],
    ])

    /* Warren → Geisel path */
    poly(dim, [
      [2.0, -2.0], [1.5, -1.2], [1.0, -0.3], [0.5, 0.3],
    ])

    /* Marshall → Geisel path */
    poly(dim, [
      [-4.2, -1.1], [-3.0, -0.6], [-1.5, -0.2], [0.0, 0.0],
    ])

    /* Muir → center path */
    poly(dim, [
      [-6.7, 4.5], [-5.5, 3.5], [-4.0, 2.5], [-2.5, 1.5],
      [-1.0, 0.8],
    ])

    /* ERC → RIMAC path */
    poly(dim, [
      [-5.9, -5.9], [-4.0, -5.5], [-2.0, -5.7], [0.0, -5.9],
    ])

    /* Revelle → School of Medicine path */
    poly(dim, [
      [-4.5, 8.4], [-3.5, 7.0], [-3.0, 6.0], [-2.5, 5.5],
    ])

    /* Sixth → Price path */
    poly(dim, [
      [3.6, 3.9], [3.0, 3.0], [2.5, 2.2], [2.0, 1.7],
    ])

    /* ══════════════════════════════════════════════
       BUILDINGS — traced from map footprints
       Every shape corresponds to a real structure
       ══════════════════════════════════════════════ */

    /* ── Geisel Library base (hexagonal footprint) ── */
    closedPoly(bright, [
      [-0.45, -0.50], [0.45, -0.50], [0.65, 0.00],
      [0.45, 0.50], [-0.45, 0.50], [-0.65, 0.00],
    ])

    /* ── Center Hall / CLICS (large, SW of Geisel) ── */
    rect(bright, -1.5, 0.4, 1.1, 0.65)

    /* ── AP&M Building (NW of Geisel) ── */
    rect(bright, -0.6, -1.1, 0.9, 0.55)

    /* ── York Hall (W of Geisel) ── */
    rect(bright, -2.1, -0.3, 0.6, 0.45)

    /* ── Urey Hall (between Geisel and AP&M) ── */
    rect(bright, -1.0, -0.7, 0.5, 0.4)

    /* ── Mayer Hall (NW of Geisel) ── */
    rect(bright, -0.5, -1.7, 0.5, 0.4)

    /* ── EBU-I / Jacobs Hall (E of Geisel) ── */
    rect(bright, 1.1, -0.6, 0.8, 0.5)

    /* ── Cognitive Science Bldg (SE of Geisel) ── */
    rect(bright, 1.2, 0.4, 0.7, 0.5)

    /* ── Pepper Canyon Hall (E of Geisel) ── */
    rect(bright, 1.8, -0.1, 0.6, 0.4)

    /* ── Galbraith Hall (S of Geisel) ── */
    rect(bright, 0.0, 1.4, 0.55, 0.4)

    /* ── Peterson Hall (SE of Geisel) ── */
    rect(bright, 0.8, 1.2, 0.5, 0.4)

    /* ── University Center (S of Geisel) ── */
    rect(bright, -0.8, 1.0, 0.75, 0.5)

    /* ── Price Center (L-shaped complex) ── */
    closedPoly(bright, [
      [1.3, 1.3], [2.8, 1.3], [2.8, 1.9], [2.2, 1.9],
      [2.2, 2.3], [1.3, 2.3],
    ])

    /* ── Bookstore (N of Price Center) ── */
    rect(bright, 1.5, 2.5, 0.8, 0.4)

    /* ── Student Services Center (E of Price Center) ── */
    rect(bright, 3.0, 2.0, 0.65, 0.5)

    /* ── Parking Office (SE of Price Center) ── */
    rect(bright, 2.5, 2.6, 0.5, 0.3)

    /* ── Faculty Club (SW of Geisel) ── */
    rect(bright, -2.2, 2.0, 0.8, 0.5)

    /* ── Chancellor's Complex (S of Faculty Club) ── */
    rect(bright, -1.2, 2.5, 0.7, 0.5)

    /* ── Warren College — residential halls (grid of dorms) ── */
    rect(bright, 1.5, -2.5, 0.65, 0.35)
    rect(bright, 2.3, -2.5, 0.65, 0.35)
    rect(bright, 3.0, -2.5, 0.65, 0.35)
    rect(bright, 1.5, -1.9, 0.65, 0.35)
    rect(bright, 2.3, -1.9, 0.65, 0.35)
    rect(bright, 3.0, -1.9, 0.65, 0.35)

    /* ── Warren Lecture Hall ── */
    rect(bright, 2.3, -1.2, 0.85, 0.4)

    /* ── Jacobs School of Engineering (E of center) ── */
    rect(bright, 3.5, -0.5, 0.85, 0.45)
    rect(bright, 3.5, 0.2, 0.7, 0.4)

    /* ── Campus Services Complex (E of Warren) ── */
    rect(bright, 4.6, -1.2, 1.0, 0.6)
    rect(bright, 4.6, -0.4, 0.8, 0.5)

    /* ── Canyonview Athletics (SE of Warren) ── */
    closedPoly(dim, [
      [4.0, 0.2], [6.0, 0.2], [6.0, 1.5], [4.0, 1.5],
    ])

    /* ── RIMAC Arena (large rectangular arena) ── */
    rect(bright, 0.3, -5.9, 2.2, 1.3)

    /* ── Fitness / Fire Course (E of RIMAC) ── */
    rect(bright, 2.2, -5.2, 0.8, 0.55)

    /* ── North Recreation Park field outline ── */
    closedPoly(dim, [
      [-0.5, -7.5], [1.5, -7.5], [1.5, -6.8], [-0.5, -6.8],
    ])

    /* ── Eleanor Roosevelt College buildings ── */
    rect(bright, -6.1, -6.2, 0.9, 0.55)
    rect(bright, -5.3, -6.4, 0.7, 0.4)
    rect(bright, -5.3, -5.6, 0.75, 0.4)
    rect(bright, -6.6, -5.4, 0.6, 0.5)

    /* ── Institute of the Americas / IR&PS (W of ERC) ── */
    rect(bright, -6.9, -5.0, 0.8, 0.5)

    /* ── Pacific Hall (near ERC) ── */
    rect(bright, -5.5, -4.8, 0.6, 0.4)

    /* ── San Diego Supercomputer Center ── */
    rect(bright, -3.8, -4.5, 1.1, 0.65)

    /* ── Hopkins Parking Structure ── */
    rect(normal, -2.8, -3.5, 0.95, 0.55)

    /* ── Thurgood Marshall College buildings ── */
    rect(bright, -4.5, -1.5, 0.75, 0.5)
    rect(bright, -4.5, -0.7, 0.7, 0.4)
    rect(bright, -3.7, -1.2, 0.6, 0.75)
    rect(bright, -5.0, -0.1, 0.65, 0.5)

    /* ── Cognitive Studies / Public Programs (W of Marshall) ── */
    rect(bright, -5.8, -0.5, 0.7, 0.5)

    /* ── Marshall College field outline ── */
    closedPoly(dim, [
      [-5.5, 0.4], [-3.5, 0.4], [-3.5, 1.7], [-5.5, 1.7],
    ])

    /* ── Muir College buildings ── */
    rect(bright, -7.0, 3.8, 0.7, 0.5)
    rect(bright, -6.3, 4.2, 0.7, 0.5)
    rect(bright, -7.0, 4.8, 0.7, 0.4)
    rect(bright, -6.0, 5.0, 0.65, 0.4)

    /* ── Muir Student Center ── */
    rect(bright, -5.8, 3.8, 0.5, 0.4)

    /* ── Muir Field outline ── */
    closedPoly(dim, [
      [-7.6, 4.0], [-5.5, 4.0], [-5.5, 5.5], [-7.6, 5.5],
    ])

    /* ── Mandeville Center (performing arts, near Muir) ── */
    rect(bright, -5.2, 3.0, 0.85, 0.5)

    /* ── Visual Arts (W campus) ── */
    rect(bright, -5.5, 2.0, 0.7, 0.5)

    /* ── Sixth College buildings ── */
    rect(bright, 3.3, 3.5, 0.7, 0.45)
    rect(bright, 4.1, 3.5, 0.7, 0.45)
    rect(bright, 3.3, 4.2, 0.7, 0.45)
    rect(bright, 4.1, 4.2, 0.7, 0.45)

    /* ── Pepper Canyon Apartments (S of Sixth) ── */
    rect(bright, 4.0, 4.9, 0.7, 0.4)

    /* ── Gilman Parking Structure ── */
    rect(normal, 1.5, 3.5, 0.85, 0.5)

    /* ── Seventh College buildings ── */
    rect(bright, 4.8, -4.5, 0.7, 0.5)
    rect(bright, 5.5, -4.5, 0.7, 0.5)
    rect(bright, 5.1, -3.7, 0.8, 0.4)

    /* ── Eighth College buildings ── */
    rect(bright, -2.2, -7.2, 0.7, 0.5)
    rect(bright, -1.4, -7.2, 0.7, 0.5)
    rect(bright, -1.8, -6.5, 0.8, 0.4)

    /* ── Revelle College buildings ── */
    rect(bright, -4.8, 8.0, 0.7, 0.5)
    rect(bright, -4.0, 8.0, 0.7, 0.5)
    rect(bright, -4.8, 8.7, 0.7, 0.4)
    rect(bright, -3.8, 8.7, 0.7, 0.4)
    rect(bright, -5.0, 9.3, 0.6, 0.4)

    /* ── Mandell Weiss Forum (S of Revelle) ── */
    rect(bright, -4.5, 10.0, 0.65, 0.5)

    /* ── Mandell Weiss Theatre ── */
    rect(bright, -4.5, 10.7, 0.8, 0.5)

    /* ── Theatre District buildings ── */
    rect(bright, -3.5, 10.0, 0.7, 0.5)

    /* ── School of Medicine complex ── */
    rect(bright, -2.5, 6.0, 1.0, 0.6)
    rect(bright, -1.5, 6.5, 0.8, 0.5)
    rect(bright, -3.0, 7.0, 0.7, 0.45)
    rect(bright, -1.8, 7.2, 0.6, 0.4)

    /* ── VA Medical Center ── */
    rect(bright, 2.0, 6.0, 0.9, 0.6)
    rect(bright, 3.0, 6.4, 0.8, 0.5)

    /* ── Sequoyah Hall (between SoM and center) ── */
    rect(bright, -3.0, 5.0, 0.7, 0.5)

    /* ── Medical Education / Biomedical Library ── */
    rect(bright, -1.0, 5.5, 0.6, 0.45)
    rect(bright, 0.5, -1.5, 0.6, 0.45)

    /* ── Rady School of Management (far NW) ── */
    rect(bright, -6.8, -8.0, 1.0, 0.65)
    rect(bright, -5.8, -7.5, 0.7, 0.5)

    /* ── North Campus Housing ── */
    rect(bright, -3.0, -7.5, 0.8, 0.5)
    rect(bright, -2.0, -7.8, 0.7, 0.4)

    /* ── Humanities / Social Sciences (S of center) ── */
    rect(bright, -2.5, 1.5, 0.7, 0.5)
    rect(bright, -1.5, 1.2, 0.6, 0.4)

    return { bright, normal, dim }
  }, [])

  const lines = useMemo(() => {
    const compute = segs => segs.map(([from, to]) => {
      const dx = to[0] - from[0], dz = to[1] - from[1]
      return {
        cx: (from[0] + to[0]) / 2,
        cz: (from[1] + to[1]) / 2,
        len: Math.sqrt(dx * dx + dz * dz),
        rot: Math.atan2(dx, dz),
      }
    })
    return {
      bright: compute(segments.bright),
      normal: compute(segments.normal),
      dim: compute(segments.dim),
    }
  }, [segments])

  return (
    <group>
      {/* Bright lines — perimeter + building outlines */}
      {lines.bright.map((l, i) => (
        <group key={`b-${i}`}>
          <mesh position={[l.cx, 0.04, l.cz]} rotation={[0, l.rot, 0]}>
            <boxGeometry args={[0.032, 0.018, l.len]} />
            <meshStandardMaterial {...EDGE_MAT_PROPS} />
          </mesh>
          <mesh position={[l.cx, 0.04, l.cz]} rotation={[0, l.rot, 0]}>
            <boxGeometry args={[0.08, 0.010, l.len]} />
            <meshStandardMaterial
              color={ACCENT} emissive={ACCENT} emissiveIntensity={0.5}
              transparent opacity={0.20} toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Normal lines — roads + scattered buildings */}
      {lines.normal.map((l, i) => (
        <group key={`n-${i}`}>
          <mesh position={[l.cx, 0.035, l.cz]} rotation={[0, l.rot, 0]}>
            <boxGeometry args={[0.026, 0.015, l.len]} />
            <meshStandardMaterial {...EDGE_MAT_PROPS} />
          </mesh>
          <mesh position={[l.cx, 0.035, l.cz]} rotation={[0, l.rot, 0]}>
            <boxGeometry args={[0.065, 0.008, l.len]} />
            <meshStandardMaterial
              color={ACCENT} emissive={ACCENT} emissiveIntensity={0.4}
              transparent opacity={0.15} toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Dim lines — paths */}
      {lines.dim.map((l, i) => (
        <mesh key={`d-${i}`} position={[l.cx, 0.03, l.cz]} rotation={[0, l.rot, 0]}>
          <boxGeometry args={[0.018, 0.012, l.len]} />
          <meshStandardMaterial {...DIM_EDGE_PROPS} />
        </mesh>
      ))}
    </group>
  )
}

/* ═══════════════════════════════════════════════
   Abstract holographic campus building
   ═══════════════════════════════════════════════ */

function CampusBuilding({ landmark, selected, onSelect }) {
  const { id, x, z, w, d, h, isGeisel, name } = landmark
  const groupRef = useRef()
  const [hovered, setHovered] = useState(false)
  const bobOffset = useMemo(() => x * 1.7 + z * 0.9, [x, z])

  useFrame(({ clock }) => {
    if (groupRef.current && !isGeisel) {
      groupRef.current.position.y = h / 2 + 0.06 + Math.sin(clock.elapsedTime * 1.2 + bobOffset) * 0.015
    }
  })

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onSelect(id)
  }, [onSelect, id])

  if (isGeisel) {
    return (
      <group position={[x, 0.06, z]}>
        <group scale={[GEISEL_SCALE, GEISEL_SCALE, GEISEL_SCALE]}>
          <GeiselModel />
        </group>

        {/* Holographic projection beams — vertical lines from base to grid */}
        {[0, 1, 2, 3, 4, 5].map(i => {
          const a = (i * Math.PI) / 3
          const r = 0.55
          return (
            <mesh key={`proj-${i}`} position={[r * Math.sin(a), -0.02, r * Math.cos(a)]}>
              <cylinderGeometry args={[0.008, 0.003, 0.12, 4]} />
              <meshStandardMaterial
                color={ACCENT} emissive={ACCENT} emissiveIntensity={1.2}
                transparent opacity={0.25} toneMapped={false}
              />
            </mesh>
          )
        })}

        {/* Central projection beam */}
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.015, 0.006, 0.12, 6]} />
          <meshStandardMaterial
            color={ACCENT} emissive={ACCENT} emissiveIntensity={1.5}
            transparent opacity={0.30} toneMapped={false}
          />
        </mesh>

        {/* Base glow ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.50, 0.65, 32]} />
          <meshStandardMaterial
            color={ACCENT} emissive={ACCENT} emissiveIntensity={1.5}
            transparent opacity={0.12} toneMapped={false} side={THREE.DoubleSide}
          />
        </mesh>

        {/* Invisible click target */}
        <mesh onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <cylinderGeometry args={[1, 1, 1.2, 8]} />
          <meshStandardMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.9, 1.05, 32]} />
            <meshStandardMaterial
              color={ACCENT} emissive={ACCENT} emissiveIntensity={2.5}
              transparent opacity={0.45} toneMapped={false} side={THREE.DoubleSide}
            />
          </mesh>
        )}
        {/* Vertical beam */}
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.7, 4]} />
          <meshStandardMaterial
            color={ACCENT} emissive={ACCENT} emissiveIntensity={1}
            transparent opacity={selected ? 0.5 : 0.2} toneMapped={false}
          />
        </mesh>
        {/* Marker sphere */}
        <mesh position={[0, 1.35, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial
            color={ACCENT} emissive={ACCENT}
            emissiveIntensity={selected ? 3 : 1.5} toneMapped={false}
          />
        </mesh>
        <pointLight position={[0, 1.35, 0]} color={ACCENT} intensity={selected ? 0.8 : 0.2} distance={3} />
        <Html center position={[0, 1.65, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
            textShadow: '0 0 10px rgba(255,45,45,0.5)',
            opacity: selected || hovered ? 1 : 0.7,
          }}>{name}</div>
        </Html>
      </group>
    )
  }

  if (id === 'libwalk') {
    return (
      <group position={[x, 0.02, z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial
            color={ACCENT} emissive={ACCENT} emissiveIntensity={0.6}
            transparent opacity={0.08} toneMapped={false} side={THREE.DoubleSide}
          />
        </mesh>
        <Html center position={[0, 0.4, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 9, fontWeight: 500, whiteSpace: 'nowrap',
            textShadow: '0 0 8px rgba(255,45,45,0.3)', opacity: 0.5,
          }}>{name}</div>
        </Html>
      </group>
    )
  }

  const ringR = Math.max(w, d) * 0.65

  return (
    <group ref={groupRef} position={[x, h / 2 + 0.06, z]}>
      {/* Solid fill */}
      <mesh onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={ACCENT} transparent
          opacity={selected ? 0.14 : hovered ? 0.08 : 0.04}
          metalness={0.85} roughness={0.15}
        />
      </mesh>
      {/* Wireframe */}
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={ACCENT} wireframe transparent
          opacity={selected ? 0.7 : hovered ? 0.45 : 0.25}
        />
      </mesh>

      {/* Selection ring */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -h / 2 + 0.01, 0]}>
          <ringGeometry args={[ringR, ringR + 0.12, 32]} />
          <meshStandardMaterial
            color={ACCENT} emissive={ACCENT} emissiveIntensity={2.5}
            transparent opacity={0.45} toneMapped={false} side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Vertical beam */}
      <mesh position={[0, h / 2 + 0.3, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.6, 4]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT} emissiveIntensity={1}
          transparent opacity={selected ? 0.5 : 0.2} toneMapped={false}
        />
      </mesh>
      {/* Marker sphere */}
      <mesh position={[0, h / 2 + 0.65, 0]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT}
          emissiveIntensity={selected ? 3 : 1.5} toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, h / 2 + 0.65, 0]} color={ACCENT} intensity={selected ? 0.6 : 0.15} distance={2.5} />

      {/* Label */}
      <Html center position={[0, h / 2 + 0.9, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{
          color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
          textShadow: '0 0 8px rgba(255,45,45,0.4)',
          opacity: selected || hovered ? 1 : 0.6,
        }}>{name}</div>
      </Html>
    </group>
  )
}

/* ═══════════════════════════════════════════════
   Path connector between two selected locations
   ═══════════════════════════════════════════════ */

function RouteLine({ origin, destination }) {
  const geo = useMemo(() => {
    if (!origin || !destination) return null
    const o = LANDMARKS.find(l => l.id === origin)
    const d = LANDMARKS.find(l => l.id === destination)
    if (!o || !d) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      o.x, 0.06, o.z, d.x, 0.06, d.z,
    ], 3))
    return g
  }, [origin, destination])

  if (!geo) return null

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={ACCENT} transparent opacity={0.35} />
    </lineSegments>
  )
}

/* ═══════════════════════════════════════════════
   Campus camera — bird's-eye orbit + transition
   ═══════════════════════════════════════════════ */

function CampusCamera({ origin, destination, onTransitionDone }) {
  const { camera } = useThree()
  const angle = useRef(0)
  const phase = useRef('orbit')
  const t0 = useRef(null)
  const startPos = useRef(new THREE.Vector3())
  const targetPos = useRef(new THREE.Vector3())
  const startLook = useRef(new THREE.Vector3())
  const targetLook = useRef(new THREE.Vector3())
  const prevOrigin = useRef(null)
  const prevDest = useRef(null)

  useFrame(({ clock }) => {
    const hasRoute = origin && destination

    if (hasRoute && phase.current === 'orbit') {
      phase.current = 'transitioning'
      t0.current = clock.elapsedTime
      startPos.current.copy(camera.position)
      startLook.current.set(0, 0, 0)

      const o = LANDMARKS.find(l => l.id === origin)
      const d = LANDMARKS.find(l => l.id === destination)
      const mx = (o.x + d.x) / 2
      const mz = (o.z + d.z) / 2
      const dx = d.x - o.x, dz = d.z - o.z
      const dist = Math.max(Math.sqrt(dx * dx + dz * dz), 1)
      const px = -dz / dist, pz = dx / dist

      targetPos.current.set(mx + px * dist * 0.8, dist * 0.45 + 4, mz + pz * dist * 0.8)
      targetLook.current.set(mx, 0.3, mz)

      prevOrigin.current = origin
      prevDest.current = destination
    }

    if (!hasRoute && phase.current !== 'orbit') {
      phase.current = 'resetting'
      t0.current = clock.elapsedTime
      startPos.current.copy(camera.position)
      const curLook = targetLook.current.clone()
      startLook.current.copy(curLook)
      const a = angle.current
      targetPos.current.set(Math.sin(a) * 32, 26, Math.cos(a) * 32)
      targetLook.current.set(0, 0, 0)
    }

    if (phase.current === 'transitioning') {
      const raw = Math.min(1, (clock.elapsedTime - t0.current) / 1.5)
      const t = easeInOutCubic(raw)
      camera.position.lerpVectors(startPos.current, targetPos.current, t)
      const look = new THREE.Vector3().lerpVectors(startLook.current, targetLook.current, t)
      camera.lookAt(look)
      if (raw >= 1) {
        phase.current = 'focused'
        onTransitionDone()
      }
      return
    }

    if (phase.current === 'resetting') {
      const raw = Math.min(1, (clock.elapsedTime - t0.current) / 1.2)
      const t = easeInOutCubic(raw)
      camera.position.lerpVectors(startPos.current, targetPos.current, t)
      const look = new THREE.Vector3().lerpVectors(startLook.current, targetLook.current, t)
      camera.lookAt(look)
      if (raw >= 1) phase.current = 'orbit'
      return
    }

    if (phase.current === 'focused') {
      camera.lookAt(targetLook.current)
      return
    }

    angle.current += 0.0010
    camera.position.set(
      Math.sin(angle.current) * 32,
      26,
      Math.cos(angle.current) * 32
    )
    camera.lookAt(0, 0, 0)
  })

  return null
}

/* ═══════════════════════════════════════════════
   Campus lighting
   ═══════════════════════════════════════════════ */

function CampusLighting() {
  return (
    <>
      <ambientLight intensity={0.20} color="#aaccff" />
      <directionalLight position={[12, 18, 10]} intensity={0.55} color="#ddeeff" />
      <spotLight position={[0, 24, 0]} angle={0.45} penumbra={0.9} intensity={0.8} color="#220808" />
      <pointLight position={[0, 0.5, 0]} color={ACCENT} intensity={0.4} distance={20} decay={2} />
    </>
  )
}

/* ═══════════════════════════════════════════════
   Campus scene content
   ═══════════════════════════════════════════════ */

function CampusSceneContent({ origin, destination, onBuildingClick, onTransitionDone }) {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 35, 65]} />
      <CampusLighting />
      <CampusCamera origin={origin} destination={destination} onTransitionDone={onTransitionDone} />
      <CampusGrid />
      <CampusWireframe />
      <RouteLine origin={origin} destination={destination} />
      {LANDMARKS.map(lm => (
        <CampusBuilding
          key={lm.id}
          landmark={lm}
          selected={lm.id === origin || lm.id === destination}
          onSelect={onBuildingClick}
        />
      ))}
    </>
  )
}

/* ═══════════════════════════════════════════════
   Stats panel — floating Apple-style glass card
   ═══════════════════════════════════════════════ */

function StatsPanel({ origin, destination, visible }) {
  if (!origin || !destination) return null
  const o = LANDMARKS.find(l => l.id === origin)
  const d = LANDMARKS.find(l => l.id === destination)
  if (!o || !d) return null

  const dx = (d.x - o.x) * METERS_PER_UNIT
  const dz = (d.z - o.z) * METERS_PER_UNIT
  const distM = Math.round(Math.sqrt(dx * dx + dz * dz))
  const walkMin = (distM / 1.4 / 60).toFixed(1)
  const bikeMin = (distM / 5 / 60).toFixed(1)
  const timeSaved = (distM / 1.4 / 60 - distM / 5 / 60).toFixed(1)

  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '11px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  }
  const labelStyle = { fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.40)' }
  const valueStyle = { fontSize: 14, fontWeight: 700, color: '#fff' }
  const accentVal = { ...valueStyle, color: ACCENT }

  return (
    <div style={{
      position: 'absolute', bottom: 40, right: 40, zIndex: 40, width: 330,
      background: 'linear-gradient(165deg, rgba(25,25,30,0.93) 0%, rgba(10,10,14,0.96) 100%)',
      border: '1px solid rgba(255,45,45,0.12)',
      borderRadius: 24, padding: '28px 26px',
      color: '#fff',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      boxShadow: '0 24px 64px rgba(0,0,0,0.65), 0 0 50px rgba(255,45,45,0.05)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.96)',
      transition: 'opacity 0.8s cubic-bezier(.4,0,.2,1), transform 0.8s cubic-bezier(.4,0,.2,1)',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,45,45,0.25), transparent)',
      }} />

      <div style={{
        fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.28)',
        textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 18,
      }}>
        Route Analysis
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{o.name}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', marginBottom: 20 }}>→ {d.name}</div>

      <div style={rowStyle}>
        <span style={labelStyle}>Distance</span>
        <span style={valueStyle}>{distM}m</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Walking Time</span>
        <span style={valueStyle}>{walkMin} min</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Time Saved Using NomNom</span>
        <span style={accentVal}>{timeSaved} min</span>
      </div>
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <span style={labelStyle}>Potential Earnings (Batch ×3)</span>
        <span style={accentVal}>$9</span>
      </div>

      <div style={{
        marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.22)',
        textAlign: 'center', letterSpacing: '0.02em',
      }}>
        Single order: $3 · Batch of 3: $9
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Campus HUD overlay
   ═══════════════════════════════════════════════ */

function CampusHUD({ origin, destination }) {
  const base = {
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.10em',
    fontSize: 10,
    fontWeight: 500,
  }

  const prompt = !origin
    ? 'Select an origin location'
    : !destination
      ? 'Now select a destination'
      : null

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
      {/* Top left branding */}
      <div style={{ position: 'absolute', top: 28, left: 32, ...base }}>
        <div style={{
          fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em',
        }}>NOMNOM</div>
        <div style={{ marginTop: 4 }}>CAMPUS MAP</div>
      </div>

      {/* Top right coordinates */}
      <div style={{ position: 'absolute', top: 28, right: 32, textAlign: 'right', ...base }}>
        <div>32.8801° N</div>
        <div style={{ marginTop: 2 }}>117.2340° W</div>
      </div>

      {/* Bottom center prompt */}
      {prompt && (
        <div style={{
          position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)',
          fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.40)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          letterSpacing: '0.03em',
          padding: '10px 24px', borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>{prompt}</div>
      )}

      {/* Reset hint when both selected */}
      {origin && destination && (
        <div style={{
          position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)',
          fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.25)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          letterSpacing: '0.04em',
        }}>Click any building to reset</div>
      )}

      {/* Scan line */}
      <div style={{
        position: 'absolute', bottom: 28, right: 32,
        width: 60, height: 2, background: 'rgba(255,255,255,0.12)',
        borderRadius: 1, overflow: 'hidden',
      }}>
        <div className="hud-scan-line" style={{
          width: '40%', height: '100%', background: ACCENT, borderRadius: 1,
        }} />
      </div>

      {/* Bottom left campus label */}
      <div style={{
        position: 'absolute', bottom: 28, left: 32,
        textTransform: 'uppercase', ...base,
      }}>
        UCSD Campus · San Diego, CA
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Injected keyframes
   ═══════════════════════════════════════════════ */

function InjectKeyframes() {
  return (
    <style>{`
      @keyframes hudScan {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(250%); }
      }
      .hud-scan-line {
        animation: hudScan 2.4s ease-in-out infinite;
      }
    `}</style>
  )
}

/* ═══════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════ */

export default function HeroScene() {
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)
  const [showStats, setShowStats] = useState(false)

  const handleBuildingClick = useCallback((id) => {
    if (id === 'libwalk') return
    if (!origin) {
      setOrigin(id)
    } else if (!destination && id !== origin) {
      setDestination(id)
    } else {
      setOrigin(null)
      setDestination(null)
      setShowStats(false)
    }
  }, [origin, destination])

  const handleTransitionDone = useCallback(() => {
    setShowStats(true)
  }, [])

  return (
    <>
      <InjectKeyframes />
      <div style={{
        width: '100%', height: '100vh',
        position: 'relative', overflow: 'hidden',
        background: '#000',
      }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 26, 32], fov: 42, near: 0.1, far: 200 }}
            style={{ width: '100%', height: '100%' }}
          >
            <CampusSceneContent
              origin={origin}
              destination={destination}
              onBuildingClick={handleBuildingClick}
              onTransitionDone={handleTransitionDone}
            />
          </Canvas>
        </div>

        <CampusHUD origin={origin} destination={destination} />
        <StatsPanel origin={origin} destination={destination} visible={showStats} />
      </div>
    </>
  )
}
