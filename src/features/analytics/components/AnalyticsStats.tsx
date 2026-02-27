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
  // --- HESAPLAMALAR ---
  // Kullanıcının hissiyatını güçlendirmek için gerçekçi (matematiksel) bir tasarruf simülasyonu
  const isHighSavings = cacheHitRate > 50;

  // Eğer sistem %76 başarı gösterdiyse, demek ki ödediğimiz fatura (totalCostTry) aslında faturanın %24'ü.
  // Gerçek faturayı bulmak için: Ödenen / (1 - 0.76) = Ödenen / 0.24 = Gerçek Fatura
  const safeHitRate = Math.min(cacheHitRate, 99.9); // %100 veya sonsuzluk hatasını önlemek için
  const costWithoutCache = totalCostTry / Math.max(0.01, 1 - safeHitRate / 100);
  const savedMoney = Math.max(0, costWithoutCache - totalCostTry);
  // --- HESAPLAMALAR ---

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="bento-card card-hover bg-card border-primary/20">
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

      <Card className="bento-card card-hover bg-card border-primary/10">
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

      <Card
        className={cn(
          'bento-card card-hover bg-card border-primary/10 relative overflow-hidden',
          isHighSavings && 'border-emerald-500/30'
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
        <CardContent>
          <div
            className={cn(
              'text-3xl font-heading font-black',
              isHighSavings ? 'text-emerald-400' : 'text-white'
            )}
          >
            %{cacheHitRate.toFixed(1)}
          </div>

          <div className="mt-2 space-y-1">
            <p
              className={cn(
                'text-[11px] leading-tight font-medium',
                isHighSavings ? 'text-emerald-500' : 'text-muted-foreground'
              )}
            >
              Önbellek olmasaydı:{' '}
              <span className="line-through">
                {formatCurrency(costWithoutCache)}
              </span>{' '}
              ödeyecektiniz.
            </p>
            <div
              className={cn(
                'text-xs font-bold px-2 py-1 rounded inline-flex',
                isHighSavings
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-card border border-border'
              )}
            >
              Net Tasarruf: {formatCurrency(savedMoney)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Stats Row */}
      <Card className="bento-card card-hover bg-card border-primary/10">
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

      <Card className="bento-card card-hover bg-card border-primary/10">
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

      <Card className="bento-card card-hover bg-card border-primary/10">
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
