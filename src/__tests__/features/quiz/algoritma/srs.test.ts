import { describe, expect, it } from "vitest";
import {
    calculateAdvancedScore,
    calculateNextReviewSession,
    calculateShelfStatus,
    calculateTMax,
} from "@/features/quiz/algoritma/srs";
import {
    calculateMasteryChains,
    type MasteryNode,
    processGraphForAtlas,
} from "@/features/efficiency/logic/mastery-logic";
import type { ConceptMapItem } from "@/features/quiz/core/types";

describe("SRS Logic (Shelf System)", () => {
    describe("calculateShelfStatus (3-Strike Rule)", () => {
        it("should increment successCount by 0.5 for correct but slow answers", () => {
            const result = calculateShelfStatus(0, true, false); // isCorrect=true, isFast=false
            expect(result.newStatus).toBe("pending_followup"); // 0.5 < 3
            expect(result.newSuccessCount).toBe(0.5);
        });

        it("should increment successCount by 1.0 for correct and fast answers", () => {
            const result = calculateShelfStatus(0, true, true); // isCorrect=true, isFast=true
            // Logic: if < 3 and >= 0.5 -> pending_followup.
            expect(result.newSuccessCount).toBe(1.0);
            expect(result.newStatus).toBe("pending_followup");
        });

        it("should archive item when successCount reaches 3", () => {
            const result = calculateShelfStatus(2.5, true, false); // 2.5 + 0.5 = 3.0
            expect(result.newSuccessCount).toBe(3.0);
            expect(result.newStatus).toBe("archived");
        });

        it("should reset successCount to 0 and set status to pending_followup on incorrect answer", () => {
            const result = calculateShelfStatus(2.5, false, false); // Incorrect
            expect(result.newStatus).toBe("pending_followup");
            expect(result.newSuccessCount).toBe(0);
        });

        it("should handle mixed increments correctly", () => {
            // Start 0 -> Slow Correct -> 0.5
            let result = calculateShelfStatus(0, true, false);
            expect(result.newSuccessCount).toBe(0.5);

            // 0.5 -> Fast Correct -> 1.5
            result = calculateShelfStatus(result.newSuccessCount, true, true);
            expect(result.newSuccessCount).toBe(1.5);

            // 1.5 -> Slow Correct -> 2.0
            result = calculateShelfStatus(result.newSuccessCount, true, false);
            expect(result.newSuccessCount).toBe(2.0);
        });
    });

    describe("calculateNextReviewSession", () => {
        // SESSION_GAPS = [1, 2, 5, 10, 20]
        it("should return correct gaps for success counts", () => {
            // gapIndex = Math.floor(successCount) - 1
            // fail (< 1) -> index 0 (gap 1)
            expect(calculateNextReviewSession(100, 0)).toBe(101); // gap 1
            expect(calculateNextReviewSession(100, 0.5)).toBe(101); // gap 1

            // successCount 1.0 -> index 0 (1-1=0) -> gap 1
            expect(calculateNextReviewSession(100, 1.0)).toBe(101); // gap 1

            // successCount 2.0 -> index 1 (2-1=1) -> gap 2
            expect(calculateNextReviewSession(100, 2.0)).toBe(102); // gap 2

            // successCount 3.0 -> index 2 (3-1=2) -> gap 5
            expect(calculateNextReviewSession(100, 3.0)).toBe(105); // gap 5

            // successCount 4.0 -> index 3 (4-1=3) -> gap 10
            expect(calculateNextReviewSession(100, 4.0)).toBe(110); // gap 10

            // successCount 5.0 -> index 4 (5-1=4) -> gap 20
            expect(calculateNextReviewSession(100, 5.0)).toBe(120); // gap 20
        });

        it("should cap at max gap for higher success counts", () => {
            // successCount 10.0 -> index 9 -> max index 4 -> gap 20
            expect(calculateNextReviewSession(100, 10.0)).toBe(120);
        });
    });

    describe("calculateAdvancedScore (Bloom & Time)", () => {
        it("should apply Bloom coefficients correctly", () => {
            // Base Delta = 10 (Standard Correct)
            // Time Ratio = 1.0 (Assume exact target time)

            // Knowledge: 1.0
            const knowledge = calculateAdvancedScore(10, "knowledge", 20_000); // 20s is target for knowledge
            expect(knowledge.bloomCoeff).toBe(1.0);
            expect(knowledge.finalScore).toBe(10);

            // Application: 1.3
            const application = calculateAdvancedScore(
                10,
                "application",
                35_000,
            ); // 35s is target for application
            expect(application.bloomCoeff).toBe(1.3);
            expect(application.finalScore).toBe(13);

            // Analysis: 1.6
            const analysis = calculateAdvancedScore(10, "analysis", 50_000); // 50s is target for analysis
            expect(analysis.bloomCoeff).toBe(1.6);
            expect(analysis.finalScore).toBe(16);
        });

        it("should cap timeRatio between 0.5 and 2.0", () => {
            const baseDelta = 10;
            const bloom = "knowledge";

            // Fast answer (0.5x target time) -> ratio 2.0
            // tTarget = 20,000. tActual = 10,000. Ratio = 2.0
            const fast = calculateAdvancedScore(baseDelta, bloom, 10_000);
            expect(fast.timeRatio).toBe(2.0);
            expect(fast.finalScore).toBe(20); // 10 * 1.0 * 2.0

            // Very fast answer (0.1x target time) -> ratio capped at 2.0
            const veryFast = calculateAdvancedScore(baseDelta, bloom, 1_000);
            expect(veryFast.timeRatio).toBe(2.0);
            expect(veryFast.finalScore).toBe(20);

            // Slow answer (2x target time) -> ratio 0.5
            // tActual = 40,000. Ratio = 20,000 / 40,000 = 0.5
            const slow = calculateAdvancedScore(baseDelta, bloom, 40_000);
            expect(slow.timeRatio).toBe(0.5);
            expect(slow.finalScore).toBe(5); // 10 * 1.0 * 0.5

            // Very slow answer (10x target time) -> ratio capped at 0.5
            const verySlow = calculateAdvancedScore(baseDelta, bloom, 200_000);
            expect(verySlow.timeRatio).toBe(0.5);
            expect(verySlow.finalScore).toBe(5);
        });
    });
});

