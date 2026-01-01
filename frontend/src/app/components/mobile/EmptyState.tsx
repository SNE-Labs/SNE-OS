import React from 'react';
import { cn } from '../../lib/utils';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="text-[var(--text-3)] mb-4">
        {icon || <Inbox className="w-12 h-12" />}
      </div>
      <h3 className="text-[var(--text-1)] mb-2 text-center">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-2)] text-center max-w-xs mb-6">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

