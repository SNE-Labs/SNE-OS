import { useQuery } from '@tanstack/react-query';
import { Newspaper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { intelApi } from '@/services/intel-api';

export function MobileBlog() {
  const navigate = useNavigate();
  const postsQuery = useQuery({
    queryKey: ['intel-posts', 'mobile'],
    queryFn: intelApi.getPosts,
    refetchInterval: 60000,
  });

  const posts = postsQuery.data?.items ?? [];

  return (
    <MobilePageShell title="Blog" subtitle="Resenhas completas do Intel enterprise." showContext>
      {postsQuery.isError ? (
        <ErrorState
          title="Blog indisponível"
          description="As resenhas editoriais não carregaram agora."
          onRetry={() => postsQuery.refetch()}
        />
      ) : posts.length === 0 ? (
        <EmptyState
          title="Sem resenhas ainda"
          description="O pipeline editorial publica aqui assim que concluir as primeiras matérias."
        />
      ) : (
        <>
          {posts.map((post) => (
            <SurfaceCard key={post.id}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-[var(--accent-orange-dim)] text-[var(--accent-orange)]">
                    <Newspaper className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[var(--text-1)]">SNE Enterprise Blog</div>
                    <div className="text-xs text-[var(--text-3)]">{post.reading_time_minutes} min</div>
                  </div>
                </div>
                <Badge variant={post.status === 'draft' ? 'success' : 'warning'} size="sm">{post.status}</Badge>
              </div>
              <div className="text-[var(--text-1)] mb-2">{post.title}</div>
              <div className="text-sm text-[var(--text-2)] mb-4">{post.excerpt || post.subtitle}</div>
              <MobileButton className="w-full" onClick={() => navigate(`/blog/${post.slug}`)}>
                Abrir resenha
              </MobileButton>
            </SurfaceCard>
          ))}
        </>
      )}
    </MobilePageShell>
  );
}
