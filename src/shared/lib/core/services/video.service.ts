import { supabase } from '@/shared/lib/core/supabase';
import type { DailyVideoMilestones } from '@/shared/types/efficiency';
import { logger } from '@/shared/lib/core/utils/logger';

/**
 * Get video progress for multiple videos in a course.
 *
 * @param userId User ID
 * @param courseId Course ID
 * @param videoNumbers Array of video numbers to check
 * @returns Map of video number to completion status
 */
export async function getVideoProgress(
  userId: string,
  courseId: string,
  videoNumbers: number[]
) {
  // 1. Get the video records for this course to map video_number to video_id
  const { data: videos, error: videoError } = await supabase
    .from('videos')
    .select('id, video_number')
    .eq('course_id', courseId)
    .in('video_number', videoNumbers);

  if (videoError || !videos) {
    return {};
  }

  const videoIdToNumber: Record<string, number> = {};
  videos.forEach((v) => {
    videoIdToNumber[v.id] = v.video_number;
  });

  const videoIds = videos.map((v) => v.id);

  // 2. Fetch progress for these video IDs
  const { data: progress, error: progressError } = await supabase
    .from('video_progress')
    .select('video_id, completed')
    .eq('user_id', userId)
    .in('video_id', videoIds);

  if (progressError) {
    logger.error('Error fetching video progress:', progressError);
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
}

/**
 * Toggle completion status for a single video.
 *
 * @param userId User ID
 * @param courseId Course ID
 * @param videoNumber Video number
 * @param completed New completion status
 */
export async function toggleVideoProgress(
  userId: string,
  courseId: string,
  videoNumber: number,
  completed: boolean
) {
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('id, duration_minutes')
    .eq('course_id', courseId)
    .eq('video_number', videoNumber)
    .single();

  if (videoError || !video) {
    logger.error('Error finding video for toggle:', videoError);
    return;
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('video_progress').upsert(
    {
      user_id: userId,
      video_id: video.id,
      completed,
      updated_at: now,
      completed_at: completed ? now : null,
    },
    {
      onConflict: 'user_id,video_id',
    }
  );

  if (error) {
    logger.error('Error toggling video progress:', error);
  }
}

/**
 * Toggle completion status for multiple videos at once.
 *
 * @param userId User ID
 * @param courseId Course ID
 * @param videoNumbers Array of video numbers
 * @param completed New completion status
 */
export async function toggleVideoProgressBatch(
  userId: string,
  courseId: string,
  videoNumbers: number[],
  completed: boolean
) {
  // Get all video IDs for the batch
  const { data: videos, error: videoError } = await supabase
    .from('videos')
    .select('id, duration_minutes')
    .eq('course_id', courseId)
    .in('video_number', videoNumbers);

  if (videoError || !videos) {
    logger.error('Error finding videos for batch toggle:', videoError);
    return;
  }

  const now = new Date().toISOString();
  const upsertData = videos.map((v) => ({
    user_id: userId,
    video_id: v.id,
    completed,
    updated_at: now,
    completed_at: completed ? now : null,
  }));

  const { error } = await supabase.from('video_progress').upsert(upsertData, {
    onConflict: 'user_id,video_id',
  });

  if (error) {
    logger.error('Error batch toggling video progress:', error);
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
  const { data, error } = await supabase
    .from('video_progress')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('completed', true)
    .not('completed_at', 'is', null);

  if (error || !data || data.length === 0) {
    return { maxCount: 0, first5Date: null, first10Date: null };
  }

  // Günlere göre grupla
  const dailyCounts: Record<string, number> = {};
  for (const row of data) {
    if (!row.completed_at) continue;
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
}
