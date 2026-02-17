import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EfficiencyTrend, Session } from '../../../types/efficiencyTypes';
import { EfficiencyTrendChart } from '../../charts/EfficiencyTrendChart';
import { DistractionDetails } from './DistractionDetails';

interface FocusStreamHubProps {
  sessions: Session[];
  trendData: EfficiencyTrend[];
}

export const FocusStreamHub = ({
  sessions,
  trendData,
}: FocusStreamHubProps) => (
  <Tabs defaultValue="analysis" className="w-full">
    <TabsList className="w-full grid grid-cols-2">
      <TabsTrigger value="analysis">Odaklanma Trendi</TabsTrigger>
      <TabsTrigger value="history">Öğrenme Akışı Geçmişi</TabsTrigger>
    </TabsList>
    <TabsContent
      value="analysis"
      className="p-4 border border-border/50 rounded-xl mt-4 bg-white/5"
    >
      <DistractionDetails sessions={sessions} />
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
