type MarkdownArticleProps = {
  markdown: string;
  className?: string;
};

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part ? <span key={index}>{part}</span> : null;
  });
}

export function MarkdownArticle({ markdown, className }: MarkdownArticleProps) {
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return null;
  }

  const blocks = normalized.split(/\n\s*\n/);

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        if (lines.length === 0) return null;

        if (lines.every((line) => line.startsWith('- '))) {
          return (
            <ul key={index} className="space-y-2 list-disc pl-5" style={{ color: 'var(--text-2)' }}>
              {lines.map((line, itemIndex) => (
                <li key={itemIndex}>{renderInline(line.slice(2))}</li>
              ))}
            </ul>
          );
        }

        if (lines[0].startsWith('## ')) {
          return (
            <section key={index} className="space-y-3">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                {lines[0].slice(3)}
              </h2>
              {lines.slice(1).map((line, lineIndex) => (
                <p key={lineIndex} className="leading-7" style={{ color: 'var(--text-2)' }}>
                  {renderInline(line)}
                </p>
              ))}
            </section>
          );
        }

        if (lines[0].startsWith('# ')) {
          return (
            <h1 key={index} className="text-3xl font-semibold" style={{ color: 'var(--text-1)' }}>
              {lines[0].slice(2)}
            </h1>
          );
        }

        return (
          <div key={index} className="space-y-3">
            {lines.map((line, lineIndex) => (
              <p key={lineIndex} className="leading-7" style={{ color: 'var(--text-2)' }}>
                {renderInline(line)}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
