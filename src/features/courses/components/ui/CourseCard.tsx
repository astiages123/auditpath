import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, CheckCircle2, BarChart2, FileText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { CourseStatsModal } from '../modals/CourseStatsModal';
import { ROUTES } from '@/config/routes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

interface CourseCardProps {
  id: string;
  courseId: string;
  name: string;
  instructor: string;
  totalVideos: number;
  totalHours: number;
  completedVideos?: number;
  completedMinutes?: number;
  variant?: 'default' | 'large' | 'featured';
}

export function CourseCard({
  courseId,
  name,
  instructor,
  totalVideos,
  totalHours,
  completedVideos = 0,
  completedMinutes = 0,
  variant = 'default',
}: CourseCardProps) {
  const [showStats, setShowStats] = useState(false);

  // Calculate progress
  const progressPercent =
    totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
  const isCompleted = completedVideos === totalVideos && totalVideos > 0;

  // Format hours to readable string
  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m} dk`;
    if (m === 0) return `${h} saat`;
    return `${h} saat ${m} dk`;
  };

  const sizeClasses = {
    default: 'h-full',
    large: 'h-full md:col-span-2',
    featured: 'h-full md:col-span-2 md:row-span-2',
  };

  const handleStatsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowStats(true);
  };

  return (
    <>
      <div className={sizeClasses[variant]}>
        <Card className="h-full group bg-card/50 border-border/50 hover:border-primary/30 hover:bg-card/80 transition-all duration-200 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {instructor}
                  </Badge>
                  <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {name}
                  </h3>
                </div>
                {isCompleted && (
                  <CheckCircle2
                    data-testid="completion-icon"
                    className="h-5 w-5 text-primary shrink-0"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  <span>{totalVideos} video</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatHours(totalHours)}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <Progress value={progressPercent} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {completedVideos}/{totalVideos} tamamlandı
                  </span>
                  <span className="font-medium text-foreground">
                    %{Math.round(progressPercent)}
                  </span>
                </div>
              </div>
            </CardContent>
          </div>

          <CardFooter className="pt-2 pb-4 px-6 flex items-center justify-end gap-2 border-t border-border/30 mt-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={`${ROUTES.NOTES}/${courseId}`}
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Ders Notları</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
                    onClick={handleStatsClick}
                  >
                    <BarChart2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>İstatistikler</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardFooter>
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
