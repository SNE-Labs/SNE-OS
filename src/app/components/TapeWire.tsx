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
  const items = tapeItems.slice(0, 4);

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
      <div className="mx-auto grid max-w-[1480px] grid-cols-1 gap-2 px-6 py-3 lg:grid-cols-4 xl:px-8">
        {items.map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-[18px] border px-4 py-2.5"
            style={{
              ...toneStyles[item.tone],
              backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0))',
            }}
          >
            <div
              className="truncate text-[11px] uppercase tracking-[0.18em]"
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
