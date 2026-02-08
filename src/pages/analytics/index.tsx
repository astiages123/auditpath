
import React, { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/core/supabase';
import { ExchangeRateService } from '@/shared/services/exchange-rate-service';
import { AiGenerationCost } from '@/shared/types/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../shared/components/ui/table";

export default function AnalyticsPage() {
    const [logs, setLogs] = useState<AiGenerationCost[]>([]);
    const [rate, setRate] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // 1. Fetch Exchange Rate
                const tryRate = await ExchangeRateService.getUsdToTryRate();
                setRate(tryRate);

                // 2. Fetch Generation Logs via the View
                // Fetch all history as requested (up to a safe high limit)
                const { data, error } = await supabase
                    .from('ai_generation_costs')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10000); 

                if (error) throw error;
                setLogs(data as unknown as AiGenerationCost[]);

            } catch (error) {
                console.error('Failed to load analytics data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // --- Data Processing for Charts ---
    // Group by Day (Dynamic Range)
    const processDailyData = () => {
        if (logs.length === 0) return [];

        // Find the range of dates from the logs
        const dates = logs
            .map(l => l.created_at ? new Date(l.created_at).getTime() : 0)
            .filter(d => d > 0);
        
        if (dates.length === 0) return [];

        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(); // Up to today

        // If the range is too huge, we might want to group by week/month, but for now daily is fine for "Analytics" 
        // usually showing daily spikes.
        
        const days = eachDayOfInterval({
            start: startOfWeek(minDate, { locale: tr }), // Align to start of week for better look
            end: maxDate
        });

        return days.map(day => {
            const dayLogs = logs.filter(log => 
                log.created_at && isSameDay(new Date(log.created_at), day)
            );
            
            const totalCostUsd = dayLogs.reduce((acc, log) => acc + (log.cost_usd || 0), 0);
            
            return {
                date: format(day, 'dd MMM', { locale: tr }),
                cost: totalCostUsd * rate // Convert to TRY
            };
        });
    };

    const dailyData = processDailyData();
    const totalCostUsd = logs.reduce((acc, log) => acc + (log.cost_usd || 0), 0);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('tr-TR', { 
            style: 'currency', 
            currency: 'TRY',
            minimumFractionDigits: 2
        }).format(value);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">AI Harcama Analizi</h1>
                <div className="text-sm text-gray-500">
                    Kur: 1 USD ≈ {rate.toFixed(2)} TRY
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Harcama (Görüntülenen)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalCostUsd * rate)}</div>
                        <p className="text-xs text-muted-foreground">
                            ~${totalCostUsd.toFixed(4)} USD
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam İstek</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{logs.length}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cache Hit Oranı</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {logs.length > 0 
                                ? ((logs.filter(l => (l.cached_tokens || 0) > 0).length / logs.length) * 100).toFixed(1)
                                : 0
                            }%
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <Card>
                <CardHeader>
                    <CardTitle>Günlük Harcama Geçmişi (TRY)</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis 
                                tickFormatter={(value) => `₺${value}`}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip 
                                formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Harcama']}
                                cursor={{ fill: 'transparent' }}
                            />
                            <Bar 
                                dataKey="cost" 
                                fill="currentColor" 
                                radius={[4, 4, 0, 0]}
                                className="fill-primary"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Detailed Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Son İşlemler</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tarih</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead>Tür</TableHead>
                                <TableHead className="text-right">Token (Prompt/Compl/Cache)</TableHead>
                                <TableHead className="text-right">Süre</TableHead>
                                <TableHead className="text-right">Maliyet (TRY)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.slice(0, 50).map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        {log.created_at ? format(new Date(log.created_at), 'dd MMM HH:mm', { locale: tr }) : '-'}
                                    </TableCell>
                                    <TableCell>{log.model}</TableCell>
                                    <TableCell>{log.usage_type || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col text-xs">
                                            <span>T: {log.total_tokens}</span>
                                            <span className="text-muted-foreground">
                                                {log.prompt_tokens}/{log.completion_tokens}/{log.cached_tokens}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {log.latency_ms ? `${(log.latency_ms / 1000).toFixed(2)}s` : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency((log.cost_usd || 0) * rate)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
