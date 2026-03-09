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

/* Haversine: distance in meters between two (lat, lon) points */
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const SECTION_BUILDINGS = {
  marshall: [
    'Marshall Upper Apartments',
    'Marshall Lower Apartments',
    'Marshall Residence Halls',
    'Stewart Commons',
    'Economics Building',
  ],
  muir: [
    'Muir Apartments',
    'Galbraith Hall',
    'Applied Physics & Mathematics',
    'Pacific Hall',
    'Muir College Center',
  ],
  revelle: [
    'York Hall',
    'Blake Hall',
    'Galathea Hall',
    'Keeling Apartments',
    'Revelle Plaza',
  ],
  sixth: [
    'Sixth College North Tower',
    'Sixth College South Tower',
    'Pepper Canyon Hall',
    'Visual Arts Facility',
  ],
  seventh: [
    'Seventh College West Tower',
    'Seventh College East Tower',
    'Seventh College Apartments',
  ],
  eighth: [
    'Eighth College Residence Hall A',
    'Eighth College Residence Hall B',
    'Theatre District Living Learning',
  ],
  warren: [
    'Peterson Hall',
    'Jacobs Hall',
    'Franklin Antonio Hall',
    'Warren Lecture Hall',
  ],
  erc: [
    'International House',
    'Rita Atkinson Residences',
    'ERC Administration Building',
  ],
}

function buildingId(sectionId, index) {
  return `bld-${sectionId}-${index}`
}

const LANDMARKS = [
  { id: 'geisel',   name: 'Geisel Library',    x: -3.08, z:  0.79, w: 0, d: 0, h: 0, isGeisel: true, lat: 32.88140322, lon: -117.2376352 },
  { id: 'price',    name: 'Price Center',       x: -0.19, z: -0.20, w: 2.4, d: 1.6, h: 0.85, lat: 32.8797725, lon: -117.2364386 },
  { id: 'sixth',    name: 'Sixth College',      x: -2.0,  z:  7.41, w: 1.8, d: 1.5, h: 0.70, lat: 32.88114707, lon: -117.242067, buildings: SECTION_BUILDINGS.sixth },
  { id: 'seventh',  name: 'Seventh College',    x:-15.26, z:  6.97, w: 1.8, d: 1.3, h: 0.65, lat: 32.88829254, lon: -117.2425116, buildings: SECTION_BUILDINGS.seventh },
  { id: 'eighth',   name: 'Eighth College',     x: 11.16, z:  8.20, w: 1.5, d: 1.3, h: 0.60, lat: 32.87286811, lon: -117.2425133, buildings: SECTION_BUILDINGS.eighth },
  { id: 'rimac',    name: 'RIMAC',              x:-10.19, z:  4.22, w: 2.8, d: 1.8, h: 1.00, lat: 32.88572127, lon: -117.2398888 },
  { id: 'revelle',  name: 'Revelle College',    x:  8.45, z:  6.12, w: 1.8, d: 1.5, h: 0.70, lat: 32.87569795, lon: -117.2418738, buildings: SECTION_BUILDINGS.revelle },
  { id: 'muir',     name: 'Muir College',       x:  1.18, z:  7.95, w: 1.6, d: 1.3, h: 0.60, lat: 32.87992274, lon: -117.2433412, buildings: SECTION_BUILDINGS.muir },
  { id: 'marshall', name: 'Marshall College',   x: -5.41, z:  6.20, w: 1.8, d: 1.5, h: 0.70, lat: 32.8827955, lon: -117.2404624, buildings: SECTION_BUILDINGS.marshall },
  { id: 'erc',      name: 'ERC',                x:-10.56, z:  8.73, w: 1.8, d: 1.3, h: 0.65, lat: 32.88413172, lon: -117.2420833, buildings: SECTION_BUILDINGS.erc },
  { id: 'warren',   name: 'Warren College',     x: -7.56, z: -6.79, w: 1.8, d: 1.3, h: 0.65, lat: 32.88086208, lon: -117.2343993, buildings: SECTION_BUILDINGS.warren },
  { id: 'libwalk',  name: 'Library Walk',       x: -1.64, z:  0.30, w: 0.15, d: 4, h: 0.02, lat: 32.8806, lon: -117.237 },
]

