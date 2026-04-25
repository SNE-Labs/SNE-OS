import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowLeftRight,
  ArrowUpRight,
  BadgeCheck,
  Compass,
  Lock,
  type LucideIcon,
  Newspaper,
  Shield,
  Wallet,
  Waves,
  Zap,
} from 'lucide-react';
import { IntelEntityIcon } from '../components/IntelEntityIcon';
import { FieldSurface } from '../components/field/FieldSurface';
import { PageSignalFrame, SignalPanel } from '../components/motion/PageMotion';
import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { useRadarCandlesPreview, useRadarOverview } from '../../hooks/useRadarData';
import { apiGet } from '@/lib/api/http';
import { useEntitlements } from '@/lib/auth/EntitlementsProvider';
import { readPersistedSnapshot, writePersistedSnapshot } from '@/lib/querySnapshot';
import { normalizeIntelRoute } from '@/services/intel-api';
import type { RadarCandle } from '@/services/radar-api';
import { buildHomeIntelSections, type HomeIntelSectionKey } from '@/services/home-intel';
import { formatAddress } from '@/utils/format';

type DashboardPayload = {
  status: { overall_status: string; uptime_percentage: number | null };
  metrics: { latency_ms: number | null; uptime_percentage: number | null; last_proof_minutes: number | null };
  components: Array<{ name: string; status: string; last_check: string }>;
  activities: Array<{ event: string; component: string; time: string; status: string; timestamp: string }>;
  alerts: Array<{ message: string; type: string; time: string }>;
  last_updated: string;
};

type IntelItem = {
  id: string;
  title: string;
  title_pt?: string;
  title_original?: string;
  summary?: string;
  summary_pt?: string;
  url: string;
  source: string;
  source_tier?: string;
  points: number;
  comments: number;
  author: string;
  created_at: string;
  module: string;
  agent_note: string;
  category?: string;
  editorial_kind?: string;
  impact?: {
    label: string;
    score: number;
    direction: string;
  };
  topics?: string[];
  chains?: string[];
  protocols?: string[];
  assets?: string[];
  countries?: string[];
  visual_entities?: Array<{ id: string; label: string; icon_symbol?: string; iconSymbol?: string }>;
  primary_visual_entity?: { id: string; label: string; icon_symbol?: string; iconSymbol?: string } | null;
  why_it_matters?: string;
  watch_items?: string[];
};

type MarketMover = {
  symbol: string;
  price: number;
  change24h: number;
  volume: string | number;
  score?: number;
};

type MarketPulseRow = {
  symbol: string;
  price: number | null;
  change24h: number | null;
  volume: string | number | null;
  unavailable?: boolean;
};

type MarketEditorial = {
  status: 'pending' | 'ready' | 'failed';
  headline: string;
  summary_pt: string;
  watch_items: string[];
  highlights: Array<{ symbol: string; note: string }>;
  generated_at: string | null;
};

type HomeResponse = {
  session: { authenticated: boolean; address: string | null };
  wallet: {
    address: string;
    status: string;
    balance_eth: number | null;
    tx_count: number | null;
    account_type: string | null;
    last_updated: string;
  } | null;
  brief: {
    badge: string;
    badge_status: 'active' | 'success' | 'warning' | 'pending';
    headline: string;
    summary: string;
  };
  brief_signals: Array<{ label: string; value: string }>;
  modules: Array<{ title: string; path: string; label: string; status: 'active' | 'success' | 'warning' | 'pending' }>;
  system: {
    tags: Array<{ label: string; value: string }>;
    workspace: Array<{ label: string; value: string }>;
  };
  dashboard: DashboardPayload;
  market: {
    top_movers: MarketMover[];
    top_losers: MarketMover[];
    volume_leaders: MarketMover[];
    regime: { label: string; tone: 'active' | 'success' | 'warning' | 'pending'; avg_change_24h: number };
    editorial: MarketEditorial;
    last_updated: string;
  };
  intel: { items: IntelItem[]; last_updated: string };
  last_updated: string;
};

const HOME_SNAPSHOT_KEY = 'sne:query:home';

type HeroCandidate = {
  id: string;
  item: IntelItem;
  section: {
    key: HomeIntelSectionKey;
    title: string;
    shortTitle: string;
    kicker: string;
    description: string;
  };
  relatedMover: MarketMover | null;
  relatedSymbol: string | null;
  assetConfidence: 'high' | 'medium' | 'none';
  implication: string;
  tapeItems: string[];
  sparklinePoints: string;
};

type HomeGuideStep = {
  key: 'pass' | 'radar' | 'intel' | 'vault' | 'swaps';
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
};

const RELATED_SYMBOL_ALIASES: Record<string, string> = {
  arb: 'ARB',
  arbitrum: 'ARB',
  avalanche: 'AVAX',
  avax: 'AVAX',
  base: 'ETH',
  bitcoin: 'BTC',
  btc: 'BTC',
  bnb: 'BNB',
  ether: 'ETH',
  ethereum: 'ETH',
  eth: 'ETH',
  optimism: 'OP',
  op: 'OP',
  polygon: 'MATIC',
  matic: 'MATIC',
  sei: 'SEI',
  sol: 'SOL',
  solana: 'SOL',
  sui: 'SUI',
  xrp: 'XRP',
};

const HOME_MARKET_PULSE_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ARBUSDT'] as const;

function normalizeEntityKey(value?: string | null) {
  return (value ?? '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function uniqueText(values: Array<string | null | undefined>) {
  const seen = new Set<string>();

  return values.reduce<string[]>((acc, value) => {
    const normalized = value?.replace(/\s+/g, ' ').trim();
    if (!normalized) return acc;

    const key = normalized.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) return acc;

    seen.add(key);
    acc.push(normalized);
    return acc;
  }, []);
}

function compactPhrase(value?: string | null, maxWords: number = 4) {
  if (!value) return null;

  const cleaned = value
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—•]+|[\s\-–—•]+$/g, '')
    .trim();

  if (!cleaned) return null;

  const words = cleaned.split(' ');
  return words.length > maxWords ? `${words.slice(0, maxWords).join(' ')}…` : cleaned;
}

function stripHeadlinePrefix(value?: string | null) {
  if (!value) return null;

  const cleaned = value.replace(/^[^:]+:\s*/, '').trim();
  return cleaned || value.trim();
}

function interleaveSignals(...groups: string[][]) {
  const maxLength = Math.max(0, ...groups.map((group) => group.length));
  const result: string[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    groups.forEach((group) => {
      if (group[index]) {
        result.push(group[index]);
      }
    });
  }

  return uniqueText(result);
}

function extractIntelSymbols(item: IntelItem) {
  const symbols = new Set<string>();
  const structuredSources = [...(item.assets ?? []), ...(item.protocols ?? []), ...(item.chains ?? [])];

  structuredSources.forEach((entry) => {
    const normalized = normalizeEntityKey(entry);
    if (RELATED_SYMBOL_ALIASES[normalized]) {
      symbols.add(RELATED_SYMBOL_ALIASES[normalized]);
      return;
    }

    if (/^[A-Z0-9]{2,6}$/.test(entry.trim())) {
      symbols.add(entry.trim().toUpperCase());
    }
  });

  [item.title_pt, item.title, item.title_original, item.summary_pt, item.summary].forEach((text) => {
    text
      ?.split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .forEach((token) => {
        const normalized = normalizeEntityKey(token);
        if (RELATED_SYMBOL_ALIASES[normalized]) {
          symbols.add(RELATED_SYMBOL_ALIASES[normalized]);
        }
      });
  });

  return Array.from(symbols);
}

