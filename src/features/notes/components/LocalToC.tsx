import { cn } from '@/utils/stringHelpers';
import { memo, useRef, useEffect } from 'react';
import { ToCTitleRenderer } from './ToCTitleRenderer';

export interface LocalToCItem {
  id: string;
  title: string;
  level: number;
}

export interface LocalToCProps {
  items: LocalToCItem[];
  activeId: string;
  onItemClick: (id: string, e: React.MouseEvent) => void;
}

export const LocalToC = memo(function LocalToC({
  items,
  activeId,
  onItemClick,
}: LocalToCProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId || !containerRef.current) return;
    const activeEl = containerRef.current.querySelector(
      `a[href="#${activeId}"]`
    );
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeId]);

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <h2 className="text-sm font-bold tracking-widest text-center text-foreground">
          BU SAYFADA
        </h2>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-6">
        {items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/30 italic px-4 py-2">
            Alt başlık bulunmuyor.
          </p>
        ) : (
          <nav ref={containerRef} className="relative flex flex-col space-y-1">
            {items.map((item) => {
              const isActive = activeId === item.id;
              const isL2 = item.level === 2;
              const isL3 = item.level === 3;
              const isL4 = item.level >= 4;

              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => onItemClick(item.id, e)}
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