const DINING_HALLS = [
  { id: 'dh-64deg',   name: '64 Degrees',    x:  6.70,  z:  7.43,  w: 0.9, d: 0.7, h: 0.45, lat: 32.87517388, lon: -117.2420341 },
  { id: 'dh-pines',   name: 'Pines',         x:  1.44,  z:  7.81,  w: 0.9, d: 0.7, h: 0.45, lat: 32.8802063, lon: -117.2419845 },
  { id: 'dh-roots',   name: 'Roots',         x:  0.36,  z:  8.53,  w: 0.9, d: 0.7, h: 0.45, lat: 32.88056943, lon: -117.2424636 },
  { id: 'dh-goodys',  name: "Goody's",       x: -5.56,  z:  4.54,  w: 0.9, d: 0.7, h: 0.45, lat: 32.88219792, lon: -117.2396886 },
  { id: 'dh-ventanas', name: 'Ventanas',     x:-11.51,  z:  8.79,  w: 0.9, d: 0.7, h: 0.45, lat: 32.88622037, lon: -117.2425096 },
  { id: 'dh-concessions', name: 'Concessions', x:-11.29, z:  2.59,  w: 0.9, d: 0.7, h: 0.45, lat: 32.8857, lon: -117.24 },
  { id: 'dh-bistro',  name: 'Bistro',        x:-15.68,  z:  6.73,  w: 0.9, d: 0.7, h: 0.45, lat: 32.88809923, lon: -117.2420583 },
  { id: 'dh-canyon',  name: 'Canyon Vista',  x: -7.56,  z: -4.95,  w: 0.9, d: 0.7, h: 0.45, lat: 32.88408482, lon: -117.2332062 },
  { id: 'dh-price',   name: 'Price Center Dining', x: -0.19, z: -0.20, w: 0.9, d: 0.7, h: 0.45, lat: 32.87991209, lon: -117.2365567 },
  // Added for guided flow (lat/lon are used only for distance calculations)
  { id: 'dh-sixth',   name: 'Sixth Dining Commons', x: -1.2, z: 6.6, w: 0.9, d: 0.7, h: 0.45, lat: 32.8804748, lon: -117.2421702 },
  { id: 'dh-ocean',   name: 'OceanView Terrace',    x: -4.8, z: 6.8, w: 0.9, d: 0.7, h: 0.45, lat: 32.88314, lon: -117.2427 },
]

const SECTION_IDS = new Set(Object.keys(SECTION_BUILDINGS))
const DINING_HALL_IDS = new Set(DINING_HALLS.map(d => d.id))

const SECTION_BUILDING_LOCATIONS = (() => {
  const res = []
  for (const sec of LANDMARKS) {
    const buildings = sec.buildings
    if (!Array.isArray(buildings) || buildings.length === 0) continue
    const lat0 = sec.lat
    const lon0 = sec.lon
    const cos = Math.cos((lat0 ?? 32.88) * Math.PI / 180)
    for (let i = 0; i < buildings.length; i++) {
      const name = buildings[i]
      const rng = seededRng(`bld:${sec.id}:${i}`)
      const angle = rng() * Math.PI * 2
      const radiusM = 60 + rng() * 160
      const dxM = Math.cos(angle) * radiusM
      const dzM = Math.sin(angle) * radiusM
      const x = sec.x + dxM / METERS_PER_UNIT
      const z = sec.z + dzM / METERS_PER_UNIT
      const lat = lat0 != null ? (lat0 + (dzM / 111320)) : null
      const lon = lon0 != null ? (lon0 + (dxM / (111320 * cos))) : null
      res.push({
        id: buildingId(sec.id, i),
        name,
        x, z,
        w: 0.7, d: 0.55, h: 0.55,
        lat, lon,
        sectionId: sec.id,
        isBuildingDestination: true,
      })
    }
  }
  return res
})()

