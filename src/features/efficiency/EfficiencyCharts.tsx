import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { cn } from '@/shared/lib/core/utils';
import { BloomStat, LearningLoad, Session } from './types';
import { EfficiencyTrend } from '@/shared/lib/core/client-db';
import { Play, Coffee, Pause } from 'lucide-react';

// --- Efficiency Trend Chart ---
interface EfficiencyTrendProps {
  data: EfficiencyTrend[];
}

export const EfficiencyTrendChart = ({ data }: EfficiencyTrendProps) => {
    return (
        <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <defs>
                    <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => {
                        const d = new Date(val);
                        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                    }}
                />
                <YAxis 
                    domain={[0, 100]} 
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                />
                <Tooltip
                    cursor={{ stroke: '#10b981', strokeWidth: 2 }}
                    formatter={(value: any) => [`%${value}`, "Verimlilik Skoru"]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    contentStyle={{
                        backgroundColor: 'var(--background)',
                        borderColor: 'var(--border)',
                        color: 'var(--foreground)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    }}
                    itemStyle={{ color: 'var(--foreground)' }}
                />
                <Area 
                    type="monotone" 
                    dataKey="score" 
                    name="Verimlilik" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorEff)" 
                    strokeWidth={3}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

import {
  RadialBarChart,
  RadialBar,
} from 'recharts';

// --- Bloom Key Chart (Polar Bar) ---
interface BloomKeyChartProps {
  data: BloomStat[];
}

export const BloomKeyChart = ({ data }: BloomKeyChartProps) => {
  // We want to transform data to have specific colors for each level
  // Order: Hatırla (Red) -> Anla (Orange) -> Uygula (Yellow) -> Analiz (Green) -> Değerlendir (Blue) -> Yarat (Violet)
  
  const formattedData = data.map((d) => {
    let fill = "#64748b";
    switch(d.level) {
      case "Hatırla": fill = "#ef4444"; break; // Red-500
      case "Anla": fill = "#f97316"; break; // Orange-500
      case "Uygula": fill = "#eab308"; break; // Yellow-500
      case "Analiz": fill = "#22c55e"; break; // Green-500
      case "Değerlendir": fill = "#0ea5e9"; break; // Sky-500
      case "Yarat": fill = "#8b5cf6"; break; // Violet-500
    }
    return {
      name: d.level,
      score: d.score || 0, // Ensure value
      fill: fill
    };
  }).reverse(); // Reverse for RadialBar stacking order (inner to outer)

  return (
    <ResponsiveContainer width="100%" height={300} minHeight={0}>
      <RadialBarChart 
        cx="50%" 
        cy="45%" 
        innerRadius="25%" 
        outerRadius="90%" 
        barSize={32} 
        data={formattedData}
        startAngle={180}
        endAngle={-180}
      >
        <RadialBar
          background={{ fill: 'rgba(255,255,255,0.05)' }}
          dataKey="score"
          cornerRadius={6}
          label={{ position: 'insideStart', fill: '#fff', fontSize: '10px', fontWeight: 'bold' }}
        />
        <Legend 
          iconSize={12}
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{
             paddingTop: '20px',
             width: '100%'
          }}
        />
        <Tooltip
          labelFormatter={() => ""}
          formatter={(value: any, name: any, props: any) => [`%${value}`, props.payload.name || "Başarı"]}
          contentStyle={{
             backgroundColor: '#1a1c1e',
             borderColor: 'rgba(255,255,255,0.1)',
             color: '#f8fafc',
             borderRadius: '8px',
             fontSize: '12px',
             boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
          }}
          itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
};

// --- Learning Load Stacked Bar Chart ---
interface LearningLoadProps {
  data: LearningLoad[];
}

export const LearningLoadChart = ({ data }: LearningLoadProps) => {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }} barSize={32}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
            <stop offset="100%" stopColor="#0284c7" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis 
            dataKey="day" 
            tick={{ fill: '#94a3b8', fontSize: 11 }} 
            axisLine={false}
            tickLine={false}
            dy={10}
        />
        <YAxis 
            domain={[0, 'auto']} 
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={70}
            tickFormatter={(val) => `${val}dk`}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }}
          formatter={(value: any) => [`${value} dk`, "Çalışma"]}
          contentStyle={{
            backgroundColor: '#1a1c1e',
            borderColor: 'rgba(255,255,255,0.1)',
            color: '#f8fafc',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
            padding: '12px',
          }}
          itemStyle={{ color: '#38bdf8', fontWeight: 600 }}
        />
        <Bar 
          dataKey="extraStudyMinutes" 
          name="Çalışma" 
          fill="url(#barGradient)" 
          radius={[6, 6, 6, 6]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// --- Daily Goal Progress Ring (SVG) ---
interface GoalRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
}

