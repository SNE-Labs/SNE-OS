import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, BadgeCheck, CircleDot, KeyRound, Newspaper, Radar } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useShellContextData } from '../shell-context';

const toneStyles = {
  accent: {
    color: 'var(--accent-orange)',
    backgroundColor: 'rgba(255, 102, 0, 0.08)',
    borderColor: 'rgba(255, 102, 0, 0.16)',
  },
  success: {
    color: 'var(--ok-green)',
    backgroundColor: 'rgba(50, 213, 131, 0.08)',
    borderColor: 'rgba(50, 213, 131, 0.14)',
  },
  warning: {
    color: 'var(--warn-amber)',
    backgroundColor: 'rgba(255, 176, 32, 0.08)',
    borderColor: 'rgba(255, 176, 32, 0.14)',
  },
  neutral: {
    color: 'var(--text-2)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
} as const;

type StreamMeta = {
  kind: string;
  state: string;
  icon: LucideIcon;
};

function resolveStreamMeta(label: string): StreamMeta {
  const value = label.toLowerCase();
  if (value.includes('intel') || value.includes('brief') || value.includes('dossiê')) {
    return { kind: 'INTEL', state: 'READ', icon: Newspaper };
  }
  if (value.includes('sessão') || value.includes('wallet') || value.includes('carteira')) {
    return { kind: 'SESSION', state: value.includes('conecte') ? 'WAIT' : 'LIVE', icon: BadgeCheck };
  }
  if (value.includes('capital') || value.includes('redes') || value.includes('usdt')) {
    return { kind: 'VAULT', state: 'SYNC', icon: CircleDot };
  }
  if (value.includes('operator') || value.includes('discovery') || value.includes('key')) {
    return { kind: 'ACCESS', state: 'AUTH', icon: KeyRound };
  }
  if (value.includes('%') || value.includes('hold') || value.includes('média')) {
    return { kind: 'MARKET', state: 'LIVE', icon: Radar };
  }
  return { kind: 'OPS', state: 'FLOW', icon: Activity };
}

export function TapeWire() {
  const { routeMeta, tapeItems } = useShellContextData();
  const family = routeMeta.family;
  const hidden = family === 'execucao' || family === 'segredo';
  const compact = family === 'infraestrutura' || family === 'referencia';
  const label = compact ? 'Estado' : 'Fluxo';
  const items = useMemo(() => {
    if (hidden || tapeItems.length === 0) return [];
    if (compact) return tapeItems.slice(0, 3);

    const repeated: typeof tapeItems = [];

    while (repeated.length < Math.max(tapeItems.length * 3, 12)) {
      repeated.push(...tapeItems);
    }

    return repeated;
  }, [compact, hidden, tapeItems]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="relative overflow-hidden border-b"
      style={{
        borderColor: compact ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.06)',
        background: compact
          ? 'linear-gradient(180deg, rgba(255,255,255,0.012), rgba(255,255,255,0)), rgba(6,8,12,0.72)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)), rgba(6,8,12,0.9)',
      }}
    >
      <div
        className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] lg:flex"
        style={{
          borderColor: compact ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.08)',
          backgroundColor: compact ? 'rgba(8, 11, 16, 0.58)' : 'rgba(8, 11, 16, 0.74)',
          color: 'var(--text-3)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: compact ? 'var(--text-3)' : 'var(--accent-orange)',
            boxShadow: compact ? 'none' : '0 0 12px rgba(255,102,0,0.45)',
          }}
        />
        {label}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20"
        style={{ background: 'linear-gradient(90deg, rgba(7,9,11,0.92), transparent)' }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20"
        style={{ background: 'linear-gradient(270deg, rgba(7,9,11,0.92), transparent)' }}
      />

      <div className={`${compact ? '' : 'shell-tape-track'} flex min-w-max items-center gap-2 ${compact ? 'py-1' : 'py-1.5'} pl-24 pr-6`}>
        {items.map((item, index) => {
          const meta = resolveStreamMeta(item.label);
          const Icon = meta.icon;
          const content = (
            <>
              <span className="tape-stream__meta">
                <Icon className="h-3.5 w-3.5" />
                {meta.kind}
              </span>
              <span className="tape-stream__label">{item.label}</span>
              <span className="tape-stream__state">{meta.state}</span>
            </>
          );

          return (
            <div
              key={`${item.label}-${index}`}
              className="flex shrink-0 items-center gap-2"
            >
              {item.href ? (
                <Link
                  to={item.href}
                  className={`tape-stream tape-stream--${item.tone} ${compact ? 'tape-stream--compact' : ''}`}
                  style={toneStyles[item.tone]}
                >
                  {content}
                </Link>
              ) : (
                <div
                  className={`tape-stream tape-stream--${item.tone} ${compact ? 'tape-stream--compact' : ''}`}
                  style={toneStyles[item.tone]}
                >
                  {content}
                </div>
              )}
              {!compact ? (
                <div className="tape-stream__link-line" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
