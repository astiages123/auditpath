import { describe, expect, it } from "vitest";
import { calculateOverduePenalty } from "./srs-algorithm";

describe("SRS Algorithm - Overdue Penalty", () => {
    it("should return the original score if overdueDays is 0 or negative", () => {
        expect(calculateOverduePenalty(80, 0)).toBe(80);
        expect(calculateOverduePenalty(80, -5)).toBe(80);
    });

    it("should apply no penalty for overdueDays < 7", () => {
        // 6 days overdue -> floor(6/7) = 0 -> 0 * 2 = 0 penalty
        expect(calculateOverduePenalty(80, 6)).toBe(80);
    });

    it("should apply 2 points penalty for 7 days overdue", () => {
        // 7 days overdue -> floor(7/7) = 1 -> 1 * 2 = 2 penalty
        expect(calculateOverduePenalty(80, 7)).toBe(78);
    });

    it("should apply 2 points penalty for 13 days overdue", () => {
        // 13 days overdue -> floor(13/7) = 1 -> 1 * 2 = 2 penalty
        expect(calculateOverduePenalty(80, 13)).toBe(78);
    });

    it("should apply 4 points penalty for 14 days overdue", () => {
        // 14 days overdue -> floor(14/7) = 2 -> 2 * 2 = 4 penalty
        expect(calculateOverduePenalty(80, 14)).toBe(76);
    });

    it("should apply correct penalty for a month overdue", () => {
        // 30 days overdue -> floor(30/7) = 4 -> 4 * 2 = 8 penalty
        expect(calculateOverduePenalty(80, 30)).toBe(72);
    });

    it("should not return a negative score", () => {
        // Large overdue
        // 350 days -> floor(350/7) = 50 -> 50 * 2 = 100 penalty
        // 80 - 100 = -20 -> clamped to 0
        expect(calculateOverduePenalty(80, 350)).toBe(0);
    });
});
