// IMPORTS

import { FC, lazy, Suspense } from 'react';
import { Info, Crosshair, Loader2 } from 'lucide-react';

const Radar = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.Radar }))
);
const RadarChart = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.RadarChart }))
);
const PolarGrid = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.PolarGrid }))
);
const PolarAngleAxis = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.PolarAngleAxis }))
);
const ResponsiveContainer = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.ResponsiveContainer }))
);
const PolarRadiusAxis = lazy(() =>
  import('recharts').then((mod) => ({ default: mod.PolarRadiusAxis }))
);

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// INTERFACES

interface ScoreTypeRadarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    p30: number;
    p35: number;
    p48: number;
  };
}

// COMPONENT

export const ScoreTypeRadarModal: FC<ScoreTypeRadarModalProps> = ({
  open,
  onOpenChange,
  data,
}) => {
  const chartData = [
    { subject: 'P30', value: data.p30, fullMark: 100 },
    { subject: 'P35', value: data.p35, fullMark: 100 },
    { subject: 'P48', value: data.p48, fullMark: 100 },
  ];

  const scoreItems = [
    {
      label: 'P30',
      value: data.p30,
      color: 'text-blue-400',
      bg: 'bg-blue-400',
    },
    {
      label: 'P35',
      value: data.p35,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400',
    },
    {
      label: 'P48',
      value: data.p48,
      color: 'text-amber-400',
      bg: 'bg-amber-400',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border shadow-2xl p-6 gap-0 scrollbar-hide">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Crosshair className="w-6 h-6 text-accent" />
            Puan Türü İstatistikleri
          </DialogTitle>
          <DialogDescription className="sr-only">
            Puan türlerine göre çalışma performans analizi.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="radar" className="w-full">
          <TabsList className="w-full grid grid-cols-1 bg-surface border border-border rounded-xl p-1 mb-6">
            <TabsTrigger
              value="radar"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all py-2"
            >
              Puan Radarı
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="radar"
            className="mt-0 focus-visible:outline-none"
          >
            <div className="flex flex-col items-center">
              {/* Radar Chart Container */}
              <div className="h-[280px] w-full max-w-lg flex items-center justify-center relative">
                <Suspense
                  fallback={
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground font-medium">
                        Grafik Yükleniyor...
                      </span>
                    </div>
                  }
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="75%"
                      data={chartData}
                    >
                      <PolarGrid stroke="#ffffff30" strokeWidth={2} />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{
                          fill: '#ffffff90',
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                        }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={false}
                        axisLine={false}
                      />
                      <Radar
                        name="İlerleme"
                        dataKey="value"
                        stroke="#8B5CF6"
                        strokeWidth={3}
                        fill="#8B5CF6"
                        fillOpacity={0.2}
                        dot={{
                          r: 4,
                          fill: '#8B5CF6',
                          stroke: '#fff',
                          strokeWidth: 2,
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </Suspense>
              </div>

              {/* Legend matching screenshot style */}
              <div className="flex items-center justify-center gap-6 mt-0 mb-6">
                {scoreItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-sm ${item.bg}`} />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom Cards matching screenshot style */}
              <div className="grid grid-cols-3 gap-4 w-full">
                {scoreItems.map((item) => (
                  <div
                    key={item.label}
                    className="p-4 bg-surface rounded-3xl border border-border flex flex-col items-center justify-center text-center group hover:border-accent/50 transition-all"
                  >
                    <span className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1 group-hover:text-foreground transition-colors">
                      {item.label}
                    </span>
                    <span
                      className={`text-2xl font-black ${item.color} tracking-tighter`}
                    >
                      %{Math.round(item.value)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Info section matching efficiency vibe */}
              <div className="mt-6 flex items-start gap-4 p-4 rounded-3xl bg-surface border border-border w-full">
                <div className="p-2 rounded-xl bg-accent/10 border border-accent/20 shrink-0">
                  <Info className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-foreground mb-1">
                    Analiz Hakkında
                  </h5>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Radar grafiği, seçili puan türlerindeki ilerlemenizin
                    birbirine göre dengesini gösterir. Dengeli bir poligon, tüm
                    puan türlerinde eş değer bir hazırlık sürecinde olduğunuzu
                    işaret eder. Merkezden uzaklık, ilgili puan türündeki teorik
                    uzmanlık seviyenizi temsil eder.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
