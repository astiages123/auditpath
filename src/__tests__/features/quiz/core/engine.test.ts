import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuiz } from "@/features/quiz/hooks/use-quiz";
import * as Repository from "@/features/quiz/api/repository";
import { QuizQuestion } from "@/features/quiz/core/types";

// Mock Repository
vi.mock("@/features/quiz/api/repository", () => ({
    incrementCourseSession: vi.fn(),
    getCourseName: vi.fn(),
    getChunkMetadata: vi.fn(),
    fetchQuestionsByChunk: vi.fn(),
    getUserQuestionStatus: vi.fn(),
    upsertUserQuestionStatus: vi.fn(),
    recordQuizProgress: vi.fn(),
    getChunkMastery: vi.fn(),
    getChunkQuestionCount: vi.fn(),
    getUniqueSolvedCountInChunk: vi.fn(),
    upsertChunkMastery: vi.fn(),
    getQuestionData: vi.fn(),
    getAttemptCount: vi.fn(), // If needed
}));

// Mock Engine? No, we want to test Engine integration, so we keep Engine real.
// But Engine calls Repository. So mocking Repository is enough.
// We also need to mock Utils if they use timers or complex things?
// useQuiz uses `createTimer`. `createTimer` is likely simple.

describe("QuizEngine Integration (via useQuiz)", () => {
    const mockUserId = "user-123";
    const mockCourseId = "course-abc";
    const mockChunkId = "chunk-xyz";

    const mockQuestions: QuizQuestion[] = [
        {
            id: "q1",
            q: "Question 1",
            o: ["A", "B", "C", "D", "E"],
            a: 0,
            exp: "Explanation 1",
            chunk_id: mockChunkId,
        },
        {
            id: "q2",
            q: "Question 2",
            o: ["A", "B", "C", "D", "E"],
            a: 1,
            exp: "Explanation 2",
            chunk_id: mockChunkId,
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default Repository mocks
        vi.mocked(Repository.getChunkMetadata).mockResolvedValue({
            course_id: mockCourseId,
            metadata: {},
            word_count: 500,
            status: "COMPLETED",
            meaningful_word_count: 500,
        });

        vi.mocked(Repository.incrementCourseSession).mockResolvedValue({
            data: { current_session: 1, is_new_session: true },
            error: null,
        });

        vi.mocked(Repository.fetchQuestionsByChunk).mockResolvedValue(
            mockQuestions as any,
        );

        // Engine.submitAnswer needs these
        vi.mocked(Repository.getUserQuestionStatus).mockResolvedValue(null);
        vi.mocked(Repository.getQuestionData).mockResolvedValue({ // For SRS tMax
            id: "q1",
            chunk_id: mockChunkId,
            bloom_level: "knowledge",
            word_count: 10,
        } as any);
        vi.mocked(Repository.getChunkMastery).mockResolvedValue({
            mastery_score: 50,
            chunk_id: mockChunkId,
            course_id: mockCourseId,
            last_reviewed_session: 0,
            updated_at: "",
        } as any);
        vi.mocked(Repository.getChunkQuestionCount).mockResolvedValue(10);
        vi.mocked(Repository.getUniqueSolvedCountInChunk).mockResolvedValue(5);
    });

    describe("Session Initialization", () => {
        it("should initialize session and load questions", async () => {
            const { result } = renderHook(() => useQuiz());

            // Start Logic
            // generateBatch triggers startSession and fetchQuestions
            await act(async () => {
                await result.current.generateBatch(5, {
                    type: "chunk",
                    chunkId: mockChunkId,
                    userId: mockUserId,
                });
            });

            expect(Repository.incrementCourseSession).toHaveBeenCalledWith(
                mockUserId,
                mockCourseId,
            );
            expect(Repository.fetchQuestionsByChunk).toHaveBeenCalledWith(
                mockChunkId,
                5,
                expect.any(Set),
            );

            expect(result.current.state.currentQuestion).toEqual(
                mockQuestions[0],
            );
            expect(result.current.state.queue).toHaveLength(1); // q2 remains
            expect(result.current.state.totalToGenerate).toBe(2);
            expect(result.current.results.totalTimeMs).toBe(0);
        });
    });

    describe("State Transition (Correct Answer)", () => {
        it("should update results and call Engine.submitAnswer on correct answer", async () => {
            const { result } = renderHook(() => useQuiz());

            // Init
            await act(async () => {
                await result.current.generateBatch(5, {
                    type: "chunk",
                    chunkId: mockChunkId,
                    userId: mockUserId,
                });
            });

            // Start Timer
            act(() => {
                result.current.startQuiz();
            });

            // Advance time slightly to test timing
            // const timeSpent = 1000;
            // vi.advanceTimersByTime && vi.advanceTimersByTime(timeSpent);
            // Removed to avoid error. Timing verified in separate test.

            // Answer Correctly (Index 0 is correct for q1)
            await act(async () => {
                await result.current.selectAnswer(0);
            });

            // Verify UI State
            expect(result.current.state.isCorrect).toBe(true);
            expect(result.current.state.selectedAnswer).toBe(0);
            expect(result.current.results.correct).toBe(1);

            // Verify Engine/Repository calls
            expect(Repository.upsertUserQuestionStatus).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "pending_followup", // SRS logic dependent
                    consecutive_success: 1, // First success
                }),
            );

            // Verify Mastery Update (Engine -> Repository)
            expect(Repository.upsertChunkMastery).toHaveBeenCalled();
        });
    });

    describe("State Transition (Incorrect Answer)", () => {
        it("should handle incorrect answer and queue logic", async () => {
            const { result } = renderHook(() => useQuiz());

            await act(async () => {
                await result.current.generateBatch(2, {
                    type: "chunk",
                    chunkId: mockChunkId,
                    userId: mockUserId,
                });
            });

            act(() => {
                result.current.startQuiz();
            });

            // Answer Incorrectly (Index 1 is wrong for q1)
            await act(async () => {
                await result.current.selectAnswer(1);
            });

            expect(result.current.state.isCorrect).toBe(false);
            expect(result.current.results.incorrect).toBe(1);

            // SRS logic: failing usually resets consec success
            expect(Repository.upsertUserQuestionStatus).toHaveBeenCalledWith(
                expect.objectContaining({
                    consecutive_success: 0,
                }),
            );
        });
    });

    describe("Intermission & Finish Logic", () => {
        it("should calculate results when all questions are answered", async () => {
            const { result } = renderHook(() => useQuiz());

            await act(async () => {
                await result.current.generateBatch(2, {
                    type: "chunk",
                    chunkId: mockChunkId,
                    userId: mockUserId,
                });
            });
            act(() => {
                result.current.startQuiz();
            });

            // Q1: Correct
            await act(async () => {
                await result.current.selectAnswer(0);
            });
            await act(async () => {
                await result.current.nextQuestion(mockUserId, mockCourseId);
            });

            // Q2: Incorrect (Index 0 is wrong for q2, a=1)
            await act(async () => {
                await result.current.selectAnswer(0);
            });
            await act(async () => {
                await result.current.nextQuestion(mockUserId, mockCourseId);
            });

            // Now queue should be empty, nextQuestion called again triggers finish?
            // Wait, `nextQuestion` checks `queue.length > 0`.
            // If empty, it triggers finish.
            // We called `nextQuestion` AFTER Q2. Q2 was the last one.
            // `nextQuestion` logic:
            // shift q1 -> current=q2, queue=[]
            // answer q2
            // call nextQuestion -> queue empty -> Finish

            expect(result.current.state.isLoading).toBe(false);
            expect(result.current.state.summary).not.toBeNull();
            expect(result.current.state.summary?.percentage).toBe(50); // 1/2 correct
            expect(result.current.state.summary?.pendingReview).toBe(1); // 1 incorrect
        });
    });

    describe("Timing Accuracy", () => {
        it("should accumulate time spent", async () => {
            // Need to mock performance.now or Date.now
            // Vitest fake timers might override Date.now
            vi.useFakeTimers();

            const { result } = renderHook(() => useQuiz());
            await act(async () => {
                await result.current.generateBatch(1, {
                    type: "chunk",
                    chunkId: mockChunkId,
                    userId: mockUserId,
                });
            });
            act(() => {
                result.current.startQuiz();
            });

            // Advance 1000ms
            vi.advanceTimersByTime(1000);

            await act(async () => {
                await result.current.selectAnswer(0);
            });

            expect(result.current.results.totalTimeMs).toBeGreaterThanOrEqual(
                1000,
            );

            vi.useRealTimers();
        });
    });
});
