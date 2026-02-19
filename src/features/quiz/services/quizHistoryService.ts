import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/supabaseHelpers';
import {
  type ChunkMetric,
  type CognitiveInsight,
  type GeneratorCallbacks,
  type QuestionWithStatus,
  type RecentQuizSession,
  type ReviewItem,
  type SessionContext,
} from '@/features/quiz/types';
import { DAILY_QUOTA } from '@/features/quiz/utils/constants';
import {
  fetchCourseChunks,
  fetchCourseMastery,
  getCourseName,
  getCourseStatsAggregate,
  getFrontierChunkId,
} from './quizCoreService';
import {
  fetchGeneratedQuestions,
  fetchNewFollowups,
  fetchQuestionsByStatus,
  fetchWaterfallTrainingQuestions,
} from './quizQuestionService';
import { incrementCourseSession } from './quizSubmissionService';
import { calculateQuestionWeights } from '@/features/quiz/logic/srsLogic';
import { generateForChunk } from '../logic/quizParser';

export async function getRecentQuizSessions(
  userId: string,
  limit: number = 5
): Promise<RecentQuizSession[]> {
  type QuizProgressRow = {
    course_id: string;
    session_number: number | null;
    response_type: string | null;
    answered_at: string | null;
    course: { name: string } | null;
  };

  const { data: rawData } = await safeQuery<QuizProgressRow[]>(
    supabase
      .from('user_quiz_progress')
      .select(
        `
                course_id,
                session_number,
                response_type,
                answered_at,
                course:courses(name)
            `
      )
      .eq('user_id', userId)
      .order('answered_at', { ascending: false })
      .limit(500),
    'getRecentQuizSessions error',
    { userId }
  );

  if (!rawData) return [];

  const sessionsMap = new Map<string, RecentQuizSession>();

  rawData.forEach((row) => {
    const sNum = row.session_number || 0;
    const key = `${row.course_id}-${sNum}`;

    if (!sessionsMap.has(key)) {
      sessionsMap.set(key, {
        uniqueKey: key,
        courseName: row.course?.name || 'Kavram Testi',
        sessionNumber: sNum,
        date: row.answered_at || new Date().toISOString(),
        correct: 0,
        incorrect: 0,
        blank: 0,
        total: 0,
        successRate: 0,
      });
    }

    const session = sessionsMap.get(key)!;
    session.total++;
    if (row.response_type === 'correct') session.correct++;
    else if (row.response_type === 'incorrect') session.incorrect++;
    else session.blank++;

    if (row.answered_at && new Date(row.answered_at) > new Date(session.date)) {
      session.date = row.answered_at;
    }
  });

  return Array.from(sessionsMap.values())
    .map((s) => ({
      ...s,
      successRate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export async function getRecentCognitiveInsights(
  userId: string,
  limit: number = 30
): Promise<CognitiveInsight[]> {
  type ProgressRow = {
    id: string;
    course_id: string;
    question_id: string;
    ai_diagnosis: string | null;
    ai_insight: string | null;
    response_type: string | null;
    answered_at: string | null;
  };

  const { data: progressData } = await safeQuery<ProgressRow[]>(
    supabase
      .from('user_quiz_progress')
      .select(
        'id, course_id, question_id, ai_diagnosis, ai_insight, response_type, answered_at'
      )
      .eq('user_id', userId)
      .or('ai_diagnosis.neq.null,ai_insight.neq.null')
      .order('answered_at', { ascending: false })
      .limit(limit),
    'getRecentCognitiveInsights progressData error',
    { userId }
  );

  if (!progressData) return [];

  const questionIds = Array.from(
    new Set(progressData.map((p) => p.question_id))
  );

  type StatusRow = {
    question_id: string;
    consecutive_fails: number | null;
  };

  const { data: statusData } = await safeQuery<StatusRow[]>(
    supabase
      .from('user_question_status')
      .select('question_id, consecutive_fails')
      .eq('user_id', userId)
      .in('question_id', questionIds),
    'getRecentCognitiveInsights statusData error',
    { userId }
  );

  const failsMap = new Map<string, number>();
  if (statusData) {
    statusData.forEach((s) =>
      failsMap.set(s.question_id, s.consecutive_fails || 0)
    );
  }

  return progressData.map((p) => ({
    id: p.id,
    courseId: p.course_id,
    questionId: p.question_id,
    diagnosis: p.ai_diagnosis,
    insight: p.ai_insight,
    consecutiveFails: failsMap.get(p.question_id) || 0,
    responseType: p.response_type,
    date: p.answered_at || new Date().toISOString(),
  }));
}

export async function getSessionInfo(userId: string, courseId: string) {
  const { data } = await safeQuery<{ current_session: number | null }>(
    supabase
      .from('course_session_counters')
      .select('current_session')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle(),
    'getSessionInfo error',
    { userId, courseId }
  );

  if (!data) return { currentSession: 1, totalSessions: 0, courseId };

  return {
    currentSession: data.current_session || 1,
    totalSessions: data.current_session || 1,
    courseId,
  };
}

export async function getQuotaInfo(userId: string, courseId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: usedToday } = await supabase
    .from('user_quiz_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('answered_at', today.toISOString());

  const { count: pendingCount } = await supabase
    .from('user_question_status')
    .select('question_id, questions!inner(course_id)', {
      count: 'exact',
      head: true,
    })
    .eq('user_id', userId)
    .eq('questions.course_id', courseId)
    .eq('status', 'pending_followup');

  return {
    dailyQuota: DAILY_QUOTA,
    used: usedToday || 0,
    pendingReviewCount: pendingCount || 0,
    isMaintenanceMode: false,
    reviewQuota: Math.min(10, pendingCount || 0),
  };
}

export async function getCourseStats(userId: string, courseId: string) {
  const masteryData = await getCourseStatsAggregate(userId, courseId);
  if (!masteryData || masteryData.length === 0) return null;

  type MasteryRow = {
    total_questions_seen: number | null;
    mastery_score: number;
  };
  const totalQuestionsSolved = masteryData.reduce(
    (sum, row: MasteryRow) => sum + (row.total_questions_seen || 0),
    0
  );
  const avgMastery = Math.round(
    masteryData.reduce((sum, row: MasteryRow) => sum + row.mastery_score, 0) /
      masteryData.length
  );

  return {
    totalQuestionsSolved,
    averageMastery: avgMastery,
  };
}

export async function startQuizSession(
  userId: string,
  courseId: string
): Promise<SessionContext> {
  const sessionInfo = await incrementCourseSession(userId, courseId);
  const courseName = await getCourseName(courseId);

  if (!sessionInfo.data) {
    throw new Error(sessionInfo.error?.message || 'Failed to start session');
  }

  return {
    userId,
    courseId,
    courseName: courseName || '',
    sessionNumber: sessionInfo.data.current_session,
    isNewSession: sessionInfo.data.is_new_session,
  };
}

export async function getReviewQueue(
  ctx: SessionContext,
  limit: number = 20,
  targetChunkId?: string
): Promise<ReviewItem[]> {
  const queue: ReviewItem[] = [];
  const usedIds = new Set<string>();

  const addItems = (
    qs: QuestionWithStatus[],
    stat: 'active' | 'pending_followup' | 'archived',
    priority: number
  ) => {
    qs.forEach((q) => {
      const qId = q.questions?.id || q.question_id;
      if (!usedIds.has(qId)) {
        queue.push({
          chunkId: q.questions?.chunk_id || '',
          questionId: qId,
          courseId: ctx.courseId,
          status: stat,
          priority,
        });
        usedIds.add(qId);
      }
    });
  };

  const followups = await fetchQuestionsByStatus(
    ctx.userId,
    ctx.courseId,
    'pending_followup',
    ctx.sessionNumber,
    targetChunkId ? 100 : Math.ceil(limit * 0.2)
  );
  addItems(followups, 'pending_followup', 1);

  const remainingFollowupQuota = targetChunkId
    ? 50
    : Math.ceil(limit * 0.2) - queue.length;
  if (remainingFollowupQuota > 0) {
    const newFollowupsRaw = await fetchNewFollowups(
      ctx.courseId,
      remainingFollowupQuota
    );
    const newFollowups: QuestionWithStatus[] = newFollowupsRaw.map((q) => {
      const raw = q as {
        id: string;
        chunk_id: string | null;
        course_id: string;
        parent_question_id: string | null;
        question_data: unknown;
      };
      return {
        question_id: raw.id,
        status: 'pending_followup',
        next_review_session: null,
        questions: {
          id: raw.id,
          chunk_id: raw.chunk_id,
          course_id: raw.course_id,
          parent_question_id: raw.parent_question_id,
          question_data:
            raw.question_data as QuestionWithStatus['questions']['question_data'],
        },
      };
    });
    addItems(newFollowups, 'pending_followup', 1);
  }

  const effectiveChunkId =
    targetChunkId ||
    (await getFrontierChunkId(ctx.userId, ctx.courseId)) ||
    undefined;
  if (effectiveChunkId) {
    const trainingQs = await fetchWaterfallTrainingQuestions(
      ctx.userId,
      ctx.courseId,
      effectiveChunkId,
      targetChunkId ? 1000 : Math.ceil(limit * 0.7)
    );
    addItems(trainingQs, 'active', 2);
  }

  const archiveQs = await fetchQuestionsByStatus(
    ctx.userId,
    ctx.courseId,
    'archived',
    ctx.sessionNumber,
    targetChunkId ? 100 : Math.ceil(limit * 0.1)
  );
  addItems(archiveQs, 'archived', 3);

  return targetChunkId ? queue : queue.slice(0, limit);
}

export async function generateSmartExam(
  courseId: string,
  userId: string,
  callbacks: GeneratorCallbacks
) {
  const EXAM_TOTAL = 20;
  callbacks.onTotalTargetCalculated(EXAM_TOTAL);

  try {
    const chunks = await fetchCourseChunks(courseId);
    const masteryRows = await fetchCourseMastery(courseId, userId);
    type MasteryRow = { chunk_id: string; mastery_score: number };
    const masteryMap = new Map<string, number>(
      masteryRows.map((m: MasteryRow) => [m.chunk_id, Number(m.mastery_score)])
    );

    type ChunkRow = {
      id: string;
      metadata: import('@/types/database.types').Json;
      content: string;
    };
    const metrics: ChunkMetric[] = chunks.map((c: ChunkRow) => ({
      id: c.id,
      concept_count:
        (c.metadata as { concept_map?: unknown[] }).concept_map?.length || 5,
      difficulty_index:
        (c.metadata as { difficulty_index?: number }).difficulty_index || 3,
      mastery_score: masteryMap.get(c.id) || 0,
    }));

    const weights = calculateQuestionWeights({
      examTotal: EXAM_TOTAL,
      importance: 'medium',
      chunks: metrics,
    });

    const questionIds: string[] = [];
    let totalSaved = 0;

    for (const [chunkId, count] of weights.entries()) {
      if (count <= 0) continue;
      const existing = await fetchGeneratedQuestions(chunkId, 'deneme', count);

      if (existing.length < count) {
        await generateForChunk(
          chunkId,
          {
            ...callbacks,
            onQuestionSaved: (_count: number) => {
              totalSaved++;
              callbacks.onQuestionSaved(totalSaved);
            },
          } as GeneratorCallbacks,
          {
            usageType: 'deneme',
            targetCount: count - existing.length,
            userId,
          }
        );
      }

      const finalQs = await fetchGeneratedQuestions(chunkId, 'deneme', count);
      finalQs.forEach((q) => questionIds.push(q.id));
    }

    callbacks.onComplete({ success: true, generated: totalSaved });
    return { success: true, questionIds: questionIds.slice(0, EXAM_TOTAL) };
  } catch (error: unknown) {
    const err = error as Error;
    callbacks.onError(err.message);
    return { success: false, questionIds: [] };
  }
}
