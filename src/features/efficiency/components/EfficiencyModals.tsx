import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/components/ui/tabs';
import { ReactNode } from 'react';

import { LearningLoadChart, EfficiencyTrendChart } from './EfficiencyCharts';
import { LearningLoad, Session } from '../types';
import { EfficiencyTrend } from '@/shared/types';
import {
  AlertCircle,
  Clock,
  ZapOff,
  TrendingDown,
  Info,
  Timer,
} from 'lucide-react';
import { cn } from '@/shared/utils';
import { calculateFocusPower } from '@/shared/utils/efficiency-math';

interface ModalProps {
  title: string;
  trigger: ReactNode;
  children: ReactNode;
}

export const EfficiencyModal = ({ title, trigger, children }: ModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {title} detayları ve istatistikleri.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
};

// -- Specific Content Components for Tabs --

const DistractionAnalysis = ({ sessions }: { sessions: Session[] }) => {
  // Aggregates for distraction
  const totalPauses = sessions.reduce((acc, s) => {
    const pauseEvents = s.timeline?.filter((t) => t.type === 'pause') || [];
    return acc + pauseEvents.length;
  }, 0);

  const totalPauseMinutes = sessions.reduce((acc, s) => {
    const pauseEvents = s.timeline?.filter((t) => t.type === 'pause') || [];
    const pauseMins = pauseEvents.reduce(
      (pAcc, p) => pAcc + (p.duration || 0),
      0
    );
    return acc + pauseMins;
  }, 0);

  const totalBreakMinutes = sessions.reduce((acc, s) => {
    const breakEvents = s.timeline?.filter((t) => t.type === 'break') || [];
    const breakMins = breakEvents.reduce(
      (pAcc, p) => pAcc + (p.duration || 0),
      0
    );
    return acc + breakMins;
  }, 0);

  const totalWorkMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);

  const focusPower = calculateFocusPower(
    totalWorkMinutes * 60,
    totalBreakMinutes * 60,
    totalPauseMinutes * 60
  );

  const getStabilityColor = (score: number) => {
    if (score >= 100) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  const allPauses = sessions
    .flatMap((s) =>
      (s.timeline?.filter((t) => t.type === 'pause') || []).map((p) => ({
        ...p,
        lessonName: s.lessonName,
        timeLabel: new Date(p.start).toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }))
    )
    .sort((a, b) => b.start - a.start);

  return (
    <div className="space-y-6">
      {/* Stability Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center text-center">
          <div className="p-3 bg-violet-500/10 rounded-xl mb-3">
            <Timer className="w-5 h-5 text-violet-400" />
          </div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">
            Odak Gücü
          </span>
          <span
            className={cn(
              'text-2xl font-black font-heading',
              getStabilityColor(focusPower)
            )}
          >
            {focusPower}{' '}
            <span className="text-xs font-medium opacity-50">puan</span>
          </span>
          <span className="text-[11px] text-muted-foreground mt-1">
            Oturum boyunca ne kadar bölünmeden ve mola disipliniyle
            çalıştığınızı ölçer.
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center">
          <div className="p-3 bg-amber-500/10 rounded-xl mb-3">
            <ZapOff className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">
            Toplam Duraklatma
          </span>
          <span className="text-2xl font-black font-heading text-white">
            {totalPauses}{' '}
            <span className="text-sm font-medium text-muted-foreground">
              kez
            </span>
          </span>
          <span className="text-[11px] text-muted-foreground mt-1">
            Bugünkü oturumlar genelinde
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col items-center">
          <div className="p-3 bg-rose-500/10 rounded-xl mb-3">
            <Clock className="w-5 h-5 text-rose-400" />
          </div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">
            Kayıp Zaman
          </span>
          <span className="text-2xl font-black font-heading text-white">
            {totalPauseMinutes}{' '}
            <span className="text-sm font-medium text-muted-foreground">
              dk
            </span>
          </span>
          <span className="text-[11px] text-muted-foreground mt-1">
            Duraklatma süresi
          </span>
        </div>
      </div>

      {/* List of Distractions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <AlertCircle className="w-4 h-4 text-primary/60" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Duraklatma Günlüğü
          </h4>
        </div>

        {allPauses.length > 0 ? (
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {allPauses.map((pause, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 bg-white/3 border border-white/5 rounded-xl hover:bg-white/6 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white/90">
                      {pause.lessonName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {pause.timeLabel} civarında
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-rose-400">
                    {pause.duration} dk
                  </span>
                  <TrendingDown className="w-3.5 h-3.5 text-muted-foreground/30" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl bg-white/2 border border-dashed border-white/10">
            <Info className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Bugün henüz bir duraklatma kaydedilmedi.
            </p>
            <p className="text-[11px] text-muted-foreground/40 mt-1">
              Kesintisiz odaklanmaya devam ediyorsunuz!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const FocusHubContent = ({
  sessions,
  trendData,
}: {
  sessions: Session[];
  trendData: EfficiencyTrend[];
}) => (
  <Tabs defaultValue="analysis" className="w-full">
    <TabsList className="w-full grid grid-cols-2">
      <TabsTrigger value="analysis">Odaklanma Trendi</TabsTrigger>
      <TabsTrigger value="history">Öğrenme Akışı Geçmişi</TabsTrigger>
    </TabsList>
    <TabsContent
      value="analysis"
      className="p-4 border border-border/50 rounded-xl mt-4 bg-white/5"
    >
      <DistractionAnalysis sessions={sessions} />
    </TabsContent>
    <TabsContent
      value="history"
      className="p-4 border border-border/50 rounded-xl mt-4 bg-white/5"
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Günlük Öğrenme Akışı Trendi
          </h4>
          <span className="text-[10px] text-muted-foreground">SON 30 GÜN</span>
        </div>
        <EfficiencyTrendChart data={trendData} />
        <p className="text-xs text-muted-foreground text-center">
          Öğrenme akışı; video içeriği ile harcadığınız çalışma süresi
          arasındaki uyumu ve öğrenme ritmini ölçer.
        </p>
      </div>
    </TabsContent>
  </Tabs>
);

interface LearningLoadContentProps {
  dayData: LearningLoad[];
  weekData: LearningLoad[];
  monthData: LearningLoad[];
  allData: LearningLoad[];
  targetMinutes?: number;
}

export const LearningLoadContent = ({
  dayData,
  weekData,
  monthData,
  allData,
  targetMinutes = 200,
}: LearningLoadContentProps) => (
  <Tabs defaultValue="week" className="w-full">
    <TabsList className="w-full grid grid-cols-4">
      <TabsTrigger value="day">Gün</TabsTrigger>
      <TabsTrigger value="week">Hafta</TabsTrigger>
      <TabsTrigger value="month">Ay</TabsTrigger>
      <TabsTrigger value="all">Tümü</TabsTrigger>
    </TabsList>
    <TabsContent value="day" className="mt-4">
      <LearningLoadChart data={dayData} targetMinutes={targetMinutes} />
      <p className="text-sm text-muted-foreground text-center mt-4">
        Bugünkü Çalışma Süresi
      </p>
    </TabsContent>
    <TabsContent value="week" className="mt-4">
      <LearningLoadChart data={weekData} targetMinutes={targetMinutes} />
      <p className="text-sm text-muted-foreground text-center mt-4">
        Haftalık Çalışma Trendi
      </p>
    </TabsContent>
    <TabsContent value="month" className="mt-4">
      <LearningLoadChart data={monthData} />
      <p className="text-sm text-muted-foreground text-center mt-4">
        Son 30 Günlük Odaklanma Trendi
      </p>
    </TabsContent>
    <TabsContent value="all" className="mt-4">
      <LearningLoadChart data={allData} />
      <p className="text-sm text-muted-foreground text-center mt-4">
        Aylık Toplam Çalışma Dağılımı
      </p>
    </TabsContent>
  </Tabs>
);

export const PracticeCenterContent = ({
  children,
}: {
  children: ReactNode;
}) => (
  <Tabs defaultValue="bloom" className="w-full">
    <TabsList className="w-full grid grid-cols-2">
      <TabsTrigger value="bloom">Bloom Radarı</TabsTrigger>
      <TabsTrigger value="speed">Hız Analizi</TabsTrigger>
    </TabsList>
    <TabsContent value="bloom" className="flex justify-center mt-4">
      <div className="w-full max-w-md">{children}</div>
    </TabsContent>
    <TabsContent value="speed" className="p-4">
      <div className="h-64 flex items-center justify-center border border-dashed rounded text-muted-foreground">
        Hız analizi grafiği burada yer alacak.
      </div>
    </TabsContent>
  </Tabs>
);

interface MasteryItem {
  lessonId: string;
  title: string;
  mastery: number;
  videoProgress: number;
  questionProgress: number;
}

export const MasteryNavigatorContent = ({
  sessions,
}: {
  sessions: MasteryItem[];
}) => (
  <div className="space-y-6">
    <p className="text-sm text-muted-foreground">
      Ustalık skoru: Tamamlanan videolar (%60) ve çözülen soruların (%40)
      ağırlıklı ortalamasıdır.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sessions.map((lesson) => (
        <div
          key={lesson.lessonId}
          className="p-4 border border-border rounded-xl bg-card/40 space-y-4"
        >
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-lg">{lesson.title}</h4>
            <div className="text-2xl font-black text-primary">
              %{lesson.mastery}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Video İlerlemesi (%60 Etki)</span>
                <span>%{lesson.videoProgress}</span>
              </div>
              <div className="h-1.5 w-full bg-muted-foreground/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${lesson.videoProgress}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Soru Çözümü (%40 Etki)</span>
                <span>%{lesson.questionProgress}</span>
              </div>
              <div className="h-1.5 w-full bg-muted-foreground/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${lesson.questionProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
