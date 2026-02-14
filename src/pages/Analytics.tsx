import React, {
  useEffect,
  useState,
  useTransition,
  useDeferredValue,
} from 'react';
import { supabase } from '@/services/supabase';
import { ExchangeRateService } from '@/services/exchange-rate-service';
import type { Database } from '@/types/database.types';

// Extended type to include latency_ms and status which are in the table but not in the view
type AiGenerationCost =
  Database['public']['Views']['ai_generation_costs']['Row'] & {
    latency_ms?: number | null;
    status?: number | null;
  };
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { format, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Loader2,
  TrendingUp,
  Cpu,
  Zap,
  History,
  ChevronDown,
  DollarSign,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/utils/logger';

export default function AnalyticsPage() {
  const [logs, setLogs] = useState<AiGenerationCost[]>([]);
  const [rate, setRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [isMounted, setIsMounted] = useState(false);

  // React 19 Concurrent Features: useTransition for chart updates
  const [isPending, startTransition] = useTransition();
  // useDeferredValue for smooth filtering without input lag
  const deferredVisibleCount = useDeferredValue(visibleCount);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Use the service which handles API fallback and caching
        const tryRate = await ExchangeRateService.getUsdToTryRate();
        setRate(tryRate);

        const { data, error } = await supabase
          .from('ai_generation_costs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10000);

        if (error) throw error;
        setLogs(data as AiGenerationCost[]);
      } catch (error) {
        logger.error('Failed to load analytics data:', error as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Wrap heavy data processing in useMemo with deferred values
  const processDailyData = () => {
    if (logs.length === 0) return [];
    const dates = logs
      .map((l) => (l.created_at ? new Date(l.created_at).getTime() : 0))
      .filter((d) => d > 0);

    if (dates.length === 0) return [];

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date();

    const days = eachDayOfInterval({
      start: startOfWeek(minDate, { locale: tr }),
      end: maxDate,
    });

    return days.map((day) => {
      const dayLogs = logs.filter(
        (log) => log.created_at && isSameDay(new Date(log.created_at), day)
      );
      const totalCostUsd = dayLogs.reduce(
        (acc, log) => acc + (log.cost_usd || 0),
        0
      );
      return {
        date: format(day, 'dd MMM', { locale: tr }),
        cost: (() => {
          const cost = totalCostUsd * rate;
          const parsed = Number.isNaN(cost) ? 0 : parseFloat(cost.toFixed(4));
          return parsed;
        })(),
        fullDate: format(day, 'dd MMMM yyyy', { locale: tr }),
      };
    });
  };

  const dailyData = processDailyData();
  const totalCostUsd = logs.reduce((acc, log) => acc + (log.cost_usd || 0), 0);
  const totalCostTry = totalCostUsd * rate;
  const totalRequests = logs.length;
  const cacheHitRate =
    totalRequests > 0
      ? (logs.filter((l) => (l.cached_tokens || 0) > 0).length /
          totalRequests) *
        100
      : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getUsageTypeBadge = (type: string | null) => {
    switch (type) {
      case 'analysis':
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-400 border-blue-500/20"
          >
            Analiz
          </Badge>
        );
      case 'drafting':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          >
            Üretim
          </Badge>
        );
      case 'validation':
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-400 border-amber-500/20"
          >
            Denetleme
          </Badge>
        );
      case 'revision':
        return (
          <Badge
            variant="outline"
            className="bg-purple-500/10 text-purple-400 border-purple-500/20"
          >
            Revizyon
          </Badge>
        );
      default:
        return <Badge variant="secondary">{type || '-'}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-heading font-black tracking-tight text-white">
            AI Harcama Analizi
          </h1>
          <p className="text-muted-foreground font-sans">
            Yapay zeka modellerinin kullanım maliyetleri ve verimlilik raporu
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card/50 px-4 py-2 rounded-lg border border-border shadow-sm">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono font-medium text-white">
            1 USD ≈ {rate.toFixed(2)} TRY
          </span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bento-card card-hover bg-card/40 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-widest">
              Toplam Harcama
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-black text-white">
              {formatCurrency(totalCostTry)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground font-mono">
                ≈ ${totalCostUsd.toFixed(4)} USD
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bento-card card-hover bg-card/40 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-widest">
              Toplam İstek
            </CardTitle>
            <Cpu className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-black text-white">
              {totalRequests.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aktif çalışma süresince toplam çağrı
            </p>
          </CardContent>
        </Card>

        <Card className="bento-card card-hover bg-card/40 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-widest">
              Verimlilik (Cache)
            </CardTitle>
            <Zap className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-black text-white">
              %{cacheHitRate.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Önbelleğe alınmış token oranı
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart Section */}
      <Card className="bg-card/30 border-border shadow-2xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-card/20 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-heading font-bold text-white">
              Günlük Harcama Geçmişi (TRY)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div
            className="w-full overflow-hidden"
            style={{
              height: 350,
              minHeight: 350,
              width: '100%',
              position: 'relative',
            }}
          >
            {isMounted && dailyData.length > 0 && (
              <ResponsiveContainer
                key="analytics-chart"
                width="100%"
                height={350}
              >
                <AreaChart
                  data={dailyData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--primary)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--primary)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="oklch(0.3715 0 0 / 0.3)"
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    tickFormatter={(value) => `₺${value}`}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    dx={-5}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px -10px oklch(0 0 0 / 0.5)',
                      padding: '12px',
                    }}
                    itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                    labelStyle={{
                      color: 'white',
                      marginBottom: '4px',
                      fontWeight: 'bold',
                    }}
                    formatter={(value: number | undefined) => [
                      formatCurrency(value || 0),
                      'Harcama',
                    ]}
                    labelFormatter={(label, payload) =>
                      payload[0]?.payload?.fullDate || label
                    }
                    cursor={{
                      stroke: 'var(--primary)',
                      strokeWidth: 1,
                      strokeDasharray: '4 4',
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCost)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Section */}
      <Card className="bg-card/30 border-border shadow-lg">
        <CardHeader className="border-b border-border/40 bg-card/20 py-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg font-heading font-bold text-white">
              Son İşlemler
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-bold tracking-tighter"
          >
            Limit: 10,000 Kayıt
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-b border-border/40 hover:bg-muted/30">
                  <TableHead className="font-heading font-bold text-xs uppercase tracking-widest pl-6">
                    Tarih
                  </TableHead>
                  <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-center">
                    Tür
                  </TableHead>
                  <TableHead className="font-heading font-bold text-xs uppercase tracking-widest pl-10">
                    Model
                  </TableHead>
                  <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-right">
                    Token Detayı
                  </TableHead>
                  <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-right">
                    Süre
                  </TableHead>
                  <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-right pr-6">
                    Maliyet
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody
                style={{
                  opacity: isPending ? 0.7 : 1,
                  transition: 'opacity 200ms ease-in-out',
                }}
              >
                {logs.slice(0, visibleCount).map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-b border-border/20 hover:bg-primary/5 transition-colors group"
                  >
                    <TableCell className="pl-6 font-mono text-[14px] text-muted-foreground">
                      {log.created_at
                        ? format(new Date(log.created_at), 'dd MMM HH:mm', {
                            locale: tr,
                          })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {getUsageTypeBadge(log.usage_type)}
                    </TableCell>
                    <TableCell className="font-medium text-white text-sm pl-10">
                      {log.model}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col text-[11px] font-mono">
                        <span className="text-white font-bold">
                          {log.total_tokens?.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground opacity-60">
                          P:{log.prompt_tokens} / C:{log.completion_tokens} /
                          CH:{log.cached_tokens}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-muted-foreground">
                      {log.latency_ms
                        ? `${(log.latency_ms / 1000).toFixed(2)}s`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <span
                        className={`text-sm font-bold ${log.cost_usd === 0 ? 'text-emerald-400/50 ' : 'text-primary'}`}
                      >
                        {log.cost_usd === 0
                          ? 'Ücretsiz'
                          : formatCurrency((log.cost_usd || 0) * rate)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {logs.length > deferredVisibleCount && (
            <div className="p-6 border-t border-border/40 bg-card/10 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Use transition to prevent UI blocking when loading more data
                  startTransition(() => {
                    setVisibleCount((prev) => prev + 50);
                  });
                }}
                className="group flex items-center gap-2 hover:bg-primary/10 hover:text-primary transition-all duration-300 rounded-full px-8"
              >
                <ChevronDown className="h-4 w-4 group-hover:translate-y-1 transition-transform" />
                <span className="font-heading font-bold uppercase tracking-widest text-[11px]">
                  Daha Fazla Yükle ({logs.length - visibleCount})
                </span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
