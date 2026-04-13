import { AlertTriangle, Link2Off, LoaderCircle, SearchX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ModuleStateTone = 'loading' | 'disconnected' | 'error' | 'empty';

interface ModuleStateCardProps {
  tone: ModuleStateTone;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

const toneConfig: Record<ModuleStateTone, { icon: LucideIcon; color: string }> = {
  loading: { icon: LoaderCircle, color: 'var(--accent-orange)' },
  disconnected: { icon: Link2Off, color: 'var(--text-3)' },
  error: { icon: AlertTriangle, color: 'var(--warn-amber)' },
  empty: { icon: SearchX, color: 'var(--text-3)' },
};

export function ModuleStateCard({
  tone,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: ModuleStateCardProps) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-xl ${compact ? 'p-4' : 'p-5'} flex flex-col gap-4`}
      style={{
        backgroundColor: 'var(--bg-3)',
        borderWidth: '1px',
        borderColor: 'var(--stroke-1)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${config.color}18`, color: config.color }}
        >
          <Icon className={`w-5 h-5 ${tone === 'loading' ? 'animate-spin' : ''}`} />
        </div>
        <div className="min-w-0">
          <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
            {title}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
            {description}
          </div>
        </div>
      </div>

      {actionLabel && onAction ? (
        <div>
          <button
            onClick={onAction}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: 'var(--bg-2)',
              borderWidth: '1px',
              borderColor: 'var(--stroke-1)',
              color: 'var(--text-1)',
            }}
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
