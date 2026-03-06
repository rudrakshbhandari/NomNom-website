import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Html } from '@react-three/drei'
import * as THREE from 'three'

const C = {
  sky: '#87CEEB',
  phoneBg: '#1a1a2e',
  ground: '#7cb342',
  path: '#d7ccc8',
  geisel: '#e0e0e0',
  geiselAlt: '#bdbdbd',
  dining: '#ffcc80',
  roof: '#8d6e63',
  door: '#5d4037',
  trunk: '#795548',
  leaf: '#43a047',
  leafAlt: '#66bb6a',
  bike: '#37474f',
  shirt: '#ff7043',
  skin: '#ffccbc',
  bag: '#e53935',
  coin: '#ffd600',
  primary: '#00629B',
}

const PATH_PTS = [
  [-15, 0.15, 0], [-11, 0.15, 4], [-5, 0.15, 1.5],
  [0, 0.15, -2.5], [5, 0.15, 2], [11, 0.15, 4], [15, 0.15, 0],
].map(p => new THREE.Vector3(...p))

const TREES = [
  [-13,0,-3,1], [-9,0,7,0.8], [-7,0,-4,1.2], [-3,0,5,0.9],
  [1,0,-4,1.1], [4,0,7,0.7], [7,0,-5,1], [11,0,-3,0.85],
  [-14,0,4,0.95], [-4,0,-6,1.1], [3,0,5,0.8], [9,0,6,1.05],
  [13,0,4,0.9], [-10,0,-6,0.75], [6,0,-7,1.15],
]

const STUDENTS = [[-13,0,2],[-11,0,-2],[2,0,-5],[8,0,3],[13,0,-2],[-6,0,3]]

const labelStyle = {
  color: '#333', fontWeight: 700, fontSize: '13px',
  fontFamily: "'Plus Jakarta Sans',sans-serif", whiteSpace: 'nowrap',
  background: 'rgba(255,255,255,0.88)', padding: '2px 8px', borderRadius: '4px',
}

/* ═══ Lighting ═══ */
function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[15, 20, 10]} intensity={1.2} />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />
    </>
  )
}

/* ═══ Sky color transition ═══ */
function Sky({ phase }) {
  const { scene } = useThree()
  const target = useRef(new THREE.Color(C.phoneBg))

  useEffect(() => {
    target.current.set(phase === 'phone' ? C.phoneBg : C.sky)
  }, [phase])

  useFrame(() => {
    if (!scene.background) scene.background = new THREE.Color(C.phoneBg)
    scene.background.lerp(target.current, 0.03)
  })

  return null
}

/* ═══ Ground ═══ */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[80, 60]} />
      <meshStandardMaterial color={C.ground} flatShading />
    </mesh>
  )
}

/* ═══ Geisel Library — inverted pyramid ═══ */
function Geisel(props) {
  const columns = useMemo(() => [
    [-1.2,1.5,-1],[1.2,1.5,-1],[-1.2,1.5,1],[1.2,1.5,1],[0,1.5,-1.4],[0,1.5,1.4]
  ], [])
  const floors = useMemo(() => [0,1,2,3,4,5], [])

  return (
    <group {...props}>
      {columns.map((p, i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.08, 0.15, 3, 6]} />
          <meshStandardMaterial color={C.geiselAlt} flatShading />
        </mesh>
      ))}
      {floors.map(i => (
        <mesh key={`f${i}`} position={[0, 3 + i * 0.45, 0]}>
          <boxGeometry args={[1.8 + i * 0.5, 0.28, 1.8 + i * 0.5]} />
          <meshStandardMaterial color={i % 2 === 0 ? C.geisel : C.geiselAlt} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 5.9, 0]}>
        <boxGeometry args={[4.5, 0.15, 4.5]} />
        <meshStandardMaterial color={C.geiselAlt} flatShading />
      </mesh>
      <Html position={[0, 6.8, 0]} center distanceFactor={15} zIndexRange={[5, 0]}>
        <div style={labelStyle}>Geisel Library</div>
      </Html>
    </group>
  )
}

