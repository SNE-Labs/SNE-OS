import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiPost } from "../../lib/api/http";
import { CHAIN_RPC_URLS } from "../../lib/rpcUrls";

type Status =
    | "AWAITING_WALLET"
    | "FETCHING_NONCE"
    | "AWAITING_SIGNATURE"
    | "VERIFYING"
    | "SUCCESS"
    | "ERROR";

const DESKTOP_SIWE_CHAIN_ID = Number(import.meta.env.VITE_SIWE_CHAIN_ID || 42161);
const DESKTOP_CHAIN_CONFIG_BY_ID: Record<number, { chainName: string; nativeCurrency: { name: string; symbol: string; decimals: number }; rpcUrls: string[]; blockExplorerUrls: string[] }> = {
    42161: {
        chainName: "Arbitrum One",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: [CHAIN_RPC_URLS.arbitrum],
        blockExplorerUrls: ["https://arbiscan.io"],
    },
    421614: {
        chainName: "Arbitrum Sepolia",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: [CHAIN_RPC_URLS.arbitrumSepolia],
        blockExplorerUrls: ["https://sepolia.arbiscan.io"],
    },
};

function safeTrunc(s: string, left = 6, right = 4) {
    if (!s) return "";
    if (s.length <= left + right) return s;
    return `${s.slice(0, left)}…${s.slice(-right)}`;
}

// Build SIWE message for desktop auth
function buildDesktopSiweMessage(opts: {
    domain: string;
    address: string;
    uri: string;
    chainId: number;
    nonce: string;
    machineId: string;
    state: string;
}): string {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 min TTL

    return `${opts.domain} wants you to sign in with your Ethereum account:
${opts.address}

Authenticate SNE Radar Desktop

Machine: ${opts.machineId}
State: ${opts.state}

URI: ${opts.uri}
Version: 1
Chain ID: ${opts.chainId}
Nonce: ${opts.nonce}
Issued At: ${now.toISOString()}
Expiration Time: ${expiresAt.toISOString()}`;
}

async function requestAddress(): Promise<string> {
    // @ts-expect-error - ethereum injected
    const eth = window.ethereum;

    if (!eth) {
        throw new Error("NO_WALLET");
    }

    try {
        const existingAccounts = (await eth.request({ method: "eth_accounts" })) as string[];
        if (existingAccounts && existingAccounts.length > 0) {
            return existingAccounts[0];
        }

        const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
        if (!accounts || accounts.length === 0) {
            throw new Error("USER_REJECTED_CONNECT");
        }
        return accounts[0];
    } catch (error: any) {
        if (error.code === 4001) {
            throw new Error("USER_REJECTED_CONNECT");
        }
        throw new Error("WALLET_ERROR");
    }
}

async function signMessage(message: string, address: string): Promise<string> {
    // @ts-expect-error - ethereum injected
    const eth = window.ethereum;

    try {
        const sig = (await eth.request({
            method: "personal_sign",
            params: [message, address],
        })) as string;

        return sig;
    } catch (error: any) {
        if (error.code === 4001) {
            throw new Error("USER_REJECTED_SIGN");
        }
        throw new Error("SIGNATURE_ERROR");
    }
}

async function switchDesktopChain(targetChainId: number): Promise<void> {
    // @ts-expect-error - ethereum injected
    const eth = window.ethereum;
    if (!eth) return;

    const desiredHex = `0x${targetChainId.toString(16)}`;
    const currentChainId = await eth.request({ method: "eth_chainId" });
    if (typeof currentChainId === "string" && currentChainId.toLowerCase() === desiredHex.toLowerCase()) {
        return;
    }

    try {
        await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: desiredHex }],
        });
    } catch (error: any) {
        if (error?.code !== 4902) {
            throw error;
        }

        const chainConfig = DESKTOP_CHAIN_CONFIG_BY_ID[targetChainId];
        if (!chainConfig) {
            throw error;
        }

        await eth.request({
            method: "wallet_addEthereumChain",
            params: [
                {
                    chainId: desiredHex,
                    chainName: chainConfig.chainName,
                    nativeCurrency: chainConfig.nativeCurrency,
                    rpcUrls: chainConfig.rpcUrls,
                    blockExplorerUrls: chainConfig.blockExplorerUrls,
                },
            ],
        });
    }
}

