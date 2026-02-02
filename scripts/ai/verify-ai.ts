import "dotenv/config";
import { generateConceptMap } from "../../src/features/quiz/modules/ai/mapping/index";

const SAMPLE_TEXT = `
Hak Düşürücü Süre:
Bir hakkın kanunda belirtilen süre içinde kullanılmaması durumunda o hakkın sona ermesi sonucunu doğuran süredir.
Özellikleri:
1. Hakim tarafından re'sen (kendiliğinden) dikkate alınır.
2. Durması veya kesilmesi söz konusu değildir (Mücbir sebepler hariç).
3. Borcu sona erdirmez, hakkı ortadan kaldırır.
Örnek: İdare mahkemesinde dava açma süresi (60 gün) hak düşürücü süredir.
`;

async function main() {
  console.log("Testing Concept Mapping with sample text...");
  console.log("Note Chunk Length:", SAMPLE_TEXT.length);

  try {
    // wordCount is required in new signature
    const result = await generateConceptMap(
      SAMPLE_TEXT,
      100,
      (msg, details) => {
        console.log(`[AI LOG] ${msg}`, details || "");
      },
    );

    console.log("\n✅ Analysis Successful!");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Analysis Failed:", error);
    process.exit(1);
  }
}

main();
