import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { apiGet, apiPost } from "../api/http";

type AuthCtx = {
  address?: string;
  isConnected: boolean;
  isAuthenticated: boolean;
  tier: 'free' | 'premium' | 'pro';
  connect: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
};

const Ctx = createContext<AuthCtx | null>(null);

// SIWE configuration
const SIWE_DOMAIN = "snelabs.space";
const SIWE_ORIGIN = "https://snelabs.space";
const CHAIN_ID = 534352; // Scroll L2

async function getNonce(address: string) {
  try {
    const response = await apiPost<{ nonce: string }>("/api/auth/nonce", { address });
    return response;
  } catch (error) {
    console.warn("Failed to get nonce, using fallback:", error);
    return { nonce: "fallback-nonce-" + Date.now() };
  }
}

// aqui você pluga sua lib atual (WalletConnect/wagmi/viem).
// como você quer "não quebrar nada", dá pra começar usando o provider injetado (MetaMask)
// e depois trocar por WalletConnect sem mudar o resto do OS.
async function requestAddress(): Promise<string> {
  // Verificar se estamos em HTTPS (MetaMask requer HTTPS)
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    throw new Error("MetaMask requires HTTPS. Please access this site via https://snelabs.space");
  }

  // Aguardar um pouco para garantir que o ethereum object está totalmente carregado
  await new Promise(resolve => setTimeout(resolve, 100));

  // @ts-expect-error - ethereum injected
  const eth = window.ethereum;

  if (!eth) {
    throw new Error("No wallet found. Please install MetaMask or another Web3 wallet and refresh the page.");
  }

  // Verificar se estamos no domínio correto
  if (window.location.hostname !== 'snelabs.space' && window.location.hostname !== 'localhost') {
    console.warn("Warning: Connecting from untrusted domain:", window.location.hostname);
  }

  // Verificar se é MetaMask ou outro provider
  if (eth.isMetaMask) {
    console.log("MetaMask detected, version:", eth.isMetaMask);
  } else {
    console.log("Other Web3 wallet detected");
  }

  // Verificar se MetaMask está unlocked
  try {
    await eth.request({ method: "eth_accounts" });
  } catch (error) {
    console.warn("MetaMask may be locked:", error);
  }

  console.log("Attempting to request accounts...");

  try {
    // Primeiro tentar verificar contas existentes (não solicita permissão)
    const existingAccounts = (await eth.request({ method: "eth_accounts" })) as string[];
    console.log("Existing accounts:", existingAccounts);

    if (existingAccounts && existingAccounts.length > 0) {
      console.log("Using existing connected account");
      return existingAccounts[0];
    }

    // Se não há contas conectadas, solicitar permissão
    console.log("Requesting account permission...");
    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    console.log("Accounts received:", accounts);

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found. Please connect your wallet.");
    }
    return accounts[0];
  } catch (error: any) {
    console.error("Wallet connection failed:", error);

    if (error.code === 4001) {
      throw new Error("Connection rejected by user. Please try again and approve the connection in MetaMask.");
    }
    if (error.code === -32002) {
      throw new Error("Connection request already pending. Please check MetaMask for pending requests.");
    }
    if (error.code === 4100) {
      throw new Error("MetaMask is not authorized for this site. Please enable it in MetaMask settings.");
    }
    if (error.code === 4200) {
      throw new Error("MetaMask is not enabled. Please unlock your wallet.");
    }

    // Verificar se é um erro de rede ou conexão
    if (error.message && error.message.includes("extension")) {
      throw new Error("MetaMask extension communication failed. Please refresh the page and try again.");
    }

    // Fallback error message
    throw new Error(`Wallet connection failed: ${error.message || 'Unknown error'}`);
  }
}

async function signMessage(message: string): Promise<string> {
  // @ts-expect-error - ethereum injected
  const eth = window.ethereum;
  const from = await requestAddress();

  const sig = (await eth.request({
    method: "personal_sign",
    params: [message, from],
  })) as string;

  return sig;
}

function // Build SIWE message (compatible with backend)
buildSiweMessage(opts: {
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | undefined>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tier, setTier] = useState<'free' | 'premium' | 'pro'>('free');

  // Verificar autenticação existente ao inicializar
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        // Configurar axios com token salvo
        // Note: Aqui você precisaria configurar o axios globalmente ou passar o token nas chamadas
        console.log("Found saved auth token, checking validity...");
        await checkAuth();
      }
    };

    initializeAuth();
  }, []);

  // Verificar autenticação quando wallet conectar
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (address && !isAuthenticated) {
        // Wallet conectada mas não autenticada - tentar verificar se já existe sessão
        await checkAuth();
      }
    };

    checkWalletConnection();
  }, [address, isAuthenticated]);

  const checkAuth = async (): Promise<boolean> => {
    try {
      const response = await apiGet<{ tier: string }>('/api/auth/verify');

      if (response) {
        const verifiedTier = (response.tier as 'free' | 'premium' | 'pro') || 'free';
        setTier(verifiedTier);
        setIsAuthenticated(true);
        return true;
      }
    } catch (error: any) {
      console.log('Auth check failed:', error.message);
      // Token inválido - limpar
      localStorage.removeItem('auth_token');
      setIsAuthenticated(false);
      setTier('free');
    }

    return false;
  };

  async function connect() {
    try {
      const addr = await requestAddress();

      // Verificar se já está autenticado para este endereço
      if (isAuthenticated && address === addr) {
        console.log("Already authenticated for this address");
        return;
      }

      const { nonce } = await getNonce(addr);

      const message = buildSiweMessage({
        domain: SIWE_DOMAIN,
        address: addr,
        uri: SIWE_ORIGIN,
        chainId: CHAIN_ID,
        nonce
      });

      const signature = await signMessage(message);

      // Usar endpoint SIWE correto
      const authResponse = await apiPost<{
        token: string;
        tier: 'free' | 'premium' | 'pro';
      }>("/api/auth/siwe", { message, signature });

      // Salvar token JWT
      const { token, tier: userTier } = authResponse;
      localStorage.setItem('auth_token', token);

      setAddress(addr);
      setTier(userTier || 'free');
      setIsAuthenticated(true);

      console.log("Authentication successful");
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }

  async function logout() {
    try {
      await apiPost("/api/auth/logout", {});
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Limpar dados locais
    localStorage.removeItem('auth_token');
    setAddress(undefined);
    setIsAuthenticated(false);
    setTier('free');
  }

  const value = useMemo(
    () => ({
      address,
      isConnected: Boolean(address),
      isAuthenticated,
      tier,
      connect,
      logout,
      checkAuth
    }),
    [address, isAuthenticated, tier]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}