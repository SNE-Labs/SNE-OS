import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
import { TronLinkAdapter, WalletConnectAdapter } from '@tronweb3/tronwallet-adapters';

export function TronWalletProvider({ children }: { children: ReactNode }) {
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

  return (
    <WalletProvider
      adapters={adapters}
      autoConnect
      disableAutoConnectOnLoad
      localStorageKey="sne:tron:wallet-adapter"
      onError={(error) => console.error('[tron-wallet]', error)}
    >
      {children}
    </WalletProvider>
  );
}
