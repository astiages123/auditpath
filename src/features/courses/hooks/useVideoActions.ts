import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useProgress } from '@/shared/hooks/useProgress';
import {
  toggleVideoProgress,
  toggleVideoProgressBatch,
} from '../services/videoService';

export interface VideoActionState {
  completed: boolean;
  videoNumber: number;
  durationMinutes: number;
}

export function useVideoActions(courseId: string, dbCourseId: string) {
  const { user } = useAuth();
  const { updateProgressOptimistically, refreshProgress } = useProgress();

  const handleToggleVideo = async (
    videos: VideoActionState[],
    targetVideoNumber: number,
    isModifierPressed: boolean
  ): Promise<VideoActionState[]> => {
    const targetVideo = videos.find((v) => v.videoNumber === targetVideoNumber);
    if (!targetVideo) return videos;

    const newCompleted = !targetVideo.completed;
    const previousVideos = [...videos];

    // 1. Calculate new state (Optimistic)
    let updatedVideos = [...videos];
    let videoIdListToUpdate: string[] = [];

    if (isModifierPressed) {
      // Toggle only specific video
      updatedVideos = updatedVideos.map((v) =>
        v.videoNumber === targetVideoNumber
          ? { ...v, completed: newCompleted }
          : v
      );
      videoIdListToUpdate = [targetVideoNumber.toString()];
    } else {
      // Recursive/Batch logic
      if (newCompleted) {
        // Complete all previous
        updatedVideos = updatedVideos.map((v) =>
          v.videoNumber <= targetVideoNumber ? { ...v, completed: true } : v
        );
        videoIdListToUpdate = videos
          .filter((v) => v.videoNumber <= targetVideoNumber && !v.completed)
          .map((v) => v.videoNumber.toString());
      } else {
        // Uncomplete all next
        updatedVideos = updatedVideos.map((v) =>
          v.videoNumber >= targetVideoNumber ? { ...v, completed: false } : v
        );
        videoIdListToUpdate = videos
          .filter((v) => v.videoNumber >= targetVideoNumber && v.completed)
          .map((v) => v.videoNumber.toString());
      }
    }

    // 2. Calculate Stats Changes
    let newlyCompletedCount = 0;
    let newlyRemovedCount = 0;
    let deltaMinutes = 0;

    updatedVideos.forEach((v) => {
      const oldV = previousVideos.find(
        (pv) => pv.videoNumber === v.videoNumber
      );
      if (!oldV) return;

      if (v.completed && !oldV.completed) {
        newlyCompletedCount++;
        deltaMinutes += v.durationMinutes;
      }
      if (!v.completed && oldV.completed) {
        newlyRemovedCount++;
        deltaMinutes -= v.durationMinutes;
      }
    });

    const deltaVideos = newlyCompletedCount - newlyRemovedCount;
    const deltaHours = deltaMinutes / 60;

    // 3. Optimistic Update in Progress Context
    updateProgressOptimistically(courseId, deltaVideos, deltaHours);

    // 4. Server Sync
    const userId = user?.id;
    try {
      if (!userId) {
        toast.error('İlerleme durumu kaydedilmesi için giriş yapmalısınız.');
        // Don't throw if just offline/anon, but here we require strict auth for saving
        // If we want offline support later, we'd save to local storage here.
        throw new Error('User not logged in');
      }

      if (videoIdListToUpdate.length === 1) {
        const videoNum = parseInt(videoIdListToUpdate[0]);
        if (!Number.isNaN(videoNum)) {
          await toggleVideoProgress(userId, dbCourseId, videoNum, newCompleted);
        }
      } else if (videoIdListToUpdate.length > 1) {
        const videoNumbers = videoIdListToUpdate
          .map((id) => parseInt(id))
          .filter((n) => !Number.isNaN(n));

        if (videoNumbers.length > 0) {
          await toggleVideoProgressBatch(
            userId,
            dbCourseId,
            videoNumbers,
            newCompleted
          );
        }
      }

      // Background refresh to ensure consistency
      refreshProgress();

      return updatedVideos;
    } catch (error) {
      logger.error('Failed to sync progress:', error as Error);
      // Revert optimistic update
      updateProgressOptimistically(courseId, -deltaVideos, -deltaHours);
      toast.error('İlerleme kaydedilemedi.');
      return previousVideos;
    }
  };

  return { handleToggleVideo };
}
