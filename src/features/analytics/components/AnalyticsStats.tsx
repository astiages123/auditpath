import { FC } from 'react';
import {
  TrendingUp,
  Cpu,
  Zap,
  Activity,
  HardDrive,
  Database,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsStatsProps {
  totalCostTry: number;
  totalCostUsd: number;
  totalRequests: number;
  cacheHitRate: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedTokens: number;
  formatCurrency: (value: number) => string;
}

export const AnalyticsStats: FC<AnalyticsStatsProps> = ({
  totalCostTry,
  totalCostUsd,
  totalRequests,
  cacheHitRate,
  totalInputTokens,
  totalOutputTokens,
  totalCachedTokens,
  formatCurrency,
}) => {
  return (
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

      {/* Token Stats Row */}
      <Card className="bento-card card-hover bg-card/40 border-primary/10">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-widest">
            Toplam Girdi (Prompt)
          </CardTitle>
          <Activity className="w-4 h-4 text-emerald-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-heading font-black text-white">
            {totalInputTokens.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tüm analizlerde gönderilen kelime
          </p>
        </CardContent>
      </Card>

      <Card className="bento-card card-hover bg-card/40 border-primary/10">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-widest">
            Toplam Çıktı (Completion)
          </CardTitle>
          <Database className="w-4 h-4 text-purple-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-heading font-black text-white">
            {totalOutputTokens.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Yapay zekanın ürettiği kelime
          </p>
        </CardContent>
      </Card>

      <Card className="bento-card card-hover bg-card/40 border-primary/10">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-widest">
            Toplam Cache (Tasarruf)
          </CardTitle>
          <HardDrive className="w-4 h-4 text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-heading font-black text-white">
            {totalCachedTokens.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Önbellekten ücretsiz sayılan kelime
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
