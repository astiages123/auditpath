import { MAX_CONCURRENT_IMAGES } from './config';
import { uploadImageAsWebP } from './image-upload';
import type { ProcessedImageResult } from './types';

export async function processImagesInMarkdown(
  markdown: string,
  courseId: string,
  sectionTitle: string
): Promise<ProcessedImageResult> {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const matches = Array.from(markdown.matchAll(imageRegex));
  const results: (string | null)[] = [];

  for (let i = 0; i < matches.length; i += MAX_CONCURRENT_IMAGES) {
    const chunk = matches.slice(i, i + MAX_CONCURRENT_IMAGES);
    const chunkPromises = chunk.map((match, chunkIndex) => {
      const originalUrl = match[2];
      const globalIndex = i + chunkIndex;
      console.log(
        `Processing image ${globalIndex + 1}/${matches.length} for section "${sectionTitle}"...`
      );
      return uploadImageAsWebP(
        originalUrl,
        courseId,
        sectionTitle,
        globalIndex
      );
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  let processedContent = markdown;

  let validIndex = 0;
  const indexMapping = new Map<number, number>();
  for (let i = 0; i < matches.length; i++) {
    if (results[i]) {
      indexMapping.set(i, validIndex);
      validIndex++;
    }
  }

  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const webpUrl = results[i];

    if (webpUrl) {
      const finalIndex = indexMapping.get(i);
      const before = processedContent.slice(0, match.index);
      const after = processedContent.slice(match.index! + match[0].length);
      const newImageTag = `[GÖRSEL: ${finalIndex}]`;
      processedContent = before + newImageTag + after;
    }
  }

  const validUrls = results.filter((url): url is string => url !== null);

  return { content: processedContent, imageUrls: validUrls };
}
