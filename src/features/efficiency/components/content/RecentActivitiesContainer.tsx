import { RecentActivitiesCard } from '@/features/efficiency/components/cards/RecentActivitiesCard';

import type { FocusPowerPoint } from '@/features/efficiency/types/efficiencyTypes';
import type { RecentSession } from '@/features/pomodoro/types/pomodoroTypes';

// ==========================================
// === PROPS ===
// ==========================================

export interface RecentActivitiesContainerProps {
  recentSessions: RecentSession[];
  focusPowerWeek: FocusPowerPoint[];
  focusPowerMonth: FocusPowerPoint[];
  focusPowerAll: FocusPowerPoint[];
}

// ==========================================
// === COMPONENT ===
// ==========================================

export const RecentActivitiesContainer = ({
  recentSessions,
  focusPowerWeek,
  focusPowerMonth,
  focusPowerAll,
}: RecentActivitiesContainerProps) => {
  // ==========================================
  // === RENDER ===
  // ==========================================
  return (
    <div className="h-full w-full">
      <RecentActivitiesCard
        sessions={recentSessions}
        focusPowerWeek={focusPowerWeek}
        focusPowerMonth={focusPowerMonth}
        focusPowerAll={focusPowerAll}
      />
    </div>
  );
};
