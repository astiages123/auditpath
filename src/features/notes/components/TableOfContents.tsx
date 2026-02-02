"use client";

import { cn } from "@/shared/lib/core/utils";
import { List } from "lucide-react";
import { memo } from "react";

export interface ToCItem {
  id: string; // The HTML id to scroll to
  title: string;
  level?: number; // 1 for H2 (Main), 2 for H3 (Sub)
}

interface TableOfContentsProps {
  items: ToCItem[];
  activeId?: string;
  onItemClick: (id: string) => void;
}

export const TableOfContents = memo(function TableOfContents({ items, activeId, onItemClick }: TableOfContentsProps) {
    if (items.length === 0) return null;

    return (
        <nav className="w-full pr-4 border-r border-border/40 h-full">
            <div className="flex items-center gap-2 mb-4 px-2 text-muted-foreground">
                <List className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">İçindekiler</span>
            </div>
            
            <ul className="space-y-1 relative pl-0">
                {items.reduce((acc: { nodes: React.ReactNode[], l1: number, l2: number }, item) => {
                    const isActive = activeId === item.id;
                    const isSub = item.level === 2;
                    
                    // Simple counter logic within reduce to avoid external state issues in map
                    if (item.level === 1) {
                        acc.l1 += 1;
                        acc.l2 = 0;
                    } else if (item.level === 2) {
                        acc.l2 += 1;
                    }

                    const label = item.level === 1 
                        ? `${acc.l1}.` 
                        : `${String.fromCharCode(96 + acc.l2)}.`;

                    acc.nodes.push(
                        <li key={item.id} className="relative">
                            <a
                                href={`#${item.id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    onItemClick(item.id);
                                }}
                                className={cn(
                                    "flex items-baseline gap-2 py-1.5 transition-all duration-200 rounded-md",
                                    isSub ? "pl-6 text-sm" : "pl-2 text-base font-medium", 
                                    isActive
                                        ? "text-primary bg-primary/10"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                <span className="shrink-0 font-mono w-6 text-right">
                                    {label}
                                </span>
                                <span className="leading-snug">
                                    {item.title}
                                </span>
                            </a>
                        </li>
                    );
                    return acc;
                }, { nodes: [], l1: 0, l2: 0 }).nodes}
            </ul>
        </nav>
    );
});
