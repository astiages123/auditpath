import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import { type CourseTopic } from '@/features/courses/types/courseTypes';
import {
  getCourseIdBySlug,
  getCourseTopics,
} from '@/features/quiz/services/quizCoreService';

import { processTopicContent } from '../logic/contentProcessor';
import { type TopicMetadata } from '../logic/contentProcessor';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

/**
 * Senkronizasyon işlemi sonucunda dönen istatistikleri tanımlar.
 */
export interface SyncStats {
  /** Başarıyla senkronize edilen kayıt sayısı */
  synced: number;
  /** Silinen kayıt sayısı */
  deleted: number;
  /** Atlanan (değişiklik olmayan vb.) kayıt sayısı */
  skipped: number;
  /** Hata alınan kayıt sayısı */
  errors: number;
}

/**
 * Senkronizasyon servisi yanıt arayüzü.
 */
export interface SyncResponse {
  /** İşlem başarısı durumu */
  success: boolean;
  /** Detaylı senkronizasyon istatistikleri */
  stats?: SyncStats;
  /** Olası hata durumunda dönen mesaj */
  error?: string;
}

/**
 * fetchCourseNotes fonksiyonundan dönen yapı için arayüz.
 */
export interface CourseNotesData {
  /** Dersin tam adı */
  courseName: string;
  /** Ders konularının işlenmiş hali */
  chunks: CourseTopic[];
}

// === BÖLÜM ADI: İŞ MANTIĞI & SERVİSLER (LOGIC & SERVICES) ===
// ===========================

/**
 * Verilen kurs adlandırıcıya göre ilgili konu parçalarını (chunks) veritabanından çeker,
 * ardından ilgili metinlerin markdown işlemelerini yapar ve geriye döner.
 *
 * @param {string} userId - Dersi çeken kullanıcının benzersiz ID'si.
 * @param {string} courseSlug - Dersin benzersiz url kısa adı.
 * @param {AbortSignal} [signal] - İstek iptalini yönetmek için DOM AbortSignal objesi (opsiyonel).
 * @returns {Promise<CourseNotesData | null>} - Ders adı ve işlenmiş konuları döner, iptal edilirse null döner.
 */
export async function fetchCourseNotes(
  userId: string,
  courseSlug: string,
  signal?: AbortSignal
): Promise<CourseNotesData | null> {
  try {
    const targetCourseId: string | null = await getCourseIdBySlug(courseSlug);

    if (!targetCourseId || (signal && signal.aborted)) {
      return null;
    }

    const courseTopicsData: CourseTopic[] = await getCourseTopics(
      userId,
      targetCourseId,
      signal
    );

    if (signal && signal.aborted) {
      return null;
    }

    const processedData: CourseTopic[] = courseTopicsData.map(
      (chunk: CourseTopic) => {
        const metadata: TopicMetadata | null =
          chunk.metadata as TopicMetadata | null;

        return {
          ...chunk,
          content: processTopicContent(chunk.content, metadata),
        };
      }
    );

    return {
      courseName: processedData[0]?.course_name || '',
      chunks: processedData,
    };
  } catch (error: unknown) {
    if (signal && signal.aborted) return null;
    console.error('[noteService][fetchCourseNotes] Hata:', error);
    throw error;
  }
}

/**
 * Notion entegrasyonundan Supabase'e veri aktarımı yapan Edge Function'ı tetikler.
 *
 * @returns {Promise<SyncResponse>} Edge Function'dan dönen başarı durumu ve istatistikleri barındıran nesne.
 */
export async function invokeNotionSync(): Promise<SyncResponse> {
  try {
    const { data: syncData } = await safeQuery<SyncResponse>(
      supabase.functions.invoke<SyncResponse>('notion-sync', {
        method: 'POST',
        body: {},
      }) as PromiseLike<{ data: SyncResponse | null; error: unknown }>,
      'invokeNotionSync error'
    );

    if (!syncData) {
      throw new Error('Senkronizasyon servisinden yanıt alınamadı.');
    }

    return syncData;
  } catch (error: unknown) {
    console.error('[noteService][invokeNotionSync] Hata:', error);
    throw error;
  }
}
