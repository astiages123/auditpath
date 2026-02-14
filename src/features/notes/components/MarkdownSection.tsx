import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { slugify } from '@/utils/core';
import { type CourseTopic } from '@/types';
import { markdownComponents } from './MarkdownComponents';

interface MarkdownSectionProps {
  chunk: CourseTopic;
  components?: typeof markdownComponents;
}

export const MarkdownSection = memo(
  ({ chunk, components = markdownComponents }: MarkdownSectionProps) => {
    const sectionId = slugify(chunk.section_title);

    return (
      <div
        id={sectionId}
        className="chunk-container scroll-mt-24 mb-24 last:mb-0 relative"
      >
        {chunk.section_title && (
          <div className="section-header mb-8 pb-4 border-b border-border/40">
            <h1 className="text-3xl font-bold tracking-tight text-center text-foreground">
              {chunk.section_title}
            </h1>
          </div>
        )}
        <article className="prose prose-lg prose-slate prose-invert max-w-none">
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
