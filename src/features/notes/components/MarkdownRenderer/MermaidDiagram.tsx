import { useEffect, useState, useRef, memo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { sanitizeHtml } from '@/shared/utils/sanitizeHtml';
import { logger } from '@/shared/utils/logger';

interface MermaidDiagramProps {
  code: string;
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

        // Dynamically import mermaid
        const mermaid = (await import('mermaid')).default;

        // Initialize if not already done (mermaid maintains global state, so re-init is safe or check needed?)
        // Mermaid docs say initialize can be called multiple times but usually once is enough.
        // We can just call it here.
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#f59e0b',
            primaryTextColor: '#fff',
            primaryBorderColor: '#555',
            lineColor: '#888',
            secondaryColor: '#1a1a1a',
            tertiaryColor: '#1a1a1a',
            background: '#ffffff',
            mainBkg: '#1a1a1a',
            fontFamily: 'Poppins, system-ui, sans-serif',
          },
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
          },
        });

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
      <div className="my-8 rounded-xl border border-border/50 bg-[#0d1117] p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="ml-3 text-white/90">Diyagram yükleniyor...</span>
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
