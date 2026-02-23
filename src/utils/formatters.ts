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
  if (seconds < 0) return '0dk';
  const totalMinutes = Math.round(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}sa ${m}dk`;
  return `${m}dk`;
}

/**
 * Ondalık saat cinsinden süreyi "X sa Y dk" formatına çevirir.
 * @example formatDuration(1.5) → "1 sa 30 dk"
 * @example formatDuration(0.5) → "0 sa 30 dk"
 */
export function formatDuration(decimalHours: number): string {
  if (decimalHours < 0) return '0 sa 0 dk';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours} sa ${minutes} dk`;
}

export { formatDuration as formatDurationFromHours };

/**
 * Kısa format: "Xs Yd" (ProgressHeader vb. için).
 * @example formatDurationShort(1.5) → "1s 30d"
 */
export function formatDurationShort(decimalHours: number): string {
  if (decimalHours < 0) return '0s 0d';
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}s ${minutes}d`;
}
