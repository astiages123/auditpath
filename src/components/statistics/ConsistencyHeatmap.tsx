"use client";

import { DayActivity } from "@/lib/client-db";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConsistencyHeatmapProps {
  data: DayActivity[];
}

export function ConsistencyHeatmap({ data }: ConsistencyHeatmapProps) {
  // Tarih formatını "2026-01-20" -> "20.01.2026" haline getiren yardımcı fonksiyon
  const formatDate = (dateStr: string) => {
    return dateStr.split("-").reverse().join(".");
  };

  // Calculate levels based on minutes worked, not just count
  const getLevel = (day: DayActivity): 0 | 1 | 2 | 3 | 4 => {
    const minutes = day.totalMinutes || 0;
    if (minutes >= 120) return 4; // 2+ hours
    if (minutes >= 60) return 3;  // 1-2 hours
    if (minutes >= 30) return 2;  // 30-60 min
    if (minutes > 0) return 1;    // Any activity
    return 0;
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return "bg-muted/30";
      case 1: return "bg-emerald-500/30";
      case 2: return "bg-emerald-500/50";
      case 3: return "bg-emerald-500/70";
      case 4: return "bg-emerald-500";
      default: return "bg-muted/30";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold text-muted-foreground mb-4">
        Tutarlılık Isı Haritası
      </h3>
      
      {/* Larger Grid - 7 columns for week */}
      <div className="grid grid-cols-7 gap-2 flex-1">
        <TooltipProvider>
          {data.map((day, i) => {
            const level = getLevel(day);
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "aspect-square w-full min-h-[28px] rounded-lg transition-all duration-300 hover:scale-110 hover:ring-2 hover:ring-primary/30 cursor-default",
                      getLevelColor(level)
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    {/* Tarih burada formatlanıyor */}
                    <div className="font-bold">{formatDate(day.date)}</div>
                    <div>{day.totalMinutes || 0} dk çalışma</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-4 text-xs text-muted-foreground">
        <span>Az</span>
        <div className="flex gap-1.5">
          <div className="w-4 h-4 rounded-md bg-muted/30" />
          <div className="w-4 h-4 rounded-md bg-emerald-500/30" />
          <div className="w-4 h-4 rounded-md bg-emerald-500/50" />
          <div className="w-4 h-4 rounded-md bg-emerald-500/70" />
          <div className="w-4 h-4 rounded-md bg-emerald-500" />
        </div>
        <span>Çok</span>
      </div>
    </div>
  );
}