interface StatusBadgeProps {
  status: 'active' | 'violated' | 'pending' | 'offline' | 'success' | 'warning' | 'critical';
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const colors = {
    active: 'var(--ok-green)',
    success: 'var(--ok-green)',
    violated: 'var(--error-red)',
    critical: 'var(--error-red)',
    pending: 'var(--warn-amber)',
    warning: 'var(--warn-amber)',
    offline: 'var(--text-3)',
  };

  return (
    <span
      className="inline-flex items-center gap-2 px-2 py-1 rounded"
      style={{
        backgroundColor: `${colors[status]}15`,
        color: colors[status],
        border: `1px solid ${colors[status]}30`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: colors[status] }}
      />
      <span style={{ fontSize: 'var(--text-small)' }}>{children}</span>
    </span>
  );
}
