import { type ExamSubjectWeight } from "@/features/quiz/logic/algorithms/strategy";

// --- Types ---

export interface ChunkMetric {
    id: string;
    concept_count: number;
    difficulty_index: number;
    mastery_score: number;
}

export interface ExamDistributionInput {
    examTotal: number;
    importance: ExamSubjectWeight["importance"];
    chunks: ChunkMetric[];
}

// --- Distribution Logic ---

/**
 * Calculates the number of questions to generate for each chunk.
 */
export function calculateQuestionWeights(
    input: ExamDistributionInput,
): Map<string, number> {
    const { examTotal, importance, chunks } = input;

    if (chunks.length === 0) {
        return new Map();
    }

    const importanceScore = importance === "high"
        ? 1.0
        : importance === "medium"
        ? 0.7
        : 0.4;

    const maxConceptCount = Math.max(...chunks.map((c) => c.concept_count), 1);

    const chunkWeights = chunks.map((chunk) => {
        const normalizedMastery = Math.min(
            Math.max(chunk.mastery_score / 100, 0),
            1,
        );
        const masteryFactor = 1.0 - normalizedMastery;
        const lengthFactor = chunk.concept_count / maxConceptCount;
        const difficulty = chunk.difficulty_index || 3;
        const densityFactor = (difficulty - 1) / 4;

        const weight = importanceScore * 0.4 +
            masteryFactor * 0.3 +
            densityFactor * 0.2 +
            lengthFactor * 0.1;

        return {
            id: chunk.id,
            weight,
            original: chunk,
        };
    });

    const totalWeight = chunkWeights.reduce((sum, c) => sum + c.weight, 0);
    const result = new Map<string, number>();

    if (totalWeight === 0) {
        const baseCount = Math.floor(examTotal / chunks.length);
        let remainder = examTotal % chunks.length;
        chunks.forEach((c) => {
            result.set(c.id, baseCount + (remainder > 0 ? 1 : 0));
            remainder--;
        });
        return result;
    }

    let currentTotal = 0;
    const allocations = chunkWeights.map((c) => {
        const exactShare = (c.weight / totalWeight) * examTotal;
        const floorShare = Math.floor(exactShare);
        const remainder = exactShare - floorShare;
        return {
            id: c.id,
            count: floorShare,
            remainder,
        };
    });

    allocations.forEach((a) => (currentTotal += a.count));

    const remainingQuestions = examTotal - currentTotal;
    allocations.sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < remainingQuestions; i++) {
        allocations[i].count += 1;
    }

    allocations.forEach((a) => {
        result.set(a.id, a.count);
    });

    return result;
}
