import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, ExternalLink, Layers3, Share2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { IntelEntityIcon } from '../components/IntelEntityIcon';
import { IntelVisualChip } from '../components/IntelVisualChip';
import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { EditorialSnapshot } from '../components/blog/EditorialSnapshot';
import { MarkdownArticle } from '../components/blog/MarkdownArticle';
import { parseArticleMarkdown } from '../components/blog/articleParser';
import { cn } from '../components/ui/utils';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
import { intelApi, intelOgImageUrl, intelShareUrl } from '@/services/intel-api';

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

function toneStatus(tone: 'default' | 'context' | 'watch' | 'action' | 'risk') {
  if (tone === 'action') return 'success';
  if (tone === 'risk') return 'warning';
  if (tone === 'watch') return 'active';
  return 'pending';
}

function toneRailStyle(tone: 'default' | 'context' | 'watch' | 'action' | 'risk') {
  if (tone === 'action') {
    return {
      background: 'linear-gradient(135deg, rgba(77,201,144,0.12), rgba(255,255,255,0.02))',
      borderColor: 'rgba(77,201,144,0.20)',
    };
  }

  if (tone === 'risk') {
    return {
      background: 'linear-gradient(135deg, rgba(224,92,67,0.12), rgba(255,255,255,0.02))',
      borderColor: 'rgba(224,92,67,0.20)',
    };
  }

  if (tone === 'watch') {
    return {
      background: 'linear-gradient(135deg, rgba(255,140,66,0.12), rgba(255,255,255,0.02))',
      borderColor: 'rgba(255,140,66,0.22)',
    };
  }

  if (tone === 'context') {
    return {
      background: 'linear-gradient(135deg, rgba(74,144,226,0.10), rgba(255,255,255,0.02))',
      borderColor: 'rgba(74,144,226,0.18)',
    };
  }

  return {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
    borderColor: 'rgba(255,255,255,0.10)',
  };
}

function intelEntity(post?: { primary_visual_entity?: { iconSymbol?: string | null } | null; assets?: string[]; chains?: string[] } | null) {
  return post?.primary_visual_entity?.iconSymbol || post?.assets?.[0] || post?.chains?.[0] || null;
}

