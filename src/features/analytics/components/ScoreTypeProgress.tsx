import { FC } from 'react';
import { Globe, Layers, Info, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { calculateScoreTypeProgress } from '../logic/scoreCalculations';
import { CourseMastery } from '@/features/courses/types/courseTypes';
import { cn } from '@/utils/stringHelpers';
import { CardHeader } from '@/features/efficiency/components/CardElements';

interface ScoreTypeProgressProps {
  masteries: CourseMastery[];
}

export const ScoreTypeProgress: FC<ScoreTypeProgressProps> = ({
  masteries,
}) => {
  const scores = calculateScoreTypeProgress(masteries);

  const scoreTypes = [
    {
      id: 'p30',
      title: 'P30 (İdari)',
      description: 'Kaymakamlık ve İdari Yargı hedefi',
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
      title: 'P35 (Diplomatik)',
      description: 'Dışişleri ve Diplomasi kadroları',
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
      title: 'P48 (Genel Alan)',
      description: 'Müfettişlik ve Uzmanlık kadroları',
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

  return (
    <Card className="h-full flex flex-col p-6 overflow-hidden relative group">
      <CardHeader
        icon={Layers}
        iconColor="text-accent"
        iconBg="bg-accent/10"
        title="Hedef Puan Türleri"
        subtitle="Kariyer hedefine göre ilerleme durumu"
        action={
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-5 h-5 text-muted-foreground/30 hover:text-white transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px] text-[11px] leading-relaxed">
                  Puan türü oranları, Akıllı Müfredat Ustalığı'ndaki
                  ilerlemenizin ders ağırlıklarına göre harmanlanmasıyla
                  hesaplanır.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
      />

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
                  <p className="text-[10px] text-muted-foreground/60">
                    {type.description}
                  </p>
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
              {type.details.map((detail, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1 flex-1 min-w-[70px]"
                >
                  <div className="flex justify-between items-center text-[9px] uppercase tracking-wider font-bold text-muted-foreground/60">
                    <span>{detail.label}</span>
                    <span
                      className={cn(
                        detail.val >= 80
                          ? 'text-emerald-400'
                          : detail.val >= 40
                            ? 'text-amber-400'
                            : 'text-white/40'
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
    </Card>
  );
};
