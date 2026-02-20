import { FC } from 'react';
import { DollarSign } from 'lucide-react';

interface AnalyticsHeaderProps {
  rate: number;
}

export const AnalyticsHeader: FC<AnalyticsHeaderProps> = ({ rate }) => {
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
      <div className="flex items-center gap-2 bg-card/50 px-4 py-2 rounded-lg border border-border shadow-sm">
        <DollarSign className="w-4 h-4 text-primary" />
        <span className="text-sm font-mono font-medium text-white">
          1 USD ≈ {rate.toFixed(2)} TRY
        </span>
      </div>
    </div>
  );
};