function buildHeroSparkline(seedValue: string, drift: number) {
  let seed = 0;
  for (let index = 0; index < seedValue.length; index += 1) {
    seed = (seed * 31 + seedValue.charCodeAt(index)) % 2147483647;
  }

  let current = 74;
  const points: string[] = [];

  for (let index = 0; index < 18; index += 1) {
    seed = (seed * 48271) % 2147483647;
    const noise = ((seed / 2147483647) * 18 - 9) + drift * 28;
    current = Math.max(22, Math.min(116, current + noise));
    const x = (index / 17) * 100;
    const y = 120 - current;
    points.push(`${x},${y}`);
  }

  return points.join(' ');
}

function describeLiquidity(symbol: string, volumeLeaderSymbols: Set<string>, volume: string | number) {
  const numericVolume = typeof volume === 'number' ? volume : Number(String(volume).replace(/[^0-9.]/g, ''));

  if (volumeLeaderSymbols.has(symbol)) return 'liquidez forte';
  if (Number.isFinite(numericVolume) && numericVolume > 1_000_000_000) return 'fluxo dominante';
  return 'liquidez estável';
}

function toNumericVolume(value: string | number) {
  return typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.]/g, ''));
}

function assetIconSymbol(symbol: string) {
  return symbol
    .toUpperCase()
    .replace(/(USDT|USDC|USD|BTC|ETH)$/u, '')
    .toLocaleLowerCase('pt-BR');
}

function toRadarSymbol(value?: string | null) {
  if (!value) return '';

  const normalized = normalizeEntityKey(value);
  const aliasMap: Record<string, string> = {
    arbitrum: 'ARBUSDT',
    arb: 'ARBUSDT',
    avalanche: 'AVAXUSDT',
    avax: 'AVAXUSDT',
    base: 'ETHUSDT',
    bnb: 'BNBUSDT',
    bsc: 'BNBUSDT',
    bitcoin: 'BTCUSDT',
    btc: 'BTCUSDT',
    ethereum: 'ETHUSDT',
    eth: 'ETHUSDT',
    optimism: 'OPUSDT',
    op: 'OPUSDT',
    polygon: 'MATICUSDT',
    matic: 'MATICUSDT',
    scroll: 'ETHUSDT',
    solana: 'SOLUSDT',
    sol: 'SOLUSDT',
    sui: 'SUIUSDT',
  };

  if (aliasMap[normalized]) return aliasMap[normalized];

  const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (upper.endsWith('USDT')) return upper;
  if (/^[A-Z0-9]{2,10}$/.test(upper)) return `${upper}USDT`;
  return '';
}

function describeRisk(change24h: number) {
  if (change24h <= -0.03) return 'pressão imediata';
  if (change24h < 0) return 'risco de retrocesso';
  if (change24h >= 0.04) return 'continuidade em observação';
  return 'janela de validação aberta';
}

function formatRelativeTimestamp(value: string | null | undefined, now: Date) {
  if (!value) return 'agora';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'agora';

  const diffSeconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (diffSeconds < 60) return 'agora';
  if (diffSeconds < 3600) return `há ${Math.floor(diffSeconds / 60)}m`;
  if (diffSeconds < 86400) return `há ${Math.floor(diffSeconds / 3600)}h`;

  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatMarketPrice(value: number) {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function withAlpha(color: string, alpha: number) {
  const normalizedAlpha = Math.max(0, Math.min(1, alpha));

  if (color.startsWith('rgba(')) {
    return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${normalizedAlpha})`);
  }

  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${normalizedAlpha})`);
  }

  return color;
}

function formatKeysFeeTier(value?: string | null) {
  if (!value) return '--';
  if (value === 'operator_discount') return 'Operator discount';
  if (value === 'standard') return 'Standard';

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatChartTimestamp(value?: number | null) {
  if (!value) return '--';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(new Date(value));
  } catch {
    return '--';
  }
}

