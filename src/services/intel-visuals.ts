export type IntelVisualEntityKind = 'asset' | 'network' | 'protocol' | 'country';
export type IntelVisualEntitySource = 'asset' | 'chain' | 'protocol' | 'country';
export type IntelVisualRouteKind = 'asset' | 'chain' | 'topic';

export type IntelVisualEntity = {
  id: string;
  label: string;
  kind: IntelVisualEntityKind;
  source: IntelVisualEntitySource;
  iconSymbol: string;
  route?: {
    kind: IntelVisualRouteKind;
    value: string;
  };
  inferred?: boolean;
};

export type IntelVisualPostLike = {
  title?: string;
  subtitle?: string;
  excerpt?: string;
  body_markdown?: string;
  topics?: string[];
  chains?: string[];
  protocols?: string[];
  assets?: string[];
  countries?: string[];
};

type CanonicalEntity = {
  id: string;
  label: string;
  kind: IntelVisualEntityKind;
  iconSymbol: string;
  aliases: string[];
};

type CountryRule = {
  id: string;
  aliases: string[];
};

const ENTITY_REGISTRY: CanonicalEntity[] = [
  { id: 'bitcoin', label: 'Bitcoin', kind: 'asset', iconSymbol: 'bitcoin', aliases: ['bitcoin', 'btc', 'xbt'] },
  { id: 'ethereum', label: 'Ethereum', kind: 'network', iconSymbol: 'ethereum', aliases: ['ethereum', 'eth', 'ether', 'erc20'] },
  { id: 'solana', label: 'Solana', kind: 'network', iconSymbol: 'solana', aliases: ['solana', 'sol'] },
  { id: 'base', label: 'Base', kind: 'network', iconSymbol: 'base', aliases: ['base', 'base chain', 'base network'] },
  { id: 'arbitrum', label: 'Arbitrum', kind: 'network', iconSymbol: 'arbitrum', aliases: ['arbitrum', 'arb'] },
  { id: 'optimism', label: 'Optimism', kind: 'network', iconSymbol: 'optimism', aliases: ['optimism', 'op stack', 'op'] },
  { id: 'polygon', label: 'Polygon', kind: 'network', iconSymbol: 'polygon', aliases: ['polygon', 'matic'] },
  { id: 'avalanche', label: 'Avalanche', kind: 'network', iconSymbol: 'avalanche', aliases: ['avalanche', 'avax'] },
  { id: 'cardano', label: 'Cardano', kind: 'network', iconSymbol: 'cardano', aliases: ['cardano', 'ada'] },
  { id: 'chainlink', label: 'Chainlink', kind: 'protocol', iconSymbol: 'chainlink', aliases: ['chainlink', 'link'] },
  { id: 'xrp', label: 'XRP', kind: 'asset', iconSymbol: 'xrp', aliases: ['xrp', 'ripple'] },
  { id: 'sui', label: 'Sui', kind: 'network', iconSymbol: 'sui', aliases: ['sui'] },
  { id: 'dogecoin', label: 'Dogecoin', kind: 'asset', iconSymbol: 'dogecoin', aliases: ['dogecoin', 'doge'] },
  { id: 'usd-coin', label: 'USDC', kind: 'asset', iconSymbol: 'country-us', aliases: ['usdc', 'usd coin', 'circle'] },
  { id: 'tether', label: 'USDT', kind: 'asset', iconSymbol: 'country-us', aliases: ['usdt', 'tether'] },
];

const COUNTRY_REGISTRY: Array<CanonicalEntity & { countryId: string }> = [
  {
    id: 'country-us',
    countryId: 'us',
    label: 'Estados Unidos',
    kind: 'country',
    iconSymbol: 'country-us',
    aliases: ['estados unidos', 'united states', 'u.s.', 'usa', 'eua', 'sec', 'cftc', 'treasury', 'fed'],
  },
  {
    id: 'country-br',
    countryId: 'br',
    label: 'Brasil',
    kind: 'country',
    iconSymbol: 'country-br',
    aliases: ['brasil', 'brazil', 'banco central do brasil', 'copom', 'bcb'],
  },
  {
    id: 'country-ar',
    countryId: 'ar',
    label: 'Argentina',
    kind: 'country',
    iconSymbol: 'country-ar',
    aliases: ['argentina', 'argentine', 'milei'],
  },
  {
    id: 'country-cn',
    countryId: 'cn',
    label: 'China',
    kind: 'country',
    iconSymbol: 'country-cn',
    aliases: ['china', 'chinese', 'beijing', 'pboc'],
  },
  {
    id: 'country-eu',
    countryId: 'eu',
    label: 'Uniao Europeia',
    kind: 'country',
    iconSymbol: 'country-eu',
    aliases: ['uniao europeia', 'união europeia', 'european union', 'euro area', 'ecb', 'bce', 'mica'],
  },
  {
    id: 'country-uk',
    countryId: 'uk',
    label: 'Reino Unido',
    kind: 'country',
    iconSymbol: 'country-uk',
    aliases: ['reino unido', 'united kingdom', 'britain', 'british', 'fca', 'boe'],
  },
  {
    id: 'country-jp',
    countryId: 'jp',
    label: 'Japao',
    kind: 'country',
    iconSymbol: 'country-jp',
    aliases: ['japao', 'japão', 'japan', 'japanese', 'boj'],
  },
  {
    id: 'country-sg',
    countryId: 'sg',
    label: 'Singapura',
    kind: 'country',
    iconSymbol: 'country-sg',
    aliases: ['singapura', 'singapore', 'mas'],
  },
];

