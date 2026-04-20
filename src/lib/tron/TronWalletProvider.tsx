import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
import { TronLinkAdapter } from '@tronweb3/tronwallet-adapters';

import { IsolatedWalletConnectAdapter } from './IsolatedWalletConnectAdapter';

const TRON_WALLET_STORAGE_KEY = 'sne:tron:wallet-adapter';
const TRON_WALLETCONNECT_STORAGE_PREFIX = 'sne-tron-wc';
const LEGACY_TRON_WALLETCONNECT_MARKERS = [
  'tron:',
  'tron_signTransaction',
  'tron_signMessage',
  '0x2b6653dc',
  '0x94a9059e',
  '0xcd8690dc',
];
const STALE_WALLETCONNECT_MARKERS = [
  'No matching key',
  "session topic doesn't exist",
  'Pending session not found',
  'proposal:',
];

function clearWalletConnectStorage(customStoragePrefix: string) {
  if (typeof window === 'undefined') return;

  const shouldClear = (storage: Storage, key: string) => {
    const normalizedKey = key.toLowerCase();

    if (key === TRON_WALLET_STORAGE_KEY) return true;
    if (normalizedKey.startsWith('sne:tron:')) return true;
    if (normalizedKey.includes(customStoragePrefix.toLowerCase())) return true;
    if (normalizedKey.includes(TRON_WALLETCONNECT_STORAGE_PREFIX)) return true;
    if (!normalizedKey.includes('walletconnect') && !normalizedKey.includes('wc@2')) return false;

    const value = storage.getItem(key);
    if (!value) return false;

    return LEGACY_TRON_WALLETCONNECT_MARKERS.some((marker) => value.includes(marker));
  };

  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keysToRemove: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && shouldClear(storage, key)) {
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
  const walletConnectStoragePrefix = `${TRON_WALLETCONNECT_STORAGE_PREFIX}-${providerNonce}`;

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
        new IsolatedWalletConnectAdapter({
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
          customStoragePrefix: walletConnectStoragePrefix,
        })
      );
    }

    return baseAdapters;
  }, [appUrl, walletConnectProjectId, walletConnectStoragePrefix]);

  const resetStaleWalletConnectSession = useCallback(() => {
    clearWalletConnectStorage(walletConnectStoragePrefix);
    setProviderNonce((current) => current + 1);
    console.warn('[tron-wallet] stale WalletConnect session detected, provider reset.');
  }, [walletConnectStoragePrefix]);

  const handleWalletError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const hasStaleWalletConnectSession = STALE_WALLETCONNECT_MARKERS.some((marker) => message.includes(marker));

    if (hasStaleWalletConnectSession) {
      resetStaleWalletConnectSession();
      return;
    }

    if (message.includes('The wallet is not found.')) {
      console.warn('[tron-wallet] Tron wallet not found in this page context.');
      return;
    }

    console.error('[tron-wallet]', error);
  }, [resetStaleWalletConnectSession]);

  useEffect(() => {
    // Clear only Tron-specific WalletConnect residue so the EVM WalletConnect runtime can
    // continue using its own persisted session.
    clearWalletConnectStorage(walletConnectStoragePrefix);
  }, [walletConnectStoragePrefix]);

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
