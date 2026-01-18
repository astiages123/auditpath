"use client";

import { useState } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import type { EfficiencyData } from "@/lib/client-db";
import { StatDetailModal } from "./StatDetailModal";

interface EfficiencyCardProps {
    data: EfficiencyData;
}

export function EfficiencyCard({ data }: EfficiencyCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const maxValue = Math.max(data.videoMinutes, data.pomodoroMinutes, 1);
    const videoPercentage = (data.videoMinutes / maxValue) * 100;
    const pomodoroPercentage = (data.pomodoroMinutes / maxValue) * 100;

    return (
        <>
            <div
                onClick={() => setIsModalOpen(true)}
                className="flex flex-col h-full cursor-pointer"
            >
                {/* Title with alarm icon */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-muted-foreground">
                        Verimlilik
                    </h3>
                    {data.isAlarm && (
                        <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
                    )}
                </div>

                {/* Ratio display */}
                <div className="flex-1 flex flex-col justify-center items-center">
                    <div className={`text-5xl font-bold ${data.isAlarm ? "text-destructive" : "text-primary"}`}>
                        {data.ratio > 0 ? `${data.ratio}x` : "-"}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                        Öğrenme Katsayısı
                    </p>

                    {/* Alarm message */}
                    {data.isAlarm && (
                        <div className="mt-4 px-3 py-2 bg-destructive/20 border border-destructive/50 rounded-lg">
                            <p className="text-sm text-destructive font-medium flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Verimlilik Alarmı
                            </p>
                        </div>
                    )}
                </div>

                {/* Bar comparison */}
                <div className="space-y-3 mt-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Video Süresi</span>
                            <span className="font-medium">{data.videoMinutes} dk</span>
                        </div>
                        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent rounded-full transition-all duration-500"
                                style={{ width: `${videoPercentage}%` }}
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Pomodoro Süresi</span>
                            <span className="font-medium">{data.pomodoroMinutes} dk</span>
                        </div>
                        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${data.isAlarm ? "bg-destructive" : "bg-primary"
                                    }`}
                                style={{ width: `${pomodoroPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <StatDetailModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                title="Verimlilik Detayları"
            >
                <div className="space-y-4">
                    <div className="bg-muted/30 rounded-xl p-4">
                        <p className="text-sm text-muted-foreground">Net Video Süresi</p>
                        <p className="text-2xl font-bold">{data.videoMinutes} dakika</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Bugün tamamlanan videoların toplam süresi
                        </p>
                    </div>

                    <div className="bg-muted/30 rounded-xl p-4">
                        <p className="text-sm text-muted-foreground">Pomodoro Çalışma Süresi</p>
                        <p className="text-2xl font-bold">{data.pomodoroMinutes} dakika</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Bugün çalışarak geçirilen toplam süre
                        </p>
                    </div>

                    <div className={`rounded-xl p-4 ${data.isAlarm ? "bg-destructive/20" : "bg-primary/20"}`}>
                        <p className="text-sm text-muted-foreground">Öğrenme Katsayısı</p>
                        <p className={`text-3xl font-bold ${data.isAlarm ? "text-destructive" : "text-primary"}`}>
                            {data.ratio > 0 ? `${data.ratio}x` : "-"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {data.isAlarm
                                ? "⚠️ Katsayı 3.0x üzerinde"
                                : data.ratio > 0
                                    ? "✓ Verimli çalışma"
                                    : "Henüz veri yok"
                            }
                        </p>
                    </div>

                    <div className="bg-muted/20 rounded-xl p-4 text-sm text-muted-foreground">
                        <p className="font-medium mb-2 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Nasıl Hesaplanır?
                        </p>
                        <p>
                            Öğrenme Katsayısı = Pomodoro Süresi ÷ Video Süresi
                        </p>
                        <p className="mt-2">
                            İdeal oran 1.5x - 2.5x arasındadır. 3.0x üzeri değerler
                            aşırı mola veya odaklanma sorunu işaret edebilir.
                        </p>
                    </div>
                </div>
            </StatDetailModal>
        </>
    );
}
