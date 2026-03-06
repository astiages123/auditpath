import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/utils/stringHelpers';

export interface ToCTitleRendererProps {
  /** İçindekiler tablosunda gösterilecek başlık metni */
  title: string;
  /** Ek CSS sınıfları (esneklik için) */
  className?: string;
}

/**
 * İçindekiler (ToC) listesindeki başlıkları güvenli bir şekilde render eden
 * ve markdown içerebilecek (örn: matematiksel ifadeler, KaTeX) başlıkları
 * bozulmadan gösteren bileşen.
 *
 * @param {ToCTitleRendererProps} props
 * @returns {React.ReactElement}
 */
export const ToCTitleRenderer = memo(function ToCTitleRenderer({
  title,
  className,
}: ToCTitleRendererProps): React.ReactElement {
  // Rakam sonrası gelen noktaları (1., 2.) markdown syntaxından kaçırıyoruz ki
  // siparişli liste (ordered list) elemanı olarak algılanmasın.
  const escapedTitle: string = title.replace(/(\d+)\./g, '$1\\.');

  return (
    <div className={cn('whitespace-normal wrap-break-word', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // A etiketleri içinde block element (P) bozulma yaratabileceği için inline (span) olarak eziyoruz.
          p: ({ ...props }) => (
            <span
              style={{ display: 'inline' }}
              className="whitespace-normal wrap-break-word"
              {...props}
            />
          ),
          // Matematik ifadelerinin inline görünmesini garantilemek.
          div: ({ className: innerClass, ...props }) => {
            return (
              <span
                className={cn('whitespace-normal wrap-break-word', innerClass)}
                {...props}
              />
            );
          },
          // İçindekiler listesinde her şey aynı font-weight olmalı. Bold & italic etkisini kapattık.
          strong: ({ ...props }) => <span {...props} />,
          em: ({ ...props }) => <span {...props} />,
        }}
        allowedElements={['p', 'span', 'strong', 'em', 'code', 'br']}
        unwrapDisallowed={true} // İzin verilmeyen etiketlerin içindeki metni korur, sadece dış sargıyı çıkarır.
      >
        {escapedTitle}
      </ReactMarkdown>
    </div>
  );
});
