export type ArticleBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'hr' };

export type ArticleTone = 'default' | 'context' | 'watch' | 'action' | 'risk';

export type ArticleSection = {
  id: string;
  title: string | null;
  tone: ArticleTone;
  blocks: ArticleBlock[];
};

export type ArticleDocument = {
  intro: ArticleBlock[];
  sections: ArticleSection[];
  headings: Array<{ id: string; title: string; tone: ArticleTone }>;
  highlights: {
    actions: string[];
    risks: string[];
    watch: string[];
  };
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'secao';
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function detectTone(title: string | null): ArticleTone {
  const normalized = normalizeTitle(title ?? '');
  if (!normalized) return 'default';
  if (/(risco|riscos|ameaca|ameaças|vulnerabilidade|pressao)/.test(normalized)) return 'risk';
  if (/(acao|acoes|ações|proximos passos|implicacoes operacionais|implicacoes|recomendacoes|recomendacao|o que fazer)/.test(normalized)) return 'action';
  if (/(acompanhar|monitorar|watch|vigilancia|vigilancia imediata|pontos de atencao|pontos de atenção)/.test(normalized)) return 'watch';
  if (/(contexto|resumo|panorama|introducao|introdução|visao geral|visão geral)/.test(normalized)) return 'context';
  return 'default';
}

function parseListItems(lines: string[]) {
  const bulletItems = lines
    .map((line) => line.match(/^[-*]\s+(.+)$/)?.[1] ?? line.match(/^\d+\.\s+(.+)$/)?.[1] ?? null)
    .filter((item): item is string => Boolean(item))
    .map((item) => item.trim());

  if (bulletItems.length === lines.length) {
    return bulletItems;
  }

  return null;
}

function parseBlock(rawBlock: string): ArticleBlock | null {
  const trimmed = rawBlock.trim();
  if (!trimmed) return null;
  if (/^-{3,}$/.test(trimmed)) return { type: 'hr' };

  const lines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return null;

  const listItems = parseListItems(lines);
  if (listItems) {
    return { type: 'list', items: listItems };
  }

  return {
    type: 'paragraph',
    text: lines.join(' '),
  };
}

function extractHighlightsFromSections(sections: ArticleSection[]) {
  const result = {
    actions: [] as string[],
    risks: [] as string[],
    watch: [] as string[],
  };

  sections.forEach((section) => {
    const bucket =
      section.tone === 'action'
        ? result.actions
        : section.tone === 'risk'
          ? result.risks
          : section.tone === 'watch'
            ? result.watch
            : null;

    if (!bucket) return;

    section.blocks.forEach((block) => {
      if (block.type === 'list') {
        bucket.push(...block.items);
        return;
      }
      if (block.type === 'paragraph' && bucket.length < 3) {
        bucket.push(block.text);
      }
    });
  });

  result.actions = result.actions.slice(0, 4);
  result.risks = result.risks.slice(0, 4);
  result.watch = result.watch.slice(0, 4);
  return result;
}

export function parseArticleMarkdown(markdown: string): ArticleDocument {
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return {
      intro: [],
      sections: [],
      headings: [],
      highlights: { actions: [], risks: [], watch: [] },
    };
  }

  const rawBlocks = normalized.split(/\n\s*\n/);
  const intro: ArticleBlock[] = [];
  const sections: ArticleSection[] = [];
  let currentSection: ArticleSection | null = null;

  rawBlocks.forEach((rawBlock) => {
    const trimmed = rawBlock.trim();
    if (!trimmed) return;

    const lines = trimmed.split('\n').map((line) => line.trim()).filter(Boolean);
    const headingLine = lines[0] ?? '';

    if (headingLine.startsWith('## ') || headingLine.startsWith('# ')) {
      const title = headingLine.replace(/^#+\s+/, '').trim();
      currentSection = {
        id: slugify(title),
        title,
        tone: detectTone(title),
        blocks: [],
      };
      sections.push(currentSection);

      const remainder = lines.slice(1).join('\n').trim();
      if (remainder) {
        const parsed = parseBlock(remainder);
        if (parsed) currentSection.blocks.push(parsed);
      }
      return;
    }

    const parsed = parseBlock(trimmed);
    if (!parsed) return;

    if (currentSection) {
      currentSection.blocks.push(parsed);
      return;
    }

    intro.push(parsed);
  });

  const headings = sections
    .filter((section) => section.title)
    .map((section) => ({
      id: section.id,
      title: section.title as string,
      tone: section.tone,
    }));

  return {
    intro,
    sections,
    headings,
    highlights: extractHighlightsFromSections(sections),
  };
}
