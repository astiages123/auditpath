import DOMPurify from 'dompurify';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

/**
 * Bir konu bölümünün meta verilerini temsil eden arayüz.
 */
export interface TopicMetadata {
  /** İlgili bölüm içerisindeki görsellerin URL listesi */
  images?: string[];
}

// === BÖLÜM ADI: YARDIMCI FONKSİYONLAR (HELPERS) ===
// ===========================

/**
 * Ham metin içeriğini tarayıcıda güvenli şekilde render edilebilmesi için temizler
 * ve görsel etiketlerini yerleştirir.
 *
 * @param {string} content - Temizlenecek ham markdown veya metin içeriği.
 * @param {TopicMetadata | null} metadata - Konuya ait görsel url'lerini barındıran meta veri nesnesi.
 * @returns {string} Güvenli ve işlenmiş içerik metni.
 */
export function processTopicContent(
  content: string,
  metadata: TopicMetadata | null
): string {
  if (!content) {
    return '';
  }

  try {
    // 1. ADIM: Güvenlik Temizliği (Sanitize)
    // Kötü amaçlı HTML veya script enjeksiyonlarını önlemek için metni temizliyoruz.
    let processedContent: string = DOMPurify.sanitize(content);

    // 2. ADIM: Görünmez Karakter Temizliği
    // \u2000-\u200b arasındaki boşluk (whitespace) dışı yazdırılamayan gizli unicode karakterleri boşlukla değiştiriyoruz.
    // Bu, bazı garip kopyala-yapıştır hatalarını engeller.
    processedContent = processedContent.replace(/[\u2000-\u200b]/g, ' ');

    // 3. ADIM: Görsel Yerleşimi
    const imageUrls: string[] = metadata?.images || [];
    if (imageUrls.length > 0) {
      const usedIndices: Set<number> = new Set<number>();

      // Markdown içindeki özel [GÖRSEL: X] etiketlerini gerçek markdown görsel formatı ile değiştiriyoruz.
      imageUrls.forEach((url: string, index: number) => {
        const markerRegex: RegExp = new RegExp(
          `\\[GÖRSEL:\\s*${index}\\]`,
          'gi'
        );
        if (markerRegex.test(processedContent)) {
          processedContent = processedContent.replace(
            markerRegex,
            `\n\n![Görsel](${url})\n\n`
          );
          usedIndices.add(index);
        }
      });

      // 4. ADIM: Kullanılmayan Görselleri Ekleme
      // Eğer metnin içinde hali hazırda hiçbir `![]` (markdown görsel etiket) kalıntısı veya
      // bizim değiştirdiğimiz bir etiket yoksa, geriye kalan tüm görselleri metnin en sonuna ekliyoruz.
      if (!processedContent.includes('![')) {
        const unusedImages: string[] = imageUrls.filter(
          (_: string, idx: number) => !usedIndices.has(idx)
        );

        if (unusedImages.length > 0) {
          const appendedImages: string = unusedImages
            .map((url: string) => `\n\n![Görsel](${url})`)
            .join('');
          processedContent += appendedImages;
        }
      }
    }

    return processedContent;
  } catch (error: unknown) {
    console.error('[contentProcessor][processTopicContent] Hata:', error);
    // Hata durumunda ham içeriği değil, XSS riskini azaltmak için
    // HTML taglerini etkisiz hale getirip döndürüyoruz.
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
