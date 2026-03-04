import { useEffect, useLayoutEffect, useRef } from 'react';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import { useNotesStore } from '@/features/notes/store';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

export interface UseNotesNavigationProps {
  /** Ders URL adlandırıcısı (slug) */
  courseSlug?: string;
  /** İçerik durumu yüklemede mi? */
  loading: boolean;
  /** Derse ait konu yığınları listesi */
  chunks: CourseTopic[];
  /** Kullanıcının görüntülemekte olduğu mevcut chunk ID'si */
  activeChunkId: string;
}

export interface UseNotesNavigationReturn {
  /** Metinlerin bulunduğu içerik container DOM noktası */
  mainContentRef: React.MutableRefObject<HTMLDivElement | null>;
  /** Kullanıcı tarafından tetiklenen scroll mu yoksa scrollTo/programlı kaydırma mı */
  isProgrammaticScroll: React.MutableRefObject<boolean>;
  /** Sayfa içi bağlantıya (id) doğru kaydırmayı sağlayan ana fonksiyon */
  handleScrollToId: (
    id: string,
    setActiveSection?: (id: string) => void
  ) => void;
  /** Sayfa başına doğrudan yumuşak kaydırma fonksiyonu */
  scrollToTop: () => void;
}

// === BÖLÜM ADI: YARDIMCI FONKSİYON VE REFERANSLAR ===
// ===========================

interface LatestParams {
  lastRead: Record<
    string,
    { topicId: string; scrollPos: number; timestamp: number }
  >;
  courseSlug: string | undefined;
  chunks: CourseTopic[];
}

// === BÖLÜM ADI: HOOK İŞ MANTIĞI ===
// ===========================

/**
 * Notlar içerisindeki son okunan yeri hafızada tutma (store entegrasyonu),
 * sayfa kaydırma, yumuşak geçişli yönlendirme (scrollTo) işlevlerinin ana merkezidir.
 */
export const useNotesNavigation = ({
  courseSlug,
  loading,
  chunks,
  activeChunkId,
}: UseNotesNavigationProps): UseNotesNavigationReturn => {
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScroll = useRef<boolean>(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const saveScrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const lastRead = useNotesStore((state) => state.lastRead);
  const setLastReadTopic = useNotesStore((state) => state.setLastReadTopic);

  // Güncel duruma hook useEffect re-rendering problemlerine
  // girmeden erişmek için local latest (mutble) ref barındırıyoruz
  const latestParams = useRef<LatestParams>({ lastRead, courseSlug, chunks });

  useLayoutEffect(() => {
    latestParams.current = { lastRead, courseSlug, chunks };
  }, [lastRead, courseSlug, chunks]);

  const getScrollContainer = (): Element | null => {
    const mainElement: Element | null = document.querySelector('main');
    if (mainElement) return mainElement;

    return (
      document.getElementById('notes-scroll-container') ||
      mainContentRef.current
    );
  };

  // === 1. KAYDIRMA MOTORU YÖNETİMİ ===
  // Öncelik: Kullanıcının kayıtlı scroll lokasyonunu bulmak, yoksa en tepede resetlemek.
  useEffect(() => {
    const {
      chunks: currentChunks,
      courseSlug: currentSlug,
      lastRead: currentLastRead,
    } = latestParams.current;

    if (loading || currentChunks.length === 0 || !activeChunkId) return;

    let isCancelled: boolean = false;

    const attemptScroll = (): void => {
      try {
        if (isCancelled) return;

        const scrollContainer: Element | null = getScrollContainer();

        if (!scrollContainer) {
          scrollTimeout.current = setTimeout(attemptScroll, 100);
          return;
        }

        isProgrammaticScroll.current = true;

        const savedPos: number =
          currentSlug && currentLastRead[currentSlug]?.topicId === activeChunkId
            ? currentLastRead[currentSlug].scrollPos
            : 0;

        scrollContainer.scrollTo({
          top: !isNaN(savedPos) && savedPos > 0 ? savedPos : 0,
          behavior: 'instant',
        });

        // Animasyon oturması ve frame gecikmelerine karşı koruma (Timeout ile devreden çıkarılır)
        setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 1000);
      } catch (error: unknown) {
        console.error('[useNotesNavigation][attemptScroll] Hata:', error);
      }
    };

    scrollTimeout.current = setTimeout(attemptScroll, 150);

    return () => {
      isCancelled = true;
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [loading, activeChunkId]);

  // === 2. KAYDIRMA KONUMUNU (SCROLL POSITION) KAYDETME YÖNETİMİ ===
  useEffect(() => {
    const scrollContainer: Element | null = getScrollContainer();
    if (!scrollContainer || !courseSlug || !activeChunkId) return;

    const saveScrollPosition = (): void => {
      try {
        // Eğer Javascript bazlı (kod ile) kaydırılmış ise kullanıcı tetiklememiştir, kaydetme
        if (isProgrammaticScroll.current) return;

        if (saveScrollTimeout.current) clearTimeout(saveScrollTimeout.current);

        saveScrollTimeout.current = setTimeout(() => {
          setLastReadTopic(
            courseSlug,
            activeChunkId,
            scrollContainer.scrollTop
          );
        }, 500); // 500ms performans dostu gecikme payı
      } catch (error: unknown) {
        console.error('[useNotesNavigation][saveScrollPosition] Hata:', error);
      }
    };

    scrollContainer.addEventListener('scroll', saveScrollPosition, {
      passive: true,
    });

    return () => {
      scrollContainer.removeEventListener('scroll', saveScrollPosition);
      if (saveScrollTimeout.current) clearTimeout(saveScrollTimeout.current);
    };
  }, [courseSlug, activeChunkId, setLastReadTopic]);

  // === 3. ID BAZLI YÖNTEMLER ===

  const handleScrollToId = (
    id: string,
    setActiveSection?: (id: string) => void
  ): void => {
    try {
      const scrollContainer: Element | null = getScrollContainer();
      isProgrammaticScroll.current = true;

      // İçindekiler aktif objesini değiştirmek için (eğer aktarılmışsa)
      if (setActiveSection) {
        setActiveSection(id);
      }

      const element: HTMLElement | null = document.getElementById(id);
      if (element && scrollContainer) {
        const containerRect: DOMRect = scrollContainer.getBoundingClientRect();
        const elementRect: DOMRect = element.getBoundingClientRect();
        const relativeTop: number = elementRect.top - containerRect.top;

        // Üst panel çakışması engellemek için 10px pay (buffer) bırakıldı
        const targetScrollTop: number =
          scrollContainer.scrollTop + relativeTop - 10;

        scrollContainer.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth',
        });
      }

      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 1500);
    } catch (error: unknown) {
      console.error('[useNotesNavigation][handleScrollToId] Hata:', error);
    }
  };

  const scrollToTop = (): void => {
    try {
      getScrollContainer()?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: unknown) {
      console.error('[useNotesNavigation][scrollToTop] Hata:', error);
    }
  };

  return {
    mainContentRef,
    isProgrammaticScroll,
    handleScrollToId,
    scrollToTop,
  };
};
