import { cn } from '@/shared/utils';
import { memo } from 'react';
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
  return (
    <div className="flex flex-col">
      <div className="p-4 border-b border-border/40 bg-background/50 backdrop-blur-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
          Bu Sayfada
        </h2>
      </div>

      <div className="p-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground/50 italic px-2">
            Alt başlık bulunmuyor.
          </p>
        ) : (
          <div className="flex flex-col space-y-1">
            {items.map((item) => {
              const isActive = activeId === item.id;

              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => onItemClick(item.id, e)}
                  className={cn(
                    'group flex items-start py-1.5 pr-2 transition-all duration-200 relative border-l',

                    // Hiyerarşik Girinti (Margin ile elemanı, dolayısıyla border'ı içeri itiyoruz)
                    item.level === 2 && 'ml-0 pl-4 text-sm font-medium',
                    item.level === 3 && 'ml-4 pl-4 text-[0.85rem] font-normal',
                    item.level === 4 && 'ml-8 pl-4 text-[0.8rem] font-light',

                    // Pasif Durum (İnce rehber çizgisi)
                    !isActive &&
                      'border-border/15 text-muted-foreground/60 hover:text-foreground hover:border-muted-foreground/30',

                    // Aktif Durum (Kalın ve renkli çizgi)
                    isActive &&
                      'border-l-2 border-primary text-primary bg-primary/5 z-10'
                  )}
                >
                  <ToCTitleRenderer
                    title={item.title}
                    className="leading-tight block w-full whitespace-normal"
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
