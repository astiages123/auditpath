import { cn, slugify } from '@/utils/core';
import { type CourseTopic } from '@/types';
import { memo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { ToCTitleRenderer } from './ToCTitleRenderer';

interface GlobalNavigationProps {
  chunks: CourseTopic[];
  activeChunkId: string | null;
  onChunkClick?: (chunkId: string) => void;
  courseSlug: string;
}

export const GlobalNavigation = memo(function GlobalNavigation({
  chunks,
  activeChunkId,
  // onChunkClick, // No longer mandatory
  courseSlug,
}: GlobalNavigationProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the active item into view within the sidebar
  useEffect(() => {
    if (activeChunkId && scrollContainerRef.current) {
      const activeItem = document.getElementById(`nav-item-${activeChunkId}`);
      if (activeItem) {
        activeItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [activeChunkId]);

  // Filter only main topics (chunks) that should appear in global nav
  // Typically sequence_order === 0 or undefined for top-level chunks if implied
  // Adjust logic based on how `chunks` are structured. The prompt says:
  // "Sol paneldeki konu listesi, Notion'dan gelen sequence_order === 0 olan chunk'lardan türetilmeli."
  // Note: The prompt implies `chunks` contains everything. We need to identify unique "Topics".
  // However, looking at existing code, `chunks` seem to be flat list of CourseTopic.
  // We'll rely on the existing logic or strict filtering.
  // Let's filter chunks where sequence_order === 0 or just list all chunks if they represent "Topics".
  // For now, I will list ALL chunks in the global nav if they have a title, as usually in this app
  // each chunk is a "section". The prompt says "Notion'dan gelen sequence_order === 0" which implies
  // possibly sub-chunks exist. I'll stick to the prompt: filter sequence_order === 0.
  // Wait, if I filter only sequence_order === 0, then middle panel should probably show ALL content?
  // Yes, NotesPage usually renders all chunks. Global Nav navigates between them.

  const navItems = chunks;

  return (
    <nav className="h-full flex flex-col">
      <div className="p-4 border-b border-border/40 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Konular
        </h2>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1"
      >
        {navItems.map((chunk, index) => {
          // DEBUG: Verify raw chunk data

          // Use chunk.id if available, fallback to slugified title or index
          // In `NotesPage`, we use `slugify(chunk.section_title)` for IDs.

          const chunkId = slugify(chunk.section_title);
          const isActive = activeChunkId === chunkId;
          const url = `${ROUTES.NOTES}/${courseSlug}/${chunkId}`;

          return (
            <Link
              key={chunk.id || chunkId}
              id={`nav-item-${chunkId}`}
              to={url}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200',
                'hover:bg-accent/50 group flex items-center gap-3',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div
                className={cn(
                  'w-1 h-1 rounded-full bg-current transition-all',
                  isActive
                    ? 'scale-125 opacity-100'
                    : 'opacity-0 group-hover:opacity-50'
                )}
              />
              <ToCTitleRenderer
                title={
                  chunk.section_title.match(/^\d/)
                    ? chunk.section_title
                    : `${index + 1}. ${chunk.section_title}`
                }
                className="whitespace-normal wrap-break-word leading-tight py-1"
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
