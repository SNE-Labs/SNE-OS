import { Outlet, Link, useLocation } from 'react-router-dom'
import { Menu, X, Wallet, Zap, Github } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useWallet } from '../../hooks/useWallet'
import { useIsMobile } from '../../hooks/useIsMobile'
import { Button } from './Button'
import { cn, shortenAddress } from '../../lib/utils'
import WalletModal from './WalletModal'
import { MobileLayout } from './MobileLayout'

export default function Layout() {
  const isMobile = useIsMobile()
  const location = useLocation()
  const { address, isConnected, isAuthenticated, tier, connect, signIn, signOut } = useWallet()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)

  const handleConnectWallet = () => {
    setShowWalletModal(true)
  }

  // Efeito para mostrar modal quando conectar wallet mas não estiver autenticado
  useEffect(() => {
    if (isConnected && !isAuthenticated && address) {
      setShowWalletModal(true)
    }
  }, [isConnected, isAuthenticated, address])

  const handleSignIn = async () => {
    try {
      await signIn()
      setShowWalletModal(false)
    } catch (error) {
      console.error('Sign in error:', error)
    }
  }

  const isActive = (path: string) => location.pathname === path

  // Se for mobile, usar MobileLayout
  if (isMobile) {
    return (
      <MobileLayout>
        <Outlet />
      </MobileLayout>
    )
  }

  // Layout desktop
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#F7F7F8]">
      {/* Wallet Connect Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={connect}
        onSignIn={isConnected && !isAuthenticated ? handleSignIn : undefined}
        isConnected={isConnected}
        isAuthenticated={isAuthenticated}
      />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0B0B0B] border-b border-[rgba(255,255,255,0.1)] h-16">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-[#FF6A00]" />
              <h1 className="font-mono font-bold text-xl">SNE Radar</h1>
            </Link>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/dashboard"
                className={cn(
                  'text-sm transition-colors',
                  isActive('/dashboard') || isActive('/')
                    ? 'text-[#F7F7F8] border-b-2 border-[#FF6A00] pb-0.5'
                    : 'text-[#A6A6A6] hover:text-[#F7F7F8]'
                )}
              >
                Dashboard
              </Link>
              <Link
                to="/chart"
                className={cn(
                  'text-sm transition-colors',
                  isActive('/chart')
                    ? 'text-[#F7F7F8] border-b-2 border-[#FF6A00] pb-0.5'
                    : 'text-[#A6A6A6] hover:text-[#F7F7F8]'
                )}
              >
                Charts
              </Link>
              <Link
                to="/analysis"
                className={cn(
                  'text-sm transition-colors',
                  isActive('/analysis')
                    ? 'text-[#F7F7F8] border-b-2 border-[#FF6A00] pb-0.5'
                    : 'text-[#A6A6A6] hover:text-[#F7F7F8]'
                )}
              >
                Analysis
              </Link>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Tier Badge & Wallet - Só mostrar quando AUTENTICADO */}
            {isAuthenticated && address ? (
              <div className="hidden md:flex items-center gap-3">
                <Link
                  to="/pricing"
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-mono font-medium transition-all hover:scale-105',
                    tier === 'free' && 'bg-[#1B1B1F] text-[#A6A6A6] hover:bg-[#252529]',
                    tier === 'premium' && 'bg-[rgba(255,106,0,0.2)] text-[#FF6A00] hover:bg-[rgba(255,106,0,0.3)]',
                    tier === 'pro' && 'bg-[rgba(255,200,87,0.2)] text-[#FFC857] hover:bg-[rgba(255,200,87,0.3)]'
                  )}
                >
                  {tier.toUpperCase()}
                </Link>
                <span className="font-mono text-sm text-[#A6A6A6]">
                  {shortenAddress(address)}
                </span>
                <button
                  onClick={signOut}
                  className="text-sm text-[#A6A6A6] hover:text-[#FF4D4F] transition-colors"
                >
                  Sair
                </button>
              </div>
            ) : (
              <Button onClick={handleConnectWallet} size="sm" disabled={isConnected && !isAuthenticated}>
                <Wallet className="w-4 h-4 mr-2 inline" />
                {isConnected ? 'Assinar Mensagem' : 'Conectar Carteira'}
              </Button>
            )}

            <a
              href="https://github.com/SNE-Labs"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:block p-2 rounded transition-colors hover:bg-[#1B1B1F]"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5 text-[#A6A6A6]" />
            </a>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#111216] border-t border-[rgba(255,255,255,0.1)] p-4">
            <div className="flex flex-col gap-3">
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="text-left py-2"
              >
                Dashboard
              </Link>
              <Link
                to="/chart"
                onClick={() => setMenuOpen(false)}
                className="text-left py-2"
              >
                Charts
              </Link>
              <Link
                to="/analysis"
                onClick={() => setMenuOpen(false)}
                className="text-left py-2"
              >
                Analysis
              </Link>
              <Link
                to="/pricing"
                onClick={() => setMenuOpen(false)}
                className="text-left py-2"
              >
                Pricing
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.1)] mt-auto py-12 px-6 bg-[#111216]">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono font-bold text-xl">SNE Radar</span>
              </div>
              <p className="text-sm text-[#A6A6A6]">
                Análise técnica avançada com IA e execução verificável
              </p>
            </div>

            <div>
              <h4 className="mb-3 font-semibold">Produtos</h4>
              <ul className="space-y-2 text-sm text-[#A6A6A6]">
                <li><a href="https://radar.snelabs.space" className="hover:text-[#FF6A00] transition-colors">SNE Radar</a></li>
                <li><a href="https://snelabs.space" className="hover:text-[#FF6A00] transition-colors">SNE Vault</a></li>
                <li><a href="https://pass.snelabs.space" className="hover:text-[#FF6A00] transition-colors">SNE Pass</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 font-semibold">Recursos</h4>
              <ul className="space-y-2 text-sm text-[#A6A6A6]">
                <li><Link to="/dashboard" className="hover:text-[#FF6A00] transition-colors">Dashboard</Link></li>
                <li><Link to="/chart" className="hover:text-[#FF6A00] transition-colors">Gráficos</Link></li>
                <li><Link to="/analysis" className="hover:text-[#FF6A00] transition-colors">Análise</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-[#A6A6A6]">
                <li><a href="#" className="hover:text-[#FF6A00] transition-colors">Licenças</a></li>
                <li><a href="#" className="hover:text-[#FF6A00] transition-colors">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[rgba(255,255,255,0.1)]">
            <p className="text-sm text-[#A6A6A6]">
              © {new Date().getFullYear()} SNE Labs. Licença MIT. Sistema operando em Scroll L2.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

