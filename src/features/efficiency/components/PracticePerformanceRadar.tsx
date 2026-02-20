import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { BloomStats } from '@/features/quiz/types/types';
import { BloomKeyChart } from './BloomKeyChart';

export const PracticePerformanceRadar = ({ data }: { data: BloomStats[] }) => (
  <Tabs defaultValue="bloom" className="w-full">
    <TabsList className="w-full grid grid-cols-2">
      <TabsTrigger value="bloom">Bloom Radarı</TabsTrigger>
      <TabsTrigger value="speed">Hız Analizi</TabsTrigger>
    </TabsList>
    <TabsContent value="bloom" className="flex flex-col items-center mt-4">
      <div className="w-full max-w-md">
        <BloomKeyChart data={data} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full mt-6">
        {data.map((item) => (
          <div
            key={item.level}
            className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center text-center"
          >
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">
              {item.level}
            </span>
            <span className="text-xl font-black text-white">{item.score}%</span>
          </div>
        ))}
      </div>
    </TabsContent>
    <TabsContent value="speed" className="p-4">
      <div className="h-64 flex items-center justify-center border border-dashed rounded text-muted-foreground">
        Hız analizi grafiği burada yer alacak.
      </div>
    </TabsContent>
  </Tabs>
);
