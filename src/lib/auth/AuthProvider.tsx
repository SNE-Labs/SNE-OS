import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';

import { ApiError, apiGet, apiPost } from "../api/http";

export type ConnectMethod = 'injected' | 'walletconnect';
export type AuthStatus = 'idle' | 'restoring' | 'connecting' | 'signing' | 'verifying' | 'authenticated' | 'error';

export type ConnectionOption = {
  id: ConnectMethod;
  label: string;
  description: string;
};

type AuthCtx = {
  address?: string;
  isConnected: boolean;
  isWalletConnected: boolean;
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  authError: string | null;
  tier: 'free' | 'premium' | 'pro';
  connectionOptions: ConnectionOption[];
  connect: (method?: ConnectMethod) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearAuthError: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

const SIWE_DOMAIN = import.meta.env.VITE_SIWE_DOMAIN?.trim() || "snelabs.space";
const SIWE_ORIGIN = import.meta.env.VITE_SIWE_ORIGIN?.trim() || "https://snelabs.space";
const CHAIN_ID = Number(import.meta.env.VITE_SIWE_CHAIN_ID || 534352);

function getNonce(address: string) {
  return apiPost<{ nonce: string }>("/api/auth/nonce", { address });
}

function buildSiweMessage(opts: {
  domain: string;
  address: string;
  uri: string;
  chainId: number;
  nonce: string;
}): string {
  return `${opts.domain} wants you to sign in with your Ethereum account:
${opts.address}

URI: ${opts.uri}
Version: 1
Chain ID: ${opts.chainId}
Nonce: ${opts.nonce}
Issued At: ${new Date().toISOString()}
Expiration Time: ${new Date(Date.now() + 5 * 60 * 1000).toISOString()}`;
}

function connectorMethod(connector: { id?: string; type?: string }): ConnectMethod | null {
  if (connector.id === 'walletConnect' || connector.type === 'walletConnect') return 'walletconnect';
  if (connector.id === 'injected' || connector.type === 'injected' || connector.id === 'metaMask') return 'injected';
  return null;
}

function connectorErrorMessage(method?: ConnectMethod) {
  if (method === 'walletconnect') {
    return 'WalletConnect não está configurado. Defina VITE_WALLETCONNECT_PROJECT_ID antes de habilitar QR e deep link.';
  }
  return 'Nenhuma wallet do navegador foi encontrada. Instale MetaMask, Rabby, Brave Wallet ou use WalletConnect.';
}

function hasInjectedEthereumProvider() {
  if (typeof window === 'undefined') return false;
  return Boolean((window as Window & { ethereum?: unknown }).ethereum);
}

type InjectedEthereumProvider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

function getStoredAuthToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('auth_token');
}

function getInjectedProvider(): InjectedEthereumProvider | null {
  if (typeof window === 'undefined') return null;
  return ((window as Window & { ethereum?: InjectedEthereumProvider }).ethereum ?? null);
}

async function getInjectedAccounts() {
  const provider = getInjectedProvider();
  if (!provider) return [];

  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  return Array.isArray(accounts) ? accounts.filter((item): item is string => typeof item === 'string') : [];
}

async function getInjectedChainId() {
  const provider = getInjectedProvider();
  if (!provider) return null;

  const rawChainId = await provider.request({ method: 'eth_chainId' });
  if (typeof rawChainId !== 'string') return null;

  const parsed = Number.parseInt(rawChainId, 16);
  return Number.isFinite(parsed) ? parsed : null;
}

