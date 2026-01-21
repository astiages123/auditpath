import { createContext, useContext } from "react";

export interface ProgressStats {
  completedVideos: number;
  totalVideos: number;
  completedHours: number;
  totalHours: number;
  streak: number;
  categoryProgress: Record<
    string,
    {
      completedVideos: number;
      completedHours: number;
      totalVideos: number;
      totalHours: number;
    }
  >;
  courseProgress: Record<string, number>;
  currentRank?: { id: string; name: string; color?: string; minPercentage: number; icon?: string };
  nextRank?: { id: string; name: string; color?: string; minPercentage: number; icon?: string };
  rankProgress?: number;
  progressPercentage?: number;
  estimatedDays?: number;
  todayVideoCount?: number;
}

export interface ProgressContextType {
  stats: ProgressStats;
  refreshProgress: () => void;
  isLoading: boolean;
  streak: number;
  updateProgressOptimistically: (
    courseId: string,
    deltaVideos: number,
    deltaHours: number
  ) => void;
}

export const ProgressContext = createContext<ProgressContextType | undefined>(
  undefined
);

export function useProgress() {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  return context;
}
