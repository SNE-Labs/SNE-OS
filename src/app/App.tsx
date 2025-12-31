import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { BottomBar } from './components/BottomBar';
import { Home } from './pages/Home';
import { Radar } from './pages/Radar';
import { Pass } from './pages/Pass';
import { Vault } from './pages/Vault';
import { Pricing } from './pages/Pricing';
import { Status } from './pages/Status';
import { Docs } from './pages/Docs';
import { ConnectWalletModal } from './components/ConnectWalletModal';
import { AuthProvider } from '@/lib/auth/AuthProvider.tsx';
import { EntitlementsProvider } from '@/lib/auth/EntitlementsProvider.tsx';

export default function App() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [currentApp, setCurrentApp] = useState('Radar');

  const handleConnectWallet = () => {
    // Simulate wallet connection
    const mockAddress = '0x742d...4a2f';
    setWalletAddress(mockAddress);
    setIsWalletConnected(true);
    setIsConnectModalOpen(false);
  };

  return (
    <AuthProvider>
      <EntitlementsProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-0)' }}>
            {/* Main Layout */}
            <div className="flex flex-1">
              {/* Left Sidebar - Fixed 300px */}
              <Sidebar />

              {/* Center Content - Fluid */}
              <div className="flex-1 flex flex-col">
                {/* Topbar */}
                <Topbar
                  isWalletConnected={isWalletConnected}
                  walletAddress={walletAddress}
                  onConnectWallet={() => setIsConnectModalOpen(true)}
                  currentApp={currentApp}
                  onAppChange={setCurrentApp}
                />

                {/* Main Content Area with Right Panel */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Center Content */}
                  <main className="flex-1 overflow-y-auto">
                    <Routes>
                      <Route path="/" element={<Navigate to="/home" replace />} />
                      <Route path="/home" element={<Home />} />
                      <Route path="/radar" element={<Radar isWalletConnected={isWalletConnected} />} />
                      <Route path="/pass" element={<Pass isWalletConnected={isWalletConnected} walletAddress={walletAddress} />} />
                      <Route path="/vault" element={<Vault />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/status" element={<Status />} />
                      <Route path="/docs" element={<Docs />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </div>

            {/* Bottom Bar - Session Bar */}
            <BottomBar isWalletConnected={isWalletConnected} walletAddress={walletAddress} />

            {/* Connect Wallet Modal */}
            <ConnectWalletModal
              isOpen={isConnectModalOpen}
              onClose={() => setIsConnectModalOpen(false)}
              onConnect={handleConnectWallet}
            />
          </div>
        </BrowserRouter>
      </EntitlementsProvider>
    </AuthProvider>
  );
}
