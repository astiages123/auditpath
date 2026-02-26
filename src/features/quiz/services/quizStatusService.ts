import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import type {
  TopicCompletionStats,
  TopicWithCounts,
} from '@/features/courses/types/courseTypes';
import { getSubjectStrategy } from '@/features/quiz/logic/quizParser';
import { AILogicSchema, type ConceptMapItem } from '@/features/quiz/types';
import { isValid, parseOrThrow } from '@/utils/validation';
import { QUIZ_CONFIG } from '../utils/constants';

// --- Internal Helpers (formerly in quizStatusHelper) ---

interface ChunkInput {
  course_name: string | null;
  metadata: unknown;
  ai_logic: unknown;
}

interface TopicQuotaResult {
  quota: { total: number; antrenman: number; deneme: number };
  importance: 'high' | 'medium' | 'low';
  concepts: ConceptMapItem[];
  difficultyIndex: number | null;
  aiLogic: {
    suggested_quotas?: {
      antrenman: number;
      deneme: number;
    };
  } | null;
}

function calculateTopicQuota(chunk: ChunkInput | null): TopicQuotaResult {
  let quota = { total: 0, antrenman: 0, deneme: 0 };
  let importance: 'high' | 'medium' | 'low' = 'medium';
  let concepts: ConceptMapItem[] = [];
  let difficultyIndex: number | null = null;

  if (chunk) {
    const strategy = getSubjectStrategy(chunk.course_name || '');
    const strategyImportance = strategy?.importance;
    if (
      strategyImportance === 'high' ||
      strategyImportance === 'medium' ||
      strategyImportance === 'low'
    ) {
      importance = strategyImportance;
    }

    const aiLogic = isValid(AILogicSchema, chunk.ai_logic)
      ? parseOrThrow(AILogicSchema, chunk.ai_logic)
      : null;

    const isInvalidated = !!aiLogic?.invalidated_at;
    concepts = !isInvalidated ? aiLogic?.concept_map || [] : [];
    difficultyIndex = !isInvalidated ? aiLogic?.difficulty_index || null : null;

    const aiQuotas = !isInvalidated ? aiLogic?.suggested_quotas : null;

    const defaultQuotas = QUIZ_CONFIG.DEFAULT_QUOTAS;
    const antrenman = aiQuotas?.antrenman ?? defaultQuotas.antrenman;
    const deneme = aiQuotas?.deneme ?? defaultQuotas.deneme;

    quota = {
      total: antrenman + deneme,
      antrenman,
      deneme,
    };
  }

  return {
    quota,
    importance,
    concepts,
    difficultyIndex,
    aiLogic:
      quota.antrenman !== 0 || quota.deneme !== 0
        ? {
            suggested_quotas: {
              antrenman: quota.antrenman,
              deneme: quota.deneme,
            },
          }
        : null,
  };
}

async function fetchTopicQuestions(courseId: string, topic: string) {
  const { data: questions } = await safeQuery<
    {
      id: string;
      usage_type: string | null;
      parent_question_id: string | null;
    }[]
  >(
    supabase
      .from('questions')
      .select('id, usage_type, parent_question_id')
      .eq('course_id', courseId)
      .eq('section_title', topic),
    'fetchTopicQuestions error',
    { courseId, topic }
  );

  return questions || [];
}

// --- Public Service Functions ---

/**
 * Get the number of questions for a specific topic.
 *
 * @param courseId Course ID
 * @param topic Topic name
 * @returns Question count
 */
export async function getTopicQuestionCount(courseId: string, topic: string) {
  const { count } = await safeQuery<unknown>(
    supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('section_title', topic)
      .eq('usage_type', 'antrenman'),
    'getTopicQuestionCount error',
    { courseId, topic }
  );

  return count || 0;
}

/**
 * Get the total number of questions in the pool for a course by usage type.
 *
 * @param courseId Course ID
 * @param usageType Question usage type
 * @returns Total count of questions in the pool
 */
export async function getCoursePoolCount(
  courseId: string,
  usageType: 'antrenman' | 'deneme'
) {
  const { count } = await safeQuery<unknown>(
    supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('usage_type', usageType),
    'getCoursePoolCount error',
    { courseId, usageType }
  );

  return count || 0;
}

