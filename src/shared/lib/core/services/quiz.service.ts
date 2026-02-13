import { supabase } from '@/shared/lib/core/supabase';
import { getSubjectStrategy } from '@/features/quiz/algoritma/strategy';
import type {
  BloomStats,
  CognitiveInsight,
  CourseTopic,
  QuizStats,
  RecentQuizSession,
  SRSStats,
  SubjectCompetency,
  TopicCompletionStats,
  TopicWithCounts,
} from '@/shared/types/efficiency';
import type { ConceptMapItem } from '@/shared/types/quiz';
import { isValid, parseOrThrow } from '@/shared/lib/validation/type-guards';
import {
  ChunkMetadataSchema,
  QuizQuestionSchema,
} from '@/shared/lib/validation/quiz-schemas';
import type { Json } from '@/shared/types/supabase';
import { logger } from '@/shared/lib/core/utils/logger';

/**
 * Get a note chunk by ID.
 *
 * @param chunkId Chunk ID (must be valid UUID)
 * @returns Chunk data or null
 */
export async function getNoteChunkById(chunkId: string) {
  // Basic UUID validation to prevent Postgres errors
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(chunkId)) {
    logger.warn(`Invalid UUID passed to getNoteChunkById: ${chunkId}`);
    return null;
  }

  const { data, error } = await supabase
    .from('note_chunks')
    .select('content, metadata, course:courses(course_slug)')
    .eq('id', chunkId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      // Ignore single row not found errors
      logger.error('Error fetching note chunk:', error);
    }
    return null;
  }
  return data;
}

/**
 * Get all topics (chunks) for a course.
 *
 * @param userId User ID
 * @param courseId Course ID
 * @returns Array of course topics
 */
export async function getCourseTopics(
  userId: string,
  courseId: string | null,
  signal?: AbortSignal
): Promise<CourseTopic[]> {
  if (!courseId) return [];

  // 1. Get all chunks for this course (sorted by chunk_order)
  let query = supabase
    .from('note_chunks')
    .select(
      'id, created_at, course_id, course_name, section_title, chunk_order, content, display_content, status, last_synced_at, metadata, ai_logic'
    )
    .eq('course_id', courseId)
    .order('chunk_order', { ascending: true });

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data: chunks, error: chunksError } = await query;

  if (chunksError) {
    logger.error('Error fetching course topics:', chunksError);
    return [];
  }

  if (!chunks || chunks.length === 0) return [];

  return chunks.map((c) => ({
    ...c,
    questionCount: 0,
  }));
}

/**
 * Convert course slug to course ID.
 *
 * @param slug Course slug
 * @returns Course ID or null if not found
 */
export async function getCourseIdBySlug(
  slug: string,
  _signal?: AbortSignal
): Promise<string | null> {
  const query = supabase
    .from('courses')
    .select('id')
    .eq('course_slug', slug)
    .limit(1)
    .maybeSingle();

  const { data, error } = await query;

  if (error || !data) {
    logger.warn(`Course not found for slug: ${slug}`, {
      error: error?.message,
    });
    return null;
  }
  return data.id;
}

/**
 * Get unique topic names for a course.
 *
 * @param courseId Course ID
 * @returns Array of unique topic names
 */
export async function getUniqueCourseTopics(courseId: string) {
  const { data, error } = await supabase
    .from('note_chunks')
    .select('section_title')
    .eq('course_id', courseId)
    .order('section_title');

  if (error) {
    logger.error('Error fetching course topics:', error);
    return [];
  }

  // Deduplicate section titles
  const titles = data.map((d) => d.section_title).filter(Boolean);
  return Array.from(new Set(titles));
}

/**
 * Get the number of questions for a specific topic.
 *
 * @param courseId Course ID
 * @param topic Topic name
 * @returns Question count
 */
