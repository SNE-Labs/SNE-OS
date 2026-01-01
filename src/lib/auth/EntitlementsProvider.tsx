import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Entitlements, getEntitlements, getSession } from "../api/entitlements";
import { useAuth } from "./AuthProvider";

type EntCtx = {
  loading: boolean;
  entitlements?: Entitlements;
  refresh: () => Promise<void>;
};

const Ctx = createContext<EntCtx | null>(null);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, tier } = useAuth();
  const [loading, setLoading] = useState(false);
  const [entitlements, setEntitlements] = useState<Entitlements | undefined>();

  // Função para gerar entitlements baseado no tier
  function getEntitlementsForTier(userTier: 'free' | 'premium' | 'pro'): Entitlements {
    const baseEntitlements = {
      user: undefined,
      tier: userTier,
    };

    switch (userTier) {
      case 'free':
        return {
          ...baseEntitlements,
          features: ["vault.preview", "pass.preview", "radar.preview"],
          limits: { watchlist: 3, signals_per_day: 10 }
        };
      case 'premium':
        return {
          ...baseEntitlements,
          features: ["vault.checkout", "pass.access", "radar.access"],
          limits: { watchlist: 10, signals_per_day: 50 }
        };
      case 'pro':
        return {
          ...baseEntitlements,
          features: ["vault.checkout", "pass.access", "radar.access", "radar.trade"],
          limits: { watchlist: 50, signals_per_day: -1 } // -1 = unlimited
        };
      default:
        return {
          ...baseEntitlements,
          features: ["vault.preview", "pass.preview", "radar.preview"],
          limits: { watchlist: 3, signals_per_day: 10 }
        };
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      if (isAuthenticated && tier) {
        // Usar entitlements baseado no tier do AuthProvider
        const data = getEntitlementsForTier(tier);
        setEntitlements(data);
      } else {
        setEntitlements(undefined);
      }
    } catch (error) {
      console.warn("Failed to set entitlements:", error);
      // Fallback para free tier
      setEntitlements(getEntitlementsForTier('free'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, tier]);

  const value = useMemo(() => ({ loading, entitlements, refresh }), [loading, entitlements]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEntitlements must be used within EntitlementsProvider");
  return v;
}