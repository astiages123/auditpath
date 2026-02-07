/**
 * Solve Quiz Service
 *
 * Centralized business logic for solving quizzes.
 * Manages timer, scoring, and DB synchronization.
 */

import { supabase } from "@/shared/lib/core/supabase";
import { finishQuizSession } from "@/shared/lib/core/client-db";
import { fetchQuestionsForSession, QuizQuestion } from "./api/solve-quiz.api";
import { createTimer, QuizTimerLogic } from "./internals/timer-logic";
import {
    calculateInitialResults,
    isExcellenceAchieved,
    updateResults,
} from "./internals/scoring-engine";
import { QuizResults, QuizState, SolveQuizCallbacks } from "./types";
import { generateQuestionsForChunk } from "@/features/quiz/tasks/generate-questions";

export class SolveQuizService {
    private timer: QuizTimerLogic;
    private state: QuizState;
    private results: QuizResults;
    private callbacks: SolveQuizCallbacks;

    constructor(callbacks: SolveQuizCallbacks = {}) {
        this.timer = createTimer();
        this.results = calculateInitialResults();
        this.callbacks = callbacks;
        this.state = this.getInitialState();
    }

    private getInitialState(): QuizState {
        return {
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
        };
    }

    private updateState(patch: Partial<QuizState>) {
        this.state = { ...this.state, ...patch };
        this.callbacks.onStateChange?.(this.state);
    }

    private log(message: string, details?: Record<string, any>) {
        this.callbacks.onLog?.(message, details);
    }

    /**
     * Start a new quiz session by fetching questions
     */
    async startQuizSession(params: {
        chunkId: string;
        userId: string;
        count: number;
        usageType?: "antrenman" | "deneme" | "arsiv";
    }) {
        this.updateState({ isLoading: true, error: null });
        this.log("Oturum başlatılıyor...", { chunkId: params.chunkId });

        try {
            const questions = await fetchQuestionsForSession(
                params.chunkId,
                params.count,
                params.userId,
                params.usageType || "antrenman",
            );

            if (questions.length > 0) {
                this.initializeWithQuestions(questions);
            } else {
                // Trigger generation if no questions found
                this.triggerGeneration(
                    params.chunkId,
                    params.count,
                    params.userId,
                );
            }
        } catch (e) {
            const err = e instanceof Error ? e.message : "Bilinmeyen hata";
            this.updateState({ isLoading: false, error: err });
            this.callbacks.onError?.(err);
        }
    }

    private initializeWithQuestions(questions: QuizQuestion[]) {
        const [first, ...rest] = questions;
        this.updateState({
            currentQuestion: first,
            queue: rest,
            generatedCount: questions.length,
            totalToGenerate: questions.length,
            isLoading: false,
        });
        this.log("Sorular yüklendi", { count: questions.length });
    }

    private triggerGeneration(chunkId: string, count: number, userId: string) {
        this.log("Soru bulunamadı, üretim tetikleniyor...");

        generateQuestionsForChunk(chunkId, {
            onLog: (l) => this.log(`[Gen] ${l.message}`, l.details),
            onQuestionSaved: (total) =>
                this.updateState({ generatedCount: total }),
            onComplete: async () => {
                const updated = await fetchQuestionsForSession(
                    chunkId,
                    count,
                    userId,
                    "antrenman",
                );
                this.initializeWithQuestions(updated);
            },
            onError: (err) => {
                this.updateState({
                    isLoading: false,
                    error: `Üretim hatası: ${err}`,
                });
                this.callbacks.onError?.(err);
            },
        });
    }

    /**
     * Signal that user has clicked 'Start'
     */
    beginSolving() {
        this.updateState({ hasStarted: true });
        this.timer.start();
        this.log("Antrenman başladı");
    }

    /**
     * Process an answer selection
     */
    async processAnswer(index: number) {
        if (this.state.isAnswered || !this.state.currentQuestion) return;

        const timeSpent = this.timer.stop();
        const isCorrect = index === this.state.currentQuestion.a;
        const type = isCorrect ? "correct" : "incorrect";

        // 1. Update results locally
        this.results = updateResults(this.results, type, timeSpent);
        this.callbacks.onResultsUpdate?.(this.results);

        // 2. Update session state
        this.updateState({
            selectedAnswer: index,
            isAnswered: true,
            isCorrect,
            showExplanation: true,
        });

        this.log("Cevap verildi", { isCorrect, timeSpent });

        // 3. Record response to DB (async)
        if (this.callbacks.recordResponse && this.state.currentQuestion.id) {
            await this.callbacks.recordResponse(
                this.state.currentQuestion.id,
                type,
                index,
                timeSpent,
                this.state.currentQuestion.diagnosis,
                this.state.currentQuestion.insight,
            );
        }
    }

    /**
     * Skip question (mark as blank)
     */
    async processBlank() {
        if (this.state.isAnswered || !this.state.currentQuestion) return;

        const timeSpent = this.timer.stop();
        this.results = updateResults(this.results, "blank", timeSpent);
        this.callbacks.onResultsUpdate?.(this.results);

        this.updateState({
            selectedAnswer: null,
            isAnswered: true,
            isCorrect: false,
            showExplanation: false, // Don't show explanation for blank typically or follow UI pattern
        });

        this.log("Soru boş geçildi", { timeSpent });

        // Record response to DB
        if (this.callbacks.recordResponse && this.state.currentQuestion.id) {
            await this.callbacks.recordResponse(
                this.state.currentQuestion.id,
                "blank",
                null,
                timeSpent,
                this.state.currentQuestion.diagnosis,
                this.state.currentQuestion.insight,
            );
        }
    }

    /**
     * Move to the next question or finish
     */
    async nextStep(userId: string, courseId: string) {
        if (this.state.queue.length > 0) {
            const [next, ...rest] = this.state.queue;
            this.updateState({
                currentQuestion: next,
                queue: rest,
                selectedAnswer: null,
                isAnswered: false,
                showExplanation: false,
                isCorrect: null,
            });
            this.timer.reset();
        } else {
            await this.finishSession(userId, courseId);
        }
    }

    private async finishSession(userId: string, courseId: string) {
        this.updateState({ isLoading: true });
        this.log("Oturum sonlandırılıyor...");

        try {
            await finishQuizSession({
                totalQuestions: this.state.totalToGenerate,
                correctCount: this.results.correct,
                incorrectCount: this.results.incorrect,
                blankCount: this.results.blank,
                timeSpentMs: this.results.totalTimeMs,
                courseId,
                userId,
            });

            this.updateState({ isLoading: false });
            this.callbacks.onComplete?.(this.results);
            this.log("Oturum başarıyla kaydedildi");
        } catch (e) {
            const err = e instanceof Error ? e.message : "Kaydetme hatası";
            this.updateState({ isLoading: false, error: err });
            this.callbacks.onError?.(err);
        }
    }

    getResults() {
        return this.results;
    }

    toggleExplanation() {
        this.updateState({ showExplanation: !this.state.showExplanation });
    }

    reset() {
        this.timer.clear();
        this.results = calculateInitialResults();
        this.state = this.getInitialState();
        this.callbacks.onStateChange?.(this.state);
    }
}
