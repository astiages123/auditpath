import React from 'react';
import { Clock, Maximize2 } from 'lucide-react';
import { CommonEmptyState } from '@/features/statistics/components/shared/CardElements';
import { useVirtualizer } from '@tanstack/react-virtual';
import { StatisticsCard } from '@/features/statistics/components/cards/StatisticsCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatisticsModal } from '@/features/statistics/components/modals/StatisticsModal';
import { StatisticsChartTab } from '@/features/statistics/components/content/StatisticsChartTab';
import { SessionListItem } from '@/features/statistics/components/content/SessionListItem';

import type { RecentSession } from '@/features/pomodoro/types/pomodoroTypes';
import type { FocusPowerPoint } from '@/features/statistics/types/statisticsTypes';

export interface RecentActivitiesCardProps {
  sessions: RecentSession[];
  focusPowerWeek: FocusPowerPoint[];
  focusPowerMonth: FocusPowerPoint[];
  focusPowerAll: FocusPowerPoint[];
}

export const RecentActivitiesCard = (props: RecentActivitiesCardProps) => {
  const { sessions } = props;
  const [scrollElement, setScrollElement] =
    React.useState<HTMLDivElement | null>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => 76,
    overscan: 5,
  });

  const displaySessions = sessions.slice(0, 5);

  return (
    <StatisticsModal
      title="Tüm Çalışma Geçmişi ve Analizler"
      trigger={
        <StatisticsCard
          title="Son Çalışmalar"
          subtitle="Tamamlanan son oturumlar"
          tooltip="Yaptığın tüm çalışma oturumlarını burada görebilirsin. Detaylı analiz ve grafikler için karta tıklayabilirsin."
          icon={Clock}
          action={
            <Maximize2 className="w-5 h-5 text-muted-foreground/30 group-hover:text-white transition-colors" />
          }
        >
          <div className="py-4 space-y-2.5">
            {sessions.length > 0 ? (
              displaySessions.map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  disableModal={true}
                />
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-sm font-semibold text-foreground">
                  Henüz Çalışma Yok
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Son zamanlarda tamamlanan bir çalışma bulunamadı.
                </p>
              </div>
            )}
          </div>
        </StatisticsCard>
      }
    >
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="list">Liste Görünümü</TabsTrigger>
          <TabsTrigger value="chart">Odak Gücü Grafiği</TabsTrigger>
        </TabsList>

        <TabsContent
          value="list"
          className="mt-4 p-4 border border-border/50 rounded-xl bg-white/5 max-h-[70vh] overflow-y-auto custom-scrollbar"
          ref={setScrollElement}
        >
          {sessions.length > 0 ? (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="py-1"
                >
                  <SessionListItem session={sessions[virtualItem.index]} />
                </div>
              ))}
            </div>
          ) : (
            <CommonEmptyState message="Henüz bir çalışma oturumu kaydedilmedi." />
          )}
        </TabsContent>

        <TabsContent value="chart" className="min-h-[400px]">
          <StatisticsChartTab
            weekData={props.focusPowerWeek}
            monthData={props.focusPowerMonth}
            allData={props.focusPowerAll}
          />
        </TabsContent>
      </Tabs>
    </StatisticsModal>
  );
};
