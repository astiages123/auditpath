import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { slugify } from '@/utils/stringHelpers';
import { useNotesNavigation } from './useNotesNavigation';
import { useTableOfContents } from './useTableOfContents';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { type ExtendedToCItem } from '../logic/notesLogic';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

export interface UseNotesPageProps {
  /** Geçerli kurs URL slug'u (Adlandırıcısı) */
  courseSlug: string | undefined;
  /** Geçerli başlık/konu slug'u */
  topicSlug: string | undefined;
  /** Derse ait konu yığınları içeriği */
  chunks: CourseTopic[];
  /** Konuların veri çekimi durumunu belirtir */
  loading: boolean;
  /** Kimlik doğrulama ID'si */
  userId?: string;
}

export interface UseNotesPageReturn {
  /** Aktif olan yığının (chunk) kimliği */
  activeChunkId: string;
  /** Aktif olan yığının veri nesnesi */
  activeChunk: CourseTopic | undefined;
  /** Bölüm okunma süresi tahmini (Dakika cinsinden) */
  readingTimeMinutes: number | undefined;
  /** Ana sayfa içeriğinin bulunduğu kapsayıcı dizin (ref) */
  mainContentRef: React.RefObject<HTMLDivElement | null>;
  /** ID tabanlı kaydırma işlevi */
  handleScrollToId: (
    id: string,
    setActiveSection: (id: string) => void
  ) => void;
  /** Sayfa tepesine çıkış işlevi */
  scrollToTop: () => void;
  /** Ekranda aktif olan, okunan başlığın (section) kimliği */
  activeSection: string;
  /** Ekranda aktif olan bölümü dışarıdan seçmeye (odaklamaya) yarayan set durumu */
  setActiveSection: (id: string) => void;
  /** Aktif yığını (chunk) baz alan İçindekiler listesi (ToC) tablosu */
  currentChunkToC: ExtendedToCItem[];
  /** Sol panel menüsünden başka bir ders parçasına global tıklama işlemi */
  handleGlobalClick: (chunkId: string) => void;
}

// === BÖLÜM ADI: HOOK İŞ MANTIĞI ===
// ===========================

/**
 * Notlar sayfasının genel yaşam döngüsünü, sayfalama ve kaydırma gibi navigasyonlarını
 * bir asansör görevi görerek alt kancalara dağıtan çatı (orchestrator) fonksiyondur.
 *
 * @param {UseNotesPageProps} props
 * @returns {UseNotesPageReturn}
 */
export function useNotesPage({
  courseSlug,
  topicSlug,
  chunks,
  loading,
}: UseNotesPageProps): UseNotesPageReturn {
  const navigate = useNavigate();

  // Aktif Konu Slug'unu çözümler
  const activeChunkId: string = useMemo(() => {
    if (topicSlug) return topicSlug;
    return '';
  }, [topicSlug]);

  // ID'den aktif Konu nesnesini bulur
  const activeChunk: CourseTopic | undefined = useMemo(() => {
    return activeChunkId
      ? chunks.find(
          (c: CourseTopic) => slugify(c.section_title) === activeChunkId
        )
      : undefined;
  }, [chunks, activeChunkId]);

  // Okuma süresi hesaplaması
  const readingTimeMinutes: number | undefined = useMemo(() => {
    if (!activeChunk?.content) return undefined;
    return Math.max(
      1,
      Math.ceil(activeChunk.content.split(/\s+/).length / 200)
    );
  }, [activeChunk]);

  // Navigasyon hook'una bağlantı
  const {
    mainContentRef,
    isProgrammaticScroll,
    handleScrollToId,
    scrollToTop,
  } = useNotesNavigation({
    courseSlug,
    loading,
    chunks,
    activeChunkId,
  });

  // İçindekiler Tablosu hook'una bağlantı
  const { activeSection, setActiveSection, currentChunkToC } =
    useTableOfContents({
      chunks,
      loading,
      activeChunkId,
      mainContentRef,
      isProgrammaticScroll,
    });

  /** Sol kısımdan, genel navigasyon sisteminden (Diğer bir konu başlığına) tıklandığında */
  const handleGlobalClick = (chunkId: string): void => {
    try {
      if (courseSlug) {
        navigate(`${ROUTES.NOTES}/${courseSlug}/${chunkId}`);
      }
    } catch (error: unknown) {
      console.error('[useNotesPage][handleGlobalClick] Hata:', error);
    }
  };

  return {
    activeChunkId,
    activeChunk,
    readingTimeMinutes,
    mainContentRef,
    handleScrollToId,
    scrollToTop,
    activeSection,
    setActiveSection,
    currentChunkToC,
    handleGlobalClick,
  };
}
