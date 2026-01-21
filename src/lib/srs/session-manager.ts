/**
 * Session Manager Module (Refactored for Shelf System)
 *
 * Handles session tracking and "Shelf System" logic:
 * - Updates question status based on answers (Shelfing)
 * - Manages Mastery Score
 */

import { supabase } from '@/lib/supabase';
import {
  calculateScoreChange,
  type QuizResponseType,
} from './srs-algorithm';
import { DebugLogger } from '../debug-logger';

// --- Types ---
export interface SessionInfo {
  courseId: string;
  courseName: string;
  currentSession: number;
  isNewSession: boolean;
  isCapApplied: boolean;
}

// --- Session Counter Functions ---

/**
 * Get today's scheduled courses for a user
 * Strictly checks weekly_schedule table for the current day index.
 */
export async function getTodaysCourses(userId: string): Promise<string[]> {
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

  // We explicitly check if multiple match_days contain the current day index
  const { data, error } = await supabase
    .from('weekly_schedule')
    .select('subject, match_days')
    .eq('user_id', userId);

  if (error) {
    console.error('[SessionManager] Error fetching schedule:', error);
    return [];
  }

  // Filter in memory to be safe with array containment if needed, 
  // or trust a .contains query if we used it. 
  // Here we filter manually for robustness.
  const todaysSubjects = data
    ?.filter(schedule => schedule.match_days && schedule.match_days.includes(today))
    .map(s => s.subject) ?? [];

  return todaysSubjects;
}

/**
 * Get or create session counter for a course
 * Implements Daily Increment & Reset logic.
 */
export async function getSessionInfo(
  userId: string,
  courseId: string
): Promise<SessionInfo | null> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  DebugLogger.group('SessionManager: Get Session Info', { userId, courseId, today });

  // First, get course name
  const { data: courseData } = await supabase
    .from('courses')
    .select('name')
    .eq('id', courseId)
    .single();

  if (!courseData) {
    DebugLogger.error('Course not found', { courseId });
    DebugLogger.groupEnd();
    return null;
  }

  // Use RPC for atomic increment to avoid race conditions
  // Cast to any because generated types are not updated yet
  // Cast with explicit function signature to satisfy lint
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const { data: rpcResult, error: rpcError } = await (supabase.rpc as unknown as Function)('increment_course_session', {
    p_user_id: userId,
    p_course_id: courseId
  });

  let finalSession = 1;
  let isNewSession = false;

  if (rpcError) {
    DebugLogger.error('RPC Error (increment_course_session)', rpcError);
    // Fallback: Read-only check as fail-safe or throw?
    // Let's assume migration might be missing and do basic check, but log heavily.
    // For now, let's try the old manual way as fallback to not break app if migration not applied.
    
    // Check if counter exists
    const { data: existing } = await supabase
        .from('course_session_counters')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();

    if (existing) {
        if (existing.last_session_date !== today) {
            finalSession = (existing.current_session ?? 0) + 1;
            isNewSession = true;
            await supabase.from('course_session_counters').update({
                current_session: finalSession,
                last_session_date: today,
                updated_at: new Date().toISOString(),
            }).eq('id', existing.id);
        } else {
            finalSession = existing.current_session ?? 1;
        }
    } else {
        finalSession = 1;
        isNewSession = true;
        const { error: insertError } = await supabase.from('course_session_counters').insert({
            user_id: userId,
            course_id: courseId,
            current_session: finalSession,
            last_session_date: today,
        });

        if (insertError) {
           // Handle race?
           console.error('Error creating session counter', insertError);
        }
        DebugLogger.process('First Session Created', { session: finalSession });
    }
  } else if (rpcResult && Array.isArray(rpcResult) && rpcResult.length > 0) {
      // RPC returns [{ current_session: X, is_new_session: Y }]
      finalSession = rpcResult[0].current_session;
      isNewSession = rpcResult[0].is_new_session;
      DebugLogger.process('Session Info via RPC', { session: finalSession, isNew: isNewSession });
  } else {
      // Should not happen if RPC works
      DebugLogger.error('RPC returned empty result', { result: rpcResult });
  }

  const result: SessionInfo = {
    courseId,
    courseName: courseData.name,
    currentSession: finalSession,
    isNewSession,
    isCapApplied: finalSession === 1, // Cap 70 applies if it's the very first session
  };

  DebugLogger.output('Session Info Result', result);
  DebugLogger.groupEnd();
  return result;
}

