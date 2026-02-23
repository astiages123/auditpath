import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import TitleRoadmap from './TitleRoadmap';
import { useProgress } from '@/shared/hooks/useProgress';
// React imports removed as they were unused
// getRanks unused import removed

interface JourneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JourneyModal({ open, onOpenChange }: JourneyModalProps) {
  const { stats, isLoading } = useProgress();

  const completedVideos = stats?.completedVideos ?? 0;
  const totalVideos = stats?.totalVideos ?? 0;
  const percentage =
    totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] bg-background/95 backdrop-blur-md border-border/50 p-4 sm:p-6 overflow-y-auto">
        <DialogHeader className="mb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                Unvan Yolculuğu
              </DialogTitle>
              <DialogDescription className="text-sm">
                {isLoading ? (
                  'Yükleniyor...'
                ) : (
                  <>
                    İzlenen:{' '}
                    <span className="text-primary font-medium">
                      {completedVideos} / {totalVideos}
                    </span>{' '}
                    video
                    {totalVideos > 0 && ` (%${percentage})`}
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="relative">
          {!isLoading && stats && (
            <TitleRoadmap
              watchedVideos={completedVideos}
              requiredVideos={totalVideos}
            />
          )}
          {isLoading && (
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full size-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
