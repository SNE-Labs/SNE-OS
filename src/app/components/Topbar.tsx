import { useShellContextData } from '../shell-context';
import { WalletConnect } from './passport/WalletConnect';

type TopbarProps = {
  onOpenCommandPalette: () => void;
  onToggleSidebarPin: () => void;
  sidebarPinned: boolean;
};

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
  void onToggleSidebarPin;
  void sidebarPinned;

  const { routeMeta, sessionStats, pathname, accessLabel } = useShellContextData();
  const glow = resolveGlow(pathname);
  const walletLabel = sessionStats[1]?.value ?? 'Sem wallet';
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
              className="hidden items-center rounded-[22px] border px-4 py-2 transition-transform duration-200 hover:-translate-y-0.5 lg:flex"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02))',
                borderColor: 'rgba(255,255,255,0.10)',
                color: 'var(--text-1)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 34px rgba(0,0,0,0.16)',
              }}
            >
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
                  IDENTIDADE VINCULADA · {accessLabel}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
