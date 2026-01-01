import React from 'react';
import { cn } from '../ui/utils';
import { ChevronRight } from 'lucide-react';
import { Badge } from './Badge';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: {
    label: string;
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'orange';
  };
  icon?: React.ReactNode;
  showChevron?: boolean;
  variant?: 'default' | 'destructive' | 'disabled';
  onClick?: () => void;
  className?: string;
}

export function ListItem({
  title,
  subtitle,
  meta,
  badge,
  icon,
  showChevron = false,
  variant = 'default',
  onClick,
  className,
}: ListItemProps) {
  const isInteractive = !!onClick;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 border-b border-[var(--stroke-1)] transition-colors',
        isInteractive && 'cursor-pointer hover:bg-[var(--bg-2)] active:bg-[var(--bg-elevated)]',
        variant === 'destructive' && 'text-[var(--danger)]',
        variant === 'disabled' && 'opacity-50 pointer-events-none',
        className
      )}
      onClick={onClick}
    >
      {icon && <div className="flex-shrink-0 text-[var(--text-2)]">{icon}</div>}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            variant === 'destructive' ? 'text-[var(--danger)]' : 'text-[var(--text-1)]'
          )}>
            {title}
          </span>
          {badge && <Badge variant={badge.variant} size="sm">{badge.label}</Badge>}
        </div>
        {subtitle && (
          <span className="text-sm text-[var(--text-2)] block mt-0.5">{subtitle}</span>
        )}
      </div>

      {meta && (
        <span className="text-xs text-[var(--text-3)] flex-shrink-0">{meta}</span>
      )}

      {showChevron && (
        <ChevronRight className="w-5 h-5 text-[var(--text-3)] flex-shrink-0" />
      )}
    </div>
  );
}

