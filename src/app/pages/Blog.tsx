import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Brain, Clock3, Layers3 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
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

export function Blog() {
  const navigate = useNavigate();
  const { topic, chain, asset } = useParams();
  const [activeKind, setActiveKind] = useState<'all' | 'dossier' | 'briefing'>('all');
  const [topicFilter, setTopicFilter] = useState(topic ?? 'all');
  const [chainFilter, setChainFilter] = useState(chain ?? 'all');
  const [assetFilter, setAssetFilter] = useState(asset ?? 'all');
  const postsQuery = useQuery({
    queryKey: ['intel-posts'],
    queryFn: intelApi.getPosts,
    refetchInterval: 60000,
  });

  const posts = postsQuery.data?.items ?? [];
  const topicCount = new Set(posts.flatMap((post) => post.topics ?? [])).size;
  const chainCount = new Set(posts.flatMap((post) => post.chains ?? [])).size;
  const briefingCount = posts.filter((post) => post.editorial_kind === 'briefing').length;
  const dossierCount = posts.filter((post) => post.editorial_kind === 'dossier').length;

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

  const featured = filteredPosts[0];
  const secondary = filteredPosts.slice(1);
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

  useSeoMeta({
    title: taxonomyLabel
      ? `Intelligence Layer: ${taxonomyLabel} | SNE OS`
      : 'Intelligence Layer | SNE OS',
    description: taxonomyLabel
      ? `Leituras editoriais do SNE OS para ${taxonomyKind} ${taxonomyLabel}: dossiês, briefings e contexto operacional multichain.`
      : 'Intelligence Layer do SNE OS com dossiês, briefings e contexto operacional sobre mercado, tech, economia, geopolítica e cripto.',
    canonicalPath,
    type: 'website',
    keywords: ['crypto intelligence', 'web3 intelligence', 'defi', 'tech', 'economia', 'geopolitica', topicLabelSafe(topic), topicLabelSafe(chain), topicLabelSafe(asset)].filter(Boolean) as string[],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: taxonomyLabel ? `Intelligence Layer: ${taxonomyLabel}` : 'Intelligence Layer',
      description: taxonomyLabel
        ? `Página índice da Intelligence Layer para ${taxonomyKind} ${taxonomyLabel}.`
        : 'Página índice da Intelligence Layer do SNE OS.',
      url: `https://snelabs.space${canonicalPath}`,
    },
  });

  if (postsQuery.isLoading) {
    return (
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="mx-auto max-w-6xl py-6">
          <ModuleStateCard tone="loading" title="Carregando intelligence layer" description="Buscando dossiês e briefings gerados pelo Intel." />
        </div>
      </div>
    );
  }

  if (postsQuery.isError) {
    return (
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="mx-auto max-w-6xl py-6">
          <ModuleStateCard tone="error" title="Intelligence layer indisponível" description="Os dossiês do Intel não carregaram agora." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-8 py-6 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6">
        <header
          className="rounded-[28px] p-6 space-y-5"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(255,140,66,0.18), transparent 38%), linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
            backgroundColor: 'var(--bg-2)',
            borderWidth: '1px',
            borderColor: 'var(--stroke-1)',
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="active">Intelligence Layer</StatusBadge>
            <StatusBadge status="pending">{posts.length} peças</StatusBadge>
            <StatusBadge status="success">{formatRelativeTimestamp(postsQuery.data?.last_updated)}</StatusBadge>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,140,66,0.12)', color: 'var(--accent-orange)' }}>
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Editorial Intel</p>
              <h1 className="text-4xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Intelligence Layer</h1>
              <p className="text-sm max-w-3xl" style={{ color: 'var(--text-2)' }}>
                Camada editorial do OS para transformar sinais de mercado, notícias e movimento multichain em briefing, leitura operacional e dossiês persistentes.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                <Layers3 className="w-3.5 h-3.5" />
                Camadas
              </div>
              <div className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-1)' }}>{topicCount}</div>
              <div className="text-sm" style={{ color: 'var(--text-3)' }}>temas editoriais ativos</div>
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                <Brain className="w-3.5 h-3.5" />
                Dossiês
              </div>
              <div className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-1)' }}>{dossierCount}</div>
              <div className="text-sm" style={{ color: 'var(--text-3)' }}>leituras profundas disponíveis</div>
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                <Clock3 className="w-3.5 h-3.5" />
                Briefings
              </div>
              <div className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-1)' }}>{briefingCount}</div>
              <div className="text-sm" style={{ color: 'var(--text-3)' }}>leituras rápidas de mercado</div>
            </div>
          </div>
        </header>

        <section
          className="rounded-[28px] p-5 space-y-4"
          style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>Segmentation</div>
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
              Índice público ativo para {taxonomyKind} <strong style={{ color: 'var(--text-1)' }}>{taxonomyLabel}</strong>. Esta página pode servir como entrada indexável da Intelligence Layer.
            </div>
          )}
        </section>

        {!featured ? (
          <ModuleStateCard tone="loading" title="Nenhuma peça encontrada" description="Ajuste os filtros ou aguarde a próxima rodada editorial do Intel." />
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-4">
              <button
                onClick={() => navigate(`/intel/${featured.slug}`)}
                className="w-full rounded-[28px] p-6 text-left"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,140,66,0.1), rgba(255,255,255,0.02))',
                  backgroundColor: 'var(--bg-2)',
                  borderWidth: '1px',
                  borderColor: 'var(--stroke-1)',
                }}
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge status="active">{featured.editorial_kind === 'briefing' ? 'Briefing principal' : 'Dossiê principal'}</StatusBadge>
                    <StatusBadge status="pending">{featured.reading_time_minutes} min</StatusBadge>
                  </div>
                  <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                </div>
                <div className="text-3xl font-semibold mb-3" style={{ color: 'var(--text-1)' }}>{featured.title}</div>
                <div className="text-base mb-4 max-w-3xl" style={{ color: 'var(--text-2)' }}>{featured.subtitle}</div>
                <div className="text-sm mb-5 max-w-3xl" style={{ color: 'var(--text-3)' }}>
                  {featured.excerpt || 'Leitura editorial completa disponível nesta peça.'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(featured.assets.length > 0 ? featured.assets : featured.chains.length > 0 ? featured.chains : featured.topics).slice(0, 4).map((tag) => (
                    <button key={tag} onClick={(event) => { event.stopPropagation(); navigate(featured.assets.includes(tag) ? `/intel/asset/${tag}` : featured.chains.includes(tag) ? `/intel/chain/${tag}` : `/intel/topic/${tag}`); }}>
                      <StatusBadge status="success">{tag}</StatusBadge>
                    </button>
                  ))}
                </div>
              </button>

              <section
                className="rounded-[28px] p-5 space-y-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Snapshot</div>
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
                  <div className="text-[11px] uppercase mb-2" style={{ color: 'var(--text-3)' }}>Key signals</div>
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
                  <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>Flow</div>
                  <div className="text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>Peças recentes</div>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {secondary.map((post) => (
                <button
                  key={post.id}
                  onClick={() => navigate(`/intel/${post.slug}`)}
                  className="rounded-xl p-5 text-left"
                  style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status="active">{post.editorial_kind === 'briefing' ? 'Intel briefing' : 'Intel dossier'}</StatusBadge>
                      <StatusBadge status="pending">{formatRelativeTimestamp(post.generated_at)}</StatusBadge>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{post.reading_time_minutes} min</span>
                  </div>
                  <div className="font-semibold mb-2 text-lg" style={{ color: 'var(--text-1)' }}>{post.title}</div>
                  <div className="text-sm line-clamp-3 mb-3" style={{ color: 'var(--text-2)' }}>{post.excerpt || post.subtitle}</div>
                  <div className="flex flex-wrap gap-2">
                    {(post.assets.length > 0 ? post.assets : post.chains.length > 0 ? post.chains : post.topics).slice(0, 3).map((tag) => (
                      <button key={tag} onClick={(event) => { event.stopPropagation(); navigate(post.assets.includes(tag) ? `/intel/asset/${tag}` : post.chains.includes(tag) ? `/intel/chain/${tag}` : `/intel/topic/${tag}`); }}>
                        <StatusBadge status="success">{tag}</StatusBadge>
                      </button>
                    ))}
                  </div>
                </button>
              ))}
              </div>
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