// --- Active/Archive Functions ---

/**
 * Get active questions count (not yet archived)
 * 'Active' or 'Pending Followup' counts as workload.
 */
export async function getActiveQuestionsCount(
  courseId: string,
  userId: string
): Promise<number> {
  // 1. Total Questions in Course
  const { count: totalQuestions, error: totalError } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId);

  if (totalError) {
    console.error('[SessionManager] Error counting total questions:', totalError);
    return 0;
  }

  // 2. Archived Questions for User
  // Count via join with questions table for course_id filter
  const { count: userArchivedCount } = await supabase
     .from('user_question_status')
     .select('id, questions!inner(course_id)', { count: 'exact', head: true })
     .eq('user_id', userId)
     .eq('status', 'archived')
     .eq('questions.course_id', courseId);

  return (totalQuestions || 0) - (userArchivedCount || 0);
}

// --- Progress Recording ---

/**
 * Record a quiz response and Update Shelf Status
 */
export async function recordQuizResponse(
  userId: string,
  questionId: string,
  chunkId: string | null,
  courseId: string,
  responseType: QuizResponseType, // 'correct' | 'incorrect' | 'blank'
  selectedAnswer: number | null,
  sessionNumber: number,
  isReviewQuestion: boolean = false,
  timeSpentMs: number = 0
): Promise<void> {
  DebugLogger.group('SessionManager: Record Response & Shelf Update', {
    userId,
    questionId,
    responseType,
  });

  // UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(questionId)) {
    DebugLogger.error('Invalid questionId UUID', { questionId });
    DebugLogger.groupEnd();
    return;
  }

  // 1. Check for previous attempts (State Tracking)
  // TASARIM KARARI: isRepeated aynı question_id bazında kontrol edilir.
  // Yani aynı konudan farklı sorular yanlış cevaplansa bile her biri "ilk hata" sayılır.
  // Bu kasıtlı bir tasarım tercihidir - konu bazlı tracking istenirse
  // user_quiz_progress tablosunda concept/topic bazlı sorgulama yapılmalı.
  const { count: priorAttempts } = await supabase
    .from('user_quiz_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('question_id', questionId);

  const isRepeated = (priorAttempts || 0) > 0;

  // 2. Record User Response
  const payload = {
    user_id: userId,
    question_id: questionId,
    chunk_id: chunkId,
    course_id: courseId,
    response_type: responseType,
    selected_answer: selectedAnswer,
    session_number: sessionNumber,
    is_review_question: isReviewQuestion,
    time_spent_ms: timeSpentMs
  };

  const { error } = await supabase.from('user_quiz_progress').insert(payload);
  if (error) {
    DebugLogger.error('Error recording user_quiz_progress', error);
  } else {
    DebugLogger.process('Progress recorded', { session: sessionNumber });
  }

  // 3. Status Update & Shelf System Logic (DTS)
  // Fetch Question Data for DTS Calculation
  const { data: questionDb } = await supabase
     .from('questions')
     .select('question_data, bloom_level, section_title')
     .eq('id', questionId)
     .single();

  if (questionDb) {
      const qData = questionDb.question_data as unknown as import('@/lib/ai/quiz-api').QuizQuestion;
      
      // Calculate W_total (Word Count)
      // Splitting by whitespace to approximate word count
      const textWords = (qData.q || '').split(/\s+/).length;
      const optionsWords = (qData.o || []).reduce((acc, curr) => acc + curr.split(/\s+/).length, 0);
      const Wtotal = textWords + optionsWords;

      // Calculate Dm (Difficulty Multiplier)
      // Knowledge -> Definition (1.0)
      // Application -> Relationship (1.2)
      // Analysis -> Analysis (1.5)
      let Dm = 1.0;
      if (questionDb.bloom_level === 'analysis') Dm = 1.5;
      else if (questionDb.bloom_level === 'application') Dm = 1.2;
      else Dm = 1.0; // knowledge

      // Calculate T_max (Ideal Time Threshold) in Seconds
      // Formula: Tmax = ((Wtotal / 180) * 60) + (15 * Dm)
      const TmaxSeconds = ((Wtotal / 180) * 60) + (15 * Dm);
      const TmaxMs = TmaxSeconds * 1000;

      DebugLogger.process('DTS Calculation', { Wtotal, Dm, TmaxSeconds, userTimeMs: timeSpentMs });

      // Determine Status
      if (responseType === 'correct') {
          // Check against T_max
          if (timeSpentMs <= TmaxMs) {
              // Correct & Fast enough -> Archived
              await supabase
                .from('user_question_status')
                .upsert({ user_id: userId, question_id: questionId, status: 'archived' as const }, { onConflict: 'user_id,question_id' });
              DebugLogger.process('Status -> Archived (DTS Pass)');
          } else {
              // Correct but Slow -> Pending Followup
              await supabase
                .from('user_question_status')
                .upsert({ user_id: userId, question_id: questionId, status: 'pending_followup' as const }, { onConflict: 'user_id,question_id' });
              DebugLogger.process('Status -> Pending Followup (DTS Fail: Too Slow)');
          }
      } else if (responseType === 'incorrect') {
          // Incorrect -> Pending Followup
          await supabase
            .from('user_question_status')
            .upsert({ user_id: userId, question_id: questionId, status: 'pending_followup' as const }, { onConflict: 'user_id,question_id' });
          DebugLogger.process('Status -> Pending Followup');

          // Trigger AI Follow-up (Logic moved to centralized Edge Function via QuizEngine)
      } else if (responseType === 'blank') {
          // Blank -> Active
          // "İlk Boş Geçme: Soru Active kalır"
          await supabase
            .from('user_question_status')
            .upsert({ user_id: userId, question_id: questionId, status: 'active' as const }, { onConflict: 'user_id,question_id' });
          DebugLogger.process('Status -> Active (Blank)');
      }
  }

  // 3. Update Mastery Score
  if (chunkId) {
    await incrementQuestionsSeen(userId, chunkId, courseId);
    
    // Fetch current score
    const { data: existingMastery } = await supabase
            .from('chunk_mastery')
            .select('mastery_score')
            .eq('user_id', userId)
            .eq('chunk_id', chunkId)
            .maybeSingle();

    const currentScore = existingMastery?.mastery_score ?? 0;
    // const totalQuestions = await getChunkQuestionCount(chunkId); // Unused
    
    // Calculate new score (using updated algo needed later)
    const { newScore } = calculateScoreChange(responseType, currentScore, isRepeated);
    
    await updateChunkMastery(userId, chunkId, courseId, newScore, sessionNumber);
  }
  
  DebugLogger.groupEnd();
}

