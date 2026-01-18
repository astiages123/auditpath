
import { generateQuestions, AnalysisResult } from "../src/lib/ai";
import "dotenv/config";

// Mock Analysis Result (Output of Model A)
const MOCK_ANALYSIS: AnalysisResult = {
  topic: "H3: Hak Düşürücü Süre",
  total_target_questions: 2,
  pillars: [
    {
      "concept": "Hak Düşürücü Süre Tanımı",
      "description": "Bir hakkın kanunda belirtilen süre içinde kullanılmaması durumunda o hakkın sona ermesi sonucunu doğuran süredir.",
      "weight": 1,
      "focus_point": "Tanımdaki 'hakkın sona ermesi' vurgusuna odaklanılmalı."
    },
    {
      "concept": "Re'sen Dikkate Alınma",
      "description": "Hakim tarafından kendiliğinden (re'sen) dikkate alınır.",
      "weight": 1, 
      "focus_point": "Zamanaşımı ile arasındaki fark."
    }
  ]
};

const MOCK_NOTE_CONTENT = `
Hak Düşürücü Süre:
Bir hakkın kanunda belirtilen süre içinde kullanılmaması durumunda o hakkın sona ermesi sonucunu doğuran süredir.
Özellikleri:
1. Hakim tarafından re'sen (kendiliğinden) dikkate alınır.
`;

async function main() {
  // API Key will be picked up from process.env via the fallback in src/lib/ai.ts

  console.log("Testing Model B (Question Generator)...");
  
  try {
    const result = await generateQuestions(MOCK_NOTE_CONTENT, MOCK_ANALYSIS);
    console.log("✅ Question Generation Successful!");
    console.log(JSON.stringify(result, null, 2));

    if (result.questions.length !== 2) { 
        // Note: Logic says "weight sayısı kadar soru". 1+1=2 questions total.
        console.warn("⚠️ Warning: Expected 2 questions, got " + result.questions.length);
    }

  } catch (error) {
    console.error("❌ Generation Failed:", error);
    process.exit(1);
  }
}

main();
