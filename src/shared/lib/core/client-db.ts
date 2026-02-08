import { supabase } from "@/shared/lib/core/supabase";
import type { Database, Json } from "@/shared/types/supabase";
import {
  calculateFocusPower,
  calculateLearningFlow,
  calculatePauseCount,
  calculateSessionTotals,
  getCycleCount,
} from "@/features/pomodoro/lib/pomodoro-utils";

import {
  formatDateKey,
  getVirtualDate,
  getVirtualDateKey,
} from "@/shared/lib/utils/date-utils";
import coursesData from "@/features/courses/data/courses.json";

// Normalize category names to database slugs for consistent matching
function normalizeCategorySlug(rawName: string): string {
  const slugMap: Record<string, string> = {
    "EKONOMİ": "EKONOMI",
    "HUKUK": "HUKUK",
    "MUHASEBE VE MALİYE": "MUHASEBE_MALIYE",
    "GENEL YETENEK VE İNGİLİZCE": "GENEL_YETENEK",
  };
  return slugMap[rawName] || rawName;
}

export type Category = Database["public"]["Tables"]["categories"]["Row"] & {
  courses: Course[];
};

export type Course = Database["public"]["Tables"]["courses"]["Row"];

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
  videoTrendPercentage: number;
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
  efficiencyScore: number;
  trend: "up" | "down" | "stable";
  isAlarm: boolean;
  videoMinutes: number;
  pomodoroMinutes: number;
  quizMinutes: number;
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
    .from("categories")
    .select("*, courses(*)")
    .order("sort_order");

  if (catError) {
    const isAbort = catError.message?.includes("AbortError") ||
      catError.code === "ABORT_ERROR";
    if (!isAbort) {
      // Log to external service if needed
    }
    return [];
  }

  return categories as Category[];
}

export async function getAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order");

  if (error) {
    console.error("Error fetching all courses:", error);
    return [];
  }
  return data || [];
}

// --- Rank System ---
import { getRankForPercentage, Rank, RANKS } from "@/config/constants";
export type { Rank } from "@/config/constants";
export { getRankForPercentage, RANKS };

export function getNextRank(currentRankId: string): Rank | null {
  const currentIndex = RANKS.findIndex((r) => r.id === currentRankId);
  if (currentIndex === -1 || currentIndex === RANKS.length - 1) return null;
  return RANKS[currentIndex + 1];
}

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

    // Use static data for totals to ensure consistency even if categories table is transiently empty or partial
    const totalHoursFromJSON = coursesData.reduce(
      (sum: number, cat) =>
        sum +
        ((cat as { courses?: { totalHours?: number }[] }).courses?.reduce(
          (s: number, c) => s + (c.totalHours || 0),
          0,
        ) || 0),
      0,
    );
    const totalVideosFromJSON = coursesData.reduce(
      (sum: number, cat) =>
        sum +
        ((cat as { courses?: { totalVideos?: number }[] }).courses?.reduce(
          (s: number, c) => s + (c.totalVideos || 0),
          0,
        ) || 0),
      0,
    );

    const dbTotalHours = categories.reduce(
      (sum, cat) => sum + (cat.total_hours || 0),
      0,
    );
    const dbTotalVideos = categories.reduce(
      (sum, cat) =>
        sum + cat.courses.reduce((s, c) => s + (c.total_videos || 0), 0),
      0,
    );

    const globalTotalHours = dbTotalHours > 0
      ? dbTotalHours
      : totalHoursFromJSON || 280;
    const globalTotalVideos = dbTotalVideos > 0
      ? dbTotalVideos
      : totalVideosFromJSON || 550;

    const { data: progress, error: progressError } = await supabase
      .from("video_progress")
      .select("*, video:videos(duration_minutes, course_id)")
      .eq("user_id", userId)
      .eq("completed", true);

    if (progressError) {
      throw progressError;
    }

    const completedVideos = progress?.length || 0;
    let completedHours = 0;
    const courseProgress: Record<string, number> = {};
    const categoryProgress: Record<
      string,
      {
        completedVideos: number;
        completedHours: number;
        totalVideos: number;
        totalHours: number;
      }
    > = {};

    // --- Dynamic Logic Implementation ---

    // 1. Collect Active Days
    // We use a Set to store unique dates (YYYY-MM-DD)
    const activeDays = new Set<string>();
    let firstActivityDate: Date | null = null;

    if (progress) {
      for (const p of progress) {
        const dateStr = p.completed_at || p.updated_at; // Fallback to updated_at
        if (dateStr) {
          const d = new Date(dateStr);
          const formattedDate = getVirtualDateKey(d);

          activeDays.add(formattedDate);

          // For firstActivityDate, we use the raw date
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
          const courseSlug = courseIdToSlugMap[video.course_id] ||
            video.course_id;
          courseProgress[courseSlug] = (courseProgress[courseSlug] || 0) + 1;

          const catName = courseToCategoryMap[video.course_id];
          if (catName) {
            const normalizedCatName = normalizeCategorySlug(catName);
            if (!categoryProgress[normalizedCatName]) {
              // Initialize with totals from categories array
              const cat = categories.find((c) => c.name === catName);
              categoryProgress[normalizedCatName] = {
                completedVideos: 0,
                completedHours: 0,
                totalVideos: cat?.courses.reduce((sum, c) =>
                  sum + (c.total_videos || 0), 0) || 0,
                totalHours: cat?.total_hours || 0,
              };
            }
            categoryProgress[normalizedCatName].completedVideos += 1;
            categoryProgress[normalizedCatName].completedHours += durationHours;
          }
        }
      }
    }

    // Calculate progress percentage based on HOURS instead of counts
    const progressPercentage = Math.round(
      (completedHours / globalTotalHours) * 100,
    );

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
          ? Math.min(
            100,
            Math.max(0, Math.round(((progressPercentage - minP) / diff) * 100)),
          )
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
    // Check consecutive days starting from the virtual "Today"
    const checkDate = getVirtualDate();
    let consecutiveDays = 0;
    let gapCount = 0; // Track weekdays gaps

    // Convert firstActivityDate to virtual key for consistent day-only comparison
    const firstActivityKey = firstActivityDate
      ? getVirtualDateKey(firstActivityDate)
      : null;

    // We check explicitly day-by-day backwards
    while (true) {
      const dateStr = formatDateKey(checkDate);

      if (activeDays.has(dateStr)) {
        consecutiveDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        const dayOfWeek = checkDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (isWeekend) {
          // Hafta sonu (Cumartesi veya Pazar) aktif değilse streak bozulmaz
          // Sadece bir gün geri gideriz
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }

        // Hafta içi ve aktif değil
        if (consecutiveDays === 0 && gapCount === 0) {
          // Bugün (ilk kontrol edilen gün) henüz aktivite yoksa dünü kontrol etmeye devam et
          gapCount++;
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        } else {
          // Bir boşluk bulundu, streak burada sonlanır
          break;
        }
      }

      // Güvenlik: ilk aktivite gününün ötesine gitmeyi önle (sadece gün bazlı kontrol)
      if (firstActivityKey && formatDateKey(checkDate) < firstActivityKey) {
        break;
      }

      // Döngü sınırı
      if (consecutiveDays > 5000) {
        break;
      }
    }
    streak = consecutiveDays;

    // 3. Estimate Days Remaining
    // Formula: (Total Remaining Hours) / (Daily Average Hours)
    // Daily Average = Total Completed Hours / Days Active (from first activity to today)

    let estimatedDays = 0;
    const totalHours = globalTotalHours;
    const hoursRemaining = Math.max(0, totalHours - completedHours);

    if (hoursRemaining > 0) {
      if (activeDays.size > 0 && completedHours > 0) {
        // Daily Average based ONLY on active study days (excluding holidays)
        const dailyAveragePerActiveDay = completedHours / activeDays.size;

        if (dailyAveragePerActiveDay > 0) {
          // Calculate pure work days remaining (excluding future holiday padding)
          estimatedDays = Math.ceil(hoursRemaining / dailyAveragePerActiveDay);
        } else {
          estimatedDays = 999;
        }
      } else {
        // No activity yet, assume 2 hours per day
        estimatedDays = Math.ceil(hoursRemaining / 2);
      }
    } else {
      estimatedDays = 0;
    }

    // Export dailyAverage as "Hours per Active Day" for the UI
    const dailyAverage = activeDays.size > 0
      ? completedHours / activeDays.size
      : 0;

    return {
      completedVideos,
      totalVideos: globalTotalVideos,
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
      dailyAverage,
      todayVideoCount: (() => {
        const checkTodayStr = getVirtualDateKey();

        if (!progress) {
          return 0;
        }

        // Count videos that fall into "Today" bucket
        return progress.filter((p) => {
          const dateStr = p.completed_at || p.updated_at;
          if (!dateStr) {
            return false;
          }

          const pStr = getVirtualDateKey(new Date(dateStr));
          return pStr === checkTodayStr;
        }).length;
      })(),
    };
  } catch (error: unknown) {
    const e = error as { name?: string; message?: string };
    if (e?.name === "AbortError" || e?.message?.includes("AbortError")) {
      return null;
    }
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
  userId: string,
) {
  const totals = calculateSessionTotals(session.timeline);
  const pauseCount = calculatePauseCount(session.timeline);

  // Calculate Focus Power (Odak Gücü)
  // Formula: (Work / [Break + Pause]) * 20
  const efficiencyScore = calculateFocusPower(
    totals.totalWork,
    totals.totalBreak,
    totals.totalPause,
  );

  // Validate if courseId is a UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
  achievement_id: string;
  unlockedAt: string;
}

