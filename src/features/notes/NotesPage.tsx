import React, { useEffect, useState, useRef, memo } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import { ArrowLeft, Loader2, BookOpen, AlertCircle, Copy, Check, ChevronUp } from "lucide-react";
import {
    getCourseTopics,
    type CourseTopic,
    getCourseIdBySlug
} from "@/shared/lib/core/client-db";
import { useAuth } from "@/features/auth";
import { TableOfContents, type ToCItem } from "./components/TableOfContents";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/core/utils";

// --- Helpers ---

const getText = (node: React.ReactNode): string => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(getText).join('');
    if (typeof node === 'object' && node !== null && 'props' in (node as { props?: { children?: React.ReactNode } }) && (node as { props: { children?: React.ReactNode } }).props?.children) {
        return getText((node as { props: { children?: React.ReactNode } }).props.children);
    }
    return '';
};

const stripManualNumbers = (text: string): string => {
    return text.replace(/^[\d.]+\s+/, '');
};

const slugify = (text: string) => {
    return stripManualNumbers(text)
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
};


// Helper to remove only the FIRST occurrence of the bulb emoji in the React tree
const removeFirstBulb = (node: React.ReactNode): React.ReactNode => {
    let found = false;

    const process = (n: React.ReactNode): React.ReactNode => {
        if (found) return n;
        
        if (typeof n === 'string') {
            if (n.includes('💡')) {
                found = true;
                return n.replace('💡', ''); 
            }
            return n;
        }

        if (React.isValidElement(n)) {
            const children = (n.props as { children?: React.ReactNode }).children;
            if (children) {
                return React.cloneElement(
                    n,
                    undefined,
                    React.Children.map(children, process)
                );
            }
        }

        if (Array.isArray(n)) {
            return React.Children.map(n, process);
        }

        return n;
    };

    return React.Children.map(node, process);
};

// --- Custom Components ---

const CodeBlock = ({ inline, className, children, ...props }: { inline?: boolean } & React.HTMLAttributes<HTMLElement>) => {
    const match = /language-(\w+)/.exec(className || '');
    const [copied, setCopied] = useState(false);
    const code = String(children).replace(/\n$/, '');

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (inline || !match) {
        return (
            <code 
                {...props} 
                className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-sm text-primary font-medium border border-border/50"
            >
                {children}
            </code>
        );
    }

    return (
        <div className="relative my-8 rounded-xl overflow-hidden border border-border/50 shadow-lg bg-[#0d1117] group">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                    <span className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground font-mono opacity-70">
                        {match[1]}
                    </span>
                </div>
                <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            </div>
            <div className="p-5 overflow-x-auto">
                <code className={cn(className, "text-sm font-mono leading-relaxed")} {...props}>
                    {children}
                </code>
            </div>
        </div>
    );
};

