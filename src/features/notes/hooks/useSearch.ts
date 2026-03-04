import { useEffect, useMemo, useState } from 'react';
import { type SearchResult } from '../types';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

export interface UseSearchProps {
  /** Aranacak ham metin içeriği */
  content: string;
  /** Kullanıcının girdiği arama sorgusu */
  query: string;
  /** Arama gecikmesi (debounce) süresi ms cinsinden, varsayılan 300 */
  debounceMs?: number;
}

export interface UseSearchReturn {
  /** Bulunan arama sonuçları listesi */
  results: SearchResult[];
  /** Gecikmeli uygulanan arama sorgusu (vurgulama için) */
  debouncedQuery: string;
}

// === BÖLÜM ADI: YARDIMCI GİZLİ FONKSİYONLAR ===
// ===========================

/**
 * Arama sonuçlarındaki Markdown gösterimlerini temizler, ancak formülleri korur.
 *
 * @param {string} text - Temizlenecek metin parçacığı
 * @returns {string} Temizlenmiş metin
 */
function cleanSnippetText(text: string): string {
  try {
    let cleaned: string = text
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // Kalın
      .replace(/(\*|_)(.*?)\1/g, '$2') // İtalik
      .replace(/#+\s+/g, '') // Başlıklar
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Linkler
      .replace(/`{1,3}[\s\S]*?`{1,3}/g, '[Kod]') // Kod blokları
      .replace(/>\s+/g, '') // Alıntılar
      .replace(/-\s+/g, '') // Liste elemanları
      .replace(/\n+/g, ' '); // Satır atlamaları

    const dollarCount: number = (cleaned.match(/\$/g) || []).length;
    if (dollarCount % 2 !== 0) {
      cleaned = cleaned.replace(/\$/g, '');
    }

    return cleaned;
  } catch (error: unknown) {
    console.error('[useSearch][cleanSnippetText] Hata:', error);
    return text;
  }
}

/**
 * Normal ifadelerde (Regex) sorun yaratabilecek özel karakterleri kaçırır.
 *
 * @param {string} string - Kaçırılacak metin
 * @returns {string} Güvenli metin
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// === BÖLÜM ADI: HOOK İŞ MANTIĞI ===
// ===========================

/**
 * Metin içerisinde gelişmiş arama yapan, LaTeX ve özel blokları atlayan özel kanca.
 *
 * @param {UseSearchProps} props - Hook özellikleri
 * @returns {UseSearchReturn} Arama sonuçları ve ilgili durum değişkenleri
 */
export function useSearch({
  content,
  query,
  debounceMs = 300,
}: UseSearchProps): UseSearchReturn {
  const [debouncedQuery, setDebouncedQuery] = useState<string>(query);

  useEffect(() => {
    const handler: NodeJS.Timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [query, debounceMs]);

  const results = useMemo<SearchResult[]>(() => {
    try {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];

      const searchResults: SearchResult[] = [];
      const escapedQuery: string = escapeRegExp(debouncedQuery);
      const searchRegex: RegExp = new RegExp(escapedQuery, 'gi');

      const protectedRanges: [number, number][] = [];
      const latexRegex: RegExp = /\$\$[\s\S]*?\$\$|\$[\s\S]*?\$/g;
      let latexMatch: RegExpExecArray | null;

      while ((latexMatch = latexRegex.exec(content)) !== null) {
        protectedRanges.push([
          latexMatch.index,
          latexMatch.index + latexMatch[0].length,
        ]);
      }

      let match: RegExpExecArray | null;
      while ((match = searchRegex.exec(content)) !== null) {
        const pos: number = match.index;
        const matchTextOriginal: string = match[0];

        const isProtected: boolean = protectedRanges.some(
          ([start, end]) => pos >= start && pos < end
        );

        if (!isProtected) {
          const contentBefore: string = content.substring(0, pos);
          const contentAfter: string = content.substring(
            pos + matchTextOriginal.length
          );

          const lastNewlineBefore: number = contentBefore.lastIndexOf('\n');
          const firstNewlineAfter: number = contentAfter.indexOf('\n');

          const lineStart: number =
            lastNewlineBefore === -1 ? 0 : lastNewlineBefore + 1;
          const lineEnd: number =
            firstNewlineAfter === -1
              ? content.length
              : pos + matchTextOriginal.length + firstNewlineAfter;

          const beforeContent: string = content.substring(lineStart, pos);
          const afterContent: string = content.substring(
            pos + matchTextOriginal.length,
            lineEnd
          );

          const wordRegex: RegExp = /\S+/g;
          const beforeMatches: RegExpMatchArray[] = Array.from(
            beforeContent.matchAll(wordRegex)
          );
          const afterMatches: RegExpMatchArray[] = Array.from(
            afterContent.matchAll(wordRegex)
          );

          const startInBefore: number =
            beforeMatches.length >= 2
              ? (beforeMatches[beforeMatches.length - 2].index ?? 0)
              : 0;

          const endInAfter: number =
            afterMatches.length >= 2
              ? (afterMatches[1].index ?? 0) + afterMatches[1][0].length
              : afterContent.length;

          const beforeRaw: string = beforeContent.substring(startInBefore);
          const afterRaw: string = afterContent.substring(0, endInAfter);

          searchResults.push({
            id: `search-result-${pos}`,
            before: cleanSnippetText(beforeRaw),
            match: matchTextOriginal,
            after: cleanSnippetText(afterRaw),
            index: pos,
          });
        }

        if (searchResults.length >= 30) break;
      }

      return searchResults;
    } catch (error: unknown) {
      console.error('[useSearch][results] Hata:', error);
      return [];
    }
  }, [content, debouncedQuery]);

  return { results, debouncedQuery };
}
