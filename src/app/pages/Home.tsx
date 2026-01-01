import { Activity, Server, Zap, CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { RightPanel } from '../components/RightPanel';
import { apiGet } from '@/lib/api/http';

export function Home() {
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Fetch dashboard data from API
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<{
      status: { overall_status: string; uptime_percentage: number };
      metrics: { latency_ms: number; uptime_percentage: number; last_proof_minutes: number };
      components: Array<{ name: string; status: string; last_check: string }>;
      activities: Array<{ event: string; component: string; time: string; status: string; timestamp: string }>;
      alerts: Array<{ message: string; type: string; time: string }>;
      last_updated: string;
    }>('/api/dashboard'),
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-1">
        <div className="flex-1 px-8 py-6 overflow-y-auto">
          <div className="text-center py-12">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-48 mx-auto mb-4"></div>
              <div className="h-8 bg-gray-300 rounded w-64 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-1">
        <div className="flex-1 px-8 py-6 overflow-y-auto">
          <div className="text-center py-12">
            <div className="text-red-500">
              <AlertTriangle size={48} className="mx-auto mb-4" />
              <p>Failed to load dashboard data</p>
              <p className="text-sm text-gray-500 mt-2">Please try again later</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const data = dashboardData?.data;
  if (!data) return null;

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
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: data.status.overall_status === 'All Systems Operational'
                    ? 'var(--ok-green)'
                    : 'var(--warn-amber)'
                }}
              />
              <span
                className="text-sm font-medium"
                style={{
                  color: data.status.overall_status === 'All Systems Operational'
                    ? 'var(--ok-green)'
                    : 'var(--warn-amber)'
                }}
              >
                {data.status.overall_status}
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
                {data.metrics.latency_ms}<span className="text-sm" style={{ color: 'var(--text-3)' }}>ms</span>
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
                {data.metrics.uptime_percentage}<span className="text-sm" style={{ color: 'var(--text-3)' }}>%</span>
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
                {data.metrics.last_proof_minutes}<span className="text-sm" style={{ color: 'var(--text-3)' }}>m ago</span>
              </p>
            </div>
          </div>

          {/* Component Status Pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>Components:</span>
            {data.components.slice(0, 3).map((component) => (
              <div
                key={component.name}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'var(--bg-0)' }}
              >
                {component.status === 'online' ? (
                  <CheckCircle2 size={12} style={{ color: 'var(--ok-green)' }} />
                ) : (
                  <AlertTriangle size={12} style={{ color: 'var(--warn-amber)' }} />
                )}
                <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                  {component.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-2)' }}>
              Recent Activity
            </h3>
            <button
              onClick={() => setShowAllActivities(true)}
              className="text-xs hover:opacity-80 transition-opacity"
              style={{ color: 'var(--accent-orange)' }}
            >
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
            {data.activities.map((item, index) => (
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
          { label: 'Mode', value: 'Production' },
          { label: 'Uptime', value: `${data.status.uptime_percentage}%` },
        ]}
        alerts={data.alerts.map(alert => ({
          message: alert.message,
          type: alert.type as 'warning' | 'success',
          time: alert.time
        }))}
        actions={[
          { label: 'Open Docs', icon: 'FileText' },
          { label: 'Upgrade', icon: 'ArrowUp' },
          { label: 'Report Issue', icon: 'AlertCircle' },
        ]}
      />

      {/* All Activities Modal */}
      {showAllActivities && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowAllActivities(false)}
          />

          {/* Modal */}
          <div
            className="relative max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden rounded-lg"
            style={{ backgroundColor: 'var(--bg-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--stroke-1)' }}>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                All Recent Activities
              </h2>
              <button
                onClick={() => setShowAllActivities(false)}
                className="p-2 rounded-lg hover:bg-[var(--bg-2)] transition-colors"
              >
                <X size={20} style={{ color: 'var(--text-2)' }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {dashboardData?.activities && dashboardData.activities.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.activities.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${
                          item.status === 'success' ? 'bg-green-500' :
                          item.status === 'error' ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`} />
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-1)' }}>
                            {item.event}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                            {item.component}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                          {item.time}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity size={48} className="mx-auto mb-4" style={{ color: 'var(--text-3)' }} />
                  <p style={{ color: 'var(--text-2)' }}>No recent activities found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
