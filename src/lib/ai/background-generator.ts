/**
 * Background Question Generator Proxy
 * 
 * Delegates all background generation tasks to the Edge Function.
 */

import { supabase } from '../supabase';

export async function startBackgroundGeneration(chunkId: string): Promise<void> {
    console.log(`[BackgroundGen] Triggering background generation for chunk: ${chunkId}`);
    await supabase.functions.invoke('quiz-generator', {
        body: { chunkId, mode: 'nightly' } // 'nightly' mode handles Arşiv/Deneme
    });
}

export async function checkAndTriggerBackgroundGeneration(
    chunkId: string, 
    incorrectQuestionIds: string[] = [],
    courseId: string,
    userId: string
): Promise<void> {  
    // 1. Trigger Follow-up (Edge Function now handles this in 'followup' mode)
    if (incorrectQuestionIds.length > 0) {
        console.log(`[BackgroundGen] Triggering follow-up for ${incorrectQuestionIds.length} questions`);
        await supabase.functions.invoke('quiz-generator', {
            body: { 
                chunkId, 
                mode: 'followup', 
                incorrectIds: incorrectQuestionIds, 
                userId 
            }
        });
    }

    // 2. Trigger Quota Refill (Arşiv/Deneme)
    await startBackgroundGeneration(chunkId);
}

export function getBackgroundGenerationStatus() {
    return { isRunning: false, generatedCount: 0, targetCount: 0, currentType: null };
}
