import { supabase } from "@/shared/lib/core/supabase";

export async function verifyQuestionCount(chunkId: string) {
    const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("chunk_id", chunkId);
    return count;
}
