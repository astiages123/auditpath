import { supabase } from './supabase';
import type { Database, Json } from './types/supabase';
import { calculateSessionTotals, calculatePauseCount, calculateEfficiencyScore, getCycleCount } from './pomodoro-utils';


export type Category = Database['public']['Tables']['categories']['Row'] & {
  courses: Course[];
};

export type Course = Database['public']['Tables']['courses']['Row'];

export interface DailyStats {
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  sessionCount: number;
  goalMinutes: number;
  progress: number;
  goalPercentage: number;
  trendPercentage: number;
  dailyGoal: number;
  totalPauseMinutes: number;
  totalVideoMinutes: number;
  completedVideos: number;
  totalCycles: number;
}

export interface DayActivity {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  intensity: number;
  totalMinutes: number;
}

export interface EfficiencyData {
  ratio: number;
  trend: "up" | "down" | "stable";
  isAlarm: boolean;
  videoMinutes: number;
  pomodoroMinutes: number;
}

export interface TimelineBlock {
  id: string;
  courseName: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  totalDurationSeconds: number;
  pauseSeconds: number;
  breakSeconds?: number;
  type: "work" | "break" | "WORK" | "BREAK";
  timeline?: Json[];
}

export async function getCategories(): Promise<Category[]> {
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*, courses(*)')
    .order('sort_order');

  if (catError) {
    const isAbort = catError.message?.includes("AbortError") || catError.code === "ABORT_ERROR";
    if (!isAbort) {
      console.error('Error fetching categories:', catError);
    }
    return [];
  }

  return categories as Category[];
}


// --- Rank System ---
import { RANKS, Rank, getRankForPercentage } from './constants';
export type { Rank } from './constants';
export { RANKS, getRankForPercentage };



export function getNextRank(currentRankId: string): Rank | null {
  const currentIndex = RANKS.findIndex(r => r.id === currentRankId);
  if (currentIndex === -1 || currentIndex === RANKS.length - 1) return null;
  return RANKS[currentIndex + 1];
}




// Transactional XP Addition
// Transactional XP Addition via RPC


// -------------------------


