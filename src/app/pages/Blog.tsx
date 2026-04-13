import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Newspaper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { intelApi } from '@/services/intel-api';

export function Blog() {
  const navigate = useNavigate();
  const postsQuery = useQuery({
    queryKey: ['intel-posts'],
    queryFn: intelApi.getPosts,
    refetchInterval: 60000,
  });

  const posts = postsQuery.data?.items ?? [];
  const featured = posts[0];
  const secondary = posts.slice(1);

  if (postsQuery.isLoading) {
    return (
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="mx-auto max-w-6xl py-6">
          <ModuleStateCard tone="loading" title="Carregando blog enterprise" description="Buscando as resenhas editoriais do Intel." />
        </div>
      </div>
    );
  }

  if (postsQuery.isError) {
    return (
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="mx-auto max-w-6xl py-6">
          <ModuleStateCard tone="error" title="Blog indisponível" description="As resenhas do Intel não carregaram agora." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-8 py-6 overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>Editorial</p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,140,66,0.12)', color: 'var(--accent-orange)' }}>
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-4xl font-semibold" style={{ color: 'var(--text-1)' }}>SNE Enterprise Blog</h1>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>Resenhas completas geradas de forma assíncrona a partir do Intel multichain.</p>
            </div>
          </div>
        </header>

        {!featured ? (
          <ModuleStateCard tone="loading" title="Sem resenhas ainda" description="Assim que o pipeline editorial concluir, os posts vão aparecer aqui." />
        ) : (
          <>
            <button
              onClick={() => navigate(`/blog/${featured.slug}`)}
              className="w-full rounded-2xl p-6 text-left"
              style={{
                background: 'linear-gradient(135deg, rgba(255,140,66,0.1), rgba(255,255,255,0.02))',
                backgroundColor: 'var(--bg-2)',
                borderWidth: '1px',
                borderColor: 'var(--stroke-1)',
              }}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status="active">SNE Enterprise Blog</StatusBadge>
                  <StatusBadge status="pending">{featured.reading_time_minutes} min</StatusBadge>
                </div>
                <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
              </div>
              <div className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>{featured.title}</div>
              <div className="text-base mb-3" style={{ color: 'var(--text-2)' }}>{featured.subtitle}</div>
              <div className="text-sm" style={{ color: 'var(--text-3)' }}>{featured.excerpt || 'Resenha completa disponível.'}</div>
            </button>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {secondary.map((post) => (
                <button
                  key={post.id}
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  className="rounded-xl p-5 text-left"
                  style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <StatusBadge status="active">SNE Enterprise Blog</StatusBadge>
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{post.reading_time_minutes} min</span>
                  </div>
                  <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>{post.title}</div>
                  <div className="text-sm line-clamp-3" style={{ color: 'var(--text-2)' }}>{post.excerpt || post.subtitle}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
