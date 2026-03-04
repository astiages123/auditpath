// ===========================
// === IMPORTS ===
// ===========================

import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import type { DailyVideoMilestones } from '@/features/statistics/types/statisticsTypes';

// ===========================
// === TYPE DEFINITIONS ===
// ===========================

/** Represents a standard database item for video or reading materials */
export interface DatabaseItem {
  id: string;
  video_number: number;
  title: string;
  duration: string;
  duration_minutes: number;
  item_type: 'video' | 'reading';
}

// ===========================
// === SERVICE FUNCTIONS ===
// ===========================

/**
 * Get video progress for multiple videos in a course.
 *
 * @param userId User ID
 * @param courseId Course ID
 * @param itemNumbers Array of video numbers to check
 * @returns Map of video number to completion status
 */
export async function getItemProgressByCourse(
  userId: string,
  courseId: string,
  itemNumbers: number[]
): Promise<Record<string, boolean>> {
  try {
    // 1. Get the video records for this course to map video_number to video_id
    const { data: videos, success: videoSuccess } = await safeQuery(
      supabase
        .from('videos')
        .select('id, video_number')
        .eq('course_id', courseId)
        .in('video_number', itemNumbers),
      '[videoService][getItemProgressByCourse] Hata: Öğeler bulunamadı'
    );

    if (!videoSuccess || !videos) {
      return {};
    }

    const videoIdToNumber: Record<string, number> = {};
    videos.forEach((v) => {
      videoIdToNumber[v.id] = v.video_number;
    });

    const videoIds = videos.map((v) => v.id);

    // 2. Fetch progress for these video IDs
    const { data: progress, success: progressSuccess } = await safeQuery(
      supabase
        .from('video_progress')
        .select('video_id, completed')
        .eq('user_id', userId)
        .in('video_id', videoIds),
      '[videoService][getItemProgressByCourse] Hata: İlerleme durumu getirilemedi'
    );

    if (!progressSuccess) {
      return {};
    }

    // 3. Create the progress map { "videoNumber": completed }
    const progressMap: Record<string, boolean> = {};
    progress?.forEach((p) => {
      const videoNum = p.video_id ? videoIdToNumber[p.video_id] : undefined;
      if (videoNum !== undefined) {
        progressMap[videoNum.toString()] = p.completed || false;
      }
    });

    return progressMap;
  } catch (error) {
    console.error('[videoService][getItemProgressByCourse] Hata:', error);
    return {};
  }
}

/**
 * Toggle completion status for a single video.
 *
 * @param userId User ID
 * @param courseId Course ID
 * @param itemNumber Video number
 * @param completed New completion status
 */
export async function toggleItemProgress(
  userId: string,
  courseId: string,
  itemNumber: number,
  completed: boolean
): Promise<void> {
  try {
    const { data: item, success: itemSuccess } = await safeQuery<{
      id: string;
      duration_minutes: number;
      item_type: 'video' | 'reading';
    }>(
      supabase
        .from('videos')
        .select('id, duration_minutes, item_type')
        .eq('course_id', courseId)
        .eq('video_number', itemNumber)
        .single(),
      '[videoService][toggleItemProgress] Hata: İlgili öğe bulunamadı'
    );

    if (!itemSuccess || !item) {
      return;
    }

    const now = new Date().toISOString();
    await safeQuery(
      supabase.from('video_progress').upsert(
        {
          user_id: userId,
          video_id: item.id,
          item_type: item.item_type,
          completed,
          updated_at: now,
          completed_at: completed ? now : null,
        },
        {
          onConflict: 'user_id,video_id',
        }
      ),
      '[videoService][toggleItemProgress] Hata: İlerleme kaydedilemedi'
    );
  } catch (error) {
    console.error('[videoService][toggleItemProgress] Hata:', error);
  }
}

/**
 * Toggle completion status for multiple videos at once.
 *
 * @param userId User ID
 * @param courseId Course ID
 * @param itemNumbers Array of video numbers
 * @param completed New completion status
 */
