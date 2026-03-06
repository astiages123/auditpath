import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getCourseMastery } from '@/features/achievements/services/userStatsService';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import {
  calculateMasteryChains,
  processGraphForAtlas,
} from '@/features/quiz/logic/quizCoreLogic';
import { logger } from '@/utils/logger';

import type { ConceptMapItem } from '@/features/quiz/types';
import type { CourseMastery } from '@/features/courses/types/courseTypes';

export interface FormattedLessonMastery {
  lessonId: string;
  title: string;
  type?: string;
  mastery: number;
  videoProgress: number;
  questionProgress: number;
  goal: number;
}

export interface MasteryChainStats {
  totalChains: number;
  resilienceBonusDays: number;
  nodes: unknown[];
  edges: unknown[];
}

export interface MasteryChainsHook {
  lessonMastery: FormattedLessonMastery[];
  masteryChainStats: MasteryChainStats | null;
}

interface NoteChunkRow {
  id: string;
  metadata: unknown;
  course_id: string | null;
}

interface ChunkMasteryRow {
  chunk_id: string | null;
  mastery_score: number | null;
}

/**
 * Retrieves and processes mastery-related statistics mapping course mastery metrics
 * as well as evaluating note chunks metadata to compute a knowledge graph visualization properties.
 *
 * @returns {MasteryChainsHook} Computed lesson scores and generated node/edge sets representing skill maps
 */
export function useMasteryChains(): MasteryChainsHook {
  const { user } = useAuth();
  const [courseMastery, setCourseMastery] = useState<CourseMastery[]>([]);
  const [masteryChainStats, setMasteryChainStats] =
    useState<MasteryChainStats | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchMastery() {
      if (!user?.id) return;

      try {
        const mastery = await getCourseMastery(user.id);
        if (isMounted && mastery) {
          setCourseMastery(mastery);
        }
      } catch (fetchError) {
        logger.error(
          'useMasteryChains',
          'fetchMastery',
          'Mastery fetch failed',
          fetchError as Error
        );
      }
    }

    fetchMastery();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    async function fetchMasteryChains() {
      if (!user?.id) return;

      try {
        const [{ data: chunksData }, { data: masteryData }] = await Promise.all(
          [
            safeQuery<NoteChunkRow[]>(
              supabase
                .from('note_chunks')
                .select('id, metadata, course_id')
                .not('metadata', 'is', null),
              'Error fetching note chunks'
            ),
            safeQuery<ChunkMasteryRow[]>(
              supabase
                .from('chunk_mastery')
                .select('chunk_id, mastery_score')
                .eq('user_id', user.id),
              'Error fetching chunk mastery'
            ),
          ]
        );

        if (!isMounted || !chunksData) return;

        const chunkMasteryMap = new Map<string, number>();
        (masteryData || []).forEach((masteryItem: ChunkMasteryRow) => {
          if (!masteryItem.chunk_id) return;

          chunkMasteryMap.set(
            masteryItem.chunk_id,
            masteryItem.mastery_score || 0
          );
        });

        const allConcepts: ConceptMapItem[] = [];
        const conceptScoreMap: Record<string, number> = {};

        chunksData.forEach((chunk: NoteChunkRow) => {
          if (
            typeof chunk.metadata !== 'object' ||
            chunk.metadata === null ||
            !('concept_map' in chunk.metadata) ||
            !Array.isArray(chunk.metadata.concept_map)
          ) {
            return;
          }

          const score = chunkMasteryMap.get(chunk.id) || 0;

          chunk.metadata.concept_map.forEach((conceptItem: ConceptMapItem) => {
            allConcepts.push(conceptItem);
            const currentScore = conceptScoreMap[conceptItem.baslik] || 0;
            conceptScoreMap[conceptItem.baslik] = Math.max(currentScore, score);
          });
        });

        const rawNodes = calculateMasteryChains(allConcepts, conceptScoreMap);
        const stats = processGraphForAtlas(rawNodes);

        setMasteryChainStats(stats as MasteryChainStats);
      } catch (fetchError) {
        logger.error(
          'useMasteryChains',
          'fetchMasteryChains',
          'Mastery chain fetch failed',
          fetchError as Error
        );
      }
    }

    fetchMasteryChains();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const lessonMastery: FormattedLessonMastery[] = courseMastery.map(
    (mastery) => ({
      lessonId: mastery.courseId,
      title: mastery.courseName,
      type: mastery.courseType,
      mastery: mastery.masteryScore,
      videoProgress: mastery.videoProgress,
      questionProgress: mastery.questionProgress,
      goal: 100,
    })
  );

  return {
    lessonMastery,
    masteryChainStats,
  };
}