/* ═══ Dining Hall ═══ */
function Dining(props) {
  return (
    <group {...props}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[3.5, 2, 2.5]} />
        <meshStandardMaterial color={C.dining} flatShading />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[3.8, 0.3, 2.8]} />
        <meshStandardMaterial color={C.roof} flatShading />
      </mesh>
      <mesh position={[0, 0.6, 1.26]}>
        <boxGeometry args={[0.8, 1.2, 0.05]} />
        <meshStandardMaterial color={C.door} flatShading />
      </mesh>
      <Html position={[0, 3.2, 0]} center distanceFactor={15} zIndexRange={[5, 0]}>
        <div style={labelStyle}>Sixth Dining Hall</div>
      </Html>
    </group>
  )
}

/* ═══ Low-poly tree ═══ */
function Tree({ position, s = 1 }) {
  const clr = useMemo(() => (Math.random() > 0.5 ? C.leaf : C.leafAlt), [])
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 1.2, 5]} />
        <meshStandardMaterial color={C.trunk} flatShading />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[0.5, 1.4, 6]} />
        <meshStandardMaterial color={clr} flatShading />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <coneGeometry args={[0.35, 0.9, 6]} />
        <meshStandardMaterial color={clr} flatShading />
      </mesh>
    </group>
  )
}

/* ═══ Walking student figure ═══ */
function Student({ position }) {
  const ref = useRef()
  const bob = useMemo(() => 1.5 + Math.random(), [])
  const clr = useMemo(() => {
    const a = ['#42a5f5','#ef5350','#ab47bc','#ffa726','#26a69a','#78909c']
    return a[Math.floor(Math.random() * a.length)]
  }, [])

  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.sin(clock.elapsedTime * bob) * 0.04
  })

  return (
    <group position={position} ref={ref}>
      <mesh position={[0, 0.65, 0]}>
        <capsuleGeometry args={[0.12, 0.4, 4, 8]} />
        <meshStandardMaterial color={clr} flatShading />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.13, 8, 6]} />
        <meshStandardMaterial color={C.skin} flatShading />
      </mesh>
    </group>
  )
}

/* ═══ Bike path ═══ */
function PathLine({ curve }) {
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.4, 8, false), [curve])
  return <mesh geometry={geo}><meshStandardMaterial color={C.path} flatShading /></mesh>
}

/* ═══ Courier on bike ═══ */
function Courier({ curve, progress, visible }) {
  const g = useRef()
  const w1 = useRef()
  const w2 = useRef()
  const prev = useRef(0)

  useFrame(() => {
    if (!g.current || !visible) return
    const t = Math.max(0.001, Math.min(0.999, progress))
    const pos = curve.getPointAt(t)
    const ahead = curve.getPointAt(Math.min(t + 0.01, 0.999))
    g.current.position.set(pos.x, pos.y + 0.3, pos.z)
    g.current.lookAt(ahead.x, pos.y + 0.3, ahead.z)
    const spd = Math.abs(progress - prev.current) * 150
    if (w1.current) w1.current.rotation.x += spd
    if (w2.current) w2.current.rotation.x += spd
    prev.current = progress
  })

  if (!visible) return null

  return (
    <group ref={g}>
      <mesh ref={w1} position={[0, -0.1, 0.4]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.22, 0.03, 8, 16]} />
        <meshStandardMaterial color={C.bike} />
      </mesh>
      <mesh ref={w2} position={[0, -0.1, -0.4]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.22, 0.03, 8, 16]} />
        <meshStandardMaterial color={C.bike} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.04, 0.04, 0.9]} />
        <meshStandardMaterial color={C.bike} />
      </mesh>
      <mesh position={[0, 0.15, 0.15]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.04, 0.35, 0.04]} />
        <meshStandardMaterial color={C.bike} />
      </mesh>
      <mesh position={[0, 0.25, -0.15]}>
        <boxGeometry args={[0.15, 0.04, 0.12]} />
        <meshStandardMaterial color="#212121" />
      </mesh>
      <mesh position={[0, 0.3, 0.35]}>
        <boxGeometry args={[0.3, 0.04, 0.04]} />
        <meshStandardMaterial color={C.bike} />
      </mesh>
      <mesh position={[0, 0.55, -0.05]}>
        <capsuleGeometry args={[0.13, 0.35, 4, 8]} />
        <meshStandardMaterial color={C.shirt} flatShading />
      </mesh>
      <mesh position={[0, 0.95, 0.05]}>
        <sphereGeometry args={[0.14, 8, 6]} />
        <meshStandardMaterial color={C.skin} flatShading />
      </mesh>
      <mesh position={[0, 0.55, -0.3]}>
        <boxGeometry args={[0.3, 0.35, 0.2]} />
        <meshStandardMaterial color={C.bag} flatShading />
      </mesh>
    </group>
  )
}

