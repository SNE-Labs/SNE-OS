import { useMemo } from 'react';

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

export function TapeWire() {
  const { tapeItems } = useShellContextData();
  const items = useMemo(() => {
    if (tapeItems.length === 0) return [];
    const unique = tapeItems.filter((item, index, array) => array.findIndex((entry) => entry.label === item.label) === index);
    const repeated: typeof unique = [];

    while (repeated.length < Math.max(unique.length * 3, 12)) {
      repeated.push(...unique);
    }

    return repeated;
  }, [tapeItems]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="relative overflow-hidden border-b"
      style={{
        borderColor: 'rgba(255,255,255,0.06)',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)), rgba(6,8,12,0.9)',
      }}
    >
      <div
        className="absolute left-6 top-1/2 z-20 hidden -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] lg:flex"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(8, 11, 16, 0.74)',
          color: 'var(--text-3)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: 'var(--accent-orange)', boxShadow: '0 0 12px rgba(255,102,0,0.45)' }}
        />
        Tape
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20"
        style={{ background: 'linear-gradient(90deg, rgba(7,9,11,0.92), transparent)' }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20"
        style={{ background: 'linear-gradient(270deg, rgba(7,9,11,0.92), transparent)' }}
      />

      <div className="shell-tape-track flex items-center gap-3 py-3 pl-28">
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="flex shrink-0 items-center gap-3"
          >
            <div
              className="rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em]"
              style={toneStyles[item.tone]}
            >
              {item.label}
            </div>
            <div
              className="h-px w-6 shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
