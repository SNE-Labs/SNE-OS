import { AlertTriangle, Link2Off, LoaderCircle, LockKeyhole, Radar, SearchX, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type OperationalTone = 'loading' | 'disconnected' | 'error' | 'empty' | 'syncing' | 'locked';
type OperationalSurface = 'home' | 'radar' | 'intel' | 'vault' | 'pass' | 'keys' | 'secrets' | 'docs' | 'neutral';

type OperationalStateProps = {
  tone: OperationalTone;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  surface?: OperationalSurface;
  className?: string;
};

const toneConfig: Record<OperationalTone, { icon: LucideIcon; color: string; pulse: string }> = {
  loading: { icon: LoaderCircle, color: 'var(--accent-orange)', pulse: 'RESOLVING' },
  disconnected: { icon: Link2Off, color: 'var(--text-3)', pulse: 'OFFLINE' },
  error: { icon: AlertTriangle, color: 'var(--warn-amber)', pulse: 'CHECK' },
  empty: { icon: SearchX, color: 'var(--text-3)', pulse: 'NO SIGNAL' },
  syncing: { icon: Waves, color: 'var(--info-cyan)', pulse: 'SYNC' },
  locked: { icon: LockKeyhole, color: 'var(--danger-red)', pulse: 'LOCKED' },
};

export function OperationalState({
  tone,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  surface = 'neutral',
  className = '',
}: OperationalStateProps) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <div
      className={`operational-state operational-state--${tone} operational-state--${surface} ${compact ? 'operational-state--compact' : ''} ${className}`}
      style={{ ['--operational-state-color' as string]: config.color }}
    >
      <div className="operational-state__grid" aria-hidden="true" />
      <div className="operational-state__scan" aria-hidden="true" />
      <div className="operational-state__body">
        <div className="operational-state__icon">
          <Icon className={tone === 'loading' || tone === 'syncing' ? 'animate-spin' : ''} size={compact ? 18 : 20} />
        </div>
        <div className="min-w-0">
          <div className="operational-state__pulse">
            <Radar size={12} />
            {config.pulse}
          </div>
          <div className="operational-state__title">{title}</div>
          <div className="operational-state__description">{description}</div>
          {actionLabel && onAction ? (
            <button type="button" onClick={onAction} className="operational-state__action">
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type { OperationalTone, OperationalSurface };
