import { Activity, Server, Zap, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { RightPanel } from '../components/RightPanel';

export function Home() {
  const recentActivity = [
    { event: 'Proof Published', component: 'Vault', time: '2m ago', status: 'Online' },
    { event: 'Data Sync', component: 'Indexer', time: '5m ago', status: 'Online' },
    { event: 'API Request', component: 'API Gateway', time: '12m ago', status: 'Online' },
    { event: 'Relay Update', component: 'Relayer', time: '23m ago', status: 'Degraded' },
    { event: 'Node Heartbeat', component: 'Edge Node', time: '34m ago', status: 'Online' },
  ];

  return (
    <div className="flex flex-1">
      {/* Main Content */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        {/* Kicker + Title */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
            System
          </p>
          <h1 className="text-4xl font-semibold" style={{ color: 'var(--text-1)' }}>
            Overview
          </h1>
        </div>

        {/* Hero Card */}
        <div
          className="rounded-xl p-6 mb-6"
          style={{
            backgroundColor: 'var(--bg-2)',
            borderWidth: '1px',
            borderColor: 'var(--stroke-1)',
            boxShadow: 'var(--shadow-1)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>
              SNE OS Status
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ok-green)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--ok-green)' }}>
                All Systems Operational
              </span>
            </div>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} style={{ color: 'var(--info-cyan)' }} />
                <span className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>Latency</span>
              </div>
              <p className="text-2xl font-semibold font-mono" style={{ color: 'var(--text-1)' }}>
                23<span className="text-sm" style={{ color: 'var(--text-3)' }}>ms</span>
              </p>
            </div>

            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Activity size={16} style={{ color: 'var(--ok-green)' }} />
                <span className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>Uptime</span>
              </div>
              <p className="text-2xl font-semibold font-mono" style={{ color: 'var(--text-1)' }}>
                99.9<span className="text-sm" style={{ color: 'var(--text-3)' }}>%</span>
              </p>
            </div>

            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} style={{ color: 'var(--text-2)' }} />
                <span className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>Last Proof</span>
              </div>
              <p className="text-2xl font-semibold font-mono" style={{ color: 'var(--text-1)' }}>
                2<span className="text-sm" style={{ color: 'var(--text-3)' }}>m ago</span>
              </p>
            </div>
          </div>

          {/* Component Status Pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>Components:</span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-0)' }}>
              <CheckCircle2 size={12} style={{ color: 'var(--ok-green)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>API</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-0)' }}>
              <CheckCircle2 size={12} style={{ color: 'var(--ok-green)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Indexer</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-0)' }}>
              <CheckCircle2 size={12} style={{ color: 'var(--ok-green)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>Relayer</span>
            </div>
          </div>
        </div>

        {/* Recent Activity List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-2)' }}>
              Recent Activity
            </h3>
            <button className="text-xs" style={{ color: 'var(--accent-orange)' }}>
              View All
            </button>
          </div>

          <div
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            {/* Table Header */}
            <div
              className="grid grid-cols-4 gap-4 px-4 py-3 border-b"
              style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--stroke-1)' }}
            >
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-3)' }}>Event</span>
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-3)' }}>Component</span>
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-3)' }}>Time</span>
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-3)' }}>Status</span>
            </div>

            {/* Table Rows */}
            {recentActivity.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-4 gap-4 px-4 py-3 border-b hover:bg-[var(--bg-3)] transition-colors cursor-pointer"
                style={{ borderColor: 'var(--stroke-1)' }}
              >
                <span className="text-sm" style={{ color: 'var(--text-1)' }}>{item.event}</span>
                <span className="text-sm font-mono" style={{ color: 'var(--text-2)' }}>{item.component}</span>
                <span className="text-sm font-mono" style={{ color: 'var(--text-3)' }}>{item.time}</span>
                <div className="flex items-center gap-2">
                  {item.status === 'Online' ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--ok-green)' }} />
                      <span className="text-sm" style={{ color: 'var(--ok-green)' }}>{item.status}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--warn-amber)' }} />
                      <span className="text-sm" style={{ color: 'var(--warn-amber)' }}>{item.status}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <RightPanel
        tags={[
          { label: 'Network', value: 'Scroll L2' },
          { label: 'Mode', value: 'Preview' },
          { label: 'Environment', value: 'Production' },
        ]}
        alerts={[
          { message: 'Relayer experiencing delays', type: 'warning', time: '23m ago' },
          { message: 'Node sync completed', type: 'success', time: '1h ago' },
        ]}
        actions={[
          { label: 'Open Docs', icon: 'FileText' },
          { label: 'Upgrade', icon: 'ArrowUp' },
          { label: 'Report Issue', icon: 'AlertCircle' },
        ]}
      />
    </div>
  );
}
