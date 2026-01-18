"use client";

import "./notes.css";

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
import { Node, Parent, Literal } from "unist";
import { GenerateQuestionButton } from '../features/quiz/GenerateQuestionButton';

interface NoteViewerProps {
  content: string;
  lessonType?: string;
  className?: string;
}

// Custom plugin to handle directives like :::Örnek ... :::
const remarkCustomDirectives: Plugin = () => {
  return (tree: Node) => {
    visit(tree, (node: Node) => {
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        const d = node as Node & {
          name: string;
          children: Node[];
          data: { hName?: string; hProperties?: Record<string, unknown> };
        };
        const data = d.data || (d.data = {});
        const tagName = node.type === "textDirective" ? "span" : "div";

        // Handle "Örnek" directive
        if (d.name === "Örnek" || d.name === "Ornek") {
          data.hName = tagName;
          data.hProperties = {
            className: ["directive-box", "directive-example"],
          };

          // Find the first paragraph to inject the badge into
          const firstParagraph = d.children.find(
            (child: Node) => child.type === "paragraph"
          ) as Parent | undefined;
          let badgeLabel = "Örnek";

          if (
            firstParagraph &&
            firstParagraph.children &&
            firstParagraph.children.length > 0
          ) {
            const firstChild = firstParagraph.children[0] as Literal;
            if (firstChild.type === "text") {
              // Match pattern like "1: " or "1. " or "1:" at start of text
              let textValue = firstChild.value as string;
              const match = textValue.match(/^(\s*\d+[:.])\s*([\s\S]*)/);
              if (match) {
                badgeLabel = `Örnek ${match[1].trim()}`;
                textValue = match[2];
              }

              // Handle forced break after title
              const newlineIndex = textValue.indexOf("\n");
              if (newlineIndex !== -1) {
                const beforeText = textValue.slice(0, newlineIndex).trim();
                const afterText = textValue.slice(newlineIndex + 1);
                firstChild.value = beforeText;

                const newChildren = [
                  firstChild,
                  {
                    type: "textDirective",
                    name: "br",
                    data: { hName: "br" },
                    children: [],
                  },
                  { type: "text", value: afterText },
                  ...firstParagraph.children.slice(1),
                ] as Node[];
                firstParagraph.children = newChildren;
              } else if (firstParagraph.children.length > 1) {
                // If more siblings follow the title on the same paragraph
                textValue = textValue.trim();
                firstChild.value = textValue;
                const newChildren = [
                  firstChild,
                  {
                    type: "textDirective",
                    name: "br",
                    data: { hName: "br" },
                    children: [],
                  },
                  ...firstParagraph.children.slice(1),
                ] as Node[];
                firstParagraph.children = newChildren;
              } else {
                firstChild.value = textValue.trim();
              }
            }
          }

          const badgeNode = {
            type: "textDirective",
            name: "span",
            data: {
              hName: "span",
              hProperties: { className: ["directive-badge", "badge-example"] },
            },
            children: [{ type: "text", value: badgeLabel }],
          };

          if (firstParagraph) {
            // Inject into the first paragraph's children
            (firstParagraph.children as unknown[]).unshift(
              badgeNode,
              { type: "text", value: " " } // Add a space
            );
          } else {
            // Fallback if no paragraph found
            const fallbackNode = {
              type: "paragraph",
              children: [badgeNode],
            };
            d.children.unshift(fallbackNode as Node);
          }
        }

        // Handle "Cevap" or "Çözüm" directives (inline or block)
        if (["Cevap", "Çözüm", "Cozum"].includes(d.name)) {
          data.hName = "span";
          data.hProperties = {
            className: ["directive-badge", "badge-answer"],
          };
          // For these, we might just want to wrap the content or just be a badge
          // If it's a block, we make it a badge?
          // Request says: "Cevap Çözüm gibi kelimeleri farklı renkte bir badge rengine al"
          // This implies they might be just words in text or small blocks.
          // If textDirective (:Cevap), it wraps the text.
        // Handle "question-generator"
        if (d.name === 'question-generator') {
             const attributes = (d as unknown as { attributes: Record<string, string> }).attributes || {};
             const chunkId = attributes.chunkId;
             if (chunkId) {
                 data.hName = 'question-generator';
                 data.hProperties = { chunkId };
             }
        }
        }
      }
    });
  };
};

