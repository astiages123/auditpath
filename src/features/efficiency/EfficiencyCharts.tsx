import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  ReferenceArea,
  ReferenceLine,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { cn } from '@/shared/lib/core/utils';
import { Play, Coffee, Pause } from 'lucide-react';
import { BloomStat, LearningLoad, Session, FocusPowerPoint } from './types';
import { EfficiencyTrend } from '@/shared/lib/core/client-db';

// --- Efficiency Trend Chart ---
interface EfficiencyTrendProps {
  data: EfficiencyTrend[];
}

export const EfficiencyTrendChart = ({ data }: EfficiencyTrendProps) => {
    // 1. Veri Hazırlığı (Diverging Logic)
    // Deviation from 1.30 (Golden Ratio)
    const chartData = data.map(item => ({
        ...item,
        deviation: item.score - 1.30
    }));

    return (
        <div className="w-full h-[400px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                    data={chartData} 
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    barCategoryGap="20%"
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    
                    {/* 2. Zemin Bölgeleri (Background Zones) */}
                    {/* Maps to ranges shifted by -1.30 */}
                    
                    {/* Critical High: > 2.20 (Deviation > 0.90) */}
                    <ReferenceArea y1={0.90} y2={2.70} fill="#e11d48" fillOpacity={0.12} />
                    
                    {/* Warning High: 1.60 - 2.20 (Deviation 0.30 - 0.90) */}
                    <ReferenceArea y1={0.30} y2={0.90} fill="#f59e0b" fillOpacity={0.12} />
                    
                    {/* Optimal: 1.00 - 1.60 (Deviation -0.30 - 0.30) */}
                    <ReferenceArea y1={-0.30} y2={0.30} fill="#10b981" fillOpacity={0.12} />
                    
                    {/* Warning Low: 0.65 - 1.00 (Deviation -0.65 - -0.30) */}
                    <ReferenceArea y1={-0.65} y2={-0.30} fill="#f59e0b" fillOpacity={0.12} />
                    
                    {/* Critical Low: < 0.65 (Deviation < -0.65) */}
                    <ReferenceArea y1={-1.30} y2={-0.65} fill="#e11d48" fillOpacity={0.12} />

                    {/* Merkez Hattı: Sıfır Hata / Tam Akış (1.30x) */}
                    <ReferenceLine 
                        y={0} 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        strokeDasharray="4 4" 
                        label={{ 
                            position: 'right', 
                            value: 'İdeal', 
                            fill: '#10b981', 
                            fontSize: 10, 
                            fontWeight: 'bold'
                        }}
                    />

                    {/* 2. Eksen Yapılandırması */}
                    <XAxis 
                        dataKey="date" 
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 10, dy: 10 }} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => {
                            const d = new Date(val);
                            return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                        }}
                    />

                    <YAxis 
                        dataKey="deviation"
                        domain={[-1.3, 2.7]} 
                        ticks={[-1.3, -0.65, -0.3, 0, 0.3, 0.9, 1.7, 2.7]} // Significant markers
                        interval={0}
                        allowDecimals={true}
                        tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        tickFormatter={(val) => {
                            // Display the absolute score equivalent instead of deviation for UX? 
                            // Or keep deviation? User asked "XAxis... score... YAxis... dates" previously, 
                            // now "YAxis (Dikey): domain={[-1.3, 2.7]}".
                            // I will simply show the Deviation value or maybe empty to avoid confusion if areas are colored.
                            // But usually users want to see scale. 
                            // Let's show signed deviation as requested.
                            if (val === 0) return "0";
                            return val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
                        }}
                    />

                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                const dPayload = payload[0].payload;
                                const dScore = dPayload.score; 
                                
                                const getStatusInfo = (val: number) => {
                                    if (val < 0.65 || val > 2.20) return { label: "Kritik", color: "text-rose-500" };
                                    if (val >= 1.0 && val <= 1.6) return { label: "İdeal", color: "text-emerald-500" };
                                    return { label: "Ayarlama", color: "text-amber-500" };
                                };
                                
                                const status = getStatusInfo(dScore);

                                return (
                                    <div className="bg-[#1a1c1e] border border-white/10 text-slate-50 rounded-xl shadow-xl p-3 text-xs space-y-2 min-w-[200px] z-50">
                                        <p className="font-bold border-b border-white/10 pb-2 text-center text-white">
                                            {label ? new Date(label as string | number).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : ""}
                                        </p>
                                        <div className="flex flex-col gap-1.5 py-1">
                                            <div className="flex justify-between items-center px-1">
                                                <span className="text-slate-400">Verim Katsayısı</span>
                                                <span className={cn("font-mono font-bold text-lg", status.color)}>{dScore.toFixed(2)}x</span>
                                            </div>
                                            <div className={cn("text-[12px] font-bold text-center px-2 py-2 rounded-lg bg-white/5", status.color)}>
                                                {status.label}
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-white/5 space-y-1">
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-slate-500">Çalışma Süresi</span>
                                                <span className="text-white font-medium">{dPayload.workMinutes} dk</span>
                                            </div>
                                            {dPayload.videoMinutes > 0 && (
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="text-slate-500">Video İçeriği</span>
                                                    <span className="text-white font-medium">{dPayload.videoMinutes} dk</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />

                    {/* 3. Bar Renkleri: Skor bazlı */}
                    <Bar 
                        dataKey="deviation" 
                        barSize={32} // Slightly wider bars for better visibility
                        radius={[4, 4, 4, 4]}
                    >
                        {chartData.map((entry, index) => {
                            const val = entry.score;
                            let color = "#f59e0b"; // Default Amber
                            
                            if (val >= 1.0 && val <= 1.6) {
                                color = "#10b981"; // Emerald
                            } else if ((val >= 0.65 && val < 1.0) || (val > 1.6 && val <= 2.2)) {
                                color = "#f59e0b"; // Amber
                            } else {
                                color = "#e11d48"; // Rose
                            }

                            return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};


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
      case "Bilgi": fill = "#e11d48"; break; // Rose-500
      case "Uygula": fill = "#f59e0b"; break; // Amber-500
      case "Analiz": fill = "#10b981"; break; // Emerald-500
    }
    return {
      name: d.level,
      score: d.score || 0, // Ensure value
      fill: fill
    };
  }); 

  return (
    <ResponsiveContainer width="100%" height={300} minHeight={0}>
      <RadialBarChart 
        cx="50%" 
        cy="45%" 
        innerRadius="30%" 
        outerRadius="100%" 
        barSize={45} 
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
          formatter={(value: number | string | undefined, _name?: string, props?: { payload?: { name?: string } }) => [`%${value}`, props?.payload?.name || "Başarı"]}
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
          formatter={(value: number | string | undefined) => [`${value} dk`, "Çalışma"]}
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

// --- New Component: Focus Power Trend Chart ---
interface FocusPowerTrendProps {
    data: FocusPowerPoint[];
    rangeLabel: string; // "Hafta" | "Ay" | "Aylar"
}

export const FocusPowerTrendChart = ({ data, rangeLabel }: FocusPowerTrendProps) => {
    // Determine gradient depending on trend? 
    // Or just a beautiful emerald gradient since Focus Power is generally good.
    return (
        <div className="w-full h-full min-h-[300px] mt-4">
             <ResponsiveContainer width="100%" height={300}>
                <AreaChart 
                    data={data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                        interval="preserveStartEnd"
                    />
                    <YAxis 
                        domain={[0, 'auto']} 
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                    />
                    <Tooltip 
                        cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload as FocusPowerPoint;
                                return (
                                    <div className="bg-[#1a1c1e] border border-white/10 rounded-xl p-3 shadow-2xl space-y-2 min-w-[160px]">
                                        <div className="border-b border-white/5 pb-2 mb-2 font-bold text-center text-white/90 text-xs">
                                            {label}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Odak Gücü</span>
                                            <span className="text-lg font-bold text-white">{d.score}</span>
                                        </div>
                                        <div className="space-y-1 pt-1 opacity-80">
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-muted-foreground">Odak</span>
                                                <span className="text-white">{d.workMinutes} dk</span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-muted-foreground">Mola</span>
                                                <span className="text-white">{d.breakMinutes} dk</span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-muted-foreground">Duraklatma</span>
                                                <span className="text-white">{d.pauseMinutes} dk</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                            return null;
                        }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorFocus)" 
                        animationDuration={1500}
                    />
                </AreaChart>
             </ResponsiveContainer>
        </div>
    );
}

