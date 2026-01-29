import { useEffect, useState, useRef, useMemo, useCallback, memo } from "react";
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
import { Button } from "@/shared/components/ui/button";
import { TableOfContents, type ToCItem } from "./components/TableOfContents";

// Helper to extract text from React children
const getText = (node: any): string => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(getText).join('');
    if (node.props?.children) return getText(node.props.children);
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
    h1: ({node, children, ...props}: any) => {
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
    h2: ({node, ...props}: any) => <h4 {...props} className="mt-8 mb-4 text-[1.1875rem] font-medium tracking-tight" />,
    h3: ({node, children, ...props}: any) => {
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
    p: ({node, ...props}: any) => {
        // Check if this paragraph contains an image
        // We need to switch to <div> if it does, because our <img> component returns a <figure>
        // and <figure> cannot be nested inside <p> (HTML validation / hydration error)
        const hasImage = node?.children?.some(
            (child: any) => child.type === 'element' && child.tagName === 'img'
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
    img: ({node, ...props}: any) => (
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
    table: ({node, ...props}: any) => (
        <div className="overflow-x-auto my-8 border border-border/60 rounded-lg shadow-sm">
            <table {...props} className="w-full text-sm text-left border-collapse" />
        </div>
    ),
    thead: ({node, ...props}: any) => (
        <thead {...props} className="bg-muted/50" />
    ),
    th: ({node, ...props}: any) => (
        <th {...props} className="px-6 py-3 font-semibold text-muted-foreground border-b border-border/60 whitespace-nowrap" />
    ),
    tr: ({node, ...props}: any) => (
        <tr {...props} className="border-b border-border/40 hover:bg-muted/30 transition-colors last:border-0 even:bg-muted/5" />
    ),
    td: ({node, ...props}: any) => (
        <td {...props} className="px-6 py-3 align-middle" />
    ),

    // 5. Blockquotes (Notion Callouts & Quotes)
    blockquote: ({node, children, ...props}: any) => (
        <blockquote 
            {...props} 
            className="my-8 p-6 bg-primary/5 border border-primary/20 rounded-2xl shadow-sm text-foreground/90 flex flex-col items-start [&_p]:mb-2 [&_p:first-child]:mb-1 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:leading-normal [&_li]:mb-1"
        >
            {children}
        </blockquote>
    ),
    
    // 6. Lists
    ul: ({node, ...props}: any) => <ul {...props} className="list-outside ml-6 mb-0 space-y-2 marker:text-primary [&_ul]:mt-2 [&_ol]:mt-2 [&_p]:mb-0" />,
    ol: ({node, ...props}: any) => <ol {...props} className="list-decimal list-outside ml-6 mb-0 space-y-3 marker:font-bold marker:text-primary [&_ul]:mt-2 [&_ol]:mt-2 [&_p]:mb-0" />,

    // 7. Inline Code & Code Blocks
    code: ({node, inline, className, children, ...props}: any) => {
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
            <code {...props} className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-sm text-primary font-medium">
                {children}
            </code>
        )
    },
};

// Memoized section component to prevent expensive Markdown re-renders
const MarkdownSection = memo(({ chunk, components }: { chunk: CourseTopic, components: any }) => {
    const sectionId = slugify(chunk.section_title);
    return (
        <div id={sectionId} className="chunk-container relative group scroll-mt-24">
            {/* Section Title */}
            {chunk.section_title && (
                <div className="mb-8 pb-3 border-b border-border/40 flex items-center justify-center">
                    <h2 className="text-[2rem] font-semibold tracking-tight m-0 text-foreground text-center [counter-increment:section] flex items-center justify-center gap-3">
                        <span className="before:content-[counter(section)'.']"></span>
                        {chunk.section_title}
                    </h2>
               </div>
            )}

            <div className="markdown-content">
                <ReactMarkdown 
                    remarkPlugins={[remarkMath, remarkGfm]} 
                    rehypePlugins={[
                        [rehypeKatex, { strict: 'ignore' }],
                        rehypeRaw
                    ]}
                    components={components}
                >
                    {chunk.content}
                </ReactMarkdown>
            </div>
        </div>
    );
});


export default function NotesPage() {
    const { courseId: paramCourseId } = useParams<{ courseId: string }>();
    const { user } = useAuth();
    const [chunks, setChunks] = useState<CourseTopic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Calculate ToC items from chunks + internal H3 headings
    const tocItems: ToCItem[] = useMemo(() => {
        return chunks.flatMap(c => {
            // Level 1: The Chunk Title
            const mainItem: ToCItem = {
                id: slugify(c.section_title),
                title: c.section_title,
                level: 1
            };

            // Level 2: Subheadings inside markdown content
            // We look for Markdown H1 (#) because that's what's used in the content as the next level
            const subItems: ToCItem[] = [];
            const regex = /^\s*#\s+(.+)$/gm;
            let match;
            while ((match = regex.exec(c.content)) !== null) {
                const cleanTitle = match[1].replace(/\*\*/g, '');
                subItems.push({
                    id: slugify(cleanTitle),
                    title: cleanTitle,
                    level: 2
                });
            }

            return [mainItem, ...subItems];
        });
    }, [chunks]);

    // ScrollSpy Logic
    const [activeSection, setActiveSection] = useState<string>("");
    const isManualScrolling = useRef(false);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleSectionClick = useCallback((id: string) => {
        // 1. Lock visibility updates
        isManualScrolling.current = true;
        
        // 2. Set active section immediately for instant UI feedback
        setActiveSection(id);

        // 3. Perform Scroll
        const element = document.getElementById(id);
        if (element) {
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

        // 4. Unlock after animation (approx 1000ms safe bet for long scrolls)
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => {
            isManualScrolling.current = false;
        }, 1000);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                // If we are scrolling manually via click, ignore observer updates
                if (isManualScrolling.current) return;

                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { rootMargin: "-80px 0px -80% 0px" } 
        );

        tocItems.forEach((item) => {
            const el = document.getElementById(item.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [tocItems]);

   // ... fetchNotes effect ...

    useEffect(() => {
        async function fetchNotes() {
            if (!paramCourseId || !user) return;

            setLoading(true);
            const cacheKey = `cached_notes_v4_${paramCourseId}`;

            // --- ADIM 1: TEST SIRASINDA CACHE'İ ATLA ---
            // Sorunu görebilmek için sessionStorage.removeItem(cacheKey) diyebilirsin 
            // veya aşağıdaki cache kontrolünü geçici olarak yorum satırı yapabilirsin.
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    // Cache varsa hemen kullan ve yüklemeyi bitir
                    setChunks(parsed);
                    setLoading(false);
                    return;
                } catch (e) {
                    console.error("Cache parsing error:", e);
                }
            }

            try {
                let targetId = paramCourseId;
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramCourseId);
                
                if (!isUuid) {
                    const resolvedId = await getCourseIdBySlug(paramCourseId);
                    if (!resolvedId) {
                        setError("Ders bulunamadı.");
                        setLoading(false);
                        return;
                    }
                    targetId = resolvedId;
                }


                const data = await getCourseTopics(user.id, targetId);

                const processedData = data.map((chunk, index) => {
                    const metadata = chunk.metadata as any;
                    const imageUrls = metadata?.images || [];
                    
                    let content = chunk.content;

                    // 1. Sanitize invisible characters (User request + LaTeX fix)
                    content = content.replace(/[\u2000-\u200B\u00A0]/g, ' ');

                    // 2. Pre-process HTML blocks (Notion Callouts: aside/blockquote)
                    // We transform them into standard Markdown blockquotes (>) so nested MD works perfectly
                    const blockTags = ['aside', 'blockquote'];
                    blockTags.forEach(tag => {
                        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
                        content = content.replace(regex, (_, inner) => {
                            // Trim and split by line, then prefix each line with '>'
                            const formattedInner = inner
                                .trim()
                                .split('\n')
                                .map((line: string) => `> ${line.trim()}`)
                                .join('\n');
                            return `\n\n${formattedInner}\n\n`;
                        });
                    });

                    // 3. Line-based Robust Table Wrapper
                    // This logic ensures every table separator (|---|) is preceded by a header,
                    // and that the header is preceded by a blank line.
                    const lines = content.split(/\r?\n/);
                    const processedLines: string[] = [];
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        
                        // Detect separator line: |---| or |:---|---:| etc.
                        // Must contain at least one dash, be composed of |, -, :, space
                        // Updated to handle blockquote markers (>) for tables inside callouts
                        const isSeparator = /^(?:>\s*)*\s*\|(?=.*-)[- :|]+\|\s*$/.test(line);

                        if (isSeparator) {
                            const headerIndex = processedLines.length - 1;
                            if (headerIndex >= 0) {
                                const prevContentIndex = headerIndex - 1;
                                if (prevContentIndex >= 0) {
                                    const prevLine = processedLines[prevContentIndex];
                                    if (prevLine.trim() !== '' && prevLine.trim() !== '>') {
                                        // Insert blank line (with blockquote marker if needed)
                                        const quoteMatch = line.match(/^(?:>\s*)+/);
                                        const marker = quoteMatch ? quoteMatch[0] : "";
                                        processedLines.splice(headerIndex, 0, marker);
                                    }
                                }
                            }
                        }
                        processedLines.push(line);
                    }
                    content = processedLines.join('\n');

                    // 4. Image Replacement (was #3 before)
                    content = content.replace(
                        /\[GÖRSEL:\s*(\d+)\]/gi, 
                        (match, p1) => {
                            const index = parseInt(p1, 10);
                            let url = imageUrls[index];
                            return url ? `![Görsel ${index}](${url})` : match;
                        }
                    );

                    return {
                        ...chunk,
                        content
                    };
                });
                setChunks(processedData);
                sessionStorage.setItem(cacheKey, JSON.stringify(processedData));

                if (processedData.length === 0) {
                    setError("Bu derse ait not bulunamadı.");
                } else {
                    setError(null);
                }
            } catch (err) {
                 console.error("Failed to load notes:", err);
                 setError("Notlar yüklenirken bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        }

        fetchNotes();
    }, [paramCourseId, user]);

    // Identify Course Name from first chunk or params if possible (Prop drilling would be better but this is page level)
    const courseName = chunks[0]?.course_name || "Ders Notları";

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto max-w-4xl px-4 py-8">
                 <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Ana Sayfaya Dön
                </Link>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-muted/10 rounded-2xl border border-destructive/20">
                    <AlertCircle className="w-12 h-12 text-destructive mb-4 opacity-50" />
                    <h2 className="text-xl font-bold mb-2">Not Bulunamadı</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Link to="/">
                        <Button>Derslere Dön</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <style>{`
                .chunk-container {
                    counter-reset: subsection;
                }
                .chunk-h3 {
                    counter-increment: subsection;
                    display: flex;
                    align-items: center;
                }
                .chunk-h3::before {
                    content: counter(subsection, lower-alpha) ".";
                    margin-right: 0.5rem;
                }
                /* Nested List Markers */
                .markdown-content ul { list-style-type: disc; }
                .markdown-content ul ul { list-style-type: circle; }
                .markdown-content ul ul ul { list-style-type: square; }
                .markdown-content ul ul ul ul { list-style-type: '□ '; }
            `}</style>

            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
                <div className="container max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                             <div className="p-2 bg-primary/10 rounded-lg text-primary hidden sm:block">
                                <BookOpen className="w-4 h-4" />
                            </div>
                            <h1 className="font-bold text-lg leading-none">
                                {courseName}
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container max-w-[1400px] mx-auto px-4 py-8">
                <div className="grid lg:grid-cols-[350px_1fr] gap-10 items-start">
                    
                    {/* Left: Sticky ToC (Desktop) */}
                    <aside className="hidden lg:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
                        <TableOfContents items={tocItems} activeId={activeSection} onItemClick={handleSectionClick} />
                    </aside>

                    {/* Right: Content */}
                    <article className="min-w-0 max-w-4xl mx-auto space-y-16 [counter-reset:section]">
                        {chunks.map((chunk) => (
                            <MarkdownSection 
                                key={chunk.id} 
                                chunk={chunk} 
                                components={markdownComponents} 
                            />
                        ))}

                         {/* End of Notes */}
                         <div className="mt-20 p-8 border border-dashed border-border rounded-2xl text-center bg-muted/5 transition-all hover:bg-muted/10">
                            <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground font-medium">Bu dersin notlarının sonu.</p>
                            <div className="mt-4 gap-4 flex items-center justify-center">
                                <Link to="/">
                                    <Button variant="outline">Derslere Dön</Button>
                                </Link>
                            </div>
                         </div>
                    </article>
                </div>
            </main>
        </div>
    );
}
