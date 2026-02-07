import type { QuizQuestion } from "./api/solve-quiz.api";

export interface QuizState {
    currentQuestion: QuizQuestion | null;
    queue: QuizQuestion[];
    totalToGenerate: number;
    generatedCount: number;
    isLoading: boolean;
    error: string | null;
    selectedAnswer: number | null;
    isAnswered: boolean;
    showExplanation: boolean;
    isCorrect: boolean | null;
    hasStarted: boolean;
}

export interface QuizResults {
    correct: number;
    incorrect: number;
    blank: number;
    totalTimeMs: number;
}

export interface QuizProgressDetails {
    totalQuestions: number;
    currentQuestionIndex: number;
    remainingInQueue: number;
}

export type QuizStatus =
    | "IDLE"
    | "LOADING"
    | "READY"
    | "IN_PROGRESS"
    | "FINISHED"
    | "ERROR";

export interface SolveQuizCallbacks {
    onStateChange?: (state: QuizState) => void;
    onResultsUpdate?: (results: QuizResults) => void;
    onComplete?: (results: QuizResults) => void;
    onLog?: (message: string, details?: Record<string, any>) => void;
    onError?: (error: string) => void;
    /** Callback to record response to DB/Context */
    recordResponse?: (
        questionId: string,
        responseType: "correct" | "incorrect" | "blank",
        selectedAnswer: number | null,
        timeSpentMs: number,
        diagnosis?: string,
        insight?: string,
    ) => Promise<any>;
}
