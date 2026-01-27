import { callCerebras, type LogCallback } from "../clients/cerebras";
import { PromptArchitect } from "../prompt-architect";
import pLimit from "p-limit";

const validatorLimit = pLimit(5); // Validation concurrency limit

// Types
export interface QuestionToValidate {
  q: string;
  o: string[];
  a: number;
  exp: string;
  bloomLevel?: "knowledge" | "application" | "analysis";
  img?: string | null;
}

export interface ValidationCriteriaBreakdown {
  groundedness: number; // 0-30
  distractors: number; // 0-25
  pedagogy: number; // 0-20
  clarity: number; // 0-15
  explanation: number; // 0-10
}

export interface ValidationResult {
  questionIndex: number;
  total_score: number; // 0-100
  criteria_breakdown: ValidationCriteriaBreakdown;
  critical_faults: string[];
  improvement_suggestion: string;
  decision: "APPROVED" | "REJECTED";
}

// --- System Prompt ---
const VALIDATOR_SYSTEM_PROMPT = `## ROL
Sen AuditPath için "Kıdemli Soru Denetçisi ve Ölçme-Değerlendirme Uzmanısın". 
Görevin: Üretilen KPSS sorularını, kaynak metne ve akademik standartlara göre acımasızca denetlemek.

## PUANLAMA VE AĞIRLIKLAR (TOPLAM 100)
Aşağıdaki 5 kriter üzerinden puanla. Her kriterin ağırlığı ve "Hard-Fail" eşiği farklıdır:

1. GROUNDEDNESS (30 Puan): Soru tamamen metindeki bilgiye mi dayanıyor? 
   - EŞİK: < 30 ise sonuç direkt REJECTED. 
   - En ufak bir halüsinasyon veya metinde olmayan "mantıklı ama uydurma" bilgi 0 puan gerektirir.

2. DISTRACTOR QUALITY (25 Puan): Çeldiriciler güçlü mü? 
   - EŞİK: < 15 ise soru zayıftır. 
   - Şıklar birbirine yakın uzunlukta olmalı. "Hepsi" veya "Hiçbiri" gibi kaçamak şıklar var mı?

3. PEDAGOGICAL DEPTH (20 Puan): Bloom Taksonomisi uygun mu? 
   - Sorulan seviye (Analiz/Uygulama) metindeki derinliği yansıtıyor mu yoksa sadece basit bir ezber mi?

4. CLARITY & ACADEMIC TONE (15 Puan): KPSS dili mi? 
   - Resmi, akademik ve net bir Türkçe kullanılmış mı?

5. EXPLANATION QUALITY (10 Puan): Çözüm öğretici mi? 
   - Doğru şıkkın neden doğru, yanlışların neden yanlış olduğunu metne atıf yaparak açıklıyor mu?

## KARAR MEKANİZMASI
- Toplam Skor ($S_{total}$) >= 85 ve Groundedness = 30 ise: "APPROVED"
- Toplam Skor < 85 veya Groundedness < 30 ise: "REJECTED"

## ÇIKTI FORMATI (YALNIZCA JSON)
{
  "total_score": integer,
  "decision": "APPROVED" | "REJECTED",
  "criteria_breakdown": {
    "groundedness": 0-30,
    "distractors": 0-25,
    "pedagogy": 0-20,
    "clarity": 0-15,
    "explanation": 0-10
  },
  "critical_faults": ["Nokta atışı hata tespiti 1", "..."],
  "improvement_suggestion": "Reddettiysen, AI'nın düzeltmesi için teknik direktif."
}`;

/**
 * Parse validator JSON response
 */
function parseValidationResponse(
  responseText: string | null | undefined,
): Omit<ValidationResult, "questionIndex"> | null {
  if (!responseText || typeof responseText !== "string") return null;

  try {
    let jsonStr = responseText.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Find raw JSON object
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (
      typeof parsed.total_score !== "number" ||
      !parsed.criteria_breakdown ||
      typeof parsed.criteria_breakdown.groundedness !== "number" ||
      typeof parsed.criteria_breakdown.pedagogy !== "number" ||
      typeof parsed.criteria_breakdown.distractors !== "number" ||
      typeof parsed.criteria_breakdown.clarity !== "number" ||
      typeof parsed.criteria_breakdown.explanation !== "number" ||
      !["APPROVED", "REJECTED"].includes(parsed.decision)
    ) {
      console.error("[Validator] Invalid response structure:", parsed);
      return null;
    }

    return {
      total_score: parsed.total_score,
      criteria_breakdown: {
        groundedness: parsed.criteria_breakdown.groundedness,
        pedagogy: parsed.criteria_breakdown.pedagogy,
        distractors: parsed.criteria_breakdown.distractors,
        clarity: parsed.criteria_breakdown.clarity,
        explanation: parsed.criteria_breakdown.explanation,
      },
      critical_faults: Array.isArray(parsed.critical_faults)
        ? parsed.critical_faults
        : [],
      improvement_suggestion: parsed.improvement_suggestion || "",
      decision: parsed.decision,
    };
  } catch (e) {
    console.error("[Validator] Failed to parse response:", e);
    return null;
  }
}

