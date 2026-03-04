import { useState } from 'react';
import { type SearchResult } from '../types';
import { useSearch } from './useSearch';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

export interface UseNotesSearchProps {
  /** Hook içinde aranacak tam metin */
  content: string;
  /** Sonuçlara tıklanınca kaydırma yapılacak DOM kapsayıcısı referansı */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseNotesSearchReturn {
  /** Arama modalı veya panelinin açık/kapalı durumu */
  isSearchOpen: boolean;
  /** Şu anda girilmiş olan anlık arama sorgusu */
  searchQuery: string;
  /** Arama sorgusunu güncelleyen setState fonksiyonu */
  setSearchQuery: (query: string) => void;
  /** Gecikmeli uygulanan, debounce edilmiş arama sorgusu (vurgulama vb için kullanılır) */
  debouncedQuery: string;
  /** Arama panelinin açma/kapama fonksiyonu */
  toggleSearch: () => void;
  /** Arama sonuçları listesi */
  results: SearchResult[];
  /** Arama sonucuna tıklandığında elemanı merkeze kaydırarak odaklayan fonksiyon */
  handleSearchResultClick: (result: SearchResult) => void;
}

// === BÖLÜM ADI: HOOK İŞ MANTIĞI ===
// ===========================

/**
 * Notlar sayfasında UI arama durumuyla mantıksal arama kancasını birleştirir.
 * Sonuç seçildiğinde düzgün kaydırma (scroll) hesaplamalarını da içerir.
 *
 * @param {UseNotesSearchProps} props
 * @returns {UseNotesSearchReturn}
 */
export function useNotesSearch({
  content,
  containerRef,
}: UseNotesSearchProps): UseNotesSearchReturn {
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { results, debouncedQuery } = useSearch({
    content,
    query: searchQuery,
  });

  const handleSearchResultClick = (result: SearchResult): void => {
    try {
      const element: HTMLElement | null = document.getElementById(result.id);
      if (element && containerRef.current) {
        const container: HTMLDivElement = containerRef.current;
        const elementRect: DOMRect = element.getBoundingClientRect();
        const containerRect: DOMRect = container.getBoundingClientRect();

        // Öğeyi ekranın tam ortasına getirecek kaydırma formülü
        const relativeTop: number = elementRect.top - containerRect.top;
        const scrollTarget: number =
          container.scrollTop +
          relativeTop -
          container.clientHeight / 2 +
          element.clientHeight / 2;

        container.scrollTo({
          top: scrollTarget,
          behavior: 'smooth',
        });
      }
    } catch (error: unknown) {
      console.error('[useNotesSearch][handleSearchResultClick] Hata:', error);
    }
  };

  const toggleSearch = (): void => {
    if (isSearchOpen) {
      setSearchQuery('');
    }
    setIsSearchOpen(!isSearchOpen);
  };

  return {
    isSearchOpen,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    toggleSearch,
    results,
    handleSearchResultClick,
  };
}
