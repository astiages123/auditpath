import {
  getVideoProgress,
  toggleVideoProgress,
  toggleVideoProgressBatch,
} from '../lib/courses-logic';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import { logger } from '@/shared/utils/logger';
import { Loader2, Check, Circle } from 'lucide-react';

interface Video {
  id: number;
  videoNumber: number;
  title: string;
  duration: string;
  durationMinutes: number;
  completed: boolean;
}

interface VideoListProps {
  courseId: string;
  dbCourseId: string;
  categoryColor: string;
}

// Load videos from courses.json (already bundled)
import coursesData from '@/features/courses/data/courses.json';

interface CourseData {
  id: string;
  name: string;
  instructor: string;
  totalVideos: number;
  totalHours: number;
  playlistUrl: string;
  videos: Array<{
    id: number;
    title: string;
    duration: string;
    durationMinutes: number;
  }>;
}

interface CategoryData {
  category: string;
  courses: CourseData[];
}

function findCourse(courseId: string): CourseData | null {
  for (const category of coursesData as CategoryData[]) {
    const course = category.courses.find((c) => c.id === courseId);
    if (course) return course;
  }
  return null;
}

import { useProgress } from '@/shared/hooks/use-progress';

export function VideoList({ courseId, dbCourseId }: VideoListProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshProgress, updateProgressOptimistically } = useProgress();
  const { user } = useAuth();
  const userId = user?.id;
  // const { toast } = useToast();

  useEffect(() => {
    // Load videos from static JSON
    const course = findCourse(courseId);
    if (!course) {
      setLoading(false);
      return;
    }

    // Initialize with default state
    const initialVideos = course.videos.map((video) => ({
      id: video.id,
      videoNumber: video.id,
      title: video.title,
      duration: video.duration,
      durationMinutes: video.durationMinutes,
      completed: false,
    }));
    setVideos(initialVideos);

    // Fetch progress from Server Action
    const fetchProgress = async () => {
      if (!userId) return; // Don't fetch if no user

      try {
        const progressSet = await getVideoProgress(dbCourseId);
        const progressMap: Record<string, boolean> = {};
        progressSet.forEach((num) => {
          progressMap[num.toString()] = true;
        });

        setVideos((prev: Video[]) =>
          prev.map((v: Video) => ({
            ...v,
            completed: !!progressMap[v.id.toString()],
          }))
        );
      } catch (error) {
        logger.error('Failed to load progress:', error as Error);
        toast.error('İlerleme durumu yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProgress();
    } else {
      // If checking auth state is done and no user, stop loading
      // But useAuth().isLoaded might be needed if userId is initially undefined
      // For now assuming if userId is undefined we might just wait or show empty
      setLoading(false);
    }
  }, [courseId, userId, dbCourseId]); // Add dbCourseId dependency

  const handleToggle = async (
    videoNumber: number,
    isModifierPressed: boolean
  ) => {
    const video = videos.find((v) => v.videoNumber === videoNumber);
    if (!video) return;

    const newCompleted = !video.completed;
    const previousVideos = [...videos];

    // OPTIMISTIC UPDATE: Update local state immediately
    let updatedVideos = [...videos];
    let videoIdListToUpdate: string[] = [];

    if (isModifierPressed) {
      // Toggle only specific video
      updatedVideos = updatedVideos.map((v: Video) =>
        v.videoNumber === videoNumber ? { ...v, completed: newCompleted } : v
      );
      videoIdListToUpdate = [videoNumber.toString()];
    } else {
      // Recursive/Batch logic
      if (newCompleted) {
        // Complete all previous
        updatedVideos = updatedVideos.map((v: Video) =>
          v.videoNumber <= videoNumber ? { ...v, completed: true } : v
        );
        videoIdListToUpdate = videos
          .filter((v: Video) => v.videoNumber <= videoNumber && !v.completed)
          .map((v: Video) => v.videoNumber.toString());
      } else {
        // Uncomplete all next
        updatedVideos = updatedVideos.map((v: Video) =>
          v.videoNumber >= videoNumber ? { ...v, completed: false } : v
        );
        videoIdListToUpdate = videos
          .filter((v: Video) => v.videoNumber >= videoNumber && v.completed)
          .map((v: Video) => v.videoNumber.toString());
      }
    }

    // Calculate changes for streak and progress
    let newlyCompletedCount = 0;
    let newlyRemovedCount = 0;
    let deltaMinutes = 0;

    updatedVideos.forEach((v: Video) => {
      const oldV = previousVideos.find((pv) => pv.id === v.id);
      if (v.completed && !oldV?.completed) {
        newlyCompletedCount++;
        deltaMinutes += v.durationMinutes;
      }
      if (!v.completed && oldV?.completed) {
        newlyRemovedCount++;
        deltaMinutes -= v.durationMinutes;
      }
    });

    setVideos(updatedVideos);

    // Optimistic update for progress bars
    const deltaVideos = newlyCompletedCount - newlyRemovedCount;
    const deltaHours = deltaMinutes / 60;
    updateProgressOptimistically(courseId, deltaVideos, deltaHours);

    // SERVER SYNC
    try {
      if (!userId) {
        toast.error('İlerleme durumu kaydedilmesi için giriş yapmalısınız.');
        throw new Error('User not logged in');
      }

      if (videoIdListToUpdate.length === 1) {
        // Single toggle: (userId, courseId, videoNumber, completed)
        const videoNum = parseInt(videoIdListToUpdate[0]);
        if (Number.isNaN(videoNum)) {
          logger.warn('Invalid video number', {
            value: videoIdListToUpdate[0],
          });
          return;
        }
        await toggleVideoProgress(dbCourseId, videoNum, newCompleted);
      } else if (videoIdListToUpdate.length > 1) {
        // Batch toggle: (courseId, videoNumbers[], completed)
        const videoNumbers = videoIdListToUpdate
          .map((id: string) => parseInt(id))
          .filter((n: number) => !Number.isNaN(n));
        if (videoNumbers.length === 0) {
          logger.warn('Invalid video numbers', { values: videoIdListToUpdate });
          return;
        }
        await toggleVideoProgressBatch(dbCourseId, videoNumbers, newCompleted);
      }

      // Re-refresh progress to ensure consistency (optional, but good for safety)
      refreshProgress();
    } catch (error) {
      logger.error('Failed to sync progress:', error as Error);
      // Revert on error
      setVideos(previousVideos);
      // Revert optimistic update
      updateProgressOptimistically(courseId, -deltaVideos, -deltaHours);
      toast.error('İlerleme kaydedilemedi.');
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Video bulunamadı
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Video Grid */}
      <div className="grid gap-2">
        {videos.map((video: Video) => (
          <button
            key={video.id}
            onClick={(e) =>
              handleToggle(video.videoNumber, e.metaKey || e.ctrlKey)
            }
            className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 text-left ${
              video.completed
                ? 'bg-linear-to-r from-emerald-500/20 to-emerald-500/5 border-emerald-500/20'
                : 'bg-linear-to-r from-zinc-800/50 to-zinc-900/50 border-white/5 hover:from-zinc-800 hover:to-zinc-900 hover:border-white/10'
            }`}
          >
            {/* Status Checkbox */}
            <div
              className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-300 ${
                video.completed
                  ? `bg-emerald-500 text-white border-emerald-500 shadow-[0_0_10px_-3px_rgba(16,185,129,0.5)]`
                  : 'border-zinc-600 bg-black/20 group-hover:border-zinc-400'
              }`}
            >
              {video.completed ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-transparent" />
              )}
            </div>

            {/* Number */}
            <span
              className={`text-sm font-mono shrink-0 ${
                video.completed
                  ? 'text-emerald-200/70'
                  : 'text-zinc-300 group-hover:text-zinc-400'
              }`}
            >
              {video.videoNumber}.
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span
                className={`text-sm font-medium transition-colors ${
                  video.completed
                    ? 'text-emerald-50'
                    : 'text-zinc-300 group-hover:text-zinc-100'
                }`}
              >
                {video.title}
              </span>
            </div>

            {/* Duration */}
            <div className="shrink-0">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
                  video.completed
                    ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-200'
                    : 'bg-zinc-800/50 border-white/5 text-zinc-400 group-hover:bg-zinc-700/50 group-hover:text-zinc-300'
                }`}
              >
                {video.duration}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
