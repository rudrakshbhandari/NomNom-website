import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import HeroScene, { InteractiveIPhone } from './HeroScene'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, Html } from '@react-three/drei'

const el = document.getElementById('hero-3d-root')
if (el) {
  createRoot(el).render(
    <StrictMode>
      <HeroScene />
    </StrictMode>
  )
}

function PhoneShowcaseScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.2, 6.2], fov: 28, near: 0.1, far: 50 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3.5, 4.2, 2.8]} intensity={1.25} />
      <directionalLight position={[-3.0, 2.5, -2.5]} intensity={0.75} />
      <spotLight position={[0, 4.5, 2.5]} angle={0.45} penumbra={0.75} intensity={1.1} />

      <Suspense
        fallback={(
          <Html center style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui', fontSize: 14 }}>
            Loading phone…
          </Html>
        )}
      >
        <InteractiveIPhone imageUrl="/nomnom-splash.png" />

        <ContactShadows
          position={[0, -1.25, 0]}
          opacity={0.35}
          scale={5.5}
          blur={2.2}
          far={3.5}
        />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  )
}

const phoneRoot = document.getElementById('phone-showcase-root')
if (phoneRoot) {
  createRoot(phoneRoot).render(
    <StrictMode>
      <PhoneShowcaseScene />
    </StrictMode>
  )
}
