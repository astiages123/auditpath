import React from 'react';
import { BookOpen, Clock, Maximize2 } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RecentSession } from '@/features/pomodoro/types/pomodoroTypes';
import { FocusPowerPoint } from '../types/efficiencyTypes';
import { EfficiencyModal } from './EfficiencyModal';
import { EfficiencyChartTab } from './EfficiencyChartTab';
import { SessionListItem } from './SessionListItem';

interface RecentActivitiesCardProps {
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

  if (sessions.length === 0) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-white/5 rounded-xl">
          <BookOpen className="w-6 h-6 text-muted-foreground/50" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-medium text-white/80">
            Henüz Çalışma Yok
          </h3>
          <p className="text-sm text-muted-foreground/60">
            Son zamanlarda tamamlanan bir çalışma bulunamadı.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <EfficiencyModal
      title="Tüm Çalışma Geçmişi ve Analizler"
      trigger={
        <div className="h-full w-full">
          <Card className="flex flex-col overflow-hidden relative group h-full cursor-pointer">
            <div className="p-5 px-6 border-b border-white/5 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-sky-500/10">
                  <Clock className="w-5 h-5 text-sky-400" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-semibold text-white tracking-wide">
                    Son Çalışmalar
                  </span>
                  <span className="text-xs text-muted-foreground/80">
                    Tamamlanan son oturumlar
                  </span>
                </div>
              </div>
              <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
            </div>

            <div className="py-4 px-6 space-y-2.5">
              {displaySessions.map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  disableModal={true}
                />
              ))}
            </div>
          </Card>
        </div>
      }
    >
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="list">Liste Görünümü</TabsTrigger>
          <TabsTrigger value="chart">Odak Gücü Grafiği</TabsTrigger>
        </TabsList>

        <TabsContent
          value="list"
          className="max-h-[70vh] overflow-y-auto custom-scrollbar p-1"
          ref={setScrollElement}
        >
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
        </TabsContent>

        <TabsContent value="chart" className="min-h-[400px]">
          <EfficiencyChartTab
            weekData={props.focusPowerWeek}
            monthData={props.focusPowerMonth}
            allData={props.focusPowerAll}
          />
        </TabsContent>
      </Tabs>
    </EfficiencyModal>
  );
};