export async function getTopicQuestionCount(courseId: string, topic: string) {
  const { count, error } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('section_title', topic)
    .eq('usage_type', 'antrenman');

  if (error) {
    logger.error('Error fetching question count:', error);
    return 0;
  }
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
  usageType: 'antrenman' | 'deneme' | 'arsiv'
) {
  const { count, error } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('usage_type', usageType);

  if (error) {
    logger.error('Error fetching course pool count:', error);
    return 0;
  }
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
  // 1. Get Chunk Info
  const { data: chunk } = await supabase
    .from('note_chunks')
    .select('id, course_name, metadata, ai_logic')
    .eq('course_id', courseId)
    .eq('section_title', topic)
    .limit(1)
    .maybeSingle();

  let quota = { total: 0, antrenman: 0, arsiv: 0, deneme: 0 };
  let importance: 'high' | 'medium' | 'low' = 'medium';
  let srsDueCount = 0;
  let aiLogic: {
    suggested_quotas: { antrenman: number; arsiv: number; deneme: number };
  } | null = null;
  let concepts: ConceptMapItem[] = [];
  let difficultyIndex: number | null = null;

  if (chunk) {
    // Strategy logic for AI briefing (importance only)
    const strategy = getSubjectStrategy(chunk.course_name);
    if (strategy) {
      importance = strategy.importance;
    }

    // AI logic from ai_logic column (primary source)
    aiLogic =
      (chunk.ai_logic as {
        suggested_quotas: { antrenman: number; arsiv: number; deneme: number };
      }) || null;
    const aiQuotas = aiLogic?.suggested_quotas;

    // Concepts and Difficulty from metadata
    const metadata = isValid(ChunkMetadataSchema, chunk.metadata)
      ? parseOrThrow(ChunkMetadataSchema, chunk.metadata)
      : null;
    concepts = metadata?.concept_map || [];
    difficultyIndex = metadata?.difficulty_index || null;

    const defaultQuotas = { antrenman: 5, arsiv: 1, deneme: 1 };

    // Use AI quotas if available, otherwise use fallback
    const antrenman = aiQuotas?.antrenman ?? defaultQuotas.antrenman;
    const arsiv = aiQuotas?.arsiv ?? defaultQuotas.arsiv;
    const deneme = aiQuotas?.deneme ?? defaultQuotas.deneme;

    quota = {
      total: antrenman + arsiv + deneme,
      antrenman,
      arsiv,
      deneme,
    };
  }

  // SRS Status calculation
  const { data: sessionCounter } = await supabase
    .from('course_session_counters')
    .select('current_session')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .maybeSingle();

  const currentSession = sessionCounter?.current_session || 1;

  // 2. Get all questions for this topic
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, usage_type, parent_question_id')
    .eq('course_id', courseId)
    .eq('section_title', topic);

  if (questionsError || !questions) {
    logger.error('Error fetching questions for status:', questionsError);
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
      arsiv: {
        solved: 0,
        total: quota.arsiv,
        quota: quota.arsiv,
        existing: 0,
        srsDueCount: 0,
      },
      mistakes: { solved: 0, total: 0, existing: 0 },
      importance,
    };
  }

  // 2.5 Calculate SRS Due Count if topic exists
  if (chunk) {
    const { data: dueStatus } = await supabase
      .from('user_question_status')
      .select('question_id')
      .eq('user_id', userId)
      .eq('status', 'archived')
      .in(
        'question_id',
        questions.map((q) => q.id)
      )
      .lte('next_review_session', currentSession || 1);

    srsDueCount = dueStatus?.length || 0;
  }

  // 3. Calculate Totals (Existing in DB vs Theoretical Quota)
  const existingCounts = {
    antrenman: 0,
    deneme: 0,
    arsiv: 0,
    mistakes: 0,
  };

  const questionIds = new Set<string>();
  const idToTypeMap = new Map<
    string,
    'antrenman' | 'deneme' | 'arsiv' | 'mistakes'
  >();

  questions.forEach((q) => {
    questionIds.add(q.id);
    let type: 'antrenman' | 'deneme' | 'arsiv' | 'mistakes' = 'antrenman'; // default

    if (q.parent_question_id) {
      type = 'mistakes';
    } else {
      // Explicit types
      if (q.usage_type === 'deneme') type = 'deneme';
      else if (q.usage_type === 'arsiv') type = 'arsiv';
      else type = 'antrenman';
    }

    idToTypeMap.set(q.id, type);
    existingCounts[type]++;
  });

  // 4. Get User Progress
  const { data: solvedData, error: solvedError } = await supabase
    .from('user_quiz_progress')
    .select('question_id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .in('question_id', Array.from(questionIds));

  if (solvedError) {
    logger.error('Error fetching solved stats:', solvedError);
    return {
      completed: false,
      antrenman: {
        solved: 0,
        total: quota.antrenman,
        quota: quota.antrenman,
        existing: existingCounts.antrenman,
      },
      deneme: {
        solved: 0,
        total: quota.deneme,
        quota: quota.deneme,
        existing: existingCounts.deneme,
      },
      arsiv: {
        solved: 0,
        total: quota.arsiv,
        quota: quota.arsiv,
        existing: existingCounts.arsiv,
        srsDueCount,
      },
      mistakes: {
        solved: 0,
        total: existingCounts.mistakes,
        existing: existingCounts.mistakes,
      },
      importance,
    };
  }

  const solvedCounts = {
    antrenman: 0,
    deneme: 0,
    arsiv: 0,
    mistakes: 0,
  };

  const uniqueSolved = new Set<string>();
  solvedData?.forEach((d) => {
    if (!uniqueSolved.has(d.question_id)) {
      uniqueSolved.add(d.question_id);
      const type = idToTypeMap.get(d.question_id);
      if (type) {
        solvedCounts[type]++;
      }
    }
  });

  // Final Totals - taking the max of Quota vs Existing to ensure we don't show "10/5"
  const antrenmanTotal = Math.max(quota.antrenman, existingCounts.antrenman);
  const denemeTotal = Math.max(quota.deneme, existingCounts.deneme);
  const arsivTotal = Math.max(quota.arsiv, existingCounts.arsiv);
  const mistakesTotal = existingCounts.mistakes;

  // Completed logic: Consistent with the UI display
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
      total: denemeTotal,
      quota: quota.deneme,
      existing: existingCounts.deneme,
    },
    arsiv: {
      solved: solvedCounts.arsiv,
      total: arsivTotal,
      quota: quota.arsiv,
      existing: existingCounts.arsiv,
      srsDueCount,
    },
    mistakes: {
      solved: solvedCounts.mistakes,
      total: mistakesTotal,
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
  const { data: chunks, error: chunksError } = await supabase
    .from('note_chunks')
    .select('section_title, chunk_order')
    .eq('course_id', courseId)
    .order('chunk_order', { ascending: true });

  if (chunksError) {
    logger.error('Error fetching course topics:', chunksError);
    return [];
  }

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
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('id, section_title, usage_type, parent_question_id')
    .eq('course_id', courseId);

  if (questionsError) {
    logger.error('Error fetching questions for counts:', questionsError);
    return orderedTopics.map((t) => ({
      name: t,
      isCompleted: false,
      counts: { antrenman: 0, arsiv: 0, deneme: 0, total: 0 },
    }));
  }

  // 2.1 Fetch Solved Questions to determine isCompleted
  const solvedIds = new Set<string>();
  if (userId) {
    const { data: solved } = await supabase
      .from('user_quiz_progress')
      .select('question_id')
      .eq('user_id', userId)
      .eq('course_id', courseId);

    solved?.forEach((s) => solvedIds.add(s.question_id));
  }

  // 3. Aggregate counts & completion
  // Map: Topic -> { antrenmanTotal: 0, antrenmanSolved: 0, ...others }
  const topicStats: Record<
    string,
    {
      antrenman: number;
      arsiv: number;
      deneme: number;
      total: number;
      antrenmanSolved: number; // To check completion
    }
  > = {};

  // Initialize
  orderedTopics.forEach((t) => {
    topicStats[t] = {
      antrenman: 0,
      arsiv: 0,
      deneme: 0,
      total: 0,
      antrenmanSolved: 0,
    };
  });

  questions?.forEach((q) => {
    const t = q.section_title;
    if (topicStats[t]) {
      topicStats[t].total += 1;
      const type = q.usage_type as string;

      if (q.parent_question_id) {
        // Mistake question - doesn't count towards 'Antrenman' total for badge
      } else {
        if (type === 'antrenman') {
          topicStats[t].antrenman += 1;
          if (solvedIds.has(q.id)) {
            topicStats[t].antrenmanSolved += 1;
          }
        } else if (type === 'arsiv') topicStats[t].arsiv += 1;
        else if (type === 'deneme') topicStats[t].deneme += 1;
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
        arsiv: s.arsiv,
        deneme: s.deneme,
        total: s.total,
      },
    };
  });
}

