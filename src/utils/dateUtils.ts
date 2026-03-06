/**
 * Standart gün mantığı: Mevcut tarih ve saati temel alır.
 *
 * @param date - İşlenecek tarih (varsayılan: şimdi)
 * @returns Date nesnesi
 */
export function getVirtualDate(date: Date = new Date()): Date {
  return new Date(date);
}

/**
 * Uygulamadaki tek gün sınırını döner: gün 00:00'da başlar.
 *
 * @param date - Referans tarih (varsayılan: şimdi)
 * @returns Referans günün 00:00'ındaki Date nesnesi
 */
export function getAppDayStart(date?: Date): Date {
  const now = date ? new Date(date) : new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function getAppDayStartDaysAgo(
  days: number,
  date: Date = new Date()
): Date {
  const start = getAppDayStart(date);
  start.setDate(start.getDate() - days);
  return start;
}

export function getVirtualDayStart(date?: Date): Date {
  return getAppDayStart(date);
}

/**
 * Tarihi 'YYYY-MM-DD' formatına çevirir.
 *
 * @param date - Formatlanacak tarih
 * @returns "2026-01-28" gibi string formatı
 * @example formatDateKey(new Date()) // "2026-03-03"
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Standart gün mantığıyla 'YYYY-MM-DD' formatında anahtar (key) oluşturur.
 *
 * @param date - İşlenecek tarih (varsayılan: şimdi)
 * @returns "2026-01-28" formatında string
 */
export function getVirtualDateKey(date?: Date): string {
  const virtualDate = getVirtualDate(date);
  return formatDateKey(virtualDate);
}

/**
 * Tarihi kullanıcıya dost (display) bir formatta döner.
 *
 * @param date - Formatlanacak tarih (Date, string veya timestamp)
 * @param options - Intl.DateTimeFormatOptions seçenekleri
 * @returns Formatlı tarih string'i
 * @example formatDisplayDate(new Date()) // "3 Mar"
 */
export function formatDisplayDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
  }
): string {
  const targetDate =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
  return targetDate.toLocaleDateString('tr-TR', options);
}

/**
 * Saniye cinsinden süreyi "Xsa Ydk" formatına çevirir.
 *
 * @param seconds - Toplam saniye
 * @returns Okunabilir süre string'i
 * @example formatTimeFromSeconds(3665) // "1sa 1dk"
 */
export function formatTimeFromSeconds(seconds: number): string {
  if (seconds < 0) return '0dk';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}sa ${minutes}dk`;
  return `${minutes}dk`;
}

/**
 * Ondalık saat cinsinden süreyi "X sa Y dk" formatına çevirir.
 *
 * @param decimalHours - Saat (örn: 1.5)
 * @returns "1 sa 30 dk" gibi string formatı
 * @example formatDuration(1.5) // "1 sa 30 dk"
 */
export function formatDuration(decimalHours: number): string {
  if (decimalHours < 0) return '0 sa 0 dk';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours} sa ${minutes} dk`;
}

export { formatDuration as formatDurationFromHours };

/**
 * Ondalık saat cinsinden süreyi kısa "Xs Yd" formatına çevirir.
 *
 * @param decimalHours - Saat (örn: 1.5)
 * @returns "1s 30d" gibi kısa string formatı
 * @example formatDurationShort(1.5) // "1s 30d"
 */
export function formatDurationShort(decimalHours: number): string {
  if (decimalHours < 0) return '0s 0d';
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}s ${minutes}d`;
}
