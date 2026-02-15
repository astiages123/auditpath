import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { logger } from '@/utils/logger';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoItem } from './VideoItem';
import { useVideoActions, VideoActionState } from '../hooks/useVideoActions';
import { getVideoProgress } from '../services/videoService';

// Load videos from courses.json (already bundled)
import coursesData from '../services/courses.json';

interface VideoListProps {
  courseId: string; // The slug (e.g., 'iktisat-mikro')
  dbCourseId: string;
  _categoryColor?: string;
}

interface CourseData {
  videos: Array<{
    id: number;
    title: string;
    duration: string;
    durationMinutes: number;
  }>;
}
interface CategoryData {
  courses: Array<CourseData & { id: string }>;
}

function findCourse(slug: string): CourseData | null {
  // Adjust based on actual JSON structure.
  // Based on reading: courses.json seems to be array of Categories.
  const categories = coursesData as CategoryData[];
  for (const category of categories) {
    const course = category.courses.find((c) => c.id === slug); // id in JSON is the slug
    if (course) return course;
  }
  return null;
}

export function VideoList({
  courseId,
  dbCourseId,
  _categoryColor,
}: VideoListProps) {
  const [videos, setVideos] = useState<VideoActionState[]>([]);
  const [staticVideos, setStaticVideos] = useState<
    Array<{ id: number; videoNumber: number; title: string; duration: string }>
  >([]); // To hold title/duration which are static
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const userId = user?.id;

  const { handleToggleVideo } = useVideoActions(courseId, dbCourseId);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // 1. Load static data
      const course = findCourse(courseId);
      if (!course) {
        if (isMounted) setLoading(false);
        return;
      }

      // Map static data
      const initialVideos = course.videos.map((v) => ({
        videoNumber: v.id,
        completed: false,
        durationMinutes: v.durationMinutes,
      }));

      const staticData = course.videos.map((v) => ({
        id: v.id, // using videoNumber as ID for generic item
        videoNumber: v.id,
        title: v.title,
        duration: v.duration,
      }));

      // Set initial state (not completed)
      if (isMounted) {
        setStaticVideos(staticData);
        setVideos(initialVideos);
      }

      // 2. Fetch Progress (if logged in)
      if (userId) {
        try {
          const videoNumbers = initialVideos.map((v) => v.videoNumber);
          // Use Generic video.service.ts
          const progressMap = await getVideoProgress(
            userId,
            dbCourseId,
            videoNumbers
          );

          if (isMounted) {
            setVideos((prev) =>
              prev.map((v) => ({
                ...v,
                completed: !!progressMap[v.videoNumber.toString()],
              }))
            );
          }
        } catch (error) {
          logger.error('Failed to load progress', error as Error);
          toast.error('İlerleme yüklenemedi');
        }
      }

      if (isMounted) setLoading(false);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [courseId, dbCourseId, userId]);

  // Handler wrapper
  const onToggle = useCallback(
    async (videoNumber: number, isModifierPressed: boolean) => {
      // Optimistic update via hook
      const updated = await handleToggleVideo(
        videos,
        videoNumber,
        isModifierPressed
      );
      setVideos(updated);
    },
    [videos, handleToggleVideo]
  );

  // Memoized Render Items
  const renderItems = useMemo(() => {
    if (loading) {
      // Skeleton Array
      return Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-zinc-900/20"
        >
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-4 w-[20px]" />
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="w-12 h-6 rounded-md" />
        </div>
      ));
    }

    if (staticVideos.length === 0) {
      return (
        <div className="p-4 text-center text-muted-foreground text-sm">
          Video bulunamadı.
        </div>
      );
    }

    return staticVideos.map((staticV) => {
      const state = videos.find((v) => v.videoNumber === staticV.videoNumber);
      return (
        <VideoItem
          key={staticV.videoNumber}
          _id={staticV.videoNumber}
          videoNumber={staticV.videoNumber}
          title={staticV.title}
          duration={staticV.duration}
          completed={state?.completed || false}
          onToggle={onToggle}
        />
      );
    });
  }, [loading, staticVideos, videos, onToggle]);

  return (
    <div className="p-4 space-y-4">
      <div className="grid gap-2">{renderItems}</div>
    </div>
  );
}
