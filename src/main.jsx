import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import HeroScene, { InteractiveIPhone } from './HeroScene'
import { Canvas } from '@react-three/fiber'
import { Environment, Html } from '@react-three/drei'

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
      camera={{ position: [0, -0.4, 7.5], fov: 32, near: 0.1, far: 50 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 5, 5]} intensity={2} />
      <directionalLight position={[-5, -5, -5]} intensity={1} />
      <directionalLight position={[0, 5, 5]} intensity={1.5} />

      <Suspense
        fallback={(
          <Html center style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui', fontSize: 14 }}>
            Loading phone…
          </Html>
        )}
      >
        <InteractiveIPhone imageUrl="/nomnom-splash.png" />
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
