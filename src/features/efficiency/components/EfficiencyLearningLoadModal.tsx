import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LearningLoad } from '../types/efficiencyTypes';
import { LearningLoadChart } from './LearningLoadChart';

interface LearningLoadAnalysisProps {
  dayData: LearningLoad[];
  weekData: LearningLoad[];
  monthData: LearningLoad[];
  allData: LearningLoad[];
  targetMinutes?: number;
}

export const LearningLoadAnalysis = ({
  dayData,
  weekData,
  monthData,
  allData,
  targetMinutes = 200,
}: LearningLoadAnalysisProps) => (
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
