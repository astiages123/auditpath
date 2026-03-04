import { formatDateKey, getVirtualDate } from '@/utils/dateUtils';

// ===========================
// === STREAK CALCULATION ===
// ===========================

/**
 * Calculates the current streak of consecutive active days.
 *
 * Rules:
 * - A gap on a weekend (Saturday or Sunday) does NOT break the streak, provided it's only one weekend day.
 * - If both Saturday and Sunday are missed, the streak breaks.
 * - Standard day logic (00:00 start) is applied via getVirtualDate().
 * - Streak counts consecutive days ending TODAY or YESTERDAY.
 *
 * @param activeDays - A Set of date strings (YYYY-MM-DD) representing days the user was active
 * @param firstActivityKey - The date string (YYYY-MM-DD) of the user's first ever activity
 * @returns The current consecutive streak count
 */
export function calculateStreak(
  activeDays: Set<string>,
  firstActivityKey: string | null
): number {
  let streak = 0;
  const checkDate = getVirtualDate();
  let consecutiveDays = 0;
  let gapCount = 0; // Track weekday gaps or first-day non-activity

  // Check consecutive days starting from the virtual "Today"
  while (true) {
    const dateStr = formatDateKey(checkDate);

    if (activeDays.has(dateStr)) {
      consecutiveDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      const dayOfWeek = checkDate.getDay();

      // Weekend allowance logic
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Check if the other weekend day is also empty
        const otherWeekendDay = new Date(checkDate);
        if (dayOfWeek === 0) {
          otherWeekendDay.setDate(checkDate.getDate() - 1); // Check Saturday
        } else {
          otherWeekendDay.setDate(checkDate.getDate() + 1); // Check Sunday
        }

        const otherWeekendDayStr = formatDateKey(otherWeekendDay);
        if (activeDays.has(otherWeekendDayStr)) {
          // One of the weekend days is active, streak continues
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        } else {
          // Both weekend days are empty!
          // If we are checking the very first day (Today) and it's empty, we allow checking yesterday
          if (consecutiveDays === 0 && gapCount === 0) {
            gapCount++;
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          } else {
            break; // Streak breaks
          }
        }
      }

      // Weekday gap handling
      if (consecutiveDays === 0 && gapCount === 0) {
        // Allow the first checked day (Today) to be empty without breaking an existing streak from Yesterday
        gapCount++;
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      } else {
        // Streak ends on a weekday gap
        break;
      }
    }

    // Safeguard: do not check before the user's first activity ever
    if (firstActivityKey && formatDateKey(checkDate) < firstActivityKey) {
      break;
    }

    // Safeguard infinite loop break condition
    if (consecutiveDays > 5000) {
      break;
    }
  }

  streak = consecutiveDays;
  return streak;
}

// ===========================
// === MILESTONES CALCULATION ===
// ===========================

/**
 * Calculates historical streak milestones, including maximum streak and the first date a 7-day streak was achieved.
 *
 * Rules:
 * - Includes weekend allowance similar to calculateStreak.
 * - Missing a single weekend day does not reset the streak.
 *
 * @param activeDays - An array of active day strings in YYYY-MM-DD format, sorted chronologically
 * @returns An object containing the user's maximum streak and the date of their first 7-day streak
 */
export function calculateStreakMilestones(activeDays: string[]): {
  maxStreak: number;
  first7DayStreakDate: string | null;
} {
  if (activeDays.length === 0) {
    return { maxStreak: 0, first7DayStreakDate: null };
  }

  let maxStreak = 0;
  let currentStreak = 0;
  let first7DayStreakDate: string | null = null;
  let lastActiveDate: Date | null = null;

  for (const dayKey of activeDays) {
    // Add time strictly avoiding timezone shifts affecting the date
    const currentDate = new Date(dayKey + 'T12:00:00Z');

    if (lastActiveDate === null) {
      currentStreak = 1;
    } else {
      const diffMs = currentDate.getTime() - lastActiveDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive date
        currentStreak++;
      } else {
        // Gap of 1 or more days exists
        let hasBothWeekendGaps = false;
        let skippedSaturday = false;
        let skippedSunday = false;

        // Inspect skipped days
        for (let j = 1; j < diffDays; j++) {
          const skippedDate = new Date(
            lastActiveDate.getTime() + j * 24 * 60 * 60 * 1000
          );
          const skippedDay = skippedDate.getDay(); // 0 = Sunday, 6 = Saturday

          if (skippedDay === 6) skippedSaturday = true;
          if (skippedDay === 0) skippedSunday = true;

          if (skippedDay !== 0 && skippedDay !== 6) {
            hasBothWeekendGaps = true; // Gap fell on a weekday, breaks streak
            break;
          }
        }

        if (skippedSaturday && skippedSunday) {
          hasBothWeekendGaps = true; // Both weekend days skipped, breaks streak
        }

        if (!hasBothWeekendGaps) {
          // The gap was exactly one weekend day, streak continues
          currentStreak++;
        } else {
          // Unallowed gap, reset current streak
          currentStreak = 1;
        }
      }
    }

    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }

    // Capture the first timestamp where streak >= 7
    if (first7DayStreakDate === null && currentStreak >= 7) {
      first7DayStreakDate = dayKey;
    }

    lastActiveDate = currentDate;
  }

  return { maxStreak, first7DayStreakDate };
}
