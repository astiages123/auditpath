import { memo, useRef, useEffect } from 'react';
import { PanelRightClose } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { Button } from '@/components/ui/button';
import { ToCTitleRenderer } from './ToCTitleRenderer';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

export interface LocalToCItem {
  /** Başlık ID'si */
  id: string;
  /** Başlığın metni */
  title: string;
  /** Başlığın hiyerarşi seviyesi (1,2,3 vb) */
  level: number;
}

export interface LocalToCProps {
  /** İçindekiler tablosu liste öğeleri */
  items: LocalToCItem[];
  /** Aktif olarak ekranda bulunan (okunmakta olan) yığının id'si */
  activeId: string;
  /** Listeden bir elemana tıklandığında ne olacağı (yumuşak kaydırma) */
  onItemClick: (id: string, e: React.MouseEvent) => void;
  /** Sağ paneli kapatma/açma toggle işlemi */
  onToggle?: () => void;
}

// === BÖLÜM ADI: BİLEŞEN (COMPONENT) ===
// ===========================

/**
 * Sayfa içerisindeki alt başlıkların tamamını listeleyen "İçindekiler" paneli.
 *
 * @param {LocalToCProps} props
 * @returns {React.ReactElement}
 */
export const LocalToC = memo(function LocalToC({
  items,
  activeId,
  onItemClick,
  onToggle,
}: LocalToCProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  // === YARDIMCI MANTIK & EFEKTLER ===

  useEffect(() => {
    try {
      if (!activeId || !containerRef.current) return;
      const activeEl: HTMLElement | null = containerRef.current.querySelector(
        `a[href="#${activeId}"]`
      );
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch (error: unknown) {
      console.error('[LocalToC][activeIdEffect] Hata:', error);
    }
  }, [activeId]);

  // === UI RENDER ===

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Üst Kısım (Header) */}
      <div className="p-4 border-b border-border/30 flex items-center justify-between">
        <h2 className="text-[11px] font-black tracking-[0.2em] text-muted-foreground uppercase">
          BU SAYFADA
        </h2>
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
            onClick={onToggle}
            title="Paneli Kapat"
          >
            <PanelRightClose className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Liste Gövdesi */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-6">
        {items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/30 italic px-4 py-2">
            Alt başlık bulunmuyor.
          </p>
        ) : (
          <nav ref={containerRef} className="relative flex flex-col space-y-1">
            {items.map((item: LocalToCItem) => {
              const isActive: boolean = activeId === item.id;
              const isL2: boolean = item.level === 2;
              const isL3: boolean = item.level === 3;
              const isL4: boolean = item.level >= 4;

              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e: React.MouseEvent) => onItemClick(item.id, e)}
                  className={cn(
                    'group relative flex items-center py-2 px-3 transition-all duration-300 rounded-sm outline-none',
                    isL2 && 'ml-0',
                    isL3 && 'ml-3',
                    isL4 && 'ml-6',
                    isActive
                      ? 'bg-primary/10 text-primary/90'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <ToCTitleRenderer
                      title={item.title}
                      className={cn(
                        'leading-relaxed block w-full whitespace-normal transition-all text-left',
                        isActive
                          ? 'font-semibold text-[12.5px]'
                          : 'font-medium text-[12px]'
                      )}
                    />
                  </div>
                </a>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
});