function MarketPulseCandlestick({
  symbol,
  change24h,
  candles,
  isLoading,
}: {
  symbol: string;
  change24h: number | null;
  candles: RadarCandle[];
  isLoading: boolean;
}) {
  const viewBoxWidth = 320;
  const viewBoxHeight = 144;
  const paddingX = 10;
  const paddingY = 12;
  const innerWidth = viewBoxWidth - paddingX * 2;
  const innerHeight = viewBoxHeight - paddingY * 2;
  const safeCandles = candles.slice(-36);
  const priceValues = safeCandles.flatMap((candle) => [candle.high, candle.low]);
  const high = priceValues.length > 0 ? Math.max(...priceValues) : 0;
  const low = priceValues.length > 0 ? Math.min(...priceValues) : 0;
  const priceRange = high - low || Math.max(high * 0.01, 1);
  const candleSlot = safeCandles.length > 0 ? innerWidth / safeCandles.length : innerWidth;
  const candleWidth = Math.max(3, Math.min(7, candleSlot * 0.56));
  const latestCandle = safeCandles[safeCandles.length - 1] ?? null;
  const latestPrice = latestCandle?.close ?? null;
  const latestTime = latestCandle?.timestamp ?? null;

  const projectY = (value: number) => {
    const normalized = (value - low) / priceRange;
    return paddingY + innerHeight - normalized * innerHeight;
  };

  return (
    <div className="sne-home-market-chart">
      <div className="sne-home-market-chart__header">
        <div>
          <div className="sne-home-market-chart__eyebrow">Candle 1H</div>
          <div className="sne-home-market-chart__title">
            {assetIconSymbol(symbol).toUpperCase()} {latestPrice == null ? '--' : `$${formatMarketPrice(latestPrice)}`}
          </div>
        </div>
        <div
          className="sne-home-market-chart__delta"
          data-tone={change24h == null ? 'flat' : change24h >= 0 ? 'up' : 'down'}
        >
          {change24h == null ? '--' : `${change24h >= 0 ? '+' : ''}${(change24h * 100).toFixed(1)}%`}
        </div>
      </div>

      <div className="sne-home-market-chart__frame">
        {safeCandles.length === 0 ? (
          <div className="sne-home-market-chart__empty">
            {isLoading ? 'Carregando candles...' : 'Candles indisponíveis no momento.'}
          </div>
        ) : (
          <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="sne-home-market-chart__svg" aria-hidden="true">
            <defs>
              <linearGradient id="home-market-chart-overlay" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75].map((ratio) => {
              const y = paddingY + innerHeight * ratio;
              return (
                <line
                  key={ratio}
                  x1={paddingX}
                  y1={y}
                  x2={viewBoxWidth - paddingX}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="2 5"
                />
              );
            })}

            {safeCandles.map((candle, index) => {
              const x = paddingX + candleSlot * index + candleSlot / 2;
              const openY = projectY(candle.open);
              const closeY = projectY(candle.close);
              const highY = projectY(candle.high);
              const lowY = projectY(candle.low);
              const bodyY = Math.min(openY, closeY);
              const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
              const bullish = candle.close >= candle.open;
              const color = bullish ? 'rgba(62,201,153,0.95)' : 'rgba(255,140,66,0.95)';

              return (
                <g key={candle.timestamp}>
                  <line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={color}
                    strokeWidth="1"
                    strokeLinecap="round"
                    opacity="0.92"
                  />
                  <rect
                    x={x - candleWidth / 2}
                    y={bodyY}
                    width={candleWidth}
                    height={bodyHeight}
                    rx="1.2"
                    fill={bullish ? color : 'rgba(255,140,66,0.18)'}
                    stroke={color}
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {latestPrice != null && (
              <line
                x1={paddingX}
                y1={projectY(latestPrice)}
                x2={viewBoxWidth - paddingX}
                y2={projectY(latestPrice)}
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="3 4"
              />
            )}

            <rect
              x={paddingX}
              y={paddingY}
              width={innerWidth}
              height={innerHeight}
              fill="url(#home-market-chart-overlay)"
              opacity="0.14"
            />
          </svg>
        )}
      </div>

      <div className="sne-home-market-chart__meta">
        <span>{safeCandles.length > 0 ? `${safeCandles.length} candles` : 'Sem candles'}</span>
        <span>{formatChartTimestamp(latestTime)}</span>
      </div>
    </div>
  );
}

const RADAR_PANEL_SURFACE_STYLE: CSSProperties = {
  background:
    'radial-gradient(circle at 18% 16%, rgba(255,140,66,0.08), transparent 22%), radial-gradient(circle at 80% 24%, rgba(62,201,153,0.06), transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.008))',
  boxShadow: 'var(--shadow-1)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const RADAR_RAIL_SURFACE_STYLE: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,140,66,0.08), rgba(255,255,255,0.02) 44%, rgba(255,255,255,0.01))',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: 'var(--shadow-1)',
};

function renderIntelHeroAtmosphere(
  sectionKey: HomeIntelSectionKey | undefined,
  accentColor: string,
  sparklinePoints?: string
) {
  const accentPrimary = withAlpha(accentColor, 0.9);
  const accentSoft = withAlpha(accentColor, 0.22);
  const accentFaint = withAlpha(accentColor, 0.1);

  if (sectionKey === 'tech') {
    return (
      <>
        <svg
          viewBox="0 0 320 180"
          preserveAspectRatio="none"
          className="absolute right-[5%] top-[12%] h-[60%] w-[50%] opacity-55"
        >
          <defs>
            <linearGradient id="hero-tech-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accentPrimary} />
              <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
            </linearGradient>
          </defs>
          <rect x="18" y="22" width="124" height="56" rx="8" fill="none" stroke="url(#hero-tech-gradient)" strokeWidth="1.2" />
          <rect x="162" y="34" width="92" height="38" rx="7" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <rect x="116" y="104" width="150" height="42" rx="9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <path d="M142 50 H178 V53 H210" fill="none" stroke={accentSoft} strokeWidth="1.4" />
          <path d="M84 78 V110 H116" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <path d="M254 53 V104 H204" fill="none" stroke={accentSoft} strokeWidth="1.2" />
          <circle cx="84" cy="78" r="4" fill={accentPrimary} />
          <circle cx="210" cy="53" r="3.5" fill="rgba(255,255,255,0.18)" />
          <circle cx="204" cy="104" r="3.5" fill={accentPrimary} />
          <circle cx="116" cy="110" r="3.5" fill="rgba(255,255,255,0.14)" />
        </svg>
        <motion.div
          className="absolute right-[12%] top-[18%] h-[38%] w-px"
          style={{ background: `linear-gradient(180deg, transparent, ${accentPrimary}, transparent)` }}
          animate={{ opacity: [0.18, 0.45, 0.18], scaleY: [0.92, 1.05, 0.92] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </>
    );
  }

  if (sectionKey === 'politica') {
    return (
      <>
        <svg
          viewBox="0 0 320 180"
          preserveAspectRatio="none"
          className="absolute right-[4%] top-[10%] h-[62%] w-[52%] opacity-50"
        >
          <defs>
            <linearGradient id="hero-politica-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentPrimary} />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          <rect x="24" y="22" width="44" height="96" rx="6" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <rect x="84" y="34" width="52" height="84" rx="6" fill="none" stroke="url(#hero-politica-gradient)" strokeWidth="1.2" />
          <rect x="154" y="18" width="60" height="108" rx="6" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <rect x="232" y="42" width="52" height="70" rx="6" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <circle cx="184" cy="144" r="18" fill="none" stroke={accentSoft} strokeWidth="1.4" />
          <circle cx="184" cy="144" r="8" fill={accentFaint} stroke={accentPrimary} strokeWidth="1.1" />
          <path d="M184 126 V102" fill="none" stroke={accentSoft} strokeWidth="1.3" />
          <path d="M184 162 V170" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        </svg>
        <motion.div
          className="absolute right-[9%] top-[16%] h-[1px] w-[24%]"
          style={{ background: `linear-gradient(90deg, transparent, ${accentPrimary}, transparent)` }}
          animate={{ opacity: [0.16, 0.36, 0.16], x: ['-6%', '6%', '-6%'] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </>
    );
  }

  if (sectionKey === 'cripto') {
    return (
      <>
        <svg
          viewBox="0 0 320 180"
          preserveAspectRatio="none"
          className="absolute right-[4%] top-[12%] h-[60%] w-[52%] opacity-52"
        >
          <defs>
            <linearGradient id="hero-crypto-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accentPrimary} />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          <path d="M42 118 L102 54 L164 98 L228 42 L286 84" fill="none" stroke="url(#hero-crypto-gradient)" strokeWidth="1.2" />
          <path d="M42 118 L92 144 L164 98 L214 142 L286 84" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <path d="M102 54 L92 144" fill="none" stroke={accentSoft} strokeWidth="1" />
          <path d="M228 42 L214 142" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <circle cx="42" cy="118" r="5" fill={accentPrimary} />
          <circle cx="102" cy="54" r="4.5" fill="rgba(255,255,255,0.16)" />
          <circle cx="164" cy="98" r="5" fill={accentPrimary} />
          <circle cx="228" cy="42" r="4.5" fill="rgba(255,255,255,0.14)" />
          <circle cx="286" cy="84" r="5" fill={accentPrimary} />
          <circle cx="92" cy="144" r="4" fill="rgba(255,255,255,0.12)" />
          <circle cx="214" cy="142" r="4" fill="rgba(255,255,255,0.12)" />
        </svg>
        <motion.div
          className="absolute right-[10%] bottom-[18%] h-[18%] w-[18%] rounded-full blur-2xl"
          style={{ backgroundColor: accentFaint }}
          animate={{ opacity: [0.08, 0.2, 0.08], scale: [0.94, 1.06, 0.94] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
      </>
    );
  }

  return (
    <>
      <div
        className="absolute inset-x-[10%] top-[24%] h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accentSoft}, transparent)` }}
      />
      <div
        className="absolute inset-x-[14%] top-[40%] h-px"
        style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)` }}
      />
      <div
        className="absolute inset-x-[18%] top-[56%] h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accentFaint}, transparent)` }}
      />
      <motion.div
        className="absolute right-[10%] top-[18%] h-[42%] w-px"
        style={{ background: `linear-gradient(180deg, transparent, ${accentPrimary}, transparent)` }}
        animate={{ opacity: [0.14, 0.34, 0.14], y: ['-4%', '4%', '-4%'] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      {sparklinePoints ? (
        <svg
          viewBox="0 0 100 120"
          preserveAspectRatio="none"
          className="absolute inset-x-[44%] bottom-[4%] h-[38%] w-[50%] opacity-34"
        >
          <defs>
            <linearGradient id="hero-market-sparkline-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="40%" stopColor={accentPrimary} />
              <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#hero-market-sparkline-gradient)"
            strokeWidth="1.6"
            points={sparklinePoints}
          />
        </svg>
      ) : null}
    </>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { loading: entitlementsLoading, entitlement, effectiveAccess, accessClass, feeTier } = useEntitlements();
  const [now, setNow] = useState(new Date());
  const [heroCycle, setHeroCycle] = useState(0);
  const [marketChartSymbol, setMarketChartSymbol] = useState<string>('BTCUSDT');
  const persistedHome = readPersistedSnapshot<HomeResponse>(HOME_SNAPSHOT_KEY);

  const { data: homeData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['home'],
    queryFn: async () => {
      const payload = await apiGet<HomeResponse>('/api/home');
      writePersistedSnapshot(HOME_SNAPSHOT_KEY, payload);
      return payload;
    },
    initialData: persistedHome?.data,
    initialDataUpdatedAt: persistedHome?.savedAt,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
    retry: 3,
  });
  useEffect(() => {
    const clockTimer = window.setInterval(() => setNow(new Date()), 10000);
    const heroTimer = window.setInterval(() => setHeroCycle((current) => current + 1), 16000);

    return () => {
      window.clearInterval(clockTimer);
      window.clearInterval(heroTimer);
    };
  }, []);

  const liveMovers = homeData?.market.top_movers ?? [];
  const topLosers = homeData?.market.top_losers ?? [];
  const volumeLeaders = homeData?.market.volume_leaders ?? [];
  const marketEditorial = homeData?.market.editorial;
  const marketRegime = homeData?.market.regime;
  const intelItems = homeData?.intel.items ?? [];
  const intelSections = useMemo(() => buildHomeIntelSections(intelItems), [intelItems]);
  const marketPulseOverviewQuery = useRadarOverview('BTCUSDT', '24H');
  const marketPulseOverview = marketPulseOverviewQuery.data;
  const brief = homeData?.brief;
  const data = homeData?.dashboard;
  const walletConnected = Boolean(homeData?.session.authenticated || homeData?.wallet?.address);
  const walletReady = homeData?.wallet?.status === 'ready';
  const commandIntent = walletConnected
    ? {
        eyebrow: 'Command Center',
        title: 'Conta conectada',
        summary: 'Valide o mercado antes de mover saldo.',
      }
    : {
        eyebrow: 'Command Center',
        title: 'Sessão pública ativa',
        summary: 'Mercado disponível para leitura. Conecte a conta para ativar identidade, vault e memória privada.',
      };
  const commandDeck = walletConnected
    ? [
        {
          label: 'Vault',
          state: homeData?.wallet?.status === 'ready' ? 'conta pronta' : 'saldo em leitura',
          path: '/vault',
          icon: Wallet,
          tone: 'success' as const,
        },
        {
          label: 'Mover USDT',
          state: 'rail de execução',
          path: '/swaps',
          icon: Waves,
          tone: 'warning' as const,
        },
        {
          label: 'Validar Radar',
          state: marketRegime?.label ?? 'mercado ao vivo',
          path: '/radar',
          icon: Compass,
          tone: 'active' as const,
        },
      ]
    : [
        {
          label: 'Ler mercado',
          state: marketRegime?.label ?? 'Radar público',
          path: '/radar',
          icon: Compass,
          tone: 'warning' as const,
        },
        {
          label: 'Intel',
          state: intelItems.length > 0 ? `${intelItems.length} sinais ativos` : 'brief ao vivo',
          path: '/intel',
          icon: Newspaper,
          tone: 'active' as const,
        },
        {
          label: 'Conectar',
          state: 'identidade primeiro',
          path: '/pass',
          icon: Shield,
          tone: 'pending' as const,
        },
      ];
  const homeGuide = useMemo(() => {
    const steps: HomeGuideStep[] = [
      {
        key: 'pass',
        label: 'Pass',
        description: 'Conectar sua carteira',
        path: '/pass',
        icon: Shield,
      },
      {
        key: 'radar',
        label: 'Radar',
        description: 'Ver o mercado',
        path: '/radar',
        icon: Activity,
      },
      {
        key: 'intel',
        label: 'Intel',
        description: 'Entender o contexto',
        path: '/intel',
        icon: Newspaper,
      },
      {
        key: 'vault',
        label: 'Vault',
        description: 'Conferir seu saldo',
        path: '/vault',
        icon: Lock,
      },
      {
        key: 'swaps',
        label: 'Swaps',
        description: 'Fazer a troca',
        path: '/swaps',
        icon: ArrowLeftRight,
      },
    ];

    if (!walletConnected) {
      return {
        eyebrow: 'Como começar',
        title: 'Conecte sua carteira para liberar o uso completo',
        summary: 'Você já pode navegar pelo mercado, mas a carteira conectada é o que libera saldo, memória e continuidade dentro do sistema.',
        currentLabel: 'Ir para Pass',
        currentPath: '/pass',
        steps,
      };
    }

    if (!walletReady) {
      return {
        eyebrow: 'Próximo passo',
        title: 'Sua carteira já está conectada',
        summary: 'Agora vale conferir seu saldo e entender o mercado antes de pensar em qualquer troca.',
        currentLabel: 'Abrir Vault',
        currentPath: '/vault',
        steps,
      };
    }

    return {
      eyebrow: 'Próximo passo',
      title: 'Sua conta já está pronta para avançar',
      summary: 'Comece pelo Radar, use Intel para ganhar contexto e só então siga para Swaps quando a leitura fizer sentido.',
      currentLabel: 'Abrir Radar',
      currentPath: '/radar',
      steps,
    };
  }, [intelItems.length, walletConnected, walletReady]);
  const keysClassLabel = effectiveAccess && accessClass === 'operator' ? 'Operator' : 'Discovery';
  const keysEntitlementLabel = !walletConnected
    ? 'inativo'
    : entitlementsLoading
      ? 'resolvendo'
      : effectiveAccess
        ? 'ativo'
        : 'não concedido';
  const keysDelegateLabel = !walletConnected
    ? '--'
    : entitlement?.delegateWallet
      ? formatAddress(entitlement.delegateWallet)
      : effectiveAccess
        ? 'posse direta'
        : 'owner only';
  const keysFeeLabel = !walletConnected
    ? '--'
    : entitlement?.feePolicy?.label ?? formatKeysFeeTier(feeTier);
  const keysStateLabel = !walletConnected
    ? 'sem wallet vinculada'
    : entitlementsLoading
      ? 'resolvendo entitlement'
      : effectiveAccess
        ? 'operator ativo'
        : 'checkout disponível';
  const keysSynopsis = !walletConnected
    ? 'Discovery público ativo. Conecte uma wallet para resolver owner, delegate e fee tier.'
    : effectiveAccess
      ? entitlement?.delegateWallet
        ? `Delegate ativa em ${formatAddress(entitlement.delegateWallet)} com camada Operator visível.`
        : 'A wallet já opera em posse direta com entitlement soberano ativo.'
      : 'A wallet já pode abrir o rail de checkout e concluir a ativação Operator em Keys.';
  const keysActionLabel = !walletConnected ? 'Abrir Keys' : effectiveAccess ? 'Gerenciar Keys' : 'Ativar acesso';
  const openIntelItem = (url: string) => {
    const normalized = normalizeIntelRoute(url);
    if (normalized.startsWith('/intel/')) {
      navigate(normalized);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formattedTime = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(now),
    [now]
  );

  const intelTitle = (item: IntelItem) => item.title_pt || item.title || item.title_original || 'Leitura Intel';
  const intelSummary = (item: IntelItem) => item.summary_pt || item.summary || item.why_it_matters || item.agent_note;
  const intelMeta = (item: IntelItem) => item.chains?.[0] || item.topics?.[0] || item.assets?.[0] || item.module;
  const intelEntity = (item: IntelItem) =>
    item.primary_visual_entity?.iconSymbol ||
    item.primary_visual_entity?.icon_symbol ||
    item.assets?.[0] ||
    item.chains?.[0] ||
    extractIntelSymbols(item)[0] ||
    null;
  const intelSectionTheme: Record<
    HomeIntelSectionKey,
    {
      icon: typeof Activity;
      badge: 'active' | 'success' | 'warning' | 'pending';
      panelStyle: CSSProperties;
      toneStyle: CSSProperties;
      accentColor: string;
    }
  > = {
    market: {
      icon: Activity,
      badge: 'warning',
      panelStyle: {
        background: 'linear-gradient(135deg, rgba(255,140,66,0.14), rgba(255,255,255,0.02))',
        borderColor: 'rgba(255,140,66,0.24)',
      },
      toneStyle: {
        backgroundColor: 'rgba(255,140,66,0.12)',
        color: 'var(--accent-orange)',
      },
      accentColor: 'rgba(255,140,66,0.88)',
    },
    tech: {
      icon: Zap,
      badge: 'active',
      panelStyle: {
        background: 'linear-gradient(135deg, rgba(74,144,226,0.12), rgba(255,255,255,0.02))',
        borderColor: 'rgba(74,144,226,0.22)',
      },
      toneStyle: {
        backgroundColor: 'rgba(74,144,226,0.12)',
        color: '#7cb4ff',
      },
      accentColor: 'rgba(74,144,226,0.9)',
    },
    politica: {
      icon: Shield,
      badge: 'pending',
      panelStyle: {
        background: 'linear-gradient(135deg, rgba(201,173,93,0.12), rgba(255,255,255,0.02))',
        borderColor: 'rgba(201,173,93,0.22)',
      },
      toneStyle: {
        backgroundColor: 'rgba(201,173,93,0.12)',
        color: '#d9ba67',
      },
      accentColor: 'rgba(201,173,93,0.88)',
    },
    cripto: {
      icon: Waves,
      badge: 'success',
      panelStyle: {
        background: 'linear-gradient(135deg, rgba(77,201,144,0.12), rgba(255,255,255,0.02))',
        borderColor: 'rgba(77,201,144,0.22)',
      },
      toneStyle: {
        backgroundColor: 'rgba(77,201,144,0.12)',
        color: '#74dca8',
      },
      accentColor: 'rgba(77,201,144,0.9)',
    },
  };
  const marketLookup = useMemo(() => {
    const lookup = new Map<string, MarketMover>();

    [...liveMovers, ...topLosers, ...volumeLeaders].forEach((item) => {
      lookup.set(item.symbol.toUpperCase(), item);
    });

    return lookup;
  }, [liveMovers, topLosers, volumeLeaders]);
  const marketPulseRows = useMemo(() => {
    const overviewLookup = new Map<string, MarketMover>();

    [marketPulseOverview?.focus_asset, marketPulseOverview?.featured, ...(marketPulseOverview?.universe ?? [])].forEach((item) => {
      if (!item?.symbol) return;
      overviewLookup.set(item.symbol.toUpperCase(), {
        symbol: item.symbol.toUpperCase(),
        price: Number(item.price) || 0,
        change24h: Number(item.change24h) || 0,
        volume: item.volume ?? 0,
      });
    });

    return HOME_MARKET_PULSE_SYMBOLS.map<MarketPulseRow>((symbol) => {
      const preferred = overviewLookup.get(symbol) ?? marketLookup.get(symbol);

      if (!preferred) {
        return {
          symbol,
          price: null,
          change24h: null,
          volume: null,
          unavailable: true,
        };
      }

      return {
        symbol,
        price: Number(preferred.price) || 0,
        change24h: Number(preferred.change24h) || 0,
        volume: preferred.volume ?? 0,
      };
    });
  }, [marketLookup, marketPulseOverview]);
  const hasMarketPulseData = marketPulseRows.some((row) => !row.unavailable);
  const fallbackMarketChartSymbol = marketPulseRows.find((row) => !row.unavailable)?.symbol ?? 'BTCUSDT';
  useEffect(() => {
    const selectedRow = marketPulseRows.find((row) => row.symbol === marketChartSymbol);
    if (!selectedRow || selectedRow.unavailable) {
      setMarketChartSymbol(fallbackMarketChartSymbol);
    }
  }, [fallbackMarketChartSymbol, marketChartSymbol, marketPulseRows]);
  const marketChartQuery = useRadarCandlesPreview(marketChartSymbol, '1h', 36);
  const marketChartCandles = marketChartQuery.data?.candles ?? [];
  const marketChartRow = marketPulseRows.find((row) => row.symbol === marketChartSymbol) ?? null;

  const heroCandidates = useMemo(() => {
    const candidates: HeroCandidate[] = [];
    const maxDepth = Math.max(0, ...intelSections.map((section) => Math.min(section.items.length, 2)));
    const volumeLeaderSymbols = new Set(volumeLeaders.map((item) => item.symbol.toUpperCase()));
    const altPressure = topLosers.some((item) => item.change24h <= -0.04) ? 'pressão em alts' : 'rotação em observação';

    for (let depth = 0; depth < maxDepth; depth += 1) {
      intelSections.forEach((section) => {
        const item = section.items[depth];
        if (!item) return;

        const relatedSymbols = extractIntelSymbols(item);
        const relatedMover =
          relatedSymbols
            .map((symbol) => marketLookup.get(symbol))
            .find((mover): mover is MarketMover => Boolean(mover)) ?? null;
        const relatedSymbol = relatedMover?.symbol ?? relatedSymbols[0] ?? item.assets?.[0] ?? item.chains?.[0] ?? null;
        const assetConfidence: HeroCandidate['assetConfidence'] = relatedMover ? 'high' : relatedSymbol ? 'medium' : 'none';
        const implication = item.why_it_matters || section.description;

        const thesisTape = uniqueText([
          compactPhrase(section.kicker, 3),
          compactPhrase(implication, 5),
          item.impact?.label ? `impacto ${item.impact.label}` : null,
          ...(item.watch_items?.slice(0, 2).map((watchItem) => compactPhrase(watchItem, 4)) ?? []),
        ]).slice(0, 4);

        const marketTape = assetConfidence === 'high' && relatedMover
          ? uniqueText([
              `${relatedMover.symbol} US$ ${formatMarketPrice(relatedMover.price)}`,
              `${relatedMover.change24h >= 0 ? '+' : ''}${(relatedMover.change24h * 100).toFixed(1)}%`,
              describeLiquidity(relatedMover.symbol.toUpperCase(), volumeLeaderSymbols, relatedMover.volume),
              altPressure,
            ]).slice(0, 4)
          : [];

        const riskTape = uniqueText([
          relatedMover ? describeRisk(relatedMover.change24h) : compactPhrase(item.watch_items?.[0], 4) ?? 'vigilância imediata',
          compactPhrase(item.watch_items?.[0], 4) ?? 'monitorar adoção',
        ]).slice(0, 2);

        candidates.push({
          id: `${section.key}:${item.id}`,
          item,
          section,
          relatedMover,
          relatedSymbol,
          assetConfidence,
          implication,
          tapeItems: interleaveSignals(thesisTape, marketTape, riskTape),
          sparklinePoints: buildHeroSparkline(`${section.key}:${item.id}`, relatedMover?.change24h ?? marketRegime?.avg_change_24h ?? 0),
        });
      });
    }

    return candidates;
  }, [intelSections, marketEditorial, marketLookup, marketRegime?.avg_change_24h, marketRegime?.label, topLosers, volumeLeaders]);

  const activeHero = heroCandidates.length > 0 ? heroCandidates[heroCycle % heroCandidates.length] : null;
  const heroRadarSymbol = toRadarSymbol(activeHero?.relatedSymbol);
  const heroRadarOverviewQuery = useRadarOverview(heroRadarSymbol, '24H');
  const heroRadarOverview = heroRadarOverviewQuery.data;
  const heroRadarMover = useMemo(() => {
    if (!heroRadarOverview || !heroRadarSymbol) return null;

    return (
      heroRadarOverview.universe.find((item) => item.symbol.toUpperCase() === heroRadarSymbol) ??
      heroRadarOverview.featured ??
      null
    );
  }, [heroRadarOverview, heroRadarSymbol]);
  const activeHeroTheme = activeHero ? intelSectionTheme[activeHero.section.key] : null;
  const heroUpdatedAt = formatRelativeTimestamp(
    heroRadarOverview?.last_updated || activeHero?.item.created_at || homeData?.intel.last_updated || homeData?.last_updated,
    now
  );
  const heroVolumeLeaderSymbols = new Set(volumeLeaders.map((item) => item.symbol.toUpperCase()));
  const heroResolvedMover =
    activeHero?.relatedMover ??
    heroRadarMover ??
    (heroRadarSymbol ? marketLookup.get(heroRadarSymbol) ?? null : null) ??
    null;
  const isMarketBackedHero = Boolean(heroResolvedMover);
  const heroContextMover = isMarketBackedHero ? heroResolvedMover : null;
  const heroSupportMover = heroContextMover;
  const heroSupportAsset =
    activeHero?.relatedSymbol ??
    (activeHero ? intelMeta(activeHero.item) : null) ??
    'intel';
  const heroSupportDelta = heroContextMover
    ? `${heroContextMover.change24h >= 0 ? '+' : ''}${(heroContextMover.change24h * 100).toFixed(1)}%`
    : '--';
  const heroSupportPulse = isMarketBackedHero && heroContextMover
    ? `${describeLiquidity(heroContextMover.symbol.toUpperCase(), heroVolumeLeaderSymbols, heroContextMover.volume)} · ${describeRisk(heroContextMover.change24h)}`
    : stripHeadlinePrefix(activeHero?.item.watch_items?.[0]) ??
      stripHeadlinePrefix(activeHero?.item.assets?.[0]) ??
      stripHeadlinePrefix(activeHero?.item.chains?.[0]) ??
      stripHeadlinePrefix(activeHero?.item.topics?.[0]) ??
      'leitura ativa';
  const heroValidationMetrics = isMarketBackedHero && heroContextMover
    ? [
        { label: 'Ativo', value: heroSupportAsset, tone: 'default' as const },
        {
          label: 'Volume',
          value: `$${formatCompactNumber(toNumericVolume(heroContextMover.volume))}`,
          tone: 'default' as const,
        },
        {
          label: '24H',
          value: heroSupportDelta,
          tone: heroContextMover.change24h >= 0 ? 'positive' as const : 'negative' as const,
        },
        { label: 'Atualiz.', value: heroUpdatedAt, tone: 'default' as const },
      ]
    : [
        { label: 'Ativo', value: heroSupportAsset, tone: 'default' as const },
        {
          label: 'Preço',
          value: heroSupportMover ? `$${formatMarketPrice(heroSupportMover.price)}` : '--',
          tone: 'default' as const,
        },
        {
          label: 'Vol/24',
          value: heroSupportMover ? `$${formatCompactNumber(toNumericVolume(heroSupportMover.volume))}` : '--',
          tone: 'default' as const,
        },
        { label: 'Atualiz.', value: heroUpdatedAt, tone: 'default' as const },
      ];
  const renderIntelTitle = (item: IntelItem, className: string) => {
    if (!item.url) {
      return (
        <div className={className} style={{ color: 'var(--text-1)' }}>
          {intelTitle(item)}
        </div>
      );
    }

    const href = normalizeIntelRoute(item.url);
    const isInternal = href.startsWith('/intel/');

    return (
      <a
        href={href}
        onClick={(event) => {
          if (isInternal) {
            event.preventDefault();
            navigate(href);
            return;
          }
          event.preventDefault();
          openIntelItem(item.url);
        }}
        target={isInternal ? undefined : '_blank'}
        rel={isInternal ? undefined : 'noopener noreferrer'}
        className={`${className} inline-flex items-start gap-2 underline decoration-transparent transition-colors hover:decoration-current`}
        style={{ color: 'var(--text-1)' }}
      >
        <span>{intelTitle(item)}</span>
        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0" />
      </a>
    );
  };

  if (isLoading && !homeData) {
    return (
      <div className="flex flex-1">
        <div className="flex-1 px-8 py-6 overflow-y-auto">
          <div className="mx-auto max-w-[1480px] py-6">
            <ModuleStateCard
              tone="loading"
              title="Carregando base operacional"
              description="Buscando intel, mercado e contexto de sessão."
            />
          </div>
        </div>
      </div>
    );
  }

  if ((error || !data) && !homeData) {
    return (
      <div className="flex flex-1">
        <div className="flex-1 px-8 py-6 overflow-y-auto">
          <div className="mx-auto max-w-[1480px] py-6">
            <ModuleStateCard
              tone="error"
              title="Base operacional indisponível"
              description="Intel, mercado e contexto não carregaram agora."
              actionLabel="Tentar novamente"
              onAction={() => refetch()}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <div className="sne-mosaic-page sne-home-page flex-1 px-3 py-2 xl:px-4">
        <PageSignalFrame className="sne-mosaic-frame sne-home-frame sne-home-cockpit mx-auto max-w-[1480px]">
          {/* ── Intel Hero ─────────────────────────────────────────── */}
          <SignalPanel className="sne-home-hero-panel">
            <FieldSurface
              motif="intel-aperture"
              density="compact"
              surface="hero"
              className="sne-home-hero-surface relative overflow-hidden rounded-[28px] px-5 py-5 xl:px-7 xl:py-6"
              style={{
                ...RADAR_PANEL_SURFACE_STYLE,
                background: `
                  radial-gradient(circle at 18% 16%, ${withAlpha(activeHeroTheme?.accentColor ?? 'rgba(255,140,66,0.88)', 0.08)} 0%, transparent 22%),
                  radial-gradient(circle at 80% 24%, rgba(62,201,153,0.06), transparent 22%),
                  linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.008))
                `,
              }}
            >
            <div className="pointer-events-none absolute inset-0">
              <div
                className="absolute left-[-10%] top-[-14%] h-[38%] w-[34%] rounded-full blur-3xl"
                style={{ backgroundColor: withAlpha(activeHeroTheme?.accentColor ?? 'rgba(255,140,66,0.88)', 0.12) }}
              />
              <div
                className="absolute right-[-12%] top-[6%] h-[34%] w-[30%] rounded-full blur-3xl"
                style={{ backgroundColor: withAlpha(activeHeroTheme?.accentColor ?? 'rgba(255,140,66,0.88)', 0.1) }}
              />
              <div
                className="absolute bottom-[-18%] left-[18%] h-[30%] w-[32%] rounded-full blur-3xl"
                style={{ backgroundColor: withAlpha(activeHeroTheme?.accentColor ?? 'rgba(255,140,66,0.88)', 0.08) }}
              />
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                }}
              />
              <motion.div
                className="absolute right-[8%] bottom-[10%] h-[26%] w-[22%] rounded-full blur-3xl"
                style={{ backgroundColor: withAlpha(activeHeroTheme?.accentColor ?? 'rgba(255,140,66,0.82)', 0.07) }}
                animate={{ opacity: [0.08, 0.18, 0.08], scale: [0.97, 1.04, 0.97] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              />
              {activeHero
                ? renderIntelHeroAtmosphere(
                    activeHero.section.key,
                    activeHeroTheme?.accentColor ?? 'rgba(255,140,66,0.88)',
                    activeHero.sparklinePoints
                  )
                : null}
            </div>

            <div className="relative z-[1]">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>
                  Intel Brief
                </div>
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                  {formattedTime}
                </div>
              </div>

              {!activeHero || !activeHeroTheme ? (
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  Nenhum feed de inteligência disponível agora.
                </div>
              ) : (
                <>
                  <div className="sne-mosaic-hero-grid grid grid-cols-1 xl:grid-cols-[1.12fr_0.88fr] gap-4 xl:gap-4 min-h-[0]">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={`${activeHero.id}:copy`}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="sne-home-hero-copy min-w-0"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <IntelEntityIcon
                            symbol={activeHero.relatedSymbol ?? intelEntity(activeHero.item)}
                            sectionKey={activeHero.section.key}
                            className="flex h-9 w-9 items-center justify-center rounded-[16px]"
                            style={activeHeroTheme.toneStyle}
                            iconClassName="h-5 w-5"
                          />
                          <div>
                            <div className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                              {activeHero.section.kicker}
                            </div>
                            <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                              {activeHero.section.title}
                            </div>
                          </div>
                        </div>

                        {isMarketBackedHero && heroContextMover ? (
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <StatusBadge status="success">{heroContextMover.symbol}</StatusBadge>
                          </div>
                        ) : null}

                        {renderIntelTitle(
                          activeHero.item,
                          'text-xl xl:text-[1.65rem] font-semibold leading-[1.04] tracking-[-0.03em] text-balance mb-3 line-clamp-3'
                        )}

                        <div className="sne-home-hero-summary max-w-3xl text-sm xl:text-base mb-3 line-clamp-2" style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>
                          {intelSummary(activeHero.item)}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                          <span>{activeHero.item.points} pts</span>
                          <span>{activeHero.item.comments} comentários</span>
                          <span>{intelMeta(activeHero.item)}</span>
                          <span>{activeHero.item.author ? `@${activeHero.item.author}` : activeHero.section.shortTitle}</span>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={`${activeHero.id}:context`}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="sne-home-hero-context flex flex-col gap-3"
                      >
                        <div
                          className="sne-home-hero-validation-card rounded-[24px] px-5 py-4"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.1)' }}
                        >
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                              Validação agora
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            {heroValidationMetrics.map((metric) => (
                              <div key={metric.label} className="rounded-[18px] px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="text-[10px] uppercase mb-1 tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>
                                  {metric.label}
                                </div>
                                <div
                                  className="font-semibold text-sm leading-5"
                                  style={{
                                    color:
                                      metric.tone === 'positive'
                                        ? 'var(--ok-green)'
                                        : metric.tone === 'negative'
                                          ? 'var(--danger-red)'
                                          : 'var(--text-1)',
                                  }}
                                >
                                  {metric.value}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div
                            className="rounded-[18px] px-4 py-3 text-xs uppercase tracking-[0.14em]"
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-2)' }}
                          >
                            {heroSupportPulse}
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                </>
              )}
            </div>
            </FieldSurface>
          </SignalPanel>

          <SignalPanel className="sne-home-keys-panel">
            <FieldSurface
              motif="signal-stack"
              density="compact"
              surface="panel"
              className="rounded-[24px] px-4 py-[0.95rem]"
              style={RADAR_RAIL_SURFACE_STYLE}
            >
              <div className="sne-home-keys">
                <div className="sne-home-keys__header">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                      Keys
                    </div>
                    <div className="mt-0.5 text-[1.02rem] font-semibold leading-[1.08] text-balance" style={{ color: 'var(--text-1)' }}>
                      Postura de acesso
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/keys')}
                    className="sne-home-text-action self-start whitespace-nowrap text-[12px] font-medium"
                    style={{ color: 'var(--accent-orange)' }}
                  >
                    {keysActionLabel} ↗
                  </button>
                </div>

                <div className="sne-home-keys__grid">
                  <div className="sne-home-keys__metric">
                    <div className="sne-home-keys__metric-label">Classe</div>
                    <div className="sne-home-keys__metric-value">{keysClassLabel}</div>
                  </div>
                  <div className="sne-home-keys__metric">
                    <div className="sne-home-keys__metric-label">Entitlement</div>
                    <div className="sne-home-keys__metric-value">{keysEntitlementLabel}</div>
                  </div>
                  <div className="sne-home-keys__metric">
                    <div className="sne-home-keys__metric-label">Delegate</div>
                    <div className="sne-home-keys__metric-value">{keysDelegateLabel}</div>
                  </div>
                  <div className="sne-home-keys__metric">
                    <div className="sne-home-keys__metric-label">Fee tier</div>
                    <div className="sne-home-keys__metric-value">{keysFeeLabel}</div>
                  </div>
                </div>

                <div className="sne-home-keys__footer">
                  <div className="sne-home-keys__state">
                    <span className="sne-home-keys__state-dot" />
                    {keysStateLabel}
                  </div>
                  <div className="sne-home-keys__synopsis">
                    {keysSynopsis}
                  </div>
                </div>
              </div>
            </FieldSurface>
          </SignalPanel>

          {/* ── Brief — since last session ─────────────────────────── */}
          {brief && (
            <SignalPanel className="sne-home-brief-panel">
              <FieldSurface
                motif="session-ledger"
                density="compact"
                surface="strip"
                className="rounded-[24px] px-5 py-5"
                style={RADAR_RAIL_SURFACE_STYLE}
              >
              <div className="sne-home-command-deck">
                <div className="sne-home-command-intent min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                      {commandIntent.eyebrow}
                    </div>
                  </div>
                  <div className="mt-1 text-xl font-semibold text-balance" style={{ color: 'var(--text-1)' }}>
                    {commandIntent.title}
                  </div>
                  <p className="mt-1 text-sm line-clamp-1" style={{ color: 'var(--text-2)' }}>
                    {commandIntent.summary}
                  </p>
                </div>

                <div className="sne-home-command-actions">
                  {commandDeck.map((command) => {
                    const Icon = command.icon;

                    return (
                      <button
                        key={command.path}
                        type="button"
                        onClick={() => navigate(command.path)}
                        className="sne-home-command-action"
                        data-tone={command.tone}
                      >
                        <span className="sne-home-command-action__icon">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{command.label}</span>
                          <span className="block truncate text-[10px] uppercase tracking-[0.12em]">{command.state}</span>
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      </button>
                    );
                  })}
                </div>
              </div>
              </FieldSurface>
            </SignalPanel>
          )}

          {/* ── Guia de uso ───────────────────────────────────────── */}
          <SignalPanel className="sne-home-intel-panel sne-home-guide-panel">
            <FieldSurface
              motif="signal-stack"
              density="compact"
              surface="panel"
              className="rounded-[24px] p-5"
              style={RADAR_RAIL_SURFACE_STYLE}
            >
              <div className="sne-home-guide">
                <div className="sne-home-guide__header">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                      {homeGuide.eyebrow}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-balance" style={{ color: 'var(--text-1)' }}>
                      {homeGuide.title}
                    </div>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>
                      {homeGuide.summary}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(homeGuide.currentPath)}
                    className="sne-home-text-action text-sm font-medium"
                    style={{ color: 'var(--accent-orange)' }}
                  >
                    {homeGuide.currentLabel} ↗
                  </button>
                </div>

                <div className="sne-home-guide__steps">
                  {homeGuide.steps.map((step) => {
                    const Icon = step.icon;

                    return (
                      <button
                        key={step.key}
                        type="button"
                        onClick={() => navigate(step.path)}
                        className="sne-home-guide-step"
                      >
                        <span className="sne-home-guide-step__icon">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                            {step.label}
                          </span>
                          <span className="block text-[11px]" style={{ color: 'var(--text-2)' }}>
                            {step.description}
                          </span>
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </FieldSurface>
          </SignalPanel>

          {/* ── Mercado — contexto, não protagonista ─────────────── */}
          <SignalPanel className="sne-home-market-panel">
            <FieldSurface
                motif="liquidity-field"
                density="compact"
                surface="panel"
                className="rounded-[24px] p-5"
                style={RADAR_RAIL_SURFACE_STYLE}
            >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                  Pulso de mercado
                </div>
                <div className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>
                  Contexto para validar a leitura
                </div>
              </div>
              <button
                onClick={() => navigate('/radar')}
                className="sne-home-text-action text-sm font-medium"
                style={{ color: 'var(--accent-orange)' }}
              >
                Radar ↗
              </button>
            </div>

            <div className="sne-mosaic-market-grid grid grid-cols-1 gap-3">
              <div className="sne-home-market-table">
                {marketPulseRows.map((mover) => (
                  <button
                    key={mover.symbol}
                    type="button"
                    className="sne-home-market-token"
                    data-active={marketChartSymbol === mover.symbol ? 'true' : 'false'}
                    data-tone={mover.unavailable ? 'flat' : mover.change24h != null && mover.change24h >= 0 ? 'up' : 'down'}
                    onMouseEnter={() => setMarketChartSymbol(mover.symbol)}
                    onFocus={() => setMarketChartSymbol(mover.symbol)}
                    onClick={() => navigate(`/radar/${mover.symbol}`)}
                    aria-label={`Abrir Radar de ${mover.symbol}`}
                  >
                    <span className="sne-home-market-token__top">
                      <IntelEntityIcon
                        symbol={assetIconSymbol(mover.symbol)}
                        sectionKey="market"
                        className="sne-home-market-token__icon"
                        iconClassName="h-6 w-6"
                      />
                    </span>
                    <span className="sne-home-market-token__symbol">
                      {assetIconSymbol(mover.symbol).toUpperCase()}
                    </span>
                    <span className="sne-home-market-token__price">
                      {mover.price == null ? '--' : `$${formatMarketPrice(mover.price)}`}
                    </span>
                    <span className="sne-home-market-token__change">
                      {mover.change24h == null ? '--' : `${mover.change24h >= 0 ? '+' : ''}${(mover.change24h * 100).toFixed(1)}%`}
                    </span>
                  </button>
                ))}
              </div>

              {marketEditorial && (marketEditorial.headline || marketEditorial.summary_pt || marketEditorial.watch_items.length > 0) ? (
                <div
                  className="sne-home-market-editorial rounded-[12px] px-3 py-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <div className="text-[9px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                    Narrativa
                  </div>
                  {marketEditorial.headline && (
                    <div className="mt-1 line-clamp-2 font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                      {marketEditorial.headline}
                    </div>
                  )}
                </div>
              ) : !hasMarketPulseData ? (
                <div
                  className="sne-home-market-editorial rounded-[12px] px-3 py-2 text-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text-2)' }}
                >
                  Dados de mercado indisponíveis. Radar sincronizando.
                </div>
              ) : null}

              <MarketPulseCandlestick
                symbol={marketChartSymbol}
                change24h={marketChartRow?.change24h ?? null}
                candles={marketChartCandles}
                isLoading={marketChartQuery.isLoading || marketChartQuery.isFetching}
              />
            </div>
            </FieldSurface>
          </SignalPanel>
        </PageSignalFrame>
      </div>
    </div>
  );
}