export async function getUnlockedAchievements(
  userId: string,
): Promise<UnlockedAchievement[]> {
  const { data, error } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    const isAbort = error.message?.includes("AbortError") ||
      error.code === "ABORT_ERROR";
    if (!isAbort) {
      // Log to tracking service
    }
    return [];
  }

  return (data as Database["public"]["Tables"]["user_achievements"]["Row"][])
    .map((a) => ({
      achievement_id: a.achievement_id,
      unlockedAt: a.unlocked_at,
    }));
}

export async function unlockAchievement(
  userId: string,
  achievementId: string,
  achievedAt?: string, // Opsiyonel: Gerçek başarılma tarihi (ISO string veya YYYY-MM-DD)
) {
  // achievedAt verilmişse onu kullan, yoksa şu anki zamanı kullan
  const unlockDate = achievedAt
    ? new Date(achievedAt).toISOString()
    : new Date().toISOString();

  const { error } = await supabase
    .from("user_achievements")
    .upsert({
      user_id: userId,
      achievement_id: achievementId,
      unlocked_at: unlockDate,
      is_celebrated: false,
    });

  if (error) console.error("Error unlocking achievement:", error);
}

export async function getTotalActiveDays(userId: string) {
  // Query distinct days from pomodoro_sessions
  // Provide a specialized RPC for this in production for performance
  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select("started_at")
    .eq("user_id", userId);

  if (error || !data) return 0;

  const days = new Set(data.map((d) => {
    const date = new Date(d.started_at);
    return `${date.getFullYear()}-${
      String(date.getMonth() + 1).padStart(2, "0")
    }-${String(date.getDate()).padStart(2, "0")}`;
  }));
  return days.size;
}

/**
 * Kullanıcının günlük video tamamlama verilerini analiz eder.
 * Her eşik değeri (5, 10) için ilk ulaşılan tarihi döndürür.
 */
export interface DailyVideoMilestones {
  maxCount: number; // Tüm zamanlardaki maksimum günlük video sayısı
  first5Date: string | null; // İlk kez 5+ video izlenen gün
  first10Date: string | null; // İlk kez 10+ video izlenen gün
}

export async function getDailyVideoMilestones(
  userId: string,
): Promise<DailyVideoMilestones> {
  const { data, error } = await supabase
    .from("video_progress")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("completed", true)
    .not("completed_at", "is", null);

  if (error || !data || data.length === 0) {
    return { maxCount: 0, first5Date: null, first10Date: null };
  }

  // Günlere göre grupla
  const dailyCounts: Record<string, number> = {};
  for (const row of data) {
    if (!row.completed_at) continue;
    const date = new Date(row.completed_at);
    const dayKey = `${date.getFullYear()}-${
      String(date.getMonth() + 1).padStart(2, "0")
    }-${String(date.getDate()).padStart(2, "0")}`;
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

/**
 * Kullanıcının streak verilerini analiz eder.
 * Hafta sonu (Cumartesi veya Pazar) izni kuralını uygular.
 * İlk 7 günlük streak'e ulaşılan tarihi döndürür.
 */
export interface StreakMilestones {
  maxStreak: number;
  first7StreakDate: string | null; // İlk kez 7+ günlük streak tamamlandığı gün
}

export async function getStreakMilestones(
  userId: string,
): Promise<StreakMilestones> {
  // Video progress'den aktif günleri al
  const { data, error } = await supabase
    .from("video_progress")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("completed", true)
    .not("completed_at", "is", null);

  if (error || !data || data.length === 0) {
    return { maxStreak: 0, first7StreakDate: null };
  }

  // Benzersiz aktif günleri topla
  const activeDaysSet = new Set<string>();
  for (const row of data) {
    if (!row.completed_at) continue;
    const date = new Date(row.completed_at);
    const dayKey = `${date.getFullYear()}-${
      String(date.getMonth() + 1).padStart(2, "0")
    }-${String(date.getDate()).padStart(2, "0")}`;
    activeDaysSet.add(dayKey);
  }

  const activeDays = [...activeDaysSet].sort();

  if (activeDays.length === 0) {
    return { maxStreak: 0, first7StreakDate: null };
  }

  // Streak hesapla - hafta sonu izni kuralıyla
  // Cumartesi (6) veya Pazar (0) günlerinde 1 gün boşluk streak'i bozmaz
  let maxStreak = 0;
  let currentStreak = 0;
  let first7StreakDate: string | null = null;
  let lastActiveDate: Date | null = null;

  for (const dayKey of activeDays) {
    const currentDate = new Date(dayKey + "T12:00:00Z"); // UTC ortası için

    if (lastActiveDate === null) {
      currentStreak = 1;
    } else {
      const diffMs = currentDate.getTime() - lastActiveDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Ardışık gün
        currentStreak++;
      } else if (diffDays === 2) {
        // 1 gün boşluk var - hafta sonu izni mi kontrol et
        const skippedDate = new Date(
          lastActiveDate.getTime() + 24 * 60 * 60 * 1000,
        );
        const skippedDay = skippedDate.getDay(); // 0=Pazar, 6=Cumartesi

        if (skippedDay === 0 || skippedDay === 6) {
          // Hafta sonu izni - streak devam
          currentStreak++;
        } else {
          // Hafta içi boşluk - streak kırıldı
          currentStreak = 1;
        }
      } else {
        // 2+ gün boşluk - streak kırıldı
        currentStreak = 1;
      }
    }

    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }

    // İlk 7 günlük streak
    if (first7StreakDate === null && currentStreak >= 7) {
      first7StreakDate = dayKey;
    }

    lastActiveDate = currentDate;
  }

  return { maxStreak, first7StreakDate };
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
    .from("pomodoro_sessions")
    .select("timeline")
    .eq("user_id", userId)
    .gte("started_at", today.toISOString());

  if (error) {
    return 0;
  }

  // Count work cycles in all sessions today
  const totalCycles = (data || []).reduce(
    (acc, s) => acc + getCycleCount(s.timeline),
    0,
  );
  return totalCycles;
}

