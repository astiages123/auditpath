import pLimit from 'p-limit';
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

  const limit = pLimit(MAX_CONCURRENT_IMAGES);

  const imagePromises = matches.map((match, index) => {
    const originalUrl = match[2];
    return limit(async () => {
      console.log(
        `Processing image ${
          index + 1
        }/${matches.length} for section "${sectionTitle}"...`
      );
      return uploadImageAsWebP(originalUrl, courseId, sectionTitle, index);
    });
  });

  const results = await Promise.all(imagePromises);

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
