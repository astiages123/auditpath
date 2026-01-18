"use client";

import { TimelineBlock } from "@/lib/client-db";


interface TimelineGanttProps {
  data: TimelineBlock[];
}

export function TimelineGantt({ data }: TimelineGanttProps) {
  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>Henüz veri yok</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold text-muted-foreground mb-4">
        Zaman Çizelgesi
      </h3>
      <div className="flex-1 overflow-auto pr-2">
        <div className="space-y-3">
          {data.map((block) => (
            <div
              key={block.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border/50"
            >
              <div className="min-w-[60px] text-xs text-muted-foreground text-right">
                <div>{new Date(block.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="opacity-50">{new Date(block.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div className="w-1.5 h-10 rounded-full bg-primary/30" />
              <div>
                <div className="font-medium">{block.courseName}</div>
                <div className="text-xs text-muted-foreground">
                  {block.durationMinutes} dakika • {block.pauseMinutes} dk mola
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
