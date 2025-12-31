import { apiGet } from "./http";

export type Tier = "free" | "pro" | "enterprise";

export type Entitlements = {
  user?: string;
  tier: Tier;
  features: string[];
  limits: Record<string, number>;
  expiresAt?: string;
};

export function getEntitlements() {
  return apiGet<Entitlements>("/api/entitlements");
}

export function getSession() {
  return apiGet<{ user?: string }>("/api/session");
}