/**
 * Get all questions for a specific topic.
 *
 * @param courseId Course ID
 * @param topic Topic name
 * @returns Array of questions
 */
export async function getTopicQuestions(courseId: string, topic: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('*, course:courses(course_slug)')
    .eq('course_id', courseId)
    .eq('section_title', topic)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Error fetching topic questions:', error);
    return [];
  }

  // Map to QuizQuestion type
  return (data || []).map((q: unknown) => {
    const qData = parseOrThrow(
      QuizQuestionSchema,
      (q as { question_data: Json }).question_data
    );
    const courseSlug = (q as { course?: { course_slug: string } | null }).course
      ?.course_slug;

    return {
      q: qData.q,
      o: qData.o,
      a: qData.a,
      exp: qData.exp,
      img: qData.img,
      imgPath:
        qData.img && courseSlug ? `/notes/${courseSlug}/media/` : undefined,
    };
  });
}

/**
 * Get the first chunk ID for a topic.
 *
 * @param courseId Course ID
 * @param topic Topic name
 * @returns First chunk ID or null
 */
export async function getFirstChunkIdForTopic(courseId: string, topic: string) {
  const { data, error } = await supabase
    .from('note_chunks')
    .select('id')
    .eq('course_id', courseId)
    .eq('section_title', topic)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching chunk for topic:', error);
    return null;
  }
  return data?.id || null;
}

