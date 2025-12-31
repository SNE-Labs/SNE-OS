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
      } catch {
        setEntitlements(undefined);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isConnected) setEntitlements(undefined);
    else refresh();
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