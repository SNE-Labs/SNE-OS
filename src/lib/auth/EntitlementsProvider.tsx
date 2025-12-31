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
  const { isConnected } = useAuth();
  const [loading, setLoading] = useState(false);
  const [entitlements, setEntitlements] = useState<Entitlements | undefined>();

  async function refresh() {
    setLoading(true);
    try {
      const data = await getEntitlements();
      setEntitlements(data);
    } catch (error) {
      console.warn("Failed to fetch entitlements:", error);
      // Set default entitlements for free tier when API fails
      setEntitlements({
        user: undefined,
        tier: "free",
        features: ["vault.preview", "pass.preview", "radar.preview"],
        limits: { watchlist: 3, signals_per_day: 10 }
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // reidrata sessão (refresh da página)
    (async () => {
      try {
        const s = await getSession();
        if (s.user) await refresh();
        else setEntitlements(undefined);
      } catch (error) {
        console.warn("Failed to get session:", error);
        // Set default state when session fails
        setEntitlements(undefined);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isConnected) {
      setEntitlements(undefined);
    } else {
      refresh().catch(error => {
        console.warn("Failed to refresh entitlements on connect:", error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const value = useMemo(() => ({ loading, entitlements, refresh }), [loading, entitlements]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEntitlements must be used within EntitlementsProvider");
  return v;
}