import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { MarkdownArticle } from '../../components/blog/MarkdownArticle';
import { intelApi } from '@/services/intel-api';

export function MobileBlogPost() {
  const navigate = useNavigate();
  const { slug = '' } = useParams();
  const postQuery = useQuery({
    queryKey: ['intel-post', slug, 'mobile'],
    queryFn: () => intelApi.getPost(slug),
    enabled: Boolean(slug),
  });

  const post = postQuery.data;

  return (
    <MobilePageShell
      title="Resenha"
      subtitle="SNE Enterprise Blog"
      action={
        <button onClick={() => navigate('/blog')} className="text-[var(--text-2)]">
          <ArrowLeft className="w-5 h-5" />
        </button>
      }
      showContext={false}
    >
      {postQuery.isError ? (
        <ErrorState
          title="Resenha indisponível"
          description="O post completo não carregou agora."
          onRetry={() => postQuery.refetch()}
        />
      ) : !post ? (
        <EmptyState title="Carregando resenha" description="Buscando o editorial completo do Intel." />
      ) : (
        <>
          <SurfaceCard variant="elevated">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="orange" size="sm">SNE Enterprise Blog</Badge>
              <Badge variant={post.status === 'draft' ? 'success' : 'warning'} size="sm">{post.status}</Badge>
            </div>
            <div className="text-[var(--text-1)] mb-2">{post.title}</div>
            <div className="text-sm text-[var(--text-2)] mb-3">{post.subtitle}</div>
            {post.tldr.length > 0 && (
              <ul className="space-y-2 list-disc pl-5 text-sm text-[var(--text-2)]">
                {post.tldr.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <MarkdownArticle markdown={post.body_markdown} className="space-y-5" />
          </SurfaceCard>

          <SurfaceCard>
            <div className="space-y-3">
              {post.sources.map((source) => (
                <MobileButton key={source.url} variant="secondary" className="w-full" onClick={() => window.open(source.url, '_blank', 'noopener,noreferrer')}>
                  {source.name}
                </MobileButton>
              ))}
            </div>
          </SurfaceCard>
        </>
      )}
    </MobilePageShell>
  );
}
