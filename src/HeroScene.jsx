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

function GeiselGLB() {
  const { scene } = useGLTF('/models/geisel.glb')
  return <primitive object={scene} />
}

/* ═══════════════════════════════════════════════
   Procedural Geisel — futuristic glass + metal
   ═══════════════════════════════════════════════ */

const EDGE_MAT_PROPS = { color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.8, toneMapped: false }
const DIM_EDGE_PROPS = { color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.9, toneMapped: false, transparent: true, opacity: 0.5 }
const STRUT_MAT_PROPS = { color: '#1e2e3e', metalness: 0.95, roughness: 0.12 }

function hexEdgeSegments(radius) {
  const edges = []
  for (let i = 0; i < 6; i++) {
    const a1 = (i * Math.PI) / 3
    const a2 = ((i + 1) * Math.PI) / 3
    const x1 = radius * Math.sin(a1), z1 = radius * Math.cos(a1)
    const x2 = radius * Math.sin(a2), z2 = radius * Math.cos(a2)
    const dx = x2 - x1, dz = z2 - z1
    edges.push({
      cx: (x1 + x2) / 2,
      cz: (z1 + z2) / 2,
      len: Math.sqrt(dx * dx + dz * dz),
      rot: Math.atan2(dx, dz),
    })
  }
  return edges
}

function ColumnStrut({ from, to, radius = 0.07 }) {
  const { pos, quat, len } = useMemo(() => {
    const f = new THREE.Vector3(...from)
    const t = new THREE.Vector3(...to)
    return {
      pos: f.clone().add(t).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        t.clone().sub(f).normalize()
      ),
      len: f.distanceTo(t),
    }
  }, [from, to])

  return (
    <group position={pos} quaternion={quat}>
      <mesh>
        <cylinderGeometry args={[radius * 0.7, radius, len, 6]} />
        <meshStandardMaterial {...STRUT_MAT_PROPS} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[radius * 0.72, radius * 1.02, len * 1.002, 6]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT} emissiveIntensity={0.7}
          wireframe toneMapped={false} transparent opacity={0.35}
        />
      </mesh>
    </group>
  )
}

function GlowStrut({ from, to, radius = 0.025 }) {
  const { pos, quat, len } = useMemo(() => {
    const f = new THREE.Vector3(...from)
    const t = new THREE.Vector3(...to)
    return {
      pos: f.clone().add(t).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        t.clone().sub(f).normalize()
      ),
      len: f.distanceTo(t),
    }
  }, [from, to])

  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[radius, radius, len, 4]} />
      <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.2} toneMapped={false} />
    </mesh>
  )
}

