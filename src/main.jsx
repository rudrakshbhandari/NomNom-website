import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import HeroScene from './HeroScene'

const el = document.getElementById('hero-3d-root')
if (el) {
  createRoot(el).render(
    <StrictMode>
      <HeroScene />
    </StrictMode>
  )
}
