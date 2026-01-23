"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Components } from "react-markdown";

import remarkDirective from "remark-directive";
import { visit } from "unist-util-visit";
import { Plugin } from "unified";
import { Node, Literal } from "unist";
import { Heading } from "mdast";

interface NoteViewerProps {
  content: string;
  courseId?: string;
  className?: string;
  /** Text to highlight (from URL query or EvidenceCard) */
  highlightText?: string;
}

// Helper to convert number to letter (0 -> A, 1 -> B, etc.)
const toUpperLetter = (num: number) => String.fromCharCode(65 + num);
const toLowerLetter = (num: number) => String.fromCharCode(97 + num);

// Helper to extract text from heading nodes
const getHeadingText = (node: Node): string => {
  if (node.type === "text" || node.type === "inlineCode") return (node as Literal).value as string || "";
  const children = (node as { children?: Node[] }).children;
  if (children) return children.map(getHeadingText).join("");
  return "";
};

// Helper to slugify text to match TOC logic
const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, "")
    .replace(/\s+/g, "-");
};

/**
 * Custom plugin to handle auto-numbering of headings based on hierarchy:
 * H2 -> A. Title
 * H3 -> 1. Title
 * H4 -> a. Title
 */
const remarkHeadingNumbering: Plugin = () => {
  return (tree: Node) => {
    const counters = { h2: 0, h3: 0, h4: 0 };

    visit(tree, "heading", (node: Heading) => {
      // 1. Generate ID for scrolling (must match TOC logic)
      const textContent = getHeadingText(node);
      const id = slugify(textContent);
      
      const nodeWithData = node as Node & { data?: { hProperties?: { id?: string } } };
      const data = nodeWithData.data || (nodeWithData.data = {});
      const props = data.hProperties || (data.hProperties = {});
      props.id = id;

      // 2. Add Prefixes
      if (node.depth === 1) {
        // Reset all on new H1 (though usually only 1 per doc)
        counters.h2 = 0;
        counters.h3 = 0;
        counters.h4 = 0;
      } else if (node.depth === 2) {
        counters.h2++;
        counters.h3 = 0;
        counters.h4 = 0;
        insertPrefix(node, `${toUpperLetter(counters.h2 - 1)}. `);
      } else if (node.depth === 3) {
        counters.h3++;
        counters.h4 = 0;
        insertPrefix(node, `${counters.h3}. `);
      } else if (node.depth === 4) {
        counters.h4++;
        insertPrefix(node, `${toLowerLetter(counters.h4 - 1)}. `);
      }
    });
  };

  function insertPrefix(node: Heading, prefix: string) {
    if (node.children && node.children.length > 0) {
      const firstChild = node.children[0];
      if (firstChild.type === "text") {
        (firstChild as Literal).value = `${prefix}${(firstChild as Literal).value}`;
      } else {
        (node.children as Array<{ type: string; value: string }>).unshift({ type: "text", value: prefix });
      }
    }
  }
};

const remarkCustomDirectives: Plugin = () => {
  return (tree: Node) => {
    visit(tree, (node: Node, index, parent) => {
      // CLEANUP: Remove technical artifacts like :::question-generator
      if (node.type === "containerDirective" || node.type === "leafDirective" || node.type === "textDirective") {
         const d = node as Node & { name: string; children: Node[] };
         if (d.name === 'question-generator') {
            // Remove the node from the tree
            if (parent && typeof index === 'number') {
               (parent as { children: Node[] }).children.splice(index, 1);
               return index; // Return same index to visit next node correctly
            }
         }
      }

      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        const d = node as Node & { name: string; data?: { hName?: string; hProperties?: { className: string[] } } };
        const data = d.data || (d.data = {});

        // 3. Example Cards (Generic ":::" blocks or named directive blocks)
        if (node.type === "containerDirective") {
             const isExample = d.name === 'example' || d.name === 'Örnek' || d.name === 'ornek';
             data.hName = "div";
             data.hProperties = {
                className: [
                  "my-8",
                  "p-6",
                  isExample ? "bg-emerald-500/5" : "bg-muted/30",
                  "border",
                  isExample ? "border-emerald-500/20" : "border-border",
                  "rounded-xl",
                  "shadow-sm",
                  "relative",
                  "overflow-hidden",
                  "border-l-4",
                  isExample ? "border-l-emerald-500" : "border-l-primary"
                ]
             };
        }

        // 4. Badge Styling
        // "Cevap", "Çözüm", "Not", "İpucu"
        const badgeKeywords = ["Cevap", "Çözüm", "Cozum", "Not", "İpucu", "Ipucu"];
        if (badgeKeywords.includes(d.name)) {
             data.hName = "span";
             
             // Default (Notes) -> Primary Color
             let colorClass = "bg-primary/10 text-primary border-primary/20"; 
             
             if (d.name === "Cevap" || d.name === "Çözüm" || d.name === "Cozum") {
                 // Answer -> Emerald implies success, but let's stick to theme if desired.
                 // User asked to align with project colors. 
                 // If project has 'success' var we use it, otherwise use hardcoded colors that match dark theme well.
                 colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
             } else if (d.name === "İpucu" || d.name === "Ipucu") {
                 // Hint -> Amber
                 colorClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
             }

             data.hProperties = {
                className: [
                  "inline-flex",
                  "items-center",
                  "px-2.5",
                  "py-0.5",
                  "rounded-md",
                  "text-sm",
                  "font-medium",
                  "mr-2",
                  "border",
                  ...colorClass.split(" ")
                ]
             };
        }
      }
    });

    // Clean up <p ... node="[object Object]"> artifacts
    visit(tree, "raw", (node: Node & { value?: string }, index, parent) => {
        if (node.value && node.value.includes('[object Object]')) {
             if (parent && typeof index === 'number') {
                 (parent as { children: Node[] }).children.splice(index, 1);
                 return index;
             }
        }
    });
  };
};

