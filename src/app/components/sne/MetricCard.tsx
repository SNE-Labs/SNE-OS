import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, trend, trendValue, icon }: MetricCardProps) {
  const trendConfig = {
    up: { icon: TrendingUp, color: 'var(--sne-success)' },
    down: { icon: TrendingDown, color: 'var(--sne-critical)' },
    neutral: { icon: Minus, color: 'var(--sne-text-secondary)' },
  };

  const trendInfo = trend ? trendConfig[trend] : null;

  return (
    <div
      className="rounded border p-6 transition-all hover:border-opacity-100"
      style={{
        backgroundColor: 'var(--sne-surface-1)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <span style={{ fontSize: 'var(--text-body)', color: 'var(--sne-text-secondary)' }}>
          {label}
        </span>
        {icon && <div style={{ color: 'var(--sne-accent)' }}>{icon}</div>}
      </div>

      <div className="mb-2">
        <span
          style={{
            fontSize: 'var(--text-h2)',
            fontWeight: 700,
            color: 'var(--sne-text-primary)',
          }}
        >
          {value}
        </span>
      </div>

      {trendInfo && trendValue && trendInfo.icon && (
        <div className="flex items-center gap-1.5">
          {React.createElement(trendInfo.icon, { className: "w-4 h-4", style: { color: trendInfo.color } })}
          <span
            style={{
              fontSize: 'var(--text-small)',
              color: trendInfo.color,
            }}
          >
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}
