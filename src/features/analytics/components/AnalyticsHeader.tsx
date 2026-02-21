import { FC } from 'react';
import { DollarSign, ShieldCheck } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AnalyticsHeaderProps {
  rate: number;
  selectedModel: string;
  onModelChange: (model: string) => void;
  availableModels: string[];
}

export const AnalyticsHeader: FC<AnalyticsHeaderProps> = ({
  rate,
  selectedModel,
  onModelChange,
  availableModels,
}) => {
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
        {/* Sistem İstikrarı / API Health */}
        <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-emerald-500/70 font-bold leading-none">
              Sistem İstikrarı
            </span>
            <span className="text-sm font-mono font-medium text-emerald-400">
              %100
            </span>
          </div>
        </div>

        {/* Model Filtresi */}
        <div className="flex items-center gap-2 bg-card/50 pl-4 pr-2 py-2 rounded-lg border border-border shadow-sm">
          <div className="flex flex-col mr-2">
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger className="h-6 min-w-[120px] bg-transparent border-none p-0 text-sm font-medium text-white shadow-none focus:ring-0">
                <SelectValue placeholder="Tüm Modeller" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Modeller</SelectItem>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