/**
 * Get completion status for a specific topic.
 *
 * @param userId User ID
 * @param courseId Course ID
 * @param topic Topic name
 * @returns Topic completion statistics
 */
export async function getTopicCompletionStatus(
  userId: string,
  courseId: string,
  topic: string
): Promise<TopicCompletionStats> {
  // 1. Get Chunk Info & Quotas
  const { data: chunk } = await safeQuery<ChunkInput>(
    supabase
      .from('note_chunks')
      .select('id, course_name, metadata, ai_logic')
      .eq('course_id', courseId)
      .eq('section_title', topic)
      .limit(1)
      .maybeSingle(),
    'fetchTopicChunkInfo error',
    { courseId, topic }
  );

  const { quota, importance, concepts, difficultyIndex, aiLogic } =
    calculateTopicQuota(chunk ?? null);

  // 2. Get Questions
  const questions = await fetchTopicQuestions(courseId, topic);
  if (questions.length === 0) {
    return {
      completed: false,
      antrenman: {
        solved: 0,
        total: quota.antrenman,
        quota: quota.antrenman,
        existing: 0,
      },
      deneme: {
        solved: 0,
        total: quota.deneme,
        quota: quota.deneme,
        existing: 0,
      },
      mistakes: { solved: 0, total: 0, existing: 0 },
      importance,
    };
  }

  // 3. SRS Status (session tracking for future use)
  // const currentSession = sessionCounter?.current_session || 1;

  // 4. Calculate Existings
  const existingCounts = { antrenman: 0, deneme: 0, mistakes: 0 };
  const idToTypeMap = new Map<string, string>();

  questions.forEach((q) => {
    let type = q.parent_question_id ? 'mistakes' : q.usage_type || 'antrenman';
    if (!['antrenman', 'deneme', 'mistakes'].includes(type)) {
      type = 'antrenman';
    }

    idToTypeMap.set(q.id, type);
    existingCounts[type as keyof typeof existingCounts]++;
  });

  // 5. Get User Progress
  const { data: solvedData } = await supabase
    .from('user_quiz_progress')
    .select('question_id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .in(
      'question_id',
      questions.map((q) => q.id)
    );

  const solvedCounts = { antrenman: 0, deneme: 0, mistakes: 0 };
  const uniqueSolved = new Set(solvedData?.map((d) => d.question_id));
  uniqueSolved.forEach((id) => {
    const type = idToTypeMap.get(id);
    if (type) solvedCounts[type as keyof typeof solvedCounts]++;
  });

  const antrenmanTotal = Math.max(quota.antrenman, existingCounts.antrenman);
  const isCompleted =
    antrenmanTotal > 0 && solvedCounts.antrenman >= antrenmanTotal;

  return {
    completed: isCompleted,
    antrenman: {
      solved: solvedCounts.antrenman,
      total: antrenmanTotal,
      quota: quota.antrenman,
      existing: existingCounts.antrenman,
    },
    deneme: {
      solved: solvedCounts.deneme,
      total: Math.max(quota.deneme, existingCounts.deneme),
      quota: quota.deneme,
      existing: existingCounts.deneme,
    },
    mistakes: {
      solved: solvedCounts.mistakes,
      total: existingCounts.mistakes,
      existing: existingCounts.mistakes,
    },
    importance,
    aiLogic,
    concepts,
    difficultyIndex,
  };
}

/**
 * Get all topics for a course with question counts.
 *
 * @param courseId Course ID
 * @returns Array of topics with counts and completion status
 */
