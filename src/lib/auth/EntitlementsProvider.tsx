import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { keysApi, type KeysEntitlement } from "../../services/keys-api";
import { useAuth } from "./AuthProvider";

type EntCtx = {
  loading: boolean;
  entitlement?: KeysEntitlement;
  effectiveAccess: boolean;
  accessClass: KeysEntitlement["accessClass"];
  feeTier: KeysEntitlement["feeTier"] | "standard";
  refresh: () => Promise<void>;
};

const Ctx = createContext<EntCtx | null>(null);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const { address, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [entitlement, setEntitlement] = useState<KeysEntitlement | undefined>();

  async function refresh() {
    setLoading(true);
    try {
      if (address) {
        const data = await keysApi.getEntitlement(address);
        setEntitlement(data);
      } else {
        setEntitlement(undefined);
      }
    } catch (error) {
      console.warn("Failed to resolve sovereign entitlements:", error);
      setEntitlement(undefined);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isAuthenticated]);

  const value = useMemo(
    () => ({
      loading,
      entitlement,
      effectiveAccess: Boolean(entitlement?.effectiveAccess),
      accessClass: entitlement?.accessClass ?? 'none',
      feeTier: entitlement?.feeTier ?? 'standard',
      refresh,
    }),
    [loading, entitlement]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEntitlements must be used within EntitlementsProvider");
  return v;
}