/**
 * Build validation TASK prompt (Context is handled by Architect)
 */
export function buildValidationTaskPrompt(
  question: QuestionToValidate,
): string {
  const optionsText = question.o
    .map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`)
    .join("\n");

  const correctAnswer = String.fromCharCode(65 + question.a);

  return `## DEĞERLENDİRİLECEK SORU:

**Soru:** ${question.q}

**Şıklar:**
${optionsText}

**Doğru Cevap:** ${correctAnswer}

**Açıklama:** ${question.exp}

---

Yukarıdaki soruyu kaynak metne göre değerlendir ve JSON formatında puanla.`;
}

/**
 * Validate a batch of questions against source content
 */
export async function validateQuestionBatch(
  questions: QuestionToValidate[],
  sourceContent: string,
  onLog?: LogCallback,
): Promise<ValidationResult[]> {
  onLog?.("Doğrulama başlatılıyor (Paralel)", {
    questionCount: questions.length,
  });

  // Pre-build shared context for cache hits
  // NOTE: Validation context MUST match generation context for caching to work perfect.
  // Here we just use the content properly.
  // Ideally, we should pass courseName and sectionTitle if we want 100% match,
  // but even matching the "Content" part helps.
  // For now, let's stick to just content or try to match the format if possible.
  // The PromptArchitect.buildContext uses courseName and sectionTitle.
  // If we don't have them here, we miss cache.
  // But for now, let's use the content.
  // [CACHE OPTIMIZATION]: Bu contextPrompt tüm batch için sabit kalmalı.
  const sharedContextPrompt = PromptArchitect.buildContext(sourceContent);

  const promises = questions.map(async (question, i) => {
    onLog?.(`Soru ${i + 1} doğrulanıyor...`);

    const taskPrompt = buildValidationTaskPrompt(question);

    // Assemble messages: System -> Context -> Task
    const messages = PromptArchitect.assemble(
      VALIDATOR_SYSTEM_PROMPT,
      sharedContextPrompt,
      taskPrompt,
    );

    try {
      // Determine model based on bloom level
      // Explicitly select model to ensure consistency and proper logging
      const model = "gpt-oss-120b"; // Always use 120B for validation as per rules

      const responseText = await validatorLimit(() =>
        callCerebras(
          messages,
          model,
          () => {
            // Optional: detailed logging
          },
        )
      );

      if (!responseText) {
        onLog?.(`Soru ${i + 1} validator yanıt boş, REJECTED`, {});
        return {
          questionIndex: i,
          total_score: 0,
          criteria_breakdown: {
            groundedness: 0,
            pedagogy: 0,
            distractors: 0,
            clarity: 0,
            explanation: 0,
          },
          critical_faults: ["Validator yanıt vermedi"],
          improvement_suggestion: "Tekrar deneyin",
          decision: "REJECTED",
        } as ValidationResult;
      }

      const parsed = parseValidationResponse(responseText);

      if (!parsed) {
        onLog?.(`Soru ${i + 1} parse başarısız, REJECTED`, {});
        return {
          questionIndex: i,
          total_score: 0,
          criteria_breakdown: {
            groundedness: 0,
            pedagogy: 0,
            distractors: 0,
            clarity: 0,
            explanation: 0,
          },
          critical_faults: ["JSON parse hatası"],
          improvement_suggestion: "Format hatası",
          decision: "REJECTED",
        } as ValidationResult;
      }

      onLog?.(
        `Soru ${i + 1} doğrulandı: ${parsed.decision} (${parsed.total_score})`,
      );

      return {
        questionIndex: i,
        ...parsed,
      } as ValidationResult;
    } catch (e) {
      onLog?.(`Soru ${i + 1} doğrulama hatası`, { error: String(e) });
      return {
        questionIndex: i,
        total_score: 0,
        criteria_breakdown: {
          groundedness: 0,
          pedagogy: 0,
          distractors: 0,
          clarity: 0,
          explanation: 0,
        },
        critical_faults: ["Sistem hatası: " + String(e)],
        improvement_suggestion: "",
        decision: "REJECTED",
      } as ValidationResult;
    }
  });

  const results = await Promise.all(promises);

  onLog?.("Doğrulama tamamlandı", {
    total: questions.length,
    approved: results.filter((r) => r.decision === "APPROVED").length,
    rejected: results.filter((r) => r.decision === "REJECTED").length,
  });

  return results;
}