export async function getCourseTopicsWithCounts(
  courseId: string
): Promise<TopicWithCounts[]> {
  const { data: user } = await supabase.auth.getUser();
  const userId = user.user?.id;

  // 1. Get topics from note_chunks sorted by chunk_order
  const { data: chunks } = await safeQuery<
    { section_title: string | null; chunk_order: number | null }[]
  >(
    supabase
      .from('note_chunks')
      .select('section_title, chunk_order')
      .eq('course_id', courseId)
      .order('chunk_order', { ascending: true }),
    'getCourseTopicsWithCounts/chunks error',
    { courseId }
  );

  if (!chunks) return [];

  // Dedup maintaining order
  const seen = new Set<string>();
  const orderedTopics: string[] = [];
  chunks?.forEach((c) => {
    if (c.section_title && !seen.has(c.section_title)) {
      seen.add(c.section_title);
      orderedTopics.push(c.section_title);
    }
  });

  if (orderedTopics.length === 0) return [];

  // 2. Fetch all questions for this course to aggregate counts
  const { data: questions } = await safeQuery<
    {
      id: string;
      section_title: string | null;
      usage_type: string | null;
      parent_question_id: string | null;
    }[]
  >(
    supabase
      .from('questions')
      .select('id, section_title, usage_type, parent_question_id')
      .eq('course_id', courseId),
    'getCourseTopicsWithCounts/questions error',
    { courseId }
  );

  if (!questions) {
    return orderedTopics.map((t) => ({
      name: t,
      isCompleted: false,
      counts: { antrenman: 0, deneme: 0, total: 0 },
    }));
  }

  // 2.1 Fetch Solved Questions to determine isCompleted
  const solvedIds = new Set<string>();
  if (userId) {
    const { data: solved } = await safeQuery<{ question_id: string }[]>(
      supabase
        .from('user_quiz_progress')
        .select('question_id')
        .eq('user_id', userId)
        .eq('course_id', courseId),
      'getCourseTopicsWithCounts/solved error',
      { userId, courseId }
    );

    solved?.forEach((s) => solvedIds.add(s.question_id));
  }

  // 3. Aggregate counts & completion
  // Map: Topic -> { antrenmanTotal: 0, antrenmanSolved: 0, ...others }
  const topicStats: Record<
    string,
    {
      antrenman: number;
      deneme: number;
      total: number;
      antrenmanSolved: number;
    }
  > = {};

  // Initialize
  orderedTopics.forEach((t) => {
    topicStats[t] = {
      antrenman: 0,
      deneme: 0,
      total: 0,
      antrenmanSolved: 0,
    };
  });

  questions?.forEach((q) => {
    const t = q.section_title;
    if (t && topicStats[t]) {
      topicStats[t].total += 1;
      const type = q.usage_type as string;

      if (q.parent_question_id) {
        // Mistake question
      } else {
        if (type === 'antrenman') {
          topicStats[t].antrenman += 1;
          if (solvedIds.has(q.id)) {
            topicStats[t].antrenmanSolved += 1;
          }
        } else if (type === 'deneme') topicStats[t].deneme += 1;
      }
    }
  });

  return orderedTopics.map((topic) => {
    const s = topicStats[topic];
    const isCompleted = s.antrenman > 0 && s.antrenmanSolved >= s.antrenman;

    return {
      name: topic,
      isCompleted,
      counts: {
        antrenman: s.antrenman,
        deneme: s.deneme,
        total: s.total,
      },
    };
  });
}

/**
 * Get overall progress for a course (total questions vs solved).
 *
 * @param userId User ID
 * @param courseId Course ID
 * @returns Progress stats
 */
export async function getCourseProgress(userId: string, courseId: string) {
  // 1. Get total questions in course (Antrenman + Deneme + Arsiv)
  // excluding mistake copies (parent_question_id is null)
  const { count: totalQuestions } = await safeQuery<unknown>(
    supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .is('parent_question_id', null),
    'getCourseProgress/total error',
    { courseId }
  );

  if (totalQuestions === null) {
    return { total: 0, solved: 0, percentage: 0 };
  }

  // 2. Get unique solved questions for this course
  const { data: solvedData } = await safeQuery<{ question_id: string }[]>(
    supabase
      .from('user_quiz_progress')
      .select('question_id')
      .eq('user_id', userId)
      .eq('course_id', courseId),
    'getCourseProgress/solved error',
    { userId, courseId }
  );

  if (!solvedData) {
    return { total: totalQuestions, solved: 0, percentage: 0 };
  }

  const solvedIds = new Set(solvedData?.map((s) => s.question_id));
  const solvedCount = solvedIds.size;

  const total = totalQuestions || 0;
  const percentage = total > 0 ? Math.round((solvedCount / total) * 100) : 0;

  return {
    total,
    solved: solvedCount,
    percentage,
  };
}
