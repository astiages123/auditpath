import "dotenv/config";
import { generateQuestionBatch } from "../../src/features/quiz/modules/ai/question-generation/index";
import type { ConceptMapItem } from "../../src/features/quiz/modules/ai/mapping/index";

// Mock Concept Map Item (Output of Concept Mapping)
const MOCK_CONCEPTS: ConceptMapItem[] = [
  {
    baslik: "Hak Düşürücü Süre Tanımı",
    odak: "Hakkın süre dolunca sona ermesi",
    seviye: "Bilgi",
    gorsel: null,
    prerequisites: [],
    questionVariations: [
      { type: "Bilgi", description: "Doğrudan tanım sorusu" },
      { type: "Uygulama", description: "Senaryolu soru" },
      { type: "Analiz", description: "Hangisi yanlıştır sorusu" },
    ],
  },
];

const MOCK_NOTE_CONTENT = `
Hak Düşürücü Süre:
Bir hakkın kanunda belirtilen süre içinde kullanılmaması durumunda o hakkın sona ermesi sonucunu doğuran süredir.
Özellikleri:
1. Hakim tarafından re'sen (kendiliğinden) dikkate alınır.
`;

async function main() {
  console.log("Testing Question Generation (Batch)...");

  try {
    const result = await generateQuestionBatch(
      MOCK_NOTE_CONTENT,
      "Medeni Hukuk",
      "Giriş",
      MOCK_NOTE_CONTENT.length,
      MOCK_CONCEPTS,
      0, // startIndex
      null, // guidelines
      (msg, details) => console.log(`[AI LOG] ${msg}`, details || ""),
      "antrenman",
    );

    console.log("\n✅ Question Generation Successful!");
    console.log(JSON.stringify(result, null, 2));

    if (result.length === 0) {
      console.warn("⚠️ Warning: No questions generated.");
    }
  } catch (error) {
    console.error("❌ Generation Failed:", error);
    process.exit(1);
  }
}

main();
