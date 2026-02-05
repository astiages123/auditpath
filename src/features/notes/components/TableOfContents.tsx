"use client";

import { cn } from "@/shared/lib/core/utils";
import { memo } from "react";

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

export const TableOfContents = memo(function TableOfContents({ items, activeId, onItemClick }: TableOfContentsProps) {
    if (items.length === 0) return null;

    return (
        <nav className="w-full">
            <h4 className="mb-6 text-lg font-bold uppercase tracking-[0.2em] text-foreground/90 text-center border-b border-border/40 pb-4">
                İÇİNDEKİLER
            </h4>
            
            <ul className="space-y-1">
                {items.reduce((acc: { nodes: React.ReactNode[], l2: number, l3: number, l4: number }, item) => {
                    const isActive = activeId === item.id;
                    const isL1 = item.level === 1;
                    const isL2 = item.level === 2;
                    const isL3 = item.level === 3;
                    const isL4 = item.level === 4;
                    
                    if (isL1) {
                        acc.l2 = 0;
                        acc.l3 = 0;
                        acc.l4 = 0;
                    } else if (isL2) {
                        acc.l2 += 1;
                        acc.l3 = 0;
                        acc.l4 = 0;
                    } else if (isL3) {
                        acc.l3 += 1;
                        acc.l4 = 0;
                    } else if (isL4) {
                        acc.l4 += 1;
                    }

                    const label = isL1 
                        ? null 
                        : isL2 
                            ? `${acc.l2}.` 
                            : isL3
                                ? `${acc.l2}.${acc.l3}.`
                                : `${acc.l2}.${acc.l3}.${acc.l4}.`;

                    acc.nodes.push(
                        <li key={item.id}>
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
                                            behavior: 'smooth'
                                        });
                                    }
                                    onItemClick(item.id);
                                }}
                                className={cn(
                                    "flex items-baseline gap-2 py-2 px-0 transition-all duration-200 border-l-[3px] border-transparent select-none pl-3 tracking-tight",
                                    isL1 ? "text-[15px] font-bold mt-4 first:mt-0" : 
                                    isL2 ? "text-[14px] ml-4 font-medium" : 
                                    isL3 ? "text-[13px] ml-9 font-medium" :
                                    "text-[12px] ml-12 font-medium",
                                    isActive
                                        ? "border-l-primary text-amber-300! font-bold bg-linear-to-r from-amber-500/20 to-transparent shadow-sm"
                                        : [
                                            "border-transparent hover:text-foreground hover:bg-muted/30",
                                            isL1 ? "text-amber-400" : "text-foreground/90"
                                        ]
                                )}
                            >
                                {label && (
                                    <span className="shrink-0 font-sans tracking-tight">
                                        {label}
                                    </span>
                                )}
                                <span className="leading-snug whitespace-normal wrap-break-word">
                                    {item.title}
                                </span>
                            </a>
                        </li>
                    );
                    return acc;
                }, { nodes: [], l2: 0, l3: 0, l4: 0 }).nodes}
            </ul>
        </nav>
    );
});
