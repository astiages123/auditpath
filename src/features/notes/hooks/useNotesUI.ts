import { useCallback, useMemo, useState } from 'react';
import { type CourseTopic } from '@/features/courses/types/courseTypes';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

export interface UseNotesUIProps {
  /** Ders yığınları listesi (scroll vs ilerleme oranlaması için) */
  chunks: CourseTopic[];
  /** Kullanıcının içerisinde bulunduğu sayfanın/yığının URL uzantı karşılığı (kimliği) */
  activeChunkId: string;
}

export interface UseNotesUIReturn {
  /** Sol menü paneli açık/kapalı durumu */
  isLeftPanelVisible: boolean;
  /** Sol paneli değiştiren set değeri */
  setIsLeftPanelVisible: (visible: boolean) => void;
  /** Sağ panel (ToC vs) açık/kapalı durumu */
  isRightPanelVisible: boolean;
  /** Sağ paneli değiştiren set değeri */
  setIsRightPanelVisible: (visible: boolean) => void;
  /** Egzersiz pop-up pencere/çekmece durumu (True=Açık) */
  isQuizDrawerOpen: boolean;
  /** Egzersiz paneli durum eksiği/belirleyicisi */
  setIsQuizDrawerOpen: (open: boolean) => void;
  /** Bölüm bazlı okumanın kaydırma oranına göre %1-100 değer aralığı */
  localProgress: number;
  /** Bölüm bazlı toplam ders performansı okunma ortalaması (gösterimsel max ortalama % üzerinden) */
  totalProgress: number;
  /** Mevcut kullanıcı okuma paneline direkt yansıtılacak (kullanıcının aktif olduğu alandaki) yüzdelik dilim oranı */
  displayProgress: number;
  /** Kaydırma hareketlerini dinleyerek anlık progress ve okuma akım grafiğini işleyen olay işleyicisi */
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

// === BÖLÜM ADI: HOOK İŞ MANTIĞI ===
// ===========================

/**
 * Notlar özelliğinin arayüz durumu kancasıdır.
 * Progress bardaki yüzdelenmeleri hesaplar ve ekran panellerinin boyut/görünürlük ayarlamalarını tetikler.
 *
 * @param {UseNotesUIProps} props
 * @returns {UseNotesUIReturn} UI Panellerinin varlığını, ve not okuma durum oranları (Progress)
 */
export function useNotesUI({
  chunks,
  activeChunkId,
}: UseNotesUIProps): UseNotesUIReturn {
  // === 1. PANEL GÖRÜNÜRLÜK (VISIBILITY) ===
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState<boolean>(() => {
    // Sıkı tip denetiminde window her zaman var olmayabileceğinden
    // window kontrolü yapılır (Sistematik Next.JS ve Vercel build esnekliği de dahil edilmiş olur).
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true; // Varsayılan masaüstü açık (SSR vs fallback)
  });

  const [isRightPanelVisible, setIsRightPanelVisible] = useState<boolean>(true);

  // === 2. MODAL VE ÇEKMECELER (DRAWERS) ===
  const [isQuizDrawerOpen, setIsQuizDrawerOpen] = useState<boolean>(false);

  // === 3. BAŞARI (PROGRESS) LOGIC ===
  const [localProgress, setLocalProgress] = useState<number>(0);

  const totalProgress: number = useMemo(() => {
    if (!chunks || chunks.length === 0) return 0;
    return Math.round(localProgress);
  }, [chunks, localProgress]);

  const displayProgress: number = activeChunkId !== '' ? localProgress : 0;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>): void => {
    try {
      const container: HTMLDivElement = e.currentTarget;
      if (!container) return;

      const scrollHeight: number =
        container.scrollHeight - container.clientHeight;

      if (scrollHeight <= 0) return;

      const currentProgress: number = Math.min(
        100,
        Math.round((container.scrollTop / scrollHeight) * 100)
      );

      setLocalProgress(currentProgress);
    } catch (error: unknown) {
      console.error('[useNotesUI][handleScroll] Hata:', error);
    }
  }, []);

  return {
    isLeftPanelVisible,
    setIsLeftPanelVisible,
    isRightPanelVisible,
    setIsRightPanelVisible,
    isQuizDrawerOpen,
    setIsQuizDrawerOpen,
    localProgress,
    totalProgress,
    displayProgress,
    handleScroll,
  };
}
