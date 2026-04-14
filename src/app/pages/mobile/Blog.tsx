import { useQuery } from '@tanstack/react-query';
import { Brain } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
import { intelApi } from '@/services/intel-api';

export function MobileBlog() {
  const navigate = useNavigate();
  const { topic, chain, asset } = useParams();
  const postsQuery = useQuery({
    queryKey: ['intel-posts', 'mobile'],
    queryFn: intelApi.getPosts,
    refetchInterval: 60000,
  });

  const posts = postsQuery.data?.items ?? [];
  const filteredPosts = posts.filter((post) => {
    if (topic && !(post.topics ?? []).includes(topic)) return false;
    if (chain && !(post.chains ?? []).includes(chain)) return false;
    if (asset && !(post.assets ?? []).includes(asset)) return false;
    return true;
  });
  const taxonomyLabel = topic ?? chain ?? asset ?? null;
  const taxonomyKind = topic ? 'tema' : chain ? 'chain' : asset ? 'asset' : null;
  const canonicalPath = topic
    ? `/intel/topic/${topic}`
    : chain
      ? `/intel/chain/${chain}`
      : asset
        ? `/intel/asset/${asset}`
        : '/intel';

  useSeoMeta({
    title: taxonomyLabel ? `Intel Brief: ${taxonomyLabel} | SNE OS` : 'Intel Brief | SNE OS',
    description: taxonomyLabel
      ? `Leituras editoriais do SNE OS para ${taxonomyKind} ${taxonomyLabel}: dossiês, briefings e contexto operacional multichain.`
      : 'Intel Brief do SNE OS com dossiês, briefings e contexto operacional sobre mercado, tech, economia, geopolítica e cripto.',
    canonicalPath,
    type: 'website',
    keywords: ['crypto intelligence', 'web3 intelligence', 'defi', 'intel brief', topic, chain, asset].filter(Boolean) as string[],
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

  return (
    <MobilePageShell
      title={taxonomyLabel ? `Intel Brief: ${taxonomyLabel}` : 'Intel Brief'}
      subtitle={taxonomyLabel ? `Leituras editoriais para ${taxonomyKind} ${taxonomyLabel}.` : 'Leituras editoriais do SNE OS para contexto, mercado e operacao.'}
      showContext
    >
      {!taxonomyLabel && (topic || chain || asset ? null : (
        <SurfaceCard>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-3">Explorar hubs</div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(posts.flatMap((post) => post.topics ?? []))).slice(0, 6).map((value) => (
                <Link key={`topic-${value}`} to={`/intel/topic/${value}`} className="rounded-full px-3 py-2 text-xs border border-[var(--stroke-1)] bg-[var(--bg-2)] text-[var(--text-2)]">
                  {value}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(posts.flatMap((post) => post.assets ?? []))).slice(0, 6).map((value) => (
                <Link key={`asset-${value}`} to={`/intel/asset/${value}`} className="rounded-full px-3 py-2 text-xs border border-[var(--stroke-1)] bg-[var(--bg-2)] text-[var(--text-2)]">
                  {value}
                </Link>
              ))}
            </div>
          </div>
        </SurfaceCard>
      ))}
      {postsQuery.isError ? (
        <ErrorState
          title="Intel Brief indisponivel"
          description="Os dossiês editoriais não carregaram agora."
          onRetry={() => postsQuery.refetch()}
        />
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          title="Sem dossiês ainda"
          description="O pipeline editorial publica aqui assim que concluir as primeiras leituras."
        />
      ) : (
        <>
          {filteredPosts.map((post) => (
            <SurfaceCard key={post.id || post.slug}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-[var(--accent-orange-dim)] text-[var(--accent-orange)]">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[var(--text-1)]">Intel Brief</div>
                    <div className="text-xs text-[var(--text-3)]">{post.reading_time_minutes} min</div>
                  </div>
                </div>
                <Badge variant={post.status === 'draft' ? 'success' : 'warning'} size="sm">{post.status}</Badge>
              </div>
              <div className="text-[var(--text-1)] mb-2">{post.title || post.slug}</div>
              <div className="text-sm text-[var(--text-2)] mb-4">{post.excerpt || post.subtitle}</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {(post.assets.length > 0 ? post.assets : post.chains.length > 0 ? post.chains : post.topics).slice(0, 3).map((tag) => (
                  <Link
                    key={tag}
                    to={post.assets.includes(tag) ? `/intel/asset/${tag}` : post.chains.includes(tag) ? `/intel/chain/${tag}` : `/intel/topic/${tag}`}
                    className="rounded-full px-3 py-2 text-xs border border-[var(--stroke-1)] bg-[var(--bg-2)] text-[var(--text-2)]"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
              <MobileButton className="w-full" onClick={() => navigate(`/intel/${post.slug || post.id}`)}>
                Abrir leitura
              </MobileButton>
            </SurfaceCard>
          ))}
        </>
      )}
    </MobilePageShell>
  );
}
