import {
  formatDateKey,
  getVirtualDate,
  getVirtualDateKey,
} from '@/shared/lib/utils/date-utils';

/**
 * Calculate current streak with weekend allowance logic.
 *
 * Critical Rules:
 * - Weekend (Saturday/Sunday) gaps do NOT break streak
 * - Virtual day logic (04:00 start) is applied via getVirtualDate()
 * - Streak counts consecutive days ending TODAY or YESTERDAY
 *
 * @param activeDays Set of active day strings in YYYY-MM-DD format
 * @param firstActivityKey First activity date key (YYYY-MM-DD)
 * @returns Current streak count
 */
export function calculateStreak(
  activeDays: Set<string>,
  firstActivityKey: string | null
): number {
  let streak = 0;
  const checkDate = getVirtualDate();
  let consecutiveDays = 0;
  let gapCount = 0; // Track weekday gaps

  // Check consecutive days starting from the virtual "Today"
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
  return streak;
}

/**
 * Calculate streak milestones with weekend allowance.
 *
 * @param activeDays Array of active day strings in YYYY-MM-DD format (sorted)
 * @returns Object with maxStreak and first7StreakDate
 */
export function calculateStreakMilestones(activeDays: string[]): {
  maxStreak: number;
  first7StreakDate: string | null;
} {
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
    const currentDate = new Date(dayKey + 'T12:00:00Z'); // UTC ortası için

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
          lastActiveDate.getTime() + 24 * 60 * 60 * 1000
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
