import { z } from "zod";
import { supabase } from "@/shared/lib/core/supabase";
import { callCerebras, type LogCallback } from "../clients/cerebras"; // Add Cerebras import
import { parseJsonResponse } from "../clients/mimo"; // Keeping helper for now
import type { ConceptMapItem } from "../mapping";
import { type Message, PromptArchitect } from "../prompt-architect";
import {
  buildTaskPrompt, // Rename to buildTaskPrompt
  determineNodeStrategy,
  RETRY_PROMPT_TEMPLATE,
} from "./prompt";
import { rateLimiter } from "../config/rate-limiter";

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
  evidence: z.string().min(1, "Kanıt cümlesi zorunludur"),
  img: z.number().nullable().optional(),
  diagnosis: z.string().max(500).optional(),
  insight: z.string().max(500).optional(),
});

export type GeneratedQuestionType = z.infer<typeof GeneratedQuestionSchema>;

export interface GeneratedQuestion extends GeneratedQuestionType {
  img?: number | null;
  bloomLevel: "knowledge" | "application" | "analysis";
  concept: string; // Added concept title
}

export interface WrongAnswerContext {
  chunkId: string;
  originalQuestion: {
    id: string;
    q: string;
    o: string[];
    a: number;
    exp: string;
    evidence: string;
    img?: number | null;
    bloomLevel?: string;
    concept: string; // Added concept title
  };
  incorrectOptionIndex: number;
  correctOptionIndex: number;
  courseId: string;
  userId: string;
}

// --- CONCURRENCY LIMITS ---
// pLimit(1) removed - Use rateLimiter and sequential loops for pacing.

// --- RATE LIMITING ---
// Local throttling removed in favor of unified rateLimiter

/**
 * Generic function to generate content with retry logic and Zod validation
 */
async function generateWithRetry<T>(
  messages: Message[], // Changed to accept Message[]
  modelProvider: "cerebras", // Enforce Cerebras
  schema: z.ZodSchema<T>,
  options: {
    temperature: number;
    maxRetries?: number;
    onLog?: LogCallback;
    logContext?: Record<string, unknown>;
  },
): Promise<T | null> {
  const { maxRetries = 2, onLog, logContext = {} } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const isRetry = attempt > 0;

      // If retry, append retry instruction to the last message
      const currentMessages = [...messages];
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

      // Unified Rate Limiter (Schedule)
      responseContent = await rateLimiter.schedule(() =>
        callCerebras(
          currentMessages,
          "qwen-3-235b-a22b-instruct-2507", // Updated Model
          onLog,
        )
      );

      const parsed = parseJsonResponse(responseContent, "object");
      const validation = schema.safeParse(parsed);

      if (validation.success) {
        return validation.data;
      } else {
        const errorMsg = validation.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", ");

        console.error(
          "Zod Validation Failed Detail:",
          validation.error.format(),
        );

        onLog?.("Validasyon hatası", {
          ...logContext,
          errors: errorMsg,
          attempt: attempt + 1,
        });
        // Retry loop will continue
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const isRateLimit = errorMsg.includes("429");

      // STRATEGY 4: DYNAMIC RATE LIMIT (429) MANAGEMENT
      // Exponential backoff with jitter and increased base wait for 429
      const baseWait = isRateLimit ? 15000 : 2000;

      // Calculate delay: (2^attempt * baseWait) + random jitter (0-2000ms)
      const exponentialFactor = Math.pow(2, attempt);
      const jitter = Math.random() * 2000;
      const waitTime = (exponentialFactor * baseWait) + jitter;

      if (isRateLimit && attempt === 0) {
        // First 429, wait extra long aggressively
        onLog?.(
          `Hız sınırı (429) ilk kez aşıldı, uzun bekleme başlatılıyor...`,
          { ...logContext },
        );
      }

      onLog?.(
        `${isRateLimit ? "Hız sınırı (429)" : "Hata"} algılandı, ${
          Math.round(waitTime)
        }ms bekleniyor...`,
        { ...logContext, attempt: attempt + 1 },
      );

      await new Promise((resolve) => setTimeout(resolve, waitTime));
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
  usageType: "antrenman" | "deneme" | "arsiv" = "antrenman",
): Promise<GeneratedQuestion | null> {
  const systemPrompt =
    "Sen KPSS formatında, akademik dille soru yazan uzman bir yapay zekasın. SADECE JSON formatında çıktı ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.";

  // Build full message chain using PromptArchitect
  const messages = PromptArchitect.assemble(
    systemPrompt,
    contextPrompt,
    taskPrompt,
  );

  // Router Logic: ALL -> Cerebras (Qwen)
  const provider = "cerebras";

  const result = await generateWithRetry(
    messages,
    provider, // Use determined provider
    GeneratedQuestionSchema,
    {
      temperature: 0.1, // Düşük temperature - tutarlı prefix caching için
      onLog,
      logContext: { concept: concept.baslik, provider, usageType },
    },
  );

  if (result) {
    return {
      ...result,
      bloomLevel: strategy.bloomLevel,
      img: result.img ?? null,
      concept: concept.baslik,
    };
  }

  return null;
}

