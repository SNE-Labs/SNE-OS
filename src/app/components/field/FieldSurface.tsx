import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

type FieldMotif =
  | 'intel-aperture'
  | 'session-ledger'
  | 'signal-stack'
  | 'liquidity-field'
  | 'radar-field'
  | 'execution-rail'
  | 'editorial-index'
  | 'vault-ledger'
  | 'swap-engine'
  | 'identity-mesh'
  | 'sovereign-key'
  | 'neutral';

type FieldSurfaceProps = HTMLAttributes<HTMLElement> & {
  motif?: FieldMotif;
  as?: 'section' | 'div' | 'article' | 'button' | 'header' | 'aside' | 'main';
  children: ReactNode;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
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
