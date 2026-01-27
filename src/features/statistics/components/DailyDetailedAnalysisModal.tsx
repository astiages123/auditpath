"use client";

import { useEffect, useState } from "react";
import { StatDetailModal } from "./StatDetailModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Clock, Target, Coffee, Pause, Info, History, BarChart3, Calendar, ChevronRight, BookOpen } from "lucide-react";
import type { DailyEfficiencySummary, DetailedSession, TimelineBlock } from "@/shared/lib/core/client-db";
import { getRecentSessions } from "@/shared/lib/core/client-db";
import { cn } from "@/shared/lib/core/utils";
// Json import removed as unused
import { getCycleCount } from "@/shared/lib/domain/pomodoro-utils";
import { Badge } from "@/shared/components/ui/badge";

interface DailyDetailedAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DailyEfficiencySummary;
  userId?: string;
}

// Get efficiency score color
const getScoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
};

const getScoreBg = (score: number) => {
  if (score >= 80) return "bg-emerald-500/20";
  if (score >= 50) return "bg-amber-500/20";
  return "bg-red-500/20";
};

// Format time from seconds
const formatTime = (seconds: number) => {
  const totalMinutes = Math.round(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}sa ${m}dk`;
  return `${m}dk`;
};

// Timeline event type
interface TimelineEvent {
  type: string;
  start: number;
  end?: number;
}

// Get event type label in Turkish
const getEventLabel = (type: string) => {
  const t = type.toLowerCase();
  if (t === "pause" || t === "duraklatma" || t === "duraklama") return "Duraklatma";
  if (t === "break" || t === "mola") return "Mola";
  return "Çalışma";
};

// Get event icon and colors
const getEventStyle = (type: string) => {
  const t = type.toLowerCase();
  if (t === "pause" || t === "duraklatma" || t === "duraklama") {
    return { icon: Pause, bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400" };
  }
  if (t === "break" || t === "mola") {
    return { icon: Coffee, bg: "bg-slate-500/10", border: "border-slate-500/20", text: "text-slate-400" };
  }
  return { icon: Target, bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400" };
};

export function DailyDetailedAnalysisModal({
  open,
  onOpenChange,
  data,
  userId,
}: DailyDetailedAnalysisModalProps) {
  return (
    <StatDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title="Günlük Verimlilik Analizi"
      className="max-w-4xl"
    >
      <div className="space-y-6">
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/20 p-1 rounded-2xl h-12">
            <TabsTrigger
              value="history"
              className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Son Çalışmalar</span>
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Saat Detayı</span>
            </TabsTrigger>
            <TabsTrigger
              value="analysis"
              className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analiz</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Son Çalışmalar (Recent Sessions) */}
          <TabsContent value="history" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <RecentSessionsTab userId={userId} />
          </TabsContent>

          {/* Tab 2: Hourly Timeline List */}
          <TabsContent value="timeline" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <HourlyTimelineTab sessions={data.sessions} />
          </TabsContent>

          {/* Tab 3: Efficiency Analysis */}
          <TabsContent value="analysis" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <EfficiencyAnalysisTab data={data} />
          </TabsContent>
        </Tabs>
      </div>
    </StatDetailModal>
  );
}

// Grouped Session type (same as TimelineGantt)
interface GroupedSession {
  key: string;
  date: string;
  courseName: string;
  totalWorkSeconds: number;
  totalSessionSeconds: number;
  workSessionCount: number;
  sessions: TimelineBlock[];
}

// Tab 1: Recent Sessions (Son Çalışmalar) - TimelineGantt Style
function RecentSessionsTab({ userId }: { userId?: string }) {
  const [sessions, setSessions] = useState<TimelineBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<GroupedSession | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchSessions() {
      try {
        const data = await getRecentSessions(userId!, 50);
        setSessions(data);
      } catch (error) {
        console.error("Error fetching recent sessions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [userId]);

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!userId || sessions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p>Geçmiş çalışma verisi bulunmuyor.</p>
      </div>
    );
  }

  // Group sessions by Date + CourseName (same logic as TimelineGantt)
  const map = new Map<string, GroupedSession>();

  sessions.forEach((session) => {
    const dateObj = new Date(session.startTime);
    const virtualDate = new Date(dateObj);
    if (dateObj.getHours() < 4) {
      virtualDate.setDate(virtualDate.getDate() - 1);
    }

    const dateStr = virtualDate.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    
    const key = `${dateStr}-${session.courseName}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        date: dateStr,
        courseName: session.courseName,
        totalWorkSeconds: 0,
        totalSessionSeconds: 0,
        workSessionCount: 0,
        sessions: [],
      });
    }

    const group = map.get(key)!;
    group.sessions.push(session);
    
    const totalSec = session.totalDurationSeconds || session.durationSeconds || 0;
    const breakSec = session.breakSeconds || 0;
    const pauseSec = session.pauseSeconds || 0;
    
    const workSec = Math.max(0, totalSec - breakSec - pauseSec);

    group.totalWorkSeconds += workSec;
    group.totalSessionSeconds += totalSec;
    group.workSessionCount += getCycleCount(session.timeline);
  });

  const groups = Array.from(map.values());

  return (
    <>
      <div className="flex-1 overflow-auto pr-2 space-y-3 max-h-[60vh]">
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
                        {formatTime(group.totalWorkSeconds)}
                    </div>
                 </div>
                 <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}
      </div>

      {/* Gantt Detail Modal */}
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
                <Badge variant="outline" className="px-4 py-1.5 rounded-full border-indigo-500/20 bg-indigo-500/5 text-indigo-400 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedGroup?.workSessionCount} Oturum
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
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Duraklatma</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="relative mt-16 mb-8 px-1">
                            {(() => {
                                const sortedSessions = [...selectedGroup.sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                                
                                // Recalculate global boundaries scanning all timelines
                                let globalMin = Infinity;
                                let globalMax = -Infinity;

                                sortedSessions.forEach(s => {
                                    let sStart = new Date(s.startTime).getTime();
                                    let sEnd = new Date(s.endTime).getTime();

                                    if (s.timeline && Array.isArray(s.timeline) && s.timeline.length > 0) {
                                         const events = s.timeline as unknown as TimelineEvent[];
                                         const tStart = Math.min(...events.map(e => e.start));
                                         const tEnd = Math.max(...events.map(e => e.end || e.start));
                                         if (tStart < sStart) sStart = tStart;
                                         if (tEnd > sEnd) sEnd = tEnd;
                                    }
                                    if (sStart < globalMin) globalMin = sStart;
                                    if (sEnd > globalMax) globalMax = sEnd;
                                });

                                const firstStart = globalMin;
                                const lastEnd = globalMax;
                                const totalSpan = lastEnd - firstStart;

                                const getPos = (time: number) => ((time - firstStart) / totalSpan) * 100;

                                const markers: number[] = [];
                                const startTime = new Date(firstStart);
                                startTime.setMinutes(0, 0, 0); 
                                for (let t = startTime.getTime(); t <= lastEnd + 3600000; t += 3600000) {
                                    if (t >= firstStart - 1800000) markers.push(t);
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
                                                            {new Date(time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <div className="w-px h-[120px] bg-linear-to-b from-border/30 via-border/10 to-transparent" />
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Main Chart Container */}
                                        <div className="relative h-20 w-full rounded-3xl bg-muted/10 border border-border/20 backdrop-blur-md flex items-center px-2 py-4 shadow-inner ring-1 ring-white/5">
                                            {/* Overflow hidden container for bars only */}
                                            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none" />
                                            {sortedSessions.map((session) => {
                                                // Calculate TRUE start/end from timeline to fix visual bugs
                                                let start = new Date(session.startTime).getTime();
                                                let end = new Date(session.endTime).getTime();
                                                
                                                if (session.timeline && Array.isArray(session.timeline) && session.timeline.length > 0) {
                                                    const timelineEvents = session.timeline as unknown as TimelineEvent[];
                                                    const tStart = Math.min(...timelineEvents.map(e => e.start));
                                                    const tEnd = Math.max(...timelineEvents.map(e => e.end || e.start));
                                                    
                                                    if (tStart < start) start = tStart;
                                                    if (tEnd > end) end = tEnd;
                                                }

                                                const sessionLeft = getPos(start);
                                                const sessionWidth = getPos(end) - sessionLeft;
                                                const isBreak = session.type?.toLowerCase() === 'break' || session.type?.toLowerCase() === 'mola';

                                                return (
                                                    <div 
                                                        key={session.id}
                                                        className="absolute h-10 rounded-2xl flex items-center overflow-visible transition-all cursor-default"
                                                        style={{ 
                                                            left: `calc(${sessionLeft}% + 1px)`, 
                                                            width: `calc(${sessionWidth}% - 2px)` 
                                                        }}
                                                    >
                                                    
                                                        {/* Activity Segments Inside Session */}
                                                        {session.timeline && Array.isArray(session.timeline) && (session.timeline as unknown as TimelineEvent[]).length > 0 ? (
                                                            (session.timeline as unknown as TimelineEvent[]).map((event, eIdx, arr) => {
                                                                const nextEvent = arr[eIdx + 1];
                                                                const eStart = Math.max(start, event.start);
                                                                const eEnd = Math.min(end, event.end || (nextEvent ? nextEvent.start : end));
                                                                
                                                                if (eStart >= eEnd) return null;

                                                                const pLeft = ((eStart - start) / (end - start)) * 100;
                                                                const pWidth = ((eEnd - eStart) / (end - start)) * 100;
                                                                
                                                                const eventDuration = Math.round((eEnd - eStart) / 1000 / 60);

                                                                const eventType = (event.type || 'work').toLowerCase();
                                                                let segmentClass = "bg-[#0ea5e9]/80 border-[#0ea5e9]/30 text-sky-100/90";
                                                                let icon = <Target className="w-3.5 h-3.5" />;
                                                                let label = "Odak";
                                                                
                                                                if (eventType === 'pause' || eventType === 'duraklatma' || eventType === 'duraklama') {
                                                                    segmentClass = "bg-slate-600/80 border-slate-500/30 text-slate-100/90";
                                                                    label = "Duraklatma";
                                                                    icon = <Pause className="w-3.5 h-3.5" />;
                                                                } else if (eventType === 'break' || eventType === 'mola') {
                                                                    segmentClass = "bg-emerald-600/80 border-emerald-500/30 text-emerald-100/90";
                                                                    label = "Mola";
                                                                    icon = <Coffee className="w-3.5 h-3.5" />;
                                                                }

                                                                return (
                                                                    <div 
                                                                        key={eIdx}
                                                                        className={cn(
                                                                            "absolute inset-y-0 rounded-xl transition-all hover:scale-y-110 hover:z-30 group/segment flex items-center justify-center border shadow-sm backdrop-blur-sm",
                                                                            segmentClass
                                                                        )}
                                                                        style={{ left: `${pLeft}%`, width: `calc(${pWidth}% - 1.5px)` }}
                                                                    >
                                                                        <div className="opacity-100 group-hover/segment:opacity-100 text-white transition-opacity">
                                                                            {pWidth > 8 && icon}
                                                                        </div>
                                                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/95 backdrop-blur-xl rounded-xl text-[10px] font-bold text-white opacity-0 group-hover/segment:opacity-100 transition-all pointer-events-none whitespace-nowrap border border-white/10 z-100 shadow-2xl skew-x-0">
                                                                            {label}: {eventDuration} dk
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className={cn(
                                                                "absolute inset-0 rounded-2xl border shadow-md flex items-center justify-center transition-colors",
                                                                isBreak ? "bg-emerald-600/40 border-emerald-500/30" : "bg-[#0ea5e9]/40 border-[#0ea5e9]/30"
                                                            )}>
                                                                {!isBreak && <Target className="w-4 h-4 text-sky-400/40" />}
                                                                {isBreak && <Coffee className="w-4 h-4 text-emerald-400/40" />}
                                                            </div>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col gap-2 items-center md:items-start transition-all hover:bg-indigo-500/20 hover:scale-[1.02]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-indigo-300" />
                        </div>
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Oturum Süresi</span>
                    </div>
                    <span className="text-xl font-black text-white ml-1">
                        {formatTime(selectedGroup?.totalSessionSeconds || 0)}
                    </span>
                </div>

                <div className="p-6 rounded-3xl bg-sky-500/10 border border-sky-500/20 flex flex-col gap-2 items-center md:items-start transition-all hover:bg-sky-500/20 hover:scale-[1.02]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center">
                            <Target className="w-4 h-4 text-sky-300" />
                        </div>
                        <span className="text-[10px] font-black text-sky-300 uppercase tracking-widest">Odak Süresi</span>
                    </div>
                    <span className="text-xl font-black text-white ml-1">
                        {formatTime(selectedGroup?.totalWorkSeconds || 0)}
                    </span>
                </div>
                
                <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-2 items-center md:items-start transition-all hover:bg-emerald-500/20 hover:scale-[1.02]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Coffee className="w-4 h-4 text-emerald-300" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Mola Süresi</span>
                    </div>
                    <span className="text-xl font-black text-white ml-1">
                        {(() => {
                             const totalSeconds = selectedGroup?.sessions?.reduce((acc, s) => acc + (s.breakSeconds || 0), 0) || 0;
                             return formatTime(totalSeconds);
                        })()}
                    </span>
                </div>
                
                <div className="p-6 rounded-3xl bg-slate-500/10 border border-slate-500/20 flex flex-col gap-2 items-center md:items-start transition-all hover:bg-slate-500/20 hover:scale-[1.02]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-500/20 flex items-center justify-center">
                            <Pause className="w-4 h-4 text-slate-300" />
                        </div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Duraklatma</span>
                    </div>
                    <span className="text-xl font-black text-white ml-1">
                        {(() => {
                             const totalSeconds = selectedGroup?.sessions?.reduce((acc, s) => acc + (s.pauseSeconds || 0), 0) || 0;
                             return formatTime(totalSeconds);
                        })()}
                    </span>
                </div>
            </div>
        </div>
      </StatDetailModal>
    </>
  );
}


// Tab 2: Hourly Timeline List (Modernized)
function HourlyTimelineTab({ sessions }: { sessions: DetailedSession[] }) {
  // --- Logic Bölümü (Veri Hazırlama) ---
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/60">
        <div className="p-4 bg-background rounded-full shadow-sm mb-4 ring-1 ring-border/50">
          <Clock className="w-8 h-8 opacity-40" />
        </div>
        <p className="font-medium text-foreground">Bugün için saat detayı bulunmuyor.</p>
        <p className="text-sm opacity-60">Planlanmış bir oturum yok.</p>
      </div>
    );
  }

  // Merge all timeline events
  const allEvents: Array<TimelineEvent & { courseName: string }> = [];
  
  sessions.forEach((session) => {
    if (Array.isArray(session.timeline)) {
      (session.timeline as unknown as TimelineEvent[]).forEach((event) => {
        allEvents.push({
          ...event,
          courseName: session.courseName,
        });
      });
    }
  });

  // Sort by start time
  allEvents.sort((a, b) => a.start - b.start);

  if (allEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/60">
        <div className="p-4 bg-background rounded-full shadow-sm mb-4 ring-1 ring-border/50">
          <Clock className="w-8 h-8 opacity-40" />
        </div>
        <p className="font-medium text-foreground">Detaylı saat verisi mevcut değil.</p>
      </div>
    );
  }

  // --- Render Bölümü (Modern UI) ---
  return (
    <div className="relative py-2 pl-2 pr-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
      {/* Timeline Dikey Çizgisi (Vertical Line) */}
      <div className="absolute left-9 top-4 bottom-4 w-px bg-linear-to-b from-transparent via-border/80 to-transparent" />

      <div className="space-y-6 pl-2">
        {allEvents.map((event, idx) => {
          const eventStart = event.start;
          const eventEnd = event.end || eventStart + 60000;
          const durationMinutes = Math.round((eventEnd - eventStart) / 1000 / 60);
          const style = getEventStyle(event.type);
          const IconComponent = style.icon;

          // Saat formatlama fonksiyonu
          const formatTime = (time: number) => 
            new Date(time).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

          return (
            <div key={idx} className="relative group">
              <div className="flex items-start gap-5">
                
                {/* Sol Taraf: İkon ve Zaman Noktası (Node) */}
                <div className="relative z-10 flex flex-col items-center pt-1">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border-2 border-background transition-all duration-300 group-hover:scale-110 group-hover:shadow-md",
                    style.bg,
                    style.text
                  )}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                </div>

                {/* Sağ Taraf: İçerik Kartı */}
                <div className={cn(
                  "flex-1 p-4 rounded-2xl border bg-card/50 backdrop-blur-sm transition-all duration-300",
                  "hover:bg-card hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20",
                  style.border.replace("border-", "group-hover:border-") // Hover'da kendi renginin border'ını alması için
                )}>
                  
                  {/* Üst Kısım: Başlık ve Süre */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1">
                      {/* Zaman Aralığı */}
                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                        <span className="font-bold text-foreground bg-muted/60 px-1.5 py-0.5 rounded-md border border-border/50">
                          {formatTime(eventStart)}
                        </span>
                        <span className="opacity-40">→</span>
                        <span className="font-medium opacity-80">
                          {formatTime(eventEnd)}
                        </span>
                      </div>
                      
                      {/* Etkinlik Türü Başlığı */}
                      <h4 className="font-bold text-lg leading-tight text-foreground tracking-tight">
                        {getEventLabel(event.type)}
                      </h4>
                    </div>

                    {/* Süre Rozeti (Badge) */}
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs",
                      "bg-background/80"
                    )}>
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-foreground">{durationMinutes} dk</span>
                    </div>
                  </div>

                  {/* Alt Kısım: Ders Bağlamı (Footer) */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashed border-border/60">
                     <div className={cn("w-1.5 h-1.5 rounded-full ring-2 ring-background", style.bg.replace("/10", ""))} />
                     <p className="text-xs text-muted-foreground font-medium truncate">
                       {event.courseName || "Genel Oturum"}
                     </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Tab 3: Efficiency Analysis
function EfficiencyAnalysisTab({ data }: { data: DailyEfficiencySummary }) {
  const totalTime = data.netWorkTimeSeconds + data.totalBreakTimeSeconds + data.totalPauseTimeSeconds;
  
  const workPercent = totalTime > 0 ? (data.netWorkTimeSeconds / totalTime) * 100 : 0;
  const breakPercent = totalTime > 0 ? (data.totalBreakTimeSeconds / totalTime) * 100 : 0;
  const pausePercent = totalTime > 0 ? (data.totalPauseTimeSeconds / totalTime) * 100 : 0;

  // Calculate efficiency manually for display
  const calculatedEfficiency = totalTime > 0 
    ? Math.round((data.netWorkTimeSeconds / totalTime) * 100) 
    : 0;

  return (
    <div className="space-y-8">
      {/* Score Display */}
      <div className="flex items-center justify-center gap-8 p-8 rounded-3xl bg-card border border-border/40">
        <div className={cn(
          "flex items-center justify-center w-28 h-28 rounded-full border-4",
          data.efficiencyScore >= 80 ? "border-emerald-500/30" : data.efficiencyScore >= 50 ? "border-amber-500/30" : "border-red-500/30",
          getScoreBg(data.efficiencyScore)
        )}>
          <span className={cn("text-5xl font-black", getScoreColor(data.efficiencyScore))}>
            {data.efficiencyScore > 0 ? data.efficiencyScore : calculatedEfficiency}
          </span>
        </div>
        <div>
          <h4 className="text-lg font-bold text-foreground mb-2">Verimlilik Skoru</h4>
          <p className="text-sm text-muted-foreground max-w-xs">
            {data.efficiencyScore >= 80 
              ? "Mükemmel! Bugün çok verimli bir çalışma performansı sergiliniz." 
              : data.efficiencyScore >= 50 
                ? "İyi gidiyorsunuz. Mola ve duraklatma sürelerini azaltarak daha verimli olabilirsiniz."
                : "Çalışma sürenizi artırmayı ve duraklatmaları azaltmayı deneyin."}
          </p>
        </div>
      </div>

      {/* Progress Bar Breakdown */}
      <div className="p-6 rounded-3xl bg-card border border-border/40">
        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">
          Süre Dağılımı
        </h4>
        
        {/* Stacked Progress Bar with Percentage Labels */}
        <div className="relative">
          {/* Percentage Labels Above Bar */}
          <div className="flex mb-2 h-6">
            {workPercent > 5 && (
              <div 
                className="flex items-center justify-center"
                style={{ width: `${workPercent}%` }}
              >
                <span className="text-xs font-bold text-indigo-400">{Math.round(workPercent)}%</span>
              </div>
            )}
            {breakPercent > 5 && (
              <div 
                className="flex items-center justify-center"
                style={{ width: `${breakPercent}%` }}
              >
                <span className="text-xs font-bold text-slate-400">{Math.round(breakPercent)}%</span>
              </div>
            )}
            {pausePercent > 5 && (
              <div 
                className="flex items-center justify-center"
                style={{ width: `${pausePercent}%` }}
              >
                <span className="text-xs font-bold text-orange-400">{Math.round(pausePercent)}%</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="relative h-10 w-full rounded-full bg-muted/20 overflow-hidden flex">
            {workPercent > 0 && (
              <div 
                className="h-full bg-indigo-500/60 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${workPercent}%` }}
              >
                {workPercent > 15 && <Target className="w-4 h-4 text-indigo-200" />}
              </div>
            )}
            {breakPercent > 0 && (
              <div 
                className="h-full bg-slate-400/60 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${breakPercent}%` }}
              >
                {breakPercent > 15 && <Coffee className="w-4 h-4 text-slate-200" />}
              </div>
            )}
            {pausePercent > 0 && (
              <div 
                className="h-full bg-orange-500/60 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${pausePercent}%` }}
              >
                {pausePercent > 15 && <Pause className="w-4 h-4 text-orange-200" />}
              </div>
            )}
          </div>
        </div>

        {/* Legend with values */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Target className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs text-muted-foreground">Çalışma</p>
              <p className="text-sm font-bold text-foreground">{formatTime(data.netWorkTimeSeconds)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-500/10 border border-slate-500/20">
            <Coffee className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-muted-foreground">Mola</p>
              <p className="text-sm font-bold text-foreground">{formatTime(data.totalBreakTimeSeconds)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Pause className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-xs text-muted-foreground">Duraklatma</p>
              <p className="text-sm font-bold text-foreground">{formatTime(data.totalPauseTimeSeconds)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formula Info */}
      <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20">
        <div className="flex items-start justify-center gap-3 w-full">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 max-w">
            <h5 className="text-sm font-bold text-foreground mb-3 text-left">Verimlilik Formülü</h5>
            <div className="p-4 rounded-xl bg-background/50 border border-border/30">
              <div className="flex items-center justify-center gap-2 text-lg flex-wrap">
                <span className="font-bold text-foreground">Verimlilik</span>
                <span className="text-muted-foreground">=</span>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-semibold text-indigo-400 border-b border-muted-foreground pb-1">
                    Çalışma Süresi
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground pt-1">
                    Çalışma + Mola + Duraklatma
                  </span>
                </div>
                <span className="text-muted-foreground">×</span>
                <span className="font-bold text-foreground">100</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Verimlilik skoru, toplam oturum süreniz içinde aktif çalışmaya harcadığınız zamanın yüzdesini gösterir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
