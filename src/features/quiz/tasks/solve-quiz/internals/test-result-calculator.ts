

export interface TestResultSummary {
    percentage: number;
    masteryScore: number; // For this session
    pendingReview: number;
    totalTimeFormatted: string;
}

export function calculateTestResults(
    correct: number, 
    incorrect: number, 
    blank: number, 
    timeSpentMs: number
): TestResultSummary {
    const total = correct + incorrect + blank;
    
    // 1. Percentage
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    // 2. Mastery Score (Session)
    // NOT: Bu hesaplama sadece oturum sonu özeti için kullanılır.
    // Gerçek mastery puanı srs-algorithm.ts'deki calculateScoreChange ile hesaplanır.
    // Simple heuristic: Correct * 10 - Incorrect * 5 
    // Or just percentage mapped to 0-100.
    // Let's use weighted: Correct=100%, Incorrect=20%, Blank=0%
    const masteryScore = total > 0 
        ? Math.round(((correct * 1.0 + incorrect * 0.2 + blank * 0.0) / total) * 100) 
        : 0;

    // 3. Pending Review
    // Algorithm: Incorrect + Blank are always pending review
    const pendingReview = incorrect + blank;

    // 4. Formatted Time
    const seconds = Math.floor(timeSpentMs / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const h = Math.floor(m / 60);
    const mRemaining = m % 60;
    
    // Custom format SS:DD:ss (Hour:Min:Sec) requested by user? "SS:DD:ss" usually means HH:MM:ss
    const pad = (n: number) => n.toString().padStart(2, '0');
    const totalTimeFormatted = `${pad(h)}:${pad(mRemaining)}:${pad(s)}`;

    return {
        percentage,
        masteryScore,
        pendingReview,
        totalTimeFormatted
    };
}