/* ═══ Floating phone — Scene 1 ═══ */
function Phone({ onAccept, visible, phase }) {
  const g = useRef()
  const tgt = useRef(1)

  useEffect(() => { tgt.current = phase === 'transition' ? 0 : 1 }, [phase])

  useFrame(() => {
    if (!g.current) return
    const s = g.current.scale.x + (tgt.current - g.current.scale.x) * 0.04
    g.current.scale.setScalar(Math.max(0.001, s))
  })

  if (!visible) return null

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.25}>
      <group ref={g} position={[1.8, 0.5, 0]}>
        <mesh>
          <boxGeometry args={[1.4, 2.6, 0.12]} />
          <meshStandardMaterial color={C.phoneBg} />
        </mesh>
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry args={[1.25, 2.4]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
        <Html
          position={[0, 0, 0.08]}
          center
          distanceFactor={4}
          zIndexRange={[25, 20]}
          style={{ pointerEvents: 'auto', userSelect: 'none' }}
        >
          <div style={{
            width: 220, padding: 16,
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            background: '#fff', borderRadius: 12, textAlign: 'center',
          }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.primary, marginBottom: 12 }}>
              NomNom
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#333', marginBottom: 14 }}>
              New Order Request
            </div>
            <div style={{
              background: '#f5f5f5', borderRadius: 8, padding: 12,
              marginBottom: 16, textAlign: 'left',
            }}>
              {[['Pickup', 'Sixth Dining Hall'], ['Dropoff', 'Geisel Library'], ['Tip', '$3']].map(([k, v]) => (
                <div key={k} style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                  <strong style={{ color: '#333' }}>{k}:</strong> {v}
                </div>
              ))}
            </div>
            <button onClick={onAccept} style={{
              width: '100%', padding: 10, background: C.primary, color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14,
              fontFamily: "'Plus Jakarta Sans',sans-serif", cursor: 'pointer',
              transition: 'background 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#00507d'}
              onMouseLeave={e => e.currentTarget.style.background = C.primary}
            >
              Accept Delivery
            </button>
          </div>
        </Html>
      </group>
    </Float>
  )
}

