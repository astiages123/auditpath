import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ReactNode } from 'react';

interface PracticePerformanceRadarProps {
  children: ReactNode;
}

export const PracticePerformanceRadar = ({
  children,
}: PracticePerformanceRadarProps) => (
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
