import { z } from "zod";
import { callMiMo, type LogCallback, parseJsonResponse } from "../clients/mimo";
import { callCerebras } from "../clients/cerebras"; // Add Cerebras import
import type { ConceptMapItem } from "../mapping";
import pLimit from "p-limit"; // Import p-limit
import { type Message, PromptArchitect } from "../prompt-architect";
import {
  buildTaskPrompt, // Rename to buildTaskPrompt
  determineNodeStrategy,
  RETRY_PROMPT_TEMPLATE,
} from "./prompt";

// --- VALIDATION SCHEMAS ---

export const GeneratedQuestionSchema = z.object({
  q: z.string().min(10, "Soru metni çok kısa"),
  o: z
    .array(z.string())
    .length(5, "Tam olarak 5 seçenek olmalı"),
  a: z
    .number()
    .int()
    .min(0, "Cevap indexi 0'dan küçük olamaz")
    .max(4, "Cevap indexi 4'ten büyük olamaz"),
  exp: z.string().min(10, "Açıklama metni çok kısa"),
});

export type GeneratedQuestionType = z.infer<typeof GeneratedQuestionSchema>;

export interface GeneratedQuestion extends GeneratedQuestionType {
  img?: string | null;
  bloomLevel: "knowledge" | "application" | "analysis";
}

export interface WrongAnswerContext {
  chunkId: string;
  originalQuestion: {
    id: string;
    q: string;
    o: string[];
    a: number;
    exp: string;
    img?: string | null;
    bloomLevel?: string;
  };
  incorrectOptionIndex: number;
  correctOptionIndex: number;
  courseId: string;
  userId: string;
}

// --- CONCURRENCY LIMITS ---
const mimoLimit = pLimit(5); // Higher limit for MiMo (check RPM)
const cerebrasLimit = pLimit(2); // Strict limit for Cerebras (60K TPM)

/**
 * Generic function to generate content with retry logic and Zod validation
 */
async function generateWithRetry<T>(
  messages: Message[], // Changed to accept Message[]
  modelProvider: "mimo" | "cerebras",
  schema: z.ZodSchema<T>,
  options: {
    temperature: number;
    maxRetries?: number;
    onLog?: LogCallback;
    logContext?: Record<string, unknown>;
  },
): Promise<T | null> {
  const { temperature, maxRetries = 1, onLog, logContext = {} } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const isRetry = attempt > 0;

      // If retry, append retry instruction to the last message
      let currentMessages = [...messages];
      if (isRetry) {
        // Add retry prompt as a new user message
        currentMessages.push({ role: "user", content: RETRY_PROMPT_TEMPLATE });
      }

      if (isRetry) {
        onLog?.("Retry deneniyor...", {
          ...logContext,
          attempt: attempt + 1,
        });
      }

      let responseContent = "";

      if (modelProvider === "cerebras") {
        responseContent = await cerebrasLimit(() =>
          callCerebras(
            currentMessages,
            "llama-3.3-70b",
            onLog,
          )
        );
      } else {
        const result = await mimoLimit(() =>
          callMiMo(
            currentMessages,
            temperature,
            onLog,
          )
        );
        responseContent = result.content;
        // TODO: handle reasoning_content if needed for storage
      }

      const parsed = parseJsonResponse(responseContent, "object");
      const validation = schema.safeParse(parsed);

      if (validation.success) {
        return validation.data;
      } else {
        const errorMsg = validation.error.issues.map((i) => i.message).join(
          ", ",
        );
        onLog?.("Validasyon hatası", {
          ...logContext,
          errors: errorMsg,
          attempt: attempt + 1,
        });
        // Retry loop will continue
      }
    } catch (e) {
      onLog?.("Beklenmeyen hata", {
        ...logContext,
        error: e instanceof Error ? e.message : String(e),
        attempt: attempt + 1,
      });
    }
  }

  onLog?.("Üretim başarısız (Max retry aşıldı)", logContext);
  return null;
}

/**
 * Generate a single question with independent retry logic
 */
async function generateSingleQuestionWithRetry(
  contextPrompt: string, // Changed to accept contextPrompt (shared ref)
  taskPrompt: string, // Changed to accept taskPrompt
  concept: ConceptMapItem,
  strategy: {
    bloomLevel: "knowledge" | "application" | "analysis";
    instruction: string;
  },
  onLog?: LogCallback,
): Promise<GeneratedQuestion | null> {
  const systemPrompt =
    "Sen KPSS formatında, akademik dille soru yazan uzman bir yapay zekasın. SADECE JSON formatında çıktı ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.";

  // Build full message chain using PromptArchitect
  const messages = PromptArchitect.assemble(
    systemPrompt,
    contextPrompt,
    taskPrompt,
  );

  // Router Logic: Knowledge -> Cerebras, Others -> MiMo
  const provider = strategy.bloomLevel === "knowledge" ? "cerebras" : "mimo";

  const result = await generateWithRetry(
    messages,
    provider, // Use determined provider
    GeneratedQuestionSchema,
    {
      temperature: 0.4,
      onLog,
      logContext: { concept: concept.baslik, provider },
    },
  );

  if (result) {
    return {
      ...result,
      bloomLevel: strategy.bloomLevel,
      img: concept.gorsel || null,
    };
  }

  return null;
}

