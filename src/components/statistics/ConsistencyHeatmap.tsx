"use client";

import { DayActivity } from "@/lib/client-db";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConsistencyHeatmapProps {
  data: DayActivity[];
}

export function ConsistencyHeatmap({ data }: ConsistencyHeatmapProps) {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold text-muted-foreground mb-4">
        Tutarlılık Isı Haritası
      </h3>
      <div className="flex flex-wrap gap-1.5 flex-1 content-start">
        <TooltipProvider>
          {data.map((day, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-3 h-3 rounded-[2px] transition-colors",
                    day.count === 0 && "bg-muted/20",
                    day.level === 1 && "bg-primary/30",
                    day.level === 2 && "bg-primary/50",
                    day.level === 3 && "bg-primary/70",
                    day.level === 4 && "bg-primary",
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-bold">{day.date}</div>
                  <div>{day.count} oturum</div>
                  <div>{day.totalMinutes} dk</div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Az</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-[1px] bg-muted/20" />
          <div className="w-2 h-2 rounded-[1px] bg-primary/30" />
          <div className="w-2 h-2 rounded-[1px] bg-primary/50" />
          <div className="w-2 h-2 rounded-[1px] bg-primary/70" />
          <div className="w-2 h-2 rounded-[1px] bg-primary" />
        </div>
        <span>Çok</span>
      </div>
    </div>
  );
}
