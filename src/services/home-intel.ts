export type HomeIntelItem = {
  id: string;
  title: string;
  title_pt?: string;
  title_original?: string;
  summary?: string;
  summary_pt?: string;
  url: string;
  source: string;
  module: string;
  author?: string;
  points?: number;
  comments?: number;
  category?: string;
  editorial_kind?: string;
  impact?: {
    label: string;
    score: number;
    direction?: string;
  };
  topics?: string[];
  chains?: string[];
  protocols?: string[];
  assets?: string[];
  why_it_matters?: string;
  watch_items?: string[];
};

export type HomeIntelSectionKey = 'market' | 'tech' | 'politica' | 'cripto';

export type HomeIntelSection = {
  key: HomeIntelSectionKey;
  title: string;
  shortTitle: string;
  kicker: string;
  description: string;
  items: HomeIntelItem[];
};

const SECTION_ORDER: HomeIntelSectionKey[] = ['market', 'tech', 'politica', 'cripto'];

const TOPIC_MAP: Record<HomeIntelSectionKey, string[]> = {
  market: ['mercado', 'momentum'],
  tech: ['tech', 'ia'],
  politica: ['politica', 'geopolitica', 'economia', 'identidade'],
  cripto: ['defi', 'infra'],
};

const SECTION_COPY: Record<HomeIntelSectionKey, Omit<HomeIntelSection, 'items'>> = {
  market: {
    key: 'market',
    title: 'Pulso de mercado',
    shortTitle: 'Mercado',
    kicker: 'Fluxo tático',
    description: 'Leituras de preço, liquidez e regime de risco com foco operacional.',
  },
  tech: {
    key: 'tech',
    title: 'Tech e IA',
    shortTitle: 'Tech',
    kicker: 'Produto e stack',
    description: 'Infra, software e movimentos de produto com impacto prático no ecossistema.',
  },
  politica: {
    key: 'politica',
    title: 'Política e Macro',
    shortTitle: 'Política',
    kicker: 'Regra e poder',
    description: 'Regulação, governança, economia e decisões institucionais que mudam o terreno.',
  },
  cripto: {
    key: 'cripto',
    title: 'Cripto e Ecossistema',
    shortTitle: 'Cripto',
    kicker: 'Rede e estrutura',
    description: 'Protocolos, infraestrutura e eventos do ecossistema além do tape intradiário.',
  },
};

function normalizeValue(value?: string | null) {
  return (value ?? '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildSearchText(item: HomeIntelItem) {
  return normalizeValue(
    [
      item.category,
      item.editorial_kind,
      item.title_pt,
      item.title,
      item.title_original,
      item.summary_pt,
      item.summary,
      item.why_it_matters,
      ...(item.topics ?? []),
      ...(item.chains ?? []),
      ...(item.assets ?? []),
    ].join(' ')
  );
}

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

export function classifyHomeIntelItem(item: HomeIntelItem): HomeIntelSectionKey {
  const topics = (item.topics ?? []).map((topic) => normalizeValue(topic));
  const text = buildSearchText(item);

  if (
    normalizeValue(item.category) === 'market' ||
    normalizeValue(item.editorial_kind) === 'briefing' ||
    topics.some((topic) => TOPIC_MAP.market.includes(topic))
  ) {
    return 'market';
  }

  if (topics.some((topic) => TOPIC_MAP.tech.includes(topic)) || includesAny(text, ['openai', 'microsoft', 'app', 'software'])) {
    return 'tech';
  }

  if (
    topics.some((topic) => TOPIC_MAP.politica.includes(topic)) ||
    includesAny(text, ['regul', 'policy', 'sec ', 'governo', 'mandate', 'w3c', 'processa', 'aquisicao'])
  ) {
    return 'politica';
  }

  return 'cripto';
}

export function buildHomeIntelSections(items: HomeIntelItem[]): HomeIntelSection[] {
  const grouped = new Map<HomeIntelSectionKey, HomeIntelItem[]>();
  SECTION_ORDER.forEach((key) => grouped.set(key, []));

  items.forEach((item) => {
    const key = classifyHomeIntelItem(item);
    grouped.get(key)?.push(item);
  });

  return SECTION_ORDER.map((key) => ({
    ...SECTION_COPY[key],
    items: grouped.get(key) ?? [],
  })).filter((section) => section.items.length > 0);
}
