import React, { createContext, useContext, useMemo, useState } from "react";
import { apiGet, apiPost } from "../api/http";

type AuthCtx = {
  address?: string;
  isConnected: boolean;
  connect: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

async function getNonce(address: string) {
  try {
    return await apiPost<{ nonce: string }>("/api/auth/nonce", { address });
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

function buildSiweMessage(opts: {
  domain: string;
  address: string;
  uri: string;
  chainId: number;
  nonce: string;
}): string {
  // Mensagem SIWE mínima (backend valida). Se você já tem SIWE lib no Radar, pode alinhar 1:1 depois.
  // Mantém simples pra "ligar agora".
  return `${opts.domain} wants you to sign in with your Ethereum account:
${opts.address}

URI: ${opts.uri}
Version: 1
Chain ID: ${opts.chainId}
Nonce: ${opts.nonce}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | undefined>();

  async function connect() {
    try {
      const addr = await requestAddress();
      const { nonce } = await getNonce(addr);

      // Sempre usar sne.space como domínio para SIWE (consistência entre dev/prod)
      const domain = "snelabs.space";
      const uri = "https://snelabs.space";
      const chainId = 534352; // Scroll L2 chain ID

      const message = buildSiweMessage({ domain, address: addr, uri, chainId, nonce });

      const signature = await signMessage(message);

      await apiPost("/api/auth/verify", { message, signature });

      setAddress(addr);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }

  async function logout() {
    await apiPost("/api/auth/logout", {});
    setAddress(undefined);
  }

  const value = useMemo(
    () => ({ address, isConnected: Boolean(address), connect, logout }),
    [address]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}