export async function getLatestActiveSession(userId: string) {
  const { data } = await supabase
    .from("pomodoro_sessions")
    .select("*, course:courses(*, category:categories(*))")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .neq("is_completed", true)
    .limit(1)
    .maybeSingle();

  return data;
}

export async function deletePomodoroSession(sessionId: string) {
  const { error } = await supabase
    .from("pomodoro_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) console.error("Error deleting session:", error);
}

/**
 * Updates the heartbeat timestamp for zombie session detection.
 * Should be called every 30 seconds during active sessions.
 */
export async function updatePomodoroHeartbeat(
  sessionId: string,
  stats?: {
    efficiency_score?: number;
    total_paused_time?: number;
  },
): Promise<void> {
  const { error } = await supabase
    .from("pomodoro_sessions")
    .update({
      last_active_at: new Date().toISOString(),
      ...(stats?.efficiency_score !== undefined
        ? { efficiency_score: stats.efficiency_score }
        : {}),
      ...(stats?.total_paused_time !== undefined
        ? { total_pause_time: stats.total_paused_time }
        : {}),
    })
    .eq("id", sessionId);

  if (error) {
    // Heartbeat failed
  }
}

export async function getVideoProgress(
  userId: string,
  courseId: string,
  videoNumbers: number[],
) {
  // 1. Get the video records for this course to map video_number to video_id
  const { data: videos, error: videoError } = await supabase
    .from("videos")
    .select("id, video_number")
    .eq("course_id", courseId)
    .in("video_number", videoNumbers);

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
    .from("video_progress")
    .select("video_id, completed")
    .eq("user_id", userId)
    .in("video_id", videoIds);

  if (progressError) {
    console.error("Error fetching video progress:", progressError);
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
  completed: boolean,
) {
  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, duration_minutes")
    .eq("course_id", courseId)
    .eq("video_number", videoNumber)
    .single();

  if (videoError || !video) {
    console.error("Error finding video for toggle:", videoError);
    return;
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("video_progress").upsert(
    {
      user_id: userId,
      video_id: video.id,
      completed,
      updated_at: now,
      completed_at: completed ? now : null,
    },
    {
      onConflict: "user_id,video_id",
    },
  );

  if (error) {
    console.error("Error toggling video progress:", error);
  }
}

export async function toggleVideoProgressBatch(
  userId: string,
  courseId: string,
  videoNumbers: number[],
  completed: boolean,
) {
  // Get all video IDs for the batch
  const { data: videos, error: videoError } = await supabase
    .from("videos")
    .select("id, duration_minutes")
    .eq("course_id", courseId)
    .in("video_number", videoNumbers);

  if (videoError || !videos) {
    console.error("Error finding videos for batch toggle:", videoError);
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

  const { error } = await supabase.from("video_progress").upsert(upsertData, {
    onConflict: "user_id,video_id",
  });

  if (error) {
    console.error("Error batch toggling video progress:", error);
  }
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
    .or("total_work_time.gte.60,total_break_time.gte.60"); // Anlamlı süreleri (1dk+) dahil et

  if (todayError) {
    console.error("Error fetching daily stats:", todayError);
  }

  // 2. Fetch Yesterday's Pomodoro Stats (for Trend)
  const { data: yesterdaySessions } = await supabase
    .from("pomodoro_sessions")
    .select("total_work_time")
    .eq("user_id", userId)
    .gte("started_at", yesterday.toISOString())
    .lt("started_at", today.toISOString());

  // 3. Fetch Video Stats (Today & Yesterday)
  const { data: todayVideos } = await supabase
    .from("video_progress")
    .select("video_id, video:videos(duration_minutes)")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("completed_at", today.toISOString())
    .lt("completed_at", tomorrow.toISOString());

  const { data: yesterdayVideos } = await supabase
    .from("video_progress")
    .select("video_id")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("completed_at", yesterday.toISOString())
    .lt("completed_at", today.toISOString());

  // DB stores Seconds. UI expects Minutes.
  const todaySessionsData = todaySessions || [];
  const totalWorkSeconds =
    todaySessionsData.reduce((acc, s) => acc + (s.total_work_time || 0), 0) ||
    0;
  const totalBreakSeconds =
    todaySessionsData.reduce((acc, s) => acc + (s.total_break_time || 0), 0) ||
    0;
  const totalPauseSeconds =
    todaySessionsData.reduce((acc, s) => acc + (s.total_pause_time || 0), 0) ||
    0;

  // Calculate total cycles
  const totalCycles = todaySessionsData.reduce(
    (acc, s) => acc + getCycleCount(s.timeline),
    0,
  );

  const totalWorkMinutes = Math.round(totalWorkSeconds / 60);
  const totalBreakMinutes = Math.round(totalBreakSeconds / 60);
  const totalPauseMinutes = Math.round(totalPauseSeconds / 60);

  // User expects "Oturum" to mean "Pomodoro Work Cycle"
  const sessionCount = totalCycles;

  const yesterdayWorkSeconds =
    yesterdaySessions?.reduce((acc, s) => acc + (s.total_work_time || 0), 0) ||
    0;
  const yesterdayWorkMinutes = Math.round(yesterdayWorkSeconds / 60);

  // Calculate Trend
  let trendPercentage = 0;
  if (yesterdayWorkMinutes === 0) {
    trendPercentage = totalWorkMinutes > 0 ? 100 : 0;
  } else {
    trendPercentage = Math.round(
      ((totalWorkMinutes - yesterdayWorkMinutes) / yesterdayWorkMinutes) * 100,
    );
  }

  // Calculate Video Stats from video_progress
  let totalVideoMinutes = 0;
  const completedVideosCount = todayVideos?.length || 0;

  if (todayVideos) {
    totalVideoMinutes = todayVideos.reduce((acc, vp) => {
      const duration =
        (vp.video as { duration_minutes?: number })?.duration_minutes || 0;
      return acc + duration;
    }, 0);
  }

  const yesterdayVideoCount = yesterdayVideos?.length || 0;
  let videoTrendPercentage = 0;
  if (yesterdayVideoCount === 0) {
    videoTrendPercentage = completedVideosCount > 0 ? 100 : 0;
  } else {
    videoTrendPercentage = Math.round(
      ((completedVideosCount - yesterdayVideoCount) / yesterdayVideoCount) *
        100,
    );
  }

  // Default goal 4 hours (240 mins)
  const goalMinutes = 200;
  const progress = Math.min(
    100,
    Math.round((totalWorkMinutes / goalMinutes) * 100),
  );

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
    videoTrendPercentage,
    totalCycles,
  };
}

export async function getLast30DaysActivity(
  userId: string,
): Promise<DayActivity[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select("started_at, total_work_time")
    .eq("user_id", userId)
    .gte("started_at", thirtyDaysAgo.toISOString())
    .or("total_work_time.gte.60,total_break_time.gte.60");

  if (error) {
    console.error("Error fetching activity heatmap:", error);
    return [];
  }

  const dailyCounts: Record<string, { count: number; minutes: number }> = {};
  (data as Database["public"]["Tables"]["pomodoro_sessions"]["Row"][])?.forEach(
    (s) => {
      const d = new Date(s.started_at);
      const dateStr = `${d.getFullYear()}-${
        String(d.getMonth() + 1).padStart(2, "0")
      }-${String(d.getDate()).padStart(2, "0")}`;
      dailyCounts[dateStr] = {
        count: (dailyCounts[dateStr]?.count || 0) + 1,
        minutes: (dailyCounts[dateStr]?.minutes || 0) +
          (s.total_work_time || 0),
      };
    },
  );

  const heatmap: DayActivity[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (30 - i));
    const dateStr = `${d.getFullYear()}-${
      String(d.getMonth() + 1).padStart(2, "0")
    }-${String(d.getDate()).padStart(2, "0")}`;
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
      totalMinutes: Math.round((dailyCounts[dateStr]?.minutes || 0) / 60),
    });
  }

  return heatmap;
}

