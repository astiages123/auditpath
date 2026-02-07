/**
 * Timer Logic for Quiz
 */

export class QuizTimerLogic {
    private startTime: number = 0;
    private totalAccumulatedTime: number = 0;
    private isRunning: boolean = false;

    start() {
        this.startTime = Date.now();
        this.isRunning = true;
    }

    stop(): number {
        if (!this.isRunning) return 0;

        const elapsed = Date.now() - this.startTime;
        this.totalAccumulatedTime += elapsed;
        this.isRunning = false;
        return elapsed;
    }

    reset() {
        this.startTime = Date.now();
        if (!this.isRunning) this.isRunning = true;
    }

    getElapsedNow(): number {
        if (!this.isRunning) return 0;
        return Date.now() - this.startTime;
    }

    getTotalTime(): number {
        return this.totalAccumulatedTime +
            (this.isRunning ? this.getElapsedNow() : 0);
    }

    clear() {
        this.startTime = 0;
        this.totalAccumulatedTime = 0;
        this.isRunning = false;
    }
}

export const createTimer = () => new QuizTimerLogic();
