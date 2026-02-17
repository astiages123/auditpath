import React, { useState } from 'react';
import { cn } from '@/utils/core';
import { FocusPowerTrendChart } from './charts/FocusPowerTrendChart';
import { FocusPowerPoint } from '../types/efficiencyTypes';

interface EfficiencyChartTabProps {
  weekData: FocusPowerPoint[];
  monthData: FocusPowerPoint[];
  allData: FocusPowerPoint[];
}

export const EfficiencyChartTab: React.FC<EfficiencyChartTabProps> = ({
  weekData,
  monthData,
  allData,
}) => {
  const [range, setRange] = useState<'week' | 'month' | 'all'>('week');

  const getData = () => {
    switch (range) {
      case 'week':
        return weekData;
      case 'month':
        return monthData;
      case 'all':
        return allData;
      default:
        return weekData;
    }
  };

  const getLabel = () => {
    switch (range) {
      case 'week':
        return 'Son 7 Gün';
      case 'month':
        return 'Son 30 Gün';
      case 'all':
        return 'Tüm Zamanlar';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4 bg-white/5 rounded-xl p-4 border border-white/5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Odak Gücü Trendi
          </h4>
          <span className="text-xs text-muted-foreground">
            {getLabel()} Performansı
          </span>
        </div>
        <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setRange('week')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              range === 'week'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-muted-foreground hover:text-white/80'
            )}
          >
            Hafta
          </button>
          <button
            onClick={() => setRange('month')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              range === 'month'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-muted-foreground hover:text-white/80'
            )}
          >
            Ay
          </button>
          <button
            onClick={() => setRange('all')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all',
              range === 'all'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-muted-foreground hover:text-white/80'
            )}
          >
            Tümü
          </button>
        </div>
      </div>

      <div className="h-[350px] w-full bg-black/10 rounded-lg border border-white/5 p-2">
        <FocusPowerTrendChart data={getData()} rangeLabel={range} />
      </div>
    </div>
  );
};
