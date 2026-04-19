import React from 'react';
import { cn } from '../ui/utils';
import { Badge } from './Badge';
import { useAuth } from '@/lib/auth/useAuth';
import { useEntitlements } from '@/lib/auth/EntitlementsProvider';
import { formatAddress } from '@/utils/format';

export interface MobilePageShellProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  statusPill?: {
    label: string;
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'orange' | 'free' | 'pro' | 'enterprise';
  };
  showContext?: boolean; // Mostrar tier/network/wallet no header
  children: React.ReactNode;
  className?: string;
}

export function MobilePageShell({
  title,
  subtitle,
  action,
  statusPill,
  showContext = true,
  children,
  className,
}: MobilePageShellProps) {
  const { address, isAuthenticated, tier } = useAuth();
  const { entitlements } = useEntitlements();
  const isOsHome = title.trim().toUpperCase() === 'SNE OS';
  const effectiveTier = entitlements?.tier ?? tier;
  const tierLabel =
    effectiveTier === 'pro'
      ? 'PLANO PRO'
      : effectiveTier === 'premium'
        ? 'PLANO PREMIUM'
        : 'PLANO FREE';

  const contextPill = showContext && isAuthenticated && address ? {
    label: `${tierLabel} • ${formatAddress(address)}`,
    variant: effectiveTier === 'pro' ? 'pro' : effectiveTier === 'premium' ? 'orange' : 'free' as const,
  } : null;

  return (
    <div className={cn('flex flex-col h-full bg-[var(--bg-0)]', className)}>
      {/* Header with safe area */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-[var(--stroke-1)]">
        {isOsHome ? (
          <div className="mb-3 flex flex-col items-center justify-center text-center">
            <div className="relative mb-3 flex h-14 w-14 items-center justify-center">
              <div
                className="absolute inset-1 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,140,66,0.38) 0%, rgba(255,140,66,0.18) 36%, rgba(255,140,66,0.06) 62%, transparent 82%)',
                  filter: 'blur(12px)',
                }}
              />
              <img src="/favicon.ico" alt="SNE OS" className="relative z-10 h-8 w-8 rounded-[10px]" />
            </div>
            {subtitle && (
              <p className="max-w-[280px] text-sm text-[var(--text-2)]">{subtitle}</p>
            )}
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-[var(--text-1)] mb-1">{title}</h1>
              {subtitle && (
                <p className="text-sm text-[var(--text-2)]">{subtitle}</p>
              )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
        )}
        {(statusPill || contextPill) && (
          <div className={cn('flex flex-wrap items-center gap-2', isOsHome && 'justify-center')}>
            {statusPill && (
              <Badge variant={statusPill.variant} size="sm">
                {statusPill.label}
              </Badge>
            )}
            {contextPill && (
              <Badge variant={contextPill.variant} size="sm">
                {contextPill.label}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Content area with scroll */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="px-4 py-4 space-y-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 7.5rem)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
