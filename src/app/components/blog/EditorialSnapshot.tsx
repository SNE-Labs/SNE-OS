import { cn } from '../ui/utils';

type EditorialSnapshotProps = {
  items: string[];
  variant?: 'desktop' | 'mobile';
};

function snapshotGridClass(count: number, variant: 'desktop' | 'mobile') {
  if (variant === 'mobile') {
    return 'space-y-2';
  }
  if (count === 1) return 'grid grid-cols-1 gap-3';
  if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-3';
  if (count === 3) return 'grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-3';
  return 'grid grid-cols-1 md:grid-cols-2 gap-3';
}

function snapshotCardClass(count: number, index: number, variant: 'desktop' | 'mobile') {
  if (variant === 'mobile') {
    if (index === 0) return 'rounded-2xl border px-4 py-4';
    return 'rounded-xl border px-3 py-3';
  }

  if (count === 1) return 'rounded-[24px] border px-5 py-5';
  if (count === 3 && index === 0) return 'rounded-[24px] border px-5 py-5 md:row-span-2';
  if (count === 2 || count >= 4) return 'rounded-2xl border px-4 py-4';
  return 'rounded-2xl border px-4 py-4';
}

function snapshotLabel(count: number, index: number) {
  if (count === 1) return 'Sinal central';
  if (index === 0) return 'Sinal principal';
  return `Sinal ${index + 1}`;
}

export function EditorialSnapshot({ items, variant = 'desktop' }: EditorialSnapshotProps) {
  if (!items.length) return null;

  const limitedItems = items.slice(0, variant === 'desktop' ? 4 : 3);
  const count = limitedItems.length;

  return (
    <div className={snapshotGridClass(count, variant)}>
      {limitedItems.map((line, index) => (
        <div
          key={`${line}-${index}`}
          className={cn(snapshotCardClass(count, index, variant))}
          style={{
            backgroundColor: index === 0 ? 'rgba(255,255,255,0.045)' : 'var(--bg-3)',
            borderColor: 'var(--stroke-1)',
          }}
        >
          <div
            className="text-[11px] uppercase tracking-[0.16em] mb-2"
            style={{ color: 'var(--text-3)' }}
          >
            {snapshotLabel(count, index)}
          </div>
          <div
            className={cn(
              index === 0
                ? variant === 'desktop'
                  ? 'text-[1.02rem] leading-8'
                  : 'text-[0.98rem] leading-7'
                : 'text-sm leading-7'
            )}
            style={{ color: 'var(--text-2)' }}
          >
            {line}
          </div>
        </div>
      ))}
    </div>
  );
}
