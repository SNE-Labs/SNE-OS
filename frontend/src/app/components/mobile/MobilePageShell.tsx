import React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from './Badge';
import { useWallet } from '../../../hooks/useWallet';
import { shortenAddress } from '../../../lib/utils';

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
  const { address, isAuthenticated, tier } = useWallet();

  // Auto-gerar statusPill se não fornecido e showContext estiver ativo
  const contextPill = showContext && isAuthenticated && address ? {
    label: `${tier.toUpperCase()} TIER • ${shortenAddress(address)}`,
    variant: tier === 'pro' ? 'pro' : tier === 'premium' ? 'orange' : 'free' as const,
  } : statusPill;

  return (
    <div className={cn('flex flex-col h-full bg-[var(--bg-0)]', className)}>
      {/* Header with safe area */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-[var(--stroke-1)]">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-[var(--text-1)] mb-1">{title}</h1>
            {subtitle && (
              <p className="text-sm text-[var(--text-2)]">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
        {contextPill && (
          <Badge variant={contextPill.variant} size="sm">
            {contextPill.label}
          </Badge>
        )}
      </div>

      {/* Content area with scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

