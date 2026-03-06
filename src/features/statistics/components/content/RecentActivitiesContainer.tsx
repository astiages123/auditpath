import { RecentActivitiesCard } from '@/features/statistics/components/cards/RecentActivitiesCard';

import type { FocusPowerPoint } from '@/features/statistics/types/statisticsTypes';
import type { RecentSession } from '@/features/pomodoro/types/pomodoroTypes';

export interface RecentActivitiesContainerProps {
  recentSessions: RecentSession[];
  focusPowerWeek: FocusPowerPoint[];
  focusPowerMonth: FocusPowerPoint[];
  focusPowerAll: FocusPowerPoint[];
}

export const RecentActivitiesContainer = ({
  recentSessions,
  focusPowerWeek,
  focusPowerMonth,
  focusPowerAll,
}: RecentActivitiesContainerProps) => {
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
