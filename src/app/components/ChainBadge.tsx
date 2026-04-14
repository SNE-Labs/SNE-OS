import type { IconComponent } from '@web3icons/react';
import {
  NetworkArbitrumOne,
  NetworkAvalanche,
  NetworkBase,
  NetworkBinanceSmartChain,
  NetworkBitcoin,
  NetworkEthereum,
  NetworkOptimism,
  NetworkPolygon,
  NetworkScroll,
  NetworkSolana,
  NetworkSui,
} from '@web3icons/react';

import { cn } from './ui/utils';

type ChainBadgeProps = {
  chain: string;
  size?: 'sm' | 'md';
  className?: string;
};

const CHAIN_ICONS: Record<string, IconComponent> = {
  arbitrum: NetworkArbitrumOne,
  arb: NetworkArbitrumOne,
  avalanche: NetworkAvalanche,
  avax: NetworkAvalanche,
  base: NetworkBase,
  bnb: NetworkBinanceSmartChain,
  bsc: NetworkBinanceSmartChain,
  bitcoin: NetworkBitcoin,
  btc: NetworkBitcoin,
  ethereum: NetworkEthereum,
  eth: NetworkEthereum,
  optimism: NetworkOptimism,
  op: NetworkOptimism,
  polygon: NetworkPolygon,
  matic: NetworkPolygon,
  scroll: NetworkScroll,
  solana: NetworkSolana,
  sol: NetworkSolana,
  sui: NetworkSui,
};

function normalizeChainKey(chain: string) {
  return chain
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function ChainBadge({ chain, size = 'md', className }: ChainBadgeProps) {
  const Icon = CHAIN_ICONS[normalizeChainKey(chain)];
  const compact = size === 'sm';
  const iconSize = compact ? 14 : 16;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border',
        compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-2 text-xs',
        className
      )}
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'var(--stroke-1)',
        color: 'var(--text-2)',
      }}
    >
      {Icon ? (
        <span
          className="inline-flex items-center justify-center rounded-full"
          style={{
            width: compact ? 16 : 18,
            height: compact ? 16 : 18,
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        >
          <Icon size={iconSize} variant="branded" />
        </span>
      ) : null}
      <span>{chain}</span>
    </span>
  );
}
