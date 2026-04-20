import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
import { TronLinkAdapter, WalletConnectAdapter } from '@tronweb3/tronwallet-adapters';

const TRON_WALLET_STORAGE_KEY = 'sne:tron:wallet-adapter';
const STALE_WALLETCONNECT_MARKERS = ['No matching key', "session topic doesn't exist"];

function clearWalletConnectStorage() {
  if (typeof window === 'undefined') return;

  const shouldClear = (key: string) =>
    key === TRON_WALLET_STORAGE_KEY ||
    key.toLowerCase().includes('walletconnect') ||
    key.toLowerCase().includes('wc@2');

  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keysToRemove: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && shouldClear(key)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  }
}

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

  const resetStaleWalletConnectSession = useCallback(() => {
    clearWalletConnectStorage();
    setProviderNonce((current) => current + 1);
    console.warn('[tron-wallet] stale WalletConnect session detected, provider reset.');
  }, []);

  const handleWalletError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const hasStaleWalletConnectSession = STALE_WALLETCONNECT_MARKERS.some((marker) => message.includes(marker));

    if (hasStaleWalletConnectSession) {
      resetStaleWalletConnectSession();
      return;
    }

    console.error('[tron-wallet]', error);
  }, [resetStaleWalletConnectSession]);

  useEffect(() => {
    // Tron WalletConnect session resume has been producing stale-topic loops in production.
    // Start each page load from a clean connector state until the adapter proves session
    // rehydration is reliable enough for this checkout flow.
    clearWalletConnectStorage();
  }, []);

  useEffect(() => {
    const extractMessage = (reason: unknown) => {
      if (reason instanceof Error) return reason.message;
      if (typeof reason === 'string') return reason;
      return String(reason ?? '');
    };

    const matchesStaleWalletConnect = (message: string) =>
      STALE_WALLETCONNECT_MARKERS.some((marker) => message.includes(marker));

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!matchesStaleWalletConnect(extractMessage(event.reason))) return;
      event.preventDefault();
      resetStaleWalletConnectSession();
    };

    const handleWindowError = (event: ErrorEvent) => {
      if (!matchesStaleWalletConnect(extractMessage(event.error ?? event.message))) return;
      event.preventDefault();
      resetStaleWalletConnectSession();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, [resetStaleWalletConnectSession]);

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
