import * as Repository from "@/features/quiz/services/repositories/quizRepository";
import { type ConceptMapItem } from "@/features/quiz/types";

export interface Quotas {
    antrenman: number;
    deneme: number;
    arsiv: number;
}

/**
 * Calculates pedagogical quotas based on concept count.
 * @param concepts The list of concepts in the chunk.
 * @returns Calculated quotas: 100% training, 20% trial, 30% archive.
 */
export function calculateQuotas(concepts: ConceptMapItem[]): Quotas {
    return {
        antrenman: concepts.length,
        deneme: Math.ceil(concepts.length * 0.20),
        arsiv: Math.ceil(concepts.length * 0.30),
    };
}

/**
 * Updates the chunk's suggested quotas in the repository.
 * @param chunkId The ID of the chunk to update.
 * @param quotas The quotas to save.
 */
export async function updateChunkQuotas(
    chunkId: string,
    quotas: Quotas,
): Promise<void> {
    await Repository.updateChunkAILogic(chunkId, {
        suggested_quotas: quotas,
        reasoning:
            "Sistem tarafından otomatik belirlenen pedagojik kotalar (%20 deneme, %30 arşiv).",
    });
}