function ProceduralGeisel() {
  const g = useRef()

  useFrame(({ clock }) => {
    if (g.current) g.current.position.y = Math.sin(clock.elapsedTime * 0.3) * 0.04
  })

  const tiers = useMemo(() => [
    { r: 1.55, y: 1.94, h: 0.22 },
    { r: 2.00, y: 2.39, h: 0.22 },
    { r: 2.45, y: 2.84, h: 0.22 },
    { r: 2.90, y: 3.29, h: 0.22 },
    { r: 3.30, y: 3.74, h: 0.22 },
    { r: 3.65, y: 4.19, h: 0.22 },
  ], [])

  const tierEdges = useMemo(
    () => tiers.map(t => hexEdgeSegments(t.r)),
    [tiers]
  )

  const outerColumns = useMemo(() => {
    const cols = []
    const baseR = 1.80, topR = 1.55, baseY = 0.12, topY = 1.81
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6
      cols.push({
        from: [baseR * Math.sin(angle), baseY, baseR * Math.cos(angle)],
        to:   [topR  * Math.sin(angle), topY,  topR  * Math.cos(angle)],
      })
    }
    return cols
  }, [])

  const innerColumns = useMemo(() => {
    const cols = []
    const baseR = 0.70, topR = 0.65, baseY = 0.12, topY = 1.81
    for (let i = 0; i < 6; i++) {
      const angle = (i + 0.5) * Math.PI / 3
      cols.push({
        from: [baseR * Math.sin(angle), baseY, baseR * Math.cos(angle)],
        to:   [topR  * Math.sin(angle), topY,  topR  * Math.cos(angle)],
      })
    }
    return cols
  }, [])

  const vBeams = useMemo(() => {
    const beams = []
    for (let ti = 0; ti < tiers.length - 1; ti++) {
      const lo = tiers[ti], hi = tiers[ti + 1]
      const loTopY = lo.y + lo.h / 2
      const hiBotY = hi.y - hi.h / 2
      for (let j = 0; j < 6; j++) {
        const aL = (j * Math.PI) / 3
        const aR = ((j + 1) * Math.PI) / 3
        const aMid = ((j + 0.5) * Math.PI) / 3
        const apex = [lo.r * Math.sin(aMid), loTopY, lo.r * Math.cos(aMid)]
        beams.push(
          { from: apex, to: [hi.r * Math.sin(aL), hiBotY, hi.r * Math.cos(aL)] },
          { from: apex, to: [hi.r * Math.sin(aR), hiBotY, hi.r * Math.cos(aR)] },
        )
      }
    }
    return beams
  }, [tiers])

  const vertexStruts = useMemo(() => {
    const struts = []
    for (let ti = 0; ti < tiers.length - 1; ti++) {
      const lo = tiers[ti], hi = tiers[ti + 1]
      const loTopY = lo.y + lo.h / 2
      const hiBotY = hi.y - hi.h / 2
      for (let j = 0; j < 6; j++) {
        const a = (j * Math.PI) / 3
        struts.push({
          from: [lo.r * Math.sin(a), loTopY, lo.r * Math.cos(a)],
          to:   [hi.r * Math.sin(a), hiBotY, hi.r * Math.cos(a)],
        })
      }
    }
    return struts
  }, [tiers])

  const roofEdges = useMemo(() => hexEdgeSegments(3.45), [])
  const baseEdges = useMemo(() => hexEdgeSegments(2.50), [])

  return (
    <group ref={g}>
      {/* ── Wide base platform (plaza foundation) ── */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[2.50, 2.50, 0.08, 6]} />
        <meshStandardMaterial color="#0c0c1a" metalness={0.85} roughness={0.25} />
      </mesh>
      {baseEdges.map((e, i) => (
        <mesh key={`base-${i}`} position={[e.cx, 0.08, e.cz]} rotation={[0, e.rot, 0]}>
          <boxGeometry args={[0.022, 0.014, e.len]} />
          <meshStandardMaterial {...EDGE_MAT_PROPS} />
        </mesh>
      ))}

      {/* ── 12 outer support columns (wide perimeter, NOT converging) ── */}
      {outerColumns.map((c, i) => (
        <ColumnStrut key={`oc-${i}`} from={c.from} to={c.to} radius={0.10} />
      ))}

      {/* ── 6 inner support columns (nearly vertical) ── */}
      {innerColumns.map((c, i) => (
        <ColumnStrut key={`ic-${i}`} from={c.from} to={c.to} radius={0.07} />
      ))}

      {/* ── Hexagonal floor tiers — inverted pyramid ── */}
      {tiers.map((t, ti) => (
        <group key={`tier-${ti}`}>
          <mesh position={[0, t.y, 0]}>
            <cylinderGeometry args={[t.r, t.r, t.h, 6]} />
            <meshPhysicalMaterial
              color="#152535" metalness={0.25} roughness={0.08}
              transparent opacity={0.55}
            />
          </mesh>

          {/* Top perimeter edge glow */}
          {tierEdges[ti].map((e, ei) => (
            <mesh key={`top-${ei}`} position={[e.cx, t.y + t.h / 2, e.cz]} rotation={[0, e.rot, 0]}>
              <boxGeometry args={[0.026, 0.016, e.len]} />
              <meshStandardMaterial {...EDGE_MAT_PROPS} />
            </mesh>
          ))}

          {/* Bottom perimeter edge glow */}
          {tierEdges[ti].map((e, ei) => (
            <mesh key={`bot-${ei}`} position={[e.cx, t.y - t.h / 2, e.cz]} rotation={[0, e.rot, 0]}>
              <boxGeometry args={[0.026, 0.016, e.len]} />
              <meshStandardMaterial {...EDGE_MAT_PROPS} />
            </mesh>
          ))}

          {/* Mid-height window band line */}
          {tierEdges[ti].map((e, ei) => (
            <mesh key={`mid-${ei}`} position={[e.cx, t.y, e.cz]} rotation={[0, e.rot, 0]}>
              <boxGeometry args={[0.018, 0.010, e.len]} />
              <meshStandardMaterial {...DIM_EDGE_PROPS} />
            </mesh>
          ))}

          {/* Vertical corner edges */}
          {Array.from({ length: 6 }).map((_, vi) => {
            const a = (vi * Math.PI) / 3
            return (
              <mesh key={`v-${vi}`} position={[t.r * Math.sin(a), t.y, t.r * Math.cos(a)]}>
                <boxGeometry args={[0.016, t.h, 0.016]} />
                <meshStandardMaterial {...EDGE_MAT_PROPS} />
              </mesh>
            )
          })}
        </group>
      ))}

      {/* ── V-shaped structural beams between tiers ── */}
      {vBeams.map((b, i) => (
        <GlowStrut key={`vb-${i}`} from={b.from} to={b.to} />
      ))}

      {/* ── Vertex-to-vertex framing struts between tiers ── */}
      {vertexStruts.map((s, i) => (
        <GlowStrut key={`vs-${i}`} from={s.from} to={s.to} radius={0.018} />
      ))}

      {/* ── Roof cap ── */}
      <mesh position={[0, 4.39, 0]}>
        <cylinderGeometry args={[3.45, 3.45, 0.06, 6]} />
        <meshStandardMaterial color="#1e2e3e" metalness={0.60} roughness={0.10} />
      </mesh>
      {roofEdges.map((e, i) => (
        <mesh key={`roof-${i}`} position={[e.cx, 4.42, e.cz]} rotation={[0, e.rot, 0]}>
          <boxGeometry args={[0.026, 0.016, e.len]} />
          <meshStandardMaterial {...EDGE_MAT_PROPS} />
        </mesh>
      ))}

      {/* Inner glow */}
      <pointLight position={[0, 2.90, 0]} color={ACCENT} intensity={3} distance={8} decay={2} />
    </group>
  )
}

