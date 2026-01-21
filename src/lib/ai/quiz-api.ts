/**
 * AuditPath Quiz API (Unified)
 * 
 * All question generation is now centralized in the 'quiz-generator' Edge Function.
 * This module purely handles database fetching and Edge Function invocation.
 */

import { supabase } from '../supabase';

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

export type QuestionUsageType = 'antrenman' | 'arsiv' | 'deneme';

export interface QuizGenerationResult {
  success: boolean;
  question?: QuizQuestion;
  error?: string;
  status?: 'generated' | 'quota_reached' | 'error';
}

/**
 * Trigger question generation for a chunk via Edge Function
 */
export async function triggerQuizGeneration(chunkId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.functions.invoke('quiz-generator', {
      body: { chunkId }
    });

    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[QuizApi] Error triggering generation:', error);
    return { success: false, error: error.message || 'Üretim tetiklenemedi.' };
  }
}

/**
 * Fetch questions for a session from the database
 */
export async function fetchQuestionsForSession(
  chunkId: string,
  count: number,
  userId: string,
  usageType: QuestionUsageType = 'antrenman'
): Promise<QuizQuestion[]> {
  try {
     // 1. Get already solved IDs to exclude
     const { data: solved } = await supabase
        .from('user_quiz_progress')
        .select('question_id')
        .eq('user_id', userId)
        .eq('chunk_id', chunkId);
        
     const solvedIds = new Set(solved?.map(s => s.question_id) || []);
     
     // 2. Fetch available questions
     const query = supabase
        .from('questions')
        .select('id, question_data, course:courses(course_slug)')
        .eq('chunk_id', chunkId)
        .eq('usage_type', usageType)
        .limit(count + solvedIds.size);

     const { data: questions, error } = await query;
     
     if (error || !questions) return [];

     // 3. Filter and Format
     return questions
        .filter(q => !solvedIds.has(q.id))
        .slice(0, count)
        .map(q => {
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
      console.error('[QuizApi] Error fetching questions:', e);
      return [];
  }
}

/**
 * Get quota status for a chunk (UI info)
 */
export async function getChunkQuotaStatus(chunkId: string) {
  const { data: chunk } = await supabase
    .from('note_chunks')
    .select('*, questions(count)')
    .eq('id', chunkId)
    .single();

  if (!chunk) return null;

  // Since we removed local calculateQuota, we rely on the metadata/stats from Edge Function if saved,
  // or we just return the counts we have.
  const chunkData = chunk as unknown as { status: string; questions?: { count: number }[] };
  const questionsCount = chunkData.questions?.[0]?.count || 0;
  
  return {
    status: chunkData.status,
    count: questionsCount,
    isReady: chunkData.status === 'COMPLETED'
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
export async function generateQuizQuestionBatch() {
    return { success: false, results: [] };
}
export async function generateQuizQuestionFromContentBatch() {
    return { success: false, results: [] };
}

/**
 * Shared Quota Calculation Logic (Must match Edge Function)
 */
export function calculateQuota(wordCount: number, conceptCount: number) {
    const MIN_BASE_QUOTA = 8;
    const MAX_BASE_QUOTA = 30;
    const GROWTH_RATE_PER_100_WORDS = 1.1;

    // 1. Base Quota
    const linearGrowth = (Math.max(0, wordCount) / 100) * GROWTH_RATE_PER_100_WORDS;
    const rawBase = MIN_BASE_QUOTA + linearGrowth;
    const baseCount = Math.min(MAX_BASE_QUOTA, rawBase);

    // 2. Concept Density (CD) Multiplier
    const safeWordCount = wordCount > 0 ? wordCount : 1;
    const cd = conceptCount / safeWordCount;
    
    let multiplier = 1.0;
    if (cd < 0.02) multiplier = 0.8; // Sparse
    else if (cd > 0.05) multiplier = 1.3; // Dense
    
    const antrenmanCount = Math.ceil(baseCount * multiplier);
    const arsivCount = Math.ceil(antrenmanCount * 0.25);
    const denemeCount = Math.ceil(antrenmanCount * 0.25);
    const total = antrenmanCount + arsivCount + denemeCount;

    return {
        total,
        antrenmanCount,
        arsivCount,
        denemeCount
    };
}

/**
 * Fetch context for a specific note chunk
 */
export async function getNoteContext(chunkId: string) {
  const { data, error } = await supabase
    .from('note_chunks')
    .select('id, section_title, content, course_name')
    .eq('id', chunkId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    h2Title: data.section_title || '',
    content: data.content || '',
    courseName: data.course_name || ''
  };
}

/**
 * Get subject-specific generation guidelines
 */
export async function getSubjectGuidelines(subject: string) {
  // 1. Exact match
  const { data: direct } = await supabase
    .from('subject_guidelines')
    .select('*')
    .eq('subject_name', subject)
    .maybeSingle();

  if (direct) return direct;

  // 2. Base name match (ignoring lecturer name etc)
  const baseName = subject.split('-')[0].trim();
  const { data: base } = await supabase
    .from('subject_guidelines')
    .select('*')
    .eq('subject_name', baseName)
    .maybeSingle();

  return base;
}

