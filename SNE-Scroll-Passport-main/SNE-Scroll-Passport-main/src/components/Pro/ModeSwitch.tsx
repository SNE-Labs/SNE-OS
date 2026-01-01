import { useState } from 'react'
import { Eye, Zap } from 'lucide-react'
import ProGate from './ProGate'

type Mode = 'view' | 'trade'

export default function ModeSwitch() {
  const [mode, setMode] = useState<Mode>('view')
  const [showProGate, setShowProGate] = useState(false)

  const handleModeChange = (newMode: Mode) => {
    if (newMode === 'trade') {
      // Check if user has Pro license (placeholder)
      const hasPro = false // TODO: Implement SNE Key check
      
      if (!hasPro) {
        setShowProGate(true)
        return
      }
    }
    setMode(newMode)
  }

  return (
    <>
      <div className="flex items-center gap-1 bg-scroll-dark border border-scroll-dark rounded-lg p-1">
        <button
          onClick={() => handleModeChange('view')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            mode === 'view'
              ? 'bg-sne-neon/20 text-sne-neon border border-sne-neon/50'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Eye className="w-3 h-3" />
          View
        </button>
        <button
          onClick={() => handleModeChange('trade')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            mode === 'trade'
              ? 'bg-sne-neon/20 text-sne-neon border border-sne-neon/50'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Zap className="w-3 h-3" />
          Trade
        </button>
      </div>

      {showProGate && (
        <ProGate
          feature="Trade Mode"
          onClose={() => setShowProGate(false)}
        />
      )}
    </>
  )
}