/**
 * Revise a rejected question based on feedback
 * Uses identical Context as main generation for prefix caching
 */
export async function reviseQuestion(
  originalQuestion: GeneratedQuestion,
  content: string,
  courseName: string,
  sectionTitle: string,
  subjectGuidelines:
    | { instruction?: string; few_shot_example?: unknown }
    | null,
  feedback: {
    critical_faults: string[];
    improvement_suggestion: string;
  },
  onLog?: LogCallback,
): Promise<GeneratedQuestion | null> {
  // System prompt - KPSS soru üretimi ile aynı olmalı
  const systemPrompt =
    "Sen KPSS formatında, akademik dille soru yazan uzman bir yapay zekasın. SADECE JSON formatında çıktı ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.";

  // AI'a görsel URL'lerini gönderme
  const cleanContent = content.replace(/!\[[^\]]*\]\([^)]+\)/g, "[GÖRSEL]");

  // Context prompt - Ana üretimdeki prefix ile %100 eşleşmeli
  const contextPrompt = PromptArchitect.buildContext(
    cleanContent,
    courseName,
    sectionTitle,
    subjectGuidelines,
  );

  // Task prompt (değişken kısım) - revizyon talimatı
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

Soruyu revize et. Hataları gider, akademik dili ve KPSS formatını koru, kanıt (evidence) alanını koru veya güncelle.
${RETRY_PROMPT_TEMPLATE}`;

  // 3 ayrı mesaj bloğu olarak PromptArchitect.assemble kullan
  const messages = PromptArchitect.assemble(
    systemPrompt,
    contextPrompt,
    revisionTask,
  );

  const result = await generateWithRetry(
    messages,
    "cerebras",
    GeneratedQuestionSchema,
    {
      temperature: 0.1,
      maxRetries: 2,
      onLog,
      logContext: { action: "REVISION" },
    },
  );

  if (result) {
    return {
      ...result,
      bloomLevel: originalQuestion.bloomLevel,
      img: originalQuestion.img,
      concept: originalQuestion.concept,
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
  usageType: "antrenman" | "deneme" | "arsiv" = "antrenman",
  chunkId?: string,
): Promise<GeneratedQuestion[]> {
  onLog?.(`Batch üretimi başlıyor (${usageType} modunda)`, {
    batchSize: concepts.length,
    startIndex: conceptIndex,
  });

  if (concepts.length === 0) {
    return [];
  }

  // Pre-build the SHARED context prompt once for the whole batch
  // ensuring the string reference is identical for cache hits
  // AI'a görsel URL'lerini gönderme - sadece metin içeriği
  const cleanContent = content.replace(/!\[[^\]]*\]\([^)]+\)/g, "[GÖRSEL]");

  // Fetch Diagnoses if chunkId is present
  let previousDiagnoses: string[] = [];
  if (chunkId) {
    const { data: pastDiagnoses } = await supabase
      .from("user_quiz_progress")
      .select("ai_diagnosis")
      .eq("chunk_id", chunkId) // We don't have userId passed here easily without auth context?
      // Actually generateQuestionBatch is usually client side or has auth context.
      // Wait, typical usage of this function is from `quiz-generator.ts` which is client side.
      // So `supabase` usage will use the authenticated user safely.
      .not("ai_diagnosis", "is", null)
      .order("answered_at", { ascending: false })
      .limit(10);

    if (pastDiagnoses) {
      const allDiagnoses = (pastDiagnoses as { ai_diagnosis: string | null }[])
        .map((p) => p.ai_diagnosis)
        .filter((d): d is string => Boolean(d));

      // Eşsiz teşhisleri al (son 3 farklı teşhis)
      previousDiagnoses = Array.from(new Set(allDiagnoses)).slice(0, 3);
      if (previousDiagnoses.length > 0) {
        onLog?.("Kognitif Hafıza: Geçmiş teşhisler bulundu", {
          count: previousDiagnoses.length,
        });
      }
    }
  }

  const sharedContextPrompt = PromptArchitect.buildContext(
    cleanContent,
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
    usageType,
    previousDiagnoses,
  );

  const firstResult = await generateSingleQuestionWithRetry(
    sharedContextPrompt,
    firstTaskPrompt,
    firstConcept,
    firstStrategy,
    onLog,
    usageType,
  );

  results.push(firstResult);

  // --- STEP 2: SEQUENTIAL EXECUTION (Remaining items use cached prefix) ---
  const remainingConcepts = concepts.slice(1);

  if (remainingConcepts.length > 0) {
    onLog?.("Kalan sorular RateLimiter ile paralel işleniyor...", {
      count: remainingConcepts.length,
    });

    // Map remaining concepts to promises
    const promises = remainingConcepts.map(async (concept, i) => {
      // Adjust index for strategy (conceptIndex + 1 + i)
      const globalIndex = conceptIndex + 1 + i;

      onLog?.(`Sıralanıyor: ${concept.baslik}`, {
        index: globalIndex,
      });

      const strategy = determineNodeStrategy(
        globalIndex,
        wordCount,
        concept,
        courseName,
      );

      const taskPrompt = buildTaskPrompt(
        concept,
        strategy,
        usageType,
        previousDiagnoses,
      );

      return generateSingleQuestionWithRetry(
        sharedContextPrompt,
        taskPrompt,
        concept,
        strategy,
        onLog,
        usageType,
      );
    });

    // Fire all at once - RateLimiter handles the rest
    const remainingResults = await Promise.all(promises);
    results.push(...remainingResults);
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
 * Token Optimizasyonu: Tüm ders notu yerine sadece evidence kullanılır
 */
export async function generateFollowUpQuestion(
  context: WrongAnswerContext,
  evidence: string, // Sorunun dayandığı kanıt cümlesi
  chunkContent: string, // STRATEGY 3: Full source content for context expansion
  courseName: string,
  sectionTitle: string,
  _guidelines: { instruction?: string; few_shot_example?: unknown } | null,
  onLog?: LogCallback,
): Promise<GeneratedQuestion | null> {
  onLog?.("Follow-up soru üretimi başlatılıyor (Context-Enhanced)", {
    chunkId: context.chunkId,
    originalQuestionId: context.originalQuestion.id,
    evidenceLength: evidence?.length || 0,
    contentLength: chunkContent?.length || 0,
  });

  // --- SCAFFOLDING LOGIC ---
  const { data: statusData } = await supabase
    .from("user_question_status")
    .select("consecutive_fails")
    .eq("user_id", context.userId)
    .eq("question_id", context.originalQuestion.id)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consecutiveFails = (statusData as any)?.consecutive_fails ?? 0;

  let targetBloomLevel = context.originalQuestion.bloomLevel || "application";
  let scaffoldingNote = "";

  if (consecutiveFails >= 2) {
    if (targetBloomLevel === "analysis") targetBloomLevel = "application";
    else if (targetBloomLevel === "application") targetBloomLevel = "knowledge";

    scaffoldingNote =
      `\n**SCAFFOLDING AKTİF**: Kullanıcı bu konuda zorlanıyor (Hata #${consecutiveFails}). Soruyu BİR ALT BİLİŞSEL SEVİYEYE (${targetBloomLevel}) indir.`;
  }

  // --- COGNITIVE MEMORY (DIAGNOSIS) ---
  const { data: pastDiagnoses } = await supabase
    .from("user_quiz_progress")
    .select("ai_diagnosis")
    .eq("user_id", context.userId)
    .eq("chunk_id", context.chunkId)
    .not("ai_diagnosis", "is", null)
    .order("answered_at", { ascending: false })
    .limit(10);

  const allDiagnoses = (pastDiagnoses as { ai_diagnosis: string | null }[])
    ?.map((p) => p.ai_diagnosis)
    .filter((d): d is string => Boolean(d)) || [];

  const previousDiagnoses = Array.from(new Set(allDiagnoses)).slice(0, 3);

  // --- SYSTEM PROMPT ---
  const systemPrompt = `Sen KPSS formatında soru yazan uzman bir yapay zekasın.
Gemiş bağlamı (metni) sadece çeldirici kalitesini artırmak için kullan.
SORUNUN DOĞRU CEVABI KESİNLİKLE VE SADECE VERİLEN "KANIT CÜMLESİ"NE DAYANMALIDIR.
SADECE JSON formatında çıktı ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.`;

  // --- CONTEXT PROMPT (STRATEGY 3: Expanded Context) ---
  // Using PromptArchitect to build full context including the source text
  // This allows the model to generate better distractors by knowing unrelated concepts in the same text
  const cleanContent = chunkContent.replace(
    /!\[[^\]]*\]\([^)]+\)/g,
    "[GÖRSEL]",
  );
  const contextPrompt = PromptArchitect.buildContext(
    cleanContent,
    courseName,
    sectionTitle,
    _guidelines,
  );

  // --- TASK PROMPT (DİNAMİK) ---
  const originalQuestionJson = {
    q: context.originalQuestion.q,
    o: context.originalQuestion.o,
    a: context.originalQuestion.a,
    exp: context.originalQuestion.exp,
    img: context.originalQuestion.img ?? null,
  };

  const taskParts = [
    `## FOLLOW-UP SORU ÜRETİMİ`,
    `Kullanıcı bir önceki soruyu YANLIŞ cevapladı. Yeni bir soru üretmelisin.`,
    `**TEK KAYNAK (DOĞRU CEVAP İÇİN):** "${evidence}"`,
    `SORU KURMA TALİMATI:
1. Sorunun doğru cevabı yukarıdaki "TEK KAYNAK" cümlesine %100 sadık olmalıdır.
2. Çeldiricileri (yanlış şıkları) üretirken, modelin kafasını karıştırmak için "Geniş Bağlam (Yukarıdaki Metin)" içerisindeki diğer kavramları kullan.
3. Ancak kullanıcının metindeki başka bir yere bakarak soruyu çözmesine veya kafasının karışmasına izin verme; cevap sadece belirtilen cümlede olmalı.`,
    `ZORLUK: Hedef Seviye: ${targetBloomLevel}${scaffoldingNote}`,
    `## YANLIŞ CEVAPLANAN SORU:\n${
      JSON.stringify(originalQuestionJson, null, 2)
    }`,
    `Kullanıcının verdiği cevap: ${
      ["A", "B", "C", "D", "E"][context.incorrectOptionIndex]
    } ("${context.originalQuestion.o[context.incorrectOptionIndex]}")`,
    `Doğru cevap: ${["A", "B", "C", "D", "E"][context.correctOptionIndex]} ("${
      context.originalQuestion.o[context.correctOptionIndex]
    }")`,
  ];

  // Dinamik: Geçmiş teşhisler
  if (previousDiagnoses.length > 0) {
    taskParts.push(
      `## KULLANICININ GEÇMİŞ HATALARI:\n${
        previousDiagnoses.map((d) => `- ${d}`).join("\n")
      }`,
    );
  }

  // STRATEGY 1 & 2 REINFORCEMENT
  taskParts.push(`EK KURALLAR:
1. **Çeldiriciler:** Kavram karmaşası yaratan, metinden beslenen ama bu soru için yanlış olan şıklar.
2. **LaTeX:** Sayısal veriler KESİNLİKLE LaTeX ($P=10$ vb.).
3. **Kanıt:** "evidence" alanına yukarıdaki "TEK KAYNAK" cümlesini aynen yaz.`);

  taskParts.push(
    `GÖREVİN: Belirtilen kanıt cümlesine odaklanarak yeni bir follow-up soru üret. SADECE JSON döndür.`,
  );

  const taskPrompt = taskParts.join("\n\n");

  // 3 ayrı mesaj bloğu olarak PromptArchitect.assemble kullan
  const messages = PromptArchitect.assemble(
    systemPrompt,
    contextPrompt,
    taskPrompt,
  );

  const result = await generateWithRetry(
    messages,
    "cerebras",
    GeneratedQuestionSchema,
    {
      temperature: 0.1,
      onLog,
      logContext: { type: "FOLLOW_UP_ENHANCED" },
    },
  );

  if (result) {
    const defaultBloomLevel = (context.originalQuestion.bloomLevel ||
      "application") as "knowledge" | "application" | "analysis";

    return {
      ...result,
      bloomLevel: defaultBloomLevel,
      img: context.originalQuestion.img ?? null,
      concept: context.originalQuestion.concept,
    };
  }

  return null;
}