const ALL_LOCATIONS = [...LANDMARKS, ...DINING_HALLS, ...SECTION_BUILDING_LOCATIONS]

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

      {/* Satellite image plane — red-tinted holographic projection (no raycast) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} raycast={() => null}>
        <planeGeometry args={[MAP_W, MAP_H]} />
        <meshStandardMaterial
          map={campusTex}
          color="#ff4444"
          transparent opacity={0.38}
          emissive="#ff1515"
          emissiveIntensity={0.03}
        />
      </mesh>

      {/* Scanline overlay (no raycast) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]} raycast={() => null}>
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

      {/* Outer glow band around the map edge (no raycast) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} raycast={() => null}>
        <planeGeometry args={[MAP_W + 1.5, MAP_H + 1.5]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT} emissiveIntensity={0.25}
          transparent opacity={0.04} toneMapped={false}
        />
      </mesh>

      {/* Red particles evaporating from bottom — floating effect */}
      <EvaporatingParticles />

      {/* Dark ground plane (no raycast) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} raycast={() => null}>
        <circleGeometry args={[28, 64]} />
        <meshStandardMaterial color="#020204" metalness={0.95} roughness={0.4} />
      </mesh>
    </group>
  )
}

function EvaporatingParticles() {
  const count = 280
  const positions = useMemo(() => {
    const hw = MAP_W / 2
    const hh = MAP_H / 2
    const pts = new Float32Array(count * 3)
    const rng = seededRng('evap')
    for (let i = 0; i < count; i++) {
      const side = Math.floor(rng() * 4)
      let x, z
      if (side === 0) { x = (rng() - 0.5) * MAP_W; z = -hh - rng() * 0.4 }
      else if (side === 1) { x = hw + rng() * 0.4; z = (rng() - 0.5) * MAP_H }
      else if (side === 2) { x = (rng() - 0.5) * MAP_W; z = hh + rng() * 0.4 }
      else { x = -hw - rng() * 0.4; z = (rng() - 0.5) * MAP_H }
      pts[i * 3] = x
      pts[i * 3 + 1] = -0.3 - rng() * 0.6
      pts[i * 3 + 2] = z
    }
    return pts
  }, [])
  const ref = useRef(null)
  useFrame((_, delta) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += delta * 0.6 + 0.002
      if (pos[i * 3 + 1] > 1.2) pos[i * 3 + 1] = -0.5 - Math.random() * 0.5
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })
  return (
    <points ref={ref} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color={ACCENT}
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
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

function CampusBuilding({ landmark, selected, onSelect, lift = 0, forcedBright = false }) {
  const { id, x, z, w, d, h, isGeisel, name } = landmark
  const [hovered, setHovered] = useState(false)
  const gRef = useRef(null)
  const y = useRef(0)
  const sunk = lift < -0.5

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onSelect(id)
  }, [onSelect, id])

  useFrame((_, delta) => {
    if (!gRef.current) return
    const target = lift
    y.current += (target - y.current) * Math.min(1, delta * 8.5)
    gRef.current.position.set(x, 0.03 + y.current, z)
  })

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
      <group ref={gRef} position={[x, 0.03, z]}>
        <group scale={[GEISEL_SCALE, GEISEL_SCALE, GEISEL_SCALE]}>
          <GeiselModel />
        </group>
        <mesh
          onClick={sunk ? undefined : handleClick}
          onPointerOver={sunk ? undefined : () => setHovered(true)}
          onPointerOut={sunk ? undefined : () => setHovered(false)}
          raycast={sunk ? () => null : undefined}
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
      <group ref={gRef} position={[x, 0.02, z]}>
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
  const boost = forcedBright ? 1.35 : 1

  return (
    <group ref={gRef} position={[x, 0.03, z]}>
      {/* Invisible click target covering full footprint */}
      <mesh
        position={[0, tallest / 2, 0]}
        onClick={sunk ? undefined : handleClick}
        onPointerOver={sunk ? undefined : () => setHovered(true)}
        onPointerOut={sunk ? undefined : () => setHovered(false)}
        raycast={sunk ? () => null : undefined}
      >
        <boxGeometry args={[w, tallest, d]} />
        <meshStandardMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Base platform slab (no raycast — use click target) */}
      <mesh position={[0, 0, 0]} raycast={() => null}>
        <boxGeometry args={[w + 0.06, 0.015, d + 0.06]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT} emissiveIntensity={0.5 * boost}
          transparent opacity={0.10} toneMapped={false}
        />
      </mesh>

      {/* Building cluster */}
      {cluster.map((b, bi) => (
        <group key={`b-${bi}`} position={[b.ox, b.h / 2, b.oz]}>
          {/* Transparent fill (no raycast) */}
          <mesh raycast={() => null}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial
              color={ACCENT} transparent opacity={fillOp}
              metalness={0.85} roughness={0.15}
            />
          </mesh>
          {/* Wireframe (no raycast) */}
          <mesh raycast={() => null}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={ACCENT} wireframe transparent opacity={wfOp} />
          </mesh>
          {/* Corner edge glow */}
          {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], ci) => (
            <mesh key={ci} position={[sx * b.w / 2, 0, sz * b.d / 2]} raycast={() => null}>
              <boxGeometry args={[0.022, b.h, 0.022]} />
              <meshStandardMaterial
                color={ACCENT} emissive={ACCENT} emissiveIntensity={1.8 * boost}
                transparent opacity={edgeOp} toneMapped={false}
              />
            </mesh>
          ))}
          {/* Top edge glow (tallest building only) */}
          {bi === 0 && (
            <>
              <mesh position={[0, b.h / 2, -b.d / 2]} raycast={() => null}>
                <boxGeometry args={[b.w, 0.014, 0.014]} />
                <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.2 * boost} transparent opacity={edgeOp} toneMapped={false} />
              </mesh>
              <mesh position={[0, b.h / 2, b.d / 2]} raycast={() => null}>
                <boxGeometry args={[b.w, 0.014, 0.014]} />
                <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.2 * boost} transparent opacity={edgeOp} toneMapped={false} />
              </mesh>
              <mesh position={[-b.w / 2, b.h / 2, 0]} raycast={() => null}>
                <boxGeometry args={[0.014, 0.014, b.d]} />
                <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.2 * boost} transparent opacity={edgeOp} toneMapped={false} />
              </mesh>
              <mesh position={[b.w / 2, b.h / 2, 0]} raycast={() => null}>
                <boxGeometry args={[0.014, 0.014, b.d]} />
                <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.2 * boost} transparent opacity={edgeOp} toneMapped={false} />
              </mesh>
            </>
          )}
        </group>
      ))}

      {/* Selection ring */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} raycast={() => null}>
          <ringGeometry args={[ringR, ringR + 0.12, 32]} />
          <meshStandardMaterial
            color={ACCENT} emissive={ACCENT} emissiveIntensity={2.5}
            transparent opacity={0.45} toneMapped={false} side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Vertical marker beam */}
      <mesh position={[0, tallest + 0.25, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.01, 0.01, 0.5, 4]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT} emissiveIntensity={1}
          transparent opacity={selected ? 0.5 : 0.2} toneMapped={false}
        />
      </mesh>
      {/* Marker sphere */}
      <mesh position={[0, tallest + 0.55, 0]} raycast={() => null}>
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
   Dining hall — small white 3D building cluster
   ═══════════════════════════════════════════════ */

