import { Command, PanelLeft, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { dockNavigationItems } from '../navigation';

type BottomDockProps = {
  onOpenCommandPalette: () => void;
  onToggleSidebarPin: () => void;
  sidebarPinned: boolean;
};

export function BottomDock({ onOpenCommandPalette, onToggleSidebarPin, sidebarPinned }: BottomDockProps) {
  return (
    <div
      className="fixed left-1/2 z-40 hidden -translate-x-1/2 items-center gap-2.5 lg:flex"
      style={{ bottom: '20px' }}
    >
      <button
        type="button"
        onClick={onToggleSidebarPin}
        className="flex h-12 w-12 items-center justify-center rounded-[20px] border transition-all duration-200 hover:-translate-y-0.5"
        style={{
          backgroundColor: sidebarPinned ? 'rgba(255, 102, 0, 0.16)' : 'rgba(10, 14, 20, 0.82)',
          borderColor: sidebarPinned ? 'rgba(255, 102, 0, 0.28)' : 'rgba(255,255,255,0.08)',
          color: sidebarPinned ? 'var(--accent-orange)' : 'var(--text-2)',
          boxShadow: 'var(--shadow-dock)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
        }}
        aria-label={sidebarPinned ? 'Desafixar rail lateral' : 'Fixar rail lateral'}
      >
        <PanelLeft className="h-[18px] w-[18px]" />
      </button>

      <nav
        className="flex items-center gap-1 rounded-[24px] border px-2.5 py-1.5"
        style={{
          backgroundColor: 'rgba(9, 12, 18, 0.82)',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: 'var(--shadow-dock)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {dockNavigationItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `group flex min-w-[78px] items-center justify-center gap-2 rounded-[16px] px-3 py-2.5 transition-all duration-200 ${
                isActive ? 'is-active' : ''
              }`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'rgba(255, 102, 0, 0.12)' : 'transparent',
              color: isActive ? 'var(--text-1)' : 'var(--text-2)',
              boxShadow: isActive
                ? 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 8px 18px rgba(0,0,0,0.14)'
                : 'none',
              transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
            })}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5"
                  style={{ color: isActive ? 'var(--accent-orange)' : 'currentColor' }}
                />
                <span className="text-[13px] font-medium whitespace-nowrap">
                  {item.shortLabel || item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 rounded-[20px] border px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5"
        style={{
          backgroundColor: 'rgba(9, 12, 18, 0.82)',
          borderColor: 'rgba(255,255,255,0.08)',
          color: 'var(--text-2)',
          boxShadow: 'var(--shadow-dock)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
        }}
      >
        <Command className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />
        <Sparkles className="h-4 w-4" />
        <span className="text-[11px] uppercase tracking-[0.18em]">Comandos</span>
      </button>
    </div>
  );
}
