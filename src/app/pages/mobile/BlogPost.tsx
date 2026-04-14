import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Layers3, Share2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { EditorialSnapshot } from '../../components/blog/EditorialSnapshot';
import { MarkdownArticle } from '../../components/blog/MarkdownArticle';
import { parseArticleMarkdown } from '../../components/blog/articleParser';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
import { intelApi, intelOgImageUrl, intelShareUrl } from '@/services/intel-api';

export function MobileBlogPost() {
  const navigate = useNavigate();
  const { slug = '' } = useParams();
  const postQuery = useQuery({
    queryKey: ['intel-post', slug, 'mobile'],
    queryFn: () => intelApi.getPost(slug),
    enabled: Boolean(slug),
  });
  const relatedPostsQuery = useQuery({
    queryKey: ['intel-posts', 'related', slug, 'mobile'],
    queryFn: () => intelApi.getPosts(60),
    enabled: Boolean(slug),
  });

  const post = postQuery.data;
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const article = parseArticleMarkdown(post?.body_markdown ?? '');
  const snapshotItems = post ? (post.tldr.length > 0 ? post.tldr.slice(0, 3) : [post.excerpt || post.subtitle].filter(Boolean)) : [];
  const postChains = post?.chains ?? [];
  const postTopics = post?.topics ?? [];
  const postSources = post?.sources ?? [];
  const mobileInsightCards = [
    { key: 'watch', title: 'Monitorar', items: article.highlights.watch },
    { key: 'radar', title: 'Radar', items: article.highlights.radarChecks },
    { key: 'action', title: 'Ação', items: article.highlights.actions },
    { key: 'risk', title: 'Risco', items: article.highlights.risks },
  ].filter((card) => card.items.length > 0);
  const relatedPosts = post
    ? (relatedPostsQuery.data?.items ?? [])
        .filter((candidate) => candidate.slug !== post.slug)
        .map((candidate) => ({
          candidate,
          score: [...(candidate.topics ?? []), ...(candidate.chains ?? []), ...(candidate.assets ?? [])].filter((value) =>
            new Set([...(post.topics ?? []), ...(post.chains ?? []), ...(post.assets ?? [])]).has(value)
          ).length,
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, 3)
        .map((entry) => entry.candidate)
    : [];

  useSeoMeta({
    title: post ? `${post.title} | Intel Brief | SNE OS` : 'Intel Brief | SNE OS',
    description: post?.excerpt || post?.subtitle || 'Dossiê editorial do Intel Brief do SNE OS.',
    canonicalPath: slug ? `/intel/${slug}` : '/intel',
    image: slug ? intelOgImageUrl(slug) : undefined,
    type: 'article',
    keywords: ['crypto intelligence', 'web3 intelligence', ...(post?.topics ?? []), ...(post?.chains ?? []), ...(post?.assets ?? [])],
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

  const shareUrl = intelShareUrl(slug);

  async function handleShare() {
    if (!post) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.excerpt || post.subtitle,
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback('Link copiado.');
      window.setTimeout(() => setShareFeedback(null), 2200);
    } catch {
      setShareFeedback('Falha ao compartilhar.');
      window.setTimeout(() => setShareFeedback(null), 2200);
    }
  }

  return (
    <MobilePageShell
      title="Dossiê"
      subtitle="Intel Brief"
      action={
        <button onClick={() => navigate('/intel')} className="text-[var(--text-2)]">
          <ArrowLeft className="w-5 h-5" />
        </button>
      }
      showContext={false}
    >
      {postQuery.isError ? (
        <ErrorState
          title="Dossiê indisponível"
          description="A leitura completa não carregou agora."
          onRetry={() => postQuery.refetch()}
        />
      ) : !post ? (
        <EmptyState title="Carregando dossiê" description="Buscando a leitura completa do Intel Brief." />
      ) : (
        <>
          <SurfaceCard variant="elevated">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="orange" size="sm">Intel Brief</Badge>
              <Badge variant="info" size="sm">{post.editorial_kind === 'briefing' ? 'Briefing' : 'Dossiê'}</Badge>
              <Badge variant="neutral" size="sm">{post.reading_time_minutes} min</Badge>
              {post.status !== 'draft' ? <Badge variant="warning" size="sm">{post.status}</Badge> : null}
            </div>
            <div className="text-[var(--text-1)] mb-2">{post.title}</div>
            <div className="text-sm text-[var(--text-2)] mb-3">{post.subtitle}</div>
            <div className="flex flex-wrap gap-2">
              {postChains.map((chain) => (
                <Link key={chain} to={`/intel/chain/${chain}`}>
                  <Badge variant="orange" size="sm">{chain}</Badge>
                </Link>
              ))}
              {postTopics.slice(0, 3).map((topic) => (
                <Link key={topic} to={`/intel/topic/${topic}`}>
                  <Badge variant="neutral" size="sm">{topic}</Badge>
                </Link>
              ))}
              {(post.assets ?? []).slice(0, 3).map((asset) => (
                <Link key={asset} to={`/intel/asset/${asset}`}>
                  <Badge variant="success" size="sm">{asset}</Badge>
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <MobileButton className="w-full" onClick={handleShare}>
                <span className="inline-flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Compartilhar
                </span>
              </MobileButton>
              {shareFeedback ? <div className="mt-2 text-xs text-[var(--text-3)]">{shareFeedback}</div> : null}
            </div>
          </SurfaceCard>

          {snapshotItems.length > 0 && (
            <SurfaceCard>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-3">Snapshot editorial</div>
              <EditorialSnapshot items={snapshotItems} variant="mobile" />
            </SurfaceCard>
          )}

          {article.headings.length > 0 && (
            <SurfaceCard>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-3">Navegação da peça</div>
              <div className="flex flex-wrap gap-2">
                {article.headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className="rounded-full px-3 py-2 text-xs"
                    style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-2)' }}
                  >
                    {heading.title}
                  </a>
                ))}
              </div>
            </SurfaceCard>
          )}

          {mobileInsightCards.length > 0 && (
            <SurfaceCard>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-3">Leitura guiada</div>
              <div className="space-y-3">
                {mobileInsightCards.map((card) => (
                  <div key={card.key} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-3)] mb-2">{card.title}</div>
                    <div className="space-y-2">
                      {card.items.slice(0, 2).map((item, index) => (
                        <div key={`${card.key}-${index}`} className="text-sm text-[var(--text-2)]">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          )}

          <SurfaceCard>
            <MarkdownArticle markdown={post.body_markdown} className="space-y-5" variant="mobile" />
          </SurfaceCard>

          {relatedPosts.length > 0 && (
            <SurfaceCard>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-3">Continue a leitura</div>
              <div className="space-y-3">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.slug}
                    to={`/intel/${related.slug}`}
                    className="block rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-4 py-3"
                  >
                    <div className="text-[var(--text-1)] mb-1">{related.title}</div>
                    <div className="text-sm text-[var(--text-2)]">{related.excerpt || related.subtitle}</div>
                  </Link>
                ))}
              </div>
            </SurfaceCard>
          )}

          <SurfaceCard>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-3">
              <Layers3 className="w-3.5 h-3.5" />
              Feeds de origem
            </div>
            {postSources.length === 0 ? (
              <div className="text-sm text-[var(--text-2)]">Sem feeds de origem anexados a esta peça.</div>
            ) : (
              <div className="space-y-3">
                {postSources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-4 py-3"
                  >
                    <span className="text-[var(--text-1)]">{source.name}</span>
                    <ExternalLink className="w-4 h-4 text-[var(--text-3)]" />
                  </a>
                ))}
              </div>
            )}
          </SurfaceCard>
        </>
      )}
    </MobilePageShell>
  );
}