export async function getEfficiencyRatio(
  userId: string,
): Promise<EfficiencyData> {
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
    .select("total_work_time, total_break_time, started_at, ended_at")
    .eq("user_id", userId)
    .gte("started_at", today.toISOString())
    .lt("started_at", tomorrow.toISOString())
    .or("total_work_time.gte.60,total_break_time.gte.60");

  // 2. Fetch Today's Video Stats using video_progress
  const { data: todayVideos, error: videoError } = await supabase
    .from("video_progress")
    .select("video_id, completed_at, video:videos(duration_minutes)")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("completed_at", today.toISOString())
    .lt("completed_at", tomorrow.toISOString());

  // 3. Fetch Today's Quiz Progress (to filter out "Quiz Sessions")
  const { data: todayQuiz } = await supabase
    .from("user_quiz_progress")
    .select("answered_at")
    .eq("user_id", userId)
    .gte("answered_at", today.toISOString())
    .lt("answered_at", tomorrow.toISOString());

  if (sessionError || videoError) {
    console.error(
      "Error fetching efficiency metrics:",
      sessionError || videoError,
    );
  }

  const sessions =
    (todaySessions as Database["public"]["Tables"]["pomodoro_sessions"][
      "Row"
    ][]) || [];
  const totalWork =
    sessions.reduce((acc: number, s) => acc + (s.total_work_time || 0), 0) || 0;

  let totalVideoMinutes = 0;
  if (todayVideos) {
    totalVideoMinutes = todayVideos.reduce((acc: number, vp) => {
      const video = vp.video as { duration_minutes?: number } | null;
      const duration = video?.duration_minutes || 0;
      return acc + duration;
    }, 0);
  }

  // --- Quiz Filtering Logic ---
  // Identify sessions that are predominantly "Quiz Sessions"
  // A session is considered a "Quiz Session" if:
  // 1. It has significant quiz activity (e.g. > 5 questions answered) during the session window.
  // 2. No video was completed during the session (or very little).

  let quizSessionMinutes = 0;

  if (todayQuiz && todayQuiz.length > 0) {
    sessions.forEach((session) => {
      const start = new Date(session.started_at).getTime();
      // Use ended_at if available, else estimate based on work+break+pause
      const end = session.ended_at
        ? new Date(session.ended_at).getTime()
        : start +
          ((session.total_work_time || 0) +
            (session.total_break_time || 0) * 1000); // fallback

      // Count questions answered in this window
      const questionsInSession = todayQuiz.filter((q) => {
        if (!q.answered_at) return false;
        const t = new Date(q.answered_at).getTime();
        return t >= start && t <= end;
      }).length;

      // Check if any video was completed in this session
      const videosInSession = todayVideos?.filter((v) => {
        if (!v.completed_at) return false;
        const t = new Date(v.completed_at).getTime();
        return t >= start && t <= end;
      }).length || 0;

      // Threshold: 5 questions and 0 videos -> It's a quiz session
      if (questionsInSession >= 5 && videosInSession === 0) {
        // It is a quiz session.
        quizSessionMinutes += Math.round((session.total_work_time || 0) / 60);
      }
    });
  }

  // DB stores Seconds. Convert to Minutes.
  const totalWorkMinutes = Math.round(totalWork / 60);

  // Effective Work Time: Subtract Quiz Time
  // Ensure we don't go below Video Time (impossible but safety check)
  const effectiveWorkMinutes = Math.max(
    totalVideoMinutes,
    totalWorkMinutes - quizSessionMinutes,
  );

  // Revised Ratio Calculation
  // Nominal Ratio (Video / Effective)
  const ratio = effectiveWorkMinutes > 0
    ? Math.round((totalVideoMinutes / effectiveWorkMinutes) * 10) / 10
    : 0.0;

  // Efficiency Score Calculation (Golden Ratio Strategy)
  // Uses shared utility for consistency across the app
  const efficiencyScore = calculateLearningFlow(
    effectiveWorkMinutes,
    totalVideoMinutes,
  );

  return {
    ratio,
    efficiencyScore,
    trend: "stable",
    isAlarm: ratio > 2.5,
    videoMinutes: Math.round(totalVideoMinutes),
    pomodoroMinutes: totalWorkMinutes,
    quizMinutes: quizSessionMinutes,
  };
}

export interface CumulativeStats {
  totalWorkMinutes: number;
  totalVideoMinutes: number;
  ratio: number;
}

export async function getCumulativeStats(
  userId: string,
): Promise<CumulativeStats> {
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
    console.error(
      "Error fetching cumulative stats:",
      sessionError || videoError,
    );
  }

  const totalWorkSeconds =
    allSessions?.reduce((acc, s) => acc + (s.total_work_time || 0), 0) || 0;
  const totalWorkMinutes = Math.round(totalWorkSeconds / 60);

  let totalVideoMinutes = 0;
  if (allVideos) {
    totalVideoMinutes = allVideos.reduce((acc, vp) => {
      const duration =
        (vp.video as { duration_minutes?: number })?.duration_minutes || 0;
      return acc + duration;
    }, 0);
  }

  const ratio = totalVideoMinutes > 0
    ? Math.round((totalWorkMinutes / totalVideoMinutes) * 10) / 10
    : 0;

  return {
    totalWorkMinutes,
    totalVideoMinutes: Math.round(totalVideoMinutes),
    ratio,
  };
}

export interface HistoryStats {
  date: string;
  pomodoro: number;
  video: number;
}

