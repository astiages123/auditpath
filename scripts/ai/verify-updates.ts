import "dotenv/config";
import { generateConceptMap } from "../../src/features/quiz/modules/ai/mapping/index";
import {
    type GeneratedQuestion,
    generateQuestionBatch,
} from "../../src/features/quiz/modules/ai/question-generation/index";
import { validateQuestionBatch } from "../../src/features/quiz/modules/ai/validation/index";

async function verifyUpdates() {
    console.log("🚀 Starting Verification for AI Model Updates...");

    const mockContent = `
    Hak Düşürücü Süre:
    Bir hakkın kanunda belirtilen süre içinde kullanılmaması durumunda o hakkın sona ermesi sonucunu doğuran süredir.
    Özellikleri:
    1. Hakim tarafından re'sen (kendiliğinden) dikkate alınır.
    2. Süre geçince hak tamamen ortadan kalkar.
  `;

    // 1. Verify Mapping (Groq)
    console.log(
        "\n--- Verifying Mapping (Groq: moonshotai/kimi-k2-instruct-0905) ---",
    );
    try {
        const mappingResult = await generateConceptMap(
            mockContent,
            30,
            (msg) => console.log(`[Mapping Log] ${msg}`),
        );
        if (mappingResult.concepts.length > 0) {
            console.log(
                "✅ Mapping Success:",
                mappingResult.concepts[0].baslik,
            );
        } else {
            console.error("❌ Mapping returned no concepts.");
        }
    } catch (e) {
        console.error("❌ Mapping Failed:", e);
    }

    // 2. Verify Generation (Cerebras: qwen-3-235b-a22b-instruct-2507)
    console.log(
        "\n--- Verifying Generation (Cerebras: qwen-3-235b-a22b-instruct-2507) ---",
    );
    let generatedQuestions: GeneratedQuestion[] = [];
    try {
        const mockConcepts = [{
            baslik: "Hak Düşürücü Süre",
            odak: "Tanım ve özellikler",
            seviye: "Bilgi" as const,
            gorsel: null,
            prerequisites: [],
            questionVariations: [],
        }];

        generatedQuestions = await generateQuestionBatch(
            mockContent,
            "Medeni Hukuk",
            "Giriş",
            30,
            mockConcepts,
            0,
            null,
            (msg) => console.log(`[Generation Log] ${msg}`),
            "antrenman",
        );

        if (generatedQuestions.length > 0) {
            console.log("✅ Generation Success:", generatedQuestions[0].q);
        } else {
            console.error("❌ Generation returned no questions.");
        }
    } catch (e) {
        console.error("❌ Generation Failed:", e);
    }

    // 3. Verify Validation (Cerebras: qwen-3-32b)
    console.log("\n--- Verifying Validation (Cerebras: qwen-3-32b) ---");
    if (generatedQuestions.length > 0) {
        try {
            const questionsToValidate = generatedQuestions.map((q) => ({
                q: q.q,
                o: q.o,
                a: q.a,
                exp: q.exp,
                bloomLevel: q.bloomLevel,
                img: null,
            }));

            const validationResults = await validateQuestionBatch(
                questionsToValidate,
                mockContent,
                (msg) => console.log(`[Validation Log] ${msg}`),
            );

            if (validationResults.length > 0) {
                console.log(
                    "✅ Validation Success:",
                    validationResults[0].decision,
                );
            } else {
                console.error("❌ Validation returned no results.");
            }
        } catch (e) {
            console.error("❌ Validation Failed:", e);
        }
    } else {
        console.log("⚠️ Skipping validation test because generation failed.");
    }
}

verifyUpdates();