/**
 * Revise a rejected question based on feedback
 */
export async function reviseQuestion(
  originalQuestion: GeneratedQuestion,
  content: string,
  feedback: {
    critical_faults: string[];
    improvement_suggestion: string;
  },
  onLog?: LogCallback,
): Promise<GeneratedQuestion | null> {
  const systemPrompt =
    "Sen deneyimli bir eğitim teknoloğu ve soru revizyon uzmanısın. Hatalı soruları düzeltmekle görevlisin. SADECE JSON formatında çıktı ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.";

  const contextPrompt = PromptArchitect.buildContext(content); // Re-build context (less ideal for cache but safe)

  const revisionTask = `Aşağıdaki soru, belirtilen nedenlerle REDDEDİLMİŞTİR.
Lütfen geri bildirimi dikkate alarak soruyu revize et.
Sadece geri bildirimde belirtilen kritik hataları düzelt. Sorunun halihazırda doğru çalışan kısımlarını, soru kökünü veya şık yapısını (eğer hatasızlarsa) koruyarak revize et.

## REDDEDİLEN SORU:
${
    JSON.stringify(
      {
        q: originalQuestion.q,
        o: originalQuestion.o,
        a: originalQuestion.a,
        exp: originalQuestion.exp,
      },
      null,
      2,
    )
  }

## RET NEDENLERİ (KRİTİK HATALAR):
${feedback.critical_faults.map((f) => `- ${f}`).join("\n")}

## İYİLEŞTİRME ÖNERİSİ:
${feedback.improvement_suggestion}

## GÖREV:
Soruyu revize et.
- Hataları gider.
- Akademik dili ve KPSS formatını koru.
- JSON formatında döndür. Temperature düşük tutulmalı (0.3).

${RETRY_PROMPT_TEMPLATE}`;

  // Assemble messages
  const messages = PromptArchitect.assemble(
    systemPrompt,
    contextPrompt,
    revisionTask,
  );

  const result = await generateWithRetry(
    messages,
    "mimo", // Use MiMo for revisions (usually smarter)
    GeneratedQuestionSchema,
    {
      temperature: 0.3,
      maxRetries: 2, // Increased resilience for revision
      onLog,
      logContext: { action: "REVISION" },
    },
  );

  if (result) {
    return {
      ...result,
      bloomLevel: originalQuestion.bloomLevel,
      img: originalQuestion.img,
    };
  }

  return null;
}

/**
 * Generate questions for a batch of concepts in PARALLEL
 */
export async function generateQuestionBatch(
  content: string,
  courseName: string,
  sectionTitle: string,
  wordCount: number,
  concepts: ConceptMapItem[],
  conceptIndex: number,
  subjectGuidelines:
    | { instruction?: string; few_shot_example?: unknown }
    | null,
  onLog?: LogCallback,
): Promise<GeneratedQuestion[]> {
  onLog?.("Batch üretimi başlıyor (Cache Warm-up + Paralel)", {
    batchSize: concepts.length,
    startIndex: conceptIndex,
  });

  if (concepts.length === 0) {
    return [];
  }

  // Pre-build the SHARED context prompt once for the whole batch
  // ensuring the string reference is identical for cache hits
  // Pre-build the SHARED context prompt once for the whole batch
  // ensuring the string reference is identical for cache hits
  const sharedContextPrompt = PromptArchitect.buildContext(
    content,
    courseName,
    sectionTitle,
    subjectGuidelines,
  );

  const results: (GeneratedQuestion | null)[] = [];

  // --- STEP 1: WARM-UP (First request establishes the cache) ---
  const firstConcept = concepts[0];
  onLog?.("Cache ısıtma (Warm-up) isteği gönderiliyor...", {
    concept: firstConcept.baslik,
  });

  const firstStrategy = determineNodeStrategy(
    conceptIndex,
    wordCount,
    firstConcept,
    courseName,
  );

  const firstTaskPrompt = buildTaskPrompt(
    firstConcept,
    firstStrategy,
  );

  const firstResult = await generateSingleQuestionWithRetry(
    sharedContextPrompt,
    firstTaskPrompt,
    firstConcept,
    firstStrategy,
    onLog,
  );

  results.push(firstResult);

  // --- STEP 2: PARALLEL EXECUTION (Remaining items use cached prefix) ---
  const remainingConcepts = concepts.slice(1);

  if (remainingConcepts.length > 0) {
    onLog?.("Kalan sorular paralel işleniyor...", {
      count: remainingConcepts.length,
    });

    const promises = remainingConcepts.map(async (concept, i) => {
      // Adjust index for strategy (conceptIndex + 1 + i)
      const globalIndex = conceptIndex + 1 + i;

      const strategy = determineNodeStrategy(
        globalIndex,
        wordCount,
        concept,
        courseName,
      );

      const taskPrompt = buildTaskPrompt(
        concept,
        strategy,
      );

      return generateSingleQuestionWithRetry(
        sharedContextPrompt,
        taskPrompt,
        concept,
        strategy,
        onLog,
      );
    });

    const parallelResults = await Promise.all(promises);
    results.push(...parallelResults);
  }

  // Filter out nulls
  const validQuestions = results.filter((q): q is GeneratedQuestion =>
    q !== null
  );

  onLog?.("Batch tamamlandı", {
    totalRequested: concepts.length,
    successCount: validQuestions.length,
    successRate: `${
      Math.round((validQuestions.length / concepts.length) * 100)
    }%`,
  });

  return validQuestions;
}

