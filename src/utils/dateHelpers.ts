/**
 * Tarih işlemleri için yardımcı fonksiyonlar.
 * Virtual Day Logic ve Date Formatting burada merkezi olarak yönetilir.
 */

/**
 * Sanal gün mantığı: Gece 04:00'dan önce ise bir önceki güne ait sayılır.
 * Bu, gece geç saatlere kadar çalışan kullanıcıların aynı "gün" içinde kalmasını sağlar.
 * @param date - İşlenecek tarih (default: şimdi)
 * @returns Sanal gün olarak ayarlanmış Date nesnesi (mutate edilmez, yeni Date döner)
 */
export function getVirtualDate(date?: Date): Date {
  const d = date ? new Date(date) : new Date();
  if (d.getHours() < 4) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

/**
 * Bugünün sanal gün başlangıcını döner (04:00 AM).
 * Genellikle veritabanı sorguları için kullanılır.
 * @returns Bugünün 04:00'ındaki Date nesnesi
 */
export function getVirtualDayStart(date?: Date): Date {
  const now = date ? new Date(date) : new Date();
  const today = new Date(now);

  // 00:00 - 04:00 arası ise bir önceki güne ait
  if (now.getHours() < 4) {
    today.setDate(today.getDate() - 1);
  }
  today.setHours(4, 0, 0, 0);
  return today;
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
