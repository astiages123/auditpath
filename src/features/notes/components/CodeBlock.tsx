import React, { lazy, Suspense, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { sanitizeHtml } from '@/shared/utils/sanitizers/htmlSanitizer';
import { logger } from '@/utils/logger';
const MermaidDiagram = lazy(() =>
  import('./MermaidDiagram').then((module) => ({
    default: module.MermaidDiagram,
  }))
);

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

export interface CodeBlockProps extends React.HTMLAttributes<HTMLElement> {
  /** Satır içi kod olup olmadığını belirtir */
  inline?: boolean;
}

// === BÖLÜM ADI: RENDER YARDIMCILARI ===
// ===========================

interface MathRenderResult {
  html: string;
  isDisplay: boolean;
}

// === BÖLÜM ADI: BİLEŞEN (COMPONENT) ===
// ===========================

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

  // === RENDER İŞ MANTIĞI ===

  const handleCopy = (): void => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error: unknown) {
      console.error('[CodeBlock][handleCopy] Hata:', error);
    }
  };

  const isMath: boolean = !!(
    className?.includes('math') ||
    (match && (match[1] === 'math' || match[1] === 'latex')) ||
    (code.trim().startsWith('$$') && code.trim().endsWith('$$')) ||
    (code.trim().startsWith('$') && code.trim().endsWith('$'))
  );

  const sanitizedHtml: MathRenderResult | null = React.useMemo(() => {
    if (!isMath) return null;

    const isDisplay: boolean = !!(
      code.trim().startsWith('$$') ||
      (match && (match[1] === 'math' || match[1] === 'latex'))
    );
    const content: string = code
      .trim()
      .replace(/^(\$\$|\\\[|\\\(|\$)/, '')
      .replace(/(\$\$|\\\]|\\\)|\$)$/, '');

    try {
      const html: string = katex.renderToString(content, {
        displayMode: isDisplay,
        throwOnError: false,
      });
      return { html: sanitizeHtml(html), isDisplay };
    } catch (error: unknown) {
      console.error('[CodeBlock][sanitizedHtml] KaTeX render hatası:', error);
      logger.error(
        'CodeBlock',
        'sanitizedHtml',
        'KaTeX fallback render error:',
        error as Error
      );
      return null;
    }
  }, [code, isMath, match]);

  // === UI RENDER ===

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