const DH_COLOR = '#ffffff'

function DiningHallMarker({ hall, selected, onSelect, lift = 0, forcedBright = false, showUnderBeam = false }) {
  const { id, x, z, name, w = 0.9, d = 0.7, h = 0.45 } = hall
  const [hovered, setHovered] = useState(false)
  const gRef = useRef(null)
  const y = useRef(0)
  const sunk = lift < -0.5

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onSelect(id)
  }, [onSelect, id])

  const cluster = useMemo(() => {
    const rng = seededRng(id)
    const count = 2 + Math.floor(rng() * 2)
    const items = []
    for (let i = 0; i < count; i++) {
      const bw = w * (0.25 + rng() * 0.35)
      const bd = d * (0.25 + rng() * 0.35)
      const bh = h * (0.7 + rng() * 0.6)
      const ox = (rng() - 0.5) * (w - bw) * 0.9
      const oz = (rng() - 0.5) * (d - bd) * 0.9
      items.push({ w: bw, d: bd, h: bh, ox, oz })
    }
    items.sort((a, b) => b.h - a.h)
    return items
  }, [id, w, d, h])

  const tallest = cluster.length > 0 ? cluster[0].h : h
  const ringR = Math.max(w, d) * 0.55
  const wfOp = selected ? 0.55 : hovered ? 0.40 : 0.28
  const fillOp = selected ? 0.12 : hovered ? 0.08 : 0.04
  const edgeOp = selected ? 0.50 : hovered ? 0.38 : 0.30
  const boost = forcedBright ? 1.6 : 1

  useFrame((_, delta) => {
    if (!gRef.current) return
    const target = lift
    y.current += (target - y.current) * Math.min(1, delta * 10.5)
    gRef.current.position.set(x, 0.03 + y.current, z)
  })

  return (
    <group ref={gRef} position={[x, 0.03, z]}>
      <mesh
        position={[0, tallest / 2, 0]}
        onClick={sunk ? undefined : handleClick}
        onPointerOver={sunk ? undefined : () => setHovered(true)}
        onPointerOut={sunk ? undefined : () => setHovered(false)}
        raycast={sunk ? () => null : undefined}
      >
        <boxGeometry args={[w, tallest, d]} />
        <meshStandardMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {showUnderBeam && (
        <mesh position={[0, -Math.max(0, lift) * 0.55, 0]}>
          <cylinderGeometry args={[0.035, 0.035, Math.max(0.06, Math.max(0, lift) * 1.1), 10]} />
          <meshStandardMaterial
            color={DH_COLOR} emissive={DH_COLOR} emissiveIntensity={1.8 * boost}
            transparent opacity={Math.min(0.55, 0.15 + Math.max(0, lift) * 0.25)} toneMapped={false}
          />
        </mesh>
      )}

      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[w + 0.04, 0.012, d + 0.04]} />
        <meshStandardMaterial
          color={DH_COLOR} emissive={DH_COLOR} emissiveIntensity={0.6 * boost}
          transparent opacity={0.08} toneMapped={false}
        />
      </mesh>

      {cluster.map((b, bi) => (
        <group key={`b-${bi}`} position={[b.ox, b.h / 2, b.oz]}>
          <mesh>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial
              color={DH_COLOR} transparent opacity={fillOp}
              metalness={0.85} roughness={0.15}
            />
          </mesh>
          <mesh>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={DH_COLOR} wireframe transparent opacity={wfOp} />
          </mesh>
          {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], ci) => (
            <mesh key={ci} position={[sx * b.w / 2, 0, sz * b.d / 2]}>
              <boxGeometry args={[0.018, b.h, 0.018]} />
              <meshStandardMaterial
                color={DH_COLOR} emissive={DH_COLOR} emissiveIntensity={1.5 * boost}
                transparent opacity={edgeOp} toneMapped={false}
              />
            </mesh>
          ))}
          {bi === 0 && (
            <>
              <mesh position={[0, b.h / 2, -b.d / 2]}>
                <boxGeometry args={[b.w, 0.012, 0.012]} />
                <meshStandardMaterial color={DH_COLOR} emissive={DH_COLOR} emissiveIntensity={1 * boost} transparent opacity={edgeOp} toneMapped={false} />
              </mesh>
              <mesh position={[0, b.h / 2, b.d / 2]}>
                <boxGeometry args={[b.w, 0.012, 0.012]} />
                <meshStandardMaterial color={DH_COLOR} emissive={DH_COLOR} emissiveIntensity={1 * boost} transparent opacity={edgeOp} toneMapped={false} />
              </mesh>
              <mesh position={[-b.w / 2, b.h / 2, 0]}>
                <boxGeometry args={[0.012, 0.012, b.d]} />
                <meshStandardMaterial color={DH_COLOR} emissive={DH_COLOR} emissiveIntensity={1 * boost} transparent opacity={edgeOp} toneMapped={false} />
              </mesh>
              <mesh position={[b.w / 2, b.h / 2, 0]}>
                <boxGeometry args={[0.012, 0.012, b.d]} />
                <meshStandardMaterial color={DH_COLOR} emissive={DH_COLOR} emissiveIntensity={1 * boost} transparent opacity={edgeOp} toneMapped={false} />
              </mesh>
            </>
          )}
        </group>
      ))}

      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[ringR, ringR + 0.1, 32]} />
          <meshStandardMaterial
            color={DH_COLOR} emissive={DH_COLOR} emissiveIntensity={2}
            transparent opacity={0.40} toneMapped={false} side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <mesh position={[0, tallest + 0.2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.4, 4]} />
        <meshStandardMaterial
          color={DH_COLOR} emissive={DH_COLOR} emissiveIntensity={1}
          transparent opacity={selected ? 0.45 : 0.18} toneMapped={false}
        />
      </mesh>
      <mesh position={[0, tallest + 0.45, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          color={DH_COLOR} emissive={DH_COLOR}
          emissiveIntensity={selected ? 2.5 : 1.2} toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, tallest + 0.45, 0]} color={DH_COLOR} intensity={selected ? 0.5 : 0.1} distance={2} />

      <Html center position={[0, tallest + 0.7, 0]} style={{ pointerEvents: 'none' }}>
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

