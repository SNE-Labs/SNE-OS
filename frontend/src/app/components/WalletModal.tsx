import { X, Wallet } from 'lucide-react'
import { useWallet } from '../../hooks/useWallet'
import { Button } from './Button'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (connectorId?: string) => Promise<void>
  onSignIn?: () => Promise<void>
  isConnected: boolean
  isAuthenticated: boolean
}

export default function WalletModal({
  isOpen,
  onClose,
  onConnect,
  onSignIn,
  isConnected,
  isAuthenticated,
}: WalletModalProps) {
  const { connectors } = useWallet()

  if (!isOpen) return null

  const handleConnect = async (connectorId?: string) => {
    try {
      await onConnect(connectorId)
      // Modal será fechado após signIn se necessário
    } catch (error) {
      console.error('Connect error:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-8 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Conectar Carteira</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#1B1B1F] rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isConnected ? (
          <>
            <p className="text-[#A6A6A6] text-sm mb-6">
              Conecte sua wallet para acessar o SNE Radar
            </p>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleConnect(connector.id)}
                  className="w-full bg-[#1B1B1F] border border-[rgba(255,255,255,0.1)] rounded-md px-6 py-4 hover:border-[#FF6A00] hover:bg-[#1B1B1F] transition-all duration-150 text-left"
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5" />
                    <span>{connector.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : !isAuthenticated ? (
          <>
            <p className="text-[#A6A6A6] text-sm mb-6">
              Assine a mensagem para autenticar
            </p>
            <Button onClick={onSignIn} className="w-full" disabled={!onSignIn}>
              {onSignIn ? 'Assinar Mensagem (SIWE)' : 'Aguarde...'}
            </Button>
          </>
        ) : null}

        <p className="text-xs text-[#A6A6A6] mt-6 text-center">
          Ao conectar, você concorda com nossos Termos de Uso
        </p>
      </div>
    </div>
  )
}

