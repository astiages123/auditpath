import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ArrowLeft, Loader2, BookOpen, AlertCircle } from "lucide-react";
import {
    getCourseTopics,
    type CourseTopic,
    getCourseIdBySlug
} from "@/shared/lib/core/client-db";
import { useAuth } from "@/features/auth";
import { Button } from "@/shared/components/ui/button";
import { GenerateQuestionButton } from "@/features/quiz/components/GenerateQuestionButton";
import { TableOfContents } from "./components/TableOfContents";

export default function NotesPage() {
    const { courseId: paramCourseId } = useParams<{ courseId: string }>();
    const { user } = useAuth();
    const [chunks, setChunks] = useState<CourseTopic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Prepare ToC items (Safe to calculate early, chunks starts empty)
    const tocItems = chunks
        .filter(c => c.section_title)
        .map(c => ({
            id: c.section_title.replace(/\s+/g, '-').toLowerCase(), // Simple slugify
            title: c.section_title
        }));

    // ScrollSpy Logic
    const [activeSection, setActiveSection] = useState<string>("");

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { rootMargin: "-10% 0px -80% 0px" } // Trigger when element is near top
        );

        tocItems.forEach((item) => {
            const el = document.getElementById(item.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [tocItems]);

    useEffect(() => {
        async function fetchNotes() {
            if (!paramCourseId || !user) return;

            setLoading(true);
            try {
                let targetId = paramCourseId;

                // If param looks like a slug (not a UUID), resolve it
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
                setChunks(data);
                if (data.length === 0) {
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
                <div className="grid lg:grid-cols-[260px_1fr] gap-10 items-start">
                    
                    {/* Left: Sticky ToC (Desktop) */}
                    <aside className="hidden lg:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
                        <TableOfContents items={tocItems} activeId={activeSection} />
                    </aside>

                    {/* Right: Content */}
                    <article className="min-w-0 max-w-4xl mx-auto space-y-16">
                        {chunks.map((chunk, index) => {
                             const sectionId = chunk.section_title.replace(/\s+/g, '-').toLowerCase();
                             return (
                                <div key={chunk.id} id={sectionId} className="relative group scroll-mt-24">
                                    {/* Section Title (Hidden if needed, but usually good for context) */}
                                    {chunk.section_title && (
                                        <div className="mb-6 pb-2 border-b border-border/40 flex items-center justify-between">
                                            <h2 className="text-3xl font-extrabold tracking-tight m-0 text-foreground">
                                                {chunk.section_title}
                                            </h2>
                                            {/* Action Buttons for this section */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <GenerateQuestionButton chunkId={chunk.id} />
                                            </div>
                                       </div>
                                    )}

                                    {/* Markdown Content */}
                                    <div className="markdown-content">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkMath]} 
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                // 1. Headlines
                                                h1: ({...props}) => <h3 {...props} className="mt-8 mb-4 text-2xl font-bold tracking-tight text-primary" />,
                                                h2: ({...props}) => <h4 {...props} className="mt-6 mb-3 text-xl font-semibold tracking-tight" />,
                                                h3: ({...props}) => <h5 {...props} className="mt-4 mb-2 text-lg font-medium" />,
                                                
                                                // 2. Paragraphs (Line Height)
                                                p: ({...props}) => <p {...props} className="leading-8 mb-6 text-foreground/90 text-[1.05rem]" />,
 
                                                 // 3. Images (Centered, Rounded, Captioned)
                                                 img: ({...props}) => (
                                                     <figure className="my-10 flex flex-col items-center">
                                                         <img 
                                                             {...props} 
                                                             className="rounded-xl border border-border/50 shadow-lg max-h-[500px] object-contain bg-black/5 dark:bg-white/5"
                                                             loading="lazy"
                                                             alt={props.alt || "Ders görseli"}
                                                         />
                                                         {props.alt && (
                                                             <figcaption className="mt-3 text-sm text-center text-muted-foreground italic">
                                                                 {props.alt}
                                                             </figcaption>
                                                         )}
                                                     </figure>
                                                 ),
 
                                                 // 4. Tables (Striped, Minimalist)
                                                 table: ({...props}) => (
                                                     <div className="overflow-x-auto my-8 border border-border/60 rounded-lg shadow-sm">
                                                         <table {...props} className="w-full text-sm text-left border-collapse" />
                                                     </div>
                                                 ),
                                                 thead: ({...props}) => (
                                                     <thead {...props} className="bg-muted/50" />
                                                 ),
                                                 th: ({...props}) => (
                                                     <th {...props} className="px-6 py-3 font-semibold text-muted-foreground border-b border-border/60 whitespace-nowrap" />
                                                 ),
                                                 tr: ({...props}) => (
                                                     <tr {...props} className="border-b border-border/40 hover:bg-muted/30 transition-colors last:border-0 even:bg-muted/5" />
                                                 ),
                                                 td: ({...props}) => (
                                                     // Helper helper: check content to right align numbers? Hard to detect perfectly in static render.
                                                     <td {...props} className="px-6 py-3 align-middle" />
                                                 ),
 
                                                 // 5. Blockquotes
                                                 blockquote: ({...props}) => (
                                                     <blockquote {...props} className="border-l-4 border-primary pl-6 italic text-muted-foreground my-8 py-2 bg-primary/5 rounded-r-lg" />
                                                 ),
                                                 
                                                 // 6. Lists
                                                 ul: ({...props}) => <ul {...props} className="list-disc list-outside ml-6 mb-6 space-y-2 marker:text-primary" />,
                                                 ol: ({...props}) => <ol {...props} className="list-decimal list-outside ml-6 mb-6 space-y-2 marker:font-bold marker:text-primary" />,
 
                                                 // 7. Inline Code & Code Blocks
                                                 code: ({inline, className, children, ...props}: {inline?: boolean, className?: string, children?: React.ReactNode}) => {
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
                                                
                                                // 8. Math / LaTeX (Styling Wrapper)
                                                // Note: 'math' is not a standard markdown component hook in react-markdown typically, 
                                                // usually remark-math / rehype-katex handle this. 
                                                // We can style the wrapper div if generated.
                                                // Often rendered as <span class="katex">...
                                            }}
                                        >
                                            {chunk.content}
                                        </ReactMarkdown>
                                    </div>
                                    
                                    {/* Visual Separator between chunks (if not last) - Made very subtle */}
                                    {index < chunks.length - 1 && (
                                        <div className="h-24 w-full flex items-center justify-center pointer-events-none">
                                            <div className="w-12 h-1 bg-border/30 rounded-full" />
                                        </div>
                                    )}
                                </div>
                             )
                        })}

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