export function NoteViewer({
  content,
  lessonType,
  className = "",
}: NoteViewerProps) {
  // Pre-process content to convert ::Name ... :: to :::Name ... :::
  // The user requested `::Örnek ... ::` syntax.
  // We need to support nested content until the next `::`.
  // However, `remark-directive` expects `:::Name` for containers.
  // Let's do a simple replacement for now, or use a more robust regex.
  // User said: "Eğer bir kısım ::Örnek ile başlıyorsa onu özel bir örnek tablosuna al. tekrar :: gelene kadar her şey o örnek kutusunun içindedir."
  // This sounds like `::Örnek` starts the block, and the next `::` (or end of file?) ends it?
  // OR "tekrar :: gelene kadar" means `::` acts as a delimiter/terminator or start of new block?
  // Let's assume standard markdown directive syntax is acceptable IF we map `::` to `:::`.
  // But strict "until the next ::" suggests a custom parser logic.
  // Let's try to normalize `::Örnek` to `:::Örnek` and append `:::` at the end of the block.

  // Simplest approach: Replace `::Örnek` with `:::Örnek` and ensure it ends with `:::`.
  // But finding the END is tricky if it's "until the next ::".

  // Let's try this regex replacement logic:
  // Replace `::Örnek` with `:::Örnek`.
  // Replace `::` (standing alone or followed by another keyword) with `:::` ???
  // User said: "tekrar :: gelene kadar her şey o örnek kutusunun içindedir."
  // This implies `::` is a separator.

  // NOTE: Implementing a robust parser in regex is hard.
  // Strategy:
  // 1. Replace `^::Örnek` with `\n:::Örnek\n`.
  // 2. Identify where it ends. If it ends at the next `::` keyword or `::` delimiter.
  // If the user uses `::` as a generic closing tag, replace `\n::\n` with `\n:::\n`.

  const processedContent = React.useMemo(() => {
    let newContent = content;

    // Un-bold wrapped directives: `**:::Örnek ...**` or `__:::Örnek ...__`
    newContent = newContent.replace(
      /^([\s>]*)(?:\*\*|__)\s*(:{2,3}(?:Örnek|Ornek).*?)\s*(?:\*\*|__)\s*$/gm,
      "$1$2"
    );

    // Replace start of block `::Örnek` or `:::Örnek` -> `:::Ornek`
    newContent = newContent.replace(
      /^([\s>]*):{2,3}(?:Örnek|Ornek)/gm,
      "$1\n:::Ornek\n"
    );

    // If there is a closing `::` explicitly used by the user:
    newContent = newContent.replace(/\n::\s*$/gm, "\n:::\n");

    // Also handle "Cevap", "Çözüm" if they are used as badges like `::Cevap`.
    newContent = newContent.replace(/::(Cevap|Çözüm|Cozum)/g, ":$1"); // Inline directive? :Cevap

    // Preserve :::question-generator as is. It is already correct syntax.


    // Fix Turkish characters in KaTeX
    newContent = newContent.replace(
      /(\$\$?)([\s\S]*?)\1/g,
      (match, border, mathContent) => {
        if (/[çşğüöıİĞÜŞÖÇ]/.test(mathContent)) {
          const fixedMath = mathContent.replace(
            /([a-zA-ZçşğüöıİĞÜŞÖÇ]+)/g,
            (word: string) => {
              if (/[çşğüöıİĞÜŞÖÇ]/.test(word)) {
                return `\\textit{${word}}`;
              }
              return word;
            }
          );
          return `${border}${fixedMath}${border}`;
        }
        return match;
      }
    );

    // Transform Pandoc-style images to clean markdown images
    // Pattern: ![alt text](absolute/path/to/media/filename.ext){width="..." height="..."}
    // Result: ![](./media/filename.ext)
    newContent = newContent.replace(
      /!\[[^\]]*\]\(([^)]+)\)(?:\{[^}]*\})?/g,
      (match, imagePath) => {
        // Extract just the media/filename part from any path
        const mediaMatch = imagePath.match(/media\/[^/\s]+$/);
        if (mediaMatch) {
          return `![](./media/${mediaMatch[0].replace("media/", "")})`;
        }
        // If already a relative path, just clean up the dimensions
        const cleanPath = imagePath.replace(/^\.?\//, "");
        return `![](${cleanPath})`;
      }
    );

    return newContent;
  }, [content]);

  // Custom components for rendering
  const components: Components = {
    // ... (existing IDs)
    // Add IDs to headings for table of contents navigation
    h1: ({ children, ...props }) => {
      const id = String(children)
        .toLowerCase()
        .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, "")
        .replace(/\s+/g, "-");
      return (
        <h1 id={id} className="scroll-mt-20" {...props}>
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }) => {
      const id = String(children)
        .toLowerCase()
        .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, "")
        .replace(/\s+/g, "-");
      return (
        <h2 id={id} className="scroll-mt-20" {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }) => {
      const id = String(children)
        .toLowerCase()
        .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, "")
        .replace(/\s+/g, "-");
      return (
        <h3 id={id} className="scroll-mt-20" {...props}>
          {children}
        </h3>
      );
    },
    h4: ({ children, ...props }) => {
      const id = String(children)
        .toLowerCase()
        .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, "")
        .replace(/\s+/g, "-");
      return (
        <h4 id={id} className="scroll-mt-20" {...props}>
          {children}
        </h4>
      );
    },
    h5: ({ children, ...props }) => {
      const id = String(children)
        .toLowerCase()
        .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, "")
        .replace(/\s+/g, "-");
      return (
        <h5 id={id} className="scroll-mt-20" {...props}>
          {children}
        </h5>
      );
    },
    h6: ({ children, ...props }) => {
      const id = String(children)
        .toLowerCase()
        .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF\s-]/g, "")
        .replace(/\s+/g, "-");
      return (
        <h6 id={id} className="scroll-mt-20" {...props}>
          {children}
        </h6>
      );
    },
    // Style tables from Pandoc HTML output
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto my-6">
        <table className="min-w-full border-collapse" {...props}>
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }) => (
      <th
        className="border border-zinc-700 px-4 py-2 text-left font-semibold"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="border border-zinc-700 px-4 py-2" {...props}>
        {children}
      </td>
    ),
    // Style images - convert various path formats to API endpoint
    img: ({ src, ..._props }) => {
      let imageSrc = src;

      if (
        lessonType &&
        typeof src === "string" &&
        !src.startsWith("http") &&
        !src.startsWith("/api/")
      ) {
        // Rewrite path to point to /notes/[Folder]/...
        // e.g. src="media/image.png" -> /notes/[lessonType]/media/image.png

        let cleanPath = src;

        // If it's something like `media/image1.webp` or `./media/image1.webp`
        const mediaMatch = src.match(/media\/[^/]+$/);
        if (mediaMatch) {
          cleanPath = mediaMatch[0]; // media/image1.webp
        } else {
          cleanPath = src.replace(/^\.?\//, "");
        }

        // If lessonType is the *real folder name*, we can plain use it.
        imageSrc = `/notes/${encodeURIComponent(lessonType)}/${cleanPath}`;
      }

      return (
        <img
          src={imageSrc as string}
          alt=""
          title=""
          className="max-w-full h-auto rounded-lg border border-zinc-700 mx-auto block my-6"
          loading="lazy"
          {..._props}
        />
      );
    },
    // Style code blocks
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !match;

      if (isInline) {
        return (
          <code
            className="bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono"
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <code
          className={`block bg-zinc-900 p-4 rounded-lg overflow-x-auto font-mono text-sm ${className}`}
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }) => (
      <pre className="my-4 overflow-x-auto" {...props}>
        {children}
      </pre>
    ),
    // Style blockquotes
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-4 border-accent pl-4 italic text-foreground"
        {...props}
      >
        {children}
      </blockquote>
    ),
    // Style lists
    ul: ({ children, ...props }) => (
      <ul className="list-disc ml-6 my-4 space-y-2 text-foreground" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol
        className="list-decimal ml-6 my-4 space-y-2 text-foreground"
        {...props}
      >
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="pl-1" {...props}>
        {children}
      </li>
    ),
    // Style links
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
        {...props}
      >
        {children}
      </a>
    ),
    // Style paragraphs
    p: ({ children, ...props }) => (
      <p
        className="my-4 leading-relaxed last:mb-0 font-normal text-foreground"
        {...props}
      >
        {children}
      </p>
    ),
    // Fix colgroup whitespace issue
    colgroup: ({ children, ...props }) => {
      // Filter out text nodes (whitespace) to prevent hydration errors
      const filteredChildren = React.Children.toArray(children).filter(
        (child) =>
          typeof child !== "string" ||
          (typeof child === "string" && child.trim() !== "")
      );
      return <colgroup {...props}>{filteredChildren}</colgroup>;
    },
    // Horizontal rule
    hr: () => <hr className="my-8 border-zinc-700" />,
    // Custom directive component
    "question-generator": ({ chunkId }: { chunkId?: string }) => {
        if (!chunkId) return null;
        return (
            <div className="my-4 not-prose">
                <GenerateQuestionButton chunkId={chunkId} />
            </div>
        );
    }
  } as Components;

  return (
    <div
      className={`note-viewer prose prose-invert prose-zinc max-w-none ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          remarkMath,
          remarkDirective,
          remarkCustomDirectives,
        ]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeKatex, { strict: false }], // Allow Turkish characters in math mode
        ]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
