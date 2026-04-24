import type { HTMLAttributes, ReactNode } from 'react';

type FieldMotif = 'intel-aperture' | 'session-ledger' | 'signal-stack' | 'liquidity-field' | 'neutral';

type FieldSurfaceProps = HTMLAttributes<HTMLElement> & {
  motif?: FieldMotif;
  as?: 'section' | 'div' | 'article';
  children: ReactNode;
};

export function FieldSurface({
  motif = 'neutral',
  as: Tag = 'section',
  className = '',
  children,
  ...props
}: FieldSurfaceProps) {
  return (
    <Tag className={`field-surface field-surface--${motif} ${className}`} {...props}>
      <div className="field-surface__motif" aria-hidden="true" />
      <div className="field-surface__corner field-surface__corner--tl" aria-hidden="true" />
      <div className="field-surface__corner field-surface__corner--br" aria-hidden="true" />
      {children}
    </Tag>
  );
}

export type { FieldMotif };
