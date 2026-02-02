import { z } from "zod";
import { supabase } from "@/shared/lib/core/supabase";
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
  evidence: z.string().min(1, "Kanıt cümlesi zorunludur"),
  img: z.number().nullable().optional(),
  diagnosis: z.string().max(150).optional(),
  insight: z.string().max(200).optional(),
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
  usageType: "antrenman" | "deneme" | "arsiv" = "antrenman",
  isFallbackActive: boolean = false,
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
  // NOTE: For 'deneme', maybe always force MiMo for higher reasoning capability?
  // Let's stick to standard routing for now but add log context
  // Router Logic: Knowledge -> Cerebras, Others -> MiMo
  // NOTE: If Fallback is active, FORCE Cerebras (Stronger Model)
  const provider = isFallbackActive
    ? "cerebras"
    : (strategy.bloomLevel === "knowledge" ? "cerebras" : "mimo");

  const result = await generateWithRetry(
    messages,
    provider, // Use determined provider
    GeneratedQuestionSchema,
    {
      temperature: usageType === "deneme" ? 0.5 : 0.4, // Slightly higher temp for Deneme for variety
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

  // AI'a görsel URL'lerini gönderme
  const cleanContent = content.replace(/!\[[^\]]*\]\([^)]+\)/g, "[GÖRSEL]");
  const contextPrompt = PromptArchitect.buildContext(cleanContent); // Re-build context (less ideal for cache but safe)

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
- Kanıt (evidence) alanını koru veya gerekirse güncelle.
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
  isFallbackActive: boolean = false,
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
      .order("created_at", { ascending: false })
      .limit(3);

    if (pastDiagnoses) {
      previousDiagnoses = (pastDiagnoses as any[]).map((p) => p.ai_diagnosis)
        .filter(
          Boolean,
        );
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
    previousDiagnoses,
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
  );

  const firstResult = await generateSingleQuestionWithRetry(
    sharedContextPrompt,
    firstTaskPrompt,
    firstConcept,
    firstStrategy,
    onLog,
    usageType,
    isFallbackActive,
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
        usageType,
      );

      return generateSingleQuestionWithRetry(
        sharedContextPrompt,
        taskPrompt,
        concept,
        strategy,
        onLog,
        usageType,
        isFallbackActive,
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
  // --- SCAFFOLDING LOGIC ---
  // 1. Get Consecutive Fails
  const { data: statusData } = await supabase
    .from("user_question_status")
    .select("consecutive_fails")
    .eq("user_id", context.userId)
    .eq("question_id", context.originalQuestion.id)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consecutiveFails = (statusData as any)?.consecutive_fails ?? 0;

  // 2. Adjust Bloom Level
  let targetBloomLevel = context.originalQuestion.bloomLevel || "application";
  let scaffoldingNote = "";

  if (consecutiveFails >= 2) {
    if (targetBloomLevel === "analysis") targetBloomLevel = "application";
    else if (targetBloomLevel === "application") targetBloomLevel = "knowledge";

    scaffoldingNote =
      `\n**SCAFFOLDING AKTİF**: Kullanıcı bu konuda zorlanıyor (Hata #${consecutiveFails}). Soruyu BİR ALT BİLİŞSEL SEVİYEYE (${targetBloomLevel}) indir. Daha temel kavramlara odaklan, karmaşıklığı azalt.`;
  }

  // --- COGNITIVE MEMORY (DIAGNOSIS) ---
  // Fetch recent diagnoses for this chunk to see patterns
  const { data: pastDiagnoses } = await supabase
    .from("user_quiz_progress")
    .select("ai_diagnosis")
    .eq("user_id", context.userId)
    .eq("chunk_id", context.chunkId)
    .not("ai_diagnosis", "is", null)
    .order("created_at", { ascending: false })
    .limit(3);

  const memoryContext =
    (pastDiagnoses as any[])?.map((p) => p.ai_diagnosis).filter(Boolean).join(
      "\n- ",
    ) ||
    "";
  const memoryPrompt = memoryContext
    ? `\n\nKullanıcının Geçmiş Hataları (DİKKATE AL):\n- ${memoryContext}`
    : "";

  // --- CONCEPT FOCUS EXTRACTION ---
  let focusText = "";
  let prerequisites: string[] = [];

  try {
    const { data: chunkData } = await supabase
      .from("note_chunks")
      .select("metadata")
      .eq("id", context.chunkId)
      .single();

    if (chunkData?.metadata) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const concepts = (chunkData.metadata as any)
        .concept_map as ConceptMapItem[];
      const targetConcept = concepts?.find((c) =>
        c.baslik === context.originalQuestion.concept
      );
      if (targetConcept) {
        focusText = targetConcept.odak;
        prerequisites = targetConcept.prerequisites || [];
        onLog?.("Konu Odağı Bulundu", { focus: focusText, prerequisites });
      }
    }
  } catch (e) {
    console.error("Konu odağı çekilemedi", e);
  }

  const focusInstruction = focusText
    ? `\n**TEKNİK ODAK**: Bu sorunun temel teknik kazanımı şudur: "${focusText}". Takip sorusunu genel kültürüne göre değil, bu odak noktasına sadık kalarak üret.`
    : "";

  const systemPrompt =
    `Sen, Türkiye'deki KPSS için profesyonel soru hazırlayan bir yapay zeka asistanısın.
Kullanıcı bir önceki soruyu YANLIŞ cevapladı. Sana verilen soruyla MANTIK OLARAK BENZER ama AYNI OLMAYAN yeni bir soru üretmelisin.

## ZORUNLU KURALLAR:
1. **JSON FORMATI**: Cevabını YALNIZCA JSON formatında ver. Cevabın dışında hiçbir metin, yorum veya markdown karakteri bulunmamalıdır.
2. **TEŞHİS ODAKLI (DIAGNOSTIC)**: Kullanıcının hatası "rastgele" değildir; iki kavramı birbirine karıştırmıştır. Yeni soru, tam olarak bu kavramsal karışıklığı hedef almalı ve ayrımı netleştirmelidir.
3. **MANTİKSAL BENZERLİK**: Aynı kazanımı test et ama farklı bir senaryo veya bağlam kullan. ASLA aynı soru metnini kopyalama.
4. **ZORLUK**: Hedef Seviye: ${targetBloomLevel}. (Original: ${context.originalQuestion.bloomLevel})${scaffoldingNote}
5. **OLUMSUZ VURGU**: Olumsuz ifadeler (değildir, yoktur vb.) **kalın** yazılmalı.
6. **TEŞHİS VE İÇGÖRÜ**: JSON çıktısına "diagnosis" (hatanın teknik analizi) ve "insight" (kullanıcıya ipucu/hap bilgi) alanlarını ekle.
7. **KANIT**: Her soru için not içerisinden cevabı kanıtlayan cümleyi harfiyen (verbatim) alıntıla ve "evidence" alanına yaz. Eğer metinde doğrudan bir kanıt yoksa o soruyu üretme.${focusInstruction}

${memoryPrompt}`;

  const originalQuestionJson = {
    q: context.originalQuestion.q,
    o: context.originalQuestion.o,
    a: context.originalQuestion.a,
    exp: context.originalQuestion.exp,
    img: context.originalQuestion.img ?? null,
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

## TEŞHİS VE GÖREV:
Kullanıcının [Yanlış Şık] seçeneğini işaretlemesi, [Doğru Şık] ile [Yanlış Şık] kavramları arasındaki ayrımı yapamadığını gösteriyor.

GÖREVİN:
Tam olarak bu iki kavram arasındaki "ince çizgiyi" test eden yeni bir soru (Follow-up) üret.
- Soru, kullanıcının bu hatayı tekrar yapıp yapmayacağını "kontrol" etmelidir.
- Senaryoyu değiştir, ancak test edilen bilişsel süreci (kazanımı) koru.
- Cevabını YALNIZCA JSON formatında ver.

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
      img: context.originalQuestion.img ?? null,
      concept: context.originalQuestion.concept,
    };
  }

  return null;
}