export async function getHistoryStats(
  userId: string,
  days: number = 7,
): Promise<HistoryStats[]> {
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
    .or("total_work_time.gte.60,total_break_time.gte.60");

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
    const dateKey = `${d.getFullYear()}-${
      String(d.getMonth() + 1).padStart(2, "0")
    }-${String(d.getDate()).padStart(2, "0")}`;
    statsMap[dateKey] = { pomodoro: 0, video: 0 };
  }

  (sessions as Database["public"]["Tables"]["pomodoro_sessions"]["Row"][])
    ?.forEach((s) => {
      const d = new Date(s.started_at);
      // Virtual Day Shift for Mapping
      if (d.getHours() < 4) d.setDate(d.getDate() - 1);

      const dateKey = `${d.getFullYear()}-${
        String(d.getMonth() + 1).padStart(2, "0")
      }-${String(d.getDate()).padStart(2, "0")}`;
      if (statsMap[dateKey]) {
        statsMap[dateKey].pomodoro += s.total_work_time || 0;
      }
    });

  videoProgress?.forEach((vp) => {
    if (!vp.completed_at) return;
    const d = new Date(vp.completed_at);
    // Virtual Day Shift for Mapping
    if (d.getHours() < 4) d.setDate(d.getDate() - 1);

    const dateKey = `${d.getFullYear()}-${
      String(d.getMonth() + 1).padStart(2, "0")
    }-${String(d.getDate()).padStart(2, "0")}`;

    if (statsMap[dateKey]) {
      const duration =
        (vp.video as { duration_minutes?: number })?.duration_minutes || 0;
      statsMap[dateKey].video += duration;
    }
  });

  // Convert to array and sort
  // DB stores seconds, convert to minutes for display
  return Object.entries(statsMap)
    .map(([date, values]) => ({
      date, // Keeps YYYY-MM-DD for sorting
      pomodoro: Math.round(values.pomodoro / 60), // Saniye → Dakika
      video: Math.round(values.video), // Video zaten dakika cinsinden
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getRecentSessions(
  userId: string,
  limit: number = 20,
): Promise<TimelineBlock[]> {
  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select(
      "id, course_name, started_at, ended_at, total_work_time, total_break_time, total_pause_time, timeline",
    )
    .eq("user_id", userId)
    .or("total_work_time.gte.60,total_break_time.gte.60") // Molaları da getir
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Error fetching recent sessions:", error);
    return [];
  }

  return (data as Database["public"]["Tables"]["pomodoro_sessions"]["Row"][])
    .map((s) => {
      // Trust DB columns as the primary source of truth for finished sessions to match getDailyStats
      const workTime = s.total_work_time || 0;
      const breakTime = s.total_break_time || 0;
      const pauseTime = s.total_pause_time || 0;

      // Define a local interface or usage based type for timeline events
      // to avoid 'any' usage.
      interface TimelineEvent {
        start?: number;
        end?: number;
        [key: string]: Json | undefined;
      }

      let timeline: TimelineEvent[] = [];
      if (Array.isArray(s.timeline)) {
        timeline = s.timeline as unknown as TimelineEvent[];
      } else if (typeof s.timeline === "string") {
        try {
          timeline = JSON.parse(s.timeline);
        } catch (e) {
          console.error("Failed to parse timeline string:", e);
        }
      }

      // Calculate true start/end from timeline if possible to avoid scaling issues in Gantt Chart
      // especially when session was paused and resumed (which updates started_at)
      let startTime = s.started_at;
      let endTime = s.ended_at;

      if (timeline.length > 0) {
        const tStart = Math.min(
          ...timeline
            .filter(
              (e): e is TimelineEvent & { start: number } =>
                typeof e?.start === "number",
            )
            .map((e) => e.start),
        );
        const tEnd = Math.max(
          ...timeline
            .filter(
              (e): e is TimelineEvent & ({ start: number } | { end: number }) =>
                e !== null &&
                (typeof e.end === "number" || typeof e.start === "number"),
            )
            .map((e) => (e.end ?? e.start) as number),
        );

        if (tStart < Infinity) {
          startTime = new Date(
            Math.min(new Date(s.started_at).getTime(), tStart),
          ).toISOString();
        }
        if (tEnd > -Infinity) {
          endTime = new Date(Math.max(new Date(s.ended_at).getTime(), tEnd))
            .toISOString();
        }
      }

      return {
        id: s.id,
        courseName: s.course_name || "Bilinmeyen Ders",
        startTime,
        endTime,
        durationSeconds: workTime,
        totalDurationSeconds: workTime + breakTime + pauseTime,
        pauseSeconds: pauseTime,
        breakSeconds: breakTime,
        type: (breakTime > workTime) ? "break" : "work",
        timeline: timeline,
      };
    });
}

export async function getNoteChunkById(chunkId: string) {
  // Basic UUID validation to prevent Postgres errors
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(chunkId)) {
    console.warn(`Invalid UUID passed to getNoteChunkById: ${chunkId}`);
    return null;
  }

  const { data, error } = await supabase
    .from("note_chunks")
    .select("content, metadata, course:courses(course_slug)")
    .eq("id", chunkId)
    .single();

  if (error) {
    if (error.code !== "PGRST116") { // Ignore single row not found errors
      console.error("Error fetching note chunk:", error);
    }
    return null;
  }
  return data as unknown;
}

export type CourseTopic =
  & Omit<
    Database["public"]["Tables"]["note_chunks"]["Row"],
    "attempts" | "error_message"
  >
  & {
    questionCount?: number;
  };

export async function getCourseTopics(
  userId: string,
  courseId: string | null,
): Promise<CourseTopic[]> {
  if (!courseId) return [];

  // 1. Get all chunks for this course (sorted by chunk_order)
  const { data: chunks, error: chunksError } = await supabase
    .from("note_chunks")
    .select(
      "id, created_at, course_id, course_name, section_title, chunk_order, sequence_order, content, display_content, word_count, status, last_synced_at, metadata, density_score, meaningful_word_count, target_count",
    )
    .eq("course_id", courseId)
    .order("chunk_order", { ascending: true })
    .order("sequence_order", { ascending: true });

  if (chunksError) {
    console.error("Error fetching course topics:", chunksError);
    return [];
  }

  if (!chunks || chunks.length === 0) return [];

  // const chunkIds = chunks.map(c => c.id); // Unused

  return chunks.map((c) => ({
    ...c,
    density_score: c.density_score ??
      (c.metadata as { density_score?: number })?.density_score ??
      null,
    questionCount: 0,
  })) as CourseTopic[];
}

export async function getCourseIdBySlug(slug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("courses")
    .select("id")
    .eq("course_slug", slug)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.warn(`Course not found for slug: ${slug}`, error);
    return null;
  }
  return data.id;
}

// --- Quiz Engine & Smart Start ---

export async function getUniqueCourseTopics(courseId: string) {
  const { data, error } = await supabase
    .from("note_chunks")
    .select("section_title")
    .eq("course_id", courseId)
    .order("section_title");

  if (error) {
    console.error("Error fetching course topics:", error);
    return [];
  }

  // Deduplicate section titles
  const titles = data.map((d) => d.section_title).filter(Boolean);
  return Array.from(new Set(titles));
}