// Memoized components configuration
const markdownComponents = {
    h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
        const text = getText(children);
        const subId = slugify(stripManualNumbers(text));
        return (
            <h3 id={subId} {...props} className="scroll-mt-32 mt-12 mb-6 text-2xl font-heading font-bold tracking-tight text-amber-400 text-left">
                {children}
            </h3>
        );
    },
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
        const text = getText(children);
        const subId = slugify(stripManualNumbers(text));
        return (
            <h4 id={subId} {...props} className="scroll-mt-32 mt-10 mb-4 text-xl font-heading font-semibold text-amber-400 text-left">
                {children}
            </h4>
        );
    },
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
        const text = getText(children);
        const subId = slugify(stripManualNumbers(text));
        return (
             <h5 id={subId} {...props} className="scroll-mt-32 mt-6 mb-3 text-lg font-heading font-semibold text-amber-400">
                {children}
            </h5>
        );
    },
    p: ({ node, ...props }: { node?: { children?: { type: string; tagName?: string }[] } } & React.HTMLAttributes<HTMLParagraphElement>) => {
        const hasImage = node?.children?.some(
             (child) => child.type === 'element' && child.tagName === 'img'
        );
        const Component = hasImage ? 'div' : 'p';
        return (
            <Component 
                {...props} 
                className={cn(
                    "leading-8 mb-6 text-muted-foreground text-base font-sans font-normal",
                    hasImage && "flex flex-col items-center my-1"
                )}
            />
        );
    },
    img: ({ ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
        <span className="block my-1 w-full text-center">
            <Zoom classDialog="custom-zoom-modal">
                <img 
                    {...props} 
                    className="rounded-xl border border-border/50 shadow-lg w-full max-h-[600px] object-contain bg-background/50 hover:scale-[1.01] transition-transform duration-500 cursor-zoom-in"
                    loading="lazy"
                    alt={props.alt || "Görsel"}
                />
            </Zoom>
             {props.alt && props.alt !== "Görsel" && (
                <span className="block text-center text-sm text-muted-foreground mt-3 italic">
                    {props.alt}
                </span>
            )}
        </span>
    ),
    blockquote: ({ children, ...props }: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => {
        const text = getText(children);
        const isCallout = text.trim().startsWith("💡");

        if (isCallout) {
            const cleanChildren = removeFirstBulb(children);
            
            return (
                <div className="my-8 rounded-xl shadow-sm bg-primary/5 border border-primary/20 flex items-start gap-4 p-5">
                    <div className="shrink-0 bg-primary/10 rounded-lg p-2 flex items-center justify-center">
                        <span className="text-xl leading-none">💡</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-heading text-[11px] font-bold uppercase tracking-widest text-primary/80 mb-2">
                            İNCELEME / ÖRNEK
                        </div>
                        <div className="font-sans text-foreground/90 leading-relaxed text-base [&>p:last-child]:mb-0">
                            {cleanChildren}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <blockquote 
                {...props} 
                className="my-8 pl-6 border-l-4 border-amber-500 text-lg text-foreground/80 bg-muted/30 py-4 pr-4 rounded-r-lg"
            >
                {children}
            </blockquote>
        );
    },
    ul: ({ ...props }: React.HTMLAttributes<HTMLUListElement>) => <ul {...props} className="list-outside ml-6 mb-8 space-y-2 marker:text-primary/70" />,
    ol: ({ ...props }: React.OlHTMLAttributes<HTMLOListElement>) => <ol {...props} className="list-decimal list-outside ml-6 mb-8 space-y-2 marker:text-primary/70 font-medium" />,
    li: ({ children, ...props }: React.LiHTMLAttributes<HTMLLIElement>) => (
        <li {...props} className="pl-1 leading-relaxed text-muted-foreground text-base">
            {children}
        </li>
    ),
    code: CodeBlock,
    table: ({ ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
        <div className="overflow-x-auto my-8 border border-border/50 rounded-xl shadow-md">
            <table {...props} className="w-full text-sm text-left" />
        </div>
    ),
    thead: ({ ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
        <thead {...props} className="bg-muted/50 border-b border-border/50" />
    ),
    th: ({ ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
        <th {...props} className="px-6 py-4 font-heading font-semibold text-foreground" />
    ),
    tr: ({ ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
        <tr {...props} className="border-b border-border/40 hover:bg-muted/30 transition-colors last:border-0" />
    ),
    td: ({ ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
        <td {...props} className="px-6 py-4 align-top text-muted-foreground" />
    ),
};

// Memoized section component to prevent expensive Markdown re-renders
const MarkdownSection = memo(({ chunk, components }: { chunk: CourseTopic, components: typeof markdownComponents }) => {
    const sectionId = slugify(chunk.section_title);
    return (
        <div id={sectionId} className="chunk-container scroll-mt-24 mb-20 last:mb-0">
             {(chunk.sequence_order === 0 || chunk.sequence_order === undefined) && chunk.section_title && (
                <div className="mb-12 pb-6 border-b border-border/40 text-center">
                    <h2 className="text-3xl font-heading font-bold tracking-tight text-amber-500">
                        {chunk.section_title}
                    </h2>
               </div>
            )}
            <article className="prose prose-lg prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }], rehypeRaw]}
                    components={components}
                >
                    {chunk.content}
                </ReactMarkdown>
            </article>
        </div>
    );
});
MarkdownSection.displayName = "MarkdownSection";

export default function NotesPage() {
    const { courseSlug } = useParams<{ courseSlug: string }>();
    const { user } = useAuth();
    const [chunks, setChunks] = useState<CourseTopic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [courseName, setCourseName] = useState("");
    const [toc, setToc] = useState<ToCItem[]>([]);
    const [activeSection, setActiveSection] = useState<string>("");
    const [scrollProgress, setScrollProgress] = useState(0);
    const isProgrammaticScroll = useRef(false);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    // Scroll Progress & Active Section
    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (window.scrollY / totalHeight) * 100;
            setScrollProgress(progress);

            // If we are scrolling via a click, don't let handleScroll override the active ID
            if (isProgrammaticScroll.current) return;
            
            const mainContent = document.querySelector('main');
            if (!mainContent) return;
            
            const sections = mainContent.querySelectorAll('[id]');
            let current = "";
            const offset = 200; // Offset for detection

            sections.forEach((section) => {
                const rect = section.getBoundingClientRect();
                if (rect.top <= offset) {
                    const id = section.getAttribute("id");
                    if (id) current = id;
                }
            });
            
            if (current && current !== activeSection) {
                setActiveSection(current);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, [activeSection]);

    const handleToCClick = (id: string) => {
        // Lock scroll detection
        isProgrammaticScroll.current = true;
        setActiveSection(id);
        
        // Clear previous timeout if any
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        
        // Unlock after scroll animation is likely finished
        scrollTimeout.current = setTimeout(() => {
            isProgrammaticScroll.current = false;
        }, 1000); // Wait 1s for the smooth scroll to finish
    };

    // Fetch Data
    useEffect(() => {
        async function fetchNotes() {
            if (!user?.id || !courseSlug) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const targetId = await getCourseIdBySlug(courseSlug);
                if (!targetId) {
                    setError("Ders bulunamadı.");
                    return;
                }

                const cacheKey = `cached_notes_v6_${targetId}`;
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed.data) {
                        setChunks(parsed.data);
                        setCourseName(parsed.data[0]?.course_name || "");
                        setLoading(false);
                    }
                }

                const data = await getCourseTopics(user.id, targetId);
                const processedData = data.map((chunk) => {
                    const metadata = chunk.metadata as { images?: string[] } | null;
                    const imageUrls = metadata?.images || [];
                    let content = chunk.display_content || chunk.content;
                    
                    // Clean special Unicode space characters that cause KaTeX/Markdown issues
                    content = content.replace(/[\u2000-\u200b]/g, ' ');

                    // Clean manual numbers from headings in the content before rendering
                    // # 1. Introduction -> # Introduction
                    content = content.replace(/^(#+)\s+[\d.]+\s+/gm, '$1 '); 
                    
                    // Replace [GÖRSEL: X] markers with actual markdown images
                    const usedIndices = new Set<number>();
                    imageUrls.forEach((url, idx) => {
                        const marker = new RegExp(`\\[GÖRSEL:\\s*${idx}\\]`, 'gi');
                        if (content.match(marker)) {
                            content = content.replace(marker, `\n\n![Görsel](${url})\n\n`);
                            usedIndices.add(idx);
                        }
                    });

                    // Append unused images ONLY if no markdown images are already present
                    // OR if some images from metadata were not used as markers
                    const unusedImages = imageUrls.filter((_, idx) => !usedIndices.has(idx));
                    if (unusedImages.length > 0 && !content.includes('![')) {
                         content += unusedImages.map(url => `\n\n![Görsel](${url})`).join('');
                    }

                    return {
                        ...chunk,
                        section_title: stripManualNumbers(chunk.section_title),
                        content: content
                    };
                });

                if (processedData.length > 0) {
                    setChunks(processedData);
                    setCourseName(processedData[0].course_name);
                    localStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        data: processedData
                    }));
                } else if (!cached) {
                     setError("Bu ders için henüz içerik bulunmuyor.");
                }
            } catch (err) {
                console.error(err);
                setError("Notlar yüklenirken bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        }
        fetchNotes();
    }, [courseSlug, user?.id]);

    // Build Table of Contents
    useEffect(() => {
        if (chunks.length === 0) return;
        const items: ToCItem[] = [];
        
        chunks.forEach(chunk => {
            if (chunk.section_title && (chunk.sequence_order === 0 || chunk.sequence_order === undefined)) {
                const cleanTitle = chunk.section_title.replace(/\*\*/g, '');
                items.push({
                    id: slugify(chunk.section_title),
                    title: cleanTitle,
                    level: 1
                });
            }
            const lines = chunk.content.split('\n');
            lines.forEach(line => {
                const h1Match = line.match(/^#\s+(.+)$/);
                const h2Match = line.match(/^##\s+(.+)$/);
                const h3Match = line.match(/^###\s+(.+)$/);

                if (h1Match) {
                    const rawTitle = h1Match[1].trim();
                    const cleanTitle = rawTitle.replace(/\*\*/g, '');
                    items.push({ id: slugify(rawTitle), title: cleanTitle, level: 2 });
                } else if (h2Match) {
                    const rawTitle = h2Match[1].trim();
                     const cleanTitle = rawTitle.replace(/\*\*/g, '');
                     items.push({ id: slugify(rawTitle), title: cleanTitle, level: 3 });
                } else if (h3Match) {
                    const rawTitle = h3Match[1].trim();
                    const cleanTitle = rawTitle.replace(/\*\*/g, '');
                    items.push({ id: slugify(rawTitle), title: cleanTitle, level: 4 });
                }
            });
        });

        // Dedupe
        const uniqueItems = items.filter((item, index, self) => 
            index === self.findIndex((t) => (
                t.id === item.id
            ))
        );
        setToc(uniqueItems);
    }, [chunks]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">Ders içeriği hazırlanıyor...</p>
            </div>
        );
    }

    if (error || chunks.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
                <div className="p-4 rounded-full bg-destructive/10 mb-6">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Eyvah!</h1>
                <p className="text-muted-foreground max-w-md mb-8">{error}</p>
                <Button asChild>
                    <Link to="/courses">Derslere Dön</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
            {/* Reading Progress */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
                 <div 
                    className="h-full bg-primary transition-all duration-150 ease-out shadow-[0_0_10px_var(--primary)]"
                    style={{ width: `${scrollProgress}%` }}
                />
            </div>

            {/* Navbar */}
            <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <Link 
                            to="/courses" 
                            className="p-2 -ml-2 rounded-full hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                                Ders Notu
                            </span>
                            <h1 className="text-sm font-semibold truncate text-foreground/90">
                                {courseName}
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-full mx-auto relative flex items-start px-4 lg:px-8">
                 {/* Table of Contents - Desktop Sticky Sidebar */}
                <aside className="hidden xl:block w-80 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar py-4 mr-16">
                     <TableOfContents items={toc} activeId={activeSection} onItemClick={handleToCClick} />
                </aside>

                {/* Main Content */}
                <main className="flex-1 max-w-5xl py-12 md:py-16">
                    {chunks.map((chunk, index) => (
                        <MarkdownSection 
                            key={chunk.id || index} 
                            chunk={chunk} 
                            components={markdownComponents} 
                        />
                    ))}

                    {/* Completion Footer */}
                    <div className="mt-24 pt-12 border-t border-border/50">
                        <div className="bg-muted/20 rounded-2xl p-8 border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-8 text-center sm:text-left">
                             <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className="p-4 rounded-full bg-primary/10 text-primary">
                                    <BookOpen className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-heading font-bold text-xl text-foreground">Tebrikler!</h3>
                                    <p className="text-muted-foreground">Bu bölümü tamamladınız.</p>
                                </div>
                            </div>
                            <Button 
                                size="lg"
                                className="rounded-xl px-8 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30" 
                                asChild
                            >
                                <Link to={`/quiz/${courseSlug}`}>
                                    Sınava Git
                                </Link>
                            </Button>
                        </div>
                    </div>
                </main>
            </div>

            {/* Scroll to Top Button */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={cn(
                    "fixed bottom-8 right-8 p-3 rounded-full bg-amber-500 text-primary-foreground shadow-lg transition-all duration-300 z-50 hover:scale-110 hover:shadow-xl",
                    scrollProgress > 10 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                )}
            >
                <ChevronUp className="w-6 h-6" />
            </button>
        </div>
    );
}
