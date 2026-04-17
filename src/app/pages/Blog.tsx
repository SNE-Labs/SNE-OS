import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { IntelEntityIcon } from '../components/IntelEntityIcon';
import { IntelVisualChip } from '../components/IntelVisualChip';
import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { ChainBadge } from '../components/ChainBadge';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
import { intelApi } from '@/services/intel-api';

function formatRelativeTimestamp(value?: string | null): string {
  if (!value) return 'agora';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min atrás`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d atrás`;
}

function intelEntity(post: { primary_visual_entity?: { iconSymbol?: string | null } | null; assets?: string[]; chains?: string[] }) {
  return post.primary_visual_entity?.iconSymbol || post.assets?.[0] || post.chains?.[0] || null;
}

function textTags(post: { topics?: string[]; assets?: string[]; chains?: string[]; visual_entities?: Array<{ id: string; label: string }> }, limit: number) {
  const linked = new Set(
    [
      ...(post.assets ?? []),
      ...(post.chains ?? []),
      ...((post.visual_entities ?? []).flatMap((entity) => [entity.id, entity.label])),
    ].map((value) => value.toLocaleLowerCase('pt-BR'))
  );

  return (post.topics ?? [])
    .filter((topic) => !linked.has(topic.toLocaleLowerCase('pt-BR')))
    .slice(0, limit);
}