export async function toggleItemProgressBatch(
  userId: string,
  courseId: string,
  itemNumbers: number[],
  completed: boolean
): Promise<void> {
  try {
    // Get all item IDs for the batch
    const { data: items, success: itemSuccess } = await safeQuery(
      supabase
        .from('videos')
        .select('id, duration_minutes, item_type')
        .eq('course_id', courseId)
        .in('video_number', itemNumbers),
      '[videoService][toggleItemProgressBatch] Hata: Toplu işlemler için öğeler bulunamadı'
    );

    if (!itemSuccess || !items) {
      return;
    }

    const now = new Date().toISOString();
    const upsertData = items.map((v) => ({
      user_id: userId,
      video_id: v.id,
      item_type: v.item_type,
      completed,
      updated_at: now,
      completed_at: completed ? now : null,
    }));

    await safeQuery(
      supabase.from('video_progress').upsert(upsertData, {
        onConflict: 'user_id,video_id',
      }),
      '[videoService][toggleItemProgressBatch] Hata: Toplu ilerleme durumu güncellenemedi'
    );
  } catch (error) {
    console.error('[videoService][toggleItemProgressBatch] Hata:', error);
  }
}

/**
 * Analyze user's daily video completion data.
 * Returns the first date when user reached 5 and 10 videos in a day.
 *
 * @param userId User ID
 * @returns Object with maxCount, first5Date, and first10Date
 */
export async function getDailyVideoMilestones(
  userId: string
): Promise<DailyVideoMilestones> {
  try {
    // Join with videos and courses to check the type
    const { data, success } = await safeQuery(
      supabase
        .from('video_progress')
        .select('completed_at, video:videos(course:courses(type))')
        .eq('user_id', userId)
        .eq('completed', true)
        .not('completed_at', 'is', null),
      '[videoService][getDailyVideoMilestones] Hata: Günlük video dönüm noktaları verisi alınamadı'
    );

    if (!success || !data || data.length === 0) {
      return { maxCount: 0, first5Date: null, first10Date: null };
    }

    // Günlere göre grupla (sadece video olanları)
    const dailyCounts: Record<string, number> = {};
    for (const row of data) {
      if (!row.completed_at) continue;

      // Type kontrolü: Eğer course tipi 'reading' ise sayma
      const videoData = row.video as { course: { type: string } };
      const courseType = videoData?.course?.type || 'video';
      if (courseType === 'reading') continue;

      const date = new Date(row.completed_at);
      const dayKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dailyCounts[dayKey] = (dailyCounts[dayKey] || 0) + 1;
    }

    // Tarihleri sırala (en eskiden en yeniye)
    const sortedDates = Object.keys(dailyCounts).sort();

    let maxCount = 0;
    let first5Date: string | null = null;
    let first10Date: string | null = null;

    for (const dateKey of sortedDates) {
      const count = dailyCounts[dateKey];
      if (count > maxCount) maxCount = count;

      // İlk kez 5+ video
      if (first5Date === null && count >= 5) {
        first5Date = dateKey;
      }
      // İlk kez 10+ video
      if (first10Date === null && count >= 10) {
        first10Date = dateKey;
      }
    }

    return { maxCount, first5Date, first10Date };
  } catch (error) {
    console.error('[videoService][getDailyVideoMilestones] Hata:', error);
    return { maxCount: 0, first5Date: null, first10Date: null };
  }
}

/**
 * Fetches all videos for a specific course from the database.
 *
 * @param courseId The UUID of the course
 */
export async function getItemsByCourseId(
  courseId: string
): Promise<DatabaseItem[]> {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('id, video_number, title, duration, duration_minutes, item_type')
      .eq('course_id', courseId)
      .order('video_number', { ascending: true });

    if (error) {
      console.error('[videoService][getItemsByCourseId] Hata:', error);
      return [];
    }

    return (data || []) as DatabaseItem[];
  } catch (error) {
    console.error('[videoService][getItemsByCourseId] Hata:', error);
    return [];
  }
}
