import { useState } from "react";
import { Zap, Clock, RotateCcw, Pause } from "lucide-react";
import type { DailyEfficiencySummary } from "@/shared/lib/core/client-db";
import { DailyDetailedAnalysisModal } from "@/features/statistics";
import { formatTimeFromSeconds } from "@/shared/lib/utils/formatters";

interface MasterEfficiencyCardProps {
  data: DailyEfficiencySummary;
  userId?: string;
}

export function MasterEfficiencyCard({ data, userId }: MasterEfficiencyCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get efficiency score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreBgGlow = (score: number) => {
    if (score >= 80) return "shadow-emerald-500/20";
    if (score >= 50) return "shadow-amber-500/20";
    return "shadow-red-500/20";
  };

  const getScoreRingColor = (score: number) => {
    if (score >= 80) return "border-emerald-500/30";
    if (score >= 50) return "border-amber-500/30";
    return "border-red-500/30";
  };

  const scoreColor = getScoreColor(data.efficiencyScore);
  const scoreBgGlow = getScoreBgGlow(data.efficiencyScore);
  const scoreRingColor = getScoreRingColor(data.efficiencyScore);

  const hasData = data.netWorkTimeSeconds > 0 || data.sessions.length > 0;

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="group relative w-full h-full flex flex-col md:flex-row items-center justify-between gap-8 cursor-pointer"
      >
        {/* Left Section: Score Circle */}
        <div className="flex items-center gap-8">
          <div className={`relative flex items-center justify-center w-32 h-32 md:w-36 md:h-36 rounded-full border-4 ${scoreRingColor} bg-background/50 backdrop-blur-sm shadow-2xl ${scoreBgGlow} transition-all duration-500 group-hover:scale-105`}>
            {/* Background Glow */}
            <div className={`absolute inset-0 rounded-full bg-linear-to-br from-white/5 to-transparent`} />
            
            {/* Score */}
            <div className="relative flex flex-col items-center">
              <span className={`text-5xl md:text-6xl font-black tracking-tighter ${scoreColor} transition-colors`}>
                {hasData ? data.efficiencyScore : "—"}
              </span>
              {hasData && (
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mt-1">
                  Verimlilik
                </span>
              )}
            </div>
          </div>

          {/* Title Section */}
          <div className="hidden md:block">
            <div className="flex items-center gap-2 mb-2">
              <Zap className={`w-5 h-5 ${scoreColor}`} />
              <h3 className="text-lg font-bold text-foreground">
                Günlük Verimlilik Özeti
              </h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              {hasData 
                ? "Bugünkü çalışma performansınızın detaylı analizi için tıklayın." 
                : "Henüz bugün için çalışma verisi bulunmuyor."}
            </p>
          </div>
        </div>

        {/* Right Section: Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {/* Total Cycles */}
          <div className="flex flex-col items-center md:items-start gap-1 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-indigo-300" />
              </div>
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                Tur
              </span>
            </div>
            <span className="text-xl font-black text-white">
              {data.totalCycles}
            </span>
          </div>

          {/* Net Work Time */}
          <div className="flex flex-col items-center md:items-start gap-1 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-sky-300" />
              </div>
              <span className="text-[10px] font-black text-sky-300 uppercase tracking-widest">
                Çalışma
              </span>
            </div>
            <span className="text-xl font-black text-white">
              {formatTimeFromSeconds(data.netWorkTimeSeconds)}
            </span>
          </div>

          {/* Break Time */}
          <div className="flex flex-col items-center md:items-start gap-1 p-4 rounded-2xl bg-slate-500/10 border border-slate-500/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-500/20 flex items-center justify-center">
                <Pause className="w-4 h-4 text-slate-300" />
              </div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Mola
              </span>
            </div>
            <span className="text-xl font-black text-white">
              {formatTimeFromSeconds(data.totalBreakTimeSeconds)}
            </span>
          </div>

          {/* Pause Count */}
          <div className="flex flex-col items-center md:items-start gap-1 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Pause className="w-4 h-4 text-orange-300" />
              </div>
              <span className="text-[10px] font-black text-orange-300 uppercase tracking-widest">
                Duraksama
              </span>
            </div>
            <span className="text-2xl font-black text-white">
              {data.pauseCount}
            </span>
          </div>
        </div>
        </div>

      <DailyDetailedAnalysisModal
        open={isModalOpen}
        onOpenChange={(open: boolean) => setIsModalOpen(open)}
        data={data}
        userId={userId}
      />
    </>
  );
}
