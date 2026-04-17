import { Link } from 'react-router-dom';

import { IntelEntityIcon } from './IntelEntityIcon';
import type { IntelVisualEntity } from '@/services/intel-visuals';

type IntelVisualChipProps = {
  entity: IntelVisualEntity;
  size?: 'sm' | 'md';
};

const SIZE_STYLES = {
  sm: {
    chip: 'px-3 py-2 text-[11px]',
    iconWrap: 'h-5 w-5 rounded-full',
    icon: 'h-3 w-3',
  },
  md: {
    chip: 'px-3.5 py-2 text-xs',
    iconWrap: 'h-6 w-6 rounded-full',
    icon: 'h-3.5 w-3.5',
  },
};

function chipInner(entity: IntelVisualEntity, size: 'sm' | 'md') {
  const styles = SIZE_STYLES[size];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border ${styles.chip}`}
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'var(--stroke-1)',
        color: 'var(--text-2)',
      }}
    >
      <IntelEntityIcon
        symbol={entity.iconSymbol}
        className={`flex items-center justify-center ${styles.iconWrap}`}
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        iconClassName={styles.icon}
      />
      <span style={{ color: 'var(--text-1)' }}>{entity.label}</span>
    </span>
  );
}

export function IntelVisualChip({ entity, size = 'sm' }: IntelVisualChipProps) {
  if (entity.route) {
    const href = `/${entity.route.kind === 'topic' ? 'intel/topic' : entity.route.kind === 'chain' ? 'intel/chain' : 'intel/asset'}/${entity.route.value}`;
    return <Link to={href}>{chipInner(entity, size)}</Link>;
  }

  return chipInner(entity, size);
}
