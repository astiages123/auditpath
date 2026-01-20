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
                if (entry.isIntersecting) {
                    setCurrentActiveId(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersection, {
            rootMargin: '-20% 0% -35% 0%',
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
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        onItemClick?.(id);
    };

    const effectiveActiveId = activeId ?? currentActiveId;

    if (headings.length === 0) {
        return null;
    }

    return (
        <nav className="space-y-2 font-sans">
            <h2 className="text-xl font-semibold text-zinc-300 text-center uppercase tracking-wider mb-4 pb-2 border-b border-zinc-800">
                İçindekiler
            </h2>
            <ul className="space-y-1">
                {headings.map((heading, index) => {
                    // Indentation level relative to the highest level present in the note
                    const indent = heading.level - highestLevel;
                    
                    return (
                        <li key={`${heading.id}-${index}`}>
                            <button
                                onClick={() => handleClick(heading.id)}
                                style={{
                                    paddingLeft: `${0.75 + indent * 1.5}rem`
                                }}
                                className="w-full text-left group border-none bg-transparent block"
                            >
                                <div className={`
                                    flex items-start px-3 py-1.5 rounded-lg
                                    ${effectiveActiveId === heading.id
                                        ? 'bg-accent text-foreground shadow-lg'
                                        : 'group-hover:bg-accent group-hover:text-foreground text-zinc-300'
                                    }
                                `}>
                                    <span className="mr-2 font-sans shrink-0 mt-0.5 text-sm">
                                        {heading.prefix}
                                    </span>
                                    <span className={`
                                        ${indent === 0 
                                            ? 'font-semibold' 
                                            : 'text-sm'}
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
