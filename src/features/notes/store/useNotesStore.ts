import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

/**
 * Kullanıcının en son okuduğu konunun bilgilerini tutan arayüz.
 */
export interface LastReadEntry {
  /** Notlarda okunan belirli başlığın ID değeri */
  topicId: string;
  /** Kullanıcının notlar içerisinde en son kaldığı kaydırma miktarı (px cinsinden) */
  scrollPos: number;
  /** Bu bilginin kaydedildiği zaman damgası (timestamp) */
  timestamp: number;
}

/**
 * Notlar özelliğinin uyguluma geneli durum (store) arayüzü.
 */
export interface NotesStore {
  /** Kurs adlandırıcısına (slug) karşılık gelen son okunan kayıtları haritalaması */
  lastRead: Record<string, LastReadEntry>;
  /**
   * Son okunan konum verilerini set eden durum güncelleme aksiyonu.
   *
   * @param courseSlug - Kursun URL adı (örn: `ATA_584`)
   * @param topicId - Konunun ID'si (örn: `konu-1`)
   * @param scrollPos - Görüntüdeki kaydırma pozisyonu (px)
   */
  setLastReadTopic: (
    courseSlug: string,
    topicId: string,
    scrollPos: number
  ) => void;
}

// === BÖLÜM ADI: STORE (MANTIKSAL DURUM YÖNETİMİ) ===
// ===========================

/**
 * Notlar özelliğine dair kullanıcının görüntüleme tercihlerini ve kaldığı yeri saklayan global store.
 * Bu veriler `localStorage` tabanlı kalıcı (persist) depolama kullanılarak tarayıcıda saklanır.
 */
export const useNotesStore = create<NotesStore>()(
  persist(
    (set) => ({
      // Başlangıç değerleri (Initial State)
      lastRead: {},

      // Aksiyonlar (Actions)
      setLastReadTopic: (
        courseSlug: string,
        topicId: string,
        scrollPos: number
      ): void => {
        set((state: NotesStore) => ({
          lastRead: {
            ...state.lastRead,
            [courseSlug]: {
              topicId,
              scrollPos,
              timestamp: Date.now(),
            },
          },
        }));
      },
    }),
    {
      // Persist Middleware Ayarları
      name: 'notes-store',
      // Sadece 'lastRead' objesini tarayıcı önbelleğine aktarıyoruz
      partialize: (state: NotesStore) => ({ lastRead: state.lastRead }),
    }
  )
);
