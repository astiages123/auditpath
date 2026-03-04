import { memo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PanelLeftClose } from 'lucide-react';
import { cn, slugify } from '@/utils/stringHelpers';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { ROUTES } from '@/utils/routes';
import { Button } from '@/components/ui/button';
import { ToCTitleRenderer } from '@/features/notes/components/navigation/ToCTitleRenderer';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

export interface GlobalNavigationProps {
  /** Ders konu kümeleri */
  chunks: CourseTopic[];
  /** Açıkta olan (aktif) chunk'ın ID'si */
  activeChunkId: string | null;
  /** Dersin veya eğitimin slug (adlandırma) başlığı */
  courseSlug: string;
  /** Konuya tıklandığında tetiklenecek eylem (örneğin mobil menü kapama) */
  onItemClick?: () => void;
  /** Sol menüyü açıp kapamak için (masaüstü gibi) toggle metodu */
  onToggle?: () => void;
}

// === BÖLÜM ADI: BİLEŞEN (COMPONENT) ===
// ===========================

/**
 * Ders içindeki ana konu yığınlarını (chunks) sağlayan global gezinme menüsü.
 * Sol tarafta (Masaüstü) veya çekmecede (Mobil) gösterilir.
 *
 * @param {GlobalNavigationProps} props
 * @returns {React.ReactElement}
 */
export const GlobalNavigation = memo(function GlobalNavigation({
  chunks,
  activeChunkId,
  onItemClick,
  courseSlug,
  onToggle,
}: GlobalNavigationProps): React.ReactElement {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // === YARDIMCI MANTIK & EFEKTLER ===

  // Aktif olan öğeyi yan menü içinde görünecek şekilde kaydırma
  useEffect(() => {
    try {
      if (activeChunkId && scrollContainerRef.current) {
        const activeItem: HTMLElement | null = document.getElementById(
          `nav-item-${activeChunkId}`
        );
        if (activeItem) {
          activeItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }
    } catch (error: unknown) {
      console.error('[GlobalNavigation][scrollIntoView] Hata:', error);
    }
  }, [activeChunkId]);

  // === UI RENDER ===

  return (
    <nav className="h-full flex flex-col">
      <div className="p-4 border-b border-border/30 flex items-center justify-between">
        <h2 className="text-[11px] font-black tracking-[0.2em] text-muted-foreground uppercase">
          KONULAR
        </h2>
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
            onClick={onToggle}
            title="Menüyü Kapat"
          >
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-1 pb-15"
      >
        {chunks.map((chunk: CourseTopic, index: number) => {
          const chunkId: string = slugify(chunk.section_title);
          const isActive: boolean = activeChunkId === chunkId;
          const url: string = `${ROUTES.NOTES}/${courseSlug}/${chunkId}`;
          const weekMatch: RegExpMatchArray | null =
            chunk.id.match(/hafta-(\d+)/);

          return (
            <Link
              key={chunk.id}
              id={`nav-item-${chunkId}`}
              to={url}
              onClick={() => onItemClick?.()}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-3 mx-1 mb-2 rounded-xl transition-all duration-300',
                isActive
                  ? 'bg-primary/10 border border-primary/20 shadow-sm'
                  : 'bg-card border border-transparent hover:bg-white/5 hover:border-white/5'
              )}
            >
              {/* Numara badge */}
              <span
                className={cn(
                  'shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-foreground/10 text-muted-foreground group-hover:bg-foreground/20 group-hover:text-foreground'
                )}
              >
                {index + 1}
              </span>

              <div className="flex-1 min-w-0">
                {courseSlug === 'ATA_584' && weekMatch && (
                  <div className="mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase tracking-wider">
                      {weekMatch[1]}. HAFTA
                    </span>
                  </div>
                )}
                <ToCTitleRenderer
                  title={
                    chunk.section_title.match(/^\d/)
                      ? chunk.section_title.replace(/^\d+\.\s*/, '')
                      : chunk.section_title
                  }
                  className={cn(
                    'leading-tight text-[13px] transition-all font-sans block truncate',
                    isActive
                      ? 'font-bold text-foreground'
                      : 'font-medium text-muted-foreground group-hover:text-foreground'
                  )}
                />
              </div>

              {/* Active glow line */}
              {isActive && (
                <motion.div
                  layoutId="activeNavDot"
                  className="absolute top-3 right-2 w-2 h-2 rounded-full bg-primary"
                  transition={{
                    type: 'spring',
                    bounce: 0,
                    duration: 0.4,
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
