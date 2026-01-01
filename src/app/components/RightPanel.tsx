import { FileText, ArrowUp, AlertCircle, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Tag {
  label: string;
  value: string;
}

interface Alert {
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  time: string;
}

interface Action {
  label: string;
  icon: string;
}

interface RightPanelProps {
  tags?: Tag[];
  alerts?: Alert[];
  actions?: Action[];
  onAction?: (action: Action) => void;
}

const iconMap: Record<string, any> = {
  FileText,
  ArrowUp,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
};

export function RightPanel({ tags = [], alerts = [], actions = [], onAction }: RightPanelProps) {
  const navigate = useNavigate();

  const handleActionClick = (action: Action) => {
    if (onAction) {
      onAction(action);
      return;
    }

    // Default actions
    switch (action.label) {
      case 'Open Docs':
        navigate('/docs');
        break;
      case 'Upgrade':
        navigate('/pricing');
        break;
      case 'Report Issue':
        window.open('https://github.com/SNE-Labs/SNE-OS/issues', '_blank');
        break;
      case 'Refresh Data':
        window.location.reload();
        break;
      case 'Upgrade to Pro':
        navigate('/pricing');
        break;
      case 'View Docs':
        navigate('/docs');
        break;
      default:
        console.log(`Action clicked: ${action.label}`);
    }
  };
  return (
    <aside
      className="w-[360px] flex-shrink-0 border-l px-6 py-6 overflow-y-auto"
      style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--stroke-1)' }}
    >
      {/* Tags Widget */}
      {tags.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
            Tags
          </h4>
          <div className="space-y-2">
            {tags.map((tag, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>{tag.label}</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{tag.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts Widget */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
            Alerts
          </h4>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <div className="flex items-start gap-2 mb-1">
                  {alert.type === 'success' && <CheckCircle2 size={14} style={{ color: 'var(--ok-green)', marginTop: '2px' }} />}
                  {alert.type === 'warning' && <AlertTriangle size={14} style={{ color: 'var(--warn-amber)', marginTop: '2px' }} />}
                  {alert.type === 'error' && <AlertCircle size={14} style={{ color: 'var(--danger-red)', marginTop: '2px' }} />}
                  {alert.type === 'info' && <AlertCircle size={14} style={{ color: 'var(--info-cyan)', marginTop: '2px' }} />}
                  <p className="text-xs flex-1" style={{ color: 'var(--text-2)' }}>
                    {alert.message}
                  </p>
                </div>
                <p className="text-xs pl-5" style={{ color: 'var(--text-3)' }}>{alert.time}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions Widget */}
      {actions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
            Quick Actions
          </h4>
          <div className="space-y-2">
            {actions.map((action, index) => {
              const Icon = iconMap[action.icon] || FileText;
              return (
                <button
                  key={index}
                  onClick={() => handleActionClick(action)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[var(--bg-3)] hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                >
                  <Icon size={16} style={{ color: 'var(--text-2)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
