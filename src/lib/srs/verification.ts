
import { supabase } from '@/lib/supabase';

export async function verifyQuestionCount(chunkId: string) {
    const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('chunk_id', chunkId);
    console.log(`Questions for chunk ${chunkId}: ${count}`);
    return count;
}