const ENTITY_INDEX = new Map<string, CanonicalEntity>();

[...ENTITY_REGISTRY, ...COUNTRY_REGISTRY].forEach((entity) => {
  ENTITY_INDEX.set(normalizeKey(entity.id), entity);
  ENTITY_INDEX.set(normalizeKey(entity.label), entity);
  entity.aliases.forEach((alias) => {
    ENTITY_INDEX.set(normalizeKey(alias), entity);
  });
});

const COUNTRY_RULES: CountryRule[] = COUNTRY_REGISTRY.map((country) => ({
  id: country.countryId,
  aliases: country.aliases,
}));

const SOURCE_PRIORITY: Record<IntelVisualEntitySource, number> = {
  asset: 400,
  chain: 340,
  protocol: 300,
  country: 220,
};

function normalizeKey(value?: string | null) {
  return (value ?? '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeText(value?: string | null) {
  return normalizeKey(value).replace(/[^a-z0-9:/._ -]+/g, ' ');
}

function resolveEntity(value?: string | null) {
  const normalized = normalizeKey(value);
  if (!normalized) return null;
  return ENTITY_INDEX.get(normalized) ?? null;
}

function inferCountries(post: IntelVisualPostLike): string[] {
  const explicit = Array.isArray(post.countries)
    ? post.countries
        .map((country) => {
          const resolved = resolveEntity(country);
          if (resolved && resolved.kind === 'country') {
            return resolved.id.replace(/^country-/, '');
          }
          return normalizeKey(country);
        })
        .filter(Boolean)
    : [];

  if (explicit.length > 0) return [...new Set(explicit)];

  const text = normalizeText(
    [post.title, post.subtitle, post.excerpt, post.body_markdown].filter(Boolean).join(' ')
  );
  if (!text) return [];

  const haystack = ` ${text} `;
  const matches: string[] = [];

  COUNTRY_RULES.forEach((country) => {
    const found = country.aliases.some((alias) => {
      const normalizedAlias = normalizeText(alias);
      return normalizedAlias.includes(' ')
        ? haystack.includes(` ${normalizedAlias} `)
        : haystack.includes(` ${normalizedAlias} `);
    });

    if (found) matches.push(country.id);
  });

  return [...new Set(matches)].slice(0, 2);
}

type CandidateInput = {
  rawValue: string;
  source: IntelVisualEntitySource;
  route?: IntelVisualEntity['route'];
  inferred?: boolean;
};

function candidateScore(source: IntelVisualEntitySource, inferred?: boolean) {
  return SOURCE_PRIORITY[source] - (inferred ? 15 : 0);
}

function addCandidate(
  map: Map<string, IntelVisualEntity & { _score: number }>,
  input: CandidateInput
) {
  const entity = resolveEntity(input.rawValue);
  if (!entity) return;

  const nextScore = candidateScore(input.source, input.inferred);
  const current = map.get(entity.id);
  if (current && current._score > nextScore) return;

  map.set(entity.id, {
    id: entity.id,
    label: entity.label,
    kind: entity.kind,
    source: input.source,
    iconSymbol: entity.iconSymbol,
    route: input.route,
    inferred: input.inferred,
    _score: nextScore,
  });
}

function finalizeEntities(map: Map<string, IntelVisualEntity & { _score: number }>, limit: number) {
  return [...map.values()]
    .sort((left, right) => right._score - left._score || left.label.localeCompare(right.label, 'pt-BR'))
    .slice(0, limit)
    .map(({ _score, ...entity }) => entity);
}

export function buildIntelVisualEntities(post: IntelVisualPostLike, limit: number = 4): IntelVisualEntity[] {
  const map = new Map<string, IntelVisualEntity & { _score: number }>();

  (post.assets ?? []).forEach((asset) => {
    addCandidate(map, {
      rawValue: asset,
      source: 'asset',
      route: { kind: 'asset', value: asset },
    });
  });

  (post.chains ?? []).forEach((chain) => {
    addCandidate(map, {
      rawValue: chain,
      source: 'chain',
      route: { kind: 'chain', value: chain },
    });
  });

  (post.protocols ?? []).forEach((protocol) => {
    addCandidate(map, {
      rawValue: protocol,
      source: 'protocol',
    });
  });

  inferCountries(post).forEach((country) => {
    addCandidate(map, {
      rawValue: `country-${country}`,
      source: 'country',
      inferred: !(post.countries ?? []).length,
    });
  });

  return finalizeEntities(map, limit);
}

export function getIntelPrimaryVisualEntity(post: IntelVisualPostLike) {
  return buildIntelVisualEntities(post, 1)[0] ?? null;
}