export function AuthDesktop() {
    const [params] = useSearchParams();
    const machine_id = params.get("machine_id") || "";
    const state = params.get("state") || "";
    const app = params.get("app") || "desktop";

    const [status, setStatus] = useState<Status>("AWAITING_WALLET");
    const [error, setError] = useState<string>("");
    const [address, setAddress] = useState<string>("");
    const abortRef = useRef<AbortController | null>(null);

    const isValidQuery = useMemo(() => {
        return machine_id.length >= 8 && state.length >= 16 && app === "desktop";
    }, [machine_id, state, app]);

    useEffect(() => {
        if (!isValidQuery) {
            setStatus("ERROR");
            setError("INVALID_STATE");
            // Deep link error callback
            window.location.href = `sneradar://auth-error?error=INVALID_STATE&machine_id=${encodeURIComponent(machine_id || "")}`;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function reset() {
        abortRef.current?.abort();
        abortRef.current = null;
        setError("");
        setAddress("");
        setStatus("AWAITING_WALLET");
    }

    async function start() {
        try {
            if (!isValidQuery) return;

            abortRef.current?.abort();
            abortRef.current = new AbortController();

            setStatus("AWAITING_WALLET");

            // 1) Connect wallet
            await switchDesktopChain(DESKTOP_SIWE_CHAIN_ID);
            const addr = await requestAddress();
            setAddress(addr);

            // 2) Get nonce with desktop context
            setStatus("FETCHING_NONCE");
            const nonceRes = await apiPost<{ nonce: string }>("/api/auth/nonce", {
                address: addr,
                machine_id,
                state,
                app: "desktop",
            });

            const { nonce } = nonceRes;

            // 3) Build SIWE message with desktop context
            const siweMessage = buildDesktopSiweMessage({
                domain: "snelabs.space",
                address: addr,
                uri: "https://snelabs.space/auth",
                chainId: DESKTOP_SIWE_CHAIN_ID,
                nonce,
                machineId: machine_id,
                state,
            });

            // 4) Sign message
            setStatus("AWAITING_SIGNATURE");
            const signature = await signMessage(siweMessage, addr);

            // 5) Verify and get one-time code (NOT full token)
            setStatus("VERIFYING");
            const verifyRes = await apiPost<{
                code: string;
            }>("/api/auth/siwe", {
                message: siweMessage,
                signature,
                machine_id,
                state,
                app: "desktop",
            });

            const { code } = verifyRes;

            setStatus("SUCCESS");

            // 6) Deep link callback matching desktop app expectations
            // Desktop expects: sneradar://auth?code=XXX&state=YYY (auth_manager.py line 372)
            const url = `sneradar://auth?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

            // Small delay to show success state
            setTimeout(() => {
                window.location.href = url;
            }, 1500);

        } catch (e: any) {
            const msg = String(e?.message || "UNKNOWN_ERROR");

            // Map error codes
            const mapped =
                msg === "USER_REJECTED_CONNECT" ? "USER_REJECTED_CONNECT" :
                    msg === "USER_REJECTED_SIGN" ? "USER_REJECTED_SIGN" :
                        msg === "NO_WALLET" ? "NO_WALLET" :
                            msg === "INVALID_STATE" ? "INVALID_STATE" :
                                msg === "STATE_EXPIRED" ? "STATE_EXPIRED" :
                                    msg === "VERIFY_FAILED" ? "VERIFY_FAILED" :
                                        "NETWORK_ERROR";

            setStatus("ERROR");
            setError(mapped);

            // Deep link error callback
            window.location.href = `sneradar://auth-error?error=${encodeURIComponent(mapped)}&machine_id=${encodeURIComponent(machine_id)}`;
        }
    }

    useEffect(() => {
        if (isValidQuery) {
            // Auto-start authentication flow
            start();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isValidQuery]);

    // Error messages mapping
    const errorMessages: Record<string, string> = {
        USER_REJECTED_CONNECT: "Connection rejected. Please approve MetaMask connection.",
        USER_REJECTED_SIGN: "Signature rejected. Please sign the message to authenticate.",
        NO_WALLET: "No wallet found. Please install MetaMask.",
        INVALID_STATE: "Invalid authentication state. Please restart from desktop app.",
        STATE_EXPIRED: "Authentication session expired. Please restart from desktop app.",
        VERIFY_FAILED: "Verification failed. Please try again.",
        NETWORK_ERROR: "Network error. Please check your connection and try again.",
    };

    return (
        <div className="min-h-screen w-full bg-black text-green-300 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl rounded-xl border border-green-500/30 bg-black/60 p-8 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 pb-6 border-b border-green-500/20">
                    <div className="text-xl font-bold tracking-wide text-green-400">
                        SNE RADAR // AUTH_TERMINAL
                    </div>
                    <div className="text-xs px-3 py-1.5 rounded border border-green-500/30 bg-green-500/10 font-mono">
                        {status}
                    </div>
                </div>

                {/* Session Info */}
                <div className="mt-6 space-y-3 text-sm font-mono">
                    <div className="flex justify-between gap-4 py-2 border-b border-green-500/10">
                        <span className="opacity-70">$ auth.status</span>
                        <span className="text-green-400">{status}</span>
                    </div>
                    <div className="flex justify-between gap-4 py-2 border-b border-green-500/10">
                        <span className="opacity-70">$ machine.id</span>
                        <span className="text-green-400">{safeTrunc(machine_id, 10, 6)}</span>
                    </div>
                    <div className="flex justify-between gap-4 py-2 border-b border-green-500/10">
                        <span className="opacity-70">$ session.state</span>
                        <span className="text-green-400">{safeTrunc(state, 10, 6)}</span>
                    </div>
                    <div className="flex justify-between gap-4 py-2 border-b border-green-500/10">
                        <span className="opacity-70">$ wallet.address</span>
                        <span className="text-green-400">{address ? safeTrunc(address) : "—"}</span>
                    </div>
                </div>

                {/* Error State */}
                {status === "ERROR" && (
                    <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                        <div className="font-semibold text-red-400 mb-2">! ERROR</div>
                        <div className="font-mono text-xs mb-1">{error}</div>
                        <div className="text-sm opacity-80 mt-2">
                            {errorMessages[error] || "An unknown error occurred."}
                        </div>
                        <button
                            onClick={reset}
                            className="mt-4 px-4 py-2 rounded border border-red-400/40 hover:bg-red-500/20 transition-colors font-mono text-sm"
                        >
                            [ABORT] Retry
                        </button>
                    </div>
                )}

                {/* Success State */}
                {status === "SUCCESS" && (
                    <div className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                        <div className="font-semibold text-green-400 mb-2">✓ AUTHENTICATION SUCCESS</div>
                        <div className="text-sm opacity-80">
                            Returning to desktop application...
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs opacity-60">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span>Redirecting...</span>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {status !== "ERROR" && status !== "SUCCESS" && (
                    <div className="mt-6 p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                            <div className="text-sm font-mono">
                                {status === "AWAITING_WALLET" && "$ Connecting wallet..."}
                                {status === "FETCHING_NONCE" && "$ Requesting nonce from server..."}
                                {status === "AWAITING_SIGNATURE" && "$ Waiting for signature... (check MetaMask)"}
                                {status === "VERIFYING" && "$ Verifying SIWE signature..."}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-green-500/10 text-xs opacity-60 text-center font-mono">
                    snelabs.space/support • v1.0.0-beta
                </div>
            </div>
        </div>
    );
}
