import { useMemo } from 'react';
import { type CourseTopic } from '@/features/courses/types/courseTypes';

export interface UseNotesHighlightProps {
  /** Mevcut seçili olan bölüm (chunk) verisi */
  currentChunk: CourseTopic | undefined;
  /** Arama gecikmeli sorgusu (highlight için) */
  debouncedQuery: string;
}

/**
 * Belirtilen ders bölümünün içerisindeki markdown içeriğinde aranan kelimeleri,
 * KaTeX ve Kod bloklarını bozmadan güvenli bir şekilde <mark> etiketleri ile sarar.
 *
 * @param {UseNotesHighlightProps} props
 * @returns {string} Transformasyondan geçmiş (vurgulanmış) HTML/Markdown içeriği
 */
export function useNotesHighlight({
  currentChunk,
  debouncedQuery,
}: UseNotesHighlightProps): string {
  const transformedContent: string = useMemo(() => {
    if (!currentChunk || !debouncedQuery || debouncedQuery.length < 2) {
      return currentChunk?.content || '';
    }

    const content: string = currentChunk.content;
    const protectedZones: { start: number; end: number }[] = [];
    const protectionRegex: RegExp =
      /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|`{3}[\s\S]*?`{3}|`[\s\S]*?`)/g;

    let match: RegExpExecArray | null;
    while ((match = protectionRegex.exec(content)) !== null) {
      protectedZones.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    const matchPositions: { start: number; text: string }[] = [];
    const escapedQuery: string = debouncedQuery.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );
    const searchRegex: RegExp = new RegExp(escapedQuery, 'gi');

    while ((match = searchRegex.exec(content)) !== null) {
      const currentPosition = match.index;
      const isInsideProtectedZone: boolean = protectedZones.some(
        (zone) => currentPosition >= zone.start && currentPosition < zone.end
      );

      if (!isInsideProtectedZone) {
        matchPositions.push({ start: currentPosition, text: match[0] });
      }
    }

    let resultContent: string = content;
    for (let i = matchPositions.length - 1; i >= 0; i--) {
      const { start, text } = matchPositions[i];
      resultContent =
        resultContent.substring(0, start) +
        `<mark id="search-result-${start}">${text}</mark>` +
        resultContent.substring(start + text.length);
    }

    return resultContent;
  }, [currentChunk, debouncedQuery]);

  return transformedContent;
}
