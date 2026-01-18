import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Award, CheckCircle2, TrendingUp } from "lucide-react";

interface CourseStatsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    courseName: string;
    totalVideos: number;
    completedVideos: number;
    totalHours: number;
    spentHours: number; // Pomodoro time
}

export function CourseStatsModal({
    open,
    onOpenChange,
    courseName,
    totalVideos,
    completedVideos,
    totalHours,
    spentHours
}: CourseStatsModalProps) {

    const efficiencyRatio = spentHours > 0 ? (completedVideos * (totalHours / totalVideos) / spentHours) : 0;
    const efficiencyPercent = Math.min(100, Math.round(efficiencyRatio * 100));

    // Dummy data for daily views
    const dailyViews = [4, 7, 2, 9, 5, 8, 3];
    const maxView = Math.max(...dailyViews);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-xl border-border/40">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-primary" />
                        {courseName} İstatistikleri
                    </DialogTitle>
                    <DialogDescription>
                        Bu dersteki haftalık performans ve verimlilik analiziniz.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                    {/* Efficiency Card */}
                    <Card className="col-span-2 bg-card/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Award className="w-4 h-4 text-amber-500" />
                                Verimlilik Analizi
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="text-3xl font-bold">%{efficiencyPercent}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Video süresine göre çalışma performansı
                                    </p>
                                </div>
                                <div className="text-right text-sm">
                                    <div className="text-emerald-500 font-medium">
                                        {spentHours.toFixed(1)} sa Çalışma
                                    </div>
                                    <div className="text-muted-foreground">
                                        / {(completedVideos * (totalHours / totalVideos)).toFixed(1)} sa İçerik
                                    </div>
                                </div>
                            </div>
                            {/* Simple Bar for Efficiency */}
                            <div className="h-2 w-full bg-secondary/50 rounded-full mt-3 overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 rounded-full transition-all"
                                    style={{ width: `${efficiencyPercent}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Progress Stats */}
                    <Card className="bg-card/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                İlerleme Durumu
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{completedVideos} / {totalVideos}</div>
                            <p className="text-xs text-muted-foreground">Tamamlanan Video</p>
                        </CardContent>
                    </Card>

                    {/* Time Stats */}
                    <Card className="bg-card/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Clock className="w-4 h-4 text-purple-500" />
                                Odaklanma Süresi
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{spentHours.toFixed(1)} sa</div>
                            <p className="text-xs text-muted-foreground">Toplam Pomodoro</p>
                        </CardContent>
                    </Card>

                    {/* Weekly Activity Chart (Simplified Visual) */}
                    <Card className="col-span-2 bg-card/50">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Haftalık Video İzleme
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between h-24 gap-2">
                                {dailyViews.map((val, i) => (
                                    <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 group">
                                        <div
                                            className="w-full bg-primary/20 group-hover:bg-primary/40 rounded-t-sm transition-all relative"
                                            style={{ height: `${(val / maxView) * 100}%` }}
                                        >
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                {val}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">
                                            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'][i]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
