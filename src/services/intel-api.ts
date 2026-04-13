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

export const intelApi = {
  getPosts: (): Promise<IntelPostsResponse> => apiGet('/api/intel/posts'),
  getPost: (slug: string): Promise<IntelPost> => apiGet(`/api/intel/posts/${encodeURIComponent(slug)}`),
};

export function normalizeIntelRoute(url: string) {
  if (url.startsWith('/blog/')) return url;
  if (url.startsWith('/intel/')) return url.replace('/intel/', '/blog/');
  return url;
}
