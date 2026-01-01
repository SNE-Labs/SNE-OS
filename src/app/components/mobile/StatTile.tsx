import React from 'react';
import { cn } from '../ui/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatTileProps {
  label: string;
  value: string | number;
  delta?: {
    value: string | number;
    positive?: boolean;
  };
  className?: string;
}

export function StatTile({ label, value, delta, className }: StatTileProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[var(--text-2)] text-xs uppercase tracking-wide">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-[var(--text-1)] text-2xl">{value}</span>
        {delta && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs',
              delta.positive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            )}
          >
            {delta.positive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {delta.value}
          </span>
        )}
      </div>
    </div>
  );
}

