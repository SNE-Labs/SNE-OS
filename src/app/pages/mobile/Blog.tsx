import { useQuery } from '@tanstack/react-query';
import { Brain } from 'lucide-react';
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
    <MobilePageShell title="Intelligence Layer" subtitle="Dossiês e briefings do motor editorial do OS." showContext>
      {postsQuery.isError ? (
        <ErrorState
          title="Intelligence layer indisponível"
          description="Os dossiês editoriais não carregaram agora."
          onRetry={() => postsQuery.refetch()}
        />
      ) : posts.length === 0 ? (
        <EmptyState
          title="Sem dossiês ainda"
          description="O pipeline editorial publica aqui assim que concluir as primeiras leituras."
        />
      ) : (
        <>
          {posts.map((post) => (
            <SurfaceCard key={post.id}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-[var(--accent-orange-dim)] text-[var(--accent-orange)]">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[var(--text-1)]">Intelligence Layer</div>
                    <div className="text-xs text-[var(--text-3)]">{post.reading_time_minutes} min</div>
                  </div>
                </div>
                <Badge variant={post.status === 'draft' ? 'success' : 'warning'} size="sm">{post.status}</Badge>
              </div>
              <div className="text-[var(--text-1)] mb-2">{post.title}</div>
              <div className="text-sm text-[var(--text-2)] mb-4">{post.excerpt || post.subtitle}</div>
              <MobileButton className="w-full" onClick={() => navigate(`/intel/${post.slug}`)}>
                Abrir dossiê
              </MobileButton>
            </SurfaceCard>
          ))}
        </>
      )}
    </MobilePageShell>
  );
}
