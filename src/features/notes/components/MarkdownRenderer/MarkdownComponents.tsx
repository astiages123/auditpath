import React from 'react';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import 'katex/dist/katex.min.css';
import { cn, slugify } from '@/shared/utils';
import { CodeBlock } from './CodeBlock';

// --- Helpers ---

export const getText = (node: React.ReactNode): string => {
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
export const removeFirstBulb = (node: React.ReactNode): React.ReactNode => {
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
          n as React.ReactElement,
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

export const markdownComponents = {
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

    return (
      <blockquote
        className="not-prose border-l-4 border-primary/40 pl-4 py-1 italic text-muted-foreground my-6"
        {...props}
      >
        {children}
      </blockquote>
    );
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
    <thead
      className="bg-primary/5 text-xs uppercase text-muted-foreground"
      {...props}
    />
  ),
  th: ({ ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-6 py-3 font-medium tracking-wider" {...props} />
  ),
  tr: ({ ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
      className="border-b border-white/5 hover:bg-white/5 transition-colors"
      {...props}
    />
  ),
  td: ({ ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-6 py-4" {...props} />
  ),
  // KaTeX Display Fix
  div: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
    if (className?.includes('katex-display')) {
      return (
        <div
          className={cn(className, 'my-8 text-lg overflow-x-auto')}
          {...props}
        />
      );
    }
    return <div className={className} {...props} />;
  },
};
