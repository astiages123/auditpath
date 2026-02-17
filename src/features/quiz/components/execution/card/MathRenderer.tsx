import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Move plugin arrays outside to prevent unnecessary re-renders
const remarkPlugins = [remarkMath];
const rehypePlugins = [rehypeKatex];

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <span className="inline">{children}</span>
  ),
};

interface MathRendererProps {
  content: string;
}

/**
 * MathRenderer component with KaTeX support
 *
 * Cleans content by removing image references and visual markers
 * before rendering as Markdown with math support.
 */
export const MathRenderer = memo(function MathRenderer({
  content,
}: MathRendererProps) {
  if (!content) return null;

  // Clean content: remove (image.ext) references, [GÖRSEL: X] markers and excessive newlines
  let cleanContent = content
    .replace(/\([\w-]+\.(webp|png|jpg|jpeg|gif)\)/gi, '')
    .replace(/\[GÖRSEL:\s*\d+\]/gi, '')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  // Format numbers (e.g., 12 000 -> 12.000)
  cleanContent = cleanContent.replace(/(\d)\s+(?=\d{3}(?:\s|$|\D))/g, '$1.');

  return (
    <div className="math-rendering upright-math">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
});

export default MathRenderer;
