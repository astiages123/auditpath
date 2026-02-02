import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { ReactNode } from 'react';

import { LearningLoadChart, EfficiencyTrendChart } from './EfficiencyCharts';
import { LearningLoad } from './types';
import { EfficiencyTrend } from '@/shared/lib/core/client-db';

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

export const FocusHubContent = ({ children, trendData }: { children: ReactNode; trendData: EfficiencyTrend[] }) => (
    <Tabs defaultValue="gantt" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="gantt">Kronolojik Akış</TabsTrigger>
            <TabsTrigger value="analysis">Odaklanma Trendi</TabsTrigger>
            <TabsTrigger value="history">Verimlilik Geçmişi</TabsTrigger>
        </TabsList>
        <TabsContent value="gantt" className="p-4 border border-border/50 rounded-xl mt-4 min-h-[300px] bg-white/5">
            {children}
        </TabsContent>
        <TabsContent value="analysis" className="p-4 border border-border/50 rounded-xl mt-4 bg-white/5">
            <div className="text-center text-muted-foreground py-8">
                Detaylı duraklatma aralıkları ve dikkat dağınıklığı analizi burada olacak.
            </div>
        </TabsContent>
        <TabsContent value="history" className="p-4 border border-border/50 rounded-xl mt-4 bg-white/5">
            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Günlük Verimlilik Skoru Trendi</h4>
                    <span className="text-[10px] text-muted-foreground">SON 30 GÜN</span>
                </div>
                <EfficiencyTrendChart data={trendData} />
                <p className="text-xs text-muted-foreground text-center">
                    Verimlilik skoru; çalışma, mola ve duraklatma sürelerinin ideal oranlara olan yakınlığına göre hesaplanır.
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
}

export const LearningLoadContent = ({ dayData, weekData, monthData, allData }: LearningLoadContentProps) => (
    <Tabs defaultValue="week" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="day">Gün</TabsTrigger>
            <TabsTrigger value="week">Hafta</TabsTrigger>
            <TabsTrigger value="month">Ay</TabsTrigger>
            <TabsTrigger value="all">Tümü</TabsTrigger>
        </TabsList>
        <TabsContent value="day" className="mt-4">
            <LearningLoadChart data={dayData} />
            <p className="text-sm text-muted-foreground text-center mt-4">Bugünkü Çalışma Süresi</p>
        </TabsContent>
        <TabsContent value="week" className="mt-4">
            <LearningLoadChart data={weekData} />
            <p className="text-sm text-muted-foreground text-center mt-4">Haftalık Çalışma Trendi</p>
        </TabsContent>
        <TabsContent value="month" className="mt-4">
            <LearningLoadChart data={monthData} />
            <p className="text-sm text-muted-foreground text-center mt-4">Son 30 Günlük Odaklanma Trendi</p>
        </TabsContent>
        <TabsContent value="all" className="mt-4">
            <LearningLoadChart data={allData} />
            <p className="text-sm text-muted-foreground text-center mt-4">Aylık Toplam Çalışma Dağılımı</p>
        </TabsContent>
    </Tabs>
);

export const PracticeCenterContent = ({ children }: { children: ReactNode }) => (
    <Tabs defaultValue="bloom" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="bloom">Bloom Radarı</TabsTrigger>
            <TabsTrigger value="speed">Hız Analizi</TabsTrigger>
        </TabsList>
        <TabsContent value="bloom" className="flex justify-center mt-4">
            <div className="w-full max-w-md">
                {children}
            </div>
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

export const MasteryNavigatorContent = ({ sessions }: { sessions: MasteryItem[] }) => (
    <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
            Ustalık skoru: Tamamlanan videolar (%60) ve çözülen soruların (%40) ağırlıklı ortalamasıdır.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((lesson) => (
                <div key={lesson.lessonId} className="p-4 border border-border rounded-xl bg-card/40 space-y-4">
                    <div className="flex justify-between items-start">
                        <h4 className="font-bold text-lg">{lesson.title}</h4>
                        <div className="text-2xl font-black text-primary">%{lesson.mastery}</div>
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
