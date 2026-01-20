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
        <div className="space-y-4">
           {/* Chart */}
            {/* Chart */}
            <div className="h-[300px] w-full bg-card rounded-3xl p-6 border border-border/50 shadow-sm">
                 <div className="flex items-center justify-between mb-6">
                     <h3 className="text-lg font-bold text-foreground">Haftalık Aktivite</h3>
                     <div className="flex gap-4 text-xs font-medium text-muted-foreground">
                         <div className="flex items-center gap-1.5">
                             <div className="w-2 h-2 rounded-full bg-primary" />
                             <span>Çalışma</span>
                         </div>
                         <div className="flex items-center gap-1.5">
                             <div className="w-2 h-2 rounded-full bg-blue-500" />
                             <span>Video</span>
                         </div>
                     </div>
                 </div>
                 <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                     <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                         <XAxis 
                             dataKey="displayDate" 
                             stroke="currentColor" 
                             fontSize={12} 
                             tickLine={false} 
                             axisLine={false} 
                             className="text-muted-foreground opacity-50"
                             dy={10}
                         />
                         <YAxis 
                             stroke="currentColor" 
                             fontSize={12} 
                             tickLine={false} 
                             axisLine={false} 
                             tickFormatter={(value) => `${value}dk`} 
                             className="text-muted-foreground opacity-50"
                         />
                         <Tooltip 
                             cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
                             contentStyle={{ 
                                 backgroundColor: "var(--card)", 
                                 border: "1px solid var(--border)", 
                                 borderRadius: "12px",
                                 boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                             }}
                             labelStyle={{ color: "var(--foreground)", fontWeight: 600, marginBottom: "8px" }}
                             itemStyle={{ fontSize: "12px", padding: 0 }}
                             formatter={(value: any) => [`${Math.round(value)} dk`]}
                         />
                         <Bar 
                             dataKey="pomodoro" 
                             name="Çalışma" 
                             fill="var(--primary)" 
                             radius={[6, 6, 0, 0]} 
                             barSize={20}
                         />
                         <Bar 
                             dataKey="video" 
                             name="Video" 
                             fill="#3b82f6" 
                             radius={[6, 6, 0, 0]} 
                             barSize={20}
                         />
                     </BarChart>
                 </ResponsiveContainer>
            </div>

           {/* List View */}
           <div className="rounded-xl border border-border bg-card mt-10">
               <div className="p-4 border-b border-border">
                   <h3 className="font-semibold">Günlük Detaylar</h3>
               </div>
               <div className="divide-y divide-border">
                   {data.slice().reverse().map((day: any, i) => (
                       <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/5 transition-colors">
                           <div className="font-medium">{day.displayDate}</div>
                           <div className="flex gap-6 text-sm">
                               <div className="flex items-center gap-2">
                                   <div className="w-2 h-2 rounded-full bg-primary" />
                                   <span>{Math.round(day.pomodoro)} dk Çalışma</span>
                               </div>
                               <div className="flex items-center gap-2">
                                   <div className="w-2 h-2 rounded-full bg-accent" />
                                   <span>{Math.round(day.video)} dk Video</span>
                               </div>
                               <div className={`font-semibold w-12 text-right ${
                                    day.video > 0 ? (
                                        (day.pomodoro / day.video) < 1.0 || (day.pomodoro / day.video) > 2.2 ? 'text-red-500' :
                                        (day.pomodoro / day.video) >= 1.2 && (day.pomodoro / day.video) <= 1.7 ? 'text-green-500' :
                                        (day.pomodoro / day.video) >= 1.8 && (day.pomodoro / day.video) <= 2.2 ? 'text-yellow-500' :
                                        ''
                                    ) : ''
                                }`}>
                                   {day.video > 0 ? (day.pomodoro / day.video).toFixed(1) : "0.0"}x
                               </div>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
        </div>
    );
}
