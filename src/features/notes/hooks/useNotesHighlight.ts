import { useMemo } from 'react';
import { type CourseTopic } from '@/features/courses/types/courseTypes';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

export interface UseNotesHighlightProps {
  /** Mevcut seçili olan bölüm (chunk) verisi */
  currentChunk: CourseTopic | undefined;
  /** Arama gecikmeli sorgusu (highlight için) */
  debouncedQuery: string;
}

// === BÖLÜM ADI: HOOK İŞ MANTIĞI ===
// ===========================

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
    try {
      if (!currentChunk || !debouncedQuery || debouncedQuery.length < 2) {
        return currentChunk?.content || '';
      }

      const content: string = currentChunk.content;

      // 1. ADIM: "Korunan alanları" bul. LaTeX ve Markdown Kod blokları
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

      // 2. ADIM: Korunan alanların dışındaki arama kelimelerini bul
      const matchPositions: { start: number; text: string }[] = [];
      const escapedQuery: string = debouncedQuery.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );
      const searchRegex: RegExp = new RegExp(escapedQuery, 'gi');

      while ((match = searchRegex.exec(content)) !== null) {
        const currentPos: number = match.index;
        const isInsideProtectedZone: boolean = protectedZones.some(
          (zone) => currentPos >= zone.start && currentPos < zone.end
        );

        if (!isInsideProtectedZone) {
          matchPositions.push({ start: currentPos, text: match[0] });
        }
      }

      // 3. ADIM: <mark> Etiketlerini en sondan başa doğru ekle
      // Dizindeki indeksleri kaydırmamak için sondan ekliyoruz.
      let resultContent: string = content;
      for (let i = matchPositions.length - 1; i >= 0; i--) {
        const { start, text } = matchPositions[i];
        resultContent =
          resultContent.substring(0, start) +
          `<mark id="search-result-${start}">${text}</mark>` +
          resultContent.substring(start + text.length);
      }

      return resultContent;
    } catch (error: unknown) {
      console.error('[useNotesHighlight][transformedContent] Hata:', error);
      return currentChunk?.content || '';
    }
  }, [currentChunk, debouncedQuery]);

  return transformedContent;
}
