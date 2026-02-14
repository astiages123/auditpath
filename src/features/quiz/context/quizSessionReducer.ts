import {
    QuizAction,
    QuizSessionState,
    QuizStatus,
    ReviewItem,
} from "../types/quizTypes";

export const initialQuizSessionState: QuizSessionState = {
    status: "IDLE",
    sessionInfo: null,
    quotaInfo: null,
    reviewQueue: [],
    batches: [],
    currentBatchIndex: 0,
    totalBatches: 0,
    currentReviewIndex: 0, // Global index in reviewQueue
    courseStats: null,
    error: null,
    isSyncing: false,
    // SSoT fields moved from QuizEngine
    currentQuestion: null,
    results: {
        correct: 0,
        incorrect: 0,
        blank: 0,
        totalTimeMs: 0,
    },
    isAnswered: false,
    selectedAnswer: null,
    isCorrect: null,
    startTime: null,
};

export function quizSessionReducer(
    state: QuizSessionState,
    action: QuizAction,
): QuizSessionState {
    switch (action.type) {
        case "INITIALIZE": {
            const {
                sessionInfo,
                quotaInfo,
                reviewQueue,
                batches,
                totalBatches,
                courseStats,
            } = action.payload;

            const currentReviewIndex = action.payload.initialReviewIndex || 0;

            // Calculate derived batch index if restoring
            let currentBatchIndex = 0;
            if (currentReviewIndex > 0) {
                let runningCount = 0;
                for (let i = 0; i < batches.length; i++) {
                    if (currentReviewIndex < runningCount + batches[i].length) {
                        currentBatchIndex = i;
                        break;
                    }
                    runningCount += batches[i].length;
                }
            }

            return {
                ...state,
                status: "READY",
                sessionInfo,
                quotaInfo,
                reviewQueue,
                batches,
                totalBatches,
                courseStats,
                currentBatchIndex,
                currentReviewIndex,
                error: null,
                isSyncing: false,
            };
        }

        case "SET_ERROR":
            return {
                ...state,
                status: "ERROR",
                error: action.payload,
                isSyncing: false,
            };

        case "START_PLAYING":
            return {
                ...state,
                status: "PLAYING",
            };

        case "ANSWER_QUESTION": {
            const { isCorrect } = action.payload;
            // Optimistic Course Stats Update
            const newCourseStats = state.courseStats
                ? {
                    ...state.courseStats,
                    totalQuestionsSolved:
                        state.courseStats.totalQuestionsSolved + 1,
                    // Note: Average Mastery update is complex to do optimistically perfectly,
                    // but we can approximate or wait for sync.
                    // For now just increment count.
                }
                : null;

            return {
                ...state,
                isAnswered: true,
                selectedAnswer: action.payload.answerIndex,
                isCorrect: isCorrect,
                results: {
                    ...state.results,
                    correct: state.results.correct + (isCorrect ? 1 : 0),
                    incorrect: state.results.incorrect + (isCorrect ? 0 : 1),
                },
                courseStats: newCourseStats,
                isSyncing: true, // Optimistically handled, but technically syncing to DB
            };
        }

        case "SYNC_START":
            return {
                ...state,
                isSyncing: true,
            };

        case "SYNC_COMPLETE":
            return {
                ...state,
                isSyncing: false,
            };

        case "NEXT_QUESTION": {
            // 1. Calculate next index
            const nextIndex = state.currentReviewIndex + 1;

            // 2. Check if finished
            if (nextIndex >= state.reviewQueue.length) {
                return {
                    ...state,
                    status: "FINISHED",
                    isAnswered: false,
                    selectedAnswer: null,
                    isCorrect: null,
                };
            }

            // 3. Check for Batch Transition
            // We need to know if we crossed a batch boundary
            // Batches are just logical groupings. State has `batches` array.
            // We can check if nextIndex corresponds to the start of the next batch?
            // Or simply: Calculate which batch the *next* question belongs to.

            // Let's iterate batches to find where nextIndex falls
            let cumulativeCount = 0;
            let nextBatchIndex = 0;
            for (let i = 0; i < state.batches.length; i++) {
                const batchLen = state.batches[i].length;
                if (nextIndex < cumulativeCount + batchLen) {
                    nextBatchIndex = i;
                    break;
                }
                cumulativeCount += batchLen;
            }

            // If next question is in a DIFFERENT batch than current, trigger INTERMISSION
            if (nextBatchIndex > state.currentBatchIndex) {
                return {
                    ...state,
                    status: "INTERMISSION",
                    currentBatchIndex: nextBatchIndex, // Advance logically, but UI shows Intermission
                    // Don't advance currentReviewIndex yet?
                    // Usually Intermission is shown *before* showing the next batch's first question.
                    // So we pause here.
                    isAnswered: false,
                    selectedAnswer: null,
                    isCorrect: null,
                    // Keep currentReviewIndex as is? Or advance it?
                    // If we advance, `QuizEngine` might try to render the question.
                    // We want `status` to block the view.
                    currentReviewIndex: nextIndex,
                };
            }

            return {
                ...state,
                currentReviewIndex: nextIndex,
                isAnswered: false,
                selectedAnswer: null,
                isCorrect: null,
                status: "PLAYING", // Ensure we are playing
            };
        }

        case "FINISH_BATCH":
            // Explicit action to trigger intermission if needed manually
            return {
                ...state,
                status: "INTERMISSION",
            };

        case "CONTINUE_BATCH":
            return {
                ...state,
                status: "PLAYING",
            };

        case "INJECT_SCAFFOLDING": {
            const { questionId, chunkId, priority } = action.payload;

            // Immutable Injection
            const newItem: ReviewItem = {
                questionId,
                chunkId,
                courseId: state.sessionInfo?.courseId || "",
                status: "pending_followup",
                priority,
            };

            // 1. Insert into Review Queue (Global)
            // Insert AFTER current index
            const insertIndex = state.currentReviewIndex + 1;
            const newReviewQueue = [
                ...state.reviewQueue.slice(0, insertIndex),
                newItem,
                ...state.reviewQueue.slice(insertIndex),
            ];

            // 2. Insert into Batches (Complex)
            // We want it to appear *immediately* in the CURRENT batch if possible,
            // or lengthen the current batch.

            const newBatches = [...state.batches];
            if (newBatches[state.currentBatchIndex]) {
                // Needed: Insert at correct relative position in current batch.
                // Simplified: Just push to current batch?
                // If we are at index X in batch, we want X+1 to be this new item.
                // But we don't track in-batch index explicitly in state, only global `currentReviewIndex`.

                // Re-calculate relative index
                let prevCount = 0;
                for (let i = 0; i < state.currentBatchIndex; i++) {
                    prevCount += state.batches[i].length;
                }
                const relativeIndex = state.currentReviewIndex - prevCount;

                const currentBatch = [...newBatches[state.currentBatchIndex]];
                // Insert after current
                currentBatch.splice(relativeIndex + 1, 0, newItem);

                newBatches[state.currentBatchIndex] = currentBatch;
            }

            return {
                ...state,
                reviewQueue: newReviewQueue,
                batches: newBatches,
                // No index change needed, it will be picked up as next
            };
        }

        case "FINISH_QUIZ":
            return {
                ...state,
                status: "FINISHED",
            };

        default:
            return state;
    }
}
