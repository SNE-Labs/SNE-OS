import { apiGet } from '@/lib/api/http';

export type IntelPost = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  body_markdown: string;
  tldr: string[];
  topics: string[];
  chains: string[];
  protocols: string[];
  assets: string[];
  sources: Array<{ name: string; url: string }>;
  status: 'draft' | 'generation_failed';
  generated_at: string;
  reading_time_minutes: number;
  editorial_kind: 'briefing' | 'dossier';
  category?: string;
};

type IntelPostsResponse = {
  items: IntelPost[];
  last_updated: string;
};

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => `${item}`.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const cleaned = value.trim();
    return cleaned ? [cleaned] : [];
  }
  return [];
}

function normalizeSourceName(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'sne enterprise blog') return 'Intel Brief';
  return value;
}

function normalizePost(post: IntelPost): IntelPost {
  const category = post.category || 'news';
  const editorialKind = post.editorial_kind || (category === 'market' ? 'briefing' : 'dossier');
  return {
    ...post,
    tldr: normalizeStringArray(post.tldr),
    topics: normalizeStringArray(post.topics),
    chains: normalizeStringArray(post.chains),
    protocols: normalizeStringArray(post.protocols),
    assets: normalizeStringArray(post.assets),
    sources: (post.sources ?? []).map((source) => ({
      ...source,
      name: normalizeSourceName(source.name || ''),
    })),
    category,
    editorial_kind: editorialKind,
  };
}

export const intelApi = {
  getPosts: async (): Promise<IntelPostsResponse> => {
    const response = await apiGet<IntelPostsResponse>('/api/intel/posts?limit=36');
    return {
      ...response,
      items: (response.items ?? []).map(normalizePost),
    };
  },
  getPost: async (slug: string): Promise<IntelPost> => normalizePost(await apiGet<IntelPost>(`/api/intel/posts/${encodeURIComponent(slug)}`)),
};

export function normalizeIntelRoute(url: string) {
  if (url.startsWith('/intel/')) return url;
  if (url.startsWith('/blog/')) return url.replace('/blog/', '/intel/');
  return url;
}
