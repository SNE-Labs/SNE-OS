import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export function Status() {
  const components = [
    { name: 'API Gateway', status: 'Operational', uptime: '99.9%', latency: '23ms' },
    { name: 'Indexer Service', status: 'Operational', uptime: '100%', latency: '12ms' },
    { name: 'Relayer Network', status: 'Degraded', uptime: '98.7%', latency: '45ms' },
    { name: 'Edge Nodes', status: 'Operational', uptime: '99.8%', latency: '18ms' },
    { name: 'Vault Protocol', status: 'Operational', uptime: '100%', latency: '8ms' },
  ];

  const incidents = [
    { date: '2024-01-15', title: 'Relayer experiencing delays', status: 'Resolved', duration: '2h 34m' },
    { date: '2024-01-10', title: 'Scheduled maintenance', status: 'Completed', duration: '30m' },
    { date: '2024-01-05', title: 'API rate limit increased', status: 'Completed', duration: '-' },
  ];

  return (
    <div className="flex-1 px-8 py-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Operations</p>
          <h1 className="text-4xl font-semibold mb-4" style={{ color: 'var(--text-1)' }}>System Status</h1>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} style={{ color: 'var(--ok-green)' }} />
            <span className="text-lg" style={{ color: 'var(--ok-green)' }}>All Systems Operational</span>
          </div>
        </div>

        {/* Uptime Chart Placeholder */}
        <div
          className="rounded-xl p-6 mb-8"
          style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
        >
          <h3 className="text-sm font-semibold uppercase mb-4" style={{ color: 'var(--text-2)' }}>
            90-Day Uptime
          </h3>
          <div className="h-32 flex items-end gap-1">
            {Array.from({ length: 90 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  backgroundColor: Math.random() > 0.95 ? 'var(--warn-amber)' : 'var(--ok-green)',
                  height: `${85 + Math.random() * 15}%`,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>90 days ago</span>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>Today</span>
          </div>
        </div>

        {/* Component Status */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold uppercase mb-4" style={{ color: 'var(--text-2)' }}>
            Components
          </h3>
          <div
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            {components.map((component, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border-b"
                style={{ borderColor: 'var(--stroke-1)' }}
              >
                <div className="flex items-center gap-3">
                  {component.status === 'Operational' ? (
                    <CheckCircle2 size={20} style={{ color: 'var(--ok-green)' }} />
                  ) : (
                    <AlertTriangle size={20} style={{ color: 'var(--warn-amber)' }} />
                  )}
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{component.name}</p>
                    <p className="text-xs" style={{ color: component.status === 'Operational' ? 'var(--ok-green)' : 'var(--warn-amber)' }}>
                      {component.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-3)' }}>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Uptime: </span>
                    <span className="font-mono" style={{ color: 'var(--text-2)' }}>{component.uptime}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Latency: </span>
                    <span className="font-mono" style={{ color: 'var(--text-2)' }}>{component.latency}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incident Log */}
        <div>
          <h3 className="text-sm font-semibold uppercase mb-4" style={{ color: 'var(--text-2)' }}>
            Incident Log
          </h3>
          <div
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            {incidents.map((incident, index) => (
              <div
                key={index}
                className="p-4 border-b"
                style={{ borderColor: 'var(--stroke-1)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock size={16} style={{ color: 'var(--text-3)' }} />
                    <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{incident.date}</span>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--ok-green)', color: '#FFFFFF' }}
                  >
                    {incident.status}
                  </span>
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-1)' }}>{incident.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Duration: {incident.duration}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