/* ═══ Coins — Scene 4 ═══ */
function Coins({ visible }) {
  const refs = useRef([])
  const data = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      x: (Math.random() - 0.5) * 3,
      z: (Math.random() - 0.5) * 3,
      spd: 1.5 + Math.random() * 2,
      off: i * 0.15,
    })), [])

  useFrame(({ clock }) => {
    if (!visible) return
    refs.current.forEach((m, i) => {
      if (!m) return
      const d = data[i]
      const t = clock.elapsedTime - d.off
      m.position.y = 1.5 + Math.abs(Math.sin(t * d.spd)) * 1.5
      m.rotation.y += 0.06
    })
  })

  if (!visible) return null

  return (
    <group position={[15, 0, 0]}>
      {data.map((d, i) => (
        <mesh key={i} ref={el => { refs.current[i] = el }} position={[d.x, 2, d.z]}>
          <cylinderGeometry args={[0.2, 0.2, 0.06, 16]} />
          <meshStandardMaterial color={C.coin} metalness={0.7} roughness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

/* ═══ Camera controller ═══ */
function CameraRig({ phase, progress, curve }) {
  const { camera } = useThree()
  const pos = useRef(new THREE.Vector3(0, 1.5, 5))
  const look = useRef(new THREE.Vector3(0, 0.5, 0))
  const posT = useRef(new THREE.Vector3(0, 1.5, 5))
  const lookT = useRef(new THREE.Vector3(0, 0.5, 0))

  useFrame(() => {
    if (phase === 'phone') {
      posT.current.set(0, 1.5, 5)
      lookT.current.set(0, 0.5, 0)
    } else if (phase === 'transition') {
      posT.current.set(0, 18, 28)
      lookT.current.set(0, 0, 0)
    } else {
      const t = Math.max(0.001, Math.min(0.999, progress))
      const p = curve.getPointAt(t)
      const a = curve.getPointAt(Math.min(t + 0.05, 0.999))
      const d = new THREE.Vector3().subVectors(a, p).normalize()
      posT.current.set(p.x - d.x * 8, p.y + 6, p.z - d.z * 8 + 5)
      lookT.current.set(p.x + d.x * 2, p.y + 0.5, p.z + d.z * 2)
    }

    const spd = phase === 'transition' ? 0.025 : 0.06
    pos.current.lerp(posT.current, spd)
    look.current.lerp(lookT.current, spd)
    camera.position.copy(pos.current)
    camera.lookAt(look.current)
  })

  return null
}

/* ═══ Campus environment ═══ */
function Campus({ visible, curve }) {
  if (!visible) return null
  return (
    <group>
      <Ground />
      <Geisel position={[15, 0, 0]} />
      <Dining position={[-15, 0, 0]} />
      <PathLine curve={curve} />
      {TREES.map(([x, y, z, s], i) => <Tree key={i} position={[x, y, z]} s={s} />)}
      {STUDENTS.map((p, i) => <Student key={i} position={p} />)}
    </group>
  )
}

/* ═══ Main component ═══ */
export default function HeroScene() {
  const [phase, setPhase] = useState('phone')
  const [progress, setProgress] = useState(0)
  const wrapperRef = useRef()
  const curve = useMemo(() => new THREE.CatmullRomCurve3(PATH_PTS), [])

  const handleAccept = useCallback(() => {
    setPhase('transition')
    setTimeout(() => setPhase('journey'), 2500)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (phase !== 'journey' && phase !== 'complete') return
      const el = wrapperRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      if (scrollable <= 0) return
      const p = Math.max(0, Math.min(1, -rect.top / scrollable))
      setProgress(p)
      if (p > 0.95 && phase !== 'complete') setPhase('complete')
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [phase])

  const showPhone = phase === 'phone' || phase === 'transition'
  const showCampus = phase !== 'phone'
  const showCourier = phase === 'journey' || phase === 'complete'
  const showCoins = phase === 'complete'
  const wrapperH = (phase === 'journey' || phase === 'complete') ? '500vh' : '100vh'

  return (
    <div ref={wrapperRef} className="hero-3d-wrapper" style={{ height: wrapperH }}>
      <div className="hero-3d-sticky">
        <div className="hero-3d-overlay">
          <div className="hero-3d-text">
            <div className="hero-badge">UCSD students only — @ucsd.edu</div>
            <h1 className="hero-title">
              Triton2Go food,<br />
              <span className="highlight">delivered to your dorm.</span>
            </h1>
            <p className="hero-subhead">
              Order from Triton2Go and get it delivered by students.
            </p>
            <div className="hero-ctas">
              <a href="#download" className="btn btn-primary">Download for iOS</a>
              <a href="#download" className="btn btn-secondary">Get on Android</a>
            </div>
          </div>
        </div>

        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 1.5, 5], fov: 60 }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Lights />
          <Sky phase={phase} />
          <CameraRig phase={phase} progress={progress} curve={curve} />
          <Phone onAccept={handleAccept} visible={showPhone} phase={phase} />
          <Campus visible={showCampus} curve={curve} />
          <Courier curve={curve} progress={progress} visible={showCourier} />
          <Coins visible={showCoins} />
        </Canvas>

        {phase === 'journey' && (
          <div className="hero-3d-progress-bar">
            <div className="hero-3d-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        )}

        {phase === 'complete' && (
          <div className="hero-3d-complete">
            <p>Earn money between classes.</p>
            <a href="#for-riders" className="btn btn-primary">Join NomNom at UCSD</a>
          </div>
        )}
      </div>
    </div>
  )
}
