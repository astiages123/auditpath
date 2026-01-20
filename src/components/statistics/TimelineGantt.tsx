"use client";

import { useState } from "react";
import { TimelineBlock } from "@/lib/client-db";
import { StatDetailModal } from "./StatDetailModal";
import { BookOpen, Calendar, Clock, ChevronRight, Coffee, Pause, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TimelineGanttProps {
  data: TimelineBlock[];
}

interface GroupedSession {
  key: string;
  date: string;
  courseName: string;
  totalDuration: number;
  sessions: TimelineBlock[];
}

export function TimelineGantt({ data }: TimelineGanttProps) {
  const [selectedGroup, setSelectedGroup] = useState<GroupedSession | null>(null);

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>Henüz veri yok</p>
      </div>
    );
  }

  // 1. Group Data
  const groupedData: GroupedSession[] = [];
  const map = new Map<string, GroupedSession>();

  data.forEach((session) => {
    // Determine date string (YYYY-MM-DD)
    const dateObj = new Date(session.startTime);
    const dateStr = dateObj.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    
    // Create a unique key for grouping: Date + CourseName
    // Using CourseName because CourseID might be null or vary slightly if logic changes
    const key = `${dateStr}-${session.courseName}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        date: dateStr,
        courseName: session.courseName,
        totalDuration: 0,
        sessions: [],
      });
    }

    const group = map.get(key)!;
    group.sessions.push(session);
    group.totalDuration += session.durationMinutes;
  });

  // Convert map to array and sort by date (most recent first)
  // Since original data is sorted by startTime desc, the groups should mostly be in order
  // but let's just push them in order of appearance if we iterate map? 
  // Map insertion order is preserved. The first session encountered determines the group creation order.
  // Since input 'data' is sorted desc, the first group created is the most recent one.
  const groups = Array.from(map.values());

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold text-muted-foreground mb-4">
        Son Çalışmalar
      </h3>
      <div className="flex-1 overflow-auto pr-2 space-y-3">
        {groups.map((group) => (
          <div
            key={group.key}
            onClick={() => setSelectedGroup(group)}
            className="group flex items-center justify-between p-4 rounded-xl bg-card border border-border/50 hover:bg-muted/50 hover:border-primary/20 transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-4">
              {/* Left: Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>

              {/* Middle: Details */}
              <div className="flex flex-col gap-1">
                <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {group.courseName}
                </div>
                <div className="flex items-center gap-2">
                   <Badge variant="secondary" className="text-xs font-normal bg-muted text-muted-foreground hover:bg-muted">
                        <Calendar className="w-3 h-3 mr-1" />
                        {group.date}
                   </Badge>
                </div>
              </div>
            </div>

            {/* Right: Duration & Chevron */}
            <div className="flex items-center gap-4">
                 <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 text-sm font-medium text-foreground">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {Math.floor(group.totalDuration / 60) > 0 && `${Math.floor(group.totalDuration / 60)} sa `}
                        {group.totalDuration % 60} dk
                    </div>
                 </div>
                 <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}
      </div>

      <StatDetailModal
        open={!!selectedGroup}
        onOpenChange={(open) => !open && setSelectedGroup(null)}
        title={selectedGroup ? selectedGroup.courseName : "Detaylar"}
        className="max-w-3xl"
      >
        <div className="space-y-8 py-2">
            {/* Page Title & Date Badge */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground leading-none">{selectedGroup?.courseName}</h2>
                    <p className="text-muted-foreground text-sm mt-2">{selectedGroup?.date} oturum analizi</p>
                </div>
                <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/20 bg-primary/5 text-primary font-semibold">
                    {selectedGroup?.sessions.length} Oturum
                </Badge>
            </div>

            {/* Visual Gantt Chart Section */}
            {selectedGroup && (
                <div className="relative p-8 rounded-4xl bg-card border border-border/40 shadow-2xl shadow-primary/5 overflow-hidden">
                    {/* Background Decorative Mesh/Gradient */}
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-linear-to-tr from-primary via-transparent to-indigo-500" />
                    
                    <div className="relative">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h4 className="text-[11px] font-black text-foreground uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Verimlilik Akışı
                                </h4>
                                <p className="text-xs text-foreground/70">Zaman ve odak analizi</p>
                            </div>
                            <div className="flex items-center gap-6 px-4 py-2 rounded-2xl bg-muted/20 border border-border/40 backdrop-blur-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-sky-700 shadow-sm" />
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Odak</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-700 shadow-sm" />
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mola</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600 shadow-sm" />
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Duraklama</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="relative mt-16 mb-8 px-1">
                            {(() => {
                                const sessions = [...selectedGroup.sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                                const firstStart = new Date(sessions[0].startTime).getTime();
                                const lastEnd = new Date(sessions[sessions.length - 1].endTime).getTime();
                                const totalSpan = lastEnd - firstStart;

                                const getPos = (time: number) => ((time - firstStart) / totalSpan) * 100;

                                const markers = [];
                                const startTime = new Date(firstStart);
                                // UTC saat başlarını yakalamak için UTC fonksiyonları kullanıyoruz
                                startTime.setUTCMinutes(0, 0, 0); 
                                for (let t = startTime.getTime(); t <= lastEnd + 1200000; t += 3600000) {
                                    if (t >= firstStart - 1200000) markers.push(t);
                                }

                                return (
                                    <>
                                        {/* Time Axis Markers */}
                                        <div className="absolute -top-10 inset-x-0 h-full flex pointer-events-none">
                                            {markers.map((time) => {
                                                const pos = getPos(time);
                                                if (pos < -2 || pos > 102) return null;
                                                return (
                                                    <div key={time} className="absolute flex flex-col items-center" style={{ left: `${pos}%` }}>
                                                        <span className="text-[10px] font-bold text-foreground mb-3 font-mono">
                                                            {/* UTC formatında saati yazdırıyoruz */}
                                                            {new Date(time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                                                        </span>
                                                        <div className="w-px h-[120px] bg-linear-to-b from-border/30 via-border/10 to-transparent" />
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Main Chart Container */}
                                        <div className="relative h-20 w-full rounded-3xl bg-muted/10 border border-border/20 backdrop-blur-md flex items-center px-2 py-4 shadow-inner ring-1 ring-white/5">
                                            {sessions.map((session, idx) => {
                                                const start = new Date(session.startTime).getTime();
                                                const end = new Date(session.endTime).getTime();
                                                const sessionLeft = getPos(start);
                                                const sessionWidth = getPos(end) - sessionLeft;
                                                const isBreak = session.type?.toLowerCase() === 'break' || session.type?.toLowerCase() === 'mola';

                                                return (
                                                    <div 
                                                        key={session.id}
                                                        className="absolute h-10 rounded-2xl flex items-center overflow-visible transition-all cursor-default"
                                                        style={{ 
                                                            left: `calc(${sessionLeft}% + 2px)`, 
                                                            width: `calc(${sessionWidth}% - 4px)` 
                                                        }}
                                                    >
                                                        {/* Activity Segments Inside Session */}
                                                        {session.timeline && Array.isArray(session.timeline) ? (
                                                            (session.timeline as any[]).map((event, eIdx) => {
                                                                const eStart = event.start;
                                                                const eEnd = event.end || end;
                                                                const pLeft = ((eStart - start) / (end - start)) * 100;
                                                                const pWidth = ((eEnd - eStart) / (end - start)) * 100;
                                                                const eventDuration = Math.round((eEnd - eStart) / 1000 / 60);

                                                                let segmentClass = "bg-sky-800 border-sky-900 text-sky-100/90"; // Work
                                                                let icon = <Target className="w-3.5 h-3.5" />;
                                                                let label = "Çalışma";
                                                                
                                                                if (event.type === 'pause') {
                                                                    segmentClass = "bg-slate-700 border-slate-800 text-slate-100/90";
                                                                    label = "Duraklatma";
                                                                    icon = <Pause className="w-3.5 h-3.5" />;
                                                                }
                                                                if (event.type === 'break') {
                                                                    segmentClass = "bg-emerald-800 border-emerald-900 text-emerald-100/90";
                                                                    label = "Mola";
                                                                    icon = <Coffee className="w-3.5 h-3.5" />;
                                                                }

                                                                return (
                                                                    <div 
                                                                        key={eIdx}
                                                                        className={cn(
                                                                            "absolute inset-y-0 rounded-xl transition-all hover:scale-y-110 hover:z-30 group/segment flex items-center justify-center border shadow-md",
                                                                            segmentClass
                                                                        )}
                                                                        style={{ left: `${pLeft}%`, width: `calc(${pWidth}% - 1px)` }}
                                                                    >
                                                                        <div className="opacity-70 group-hover/segment:opacity-100 transition-opacity">
                                                                            {icon}
                                                                        </div>
                                                                        {/* Tooltip for segment duration */}
                                                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[9px] font-bold text-white opacity-0 group-hover/segment:opacity-100 transition-all pointer-events-none whitespace-nowrap border border-white/10 z-50">
                                                                            {label}: {eventDuration}dk
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className={cn(
                                                                "absolute inset-0 rounded-2xl border shadow-md",
                                                                isBreak ? "bg-emerald-800 border-emerald-900" : "bg-sky-800 border-sky-900"
                                                            )} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Metrics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-6 rounded-3xl bg-sky-500/10 border border-sky-500/20 flex flex-col gap-2 items-center md:items-start transition-all hover:bg-sky-500/20 hover:scale-[1.02]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center">
                            <Target className="w-4 h-4 text-sky-300" />
                        </div>
                        <span className="text-[10px] font-black text-sky-300 uppercase tracking-[0.15em]">Odak Süresi</span>
                    </div>
                    <span className="text-xl font-black text-white ml-1">
                        {(() => {
                            const totalWork = selectedGroup?.sessions.reduce((acc, s) => acc + (s.duration || 0), 0) || 0;
                            return `${Math.floor(totalWork / 60)}sa ${totalWork % 60}dk`;
                        })()}
                    </span>
                </div>
                
                <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-2 items-center md:items-start transition-all hover:bg-emerald-500/20 hover:scale-[1.02]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Coffee className="w-4 h-4 text-emerald-300" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.15em]">Mola Süresi</span>
                    </div>
                    <span className="text-xl font-black text-white ml-1">
                        {selectedGroup?.sessions.reduce((acc, s) => acc + ((s as any).breakMinutes || 0), 0) || 0}dk
                    </span>
                </div>
                
                <div className="p-6 rounded-3xl bg-slate-500/10 border border-slate-500/20 flex flex-col gap-2 items-center md:items-start col-span-2 md:col-span-1 transition-all hover:bg-slate-500/20 hover:scale-[1.02]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-500/20 flex items-center justify-center">
                            <Pause className="w-4 h-4 text-slate-300" />
                        </div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.15em]">Duraklama</span>
                    </div>
                    <span className="text-xl font-black text-white ml-1">
                        {selectedGroup?.sessions.reduce((acc, s) => acc + s.pauseMinutes, 0) || 0}dk
                    </span>
                </div>
            </div>

        </div>
      </StatDetailModal>
    </div>
  );
}
