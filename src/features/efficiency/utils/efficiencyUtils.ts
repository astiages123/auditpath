import { getVirtualDateKey } from "@/utils/helpers";

/**
 * Generates a date range array (inclusive) filling any gaps between start and end.
 * Useful for charts where every day must be represented even if no data exists.
 *
 * @param days - Number of days to generate back from today (or from reference date)
 * @param referenceDate - The reference date (defaults to today)
 * @returns Array of date keys strings (YYYY-MM-DD)
 */
export function generateDateRange(
    days: number,
    referenceDate: Date = new Date(),
): string[] {
    const dates: string[] = [];
    // Align reference date to noon to avoid DST issues
    const currentDate = new Date(referenceDate);
    currentDate.setHours(12, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - i);
        dates.push(getVirtualDateKey(d));
    }
    return dates;
}

/**
 * Safe Helper to format duration in minutes
 */
export const formatDurationMinutes = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}sa ${m}dk`;
    return `${m}dk`;
};

interface RawTimelineItem {
    type?: string;
    start?: string | number;
    end?: string | number;
}

/**
 * Type guard or converter for timeline items if needed
 */
export const safeMapTimeline = (rawTimeline: unknown[]) => {
    if (!Array.isArray(rawTimeline)) return [];
    return (rawTimeline as RawTimelineItem[]).map((item) => ({
        type: item.type?.toLowerCase() || "work",
        start: Number(item.start),
        end: Number(item.end),
        duration: Math.round(
            (Number(item.end) - Number(item.start)) / 1000 / 60,
        ),
    }));
};
