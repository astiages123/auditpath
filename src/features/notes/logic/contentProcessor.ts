import DOMPurify from 'dompurify';

/**
 * Logic to process topic content, including cleaning, image marker replacement, and sanitization.
 */

interface TopicMetadata {
  images?: string[];
}

/**
 * Processes raw content from a topic safely.
 *
 * @param content Raw markdown/text content
 * @param metadata Metadata containing image URLs
 * @returns Processed and sanitized content
 */
export function processTopicContent(
  content: string,
  metadata: TopicMetadata | null
): string {
  if (!content) return '';

  // 1. Sanitize raw input to prevent malicious HTML injection early
  // We allow some tags if needed, but react-markdown handles most of it.
  // This is a safety layer.
  let processed = DOMPurify.sanitize(content);

  // 2. Clean invisible unicode characters
  processed = processed.replace(/[\u2000-\u200b]/g, ' ');

  // 3. Handle images if metadata exists
  const imageUrls = metadata?.images || [];
  if (imageUrls.length > 0) {
    const usedIndices = new Set<number>();

    // Efficiently replace markers
    imageUrls.forEach((url, idx) => {
      const marker = new RegExp(`\\[GÖRSEL:\\s*${idx}\\]`, 'gi');
      if (marker.test(processed)) {
        processed = processed.replace(marker, `\n\n![Görsel](${url})\n\n`);
        usedIndices.add(idx);
      }
    });

    // Append unused images if no markdown images exist in content
    if (!processed.includes('![')) {
      const unusedImages = imageUrls.filter((_, idx) => !usedIndices.has(idx));
      if (unusedImages.length > 0) {
        processed += unusedImages
          .map((url) => `\n\n![Görsel](${url})`)
          .join('');
      }
    }
  }

  return processed;
}
