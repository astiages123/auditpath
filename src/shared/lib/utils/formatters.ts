/**
 * Zaman ve süre formatlama fonksiyonları.
 * Bu modül, projede tekrar eden format fonksiyonlarını tek bir merkezde toplar.
 */

/**
 * Saniye cinsinden süreyi "Xsa Ydk" formatına çevirir.
 * 0 dakika ise sadece "0dk" döner.
 * @example formatTimeFromSeconds(3665) → "1sa 1dk"
 * @example formatTimeFromSeconds(120) → "2dk"
 */
export function formatTimeFromSeconds(seconds: number): string {
    const totalMinutes = Math.round(seconds / 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0) return `${h}sa ${m}dk`;
    return `${m}dk`;
}

/**
 * Ondalık saat cinsinden süreyi "X sa Y dk" formatına çevirir.
 * @example formatDurationFromHours(1.5) → "1 sa 30 dk"
 * @example formatDurationFromHours(0.5) → "0 sa 30 dk"
 */
export function formatDurationFromHours(decimalHours: number): string {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours} sa ${minutes} dk`;
}

/**
 * Kısa format: "Xs Yd" (ProgressHeader vb. için).
 * @example formatDurationShort(1.5) → "1s 30d"
 */
export function formatDurationShort(decimalHours: number): string {
    const totalMinutes = Math.round(decimalHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}s ${minutes}d`;
}
