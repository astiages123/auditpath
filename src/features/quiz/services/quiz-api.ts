/**
 * AuditPath Quiz API
 *
 * Soru üretimi artık client-side'da yapılıyor (quiz-generator.ts).
 * Bu modül veritabanı işlemleri ve kota hesaplama için kullanılır.
 */

import { supabase } from "@/shared/lib/core/supabase";
import { calculateQuota } from "@/shared/lib/core/quota";

// --- Types ---
export interface QuizQuestion {
  q: string; // Question text
  o: string[]; // 5 options
  a: number; // Correct index
  exp: string; // Explanation
  img?: string | null;
  imgPath?: string | null;
  id?: string;
}

export type QuestionUsageType = "antrenman" | "arsiv" | "deneme";

export interface QuizGenerationResult {
  success: boolean;
  question?: QuizQuestion;
  error?: string;
  status?: "generated" | "quota_reached" | "error";
}

export interface QuotaStatus {
  used: number;
  quota: { total: number };
  wordCount: number;
  conceptCount: number;
  isFull: boolean;
  status: string; // "SYNCED" | "PROCESSING" | "COMPLETED" | "FAILED"
}

/**
 * Fetch questions for a session from the database
 */
export async function fetchQuestionsForSession(
  chunkId: string,
  count: number,
  userId: string,
  usageType: QuestionUsageType = "antrenman",
): Promise<QuizQuestion[]> {
  try {
    // 1. Get already solved IDs to exclude
    const { data: solved } = await supabase
      .from("user_quiz_progress")
      .select("question_id")
      .eq("user_id", userId)
      .eq("chunk_id", chunkId);

    const solvedIds = new Set(solved?.map((s) => s.question_id) || []);

    // 2. Fetch available questions
    const query = supabase
      .from("questions")
      .select("id, question_data, course:courses(course_slug)")
      .eq("chunk_id", chunkId)
      .eq("usage_type", usageType)
      .limit(count + solvedIds.size);

    const { data: questions, error } = await query;

    if (error || !questions) return [];

    // 3. Filter and Format
    return questions
      .filter((q) => !solvedIds.has(q.id))
      .slice(0, count)
      .map((q) => {
        const question = q.question_data as unknown as QuizQuestion;
        question.id = q.id;
        // Inject local path for images if present
        const course = q.course as unknown as { course_slug: string };
        if (question.img && course?.course_slug) {
          question.imgPath = `/notes/${course.course_slug}/media/`;
        }
        return question;
      });
  } catch (e) {
    console.error("[QuizApi] Error fetching questions:", e);
    return [];
  }
}

// ...

/**
 * Get quota status for a chunk (UI info)
 */
export async function getChunkQuotaStatus(
  chunkId: string,
): Promise<QuotaStatus | null> {
  const { data: chunk } = await supabase
    .from("note_chunks")
    .select("id, word_count, metadata, status")
    .eq("id", chunkId)
    .single();

  if (!chunk) return null;

  const wordCount = chunk.word_count || 0;
  const metadata = chunk.metadata as Record<string, unknown> || {};
  const conceptMap = (metadata.concept_map as unknown[]) || [];
  const conceptCount = conceptMap.length;

  // Section Information - metadata üzerinden alınabilirse al, yoksa 1 varsay
  const sectionCount = (metadata.sections as unknown[])?.length || 1;

  const quota = calculateQuota(wordCount, conceptCount, sectionCount);

  // Get existing question count
  const { count: usedCount } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("chunk_id", chunkId);

  const used = usedCount || 0;

  return {
    used,
    quota: { total: quota.total },
    wordCount,
    conceptCount,
    isFull: used >= quota.total,
    status: chunk.status || "SYNCED",
  };
}

/**
 * Placeholder for legacy calls - now just a thin wrapper or empty
 */
export async function checkApiUsage() {
  return { isAvailable: true };
}

export async function getQuizQuotaAction() {
  return { success: true };
}

// These are now empty as logic moved to Edge Function
export async function generateQuizQuestionBatch(): Promise<
  { success: boolean; results: { success: boolean; error?: string }[] }
> {
  return { success: false, results: [] };
}
export async function generateQuizQuestionFromContentBatch() {
  return { success: false, results: [] };
}

/**
 * Shared Quota Calculation Logic (Must match Edge Function)
 */

/**
 * Fetch context for a specific note chunk
 */
export async function getNoteContext(chunkId: string) {
  const { data, error } = await supabase
    .from("note_chunks")
    .select("id, section_title, content, course_name")
    .eq("id", chunkId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    h2Title: data.section_title || "",
    content: data.content || "",
    courseName: data.course_name || "",
  };
}

/**
 * Get subject-specific generation guidelines
 */
export async function getSubjectGuidelines(subject: string) {
  // 1. Exact match
  const { data: direct } = await supabase
    .from("subject_guidelines")
    .select("*")
    .eq("subject_name", subject)
    .maybeSingle();

  if (direct) return direct;

  // 2. Base name match (ignoring lecturer name etc)
  const baseName = subject.split("-")[0].trim();
  const { data: base } = await supabase
    .from("subject_guidelines")
    .select("*")
    .eq("subject_name", baseName)
    .maybeSingle();

  return base;
}
