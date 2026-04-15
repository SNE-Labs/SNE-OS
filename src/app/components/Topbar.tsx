import { ChevronRight, PanelLeft, Sparkles, Wallet } from 'lucide-react';

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

function resolveGlow(pathname: string) {
  if (pathname.startsWith('/radar')) {
    return {
      primary: 'rgba(77, 201, 144, 0.46)',
      secondary: 'rgba(255, 140, 66, 0.28)',
      wash: 'rgba(77, 201, 144, 0.08)',
      label: 'Market live',
    };
  }

  if (pathname.startsWith('/intel') || pathname.startsWith('/blog')) {
    return {
      primary: 'rgba(255, 140, 66, 0.52)',
      secondary: 'rgba(74, 144, 226, 0.28)',
      wash: 'rgba(255, 140, 66, 0.09)',
      label: 'Intel layer',
    };
  }

  if (pathname.startsWith('/pass')) {
    return {
      primary: 'rgba(74, 144, 226, 0.42)',
      secondary: 'rgba(77, 201, 144, 0.24)',
      wash: 'rgba(74, 144, 226, 0.08)',
      label: 'Identity',
    };
  }

  if (pathname.startsWith('/vault') || pathname.startsWith('/swaps')) {
    return {
      primary: 'rgba(255, 176, 32, 0.42)',
      secondary: 'rgba(255, 102, 0, 0.26)',
      wash: 'rgba(255, 176, 32, 0.08)',
      label: 'Capital',
    };
  }

  if (pathname.startsWith('/keys') || pathname.startsWith('/secrets')) {
    return {
      primary: 'rgba(224, 92, 67, 0.38)',
      secondary: 'rgba(255, 140, 66, 0.24)',
      wash: 'rgba(224, 92, 67, 0.07)',
      label: 'Secure layer',
    };
  }

  return {
    primary: 'rgba(255, 140, 66, 0.46)',
    secondary: 'rgba(77, 201, 144, 0.20)',
    wash: 'rgba(255, 140, 66, 0.07)',
    label: 'Workspace',
  };
}

export function Topbar({ onOpenCommandPalette, onToggleSidebarPin, sidebarPinned }: TopbarProps) {
  const { routeMeta, topbarChips, sessionStats, pathname } = useShellContextData();
  const glow = resolveGlow(pathname);
  const walletLabel = sessionStats[1]?.value ?? 'Sem wallet';
  const isWalletConnected = walletLabel !== 'Sem wallet';

  return (
    <header
      className="sticky top-0 z-20 border-b px-6 py-3"
      style={{
        background:
          'linear-gradient(180deg, rgba(7,9,11,0.92), rgba(7,9,11,0.78)), radial-gradient(circle at 45% 0%, rgba(255,255,255,0.045), transparent 42%)',
        borderColor: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(360px,620px)_minmax(0,1fr)] items-center gap-5">
        <div className="flex min-w-0 items-center gap-3">
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
            <div className="mb-1 flex min-w-0 items-center gap-1.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
              <span>SNE OS</span>
              <ChevronRight className="h-3 w-3 opacity-55" />
              <span className="truncate">{routeMeta.context}</span>
            </div>
            <div className="truncate text-[1.12rem] font-semibold tracking-[-0.025em]" style={{ color: 'var(--text-1)' }}>
              {routeMeta.title}
            </div>
            <div className="truncate text-xs" style={{ color: 'var(--text-2)' }}>
              {routeMeta.descriptor}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="group relative isolate flex h-[58px] min-w-0 items-center justify-between overflow-hidden rounded-[24px] border px-3.5 transition-all duration-300 hover:-translate-y-0.5"
          style={{
            background:
              `radial-gradient(circle at 10% 50%, ${glow.wash}, transparent 42%), linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))`,
            borderColor: 'rgba(255,255,255,0.10)',
            boxShadow: '0 18px 52px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
          aria-label="Abrir comandos"
        >
          <div
            className="absolute left-2 top-1/2 -z-10 h-20 w-28 -translate-y-1/2 rounded-full opacity-75 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: `radial-gradient(circle, ${glow.primary}, ${glow.secondary} 46%, transparent 72%)`,
            }}
          />
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border"
              style={{
                backgroundColor: 'rgba(6,8,12,0.64)',
                borderColor: 'rgba(255,255,255,0.12)',
                boxShadow: `0 0 28px ${glow.primary}, inset 0 1px 0 rgba(255,255,255,0.08)`,
              }}
            >
              <img src="/favicon.ico" alt="" className="h-5 w-5 rounded-md" />
            </div>

            <div className="min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                  Buscar ou executar
                </span>
                <span className="hidden rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] md:inline-flex" style={{ color: 'var(--text-3)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  {glow.label}
                </span>
              </div>
              <div className="truncate text-xs" style={{ color: 'var(--text-3)' }}>
                Navegue módulos, abra leituras ou acione comandos do workspace
              </div>
            </div>
          </div>

          <div className="ml-4 flex items-center gap-2">
            <Sparkles className="hidden h-4 w-4 opacity-65 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 sm:block" style={{ color: 'var(--accent-orange)' }} />
            <div
              className="rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]"
              style={{
                color: 'var(--text-2)',
                borderColor: 'rgba(255,255,255,0.10)',
                backgroundColor: 'rgba(0,0,0,0.20)',
              }}
            >
              Ctrl K
            </div>
          </div>
        </button>

        <div className="flex min-w-0 items-center justify-end gap-3">
          <div className="hidden min-w-0 items-center justify-end gap-2 2xl:flex">
            {topbarChips.slice(0, 3).map((chip) => (
              <div
                key={chip.label}
                className="max-w-[180px] truncate rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.15em]"
                style={chipStyles[chip.tone]}
              >
                {chip.label}
              </div>
            ))}
          </div>

          {!isWalletConnected ? (
            <WalletConnect showConnectButton connectButtonLabel="Conectar carteira" />
          ) : (
            <div
              className="hidden items-center gap-3 rounded-[22px] border px-3 py-2 transition-transform duration-200 hover:-translate-y-0.5 lg:flex"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02))',
                borderColor: 'rgba(255,255,255,0.10)',
                color: 'var(--text-1)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 34px rgba(0,0,0,0.16)',
              }}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-[14px]"
                style={{
                  background: `radial-gradient(circle at 30% 20%, ${glow.primary}, rgba(255,102,0,0.10))`,
                  color: 'var(--text-1)',
                }}
              >
                <Wallet className="h-4 w-4" />
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                  {sessionStats[0]?.value}
                </div>
                <div className="max-w-[150px] truncate text-sm" style={{ color: 'var(--text-1)' }}>
                  {walletLabel}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
