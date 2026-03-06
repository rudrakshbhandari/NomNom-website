import {
  useRef, useState, useEffect, useMemo, useCallback,
  Suspense, Component,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
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
    { r: 1.55, y: 2.85, h: 0.22 },
    { r: 2.00, y: 3.30, h: 0.22 },
    { r: 2.45, y: 3.75, h: 0.22 },
    { r: 2.90, y: 4.20, h: 0.22 },
    { r: 3.30, y: 4.65, h: 0.22 },
    { r: 3.65, y: 5.10, h: 0.22 },
  ], [])

  const tierEdges = useMemo(
    () => tiers.map(t => hexEdgeSegments(t.r)),
    [tiers]
  )

  const outerColumns = useMemo(() => {
    const cols = []
    const baseR = 1.80, topR = 1.55, baseY = 0.12, topY = 2.72
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
    const baseR = 0.70, topR = 0.65, baseY = 0.12, topY = 2.72
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
        <ColumnStrut key={`oc-${i}`} from={c.from} to={c.to} radius={0.08} />
      ))}

      {/* ── 6 inner support columns (nearly vertical) ── */}
      {innerColumns.map((c, i) => (
        <ColumnStrut key={`ic-${i}`} from={c.from} to={c.to} radius={0.05} />
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
      <mesh position={[0, 5.30, 0]}>
        <cylinderGeometry args={[3.45, 3.45, 0.06, 6]} />
        <meshStandardMaterial color="#1e2e3e" metalness={0.60} roughness={0.10} />
      </mesh>
      {roofEdges.map((e, i) => (
        <mesh key={`roof-${i}`} position={[e.cx, 5.33, e.cz]} rotation={[0, e.rot, 0]}>
          <boxGeometry args={[0.026, 0.016, e.len]} />
          <meshStandardMaterial {...EDGE_MAT_PROPS} />
        </mesh>
      ))}

      {/* Inner glow */}
      <pointLight position={[0, 3.8, 0]} color={ACCENT} intensity={3} distance={8} decay={2} />
    </group>
  )
}

function GeiselModel() {
  return (
    <ModelErrorBoundary fallback={<ProceduralGeisel />}>
      <Suspense fallback={<ProceduralGeisel />}>
        <GeiselGLB />
      </Suspense>
    </ModelErrorBoundary>
  )
}

/* ═══════════════════════════════════════════════
   Ground
   ═══════════════════════════════════════════════ */

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial color="#07070f" metalness={0.88} roughness={0.35} />
    </mesh>
  )
}

/* ═══════════════════════════════════════════════
   Lighting (ramps up when cinematic starts)
   ═══════════════════════════════════════════════ */

function SceneLighting({ active }) {
  const amb = useRef()
  const dir = useRef()
  const spot = useRef()

  useFrame(() => {
    const t = active ? 1 : 0
    if (amb.current) amb.current.intensity += ((0.12 + t * 0.38) - amb.current.intensity) * 0.025
    if (dir.current) dir.current.intensity += ((0.08 + t * 0.82) - dir.current.intensity) * 0.025
    if (spot.current) spot.current.intensity += ((t * 1.6) - spot.current.intensity) * 0.025
  })

  return (
    <>
      <ambientLight ref={amb} intensity={0.12} color="#aaccff" />
      <directionalLight ref={dir} position={[10, 16, 8]} intensity={0.08} color="#ddeeff" />
      <spotLight ref={spot} position={[0, 22, 0]} angle={0.35} penumbra={0.85} intensity={0} color="#88bbff" />
    </>
  )
}

/* ═══════════════════════════════════════════════
   Cinematic camera
   ═══════════════════════════════════════════════ */

function CinematicCamera({ active, onComplete }) {
  const { camera } = useThree()
  const curve = useMemo(() => new THREE.CatmullRomCurve3(CAMERA_CURVE_PTS), [])
  const t0 = useRef(null)
  const done = useRef(false)
  const lookAt = useRef(new THREE.Vector3(0, 3.5, 0))

  useFrame(({ clock }) => {
    if (!active) {
      camera.position.set(3, 4.5, -3)
      camera.lookAt(0, 3.5, 0)
      return
    }

    if (t0.current === null) t0.current = clock.elapsedTime
    const raw = Math.min(1, (clock.elapsedTime - t0.current) / ANIM_DURATION)
    const t = easeInOutCubic(raw)

    camera.position.copy(curve.getPointAt(t))
    lookAt.current.lerp(new THREE.Vector3(0, 3.5 - t * 0.4, 0), 0.04)
    camera.lookAt(lookAt.current)

    if (raw >= 1 && !done.current) {
      done.current = true
      onComplete()
    }
  })

  return null
}

/* ═══════════════════════════════════════════════
   Scene content (everything inside the Canvas)
   ═══════════════════════════════════════════════ */

function SceneContent({ phase, onCinematicComplete }) {
  const active = phase === 'cinematic' || phase === 'complete'
  return (
    <>
      <color attach="background" args={[DARK]} />
      <fog attach="fog" args={[DARK, 22, 55]} />
      <SceneLighting active={active} />
      <CinematicCamera active={active} onComplete={onCinematicComplete} />
      <Ground />
      <GeiselModel />
    </>
  )
}

