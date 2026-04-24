import React from 'react';
import { cn } from '../ui/utils';
import { OperationalState } from '../OperationalState';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('py-2', className)}>
      <OperationalState
        tone="error"
        title={title}
        description={description}
        actionLabel={onRetry ? 'Tentar novamente' : undefined}
        onAction={onRetry}
        compact
      />
    </div>
  );
}