/**
 * Get overall quiz statistics for a user.
 *
 * @param userId User ID
 * @returns Quiz statistics
 */
export async function getQuizStats(userId: string): Promise<QuizStats> {
  const { data, error } = await supabase
    .from('user_quiz_progress')
    .select('response_type')
    .eq('user_id', userId);

  if (error) {
    logger.error('Error fetching quiz stats:', error);
    return {
      totalAnswered: 0,
      correct: 0,
      incorrect: 0,
      blank: 0,
      remaining: 0,
      successRate: 0,
    };
  }

  const totalAnswered = data?.length || 0;
  const correct =
    data?.filter((r) => r.response_type === 'correct').length || 0;
  const incorrect =
    data?.filter((r) => r.response_type === 'incorrect').length || 0;
  const blank = data?.filter((r) => r.response_type === 'blank').length || 0;

  return {
    totalAnswered,
    correct,
    incorrect,
    blank,
    remaining: 0,
    successRate:
      totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0,
  };
}

/**
 * Get subject-wise competency scores.
 *
 * @param userId User ID
 * @returns Array of subject competency scores
 */
export async function getSubjectCompetency(
  userId: string
): Promise<SubjectCompetency[]> {
  const coursesRes = await supabase.from('courses').select('id, name');
  if (coursesRes.error) return [];

  const courseMap = new Map(coursesRes.data.map((c) => [c.id, c.name]));

  const { data, error } = await supabase
    .from('user_quiz_progress')
    .select('course_id, response_type')
    .eq('user_id', userId);

  if (error || !data) return [];

  const stats: Record<string, { correct: number; total: number }> = {};

  data.forEach((row) => {
    const cName = courseMap.get(row.course_id) || 'Unknown';
    if (!stats[cName]) stats[cName] = { correct: 0, total: 0 };

    stats[cName].total += 1;
    if (row.response_type === 'correct') {
      stats[cName].correct += 1;
    }
  });

  return Object.entries(stats)
    .map(([subject, val]) => ({
      subject,
      score: Math.round((val.correct / val.total) * 100),
      totalQuestions: val.total,
    }))
    .sort((a, b) => b.totalQuestions - a.totalQuestions)
    .slice(0, 6);
}

/**
 * Get Bloom's taxonomy level statistics.
 *
 * @param userId User ID
 * @returns Array of Bloom level statistics
 */
