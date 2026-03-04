import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import {
  type ExtendedToCItem,
  generateTOCFromContent,
} from '../logic/notesLogic';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

export interface UseTableOfContentsProps {
  /** Derse ait konu yığınları listesi */
  chunks: CourseTopic[];
  /** Veri yükleme durumunu kontrol eder */
  loading: boolean;
  /** Mevcut görüntülenen yığının benzersiz kimliği */
  activeChunkId: string;
  /** İşlenecek ve yüksekliği ölçülecek DOM başlık container referansı */
  mainContentRef: React.RefObject<HTMLDivElement | null>;
  /** Kullanıcının el ile kaydırmadığını anlamayı sağlayan navigasyon state'i */
  isProgrammaticScroll: React.MutableRefObject<boolean>;
}

export interface UseTableOfContentsReturn {
  /** Kaydırılabilir alanındaki tamamen renderlanmış içindekiler nesnesi listesi */
  toc: ExtendedToCItem[];
  /** Kullanıcının okuma bölgesinde mevcut izlenen alt başlık kimliği */
  activeSection: string;
  /** Aktif izleme kimliğini el ile atamaya olanak tanıyan yöntem */
  setActiveSection: (id: string) => void;
  /** Yalnızca geçerli ana yığına (chunk) bağlı hiyerarşik tablo içeriği (ToC) */
  currentChunkToC: ExtendedToCItem[];
}

// === BÖLÜM ADI: HOOK İŞ MANTIĞI ===
// ===========================

/**
 * Makale içeriklerini baz alarak tarayıcıda dinamik olarak yer alan ToC (Table of content)
 * "İçindekiler" ağacının takibini yapan Intersection/Scroll Observer Hook'u.
 */
export const useTableOfContents = ({
  chunks,
  loading,
  activeChunkId,
  mainContentRef,
  isProgrammaticScroll,
}: UseTableOfContentsProps): UseTableOfContentsReturn => {
  const [activeSection, setActiveSection] = useState<string>('');
  const lastActiveRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headingsRef = useRef<HTMLElement[]>([]);
  const rafRef = useRef<number | null>(null);

  // === KAYDIRMA ESASLI BAŞLIK ALGILAYICI ===
  const calculateActiveHeading = useCallback((): void => {
    try {
      const container: HTMLDivElement | null = containerRef.current;
      const headings: HTMLElement[] = headingsRef.current;

      if (!container || headings.length === 0) return;

      const scrollTop: number = container.scrollTop;
      let activeHeadingId: string = headings[0].id;

      // Döngü üzerinden her bir başlığın konumunu denetleriz. Sadece pencerenin tepesine
      // temasa yaklaşan (10px buffer) öğe kabul görür, bu şekilde eski bölüm temiz kaybolur.
      for (let i = 0; i < headings.length; i++) {
        const heading: HTMLElement = headings[i];
        const headingTop: number = heading.offsetTop;

        if (scrollTop >= headingTop - 10) {
          activeHeadingId = heading.id;
        } else {
          break; // Konum itibariyle ekran altı bir elemana gelindi
        }
      }

      // Yeni ve farklıysa durumu güncelle.
      if (activeHeadingId && activeHeadingId !== lastActiveRef.current) {
        lastActiveRef.current = activeHeadingId;
        setActiveSection(activeHeadingId);
      }
    } catch (error: unknown) {
      console.error(
        '[useTableOfContents][calculateActiveHeading] Hata:',
        error
      );
    }
  }, []);

  // === BAŞLANGIÇ & DİNLEYİCİ (LISTENERS) ===
  useEffect(() => {
    if (loading || chunks.length === 0) return;

    containerRef.current = document.getElementById(
      'notes-scroll-container'
    ) as HTMLDivElement | null;

    if (!containerRef.current) return;

    const setupObservation = (): void => {
      try {
        headingsRef.current = Array.from(
          mainContentRef.current?.querySelectorAll('h1, h2, h3, h4, h5') || []
        ) as HTMLElement[];

        if (headingsRef.current.length > 0) {
          const firstHeading: HTMLElement = headingsRef.current[0];
          if (firstHeading.id) {
            lastActiveRef.current = firstHeading.id;
            setActiveSection(firstHeading.id);
          }
        }

        // Başlangıç esnasında bir kez ölçümle
        calculateActiveHeading();
      } catch (error: unknown) {
        console.error('[useTableOfContents][setupObservation] Hata:', error);
      }
    };

    // Component'lerin DOM ağacına yerleşebilmeleri için ufak bir bekleme payı
    const initializationTimer: NodeJS.Timeout = setTimeout(
      setupObservation,
      150
    );

    const handleScroll = (): void => {
      // Navigasyon tıklamalarındaki otomatik kaydırma çakışmalarını izole eder
      if (isProgrammaticScroll.current) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      // Optimize rendering (requestAnimationFrame)
      rafRef.current = requestAnimationFrame(calculateActiveHeading);
    };

    containerRef.current.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => {
      clearTimeout(initializationTimer);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      containerRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, [
    chunks,
    loading,
    activeChunkId,
    mainContentRef,
    isProgrammaticScroll,
    calculateActiveHeading,
  ]);

  // Yeni bölüm/chunk yklendiğinde Node dizimini sıfırlama
  useEffect(() => {
    if (loading || chunks.length === 0) return;

    headingsRef.current = Array.from(
      mainContentRef.current?.querySelectorAll('h1, h2, h3, h4, h5') || []
    ) as HTMLElement[];
  }, [activeChunkId, loading, chunks.length, mainContentRef]);

  const forceActiveSection = useCallback((sectionId: string): void => {
    lastActiveRef.current = sectionId;
    setActiveSection(sectionId);
  }, []);

  // Tüm konuların (Full course) içindekiler haritası
  const toc: ExtendedToCItem[] = useMemo(() => {
    return generateTOCFromContent(chunks);
  }, [chunks]);

  // Mevcut okunan konunun (Active chunk) alt başlıkları ve seviyeleri
  const currentChunkToC: ExtendedToCItem[] = useMemo(() => {
    return activeChunkId
      ? toc.filter(
          (item: ExtendedToCItem) =>
            item.chunkId === activeChunkId && item.level > 1
        )
      : [];
  }, [toc, activeChunkId]);

  return {
    toc,
    activeSection,
    setActiveSection: forceActiveSection,
    currentChunkToC,
  };
};
