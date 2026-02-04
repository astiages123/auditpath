import { supabase } from "@/shared/lib/core/supabase";
import { type ConceptMapItem } from "@/features/quiz/modules/ai/mapping";
import { DebugLogger } from "@/shared/lib/ui/debug-logger";
import { type Database } from "@/shared/types/supabase";

export interface FailedConceptInfo {
    chunkId: string;
    conceptTitle: string;
    consecutiveFails: number;
}

export interface PrerequisiteQuestion {
    questionId: string;
    chunkId: string;
    conceptTitle: string;
    bloomLevel: Database["public"]["Enums"]["bloom_level"];
    reason: string;
}

/**
 * Extracts prerequisite concepts for a given target concept from chunk metadata.
 */
export function extractPrerequisites(
    chunkMetadata: { concept_map?: ConceptMapItem[] } | null,
    targetConcept: string,
): string[] {
    if (!chunkMetadata || !chunkMetadata.concept_map) {
        return [];
    }

    const conceptMap = chunkMetadata.concept_map as ConceptMapItem[];
    const targetItem = conceptMap.find(
        (c) =>
            c.baslik.trim().toLowerCase() ===
                targetConcept.trim().toLowerCase(),
    );

    return targetItem?.prerequisites || [];
}

/**
 * Finds prerequisite questions for a list of failed concepts.
 * Implements "Waterfall" discovery and Scaffolding ("Bloom Drop").
 */
export async function getPrerequisiteQuestions(
    userId: string,
    courseId: string,
    failedConcepts: FailedConceptInfo[],
): Promise<PrerequisiteQuestion[]> {
    DebugLogger.group("PrerequisiteEngine: Discovery", {
        count: failedConcepts.length,
    });

    const result: PrerequisiteQuestion[] = [];
    const processedConcepts = new Set<string>();

    for (const fail of failedConcepts) {
        if (processedConcepts.has(fail.conceptTitle)) continue;
        processedConcepts.add(fail.conceptTitle);

        // 1. Fetch Chunk Metadata to find prerequisites
        const { data: chunk } = await supabase
            .from("note_chunks")
            .select("metadata")
            .eq("id", fail.chunkId)
            .single();

        if (!chunk || !chunk.metadata) continue;

        const prereqs = extractPrerequisites(
            chunk.metadata as { concept_map?: ConceptMapItem[] } | null,
            fail.conceptTitle,
        );

        if (prereqs.length === 0) continue;

        DebugLogger.process(
            `Found prerequisites for '${fail.conceptTitle}'`,
            prereqs,
        );

        // 2. Find "Active" questions for these prerequisites
        // Scaffolding: If consecutive_fails > 1, prefer 'knowledge' level (Bloom Drop)
        const targetBloom = fail.consecutiveFails > 1 ? "knowledge" : null;

        // We search for questions that match:
        // - course_id
        // - concept_title IN prereqs
        // - (Optional) bloom_level = targetBloom

        let query = supabase
            .from("questions")
            .select("id, chunk_id, concept_title, bloom_level")
            .eq("course_id", courseId)
            .in("concept_title", prereqs);

        if (targetBloom) {
            // If scaffolding needed, strictly look for knowledge first
            // But if none exist, we might need a fallback.
            // For simplicity in this SQL query, we'll try to sort by bloom_level
            // effectively asking for 'knowledge' first if we order right?
            // Actually, let's just use a filter if scaffolding is active,
            // assuming foundational questions exist.
            // Better: Donk block completely, just prefer.
            // Since Supabase doesn't support complex "order by case" easily in client,
            // we will fetch all eligible and filter in memory or fetch a limited set.
        }

        // Limit to avoid fetching too many
        query = query.limit(10);

        const { data: questions } = await query;

        if (questions && questions.length > 0) {
            // Filter/Sort in memory for Scaffolding
            let candidates = questions;

            if (targetBloom) {
                const knowledgeQs = candidates.filter((q) =>
                    q.bloom_level === "knowledge"
                );
                if (knowledgeQs.length > 0) {
                    candidates = knowledgeQs;
                    DebugLogger.process(
                        "Scaffolding Applied: Filtered for knowledge level",
                    );
                }
            }

            // Pick one random question per prerequisite concept to ensure coverage
            // or just take top 3.
            const selected = candidates.slice(0, 3); // Take up to 3

            for (const q of selected) {
                result.push({
                    questionId: q.id,
                    chunkId: q.chunk_id || "",
                    conceptTitle: q.concept_title || "",
                    bloomLevel: q.bloom_level || "knowledge",
                    reason: `Prerequisite for '${fail.conceptTitle}' (${
                        targetBloom ? "Scaffolding" : "Gap Fix"
                    })`,
                });
            }
        }
    }

    DebugLogger.output("Prerequisite Questions Found", {
        count: result.length,
    });
    DebugLogger.groupEnd();

    return result;
}
