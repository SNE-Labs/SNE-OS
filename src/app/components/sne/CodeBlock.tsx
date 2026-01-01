import { useEffect, useRef } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'text' }: CodeBlockProps) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    // Simple syntax highlighting - could be enhanced with a library later
    if (preRef.current) {
      const codeElement = preRef.current.querySelector('code');
      if (codeElement) {
        // Basic highlighting for common patterns
        let highlighted = code
          .replace(/(\/\/.*$)/gm, '<span style="color: var(--text-3);">$1</span>') // comments
          .replace(/(#.*$)/gm, '<span style="color: var(--text-3);">$1</span>') // comments
          .replace(/("([^"]*)")/g, '<span style="color: var(--accent-orange);">$1</span>') // strings
          .replace(/('([^']*)')/g, '<span style="color: var(--accent-orange);">$1</span>') // strings
          .replace(/\b(const|let|var|function|async|await|import|export|from)\b/g, '<span style="color: var(--accent-orange);">$1</span>') // keywords
          .replace(/\b(npm|install|run|build|dev)\b/g, '<span style="color: var(--accent-orange);">$1</span>') // npm commands
          .replace(/(\$[A-Z_]+)/g, '<span style="color: var(--ok-green);">$1</span>'); // env vars

        codeElement.innerHTML = highlighted;
      }
    }
  }, [code]);

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-1)',
        borderColor: 'var(--stroke-1)',
      }}
    >
      <div
        className="px-4 py-2 border-b flex items-center justify-between"
        style={{
          backgroundColor: 'var(--bg-2)',
          borderColor: 'var(--stroke-1)',
        }}
      >
        <span
          className="text-xs uppercase tracking-wide"
          style={{ color: 'var(--text-3)' }}
        >
          {language}
        </span>
        <button
          className="text-xs px-2 py-1 rounded hover:bg-[var(--bg-3)] transition-colors"
          style={{ color: 'var(--text-3)' }}
          onClick={() => navigator.clipboard.writeText(code)}
        >
          Copy
        </button>
      </div>
      <pre
        ref={preRef}
        className="p-4 overflow-x-auto"
        style={{
          fontSize: 'var(--text-small)',
          lineHeight: 1.5,
          color: 'var(--text-1)',
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}


