import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Entitlements } from "../api/entitlements";
import { useAuth } from "./AuthProvider";
import { keysApi, type KeysEntitlement } from "../../services/keys-api";

type EntCtx = {
  loading: boolean;
  entitlements?: Entitlements;
  refresh: () => Promise<void>;
};

const Ctx = createContext<EntCtx | null>(null);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const { address, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [entitlements, setEntitlements] = useState<Entitlements | undefined>();

  function buildEntitlementsFromKeys(data: KeysEntitlement | null | undefined): Entitlements {
    if (!data?.effectiveAccess) {
      return {
        user: data?.wallet ?? undefined,
        tier: 'free',
        features: ['vault.preview', 'pass.preview', 'radar.preview'],
        limits: { watchlist: 3, signals_per_day: 10 },
      };
    }

    return {
      user: data.wallet ?? undefined,
      tier: 'pro',
      features: ['vault.checkout', 'pass.access', 'radar.access', 'radar.trade', 'keys.operator'],
      limits: { watchlist: 50, signals_per_day: -1 },
      expiresAt: undefined,
    };
  }

  async function refresh() {
    setLoading(true);
    try {
      if (address) {
        const data = await keysApi.getEntitlement(address);
        setEntitlements(buildEntitlementsFromKeys(data));
      } else {
        setEntitlements(buildEntitlementsFromKeys(undefined));
      }
    } catch (error) {
      console.warn("Failed to resolve sovereign entitlements:", error);
      setEntitlements(buildEntitlementsFromKeys(undefined));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isAuthenticated]);

  const value = useMemo(() => ({ loading, entitlements, refresh }), [loading, entitlements]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEntitlements must be used within EntitlementsProvider");
  return v;
}
