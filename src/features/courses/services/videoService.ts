import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import type { DailyVideoMilestones } from '@/features/statistics/types/statisticsTypes';

/** Represents a standard database item for video or reading materials */
export interface DatabaseItem {
  id: string;
  video_number: number;
  title: string;
  duration: string;
  duration_minutes: number;
  item_type: 'video' | 'reading';
}

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
  const { data: videos, success: isVideoQuerySuccessful } = await safeQuery(
    supabase
      .from('videos')
      .select('id, video_number')
      .eq('course_id', courseId)
      .in('video_number', itemNumbers),
    '[videoService][getItemProgressByCourse] Hata: Öğeler bulunamadı'
  );

  if (!isVideoQuerySuccessful || !videos) {
    return {};
  }

  const videoIdToNumber: Record<string, number> = {};
  videos.forEach((video) => {
    videoIdToNumber[video.id] = video.video_number;
  });

  const videoIds = videos.map((video) => video.id);

  const { data: progress, success: isProgressQuerySuccessful } =
    await safeQuery(
      supabase
        .from('video_progress')
        .select('video_id, completed')
        .eq('user_id', userId)
        .in('video_id', videoIds),
      '[videoService][getItemProgressByCourse] Hata: İlerleme durumu getirilemedi'
    );

  if (!isProgressQuerySuccessful) {
    return {};
  }

  const progressMap: Record<string, boolean> = {};
  progress?.forEach((progressItem) => {
    const videoNumber = progressItem.video_id
      ? videoIdToNumber[progressItem.video_id]
      : undefined;

    if (videoNumber !== undefined) {
      progressMap[videoNumber.toString()] = progressItem.completed || false;
    }
  });

  return progressMap;
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
  const { data: item, success: isItemQuerySuccessful } = await safeQuery<{
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

  if (!isItemQuerySuccessful || !item) {
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
  const { data: items, success: isItemQuerySuccessful } = await safeQuery(
    supabase
      .from('videos')
      .select('id, duration_minutes, item_type')
      .eq('course_id', courseId)
      .in('video_number', itemNumbers),
    '[videoService][toggleItemProgressBatch] Hata: Toplu işlemler için öğeler bulunamadı'
  );

  if (!isItemQuerySuccessful || !items) {
    return;
  }

  const now = new Date().toISOString();
  const upsertData = items.map((item) => ({
    user_id: userId,
    video_id: item.id,
    item_type: item.item_type,
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

  const dailyCounts: Record<string, number> = {};
  for (const row of data) {
    if (!row.completed_at) continue;

    const videoData = row.video as { course: { type: string } };
    const courseType = videoData?.course?.type || 'video';
    if (courseType === 'reading') continue;

    const date = new Date(row.completed_at);
    const dayKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    dailyCounts[dayKey] = (dailyCounts[dayKey] || 0) + 1;
  }

  const sortedDates = Object.keys(dailyCounts).sort();

  let maxCount = 0;
  let first5Date: string | null = null;
  let first10Date: string | null = null;

  for (const dateKey of sortedDates) {
    const count = dailyCounts[dateKey];
    if (count > maxCount) maxCount = count;

    if (first5Date === null && count >= 5) {
      first5Date = dateKey;
    }

    if (first10Date === null && count >= 10) {
      first10Date = dateKey;
    }
  }

  return { maxCount, first5Date, first10Date };
}

/**
 * Fetches all videos for a specific course from the database.
 *
 * @param courseId The UUID of the course
 */
export async function getItemsByCourseId(
  courseId: string
): Promise<DatabaseItem[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('id, video_number, title, duration, duration_minutes, item_type')
    .eq('course_id', courseId)
    .order('video_number', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []) as DatabaseItem[];
}
