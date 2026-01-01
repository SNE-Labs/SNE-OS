import React from 'react';
import { cn } from '../ui/utils';
import { Radar, Lock, CreditCard, DollarSign, Activity, BookOpen } from 'lucide-react';

export type TabId = 'radar' | 'vault' | 'pass' | 'pricing' | 'status' | 'docs';

export interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  badges?: Partial<Record<TabId, boolean>>;
  disabled?: TabId[];
  className?: string;
}

const tabs: Array<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'radar', label: 'Radar', icon: Radar },
  { id: 'vault', label: 'Vault', icon: Lock },
  { id: 'pass', label: 'Pass', icon: CreditCard },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'status', label: 'Status', icon: Activity },
  { id: 'docs', label: 'Docs', icon: BookOpen },
];

export function BottomTabBar({
  activeTab,
  onTabChange,
  badges = {},
  disabled = [],
  className,
}: BottomTabBarProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0 bg-[var(--bg-1)] border-t border-[var(--stroke-1)]',
        'grid grid-cols-6 gap-0',
        'pb-safe',
        className
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isDisabled = disabled.includes(tab.id);
        const hasBadge = badges[tab.id];

        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onTabChange(tab.id)}
            disabled={isDisabled}
            className={cn(
              'flex flex-col items-center justify-center py-2 transition-colors relative',
              'min-h-[56px]',
              isActive && 'text-[var(--accent-orange)]',
              !isActive && !isDisabled && 'text-[var(--text-2)] hover:text-[var(--text-1)]',
              isDisabled && 'text-[var(--text-3)] opacity-50 cursor-not-allowed'
            )}
          >
            <div className="relative">
              <Icon className="w-5 h-5 mb-1" />
              {hasBadge && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--accent-orange)] rounded-full" />
              )}
            </div>
            <span className="text-[10px]">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