function topicOnlyTags(post: { topics?: string[]; assets?: string[]; chains?: string[]; visual_entities?: Array<{ id: string; label: string }> }, limit: number) {
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

export function BlogPost() {
  const navigate = useNavigate();
  const { slug = '' } = useParams();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const postQuery = useQuery({
    queryKey: ['intel-post', slug],
    queryFn: () => intelApi.getPost(slug),
    enabled: Boolean(slug),
  });
  const relatedPostsQuery = useQuery({
    queryKey: ['intel-posts', 'related', slug],
    queryFn: () => intelApi.getPosts(60),
    enabled: Boolean(slug),
  });

  const post = postQuery.data;
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const article = useMemo(() => parseArticleMarkdown(post?.body_markdown ?? ''), [post?.body_markdown]);
  const snapshotItems = post ? (post.tldr.length > 0 ? post.tldr.slice(0, 4) : [post.excerpt || post.subtitle].filter(Boolean)) : [];
  const relatedPosts = useMemo(() => {
    if (!post) return [];
    const terms = new Set([...(post.topics ?? []), ...(post.chains ?? []), ...(post.assets ?? [])].map((item) => item.toLowerCase()));
    return (relatedPostsQuery.data?.items ?? [])
      .filter((candidate) => candidate.slug !== post.slug)
      .map((candidate) => {
        const score = [...(candidate.topics ?? []), ...(candidate.chains ?? []), ...(candidate.assets ?? [])]
          .map((item) => item.toLowerCase())
          .filter((item) => terms.has(item)).length;
        return { candidate, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 4)
      .map((entry) => entry.candidate);
  }, [post, relatedPostsQuery.data?.items]);
  const radarLinks = useMemo(() => {
    const supported = new Set(['BTC', 'ETH', 'SOL', 'LINK', 'AAVE', 'UNI']);
    return (post?.assets ?? [])
      .filter((asset) => supported.has(asset.toUpperCase()))
      .map((asset) => ({
        label: `${asset.toUpperCase()} Radar`,
        href: `/radar/${asset.toLowerCase()}usdt`,
      }));
  }, [post?.assets]);
  const activeSection = article.sections.find((section) => section.id === activeSectionId) ?? article.sections[0] ?? null;
  const sectionSummaries = useMemo(() => {
    const pickSignal = (section: (typeof article.sections)[number]) => {
      for (const block of section.blocks) {
        if (block.type === 'checklist' && block.items.length > 0) return block.items[0];
        if (block.type === 'callout') {
          if (block.text) return block.text;
          if (block.items.length > 0) return block.items[0];
        }
        if (block.type === 'list' && block.items.length > 0) return block.items[0];
        if (block.type === 'paragraph') return block.text;
      }
      return null;
    };

    return article.sections.map((section) => ({
      id: section.id,
      tone: section.tone,
      signal: pickSignal(section),
    }));
  }, [article.sections]);
  const currentHeading = article.headings.find((heading) => heading.id === activeSectionId) ?? article.headings[0] ?? null;
  const currentSectionSummary = sectionSummaries.find((section) => section.id === currentHeading?.id) ?? null;
  const currentSectionIndex = currentHeading ? Math.max(0, article.headings.findIndex((heading) => heading.id === currentHeading.id)) : 0;
  const progressPercent = Math.round(readingProgress * 100);
  const contextualRail = useMemo(() => {
    const uniqueItems = (items: Array<string | null | undefined>, limit = 4) =>
      [...new Set(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item)))]
        .slice(0, limit);

    const sectionTitle = activeSection?.title ?? currentHeading?.title ?? 'Leitura atual';
    const sectionTone = activeSection?.tone ?? currentHeading?.tone ?? 'default';
    const summary = currentSectionSummary?.signal ?? post?.excerpt ?? post?.subtitle ?? 'Sem sinal contextual para esta seção.';
    const sectionItems = activeSection
      ? uniqueItems(
          activeSection.blocks.flatMap((block) => {
            if (block.type === 'list' || block.type === 'checklist') return block.items;
            if (block.type === 'callout') return [block.text, ...block.items];
            if (block.type === 'paragraph') return [block.text];
            return [];
          }),
          6
        )
      : [];

    const buildGroups = () => {
      if (sectionTone === 'risk') {
        return [
          { label: 'Risco principal', items: uniqueItems(sectionItems.length ? sectionItems : article.highlights.risks, 3) },
          { label: 'O que observar', items: uniqueItems([...article.highlights.watch, ...article.highlights.radarChecks], 3) },
          { label: 'Implicação', items: uniqueItems(article.highlights.actions, 2) },
        ].filter((group) => group.items.length > 0);
      }

      if (sectionTone === 'action') {
        return [
          { label: 'O que fazer agora', items: uniqueItems(sectionItems.length ? sectionItems : article.highlights.actions, 3) },
          { label: 'Onde validar', items: uniqueItems([...article.highlights.radarChecks, ...article.highlights.watch], 3) },
          { label: 'Links operacionais', items: uniqueItems(radarLinks.map((link) => link.label), 2) },
        ].filter((group) => group.items.length > 0);
      }

      if (sectionTone === 'watch') {
        return [
          { label: 'Sinais em foco', items: uniqueItems(sectionItems.length ? sectionItems : article.highlights.watch, 3) },
          { label: 'Valida no Radar', items: uniqueItems(article.highlights.radarChecks, 3) },
          { label: 'Se confirmar', items: uniqueItems(article.highlights.actions, 2) },
        ].filter((group) => group.items.length > 0);
      }

      if (sectionTone === 'context') {
        return [
          { label: 'O que importa', items: uniqueItems(sectionItems.length ? sectionItems : snapshotItems, 3) },
          { label: 'Conecta com', items: uniqueItems([...(post?.topics ?? []), ...(post?.chains ?? []), ...(post?.assets ?? [])], 3) },
          { label: 'Próxima leitura', items: uniqueItems([...article.highlights.watch, ...article.highlights.actions], 2) },
        ].filter((group) => group.items.length > 0);
      }

      return [
        { label: 'Foco da seção', items: uniqueItems(sectionItems.length ? sectionItems : snapshotItems, 3) },
        { label: 'Observação', items: uniqueItems(article.highlights.watch, 2) },
        { label: 'Execução', items: uniqueItems(article.highlights.actions, 2) },
      ].filter((group) => group.items.length > 0);
    };

    return {
      title:
        sectionTone === 'risk'
          ? 'Risco em foco'
          : sectionTone === 'action'
            ? 'Execução desta leitura'
            : sectionTone === 'watch'
              ? 'Monitoramento da seção'
              : sectionTone === 'context'
                ? 'Contexto desta seção'
                : 'Foco da leitura',
      summary,
      sectionTitle,
      sectionTone,
      groups: buildGroups(),
    };
  }, [activeSection, article.highlights.actions, article.highlights.radarChecks, article.highlights.watch, article.highlights.risks, currentHeading, currentSectionSummary?.signal, post?.assets, post?.chains, post?.excerpt, post?.subtitle, post?.topics, radarLinks, snapshotItems]);
  const stageAction = useMemo(() => {
    const firstSource = post?.sources?.[0];

    if ((contextualRail.sectionTone === 'action' || contextualRail.sectionTone === 'watch') && radarLinks[0]) {
      return {
        kind: 'internal' as const,
        href: radarLinks[0].href,
        label: radarLinks[0].label,
      };
    }

    if (contextualRail.sectionTone === 'context' && relatedPosts[0]) {
      return {
        kind: 'internal' as const,
        href: `/intel/${relatedPosts[0].slug}`,
        label: 'Continue a leitura',
      };
    }

    if (firstSource) {
      return {
        kind: 'external' as const,
        href: firstSource.url,
        label: firstSource.name,
      };
    }

    return null;
  }, [contextualRail.sectionTone, post?.sources, radarLinks, relatedPosts]);

  useSeoMeta({
    title: post ? `${post.title} | Intel Brief | SNE OS` : 'Intel Brief | SNE OS',
    description: post?.excerpt || post?.subtitle || 'Dossiê editorial do Intel Brief do SNE OS.',
    canonicalPath: slug ? `/intel/${slug}` : '/intel',
    image: slug ? intelOgImageUrl(slug) : undefined,
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
      setShareFeedback('Link de compartilhamento copiado.');
      window.setTimeout(() => setShareFeedback(null), 2400);
    } catch {
      setShareFeedback('Não foi possível compartilhar agora.');
      window.setTimeout(() => setShareFeedback(null), 2400);
    }
  }

  useEffect(() => {
    setActiveSectionId(article.headings[0]?.id ?? null);
    setReadingProgress(0);
  }, [slug, article.headings]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateProgress = () => {
      const maxScroll = container.scrollHeight - container.clientHeight;
      const nextProgress = maxScroll <= 0 ? 0 : Math.min(1, Math.max(0, container.scrollTop / maxScroll));
      setReadingProgress(nextProgress);
    };

    updateProgress();
    container.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    return () => {
      container.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [slug, article.headings.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || article.headings.length === 0) return;

    const sections = article.headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (sections.length === 0) return;

    const visibleRatios = new Map<string, number>();
    const pickActiveSection = () => {
      if (visibleRatios.size > 0) {
        const [nextActive] = [...visibleRatios.entries()].sort((left, right) => right[1] - left[1])[0];
        setActiveSectionId(nextActive);
        return;
      }

      const containerTop = container.getBoundingClientRect().top;
      let candidate = sections[0];
      let bestDistance = Number.POSITIVE_INFINITY;

      sections.forEach((section) => {
        const distance = Math.abs(section.getBoundingClientRect().top - containerTop - 112);
        if (distance < bestDistance) {
          bestDistance = distance;
          candidate = section;
        }
      });

      setActiveSectionId(candidate.id);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleRatios.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleRatios.delete(entry.target.id);
          }
        });

        pickActiveSection();
      },
      {
        root: container,
        rootMargin: '-15% 0px -55% 0px',
        threshold: [0, 0.15, 0.35, 0.6, 1],
      }
    );

    sections.forEach((section) => observer.observe(section));
    pickActiveSection();

    return () => observer.disconnect();
  }, [slug, article.headings]);

  function handleJumpToSection(sectionId: string) {
    const target = document.getElementById(sectionId);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${sectionId}`);
  }

  if (postQuery.isLoading) {
    return (
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="mx-auto max-w-4xl py-6">
          <ModuleStateCard tone="loading" title="Carregando dossiê" description="Buscando a leitura completa do Intel Brief." />
        </div>
      </div>
    );
  }

  if (postQuery.isError || !post) {
    return (
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="mx-auto max-w-4xl py-6">
          <ModuleStateCard tone="error" title="Dossiê indisponível" description="A leitura pedida não está acessível agora." actionLabel="Voltar ao Intel Brief" onAction={() => navigate('/intel')} />
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 px-8 py-6 overflow-y-auto">
      <article className="mx-auto max-w-6xl space-y-6">
        <button onClick={() => navigate('/intel')} className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Intel Brief
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
            <StatusBadge status="active">Intel Brief</StatusBadge>
            <StatusBadge status="success">{post.editorial_kind === 'briefing' ? 'Briefing' : 'Dossiê'}</StatusBadge>
            <StatusBadge status="pending">{post.reading_time_minutes} min</StatusBadge>
            {post.status !== 'draft' ? <StatusBadge status="warning">{post.status}</StatusBadge> : null}
          </div>
          <div className="flex items-start gap-4">
            <IntelEntityIcon
              symbol={intelEntity(post)}
              sectionKey="market"
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,140,66,0.12)', color: 'var(--accent-orange)' }}
              iconClassName="w-5 h-5"
            />
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
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
              style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <Share2 className="w-4 h-4" />
              Compartilhar
            </button>
            {shareFeedback ? (
              <div className="text-sm" style={{ color: 'var(--text-3)' }}>{shareFeedback}</div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {(post.visual_entities ?? []).slice(0, 4).map((entity) => (
              <IntelVisualChip key={`${post.id}-${entity.id}`} entity={entity} size="md" />
            ))}
            {topicOnlyTags(post, 3).map((topic) => (
              <Link key={topic} to={`/intel/topic/${topic}`}>
                <StatusBadge status="pending">{topic}</StatusBadge>
              </Link>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-6">
            {snapshotItems.length > 0 && (
              <section
                className="rounded-[28px] p-6 space-y-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                  Resumo editorial
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

            {relatedPosts.length > 0 && (
              <section
                className="rounded-[28px] p-6 space-y-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
                    Continue a leitura
                  </div>
                  <div className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>
                    Peças relacionadas do Intel Brief
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relatedPosts.map((related) => (
                    <Link
                      key={related.slug}
                      to={`/intel/${related.slug}`}
                      className="rounded-2xl p-4"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <StatusBadge status="active">{related.editorial_kind === 'briefing' ? 'Briefing' : 'Dossiê'}</StatusBadge>
                        <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                      </div>
                      <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>{related.title}</div>
                      <div className="text-sm line-clamp-3" style={{ color: 'var(--text-2)' }}>{related.excerpt || related.subtitle}</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section
              className="rounded-[28px] p-6 space-y-4"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                <Layers3 className="w-3.5 h-3.5" />
                Feeds de origem
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {post.sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl px-4 py-4"
                    style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <span style={{ color: 'var(--text-1)' }}>{source.name}</span>
                    <ExternalLink className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                  </a>
                ))}
              </div>
            </section>
          </div>

          <aside className="hidden lg:block space-y-4 lg:sticky lg:top-6 self-start">
            {article.headings.length > 0 && (
              <section
                className="rounded-[24px] p-5 space-y-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                    Leitura em curso
                  </div>
                  {currentHeading ? <StatusBadge status={toneStatus(currentHeading.tone)}>{currentHeading.tone}</StatusBadge> : null}
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3 text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>
                    <span>{progressPercent}% lido</span>
                    <span>{Math.min(article.headings.length, currentSectionIndex + 1 || 1)}/{article.headings.length} seções</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full" style={{ backgroundColor: 'var(--bg-3)' }}>
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${progressPercent}%`, backgroundColor: 'var(--accent-orange)' }}
                    />
                  </div>
                </div>
                {currentHeading ? (
                  <div className="rounded-2xl px-4 py-4 space-y-2" style={{ backgroundColor: 'var(--bg-3)' }}>
                    <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                      Seção ativa
                    </div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{currentHeading.title}</div>
                    <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      {currentSectionSummary?.signal ?? post.excerpt ?? post.subtitle}
                    </div>
                  </div>
                ) : null}
              </section>
            )}

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
                    <button
                      key={heading.id}
                      type="button"
                      onClick={() => handleJumpToSection(heading.id)}
                      className={cn('flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors')}
                      style={{
                        backgroundColor: activeSectionId === heading.id ? 'rgba(255,140,66,0.10)' : 'var(--bg-3)',
                        color: activeSectionId === heading.id ? 'var(--text-1)' : 'var(--text-2)',
                        borderWidth: '1px',
                        borderColor: activeSectionId === heading.id ? 'rgba(255,140,66,0.18)' : 'transparent',
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>
                          Seção {index + 1}
                        </div>
                        <div className="line-clamp-2">{heading.title}</div>
                      </div>
                      <StatusBadge status={toneStatus(heading.tone)}>{heading.tone}</StatusBadge>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {article.headings.length > 0 && (
              <section
                className="rounded-[24px] p-5"
                style={{ ...toneRailStyle(contextualRail.sectionTone), backgroundColor: 'var(--bg-2)', borderWidth: '1px' }}
              >
                <div
                  className="relative min-h-[420px] overflow-hidden rounded-[20px] border"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={currentHeading?.id ?? contextualRail.sectionTitle}
                      initial={{ opacity: 0, y: 26, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -26, scale: 0.985 }}
                      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 px-4 py-4"
                    >
                      <div className="flex h-full flex-col justify-between gap-5">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                              {contextualRail.title}
                            </div>
                            <StatusBadge status={toneStatus(contextualRail.sectionTone)}>{contextualRail.sectionTone}</StatusBadge>
                          </div>

                          <div className="space-y-2">
                            <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                              Card ativo
                            </div>
                            <div className="text-xl font-semibold leading-7" style={{ color: 'var(--text-1)' }}>
                              {contextualRail.sectionTitle}
                            </div>
                            <div className="text-sm leading-7" style={{ color: 'var(--text-2)' }}>
                              {contextualRail.summary}
                            </div>
                          </div>

                          <div className="space-y-4">
                            {contextualRail.groups.slice(0, 2).map((group) => (
                              <div key={group.label} className="space-y-2">
                                <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                                  {group.label}
                                </div>
                                <div className="space-y-2">
                                  {group.items.slice(0, 3).map((item, index) => (
                                    <div
                                      key={`${group.label}-${index}`}
                                      className="rounded-xl px-3 py-3 text-sm leading-6"
                                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-2)' }}
                                    >
                                      {item}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {stageAction ? (
                          stageAction.kind === 'internal' ? (
                            <Link
                              to={stageAction.href}
                              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm"
                              style={{
                                backgroundColor: 'rgba(255,140,66,0.10)',
                                color: 'var(--text-1)',
                                borderWidth: '1px',
                                borderColor: 'rgba(255,140,66,0.20)',
                              }}
                            >
                              <span>{stageAction.label}</span>
                              <ArrowUpRight className="w-4 h-4" />
                            </Link>
                          ) : (
                            <a
                              href={stageAction.href}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm"
                              style={{
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                color: 'var(--text-1)',
                                borderWidth: '1px',
                                borderColor: 'rgba(255,255,255,0.10)',
                              }}
                            >
                              <span>{stageAction.label}</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )
                        ) : null}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </section>
            )}
          </aside>
        </div>
      </article>
    </div>
  );
}
