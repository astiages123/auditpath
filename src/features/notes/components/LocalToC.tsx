'use client';

import { cn } from '@/shared/lib/core/utils';
import { memo } from 'react';
import { ToCTitleRenderer } from './ToCTitleRenderer';

export interface LocalToCItem {
  id: string;
  title: string;
  level: number;
}

interface LocalToCProps {
  items: LocalToCItem[];
  activeId: string;
  onItemClick: (id: string, e: React.MouseEvent) => void;
  parentIndex?: number;
}

export const LocalToC = memo(function LocalToC({
  items,
  activeId,
  onItemClick,
  parentIndex,
}: LocalToCProps) {
  
  // No items? Do not render anything (or render generic message?)
  // Prompt says "On This Page" always visible.
  
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
            <div className="ml-1.5 space-y-1">
              {(() => {
                const counters = [0, 0, 0, 0, 0]; // Supports up to level 5
                
                return items.map((item) => {
                  const isActive = activeId === item.id;
                  
                  // Update counters based on level
                  // We assume base level for LocalToC items starts at level 2 (mapped to index 0)
                  const counterIndex = Math.max(0, item.level - 2);
                  counters[counterIndex]++;
                  // Reset lower levels
                  for (let i = counterIndex + 1; i < counters.length; i++) {
                    counters[i] = 0;
                  }
                  
                  // Build number string (e.g., "1.2.1")
                  const hierarchy = counters.slice(0, counterIndex + 1);
                  if (parentIndex !== undefined) {
                    hierarchy.unshift(parentIndex);
                  }
                  
                  // Escape dots to prevent Markdown list parsing
                  const itemNumber = hierarchy.join('\\.');
                  
                  // Clean existing leading numbers from title to avoid duplicates
                  const cleanTitle = item.title.replace(/^\s*[\d.]+\s*/, '');
                  
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => onItemClick(item.id, e)}
                      className={cn(
                        "group flex items-start py-1.5 pr-2 transition-all duration-200 text-sm border-l-2 -ml-px",
                         // Indentation
                        item.level > 1 && "ml-3", // Simple indentation
                        item.level > 2 && "ml-6",
                        
                        isActive 
                          ? "border-primary text-primary font-medium bg-primary/5" 
                          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                      )}
                      style={{
                          paddingLeft: `${Math.max(0, (item.level - 1) * 12 + 12)}px`
                      }}
                    >
                      <ToCTitleRenderer 
                        title={`${itemNumber}\\. ${cleanTitle}`} 
                        className="leading-tight block w-full whitespace-normal" 
                      />
                    </a>
                  );
                });
              })()}
            </div>
          )}
        </div>
    </div>
  );
});