export async function getUserStats(userId: string) {
  try {
    // Get categories to map courses to categories and slugs
    const categories = await getCategories();
    const courseToCategoryMap: Record<string, string> = {};
    const courseIdToSlugMap: Record<string, string> = {};

    categories.forEach((cat) => {
      cat.courses.forEach((course) => {
        courseToCategoryMap[course.id] = cat.name;
        courseIdToSlugMap[course.id] = course.course_slug;
      });
    });

    const { data: progress, error: progressError } = await supabase
      .from("video_progress")
      .select("*, video:videos(duration_minutes, course_id)")
      .eq("user_id", userId)
      .eq("completed", true);

    if (progressError) throw progressError;

    const completedVideos = progress?.length || 0;
    let completedHours = 0;
    const courseProgress: Record<string, number> = {};
    const categoryProgress: Record<
      string,
      { completedVideos: number; completedHours: number; totalVideos: number; totalHours: number }
    > = {};

    // --- Dynamic Logic Implementation ---
    
    // 1. Collect Active Days
    // We use a Set to store unique dates (YYYY-MM-DD)
    const activeDays = new Set<string>();
    let firstActivityDate: Date | null = null;
    
    // Helper to normalize date string to YYYY-MM-DD (local time usually fine for simple streak)
    const toDateString = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    if (progress) {
      for (const p of progress) {
          const dateStr = p.completed_at || p.updated_at; // Fallback to updated_at
          if (dateStr) {
              const d = new Date(dateStr);
              // Virtual Day Adjustment for Activity Check
              if (d.getHours() < 4) {
                  d.setDate(d.getDate() - 1);
              }
              // Manual formatting to ensure consistency with toDateString isn't needed if we stick to this block
              // But let's replicate the string generation exactly:
              const formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              
              activeDays.add(formattedDate);
              
              // For firstActivityDate, we use the raw date (approx is fine) or the adjusted one?
              // Let's use raw for absolute timeline start, or adjusted?
              // Raw is safer for "when did I start".
              const rawDate = new Date(dateStr);
              if (!firstActivityDate || rawDate < firstActivityDate) {
                  firstActivityDate = rawDate;
              }
          }
        
          const video = p.video as unknown as {
            duration_minutes: number;
            course_id: string;
          };
          if (video) {
            const durationHours = video.duration_minutes / 60;
            completedHours += durationHours;
            
            // Use Slug for Course Progress if available, fallback to ID (though ID won't match frontend slug expectation)
            const courseSlug = courseIdToSlugMap[video.course_id] || video.course_id;
            courseProgress[courseSlug] = (courseProgress[courseSlug] || 0) + 1;

            const catName = courseToCategoryMap[video.course_id];
            if (catName) {
               if (!categoryProgress[catName]) {
                   // Initialize with totals from categories array
                   const cat = categories.find(c => c.name === catName);
                   categoryProgress[catName] = { 
                       completedVideos: 0, 
                       completedHours: 0,
                       totalVideos: cat?.courses.reduce((sum, c) => sum + (c.total_videos || 0), 0) || 0,
                       totalHours: cat?.total_hours || 0
                   };
               }
               categoryProgress[catName].completedVideos += 1;
               categoryProgress[catName].completedHours += durationHours;
            }
          }
      }
    }

      // Total videos could be 0 if no categories
    const totalVideos = Object.values(categoryProgress).reduce((acc, curr) => acc + curr.totalVideos, 0) || 1;
    const progressPercentage = Math.round((completedVideos / totalVideos) * 100);

    let currentRank: Rank | undefined;
    let nextRank: Rank | null;
    let rankProgress = 0;

    if (completedVideos > 0) {
      currentRank = getRankForPercentage(progressPercentage);
      nextRank = getNextRank(currentRank.id);

      // Calculate rank progress
      if (nextRank) {
        const minP = currentRank.minPercentage;
        const nextMinP = nextRank.minPercentage;
        const diff = nextMinP - minP;
        rankProgress = diff > 0 
          ? Math.min(100, Math.max(0, Math.round(((progressPercentage - minP) / diff) * 100)))
          : 100;
      } else {
        // Max rank
        rankProgress = 100;
      }
    } else {
      // No videos completed yet -> No active rank
      currentRank = undefined;
      nextRank = RANKS[0]; // Next target is the first rank
      rankProgress = 0;
    }

    // 2. Calculate Streak
    // Count consecutive days ending TODAY or YESTERDAY.
    // Logic:
    // - Calculate streak strictly ending YESTERDAY.
    // - If activity today, streak = yesterdayStreak + 1.
    // - If no activity today, streak = yesterdayStreak (but only if yesterday was active, else 0).
    // Actually, simpler:
    // Iterate backwards from TODAY.
    // If today has activity -> streak starts at 1, go to yesterday.
    // If today has NO activity -> check yesterday. If yesterday active -> streak starts at 1 (representing yesterday), continue backwards.
    // If neither -> streak 0.

    let streak = 0;
    const nowLocal = new Date();
    // Virtual day adjustment (04:00 AM)
    if (nowLocal.getHours() < 4) {
        nowLocal.setDate(nowLocal.getDate() - 1);
    }
    
    // Check consecutive days
    const checkDate = new Date(nowLocal);
    let consecutiveDays = 0;
    
    // We check explicitly day-by-day backwards
    while (true) {
        const checkYear = checkDate.getFullYear();
        const checkMonth = String(checkDate.getMonth() + 1).padStart(2, '0');
        const checkDay = String(checkDate.getDate()).padStart(2, '0');
        const dateStr = `${checkYear}-${checkMonth}-${checkDay}`;
        
        if (activeDays.has(dateStr)) {
            consecutiveDays++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            // Gap found.
            // Exception: If the gap is TODAY (and we haven't done anything today yet),
            // we shouldn't break the streak immediately; it just means it hasn't incremented yet.
            // But we already checked today in the loop (start of loop).
            // So if the FIRST check (Today) fails, we check Yesterday.
            
            if (consecutiveDays === 0) {
                 // Today has no activity. Check if yesterday had activity.
                 // This effectively means "Current Streak" is maintained from yesterday.
                 checkDate.setDate(checkDate.getDate() - 1);
                 
                 const yesterdayYear = checkDate.getFullYear();
                 const yesterdayMonth = String(checkDate.getMonth() + 1).padStart(2, '0');
                 const yesterdayDay = String(checkDate.getDate()).padStart(2, '0');
                 const yesterdayStr = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`;
                 
                 if (activeDays.has(yesterdayStr)) {
                     // Yesterday was active! Continue loop from yesterday.
                     // Don't increment consecutiveDays here yet, let the loop handle it
                     // Reset checkDate to yesterday to restart loop logic correctly?
                     // No, `checkDate` is already decremented to Yesterday.
                     // Just continue to next iteration, it will check `activeDays.has(yesterday)` again?
                     // Wait, `checkDate` was decremented above. So on next `while` loop, it checks yesterday.
                     // But we need to ensure we don't double decrement or break.
                     
                     // Let's restart loop structure for clarity:
                     // We handled "Today" implicitly. 
                     // If `consecutiveDays === 0` here, it means `activeDays.has(today)` was false.
                     // `checkDate` is now Yesterday.
                     // We continue the loop, effectively checking Yesterday next.
                     continue;
                 } else {
                     // Neither today nor yesterday active -> Streak 0.
                     break;
                 }
            } else {
                // We had some consecutive days (e.g. Today, Yesterday...), and now found a gap.
                // Streak ends.
                break;
            }
        }
    }
    streak = consecutiveDays;

    // 3. Estimate Days Remaining
    // Formula: (Total Remaining Hours) / (Daily Average Hours)
    // Daily Average = Total Completed Hours / Days Active (from first activity to today)
    
    let estimatedDays = 0;
    const totalHours = Math.round(Object.values(categoryProgress).reduce((acc, curr) => acc + curr.totalHours, 0));
    const hoursRemaining = Math.max(0, totalHours - completedHours);
    
    if (hoursRemaining > 0) {
        if (firstActivityDate && completedHours > 0) {
            const now = new Date();
            // Diff in days between now and first activity
            // Ensure at least 1 day to avoid division by zero or infinity on first day
            const diffTime = Math.abs(now.getTime() - firstActivityDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; 
            
            const dailyAverage = completedHours / diffDays;
            
            if (dailyAverage > 0) {
                estimatedDays = Math.ceil(hoursRemaining / dailyAverage);
            } else {
                 estimatedDays = 999; // Fallback
            }
        } else {
             // No activity yet, assume a default average (e.g., 2 hours/day) or just return a placeholder
             estimatedDays = Math.ceil(hoursRemaining / 2);
        }
    } else {
        estimatedDays = 0;
    }

    return {
      completedVideos,
      totalVideos: Object.values(categoryProgress).reduce((acc, curr) => acc + curr.totalVideos, 0),
      completedHours: Math.round(completedHours * 10) / 10,
      totalHours,
      streak,
      categoryProgress,
      courseProgress,
      currentRank,
      nextRank,
      rankProgress,
      progressPercentage,
      estimatedDays,
      todayVideoCount: (() => {
          // Use the EXACT same logic as activeDays to ensure consistency
          // Re-calculate todayStr using the same toDateString logic with Virtual Day
          const now = new Date();
          if (now.getHours() < 4) {
              now.setDate(now.getDate() - 1);
          }
          const checkTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          
          if (!progress) return 0;
          
          // Count videos that fall into "Today" bucket
          return progress.filter(p => {
              const dateStr = p.completed_at || p.updated_at;
              if (!dateStr) return false;
              
              const d = new Date(dateStr);
              // Apply Same Virtual Day Logic to the record's date
              if (d.getHours() < 4) {
                  d.setDate(d.getDate() - 1);
              }
              const pStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              
              return pStr === checkTodayStr;
          }).length;
      })(),
    };
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e?.name === 'AbortError' || e?.message?.includes('AbortError')) {
      return null;
    }
    console.error("Error in getUserStats:", error);
    return null;
  }
}

// ... (upsertPomodoroSession implementation)
export async function upsertPomodoroSession(
  session: {
    id: string;
    courseId: string;
    courseName?: string | null;
    timeline: Json[];
    startedAt: string | number | Date;
    isCompleted?: boolean;
  },
  userId: string
) {
  const totals = calculateSessionTotals(session.timeline);
  const pauseCount = calculatePauseCount(session.timeline);
  const efficiencyScore = calculateEfficiencyScore(totals);

  // Validate if courseId is a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let finalCourseId: string | null = session.courseId;
  let finalCourseName = session.courseName;

  if (!uuidRegex.test(session.courseId)) {
    // If not a UUID, it's likely a slug. Try to resolve it.
    const { data: course } = await supabase
      .from("courses")
      .select("id, name")
      .eq("course_slug", session.courseId)
      .maybeSingle();

    if (course) {
      finalCourseId = course.id;
      if (!finalCourseName) finalCourseName = course.name;
    } else {
      // If we can't find it, set to null to avoid Postgres 400 error
      finalCourseId = null;
    }
  }

  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .upsert({
      id: session.id,
      user_id: userId,
      course_id: finalCourseId,
      course_name: finalCourseName,
      timeline: session.timeline,
      started_at: new Date(session.startedAt).toISOString(),
      ended_at: new Date().toISOString(),
      total_work_time: totals.totalWork,
      total_break_time: totals.totalBreak,
      total_pause_time: totals.totalPause,
      pause_count: pauseCount,
      efficiency_score: efficiencyScore,
      last_active_at: new Date().toISOString(),
      is_completed: session.isCompleted || false,
    })
    .select()
    .single();

  return { data, error: error?.message };
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

export async function getUnlockedAchievements(userId: string): Promise<UnlockedAchievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    const isAbort = error.message?.includes("AbortError") || error.code === "ABORT_ERROR";
    if (!isAbort) {
      console.error("Error fetching achievements:", error);
    }
    return [];
  }

  return (data as Database['public']['Tables']['user_achievements']['Row'][]).map(a => ({ 
    id: a.achievement_id, 
    unlockedAt: a.unlocked_at 
  }));
}

export async function unlockAchievement(userId: string, achievementId: string) {
  const { error } = await supabase
    .from('user_achievements')
    .upsert({
      user_id: userId,
      achievement_id: achievementId,
      unlocked_at: new Date().toISOString(),
      is_celebrated: false
    });

  if (error) console.error('Error unlocking achievement:', error);
}

export async function getTotalActiveDays(userId: string) {
  // Query distinct days from pomodoro_sessions
  // Provide a specialized RPC for this in production for performance
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('started_at')
    .eq('user_id', userId);

  if (error || !data) return 0;

  const days = new Set(data.map(d => {
    const date = new Date(d.started_at);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }));
  return days.size;
}

export async function getDailySessionCount(userId: string) {
  const now = new Date();
  const today = new Date(now);
  
  // Virtual Day Logic: Day starts at 04:00 AM
  if (now.getHours() < 4) {
      today.setDate(today.getDate() - 1);
  }
  today.setHours(4, 0, 0, 0);

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('timeline')
    .eq('user_id', userId)
    .gte('started_at', today.toISOString());

  if (error) {
    console.error("Error fetching daily session count:", error);
    return 0;
  }

  // Count work cycles in all sessions today
  const totalCycles = (data || []).reduce((acc, s) => acc + getCycleCount(s.timeline), 0);
  return totalCycles;
}

export async function getLatestActiveSession(userId: string) {
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('*, course:courses(*, category:categories(*))')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .neq('is_completed', true)
    .limit(1)
    .maybeSingle();

  if (error) console.error("Error fetching latest active session:", error);
  return data;
}

export async function getStreak(_userId: string) {
  // Deprecated: Consolidated into getUserStats logic or handled via generic stats.
  // Returning 0 to avoid breaking legacy calls until fully removed.
  return 0;
}

export async function deletePomodoroSession(sessionId: string) {
  const { error } = await supabase
    .from('pomodoro_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) console.error('Error deleting session:', error);
}

/**
 * Updates the heartbeat timestamp for zombie session detection.
 * Should be called every 30 seconds during active sessions.
 */
export async function updatePomodoroHeartbeat(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('pomodoro_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    console.error('Heartbeat update failed:', error);
  }
}

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
    console.error('Error fetching videos for progress:', videoError);
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
    console.error('Error fetching video progress:', progressError);
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
    console.error('Error finding video for toggle:', videoError);
    return;
  }

  const { error } = await supabase.from('video_progress').upsert(
    {
      user_id: userId,
      video_id: video.id,
      completed,
      updated_at: new Date().toISOString(),
      completed_at: completed ? new Date().toISOString() : null,
    },
    {
      onConflict: 'user_id,video_id',
    }
  );

  if (error) {
    console.error('Error toggling video progress:', error);
  }
  // video_logs artık kullanılmıyor - completed_at zaten video_progress'te kaydediliyor
}

// completePomodoroSession fonksiyonu kaldırıldı (kullanılmıyordu)

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
    console.error('Error finding videos for batch toggle:', videoError);
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
    console.error('Error batch toggling video progress:', error);
  }
  // video_logs artık kullanılmıyor - completed_at zaten video_progress'te kaydediliyor
}

export async function getDailyStats(userId: string): Promise<DailyStats> {
  const now = new Date();
  const today = new Date(now);
  
  // Virtual Day Logic: Day starts at 04:00 AM
  // If we are between 00:00 - 04:00, we belong to the previous day
  if (now.getHours() < 4) {
      today.setDate(today.getDate() - 1);
  }
  today.setHours(4, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Fetch Today's Pomodoro Stats
  const { data: todaySessions, error: todayError } = await supabase
    .from("pomodoro_sessions")
    .select("total_work_time, total_break_time, total_pause_time, timeline")
    .eq("user_id", userId)
    .gte("started_at", today.toISOString())
    .lt("started_at", tomorrow.toISOString())
    .or('total_work_time.gte.60,total_break_time.gte.60'); // Anlamlı süreleri (1dk+) dahil et

  if (todayError) {
    console.error("Error fetching daily stats:", todayError);
  }

  // 2. Fetch Yesterday's Pomodoro Stats (for Trend)
  const { data: yesterdaySessions, error: yesterdayError } = await supabase
    .from("pomodoro_sessions")
    .select("total_work_time")
    .eq("user_id", userId)
    .gte("started_at", yesterday.toISOString())
    .lt("started_at", today.toISOString());

  // 3. Fetch Today's Video Stats using video_progress.completed_at
  const { data: todayVideos, error: videoError } = await supabase
    .from("video_progress")
    .select("video_id, video:videos(duration_minutes)")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("completed_at", today.toISOString())
    .lt("completed_at", tomorrow.toISOString());

  // DB stores Seconds. UI expects Minutes.
  const todaySessionsData = todaySessions || [];
  const totalWorkSeconds =
    todaySessionsData.reduce((acc, s) => acc + (s.total_work_time || 0), 0) || 0;
  const totalBreakSeconds =
    todaySessionsData.reduce((acc, s) => acc + (s.total_break_time || 0), 0) || 0;
  const totalPauseSeconds = 
    todaySessionsData.reduce((acc, s) => acc + (s.total_pause_time || 0), 0) || 0;

  // Calculate total cycles
  const totalCycles = todaySessionsData.reduce((acc, s) => acc + getCycleCount(s.timeline), 0);
  
  const totalWorkMinutes = Math.round(totalWorkSeconds / 60);
  const totalBreakMinutes = Math.round(totalBreakSeconds / 60);
  const totalPauseMinutes = Math.round(totalPauseSeconds / 60);

  // User expects "Oturum" to mean "Pomodoro Work Cycle"
  const sessionCount = totalCycles;

  const yesterdayWorkSeconds = 
    yesterdaySessions?.reduce((acc, s) => acc + (s.total_work_time || 0), 0) || 0;
  const yesterdayWorkMinutes = Math.round(yesterdayWorkSeconds / 60);

  // Calculate Trend
  let trendPercentage = 0;
  if (yesterdayWorkMinutes === 0) {
    trendPercentage = totalWorkMinutes > 0 ? 100 : 0;
  } else {
    trendPercentage = Math.round(((totalWorkMinutes - yesterdayWorkMinutes) / yesterdayWorkMinutes) * 100);
  }

  // Calculate Video Stats from video_progress
  let totalVideoMinutes = 0;
  const completedVideosCount = todayVideos?.length || 0;

  if (todayVideos) {
    totalVideoMinutes = todayVideos.reduce((acc, vp) => {
      const duration = (vp.video as { duration_minutes?: number })?.duration_minutes || 0;
      return acc + duration;
    }, 0);
  }

  // Default goal 4 hours (240 mins)
  const goalMinutes = 200;
  const progress = Math.min(100, Math.round((totalWorkMinutes / goalMinutes) * 100));

  return {
    totalWorkMinutes,
    totalBreakMinutes,
    sessionCount,
    goalMinutes,
    progress,
    goalPercentage: progress,
    trendPercentage,
    dailyGoal: goalMinutes,
    totalPauseMinutes,
    totalVideoMinutes: Math.round(totalVideoMinutes),
    completedVideos: completedVideosCount,
    totalCycles,
  };
}

export async function getLast30DaysActivity(userId: string): Promise<DayActivity[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select("started_at, total_work_time")
    .eq("user_id", userId)
    .gte("started_at", thirtyDaysAgo.toISOString())
    .or('total_work_time.gte.60,total_break_time.gte.60');

  if (error) {
    console.error("Error fetching activity heatmap:", error);
    return [];
  }

  const dailyCounts: Record<string, { count: number; minutes: number }> = {};
  (data as any[])?.forEach((s) => {
    const d = new Date(s.started_at);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dailyCounts[dateStr] = {
        count: (dailyCounts[dateStr]?.count || 0) + 1,
        minutes: (dailyCounts[dateStr]?.minutes || 0) + (s.total_work_time || 0)
    };
  });

  const heatmap: DayActivity[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (30 - i));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const count = dailyCounts[dateStr]?.count || 0;
    
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count >= 5) level = 4;
    else if (count >= 3) level = 3;
    else if (count >= 2) level = 2;
    else if (count >= 1) level = 1;

    heatmap.push({ 
      date: dateStr, 
      count, 
      level, 
      intensity: level,
      totalMinutes: Math.round((dailyCounts[dateStr]?.minutes || 0) / 60)
    });
  }

  return heatmap;
}

export async function getEfficiencyRatio(userId: string): Promise<EfficiencyData> {
  const now = new Date();
  const today = new Date(now);
  if (now.getHours() < 4) {
      today.setDate(today.getDate() - 1);
  }
  today.setHours(4, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Fetch Today's Pomodoro Stats
  const { data: todaySessions, error: sessionError } = await supabase
    .from("pomodoro_sessions")
    .select("total_work_time, total_break_time")
    .eq("user_id", userId)
    .gte("started_at", today.toISOString())
    .lt("started_at", tomorrow.toISOString())
    .or('total_work_time.gte.60,total_break_time.gte.60');

  // 2. Fetch Today's Video Stats using video_progress
  const { data: todayVideos, error: videoError } = await supabase
    .from("video_progress")
    .select("video_id, video:videos(duration_minutes)")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("completed_at", today.toISOString())
    .lt("completed_at", tomorrow.toISOString());

  if (sessionError || videoError) {
    console.error("Error fetching efficiency metrics:", sessionError || videoError);
  }

  const totalWork = (todaySessions as any[])?.reduce((acc: number, s: any) => acc + (s.total_work_time || 0), 0) || 0;
  
  let totalVideoMinutes = 0;
  if (todayVideos) {
    totalVideoMinutes = todayVideos.reduce((acc: number, vp: any) => {
      const duration = (vp.video as { duration_minutes?: number })?.duration_minutes || 0;
      return acc + duration;
    }, 0);
  }

  // DB stores Seconds. Convert to Minutes.
  const totalWorkMinutes = Math.round(totalWork / 60);

  // Calculate Learning Quotient: Pomodoro Minutes / Video Minutes
  // If Video duration is 0, we avoid division by zero
  const ratio = totalVideoMinutes > 0 
    ? Math.round((totalWorkMinutes / totalVideoMinutes) * 10) / 10 
    : 0.0;

  return {
    ratio,
    trend: "stable",
    isAlarm: false, // You can implement a check here: e.g. ratio > 3.0
    videoMinutes: Math.round(totalVideoMinutes),
    pomodoroMinutes: totalWorkMinutes
  };
}

export interface CumulativeStats {
    totalWorkMinutes: number;
    totalVideoMinutes: number;
    ratio: number;
}

export async function getCumulativeStats(userId: string): Promise<CumulativeStats> {
   // 1. Total Pomodoro
   const { data: allSessions, error: sessionError } = await supabase
    .from("pomodoro_sessions")
    .select("total_work_time")
    .eq("user_id", userId);

   // 2. Total Video (Using video_progress for historically accurate total count)
   const { data: allVideos, error: videoError } = await supabase
    .from("video_progress")
    .select("video_id, video:videos(duration_minutes)")
    .eq("user_id", userId)
    .eq("completed", true);

    if (sessionError || videoError) {
        console.error("Error fetching cumulative stats:", sessionError || videoError);
    }

    const totalWorkSeconds = allSessions?.reduce((acc, s) => acc + (s.total_work_time || 0), 0) || 0;
    const totalWorkMinutes = Math.round(totalWorkSeconds / 60);
    
    let totalVideoMinutes = 0;
    if (allVideos) {
        totalVideoMinutes = allVideos.reduce((acc, vp) => {
            const duration = (vp.video as { duration_minutes?: number })?.duration_minutes || 0;
            return acc + duration;
        }, 0);
    }

    const ratio = totalVideoMinutes > 0 
        ? Math.round((totalWorkMinutes / totalVideoMinutes) * 10) / 10 
        : 0;

    return {
        totalWorkMinutes,
        totalVideoMinutes: Math.round(totalVideoMinutes),
        ratio
    };
}



export interface HistoryStats {
    date: string;
    pomodoro: number;
    video: number;
}

export async function getHistoryStats(userId: string, days: number = 7): Promise<HistoryStats[]> {
    const now = new Date();
    const today = new Date(now);
    if (now.getHours() < 4) {
        today.setDate(today.getDate() - 1);
    }
    today.setHours(4, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1)); // Include today
    startDate.setHours(4, 0, 0, 0);

    // 1. Fetch Pomodoro Sessions
    const { data: sessions, error: sessionError } = await supabase
        .from("pomodoro_sessions")
        .select("started_at, total_work_time")
        .eq("user_id", userId)
        .gte("started_at", startDate.toISOString())
        .or('total_work_time.gte.60,total_break_time.gte.60');

    // 2. Fetch Video Progress
    const { data: videoProgress, error: videoError } = await supabase
        .from("video_progress")
        .select("completed_at, video_id, video:videos(duration_minutes)")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("completed_at", startDate.toISOString());

    if (sessionError || videoError) {
        console.error("Error fetching history stats:", sessionError || videoError);
        return [];
    }

    // Group by Date
    const statsMap: Record<string, { pomodoro: number; video: number }> = {};

    // Initialize with 0s for all days
    for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        statsMap[dateKey] = { pomodoro: 0, video: 0 };
    }

    (sessions as any[])?.forEach(s => {
        const d = new Date(s.started_at);
        // Virtual Day Shift for Mapping
        if (d.getHours() < 4) d.setDate(d.getDate() - 1);
        
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (statsMap[dateKey]) {
            statsMap[dateKey].pomodoro += (s.total_work_time || 0);
        }
    });

    videoProgress?.forEach(vp => {
        if (!vp.completed_at) return;
        const d = new Date(vp.completed_at);
        // Virtual Day Shift for Mapping
        if (d.getHours() < 4) d.setDate(d.getDate() - 1);

        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        if (statsMap[dateKey]) {
            const duration = (vp.video as { duration_minutes?: number })?.duration_minutes || 0;
            statsMap[dateKey].video += duration;
        }
    });

    // Convert to array and sort
    // DB stores seconds, convert to minutes for display
    return Object.entries(statsMap)
        .map(([date, values]) => ({
            date, // Keeps YYYY-MM-DD for sorting
            pomodoro: Math.round(values.pomodoro / 60), // Saniye → Dakika
            video: Math.round(values.video) // Video zaten dakika cinsinden
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getRecentSessions(userId: string, limit: number = 20): Promise<TimelineBlock[]> {
  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select("id, course_name, started_at, ended_at, total_work_time, total_break_time, total_pause_time, timeline")
    .eq("user_id", userId)
    .or('total_work_time.gte.60,total_break_time.gte.60') // Molaları da getir
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Error fetching recent sessions:", error);
    return [];
  }

  return (data as any[]).map((s) => {
    // Trust DB columns as the primary source of truth for finished sessions to match getDailyStats
    const workTime = s.total_work_time || 0;
    const breakTime = s.total_break_time || 0;
    const pauseTime = s.total_pause_time || 0;

    return {
      id: s.id,
      courseName: s.course_name || "Bilinmeyen Ders",
      startTime: s.started_at,
      endTime: s.ended_at,
      durationSeconds: workTime,
      totalDurationSeconds: workTime + breakTime + pauseTime, 
      pauseSeconds: pauseTime,
      breakSeconds: breakTime,
      type: (breakTime > workTime) ? "break" : "work",
      timeline: Array.isArray(s.timeline) ? (s.timeline as any[]) : [],
    };
  });
}

export async function getNoteChunkById(chunkId: string) {
  // Basic UUID validation to prevent Postgres errors
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(chunkId)) {
    console.warn(`Invalid UUID passed to getNoteChunkById: ${chunkId}`);
    return null;
  }

  const { data, error } = await supabase
    .from('note_chunks')
    .select('content, metadata, course:courses(course_slug)')
    .eq('id', chunkId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Ignore single row not found errors
      console.error('Error fetching note chunk:', error);
    }
    return null;
  }
  return data as unknown;
}

export type CourseTopic = Database['public']['Tables']['note_chunks']['Row'] & {
    questionCount?: number;
};

export async function getCourseTopics(userId: string, courseId: string | null): Promise<CourseTopic[]> {
    if (!courseId) return [];

    // 1. Get all chunks for this course (sorted by chunk_order)
    const { data: chunks, error: chunksError } = await supabase
        .from('note_chunks')
        .select('*')
        .eq('course_id', courseId)
        .order('chunk_order', { ascending: true });

    if (chunksError) {
        console.error('Error fetching course topics:', chunksError);
        return [];
    }
    
    if (!chunks || chunks.length === 0) return [];

    // const chunkIds = chunks.map(c => c.id); // Unused

    return chunks.map(c => ({
        ...c,
        questionCount: 0
    }));
}

// --- Quiz Engine & Smart Start ---

export async function getUniqueCourseTopics(courseId: string) {
  const { data, error } = await supabase
    .from('note_chunks')
    .select('section_title')
    .eq('course_id', courseId)
    .order('section_title');

  if (error) {
    console.error('Error fetching course topics:', error);
    return [];
  }

  // Deduplicate section titles
  const titles = data.map(d => d.section_title).filter(Boolean);
  return Array.from(new Set(titles));
}

export async function getTopicQuestionCount(courseId: string, topic: string) {
  const { count, error } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('section_title', topic)
    .eq('usage_type', 'antrenman');

  if (error) {
    console.error('Error fetching question count:', error);
    return 0;
  }
  return count || 0;
}

export interface TopicCompletionStats {
  completed: boolean;
  antrenman: { solved: number; total: number; quota: number; existing: number };
  deneme: { solved: number; total: number; quota: number; existing: number };
  arsiv: { solved: number; total: number; quota: number; existing: number };
  mistakes: { solved: number; total: number; existing: number };
}

import { calculateQuota } from './ai/quiz-api';

export async function getTopicCompletionStatus(userId: string, courseId: string, topic: string): Promise<TopicCompletionStats> {
  // 1. Get Chunk Info for Quota Calculation
  const { data: chunk } = await supabase
    .from('note_chunks')
    .select('id, word_count, metadata')
    .eq('course_id', courseId)
    .eq('section_title', topic)
    .limit(1)
    .maybeSingle();

  let quota = { total: 0, antrenmanCount: 0, arsivCount: 0, denemeCount: 0 };

  if (chunk) {
      const wordCount = chunk.word_count || 0;
      const metadata = chunk.metadata as Record<string, unknown> || {};
      const conceptMap = (metadata.concept_map as unknown[]) || [];
      const conceptCount = conceptMap.length;
      quota = calculateQuota(wordCount, conceptCount);
  }

  // 2. Get all questions for this topic
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, usage_type, parent_question_id')
    .eq('course_id', courseId)
    .eq('section_title', topic);

  if (questionsError || !questions) {
    console.error('Error fetching questions for status:', questionsError);
    return {
        completed: false,
        antrenman: { solved: 0, total: quota.antrenmanCount, quota: quota.antrenmanCount, existing: 0 },
        deneme: { solved: 0, total: quota.denemeCount, quota: quota.denemeCount, existing: 0 },
        arsiv: { solved: 0, total: quota.arsivCount, quota: quota.arsivCount, existing: 0 },
        mistakes: { solved: 0, total: 0, existing: 0 }
    };
  }

  // 3. Calculate Totals (Existing in DB vs Theoretical Quota)
  const existingCounts = {
      antrenman: 0,
      deneme: 0,
      arsiv: 0,
      mistakes: 0
  };
  
  const questionIds = new Set<string>();
  const idToTypeMap = new Map<string, 'antrenman' | 'deneme' | 'arsiv' | 'mistakes'>();

  questions.forEach(q => {
      questionIds.add(q.id);
      let type: 'antrenman' | 'deneme' | 'arsiv' | 'mistakes' = 'antrenman'; // default

      if (q.parent_question_id) {
          type = 'mistakes';
      } else {
          // Explicit types
          if (q.usage_type === 'deneme') type = 'deneme';
          else if (q.usage_type === 'arsiv') type = 'arsiv';
          else type = 'antrenman';
      }
      
      idToTypeMap.set(q.id, type);
      existingCounts[type]++;
  });

  // 4. Get User Progress
  const { data: solvedData, error: solvedError } = await supabase
    .from('user_quiz_progress')
    .select('question_id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .in('question_id', Array.from(questionIds));

  if (solvedError) {
      console.error('Error fetching solved stats:', solvedError);
       return {
        completed: false,
        antrenman: { solved: 0, total: quota.antrenmanCount, quota: quota.antrenmanCount, existing: existingCounts.antrenman },
        deneme: { solved: 0, total: quota.denemeCount, quota: quota.denemeCount, existing: existingCounts.deneme },
        arsiv: { solved: 0, total: quota.arsivCount, quota: quota.arsivCount, existing: existingCounts.arsiv },
        mistakes: { solved: 0, total: existingCounts.mistakes, existing: existingCounts.mistakes }
    };
  }

  const solvedCounts = {
      antrenman: 0,
      deneme: 0,
      arsiv: 0,
      mistakes: 0
  };
  
  const uniqueSolved = new Set<string>();
  solvedData?.forEach(d => {
      if (!uniqueSolved.has(d.question_id)) {
          uniqueSolved.add(d.question_id);
          const type = idToTypeMap.get(d.question_id);
          if (type) {
              solvedCounts[type]++;
          }
      }
  });

  // Final Totals - taking the max of Quota vs Existing to ensure we don't show "10/5"
  const antrenmanTotal = Math.max(quota.antrenmanCount, existingCounts.antrenman);
  const denemeTotal = Math.max(quota.denemeCount, existingCounts.deneme);
  const arsivTotal = Math.max(quota.arsivCount, existingCounts.arsiv);
  const mistakesTotal = existingCounts.mistakes;

  // Completed logic: Consistent with the UI display
  const isCompleted = antrenmanTotal > 0 && solvedCounts.antrenman >= antrenmanTotal;

  return {
      completed: isCompleted,
      antrenman: { 
          solved: solvedCounts.antrenman, 
          total: antrenmanTotal,
          quota: quota.antrenmanCount,
          existing: existingCounts.antrenman
      },
      deneme: { 
          solved: solvedCounts.deneme, 
          total: denemeTotal, 
          quota: quota.denemeCount,
          existing: existingCounts.deneme
      },
      arsiv: { 
          solved: solvedCounts.arsiv, 
          total: arsivTotal, 
          quota: quota.arsivCount,
          existing: existingCounts.arsiv
      },
      mistakes: { 
          solved: solvedCounts.mistakes, 
          total: mistakesTotal,
          existing: existingCounts.mistakes
      }
  };
};

export interface TopicWithCounts {
    name: string;
    isCompleted: boolean; // Computed on client side or simplified fetch?
    counts: {
        antrenman: number;
        arsiv: number;
        deneme: number;
        total: number;
    };
}

export async function getCourseTopicsWithCounts(courseId: string): Promise<TopicWithCounts[]> {
    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id;

    // 1. Get topics from note_chunks sorted by chunk_order
    const { data: chunks, error: chunksError } = await supabase
        .from('note_chunks')
        .select('section_title, chunk_order')
        .eq('course_id', courseId)
        .order('chunk_order', { ascending: true });

    if (chunksError) {
        console.error('Error fetching course topics:', chunksError);
        return [];
    }

    // Dedup maintaining order
    const seen = new Set<string>();
    const orderedTopics: string[] = [];
    chunks?.forEach(c => {
        if (c.section_title && !seen.has(c.section_title)) {
            seen.add(c.section_title);
            orderedTopics.push(c.section_title);
        }
    });

    if (orderedTopics.length === 0) return [];

    // 2. Fetch all questions for this course to aggregate counts
    const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, section_title, usage_type, parent_question_id')
        .eq('course_id', courseId);

    if (questionsError) {
        console.error('Error fetching questions for counts:', questionsError);
         return orderedTopics.map(t => ({
            name: t,
            isCompleted: false,
            counts: { antrenman: 0, arsiv: 0, deneme: 0, total: 0 }
        }));
    }

    // 2.1 Fetch Solved Questions to determine isCompleted
    let solvedIds = new Set<string>();
    if (userId) {
        const { data: solved } = await supabase
            .from('user_quiz_progress')
            .select('question_id')
            .eq('user_id', userId)
            .eq('course_id', courseId);
        
        solved?.forEach(s => solvedIds.add(s.question_id));
    }

    // 3. Aggregate counts & completion
    // Map: Topic -> { antrenmanTotal: 0, antrenmanSolved: 0, ...others }
    const topicStats: Record<string, { 
        antrenman: number; 
        arsiv: number; 
        deneme: number; 
        total: number;
        antrenmanSolved: number; // To check completion
    }> = {};
    
    // Initialize
    orderedTopics.forEach(t => {
        topicStats[t] = { antrenman: 0, arsiv: 0, deneme: 0, total: 0, antrenmanSolved: 0 };
    });

    questions?.forEach(q => {
        const t = q.section_title;
        if (topicStats[t]) {
            topicStats[t].total += 1;
            const type = q.usage_type as string; 
            
            // Note: UI Badges requested to be removed, but we still return counts if needed.
            // Requirement said "Remove badge from UI", not remove from data.
            // But completion logic mainly cares about "Antrenman" (non-mistake) questions.
            
            if (q.parent_question_id) {
                // Mistake question - doesn't count towards 'Antrenman' total for badge usually, 
                // but let's keep simple counts as per existing logic or update?
                // Existing logic counted them based on usage_type 'antrenman' if they had it.
                // Assuming generated follow-ups have usage_type 'antrenman'. 
                // BUT User wants "Hata Telafisi" category separate in stats. 
                // For this list "isCompleted", we focus on MAIN questions.
                // So if parent_question_id is present, we ignore for "Antrenman Completion".
            } else {
                 if (type === 'antrenman') {
                     topicStats[t].antrenman += 1;
                     if (solvedIds.has(q.id)) {
                         topicStats[t].antrenmanSolved += 1;
                     }
                 }
                 else if (type === 'arsiv') topicStats[t].arsiv += 1;
                 else if (type === 'deneme') topicStats[t].deneme += 1;
            }
        }
    });

    return orderedTopics.map(topic => {
        const s = topicStats[topic];
        const isCompleted = s.antrenman > 0 && s.antrenmanSolved >= s.antrenman;
        
        return {
            name: topic,
            isCompleted, 
            counts: {
                antrenman: s.antrenman,
                arsiv: s.arsiv,
                deneme: s.deneme,
                total: s.total
            }
        };
    });
}

export async function getTopicQuestions(courseId: string, topic: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('*, course:courses(course_slug)')
    .eq('course_id', courseId)
    .eq('section_title', topic)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching topic questions:', error);
    return [];
  }

  // Map to QuizQuestion type
  return (data || []).map((q: unknown) => {
     const qData = (q as { question_data: Record<string, unknown> }).question_data; // Cast from Json
     const courseSlug = (q as { course?: { course_slug?: string } }).course?.course_slug;

     return {
        q: qData.q,
        o: qData.o,
        a: qData.a,
        exp: qData.exp,
        img: qData.img,
        imgPath: (qData.img && courseSlug) ? `/notes/${courseSlug}/media/` : undefined
     };
  });
}

export async function getFirstChunkIdForTopic(courseId: string, topic: string) {
  const { data, error } = await supabase
    .from('note_chunks')
    .select('id')
    .eq('course_id', courseId)
    .eq('section_title', topic)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching chunk for topic:', error);
    return null;
  }
  return data?.id || null;
}

export interface ChunkGenerationStatus {
  status: Database["public"]["Enums"]["chunk_generation_status"] | null;
  is_ready: boolean | null;
  error_message: string | null;
  attempts: number | null;
}

export async function getChunkGenerationStatus(chunkId: string): Promise<ChunkGenerationStatus | null> {
  const { data, error } = await supabase
    .from('note_chunks')
    .select('status, is_ready, error_message, attempts')
    .eq('id', chunkId)
    .single();

  if (error || !data) return null;
  return data as ChunkGenerationStatus;
}

// --- New Statistics Functions ---

export interface QuizStats {
  totalAnswered: number;
  correct: number;
  incorrect: number;
  blank: number;
  remaining: number;
  successRate: number;
}

export async function getQuizStats(userId: string): Promise<QuizStats> {
  const { data, error } = await supabase
    .from('user_quiz_progress')
    .select('response_type')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching quiz stats:', error);
    return { totalAnswered: 0, correct: 0, incorrect: 0, blank: 0, remaining: 0, successRate: 0 };
  }

  const totalAnswered = data?.length || 0;
  const correct = data?.filter(r => r.response_type === 'correct').length || 0;
  const incorrect = data?.filter(r => r.response_type === 'incorrect').length || 0;
  // 'struggled' removed from types
  const blank = data?.filter(r => r.response_type === 'blank').length || 0;

  return {
    totalAnswered,
    correct,
    incorrect,
    blank,
    remaining: 0,
    successRate: totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0,
  };
}

export interface SubjectCompetency {
  subject: string;
  score: number; // 0-100
  totalQuestions: number;
}

export async function getSubjectCompetency(userId: string): Promise<SubjectCompetency[]> {
    const coursesRes = await supabase.from('courses').select('id, name');
    if (coursesRes.error) return [];
    
    const courseMap = new Map(coursesRes.data.map(c => [c.id, c.name]));

    const { data, error } = await supabase
      .from('user_quiz_progress')
      .select('course_id, response_type')
      .eq('user_id', userId);

    if (error || !data) return [];

    const stats: Record<string, { correct: number; total: number }> = {};

    data.forEach(row => {
        const cName = courseMap.get(row.course_id) || 'Unknown';
        if (!stats[cName]) stats[cName] = { correct: 0, total: 0 };
        
        stats[cName].total += 1;
        if (row.response_type === 'correct') {
            stats[cName].correct += 1;
        }
    });

    return Object.entries(stats).map(([subject, val]) => ({
        subject,
        score: Math.round((val.correct / val.total) * 100),
        totalQuestions: val.total
    })).sort((a,b) => b.totalQuestions - a.totalQuestions).slice(0, 6);
}

export interface BloomStats {
    level: string;
    correct: number;
    total: number;
    score: number;
}

export async function getBloomStats(userId: string): Promise<BloomStats[]> {
    const { data, error } = await supabase
        .from('user_quiz_progress')
        .select('response_type, question:questions(bloom_level)')
        .eq('user_id', userId);

    if (error || !data) return [];

    const levels: Record<string, {correct: number, total: number}> = {
        'knowledge': {correct: 0, total: 0},
        'application': {correct: 0, total: 0},
        'analysis': {correct: 0, total: 0},
    };

    data.forEach((row: unknown) => {
        const typedRow = row as { question: { bloom_level: string }; response_type: string };
        // row.question could be an array if relation is one-to-many, but it should be object.
         // Supabase returns object for single relation.
         // Also handle case where question might be null (deleted)
         // const level = q?.bloom_level; // Unused 
        
        if (typedRow.question && levels[typedRow.question.bloom_level]) {
            levels[typedRow.question.bloom_level].total += 1;
            if (typedRow.response_type === 'correct') {
                levels[typedRow.question.bloom_level].correct += 1;
            }
        }
    });

    return Object.entries(levels).map(([key, val]) => ({
        level: key.charAt(0).toUpperCase() + key.slice(1),
        correct: val.correct,
        total: val.total,
        score: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0
    }));
}

export interface SRSStats {
  new: number;
  learning: number;
  review: number;
  mastered: number;
}

export async function getSRSStats(userId: string): Promise<SRSStats> {
    const { data, error } = await supabase
        .from('chunk_mastery')
        .select('mastery_score')
        .eq('user_id', userId);

    if (error || !data) return { new: 0, learning: 0, review: 0, mastered: 0 };

    const stats = { new: 0, learning: 0, review: 0, mastered: 0 };
    
    data.forEach(row => {
        // Proxy SRS levels from mastery_score (0-100)
        const score = row.mastery_score || 0;
        if (score === 0) stats.new++;
        else if (score < 40) stats.learning++;
        else if (score < 80) stats.review++;
        else stats.mastered++;
    });

    return stats;
}

export interface FocusTrend {
    date: string;
    minutes: number;
}

export async function getFocusTrend(userId: string): Promise<FocusTrend[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString();

    const { data, error } = await supabase
        .from('pomodoro_sessions')
        .select('started_at, total_work_time')
        .eq('user_id', userId)
        .gte('started_at', dateStr)
        .order('started_at', { ascending: true });

    if (error || !data) return [];
    
    const dailyMap: Record<string, number> = {};
    
    data.forEach(s => {
        const day = s.started_at.split('T')[0];
        dailyMap[day] = (dailyMap[day] || 0) + (s.total_work_time || 0);
    });

    return Object.entries(dailyMap).map(([date, seconds]) => ({
        date,
        minutes: Math.round(seconds / 60)
    })).sort((a,b) => a.date.localeCompare(b.date));
}





// --- Session Finalization ---

export interface SessionResultStats {
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    blankCount: number;
    timeSpentMs: number;
    courseId: string;
    userId: string;
}

export async function finishQuizSession(stats: SessionResultStats) {
  // 1. Increment Course Session Counter (Manual Logic since RPC is missing)
  const { data: existing, error: fetchError } = await supabase
    .from('course_session_counters')
    .select('id, current_session')
    .eq('course_id', stats.courseId)
    .eq('user_id', stats.userId)
    .maybeSingle();

  if (fetchError) {
      console.error("Error fetching session counter:", fetchError);
      // We can continue, but stats might be off.
  }

  const nextSession = (existing?.current_session || 0) + 1;

  const { error: upsertError } = await supabase
    .from('course_session_counters')
    .upsert({
        id: existing?.id, // Includes ID if it exists to perform UPDATE instead of INSERT
        course_id: stats.courseId,
        user_id: stats.userId,
        current_session: nextSession,
        last_session_date: new Date().toISOString()
    }, {
        onConflict: 'user_id,course_id' // Explicitly handle conflict
    });
  
  if (upsertError) {
      console.error("Error incrementing session counter:", upsertError);
  }

  // 2. Update User XP or General Stats (Optional - mostly handled by triggers if any)
  // For now, we rely on `user_quiz_progress` logs which are already inserted during the quiz.

  // 3. Return aggregated data for the Dashboard (if needed, but usually passed from FE)
  return {
    success: true,
    sessionComplete: true
  };
}

// --- Daily Efficiency Summary for Master Card ---

export interface DetailedSession {
  id: string;
  courseName: string;
  workTimeSeconds: number;
  breakTimeSeconds: number;
  pauseTimeSeconds: number;
  efficiencyScore: number;
  timeline: Json[];
  startedAt: string;
}

export interface DailyEfficiencySummary {
  efficiencyScore: number;
  totalCycles: number;
  netWorkTimeSeconds: number;
  totalBreakTimeSeconds: number;
  totalPauseTimeSeconds: number;
  pauseCount: number;
  sessions: DetailedSession[];
}

export async function getDailyEfficiencySummary(userId: string): Promise<DailyEfficiencySummary> {
  const now = new Date();
  const today = new Date(now);
  
  // Virtual Day Logic: Day starts at 04:00 AM
  if (now.getHours() < 4) {
    today.setDate(today.getDate() - 1);
  }
  today.setHours(4, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: todaySessions, error } = await supabase
    .from("pomodoro_sessions")
    .select("id, course_name, started_at, total_work_time, total_break_time, total_pause_time, pause_count, efficiency_score, timeline")
    .eq("user_id", userId)
    .gte("started_at", today.toISOString())
    .lt("started_at", tomorrow.toISOString())
    .or('total_work_time.gte.60,total_break_time.gte.60')
    .order("started_at", { ascending: true });

  if (error) {
    console.error("Error fetching daily efficiency summary:", error);
  }

  const sessionsData = todaySessions || [];

  // Calculate aggregates
  let totalWork = 0;
  let totalBreak = 0;
  let totalPause = 0;
  let totalPauseCount = 0;
  let totalEfficiency = 0;
  let validEfficiencyCount = 0;
  let totalCycles = 0;

  const detailedSessions: DetailedSession[] = sessionsData.map((s) => {
    const work = s.total_work_time || 0;
    const brk = s.total_break_time || 0;
    const pause = s.total_pause_time || 0;
    const eff = s.efficiency_score || 0;
    const pCount = s.pause_count || 0;

    totalWork += work;
    totalBreak += brk;
    totalPause += pause;
    totalPauseCount += pCount;
    
    if (eff > 0) {
      totalEfficiency += eff;
      validEfficiencyCount++;
    }

    totalCycles += getCycleCount(s.timeline);

    return {
      id: s.id,
      courseName: s.course_name || "Bilinmeyen Ders",
      workTimeSeconds: work,
      breakTimeSeconds: brk,
      pauseTimeSeconds: pause,
      efficiencyScore: eff,
      timeline: Array.isArray(s.timeline) ? (s.timeline as Json[]) : [],
      startedAt: s.started_at,
    };
  });

  // Calculate average efficiency score
  const avgEfficiency = validEfficiencyCount > 0 
    ? Math.round(totalEfficiency / validEfficiencyCount) 
    : 0;

  return {
    efficiencyScore: avgEfficiency,
    totalCycles,
    netWorkTimeSeconds: totalWork,
    totalBreakTimeSeconds: totalBreak,
    totalPauseTimeSeconds: totalPause,
    pauseCount: totalPauseCount,
    sessions: detailedSessions,
  };
}
