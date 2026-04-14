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
import { Activity, Shield, Waves, Zap } from 'lucide-react';

import type { CSSProperties } from 'react';
import type { HomeIntelSectionKey } from '@/services/home-intel';

type IntelEntityIconProps = {
  symbol?: string | null;
  sectionKey?: HomeIntelSectionKey;
  className?: string;
  style?: CSSProperties;
  iconClassName?: string;
};

const ENTITY_ICONS: Record<string, IconComponent> = {
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

const SECTION_FALLBACK_ICONS: Record<HomeIntelSectionKey, typeof Activity> = {
  market: Activity,
  tech: Zap,
  politica: Shield,
  cripto: Waves,
};

function normalizeKey(value?: string | null) {
  return (value ?? '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function IntelEntityIcon({ symbol, sectionKey = 'market', className, style, iconClassName }: IntelEntityIconProps) {
  const Icon = ENTITY_ICONS[normalizeKey(symbol)];

  if (Icon) {
    return (
      <div className={className} style={style}>
        <Icon size={20} variant="branded" className={iconClassName} />
      </div>
    );
  }

  const FallbackIcon = SECTION_FALLBACK_ICONS[sectionKey];
  return (
    <div className={className} style={style}>
      <FallbackIcon className={iconClassName} />
    </div>
  );
}
