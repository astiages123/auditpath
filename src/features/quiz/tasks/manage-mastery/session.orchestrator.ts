/**
 * Session Manager Module (Refactored for Shelf System)
 *
 * Handles session tracking and "Shelf System" logic:
 * - Updates question status based on answers (Shelfing)
 * - Manages Mastery Score
 */

import { supabase } from "@/shared/lib/core/supabase";
import { Database } from "@/shared/types/supabase";
import { QuizQuestion } from "@/features/quiz/shared/types";
import {
  calculateNextReviewSession,
  calculateScoreChange,
  calculateShelfStatus,
  type QuizResponseType,
} from "./engine/srs-algorithm";
import { DebugLogger } from "@/features/quiz/lib/debug-logger";
import {
  type FailedConceptInfo,
  getPrerequisiteQuestions,
} from "./engine/prerequisite-engine";

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
 * Get or create session counter for a course
 * Implements Daily Increment & Reset logic.
 */
export async function getSessionInfo(
  userId: string,
  courseId: string,
): Promise<SessionInfo | null> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  DebugLogger.group("SessionManager: Get Session Info", {
    userId: userId,
    courseId: courseId,
    today: today,
  });

  // First, get course name
  const { data: courseData } = await supabase
    .from("courses")
    .select("name")
    .eq("id", courseId)
    .single();

  if (!courseData) {
    DebugLogger.error("Course not found", { courseId });
    DebugLogger.groupEnd();
    return null;
  }

  // Use RPC for atomic increment to avoid race conditions
  // Cast to any because generated types are not updated yet
  // Cast with explicit function signature to satisfy lint
  const { data: rpcResult, error: rpcError } =
    await (supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<
      {
        data: { current_session: number; is_new_session: boolean }[] | null;
        error: { message: string } | null;
      }
    >)(
      "increment_course_session",
      {
        p_user_id: userId,
        p_course_id: courseId,
      },
    );

  let finalSession = 1;
  let isNewSession = false;

  if (rpcError) {
    DebugLogger.error("RPC Error (increment_course_session)", rpcError);
    // Fallback: Read-only check as fail-safe or throw?
    // Let's assume migration might be missing and do basic check, but log heavily.
    // For now, let's try the old manual way as fallback to not break app if migration not applied.

    // Check if counter exists
    const { data: existing } = await supabase
      .from("course_session_counters")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existing) {
      if (existing.last_session_date !== today) {
        finalSession = (existing.current_session ?? 0) + 1;
        isNewSession = true;
        await supabase.from("course_session_counters").update({
          current_session: finalSession,
          last_session_date: today,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        finalSession = existing.current_session ?? 1;
      }
    } else {
      finalSession = 1;
      isNewSession = true;
      const { error: insertError } = await supabase.from(
        "course_session_counters",
      ).insert({
        user_id: userId,
        course_id: courseId,
        current_session: finalSession,
        last_session_date: today,
      });

      if (insertError) {
        // Handle race?
        console.error("Error creating session counter", insertError);
      }
      DebugLogger.process("First Session Created", { session: finalSession });
    }
  } else if (rpcResult && Array.isArray(rpcResult) && rpcResult.length > 0) {
    // RPC returns [{ current_session: X, is_new_session: Y }]
    finalSession = rpcResult[0].current_session;
    isNewSession = rpcResult[0].is_new_session;
    DebugLogger.process("Session Info via RPC", {
      session: finalSession,
      isNew: isNewSession,
    });
  } else {
    // Should not happen if RPC works
    DebugLogger.error("RPC returned empty result", { result: rpcResult });
  }

  const result: SessionInfo = {
    courseId,
    courseName: courseData.name,
    currentSession: finalSession,
    isNewSession,
    isCapApplied: finalSession === 1, // Cap 70 applies if it's the very first session
  };

  DebugLogger.output("Session Info Result", result);
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
  userId: string,
): Promise<number> {
  // 1. Total Questions in Course
  const { count: totalQuestions, error: totalError } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);

  if (totalError) {
    console.error(
      "[SessionManager] Error counting total questions:",
      totalError,
    );
    return 0;
  }

  // 2. Archived Questions for User
  // Count via join with questions table for course_id filter
  const { count: userArchivedCount } = await supabase
    .from("user_question_status")
    .select("id, questions!inner(course_id)", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "archived")
    .eq("questions.course_id", courseId);

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
  timeSpentMs: number = 0,
  diagnosis?: string,
  insight?: string,
): Promise<{ isTopicRefreshed: boolean; isChainBonusApplied?: boolean }> {
  DebugLogger.group("SessionManager: Record Response & Shelf Update", {
    userId,
    questionId,
    responseType,
  });

  // UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(questionId)) {
    DebugLogger.error("Invalid questionId UUID", { questionId });
    DebugLogger.groupEnd();
    return { isTopicRefreshed: false };
  }

  if (chunkId && !uuidRegex.test(chunkId)) {
    DebugLogger.error("Invalid chunkId UUID", { chunkId });
    // We can continue without chunk update, treating it as general practice
    chunkId = null;
  }

  // 1. Check for previous attempts (State Tracking)
  // TASARIM KARARI: isRepeated aynı question_id bazında kontrol edilir.
  // Yani aynı konudan farklı sorular yanlış cevaplansa bile her biri "ilk hata" sayılır.
  // Bu kasıtlı bir tasarım tercihidir - konu bazlı tracking istenirse
  // user_quiz_progress tablosunda concept/topic bazlı sorgulama yapılmalı.
  const { count: priorAttempts } = await supabase
    .from("user_quiz_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("question_id", questionId);

  const isRepeated = (priorAttempts || 0) > 0;
  const resilienceBonus = 1.0;

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
    time_spent_ms: timeSpentMs,
    ai_diagnosis: diagnosis,
    ai_insight: insight,
  };

  const { error } = await supabase.from("user_quiz_progress").insert(payload);
  if (error) {
    DebugLogger.error("Error recording user_quiz_progress", error);
  } else {
    DebugLogger.process("Progress recorded", { session: sessionNumber });
  }

  // 3. Status Update & Shelf System Logic (DTS)
  // Fetch Question Data for DTS Calculation
  const { data: questionDb } = await supabase
    .from("questions")
    .select(
      "question_data, bloom_level, section_title, usage_type, concept_title, chunk_id, parent_question_id",
    )
    .eq("id", questionId)
    .single();

  if (questionDb) {
    const qData = questionDb
      .question_data as unknown as QuizQuestion;

    // Calculate W_total (Word Count)
    // Splitting by whitespace to approximate word count
    const textWords = (qData.q || "").split(/\s+/).length;
    const optionsWords = (qData.o || []).reduce(
      (acc: number, curr: string) => acc + curr.split(/\s+/).length,
      0,
    );
    const Wtotal = textWords + optionsWords;

    // Calculate Dm (Difficulty Multiplier) and buffer
    // Knowledge -> Definition (1.0)
    // Application -> Relationship (1.2)
    // Analysis -> Analysis (1.5)
    let Dm = 1.0;
    let Tbuffer = 0;

    if (questionDb.bloom_level === "analysis") {
      Dm = 1.5;
      Tbuffer = 30;
    } else if (questionDb.bloom_level === "application") {
      Dm = 1.2;
      Tbuffer = 15;
    } else {
      // knowledge or default
      Dm = 1.0;
      Tbuffer = 5;
    }

    // HARDENING FOR SIMULATION (DENEME)
    // If usage_type is 'deneme', we reduce the Cognitive Buffer by 50%
    // to simulate exam pressure.
    if (questionDb.usage_type === "deneme") {
      Tbuffer = Math.floor(Tbuffer * 0.5);
      DebugLogger.process("Simulation Mode: DTS Buffer hardened", {
        originalBuffer: Tbuffer * 2,
        newBuffer: Tbuffer,
      });
    }

    // --- DENSITY SCORE & TMAX CALCULATION ---
    // Fetch density score from chunk metadata if not provided
    // Used to adjust WPM (Words Per Minute) expectation
    let densityCoeff = 1.0;
    const targetChunkId = chunkId ||
      (questionDb as { chunk_id: string | null }).chunk_id;

    if (targetChunkId) {
      const { data: chunkMeta } = await supabase
        .from("note_chunks")
        .select("metadata")
        .eq("id", targetChunkId)
        .single();

      if (chunkMeta?.metadata) {
        const density =
          (chunkMeta.metadata as { density_score?: number }).density_score || 2;
        // Mapping: 1-2 -> 1.0, 3 -> 0.75, 4-5 -> 0.6
        if (density >= 4) densityCoeff = 0.6;
        else if (density === 3) densityCoeff = 0.75;
        else densityCoeff = 1.0;

        if (density >= 3) {
          DebugLogger.process("Density Multiplier Applied", {
            density,
            densityCoeff,
          });
        }
      }
    }

    // Calculate T_max (Ideal Time Threshold) in Seconds
    // Formula: Tmax = ((Wtotal / (180 * DensityCoeff)) * 60) + (15 * Dm) + Tbuffer
    const TmaxSeconds = ((Wtotal / (180 * densityCoeff)) * 60) + (15 * Dm) +
      Tbuffer;
    const TmaxMs = TmaxSeconds * 1000;

    DebugLogger.process("DTS Calculation", {
      Wtotal,
      Dm,
      Tbuffer,
      TmaxSeconds,
      userTimeMs: timeSpentMs,
    });

    // 2.5 Get Current Status for 3-Strike Logic
    const { data: currentStatusData } = await supabase
      .from("user_question_status")
      .select("consecutive_success, consecutive_fails")
      .eq("user_id", userId)
      .eq("question_id", questionId)
      .maybeSingle();

    const currentConsecutiveSuccess = (currentStatusData as
      | Database["public"]["Tables"]["user_question_status"]["Row"]
      | null)?.consecutive_success ?? 0;
    const isCorrect = responseType === "correct";
    // TmaxMs check for "Fast"
    const isFast = timeSpentMs <= TmaxMs;

    // Calculate New Status using Shelf System
    const { newStatus, newSuccessCount } = calculateShelfStatus(
      currentConsecutiveSuccess,
      isCorrect,
      isFast,
    );

    // Calculate Next Review Session
    let nextReviewSession: number | null = null;
    // Archive = No more reviews (or special handling).
    // Pending Followup = Schedule next review.
    if (newStatus === "pending_followup") {
      nextReviewSession = calculateNextReviewSession(
        sessionNumber,
        newSuccessCount,
      );
    }

    // Consecutive fails tracking (kept for metrics, separate from success chain)
    let consecutiveFails = (currentStatusData as
      | Database["public"]["Tables"]["user_question_status"]["Row"]
      | null)?.consecutive_fails ?? 0;
    if (responseType === "incorrect") {
      consecutiveFails += 1;
    } else if (responseType === "correct") {
      consecutiveFails = 0;
    }

    DebugLogger.process("SRS Status Update", {
      oldSuccess: currentConsecutiveSuccess,
      newSuccess: newSuccessCount,
      isCorrect,
      isFast,
      newStatus,
      nextSession: nextReviewSession,
    });

    // Apply Status Update
    await supabase
      .from("user_question_status")
      .upsert({
        user_id: userId,
        question_id: questionId,
        status: newStatus,
        consecutive_fails: consecutiveFails,
        consecutive_success: newSuccessCount,
        next_review_session: nextReviewSession,
        // Remove or nullify date-based next_review_at to avoid confusion?
        // Let's keep it null if we are moving away, or update it optionally.
        // For now, we focus on next_review_session.
      }, { onConflict: "user_id,question_id" });
  }

  // 3. Update Mastery Score
  let isTopicRefreshed = false;

  if (chunkId) {
    // 3. Update Mastery Score (Unique Question Tracking)
    // "Unique Coverage" logic: count questions with status 'archived' or 'pending_followup' inside this chunk.
    // NOTE: 'pending_followup' means at least 1 success in Shelf System.

    // Correct join syntax for counting:
    const { count: realUniqueCount } = await supabase
      .from("user_question_status")
      .select("question_id, questions!inner(chunk_id)", {
        count: "exact",
        head: true,
      })
      .eq("user_id", userId)
      .eq("questions.chunk_id", chunkId)
      .in("status", ["archived", "pending_followup"]);

    const uniqueSolved = realUniqueCount ?? 0;
    const totalQuestionsInChunk = await getChunkQuestionCount(chunkId);

    // Formula: MasteryScore = (UniqueSolved / Total * 60) + (SRS_Score * 0.4)
    const coverageRatio = Math.min(1, uniqueSolved / totalQuestionsInChunk);
    const coverageScore = coverageRatio * 60;

    const { data: chunkMasteryData } = await supabase
      .from("chunk_mastery")
      .select("mastery_score")
      .eq("user_id", userId)
      .eq("chunk_id", chunkId)
      .maybeSingle();

    const previousMastery = chunkMasteryData?.mastery_score ?? 0;

    const { newScore: srsComponent } = calculateScoreChange(
      responseType,
      previousMastery,
      isRepeated,
    );

    const finalCalculatedScore = Math.round(
      coverageScore + (srsComponent * 0.4),
    );

    DebugLogger.process("New Mastery Formula", {
      uniqueSolved,
      totalQuestions: totalQuestionsInChunk,
      coverageRatio,
      coverageScore,
      srsInput: srsComponent,
      finalScore: finalCalculatedScore,
    });

    let safeFinalScore = finalCalculatedScore;
    if (
      Number.isNaN(finalCalculatedScore) ||
      !Number.isFinite(finalCalculatedScore)
    ) {
      safeFinalScore = 0;
    }

    isTopicRefreshed = await updateChunkMastery(
      userId,
      chunkId,
      courseId,
      safeFinalScore,
      sessionNumber,
      uniqueSolved / totalQuestionsInChunk >= 0.8,
    );
  }

  DebugLogger.groupEnd();
  return { isTopicRefreshed, isChainBonusApplied: resilienceBonus > 1.0 };
}

