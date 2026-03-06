// IMPORTS

import { FC } from 'react';
import {
  TrendingUp,
  Cpu,
  Activity,
  HardDrive,
  Database,
  PiggyBank,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/stringHelpers';

// INTERFACES

interface CostsStatsProps {
  totalCostTry: number | null;
  totalCostUsd: number;
  totalRequests: number;
  cacheHitRate: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedTokens: number;
  formatCurrency: (value: number) => string;
}

// COMPONENT

export const CostsStats: FC<CostsStatsProps> = ({
  totalCostTry,
  totalCostUsd,
  totalRequests,
  cacheHitRate,
  totalInputTokens,
  totalOutputTokens,
  totalCachedTokens,
  formatCurrency,
}) => {
  // Kullanıcının hissiyatını güçlendirmek için gerçekçi (matematiksel) bir tasarruf simülasyonu
  const isHighSavings = cacheHitRate > 50;
  const safeHitRate = Math.min(cacheHitRate, 99.9);
  const costWithoutCache =
    totalCostTry === null
      ? null
      : totalCostTry / Math.max(0.01, 1 - safeHitRate / 100);
  const savedMoney =
    totalCostTry === null || costWithoutCache === null
      ? null
      : Math.max(0, costWithoutCache - totalCostTry);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* 1. KART */}
      <Card className="flex flex-col relative overflow-hidden bento-card bg-card border-primary/10 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-widest">
            Toplam Harcama
          </CardTitle>
          <TrendingUp className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent className="flex flex-col flex-1">
          <div className="text-3xl font-heading font-black text-white">
            {totalCostTry === null ? '-' : formatCurrency(totalCostTry)}
          </div>
          <div className="flex items-center gap-2 mt-auto pt-2">
            <span className="text-xs text-muted-foreground font-mono">
              ≈ ${totalCostUsd.toFixed(4)} USD
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. KART */}
      <Card className="flex flex-col relative overflow-hidden bento-card bg-card border-primary/10 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-widest">
            Toplam İstek
          </CardTitle>
          <Cpu className="w-4 h-4 text-blue-400" />
        </CardHeader>
        <CardContent className="flex flex-col flex-1">
          <div className="text-3xl font-heading font-black text-white">
            {totalRequests.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-auto pt-2">
            <p className="text-xs text-muted-foreground">
              Aktif çalışma süresince toplam çağrı
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. KART */}
      <Card
        className={cn(
          'flex flex-col relative overflow-hidden bento-card bg-card border-primary/10 hover:border-primary/20 hover:shadow-lg transition-all duration-300',
          isHighSavings && 'border-emerald-500/30 hover:border-emerald-500/50'
        )}
      >
        {/* Background glow for high savings */}
        {isHighSavings && (
          <div className="absolute top-0 right-0 p-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -z-10 -mr-16 -mt-16 pointer-events-none" />
        )}

        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle
            className={cn(
              'text-sm font-heading font-bold uppercase tracking-widest',
              isHighSavings ? 'text-emerald-500/80' : 'text-muted-foreground'
            )}
          >
            Token Tasarrufu
          </CardTitle>
          <PiggyBank
            className={cn(
              'w-4 h-4',
              isHighSavings ? 'text-emerald-500' : 'text-amber-400'
            )}
          />
        </CardHeader>
        <CardContent className="flex flex-col flex-1">
          <div
            className={cn(
              'text-3xl font-heading font-black',
              isHighSavings ? 'text-emerald-400' : 'text-white'
            )}
          >
            %{cacheHitRate.toFixed(1)}
          </div>

          <div className="flex flex-row items-center justify-between gap-2 mt-auto pt-2">
            <span
              className={cn(
                'text-xs font-medium',
                isHighSavings ? 'text-emerald-500' : 'text-muted-foreground'
              )}
            >
              Net Tasarruf:{' '}
              {savedMoney === null ? '-' : formatCurrency(savedMoney)}
            </span>
            <span className="text-[11px] text-muted-foreground line-through">
              {costWithoutCache === null
                ? '-'
                : formatCurrency(costWithoutCache)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. KART */}
      <Card className="flex flex-col relative overflow-hidden bento-card bg-card border-primary/10 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-widest">
            Toplam Girdi
          </CardTitle>
          <Activity className="w-4 h-4 text-emerald-400" />
        </CardHeader>
        <CardContent className="flex flex-col flex-1">
          <div className="text-3xl font-heading font-black text-white">
            {totalInputTokens.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-auto pt-2">
            <p className="text-xs text-muted-foreground">
              Tüm analizlerde gönderilen kelime
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 5. KART */}
      <Card className="flex flex-col relative overflow-hidden bento-card bg-card border-primary/10 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-widest">
            Toplam Çıktı
          </CardTitle>
          <Database className="w-4 h-4 text-purple-400" />
        </CardHeader>
        <CardContent className="flex flex-col flex-1">
          <div className="text-3xl font-heading font-black text-white">
            {totalOutputTokens.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-auto pt-2">
            <p className="text-xs text-muted-foreground">
              Yapay zekanın ürettiği kelime
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 6. KART */}
      <Card className="flex flex-col relative overflow-hidden bento-card bg-card border-primary/10 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-heading font-bold text-muted-foreground uppercase tracking-widest">
            Toplam Cache
          </CardTitle>
          <HardDrive className="w-4 h-4 text-amber-400" />
        </CardHeader>
        <CardContent className="flex flex-col flex-1">
          <div className="text-3xl font-heading font-black text-white">
            {totalCachedTokens.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-auto pt-2">
            <p className="text-xs text-muted-foreground">
              Önbellekten ücretsiz sayılan kelime
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
