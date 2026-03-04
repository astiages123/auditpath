// ===========================
// === IMPORTS ===
// ===========================

import { RANKS } from '@/features/achievements/utils/constants';
import { calculateEstimatedDaysToNextRank } from '../logic/coursesLogic';
import { RoadmapHero } from './RoadmapHero';
import { RoadmapPath } from './RoadmapPath';

// ===========================
// === TYPE DEFINITIONS ===
// ===========================

export interface TitleRoadmapProps {
  watchedVideos: number;
  requiredVideos: number;
  dailyAverage?: number;
  completedHours?: number;
  totalHours?: number;
}

// ===========================
// === COMPONENT ===
// ===========================

/**
 * Main container for the user's roadmap journey. Calculates current
 * rank, next rank, and coordinates hero and path components.
 */
export default function TitleRoadmap({
  watchedVideos,
  requiredVideos,
  dailyAverage,
  completedHours = 0,
  totalHours = 0,
}: TitleRoadmapProps) {
  const sortedRanks = [...RANKS].sort(
    (a, b) => a.minPercentage - b.minPercentage
  );

  const milestones = sortedRanks.map((rank, index) => ({
    id: rank.id,
    title: rank.name,
    threshold: rank.minPercentage,
    motto: rank.motto,
    color: rank.color,
    imagePath: `/ranks/rank${index + 1}.webp`,
  }));

  const progress =
    totalHours > 0
      ? Math.min(Math.round((completedHours / totalHours) * 100), 100)
      : 0;

  let currentRankIndex = milestones.length - 1;
  for (let i = 0; i < milestones.length - 1; i++) {
    if (
      progress >= milestones[i].threshold &&
      progress < milestones[i + 1].threshold
    ) {
      currentRankIndex = i;
      break;
    }
  }

  const currentMilestone = milestones[currentRankIndex];
  const nextMilestone = milestones[currentRankIndex + 1];

  const nextThreshold = nextMilestone ? nextMilestone.threshold : 100;
  const toNext = Math.max(0, nextThreshold - progress);

  // Calculate estimated days to next rank
  const estimatedDays =
    nextMilestone && dailyAverage && dailyAverage > 0 && totalHours > 0
      ? calculateEstimatedDaysToNextRank(
          totalHours,
          completedHours,
          nextMilestone.threshold,
          dailyAverage
        )
      : undefined;

  return (
    <div className="space-y-6">
      <RoadmapHero
        currentMilestone={currentMilestone}
        nextMilestone={nextMilestone}
        _toNext={toNext}
        watchedVideos={watchedVideos}
        requiredVideos={requiredVideos}
        progress={progress}
        estimatedDays={estimatedDays}
      />

      <RoadmapPath
        milestones={milestones}
        progress={progress}
        currentRankIndex={currentRankIndex}
      />
    </div>
  );
}
