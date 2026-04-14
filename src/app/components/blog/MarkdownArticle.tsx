import { cn } from '../ui/utils';
import { AlertTriangle, Compass, Radar, Sparkles } from 'lucide-react';

import { parseArticleMarkdown, type ArticleBlock, type ArticleSection, type ArticleTone } from './articleParser';

type MarkdownArticleProps = {
  markdown: string;
  className?: string;
  variant?: 'desktop' | 'mobile';
};

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded-md px-1.5 py-0.5 text-[0.92em]"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-1)' }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part ? <span key={index}>{part}</span> : null;
  });
}

function toneConfig(tone: ArticleTone) {
  switch (tone) {
    case 'context':
      return {
        icon: Compass,
        title: 'Contexto',
        panelStyle: {
          background: 'linear-gradient(135deg, rgba(74,144,226,0.10), rgba(255,255,255,0.02))',
          borderColor: 'rgba(74,144,226,0.18)',
        },
      };
    case 'watch':
      return {
        icon: Radar,
        title: 'O que monitorar',
        panelStyle: {
          background: 'linear-gradient(135deg, rgba(255,140,66,0.12), rgba(255,255,255,0.02))',
          borderColor: 'rgba(255,140,66,0.22)',
        },
      };
    case 'action':
      return {
        icon: Sparkles,
        title: 'Ação recomendada',
        panelStyle: {
          background: 'linear-gradient(135deg, rgba(77,201,144,0.12), rgba(255,255,255,0.02))',
          borderColor: 'rgba(77,201,144,0.20)',
        },
      };
    case 'risk':
      return {
        icon: AlertTriangle,
        title: 'Risco principal',
        panelStyle: {
          background: 'linear-gradient(135deg, rgba(224,92,67,0.12), rgba(255,255,255,0.02))',
          borderColor: 'rgba(224,92,67,0.20)',
        },
      };
    default:
      return {
        icon: null,
        title: null,
        panelStyle: null,
      };
  }
}

