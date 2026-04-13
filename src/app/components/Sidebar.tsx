import { NavLink } from 'react-router-dom';

import { navigationItems } from '../navigation';
export function Sidebar() {
  return (
    <aside
      className="w-[300px] flex-shrink-0 flex flex-col border-r"
      style={{
        backgroundColor: 'var(--bg-1)',
        borderColor: 'var(--stroke-1)',
      }}
    >
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--stroke-1)' }}>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
          SNE OS
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group ${
                  isActive ? 'active-nav-item' : 'hover:bg-[var(--bg-2)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator bar */}
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r"
                      style={{ backgroundColor: 'var(--accent-orange)' }}
                    />
                  )}
                  <item.icon
                    size={18}
                    style={{ color: isActive ? 'var(--accent-orange)' : 'var(--text-2)' }}
                  />
                  <span
                    className="text-sm font-medium whitespace-nowrap"
                    style={{ color: isActive ? 'var(--text-1)' : 'var(--text-2)' }}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
}
