import React from 'react';
import { cn } from '../ui/utils';
import { OperationalState } from '../OperationalState';

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
    <div className={cn('py-2', className)}>
      <OperationalState tone="empty" title={title} description={description ?? 'Nenhum sinal operacional retornou para esta superfície.'} compact />
      {icon || action ? (
        <div className="mt-3 flex justify-center text-[var(--text-3)]">
          {icon}
          {action}
        </div>
      ) : null}
    </div>
  );
}

