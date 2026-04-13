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

function normalizePost(post: IntelPost): IntelPost {
  return {
    ...post,
    tldr: normalizeStringArray(post.tldr),
    topics: normalizeStringArray(post.topics),
    chains: normalizeStringArray(post.chains),
    protocols: normalizeStringArray(post.protocols),
    assets: normalizeStringArray(post.assets),
  };
}

export const intelApi = {
  getPosts: async (): Promise<IntelPostsResponse> => {
    const response = await apiGet<IntelPostsResponse>('/api/intel/posts');
    return {
      ...response,
      items: (response.items ?? []).map(normalizePost),
    };
  },
  getPost: async (slug: string): Promise<IntelPost> => normalizePost(await apiGet<IntelPost>(`/api/intel/posts/${encodeURIComponent(slug)}`)),
};

export function normalizeIntelRoute(url: string) {
  if (url.startsWith('/blog/')) return url;
  if (url.startsWith('/intel/')) return url.replace('/intel/', '/blog/');
  return url;
}
