/**
 * Tarih ve zaman işlemleri için merkezi yardımcı fonksiyonlar.
 * Virtual Day Logic, Date Formatting ve Duration Formatting burada yönetilir.
 */

// === DATE HELPERS ===

/**
 * Sanal gün mantığı: Gece 04:00'dan önce ise bir önceki güne ait sayılır.
 * Bu, gece geç saatlere kadar çalışan kullanıcıların aynı "gün" içinde kalmasını sağlar.
 * @param date - İşlenecek tarih
 * @returns Sanal gün olarak ayarlanmış Date nesnesi (mutate edilmez, yeni Date döner)
 */
export function getVirtualDate(date: Date = new Date()): Date {
  const d = new Date(date);
  if (d.getHours() < 4) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

function getVirtualDayStartInternal(date?: Date): Date {
  const now = date ? new Date(date) : new Date();
  if (now.getHours() < 4) {
    now.setDate(now.getDate() - 1);
  }
  now.setHours(4, 0, 0, 0);
  return now;
}

/**
 * Bugünün sanal gün başlangıcını döner (04:00 AM).
 * Genellikle veritabanı sorguları için kullanılır.
 * @returns Bugünün 04:00'ındaki Date nesnesi
 */
export function getVirtualDayStart(date?: Date): Date {
  return getVirtualDayStartInternal(date);
}

/**
 * Tarihi YYYY-MM-DD formatına çevirir.
 * @param date - Formatlanacak tarih
 * @returns "2026-01-28" gibi string
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Sanal gün mantığıyla YYYY-MM-DD key oluşturur.
 * Virtual day adjustment uygulanır, sonra format edilir.
 * @param date - İşlenecek tarih (default: şimdi)
 * @returns "2026-01-28" gibi string, sanal gün mantığıyla
 */
export function getVirtualDateKey(date?: Date): string {
  const virtualDate = getVirtualDate(date);
  return formatDateKey(virtualDate);
}

/**
 * Tarihi kullanıcıya dost bir formatta döner.
 * Varsayılan: "28 Jan" veya "28 Ocak" (tr-TR).
 * @param date - Formatlanacak tarih (Date veya ISO string)
 * @param options - Intl.DateTimeFormatOptions seçenekleri
 * @returns Formatlı tarih string'i
 */
export function formatDisplayDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
  }
): string {
  const d =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
  return d.toLocaleDateString('tr-TR', options);
}

// === FORMATTERS (TIME & DURATION) ===

/**
 * Saniye cinsinden süreyi "Xsa Ydk" formatına çevirir.
 * 0 dakika ise sadece "0dk" döner.
 * @example formatTimeFromSeconds(3665) → "1sa 1dk"
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
