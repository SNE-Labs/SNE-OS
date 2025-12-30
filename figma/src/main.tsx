import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import './styles/index.css'
import { Toaster } from 'sonner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster 
      position="top-right" 
      toastOptions={{
        style: {
          background: '#111216',
          color: '#F7F7F8',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }}
    />
  </StrictMode>,
)