/**
 * Update chunk mastery
 * Returns true if last_full_review_at was updated AND it was previously old (triggering a refresh toast)
 */
export async function updateChunkMastery(
  userId: string,
  chunkId: string,
  courseId: string,
  newScore: number,
  currentSession: number,
  shouldUpdateReviewTime: boolean,
): Promise<boolean> {
  const now = new Date();

  // 1. Fetch existing to check previous last_full_review_at
  const { data: existing } = await supabase
    .from("chunk_mastery")
    .select("last_full_review_at")
    .eq("user_id", userId)
    .eq("chunk_id", chunkId)
    .maybeSingle();

  let isRefreshedForToast = false;
  let newReviewTime = existing?.last_full_review_at;

  if (shouldUpdateReviewTime) {
    const lastReview = existing?.last_full_review_at
      ? new Date(existing.last_full_review_at)
      : null;
    const TEN_MINUTES = 10 * 60 * 1000;

    // Update if never reviewed OR older than 10 minutes (to avoid spamming toast in same session)
    if (!lastReview || (now.getTime() - lastReview.getTime() > TEN_MINUTES)) {
      newReviewTime = now.toISOString();
      isRefreshedForToast = true;
    } else {
      // Even if recent, we keeping it fresh is fine, but maybe don't toast?
      // Code-wise, let's update it to NOW anyway to be precise, but return false for toast.
      newReviewTime = now.toISOString();
      isRefreshedForToast = false;
    }
  }

  const payload: {
    user_id: string;
    chunk_id: string;
    course_id: string;
    mastery_score: number;
    last_reviewed_session: number;
    updated_at: string;
    last_full_review_at?: string;
  } = {
    user_id: userId,
    chunk_id: chunkId,
    course_id: courseId,
    mastery_score: Math.round(newScore),
    last_reviewed_session: currentSession,
    updated_at: now.toISOString(),
  };

  if (shouldUpdateReviewTime && newReviewTime) {
    payload.last_full_review_at = newReviewTime;
  }

  // Sanitization
  if (Number.isNaN(newScore) || !Number.isFinite(newScore)) {
    console.error("[SessionManager] Invalid mastery score detected", {
      newScore,
    });
    return false; // Abort update to prevent 400
  }

  await supabase
    .from("chunk_mastery")
    .upsert(payload, {
      onConflict: "user_id,chunk_id",
    });

  return isRefreshedForToast;
}

