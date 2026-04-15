import { PanelLeft } from 'lucide-react';

import { useShellContextData } from '../shell-context';
import { WalletConnect } from './passport/WalletConnect';

type TopbarProps = {
  onOpenCommandPalette: () => void;
  onToggleSidebarPin: () => void;
  sidebarPinned: boolean;
};

function accessLabel(plan: string) {
  const normalized = plan.trim().toLowerCase();
  if (normalized === 'pro') return 'ACESSO PRO';
  if (normalized === 'premium') return 'ACESSO PREMIUM';
  return 'ACESSO FREE';
}

function resolveGlow(pathname: string) {
  if (pathname.startsWith('/radar')) {
    return {
      primary: 'rgba(77, 201, 144, 0.46)',
      secondary: 'rgba(255, 140, 66, 0.28)',
      wash: 'rgba(77, 201, 144, 0.08)',
    };
  }

  if (pathname.startsWith('/intel') || pathname.startsWith('/blog')) {
    return {
      primary: 'rgba(255, 140, 66, 0.52)',
      secondary: 'rgba(74, 144, 226, 0.28)',
      wash: 'rgba(255, 140, 66, 0.09)',
    };
  }

  if (pathname.startsWith('/pass')) {
    return {
      primary: 'rgba(74, 144, 226, 0.42)',
      secondary: 'rgba(77, 201, 144, 0.24)',
      wash: 'rgba(74, 144, 226, 0.08)',
    };
  }

  if (pathname.startsWith('/vault') || pathname.startsWith('/swaps')) {
    return {
      primary: 'rgba(255, 176, 32, 0.42)',
      secondary: 'rgba(255, 102, 0, 0.26)',
      wash: 'rgba(255, 176, 32, 0.08)',
    };
  }

  if (pathname.startsWith('/keys') || pathname.startsWith('/secrets')) {
    return {
      primary: 'rgba(224, 92, 67, 0.38)',
      secondary: 'rgba(255, 140, 66, 0.24)',
      wash: 'rgba(224, 92, 67, 0.07)',
    };
  }

  return {
    primary: 'rgba(255, 140, 66, 0.46)',
    secondary: 'rgba(77, 201, 144, 0.20)',
    wash: 'rgba(255, 140, 66, 0.07)',
  };
}

export function Topbar({ onOpenCommandPalette, onToggleSidebarPin, sidebarPinned }: TopbarProps) {
  const { routeMeta, sessionStats, pathname } = useShellContextData();
  const glow = resolveGlow(pathname);
  const walletLabel = sessionStats[1]?.value ?? 'Sem wallet';
  const planLabel = sessionStats[0]?.value ?? 'FREE';
  const isWalletConnected = walletLabel !== 'Sem wallet';

  return (
    <header
      className="sticky top-0 z-20 border-b px-6 py-2.5"
      style={{
        background:
          'linear-gradient(180deg, rgba(7,9,11,0.92), rgba(7,9,11,0.78)), radial-gradient(circle at 45% 0%, rgba(255,255,255,0.045), transparent 42%)',
        borderColor: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <div className="grid grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)] items-center gap-5">
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

          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="group relative isolate flex min-w-0 items-center gap-3 rounded-[24px] border px-3 py-2.5 text-left transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background:
                `radial-gradient(circle at 16% 50%, ${glow.wash}, transparent 46%), linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.018))`,
              borderColor: 'rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
            aria-label="Abrir comandos do SNE OS"
          >
            <div
              className="absolute left-2 top-1/2 -z-10 h-16 w-24 -translate-y-1/2 rounded-full opacity-75 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: `radial-gradient(circle, ${glow.primary}, ${glow.secondary} 48%, transparent 74%)` }}
            />
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] border"
              style={{
                backgroundColor: 'rgba(6,8,12,0.68)',
                borderColor: 'rgba(255,255,255,0.12)',
                boxShadow: `0 0 28px ${glow.primary}, inset 0 1px 0 rgba(255,255,255,0.08)`,
              }}
            >
              <img src="/favicon.ico" alt="" className="h-5 w-5 rounded-md transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[1rem] font-semibold tracking-[-0.025em]" style={{ color: 'var(--text-1)' }}>
                SNE OS
              </div>
              <div className="truncate text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                Camada operacional
              </div>
            </div>
          </button>
        </div>

        <div
          className="hidden min-w-0 rounded-full border px-4 py-2 text-center lg:block"
          style={{
            backgroundColor: 'rgba(255,255,255,0.025)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="truncate text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>
            {routeMeta.title}
          </div>
          <div className="truncate text-[10px] uppercase tracking-[0.15em]" style={{ color: 'var(--text-3)' }}>
            {routeMeta.context}
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-3">
          {!isWalletConnected ? (
            <WalletConnect showConnectButton connectButtonLabel="Criar ID" />
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
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M12 3.5 18.7 7.4v7.2L12 20.5l-6.7-5.9V7.4L12 3.5Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.45"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.2 9.2 12 7l3.8 2.2M8.2 14.8 12 17l3.8-2.2M12 7v10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.15"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.72"
                  />
                  <circle cx="12" cy="12" r="2.05" fill="currentColor" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                  ID operacional
                </div>
                <div className="max-w-[180px] truncate text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                  {walletLabel}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--ok-green)' }}>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--ok-green)', boxShadow: '0 0 10px rgba(50,213,131,0.55)' }}
                  />
                  SESSÃO ATIVA
                </div>
                <div className="truncate text-[10px] uppercase tracking-[0.13em]" style={{ color: 'var(--text-3)' }}>
                  IDENTIDADE VINCULADA · {accessLabel(planLabel)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
