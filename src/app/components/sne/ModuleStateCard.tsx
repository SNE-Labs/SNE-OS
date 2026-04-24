import { OperationalState } from '../OperationalState';

type ModuleStateTone = 'loading' | 'disconnected' | 'error' | 'empty';

interface ModuleStateCardProps {
  tone: ModuleStateTone;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function ModuleStateCard({
  tone,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: ModuleStateCardProps) {
  return (
    <OperationalState
      tone={tone}
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
      compact={compact}
    />
  );
}