export function NoteViewer({
  content,
  courseId,
  className = "",
  highlightText,
}: NoteViewerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Highlight and scroll to evidence text
  React.useEffect(() => {
    if (!highlightText || !containerRef.current) return;
    
    // Wait for content to render
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      
      // Find the text in the rendered content
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let domNode: globalThis.Node | null;
      let foundElement: HTMLElement | null = null;
      
      while ((domNode = walker.nextNode())) {
        const textContent = (domNode as Text).textContent || '';
        // Check if this text node contains part of the highlight text
        if (textContent.toLowerCase().includes(highlightText.toLowerCase().slice(0, 50))) {
          foundElement = (domNode as Text).parentElement;
          break;
        }
      }
      
      if (foundElement) {
        // Add highlight class
        foundElement.classList.add('evidence-highlight');
        
        // Smooth scroll to element
        foundElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Remove highlight after animation
        setTimeout(() => {
          foundElement?.classList.remove('evidence-highlight');
        }, 3000);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [highlightText]);
  
  const processedContent = React.useMemo(() => {
    let newContent = content;

    // 1. Ensure Lesson Name is H1 at the top
    if (courseId) {
        if (!/^#\s/.test(newContent)) {
             // Use courseId directly or formatted name? Previously used lessonType (which was slug)
             // Keeping consistent with previous behavior: just inserting the string.
             newContent = `# ${courseId}\n\n${newContent}`;
        }
    }

    // Cleanup
    newContent = newContent.replace(/:::question-generator[\s\S]*?:::/g, "");

    // 3. Image Path Correction & Format Cleanup
    // Handles ![]() and also []() that point to images, including nested brackets [[alt]]
    newContent = newContent.replace(
      /(!?\[(?:\[[^\]]*\]|[^\]])*\])\(([^)]+)\)(?:\{[^}]*\})?/g,
      (match, label, imagePath) => {
        const isImage = label.startsWith("!") || 
                        /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(imagePath.split('?')[0]) ||
                        imagePath.includes("/media/");
        
        if (isImage) {
          const mediaMatch = imagePath.match(/media\/[^/\s]+$/);
          if (mediaMatch) {
            return `![](./media/${mediaMatch[0].replace("media/", "")})`;
          }
          const cleanPath = imagePath.replace(/^\.?\//, "");
          return `![](${cleanPath})`;
        }
        return match;
      }
    );

    // 4. Custom Example Blocks (:::Örnek ... :::)
    // Converts ::: content ::: (even with bold markers like **::: or :::**) to a styled markdown directive
    newContent = newContent.replace(
      /(?:\*\*|__)?:::\s*([\s\S]*?)\s*:::(?:\*\*|__)?/g,
      (match, content) => {
        return `\n\n:::example\n${content.trim()}\n:::\n\n`;
      }
    );

    // 5. Cleanup Escaped Quotes
    // Removes artifacts like \" from automated exports
    newContent = newContent.replace(/\\"/g, '"');

    // 6. Fix Turkish characters in Math formulas
    // KaTeX struggles with Turkish chars inside math mode unless wrapped in \text{}
    newContent = newContent.replace(/(\$\$?)([\s\S]+?)\1/g, (match, sign, math) => {
      // Replace Turkish characters with \text{char}
      const fixedMath = math.replace(/[çğıöşüÇĞİÖŞÜ]/g, (char: string) => `\\text{${char}}`);
      return `${sign}${fixedMath}${sign}`;
    });

    return newContent;
  }, [content, courseId]);

  const components: Components = {
    // 2. Heading Typography Rules
    h1: ({ children, ...props }) => (
      <h1 className="text-3xl font-bold tracking-tight text-primary text-center mb-10 pb-4 border-b border-border scroll-mt-20" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-2xl font-bold text-violet-400 text-center mt-12 mb-6 scroll-mt-20" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-xl font-semibold text-indigo-400 text-center mt-10 mb-4 scroll-mt-20" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 className="text-lg font-medium text-amber-500 mt-8 mb-3 scroll-mt-20" {...props}>
        {children}
      </h4>
    ),
    h5: ({ children, ...props }) => (
        <h5 className="text-base font-medium text-emerald-500 mt-6 mb-2" {...props}>{children}</h5>
    ),
    h6: ({ children, ...props }) => (
        <h6 className="text-sm font-medium text-muted-foreground mt-4 mb-2" {...props}>{children}</h6>
    ),
    
    // Images
    img: ({ src, ..._props }) => {
      let imageSrc = src;
      if (
        courseId &&
        typeof src === "string" &&
        !src.startsWith("http") &&
        !src.startsWith("/api/")
      ) {
        let cleanPath = src;
        const mediaMatch = src.match(/media\/[^/]+$/);
        if (mediaMatch) {
          cleanPath = mediaMatch[0];
        } else {
          cleanPath = src.replace(/^\.?\//, "");
        }
        imageSrc = `/notes/${encodeURIComponent(courseId)}/${cleanPath}`;
      }
      return (
        <img
          src={imageSrc as string}
          alt=""
          className="max-w-full h-auto rounded-lg border border-border mx-auto block my-6 shadow-sm bg-muted/50"
          loading="lazy"
          {..._props}
        />
      );
    },
    // Tables
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto my-6 rounded-lg border border-border bg-card">
        <table className="min-w-full divide-y divide-border" {...props}>
          {children}
        </table>
      </div>
    ),
    colgroup: ({ children, ...props }) => {
      const cleanChildren = React.Children.toArray(children).filter(
        child => typeof child !== 'string' || child.trim() !== ''
      );
      return <colgroup {...props}>{cleanChildren}</colgroup>;
    },
    th: ({ children, ...props }) => (
      <th className="bg-muted px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="px-4 py-3 text-sm text-foreground border-t border-border whitespace-pre-wrap" {...props}>
        {children}
      </td>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4 bg-muted/20 py-1 pr-2 rounded-r" {...props}>
        {children}
      </blockquote>
    ),
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-2 transition-colors"
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
        {...props}
      >
        {children}
      </a>
    ),
    ul: ({ children, ...props }) => <ul className="list-disc ml-6 my-4 space-y-1 text-foreground marker:text-primary" {...props}>{children}</ul>,
    ol: ({ children, ...props }) => <ol className="list-decimal ml-6 my-4 space-y-1 text-foreground marker:text-primary" {...props}>{children}</ol>,
    li: ({ children, ...props }) => <li className="pl-1" {...props}>{children}</li>,
    p: ({ children, ...props }) => <p className="my-3 leading-7 text-foreground/90" {...props}>{children}</p>,
    hr: ({ ...props }) => <hr className="my-8 border-border" {...props} />,
    
    // Code blocks
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !match;

      if (isInline) {
        return (
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary" {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className={`block bg-muted/50 p-4 rounded-lg overflow-x-auto font-mono text-sm border border-border ${className}`} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }) => (
      <pre className="my-4 overflow-x-auto" {...props}>
        {children}
      </pre>
    ),
  };

  return (
    <div ref={containerRef} className={`note-viewer max-w-none bg-card p-8 md:p-12 shadow-sm rounded-xl border border-border prose prose-invert prose-zinc prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          remarkMath,
          remarkDirective,
          remarkHeadingNumbering,
          remarkCustomDirectives,
        ]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeKatex, { strict: false }],
        ]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}