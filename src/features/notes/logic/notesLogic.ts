import { type CourseTopic } from '@/features/courses/types/courseTypes';

import { slugify } from '@/utils/stringHelpers';
import { type LocalToCItem } from '@/features/notes/components';

/**
 * İçindekiler tablosu (Table of Contents) öğesini temsil eder.
 * Ek olarak ait olduğu yığın (chunk) bilgisini barındırır.
 */
export interface ExtendedToCItem extends LocalToCItem {
  /** İlgili konu yığınının (chunk) benzersiz kimliği */
  chunkId: string;
}

/**
 * Ders konu yığınlarından (chunks) bir "İçindekiler" listesi (Table of Contents) oluşturur.
 * Başlık hiyerarşisini okuyarak nesnelere dönüştürür.
 *
 * @param {CourseTopic[]} chunks - Dersi oluşturan konu parçaları dizisi.
 * @returns {ExtendedToCItem[]} Çıkarılan başlıkların yapılandırılmış listesi.
 */
export const generateTOCFromContent = (
  chunks: CourseTopic[]
): ExtendedToCItem[] => {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  const tableOfContentsItems: ExtendedToCItem[] = [];

  chunks.forEach((chunk: CourseTopic) => {
    const chunkId: string = slugify(chunk.section_title);

    if (chunk.section_title) {
      tableOfContentsItems.push({
        id: chunkId,
        title: chunk.section_title,
        level: 1,
        chunkId,
      });
    }

    const contentLines: string[] = chunk.content.split('\n');

    contentLines.forEach((line: string) => {
      const levelOneMatch: RegExpMatchArray | null = line.match(/^#\s+(.+)$/);
      const levelTwoMatch: RegExpMatchArray | null = line.match(/^##\s+(.+)$/);
      const levelThreeMatch: RegExpMatchArray | null =
        line.match(/^###\s+(.+)$/);

      let currentLevel: number = 0;
      let currentTitle: string = '';

      if (levelOneMatch) {
        currentTitle = levelOneMatch[1].trim();
        currentLevel = 2;
      } else if (levelTwoMatch) {
        currentTitle = levelTwoMatch[1].trim();
        currentLevel = 3;
      } else if (levelThreeMatch) {
        currentTitle = levelThreeMatch[1].trim();
        currentLevel = 4;
      }

      if (currentLevel === 0) {
        return;
      }

      tableOfContentsItems.push({
        id: slugify(currentTitle),
        title: currentTitle,
        level: currentLevel,
        chunkId,
      });
    });
  });

  return tableOfContentsItems.filter(
    (item: ExtendedToCItem, index: number, items: ExtendedToCItem[]) =>
      index ===
      items.findIndex((tableOfContentsItem: ExtendedToCItem) => {
        return tableOfContentsItem.id === item.id;
      })
  );
};
