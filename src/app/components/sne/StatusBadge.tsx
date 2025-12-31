interface StatusBadgeProps {
  status: 'active' | 'violated' | 'pending' | 'offline' | 'success' | 'warning' | 'critical';
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const colors = {
    active: 'var(--sne-success)',
    success: 'var(--sne-success)',
    violated: 'var(--sne-critical)',
    critical: 'var(--sne-critical)',
    pending: 'var(--sne-warning)',
    warning: 'var(--sne-warning)',
    offline: 'var(--sne-text-secondary)',
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
