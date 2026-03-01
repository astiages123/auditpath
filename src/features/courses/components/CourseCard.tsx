import { useState } from 'react';
import { cn } from '@/utils/stringHelpers';
import { Play, Clock, FileText, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CourseStatsModal } from './CourseStatsModal';
import { formatDuration } from '@/utils/dateUtils';

interface CourseCardProps {
  id: string;
  courseId: string;
  name: string;
  instructor?: string;
  totalVideos: number;
  totalHours: number;
  completedVideos?: number;
  completedMinutes?: number;
  variant?: 'default' | 'large' | 'featured';
  type?: string;
  totalPages?: number;
}

export function CourseCard({
  courseId: _courseId,
  name,
  instructor,
  totalVideos,
  totalHours,
  completedVideos = 0,
  completedMinutes = 0,
  variant = 'default',
  type = 'video',
  totalPages,
}: CourseCardProps) {
  const [showStats, setShowStats] = useState(false);

  // Determine if we should hide page count based on common course markers if slug is not available
  // But wait, it's better to just pass it or check something else.
  // For now, I'll just add totalPages and show it if it's reading type.

  // Calculate progress
  const progressPercent =
    totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

  const sizeClasses = {
    default: 'h-full',
    large: 'h-full md:col-span-2',
    featured: 'h-full md:col-span-2 md:row-span-2',
  };

  return (
    <>
      <div className={sizeClasses[variant]}>
        <Card className="h-full group bg-card/50 border-border/50 hover:border-primary/30 hover:bg-card/80 transition-all duration-200 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 px-5 pt-5">
              <div className="flex items-center gap-4">
                {/* Column 1: Badge/Instructor (Acts as Icon/Source) */}
                <div className="shrink-0">
                  <Badge
                    variant="secondary"
                    className="h-10 px-3 flex items-center justify-center text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20"
                  >
                    {instructor ? instructor.charAt(0) : name.charAt(0)}
                  </Badge>
                </div>

                {/* Column 2: Name + Stats */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 overflow-x-auto no-scrollbar scrollbar-hide">
                    <div className="flex items-center gap-1 flex-1 min-w-0 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {type === 'reading' ? (
                        <BookOpen className="h-3 w-3 shrink-0" />
                      ) : (
                        <Play className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">
                        {totalVideos} {type === 'reading' ? 'Konu' : 'Video'}
                      </span>
                    </div>
                    {type === 'reading' ? (
                      totalPages ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <FileText className="h-3 w-3 shrink-0" />
                          <span>{totalPages} Sayfa</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <FileText className="h-3 w-3 shrink-0" />
                          <span>Tahmini {Math.round(totalHours)} Saat</span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{formatDuration(totalHours)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 3: Progress % */}
                <div className="text-right shrink-0">
                  <span className="text-lg font-black text-foreground ml-auto">
                    %{Math.round(progressPercent)}
                  </span>
                  <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter mt-0.5">
                    İlerleme
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-5">
              {/* Progress Bar - Full Width at Bottom */}
              <div className="mt-4">
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${progressPercent}%` }}
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      'bg-primary'
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>

      <CourseStatsModal
        open={showStats}
        onOpenChange={(open: boolean) => setShowStats(open)}
        courseName={name}
        totalVideos={totalVideos}
        completedVideos={completedVideos}
        totalHours={totalHours}
        spentHours={completedMinutes ? completedMinutes / 60 : 0} // Using completedMinutes as proxy for spent time for now
      />
    </>
  );
}
