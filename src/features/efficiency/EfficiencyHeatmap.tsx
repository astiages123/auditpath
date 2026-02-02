"use client";

import { DayActivity } from "@/shared/lib/core/client-db";
import { cn } from "@/shared/lib/core/utils";
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from "@/shared/components/ui/tooltip";

interface EfficiencyHeatmapProps {
  data: DayActivity[];
}

export function EfficiencyHeatmap({ data }: EfficiencyHeatmapProps) {
  const getLevel = (day: DayActivity): 0 | 1 | 2 | 3 | 4 | 5 => {
    const minutes = day.totalMinutes || 0;
    if (minutes > 200) return 5;
    if (minutes > 150) return 4;
    if (minutes > 100) return 3;
    if (minutes > 50) return 2;
    if (minutes > 0) return 1;
    return 0;
  };

  const getLevelStyles = (level: number) => {
    switch (level) {
      case 0: return "bg-white/[0.03] border-white/5";
      case 1: return "bg-emerald-500/10 border-emerald-500/5";
      case 2: return "bg-emerald-500/25 border-emerald-500/10";
      case 3: return "bg-emerald-500/45 border-emerald-500/20";
      case 4: return "bg-emerald-400/65 border-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.1)]";
      case 5: return "bg-emerald-400 border-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.2)]";
      default: return "bg-white/[0.03] border-white/5";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("tr-TR", { 
            day: "numeric", 
            month: "long", 
            weekday: "long" 
        });
    } catch {
        return dateStr;
    }
  };

  return (
    <div className="flex flex-col h-full w-full py-1">
      <div className="w-full flex justify-center">
        <div 
          className="grid gap-2 w-full max-w-[500px]"
          style={{
            gridTemplateColumns: "repeat(7, 1fr)",
            gridTemplateRows: "repeat(5, 1fr)",
            height: "auto"
          }}
        >
          <TooltipProvider delayDuration={0}>
            {data.map((day, i) => {
              const level = getLevel(day);
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "aspect-square w-full rounded-sm border transition-all duration-200",
                        "hover:scale-110 hover:z-10 cursor-pointer",
                        getLevelStyles(level)
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-card/95 backdrop-blur-md border-white/10 p-3 shadow-xl">
                    <div className="text-xs space-y-1">
                      <p className="font-medium text-white">{formatDate(day.date)}</p>
                      <p className="flex items-center gap-1.5 text-muted-foreground">
                          <span className={cn(
                            "w-2 h-2 rounded-full", 
                            level === 0 ? "bg-white/10" : "bg-emerald-400"
                          )} />
                          {day.totalMinutes} dk odaklanma
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </div>

      {/* Minimal Legend */}
      <div className="flex items-center justify-end mt-5 pt-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/60 mr-1.5 uppercase font-medium">Az</span>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4, 5].map(l => (
              <div 
                key={l}
                className={cn(
                  "w-3.5 h-3.5 rounded-sm border",
                  getLevelStyles(l)
                )} 
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground/60 ml-1.5 uppercase font-medium">Çok</span>
        </div>
      </div>
    </div>
  );
}
