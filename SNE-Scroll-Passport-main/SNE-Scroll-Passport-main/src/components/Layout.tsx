import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import WalletConnect from './Wallet/WalletConnect'
import GasTracker from './Gas/GasTracker'
import ModeSwitch from './Pro/ModeSwitch'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-scroll-darker text-white">
      {/* Header */}
      <header className="border-b border-scroll-dark/50 bg-scroll-dark/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <Wallet className="w-6 h-6 text-sne-neon group-hover:text-sne-cyan transition-colors" />
              <span className="text-xl font-bold font-mono">
                SNE <span className="text-sne-neon">Scroll</span> Pass
              </span>
            </Link>

            {/* Gas Tracker */}
            <div className="flex items-center gap-4">
              <GasTracker />
              <ModeSwitch />
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-scroll-dark/30 bg-scroll-dark/20">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <NavLink to="/" currentPath={location.pathname}>
              Dashboard
            </NavLink>
            <NavLink to="/transfer" currentPath={location.pathname}>
              Transfer
            </NavLink>
            <NavLink to="/spy" currentPath={location.pathname}>
              Spy Mode
            </NavLink>
            <NavLink to="/public" currentPath={location.pathname}>
              Public View
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-scroll-dark/50 bg-scroll-dark/30 mt-auto py-6">
        <div className="container mx-auto px-4 text-center text-sm text-gray-400">
          <p>
            The unofficial official control panel for Scroll Network
          </p>
          <p className="mt-2">
            Powered by <span className="text-sne-neon font-mono">SNE Labs</span>
          </p>
        </div>
      </footer>
    </div>
  )
}

function NavLink({ to, currentPath, children }: { to: string; currentPath: string; children: ReactNode }) {
  const isActive = currentPath === to || (to !== '/' && currentPath.startsWith(to))
  
  return (
    <Link
      to={to}
      className={`px-4 py-3 text-sm font-medium transition-colors ${
        isActive
          ? 'text-sne-neon border-b-2 border-sne-neon'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </Link>
  )
}

