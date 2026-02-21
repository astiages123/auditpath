import { FC } from 'react';
import { DollarSign, Activity } from 'lucide-react';

interface ApiLog {
  status?: number | null;
}

interface AnalyticsHeaderProps {
  rate: number;
  logs: ApiLog[];
}

export const AnalyticsHeader: FC<AnalyticsHeaderProps> = ({
  rate,
  logs = [],
}) => {
  // --- HESAPLAMA BAŞLANGICI ---
  const totalLogs = logs.length;
  const rateLimitedCount = logs.filter((l) => l.status === 429).length;
  const successCount = logs.filter((l) => l.status === 200).length;

  // 429'ları (hız sınırı) denklemden çıkarıyoruz ki başarı oranını aşağı çekmesinler
  const adjustedTotal = totalLogs - rateLimitedCount;
  const successPercentage =
    adjustedTotal > 0 ? ((successCount / adjustedTotal) * 100).toFixed(1) : '0';
  // --- HESAPLAMA BİTİŞİ ---

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
      <div className="space-y-1">
        <h1 className="text-4xl font-heading font-black tracking-tight text-white">
          AI Harcama Analizi
        </h1>
        <p className="text-muted-foreground font-sans">
          Yapay zeka modellerinin kullanım maliyetleri ve verimlilik raporu
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Başarı Oranı - 429'lardan etkilenmeyen temiz veri */}
        <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 shadow-sm">
          <Activity className="w-4 h-4 text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-emerald-500/70 font-bold leading-none">
              Sistem Başarısı
            </span>
            <span className="text-sm font-mono font-medium text-emerald-400">
              %{successPercentage}
            </span>
          </div>
        </div>

        {/* Kur Bilgisi */}
        <div className="flex items-center gap-2 bg-card/50 px-4 py-2 rounded-lg border border-border shadow-sm">
          <DollarSign className="w-4 h-4 text-primary" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-bold leading-none">
              Güncel Kur
            </span>
            <span className="text-sm font-mono font-medium text-white">
              1 USD ≈ {rate.toFixed(2)} TRY
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
