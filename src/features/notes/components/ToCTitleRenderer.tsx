'use client';

import React, { memo } from 'react';
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
  // If no math/markdown suspicious chars, return string directly for performance?
  // But strictly speaking we want consistency.
  
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Override paragraph to span to avoid block-level disruption inside anchors
          p: ({ node, ...props }) => <span {...props} />,
          // Ensure math is rendered inline
          div: ({ node, className, ...props }) => {
             // If it's display math, we might want to keep it inline for ToC or allow block?
             // Usually ToC items are single line.
             // Let's force inline style if it tries to be block
             return <span className={className} {...props} />;
          }
        }}
        allowedElements={['p', 'span', 'strong', 'em', 'code', 'br']} 
        // We limit elements to avoid inserting huge blocks like H1 or Images in a ToC link
        unwrapDisallowed={true}
      >
        {title}
      </ReactMarkdown>
    </div>
  );
});
