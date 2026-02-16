import { PostgrestError } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";

/**
 * Standardized error handler for Supabase operations
 */
export async function handleSupabaseError(
    error: unknown,
    context: string,
): Promise<void> {
    if (!error) return;

    const isPostgrest = (e: unknown): e is PostgrestError =>
        typeof e === "object" && e !== null && "code" in e && "message" in e;
    const details = isPostgrest(error)
        ? { code: error.code, message: error.message, hint: error.hint }
        : error;

    logger.error(`[${context}] failed`, { details });
}
