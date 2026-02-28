import { Target, Maximize2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EfficiencyModal } from './EfficiencyModal';
import { MasteryProgressNavigator as MasteryNavigatorContent } from './MasteryProgressNavigator';
import { CardHeader } from './CardElements';
import { useMasteryChains } from '../hooks/useMasteryChains';

interface MasteryItem {
  lessonId: string;
  title: string;
  mastery: number;
  videoProgress: number;
  questionProgress: number;
}

export const MasteryNavigatorCard = () => {
  const { lessonMastery } = useMasteryChains();
  const loading = !lessonMastery || lessonMastery.length === 0;

  if (loading)
    return (
      <Card className="h-full flex flex-col p-6">
        <Skeleton className="h-6 w-48 mb-6 bg-surface" />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl bg-surface" />
          ))}
        </div>
      </Card>
    );

  // Sort by mastery score (DESC) and then by title (ASC), exclude 100%
  const displayNodes: MasteryItem[] = [...(lessonMastery || [])]
    .filter((item) => item.mastery < 100)
    .sort((a, b) => {
      if (b.mastery !== a.mastery) return b.mastery - a.mastery;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 4);

  return (
    <EfficiencyModal
      title="Akıllı Müfredat Ustalığı"
      trigger={
        <div className="h-full w-full cursor-pointer">
          <Card className="h-full flex flex-col p-6 overflow-hidden relative group">
            <CardHeader
              icon={Target}
              iconColor="text-accent"
              iconBg="bg-accent/10"
              title="Müfredat Ustalığı"
              subtitle="Ders bazlı ustalık seviyeleri"
              action={
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              }
            />

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {displayNodes.map((node) => (
                <div
                  key={node.lessonId}
                  className="p-6 bg-card/90 border border-accent/20 rounded-2xl hover:bg-card/50 transition-all flex flex-col justify-between gap-6 group/item"
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-bold text-white/70 line-clamp-2 leading-relaxed">
                        {node.title}
                      </span>
                      <span className="text-lg font-black text-accent ml-2">
                        %{node.mastery}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Mastery Main Bar */}
                    <div className="h-2 w-full bg-foreground/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-1000 ease-out"
                        style={{ width: `${node.mastery}%` }}
                      />
                    </div>

                    {/* 60/40 Weights Indicators */}
                    <div className="space-y-2 pt-1">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[11px] uppercase tracking-wider font-bold">
                          <span className="text-white/80">Video (%60)</span>
                          <span className="text-emerald-400">
                            %{node.videoProgress}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500/60"
                            style={{ width: `${node.videoProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[11px] uppercase tracking-wider font-bold">
                          <span className="text-white/80">Quiz (%40)</span>
                          <span className="text-primary">
                            %{node.questionProgress}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60"
                            style={{ width: `${node.questionProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      }
    >
      <MasteryNavigatorContent sessions={lessonMastery} />
    </EfficiencyModal>
  );
};