describe("Mastery Logic (Graph)", () => {
    // Mock concept map items
    const mockConcepts: ConceptMapItem[] = [
        {
            baslik: "Root A",
            odak: "Focus A",
            seviye: "Bilgi",
            gorsel: null,
            prerequisites: [],
        },
        {
            baslik: "Root B",
            odak: "Focus B",
            seviye: "Bilgi",
            gorsel: null,
            prerequisites: [],
        },
        {
            baslik: "Child A1",
            odak: "Focus A1",
            seviye: "Uygulama",
            gorsel: null,
            prerequisites: ["Root A"],
        },
        {
            baslik: "Child A2",
            odak: "Focus A2",
            seviye: "Analiz",
            gorsel: null,
            prerequisites: ["Root A"],
        },
    ];

    describe("calculateMasteryChains", () => {
        it("should evaluate Root nodes as chain complete if mastery >= 80", () => {
            const masteryMap = {
                "Root A": 85,
                "Root B": 50,
            };

            const nodes = calculateMasteryChains(mockConcepts, masteryMap);

            const rootA = nodes.find((n) => n.id === "Root A");
            const rootB = nodes.find((n) => n.id === "Root B");

            expect(rootA?.isChainComplete).toBe(true); // >= 80 and no prereqs -> considered complete for root (assuming prereq logic holds empty array as true)
            expect(rootB?.isChainComplete).toBe(false); // < 80
        });

        it("should verify chain formatting rule: Node >= 80 AND Prerequisites >= 85", () => {
            const masteryMap = {
                "Root A": 90, // Prereq for Child A1 (>= 85)
                "Child A1": 80, // Self (>= 80)
            };

            const nodes = calculateMasteryChains(mockConcepts, masteryMap);
            const childA1 = nodes.find((n) => n.id === "Child A1");

            expect(childA1?.isChainComplete).toBe(true);
        });

        it("should fail chain if prerequisite is below 85 (even if node is mastered)", () => {
            const masteryMap = {
                "Root A": 82, // Prereq < 85 (but >=80 so it's mastered itself)
                "Child A1": 90, // Self >= 80
            };

            const nodes = calculateMasteryChains(mockConcepts, masteryMap);

            const rootA = nodes.find((n) => n.id === "Root A");
            const childA1 = nodes.find((n) => n.id === "Child A1");

            expect(rootA?.isChainComplete).toBe(true); // Root A is mastered (82 >= 80)
            expect(childA1?.isChainComplete).toBe(false); // Prereq (Root A) is 82, needs 85
        });

        it("should fail chain if node itself is below 80 (even if prereq is perfect)", () => {
            const masteryMap = {
                "Root A": 100,
                "Child A1": 75,
            };

            const nodes = calculateMasteryChains(mockConcepts, masteryMap);
            const childA1 = nodes.find((n) => n.id === "Child A1");

            expect(childA1?.isChainComplete).toBe(false);
        });
    });

    describe("resilienceBonusDays", () => {
        const mockNodes: MasteryNode[] = [
            {
                id: "A",
                label: "A",
                mastery: 90,
                status: "mastered",
                prerequisites: [],
                isChainComplete: true,
                depth: 0,
                data: { focus: "" },
            },
            {
                id: "B",
                label: "B",
                mastery: 90,
                status: "mastered",
                prerequisites: ["A"],
                isChainComplete: true,
                depth: 1,
                data: { focus: "" },
            },
            {
                id: "C",
                label: "C",
                mastery: 90,
                status: "mastered",
                prerequisites: ["A"],
                isChainComplete: true,
                depth: 1,
                data: { focus: "" },
            },
            {
                id: "D",
                label: "D",
                mastery: 60,
                status: "in-progress",
                prerequisites: ["B"],
                isChainComplete: false,
                depth: 2,
                data: { focus: "" },
            },
        ];

        it("should calculate bonus days based on completed chains", () => {
            // Logic in processGraphForAtlas:
            // if (node.isChainComplete && node.prerequisites.length > 0) chainCount++
            // bonus = chainCount * 2

            // In mockNodes:
            // A: isChainComplete=true, prereqs=[] -> Not counted (Root)
            // B: isChainComplete=true, prereqs=["A"] -> Counted (+1)
            // C: isChainComplete=true, prereqs=["A"] -> Counted (+1)
            // D: isChainComplete=false -> Not counted

            // Total chains = 2
            // Expected bonus = 4 days

            const stats = processGraphForAtlas(mockNodes);

            expect(stats.totalChains).toBe(2);
            expect(stats.resilienceBonusDays).toBe(4);
        });
    });
});
