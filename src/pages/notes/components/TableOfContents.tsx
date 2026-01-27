"use client";

import { cn } from "@/shared/lib/core/utils";
import { List } from "lucide-react";

interface ToCItem {
  id: string; // The HTML id to scroll to
  title: string;
}

interface TableOfContentsProps {
  items: ToCItem[];
  activeId?: string;
}

export function TableOfContents({ items, activeId }: TableOfContentsProps) {
    if (items.length === 0) return null;

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            // Offset for sticky header
            const offset = 80; 
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    };

    return (
        <nav className="w-full">
            <div className="flex items-center gap-2 mb-4 px-2 text-muted-foreground">
                <List className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">İçindekiler</span>
            </div>
            
            <ul className="space-y-0.5 relative border-l border-border/40 pl-0">
                {items.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                        <li key={item.id} className="relative">
                            <a
                                href={`#${item.id}`}
                                onClick={(e) => scrollToSection(e, item.id)}
                                className={cn(
                                    "block py-1.5 px-4 text-sm transition-all duration-200 border-l-2 -ml-px",
                                    isActive
                                        ? "border-primary text-primary font-medium bg-primary/5 rounded-r-lg"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                                )}
                            >
                                {item.title}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
