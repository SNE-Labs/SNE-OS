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
  // @ts-expect-error - ethereum injected
  const eth = window.ethereum;
  if (!eth) throw new Error("No injected wallet found");

  const [addr] = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!addr) throw new Error("Wallet not connected");

  return addr;
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