/**
 * Update chunk mastery
 */
export async function updateChunkMastery(
  userId: string,
  chunkId: string,
  courseId: string,
  newScore: number,
  currentSession: number
): Promise<void> {
  const payload = {
    user_id: userId,
    chunk_id: chunkId,
    course_id: courseId,
    mastery_score: newScore,
    last_reviewed_session: currentSession,
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from('chunk_mastery')
    .upsert(payload, {
      onConflict: 'user_id,chunk_id',
    });
}

/**
 * Increment total questions seen for a chunk
 */
export async function incrementQuestionsSeen(
  userId: string,
  chunkId: string,
  courseId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('chunk_mastery')
    .select('total_questions_seen')
    .eq('user_id', userId)
    .eq('chunk_id', chunkId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('chunk_mastery')
      .update({
        total_questions_seen: (existing.total_questions_seen ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('chunk_id', chunkId);
  } else {
    // Create new record if it doesn't exist
    await supabase.from('chunk_mastery').insert({
      user_id: userId,
      chunk_id: chunkId,
      course_id: courseId,
      total_questions_seen: 1,
      mastery_score: 0,
      updated_at: new Date().toISOString(),
    });
  }
}

/**
 * Get total questions count for a chunk
 */
export async function getChunkQuestionCount(chunkId: string): Promise<number> {
  const { count, error } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('chunk_id', chunkId);

  if (error) return 10;
  return count && count > 0 ? count : 10;
}

// --- Review Queue Implementation ---

export interface ReviewItem {
  chunkId: string;
  questionId: string;
  courseId: string;
  priority: number; 
  status: 'active' | 'pending_followup' | 'archived';
}

export interface QuotaInfo {
  newQuota: number;
  reviewQuota: number;
  isMaintenanceMode: boolean;
  pendingReviewCount: number;
}

/**
 * Get pending review count
 */
export async function getPendingReviewCount(
  userId: string,
  courseId: string
): Promise<number> {
  return await getActiveQuestionsCount(courseId, userId);
}

/**
 * Get quota info for a session
 */
export async function getQuotaInfo(
  userId: string,
  courseId: string,
  currentSession: number,
  totalQuestionsPlanned: number = 10
): Promise<QuotaInfo> {
  const pendingReviewCount = await getPendingReviewCount(userId, courseId);
  
  // Simple logic: Fill with review first, then new
  const reviewQuota = Math.min(pendingReviewCount, totalQuestionsPlanned);
  const newQuota = Math.max(0, totalQuestionsPlanned - reviewQuota);

  return {
    newQuota,
    reviewQuota,
    isMaintenanceMode: false,
    pendingReviewCount,
  };
}

/**
 * Get review queue with Priority
 * Priority 1: Blank (Active)
 * Priority 2: Incorrect (Pending Followup)
 * Priority 3: Correct (Archived) - Only if we need to fill space (NOT IMPLEMENTED fully here, usually controlled by caller or separate 'archived' fetch)
 */
/**
 * Get review queue with Priority
 * Priority 1: Blank (Active)
 * Priority 2: Incorrect (Pending Followup)
 * Priority 3: Correct (Archived) - Backfill ONLY
 */
export async function getReviewQueue(
  userId: string,
  courseId: string,
  currentSession: number,
  slotCount: number = 5
): Promise<ReviewItem[]> {
  DebugLogger.group('SessionManager: Get Review Queue', { courseId, currentSession, slotCount });

  // Fetch questions with user status
  // We rely on RLS to filter user_question_status to only current user rows.
  // We fetch a batch of questions (e.g. 100) to filter locally.
  // Ideally we would filter server-side but 'status' is on joined table.
  // Workaround: We can't easily order by joined status.
  
  const { data: rawQuestions, error } = await supabase
    .from('questions')
    .select(`
        id, 
        chunk_id, 
        created_at,
        user_question_status (
            status
        )
    `)
    .eq('course_id', courseId)
    .limit(100); // Fetch candidate pool

  if (error || !rawQuestions) {
      console.error('[SessionManager] Error fetching review queue:', error);
      return [];
  }

  // Map and Filter
  const candidates: ReviewItem[] = [];

  for (const q of rawQuestions) {
      // Extract status safely
      // user_question_status will be an array (single or empty due to RLS/Unique) or object depending on types/relation
      const statusArr = q.user_question_status as unknown as { status: 'active' | 'archived' | 'pending_followup' }[];
      const userStatus = statusArr && statusArr.length > 0 ? statusArr[0].status : 'active'; // Default to active

      if (userStatus === 'archived') continue; // Skip archived for main queue

      let priority = 1; // Default for 'active'
      if (userStatus === 'pending_followup') priority = 2;
      
      candidates.push({
          chunkId: q.chunk_id || '',
          questionId: q.id,
          courseId,
          priority,
          status: userStatus
      });
  }

  // Sort by Priority (Lower priority number comes first)
  // As per user's previous code: Priority 1: Active, Priority 2: Pending Followup
  candidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return 0; // Maintain stable order for same priority
  });

  // Slice to fill the main queue
  const mainQueue = candidates.slice(0, slotCount);

  // If not full, Backfill with Archived (Priority 3)
  if (mainQueue.length < slotCount) {
      const needed = slotCount - mainQueue.length;
      DebugLogger.process(`Backfilling with ${needed} archived questions`);

      // 1. Prioritize Weak Chunks (Mastery < 70)
      const { data: weakChunks } = await supabase
        .from('chunk_mastery')
        .select('chunk_id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .lt('mastery_score', 70)
        .order('mastery_score', { ascending: true })
        .limit(20);

      const weakChunkIds = weakChunks?.map(c => c.chunk_id) || [];
      const gatheredArchived: ReviewItem[] = [];

      // Helper function to fetch archived questions
      const fetchArchived = async (limit: number, chunkIdsFilter?: string[]) => {
          let query = supabase
            .from('user_question_status')
            .select(`
                question_id, 
                questions!inner (
                    id, chunk_id, course_id, created_at
                )
            `)
            .eq('user_id', userId)
            .eq('status', 'archived')
            .eq('questions.course_id', courseId)
            .limit(limit);

          if (chunkIdsFilter && chunkIdsFilter.length > 0) {
              query = query.in('questions.chunk_id', chunkIdsFilter);
          }
          
          const { data } = await query;
          return data;
      };

      // 2. Fetch from Weak Chunks first
      if (weakChunkIds.length > 0) {
          const weakData = await fetchArchived(needed, weakChunkIds);
          if (weakData) {
              type ArchivedItem = { question_id: string; questions: { id: string; chunk_id: string | null; course_id: string; created_at: string } };
              const items: ReviewItem[] = (weakData as unknown as ArchivedItem[]).map(item => ({
                 chunkId: item.questions.chunk_id || '',
                 questionId: item.questions.id,
                 courseId,
                 priority: 3,
                 status: 'archived' as const
              }));
              gatheredArchived.push(...items);
          }
      }

      // 3. If needed more, fetch general archived (ignoring weak ones to avoid dupes? Or just fetch set unique)
      if (gatheredArchived.length < needed) {
          const remainingNeeded = needed - gatheredArchived.length;
          // Fetch general (we might get duplicates from weak chunks if we don't exclude, 
          // but exclusion is expensive. Simple Set deduplication is better)
          
          const generalData = await fetchArchived(remainingNeeded + gatheredArchived.length); // Fetch a bit more
          
          if (generalData) {
              type ArchivedItem = { question_id: string; questions: { id: string; chunk_id: string | null; course_id: string; created_at: string } };
              const items: ReviewItem[] = (generalData as unknown as ArchivedItem[]).map(item => ({
                 chunkId: item.questions.chunk_id || '',
                 questionId: item.questions.id,
                 courseId,
                 priority: 3,
                 status: 'archived' as const
              }));
              gatheredArchived.push(...items);
          }
      }

      // Deduplicate by questionId
      const uniqueArchived = Array.from(new Map(gatheredArchived.map(item => [item.questionId, item])).values()).slice(0, needed);
      
      mainQueue.push(...uniqueArchived);
  }

  DebugLogger.output('Final Review Queue', mainQueue);
  DebugLogger.groupEnd();
  return mainQueue;
}
