/**
 * Utility functions for activity tracking and statistics.
 * Centralizes the "Virtual Day" logic where the day starts at 04:00 AM.
 */

/**
 * Gets the current virtual day's start time (04:00 AM).
 * If the current time is before 04:00 AM, it returns 04:00 AM of the previous calendar day.
 *
 * @returns Date object representing the start of the virtual day
 */
export function getVirtualToday(): Date {
    const now = new Date();
    const today = new Date(now);

    if (now.getHours() < 4) {
        today.setDate(today.getDate() - 1);
    }
    today.setHours(4, 0, 0, 0);

    return today;
}

/**
 * Adjusts a given date to its virtual day.
 * If the time is before 04:00 AM, it's considered part of the previous day.
 *
 * @param date The date to adjust
 * @returns Date object shifted to the correct virtual day
 */
export function adjustToVirtualDay(date: Date): Date {
    const adjusted = new Date(date);
    if (adjusted.getHours() < 4) {
        adjusted.setDate(adjusted.getDate() - 1);
    }
    return adjusted;
}

/**
 * Formats a date as YYYY-MM-DD.
 *
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDateKey(date: Date): string {
    return `${date.getFullYear()}-${
        String(date.getMonth() + 1).padStart(2, "0")
    }-${String(date.getDate()).padStart(2, "0")}`;
}
