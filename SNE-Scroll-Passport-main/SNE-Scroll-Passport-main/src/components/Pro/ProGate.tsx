import { X, Zap, Key } from 'lucide-react'

interface ProGateProps {
  feature: string
  onClose: () => void
}

export default function ProGate({ feature, onClose }: ProGateProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-scroll-dark border border-sne-neon/50 rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-sne-neon/10 rounded-lg">
            <Zap className="w-6 h-6 text-sne-neon" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">🚀 {feature} Requer SNE Radar Core</h2>
          </div>
        </div>

        <p className="text-gray-300 mb-6">
          Esta funcionalidade requer o <span className="text-sne-neon font-mono">SNE Radar Core</span> (Licença Genesis - $1.000).
        </p>

        <p className="text-gray-400 text-sm mb-6">
          Conecte sua SNE Key ou adquira a licença para ativar a automação via IA, sniping de tokens e análise algorítmica avançada.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-scroll-dark border border-gray-600 rounded-lg text-white hover:bg-scroll-darker transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              // TODO: Implement SNE Key connection
              console.log('Connect SNE Key')
            }}
            className="flex-1 px-4 py-2 bg-sne-neon/10 border border-sne-neon/50 rounded-lg text-sne-neon hover:bg-sne-neon/20 transition-colors flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" />
            Conectar SNE Key
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-scroll-dark">
          <p className="text-xs text-gray-500 text-center">
            Este app roda melhor na <span className="text-sne-neon">SNE Box</span>
          </p>
        </div>
      </div>
    </div>
  )
}

