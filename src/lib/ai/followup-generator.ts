/**
 * Follow-up Generator (Deprecated)
 * 
 * Logic has been moved to the 'quiz-generator' Edge Function.
 * This file serves as a legacy proxy if needed, but background-generator.ts 
 * is now the primary entry point for follow-ups.
 */

import { supabase } from '../supabase';

export async function startFollowupGeneration(incorrectQuestionIds: string[], courseId: string, userId: string) {
    // Note: We need a chunk_id to call the unified generator. 
    // We can pick it from the first incorrect question.
    if (!incorrectQuestionIds.length) return;

    const { data } = await supabase
        .from('questions')
        .select('chunk_id')
        .in('id', incorrectQuestionIds)
        .limit(1)
        .single();

    if (data?.chunk_id) {
        await supabase.functions.invoke('quiz-generator', {
            body: { 
                chunkId: data.chunk_id, 
                mode: 'followup', 
                incorrectIds: incorrectQuestionIds, 
                userId 
            }
        });
    }
}
