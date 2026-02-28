import {
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
} from 'react';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import 'katex/dist/katex.min.css';
import { cn, slugify } from '@/utils/stringHelpers';
import { CodeBlock } from './CodeBlock';
import { Lightbulb } from 'lucide-react';
import React, { useMemo } from 'react';

// --- Helpers ---

export const getText = (node: ReactNode): string => {
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
  return '';
};

// Helper to remove only the FIRST occurrence of the bulb emoji in the React tree
export const removeFirstBulb = (node: ReactNode): ReactNode => {
  let found = false;

  const process = (n: ReactNode): ReactNode => {
    if (found) return n;

    if (typeof n === 'string') {
      if (n.includes('💡')) {
        found = true;
        return n.replace('💡', '');
      }
      return n;
    }

    if (isValidElement(n)) {
      const children = (n.props as { children?: ReactNode }).children;
      if (children) {
        return cloneElement(
          n as ReactElement,
          undefined,
          Children.map(children, process)
        );
      }
    }

    if (Array.isArray(n)) {
      return Children.map(n, process);
    }

    return n;
  };

  return Children.map(node, process);
};

// --- Custom Components ---

export const markdownComponents = {
  h1: React.memo(
    ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => {
      const text = useMemo(() => getText(children), [children]);
      const subId = useMemo(() => slugify(text), [text]);
      return (
        <h3 id={subId} className="scroll-mt-28" {...props}>
          {children}
        </h3>
      );
    }
  ),
  h2: React.memo(
    ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => {
      const text = useMemo(() => getText(children), [children]);
      const subId = useMemo(() => slugify(text), [text]);
      return (
        <h4 id={subId} className="scroll-mt-28" {...props}>
          {children}
        </h4>
      );
    }
  ),
  h3: React.memo(
    ({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) => {
      const text = useMemo(() => getText(children), [children]);
      const subId = useMemo(() => slugify(text), [text]);
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
    const hasImage = node?.children?.some(
      (child) => child.type === 'element' && child.tagName === 'img'
    );
    const Component = hasImage ? 'div' : 'p';

    return (
      <Component
        {...props}
        className={cn(hasImage && 'flex flex-col items-center my-1')}
      >
        {children}
      </Component>
    );
  },
  img: React.memo(({ ...props }: ImgHTMLAttributes<HTMLImageElement>) => (
    <span className="block my-1 mb-6 w-full text-center">
      <Zoom classDialog="custom-zoom-modal">
        <img
          {...props}
          className="rounded-xl border border-border/50 py-5 shadow-lg w-full max-h-[600px] object-contain bg-muted/50 hover:scale-[1.01] transition-transform duration-500 cursor-zoom-in"
          loading="lazy"
          alt={props.alt || 'Görsel'}
        />
      </Zoom>
      {props.alt && props.alt !== 'Görsel' && (
        <span className="image-caption">{props.alt}</span>
      )}
    </span>
  )),
  blockquote: React.memo(
    ({ children, ...props }: BlockquoteHTMLAttributes<HTMLQuoteElement>) => {
      const text = useMemo(() => getText(children), [children]);
      const isCallout = useMemo(() => text.trim().startsWith('💡'), [text]);
      const cleanChildren = useMemo(
        () => removeFirstBulb(children),
        [children]
      );

      if (isCallout) {
        // Only pass through data-attributes to the div for indexing/scrolling
        const dataProps = Object.keys(props)
          .filter((key) => key.startsWith('data-'))
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = props[key as keyof typeof props];
            return acc;
          }, {});

        return (
          <div className="not-prose my-6" {...dataProps}>
            <div className="callout-box">
              {/* Sol kolon: ikon + dikey çizgi */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="callout-icon-wrapper">
                  <Lightbulb className="size-4 text-primary" />
                </div>
                <div className="w-px flex-1 bg-primary/20" />
              </div>

              {/* Sağ kolon: label + içerik */}
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
    const propsRecord = props as Record<string, unknown>;
    const dataBlockIndex = propsRecord['data-block-index'];
    const dataHighlightIndex = propsRecord['data-highlight-index'];
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
  // KaTeX Display Fix
  div: ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
    if (className?.includes('katex-display')) {
      return <div className={className} {...props} />;
    }
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
