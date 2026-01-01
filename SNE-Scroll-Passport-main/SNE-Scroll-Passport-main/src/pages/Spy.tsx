import { Eye } from 'lucide-react'
import WatchlistManager from '../components/Spy/WatchlistManager'

export default function Spy() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-sne-neon/10 rounded-lg">
            <Eye className="w-6 h-6 text-sne-neon" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Spy Mode</h1>
            <p className="text-gray-400">
              Monitore carteiras e acompanhe movimentações
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-scroll-dark border border-sne-neon/30 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-2">Como funciona</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• Adicione carteiras à sua watchlist para monitorar saldos</li>
          <li>• Visualize saldos em tempo real sem conectar sua wallet</li>
          <li>• Compare múltiplas carteiras lado a lado</li>
          <li>• Dados salvos localmente no seu navegador</li>
        </ul>
      </div>

      {/* Watchlist Manager */}
      <WatchlistManager />
    </div>
  )
}
