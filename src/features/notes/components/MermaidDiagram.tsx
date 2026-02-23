import { useEffect, useState, useRef, memo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { sanitizeHtml } from '@/shared/utils/sanitizers/htmlSanitizer';
import { logger } from '@/utils/logger';

interface MermaidDiagramProps {
  code: string;
}

// Mermaid'i bir kere başlat, her render'da tekrar başlatma
let mermaidInitialized = false;

async function getMermaid() {
  const mermaid = (await import('mermaid')).default;

  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: 'oklch(77.596% 0.14766 79.996)',
        primaryTextColor: 'oklch(92.19% 0 0deg)',
        primaryBorderColor: 'oklch(37.15% 0 0deg)',
        lineColor: 'oklch(82.968% 0.0001 271.152)',
        secondaryColor: 'oklch(26.86% 0 0deg)',
        tertiaryColor: 'oklch(26.86% 0 0deg)',
        background: 'oklch(92.19% 0 0deg)',
        mainBkg: 'oklch(20.46% 0 0deg)',
        fontFamily: 'Poppins, system-ui, sans-serif',
      },
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
      },
    });
    mermaidInitialized = true;
  }

  return mermaid;
}

export const MermaidDiagram = memo(({ code }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim()) return;

      try {
        setIsLoading(true);
        setError(null);

        const mermaid = await getMermaid();

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);
        const sanitizedSvg = sanitizeHtml(renderedSvg);
        setSvg(sanitizedSvg);
      } catch (err) {
        logger.error('Mermaid render error:', err as Error);
        setError('Diyagram render edilemedi');
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [code]);

  if (isLoading) {
    return (
      <div className="my-8 rounded-xl border border-border/50 bg-card p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="ml-3 text-foreground/90">Diyagram yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-8 rounded-xl border border-destructive/50 bg-destructive/10 p-6">
        <div className="flex items-center gap-2 text-destructive mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{error}</span>
        </div>
        <pre className="text-xs text-white/90 overflow-x-auto">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-8 p-6 rounded-xl overflow-x-auto flex justify-center [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});

MermaidDiagram.displayName = 'MermaidDiagram';
