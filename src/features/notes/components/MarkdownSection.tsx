import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { slugify } from '@/utils/stringHelpers';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
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
        className="chunk-container scroll-mt-24 mb-12 last:mb-0 relative"
      >
        <article className="prose prose-lg prose-invert max-w-none bg-background/50 rounded-2xl backdrop-blur-sm pt-8 md:pt-10 pb-12 px-6 md:px-10 lg:px-12">
          {chunk.section_title && (
            <div className="section-header border-b border-primary">
              <h1>{chunk.section_title}</h1>
            </div>
          )}
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
