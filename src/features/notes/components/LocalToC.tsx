import { cn } from '@/utils/stringHelpers';
import { memo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ToCTitleRenderer } from './ToCTitleRenderer';
import { Clock } from 'lucide-react';

export interface LocalToCItem {
  id: string;
  title: string;
  level: number;
}

export interface LocalToCProps {
  items: LocalToCItem[];
  activeId: string;
  onItemClick: (id: string, e: React.MouseEvent) => void;
  readingTimeMinutes?: number;
}

export const LocalToC = memo(function LocalToC({
  items,
  activeId,
  onItemClick,
  readingTimeMinutes,
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
    <div className="flex flex-col overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="p-10 border-b border-border/30">
        <h2 className="text-sm font-bold uppercase tracking-normal text-center text-foreground">
          Bu Sayfada
        </h2>
        {readingTimeMinutes && readingTimeMinutes > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Clock className="size-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              ~{readingTimeMinutes} dk okuma
            </span>
          </div>
        )}
      </div>

      {/* List */}
      <div className="p-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground/40 italic px-2">
            Alt başlık bulunmuyor.
          </p>
        ) : (
          <div ref={containerRef} className="relative flex flex-col">
            {/* Dikey sürekli çizgi */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/50" />

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
                    'group relative flex items-start gap-3 py-2 pr-2 transition-all duration-200 rounded-md',
                    isL2 && 'pl-6',
                    isL3 && 'pl-10',
                    isL4 && 'pl-14',
                    isActive
                      ? 'text-foreground'
                      : 'text-foreground/90 hover:text-primary'
                  )}
                >
                  {/* Dot — çizgi üzerinde */}
                  <span className="absolute left-[4px] top-[10px] flex items-center justify-center w-[7px] h-[7px]">
                    {isActive ? (
                      <motion.span
                        layoutId="activeToCDot"
                        className="block w-[7px] h-[7px] rounded-full bg-primary/70"
                        transition={{
                          type: 'spring',
                          bounce: 0.2,
                          duration: 0.4,
                        }}
                      />
                    ) : (
                      <span className="block w-[5px] h-[5px] rounded-full bg-foreground/20 group-hover:bg-foreground/40 transition-colors" />
                    )}
                  </span>

                  <ToCTitleRenderer
                    title={item.title}
                    className={cn(
                      'leading-snug block w-full whitespace-normal transition-all',
                      isActive ? 'font-semibold' : 'font-normal',
                      isL2 && 'text-[14px]',
                      isL3 && 'text-[13px]',
                      isL4 && 'text-[12.5px]'
                    )}
                  />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
