import { Command, PanelLeft, Wallet } from 'lucide-react';

import { useShellContextData } from '../shell-context';
import { WalletConnect } from './passport/WalletConnect';

type TopbarProps = {
  onOpenCommandPalette: () => void;
  onToggleSidebarPin: () => void;
  sidebarPinned: boolean;
};

const chipStyles = {
  accent: {
    color: 'var(--accent-orange)',
    backgroundColor: 'rgba(255, 102, 0, 0.08)',
    borderColor: 'rgba(255, 102, 0, 0.18)',
  },
  success: {
    color: 'var(--ok-green)',
    backgroundColor: 'rgba(50, 213, 131, 0.08)',
    borderColor: 'rgba(50, 213, 131, 0.16)',
  },
  warning: {
    color: 'var(--warn-amber)',
    backgroundColor: 'rgba(255, 176, 32, 0.08)',
    borderColor: 'rgba(255, 176, 32, 0.16)',
  },
  neutral: {
    color: 'var(--text-2)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
} as const;

export function Topbar({ onOpenCommandPalette, onToggleSidebarPin, sidebarPinned }: TopbarProps) {
  const { routeMeta, topbarChips, sessionStats } = useShellContextData();

  return (
    <header
      className="sticky top-0 z-20 border-b px-6 py-4"
      style={{
        background: 'linear-gradient(180deg, rgba(7,9,11,0.92), rgba(7,9,11,0.84))',
        borderColor: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center justify-between gap-5">
        <div className="flex min-w-0 items-start gap-4">
          <button
            type="button"
            onClick={onToggleSidebarPin}
            className="hidden h-11 w-11 items-center justify-center rounded-[18px] border transition-all duration-200 hover:-translate-y-0.5 lg:flex"
            style={{
              backgroundColor: sidebarPinned ? 'rgba(255, 102, 0, 0.16)' : 'rgba(255,255,255,0.03)',
              borderColor: sidebarPinned ? 'rgba(255, 102, 0, 0.24)' : 'rgba(255,255,255,0.08)',
              color: sidebarPinned ? 'var(--accent-orange)' : 'var(--text-2)',
            }}
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>

          <div className="min-w-0">
            <div className="mb-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
              {routeMeta.context}
            </div>
            <div className="truncate text-[1.35rem] font-semibold tracking-[-0.03em]" style={{ color: 'var(--text-1)' }}>
              {routeMeta.title}
            </div>
            <div className="truncate text-sm" style={{ color: 'var(--text-2)' }}>
              {routeMeta.descriptor}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 justify-center px-4">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden w-full max-w-[520px] items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 lg:flex"
            style={{
              backgroundColor: 'rgba(255,255,255,0.035)',
              borderColor: 'rgba(255,255,255,0.08)',
              color: 'var(--text-2)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            <Command className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />
            <span className="flex-1 text-sm">Buscar ativo, wallet ou briefing</span>
            <span
              className="rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.18em]"
              style={{
                borderColor: 'rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(255,255,255,0.02)',
                color: 'var(--text-3)',
              }}
            >
              ⌘K
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 xl:flex">
            {topbarChips.map((chip) => (
              <div
                key={chip.label}
                className="rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em]"
                style={chipStyles[chip.tone]}
              >
                {chip.label}
              </div>
            ))}
          </div>

          {sessionStats[1]?.value === 'Sem wallet' ? (
            <WalletConnect showConnectButton connectButtonLabel="Conectar carteira" />
          ) : (
            <div
              className="hidden items-center gap-3 rounded-[18px] border px-3 py-2 transition-transform duration-200 hover:-translate-y-0.5 lg:flex"
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)',
                color: 'var(--text-1)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-[14px]"
                style={{ backgroundColor: 'rgba(255, 102, 0, 0.12)', color: 'var(--accent-orange)' }}
              >
                <Wallet className="h-4 w-4" />
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                  {sessionStats[0]?.value}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-1)' }}>
                  {sessionStats[1]?.value}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
