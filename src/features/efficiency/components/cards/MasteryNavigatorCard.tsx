import React from 'react';
import { LayoutGrid, Maximize2 } from 'lucide-react';
import { GlassCard } from '@/shared/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyModal, MasteryNavigatorContent } from '../EfficiencyModals';
import { EfficiencyData } from './types';
import { CardHeader } from './CardElements';

interface MasteryNavigatorCardProps {
  data: EfficiencyData;
}

export const MasteryNavigatorCard = ({ data }: MasteryNavigatorCardProps) => {
  const { loading, lessonMastery } = data;

  if (loading)
    return (
      <GlassCard className="h-full flex flex-col p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl bg-white/5" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 bg-white/5" />
              <Skeleton className="h-3 w-48 bg-white/5" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3 mt-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-white/3 border border-white/5"
            >
              <div className="flex justify-between mb-2">
                <Skeleton className="h-4 w-24 bg-white/5" />
                <Skeleton className="h-4 w-8 bg-white/5" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full bg-white/5" />
            </div>
          ))}
        </div>
      </GlassCard>
    );

  return (
    <EfficiencyModal
      title="Ders Ustalığı ve İlerleme"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <GlassCard className="h-full flex flex-col p-6 overflow-hidden">
            <CardHeader
              icon={LayoutGrid}
              iconColor="text-violet-400"
              iconBg="bg-violet-500/10"
              title="Ustalık İlerlemesi"
              subtitle="En başarılı dersleriniz"
              badge={
                <div className="text-xs font-mono text-muted-foreground bg-white/5 px-2.5 py-1 rounded-lg">
                  {lessonMastery.length} ders
                </div>
              }
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />

            <div className="flex-1 space-y-3 mt-6 overflow-y-auto pr-1 custom-scrollbar">
              {lessonMastery.length > 0 ? (
                lessonMastery.slice(0, 5).map((lesson) => (
                  <div
                    key={lesson.lessonId}
                    className="p-3.5 rounded-xl bg-white/3 border border-white/5 hover:bg-white/6 hover:border-white/10 transition-all"
                  >
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-sm font-medium truncate pr-2 text-white/90">
                        {lesson.title}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        %{lesson.mastery}
                      </span>
                    </div>

                    <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-linear-to-r from-primary/80 to-primary rounded-full transition-all duration-700"
                        style={{ width: `${lesson.mastery}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Henüz ders verisi bulunmuyor.
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      }
    >
      <MasteryNavigatorContent sessions={lessonMastery} />
    </EfficiencyModal>
  );
};