export async function getTopicQuestionCount(courseId: string, topic: string) {
  const { count, error } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("section_title", topic)
    .eq("usage_type", "antrenman");

  if (error) {
    console.error("Error fetching question count:", error);
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

export async function getTopicCompletionStatus(
  userId: string,
  courseId: string,
  topic: string,
): Promise<TopicCompletionStats> {
  // 1. Get Chunk Info
  const { data: chunk } = await supabase
    .from("note_chunks")
    .select("id, word_count, metadata, target_count")
    .eq("course_id", courseId)
    .eq("section_title", topic)
    .limit(1)
    .maybeSingle();

  let quota = { total: 0, antrenman: 0, arsiv: 0, deneme: 0 };

  if (chunk) {
    // Use target_count from database directly
    const antrenman = chunk.target_count ?? 0;
    const arsiv = Math.ceil(antrenman * 0.25);
    const deneme = Math.ceil(antrenman * 0.25);

    quota = {
      total: antrenman + arsiv + deneme,
      antrenman,
      arsiv,
      deneme,
    };
  }

  // 2. Get all questions for this topic
  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, usage_type, parent_question_id")
    .eq("course_id", courseId)
    .eq("section_title", topic);

  if (questionsError || !questions) {
    console.error("Error fetching questions for status:", questionsError);
    return {
      completed: false,
      antrenman: {
        solved: 0,
        total: quota.antrenman,
        quota: quota.antrenman,
        existing: 0,
      },
      deneme: {
        solved: 0,
        total: quota.deneme,
        quota: quota.deneme,
        existing: 0,
      },
      arsiv: {
        solved: 0,
        total: quota.arsiv,
        quota: quota.arsiv,
        existing: 0,
      },
      mistakes: { solved: 0, total: 0, existing: 0 },
    };
  }

  // 3. Calculate Totals (Existing in DB vs Theoretical Quota)
  const existingCounts = {
    antrenman: 0,
    deneme: 0,
    arsiv: 0,
    mistakes: 0,
  };

  const questionIds = new Set<string>();
  const idToTypeMap = new Map<
    string,
    "antrenman" | "deneme" | "arsiv" | "mistakes"
  >();

  questions.forEach((q) => {
    questionIds.add(q.id);
    let type: "antrenman" | "deneme" | "arsiv" | "mistakes" = "antrenman"; // default

    if (q.parent_question_id) {
      type = "mistakes";
    } else {
      // Explicit types
      if (q.usage_type === "deneme") type = "deneme";
      else if (q.usage_type === "arsiv") type = "arsiv";
      else type = "antrenman";
    }

    idToTypeMap.set(q.id, type);
    existingCounts[type]++;
  });

  // 4. Get User Progress
  const { data: solvedData, error: solvedError } = await supabase
    .from("user_quiz_progress")
    .select("question_id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .in("question_id", Array.from(questionIds));

  if (solvedError) {
    console.error("Error fetching solved stats:", solvedError);
    return {
      completed: false,
      antrenman: {
        solved: 0,
        total: quota.antrenman,
        quota: quota.antrenman,
        existing: existingCounts.antrenman,
      },
      deneme: {
        solved: 0,
        total: quota.deneme,
        quota: quota.deneme,
        existing: existingCounts.deneme,
      },
      arsiv: {
        solved: 0,
        total: quota.arsiv,
        quota: quota.arsiv,
        existing: existingCounts.arsiv,
      },
      mistakes: {
        solved: 0,
        total: existingCounts.mistakes,
        existing: existingCounts.mistakes,
      },
    };
  }

  const solvedCounts = {
    antrenman: 0,
    deneme: 0,
    arsiv: 0,
    mistakes: 0,
  };

  const uniqueSolved = new Set<string>();
  solvedData?.forEach((d) => {
    if (!uniqueSolved.has(d.question_id)) {
      uniqueSolved.add(d.question_id);
      const type = idToTypeMap.get(d.question_id);
      if (type) {
        solvedCounts[type]++;
      }
    }
  });

  // Final Totals - taking the max of Quota vs Existing to ensure we don't show "10/5"
  const antrenmanTotal = Math.max(
    quota.antrenman,
    existingCounts.antrenman,
  );
  const denemeTotal = Math.max(quota.deneme, existingCounts.deneme);
  const arsivTotal = Math.max(quota.arsiv, existingCounts.arsiv);
  const mistakesTotal = existingCounts.mistakes;

  // Completed logic: Consistent with the UI display
  const isCompleted = antrenmanTotal > 0 &&
    solvedCounts.antrenman >= antrenmanTotal;

  return {
    completed: isCompleted,
    antrenman: {
      solved: solvedCounts.antrenman,
      total: antrenmanTotal,
      quota: quota.antrenman,
      existing: existingCounts.antrenman,
    },
    deneme: {
      solved: solvedCounts.deneme,
      total: denemeTotal,
      quota: quota.deneme,
      existing: existingCounts.deneme,
    },
    arsiv: {
      solved: solvedCounts.arsiv,
      total: arsivTotal,
      quota: quota.arsiv,
      existing: existingCounts.arsiv,
    },
    mistakes: {
      solved: solvedCounts.mistakes,
      total: mistakesTotal,
      existing: existingCounts.mistakes,
    },
  };
}

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

export async function getCourseTopicsWithCounts(
  courseId: string,
): Promise<TopicWithCounts[]> {
  const { data: user } = await supabase.auth.getUser();
  const userId = user.user?.id;

  // 1. Get topics from note_chunks sorted by chunk_order
  const { data: chunks, error: chunksError } = await supabase
    .from("note_chunks")
    .select("section_title, chunk_order")
    .eq("course_id", courseId)
    .order("chunk_order", { ascending: true })
    .order("sequence_order", { ascending: true });

  if (chunksError) {
    console.error("Error fetching course topics:", chunksError);
    return [];
  }

  // Dedup maintaining order
  const seen = new Set<string>();
  const orderedTopics: string[] = [];
  chunks?.forEach((c) => {
    if (c.section_title && !seen.has(c.section_title)) {
      seen.add(c.section_title);
      orderedTopics.push(c.section_title);
    }
  });

  if (orderedTopics.length === 0) return [];

  // 2. Fetch all questions for this course to aggregate counts
  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, section_title, usage_type, parent_question_id")
    .eq("course_id", courseId);

  if (questionsError) {
    console.error("Error fetching questions for counts:", questionsError);
    return orderedTopics.map((t) => ({
      name: t,
      isCompleted: false,
      counts: { antrenman: 0, arsiv: 0, deneme: 0, total: 0 },
    }));
  }

  // 2.1 Fetch Solved Questions to determine isCompleted
  const solvedIds = new Set<string>();
  if (userId) {
    const { data: solved } = await supabase
      .from("user_quiz_progress")
      .select("question_id")
      .eq("user_id", userId)
      .eq("course_id", courseId);

    solved?.forEach((s) => solvedIds.add(s.question_id));
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
  orderedTopics.forEach((t) => {
    topicStats[t] = {
      antrenman: 0,
      arsiv: 0,
      deneme: 0,
      total: 0,
      antrenmanSolved: 0,
    };
  });

  questions?.forEach((q) => {
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
        if (type === "antrenman") {
          topicStats[t].antrenman += 1;
          if (solvedIds.has(q.id)) {
            topicStats[t].antrenmanSolved += 1;
          }
        } else if (type === "arsiv") topicStats[t].arsiv += 1;
        else if (type === "deneme") topicStats[t].deneme += 1;
      }
    }
  });

  return orderedTopics.map((topic) => {
    const s = topicStats[topic];
    const isCompleted = s.antrenman > 0 && s.antrenmanSolved >= s.antrenman;

    return {
      name: topic,
      isCompleted,
      counts: {
        antrenman: s.antrenman,
        arsiv: s.arsiv,
        deneme: s.deneme,
        total: s.total,
      },
    };
  });
}

export async function getTopicQuestions(courseId: string, topic: string) {
  const { data, error } = await supabase
    .from("questions")
    .select("*, course:courses(course_slug)")
    .eq("course_id", courseId)
    .eq("section_title", topic)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching topic questions:", error);
    return [];
  }

  // Map to QuizQuestion type
  return (data || []).map((q: unknown) => {
    const qData =
      (q as { question_data: Record<string, unknown> }).question_data; // Cast from Json
    const courseSlug = (q as { course?: { course_slug?: string } }).course
      ?.course_slug;

    return {
      q: qData.q,
      o: qData.o,
      a: qData.a,
      exp: qData.exp,
      img: qData.img,
      imgPath: (qData.img && courseSlug)
        ? `/notes/${courseSlug}/media/`
        : undefined,
    };
  });
}

export async function getFirstChunkIdForTopic(courseId: string, topic: string) {
  const { data, error } = await supabase
    .from("note_chunks")
    .select("id")
    .eq("course_id", courseId)
    .eq("section_title", topic)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching chunk for topic:", error);
    return null;
  }
  return data?.id || null;
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
    .from("user_quiz_progress")
    .select("response_type")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching quiz stats:", error);
    return {
      totalAnswered: 0,
      correct: 0,
      incorrect: 0,
      blank: 0,
      remaining: 0,
      successRate: 0,
    };
  }

  const totalAnswered = data?.length || 0;
  const correct = data?.filter((r) => r.response_type === "correct").length ||
    0;
  const incorrect =
    data?.filter((r) => r.response_type === "incorrect").length || 0;
  // 'struggled' removed from types
  const blank = data?.filter((r) => r.response_type === "blank").length || 0;

  return {
    totalAnswered,
    correct,
    incorrect,
    blank,
    remaining: 0,
    successRate: totalAnswered > 0
      ? Math.round((correct / totalAnswered) * 100)
      : 0,
  };
}

export interface SubjectCompetency {
  subject: string;
  score: number; // 0-100
  totalQuestions: number;
}

