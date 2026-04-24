import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  Shield,
  Waves,
  Zap,
} from 'lucide-react';
import { IntelEntityIcon } from '../components/IntelEntityIcon';
import { FieldSurface } from '../components/field/FieldSurface';
import { PageSignalFrame, SignalPanel } from '../components/motion/PageMotion';
import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { useRadarOverview } from '../../hooks/useRadarData';
import { apiGet } from '@/lib/api/http';
import { readPersistedSnapshot, writePersistedSnapshot } from '@/lib/querySnapshot';
import { normalizeIntelRoute } from '@/services/intel-api';
import { buildHomeIntelSections, type HomeIntelSectionKey } from '@/services/home-intel';

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

export function Home() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [heroCycle, setHeroCycle] = useState(0);
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
  const featuredMover = liveMovers[0] ?? null;
  const secondaryMovers = liveMovers.slice(1, 4);
  const brief = homeData?.brief;
  const briefSignals = homeData?.brief_signals ?? [];
  const data = homeData?.dashboard;

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
  const intelStreamSections = intelSections;
  const marketLookup = useMemo(() => {
    const lookup = new Map<string, MarketMover>();

    [...liveMovers, ...topLosers, ...volumeLeaders].forEach((item) => {
      lookup.set(item.symbol.toUpperCase(), item);
    });

    return lookup;
  }, [liveMovers, topLosers, volumeLeaders]);

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
  const heroTape = activeHero?.tapeItems ?? [];
  const heroTapeLoop = [...heroTape, ...heroTape];
  const heroVolumeLeaderSymbols = new Set(volumeLeaders.map((item) => item.symbol.toUpperCase()));
  const heroResolvedMover =
    activeHero?.relatedMover ??
    heroRadarMover ??
    (heroRadarSymbol ? marketLookup.get(heroRadarSymbol) ?? null : null) ??
    null;
  const isMarketBackedHero = Boolean(heroResolvedMover);
  const heroContextMover = isMarketBackedHero ? heroResolvedMover : null;
  const heroSupportMover = heroContextMover;
  const heroThemeLabel = activeHero?.section.kicker ?? 'Intel';
  const heroTopMetricLabel = isMarketBackedHero ? 'Preço' : 'Sinal';
  const heroTopMetricValue = isMarketBackedHero && heroContextMover
    ? `$${formatMarketPrice(heroContextMover.price)}`
    : activeHero?.item.watch_items?.[0] ??
      activeHero?.item.assets?.[0] ??
      activeHero?.item.chains?.[0] ??
      activeHero?.item.topics?.[0] ??
      '--';
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
  const heroSupportChips = uniqueText([
    stripHeadlinePrefix(activeHero?.item.watch_items?.[0]),
    stripHeadlinePrefix(activeHero?.item.watch_items?.[1]),
    isMarketBackedHero && heroContextMover ? describeRisk(heroContextMover.change24h) : null,
  ]).slice(0, 4);
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
      <div className="sne-mosaic-page sne-home-page flex-1 px-6 py-4 overflow-y-auto xl:px-8">
        <PageSignalFrame className="sne-mosaic-frame sne-home-frame sne-home-cockpit mx-auto max-w-[1480px]">
          {/* ── Intel Hero ─────────────────────────────────────────── */}
          <SignalPanel className="sne-home-hero-panel">
            <FieldSurface
              motif="intel-aperture"
              density="compact"
              surface="hero"
              className="sne-home-hero-surface relative overflow-hidden rounded-[28px] px-5 py-5 xl:px-7 xl:py-6"
              style={{
                background: `
                  radial-gradient(circle at 0% 8%, ${withAlpha(activeHeroTheme?.accentColor ?? 'rgba(255,140,66,0.88)', 0.22)} 0%, transparent 28%),
                  radial-gradient(circle at 100% 18%, ${withAlpha(activeHeroTheme?.accentColor ?? 'rgba(255,140,66,0.88)', 0.18)} 0%, transparent 24%),
                  radial-gradient(circle at 84% 100%, ${withAlpha(activeHeroTheme?.accentColor ?? 'rgba(255,140,66,0.88)', 0.14)} 0%, transparent 26%),
                  radial-gradient(circle at 14% 100%, rgba(255,255,255,0.05) 0%, transparent 22%),
                  linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.04))
                `,
                backgroundColor: 'var(--bg-2)',
                borderWidth: '1px',
                borderColor: 'rgba(255,255,255,0.06)',
                boxShadow: 'var(--shadow-2)',
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
                className="absolute bottom-[-16%] right-[10%] h-[26%] w-[28%] rounded-full blur-3xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              />
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                  backgroundSize: '22px 22px',
                }}
              />
              <div
                className="absolute inset-x-0 top-[18%] h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${activeHeroTheme?.accentColor ?? 'rgba(255,140,66,0.66)'}, transparent)`,
                }}
              />
              <motion.div
                className="absolute inset-x-[-30%] top-[16%] h-[2px]"
                style={{
                  background: `linear-gradient(90deg, transparent, ${activeHeroTheme?.accentColor ?? 'rgba(255,140,66,0.86)'}, transparent)`,
                  filter: 'blur(1px)',
                }}
                animate={{ x: ['-18%', '18%'], opacity: [0.2, 0.75, 0.2] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              />
              {activeHero ? (
                <svg
                  viewBox="0 0 100 120"
                  preserveAspectRatio="none"
                  className="absolute inset-x-[34%] bottom-[-10%] h-[68%] w-[76%] opacity-50"
                >
                  <defs>
                    <linearGradient id="hero-sparkline-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="transparent" />
                      <stop offset="38%" stopColor={activeHeroTheme?.accentColor ?? 'rgba(255,140,66,0.9)'} />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
                    </linearGradient>
                  </defs>
                  <polyline
                    fill="none"
                    stroke="url(#hero-sparkline-gradient)"
                    strokeWidth="2.1"
                    points={activeHero.sparklinePoints}
                  />
                </svg>
              ) : null}
            </div>

            <div className="relative z-[1]">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>
                  Intel Brief
                </div>
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                  {formattedTime}
                </div>
                <StatusBadge status={homeData?.intel.last_updated ? 'active' : 'pending'}>ao vivo</StatusBadge>
                {activeHero ? <StatusBadge status={activeHeroTheme?.badge ?? 'pending'}>{activeHero.section.shortTitle}</StatusBadge> : null}
                {isFetching ? <StatusBadge status="pending">sincronizando</StatusBadge> : null}
                <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                  atualizado {heroUpdatedAt}
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
                        className="min-w-0"
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

                        <div className="max-w-3xl text-sm xl:text-base mb-3 line-clamp-2" style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>
                          {intelSummary(activeHero.item)}
                        </div>

                        <div
                          className="sne-home-hero-implication inline-flex max-w-2xl items-center gap-2 rounded-full px-3 py-1.5 mb-3 text-xs"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-2)' }}
                        >
                          <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
                            O que isso entrega
                          </span>
                          <span>{activeHero.implication}</span>
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
                        className="flex flex-col gap-3"
                      >
                        <div
                          className="rounded-[24px] p-5"
                          style={{
                            background: 'linear-gradient(180deg, rgba(10,14,23,0.44), rgba(10,14,23,0.22))',
                            borderWidth: '1px',
                            borderColor: 'rgba(255,255,255,0.06)',
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                              Leitura em dados
                            </div>
                            <button
                              onClick={() => openIntelItem(activeHero.item.url)}
                              className="text-sm font-medium"
                              style={{ color: 'var(--accent-orange)' }}
                            >
                              Abrir Intel Brief ↗
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div
                              className={isMarketBackedHero ? 'rounded-[18px] px-4 py-3' : 'rounded-[18px] px-4 py-3 col-span-2'}
                              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                            >
                              <div className="text-[10px] uppercase mb-1 tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>Tema</div>
                              <div className="font-semibold text-base" style={{ color: 'var(--text-1)' }}>
                                {heroThemeLabel}
                              </div>
                            </div>
                            {isMarketBackedHero ? (
                              <div className="rounded-[18px] px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                <div className="text-[10px] uppercase mb-1 tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>
                                  {heroTopMetricLabel}
                                </div>
                                <div className="font-semibold text-base" style={{ color: 'var(--text-1)' }}>
                                  {heroTopMetricValue}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {heroSupportChips.map((chip) => (
                              <div
                                key={chip}
                                className="rounded-full px-3 py-2 text-xs uppercase tracking-[0.14em]"
                                style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-2)' }}
                              >
                                {chip}
                              </div>
                            ))}
                            {heroSupportChips.length === 0 ? (
                              <div
                                className="rounded-full px-3 py-2 text-xs uppercase tracking-[0.14em]"
                                style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-2)' }}
                              >
                                leitura ativa
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div
                          className="rounded-[24px] px-5 py-4"
                          style={{ backgroundColor: 'rgba(10,14,23,0.22)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' }}
                        >
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                              Validação agora
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            {heroValidationMetrics.map((metric) => (
                              <div key={metric.label} className="rounded-[18px] px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
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
                            style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-2)' }}
                          >
                            {heroSupportPulse}
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {heroTape.length > 0 ? (
                    <div
                      className="sne-home-tape mt-3 overflow-hidden rounded-[18px] border"
                      style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(6,10,16,0.55)' }}
                    >
                      <div className="flex items-center gap-3 px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
                          Tape operacional
                        </div>
                        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: activeHeroTheme.accentColor }} />
                        <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                          Intel conduz, mercado valida
                        </div>
                      </div>

                      <div className="relative overflow-hidden py-2">
                        <motion.div
                          className="flex min-w-max items-center gap-2 px-3"
                          animate={{ x: ['0%', '-50%'] }}
                          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
                        >
                          {heroTapeLoop.map((item, index) => (
                            <div
                              key={`${item}-${index}`}
                              className="flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs"
                              style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-2)' }}
                            >
                              <span style={{ color: 'var(--text-1)' }}>{item}</span>
                              <span style={{ color: 'var(--text-3)' }}>•</span>
                            </div>
                          ))}
                        </motion.div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
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
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.015), rgba(0,0,0,0.02))',
                  backgroundColor: 'var(--bg-2)',
                  borderWidth: '1px',
                  borderColor: 'var(--stroke-1)',
                }}
              >
              <div className="sne-mosaic-balanced-grid grid grid-cols-1 xl:grid-cols-[1.04fr_0.96fr] gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                      Desde a última sessão
                    </div>
                    <StatusBadge status={brief.badge_status}>{brief.badge}</StatusBadge>
                    <StatusBadge status="active">USDT-first</StatusBadge>
                  </div>
                  <div className="text-2xl font-semibold mb-2 text-balance" style={{ color: 'var(--text-1)' }}>
                    {brief.headline}
                  </div>
                  <p className="sne-home-brief-summary text-sm xl:text-base" style={{ color: 'var(--text-2)' }}>{brief.summary}</p>

                  <div
                    className="sne-home-brief-account mt-4 rounded-[20px] border p-4"
                    style={{
                      background:
                        'radial-gradient(circle at 0% 0%, rgba(255,140,66,0.10), transparent 28%), rgba(255,255,255,0.025)',
                      borderColor: 'rgba(255,255,255,0.075)',
                    }}
                  >
                    <div className="mb-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
                      Conta operacional
                    </div>
                    <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      USDT é o saldo-base. Pass mantém a identidade, Vault lê a conta, Radar qualifica o momento e o rail de execução move o saldo.
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => navigate('/vault')}
                        className="text-sm font-medium"
                        style={{ color: 'var(--accent-orange)' }}
                      >
                        Ver saldo-base ↗
                      </button>
                      <button
                        onClick={() => navigate('/swaps')}
                        className="text-sm font-medium"
                        style={{ color: 'var(--text-2)' }}
                      >
                        Mover USDT ↗
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {briefSignals.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-[18px] px-4 py-4"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <div className="text-[10px] uppercase mb-1 tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>{s.label}</div>
                      <div className="font-semibold text-base" style={{ color: 'var(--text-1)' }}>{s.value}</div>
                    </div>
                  ))}
                  {briefSignals.length === 0 && (
                    <div className="col-span-2 text-sm" style={{ color: 'var(--text-2)' }}>
                      Sem sinais resumidos para esta sessão.
                    </div>
                  )}
                </div>
              </div>
              </FieldSurface>
            </SignalPanel>
          )}

          {/* ── Intel Stream ──────────────────────────────────────── */}
          {intelStreamSections.length > 0 && (
            <SignalPanel className="sne-home-intel-panel">
              <FieldSurface
                motif="signal-stack"
                density="compact"
                surface="panel"
                className="rounded-[24px] p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                    Fluxo Intel
                  </div>
                  <div className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>
                    Inteligência em monitoramento contínuo
                  </div>
                </div>
                <button
                  onClick={() => navigate('/intel')}
                  className="text-sm font-medium"
                  style={{ color: 'var(--accent-orange)' }}
                >
                  Abrir Intel Brief ↗
                </button>
              </div>

              <div className="sne-home-intel-stream space-y-3">
                {intelStreamSections.map((section) => {
                  const lead = section.items[0];
                  const rest = section.items.slice(1, 3);

                  return (
                    <div
                      key={section.key}
                      className="rounded-[22px] p-4"
                      style={{
                        backgroundColor: 'var(--bg-3)',
                        borderWidth: '1px',
                        ...intelSectionTheme[section.key].panelStyle,
                      }}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-[0.32fr_0.68fr] gap-4 lg:gap-6">
                        <div className="lg:pr-2">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                              <IntelEntityIcon
                                symbol={lead ? intelEntity(lead) : null}
                                sectionKey={section.key}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                                style={intelSectionTheme[section.key].toneStyle}
                                iconClassName="h-4 w-4"
                              />
                              <div>
                                <div className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                                  {section.kicker}
                                </div>
                                <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                                  {section.title}
                                </div>
                              </div>
                            </div>
                            <StatusBadge status={intelSectionTheme[section.key].badge}>{section.items.length}</StatusBadge>
                          </div>

                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            {section.description}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-3">
                          {lead && (
                            <div
                              className="sne-home-intel-lead rounded-[20px] p-4"
                              style={{ backgroundColor: 'rgba(10,14,23,0.34)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <IntelEntityIcon
                                  symbol={intelEntity(lead)}
                                  sectionKey={section.key}
                                  className="flex h-7 w-7 items-center justify-center rounded-xl"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                  iconClassName="h-4 w-4"
                                />
                                <div className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>
                                  {intelMeta(lead)}
                                </div>
                              </div>
                              {renderIntelTitle(lead, 'font-semibold mb-1.5 line-clamp-2')}
                              <div className="text-sm line-clamp-3" style={{ color: 'var(--text-2)' }}>
                                {intelSummary(lead)}
                              </div>
                            </div>
                          )}

                          {rest.length > 0 && (
                            <div className="sne-home-intel-rest space-y-2">
                              {rest.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-[18px] p-4"
                                  style={{ backgroundColor: 'rgba(10,14,23,0.26)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' }}
                                >
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <IntelEntityIcon
                                      symbol={intelEntity(item)}
                                      sectionKey={section.key}
                                      className="flex h-6 w-6 items-center justify-center rounded-lg"
                                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                      iconClassName="h-3.5 w-3.5"
                                    />
                                    <div className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>
                                      {intelMeta(item)}
                                    </div>
                                  </div>
                                  {renderIntelTitle(item, 'text-sm font-medium mb-1 line-clamp-2')}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </FieldSurface>
            </SignalPanel>
          )}

          {/* ── Mercado — contexto, não protagonista ─────────────── */}
          <SignalPanel className="sne-home-market-panel">
            <FieldSurface
              motif="liquidity-field"
              density="compact"
              surface="panel"
              className="rounded-[24px] p-5"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
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
                className="text-sm font-medium"
                style={{ color: 'var(--accent-orange)' }}
              >
                Abrir Radar ↗
              </button>
            </div>

            {!featuredMover ? (
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                Dados de mercado indisponíveis. Radar sincronizando.
              </div>
            ) : (
              <div className="sne-mosaic-market-grid grid grid-cols-1 xl:grid-cols-[0.78fr_1.22fr] gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={marketRegime?.tone ?? 'pending'}>
                      {marketRegime?.label ?? 'sem dados'}
                    </StatusBadge>
                    {marketEditorial?.status === 'ready' && (
                      <StatusBadge status="active">editorial IA</StatusBadge>
                    )}
                  </div>

                  <div
                    className="rounded-[22px] p-5"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,140,66,0.08), transparent)',
                      backgroundColor: 'var(--bg-3)',
                      borderWidth: '1px',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-3)' }}>
                          Destaque
                        </div>
                        <div className="text-3xl font-semibold" style={{ color: 'var(--text-1)' }}>
                          {featuredMover.symbol}
                        </div>
                      </div>
                      <div
                        className="rounded-full px-3 py-1 text-sm font-semibold"
                        style={{
                          color: featuredMover.change24h >= 0 ? 'var(--ok-green)' : 'var(--danger-red)',
                          backgroundColor: featuredMover.change24h >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                        }}
                      >
                        {featuredMover.change24h >= 0 ? '+' : ''}{(featuredMover.change24h * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[18px] px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <div className="text-[10px] uppercase mb-1 tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>Preço</div>
                        <div className="font-semibold text-lg" style={{ color: 'var(--text-1)' }}>
                          ${formatMarketPrice(featuredMover.price)}
                        </div>
                      </div>
                      <div className="rounded-[18px] px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <div className="text-[10px] uppercase mb-1 tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>Volume</div>
                        <div className="font-semibold text-lg" style={{ color: 'var(--text-1)' }}>
                          ${formatCompactNumber(Number(featuredMover.volume))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {marketEditorial && (marketEditorial.headline || marketEditorial.summary_pt || marketEditorial.watch_items.length > 0) && (
                    <div
                      className="sne-home-market-editorial rounded-[22px] p-4 space-y-3"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                        Narrativa do Mercado
                      </div>
                      {marketEditorial.headline && (
                        <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                          {marketEditorial.headline}
                        </div>
                      )}
                      {marketEditorial.summary_pt && (
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          {marketEditorial.summary_pt}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-[22px] p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
                        Momentum
                      </div>
                      <div className="space-y-1">
                        {secondaryMovers.map((mover) => (
                          <div key={mover.symbol} className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{mover.symbol}</div>
                              <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                                ${formatMarketPrice(mover.price)}
                              </div>
                            </div>
                            <div className="text-sm font-semibold" style={{ color: mover.change24h >= 0 ? 'var(--ok-green)' : 'var(--danger-red)' }}>
                              {mover.change24h >= 0 ? '+' : ''}{(mover.change24h * 100).toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
                        Maiores quedas
                      </div>
                      <div className="space-y-1">
                        {topLosers.slice(0, 3).map((mover) => (
                          <div key={mover.symbol} className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{mover.symbol}</div>
                              <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                                ${formatMarketPrice(mover.price)}
                              </div>
                            </div>
                            <div className="text-sm font-semibold" style={{ color: 'var(--danger-red)' }}>
                              {(mover.change24h * 100).toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
                        Volume dominante
                      </div>
                      <div className="space-y-1">
                        {volumeLeaders.slice(0, 3).map((item) => (
                          <div key={item.symbol} className="py-3 border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-1)' }}>{item.symbol}</div>
                            <div className="text-xs" style={{ color: 'var(--text-2)' }}>
                              Vol. ${formatCompactNumber(Number(item.volume))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </FieldSurface>
          </SignalPanel>
        </PageSignalFrame>
      </div>
    </div>
  );
}