function GeiselModel() {
  return <ProceduralGeisel />
}

/* ═══════════════════════════════════════════════
   Campus landmarks — approximate UCSD positions
   1 unit ≈ 50 meters
   ═══════════════════════════════════════════════ */

const MAP_W = 34, MAP_H = 19.7
const METERS_PER_UNIT = 60
const GEISEL_SCALE = 0.28

const LANDMARKS = [
  { id: 'geisel',   name: 'Geisel Library',    x: -3.0,  z:  0.0,  w: 0, d: 0, h: 0, isGeisel: true },
  { id: 'price',    name: 'Price Center',       x: -1.5,  z: -1.2,  w: 2.4, d: 1.6, h: 0.85 },
  { id: 'sixth',    name: 'Sixth College',      x:  2.0,  z: -2.5,  w: 1.8, d: 1.5, h: 0.70 },
  { id: 'seventh',  name: 'Seventh College',    x:  4.5,  z:  1.5,  w: 1.8, d: 1.3, h: 0.65 },
  { id: 'eighth',   name: 'Eighth College',     x:  0.5,  z:  6.5,  w: 1.5, d: 1.3, h: 0.60 },
  { id: 'rimac',    name: 'RIMAC',              x: -2.0,  z:  5.5,  w: 2.8, d: 1.8, h: 1.00 },
  { id: 'revelle',  name: 'Revelle College',    x: -5.5,  z: -7.5,  w: 1.8, d: 1.5, h: 0.70 },
  { id: 'muir',     name: 'Muir College',       x: -7.5,  z: -2.5,  w: 1.6, d: 1.3, h: 0.60 },
  { id: 'marshall', name: 'Marshall College',    x: -7.5,  z:  2.0,  w: 1.8, d: 1.5, h: 0.70 },
  { id: 'erc',      name: 'ERC',                x: -9.5,  z:  5.5,  w: 1.8, d: 1.3, h: 0.65 },
  { id: 'warren',   name: 'Warren College',     x:  0.0,  z:  2.5,  w: 1.8, d: 1.3, h: 0.65 },
  { id: 'libwalk',  name: 'Library Walk',       x: -1.5,  z: -0.5,  w: 0.15, d: 4, h: 0.02 },
]

