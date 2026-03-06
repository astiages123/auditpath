import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { slugify } from '@/utils/stringHelpers';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { markdownComponents } from '@/features/notes/components/content/MarkdownComponents';

export interface MarkdownSectionProps {
  /** Eğitimin alt bölüm içerik objesi (Markdown yığını) */
  chunk: CourseTopic;
}

/**
 * Derse ait metin parçacıklarını (chunk) birer makale (prose) bloğu
 * olarak çevirip sayfa içerisinde sergileyen Markdown işleyici bileşeni.
 *
 * @param {MarkdownSectionProps} props
 * @returns {React.ReactElement}
 */
export const MarkdownSection = memo(function MarkdownSection({
  chunk,
}: MarkdownSectionProps): React.ReactElement {
  const sectionId: string = slugify(chunk.section_title);

  return (
    <div
      id={sectionId}
      className="chunk-container scroll-mt-24 mb-12 last:mb-0 relative"
    >
      <article className="prose prose-lg prose-invert max-w-none pt-8 md:pt-10 pb-12 px-6 md:px-10 lg:px-12">
        {chunk.section_title && (
          <div className="section-header border-b border-primary">
            <h1>{chunk.section_title}</h1>
          </div>
        )}
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[
            [rehypeKatex, { strict: false, throwOnError: false }],
            // rehypeRaw kullanılıyor çünkü bazı HTML etiketlerine (örn: Mermaid, özel div'ler) ihtiyacımız var.
            // Güvenlik, contentProcessor.ts içindeki DOMPurify ile sağlanmaktadır.
            rehypeRaw,
          ]}
          components={markdownComponents}
        >
          {chunk.content}
        </ReactMarkdown>
      </article>
    </div>
  );
});
