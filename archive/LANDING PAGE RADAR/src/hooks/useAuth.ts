// Hook para autenticação SIWE real
// Mantém a UI igual, mas conecta com backend

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { getAuthNonce, verifyAuthSignature, getUserLicenses, type LicenseInfo } from '../services/api';

type AuthState = 'disconnected' | 'connecting' | 'connected' | 'wrong-network';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>('disconnected');
  const [userLicenses, setUserLicenses] = useState<LicenseInfo[]>([]);
  const [isLoadingLicenses, setIsLoadingLicenses] = useState(false);

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const connectWallet = async () => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      setAuthState('connecting');

      // 1. Get nonce from backend
      const nonce = await getAuthNonce(address);

      // 2. Create SIWE message
      const message = `snelabs.space wants you to sign in with your Ethereum account:\n${address}\n\nSign in to SNE Radar\n\nURI: https://snelabs.space\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;

      // 3. Sign message
      const signature = await signMessageAsync({ message });

      // 4. Verify with backend (creates session)
      const result = await verifyAuthSignature(message, signature);

      if (result.success) {
        setAuthState('connected');
        // Load user licenses
        await loadUserLicenses();
      } else {
        throw new Error(result.error || 'Authentication failed');
      }

    } catch (error) {
      setAuthState('disconnected');
      throw error;
    }
  };

  const loadUserLicenses = async () => {
    if (authState !== 'connected') return;

    try {
      setIsLoadingLicenses(true);
      const licenses = await getUserLicenses();
      setUserLicenses(licenses);
    } catch (error) {
      console.error('Failed to load licenses:', error);
    } finally {
      setIsLoadingLicenses(false);
    }
  };

  const hasValidLicense = () => {
    const now = Date.now() / 1000; // timestamp in seconds
    return userLicenses.some(license =>
      license.isLifetime || license.expiryTimestamp > now
    );
  };

  const logout = () => {
    setAuthState('disconnected');
    setUserLicenses([]);
    // Backend handles logout via API, but for now just reset state
  };

  return {
    authState,
    userLicenses,
    isLoadingLicenses,
    connectWallet,
    loadUserLicenses,
    hasValidLicense,
    logout
  };
};
