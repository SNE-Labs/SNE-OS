import React from 'react';
import { cn } from '../ui/utils';
import { AlertCircle } from 'lucide-react';
import { MobileButton } from './MobileButton';

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
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="text-[var(--danger)] mb-4">
        <AlertCircle className="w-12 h-12" />
      </div>
      <h3 className="text-[var(--text-1)] mb-2 text-center">{title}</h3>
      <p className="text-sm text-[var(--text-2)] text-center max-w-xs mb-6">
        {description}
      </p>
      {onRetry && (
        <MobileButton variant="secondary" onClick={onRetry}>
          Try Again
        </MobileButton>
      )}
    </div>
  );
}