/**
 * Generate a follow-up question for a wrong answer
 */
export async function generateFollowUpQuestion(
  context: WrongAnswerContext,
  courseName: string,
  sectionTitle: string,
  guidelines: { instruction?: string; few_shot_example?: unknown } | null,
  onLog?: LogCallback,
): Promise<GeneratedQuestion | null> {
  onLog?.("Follow-up soru üretimi başlatılıyor", {
    chunkId: context.chunkId,
    originalQuestionId: context.originalQuestion.id,
  });

  /* REMOVED: systemPrompt for follow-up is inside this function.
     We need to handle follow-ups separately or use PromptArchitect if we can standardize it.
     For now, let's keep follow-ups using generic `generateWithRetry` but we need to adapt it.
     Wait, `generateWithRetry` now accepts `Message[]`. I need to adapt follow-up logic to build messages manually or via architect.
  */
  const systemPrompt =
    `Sen, Türkiye'deki KPSS için profesyonel soru hazırlayan bir yapay zeka asistanısın.
Kullanıcı bir önceki soruyu YANLIŞ cevapladı. Sana verilen soruyla MANTIK OLARAK BENZER ama AYNI OLMAYAN yeni bir soru üretmelisin.

## ZORUNLU KURALLAR:
1. **JSON FORMATI**: Cevabını YALNIZCA JSON formatında ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.
2. **MANTİKSAL BENZERLİK**: Aynı kavramı/konuyu test et ama farklı bir senaryo veya bağlam kullan. ASLA aynı soru metnini kopyalama.
3. **ZORLUK**: Orijinal soruyla AYNI seviyede ol (${
      context.originalQuestion.bloomLevel || "application"
    }).
4. **OLUMSUZ VURGU**: Olumsuz ifadeler (değildir, yoktur vb.) **kalın** yazılmalı.`;

  const originalQuestionJson = {
    q: context.originalQuestion.q,
    o: context.originalQuestion.o,
    a: context.originalQuestion.a,
    exp: context.originalQuestion.exp,
    img: context.originalQuestion.img || null,
  };

  const userPrompt = `## DERS: ${courseName}
## ÜNİTE: ${sectionTitle}

## YANLIŞ CEVAPLANAN SORU:
${JSON.stringify(originalQuestionJson, null, 2)}

Kullanıcının verdiği cevap: ${
    ["A", "B", "C", "D", "E"][context.incorrectOptionIndex]
  } ("${context.originalQuestion.o[context.incorrectOptionIndex]}")
Doğru cevap: ${["A", "B", "C", "D", "E"][context.correctOptionIndex]} ("${
    context.originalQuestion.o[context.correctOptionIndex]
  }")

Kullanıcının [Yanlış Şık] cevabını vermiş olması, [Doğru Şık] ile [Yanlış Şık] arasındaki kavramsal ayrımı tam yapamadığını gösterir. Yeni soruyu, özellikle bu iki kavram arasındaki ince ayrımı test edecek şekilde kurgula.

${
    guidelines?.instruction
      ? `## DERS ÖZEL TALİMATI:\n${guidelines.instruction}\n`
      : ""
  }

## GÖREV:
Yukarıdaki soruyla MANTIK OLARAK BENZER ama AYNI OLMAYAN yeni bir soru üret.
Cevabını YALNIZCA JSON formatında ver.
{ "q": "...", "o": ["...", "...", "...", "...", "..."], "a": 0, "exp": "..." }`;

  // Use MiMo for followups
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const result = await generateWithRetry(
    messages,
    "mimo",
    GeneratedQuestionSchema,
    {
      temperature: 0.7, // Higher temp for variety in follow-ups
      onLog,
      logContext: { type: "FOLLOW_UP" },
    },
  );

  if (result) {
    const defaultBloomLevel = (context.originalQuestion.bloomLevel ||
      "application") as "knowledge" | "application" | "analysis";

    return {
      ...result,
      bloomLevel: defaultBloomLevel,
      img: context.originalQuestion.img || null,
    };
  }

  return null;
}
