import { useEffect, useState, useRef, memo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { sanitizeHtml } from '@/shared/utils/sanitizers/htmlSanitizer';
import { logger } from '@/utils/logger';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

export interface MermaidDiagramProps {
  /** Mermaid şema kodu (Ham metin) */
  code: string;
}

export interface MermaidDiagramState {
  /** Üretilen SVG markup kodu */
  svg: string;
  /** Hata durumu */
  error: string | null;
  /** Yüklenme durumu */
  isLoading: boolean;
}

// === BÖLÜM ADI: SİSTEM YARDIMCILARI (SINGLETON LOGIC) ===
// ===========================

// Mermaid'i bir kere başlat, her render'da tekrar başlatma
let mermaidInitialized: boolean = false;

/**
 * Asenkron çalışan dinamik mermaid paket yükleyicisi ve tema atayıcısı.
 */
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

// === BÖLÜM ADI: BİLEŞEN (COMPONENT) ===
// ===========================

/**
 * Notlar içerisindeki Mermaid şema kalıplarını dinamik olarak import edip işleyen
 * ve güvenle (XSS denetimi vs) ekrana basan bileşen.
 *
 * @param {MermaidDiagramProps} props
 * @returns {React.ReactElement}
 */
export const MermaidDiagram = memo(function MermaidDiagram({
  code,
}: MermaidDiagramProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<MermaidDiagramState>({
    svg: '',
    error: null,
    isLoading: true,
  });

  // === EFEKTLER (EFFECTS) ===

  useEffect(() => {
    const renderDiagram = async (): Promise<void> => {
      if (!code.trim()) return;

      try {
        setState((prev: MermaidDiagramState) => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        const mermaid = await getMermaid();

        // Çakışmayı engellemek için özgün bir ID tasarlıyoruz
        const diagramId: string = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(diagramId, code);

        const sanitizedSvg: string = sanitizeHtml(renderedSvg);

        setState({ svg: sanitizedSvg, error: null, isLoading: false });
      } catch (err: unknown) {
        console.error('[MermaidDiagram][renderDiagram] Hata:', err);
        logger.error(
          'MermaidDiagram',
          'renderDiagram',
          'Mermaid render error:',
          err as Error
        );
        setState((prev: MermaidDiagramState) => ({
          ...prev,
          error: 'Diyagram render edilemedi.',
          isLoading: false,
        }));
      }
    };

    renderDiagram();
  }, [code]);

  // === UI RENDER ===

  if (state.isLoading) {
    return (
      <div className="my-8 rounded-xl border border-border/50 bg-card p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="ml-3 text-foreground/90">Diyagram yükleniyor...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="my-8 rounded-xl border border-destructive/50 bg-destructive/10 p-6">
        <div className="flex items-center gap-2 text-destructive mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{state.error}</span>
        </div>
        <pre className="text-xs text-white/90 overflow-x-auto">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-8 p-6 rounded-xl overflow-x-auto flex justify-center [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
});
