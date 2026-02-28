import { useCallback, useMemo, useState } from 'react';
import { type CourseTopic } from '@/features/courses/types/courseTypes';

interface UseNotesUIProps {
  chunks: CourseTopic[];
  activeChunkId: string;
}

export function useNotesUI({ chunks, activeChunkId }: UseNotesUIProps) {
  // Panel visibility states
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);

  // Quiz drawer state
  const [isQuizDrawerOpen, setIsQuizDrawerOpen] = useState(false);

  // Local state for smooth UI updates during scroll
  const [localProgress, setLocalProgress] = useState(0);

  // Overall course progress for the overview page
  const totalProgress = useMemo(() => {
    if (!chunks.length) return 0;
    return Math.round(localProgress);
  }, [chunks.length, localProgress]);

  const displayProgress = activeChunkId !== '' ? localProgress : 0;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (!container) return;

    const scrollHeight = container.scrollHeight - container.clientHeight;
    if (scrollHeight <= 0) return;

    const progress = Math.min(
      100,
      Math.round((container.scrollTop / scrollHeight) * 100)
    );

    setLocalProgress(progress);
  }, []);

  return {
    isLeftPanelVisible,
    setIsLeftPanelVisible,
    isRightPanelVisible,
    setIsRightPanelVisible,
    isQuizDrawerOpen,
    setIsQuizDrawerOpen,
    localProgress,
    totalProgress,
    displayProgress,
    handleScroll,
  };
}
