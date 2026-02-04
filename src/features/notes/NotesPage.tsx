import { useEffect, useState, useRef, memo } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import { ArrowLeft, Loader2, BookOpen, AlertCircle } from "lucide-react";
import {
    getCourseTopics,
    type CourseTopic,
    getCourseIdBySlug
} from "@/shared/lib/core/client-db";
import { useAuth } from "@/features/auth";
import { TableOfContents, type ToCItem } from "./components/TableOfContents";
import { Button } from "@/shared/components/ui/button";

// Helper to extract text from React children
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

const slugify = (text: string) => {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
};

// Memoized components to prevent re-renders
const markdownComponents = {
    // 1. Headlines
    // Note: Markdown H1 (#) is rendered as HTML H3 and is treated as the subsection (a. b. c.)
    h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
        const subId = slugify(getText(children));
        return (
            <h3 
                id={subId} 
                {...props} 
                className="chunk-h3 mt-10 mb-5 text-[1.5rem] font-semibold tracking-tight text-primary scroll-mt-28"
            >
                {children}
            </h3>
        );
    },
    h2: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h4 {...props} className="mt-8 mb-4 text-[1.1875rem] font-medium tracking-tight" />,
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
        const subId = slugify(getText(children));
        return (
            <h5 
                id={subId} 
                {...props} 
                className="mt-6 mb-3 text-base font-medium scroll-mt-28 opacity-80"
            >
                {children}
            </h5>
        )
    },
    
    // 2. Paragraphs (Line Height)
    p: ({ node, ...props }: { node?: { children?: { type: string; tagName?: string }[] } } & React.HTMLAttributes<HTMLParagraphElement>) => {
        const hasImage = node?.children?.some(
            (child) => child.type === 'element' && child.tagName === 'img'
        );
        
        const Component = hasImage ? 'div' : 'p';
        
        return (
            <Component 
                {...props} 
                className={`leading-8 mb-6 text-foreground/90 text-[1.0625rem] font-normal ${hasImage ? 'flex flex-col items-center' : ''}`}
            />
        );
    },

    // 3. Images (Centered, Rounded, Captioned)
    img: ({ ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
        <figure className="my-10 flex flex-col items-center w-full">
            <img 
                {...props} 
                className="rounded-xl border border-border/50 shadow-lg w-full max-h-[600px] object-contain bg-black/5 dark:bg-white/5"
                loading="lazy"
                alt={props.alt || "Ders görseli"}
            />
        </figure>
    ),

    // 4. Tables (Striped, Minimalist)
    table: ({ ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
        <div className="overflow-x-auto my-8 border border-border/60 rounded-lg shadow-sm">
            <table {...props} className="w-full text-sm text-left border-collapse" />
        </div>
    ),
    thead: ({ ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
        <thead {...props} className="bg-muted/50" />
    ),
    th: ({ ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
        <th {...props} className="px-6 py-3 font-semibold text-muted-foreground border-b border-border/60 whitespace-nowrap" />
    ),
    tr: ({ ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
        <tr {...props} className="border-b border-border/40 hover:bg-muted/30 transition-colors last:border-0 even:bg-muted/5" />
    ),
    td: ({ ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
        <td {...props} className="px-6 py-3 align-middle" />
    ),

    // 5. Blockquotes (Notion Callouts & Quotes)
    blockquote: ({ children, ...props }: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
        <blockquote 
            {...props} 
            className="my-8 p-6 bg-primary/5 border border-primary/20 rounded-2xl shadow-sm text-foreground/90 flex flex-col items-start [&_p]:mb-2 [&_p:first-child]:mb-1 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:leading-normal [&_li]:mb-1"
        >
            {children}
        </blockquote>
    ),
    
    // 6. Lists
    ul: ({ ...props }: React.HTMLAttributes<HTMLUListElement>) => <ul {...props} className="list-outside ml-6 mb-0 space-y-2 marker:text-primary [&_ul]:mt-2 [&_ol]:mt-2 [&_p]:mb-0" />,
    ol: ({ ...props }: React.OlHTMLAttributes<HTMLOListElement>) => <ol {...props} className="list-decimal list-outside ml-6 mb-0 space-y-3 marker:font-bold marker:text-primary [&_ul]:mt-2 [&_ol]:mt-2 [&_p]:mb-0" />,
    li: ({ children, ...props }: React.LiHTMLAttributes<HTMLLIElement>) => (
        <li {...props} className="mb-2 pl-1 leading-relaxed">
            {children}
        </li>
    ),

    // 7. Inline Code & Code Blocks
    code: ({ inline, className, children, ...props }: { inline?: boolean } & React.HTMLAttributes<HTMLElement>) => {
        const match = /language-(\w+)/.exec(className || '')
        return !inline && match ? (
            <div className="relative my-8 rounded-lg overflow-hidden border border-border/50 bg-zinc-950 dark:bg-zinc-900">
                <div className="flex items-center px-4 py-2 border-b border-border/10 bg-white/5 text-xs text-muted-foreground">
                    {match[1]}
                </div>
                <div className="p-4 overflow-x-auto text-sm text-zinc-50 font-mono leading-relaxed">
                    <code className={className} {...props}>
                        {children}
                    </code>
                </div>
            </div>
        ) : (
            <code 
                {...props} 
                className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-sm text-primary font-medium"
            >
                {children}
            </code>
        )
    },
};

// Memoized section component to prevent expensive Markdown re-renders
const MarkdownSection = memo(({ chunk, components }: { chunk: CourseTopic, components: typeof markdownComponents }) => {
    const sectionId = slugify(chunk.section_title);
    return (
        <div id={sectionId} className="chunk-container relative group scroll-mt-24">
            {/* Section Title - Only show for the first chunk in a sequence */}
            {chunk.section_title && (chunk.sequence_order === 0 || chunk.sequence_order === undefined) && (
                <div className="mb-8 pb-3 border-b border-border/40 flex items-center justify-center">
                    <h2 className="text-[2rem] font-semibold tracking-tight m-0 text-foreground text-center [counter-increment:section] flex items-center justify-center gap-3">
                        <span className="before:content-[counter(section)'.']"></span>
                        {chunk.section_title}
                    </h2>
               </div>
            )}
            
            <article className="prose prose-sm md:prose-base max-w-none! prose-headings:scroll-mt-28 prose-p:leading-8 prose-p:mb-6 prose-img:rounded-xl">
                <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex, rehypeRaw]}
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
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeSection, setActiveSection] = useState<string>("");

    // Load notes
    useEffect(() => {
        async function fetchNotes() {
            if (!user?.id || !courseSlug) return;
            
            try {
                setLoading(true);
                
                // Get courseId from slug
                const targetId = await getCourseIdBySlug(courseSlug);
                if (!targetId) {
                    setError("Ders bulunamadı.");
                    setLoading(false);
                    return;
                }

                // Check cache
                const cacheKey = `cached_notes_v4_${targetId}`;
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed.data) {
                        setChunks(parsed.data);
                        setCourseName(parsed.data[0]?.course_name || "");
                        setLoading(false);
                        // Still fetch in background to refresh cache? 
                        // For notes, maybe only if updated_at changed.
                    }
                }

                const data = await getCourseTopics(user.id, targetId);

                const processedData = data.map((chunk) => {
                    const metadata = chunk.metadata as { images?: string[] } | null;
                    const imageUrls = metadata?.images || [];
                    
                    // Use display_content (clean) if available, otherwise fallback to content (overlap)
                    let content = chunk.display_content || chunk.content;
                    
                    // Post-process content to inject images if missing
                    if (imageUrls.length > 0) {
                        // Check if images are already in markdown. If not, append them.
                        const hasImages = content.includes('![');
                        if (!hasImages) {
                            const imagesMarkdown = imageUrls.map(url => `\n\n![Görsel](${url})`).join('');
                            content += imagesMarkdown;
                        } else {
                            // If images exist as generic ![Görsel](), replace with actual URLs from metadata if needed
                            // But usually displaying them at the end is safer if sequence lost.
                            content = content.replace(/!\[(.*?)\]\((.*?)\)/g, (match, p1) => {
                                if (p1 === "Görsel" || !p1) {
                                    return match; // already valid?
                                }
                                return match;
                            });
                        }
                    }

                    return {
                        ...chunk,
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
                } else {
                    setError("Bu ders için henüz içerik bulunmuyor.");
                }
            } catch (err) {
                console.error("Fetch notes error:", err);
                setError("Notlar yüklenirken bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        }

        fetchNotes();
    }, [courseSlug, user?.id]);

    // Build TOC
    useEffect(() => {
        if (chunks.length === 0) return;

        const items: ToCItem[] = [];
        chunks.forEach(chunk => {
            // First chunk in a sequence is a main section
            if (chunk.section_title && (chunk.sequence_order === 0 || chunk.sequence_order === undefined)) {
                items.push({
                    id: slugify(chunk.section_title),
                    title: chunk.section_title,
                    level: 1
                });
            }

            // Extract subheadings from markdown content
            const lines = chunk.content.split('\n');
            lines.forEach(line => {
                if (line.startsWith('## ')) {
                    const title = line.replace('## ', '').trim();
                    items.push({
                        id: slugify(title),
                        title,
                        level: 2
                    });
                }
            });
        });

        // Deduplicate and set
        const seen = new Set();
        const uniqueItems = items.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });

        setToc(uniqueItems);
    }, [chunks]);

    // Track active section on scroll
    useEffect(() => {
        const handleScroll = () => {
            const sections = document.querySelectorAll('[id]');
            let current = "";
            const offset = 120; // threshold

            sections.forEach((section) => {
                const top = section.getBoundingClientRect().top;
                if (top <= offset) {
                    current = section.getAttribute("id") || "";
                }
            });

            if (current) setActiveSection(current);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">Ders içeriği hazırlanıyor...</p>
            </div>
        );
    }

    if (error || chunks.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
                <div className="p-4 rounded-full bg-destructive/10 mb-6">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Eyvah!</h1>
                <p className="text-muted-foreground text-center max-w-md mb-8">
                    {error || "Bu ders için görüntülenecek bir içerik bulamadık."}
                </p>
                <Button asChild>
                    <Link to="/courses">Derslere Dön</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-screen bg-background text-foreground selection:bg-primary/20" ref={containerRef}>
            {/* Minimal Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                        <Link 
                            to="/courses" 
                            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none mb-1">
                                Ders Notu
                            </span>
                            <h1 className="text-base font-semibold truncate leading-none">
                                {courseName}
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-[1400px] mx-auto flex">
                {/* Left Sidebar - TOC */}
                <aside className="hidden lg:block w-72 h-[calc(100vh-64px)] sticky top-16 p-8 border-r border-border/40 overflow-y-auto custom-scrollbar">
                    <TableOfContents items={toc} activeId={activeSection} onItemClick={() => {}} />
                </aside>

                {/* Main Content */}
                <main className="flex-1 px-6 sm:px-12 py-12 lg:py-20 max-w-4xl mx-auto [counter-reset:section]">
                    <div className="space-y-4">
                        {chunks.map((chunk, index) => (
                            <MarkdownSection 
                                key={chunk.id || index} 
                                chunk={chunk} 
                                components={markdownComponents} 
                            />
                        ))}
                    </div>

                    {/* Footer Navigation */}
                    <div className="mt-20 pt-10 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-primary/10">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg leading-tight">Bu bölümü bitirdin!</h3>
                                <p className="text-sm text-muted-foreground">Şimdi öğrendiklerini pekiştirmek için quiz çözebilirsin.</p>
                            </div>
                        </div>
                        <Button className="h-12 px-8 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all font-semibold" asChild>
                            <Link to={`/quiz/${courseSlug}`}>Quize Başla</Link>
                        </Button>
                    </div>
                </main>

                {/* Right Sidebar - Spacer/Meta */}
                <aside className="hidden xl:block w-72 h-[calc(100vh-64px)] sticky top-16 p-8">
                    {/* Placeholder for future features like AI summary or highlights */}
                </aside>
            </div>
        </div>
    );
}
