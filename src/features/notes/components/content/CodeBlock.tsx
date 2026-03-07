import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { sanitizeHtml } from '@/shared/utils/sanitizers/htmlSanitizer';
import { logger } from '@/utils/logger';

const MermaidDiagram = lazy(() =>
  import('./MermaidDiagram').then((module) => ({
    default: module.MermaidDiagram,
  }))
);

// KaTeX CSS should still be loaded if needed, or we can load it dynamically too
import 'katex/dist/katex.min.css';

export interface CodeBlockProps extends React.HTMLAttributes<HTMLElement> {
  /** Satır içi kod olup olmadığını belirtir */
  inline?: boolean;
}

interface MathRenderResult {
  html: string;
  isDisplay: boolean;
}

/**
 * Markdown içindeki kod bloklarını ve matematiksel ifadeleri (KaTeX)
 * veya Mermaid diyagramlarını render eden bileşen.
 *
 * @param {CodeBlockProps} props - React HTML Attribute props'ları ve ekstra `inline` bayrağı.
 * @returns {React.ReactElement}
 */
export const CodeBlock = ({
  inline,
  className,
  children,
  ...props
}: CodeBlockProps): React.ReactElement => {
  const match: RegExpExecArray | null = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState<boolean>(false);
  const code: string = String(children).replace(/\n$/, '');

  const handleCopy = (): void => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard erişimi başarısız olursa kopyalama durumu güncellenmez.
    }
  };

  const isMath: boolean = !!(
    className?.includes('math') ||
    (match && (match[1] === 'math' || match[1] === 'latex')) ||
    (code.trim().startsWith('$$') && code.trim().endsWith('$$')) ||
    (code.trim().startsWith('$') && code.trim().endsWith('$'))
  );

  const [mathHtml, setMathHtml] = useState<MathRenderResult | null>(null);

  useEffect(() => {
    if (!isMath) return;

    const renderMath = async () => {
      const isDisplay: boolean = !!(
        code.trim().startsWith('$$') ||
        (match && (match[1] === 'math' || match[1] === 'latex'))
      );
      const content: string = code
        .trim()
        .replace(/^(\$\$|\\\[|\\\(|\$)/, '')
        .replace(/(\$\$|\\\]|\\\)|\$)$/, '');

      try {
        const katex = (await import('katex')).default;
        const html: string = katex.renderToString(content, {
          displayMode: isDisplay,
          throwOnError: false,
        });
        setMathHtml({ html: sanitizeHtml(html), isDisplay });
      } catch (error: unknown) {
        logger.error(
          'CodeBlock',
          'renderMath',
          'KaTeX render error:',
          error as Error
        );
      }
    };

    renderMath();
  }, [code, isMath, match]);

  if (isMath) {
    if (!mathHtml) {
      return (
        <div className="my-4 text-center opacity-50">
          Matematik ifadesi yükleniyor...
        </div>
      );
    }
    if (mathHtml.isDisplay) {
      return (
        <div
          className="my-8 text-lg overflow-x-auto text-center"
          dangerouslySetInnerHTML={{ __html: mathHtml.html }}
        />
      );
    }
    return <span dangerouslySetInnerHTML={{ __html: mathHtml.html }} />;
  }

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

  if (match[1] === 'mermaid') {
    return (
      <Suspense
        fallback={
          <div className="my-8 rounded-xl border border-border/50 bg-card p-8 text-center text-foreground/80">
            Diyagram yükleniyor...
          </div>
        }
      >
        <MermaidDiagram code={code} />
      </Suspense>
    );
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
          title="Kodu Kopyala"
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
