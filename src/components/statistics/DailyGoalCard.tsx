"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { DailyStats } from "@/lib/client-db";
import { StatDetailModal } from "./StatDetailModal";

interface DailyGoalCardProps {
    data: DailyStats;
}

export function DailyGoalCard({ data }: DailyGoalCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (data.goalPercentage / 100) * circumference;

    const TrendIcon = data.trendPercentage > 0
        ? TrendingUp
        : data.trendPercentage < 0
            ? TrendingDown
            : Minus;

    const trendColor = data.trendPercentage > 0
        ? "text-primary"
        : data.trendPercentage < 0
            ? "text-destructive"
            : "text-muted-foreground";

    return (
        <>
            <div
                onClick={() => setIsModalOpen(true)}
                className="flex flex-col items-center justify-center h-full min-h-[320px]"
            >
                {/* Title */}
                <h3 className="text-lg font-semibold text-muted-foreground mb-6">
                    Günlük Hedef
                </h3>

                {/* Progress Ring */}
                <div className="relative">
                    <svg
                        width="220"
                        height="220"
                        viewBox="0 0 220 220"
                        className="transform -rotate-90"
                    >
                        {/* Background circle */}
                        <circle
                            cx="110"
                            cy="110"
                            r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="12"
                            className="text-muted/30"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="110"
                            cy="110"
                            r={radius}
                            fill="none"
                            stroke="url(#progressGradient)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000 ease-out"
                        />
                        <defs>
                            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="var(--primary)" />
                                <stop offset="100%" stopColor="var(--accent)" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-foreground">
                            {data.totalWorkMinutes}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            / {data.dailyGoal} dk
                        </span>
                        <span className="text-2xl font-semibold text-primary mt-1">
                            %{data.goalPercentage}
                        </span>
                    </div>
                </div>

                {/* Trend indicator */}
                <div className={`flex items-center gap-2 mt-6 ${trendColor}`}>
                    <TrendIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                        {data.trendPercentage > 0 && "+"}
                        {data.trendPercentage === 0
                            ? "Düne eşit"
                            : `Düne göre %${Math.abs(data.trendPercentage)} ${data.trendPercentage > 0 ? "daha verimli" : "daha az"
                            }`
                        }
                    </span>
                </div>
            </div>

            <StatDetailModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                title="Günlük İstatistikler"
            >
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1">
                            <p className="text-xs font-medium text-sky-500 uppercase tracking-widest">Çalışma</p>
                            <p className="text-2xl font-black text-foreground">{data.totalWorkMinutes} dk</p>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1">
                            <p className="text-xs font-medium text-emerald-500 uppercase tracking-widest">Mola</p>
                            <p className="text-2xl font-black text-foreground">{data.totalBreakMinutes} dk</p>
                        </div>
                        <div className="bg-slate-500/10 border border-slate-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Duraklatma</p>
                            <p className="text-2xl font-black text-foreground">{data.totalPauseMinutes} dk</p>
                        </div>
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1">
                            <p className="text-xs font-medium text-indigo-500 uppercase tracking-widest">İzleme</p>
                            <p className="text-2xl font-black text-foreground">{data.totalVideoMinutes} dk</p>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-1">
                            <p className="text-xs font-medium text-orange-500 uppercase tracking-widest">Pomodoro</p>
                            <p className="text-2xl font-black text-foreground">{data.totalCycles} Oturum</p>
                        </div>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-0.5">Tamamlanan Video</p>
                            <p className="text-sm text-muted-foreground">Bugünkü izleme performansı</p>
                        </div>
                        <p className="text-3xl font-black text-primary">{data.completedVideos}</p>
                    </div>
                </div>
            </StatDetailModal>
        </>
    );
}