/* ═══════════════════════════════════════════════
   UI — Glass Notification Card  (Step 1)
   ═══════════════════════════════════════════════ */

const GLASS = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  border: '1px solid rgba(255,255,255,0.10)',
}

function NotificationCard({ onAccept, visible }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 45%, rgba(8,18,38,0.75) 0%, rgba(5,5,16,0.96) 70%)',
      opacity: visible ? 1 : 0,
      transition: 'opacity 1.2s cubic-bezier(.4,0,.2,1)',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <div style={{
        ...GLASS,
        borderRadius: 28,
        padding: '40px 36px',
        width: 330,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 80px rgba(0,100,255,0.06)',
        textAlign: 'center',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        color: '#fff',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
        transition: 'transform 1s cubic-bezier(.4,0,.2,1), opacity 1s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>
          NomNom
        </div>
        <div style={{
          fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 28,
        }}>
          New Delivery Request
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '16px 20px',
          textAlign: 'left', marginBottom: 28,
        }}>
          {[['Pickup', 'Sixth Dining Hall'], ['Dropoff', 'Geisel Library'], ['Tip', '$3']].map(([k, v], i, a) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between',
              marginBottom: i < a.length - 1 ? 12 : 0,
            }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', fontWeight: 500 }}>{k}</span>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        <button onClick={onAccept} style={{
          width: '100%', padding: '14px 0',
          background: 'rgba(0,110,255,0.22)',
          border: '1px solid rgba(0,140,255,0.28)',
          borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 15,
          fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          transition: 'background 0.3s, box-shadow 0.3s',
          boxShadow: '0 0 24px rgba(0,110,255,0.12)',
          letterSpacing: '-0.01em',
        }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(0,110,255,0.38)'
            e.currentTarget.style.boxShadow = '0 0 36px rgba(0,110,255,0.25)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(0,110,255,0.22)'
            e.currentTarget.style.boxShadow = '0 0 24px rgba(0,110,255,0.12)'
          }}
        >
          Accept Delivery
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   UI — Minimal HUD  (Step 5)
   ═══════════════════════════════════════════════ */

function HudOverlay({ visible }) {
  const base = {
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.10em',
    fontSize: 10,
    fontWeight: 500,
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transition: 'opacity 1s ease-in',
    }}>
      <div style={{ position: 'absolute', top: 28, left: 32, ...base }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em' }}>
          NOMNOM
        </div>
        <div style={{ marginTop: 4 }}>DELIVERY PLATFORM</div>
      </div>

      <div style={{ position: 'absolute', top: 28, right: 32, textAlign: 'right', ...base }}>
        <div>32.8801° N</div>
        <div style={{ marginTop: 2 }}>117.2340° W</div>
      </div>

      <div style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        textTransform: 'uppercase', ...base,
      }}>
        UCSD Campus &bull; San Diego, CA
      </div>

      <div style={{
        position: 'absolute', bottom: 28, right: 32,
        width: 60, height: 2, background: 'rgba(255,255,255,0.12)',
        borderRadius: 1, overflow: 'hidden',
      }}>
        <div className="hud-scan-line" style={{
          width: '40%', height: '100%', background: ACCENT, borderRadius: 1,
        }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   UI — Explore NomNom  (Step 6)
   ═══════════════════════════════════════════════ */

function ExploreButton({ visible }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 25,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16,
      pointerEvents: visible ? 'auto' : 'none',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.9s cubic-bezier(.4,0,.2,1)',
    }}>
      <a href="#how-it-works" style={{
        display: 'inline-block', padding: '18px 52px',
        ...GLASS, borderRadius: 18,
        color: '#fff', fontWeight: 700, fontSize: 18,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        textDecoration: 'none', letterSpacing: '-0.01em',
        boxShadow: '0 0 44px rgba(0,110,255,0.10), 0 8px 32px rgba(0,0,0,0.35)',
        transition: 'background 0.3s, box-shadow 0.3s, transform 0.3s',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
          e.currentTarget.style.boxShadow = '0 0 60px rgba(0,110,255,0.18), 0 8px 32px rgba(0,0,0,0.35)'
          e.currentTarget.style.transform = 'scale(1.03)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = GLASS.background
          e.currentTarget.style.boxShadow = '0 0 44px rgba(0,110,255,0.10), 0 8px 32px rgba(0,0,0,0.35)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        Explore NomNom
      </a>
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
  const [phase, setPhase] = useState('notification')

  const handleAccept = useCallback(() => setPhase('cinematic'), [])
  const handleCinematicDone = useCallback(() => setPhase('complete'), [])

  return (
    <>
      <InjectKeyframes />
      <div style={{
        width: '100%', height: '100vh',
        position: 'relative', overflow: 'hidden',
        background: DARK,
      }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [3, 4.5, -3], fov: 50, near: 0.1, far: 100 }}
            style={{ width: '100%', height: '100%' }}
          >
            <SceneContent phase={phase} onCinematicComplete={handleCinematicDone} />
          </Canvas>
        </div>

        <NotificationCard onAccept={handleAccept} visible={phase === 'notification'} />
        <HudOverlay visible={phase === 'cinematic' || phase === 'complete'} />
        <ExploreButton visible={phase === 'complete'} />
      </div>
    </>
  )
}