async function signWithInjectedProvider(message: string, address: string) {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error('Nenhuma wallet do navegador foi encontrada. Instale MetaMask, Rabby, Brave Wallet ou use WalletConnect.');
  }

  const signature = await provider.request({
    method: 'personal_sign',
    params: [message, address],
  });

  if (typeof signature !== 'string') {
    throw new Error('Falha ao obter assinatura da wallet conectada.');
  }

  return signature;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { address: walletAddress, isConnected: walletConnected, chainId: walletChainId } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [sessionAddress, setSessionAddress] = useState<string | undefined>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle');
  const [authError, setAuthError] = useState<string | null>(null);
  const [tier, setTier] = useState<'free' | 'premium' | 'pro'>('free');

  const injectedAvailable = hasInjectedEthereumProvider();
  const walletConnectAvailable = useMemo(
    () => connectors.some((connector) => connectorMethod(connector) === 'walletconnect'),
    [connectors]
  );

  const connectionOptions = useMemo<ConnectionOption[]>(
    () =>
      connectors
        .map((connector) => connectorMethod(connector))
        .filter((method): method is ConnectMethod => Boolean(method))
        .filter((method) => {
          if (method === 'injected') return injectedAvailable;
          if (method === 'walletconnect') return walletConnectAvailable;
          return false;
        })
        .filter((method, index, items) => items.indexOf(method) === index)
        .map((method) =>
          method === 'walletconnect'
            ? {
                id: 'walletconnect',
                label: 'WalletConnect',
                description: 'QR code no desktop e deep link no mobile para MetaMask, Rainbow, Trust e outras wallets.',
              }
            : {
                id: 'injected',
                label: 'Extensão',
                description: 'MetaMask, Rabby, Brave Wallet e wallets injetadas no navegador.',
              }
        ),
    [connectors, injectedAvailable, walletConnectAvailable]
  );

  const displayAddress = walletAddress ?? sessionAddress;

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = getStoredAuthToken();
      if (savedToken) {
        setAuthStatus('restoring');
        await checkAuth();
      }
    };

    void initializeAuth();
  }, []);

  useEffect(() => {
    const checkWalletConnection = async () => {
      if (walletAddress && !isAuthenticated && getStoredAuthToken()) {
        await checkAuth();
      }
    };

    void checkWalletConnection();
  }, [walletAddress, isAuthenticated]);

  const checkAuth = async (): Promise<boolean> => {
    if (!getStoredAuthToken()) {
      setSessionAddress(undefined);
      setIsAuthenticated(false);
      setTier('free');
      setAuthStatus('idle');
      setAuthError(null);
      return false;
    }

    try {
      const response = await apiGet<{ tier: string; address?: string }>('/api/auth/verify', {
        suppressErrorStatuses: [401],
      });

      if (response) {
        setSessionAddress(response.address);
        setTier((response.tier as 'free' | 'premium' | 'pro') || 'free');
        setIsAuthenticated(true);
        setAuthStatus('authenticated');
        setAuthError(null);
        queryClient.invalidateQueries({ queryKey: ['home'] });
        return true;
      }
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        console.log('Auth check failed:', error instanceof Error ? error.message : error);
      }

      localStorage.removeItem('auth_token');
      setSessionAddress(undefined);
      setIsAuthenticated(false);
      setTier('free');
      setAuthStatus('idle');
      setAuthError(null);
    }

    return false;
  };

  async function authenticate(address: string, method?: ConnectMethod, chainIdOverride?: number | null) {
    if (isAuthenticated && sessionAddress?.toLowerCase() === address.toLowerCase()) {
      setAuthStatus('authenticated');
      setAuthError(null);
      return;
    }

    const { nonce } = await getNonce(address);
    const message = buildSiweMessage({
      domain: SIWE_DOMAIN,
      address,
      uri: SIWE_ORIGIN,
      chainId: chainIdOverride ?? walletChainId ?? CHAIN_ID,
      nonce,
    });

    setAuthStatus('signing');
    const signature =
      method === 'injected'
        ? await signWithInjectedProvider(message, address)
        : await signMessageAsync({ message });
    setAuthStatus('verifying');
    const authResponse = await apiPost<{
      token: string;
      tier: 'free' | 'premium' | 'pro';
    }>("/api/auth/siwe", { message, signature }, { credentials: 'include' });

    localStorage.setItem('auth_token', authResponse.token);
    setSessionAddress(address);
    setTier(authResponse.tier || 'free');
    setIsAuthenticated(true);
    setAuthStatus('authenticated');
    setAuthError(null);
    queryClient.invalidateQueries({ queryKey: ['home'] });
  }

  async function connect(method?: ConnectMethod) {
    try {
      setAuthError(null);
      setAuthStatus('connecting');

      if (walletConnected && walletAddress) {
        await authenticate(walletAddress, method);
        return;
      }

      const preferredMethod =
        method ??
        (injectedAvailable
          ? 'injected'
          : walletConnectAvailable
            ? 'walletconnect'
            : 'injected');

      if (preferredMethod === 'injected' && !injectedAvailable) {
        throw new Error(connectorErrorMessage('injected'));
      }

      if (preferredMethod === 'walletconnect' && !walletConnectAvailable) {
        throw new Error(connectorErrorMessage('walletconnect'));
      }

      const connector =
        connectors.find((item) => connectorMethod(item) === preferredMethod) ??
        (method ? null : connectors.find((item) => connectorMethod(item) === 'walletconnect')) ??
        null;

      if (!connector) {
        throw new Error(connectorErrorMessage(preferredMethod));
      }

      if (preferredMethod === 'injected') {
        const accounts = await getInjectedAccounts();
        const nextAddress = accounts[0];

        if (!nextAddress) {
          throw new Error('Nenhuma conta foi retornada pela wallet conectada.');
        }

        await authenticate(nextAddress, 'injected', await getInjectedChainId());
        return;
      }

      let nextAddress = walletAddress;

      if (!nextAddress || method) {
        const connection = await connectAsync({ connector });
        nextAddress = connection.accounts[0];
      }

      if (!nextAddress) {
        throw new Error('Nenhuma conta foi retornada pela wallet conectada.');
      }

      await authenticate(nextAddress, preferredMethod);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setAuthStatus('error');
      setAuthError(error instanceof Error ? error.message : 'Falha ao conectar e autenticar carteira.');
      throw error;
    }
  }

  async function logout() {
    try {
      await apiPost("/api/auth/logout", {}, { credentials: 'include' });
    } catch (error) {
      console.error("Logout error:", error);
    }

    try {
      await disconnectAsync();
    } catch (error) {
      console.warn("Wallet disconnect failed:", error);
    }

    localStorage.removeItem('auth_token');
    setSessionAddress(undefined);
    setIsAuthenticated(false);
    setTier('free');
    setAuthStatus('idle');
    setAuthError(null);
    queryClient.invalidateQueries({ queryKey: ['home'] });
  }

  function clearAuthError() {
    setAuthError(null);
    setAuthStatus(isAuthenticated ? 'authenticated' : 'idle');
  }

  const value = useMemo(
    () => ({
      address: displayAddress,
      isConnected: walletConnected || Boolean(displayAddress),
      isWalletConnected: walletConnected,
      isAuthenticated,
      authStatus,
      authError,
      tier,
      connectionOptions,
      connect,
      logout,
      checkAuth,
      clearAuthError,
    }),
    [displayAddress, walletConnected, isAuthenticated, authStatus, authError, tier, connectionOptions]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