const DINING_HALLS = [
  { id: 'dh-64deg',   name: '64 Degrees',       x: -5.0,  z: -7.0 },
  { id: 'dh-pines',   name: 'Pines',            x: -7.0,  z: -2.0 },
  { id: 'dh-canyon',   name: 'Canyon Vista',     x:  0.5,  z:  2.0 },
  { id: 'dh-sixth',   name: 'Sixth Dining',     x:  2.5,  z: -2.0 },
  { id: 'dh-ocean',   name: 'OceanView',        x:  0.0,  z: -1.5 },
  { id: 'dh-bistro',  name: 'Bistro',           x: -7.0,  z:  2.5 },
]

const ALL_LOCATIONS = [...LANDMARKS, ...DINING_HALLS]

/* ═══════════════════════════════════════════════
   Holographic campus grid
   ═══════════════════════════════════════════════ */

function CampusGrid() {
  const campusTex = useMemo(() => {
    const tex = new THREE.TextureLoader().load('/campus-aerial.png')
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])

  const scanTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 4, 512)
    for (let y = 0; y < 512; y += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.09)'
      ctx.fillRect(0, y, 4, 1)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(1, 50)
    return tex
  }, [])

  const gridGeo = useMemo(() => {
    const pts = []
    const half = 21
    for (let i = -half; i <= half; i++) {
      pts.push(-half, 0, i, half, 0, i)
      pts.push(i, 0, -half, i, 0, half)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])

  const borderGeo = useMemo(() => {
    const hw = MAP_W / 2, hh = MAP_H / 2
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      -hw, 0.02, -hh,  hw, 0.02, -hh,
       hw, 0.02, -hh,  hw, 0.02,  hh,
       hw, 0.02,  hh, -hw, 0.02,  hh,
      -hw, 0.02,  hh, -hw, 0.02, -hh,
    ], 3))
    return g
  }, [])

  return (
    <group>
      {/* Background grid — slightly larger than map */}
      <lineSegments geometry={gridGeo}>
        <lineBasicMaterial color={ACCENT} transparent opacity={0.05} />
      </lineSegments>

      {/* Satellite image plane — red-tinted holographic projection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[MAP_W, MAP_H]} />
        <meshStandardMaterial
          map={campusTex}
          color="#ff4444"
          transparent opacity={0.38}
          emissive="#ff1515"
          emissiveIntensity={0.03}
        />
      </mesh>

      {/* Scanline overlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]}>
        <planeGeometry args={[MAP_W, MAP_H]} />
        <meshBasicMaterial
          map={scanTex}
          transparent opacity={0.12}
          depthWrite={false}
        />
      </mesh>

      {/* Map border glow */}
      <lineSegments geometry={borderGeo}>
        <lineBasicMaterial color={ACCENT} transparent opacity={0.30} />
      </lineSegments>

      {/* Outer glow band around the map edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[MAP_W + 1.5, MAP_H + 1.5]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT} emissiveIntensity={0.25}
          transparent opacity={0.04} toneMapped={false}
        />
      </mesh>

      {/* Dark ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[28, 64]} />
        <meshStandardMaterial color="#020204" metalness={0.95} roughness={0.4} />
      </mesh>
    </group>
  )
}

/* ═══════════════════════════════════════════════
   Abstract holographic campus building
   ═══════════════════════════════════════════════ */

function seededRng(str) {
  let s = 0
  for (let i = 0; i < str.length; i++) s = s * 31 + str.charCodeAt(i)
  return () => { s = (s * 16807 + 11) % 2147483647; return (s & 0x7fffffff) / 2147483647 }
}

function CampusBuilding({ landmark, selected, onSelect }) {
  const { id, x, z, w, d, h, isGeisel, name } = landmark
  const [hovered, setHovered] = useState(false)

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onSelect(id)
  }, [onSelect, id])

  const cluster = useMemo(() => {
    if (h < 0.05 || isGeisel) return []
    const rng = seededRng(id)
    const count = 3 + Math.floor(rng() * 3)
    const items = []
    for (let i = 0; i < count; i++) {
      const bw = w * (0.18 + rng() * 0.22)
      const bd = d * (0.18 + rng() * 0.22)
      const bh = h * (0.7 + rng() * 1.0)
      const ox = (rng() - 0.5) * (w - bw) * 0.85
      const oz = (rng() - 0.5) * (d - bd) * 0.85
      items.push({ w: bw, d: bd, h: bh, ox, oz })
    }
    items.sort((a, b) => b.h - a.h)
    return items
  }, [id, w, d, h, isGeisel])

  if (isGeisel) {
    const gH = 4.4 * GEISEL_SCALE
    return (
      <group position={[x, 0.03, z]}>
        <group scale={[GEISEL_SCALE, GEISEL_SCALE, GEISEL_SCALE]}>
          <GeiselModel />
        </group>
        <mesh onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <cylinderGeometry args={[1.3, 1.3, gH, 8]} />
          <meshStandardMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[1.2, 1.4, 32]} />
            <meshStandardMaterial
              color={ACCENT} emissive={ACCENT} emissiveIntensity={2.5}
              transparent opacity={0.45} toneMapped={false} side={THREE.DoubleSide}
            />
          </mesh>
        )}
        <mesh position={[0, gH + 0.2, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.5, 4]} />
          <meshStandardMaterial
            color={ACCENT} emissive={ACCENT} emissiveIntensity={1}
            transparent opacity={selected ? 0.5 : 0.2} toneMapped={false}
          />
        </mesh>
        <mesh position={[0, gH + 0.5, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color={ACCENT} emissive={ACCENT}
            emissiveIntensity={selected ? 3 : 1.5} toneMapped={false}
          />
        </mesh>
        <pointLight position={[0, gH + 0.5, 0]} color={ACCENT} intensity={selected ? 0.8 : 0.2} distance={4} />
        <Html center position={[0, gH + 0.8, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
            textShadow: '0 0 12px rgba(255,45,45,0.6)',
            opacity: selected || hovered ? 1 : 0.75,
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

  const tallest = cluster.length > 0 ? cluster[0].h : h
  const ringR = Math.max(w, d) * 0.65
  const wfOp = selected ? 0.65 : hovered ? 0.45 : 0.30
  const fillOp = selected ? 0.14 : hovered ? 0.09 : 0.05
  const edgeOp = selected ? 0.60 : hovered ? 0.45 : 0.35

  return (
    <group position={[x, 0.03, z]}>
      {/* Invisible click target covering full footprint */}
      <mesh position={[0, tallest / 2, 0]}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[w, tallest, d]} />
        <meshStandardMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Base platform slab */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[w + 0.06, 0.015, d + 0.06]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT} emissiveIntensity={0.5}
          transparent opacity={0.10} toneMapped={false}
        />
      </mesh>

      {/* Building cluster */}
      {cluster.map((b, bi) => (
        <group key={`b-${bi}`} position={[b.ox, b.h / 2, b.oz]}>
          {/* Transparent fill */}
          <mesh>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial
              color={ACCENT} transparent opacity={fillOp}
              metalness={0.85} roughness={0.15}
            />
          </mesh>
          {/* Wireframe */}
          <mesh>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={ACCENT} wireframe transparent opacity={wfOp} />
          </mesh>
          {/* Corner edge glow */}
          {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], ci) => (
            <mesh key={ci} position={[sx * b.w / 2, 0, sz * b.d / 2]}>
              <boxGeometry args={[0.022, b.h, 0.022]} />
              <meshStandardMaterial
                color={ACCENT} emissive={ACCENT} emissiveIntensity={1.8}
                transparent opacity={edgeOp} toneMapped={false}
              />
            </mesh>
          ))}
          {/* Top edge glow (tallest building only) */}
          {bi === 0 && (
            <>
              <mesh position={[0, b.h / 2, -b.d / 2]}>
                <boxGeometry args={[b.w, 0.014, 0.014]} />
                <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.2} transparent opacity={edgeOp} toneMapped={false} />
              </mesh>
              <mesh position={[0, b.h / 2, b.d / 2]}>
                <boxGeometry args={[b.w, 0.014, 0.014]} />
                <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.2} transparent opacity={edgeOp} toneMapped={false} />
              </mesh>
              <mesh position={[-b.w / 2, b.h / 2, 0]}>
                <boxGeometry args={[0.014, 0.014, b.d]} />
                <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.2} transparent opacity={edgeOp} toneMapped={false} />
              </mesh>
              <mesh position={[b.w / 2, b.h / 2, 0]}>
                <boxGeometry args={[0.014, 0.014, b.d]} />
                <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.2} transparent opacity={edgeOp} toneMapped={false} />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* Selection ring */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[ringR, ringR + 0.12, 32]} />
          <meshStandardMaterial
            color={ACCENT} emissive={ACCENT} emissiveIntensity={2.5}
            transparent opacity={0.45} toneMapped={false} side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Vertical marker beam */}
      <mesh position={[0, tallest + 0.25, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.5, 4]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT} emissiveIntensity={1}
          transparent opacity={selected ? 0.5 : 0.2} toneMapped={false}
        />
      </mesh>
      {/* Marker sphere */}
      <mesh position={[0, tallest + 0.55, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT}
          emissiveIntensity={selected ? 3 : 1.5} toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, tallest + 0.55, 0]} color={ACCENT} intensity={selected ? 0.6 : 0.15} distance={2.5} />

      {/* Label */}
      <Html center position={[0, tallest + 0.8, 0]} style={{ pointerEvents: 'none' }}>
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
   Dining hall marker — white holographic pillar
   ═══════════════════════════════════════════════ */

