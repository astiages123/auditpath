'use client';

import { cn } from '@/shared/lib/core/utils';
import { memo, useEffect, useRef } from 'react';

export interface ToCItem {
  id: string;
  title: string;
  level?: number;
}

interface TableOfContentsProps {
  items: ToCItem[];
  activeId?: string;
  onItemClick: (id: string) => void;
}

export const TableOfContents = memo(function TableOfContents({
  items,
  activeId,
  onItemClick,
}: TableOfContentsProps) {
  const scrollContainerRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (activeId) {
      const activeElement = document.getElementById(`toc-${activeId}`);
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [activeId]);

  if (items.length === 0) return null;

  return (
    <nav className="w-full">
      <h4 className="mb-6 text-xs font-heading font-bold uppercase tracking-[0.25em] text-primary/80 text-left pl-3">
        İÇİNDEKİLER
      </h4>

      <ul ref={scrollContainerRef} className="space-y-0.5">
        {items.map((item) => {
          const isActive = activeId === item.id;
          const isL1 = item.level === 1;
          const isL2 = item.level === 2;
          const isL3 = item.level === 3;

          return (
            <li key={item.id} id={`toc-${item.id}`}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById(item.id);
                  if (element) {
                    const offset = 100;
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = element.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                      top: offsetPosition,
                      behavior: 'smooth',
                    });
                  }
                  onItemClick(item.id);
                }}
                className={cn(
                  'flex items-baseline gap-2 py-2 px-0 transition-all duration-300 border-l-2 border-transparent select-none pl-4 tracking-tight group',
                  isL1
                    ? 'text-[16px] font-bold mt-8 first:mt-0 text-white'
                    : isL2
                      ? 'text-[15px] ml-4 font-semibold text-white/80'
                      : isL3
                        ? 'text-[14px] ml-8 font-medium text-white/70'
                        : 'text-[12px] ml-12 font-medium text-white/60',
                  isActive
                    ? 'border-l-primary font-bold bg-primary/5 shadow-sm'
                    : 'hover:text-white hover:bg-white/5 hover:border-l-white/20'
                )}
              >
                <span
                  className={cn(
                    'leading-snug whitespace-normal wrap-break-word transition-colors',
                    isActive ? 'text-primary!' : 'text-inherit'
                  )}
                >
                  {item.title}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});
