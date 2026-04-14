import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Brain, ExternalLink, Layers3, Radar, Sparkles, TriangleAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { EditorialSnapshot } from '../components/blog/EditorialSnapshot';
import { MarkdownArticle } from '../components/blog/MarkdownArticle';
import { parseArticleMarkdown } from '../components/blog/articleParser';
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

export function BlogPost() {
  const navigate = useNavigate();
  const { slug = '' } = useParams();
  const postQuery = useQuery({
    queryKey: ['intel-post', slug],
    queryFn: () => intelApi.getPost(slug),
    enabled: Boolean(slug),
  });

  const post = postQuery.data;
  const article = useMemo(() => parseArticleMarkdown(post?.body_markdown ?? ''), [post?.body_markdown]);
  const snapshotItems = post ? (post.tldr.length > 0 ? post.tldr.slice(0, 4) : [post.excerpt || post.subtitle].filter(Boolean)) : [];
  const sideCards = [
    {
      key: 'watch',
      title: 'O que monitorar',
      icon: Radar,
      items: article.highlights.watch,
    },
    {
      key: 'action',
      title: 'Ação prática',
      icon: Sparkles,
      items: article.highlights.actions,
    },
    {
      key: 'risk',
      title: 'Risco principal',
      icon: TriangleAlert,
      items: article.highlights.risks,
    },
  ].filter((card) => card.items.length > 0);

  useSeoMeta({
    title: post ? `${post.title} | Intelligence Layer | SNE OS` : 'Intelligence Layer | SNE OS',
    description: post?.excerpt || post?.subtitle || 'Dossiê editorial da Intelligence Layer do SNE OS.',
    canonicalPath: slug ? `/intel/${slug}` : '/intel',
    type: 'article',
    keywords: [
      'crypto intelligence',
      'web3 intelligence',
      ...(post?.topics ?? []),
      ...(post?.chains ?? []),
      ...(post?.assets ?? []),
    ],
    structuredData: post
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt || post.subtitle,
          datePublished: post.generated_at,
          dateModified: post.generated_at,
          author: {
            '@type': 'Organization',
            name: 'SNE Labs',
          },
          publisher: {
            '@type': 'Organization',
            name: 'SNE Labs',
          },
          mainEntityOfPage: `https://snelabs.space/intel/${slug}`,
        }
      : null,
  });

  if (postQuery.isLoading) {
    return (
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="mx-auto max-w-4xl py-6">
          <ModuleStateCard tone="loading" title="Carregando dossiê" description="Buscando a leitura completa da intelligence layer." />
        </div>
      </div>
    );
  }

  if (postQuery.isError || !post) {
    return (
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="mx-auto max-w-4xl py-6">
          <ModuleStateCard tone="error" title="Dossiê indisponível" description="A leitura pedida não está acessível agora." actionLabel="Voltar à intelligence layer" onAction={() => navigate('/intel')} />
        </div>
      </div>
    );
  }

  const outlineToneStatus = (tone: (typeof article.headings)[number]['tone']) => {
    if (tone === 'action') return 'success';
    if (tone === 'risk') return 'warning';
    if (tone === 'watch') return 'active';
    return 'pending';
  };

  return (
    <div className="flex-1 px-8 py-6 overflow-y-auto">
      <article className="mx-auto max-w-6xl space-y-6">
        <button onClick={() => navigate('/intel')} className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
          <ArrowLeft className="w-4 h-4" />
          Voltar à intelligence layer
        </button>

        <header
          className="rounded-[28px] p-6 space-y-5"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(255,140,66,0.18), transparent 42%), linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
            backgroundColor: 'var(--bg-2)',
            borderWidth: '1px',
            borderColor: 'var(--stroke-1)',
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="active">Intelligence Layer</StatusBadge>
            <StatusBadge status="success">{post.editorial_kind === 'briefing' ? 'Briefing' : 'Dossiê'}</StatusBadge>
            <StatusBadge status="pending">{post.reading_time_minutes} min</StatusBadge>
            <StatusBadge status={post.status === 'draft' ? 'success' : 'warning'}>{post.status}</StatusBadge>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,140,66,0.12)', color: 'var(--accent-orange)' }}>
              <Brain className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-4xl font-semibold text-balance mb-3" style={{ color: 'var(--text-1)' }}>{post.title}</div>
              <p className="text-lg" style={{ color: 'var(--text-2)' }}>{post.subtitle}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>Atualização</div>
              <div className="font-semibold mt-1" style={{ color: 'var(--text-1)' }}>{formatRelativeTimestamp(post.generated_at)}</div>
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>Cobertura</div>
              <div className="font-semibold mt-1" style={{ color: 'var(--text-1)' }}>{post.chains.length || post.topics.length} sinais</div>
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>Origem</div>
              <div className="font-semibold mt-1" style={{ color: 'var(--text-1)' }}>{post.sources[0]?.name ?? 'Intel'}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {post.chains.map((chain) => (
              <button key={chain} onClick={() => navigate(`/intel/chain/${chain}`)}>
                <StatusBadge status="active">{chain}</StatusBadge>
              </button>
            ))}
            {post.topics.map((topic) => (
              <button key={topic} onClick={() => navigate(`/intel/topic/${topic}`)}>
                <StatusBadge status="pending">{topic}</StatusBadge>
              </button>
            ))}
            {post.assets.map((asset) => (
              <button key={asset} onClick={() => navigate(`/intel/asset/${asset}`)}>
                <StatusBadge status="success">{asset}</StatusBadge>
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-6">
            {snapshotItems.length > 0 && (
              <section
                className="rounded-[28px] p-6 space-y-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                  Snapshot editorial
                </div>
                <EditorialSnapshot items={snapshotItems} variant="desktop" />
              </section>
            )}

            <section
              className="rounded-[28px] p-6"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="max-w-[760px]">
                <MarkdownArticle markdown={post.body_markdown} className="space-y-6" variant="desktop" />
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 self-start">
            <section
              className="rounded-[24px] p-5"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
                Leitura guiada
              </div>
              <div className="space-y-3">
                <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)' }}>
                  {post.excerpt || post.subtitle}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'var(--bg-3)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Leitura</div>
                    <div style={{ color: 'var(--text-1)' }}>{post.reading_time_minutes} min</div>
                  </div>
                  <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'var(--bg-3)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Fonte</div>
                    <div className="line-clamp-1" style={{ color: 'var(--text-1)' }}>{post.sources[0]?.name ?? 'Intel'}</div>
                  </div>
                </div>
              </div>
            </section>

            {article.headings.length > 0 && (
              <section
                className="rounded-[24px] p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <div className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
                  Navegação da peça
                </div>
                <div className="space-y-2">
                  {article.headings.map((heading, index) => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm transition-colors"
                      style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)' }}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>
                          Seção {index + 1}
                        </div>
                        <div className="line-clamp-2">{heading.title}</div>
                      </div>
                      <StatusBadge status={outlineToneStatus(heading.tone)}>{heading.tone}</StatusBadge>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {sideCards.map((card) => {
              const Icon = card.icon;
              return (
                <section
                  key={card.key}
                  className="rounded-[24px] p-5"
                  style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                    <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                      {card.title}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {card.items.map((item, index) => (
                      <div
                        key={`${card.key}-${index}`}
                        className="rounded-xl px-3 py-3 text-sm"
                        style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)' }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            <section
              className="rounded-[24px] p-5"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] mb-4" style={{ color: 'var(--text-3)' }}>
                <Layers3 className="w-3.5 h-3.5" />
                Origin feeds
              </div>
              <div className="space-y-3">
                {post.sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                    style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <span style={{ color: 'var(--text-1)' }}>{source.name}</span>
                    <ExternalLink className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                  </a>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </article>
    </div>
  );
}