function renderList(section: ArticleSection, items: string[], variant: 'desktop' | 'mobile') {
  if (section.tone === 'watch' || section.tone === 'action' || section.tone === 'risk') {
    return (
      <div
        className={cn(
          'grid gap-2',
          variant === 'desktop' ? 'md:grid-cols-2' : 'grid-cols-1'
        )}
      >
        {items.map((item, index) => (
          <div
            key={`${section.id}-item-${index}`}
            className="rounded-2xl border px-4 py-3 text-sm leading-6"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.08)',
              color: 'var(--text-2)',
            }}
          >
            {renderInline(item)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="space-y-2 list-disc pl-5" style={{ color: 'var(--text-2)' }}>
      {items.map((item, itemIndex) => (
        <li key={itemIndex}>{renderInline(item)}</li>
      ))}
    </ul>
  );
}

function renderCallout(block: Extract<ArticleBlock, { type: 'callout' }>, variant: 'desktop' | 'mobile', key: string) {
  const config = toneConfig(block.tone);
  const Icon = config.icon ?? Compass;

  return (
    <div
      key={key}
      className={cn(
        'rounded-[24px] border',
        variant === 'desktop' ? 'px-5 py-5 space-y-3' : 'px-4 py-4 space-y-3'
      )}
      style={{
        ...(config.panelStyle ?? {
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
          borderColor: 'rgba(255,255,255,0.10)',
        }),
        borderWidth: '1px',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-1)' }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
          {block.label}
        </div>
      </div>

      {block.text ? (
        <p
          className={cn(variant === 'desktop' ? 'text-[1rem] leading-8' : 'text-[0.96rem] leading-7')}
          style={{ color: 'var(--text-2)' }}
        >
          {renderInline(block.text)}
        </p>
      ) : null}

      {block.items.length > 0 ? renderList({ id: key, title: block.label, tone: block.tone, blocks: [] }, block.items, variant) : null}
    </div>
  );
}

function renderChecklist(block: Extract<ArticleBlock, { type: 'checklist' }>, variant: 'desktop' | 'mobile', key: string) {
  return (
    <div
      key={key}
      className={cn(
        'rounded-[24px] border',
        variant === 'desktop' ? 'px-5 py-5 space-y-3' : 'px-4 py-4 space-y-3'
      )}
      style={{
        background: 'linear-gradient(135deg, rgba(255,140,66,0.10), rgba(255,255,255,0.02))',
        borderColor: 'rgba(255,140,66,0.18)',
        borderWidth: '1px',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--accent-orange)' }}
        >
          <Radar className="h-4 w-4" />
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
          {block.label}
        </div>
      </div>

      <div
        className={cn(
          'grid gap-2',
          variant === 'desktop' ? 'md:grid-cols-2' : 'grid-cols-1'
        )}
      >
        {block.items.map((item, index) => (
          <div
            key={`${key}-${index}`}
            className="rounded-2xl border px-4 py-3 text-sm leading-6"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.08)',
              color: 'var(--text-2)',
            }}
          >
            {renderInline(item)}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderBlock(section: ArticleSection | null, block: ArticleBlock, variant: 'desktop' | 'mobile', key: string) {
  if (block.type === 'hr') {
    return <div key={key} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />;
  }

  if (block.type === 'subheading') {
    return (
      <h3
        key={key}
        className={cn(variant === 'desktop' ? 'text-[1.12rem] leading-7' : 'text-[1rem] leading-6', 'font-semibold tracking-[0.01em]')}
        style={{ color: 'var(--text-1)' }}
      >
        {block.text}
      </h3>
    );
  }

  if (block.type === 'callout') {
    return renderCallout(block, variant, key);
  }

  if (block.type === 'checklist') {
    return renderChecklist(block, variant, key);
  }

  if (block.type === 'list') {
    return <div key={key}>{renderList(section ?? { id: 'intro', title: null, tone: 'default', blocks: [] }, block.items, variant)}</div>;
  }

  return (
    <p
      key={key}
      className={cn(variant === 'desktop' ? 'text-[1.06rem] leading-[1.95]' : 'text-[0.98rem] leading-7')}
      style={{ color: 'var(--text-2)' }}
    >
      {renderInline(block.text)}
    </p>
  );
}

function renderSection(section: ArticleSection, variant: 'desktop' | 'mobile') {
  const config = toneConfig(section.tone);
  const Icon = config.icon;
  const special = Boolean(config.panelStyle);

  return (
    <section
      key={section.id}
      id={section.id}
      className={cn(
        'space-y-4 scroll-mt-28',
        special && (variant === 'desktop' ? 'rounded-[28px] border px-6 py-6' : 'rounded-[24px] border p-5')
      )}
      style={special ? { ...config.panelStyle, borderWidth: '1px' } : undefined}
    >
      {section.title && (
        <div className="space-y-2 mb-1">
          <div className="flex items-center gap-2">
            {Icon && (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-1)' }}
              >
                <Icon className="h-4 w-4" />
              </div>
            )}
            <h2
              className={cn(variant === 'desktop' ? 'text-[1.45rem]' : 'text-[1.18rem]', 'font-semibold')}
              style={{ color: 'var(--text-1)' }}
            >
              {section.title}
            </h2>
          </div>
          {config.title && section.tone !== 'context' && (
            <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
              {config.title}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {section.blocks.map((block, index) => renderBlock(section, block, variant, `${section.id}-${index}`))}
      </div>
    </section>
  );
}

export function MarkdownArticle({ markdown, className, variant = 'desktop' }: MarkdownArticleProps) {
  const document = parseArticleMarkdown(markdown);
  if (!document.intro.length && !document.sections.length) {
    return null;
  }

  const firstParagraphIndex = document.intro.findIndex((block) => block.type === 'paragraph');
  const lede = firstParagraphIndex >= 0 && document.intro[firstParagraphIndex]?.type === 'paragraph'
    ? document.intro[firstParagraphIndex].text
    : '';
  const introBlocks = document.intro.filter((_, index) => index !== firstParagraphIndex);

  return (
    <div className={cn(variant === 'desktop' ? 'space-y-10' : 'space-y-8', className)}>
      {lede && (
        <div
          className={cn(
            'rounded-[26px] border',
            variant === 'desktop' ? 'px-6 py-6 text-[1.14rem] leading-[1.95]' : 'px-5 py-5 text-[1rem] leading-7'
          )}
          style={{
            background: 'linear-gradient(135deg, rgba(255,140,66,0.10), rgba(255,255,255,0.02))',
            borderColor: 'rgba(255,140,66,0.18)',
            color: 'var(--text-1)',
          }}
        >
          {renderInline(lede)}
        </div>
      )}

      {introBlocks.length > 0 && (
        <div className={cn(variant === 'desktop' ? 'space-y-6' : 'space-y-5')}>
          {introBlocks.map((block, index) => renderBlock(null, block, variant, `intro-${index}`))}
        </div>
      )}

      {document.sections.map((section) => renderSection(section, variant))}
    </div>
  );
}
