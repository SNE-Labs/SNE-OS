import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';

import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
import { TronLinkAdapter, WalletConnectAdapter } from '@tronweb3/tronwallet-adapters';

const TRON_WALLET_STORAGE_KEY = 'sne:tron:wallet-adapter';
const STALE_WALLETCONNECT_MARKERS = ['No matching key', "session topic doesn't exist"];

export function TronWalletProvider({ children }: { children: ReactNode }) {
  const [providerNonce, setProviderNonce] = useState(0);
  const walletConnectProjectId =
    import.meta.env.VITE_TRON_WALLETCONNECT_PROJECT_ID?.trim() ||
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim();
  const appUrl = (import.meta.env.VITE_SIWE_ORIGIN?.trim() || 'https://snelabs.space').replace(/\/$/, '');

  const adapters = useMemo(() => {
    const baseAdapters = [
      new TronLinkAdapter({
        dappName: 'SNE OS',
        dappIcon: `${appUrl}/web-app-manifest-192x192.png`,
        openUrlWhenWalletNotFound: false,
      }),
    ];

    if (walletConnectProjectId) {
      baseAdapters.push(
        new WalletConnectAdapter({
          network: 'Mainnet',
          options: {
            projectId: walletConnectProjectId,
            metadata: {
              name: 'SNE OS',
              description: 'SNE OS Tron checkout',
              url: appUrl,
              icons: [`${appUrl}/web-app-manifest-192x192.png`],
            },
          },
          allWallets: 'HIDE',
          enableMobileDeepLink: true,
        })
      );
    }

    return baseAdapters;
  }, [appUrl, walletConnectProjectId]);

  const handleWalletError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const hasStaleWalletConnectSession = STALE_WALLETCONNECT_MARKERS.some((marker) => message.includes(marker));

    if (hasStaleWalletConnectSession) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(TRON_WALLET_STORAGE_KEY);
      }
      setProviderNonce((current) => current + 1);
      console.warn('[tron-wallet] stale WalletConnect session detected, provider reset.');
      return;
    }

    console.error('[tron-wallet]', error);
  }, []);

  return (
    <WalletProvider
      key={providerNonce}
      adapters={adapters}
      autoConnect={false}
      disableAutoConnectOnLoad
      localStorageKey={TRON_WALLET_STORAGE_KEY}
      onError={handleWalletError}
    >
      {children}
    </WalletProvider>
  );
}