function RouteLine({ origin, destination, visible }) {
  const geo = useMemo(() => {
    if (!visible) return null
    if (!origin || !destination) return null
    const o = ALL_LOCATIONS.find(l => l.id === origin)
    const d = ALL_LOCATIONS.find(l => l.id === destination)
    if (!o || !d) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      o.x, 0.04, o.z, d.x, 0.04, d.z,
    ], 3))
    return g
  }, [origin, destination, visible])

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

function CampusCamera({
  origin,
  destination,
  pendingSection,
  routeFocusEnabled,
  onTransitionDone,
  onSectionZoomDone,
  onResetToOrbitDone,
}) {
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
  const prevSection = useRef(null)
  const resetToken = useRef(0)

  useFrame(({ clock }) => {
    const hasRoute = origin && destination && routeFocusEnabled
    const hasSection = !!pendingSection

    if (hasSection && phase.current === 'orbit') {
      const s = LANDMARKS.find(l => l.id === pendingSection)
      if (!s) return

      phase.current = 'sectionTransitioning'
      t0.current = clock.elapsedTime
      startPos.current.copy(camera.position)
      startLook.current.set(0, 0, 0)

      const camDir = new THREE.Vector3(camera.position.x, 0, camera.position.z).normalize()
      const approach = camDir.lengthSq() > 0.0001 ? camDir : new THREE.Vector3(0.6, 0, 0.8)
      targetPos.current.set(s.x + approach.x * 6.5, 7.0, s.z + approach.z * 6.5)
      targetLook.current.set(s.x, 0.4, s.z)
      prevSection.current = pendingSection
    }

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

    if (!hasSection && !hasRoute && phase.current !== 'orbit') {
      phase.current = 'resetting'
      t0.current = clock.elapsedTime
      startPos.current.copy(camera.position)
      const curLook = targetLook.current.clone()
      startLook.current.copy(curLook)
      const a = angle.current
      targetPos.current.set(Math.sin(a) * 24, 15, Math.cos(a) * 24)
      targetLook.current.set(0, 0, 0)
      resetToken.current += 1
    }

    if (phase.current === 'sectionTransitioning') {
      const raw = Math.min(1, (clock.elapsedTime - t0.current) / 1.15)
      const t = easeInOutCubic(raw)
      camera.position.lerpVectors(startPos.current, targetPos.current, t)
      const look = new THREE.Vector3().lerpVectors(startLook.current, targetLook.current, t)
      camera.lookAt(look)
      if (raw >= 1) {
        phase.current = 'sectionFocused'
        onSectionZoomDone?.()
      }
      return
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
      if (raw >= 1) {
        phase.current = 'orbit'
        onResetToOrbitDone?.(resetToken.current)
      }
      return
    }

    if (phase.current === 'focused') {
      camera.lookAt(targetLook.current)
      return
    }

    if (phase.current === 'sectionFocused') {
      camera.lookAt(targetLook.current)
      return
    }

    angle.current += 0.0032
    camera.position.set(
      Math.sin(angle.current) * 24,
      15,
      Math.cos(angle.current) * 24
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

function BuildingSelector({ sectionId, onPickBuilding }) {
  const section = LANDMARKS.find(l => l.id === sectionId)
  if (!section || !Array.isArray(section.buildings) || section.buildings.length === 0) return null

  const { x, z, name } = section

  return (
    <group position={[x, 0.03, z]}>
      <Html
        center
        position={[0, 2.0, 0]}
        pointerEvents="auto"
        zIndexRange={[1000000, 1000000]}
        style={{ pointerEvents: 'auto' }}
      >
        <div
          style={{
          width: 320,
          background: 'linear-gradient(165deg, rgba(25,25,30,0.92) 0%, rgba(10,10,14,0.95) 100%)',
          border: '1px solid rgba(255,45,45,0.16)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.75), 0 0 60px rgba(255,45,45,0.08)',
          borderRadius: 18,
          padding: '16px 14px',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          color: '#fff',
          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
          pointerEvents: 'auto',
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            marginBottom: 10,
          }}>Select a building in</div>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>{name}</div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 240,
            overflow: 'auto',
            paddingRight: 4,
          }}>
            {section.buildings.map((b, i) => (
              <button
                key={`${sectionId}-${i}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onPickBuilding(buildingId(sectionId, i))
                }}
                style={{
                  textAlign: 'left',
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#fff',
                  padding: '10px 12px',
                  borderRadius: 12,
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, border-color 0.2s ease, background 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(255,45,45,0.22)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                }}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </Html>
    </group>
  )
}

function BuildingDestinationMarker({ destinationId }) {
  if (!destinationId || !destinationId.startsWith('bld-')) return null
  const loc = ALL_LOCATIONS.find(l => l.id === destinationId)
  if (!loc) return null

  const { x, z, name, h = 0.55 } = loc
  const tallest = h

  return (
    <group position={[x, 0.03, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.55, 0.72, 32]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT} emissiveIntensity={2.8}
          transparent opacity={0.55} toneMapped={false} side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, tallest + 0.22, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.5, 4]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT} emissiveIntensity={1.2}
          transparent opacity={0.55} toneMapped={false}
        />
      </mesh>
      <mesh position={[0, tallest + 0.55, 0]}>
        <sphereGeometry args={[0.055, 10, 10]} />
        <meshStandardMaterial
          color={ACCENT} emissive={ACCENT} emissiveIntensity={3.2} toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, tallest + 0.55, 0]} color={ACCENT} intensity={0.7} distance={3} />
      <Html center position={[0, tallest + 0.86, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{
          color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 10, fontWeight: 650, whiteSpace: 'nowrap',
          textShadow: '0 0 10px rgba(255,45,45,0.55)',
          opacity: 0.95,
        }}>{name}</div>
      </Html>
    </group>
  )
}

function CampusSceneContent({
  origin,
  destination,
  pendingSection,
  showBuildingSelector,
  onPickBuilding,
  onBuildingClick,
  onTransitionDone,
  routeFocusEnabled,
  onSectionZoomDone,
  onResetToOrbitDone,
  routeVisible,
  sectionLift,
  diningLift,
  sectionBright,
  diningBright,
  diningUnderBeams,
}) {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 38, 65]} />
      <CampusLighting />
      <CampusCamera
        origin={origin}
        destination={destination}
        pendingSection={pendingSection}
        routeFocusEnabled={routeFocusEnabled}
        onTransitionDone={onTransitionDone}
        onSectionZoomDone={onSectionZoomDone}
        onResetToOrbitDone={onResetToOrbitDone}
      />
      <CampusGrid />
      <RouteLine origin={origin} destination={destination} visible={routeVisible} />
      {LANDMARKS.map(lm => (
        <CampusBuilding
          key={lm.id}
          landmark={lm}
          selected={lm.id === origin || lm.id === destination}
          onSelect={onBuildingClick}
          lift={sectionLift?.[lm.id] ?? 0}
          forcedBright={!!sectionBright?.[lm.id]}
        />
      ))}
      {DINING_HALLS.map(dh => (
        <DiningHallMarker
          key={dh.id}
          hall={dh}
          selected={dh.id === origin || dh.id === destination}
          onSelect={onBuildingClick}
          lift={diningLift?.[dh.id] ?? 0}
          forcedBright={!!diningBright?.[dh.id]}
          showUnderBeam={!!diningUnderBeams?.[dh.id]}
        />
      ))}

      {showBuildingSelector && pendingSection && (
        <BuildingSelector sectionId={pendingSection} onPickBuilding={onPickBuilding} />
      )}

      <BuildingDestinationMarker destinationId={destination} />
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

  const deliveryDistanceMeters = (o.lat != null && o.lon != null && d.lat != null && d.lon != null)
    ? Math.round(haversineMeters(o.lat, o.lon, d.lat, d.lon))
    : Math.round(Math.sqrt((d.x - o.x) ** 2 + (d.z - o.z) ** 2) * METERS_PER_UNIT)
  const walkMin = (deliveryDistanceMeters / 1.4 / 60 * 2).toFixed(1)

  const distanceFee = (deliveryDistanceMeters / 150) * 0.50
  const carrierEarnings = 2.00 + distanceFee + 1.00

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
        <span style={valueStyle}>{deliveryDistanceMeters} m</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Walking Time</span>
        <span style={accentVal}>{walkMin} min</span>
      </div>

      <div style={{
        marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', marginBottom: 12 }}>
          Estimated Carrier Earnings
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Base fee</span>
          <span style={valueStyle}>$2.00</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Distance fee</span>
          <span style={valueStyle}>${distanceFee.toFixed(2)}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Tip</span>
          <span style={valueStyle}>$1.00</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none', paddingTop: 12, marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ ...labelStyle, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Total earnings</span>
          <span style={accentVal}>${carrierEarnings.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   Campus HUD overlay
   ═══════════════════════════════════════════════ */

function CampusHUD({
  statusText,
  showBegin,
  onBegin,
  showExploreMore,
  onExploreMore,
}) {
  const base = {
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.10em',
    fontSize: 10,
    fontWeight: 500,
  }

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
      {statusText && (
        <div style={{
          position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)',
          fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.40)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          letterSpacing: '0.03em',
          padding: '10px 24px', borderRadius: 12,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>{statusText}</div>
      )}

      {/* Begin Statistics button */}
      {showBegin && (
        <div style={{
          position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)',
          pointerEvents: 'auto',
        }}>
          <button
            onClick={onBegin}
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 14, fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.02em',
              padding: '13px 26px',
              borderRadius: 16,
              border: 'none',
              background: ACCENT,
              boxShadow: '0 0 28px rgba(255,42,42,0.40)',
              cursor: 'pointer',
              transition: 'box-shadow 0.3s, transform 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.boxShadow = '0 0 42px rgba(255,42,42,0.55)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = '0 0 28px rgba(255,42,42,0.40)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Begin Statistics
          </button>
        </div>
      )}

      {/* Explore more routes button */}
      {showExploreMore && (
        <div style={{
          position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)',
          pointerEvents: 'auto',
        }}>
          <button
            onClick={onExploreMore}
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13, fontWeight: 650,
              color: '#fff',
              letterSpacing: '0.02em',
              padding: '12px 24px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              boxShadow: '0 24px 70px rgba(0,0,0,0.55), 0 0 36px rgba(255,42,42,0.08)',
              cursor: 'pointer',
              transition: 'box-shadow 0.3s, transform 0.2s, background 0.2s, border-color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.boxShadow = '0 24px 70px rgba(0,0,0,0.55), 0 0 44px rgba(255,42,42,0.16)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.borderColor = 'rgba(255,42,42,0.22)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = '0 24px 70px rgba(0,0,0,0.55), 0 0 36px rgba(255,42,42,0.08)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
            }}
          >
            Explore more routes
          </button>
        </div>
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
  const [flow, setFlow] = useState('idle') // idle → chooseDining → chooseSection → zoomSection → chooseBuilding → returningToOrbit → done
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)
  const [pendingSection, setPendingSection] = useState(null)
  const [showBuildingSelector, setShowBuildingSelector] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const statusText = flow === 'chooseDining'
    ? 'Choose a dining hall'
    : flow === 'chooseSection'
      ? 'Choose a destination section'
      : null

  const routeVisible = flow === 'done'

  const diningLift = useMemo(() => {
    const m = {}
    for (const dh of DINING_HALLS) {
      if (flow === 'chooseDining') m[dh.id] = 0.7
      else if (flow !== 'idle' && origin) m[dh.id] = dh.id === origin ? 0.7 : -1.0
      else m[dh.id] = 0
    }
    return m
  }, [flow, origin])

  const diningBright = useMemo(() => {
    const m = {}
    for (const dh of DINING_HALLS) {
      m[dh.id] = flow === 'chooseDining' || (origin && dh.id === origin)
    }
    return m
  }, [flow, origin])

  const diningUnderBeams = useMemo(() => {
    const m = {}
    for (const dh of DINING_HALLS) {
      m[dh.id] = flow === 'chooseDining' || (origin && dh.id === origin)
    }
    return m
  }, [flow, origin])

  const sectionLift = useMemo(() => {
    const m = {}
    for (const lm of LANDMARKS) {
      if (flow === 'chooseDining') m[lm.id] = -1.0
      else if (flow === 'chooseSection' && !SECTION_IDS.has(lm.id)) m[lm.id] = -1.0
      else if (flow !== 'idle' && SECTION_IDS.has(lm.id)) m[lm.id] = 0.85
      else m[lm.id] = 0
    }
    return m
  }, [flow])

  const sectionBright = useMemo(() => {
    const m = {}
    for (const lm of LANDMARKS) {
      m[lm.id] = (flow !== 'idle' && flow !== 'chooseDining' && SECTION_IDS.has(lm.id))
    }
    return m
  }, [flow])

  const resetFlow = useCallback(() => {
    setFlow('idle')
    setOrigin(null)
    setDestination(null)
    setPendingSection(null)
    setShowBuildingSelector(false)
    setShowStats(false)
  }, [])

  const handleBegin = useCallback(() => {
    resetFlow()
    setFlow('chooseDining')
  }, [resetFlow])

  const handleMapClick = useCallback((id) => {
    if (id === 'libwalk') return
    if (flow === 'idle') return

    if (flow === 'chooseDining') {
      if (!DINING_HALL_IDS.has(id)) return
      setOrigin(id)
      setFlow('chooseSection')
      return
    }

    if (flow === 'chooseSection') {
      if (!SECTION_IDS.has(id)) return
      setPendingSection(id)
      setFlow('zoomSection')
      return
    }
  }, [flow])

  const handleSectionZoomDone = useCallback(() => {
    if (flow !== 'zoomSection') return
    setShowBuildingSelector(true)
    setFlow('chooseBuilding')
  }, [flow])

  const handlePickBuilding = useCallback((buildingLocId) => {
    if (!buildingLocId) return
    setDestination(buildingLocId)
    setShowBuildingSelector(false)
    setPendingSection(null)
    setShowStats(false)
    setFlow('returningToOrbit')
  }, [])

  const handleResetToOrbitDone = useCallback(() => {
    if (flow !== 'returningToOrbit') return
    setFlow('done')
    setShowStats(true)
  }, [flow])

  const containerRef = useRef(null)

  return (
    <>
      <InjectKeyframes />
      <div style={{
        width: '100%', height: '100vh',
        position: 'relative', overflow: 'hidden',
        background: '#000',
      }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 15, 24], fov: 40, near: 0.1, far: 200 }}
            style={{ width: '100%', height: '100%' }}
            onCreated={({ events }) => {
              if (containerRef.current) events.connect(containerRef.current)
            }}
          >
            <CampusSceneContent
              origin={origin}
              destination={destination}
              pendingSection={pendingSection}
              showBuildingSelector={showBuildingSelector}
              onPickBuilding={handlePickBuilding}
              onBuildingClick={handleMapClick}
              onTransitionDone={() => {}}
              routeFocusEnabled={false}
              onSectionZoomDone={handleSectionZoomDone}
              onResetToOrbitDone={handleResetToOrbitDone}
              routeVisible={routeVisible}
              sectionLift={sectionLift}
              diningLift={diningLift}
              sectionBright={sectionBright}
              diningBright={diningBright}
              diningUnderBeams={diningUnderBeams}
            />
          </Canvas>
        </div>

        <CampusHUD
          statusText={statusText}
          showBegin={flow === 'idle'}
          onBegin={handleBegin}
          showExploreMore={flow === 'done'}
          onExploreMore={resetFlow}
        />
        <StatsPanel origin={origin} destination={destination} visible={showStats} />
      </div>
    </>
  )
}
