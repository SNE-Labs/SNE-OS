import React from 'react';
import { cn } from '../../lib/utils';
import { StatTile, StatTileProps } from './StatTile';

export interface StatGridProps {
  stats: StatTileProps[];
  columns?: 2 | 3;
  className?: string;
}

export function StatGrid({ stats, columns = 2, className }: StatGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 2 ? 'grid-cols-2' : 'grid-cols-3',
        className
      )}
    >
      {stats.map((stat, index) => (
        <StatTile key={index} {...stat} />
      ))}
    </div>
  );
}

