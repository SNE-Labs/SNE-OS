import { apiGet } from '@/lib/api/http';
import { buildIntelVisualEntities, getIntelPrimaryVisualEntity, type IntelVisualEntity } from './intel-visuals';

const SITE_ORIGIN = 'https://snelabs.space';

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
  countries?: string[];
  visual_entities?: IntelVisualEntity[];
  primary_visual_entity?: IntelVisualEntity | null;
};

export type IntelPostsResponse = {
  items: IntelPost[];
  last_updated: string;
  refreshed_at?: string;
  cache_updated_at?: string | null;
  stale?: boolean;
  refreshing?: boolean;
  total_cached?: number;
  stream?: string;
};

type IntelPostsOptions = {
  limit?: number;
  includeBody?: boolean;
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
  const normalized = {
    ...post,
    tldr: normalizeStringArray(post.tldr),
    topics: normalizeStringArray(post.topics),
    chains: normalizeStringArray(post.chains),
    protocols: normalizeStringArray(post.protocols),
    assets: normalizeStringArray(post.assets),
    countries: normalizeStringArray(post.countries),
    sources: (post.sources ?? []).map((source) => ({
      ...source,
      name: normalizeSourceName(source.name || ''),
    })),
    category,
    editorial_kind: editorialKind,
  };

  return {
    ...normalized,
    visual_entities: buildIntelVisualEntities(normalized),
    primary_visual_entity: getIntelPrimaryVisualEntity(normalized),
  };
}

export function intelSharePath(slug: string) {
  return `/share/intel/${slug}`;
}

export function intelShareUrl(slug: string) {
  return `${SITE_ORIGIN}${intelSharePath(slug)}`;
}

export function intelOgImageUrl(slug: string) {
  return `${SITE_ORIGIN}/api/og/intel/${slug}.png`;
}

export const intelApi = {
  getPosts: async (options: number | IntelPostsOptions = {}): Promise<IntelPostsResponse> => {
    const limit = typeof options === 'number' ? options : options.limit ?? 48;
    const includeBody = typeof options === 'number' ? false : options.includeBody ?? false;
    const normalizedLimit = Math.max(1, Math.min(limit, 240));
    const params = new URLSearchParams({ limit: `${normalizedLimit}` });
    if (includeBody) {
      params.set('include_body', '1');
    }
    const response = await apiGet<IntelPostsResponse>(`/api/intel/posts?${params.toString()}`);
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
