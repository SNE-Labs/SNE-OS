import { Command, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { navigationItems } from '../navigation';

type BottomDockProps = {
  onOpenCommandPalette: () => void;
};

export function BottomDock({ onOpenCommandPalette }: BottomDockProps) {
  return (
    <div
      className="fixed left-1/2 z-40 hidden -translate-x-1/2 items-center gap-1.5 lg:flex"
      style={{ bottom: '10px' }}
    >
      <nav
        className="flex items-center gap-0.5 rounded-[13px] border px-1.5 py-1"
        style={{
          backgroundColor: 'rgba(7, 10, 15, 0.74)',
          borderColor: 'rgba(255,255,255,0.06)',
          boxShadow: 'var(--shadow-dock)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        {navigationItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `group flex min-w-[54px] items-center justify-center gap-1 rounded-[9px] px-2 py-1 transition-all duration-200 ${
                isActive ? 'is-active' : ''
              }`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'rgba(255, 102, 0, 0.1)' : 'transparent',
              color: isActive ? 'var(--text-1)' : 'var(--text-2)',
              boxShadow: isActive
                ? 'inset 0 0 0 1px rgba(255,255,255,0.04), 0 6px 14px rgba(0,0,0,0.12)'
                : 'none',
              transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
            })}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5"
                  style={{ color: isActive ? 'var(--accent-orange)' : 'currentColor' }}
                />
                <span className="text-[9px] font-medium whitespace-nowrap">
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
        className="flex items-center gap-1 rounded-[10px] border px-2 py-1.5 transition-all duration-200 hover:-translate-y-0.5"
        style={{
          backgroundColor: 'rgba(7, 10, 15, 0.74)',
          borderColor: 'rgba(255,255,255,0.06)',
          color: 'var(--text-2)',
          boxShadow: 'var(--shadow-dock)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <Command className="h-3.5 w-3.5" style={{ color: 'var(--accent-orange)' }} />
        <Sparkles className="h-3.5 w-3.5" />
        <span className="text-[9px] uppercase tracking-[0.14em]">Comandos</span>
      </button>
    </div>
  );
}
