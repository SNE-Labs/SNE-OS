import type { IconComponent } from '@web3icons/react';
import {
  NetworkArbitrumOne,
  NetworkAvalanche,
  NetworkBase,
  NetworkBinanceSmartChain,
  NetworkBitcoin,
  NetworkCardano,
  NetworkEthereum,
  NetworkOptimism,
  NetworkPolygon,
  NetworkScroll,
  NetworkSolana,
  NetworkSui,
  NetworkXrp,
} from '@web3icons/react';
import { Activity, Shield, Waves, Zap } from 'lucide-react';
import { siChainlink, siDogecoin } from 'simple-icons';

import type { CSSProperties } from 'react';
import type { HomeIntelSectionKey } from '@/services/home-intel';

type IntelEntityIconProps = {
  symbol?: string | null;
  sectionKey?: HomeIntelSectionKey;
  className?: string;
  style?: CSSProperties;
  iconClassName?: string;
};

type SimpleSvgIcon = {
  kind: 'simple';
  path: string;
  color: string;
  viewBox?: string;
};

type EmojiIcon = {
  kind: 'emoji';
  value: string;
};

type MonogramIcon = {
  kind: 'monogram';
  value: string;
  color: string;
};

type ImageIcon = {
  kind: 'image';
  src: string;
};

type EntityIcon = IconComponent | SimpleSvgIcon | EmojiIcon | MonogramIcon | ImageIcon;

const ENTITY_ICONS: Record<string, EntityIcon> = {
  arbitrum: NetworkArbitrumOne,
  arb: NetworkArbitrumOne,
  avalanche: NetworkAvalanche,
  avax: NetworkAvalanche,
  base: NetworkBase,
  bnb: NetworkBinanceSmartChain,
  bsc: NetworkBinanceSmartChain,
  bitcoin: NetworkBitcoin,
  btc: NetworkBitcoin,
  cardano: NetworkCardano,
  ada: NetworkCardano,
  ethereum: NetworkEthereum,
  eth: NetworkEthereum,
  optimism: NetworkOptimism,
  op: NetworkOptimism,
  polygon: NetworkPolygon,
  matic: NetworkPolygon,
  scroll: NetworkScroll,
  chainlink: {
    kind: 'simple',
    path: siChainlink.path,
    color: `#${siChainlink.hex}`,
  },
  link: {
    kind: 'simple',
    path: siChainlink.path,
    color: `#${siChainlink.hex}`,
  },
  aave: { kind: 'image', src: '/icons/aave.svg' },
  uni: { kind: 'monogram', value: 'U', color: '#FF007A' },
  uniswap: { kind: 'monogram', value: 'U', color: '#FF007A' },
  dogecoin: {
    kind: 'simple',
    path: siDogecoin.path,
    color: `#${siDogecoin.hex}`,
  },
  doge: {
    kind: 'simple',
    path: siDogecoin.path,
    color: `#${siDogecoin.hex}`,
  },
  solana: NetworkSolana,
  sol: NetworkSolana,
  sui: NetworkSui,
  xrp: NetworkXrp,
  ripple: NetworkXrp,
  'country-us': { kind: 'emoji', value: '🇺🇸' },
  'country-br': { kind: 'emoji', value: '🇧🇷' },
  'country-ar': { kind: 'emoji', value: '🇦🇷' },
  'country-cn': { kind: 'emoji', value: '🇨🇳' },
  'country-eu': { kind: 'emoji', value: '🇪🇺' },
  'country-uk': { kind: 'emoji', value: '🇬🇧' },
  'country-jp': { kind: 'emoji', value: '🇯🇵' },
  'country-sg': { kind: 'emoji', value: '🇸🇬' },
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
    if (typeof Icon === 'object' && 'kind' in Icon && Icon.kind === 'simple') {
      return (
        <div className={className} style={style}>
          <svg
            viewBox={Icon.viewBox ?? '0 0 24 24'}
            aria-hidden="true"
            className={iconClassName}
            fill={Icon.color}
          >
            <path d={Icon.path} />
          </svg>
        </div>
      );
    }

    if (typeof Icon === 'object' && 'kind' in Icon && Icon.kind === 'emoji') {
      return (
        <div className={className} style={style}>
          <span aria-hidden="true" className={iconClassName} style={{ fontSize: '0.95em', lineHeight: 1 }}>
            {Icon.value}
          </span>
        </div>
      );
    }

    if (typeof Icon === 'object' && 'kind' in Icon && Icon.kind === 'image') {
      return (
        <div className={className} style={style}>
          <img src={Icon.src} alt="" aria-hidden="true" className={iconClassName} />
        </div>
      );
    }

    if (typeof Icon === 'object' && 'kind' in Icon && Icon.kind === 'monogram') {
      return (
        <div className={className} style={style}>
          <span
            aria-hidden="true"
            className={iconClassName}
            style={{ color: Icon.color, fontWeight: 700, fontSize: '0.95em', lineHeight: 1 }}
          >
            {Icon.value}
          </span>
        </div>
      );
    }

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