export const GoalProgressRing = ({ progress, size = 120, strokeWidth = 10 }: GoalRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  // Softer color palette
  const getStrokeColor = () => {
    if (progress >= 100) return "#22c55e"; // emerald-500
    if (progress >= 50) return "#22c55e";   // emerald-500
    if (progress >= 25) return "#eab308";   // yellow-500
    return "#64748b"; // slate-500
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Ring */}
        <circle
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress Ring */}
        <circle
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-1000 ease-out"
          style={{ filter: "drop-shadow(0 0 4px rgba(34, 197, 94, 0.3))" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold font-heading text-white">%{Math.round(Math.min(progress, 100))}</span>
        <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Hedef</span>
      </div>
    </div>
  );
};

// --- Simple Gantt / Session Visualizer ---
interface SessionGanttProps {
  sessions: Session[];
  detailed?: boolean;
}

export const SessionGanttChart = ({ sessions, detailed = false }: SessionGanttProps) => {
    // If we have only one session, we might want to zoom, but let's stick to the robust logic
    // from DailyDetailedAnalysisModal which scans timelines for true boundaries.

    // 1. Calculate Global Boundaries from Timeline Events
    // This is critical because session.startTime might be "later" than actual work due to bugs
    let globalMin = Infinity;
    let globalMax = -Infinity;

    // Use a local helper to parse timeline safely
    const getEvents = (s: Session) => {
        if (!s.timeline || !Array.isArray(s.timeline) || s.timeline.length === 0) return [];
        return s.timeline;
    };

    sessions.forEach(s => {
        // Default to session metadata
        let sStart = new Date(s.date + 'T' + s.startTime).getTime(); 
        // Note: s.date is YYYY-MM-DD, s.startTime is HH:mm. 
        // BUT, better to trust the timeline if it exists.
        
        // If s.startTime is just HH:mm, we need to be careful with dates. 
        // Let's rely purely on timestamp values in timeline if available.
        
        const events = getEvents(s);
        if (events.length > 0) {
             const tStart = Math.min(...events.map(e => e.start));
             const tEnd = Math.max(...events.map(e => e.end || e.start));
             if (tStart < Infinity) sStart = tStart;
             if (tEnd > -Infinity) {
                 if (tEnd > globalMax) globalMax = tEnd;
             }
             if (sStart < globalMin) globalMin = sStart;
        } else {
             // Fallback to string parsing if no timeline
             // This is risky for "midnight crossing" but good enough for simple fallback
             const d = new Date(s.date);
             const [h, m] = s.startTime.split(':').map(Number);
             d.setHours(h, m, 0, 0);
             if (d.getTime() < globalMin) globalMin = d.getTime();
             
             const dEnd = new Date(d);
             dEnd.setMinutes(dEnd.getMinutes() + s.duration);
             if (dEnd.getTime() > globalMax) globalMax = dEnd.getTime();
        }
    });

    if (globalMin === Infinity) {
        // No data case
        globalMin = new Date().setHours(4,0,0,0);
        globalMax = globalMin + 18*3600*1000;
    }

    // Add padding (30 mins before/after)
    const padding = 30 * 60 * 1000;
    const firstStart = globalMin - padding;
    const lastEnd = globalMax + padding;
    const totalSpan = lastEnd - firstStart;

    const getPos = (time: number) => ((time - firstStart) / totalSpan) * 100;

    // Generate markers
    const markers: number[] = [];
    const startTime = new Date(firstStart);
    startTime.setMinutes(0, 0, 0);
    // Add markers every 4 hours relative to the view
    for (let t = startTime.getTime(); t <= lastEnd; t += 3600000) {
        if (t >= firstStart) {
            const h = new Date(t).getHours();
            if (h % 4 === 0 || detailed) { 
                if (detailed || h % 4 === 0) {
                   markers.push(t);
                }
            }
        }
    }

    const getBlockColor = (type: string) => {
        switch(type) {
            case 'work': return 'bg-emerald-900 border-emerald-600 text-white';
            case 'break': return 'bg-sky-900 border-sky-600 text-white';
            case 'pause': return 'bg-zinc-700 border-zinc-500 text-white';
            default: return 'bg-primary border-primary/50 text-white';
        }
    };

    return (
        <div className="w-full h-full min-h-[150px] relative border-l border-border mt-4">
             {/* Time markers */}
             <div className="absolute top-0 bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground pointer-events-none">
                 {/* Render manually positioned markers */}
                 {markers.map((time) => {
                     const pos = getPos(time);
                     if (pos < -1 || pos > 101) return null;
                     const timeLabel = new Date(time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                     return (
                         <div key={time} className="absolute inset-y-0 w-px border-r border-dashed border-border/30 flex flex-col justify-end pb-1 items-center" style={{ left: `${pos}%` }}>
                             <span>{timeLabel}</span>
                         </div>
                     );
                 })}
             </div>

             <div className="pt-14 space-y-4 relative">
                 {sessions.map(session => {
                     let start = globalMin; // Default safely
                     let end = globalMax;

                     const events = getEvents(session);

                     if (events.length > 0) {
                        start = Math.min(...events.map(e => e.start));
                        end = Math.max(...events.map(e => e.end || e.start));
                     } else {
                        // Fallback
                        const d = new Date(session.date);
                        const [h, m] = session.startTime.split(':').map(Number);
                        d.setHours(h, m, 0, 0);
                        start = d.getTime();
                        end = start + session.duration * 60000;
                     }

                     const sessionLeft = getPos(start);
                     const sessionWidth = getPos(end) - sessionLeft;
                     
                     return (
                         <div key={session.id} className="relative h-14 w-full">
                                {/* If no timeline, show simple block */}
                                {events.length === 0 ? (
                                    <div 
                                        className="absolute h-10 rounded-full bg-primary border border-primary/50 flex items-center px-2 overflow-hidden whitespace-nowrap text-xs transition-all"
                                        style={{ left: `${sessionLeft}%`, width: `calc(${Math.max(0.5, sessionWidth)}% - 2px)` }}
                                    >
                                        <span className="font-medium truncate text-white">{session.lessonName}</span>
                                    </div>
                                ) : (
                                    /* Render timeline blocks */
                                    events.map((block, idx, arr) => {
                                        const nextEvent = arr[idx + 1];
                                        // Ensure we don't overlap strangely
                                        const bStart = Math.max(start, block.start);
                                        const bEnd = Math.min(end, block.end || (nextEvent ? nextEvent.start : end));

                                        if (bStart >= bEnd) return null;
                                        
                                        const bLeft = getPos(bStart);
                                        const bRight = getPos(bEnd);
                                        const bWidth = bRight - bLeft;
                                        
                                        return (
                                            <div 
                                                key={idx}
                                                className={cn(
                                                    "absolute h-10 rounded-lg border flex items-center justify-center px-1 transition-all group hover:z-10 hover:brightness-110 cursor-default",
                                                    getBlockColor(block.type)
                                                )}
                                                style={{ left: `${bLeft}%`, width: `calc(${Math.max(0.2, bWidth)}% - 2px)` }}
                                            >
                                                {bWidth > 2 && (
                                                    <div className="flex items-center justify-center w-full h-full overflow-hidden">
                                                        {block.type === 'work' ? <Play className="w-3.5 h-3.5" /> : 
                                                         block.type === 'break' ? <Coffee className="w-3.5 h-3.5" /> : 
                                                         <Pause className="w-3.5 h-3.5" />}
                                                    </div>
                                                )}
                                                {/* Tooltip on hover */}
                                                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[#1a1c1e] text-white px-3 py-2 rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none border border-white/10 z-30 shadow-2xl flex flex-col items-center gap-0.5 min-w-[130px] translate-y-2 group-hover:translate-y-0">
                                                    <span className="font-bold text-xs mb-1 tracking-wide">
                                                        {block.type === 'work' ? 'DERS' : block.type === 'break' ? 'MOLA' : 'DURAKLATMA'}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-white/60 font-medium">
                                                        <span>{new Date(bStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                        <span className="text-white/20">-</span>
                                                        <span>{new Date(bEnd).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                    <div className="mt-1 px-2 py-0.5 bg-white/10 rounded-full text-[9px] font-bold">
                                                        {Math.round((bEnd - bStart) / 60000)} DK
                                                    </div>
                                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a1c1e] border-r border-b border-white/10 rotate-45"></div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                         </div>
                     )
                 })}
             </div>
        </div>
    );
};