const DH_COLOR = '#ffffff'

function DiningHallMarker({ hall, selected, onSelect }) {
  const { id, x, z, name } = hall
  const [hovered, setHovered] = useState(false)

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onSelect(id)
  }, [onSelect, id])

  const beamOp = selected ? 0.50 : hovered ? 0.30 : 0.15
  const sphereGlow = selected ? 3 : hovered ? 2 : 1.2

  return (
    <group position={[x, 0.03, z]}>
      {/* Click target */}
      <mesh position={[0, 0.2, 0]}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.3, 0.3, 0.5, 8]} />
        <meshStandardMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Base glow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.2, 16]} />
        <meshStandardMaterial
          color={DH_COLOR} emissive={DH_COLOR} emissiveIntensity={0.8}
          transparent opacity={selected ? 0.25 : 0.10} toneMapped={false} side={THREE.DoubleSide}
        />
      </mesh>

      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.3, 0.42, 24]} />
          <meshStandardMaterial
            color={DH_COLOR} emissive={DH_COLOR} emissiveIntensity={2}
            transparent opacity={0.40} toneMapped={false} side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Vertical beam — shorter than landmark pillars */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.4, 4]} />
        <meshStandardMaterial
          color={DH_COLOR} emissive={DH_COLOR} emissiveIntensity={1}
          transparent opacity={beamOp} toneMapped={false}
        />
      </mesh>

      {/* Marker sphere */}
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          color={DH_COLOR} emissive={DH_COLOR}
          emissiveIntensity={sphereGlow} toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, 0.45, 0]} color={DH_COLOR} intensity={selected ? 0.5 : 0.1} distance={2} />

      {/* Label */}
      <Html center position={[0, 0.65, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{
          color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 9, fontWeight: 500, whiteSpace: 'nowrap',
          textShadow: '0 0 6px rgba(255,255,255,0.4)',
          opacity: selected || hovered ? 1 : 0.55,
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
    const o = ALL_LOCATIONS.find(l => l.id === origin)
    const d = ALL_LOCATIONS.find(l => l.id === destination)
    if (!o || !d) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      o.x, 0.04, o.z, d.x, 0.04, d.z,
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

      const o = ALL_LOCATIONS.find(l => l.id === origin)
      const d = ALL_LOCATIONS.find(l => l.id === destination)
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
      targetPos.current.set(Math.sin(a) * 34, 24, Math.cos(a) * 34)
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

    angle.current += 0.0012
    camera.position.set(
      Math.sin(angle.current) * 34,
      24,
      Math.cos(angle.current) * 34
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
      <fog attach="fog" args={['#000000', 38, 65]} />
      <CampusLighting />
      <CampusCamera origin={origin} destination={destination} onTransitionDone={onTransitionDone} />
      <CampusGrid />
      <RouteLine origin={origin} destination={destination} />
      {LANDMARKS.map(lm => (
        <CampusBuilding
          key={lm.id}
          landmark={lm}
          selected={lm.id === origin || lm.id === destination}
          onSelect={onBuildingClick}
        />
      ))}
      {DINING_HALLS.map(dh => (
        <DiningHallMarker
          key={dh.id}
          hall={dh}
          selected={dh.id === origin || dh.id === destination}
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
  const o = ALL_LOCATIONS.find(l => l.id === origin)
  const d = ALL_LOCATIONS.find(l => l.id === destination)
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
            camera={{ position: [0, 24, 34], fov: 48, near: 0.1, far: 200 }}
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