/**
 * Get total questions count for a chunk
 */
export async function getChunkQuestionCount(chunkId: string): Promise<number> {
  const { count, error } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("chunk_id", chunkId);

  if (error) return 10;
  return count && count > 0 ? count : 10;
}

// --- Review Queue Implementation ---

export interface ReviewItem {
  chunkId: string;
  questionId: string;
  courseId: string;
  priority: number;
  status: "active" | "pending_followup" | "archived";
  reason?: string;
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
  courseId: string,
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
  totalQuestionsPlanned: number = 25,
): Promise<QuotaInfo> {
  const pendingReviewCount = await getPendingReviewCount(userId, courseId);

  // Waterfall Model: We always aim to fill 'totalQuestionsPlanned' (25)
  // The queue will handle the mix of Pending/Active/Archived.
  // So 'reviewQuota' is simply the target size.
  const reviewQuota = totalQuestionsPlanned;
  const newQuota = 0; // Deprecated/Unused in new model as everything is in queue

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
  slotCount: number = 25,
): Promise<ReviewItem[]> {
  DebugLogger.group("SessionManager: Get Review Queue (Waterfall)", {
    courseId,
    currentSession,
    slotCount,
  });

  const finalQueue: ReviewItem[] = [];

  // --- 0. PRIORITY 0: Follow-up Questions (Hata Telafisi) ---
  // Those that have a parent_question_id are strictly follow-ups.
  // We want to prioritize them above ALL else if they are not yet resolved (archived/retired).
  // "Pending Followup" status usually covers this, BUT original questions also get that status.
  // We specifically want the *generated follow-up question* itself to appear.
  // Logic:
  // 1. Find questions with parent_question_id != null for this course.
  // 2. That satisfy: user has NOT archived/retired them yet.
  // 3. Status might be 'active' (newly generated) or 'pending_followup' (failed once).

  const MAX_FOLLOWUP = 5;

  const { data: followUps } = await supabase
    .from("questions")
    .select(`
        id, chunk_id, course_id, parent_parent:parent_question_id,
        user_question_status (status)
    `)
    .eq("course_id", courseId)
    .not("parent_question_id", "is", null);

  if (followUps && followUps.length > 0) {
    const activeFollowUps: ReviewItem[] = [];

    for (const f of followUps) {
      const uStatusArr = f.user_question_status as { status: string }[];
      const uStatus = uStatusArr && uStatusArr.length > 0
        ? uStatusArr[0].status
        : null;

      // If status is 'retired' or 'archived', user cleared it.
      if (uStatus === "retired" || uStatus === "archived") continue;

      // If it's active (null or 'active') OR pending_followup (failed again), we show it.
      // Priority 0 means "Do this first".
      activeFollowUps.push({
        chunkId: f.chunk_id || "",
        questionId: f.id,
        courseId,
        priority: 0, // CRITICAL: Highest Priority
        status: (uStatus || "active") as
          | "active"
          | "archived"
          | "pending_followup",
      });
    }

    // Add to queue
    // Limit to avoid overwhelming if many stack up (though unlikely with 3-strike rule on original)
    finalQueue.push(...activeFollowUps.slice(0, MAX_FOLLOWUP));

    DebugLogger.process(
      `Waterfall Step 0: Added ${
        Math.min(activeFollowUps.length, MAX_FOLLOWUP)
      } Follow-up questions (Priority 0)`,
    );
  }

  // --- 0.5 PRIORITY 0.5: Prerequisite Injection (Waterfall) ---
  // Check for recent failures to identify gaps.
  const { data: recentFailures } = await supabase
    .from("user_question_status")
    .select(`
        question_id, consecutive_fails, 
        questions!inner (chunk_id, concept_title)
    `)
    .eq("user_id", userId)
    .eq("questions.course_id", courseId)
    .gt("consecutive_fails", 0)
    .order("updated_at", { ascending: false })
    .limit(5);

  if (recentFailures && recentFailures.length > 0) {
    const failedConcepts: FailedConceptInfo[] = recentFailures
      .filter((f) => f.questions?.concept_title && f.questions?.chunk_id)
      .map((f) => ({
        chunkId: f.questions?.chunk_id || "",
        conceptTitle: f.questions?.concept_title || "",
        consecutiveFails: f.consecutive_fails || 1,
      }));

    const prereqQuestions = await getPrerequisiteQuestions(
      userId,
      courseId,
      failedConcepts,
    );

    if (prereqQuestions.length > 0) {
      for (const pq of prereqQuestions) {
        // Check if already in queue or resolved?
        // Ideally we just add them.
        finalQueue.push({
          chunkId: pq.chunkId,
          questionId: pq.questionId,
          courseId,
          priority: 0, // Top priority sharing with Follow-ups
          status: "active",
          reason: pq.reason,
        });
      }
      DebugLogger.process(
        `Waterfall Step 0.5: Added ${prereqQuestions.length} Prerequisite questions`,
      );
    }
  }

  // --- 1. Pending Followup (Max 10) ---
  const MAX_PENDING = 10;

  const { data: pendingData, error: pendingError } = await supabase
    .from("user_question_status")
    .select(`
        question_id,
        updated_at, 
        questions!inner (
            id, chunk_id, course_id
        )
    `)
    .eq("user_id", userId)
    .eq("questions.course_id", courseId)
    .eq("status", "pending_followup")
    .order("updated_at", { ascending: true })
    .limit(MAX_PENDING);

  if (pendingError) {
    console.error("Error fetching pending questions:", pendingError);
  } else if (pendingData) {
    const items: ReviewItem[] = pendingData.map((p) => ({
      chunkId: p.questions?.chunk_id || "",
      questionId: p.question_id,
      courseId,
      priority: 1,
      status: "pending_followup",
    }));

    // Filter out duplicates! (If a question was already added in Step 0 as a follow-up)
    const existingIds = new Set(finalQueue.map((i) => i.questionId));
    const newItems = items.filter((i) => !existingIds.has(i.questionId));

    finalQueue.push(...newItems);
  }

  DebugLogger.process(
    `Waterfall Step 1: Added ${finalQueue.length} Pending questions`,
  );

  // 1.5 Aging (Tozlanma) Injection (Max 5)
  const AGING_LIMIT = 5;

  // Changed: Use next_review_session instead of timestamp
  const { data: sessionAged } = await supabase
    .from("user_question_status")
    .select(`
        question_id,
        questions!inner (
            id, chunk_id, course_id
        )
    `)
    .eq("user_id", userId)
    .eq("status", "archived") // Only archived/retired items come back for review?
    .eq("questions.course_id", courseId)
    .lte("next_review_session", currentSession) // Session-based check
    .limit(AGING_LIMIT);

  if (sessionAged && sessionAged.length > 0) {
    const agedItems: ReviewItem[] = sessionAged.map((p) => ({
      chunkId: p.questions?.chunk_id || "",
      questionId: p.question_id,
      courseId,
      priority: 1.5,
      status: "archived",
      reason: "Session Due",
    }));
    finalQueue.push(...agedItems);
    DebugLogger.process(
      `Waterfall Step 1.5: Injected ${agedItems.length} questions due by next_review_session`,
    );
  }

  // Fallback: Old chunk-based aging for questions without next_review_at
  const neededFallback = AGING_LIMIT - (sessionAged?.length || 0);
  if (neededFallback > 0) {
    const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString();

    const { data: agedChunks } = await supabase
      .from("chunk_mastery")
      .select("chunk_id, last_full_review_at")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .lt("last_full_review_at", SEVEN_DAYS_AGO)
      .limit(10);

    if (agedChunks && agedChunks.length > 0) {
      const agedChunkIds = agedChunks.map((c) => c.chunk_id);

      // Fetch random 'archived' questions from these chunks
      // To get 'random' efficiently without stored procedure is hard.
      // We'll fetch a batch and shuffle in memory.
      const { data: agedQuestions } = await supabase
        .from("user_question_status")
        .select(`
            question_id,
            questions!inner (
                id, chunk_id, course_id
            )
        `)
        .eq("user_id", userId)
        .eq("status", "archived")
        // Filter by aged chunks
        .in("questions.chunk_id", agedChunkIds)
        .limit(20);

      if (agedQuestions && agedQuestions.length > 0) {
        // Shuffle
        const shuffled = agedQuestions.sort(() => 0.5 - Math.random());
        const selectedAged = shuffled.slice(0, AGING_LIMIT);

        const agedItems: ReviewItem[] = selectedAged.map((p) => ({
          chunkId: p.questions?.chunk_id || "",
          questionId: p.question_id,
          courseId,
          priority: 1.5, // Between Pending (1) and Active (2)
          status: "archived",
        }));

        // Insert after Pending (which are already in finalQueue)
        // Pending check above pushes to finalQueue
        finalQueue.push(...agedItems);
        DebugLogger.process(
          `Waterfall Step 1.5: Injected ${agedItems.length} Aged questions`,
        );
      } else {
        DebugLogger.process(
          "Waterfall Step 1.5: No eligible questions found in aged chunks",
        );
      }
    } else {
      DebugLogger.process("Waterfall Step 1.5: No aged chunks found");
    }
  }

  // --- 2. Active / New (Fill up to 20) ---
  const TARGET_ACTIVE_TOTAL = 20;
  const neededActive = TARGET_ACTIVE_TOTAL - finalQueue.length;

  if (neededActive > 0) {
    // Fetch Active (New) questions.
    // Logic: Questions for course NOT in user_question_status (or status='active' if blank handled that way)
    // Since NOT IN is hard with simple filtering, we use RPC or client-side filter if dataset small.
    // But dataset might be large.
    // Alternative: Active questions are those where user_question_status IS NULL.
    // Supabase: .is('user_question_status', null) on a left join?
    // Supabase JS SDK doesn't support easy left-join filtering on null relation in one go easily without manual join.

    // Strategy: Fetch a batch of Candidate IDs that are NOT archived or pending.
    // Or easier: Fetch ALL question IDs for course, filter out known status IDs.
    // BUT 'status' table grows.
    // Let's rely on the previous approach: Fetch candidates and filter.
    // But we need to ensure we get "New" ones.

    // Let's try extracting IDs of non-new questions first?
    // Max ids to exclude? Could be thousands.

    // Use existing 'rawQuestions' approach but optimize?
    // Given the requirement, let's try fetching 50 candidates and filtering.

    // We also need to know which ones have status.
    // It's better to fetch questions + status and filter in memory since we limit to 100 which is cheap.

    const { data: rawQuestions } = await supabase
      .from("questions")
      .select(`
            id, chunk_id,
            user_question_status!left (
                status
            )
        `)
      .eq("course_id", courseId)
      // Bu kullanıcının kendi statülerini filtrele (RLS varsa otomatik, yoksa manuel gerekebilir)
      // Ancak LEFT JOIN'de NULL'ları kaybetmemek için .or() içinde kontrol ediyoruz.
      .or(
        `status.is.null,status.eq.active`,
        { foreignTable: "user_question_status" },
      )
      .limit(neededActive);

    if (rawQuestions) {
      const activeCandidates: ReviewItem[] = rawQuestions.map((q) => ({
        chunkId: q.chunk_id || "",
        questionId: q.id,
        courseId,
        priority: 2,
        status: "active",
      }));

      finalQueue.push(...activeCandidates);
    }
  }

  DebugLogger.process(
    `Waterfall Step 2: Total now ${finalQueue.length} (Target > 20)`,
  );

  // --- 3. Archived / Backfill (Fill rest up to 25) ---
  const finalTarget = slotCount;
  const neededArchived = finalTarget - finalQueue.length;
  if (neededArchived > 0) {
    DebugLogger.process(
      `Waterfall Step 3: Backfilling ${neededArchived} archived questions`,
    );

    // Strategy: Fetch chunky mastery with low scores, then questions.
    const { data: weakChunks } = await supabase
      .from("chunk_mastery")
      .select("chunk_id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .order("mastery_score", { ascending: true }) // Lowest score first
      .limit(20);

    const chunkIds = weakChunks?.map((c: { chunk_id: string }) => c.chunk_id) ||
      [];
    const archivedCandidates: ReviewItem[] = [];

    // Fetch archived questions
    // We prioritize those in weak chunks.
    const { data: weakArchived } = await (chunkIds.length > 0
      ? supabase
        .from("user_question_status")
        .select(`
                question_id,
                questions!inner (
                    id, chunk_id, course_id
                )
            `)
        .eq("user_id", userId)
        .eq("status", "archived")
        .eq("questions.course_id", courseId)
        .in("questions.chunk_id", chunkIds)
        .limit(50)
      : Promise.resolve({
        data: null as {
          question_id: string;
          questions: { id: string; chunk_id: string; course_id: string } | null;
        }[] | null,
        error: null,
      }));

    if (weakArchived) {
      const items: ReviewItem[] = weakArchived.map((p) => ({
        chunkId: p.questions?.chunk_id || "",
        questionId: p.question_id,
        courseId,
        priority: 3,
        status: "archived" as const,
      }));

      // Sort items by existing chunk order in 'chunkIds' (which is sorted by score)
      items.sort((a, b) => {
        const idxA = chunkIds.indexOf(a.chunkId);
        const idxB = chunkIds.indexOf(b.chunkId);
        // If not found (shouldn't happen), push to end
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });

      archivedCandidates.push(...items);
    }

    // If we still need more, fetch ANY archived
    if (archivedCandidates.length < neededArchived) {
      const { data: otherArchived } = await supabase
        .from("user_question_status")
        .select(`
                    question_id,
                    questions!inner (
                        id, chunk_id, course_id
                    )
                 `)
        .eq("user_id", userId)
        .eq("status", "archived")
        .eq("questions.course_id", courseId)
        .limit(neededArchived + 10);

      if (otherArchived) {
        const items: ReviewItem[] = otherArchived.map((p) => ({
          chunkId: p.questions?.chunk_id || "",
          questionId: p.question_id,
          courseId,
          priority: 3,
          status: "archived" as const,
        }));
        archivedCandidates.push(...items);
      }
    }

    // Deduplicate by questionId
    const uniqueArchived = Array.from(
      new Map(archivedCandidates.map((item) => [item.questionId, item]))
        .values(),
    );

    // Add to final
    finalQueue.push(...uniqueArchived.slice(0, neededArchived));
  }

  DebugLogger.output("Final Waterfall Queue", finalQueue);
  DebugLogger.groupEnd();
  return finalQueue;
}

// --- Version Guard ---

/**
 * Get the latest content version for a course
 * Used for Version Guard to detect stale sessions
 */
export async function getContentVersion(
  courseId: string,
): Promise<string | null> {
  const { data, error } = await (supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: string | null; error: { message: string } | null }>)(
    "get_course_content_version",
    {
      p_course_id: courseId,
    },
  );

  if (error) {
    console.warn("[SessionManager] Error fetching content version:", error);
    return null;
  }

  return data as string;
}