export async function getBloomStats(userId: string): Promise<BloomStats[]> {
  const { data, error } = await supabase
    .from('user_quiz_progress')
    .select('response_type, question:questions(bloom_level)')
    .eq('user_id', userId);

  if (error || !data) return [];

  const levels: Record<string, { correct: number; total: number }> = {
    knowledge: { correct: 0, total: 0 },
    application: { correct: 0, total: 0 },
    analysis: { correct: 0, total: 0 },
  };

  data.forEach(
    (row: {
      response_type: string;
      question: { bloom_level: string | null } | null;
    }) => {
      const bloomLevel = row.question?.bloom_level;
      if (bloomLevel && levels[bloomLevel]) {
        levels[bloomLevel].total += 1;
        if (row.response_type === 'correct') {
          levels[bloomLevel].correct += 1;
        }
      }
    }
  );

  return Object.entries(levels).map(([key, val]) => ({
    level: key,
    correct: val.correct,
    total: val.total,
    score: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
  }));
}

/**
 * Get SRS (Spaced Repetition System) statistics.
 *
 * @param userId User ID
 * @returns SRS statistics by mastery level
 */
export async function getSRSStats(userId: string): Promise<SRSStats> {
  const { data, error } = await supabase
    .from('chunk_mastery')
    .select('mastery_score')
    .eq('user_id', userId);

  if (error || !data) return { new: 0, learning: 0, review: 0, mastered: 0 };

  const stats = { new: 0, learning: 0, review: 0, mastered: 0 };

  data.forEach((row) => {
    // Proxy SRS levels from mastery_score (0-100)
    const score = row.mastery_score || 0;
    if (score === 0) stats.new++;
    else if (score < 40) stats.learning++;
    else if (score < 80) stats.review++;
    else stats.mastered++;
  });

  return stats;
}

/**
 * Get recent quiz sessions for a user.
 *
 * @param userId User ID
 * @param limit Maximum number of sessions to return
 * @returns Array of recent quiz sessions
 */
export async function getRecentQuizSessions(
  userId: string,
  limit: number = 5
): Promise<RecentQuizSession[]> {
  // Fetch last 500 answers to reconstruct sessions
  const { data: rawData, error } = await supabase
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
    .limit(500);

  if (error || !rawData) {
    logger.error('Error fetching quiz sessions:', error);
    return [];
  }

  const sessionsMap = new Map<string, RecentQuizSession>();

  rawData.forEach(
    (row: {
      course_id: string;
      session_number: number;
      response_type: string;
      answered_at: string | null;
      course: { name: string } | null;
    }) => {
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

      // Keep the latest timestamp for the session
      if (
        row.answered_at &&
        new Date(row.answered_at) > new Date(session.date)
      ) {
        session.date = row.answered_at;
      }
    }
  );

  const sessions = Array.from(sessionsMap.values())
    .map((s) => ({
      ...s,
      successRate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return sessions.slice(0, limit);
}

/**
 * Get recent cognitive insights from AI diagnosis.
 *
 * @param userId User ID
 * @param limit Maximum number of insights to return
 * @returns Array of cognitive insights
 */
export async function getRecentCognitiveInsights(
  userId: string,
  limit: number = 30
): Promise<CognitiveInsight[]> {
  // 1. Fetch recent progress with diagnosis or insight
  const { data: progressData, error } = await supabase
    .from('user_quiz_progress')
    .select(
      'id, course_id, question_id, ai_diagnosis, ai_insight, response_type, answered_at'
    )
    .eq('user_id', userId)
    .or('ai_diagnosis.neq.null,ai_insight.neq.null')
    .order('answered_at', { ascending: false })
    .limit(limit);

  if (error || !progressData) {
    logger.error('Error fetching cognitive insights:', error);
    return [];
  }

  // 2. Fetch current consecutive_fails for these questions
  const questionIds = Array.from(
    new Set(progressData.map((p) => p.question_id))
  );

  const { data: statusData } = await supabase
    .from('user_question_status')
    .select('question_id, consecutive_fails')
    .eq('user_id', userId)
    .in('question_id', questionIds);

  const failsMap = new Map<string, number>();
  if (statusData) {
    statusData.forEach((s) => {
      failsMap.set(s.question_id, s.consecutive_fails || 0);
    });
  }

  // 3. Merge data
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
