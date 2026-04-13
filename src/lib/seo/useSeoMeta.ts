import { useEffect } from 'react';

type SeoMetaInput = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  type?: 'website' | 'article';
  robots?: string;
  keywords?: string[];
  structuredData?: Record<string, unknown> | null;
};

const DEFAULT_ORIGIN = 'https://snelabs.space';
const DEFAULT_IMAGE = `${DEFAULT_ORIGIN}/og-image.png`;

function ensureMeta(selector: string, attributes: Record<string, string>) {
  let node = document.head.querySelector<HTMLMetaElement>(selector);
  if (!node) {
    node = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => node?.setAttribute(key, value));
    document.head.appendChild(node);
  }
  return node;
}

function ensureLink(selector: string, rel: string) {
  let node = document.head.querySelector<HTMLLinkElement>(selector);
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', rel);
    document.head.appendChild(node);
  }
  return node;
}

function upsertStructuredData(payload: Record<string, unknown> | null | undefined) {
  const id = 'sne-dynamic-structured-data';
  const existing = document.getElementById(id);
  if (!payload) {
    existing?.remove();
    return;
  }

  const script = existing ?? document.createElement('script');
  script.id = id;
  script.setAttribute('type', 'application/ld+json');
  script.textContent = JSON.stringify(payload);
  if (!existing) {
    document.head.appendChild(script);
  }
}

export function useSeoMeta({
  title,
  description,
  canonicalPath = '/',
  image = DEFAULT_IMAGE,
  type = 'website',
  robots = 'index, follow',
  keywords = [],
  structuredData = null,
}: SeoMetaInput) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const canonicalUrl = canonicalPath.startsWith('http')
      ? canonicalPath
      : `${DEFAULT_ORIGIN}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;

    document.title = title;

    ensureMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
    ensureMeta('meta[name="keywords"]', { name: 'keywords' }).setAttribute('content', keywords.join(', '));
    ensureMeta('meta[name="robots"]', { name: 'robots' }).setAttribute('content', robots);
    ensureMeta('meta[name="googlebot"]', { name: 'googlebot' }).setAttribute('content', robots);

    ensureMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', type);
    ensureMeta('meta[property="og:url"]', { property: 'og:url' }).setAttribute('content', canonicalUrl);
    ensureMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', title);
    ensureMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description);
    ensureMeta('meta[property="og:image"]', { property: 'og:image' }).setAttribute('content', image);

    ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title' }).setAttribute('content', title);
    ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description' }).setAttribute('content', description);
    ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image' }).setAttribute('content', image);

    ensureLink('link[rel="canonical"]', 'canonical').setAttribute('href', canonicalUrl);

    upsertStructuredData(structuredData);
  }, [canonicalPath, description, image, keywords, robots, structuredData, title, type]);
}
