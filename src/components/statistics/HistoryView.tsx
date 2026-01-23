"use client";

import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { getHistoryStats, type HistoryStats } from "@/lib/client-db";
import { Loader2 } from "lucide-react";

interface HistoryViewProps {
    userId: string;
}

export function HistoryView({ userId }: HistoryViewProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<HistoryStats[]>([]);

    useEffect(() => {
        if (!userId) return;
        
        async function fetchHistory() {
            try {
                const stats = await getHistoryStats(userId, 7);
                // Format dates for display
                 const formattedStats = stats.map(s => ({
                    ...s,
                    displayDate: format(new Date(s.date), "d MMM", { locale: tr })
                }));
                // @ts-ignore
                setData(formattedStats);
            } catch (error) {
                console.error("Failed to fetch history:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [userId]);

    if (loading) {
        return (
            <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    if (data.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                History Stats Fetch Failed. Check console.
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
           {/* Chart */}
            <div className="bg-card/30 backdrop-blur-xl rounded-[32px] p-8 border border-border/50 shadow-sm relative overflow-hidden group">
                 {/* Background Glow */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10 group-hover:bg-primary/10 transition-colors duration-700" />
                 
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                     <div>
                        <h3 className="text-xl font-black text-foreground tracking-tight">Haftalık Aktivite</h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Son 7 Günlük Performans</p>
                     </div>
                     <div className="flex items-center gap-6 p-2 bg-muted/20 rounded-2xl border border-border/50">
                         <div className="flex items-center gap-2 px-3">
                             <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
                             <span className="text-[10px] font-black uppercase tracking-wider">Çalışma</span>
                         </div>
                         <div className="flex items-center gap-2 px-3 border-l border-border/50">
                             <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
                             <span className="text-[10px] font-black uppercase tracking-wider">Video</span>
                         </div>
                     </div>
                 </div>

                 <div className="h-[280px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                             <defs>
                                 <linearGradient id="barGradientPrimary" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                                     <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.6} />
                                 </linearGradient>
                                 <linearGradient id="barGradientAccent" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="0%" stopColor="var(--accent)" stopOpacity={1} />
                                     <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.6} />
                                 </linearGradient>
                             </defs>
                             <XAxis 
                                 dataKey="displayDate" 
                                 stroke="currentColor" 
                                 fontSize={10} 
                                 fontWeight={700}
                                 tickLine={false} 
                                 axisLine={false} 
                                 className="text-muted-foreground/40"
                                 dy={15}
                             />
                             <YAxis 
                                 stroke="currentColor" 
                                 fontSize={10} 
                                 fontWeight={700}
                                 tickLine={false} 
                                 axisLine={false} 
                                 tickFormatter={(value) => `${Math.round(value)}dk`} 
                                 className="text-muted-foreground/40"
                             />
                             <Tooltip 
                                 cursor={{ fill: 'var(--muted)', opacity: 0.05 }}
                                 content={({ active, payload, label }) => {
                                     if (active && payload && payload.length) {
                                         return (
                                             <div className="bg-card/80 backdrop-blur-md border border-border/50 p-4 rounded-2xl shadow-xl">
                                                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-3 pb-2 border-b border-border/50">{label}</p>
                                                 <div className="space-y-2">
                                                     {payload.map((item: any, idx: number) => (
                                                         <div key={idx} className="flex items-center justify-between gap-8">
                                                             <div className="flex items-center gap-2">
                                                                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill === 'url(#barGradientPrimary)' ? 'var(--primary)' : 'var(--accent)' }} />
                                                                 <span className="text-xs font-bold text-foreground/80">{item.name}</span>
                                                             </div>
                                                             <span className="text-sm font-black text-foreground">{Math.round(item.value)} dk</span>
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                         );
                                     }
                                     return null;
                                 }}
                             />
                             <Bar 
                                 dataKey="pomodoro" 
                                 name="Çalışma" 
                                 fill="url(#barGradientPrimary)" 
                                 radius={[4, 4, 0, 0]} 
                                 barSize={16}
                             />
                             <Bar 
                                 dataKey="video" 
                                 name="Video" 
                                 fill="url(#barGradientAccent)" 
                                 radius={[4, 4, 0, 0]} 
                                 barSize={16}
                             />
                         </BarChart>
                     </ResponsiveContainer>
                 </div>
            </div>

           {/* List View */}
           <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-base font-black text-foreground uppercase tracking-widest">Günlük Detaylar</h3>
                    <div className="h-px flex-1 bg-border/30 mx-6" />
                </div>
                
                <div className="grid gap-3">
                    {data.slice().reverse().map((day: any, i) => {
                        const ratio = day.video > 0 ? day.pomodoro / day.video : 0;
                        const ratioColor = ratio < 1.0 || ratio > 2.2 ? 'text-red-500' : 
                                         ratio >= 1.2 && ratio <= 1.7 ? 'text-green-500' :
                                         ratio >= 1.8 && ratio <= 2.2 ? 'text-yellow-500' : 'text-muted-foreground';

                        return (
                            <div key={i} className="group bg-card/20 hover:bg-card/40 border border-border/40 p-4 rounded-2xl flex items-center justify-between transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center text-xs font-black text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        {day.displayDate.split(' ')[0]}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-foreground">{day.displayDate}</div>
                                        <div className="flex gap-3 mt-0.5">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                                {Math.round(day.pomodoro)}dk
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                                                {Math.round(day.video)}dk
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className={`flex flex-col items-end`}>
                                    <div className={`text-lg font-black tracking-tighter ${ratioColor}`}>
                                        {ratio > 0 ? ratio.toFixed(1) + 'x' : "-"}
                                    </div>
                                    <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.15em]">Katsayı</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
           </div>
        </div>
    );
}
