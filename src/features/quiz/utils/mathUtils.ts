/**
 * Matematiksel içeriği temizler ve KaTeX render işlemi için hazırlar.
 * @param content - Temizlenecek ham metin
 * @returns KaTeX uyumlu temiz metin
 */
export const cleanMathContent = (
  content: string | undefined | null
): string => {
  if (!content) return '';

  return (
    content
      // 1. Markdown görsel kalıplarını kaldır (örn: (image.webp))
      .replace(/\([\w-]+\.(webp|png|jpg|jpeg|gif)\)/gi, '')
      // 2. [GÖRSEL: X] kalıplarını kaldır
      .replace(/\[GÖRSEL:\s*\d+\]/gi, '')
      // 3. Satır sonlarını normalize et
      .replace(/\n\s*\n/g, '\n\n')
      // 4. Sayı formatlama:
      // a. Basamaklar arası boşlukları kaldır (örn: 1 000 000 -> 1000000)
      .replace(/(\d)\s+(?=\d)/g, '$1')
      // b. Binlik ayırıcı ekle (örn: 1000000 -> 1.000.000)
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      // 5. KaTeX yorumu sanılmaması için '%' işaretlerini kaçış karakteriyle koru
      .replace(/(?<!\\)%/g, '\\%')
      .trim()
  );
};

/**
 * Bir diziyi Fisher-Yates algoritması kullanarak karıştırır.
 * @param array - Karıştırılacak dizi
 * @returns Karıştırılmış yeni dizi
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
