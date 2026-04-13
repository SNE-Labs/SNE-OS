import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { MarkdownArticle } from '../components/blog/MarkdownArticle';
import { intelApi } from '@/services/intel-api';

export function BlogPost() {
  const navigate = useNavigate();
  const { slug = '' } = useParams();
  const postQuery = useQuery({
    queryKey: ['intel-post', slug],
    queryFn: () => intelApi.getPost(slug),
    enabled: Boolean(slug),
  });

  const post = postQuery.data;

  if (postQuery.isLoading) {
    return (
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="mx-auto max-w-4xl py-6">
          <ModuleStateCard tone="loading" title="Carregando resenha" description="Buscando o editorial completo do Intel." />
        </div>
      </div>
    );
  }

  if (postQuery.isError || !post) {
    return (
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="mx-auto max-w-4xl py-6">
          <ModuleStateCard tone="error" title="Post indisponível" description="A resenha pedida não está acessível agora." actionLabel="Voltar ao blog" onAction={() => navigate('/blog')} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-8 py-6 overflow-y-auto">
      <article className="mx-auto max-w-4xl space-y-6">
        <button onClick={() => navigate('/blog')} className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
          <ArrowLeft className="w-4 h-4" />
          Voltar ao blog
        </button>

        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="active">SNE Enterprise Blog</StatusBadge>
            <StatusBadge status="pending">{post.reading_time_minutes} min</StatusBadge>
            <StatusBadge status={post.status === 'draft' ? 'success' : 'warning'}>{post.status}</StatusBadge>
          </div>
          <div className="text-4xl font-semibold text-balance" style={{ color: 'var(--text-1)' }}>{post.title}</div>
          <p className="text-lg" style={{ color: 'var(--text-2)' }}>{post.subtitle}</p>
          <div className="flex flex-wrap gap-2">
            {post.chains.map((chain) => (
              <StatusBadge key={chain} status="active">{chain}</StatusBadge>
            ))}
            {post.topics.map((topic) => (
              <StatusBadge key={topic} status="pending">{topic}</StatusBadge>
            ))}
          </div>
        </header>

        <section
          className="rounded-2xl p-6 space-y-6"
          style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
        >
          {post.tldr.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>TL;DR</div>
              <ul className="space-y-2 list-disc pl-5" style={{ color: 'var(--text-2)' }}>
                {post.tldr.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          <MarkdownArticle markdown={post.body_markdown} className="space-y-6" />
        </section>

        <section
          className="rounded-2xl p-6"
          style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
        >
          <div className="text-xs uppercase tracking-[0.18em] mb-4" style={{ color: 'var(--text-3)' }}>Fontes</div>
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
      </article>
    </div>
  );
}
