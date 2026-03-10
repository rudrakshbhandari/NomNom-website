import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import HeroScene, { IPhoneGLB } from './HeroScene'
import { Canvas } from '@react-three/fiber'

const el = document.getElementById('hero-3d-root')
if (el) {
  createRoot(el).render(
    <StrictMode>
      <HeroScene />
    </StrictMode>
  )
}

function DownloadPhoneScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.7, 2.4], fov: 38, near: 0.1, far: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[2.5, 3.5, 2.5]} intensity={1.0} />
      <directionalLight position={[-2.5, 2.0, -2.0]} intensity={0.6} />
      <IPhoneGLB position={[0, -0.75, 0]} rotation={[0.05, 0.65, 0]} scale={1.15} />
    </Canvas>
  )
}

const dl = document.getElementById('download-phone-root')
if (dl) {
  createRoot(dl).render(
    <StrictMode>
      <DownloadPhoneScene />
    </StrictMode>
  )
}
