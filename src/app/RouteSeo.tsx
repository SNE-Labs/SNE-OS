import { useLocation } from 'react-router-dom';

import { useSeoMeta } from '@/lib/seo/useSeoMeta';

type StaticRouteSeo = {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  robots?: string;
  keywords?: string[];
  structuredData?: Record<string, unknown>;
};

const SITE_ORIGIN = 'https://snelabs.space';

function buildStaticRouteSeo(pathname: string): StaticRouteSeo | null {
  if (pathname === '/' || pathname === '/home') {
    return {
      title: 'SNE OS | Home operacional para Web3 e cripto',
      description:
        'Home do SNE OS com Radar, Intel Brief, contexto de mercado, identidade e leitura operacional multichain em uma única superfície.',
      canonicalPath: '/home',
      image: `${SITE_ORIGIN}/home-share.png`,
      keywords: ['sne os', 'crypto intelligence', 'web3 operating system', 'radar cripto', 'intel brief'],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'SNE OS Home',
        description:
          'Home operacional do SNE OS com Radar, Intel Brief, contexto de mercado, identidade e leitura multichain.',
        url: 'https://snelabs.space/home',
      },
    };
  }

  if (pathname === '/docs') {
    return {
      title: 'Docs | SNE OS',
      description:
        'Documentação do SNE OS com visão geral do sistema, arquitetura, produtos, SDK, contratos e operações de segurança.',
      canonicalPath: '/docs',
      image: `${SITE_ORIGIN}/og-image.png`,
      keywords: ['sne os docs', 'web3 docs', 'crypto infrastructure', 'sne radar', 'sne vault'],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: 'Documentação SNE OS',
        description:
          'Documentação do SNE OS com visão geral do sistema, arquitetura, produtos, SDK, contratos e segurança.',
        url: 'https://snelabs.space/docs',
      },
    };
  }

  if (pathname === '/pricing') {
    return {
      title: 'Pricing | SNE OS',
      description:
        'Planos e acesso ao SNE OS para leitura de mercado, analytics, integrações e infraestrutura operacional Web3.',
      canonicalPath: '/pricing',
      image: `${SITE_ORIGIN}/og-image.png`,
      keywords: ['sne os pricing', 'web3 pricing', 'crypto analytics plans', 'sne vault pricing'],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Pricing SNE OS',
        description:
          'Planos e acesso ao SNE OS para leitura de mercado, analytics, integrações e infraestrutura operacional Web3.',
        url: 'https://snelabs.space/pricing',
      },
    };
  }

  if (pathname === '/status') {
    return {
      title: 'Status | SNE OS',
      description:
        'Status operacional do SNE OS com disponibilidade, latência, incidentes e saúde dos componentes críticos da plataforma.',
      canonicalPath: '/status',
      image: `${SITE_ORIGIN}/og-image.png`,
      keywords: ['sne os status', 'crypto system status', 'uptime web3', 'sne operations'],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Status SNE OS',
        description:
          'Status operacional do SNE OS com disponibilidade, latência, incidentes e saúde dos componentes críticos.',
        url: 'https://snelabs.space/status',
      },
    };
  }

  if (pathname === '/swaps') {
    return {
      title: 'Swaps | SNE OS',
      description:
        'Superficie de execucao do SNE OS para mover, converter e usar USDT em ambiente multichain.',
      canonicalPath: '/swaps',
      image: `${SITE_ORIGIN}/og-image.png`,
      keywords: ['sne os swaps', 'usdt multichain', 'cross-chain usdt', 'digital dollar', 'multichain execution'],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Swaps | SNE OS',
        description:
          'Superficie de execucao do SNE OS para mover, converter e usar USDT em ambiente multichain.',
        url: 'https://snelabs.space/swaps',
      },
    };
  }

  if (pathname === '/pass' || pathname === '/vault' || pathname === '/keys' || pathname === '/secrets') {
    return {
      title: 'SNE OS',
      description: 'Superfície operacional autenticada do SNE OS.',
      canonicalPath: pathname,
      image: `${SITE_ORIGIN}/og-image.png`,
      robots: 'noindex, nofollow, noarchive',
    };
  }

  if (pathname === '/radar' || pathname.startsWith('/radar/')) {
    return {
      title: 'Radar | SNE OS',
      description:
        'Radar do SNE OS para leitura tática de mercado, liquidez, momentum e direção dos principais pares cripto.',
      canonicalPath: pathname,
      image: `${SITE_ORIGIN}/radar-share.png`,
      keywords: ['crypto radar', 'market intelligence', 'bitcoin radar', 'ethereum radar', 'sne radar'],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Radar SNE OS',
        description:
          'Radar do SNE OS para leitura tática de mercado, liquidez, momentum e direção dos principais pares cripto.',
        url: `${SITE_ORIGIN}${pathname}`,
      },
    };
  }

  if (pathname === '/intel' || pathname.startsWith('/intel/topic/') || pathname.startsWith('/intel/chain/') || pathname.startsWith('/intel/asset/')) {
    return {
      title: 'Intel Brief | SNE OS',
      description:
        'Intel Brief do SNE OS com dossiês, briefings e hubs editoriais por tema, chain e asset para contexto operacional cripto.',
      canonicalPath: pathname,
      image: `${SITE_ORIGIN}/intel-share.png`,
      keywords: ['intel brief', 'crypto intelligence', 'web3 intelligence', 'intel cripto', 'sne intel'],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Intel Brief',
        description:
          'Intel Brief do SNE OS com dossiês, briefings e hubs editoriais por tema, chain e asset.',
        url: `${SITE_ORIGIN}${pathname}`,
      },
    };
  }

  return null;
}

export function RouteSeo() {
  const location = useLocation();
  const seo = buildStaticRouteSeo(location.pathname);
  if (!seo) return null;
  return <StaticRouteSeoMeta seo={seo} />;
}

function StaticRouteSeoMeta({ seo }: { seo: StaticRouteSeo }) {
  useSeoMeta({
    title: seo.title,
    description: seo.description,
    canonicalPath: seo.canonicalPath,
    image: seo.image,
    robots: seo.robots ?? 'index, follow',
    keywords: seo.keywords ?? ['sne os', 'web3', 'crypto intelligence'],
    structuredData: seo.structuredData ?? null,
  });
  return null;
}
