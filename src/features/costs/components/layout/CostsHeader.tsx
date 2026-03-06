// IMPORTS

import { FC } from 'react';
import { DollarSign, Brain } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// INTERFACES

interface CostsHeaderProps {
  usdTryRate: number | null;
  selectedModel: string | 'all';
  onModelChange: (model: string) => void;
  availableModels: string[];
  title: string;
  subtitle?: string;
}

// COMPONENT

export const CostsHeader: FC<CostsHeaderProps> = ({
  usdTryRate,
  selectedModel,
  onModelChange,
  availableModels,
  title,
  subtitle,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 mb-4 border-b border-border/40 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* Title Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {/* Stats/Controls Section */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Model Selection Box */}
        <div className="group flex items-center gap-4 bg-card/40 backdrop-blur-sm px-6 h-16 rounded-2xl border border-white/5 shadow-lg transition-all hover:bg-card/60 hover:border-white/10">
          <div className="bg-blue-500/20 p-2.5 rounded-xl border border-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
            <Brain className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex flex-col items-start justify-center">
            <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider leading-none mb-1.5 opacity-70">
              SEÇİLİ MODEL
            </span>
            <Select value={selectedModel ?? ''} onValueChange={onModelChange}>
              <SelectTrigger className="h-6 min-w-[140px] bg-transparent border-none p-0 text-[15px] font-semibold text-white shadow-none focus:ring-0 focus-visible:ring-0 focus:outline-none hover:text-blue-400 transition-colors">
                <SelectValue placeholder="Tüm Modeller" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
                <SelectItem
                  value="all"
                  className="focus:bg-blue-500/20 focus:text-blue-200 transition-colors"
                >
                  Tüm Modeller
                </SelectItem>

                {availableModels.length === 0 ? (
                  <div className="px-2 py-3 text-xs italic text-muted-foreground/60 border-t border-white/5 mt-1">
                    Henüz kullanılan başka bir model yok
                  </div>
                ) : (
                  availableModels.map((model) => (
                    <SelectItem
                      key={model}
                      value={model}
                      className="focus:bg-blue-500/20 focus:text-blue-200 transition-colors"
                    >
                      {model}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Exchange Rate Box */}
        <div className="group flex items-center gap-4 bg-card/40 backdrop-blur-sm px-6 h-16 rounded-2xl border border-white/5 shadow-lg transition-all hover:bg-card/60 hover:border-white/10">
          <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex flex-col items-start justify-center">
            <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider leading-none mb-1.5 opacity-70">
              USD / TRY
            </span>
            <span className="text-[15px] font-mono font-bold text-white leading-tight">
              {usdTryRate === null
                ? 'Kur verisi yok'
                : `1 USD ≈ ${usdTryRate.toFixed(2)} TRY`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
