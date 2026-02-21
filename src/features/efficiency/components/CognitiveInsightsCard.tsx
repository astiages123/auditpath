import { GlassCard } from '@/shared/components/GlassCard';
import { Brain, AlertTriangle, Lightbulb, Zap } from 'lucide-react';
import { CardHeader } from './CardElements';
import { cn } from '@/utils/stringHelpers';

export interface CognitiveAnalysis {
  focusScore?: number;
  topConfused?: { text: string; count: number }[];
  recentInsights?: string[];
  criticalTopics?: { id: string; fails: number; diagnosis?: string }[];
  hasData?: boolean;
}

interface CognitiveInsightsCardProps {
  loading: boolean;
  cognitiveAnalysis: CognitiveAnalysis | null;
}

export const CognitiveInsightsCard = ({
  loading,
  cognitiveAnalysis,
}: CognitiveInsightsCardProps) => {
  if (loading) {
    return (
      <GlassCard className="h-full flex items-center justify-center p-6 min-h-[300px]">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Brain className="w-8 h-8 text-white/20" />
          <span className="text-sm text-muted-foreground/50">
            Analizler yükleniyor...
          </span>
        </div>
      </GlassCard>
    );
  }

  const { focusScore, topConfused, recentInsights, criticalTopics, hasData } =
    cognitiveAnalysis || {};

  if (!hasData || (!topConfused?.length && !recentInsights?.length)) {
    return (
      <GlassCard className="h-full flex flex-col p-6 min-h-[300px]">
        <CardHeader
          icon={Brain}
          iconColor="text-accent"
          iconBg="bg-accent/10"
          title="Bilişsel Sağlık"
          subtitle="Öğrenme analizi ve öneriler"
        />
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 pt-4">
          <div className="p-4 bg-white/5 rounded-full ring-1 ring-white/10">
            <Brain className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <h3 className="text-base font-medium text-white/90">
              Zekanı Konuştur!
            </h3>
            <p className="text-sm text-muted-foreground/60 leading-relaxed">
              İlk quizlerini tamamladığında yapay zeka destekli bilişsel
              analizlerin burada belirecek.
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="h-full flex flex-col p-6 min-h-[300px]">
      <div className="flex justify-between items-start mb-6">
        <CardHeader
          icon={Brain}
          iconColor="text-accent"
          iconBg="bg-accent/10"
          title="Bilişsel Sağlık & Teşhis"
          subtitle="Kavram yanılgıları ve gelişim alanları"
        />
        <div className="flex flex-col items-end">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">
            Odak Puanı
          </div>
          <div
            className={cn(
              'text-2xl font-black font-heading',
              (focusScore || 0) >= 80
                ? 'text-emerald-400'
                : (focusScore || 0) >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400'
            )}
          >
            {focusScore}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        {/* 1. Scaffolding / Critical Focus */}
        {criticalTopics && criticalTopics.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-widest">
              <AlertTriangle className="w-3.5 h-3.5" />
              KRİTİK ODAK ALANLARI
            </div>
            <div className="space-y-2">
              {criticalTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex gap-3"
                >
                  <div className="mt-0.5 min-w-[4px] h-full bg-rose-500 rounded-full" />
                  <div>
                    <p className="text-xs text-rose-200 font-medium mb-0.5">
                      Tekrarlayan Hata ({topic.fails}x)
                    </p>
                    <p className="text-sm text-white/90 line-clamp-2">
                      {topic.diagnosis ||
                        'Bu konuda zorlandığınız tespit edildi. Destek mekanizması devrede.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Confusion Tracker */}
        {topConfused && topConfused.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5" />
              KAVRAM YANILGILARI
            </div>
            <div className="grid grid-cols-1 gap-2">
              {topConfused.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white/3 border border-white/5 hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm text-white/80 line-clamp-1">
                    {item.text}
                  </span>
                  {item.count > 1 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground font-mono">
                      {item.count} kez
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Recent Insights */}
        {recentInsights && recentInsights.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-widest">
              <Lightbulb className="w-3.5 h-3.5" />
              SON ZEKÂ NOTLARI
            </div>
            <div className="space-y-2">
              {recentInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/10 text-sm text-sky-100/80 leading-relaxed italic"
                >
                  "{insight}"
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};
