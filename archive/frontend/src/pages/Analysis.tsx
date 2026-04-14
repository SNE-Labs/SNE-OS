// ============================================
// SNE RADAR - ANALYSIS PAGE v2.2
// Página integrada: Análise + Gráfico em tempo real
// ============================================

import { useWallet } from '../hooks/useWallet'
import { AnalysisChartView } from '../components/AnalysisChartView'

export default function Analysis() {
  const { isAuthenticated } = useWallet()

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-white/70 mb-4">Conecte sua wallet para acessar a análise</p>
        </div>
      </div>
    )
  }

  return <AnalysisChartView />
}