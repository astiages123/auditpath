import React, {
  ReactNode,
  isValidElement,
  cloneElement,
  ReactElement,
  Children,
  HTMLAttributes,
  ImgHTMLAttributes,
  BlockquoteHTMLAttributes,
  OlHTMLAttributes,
  LiHTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
  useMemo,
} from 'react';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import 'katex/dist/katex.min.css';
import { Lightbulb } from 'lucide-react';
import { cn, slugify } from '@/utils/stringHelpers';
import { CodeBlock } from '@/features/notes/components/content/CodeBlock';

// === BÖLÜM ADI: YARDIMCI FONKSİYONLAR (HELPERS) ===
// ===========================

/**
 * React öğesindeki bütün düz metni güvenli bir şekilde elde eder.
 *
 * @param {ReactNode} node
 * @returns {string} Element içerisindeki metin
 */
export const getText = (node: ReactNode): string => {
  try {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(getText).join('');
    if (
      typeof node === 'object' &&
      node !== null &&
      'props' in (node as { props?: { children?: ReactNode } }) &&
      (node as { props: { children?: ReactNode } }).props?.children
    ) {
      return getText(
        (node as { props: { children?: ReactNode } }).props.children
      );
    }
  } catch (error: unknown) {
    console.error('[MarkdownComponents][getText] Hata:', error);
  }
  return '';
};

/**
 * Öğe ağacı içerisindeki ilk "💡" ifadesini temizler.
 *
 * @param {ReactNode} node
 * @returns {ReactNode} Emojisiz, temizlenmiş öğe ağacı
 */
export const removeFirstBulb = (node: ReactNode): ReactNode => {
  let found: boolean = false;

  const processNode = (n: ReactNode): ReactNode => {
    try {
      if (found) return n;

      if (typeof n === 'string') {
        if (n.includes('💡')) {
          found = true;
          return n.replace('💡', '');
        }
        return n;
      }

      if (isValidElement(n)) {
        const childrenList: ReactNode | undefined = (
          n.props as { children?: ReactNode }
        ).children;
        if (childrenList) {
          return cloneElement(
            n as ReactElement,
            undefined,
            Children.map(childrenList, processNode)
          );
        }
      }

      if (Array.isArray(n)) {
        return Children.map(n, processNode);
      }
    } catch (error: unknown) {
      console.error('[MarkdownComponents][removeFirstBulb] Hata:', error);
    }
    return n;
  };

  return Children.map(node, processNode);
};

// === BÖLÜM ADI: BİLEŞEN (COMPONENT) HARİTALAMASI ===
// ===========================

/**
 * React-Markdown tarafından ayrıştırılan etiketlerin AuditPath'a özel CSS ve element mappingleri.
 */
