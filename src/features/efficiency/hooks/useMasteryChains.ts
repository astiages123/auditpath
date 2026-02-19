import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getCourseMastery } from '@/features/achievements/services/userStatsService';
import { supabase } from '@/lib/supabase';
import { ConceptMapItem } from '@/features/quiz/types';
import { CourseMastery } from '@/features/courses/types/courseTypes';
import {
  calculateMasteryChains,
  processGraphForAtlas,
} from '@/features/quiz/logic/quizCoreLogic';

export function useMasteryChains() {
  const { user } = useAuth();
  const [courseMastery, setCourseMastery] = useState<CourseMastery[]>([]);
  const [masteryChainStats, setMasteryChainStats] = useState<{
    totalChains: number;
    resilienceBonusDays: number;
    nodes: unknown[];
    edges: unknown[];
  } | null>(null);

  useEffect(() => {
    async function fetchMastery() {
      if (!user?.id) return;
      const mastery = await getCourseMastery(user.id);
      setCourseMastery(mastery || []);
    }
    fetchMastery();
  }, [user?.id]);

  useEffect(() => {
    async function fetchMasteryChains() {
      if (!user?.id) return;

      const { data: chunksData } = await supabase
        .from('note_chunks')
        .select('id, metadata, course_id')
        .not('metadata', 'is', null);

      const { data: masteryData } = await supabase
        .from('chunk_mastery')
        .select('chunk_id, mastery_score')
        .eq('user_id', user.id);

      if (!chunksData) return;

      const chunkMasteryMap = new Map<string, number>();
      masteryData?.forEach((m) => {
        chunkMasteryMap.set(m.chunk_id, m.mastery_score);
      });

      const allConcepts: ConceptMapItem[] = [];
      const conceptScoreMap: Record<string, number> = {};

      chunksData.forEach((chunk) => {
        const metadata = chunk.metadata as {
          concept_map?: ConceptMapItem[];
        } | null;
        if (metadata?.concept_map && Array.isArray(metadata.concept_map)) {
          const score = chunkMasteryMap.get(chunk.id) || 0;

          metadata.concept_map.forEach((c) => {
            allConcepts.push(c);
            const current = conceptScoreMap[c.baslik] || 0;
            conceptScoreMap[c.baslik] = Math.max(current, score);
          });
        }
      });

      const rawNodes = calculateMasteryChains(allConcepts, conceptScoreMap);
      const stats = processGraphForAtlas(rawNodes);

      setMasteryChainStats(stats);
    }

    fetchMasteryChains();
  }, [user?.id]);

  const lessonMastery = courseMastery.map((m) => ({
    lessonId: m.courseId,
    title: m.courseName,
    mastery: m.masteryScore,
    videoProgress: m.videoProgress,
    questionProgress: m.questionProgress,
    goal: 100,
  }));

  return {
    lessonMastery,
    masteryChainStats,
  };
}
