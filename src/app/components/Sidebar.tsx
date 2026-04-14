import { Pin, PinOff, Sparkles } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

import appIcon from '@/public/favicon.ico';
import { railNavigationGroups } from '../navigation';
import { useShellContextData } from '../shell-context';

type SidebarProps = {
  expanded: boolean;
  pinned: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onTogglePin: () => void;
};

export function Sidebar({ expanded, pinned, onExpand, onCollapse, onTogglePin }: SidebarProps) {
  const navigate = useNavigate();
  const { routeMeta, sidebarContext, sessionStats } = useShellContextData();
  const panelTransition = 'opacity 180ms var(--ease-shell), transform 220ms var(--ease-shell)';

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden lg:block"
      style={{ width: expanded ? 'var(--sidebar-expanded-width)' : 'var(--sidebar-rail-width)' }}
      onMouseEnter={onExpand}
      onMouseLeave={() => {
        if (!pinned) onCollapse();
      }}
    >
      <div
        className="absolute inset-0 border-r"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(255,102,0,0.14), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))',
          backgroundColor: 'rgba(8, 11, 16, 0.94)',
          borderColor: 'rgba(255,255,255,0.06)',
          boxShadow: expanded ? 'var(--shadow-panel)' : 'none',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          transition: 'width var(--dur-shell) var(--ease-shell), box-shadow var(--dur-shell) var(--ease-shell)',
        }}
      />

      <div className="relative flex h-full">
        <div
          className="flex h-full w-[var(--sidebar-rail-width)] flex-col items-center justify-between border-r py-5"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex w-full flex-col items-center gap-5">
            <button
              type="button"
              onClick={onTogglePin}
              className="flex h-11 w-11 items-center justify-center rounded-[18px] border transition-all duration-200 hover:-translate-y-0.5"
              style={{
                backgroundColor: pinned ? 'rgba(255, 102, 0, 0.16)' : 'rgba(255,255,255,0.03)',
                borderColor: pinned ? 'rgba(255, 102, 0, 0.28)' : 'rgba(255,255,255,0.08)',
                color: pinned ? 'var(--accent-orange)' : 'var(--text-2)',
              }}
              aria-label={pinned ? 'Desafixar sidebar' : 'Fixar sidebar'}
            >
              {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
            </button>

            <div
              className="flex h-12 w-12 items-center justify-center rounded-[20px] border"
              style={{
                backgroundColor: 'rgba(255,255,255,0.025)',
                borderColor: 'rgba(255,255,255,0.08)',
                color: 'var(--accent-orange)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.18)',
              }}
            >
              <img
                src={appIcon}
                alt="SNE OS"
                className="h-6 w-6 object-contain"
              />
            </div>

            <nav className="flex w-full flex-col items-center gap-2 px-3">
              {railNavigationGroups.flatMap((group) => group.items).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="flex w-full items-center justify-center rounded-[18px] px-3 py-3 transition-all duration-200 hover:-translate-y-0.5"
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'rgba(255, 102, 0, 0.14)' : 'transparent',
                    boxShadow: isActive ? 'inset 0 0 0 1px rgba(255,255,255,0.05)' : 'none',
                    color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                  })}
                >
                  {({ isActive }) => (
                    <item.icon
                      className="h-[18px] w-[18px]"
                      style={{ color: isActive ? 'var(--accent-orange)' : 'currentColor' }}
                    />
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <button
            type="button"
            onClick={() => navigate(sidebarContext.actionPath)}
            className="flex h-11 w-11 items-center justify-center rounded-[18px] border"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.08)',
              color: 'var(--text-2)',
            }}
            aria-label={sidebarContext.actionLabel}
          >
            <Sparkles className="h-4 w-4" />
          </button>
        </div>

        <div
          className="overflow-hidden transition-[opacity,transform] duration-200"
          style={{
            width: 'calc(var(--sidebar-expanded-width) - var(--sidebar-rail-width))',
            opacity: expanded ? 1 : 0,
            transform: expanded ? 'translateX(0)' : 'translateX(-10px)',
            pointerEvents: expanded ? 'auto' : 'none',
          }}
        >
          <div className="flex h-full flex-col px-5 py-5">
            <div
              className="mb-4 border-b pb-4"
              style={{
                borderColor: 'rgba(255,255,255,0.06)',
                opacity: expanded ? 1 : 0,
                transform: expanded ? 'translateX(0)' : 'translateX(-6px)',
                transition: panelTransition,
              }}
            >
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                <span>SNE OS</span>
                <span
                  className="rounded-full border px-2 py-0.5"
                  style={{
                    borderColor: pinned ? 'rgba(255, 102, 0, 0.22)' : 'rgba(255,255,255,0.08)',
                    backgroundColor: pinned ? 'rgba(255, 102, 0, 0.08)' : 'rgba(255,255,255,0.02)',
                    color: pinned ? 'var(--accent-orange)' : 'var(--text-3)',
                  }}
                >
                  {pinned ? 'Pinned' : 'Rail'}
                </span>
              </div>
              <div className="text-lg font-semibold tracking-[-0.02em]" style={{ color: 'var(--text-1)' }}>
                {routeMeta.title}
              </div>
              <div className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
                {routeMeta.descriptor}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div
                className="space-y-4"
                style={{
                  opacity: expanded ? 1 : 0,
                  transform: expanded ? 'translateX(0)' : 'translateX(-6px)',
                  transition: `${panelTransition} 50ms`,
                }}
              >
                {railNavigationGroups.map((group) => (
                  <div key={group.label}>
                    <div className="mb-2 px-3 text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                      {group.label}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className="group flex items-center gap-3 rounded-[18px] px-3 py-3 transition-all duration-200 hover:-translate-y-0.5"
                          style={({ isActive }) => ({
                            backgroundColor: isActive ? 'rgba(255, 102, 0, 0.14)' : 'transparent',
                            color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                            boxShadow: isActive ? 'inset 0 0 0 1px rgba(255,255,255,0.06)' : 'none',
                          })}
                        >
                          {({ isActive }) => (
                            <>
                              <item.icon
                                className="h-[18px] w-[18px] shrink-0"
                                style={{ color: isActive ? 'var(--accent-orange)' : 'currentColor' }}
                              />
                              <span className="text-sm font-medium">{item.label}</span>
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="mt-5 rounded-[24px] border p-4"
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)',
                opacity: expanded ? 1 : 0,
                transform: expanded ? 'translateX(0)' : 'translateX(-6px)',
                transition: `${panelTransition} 70ms`,
              }}
            >
              <div className="mb-2 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
                {sidebarContext.eyebrow}
              </div>
              <div className="mb-2 text-base font-semibold leading-snug" style={{ color: 'var(--text-1)' }}>
                {sidebarContext.title}
              </div>
              <div className="mb-3 text-sm" style={{ color: 'var(--text-2)' }}>
                {sidebarContext.summary}
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {sidebarContext.items.slice(0, 3).map((item) => (
                  <div
                    key={item}
                    className="rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.16em]"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderColor: 'rgba(255,255,255,0.08)',
                      color: 'var(--text-2)',
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate(sidebarContext.actionPath)}
                className="w-full rounded-[18px] px-4 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'rgba(255, 102, 0, 0.16)',
                  color: 'var(--text-1)',
                  border: '1px solid rgba(255, 102, 0, 0.24)',
                }}
              >
                {sidebarContext.actionLabel}
              </button>
            </div>

            <div
              className="mt-4 border-t pt-4"
              style={{
                borderColor: 'rgba(255,255,255,0.06)',
                opacity: expanded ? 1 : 0,
                transform: expanded ? 'translateX(0)' : 'translateX(-6px)',
                transition: `${panelTransition} 90ms`,
              }}
            >
              <div className="mb-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                Sessão
              </div>
              <div className="flex flex-wrap gap-2">
                {sessionStats.slice(0, 3).map((item) => (
                  <div
                    key={item.label}
                    className="rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      borderColor: 'rgba(255,255,255,0.08)',
                      color: 'var(--text-3)',
                    }}
                  >
                    {item.label}: {item.value}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
