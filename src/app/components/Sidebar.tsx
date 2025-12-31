import { NavLink } from 'react-router-dom';
import { Home, Activity, Shield, Lock, DollarSign, AlertCircle, FileText, Search } from 'lucide-react';

const menuItems = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/radar', label: 'Radar', icon: Activity },
  { path: '/pass', label: 'Pass', icon: Shield },
  { path: '/vault', label: 'Vault', icon: Lock },
  { path: '/pricing', label: 'Pricing', icon: DollarSign },
  { path: '/status', label: 'Status', icon: AlertCircle },
  { path: '/docs', label: 'Docs', icon: FileText },
];

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

      {/* Search */}
      <div className="p-4">
        <div
          className="relative flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
        >
          <Search size={16} style={{ color: 'var(--text-3)' }} />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent outline-none flex-1 text-sm"
            style={{ color: 'var(--text-2)' }}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2">
        <div className="space-y-1">
          {menuItems.map((item) => (
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
                    className="text-sm font-medium"
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

      {/* Footer */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--stroke-1)' }}>
        <div className="space-y-2">
          <div
            className="px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--bg-2)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>WALLET</span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded"
                style={{ backgroundColor: 'var(--stroke-2)', color: 'var(--text-2)' }}
              >
                FREE
              </span>
            </div>
            <p className="text-xs font-mono" style={{ color: 'var(--text-2)' }}>
              Not connected
            </p>
          </div>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-3)' }}>
            <span>Network</span>
            <span style={{ color: 'var(--text-2)' }}>Scroll L2</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
