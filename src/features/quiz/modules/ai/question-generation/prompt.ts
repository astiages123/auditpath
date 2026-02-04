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
4. "evidence" alanı kanıt cümlesini içermelidir (Boş olamaz).
5. Cevabın dışında hiçbir yorum veya açıklama ekleme. Sadece JSON verisi gerekli.`;

/**
 * Build question generation prompt
 */
/**
 * Build question generation TASK prompt
 */
export function buildTaskPrompt(
  concept: ConceptMapItem | null,
  strategy: { bloomLevel: string; instruction: string },
  usageType: "antrenman" | "deneme" | "arsiv" = "antrenman",
  previousDiagnoses?: string[],
): string {
  const parts = [
    `AMAÇ: Metni analiz ederek, belirtilen pedagojik stratejiye uygun tek bir soru üretmek.`,
    `---`,
  ];

  if (usageType === "deneme") {
    parts.push(`!!! DENEME (SİMÜLASYON) MODU !!! / ZORLUK ARTIRILMIŞTIR
- **Çeldiriciler:** Şıklar birbirine ÇOK yakın olmalı. "Bariz yanlış" şık kesinlikle olmamalı.
- **Tuzak:** Doğru cevaba en yakın, güçlü bir çeldirici (distractor) mutlaka ekle.
- **Kapsam:** Soru, sadece bu ünitedeki izole bilgiyi değil, kurs genelinde bu kavramla karıştırılabilecek diğer terimleri de çağrıştırmalıdır.`);
  }

  // STRATEGY 1: DISTRACTOR VARIETY & STRATEGY 2: LATEX STANDARDIZATION
  parts.push(`ÇELDİRİCİ (DISTRACTOR) KURALLARI:
Yanlış seçenekler rastgele üretilmemeli, şu üç kategoriden en az birine dayanmalıdır:
1. **Kavram Karmaşası:** Doğru cevaba benzeyen ancak farklı bir bağlamda kullanılan terimler.
2. **İşlem/Mantık Hatası:** Doğru muhakeme sürecindeki yaygın bir hatanın sonucu.
3. **Yarım Doğru:** Doğru başlayan ancak yanlış biten (veya tam tersi) ifadeler.
*Rastgele veya saçma yanlışlar üretme.*

LATEX FORMAT ZORUNLULUĞU:
- Tüm sayısal verileri, matematiksel formülleri, değişkenleri ($x, y, P, Q$) ve teknik sembolleri ($IS-LM, \\sigma^2, \\alpha$ vb.) **hem soru metninde (q) hem de açıklamada (exp)** KESİNLİKLE LaTeX formatında yaz.
- Örn: "faiz oranı %5" yerine "$r = 5\\%$" veya "$P = 100$" şeklinde.`);

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
${strategy.instruction}

KANIT ZORUNLULUĞU:
Eğer soru bir senaryo veya analiz içeriyorsa; evidence alanına metindeki dayanak kuralı/tanımı yaz ve yanına kısa bir notla bu kuralın sorudaki duruma nasıl bağlandığını açıkla. Eğer metinde doğrudan bir kanıt veya dayanak yoksa o soruyu üretme.`);

  // Kullanıcının geçmiş hataları (dinamik - Task prompt'ta)
  if (previousDiagnoses && previousDiagnoses.length > 0) {
    parts.push(`KULLANICININ GEÇMİŞ HATALARI (BU KONUDA):
Kullanıcı bu konuda daha önce şu hataları yaptı. Soruları üretirken bu zayıf noktaları özellikle test etmeye çalış:
${previousDiagnoses.map((d) => `- ${d}`).join("\n")}`);
  }

  // Reminder for JSON format (brief)
  parts.push(
    `Lütfen BAĞLAM METNİNİ referans alarak soruyu oluştur ve SADECE JSON döndür.`,
  );

  return parts.join("\n\n");
}
