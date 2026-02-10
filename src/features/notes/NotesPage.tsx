import React, { useEffect, useState, useRef, memo, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import katex from 'katex';
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
  getCourseIdBySlug,
} from '@/shared/lib/core/client-db';
import { type CourseTopic } from '@/shared/types/efficiency';
import { useAuth } from '@/features/auth';
import { Button } from '@/shared/components/ui/button';
import { cn, slugify } from '@/shared/lib/core/utils';
import { GlobalNavigation } from './components/GlobalNavigation';
import { LocalToC, type LocalToCItem } from './components/LocalToC';


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

  // Handle math blocks
  const isMath = !!(
    (className?.includes('math')) || 
    (match && (match[1] === 'math' || match[1] === 'latex')) ||
    (code.trim().startsWith('$$') && code.trim().endsWith('$$')) ||
    (code.trim().startsWith('$') && code.trim().endsWith('$'))
  );

  if (isMath) {
    const isDisplay = !!(code.trim().startsWith('$$') || (match && (match[1] === 'math' || match[1] === 'latex')));
    const content = code.trim()
      .replace(/^(\$\$|\\\[|\\\(|\$)/, '')
      .replace(/(\$\$|\\\]|\\\)|\$)$/, '');

    try {
      const html = katex.renderToString(content, {
        displayMode: isDisplay,
        throwOnError: false,
      });
      
      if (isDisplay) {
        return (
          <div 
            className="my-8 text-lg overflow-x-auto text-center"
            dangerouslySetInnerHTML={{ __html: html }} 
          />
        );
      }
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    } catch (err) {
      console.error('KaTeX fallback render error:', err);
      // Fall through to regular code display if KaTeX fails
    }
  }

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
    <div className="relative my-8 rounded-xl overflow-hidden border border-border/50 shadow-lg bg-[#0d1117] group not-prose">
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
      <h3 id={subId} className="scroll-mt-28" {...props}>
        {children}
      </h3>
    );
  },
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = getText(children);
    const subId = slugify(text);
    return (
      <h4 id={subId} className="scroll-mt-28" {...props}>
        {children}
      </h4>
    );
  },
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const text = getText(children);
    const subId = slugify(text);
    return (
      <h5 id={subId} className="scroll-mt-28" {...props}>
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
        <div className="not-prose my-6">
            <div className="callout-box">
            <div className="shrink-0 bg-primary/10 rounded-lg p-2 flex items-center justify-center">
                <span className="text-xl leading-none">💡</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="callout-label">İNCELEME / ÖRNEK</div>
                <div className="callout-content">{cleanChildren}</div>
            </div>
            </div>
        </div>
      );
    }

    return <blockquote className="not-prose border-l-4 border-primary/40 pl-4 py-1 italic text-muted-foreground my-6" {...props}>{children}</blockquote>;
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
    <div className="not-prose overflow-x-auto my-10 border border-primary/10 rounded-2xl shadow-xl shadow-primary/5 overflow-hidden bg-card/30 backdrop-blur-sm">
      <table className="w-full text-sm text-left" {...props} />
    </div>
  ),
  thead: ({ ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-primary/5 text-xs uppercase text-muted-foreground" {...props} />
  ),
  th: ({ ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-6 py-3 font-medium tracking-wider" {...props} />
  ),
  tr: ({ ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors" {...props} />
  ),
  td: ({ ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-6 py-4" {...props} />
  ),
  // KaTeX Display Fix
  div: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
     if (className?.includes('katex-display')) {
         return <div className={cn(className, "my-8 text-lg overflow-x-auto")} {...props} />;
     }
     return <div className={className} {...props} />;
  }
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
    
    // We could use IntersectionObserver here if we wanted granular per-chunk visibility notification
    // But scrolling logic in parent is simpler for keeping state in sync

    return (
      <div
        id={sectionId}
        className="chunk-container scroll-mt-24 mb-24 last:mb-0 relative"
      >
        {(chunk.sequence_order === 0 || chunk.sequence_order === undefined) &&
          chunk.section_title && (
            <div className="section-header mb-8 pb-4 border-b border-border/40">
              <h1 className="text-3xl font-bold tracking-tight text-center text-foreground">{chunk.section_title}</h1>
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

interface ExtendedToCItem extends LocalToCItem {
  chunkId: string;
}

export default function NotesPage() {
  const { courseSlug, topicSlug } = useParams<{ courseSlug: string; topicSlug?: string }>();
  const navigate = useNavigate();
  // const location = useLocation();
  const { user } = useAuth();
  
  // Data State
  const [chunks, setChunks] = useState<CourseTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseName, setCourseName] = useState('');
  
  // Navigation State
  const [toc, setToc] = useState<ExtendedToCItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  // Derived activeChunkId from URL or first chunk
  const activeChunkId = useMemo(() => {
     if (topicSlug) return topicSlug;
     if (chunks.length > 0) return slugify(chunks[0].section_title);
     return '';
  }, [topicSlug, chunks]);
  
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // Refs
  const mainContentRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // 1. Scroll Progress ONLY
  useEffect(() => {
    const mainContent = mainContentRef.current;
    if (!mainContent) return;

    const handleScroll = () => {
      const scrollTop = mainContent.scrollTop;
      const scrollHeight = mainContent.scrollHeight;
      const clientHeight = mainContent.clientHeight;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(progress);
    };

    mainContent.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => mainContent.removeEventListener('scroll', handleScroll);
  }, [chunks, loading]);

  // 2. Active Section via IntersectionObserver
  useEffect(() => {
    if (loading || chunks.length === 0) return;

    const options = {
      root: mainContentRef.current,
      rootMargin: "-10% 0% -80% 0%",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      if (isProgrammaticScroll.current) return;

      const intersecting = entries.filter(entry => entry.isIntersecting);
      if (intersecting.length > 0) {
        // Find the topmost intersecting element (smallest boundingClientRect.top)
        const topMost = intersecting.reduce((prev, curr) => 
          curr.boundingClientRect.top < prev.boundingClientRect.top ? curr : prev
        );
        
        if (topMost.target.id && topMost.target.id !== activeSection) {
          setActiveSection(topMost.target.id);
        }
      }
    }, options);

    // Observe all elements with an ID inside the scroll container
    const sections = mainContentRef.current?.querySelectorAll('[id]');
    sections?.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [chunks, loading, activeChunkId]);

  // Derive Active Chunk from Active Section - REMOVED because we use URL now
  // We only track active section for LocalToC highlighting
  
  // Update URL if no topicSlug is present but we have chunks (default to first)
  useEffect(() => {
      if (!loading && chunks.length > 0 && !topicSlug && courseSlug) {
          const firstChunkId = slugify(chunks[0].section_title);
          navigate(`/notes/${courseSlug}/${firstChunkId}`, { replace: true });
      }
  }, [loading, chunks, topicSlug, courseSlug, navigate]);

  // Scroll to top when topic changes
  useEffect(() => {
      mainContentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      setActiveSection('');
  }, [activeChunkId]);
  
  // Save scroll position
  useEffect(() => {
    const mainContent = mainContentRef.current;
    if (!mainContent || !courseSlug) return;
    
    const saveScroll = () => {
      localStorage.setItem(
        `scroll_pos_${courseSlug}`,
        mainContent.scrollTop.toString()
      );
    };

    mainContent.addEventListener('scroll', saveScroll, { passive: true });
    return () => mainContent.removeEventListener('scroll', saveScroll);
  }, [courseSlug, loading]);

  // Restore scroll position
  useEffect(() => {
    if (!loading && chunks.length > 0 && courseSlug && mainContentRef.current) {
      const savedScroll = localStorage.getItem(`scroll_pos_${courseSlug}`);
      if (savedScroll) {
        const timer = setTimeout(() => {
          mainContentRef.current?.scrollTo({
            top: parseInt(savedScroll),
            behavior: 'instant' as ScrollBehavior,
          });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, chunks.length, courseSlug]);
  
  // Navigation Handlers
  const handleScrollToId = (id: string) => {
    isProgrammaticScroll.current = true;
    setActiveSection(id);
    
    const element = document.getElementById(id);
    if (element && mainContentRef.current) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 1000);
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

          content = content.replace(/[\u2000-\u200b]/g, ' ');

          const usedIndices = new Set<number>();
          imageUrls.forEach((url, idx) => {
            const marker = new RegExp(`\\[GÖRSEL:\\s*${idx}\\]`, 'gi');
            if (content.match(marker)) {
              content = content.replace(marker, `\n\n![Görsel](${url})\n\n`);
              usedIndices.add(idx);
            }
          });

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
    const items: ExtendedToCItem[] = [];

    chunks.forEach((chunk) => {
      const chunkId = slugify(chunk.section_title);
      
      // Always add the chunk title itself as Level 1
      if (
        chunk.section_title &&
        (chunk.sequence_order === 0 || chunk.sequence_order === undefined)
      ) {
        items.push({
          id: chunkId,
          title: chunk.section_title,
          level: 1,
          chunkId: chunkId
        });
      } else {
        // If it's a sub-chunk (sequence_order > 0), it supposedly belongs to previous parent?
        // Or we treat it as part of the flow.
        // For now, let's assume it belongs to itself
      }
      
      const lines = chunk.content.split('\n');
      lines.forEach((line) => {
        const h1Match = line.match(/^#\s+(.+)$/);
        const h2Match = line.match(/^##\s+(.+)$/);
        const h3Match = line.match(/^###\s+(.+)$/);

        // NOTE: In standard markdown, # is H1. But here chunks are H1.
        // So # inside content should probably be H2?
        // But let's stick to parsing logic: # -> level 2, ## -> level 3, ### -> level 4 relative to document?
        // Or if we treat Chunk as Level 0/1...
        // Let's map headings to levels 2, 3, 4 to nest under Chunk Title (Level 1)
        
        let level = 0;
        let title = '';
        
        if (h1Match) {
            title = h1Match[1].trim();
            level = 2; 
        } else if (h2Match) {
            title = h2Match[1].trim();
            level = 3;
        } else if (h3Match) {
            title = h3Match[1].trim();
            level = 4;
        }
        
        if (level > 0) {
            items.push({
                id: slugify(title),
                title: title,
                level,
                chunkId: chunkId
            });
        }
      });
    });

    // Dedupe
    const uniqueItems = items.filter(
      (item, index, self) => index === self.findIndex((t) => t.id === item.id)
    );
    setToc(uniqueItems);
  }, [chunks, activeChunkId]);

  // Derived filtered ToC for Right Panel
  const currentChunkToC = useMemo(() => {
      if (!activeChunkId) return [];
      // Filter items belonging to current chunk
      // We exclude Level 1 (Chunk Title) from the "On This Page" list if desired,
      // Or include it. Usually "On This Page" shows headings *inside* the page.
      // So let's show Level > 1.
      return toc.filter(item => item.chunkId === activeChunkId && item.level > 1);
  }, [toc, activeChunkId]);
  
  // Handlers for Global/Local clicks
  const handleGlobalClick = (chunkId: string) => {
      if (courseSlug) {
          navigate(`/notes/${courseSlug}/${chunkId}`);
      }
  };


  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="ml-3 text-muted-foreground font-medium animate-pulse">
          Ders içeriği hazırlanıyor...
        </p>
      </div>
    );
  }

  if (error || chunks.length === 0) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-6 bg-background text-center">
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
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-primary/20">
      
      {/* 1. Left Panel: Global Navigation */}
      <aside className="w-72 shrink-0 border-r border-border/15 bg-card/10 backdrop-blur-xl hidden lg:block">
        <div className="h-20 flex flex-col justify-center px-6 border-b border-border/10 bg-card/5 relative overflow-hidden">
            <Link
              to="/courses"
              className="group inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-all duration-300 mb-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100">Kütüphane</span>
            </Link>
            
            <div className="flex items-center gap-2.5 min-w-0">
               <div className="w-1 h-3.5 rounded-full bg-primary/40 shrink-0" />
               <h1 className="text-[13px] font-bold text-foreground/90 truncate tracking-tight uppercase">
                  {courseName}
               </h1>
            </div>
        </div>
        <div className="h-[calc(100vh-5rem)]">
            <GlobalNavigation 
                chunks={chunks} 
                activeChunkId={activeChunkId} 
                courseSlug={courseSlug || ''}
            />
        </div>
      </aside>

      {/* 2. Middle Panel: Main Content */}
      <main 
        ref={mainContentRef}
        className="flex-1 overflow-y-auto bg-background/50 relative scroll-smooth"
      >
        <div className="max-w-6xl mx-auto px-8 py-12 min-h-screen">
            {/* Display only the selected chunk */}
            {chunks
                .filter(chunk => slugify(chunk.section_title) === activeChunkId)
                .map((chunk) => (
                <MarkdownSection
                    key={chunk.id}
                    chunk={chunk}
                    components={markdownComponents}
                />
            ))}
            
            {/* Show message if topic not found (but chunks exist) */}
            {chunks.length > 0 && !chunks.some(c => slugify(c.section_title) === activeChunkId) && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <p>Konu bulunamadı veya henüz seçilmedi.</p>
                    <Button variant="link" onClick={() => handleGlobalClick(slugify(chunks[0].section_title))}>
                        İlk konuya git
                    </Button>
                </div>
            )}
        </div>
      </main>

      {/* 3. Right Panel: Local ToC & Knowledge Graph */}
      <aside className="w-64 shrink-0 border-l border-border/15 bg-card/10 backdrop-blur-xl hidden xl:flex flex-col h-full">

         <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
           <div className="my-auto w-full">
             <LocalToC 
               items={currentChunkToC} 
               activeId={activeSection} 

               onItemClick={(id, e) => {
                 e.preventDefault();
                 handleScrollToId(id);
               }} 
             />
           </div>
         </div>
      </aside>

      {/* Scroll to Top Button */}
      <button
        onClick={() => {
            mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className={cn(
          'fixed bottom-5 right-5 lg:right-70 p-3 rounded-full bg-primary/90 text-primary-foreground shadow-lg transition-all duration-300 z-50 hover:scale-110 hover:shadow-xl hover:bg-primary',
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
