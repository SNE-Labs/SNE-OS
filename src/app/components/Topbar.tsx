import { useShellContextData } from '../shell-context';

type TopbarProps = {
  onOpenCommandPalette: () => void;
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

export function Topbar({ onOpenCommandPalette }: TopbarProps) {
  const { routeMeta, sessionStats, pathname, accessLabel } = useShellContextData();
  const glow = resolveGlow(pathname);
  const walletLabel = sessionStats[1]?.value ?? 'Sem wallet';
  const isWalletConnected = walletLabel !== 'Sem carteira';
  const sessionTone = isWalletConnected ? 'var(--ok-green)' : 'var(--text-3)';
  const sessionStateLabel = isWalletConnected ? 'SESSÃO ATIVA' : 'SESSÃO PÚBLICA';
  const identityStateLabel = isWalletConnected ? accessLabel : `IDENTIDADE DESVINCULADA · ${accessLabel}`;

  return (
    <header
      className="sticky top-0 z-20 border-b px-3 py-0.5"
      style={{
        background:
          'linear-gradient(180deg, rgba(6,8,12,0.94), rgba(6,8,12,0.84)), radial-gradient(circle at 45% 0%, rgba(255,255,255,0.03), transparent 38%)',
        borderColor: 'rgba(255,255,255,0.045)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      <div className="grid grid-cols-[minmax(160px,1fr)_auto_minmax(160px,1fr)] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="group relative isolate flex min-w-0 items-center gap-2 rounded-[12px] border px-2 py-1 text-left transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background:
                `radial-gradient(circle at 16% 50%, ${glow.wash}, transparent 42%), linear-gradient(135deg, rgba(255,255,255,0.038), rgba(255,255,255,0.014))`,
              borderColor: 'rgba(255,255,255,0.065)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
            }}
            aria-label="Abrir comandos do SNE OS"
          >
            <div
              className="absolute left-1.5 top-1/2 -z-10 h-9 w-14 -translate-y-1/2 rounded-full opacity-45 blur-2xl transition-opacity duration-300 group-hover:opacity-70"
              style={{ background: `radial-gradient(circle, ${glow.primary}, ${glow.secondary} 52%, transparent 76%)` }}
            />
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border"
              style={{
                backgroundColor: 'rgba(6,8,12,0.76)',
                borderColor: 'rgba(255,255,255,0.1)',
                boxShadow: `0 0 16px ${glow.wash}, inset 0 1px 0 rgba(255,255,255,0.06)`,
              }}
            >
              <img src="/favicon.ico" alt="" className="h-3.5 w-3.5 rounded transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[0.82rem] font-semibold" style={{ color: 'var(--text-1)' }}>
                SNE OS
              </div>
              <div className="truncate text-[8px] uppercase tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>
                Camada operacional
              </div>
            </div>
          </button>
        </div>

        <div
          className="hidden min-w-0 rounded-full border px-2 py-0.5 text-center xl:block"
          style={{
            backgroundColor: 'rgba(255,255,255,0.016)',
            borderColor: 'rgba(255,255,255,0.05)',
          }}
        >
          <div className="truncate text-[10px] font-medium" style={{ color: 'var(--text-1)' }}>
            {routeMeta.title}
          </div>
          <div className="truncate text-[8px] uppercase tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>
            {routeMeta.context}
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <div
            className="hidden items-center rounded-[10px] border px-2 py-[0.4rem] transition-transform duration-200 hover:-translate-y-0.5 xl:flex"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.014))',
              borderColor: 'rgba(255,255,255,0.075)',
              color: 'var(--text-1)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)',
            }}
          >
            <div className="min-w-0 space-y-0.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="shrink-0 text-[7px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>
                  ID operacional
                </div>
                <div className="max-w-[124px] truncate text-[10px] font-semibold" style={{ color: 'var(--text-1)' }}>
                  {walletLabel}
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-1.5 text-[8px] uppercase tracking-[0.1em]">
                <span
                  className="h-1 w-1 shrink-0 rounded-full"
                  style={{
                    backgroundColor: sessionTone,
                    boxShadow: isWalletConnected ? '0 0 10px rgba(50,213,131,0.55)' : '0 0 8px rgba(255,255,255,0.22)',
                  }}
                />
                <span className="shrink-0" style={{ color: sessionTone }}>
                  {sessionStateLabel}
                </span>
                <span className="truncate" style={{ color: 'var(--text-3)' }}>
                  {identityStateLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
