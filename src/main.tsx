import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App.tsx'
import { handleVitePreloadError } from './app/utils/lazyRoute.ts'
import './styles/index.css'

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', handleVitePreloadError)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
