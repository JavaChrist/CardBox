import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Service Worker PWA - Vite PWA gère automatiquement
// Pas besoin d'enregistrement manuel, Vite PWA s'en charge

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
