import { type CourseTopic } from '@/features/courses/types/courseTypes';

import { slugify } from '@/utils/stringHelpers';
import { type LocalToCItem } from '@/features/notes/components';

// === BÖLÜM ADI: TİPLER (TYPES) ===
// ===========================

/**
 * İçindekiler tablosu (Table of Contents) öğesini temsil eder.
 * Ek olarak ait olduğu yığın (chunk) bilgisini barındırır.
 */
export interface ExtendedToCItem extends LocalToCItem {
  /** İlgili konu yığınının (chunk) benzersiz kimliği */
  chunkId: string;
}

// === BÖLÜM ADI: İŞ MANTIĞI (LOGIC) ===
// ===========================

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

  try {
    const tableOfContentsItems: ExtendedToCItem[] = [];

    chunks.forEach((chunk: CourseTopic) => {
      const chunkId: string = slugify(chunk.section_title);

      // Ana başlığı (Level 1) her zaman ekliyoruz
      if (chunk.section_title) {
        tableOfContentsItems.push({
          id: chunkId,
          title: chunk.section_title,
          level: 1,
          chunkId: chunkId,
        });
      }

      // İçeriği satır satır bölerek alt başlıkları (Level 2, 3, 4) buluyoruz
      const contentLines: string[] = chunk.content.split('\n');

      contentLines.forEach((line: string) => {
        const h1Match: RegExpMatchArray | null = line.match(/^#\s+(.+)$/);
        const h2Match: RegExpMatchArray | null = line.match(/^##\s+(.+)$/);
        const h3Match: RegExpMatchArray | null = line.match(/^###\s+(.+)$/);

        let currentLevel: number = 0;
        let currentTitle: string = '';

        if (h1Match) {
          currentTitle = h1Match[1].trim();
          currentLevel = 2; // Görüntü bazında Level 2 yapıyoruz
        } else if (h2Match) {
          currentTitle = h2Match[1].trim();
          currentLevel = 3;
        } else if (h3Match) {
          currentTitle = h3Match[1].trim();
          currentLevel = 4;
        }

        if (currentLevel > 0) {
          tableOfContentsItems.push({
            id: slugify(currentTitle),
            title: currentTitle,
            level: currentLevel,
            chunkId: chunkId,
          });
        }
      });
    });

    // Filtreleme (Deduplication): Aynı ID'ye sahip öğeleri filtreliyoruz ki menüde çift görünmesin
    const uniqueItems: ExtendedToCItem[] = tableOfContentsItems.filter(
      (item: ExtendedToCItem, index: number, selfArray: ExtendedToCItem[]) =>
        index === selfArray.findIndex((t: ExtendedToCItem) => t.id === item.id)
    );

    return uniqueItems;
  } catch (error: unknown) {
    console.error('[notesLogic][generateTOCFromContent] Hata:', error);
    return [];
  }
};
