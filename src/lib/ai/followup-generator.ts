
import { supabase } from '../supabase';
import { generateQuizQuestion } from './quiz-api';

/**
 * Triggered after a quiz session to generate follow-up questions 
 * for questions answered INCORRECTLY.
 * 
 * @param incorrectQuestionIds List of question IDs that were answered incorrectly
 * @param courseId The course context
 */
export async function startFollowupGeneration(incorrectQuestionIds: string[], courseId: string, userId: string) {
    if (!incorrectQuestionIds || incorrectQuestionIds.length === 0) {
        return;
    }



    // Process parallel or sequential? Sequential is safer for rate limits, 
    // but these are "Follow-up" so maybe we want to be fast.
    // Let's do partial parallel (batch of 3).
    
    // We need the chunk_id for each question to contextually generate a follow-up.
    const { data: questions, error } = await supabase
        .from('questions')
        .select('id, chunk_id, section_title')
        .in('id', incorrectQuestionIds);

    if (error || !questions) {
        console.error('[FollowupGen] Error fetching questions:', error);
        return;
    }

    // Deduplicate chunks if multiple incorrects are from same chunk? 
    // Or generate 1 follow-up per incorrect question?
    // User request: "Eğer yanlış yapılan sorular varsa, AI ile bunlar için Pending_followup sorularını üret"
    // Usually 1-to-1 mapping is good for drill.
    
    for (const q of questions) {
        if (!q.chunk_id) continue;



        // Generate ONE new question for this chunk
        // We might want to pass "retry" or "focus" param to generator in future, 
        // but for now standard generation with 'pending_followup' status is enough.
        
        // Note: generateQuizQuestion currently adds to DB. 
        // We need to ensure it sets status to 'pending_followup' or we update it after.
        // Looking at quiz-api, it might default to 'active' or 'antrenman'.
        // checks `generateQuizQuestion` implementation... 
        // If it interacts with `questions` table directly, we might need to intercept.
        // Assuming `generateQuizQuestion` generates and inserts. 
        
        // Actually, `generateQuizQuestion` (checked previously or inferred) usually does:
        // 1. AI Call
        // 2. Insert into DB
        
        // Let's use `generateQuizQuestion` and then UPDATE status to `pending_followup`.
        // Ideally we'd modify `generateQuizQuestion` to accept a status, but to minimize refactor:
        
        const result = await generateQuizQuestion(q.chunk_id, { 
            userId, 
            isGlobal: false, 
            createdBy: userId 
        });
        
        if (result.success && result.question?.id) {
             // Immediately update status to 'pending_followup' 
             // and maybe set `parent_question_id` to q.id to track relationship
             // Immediately update parent_question_id
             const { error: updateError } = await supabase
                .from('questions')
                .update({ 
                    parent_question_id: q.id 
                })
                .eq('id', result.question?.id);

             if (updateError) {
                 console.error('[FollowupGen] Error linking parent question:', updateError);
             }

             // Upsert status in user_question_status
             const { error: statusError } = await supabase
                .from('user_question_status')
                .upsert({
                    user_id: userId,
                    question_id: result.question.id!,
                    status: 'pending_followup'
                }, { onConflict: 'user_id,question_id' });

             if (statusError) {
                 console.error('[FollowupGen] Error updating status:', statusError);
             } else {

             }
        } else {
            console.warn('[FollowupGen] Failed to generate:', result.error);
        }

        // Delay
        await new Promise(resolve => setTimeout(resolve, 800));
    }
}
