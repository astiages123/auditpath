import DOMPurify from 'dompurify';

/**
 * Bir konu bölümünün meta verilerini temsil eden arayüz.
 */
export interface TopicMetadata {
  /** İlgili bölüm içerisindeki görsellerin URL listesi */
  images?: string[];
}

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

  let processedContent: string = DOMPurify.sanitize(content);

  processedContent = processedContent.replace(/[\u2000-\u200b]/g, ' ');

  const imageUrls: string[] = metadata?.images || [];
  if (imageUrls.length === 0) {
    return processedContent;
  }

  const usedIndices: Set<number> = new Set<number>();

  imageUrls.forEach((url: string, index: number) => {
    const markerRegex: RegExp = new RegExp(`\\[GÖRSEL:\\s*${index}\\]`, 'gi');

    if (markerRegex.test(processedContent)) {
      processedContent = processedContent.replace(
        markerRegex,
        `\n\n![Görsel](${url})\n\n`
      );
      usedIndices.add(index);
    }
  });

  if (processedContent.includes('![')) {
    return processedContent;
  }

  const unusedImages: string[] = imageUrls.filter(
    (_imageUrl: string, index: number) => !usedIndices.has(index)
  );

  if (unusedImages.length === 0) {
    return processedContent;
  }

  const appendedImages: string = unusedImages
    .map((url: string) => `\n\n![Görsel](${url})`)
    .join('');

  return processedContent + appendedImages;
}