export async function getSubjectCompetency(
  userId: string,
): Promise<SubjectCompetency[]> {
  const coursesRes = await supabase.from("courses").select("id, name");
  if (coursesRes.error) return [];

  const courseMap = new Map(coursesRes.data.map((c) => [c.id, c.name]));

  const { data, error } = await supabase
    .from("user_quiz_progress")
    .select("course_id, response_type")
    .eq("user_id", userId);

  if (error || !data) return [];

  const stats: Record<string, { correct: number; total: number }> = {};

  data.forEach((row) => {
    const cName = courseMap.get(row.course_id) || "Unknown";
    if (!stats[cName]) stats[cName] = { correct: 0, total: 0 };

    stats[cName].total += 1;
    if (row.response_type === "correct") {
      stats[cName].correct += 1;
    }
  });

  return Object.entries(stats).map(([subject, val]) => ({
    subject,
    score: Math.round((val.correct / val.total) * 100),
    totalQuestions: val.total,
  })).sort((a, b) => b.totalQuestions - a.totalQuestions).slice(0, 6);
}

export interface BloomStats {
  level: string;
  correct: number;
  total: number;
  score: number;
}

export async function getBloomStats(userId: string): Promise<BloomStats[]> {
  const { data, error } = await supabase
    .from("user_quiz_progress")
    .select("response_type, question:questions(bloom_level)")
    .eq("user_id", userId);

  if (error || !data) return [];

  const levels: Record<string, { correct: number; total: number }> = {
    "knowledge": { correct: 0, total: 0 },
    "application": { correct: 0, total: 0 },
    "analysis": { correct: 0, total: 0 },
  };

  data.forEach((row: unknown) => {
    const typedRow = row as {
      question: { bloom_level: string };
      response_type: string;
    };
    // row.question could be an array if relation is one-to-many, but it should be object.
    // Supabase returns object for single relation.
    // Also handle case where question might be null (deleted)
    // const level = q?.bloom_level; // Unused

    if (typedRow.question && levels[typedRow.question.bloom_level]) {
      levels[typedRow.question.bloom_level].total += 1;
      if (typedRow.response_type === "correct") {
        levels[typedRow.question.bloom_level].correct += 1;
      }
    }
  });

  return Object.entries(levels).map(([key, val]) => ({
    level: key,
    correct: val.correct,
    total: val.total,
    score: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
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
    .from("chunk_mastery")
    .select("mastery_score")
    .eq("user_id", userId);

  if (error || !data) return { new: 0, learning: 0, review: 0, mastered: 0 };

  const stats = { new: 0, learning: 0, review: 0, mastered: 0 };

  data.forEach((row) => {
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

export interface EfficiencyTrend {
  date: string;
  score: number;
  workMinutes: number;
  videoMinutes: number;
}

export async function getFocusTrend(userId: string): Promise<FocusTrend[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString();

  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select("started_at, total_work_time")
    .eq("user_id", userId)
    .gte("started_at", dateStr)
    .order("started_at", { ascending: true });

  if (error || !data) return [];

  const dailyMap: Record<string, number> = {};

  data.forEach((s) => {
    const day = s.started_at.split("T")[0];
    dailyMap[day] = (dailyMap[day] || 0) + (s.total_work_time || 0);
  });

  return Object.entries(dailyMap).map(([date, seconds]) => ({
    date,
    minutes: Math.round(seconds / 60),
  })).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getEfficiencyTrend(
  userId: string,
): Promise<EfficiencyTrend[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString();

  const { data: sessions, error: sessionError } = await supabase
    .from("pomodoro_sessions")
    .select("started_at, total_work_time")
    .eq("user_id", userId)
    .gte("started_at", dateStr);

  const { data: videoProgress, error: videoError } = await supabase
    .from("video_progress")
    .select("completed_at, video:videos(duration_minutes)")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("completed_at", dateStr);

  if (sessionError || videoError) return [];

  const dailyMap: Record<
    string,
    { workSeconds: number; videoMinutes: number }
  > = {};

  sessions?.forEach((s) => {
    if (!s.started_at) return;
    const d = new Date(s.started_at);
    const day = getVirtualDateKey(d);
    if (!dailyMap[day]) dailyMap[day] = { workSeconds: 0, videoMinutes: 0 };
    dailyMap[day].workSeconds += Number(s.total_work_time || 0);
  });

  videoProgress?.forEach((vp) => {
    if (!vp.completed_at) return;
    const d = new Date(vp.completed_at);
    const day = getVirtualDateKey(d);

    const video = (Array.isArray(vp.video) ? vp.video[0] : vp.video) as {
      duration_minutes?: number;
    } | null;
    if (!video) return;

    const duration = video.duration_minutes || 0;

    if (!dailyMap[day]) dailyMap[day] = { workSeconds: 0, videoMinutes: 0 };
    dailyMap[day].videoMinutes += Number(duration);
  });

  // Calculate high-fidelity Multiplier (x)
  return Object.entries(dailyMap)
    .map(([date, stats]) => {
      const workSeconds = stats.workSeconds;
      const videoMinutes = stats.videoMinutes;

      let multiplier = 0;
      if (workSeconds > 0) {
        // Multiplier = Video Minutes / (Work Seconds / 60)
        multiplier = videoMinutes / (workSeconds / 60);
      }

      return {
        date,
        // score contains the raw multiplier (e.g. 1.25, 3.0)
        score: Number(multiplier.toFixed(2)),
        workMinutes: Math.round(workSeconds / 60),
        videoMinutes: Math.round(videoMinutes),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
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
    .from("course_session_counters")
    .select("id, current_session")
    .eq("course_id", stats.courseId)
    .eq("user_id", stats.userId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching session counter:", fetchError);
    // We can continue, but stats might be off.
  }

  const nextSession = (existing?.current_session || 0) + 1;

  const { error: upsertError } = await supabase
    .from("course_session_counters")
    .upsert({
      id: existing?.id, // Includes ID if it exists to perform UPDATE instead of INSERT
      course_id: stats.courseId,
      user_id: stats.userId,
      current_session: nextSession,
      last_session_date: new Date().toISOString(),
    }, {
      onConflict: "user_id,course_id", // Explicitly handle conflict
    });

  if (upsertError) {
    console.error("Error incrementing session counter:", upsertError);
  }

  // 2. Update User XP or General Stats (Optional - mostly handled by triggers if any)
  // For now, we rely on `user_quiz_progress` logs which are already inserted during the quiz.

  // 3. Return aggregated data for the Dashboard (if needed, but usually passed from FE)
  return {
    success: true,
    sessionComplete: true,
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

export interface RecentSession {
  id: string;
  courseName: string;
  date: string; // ISO string
  durationMinutes: number;
  efficiencyScore: number;
  timeline: Json[];
  totalWorkTime: number;
  totalBreakTime: number;
  totalPauseTime: number;
  pauseCount: number;
}

export async function getRecentActivitySessions(
  userId: string,
  limit: number = 5,
): Promise<RecentSession[]> {
  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select(
      "id, course_name, started_at, total_work_time, total_break_time, total_pause_time, pause_count, efficiency_score, timeline",
    )
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent sessions:", error);
    return [];
  }

  return (data || []).map((s) => ({
    id: s.id,
    courseName: s.course_name || "Bilinmeyen Ders",
    date: s.started_at,
    durationMinutes: Math.round((s.total_work_time || 0) / 60),
    efficiencyScore: s.efficiency_score || 0,
    timeline: Array.isArray(s.timeline) ? (s.timeline as Json[]) : [],
    totalWorkTime: s.total_work_time || 0,
    totalBreakTime: s.total_break_time || 0,
    totalPauseTime: s.total_pause_time || 0,
    pauseCount: s.pause_count || 0,
  }));
}

export interface RecentQuizSession {
  uniqueKey: string;
  courseName: string;
  sessionNumber: number;
  date: string;
  correct: number;
  incorrect: number;
  blank: number;
  total: number;
  successRate: number;
}

export async function getRecentQuizSessions(
  userId: string,
  limit: number = 5,
): Promise<RecentQuizSession[]> {
  // Fetch last 500 answers to reconstruct sessions
  // We explicitly cast the response to handle the joined table type safety
  const { data: rawData, error } = await supabase
    .from("user_quiz_progress")
    .select(`
            course_id,
            session_number,
            response_type,
            answered_at,
            course:courses(name)
        `)
    .eq("user_id", userId)
    .order("answered_at", { ascending: false })
    .limit(500);

  if (error || !rawData) {
    console.error("Error fetching quiz sessions:", error);
    return [];
  }

  const sessionsMap = new Map<string, RecentQuizSession>();

  rawData.forEach(
    (
      row: {
        course_id: string;
        session_number: number;
        response_type: string;
        answered_at: string | null;
        course: { name: string } | null;
      },
    ) => {
      // If session_number is missing, we can't group easily. Fallback to 0 or skip?
      // Based on schema it is non-nullable 'number'.
      const sNum = row.session_number || 0;
      const key = `${row.course_id}-${sNum}`;

      if (!sessionsMap.has(key)) {
        sessionsMap.set(key, {
          uniqueKey: key,
          courseName: row.course?.name || "Kavram Testi",
          sessionNumber: sNum,
          date: row.answered_at || new Date().toISOString(),
          correct: 0,
          incorrect: 0,
          blank: 0,
          total: 0,
          successRate: 0,
        });
      }

      const session = sessionsMap.get(key)!;
      session.total++;
      if (row.response_type === "correct") session.correct++;
      else if (row.response_type === "incorrect") session.incorrect++;
      else session.blank++;

      // Keep the latest timestamp for the session
      if (
        row.answered_at && new Date(row.answered_at) > new Date(session.date)
      ) {
        session.date = row.answered_at;
      }
    },
  );

  const sessions = Array.from(sessionsMap.values())
    .map((s) => ({
      ...s,
      successRate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return sessions.slice(0, limit);
}

export interface CognitiveInsight {
  id: string;
  courseId: string;
  questionId: string;
  diagnosis: string | null;
  insight: string | null;
  consecutiveFails: number;
  responseType: string;
  date: string;
}

export async function getRecentCognitiveInsights(
  userId: string,
  limit: number = 30,
): Promise<CognitiveInsight[]> {
  // 1. Fetch recent progress with diagnosis or insight
  const { data: progressData, error } = await supabase
    .from("user_quiz_progress")
    .select(
      "id, course_id, question_id, ai_diagnosis, ai_insight, response_type, answered_at",
    )
    .eq("user_id", userId)
    .or("ai_diagnosis.neq.null,ai_insight.neq.null")
    .order("answered_at", { ascending: false })
    .limit(limit);

  if (error || !progressData) {
    console.error("Error fetching cognitive insights:", error);
    return [];
  }

  // 2. Fetch current consecutive_fails for these questions
  // We need to map question_id -> consecutive_fails
  const questionIds = Array.from(
    new Set(progressData.map((p) => p.question_id)),
  );

  const { data: statusData } = await supabase
    .from("user_question_status")
    .select("question_id, consecutive_fails")
    .eq("user_id", userId)
    .in("question_id", questionIds);

  const failsMap = new Map<string, number>();
  if (statusData) {
    statusData.forEach((s) => {
      failsMap.set(s.question_id, s.consecutive_fails || 0);
    });
  }

  // 3. Merge data
  return progressData.map((p) => ({
    id: p.id,
    courseId: p.course_id,
    questionId: p.question_id,
    diagnosis: p.ai_diagnosis,
    insight: p.ai_insight,
    consecutiveFails: failsMap.get(p.question_id) || 0,
    responseType: p.response_type,
    date: p.answered_at || new Date().toISOString(),
  }));
}

export async function getDailyEfficiencySummary(
  userId: string,
): Promise<DailyEfficiencySummary> {
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
    .select(
      "id, course_name, started_at, total_work_time, total_break_time, total_pause_time, pause_count, efficiency_score, timeline",
    )
    .eq("user_id", userId)
    .gte("started_at", today.toISOString())
    .lt("started_at", tomorrow.toISOString())
    .or("total_work_time.gte.60,total_break_time.gte.60")
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

    // Not calculating average efficiency here for now
    // if (eff > 0) { ... }

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

  // Calculate daily total Focus Power (Odak Gücü)
  const dailyFocusPower = calculateFocusPower(
    totalWork,
    totalBreak,
    totalPause,
  );

  return {
    efficiencyScore: dailyFocusPower,
    totalCycles,
    netWorkTimeSeconds: totalWork,
    totalBreakTimeSeconds: totalBreak,
    totalPauseTimeSeconds: totalPause,
    pauseCount: totalPauseCount,
    sessions: detailedSessions,
  };
}

export interface CourseMastery {
  courseId: string;
  courseName: string;
  videoProgress: number; // 0-100
  questionProgress: number; // 0-100
  masteryScore: number; // (video * 0.6) + (question * 0.4)
}

export async function getCourseMastery(
  userId: string,
): Promise<CourseMastery[]> {
  // 1. Get all courses to map names and see total videos
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id, name, total_videos");

  if (coursesError || !courses) return [];

  // 2. Get video progress counts per course
  const { data: vProgress } = await supabase
    .from("video_progress")
    .select("video:videos(course_id)")
    .eq("user_id", userId)
    .eq("completed", true);

  const vCompletedMap: Record<string, number> = {};
  if (vProgress) {
    vProgress.forEach((p: { video: { course_id: string | null } | null }) => {
      const courseId = p.video?.course_id;
      if (courseId) {
        vCompletedMap[courseId] = (vCompletedMap[courseId] || 0) + 1;
      }
    });
  }

  // 3. Get total questions count per course
  // We'll fetch just course_id from questions table to count
  const { data: qCounts } = await supabase
    .from("questions")
    .select("course_id");

  const qTotalMap: Record<string, number> = {};
  if (qCounts) {
    qCounts.forEach((q) => {
      qTotalMap[q.course_id] = (qTotalMap[q.course_id] || 0) + 1;
    });
  }

  // 4. Get solved questions count per course
  const { data: solvedQs } = await supabase
    .from("user_quiz_progress")
    .select("course_id")
    .eq("user_id", userId);

  const qSolvedMap: Record<string, number> = {};
  if (solvedQs) {
    solvedQs.forEach((s) => {
      qSolvedMap[s.course_id] = (qSolvedMap[s.course_id] || 0) + 1;
    });
  }

  // 5. Calculate Mastery
  return courses.map((c) => {
    const totalVideos = c.total_videos || 0;
    const completedVideos = vCompletedMap[c.id] || 0;
    const totalQuestions = qTotalMap[c.id] || 200; // Fallback to 200 if no questions found? Or 0.
    const solvedQuestions = qSolvedMap[c.id] || 0;

    const videoRatio = totalVideos > 0 ? (completedVideos / totalVideos) : 0;
    const questRatio = totalQuestions > 0
      ? (solvedQuestions / totalQuestions)
      : 0;

    // Use 60% video, 40% question weight
    const mastery = Math.round(
      (videoRatio * 60) + (Math.min(1, questRatio) * 40),
    );

    return {
      courseId: c.id,
      courseName: c.name,
      videoProgress: Math.round(videoRatio * 100),
      questionProgress: Math.round(Math.min(1, questRatio) * 100),
      masteryScore: mastery,
    };
  }).sort((a, b) => b.masteryScore - a.masteryScore);
}
