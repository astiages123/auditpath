import { useCallback, useRef, useState } from "react";
import { QuizResults, QuizState } from "@/features/quiz/types";
import { calculateInitialResults } from "@/features/quiz/logic/algorithms/scoring";
import { createTimer } from "@/features/quiz/logic/quizTimer";
import { SessionContext } from "@/features/quiz/logic/engines/sessionEngine";

export function useCoreState() {
    const [state, setState] = useState<QuizState>({
        currentQuestion: null,
        queue: [],
        totalToGenerate: 0,
        generatedCount: 0,
        isLoading: false,
        error: null,
        selectedAnswer: null,
        isAnswered: false,
        showExplanation: false,
        isCorrect: null,
        hasStarted: false,
        summary: null,
        lastSubmissionResult: null,
        history: [],
    });

    const [results, setResults] = useState<QuizResults>(
        calculateInitialResults(),
    );

    const [lastParams, setLastParams] = useState<
        {
            count: number;
            params: { type: "chunk"; chunkId: string; userId?: string };
        } | null
    >(null);

    const timerRef = useRef(createTimer());
    const sessionContextRef = useRef<SessionContext | null>(null);

    const updateState = useCallback((patch: Partial<QuizState>) => {
        setState((prev) => ({ ...prev, ...patch }));
    }, []);

    const updateResults = useCallback(
        (updater: (prev: QuizResults) => QuizResults) => {
            setResults(updater);
        },
        [],
    );

    const setParams = useCallback(
        (
            count: number,
            params: { type: "chunk"; chunkId: string; userId?: string },
        ) => {
            setLastParams({ count, params });
        },
        [],
    );

    return {
        state,
        setState,
        updateState,
        results,
        setResults,
        updateResults,
        lastParams,
        setLastParams,
        setParams,
        timerRef,
        sessionContextRef,
    };
}
