"use client";

import { useMemo, useEffect, useState, useRef } from "react";

interface HeadingItem {
    id: string;
    text: string;
    level: 2 | 3 | 4;
    prefix: string; // Added prefix for numbering (A., 1., a.)
}

interface TableOfContentsProps {
    content: string;
    activeId?: string;
    onItemClick?: (id: string) => void;
}

export function TableOfContents({ content, activeId, onItemClick }: TableOfContentsProps) {
    const [currentActiveId, setCurrentActiveId] = useState<string>("");
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Extract h2, h3 and h4 headings from markdown content
    const { items: headings, highestLevel } = useMemo(() => {
        // Regex to capture ##, ### and ####
        const headingRegex = /^(#{2,4})\s+(.+)$/gm;
        const items: HeadingItem[] = [];
        let match;
        let minLevel: number = 4;

        // Counters for numbering
        let h2Count = 0;
        let h3Count = 0;
        let h4Count = 0;

        while ((match = headingRegex.exec(content)) !== null) {
            const level = match[1].length as 2 | 3 | 4;
            const text = match[2].trim();
            const id = text
                .toLowerCase()
                .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, '')
                .replace(/\s+/g, '-');

            if (level < minLevel) minLevel = level;

            let prefix = "";
            if (level === 2) {
                h2Count++;
                h3Count = 0; // Reset sub-counters
                h4Count = 0;
                prefix = `${String.fromCharCode(64 + h2Count)}.`; // A., B., C...
            } else if (level === 3) {
                h3Count++;
                h4Count = 0; // Reset sub-counter
                prefix = `${h3Count}.`; // 1., 2., 3...
            } else if (level === 4) {
                h4Count++;
                prefix = `${String.fromCharCode(96 + h4Count)}.`; // a., b., c...
            }

            items.push({ id, text, level: level as 2 | 3 | 4, prefix });
        }

        return { items, highestLevel: minLevel };
    }, [content]);

    // Set up intersection observer for active section tracking
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleIntersection = (entries: IntersectionObserverEntry[]) => {
            entries.forEach(entry => {
                // We want to track the heading that is most likely the current one.
                // Usually the one that entered the top half of the screen.
                if (entry.isIntersecting) {
                    setCurrentActiveId(entry.target.id);
                }
            });
        };

        // rootMargin matches NoteViewer's scroll-mt-20 (~80px)
        // We use a narrow top field to capture precisely what's at the top.
        const observer = new IntersectionObserver(handleIntersection, {
            rootMargin: '-80px 0% -70% 0%',
            threshold: 0
        });

        observerRef.current = observer;

        // Observe all headings
        headings.forEach(heading => {
            const element = document.getElementById(heading.id);
            if (element) {
                observer.observe(element);
            }
        });

        return () => {
            observer.disconnect();
        };
    }, [headings]);

    const handleClick = (id: string) => {
        // Optimistically set active ID
        setCurrentActiveId(id);
        
        const element = document.getElementById(id);
        if (element) {
            // Respecting scroll-mt-20 in NoteViewer
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        onItemClick?.(id);
    };

    const effectiveActiveId = activeId ?? currentActiveId;

    if (headings.length === 0) {
        return null;
    }

    return (
        <nav className="space-y-4 font-sans">
            <div className="px-3">
                <h2 className="text-xl text-center font-bold text-primary  tracking-normal mb-4">
                    İçindekiler
                </h2>
            </div>
            <ul className="space-y-1">
                {headings.map((heading, index) => {
                    // Indentation level relative to the highest level present in the note
                    const indent = heading.level - highestLevel;
                    const isActive = effectiveActiveId === heading.id;
                    
                    return (
                        <li key={`${heading.id}-${index}`} className="relative">
                            {/* Active Indicator Line */}
                            {isActive && (
                                <div className="absolute left-0 top-1 bottom-1 w-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)] z-10" />
                            )}
                            
                            <button
                                onClick={() => handleClick(heading.id)}
                                style={{
                                    paddingLeft: `${0.75 + indent * 1.25}rem`
                                }}
                                className="w-full text-left group border-none bg-transparent block"
                            >
                                <div className={`
                                    flex items-start px-3 py-2 rounded-lg transition-all duration-200
                                    ${isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-foreground/90 hover:text-foreground/70 hover:bg-zinc-800/50'
                                    }
                                `}>
                                    <span className={`
                                        mr-2 font-mono shrink-0 mt-0.5 text-sm 
                                        ${isActive ? 'text-primary' : 'text-foreground/90 group-hover:text-foreground/70'}
                                    `}>
                                        {heading.prefix}
                                    </span>
                                    <span className={`
                                        leading-tight transition-colors
                                        ${indent === 0 ? 'font-medium' : 'text-sm'}
                                        ${isActive ? 'font-semibold' : ''}
                                    `}>
                                        {heading.text}
                                    </span>
                                </div>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav >
    );
}
