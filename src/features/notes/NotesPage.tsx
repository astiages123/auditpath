import React, { useEffect, useState, useRef, memo } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import mermaid from 'mermaid';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  ChevronUp,
} from 'lucide-react';
import {
  getCourseTopics,
  type CourseTopic,
  getCourseIdBySlug,
} from '@/shared/lib/core/client-db';
import { useAuth } from '@/features/auth';
import { TableOfContents, type ToCItem } from './components/TableOfContents';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/core/utils';

// --- Helpers ---

const getText = (node: React.ReactNode): string => {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getText).join('');
  if (
    typeof node === 'object' &&
    node !== null &&
    'props' in (node as { props?: { children?: React.ReactNode } }) &&
    (node as { props: { children?: React.ReactNode } }).props?.children
  ) {
    return getText(
      (node as { props: { children?: React.ReactNode } }).props.children
    );
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

// Mermaid initialization
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#f59e0b',
    primaryTextColor: '#fff',
    primaryBorderColor: '#555',
    lineColor: '#888',
    secondaryColor: '#1a1a1a',
    tertiaryColor: '#1a1a1a',
    background: '#ffffff',
    mainBkg: '#1a1a1a',
    fontFamily: 'Poppins, system-ui, sans-serif',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
  },
});

// Mermaid Diagram Component
const MermaidDiagram = memo(({ code }: { code: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim()) return;

      try {
        setIsLoading(true);
        setError(null);
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError('Diyagram render edilemedi');
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [code]);

  if (isLoading) {
    return (
      <div className="my-8 rounded-xl border border-border/50 bg-[#0d1117] p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="ml-3 text-white/90">Diyagram yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-8 rounded-xl border border-destructive/50 bg-destructive/10 p-6">
        <div className="flex items-center gap-2 text-destructive mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{error}</span>
        </div>
        <pre className="text-xs text-white/90 overflow-x-auto">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-8 p-6 rounded-xl overflow-x-auto flex justify-center [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});
MermaidDiagram.displayName = 'MermaidDiagram';

const CodeBlock = ({
  inline,
  className,
  children,
  ...props
}: { inline?: boolean } & React.HTMLAttributes<HTMLElement>) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle inline code
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

  // Handle Mermaid diagrams
  if (match[1] === 'mermaid') {
    return <MermaidDiagram code={code} />;
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
          <span className="ml-2 text-xs text-white/90 font-mono opacity-70">
            {match[1]}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md hover:bg-white/10 text-white/90 hover:text-white transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      <div className="p-5 overflow-x-auto">
        <code
          className={cn(className, 'text-sm font-mono leading-relaxed')}
          {...props}
        >
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
    const subId = slugify(text);
    return (
      <h3 id={subId} {...props}>
        {children}
      </h3>
    );
  },
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = getText(children);
    const subId = slugify(text);
    return (
      <h4 id={subId} {...props}>
        {children}
      </h4>
    );
  },
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = getText(children);
    const subId = slugify(text);
    return (
      <h5 id={subId} {...props}>
        {children}
      </h5>
    );
  },
  p: ({
    node,
    ...props
  }: {
    node?: { children?: { type: string; tagName?: string }[] };
  } & React.HTMLAttributes<HTMLParagraphElement>) => {
    const hasImage = node?.children?.some(
      (child) => child.type === 'element' && child.tagName === 'img'
    );
    const Component = hasImage ? 'div' : 'p';
    return (
      <Component
        {...props}
        className={cn(hasImage && 'flex flex-col items-center my-1')}
      />
    );
  },
  img: ({ ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <span className="block my-1 mb-6 w-full text-center">
      <Zoom classDialog="custom-zoom-modal">
        <img
          {...props}
          className="rounded-xl border border-border/50 py-5 shadow-lg w-full max-h-[600px] object-contain bg-accent/10 hover:scale-[1.01] transition-transform duration-500 cursor-zoom-in"
          loading="lazy"
          alt={props.alt || 'Görsel'}
        />
      </Zoom>
      {props.alt && props.alt !== 'Görsel' && (
        <span className="image-caption">{props.alt}</span>
      )}
    </span>
  ),
  blockquote: ({
    children,
    ...props
  }: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => {
    const text = getText(children);
    const isCallout = text.trim().startsWith('💡');

    if (isCallout) {
      const cleanChildren = removeFirstBulb(children);

      return (
        <div className="callout-box">
          <div className="shrink-0 bg-primary/10 rounded-lg p-2 flex items-center justify-center">
            <span className="text-xl leading-none">💡</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="callout-label">İNCELEME / ÖRNEK</div>
            <div className="callout-content">{cleanChildren}</div>
          </div>
        </div>
      );
    }

    return <blockquote {...props}>{children}</blockquote>;
  },
  ul: ({ ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul {...props} />
  ),
  ol: ({ ...props }: React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol {...props} />
  ),
  li: ({ children, ...props }: React.LiHTMLAttributes<HTMLLIElement>) => (
    <li {...props}>{children}</li>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong {...props}>{children}</strong>
  ),
  code: CodeBlock,
  table: ({ ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-10 border border-primary/10 rounded-2xl shadow-xl shadow-primary/5 overflow-hidden bg-card/30 backdrop-blur-sm">
      <table {...props} />
    </div>
  ),
  thead: ({ ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead {...props} />
  ),
  th: ({ ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th {...props} />
  ),
  tr: ({ ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr {...props} />
  ),
  td: ({ ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td {...props} />
  ),
};

// Memoized section component to prevent expensive Markdown re-renders
const MarkdownSection = memo(
  ({
    chunk,
    components,
  }: {
    chunk: CourseTopic;
    components: typeof markdownComponents;
  }) => {
    const sectionId = slugify(chunk.section_title);
    return (
      <div
        id={sectionId}
        className="chunk-container scroll-mt-24 mb-16 last:mb-0"
      >
        {(chunk.sequence_order === 0 || chunk.sequence_order === undefined) &&
          chunk.section_title && (
            <div className="section-header mb-5 text-center">
              <h2>{chunk.section_title}</h2>
              <div className="mt-4 w-20 h-1.5 bg-primary/40 rounded-full mx-auto" />
            </div>
          )}
        <article className="prose prose-lg prose-slate dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[
              [rehypeKatex, { strict: false, throwOnError: false }],
              rehypeRaw,
            ]}
            components={components}
          >
            {chunk.content}
          </ReactMarkdown>
        </article>
      </div>
    );
  }
);
MarkdownSection.displayName = 'MarkdownSection';

export default function NotesPage() {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const { user } = useAuth();
  const [chunks, setChunks] = useState<CourseTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseName, setCourseName] = useState('');
  const [toc, setToc] = useState<ToCItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const [scrollProgress, setScrollProgress] = useState(0);
  const isProgrammaticScroll = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Scroll Progress & Active Section
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);

      // If we are scrolling via a click, don't let handleScroll override the active ID
      if (isProgrammaticScroll.current) return;

      const mainContent = document.querySelector('main');
      if (!mainContent) return;

      const sections = mainContent.querySelectorAll('[id]');
      let current = '';
      const offset = 250; // Increased offset for better early detection

      // Create a set of IDs that are actually in our ToC for faster lookup
      const tocIds = new Set(toc.map((item) => item.id));

      sections.forEach((section) => {
        const id = section.getAttribute('id');
        if (!id || !tocIds.has(id)) return;

        const rect = section.getBoundingClientRect();
        if (rect.top <= offset) {
          current = id;
        }
      });

      if (current && current !== activeSection) {
        setActiveSection(current);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeSection, toc]);

  // Save scroll position
  useEffect(() => {
    const saveScroll = () => {
      if (!courseSlug) return;
      localStorage.setItem(
        `scroll_pos_${courseSlug}`,
        window.scrollY.toString()
      );
    };

    window.addEventListener('scroll', saveScroll, { passive: true });
    return () => window.removeEventListener('scroll', saveScroll);
  }, [courseSlug]);

  // Restore scroll position
  useEffect(() => {
    if (!loading && chunks.length > 0 && courseSlug) {
      const savedScroll = localStorage.getItem(`scroll_pos_${courseSlug}`);
      if (savedScroll) {
        // Use a small timeout to ensure DOM is fully rendered/painted
        const timer = setTimeout(() => {
          window.scrollTo({
            top: parseInt(savedScroll),
            behavior: 'instant' as ScrollBehavior, // Use instant to avoid jumping on load
          });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, chunks.length, courseSlug]);

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
          setError('Ders bulunamadı.');
          return;
        }

        const cacheKey = `cached_notes_v6_${targetId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.data) {
            setChunks(parsed.data);
            setCourseName(parsed.data[0]?.course_name || '');
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
          const unusedImages = imageUrls.filter(
            (_, idx) => !usedIndices.has(idx)
          );
          if (unusedImages.length > 0 && !content.includes('![')) {
            content += unusedImages
              .map((url) => `\n\n![Görsel](${url})`)
              .join('');
          }

          return {
            ...chunk,
            section_title: chunk.section_title,
            content: content,
          };
        });

        if (processedData.length > 0) {
          setChunks(processedData);
          setCourseName(processedData[0].course_name);
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              timestamp: Date.now(),
              data: processedData,
            })
          );
        } else if (!cached) {
          setError('Bu ders için henüz içerik bulunmuyor.');
        }
      } catch (err) {
        console.error(err);
        setError('Notlar yüklenirken bir hata oluştu.');
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

    chunks.forEach((chunk) => {
      if (
        chunk.section_title &&
        (chunk.sequence_order === 0 || chunk.sequence_order === undefined)
      ) {
        const cleanTitle = chunk.section_title.replace(/\*\*/g, '');
        items.push({
          id: slugify(chunk.section_title),
          title: cleanTitle,
          level: 1,
        });
      }
      const lines = chunk.content.split('\n');
      lines.forEach((line) => {
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
    const uniqueItems = items.filter(
      (item, index, self) => index === self.findIndex((t) => t.id === item.id)
    );
    setToc(uniqueItems);
  }, [chunks]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-white font-medium animate-pulse">
          Ders içeriği hazırlanıyor...
        </p>
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
        <p className="text-white max-w-md mb-8">{error}</p>
        <Button asChild>
          <Link to="/courses">Derslere Dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/20">
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
              className="p-2 -ml-2 rounded-full hover:bg-muted/60 transition-colors text-white hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                Ders Notu
              </span>
              <h1 className="text-sm font-semibold truncate text-white">
                {courseName}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-full mx-auto relative flex items-start px-4 lg:px-8">
        {/* Table of Contents - Desktop Sticky Sidebar */}
        <aside className="hidden xl:block w-80 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar py-4 mr-16">
          <TableOfContents
            items={toc}
            activeId={activeSection}
            onItemClick={handleToCClick}
          />
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
        </main>
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={cn(
          'fixed bottom-8 right-8 p-3 rounded-full bg-amber-500 text-primary-foreground shadow-lg transition-all duration-300 z-50 hover:scale-110 hover:shadow-xl',
          scrollProgress > 10
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        <ChevronUp className="w-6 h-6" />
      </button>
    </div>
  );
}