export const markdownComponents = {
  h1: React.memo(
    ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => {
      const text: string = useMemo(() => getText(children), [children]);
      const subId: string = useMemo(() => slugify(text), [text]);
      return (
        <h3 id={subId} className="scroll-mt-28" {...props}>
          {children}
        </h3>
      );
    }
  ),
  h2: React.memo(
    ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => {
      const text: string = useMemo(() => getText(children), [children]);
      const subId: string = useMemo(() => slugify(text), [text]);
      return (
        <h4 id={subId} className="scroll-mt-28" {...props}>
          {children}
        </h4>
      );
    }
  ),
  h3: React.memo(
    ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => {
      const text: string = useMemo(() => getText(children), [children]);
      const subId: string = useMemo(() => slugify(text), [text]);
      return (
        <h5 id={subId} className="scroll-mt-28" {...props}>
          {children}
        </h5>
      );
    }
  ),
  p: ({
    node,
    children,
    ...props
  }: {
    node?: { children?: { type: string; tagName?: string }[] };
  } & HTMLAttributes<HTMLParagraphElement>) => {
    const hasImage: boolean =
      node?.children?.some(
        (child) => child.type === 'element' && child.tagName === 'img'
      ) || false;

    // Fotoğraf bulunduran paragraflar block-level DIV'e çevrilir ki taşmalar önlensin.
    const Component: React.ElementType = hasImage ? 'div' : 'p';

    return (
      <Component
        {...props}
        className={cn(hasImage && 'flex flex-col items-center my-1')}
      >
        {children}
      </Component>
    );
  },
  img: React.memo(({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) => (
    <span className="block my-1 mb-6 w-full text-center">
      <Zoom classDialog="custom-zoom-modal">
        <img
          {...props}
          className="rounded-xl border border-border/50 py-5 shadow-lg w-full max-h-[600px] object-contain bg-muted/50 hover:scale-[1.01] transition-transform duration-500 cursor-zoom-in"
          loading="lazy"
          alt={alt || 'Görsel'}
        />
      </Zoom>
      {alt && alt !== 'Görsel' && <span className="image-caption">{alt}</span>}
    </span>
  )),
  blockquote: React.memo(
    ({ children, ...props }: BlockquoteHTMLAttributes<HTMLQuoteElement>) => {
      const text: string = useMemo(() => getText(children), [children]);
      const isCallout: boolean = useMemo(
        () => text.trim().startsWith('💡'),
        [text]
      );
      const cleanChildren: ReactNode = useMemo(
        () => removeFirstBulb(children),
        [children]
      );

      if (isCallout) {
        // Only pass through data-attributes to the div for indexing/scrolling
        const dataProps: Record<string, unknown> = Object.keys(props)
          .filter((key: string) => key.startsWith('data-'))
          .reduce<Record<string, unknown>>((acc, key: string) => {
            acc[key] = (props as Record<string, unknown>)[key];
            return acc;
          }, {});

        return (
          <div className="not-prose my-6" {...dataProps}>
            <div className="callout-box">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="callout-icon-wrapper">
                  <Lightbulb className="size-4 text-primary" />
                </div>
                <div className="w-px flex-1 bg-primary/20" />
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="callout-label">ÖRNEK / SORU</div>
                <div className="callout-content">{cleanChildren}</div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <blockquote
          className="not-prose border-l-4 border-primary/40 pl-4 py-1 italic text-muted-foreground my-6"
          {...props}
        >
          {children}
        </blockquote>
      );
    }
  ),
  ul: ({ ...props }: HTMLAttributes<HTMLUListElement>) => <ul {...props} />,
  ol: ({ ...props }: OlHTMLAttributes<HTMLOListElement>) => <ol {...props} />,
  li: ({ children, ...props }: LiHTMLAttributes<HTMLLIElement>) => (
    <li {...props}>{children}</li>
  ),
  strong: ({ children, ...props }: HTMLAttributes<HTMLElement>) => (
    <strong {...props}>{children}</strong>
  ),
  code: CodeBlock,
  table: React.memo(({ ...props }: TableHTMLAttributes<HTMLTableElement>) => {
    const propsRecord: Record<string, unknown> = props as Record<
      string,
      unknown
    >;
    const dataBlockIndex: unknown = propsRecord['data-block-index'];
    const dataHighlightIndex: unknown = propsRecord['data-highlight-index'];

    return (
      <div
        className="not-prose overflow-x-auto my-10 border border-primary/10 rounded-2xl shadow-xl shadow-primary/5 overflow-hidden bg-card/30 backdrop-blur-sm"
        {...(dataBlockIndex !== undefined
          ? { 'data-block-index': dataBlockIndex }
          : {})}
        {...(dataHighlightIndex !== undefined
          ? { 'data-highlight-index': dataHighlightIndex }
          : {})}
      >
        <table className="w-full text-sm text-left" {...props} />
      </div>
    );
  }),
  thead: ({ ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
    <thead
      className="bg-primary/5 text-xs uppercase text-muted-foreground"
      {...props}
    />
  ),
  th: ({ ...props }: ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-6 py-3 font-medium tracking-wider" {...props} />
  ),
  tr: ({ ...props }: HTMLAttributes<HTMLTableRowElement>) => (
    <tr
      className="border-b border-white/5 hover:bg-muted/30 transition-colors"
      {...props}
    />
  ),
  td: ({ ...props }: TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-6 py-4" {...props} />
  ),
  div: ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
    // KaTeX Display Fix (Sınıf geçirgenliği)
    return <div className={className} {...props} />;
  },
  pre: ({ ...props }: HTMLAttributes<HTMLPreElement>) => <pre {...props} />,
  mark: ({ children, ...props }: HTMLAttributes<HTMLElement>) => (
    <mark
      className="bg-accent/30 text-foreground font-bold px-1 rounded-sm transition-all scroll-mt-32"
      {...props}
    >
      {children}
    </mark>
  ),
};
