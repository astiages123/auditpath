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
                className="flex flex-col items-center justify-center h-full min-h-[320px] cursor-pointer"
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
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/30 rounded-xl p-4">
                            <p className="text-sm text-muted-foreground">Çalışma Süresi</p>
                            <p className="text-2xl font-bold">{data.totalWorkMinutes} dk</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-4">
                            <p className="text-sm text-muted-foreground">Mola Süresi</p>
                            <p className="text-2xl font-bold">{data.totalBreakMinutes} dk</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-4">
                            <p className="text-sm text-muted-foreground">Duraklatma</p>
                            <p className="text-2xl font-bold">{data.totalPauseMinutes} dk</p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-4">
                            <p className="text-sm text-muted-foreground">Video İzleme</p>
                            <p className="text-2xl font-bold">{data.totalVideoMinutes} dk</p>
                        </div>
                    </div>
                    <div className="bg-primary/10 rounded-xl p-4">
                        <p className="text-sm text-muted-foreground">Tamamlanan Video</p>
                        <p className="text-2xl font-bold text-primary">{data.completedVideos} adet</p>
                    </div>
                </div>
            </StatDetailModal>
        </>
    );
}
