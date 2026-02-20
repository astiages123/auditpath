import {
  CourseStats,
  QuizAction,
  QuizSessionState,
  ReviewItem,
} from '@/features/quiz/types';

export const initialQuizSessionState: QuizSessionState = {
  status: 'IDLE',
  sessionInfo: null,
  quotaInfo: null,
  reviewQueue: [],
  batches: [],
  currentBatchIndex: 0,
  totalBatches: 0,
  currentReviewIndex: 0,
  courseStats: null,
  error: null,
  isSyncing: false,
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
  action: QuizAction
): QuizSessionState {
  switch (action.type) {
    case 'INITIALIZE': {
      const { sessionInfo, quotaInfo, courseStats } = action.payload;

      const reviewQueue = (action.payload.reviewQueue || []) as ReviewItem[];
      const batches = (action.payload.batches || []) as ReviewItem[][];
      const totalBatches = action.payload.totalBatches || batches.length || 1;
      const currentReviewIndex = action.payload.initialReviewIndex || 0;

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
        status: 'READY',
        sessionInfo,
        quotaInfo,
        reviewQueue,
        batches,
        totalBatches,
        courseStats: courseStats as CourseStats,
        currentBatchIndex,
        currentReviewIndex,
        error: null,
        isSyncing: false,
      };
    }

    case 'SET_ERROR':
      return {
        ...state,
        status: 'ERROR',
        error: action.payload,
        isSyncing: false,
      };

    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload,
      };

    case 'START_PLAYING':
      return {
        ...state,
        status: 'PLAYING',
      };

    case 'ANSWER_QUESTION': {
      const { isCorrect, responseType, answerIndex } = action.payload;
      const newCourseStats: CourseStats = state.courseStats
        ? {
            ...state.courseStats,
            totalQuestionsSolved:
              (state.courseStats.totalQuestionsSolved || 0) + 1,
          }
        : { totalQuestionsSolved: 1 };

      const updatedReviewQueue = state.reviewQueue.map((item, idx) =>
        idx === state.currentReviewIndex
          ? {
              ...item,
              userAnswer: answerIndex ?? null,
              isCorrectAnswer: isCorrect,
            }
          : item
      );

      const updatedBatches = state.batches.map((batch) =>
        batch.map((item) =>
          item.questionId ===
          state.reviewQueue[state.currentReviewIndex]?.questionId
            ? {
                ...item,
                userAnswer: answerIndex ?? null,
                isCorrectAnswer: isCorrect,
              }
            : item
        )
      );

      return {
        ...state,
        isAnswered: true,
        selectedAnswer: answerIndex ?? null,
        isCorrect: isCorrect,
        results: {
          ...state.results,
          correct: state.results.correct + (responseType === 'correct' ? 1 : 0),
          incorrect:
            state.results.incorrect + (responseType === 'incorrect' ? 1 : 0),
          blank: state.results.blank + (responseType === 'blank' ? 1 : 0),
        },
        courseStats: newCourseStats,
        isSyncing: true,
        reviewQueue: updatedReviewQueue,
        batches: updatedBatches,
      };
    }

    case 'SYNC_START':
      return {
        ...state,
        isSyncing: true,
      };

    case 'SYNC_COMPLETE':
      return {
        ...state,
        isSyncing: false,
      };

    case 'NEXT_QUESTION': {
      const nextIndex = state.currentReviewIndex + 1;

      if (nextIndex >= state.reviewQueue.length) {
        return {
          ...state,
          status: 'FINISHED',
          isAnswered: false,
          selectedAnswer: null,
          isCorrect: null,
        };
      }

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

      if (nextBatchIndex > state.currentBatchIndex) {
        return {
          ...state,
          status: 'INTERMISSION',
          currentBatchIndex: nextBatchIndex,
          isAnswered: false,
          selectedAnswer: null,
          isCorrect: null,
          currentReviewIndex: nextIndex,
        };
      }

      const nextQuestionItem = state.reviewQueue[nextIndex];

      return {
        ...state,
        currentReviewIndex: nextIndex,
        isAnswered:
          nextQuestionItem?.userAnswer !== undefined &&
          nextQuestionItem?.userAnswer !== null,
        selectedAnswer: nextQuestionItem?.userAnswer ?? null,
        isCorrect: nextQuestionItem?.isCorrectAnswer ?? null,
        status: 'PLAYING',
      };
    }

    case 'FINISH_BATCH':
      return {
        ...state,
        status: 'INTERMISSION',
      };

    case 'CONTINUE_BATCH':
      return {
        ...state,
        status: 'PLAYING',
      };

    case 'INJECT_SCAFFOLDING': {
      const { questionId, chunkId, priority } = action.payload;

      const newItem: ReviewItem = {
        questionId,
        chunkId,
        courseId: state.sessionInfo?.courseId || '',
        status: 'pending_followup',
        priority,
      };

      const insertIndex = state.currentReviewIndex + 1;
      const newReviewQueue = [
        ...state.reviewQueue.slice(0, insertIndex),
        newItem,
        ...state.reviewQueue.slice(insertIndex),
      ];

      const newBatches = [...state.batches];
      if (newBatches[state.currentBatchIndex]) {
        let prevCount = 0;
        for (let i = 0; i < state.currentBatchIndex; i++) {
          prevCount += state.batches[i].length;
        }
        const relativeIndex = state.currentReviewIndex - prevCount;

        const currentBatch = [...newBatches[state.currentBatchIndex]];
        currentBatch.splice(relativeIndex + 1, 0, newItem);

        newBatches[state.currentBatchIndex] = currentBatch;
      }

      return {
        ...state,
        reviewQueue: newReviewQueue,
        batches: newBatches,
      };
    }

    case 'FINISH_QUIZ':
      return {
        ...state,
        status: 'FINISHED',
      };

    case 'PREV_QUESTION': {
      const prevIndex = Math.max(0, state.currentReviewIndex - 1);
      const prevQuestionItem = state.reviewQueue[prevIndex];
      return {
        ...state,
        currentReviewIndex: prevIndex,
        isAnswered:
          prevQuestionItem?.userAnswer !== undefined &&
          prevQuestionItem?.userAnswer !== null,
        selectedAnswer: prevQuestionItem?.userAnswer ?? null,
        isCorrect: prevQuestionItem?.isCorrectAnswer ?? null,
        status: 'PLAYING',
      };
    }

    default:
      return state;
  }
}

export function createBatches(queue: ReviewItem[]): ReviewItem[][] {
  const BATCH_SIZE = 10;
  const batches: ReviewItem[][] = [];

  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    batches.push(queue.slice(i, i + BATCH_SIZE));
  }

  return batches.length > 0 ? batches : [[]];
}
