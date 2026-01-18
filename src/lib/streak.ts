"use client";

const STREAK_KEY = "user-streak-data";

interface StreakData {
    currentStreak: number;
    lastActivityDate: string | null; // ISO date string YYYY-MM-DD
    history: string[]; // Days where 3+ videos were completed
    dailyCounts: Record<string, number>; // Track video counts per day
}

function getTodayStr(): string {
    return new Date().toISOString().split('T')[0];
}

function loadStreakData(): StreakData {
    if (typeof window === "undefined") {
        return { currentStreak: 0, lastActivityDate: null, history: [], dailyCounts: {} };
    }

    try {
        const stored = localStorage.getItem(STREAK_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Migrate old data if necessary
            if (!parsed.dailyCounts) parsed.dailyCounts = {};
            return parsed;
        }
    } catch (e) {
        console.error("Failed to parse streak data", e);
    }

    return { currentStreak: 0, lastActivityDate: null, history: [], dailyCounts: {} };
}

function saveStreakData(data: StreakData) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

// Helper to check if two dates are consecutive with weekend allowance
function isConsecutive(lastDateStr: string, currDateStr: string): boolean {
    const lastDate = new Date(lastDateStr);
    const currDate = new Date(currDateStr);
    const diffTime = Math.abs(currDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return true;

    // Check for weekend gaps
    const checkDate = new Date(lastDate);
    checkDate.setDate(checkDate.getDate() + 1);

    while (checkDate < currDate) {
        const dayOfWeek = checkDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            return false; // Found a weekday gap
        }
        checkDate.setDate(checkDate.getDate() + 1);
    }

    return true;
}

export function getStreak(): number {
    const data = loadStreakData();
    const today = getTodayStr();

    if (!data.lastActivityDate || data.history.length === 0) return 0;

    // If the last activity was a long time ago (broken streak), return 0
    if (!isConsecutive(data.lastActivityDate, today)) {
        return 0;
    }

    return data.currentStreak;
}

export function recordActivity(amount: number = 1) {
    const data = loadStreakData();
    const today = getTodayStr();

    // Initialize daily count for today
    if (!data.dailyCounts[today]) {
        data.dailyCounts[today] = 0;
    }

    const prevTodayCount = data.dailyCounts[today];
    data.dailyCounts[today] = Math.max(0, data.dailyCounts[today] + amount);
    const newTodayCount = data.dailyCounts[today];

    const threshold = 1;
    const metBefore = prevTodayCount >= threshold;
    const metNow = newTodayCount >= threshold;

    if (!metBefore && metNow) {
        // Just reached the threshold
        if (!data.history.includes(today)) {
            data.history.push(today);
            data.history.sort();
        }

        // Calculate streak
        if (!data.lastActivityDate) {
            data.currentStreak = 1;
        } else if (isConsecutive(data.lastActivityDate, today)) {
            // If it's the same day, don't increment again
            if (data.lastActivityDate !== today) {
                data.currentStreak += 1;
            }
        } else {
            // Gap was too long, reset to 1
            data.currentStreak = 1;
        }
        data.lastActivityDate = today;

    } else if (metBefore && !metNow) {
        // Dropped below threshold
        data.history = data.history.filter(d => d !== today);
        data.history.sort();

        if (data.lastActivityDate === today) {
            // Revert lastActivityDate to previous valid day in history
            const prevValidDay = data.history.length > 0 ? data.history[data.history.length - 1] : null;
            data.lastActivityDate = prevValidDay;

            if (data.currentStreak > 0) {
                data.currentStreak -= 1;
            }
        }
    }

    // Performance cleanup: keep only last 30 days of dailyCounts and history
    saveStreakData(data);
}

export function resetStreak() {
    saveStreakData({ currentStreak: 0, lastActivityDate: null, history: [], dailyCounts: {} });
}
