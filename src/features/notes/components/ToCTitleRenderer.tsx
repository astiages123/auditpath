import React, { memo } from 'react';
import { cn } from '@/shared/lib/core/utils';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // Ensure CSS is imported if not globally available, though NotesPage usually has it.

interface ToCTitleRendererProps {
  title: string;
  className?: string; // Allow passing external classes
}

export const ToCTitleRenderer = memo(function ToCTitleRenderer({
  title,
  className,
}: ToCTitleRendererProps) {
  // Escape dots after numbers to prevent Markdown from interpreting them as ordered lists
  // e.g. "1. Introduction" -> "1\. Introduction"
  const escapedTitle = title.replace(/(\d+)\./g, '$1\\.');

  return (
    <div className={cn('whitespace-normal wrap-break-word', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Override paragraph to span to avoid block-level disruption inside anchors
          p: ({ ...props }) => (
            <span
              style={{ display: 'inline' }}
              className="whitespace-normal wrap-break-word"
              {...props}
            />
          ),
          // Ensure math is rendered inline
          div: ({ className: innerClass, ...props }) => {
            return (
              <span
                className={cn('whitespace-normal wrap-break-word', innerClass)}
                {...props}
              />
            );
          },
        }}
        allowedElements={['p', 'span', 'strong', 'em', 'code', 'br']}
        // We limit elements to avoid inserting huge blocks like H1 or Images in a ToC link
        unwrapDisallowed={true}
      >
        {escapedTitle}
      </ReactMarkdown>
    </div>
  );
});
