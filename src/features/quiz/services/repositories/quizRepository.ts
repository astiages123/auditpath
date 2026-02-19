import { supabase } from '@/lib/supabase';

/**
 * Get the current session token for quiz operations
 */
export async function getCurrentSessionToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Get user ID from current session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Repository for quiz-related database operations
 */
export const quizRepository = {
  async getQuestionById(questionId: string) {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (error) throw error;
    return data;
  },

  async getQuestionsByChunk(chunkId: string) {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('chunk_id', chunkId);

    if (error) throw error;
    return data || [];
  },

  async getUserQuestionStatus(userId: string, questionId: string) {
    const { data, error } = await supabase
      .from('user_question_status')
      .select('*')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },
};
