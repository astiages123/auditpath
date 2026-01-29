import type { ConceptMapItem } from "../mapping";
import {
  BLOOM_INSTRUCTIONS,
  CATEGORY_DISTRIBUTIONS,
  getCourseCategory,
} from "./strategies";

/**
 * Determine bloom level strategy based on concept and index
 */
export function determineNodeStrategy(
  index: number,
  wordCount: number,
  concept?: ConceptMapItem,
  courseName: string = "", // Default empty for backward compatibility
): {
  bloomLevel: "knowledge" | "application" | "analysis";
  instruction: string;
} {
  // 1. Taksonomi Önceliği: Eğer concept içinde seviye varsa, ona güven.
  if (concept?.seviye) {
    if (concept.seviye === "Analiz") {
      return {
        bloomLevel: "analysis",
        instruction: BLOOM_INSTRUCTIONS.analysis,
      };
    }
    if (concept.seviye === "Uygulama") {
      return {
        bloomLevel: "application",
        instruction: BLOOM_INSTRUCTIONS.application,
      };
    }
    if (concept.seviye === "Bilgi") {
      return {
        bloomLevel: "knowledge",
        instruction: BLOOM_INSTRUCTIONS.knowledge,
      };
    }
  }

  // 2. Kategori Bazlı Strateji (Modulo 10)
  const category = getCourseCategory(courseName);
  const distribution = CATEGORY_DISTRIBUTIONS[category];

  // Döngüsel indeks (0-9)
  const cycleIndex = index % 10;
  const targetBloomLevel = distribution[cycleIndex];

  return {
    bloomLevel: targetBloomLevel,
    instruction: BLOOM_INSTRUCTIONS[targetBloomLevel],
  };
}

/**
 * Retry Prompt Template
 * Used when JSON validation fails
 */
export const RETRY_PROMPT_TEMPLATE =
  `BİR ÖNCEKİ CEVABIN JSON ŞEMASINA UYMUYORDU.
Lütfen geçerli bir JSON döndür.
Şema kuralları:
1. "o" dizisi TAM 5 elemanlı olmalı.
2. "a" (doğru cevap indexi) 0 ile 4 arasında bir sayı olmalı.
3. "img" görsel index numarası olmalıdır (Eğer görsel yoksa null).
4. Cevabın dışında hiçbir yorum veya açıklama ekleme. Sadece JSON verisi gerekli.`;

/**
 * Build question generation prompt
 */
/**
 * Build question generation TASK prompt
 */
export function buildTaskPrompt(
  concept: ConceptMapItem | null,
  strategy: { bloomLevel: string; instruction: string },
): string {
  const parts = [
    `AMAÇ: Metni analiz ederek, belirtilen pedagojik stratejiye uygun tek bir soru üretmek.`,
    `---`,
  ];

  if (concept) {
    parts.push(`HEDEF KAVRAM VE ODAK:
- Kavram: ${concept.baslik}
- Odak Noktası: ${concept.odak}
- Bloom Seviyesi: ${concept.seviye || strategy.bloomLevel}`);

    if (concept.gorsel) {
      parts.push(
        `GÖRSEL REFERANSI: Soruyu kurgularken '${concept.gorsel}' görseline atıfta bulun veya görselin açıkladığı durumu senaryolaştır.${
          concept.altText
            ? `\nGörsel Açıklaması (Alt-Text): ${concept.altText}`
            : ""
        }`,
      );
    }
  }

  parts.push(`PEDAGOJİK STRATEJİ:
${strategy.instruction}`);

  // Reminder for JSON format (brief)
  parts.push(
    `Lütfen BAĞLAM METNİNİ referans alarak soruyu oluştur ve SADECE JSON döndür.`,
  );

  return parts.join("\n\n");
}
