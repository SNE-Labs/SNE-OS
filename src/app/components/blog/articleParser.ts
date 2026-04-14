export type ArticleBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'hr' }
  | { type: 'subheading'; text: string }
  | { type: 'callout'; label: string; tone: ArticleTone; text: string | null; items: string[] }
  | { type: 'checklist'; label: string; items: string[] };

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
    radarChecks: string[];
  };
};

type SpecialBlockDefinition = {
  label: string;
  normalizedLabels: string[];
  type: 'callout' | 'checklist';
  tone: ArticleTone;
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

function normalizeLabel(value: string) {
  return normalizeTitle(value)
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*/g, ':')
    .trim();
}

function detectTone(title: string | null): ArticleTone {
  const normalized = normalizeTitle(title ?? '');
  if (!normalized) return 'default';
  if (/(risco|riscos|ameaca|vulnerabilidade|pressao)/.test(normalized)) return 'risk';
  if (/(acao|acoes|proximos passos|implicacoes operacionais|implicacao para execucao|implicacoes|recomendacoes|recomendacao|o que fazer)/.test(normalized)) return 'action';
  if (/(acompanhar|monitorar|watch|vigilancia|vigilancia imediata|pontos de atencao|o que observar agora|valida no radar)/.test(normalized)) return 'watch';
  if (/(contexto|resumo|panorama|introducao|visao geral|leitura de mercado|o que importa)/.test(normalized)) return 'context';
  return 'default';
}

const specialBlockDefinitions: SpecialBlockDefinition[] = [
  {
    label: 'O que importa',
    normalizedLabels: ['o que importa'],
    type: 'callout',
    tone: 'context',
  },
  {
    label: 'Valida no Radar',
    normalizedLabels: ['valida no radar', 'validacao no radar'],
    type: 'checklist',
    tone: 'watch',
  },
];

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

function parseInlineList(text: string) {
  const items = text
    .split(/\s+-\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length >= 3) {
    return items;
  }

  return null;
}

function isPlainHeadingBlock(lines: string[], hasNextBlock: boolean) {
  if (!hasNextBlock || lines.length !== 1) return false;

  const line = lines[0]?.trim() ?? '';
  if (!line) return false;
  if (line.startsWith('#') || line.startsWith('-') || line.startsWith('*')) return false;
  if (/^\d+\.\s+/.test(line)) return false;
  if (/[.!?:;]$/.test(line)) return false;

  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 12) return false;

  return line.length <= 96;
}

function parseSpecialBlock(lines: string[]): ArticleBlock | null {
  const firstLine = lines[0];
  if (!firstLine) return null;

  const normalizedFirstLine = normalizeLabel(firstLine);
  const definition = specialBlockDefinitions.find((entry) =>
    entry.normalizedLabels.some((label) => normalizedFirstLine === label || normalizedFirstLine.startsWith(`${label}:`))
  );

  if (!definition) return null;

  const colonIndex = firstLine.indexOf(':');
  const inlineRemainder = colonIndex >= 0 ? firstLine.slice(colonIndex + 1).trim() : '';
  const contentLines = [...(inlineRemainder ? [inlineRemainder] : []), ...lines.slice(1).map((line) => line.trim()).filter(Boolean)];
  const listItems = parseListItems(contentLines);

  if (definition.type === 'checklist') {
    const items = (listItems ?? contentLines).map((item) => item.trim()).filter(Boolean);
    return items.length ? { type: 'checklist', label: definition.label, items } : null;
  }

  return {
    type: 'callout',
    label: definition.label,
    tone: definition.tone,
    text: listItems ? null : contentLines.join(' ').trim() || null,
    items: listItems ?? [],
  };
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

  if (lines[0]?.startsWith('### ')) {
    return {
      type: 'subheading',
      text: lines[0].replace(/^###\s+/, '').trim(),
    };
  }

  const specialBlock = parseSpecialBlock(lines);
  if (specialBlock) {
    return specialBlock;
  }

  if (lines.length === 1) {
    const inlineList = parseInlineList(lines[0]);
    if (inlineList) {
      return { type: 'list', items: inlineList };
    }
  }

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
    radarChecks: [] as string[],
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
      if (block.type === 'checklist' && normalizeLabel(block.label).includes('valida no radar')) {
        result.radarChecks.push(...block.items);
        return;
      }

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
  result.radarChecks = result.radarChecks.slice(0, 4);
  return result;
}

export function parseArticleMarkdown(markdown: string): ArticleDocument {
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return {
      intro: [],
      sections: [],
      headings: [],
      highlights: { actions: [], risks: [], watch: [], radarChecks: [] },
    };
  }

  const rawBlocks = normalized.split(/\n\s*\n/);
  const intro: ArticleBlock[] = [];
  const sections: ArticleSection[] = [];
  let currentSection: ArticleSection | null = null;

  rawBlocks.forEach((rawBlock, index) => {
    const trimmed = rawBlock.trim();
    if (!trimmed) return;

    const lines = trimmed.split('\n').map((line) => line.trim()).filter(Boolean);
    const headingLine = lines[0] ?? '';
    const hasNextBlock = index < rawBlocks.length - 1;

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

    if (isPlainHeadingBlock(lines, hasNextBlock)) {
      currentSection = {
        id: slugify(headingLine),
        title: headingLine,
        tone: detectTone(headingLine),
        blocks: [],
      };
      sections.push(currentSection);
      return;
    }

    if (headingLine.startsWith('### ')) {
      const target = currentSection?.blocks ?? intro;
      target.push({
        type: 'subheading',
        text: headingLine.replace(/^###\s+/, '').trim(),
      });

      const remainder = lines.slice(1).join('\n').trim();
      if (remainder) {
        const parsed = parseBlock(remainder);
        if (parsed) target.push(parsed);
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
