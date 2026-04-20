import React from 'react'
import ReactDOM from 'react-dom/client'
import { Buffer } from 'buffer'
import App from './app/App.tsx'
import { handleVitePreloadError } from './app/utils/lazyRoute.ts'
import './styles/index.css'

if (typeof window !== 'undefined') {
  if (!('Buffer' in window)) {
    (window as typeof window & { Buffer: typeof Buffer }).Buffer = Buffer
  }
  if (!('Buffer' in globalThis)) {
    ;(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer
  }
  window.addEventListener('vite:preloadError', handleVitePreloadError)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
