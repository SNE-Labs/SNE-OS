import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@/lib/auth/AuthProvider';
import { readPersistedSnapshot } from '@/lib/querySnapshot';
import { normalizeIntelRoute } from '@/services/intel-api';
import { formatAddress } from '@/utils/format';
import { resolveRouteMeta } from './navigation';

type ShellTone = 'accent' | 'success' | 'warning' | 'neutral';

export type ShellChip = {
  label: string;
  tone: ShellTone;
};

export type SidebarContext = {
  eyebrow: string;
  title: string;
  summary: string;
  items: string[];
  actionLabel: string;
  actionPath: string;
};

function trimCopy(value: string | undefined | null, max = 88) {
  const clean = (value || '').trim();
  if (!clean) return '';
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function routeRadarSymbol(pathname: string) {
  const match = pathname.match(/^\/radar\/([^/]+)/i);
  return match?.[1]?.replace('/', '').toUpperCase() ?? 'ETHUSDT';
}

function localizeTier(tier: 'free' | 'premium' | 'pro') {
  if (tier === 'pro') return 'PRO';
  if (tier === 'premium') return 'PREMIUM';
  return 'FREE';
}

function localizeIdentityStatus(value?: string | null) {
  const normalized = `${value || ''}`.trim().toLowerCase();
  if (!normalized) return 'Sem identidade resolvida';
  if (normalized === 'active') return 'Identidade ativa';
  if (normalized === 'wallets vinculadas') return 'Wallets vinculadas';
  if (normalized === 'sincronizando') return 'Identidade em sincronização';
  if (normalized === 'degraded') return 'Identidade degradada';
  return value || 'Estado de identidade indisponível';
}

function buildTapeItems(
  pathname: string,
  auth: { isAuthenticated: boolean; address?: string; tier: 'free' | 'premium' | 'pro' },
  snapshots: {
    home?: any;
    radar?: any;
    passport?: any;
    vault?: any;
  }
): ShellChip[] {
  const items: ShellChip[] = [];
  const pushUnique = (chip: ShellChip) => {
    if (!chip.label.trim()) return;
    if (items.some((item) => item.label === chip.label)) return;
    items.push(chip);
  };
  const home = snapshots.home;
  const radar = snapshots.radar;
  const passport = snapshots.passport;
  const vault = snapshots.vault;

  const regime = home?.market?.regime?.label || radar?.market_regime?.label;
  if (regime) {
    pushUnique({ label: `Regime ${regime.toUpperCase()}`, tone: 'accent' });
  }

  const featured = radar?.featured;
  if (featured?.symbol) {
    const change = Number(featured.change24h || 0) * 100;
    pushUnique({
      label: `${featured.symbol} ${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
      tone: change >= 0 ? 'success' : 'warning',
    });
  }

  const leadIntel = home?.intel?.items?.[0];
  if (leadIntel?.title_pt || leadIntel?.title) {
    pushUnique({
      label: `Intel Brief • ${trimCopy(leadIntel.title_pt || leadIntel.title, 40)}`,
      tone: 'neutral',
    });
  }

  if (auth.isAuthenticated && auth.address) {
    pushUnique({ label: `Persistência ativa • ${formatAddress(auth.address)}`, tone: 'success' });
  } else {
    pushUnique({ label: 'Conecte wallet para persistência', tone: 'warning' });
    const publicMarkets = home?.brief_signals?.find((signal: { label?: string }) => `${signal.label || ''}`.toLowerCase() === 'radar');
    if (publicMarkets?.value) {
      pushUnique({ label: `Radar público • ${publicMarkets.value}`, tone: 'neutral' });
    }
  }

  if (pathname.startsWith('/pass') && passport?.stats?.wallets_total) {
    pushUnique({ label: `${passport.stats.wallets_total} wallets vinculadas`, tone: 'neutral' });
  }

  if (pathname.startsWith('/vault') && vault?.aggregate?.total_value_display) {
    pushUnique({ label: `Capital visível ${vault.aggregate.total_value_display}`, tone: 'neutral' });
  }

  if (pathname.startsWith('/vault') && vault?.aggregate?.active_networks != null) {
    pushUnique({ label: `${vault.aggregate.active_networks} redes em leitura`, tone: 'neutral' });
  }

  if (pathname.startsWith('/pass') && !passport?.stats?.wallets_total) {
    pushUnique({ label: 'Lookup público pronto', tone: 'neutral' });
  }

  if ((pathname.startsWith('/intel') || pathname.startsWith('/blog')) && leadIntel?.editorial_kind) {
    pushUnique({
      label: leadIntel.editorial_kind === 'briefing' ? 'Leitura rápida ativa' : 'Dossiê em foco',
      tone: 'neutral',
    });
  }

  return items.slice(0, 6);
}

function buildSidebarContext(
  pathname: string,
  snapshots: {
    home?: any;
    radar?: any;
    passport?: any;
    vault?: any;
  }
): SidebarContext {
  const home = snapshots.home;
  const radar = snapshots.radar;
  const passport = snapshots.passport;
  const vault = snapshots.vault;

  if (pathname.startsWith('/radar')) {
    const featured = radar?.featured;
    const signal = radar?.signal;
    return {
      eyebrow: 'Foco atual',
      title: featured?.symbol || routeRadarSymbol(pathname),
      summary: trimCopy(
        signal?.symbol
          ? `${signal.signal || 'HOLD'} • ${signal.change || '--'} • ${signal.timeframe || '24H'}`
          : radar?.hero?.summary || 'Leitura tática do ativo em foco.',
        100
      ),
      items: [
        radar?.market_regime?.label ? `Regime ${radar.market_regime.label}` : '',
        featured?.price ? `Preço $${Number(featured.price).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '',
        featured?.volume ? `Vol ${Number(featured.volume).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}` : '',
      ].filter(Boolean),
      actionLabel: 'Abrir Passport',
      actionPath: '/pass',
    };
  }

  if (pathname.startsWith('/pass')) {
    return {
      eyebrow: 'Passport',
      title: passport?.primary_wallet?.address ? formatAddress(passport.primary_wallet.address) : 'Passport ativo',
      summary: trimCopy(localizeIdentityStatus(passport?.stats ? (passport.stats.wallets_total > 1 ? 'wallets vinculadas' : 'active') : undefined), 90),
      items: [
        passport?.stats?.wallets_total ? `${passport.stats.wallets_total} wallets` : '',
        passport?.events?.length ? `${passport.events.length} eventos` : '',
        passport?.identity?.id ? 'Âncora resolvida' : '',
      ].filter(Boolean),
      actionLabel: 'Abrir Vault',
      actionPath: '/vault',
    };
  }

  if (pathname.startsWith('/vault')) {
    return {
      eyebrow: 'Capital',
      title: vault?.aggregate?.total_value_display || 'Capital visível',
      summary: trimCopy(vault?.surface?.network ? `Rede principal ${vault.surface.network}` : 'Superfície de capital pronta para leitura contextual.', 92),
      items: [
        vault?.aggregate?.active_networks != null ? `${vault.aggregate.active_networks} redes ativas` : '',
        vault?.surface?.source ? `Fonte ${vault.surface.source}` : '',
        vault?.protection?.state ? trimCopy(vault.protection.state, 34) : '',
      ].filter(Boolean),
      actionLabel: 'Abrir Passport',
      actionPath: '/pass',
    };
  }

  if (pathname.startsWith('/intel') || pathname.startsWith('/blog')) {
    const leadIntel = home?.intel?.items?.[0];
    return {
      eyebrow: 'Leitura atual',
      title: trimCopy(leadIntel?.title_pt || leadIntel?.title || 'Intel Brief', 58),
      summary: trimCopy(leadIntel?.summary_pt || leadIntel?.summary || leadIntel?.why_it_matters || 'Fluxo editorial ativo para mercado e operação.', 100),
      items: [
        leadIntel?.editorial_kind === 'briefing' ? 'Briefing' : leadIntel ? 'Dossiê' : '',
        leadIntel?.assets?.[0] ? `Ativo ${leadIntel.assets[0]}` : '',
        leadIntel?.topics?.[0] ? `Tema ${leadIntel.topics[0]}` : '',
      ].filter(Boolean),
      actionLabel: 'Abrir Radar',
      actionPath: '/radar',
    };
  }

  const leadIntel = home?.intel?.items?.[0];
  return {
    eyebrow: 'Leitura prioritária',
    title: trimCopy(leadIntel?.title_pt || leadIntel?.title || home?.brief?.headline || 'Intel Brief', 56),
    summary: trimCopy(
      leadIntel?.why_it_matters || leadIntel?.summary_pt || leadIntel?.summary || home?.brief?.summary || 'Briefing principal da sessão e memória operacional do workspace.',
      100
    ),
    items: (home?.brief_signals ?? []).slice(0, 3).map((signal: { label: string; value: string }) => `${signal.label}: ${signal.value}`),
    actionLabel: 'Abrir Intel Brief',
    actionPath: normalizeIntelRoute(leadIntel?.url || '/intel'),
  };
}

export function useShellContextData() {
  const location = useLocation();
  const { address, isAuthenticated, tier } = useAuth();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => {
    void tick;
    const home = readPersistedSnapshot<any>('sne:query:home')?.data;
    const radarSymbol = routeRadarSymbol(location.pathname);
    const radar = readPersistedSnapshot<any>(`sne:query:radar:${radarSymbol}:24H`)?.data;
    const passport = readPersistedSnapshot<any>('sne:query:passport:identity')?.data;
    const vault = readPersistedSnapshot<any>(`sne:query:vault:${isAuthenticated && address ? address : 'anonymous'}`)?.data;
    const routeMeta = resolveRouteMeta(location.pathname);
    const topbarChips: ShellChip[] = [];

    if (home?.market?.regime?.label) {
      topbarChips.push({ label: `Regime ${home.market.regime.label.toUpperCase()}`, tone: 'accent' });
    }

    if (location.pathname.startsWith('/pass') && passport?.stats?.wallets_total) {
      topbarChips.push({ label: `${passport.stats.wallets_total} wallets`, tone: 'neutral' });
    }

    if (location.pathname.startsWith('/vault') && vault?.aggregate?.active_networks != null) {
      topbarChips.push({ label: `${vault.aggregate.active_networks} redes`, tone: 'neutral' });
    }

    if (isAuthenticated && address) {
      topbarChips.push({ label: `${localizeTier(tier)} • ${formatAddress(address)}`, tone: 'success' });
    } else {
      topbarChips.push({ label: 'Sessão anônima', tone: 'warning' });
    }

    return {
      routeMeta,
      pathname: location.pathname,
      topbarChips: topbarChips.slice(0, 3),
      tapeItems: buildTapeItems(location.pathname, { isAuthenticated, address, tier }, { home, radar, passport, vault }),
      sidebarContext: buildSidebarContext(location.pathname, { home, radar, passport, vault }),
      sessionStats: [
        { label: 'Plano', value: localizeTier(tier) },
        { label: 'Wallet', value: address ? formatAddress(address) : 'Sem wallet' },
        { label: 'Sessão', value: isAuthenticated ? 'Autenticada' : 'Anônima' },
        { label: 'Foco', value: routeMeta.context },
      ],
    };
  }, [address, isAuthenticated, location.pathname, tier, tick]);
}