export function Blog() {
  const navigate = useNavigate();
  const { topic, chain, asset } = useParams();
  const [activeKind, setActiveKind] = useState<'all' | 'dossier' | 'briefing'>('all');
  const [topicFilter, setTopicFilter] = useState(topic ?? 'all');
  const [chainFilter, setChainFilter] = useState(chain ?? 'all');
  const [assetFilter, setAssetFilter] = useState(asset ?? 'all');
  const [visibleCount, setVisibleCount] = useState(24);
  const postsQuery = useQuery({
    queryKey: ['intel-posts'],
    queryFn: intelApi.getPosts,
    refetchInterval: 60000,
  });

  const posts = postsQuery.data?.items ?? [];

  const topicOptions = useMemo(
    () => ['all', ...Array.from(new Set(posts.flatMap((post) => post.topics ?? []))).sort()],
    [posts]
  );
  const chainOptions = useMemo(
    () => ['all', ...Array.from(new Set(posts.flatMap((post) => post.chains ?? []))).sort()],
    [posts]
  );
  const assetOptions = useMemo(
    () => ['all', ...Array.from(new Set(posts.flatMap((post) => post.assets ?? []))).sort()],
    [posts]
  );

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        if (activeKind !== 'all' && post.editorial_kind !== activeKind) return false;
        if (topicFilter !== 'all' && !(post.topics ?? []).includes(topicFilter)) return false;
        if (chainFilter !== 'all' && !(post.chains ?? []).includes(chainFilter)) return false;
        if (assetFilter !== 'all' && !(post.assets ?? []).includes(assetFilter)) return false;
        return true;
      }),
    [activeKind, assetFilter, chainFilter, posts, topicFilter]
  );
  const hubTopicLinks = topicOptions.filter((value) => value !== 'all').slice(0, 8);
  const hubChainLinks = chainOptions.filter((value) => value !== 'all').slice(0, 8);
  const hubAssetLinks = assetOptions.filter((value) => value !== 'all').slice(0, 8);

  const featured = filteredPosts[0];
  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const secondary = visiblePosts.slice(1);
  const hasMorePosts = filteredPosts.length > visiblePosts.length;
  const taxonomyLabel = topic ?? chain ?? asset ?? null;
  const taxonomyKind = topic ? 'tema' : chain ? 'chain' : asset ? 'asset' : null;
  const canonicalPath = topic
    ? `/intel/topic/${topic}`
    : chain
      ? `/intel/chain/${chain}`
      : asset
        ? `/intel/asset/${asset}`
        : '/intel';

  useEffect(() => {
    setTopicFilter(topic ?? 'all');
  }, [topic]);
  useEffect(() => {
    setChainFilter(chain ?? 'all');
  }, [chain]);
  useEffect(() => {
    setAssetFilter(asset ?? 'all');
  }, [asset]);
  useEffect(() => {
    setVisibleCount(24);
  }, [activeKind, assetFilter, chainFilter, topicFilter]);

  useSeoMeta({
    title: taxonomyLabel
      ? `Intel Brief: ${taxonomyLabel} | SNE OS`
      : 'Intel Brief | SNE OS',
    description: taxonomyLabel
      ? `Leituras editoriais do SNE OS para ${taxonomyKind} ${taxonomyLabel}: dossiês, briefings e contexto operacional multichain.`
      : 'Intel Brief do SNE OS com dossiês, briefings e contexto operacional sobre mercado, tech, economia, geopolítica e cripto.',
    canonicalPath,
    type: 'website',
    keywords: ['crypto intelligence', 'web3 intelligence', 'defi', 'tech', 'economia', 'geopolitica', topicLabelSafe(topic), topicLabelSafe(chain), topicLabelSafe(asset)].filter(Boolean) as string[],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: taxonomyLabel ? `Intel Brief: ${taxonomyLabel}` : 'Intel Brief',
      description: taxonomyLabel
        ? `Página índice do Intel Brief para ${taxonomyKind} ${taxonomyLabel}.`
        : 'Página índice do Intel Brief do SNE OS.',
      url: `https://snelabs.space${canonicalPath}`,
    },
  });

  if (postsQuery.isLoading) {
    return (
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="mx-auto max-w-6xl py-6">
          <ModuleStateCard tone="loading" title="Carregando Intel Brief" description="Buscando dossiês e briefings gerados pelo Intel Brief." />
        </div>
      </div>
    );
  }

  if (postsQuery.isError) {
    return (
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="mx-auto max-w-6xl py-6">
          <ModuleStateCard tone="error" title="Intel Brief indisponível" description="Os dossiês do Intel Brief não carregaram agora." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-8 py-6 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6">
        <section
          className="rounded-[28px] p-5 space-y-4"
          style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>Segmentação</div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Fluxo editorial</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Tudo' },
                { id: 'dossier', label: 'Dossiês' },
                { id: 'briefing', label: 'Briefings' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setActiveKind(option.id as 'all' | 'dossier' | 'briefing')}
                  className="px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: activeKind === option.id ? 'rgba(255,140,66,0.12)' : 'var(--bg-3)',
                    color: activeKind === option.id ? 'var(--accent-orange)' : 'var(--text-2)',
                    borderWidth: '1px',
                    borderColor: activeKind === option.id ? 'rgba(255,140,66,0.24)' : 'var(--stroke-1)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)} className="rounded-xl px-3 py-3 text-sm" style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <option value="all">Tema: todos</option>
              {topicOptions.filter((value) => value !== 'all').map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select value={chainFilter} onChange={(event) => setChainFilter(event.target.value)} className="rounded-xl px-3 py-3 text-sm" style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <option value="all">Chain: todas</option>
              {chainOptions.filter((value) => value !== 'all').map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select value={assetFilter} onChange={(event) => setAssetFilter(event.target.value)} className="rounded-xl px-3 py-3 text-sm" style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <option value="all">Asset: todos</option>
              {assetOptions.filter((value) => value !== 'all').map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
          {taxonomyLabel && (
            <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              Índice público ativo para {taxonomyKind} <strong style={{ color: 'var(--text-1)' }}>{taxonomyLabel}</strong>. Esta página pode servir como entrada indexável do Intel Brief.
            </div>
          )}
          {!taxonomyLabel && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <HubLinkGroup title="Temas" basePath="/intel/topic" items={hubTopicLinks} />
              <HubLinkGroup title="Chains" basePath="/intel/chain" items={hubChainLinks} />
              <HubLinkGroup title="Assets" basePath="/intel/asset" items={hubAssetLinks} />
            </div>
          )}
        </section>

        {!featured ? (
          <ModuleStateCard tone="loading" title="Nenhuma peça encontrada" description="Ajuste os filtros ou aguarde a próxima rodada editorial do Intel Brief." />
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-4">
              <button
                type="button"
                onClick={() => navigate(`/intel/${featured.slug}`)}
                className="w-full rounded-[28px] p-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,140,66,0.1), rgba(255,255,255,0.02))',
                  backgroundColor: 'var(--bg-2)',
                  borderWidth: '1px',
                  borderColor: 'var(--stroke-1)',
                }}
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <IntelEntityIcon
                      symbol={intelEntity(featured)}
                      sectionKey="market"
                      className="flex h-10 w-10 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      iconClassName="h-4 w-4"
                    />
                    <div className="flex items-center gap-2">
                    <StatusBadge status="active">{featured.editorial_kind === 'briefing' ? 'Briefing principal' : 'Dossiê principal'}</StatusBadge>
                    <StatusBadge status="pending">{featured.reading_time_minutes} min</StatusBadge>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                </div>
                <div className="text-3xl font-semibold mb-3" style={{ color: 'var(--text-1)' }}>{featured.title}</div>
                <div className="text-base mb-4 max-w-3xl" style={{ color: 'var(--text-2)' }}>{featured.subtitle}</div>
                <div className="text-sm mb-5 max-w-3xl" style={{ color: 'var(--text-3)' }}>
                  {featured.excerpt || 'Leitura editorial completa disponível nesta peça.'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(featured.visual_entities ?? []).slice(0, 3).map((entity) => (
                    <span key={`${featured.id}-${entity.id}`} onClick={(event) => event.stopPropagation()}>
                      <IntelVisualChip entity={entity} size="md" />
                    </span>
                  ))}
                  {textTags(featured, 2).map((topicTag) => (
                    <Link key={topicTag} to={`/intel/topic/${topicTag}`} onClick={(event) => event.stopPropagation()}>
                      <StatusBadge status="success">{topicTag}</StatusBadge>
                    </Link>
                  ))}
                </div>
              </button>

              <section
                className="rounded-[28px] p-5 space-y-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Resumo</div>
                  <div className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Leitura imediata</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>Fonte</div>
                    <div className="font-semibold mt-1" style={{ color: 'var(--text-1)' }}>{featured.sources[0]?.name ?? 'Intel'}</div>
                  </div>
                  <div className="rounded-2xl px-3 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>Formato</div>
                    <div className="font-semibold mt-1" style={{ color: 'var(--text-1)' }}>{featured.editorial_kind === 'briefing' ? 'Briefing' : 'Dossiê'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase mb-2" style={{ color: 'var(--text-3)' }}>Sinais-chave</div>
                  <div className="space-y-2">
                    {(featured.tldr.length > 0 ? featured.tldr : [featured.excerpt || featured.subtitle]).slice(0, 3).map((line, index) => (
                      <div key={index} className="rounded-2xl px-3 py-3 text-sm" style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>Fluxo</div>
                  <div className="text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>Peças recentes</div>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                  {filteredPosts.length} peças na view
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {secondary.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => navigate(`/intel/${post.slug}`)}
                  className="rounded-xl p-5 text-left"
                  style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <IntelEntityIcon
                        symbol={intelEntity(post)}
                        sectionKey="market"
                        className="flex h-9 w-9 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        iconClassName="h-4 w-4"
                      />
                      <div className="flex items-center gap-2">
                      <StatusBadge status="active">{post.editorial_kind === 'briefing' ? 'Intel Brief' : 'Intel Dossiê'}</StatusBadge>
                      <StatusBadge status="pending">{formatRelativeTimestamp(post.generated_at)}</StatusBadge>
                      </div>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{post.reading_time_minutes} min</span>
                  </div>
                  <div className="font-semibold mb-2 text-lg" style={{ color: 'var(--text-1)' }}>{post.title}</div>
                  <div className="text-sm line-clamp-3 mb-3" style={{ color: 'var(--text-2)' }}>{post.excerpt || post.subtitle}</div>
                  <div className="flex flex-wrap gap-2">
                    {(post.visual_entities ?? []).slice(0, 3).map((entity) => (
                      <span key={`${post.id}-${entity.id}`} onClick={(event) => event.stopPropagation()}>
                        <IntelVisualChip entity={entity} />
                      </span>
                    ))}
                    {textTags(post, 2).map((topicTag) => (
                      <Link key={topicTag} to={`/intel/topic/${topicTag}`} onClick={(event) => event.stopPropagation()}>
                        <StatusBadge status="success">{topicTag}</StatusBadge>
                      </Link>
                    ))}
                  </div>
                </button>
              ))}
              </div>
              {hasMorePosts ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount((current) => current + 24)}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-medium"
                  style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                >
                  Carregar mais peças
                </button>
              ) : null}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function topicLabelSafe(value?: string) {
  return value?.trim() || '';
}

function HubLinkGroup({ title, basePath, items }: { title: string; basePath: string; items: string[] }) {
  if (!items.length) return null;
  const isChainHub = basePath.includes('/chain');

  return (
    <div className="rounded-2xl px-4 py-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
      <div className="text-[11px] uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item}
            to={`${basePath}/${item}`}
          >
            {isChainHub ? (
              <ChainBadge chain={item} size="sm" />
            ) : (
              <span
                className="rounded-full px-3 py-2 text-xs"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                {item}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
