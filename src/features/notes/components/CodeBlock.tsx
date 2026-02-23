import React, { useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { MermaidDiagram } from './MermaidDiagram';
import { sanitizeHtml } from '@/shared/utils/sanitizers/htmlSanitizer';
import { logger } from '@/utils/logger';

interface CodeBlockProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
}

export const CodeBlock = ({
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle math blocks
  const isMath = !!(
    className?.includes('math') ||
    (match && (match[1] === 'math' || match[1] === 'latex')) ||
    (code.trim().startsWith('$$') && code.trim().endsWith('$$')) ||
    (code.trim().startsWith('$') && code.trim().endsWith('$'))
  );

  const sanitizedHtml = React.useMemo(() => {
    if (!isMath) return null;

    const isDisplay = !!(
      code.trim().startsWith('$$') ||
      (match && (match[1] === 'math' || match[1] === 'latex'))
    );
    const content = code
      .trim()
      .replace(/^(\$\$|\\\[|\\\(|\$)/, '')
      .replace(/(\$\$|\\\]|\\\)|\$)$/, '');

    try {
      const html = katex.renderToString(content, {
        displayMode: isDisplay,
        throwOnError: false,
      });
      return { html: sanitizeHtml(html), isDisplay };
    } catch (err) {
      logger.error('KaTeX fallback render error:', err as Error);
      return null;
    }
  }, [code, isMath, match]);

  if (isMath && sanitizedHtml) {
    if (sanitizedHtml.isDisplay) {
      return (
        <div
          className="my-8 text-lg overflow-x-auto text-center"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml.html }}
        />
      );
    }
    return <span dangerouslySetInnerHTML={{ __html: sanitizedHtml.html }} />;
  }

  // Handle inline code
  if (inline || !match) {
    return (
      <code
        {...props}
        className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-sm text-primary font-medium border border-border/50"
      >
        {children}
      </code>
    );
  }

  // Handle Mermaid diagrams
  if (match[1] === 'mermaid') {
    return <MermaidDiagram code={code} />;
  }

  return (
    <div className="relative my-8 rounded-xl overflow-hidden border border-border/50 shadow-lg bg-card group not-prose">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400/60" />
            <span className="w-2 h-2 rounded-full bg-yellow-400/60" />
            <span className="w-2 h-2 rounded-full bg-green-400/60" />
          </span>
          <span className="ml-2 text-xs text-white/90 font-mono opacity-70">
            {match[1]}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md hover:bg-white/10 text-white/90 hover:text-white transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      <div className="p-5 overflow-x-auto">
        <code
          className={cn(className, 'text-sm font-mono leading-relaxed')}
          {...props}
        >
          {children}
        </code>
      </div>
    </div>
  );
};
