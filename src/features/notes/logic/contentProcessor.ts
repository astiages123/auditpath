/**
 * Logic to process topic content, including cleaning and image marker replacement.
 */

interface TopicMetadata {
  images?: string[];
}

/**
 * Processes raw content from a topic.
 *
 * @param content Raw markdown/text content
 * @param metadata Metadata containing image URLs
 * @returns Processed content with markdown images
 */
export function processTopicContent(
  content: string,
  metadata: TopicMetadata | null
): string {
  if (!content) return '';

  let processed = content;

  // 1. Clean invisible unicode characters
  processed = processed.replace(/[\u2000-\u200b]/g, ' ');

  // 2. Handle images if metadata exists
  const imageUrls = metadata?.images || [];
  if (imageUrls.length > 0) {
    const usedIndices = new Set<number>();

    // Replace [GÖRSEL: X] markers
    imageUrls.forEach((url, idx) => {
      const marker = new RegExp(`\\[GÖRSEL:\\s*${idx}\\]`, 'gi');
      if (processed.match(marker)) {
        processed = processed.replace(marker, `\n\n![Görsel](${url})\n\n`);
        usedIndices.add(idx);
      }
    });

    // Append unused images if no markdown images exist in content
    const unusedImages = imageUrls.filter((_, idx) => !usedIndices.has(idx));
    if (unusedImages.length > 0 && !processed.includes('![')) {
      processed += unusedImages.map((url) => `\n\n![Görsel](${url})`).join('');
    }
  }

  return processed;
}
