// ==========================================
// IMPORTS
// ==========================================

import { FC, lazy, Suspense, useState } from 'react';
import { Globe, Layers, Info, Building2, Maximize2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/utils/stringHelpers';

import { calculateScoreTypeProgress } from '@/features/analytics/logic/scoreCalculations';
import { CourseMastery } from '@/features/courses/types/courseTypes';
import { StatisticsCard } from '@/features/efficiency/components/cards/StatisticsCard';
const ScoreTypeRadarModal = lazy(() =>
  import('@/features/analytics/components/modals/ScoreTypeRadarModal').then(
    (module) => ({
      default: module.ScoreTypeRadarModal,
    })
  )
);

// ==========================================
// INTERFACES
// ==========================================

interface ScoreTypeProgressProps {
  masteries: CourseMastery[];
}

// ==========================================
// COMPONENT
// ==========================================

export const ScoreTypeProgress: FC<ScoreTypeProgressProps> = ({
  masteries,
}) => {
  // === STATE ===
  const [isModalOpen, setIsModalOpen] = useState(false);

  // === CALCULATIONS ===
  const scores = calculateScoreTypeProgress(masteries);

  const scoreTypes = [
    {
      id: 'p30',
      title: 'P30',
      value: scores.p30,
      icon: Building2,
      color: 'text-blue-400',
      details: [
        { label: 'Kamu Yön.', val: scores.details.p30.ky },
        { label: 'Hukuk', val: scores.details.p30.hukuk },
        {
          label: 'GY/GK',
          val: (scores.details.p30.gy + scores.details.p30.gk) / 2,
        },
      ],
    },
    {
      id: 'p35',
      title: 'P35',
      value: scores.p35,
      icon: Globe,
      color: 'text-emerald-400',
      details: [
        { label: 'Ulus. İliş.', val: scores.details.p35.ui },
        { label: 'Hukuk', val: scores.details.p35.hukuk },
        {
          label: 'GY/GK',
          val: (scores.details.p35.gy + scores.details.p35.gk) / 2,
        },
      ],
    },
    {
      id: 'p48',
      title: 'P48',
      value: scores.p48,
      icon: Layers,
      color: 'text-amber-400',
      details: [
        { label: 'Hukuk', val: scores.details.p48.hukuk },
        { label: 'İktisat', val: scores.details.p48.iktisat },
        { label: 'Maliye', val: scores.details.p48.maliye },
        { label: 'Muhasebe', val: scores.details.p48.muhasebe },
      ],
    },
  ];

  // === RENDER ===
  return (
    <StatisticsCard
      title="Hedef Puan Türleri"
      subtitle="Kariyer hedefine göre ilerleme durumu"
      icon={Layers}
      onClick={() => setIsModalOpen(true)}
      action={
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] text-[11px] leading-relaxed bg-popover border-border">
                Puan türü oranları, Akıllı Müfredat Ustalığı'ndaki ilerlemenizin
                ders ağırlıklarına göre harmanlanmasıyla hesaplanır.
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Maximize2 className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] text-[11px] leading-relaxed bg-popover border-border">
                Puan türü analizi ve radarı görmek için tıklayın.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      }
    >
      <div className="flex-1 space-y-5 mt-6">
        {scoreTypes.map((type) => (
          <div
            key={type.id}
            className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl group/item hover:bg-zinc-900/60 transition-all"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                  <type.icon className={cn('w-4 h-4', type.color)} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white/90 leading-tight">
                    {type.title}
                  </h4>
                </div>
              </div>
              <span className="text-lg font-black text-white/90">
                %{Math.round(type.value)}
              </span>
            </div>

            {/* Main Progress Bar */}
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-4">
              <div
                className={cn(
                  'h-full transition-all duration-1000 ease-out',
                  type.color.replace('text-', 'bg-')
                )}
                style={{ width: `${type.value}%` }}
              />
            </div>

            {/* Area Details */}
            <div className="flex flex-wrap gap-2">
              {type.details.map((detail) => (
                <div
                  key={detail.label}
                  className="flex flex-col gap-1 flex-1 min-w-[70px]"
                >
                  <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-foreground">
                    <span>{detail.label}</span>
                    <span
                      className={cn(
                        detail.val >= 80
                          ? 'text-emerald-400'
                          : detail.val >= 40
                            ? 'text-amber-400'
                            : 'text-foreground'
                      )}
                    >
                      %{Math.round(detail.val)}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full opacity-60',
                        detail.val >= 80
                          ? 'bg-emerald-500'
                          : detail.val >= 40
                            ? 'bg-amber-500'
                            : 'bg-white/20'
                      )}
                      style={{ width: `${detail.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <Suspense fallback={null}>
          <ScoreTypeRadarModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            data={{
              p30: scores.p30,
              p35: scores.p35,
              p48: scores.p48,
            }}
          />
        </Suspense>
      )}
    </StatisticsCard>
  );
};
