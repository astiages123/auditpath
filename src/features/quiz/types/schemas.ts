import { z } from 'zod';

/**
 * Validation schemas for Quiz domain types
 *
 * These schemas provide runtime type safety for data coming from:
 * - Supabase JSON columns (question_data, metadata)
 * - External APIs
 * - Local storage
 */

/**
 * Kavram haritası içindeki tek bir kavramın validasyon şeması.
 * Basit nesne yapısını doğrular.
 */
export const ConceptMapItemSchema = z.object({
  baslik: z.string(),
  odak: z.string(),
  seviye: z.enum(['Bilgi', 'Uygulama', 'Analiz']),
  gorsel: z.string().nullable(),
  altText: z.string().nullable().optional(),
  isException: z.boolean().optional(),
  prerequisites: z.array(z.string()).optional(),
});

/** Validasyonu yapılmış kavram haritası ögesi tipi */
export type ValidatedConceptMapItem = z.infer<typeof ConceptMapItemSchema>;

/** Tüm sorular için temel validasyon şeması */
export const BaseQuestionSchema = z.object({
  id: z.string().optional(),
  q: z.string(),
  exp: z.string(),
  img: z.number().nullable().optional(),
  imageUrls: z.array(z.string()).optional(),
  imgPath: z.string().nullable().optional(),
  diagnosis: z.string().nullable().optional(),
  insight: z.string().nullable().optional(),
  evidence: z.string().nullable().optional(),
  chunk_id: z.string().optional(),
  courseSlug: z.string().optional(),
  topicSlug: z.string().optional(),
});

/** Çoktan seçmeli soru validasyon şeması */
export const MultipleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('multiple_choice'),
  o: z.array(z.string()).length(5),
  a: z.number().int().min(0).max(4),
});

/** Doğru-Yanlış soru validasyon şeması */
export const TrueFalseQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('true_false'),
  o: z.tuple([z.string(), z.string()]).or(z.array(z.string()).length(2)),
  a: z.number().min(0).max(1),
});

const QuizQuestionUnionSchema = z.discriminatedUnion('type', [
  MultipleChoiceQuestionSchema,
  TrueFalseQuestionSchema,
]);

/** Discriminated Union kullanılarak birleştirilmiş genel soru şeması */
export const QuizQuestionSchema = z.preprocess((data: unknown) => {
  if (typeof data !== 'object' || data === null) return data;

  const item = { ...(data as Record<string, unknown>) };
  if (item.type) return item;

  const options = Array.isArray(item.o) ? item.o : null;
  const answer = item.a;

  if (options?.length === 2 && (answer === 0 || answer === 1)) {
    item.type = 'true_false';
    return item;
  }

  item.type = 'multiple_choice';
  return item;
}, QuizQuestionUnionSchema);

/** Validasyonu yapılmış genel quiz sorusu tipi */
export type ValidatedQuizQuestion = z.infer<typeof QuizQuestionSchema>;

/** Soru durumu (active, reviewing, mastered) validasyon şeması */
export const QuestionStatusSchema = z.enum(['active', 'reviewing', 'mastered']);

/**
 * Yapay zeka analiz mantığını (difficulty, concepts, quotas) kapsayan şema.
 * Supabase `ai_logic` sütunu için validasyon sağlar.
 */
export const AILogicSchema = z.object({
  difficulty_index: z.number().nullable().optional(),
  concept_map: z.array(ConceptMapItemSchema).nullable().optional(),
  suggested_quotas: z
    .object({
      antrenman: z.number(),
      deneme: z.number(),
    })
    .nullable()
    .optional(),
  reasoning: z.string().nullable().optional(),
  generated_at: z.string().nullable().optional(), // Analiz tarihi (ISO)
  invalidated_at: z.string().nullable().optional(), // Geçersiz kılınma tarihi (ISO)
});

/** Validasyonu yapılmış AI Logic tipi */
export type ValidatedAILogic = z.infer<typeof AILogicSchema>;

/** Chunk meta verileri için passthrough şema */
export const ChunkMetadataSchema = z.object({}).passthrough();

/** Validasyonu yapılmış Chunk Metadata tipi */
export type ValidatedChunkMetadata = z.infer<typeof ChunkMetadataSchema>;

/** Veritabanındaki `questions` tablosunun temel satır şeması */
export const QuestionRowSchema = z.object({
  id: z.string(),
  chunk_id: z.string().nullable(),
  course_id: z.string(),
  parent_question_id: z.string().nullable(),
  question_data: z.unknown(),
});

/** Kısmi soru verisi (Repository sorguları için) */
export const PartialQuestionRowSchema = z.object({
  id: z.string(),
  chunk_id: z.string(),
  question_data: z.unknown(),
  bloom_level: z.string().nullable(),
  concept_title: z.string().nullable(),
  usage_type: z.string().nullable(),
});

/** Durum bilgisi içeren soru satırı şeması */
export const QuestionWithStatusRowSchema = z.object({
  question_id: z.string(),
  status: QuestionStatusSchema,
  next_review_session: z.number().nullable(),
  questions: QuestionRowSchema.pick({
    id: true,
    chunk_id: true,
    course_id: true,
    parent_question_id: true,
    question_data: true,
  }),
});

/** Follow-up (takip) sorusu satır şeması */
export const FollowUpQuestionRowSchema = z.object({
  id: z.string(),
  chunk_id: z.string().nullable(),
  course_id: z.string(),
  parent_question_id: z.string().nullable(),
  question_data: z.unknown(),
  user_question_status: z.array(z.object({ status: z.string() })),
});

/** Validasyonu yapılmış follow-up sorusu tipi */
export type ValidatedFollowUpQuestion = z.infer<
  typeof FollowUpQuestionRowSchema
>;

/** Döviz kuru şeması (Para birimi dönüşümleri için) */
export const ExchangeRateSchema = z.object({
  TRY: z.number(),
  EUR: z.number().optional(),
  GBP: z.number().optional(),
});

/** Validasyonu yapılmış döviz kuru tipi */
export type ValidatedExchangeRate = z.infer<typeof ExchangeRateSchema>;

/** İçerik ve AI mantığı ile birlikte Chunk şeması */
export const ChunkWithContentSchema = z.object({
  id: z.string(),
  course_id: z.string(),
  metadata: z.unknown(),
  status: z.string(),
  content: z.string(),
  course_name: z.string().nullable(),
  section_title: z.string().nullable(),
  ai_logic: z.unknown(),
});

/** Validasyonu yapılmış içerikli Chunk tipi */
export type ValidatedChunkWithContent = z.infer<typeof ChunkWithContentSchema>;

// Timeline schemas removed - no longer needed

/**
 * Üretim sürecinde kullanılan kavram haritası şeması.
 * İşlem (preprocess) adımları ile farklı model yanıtlarını normalize eder.
 */
export const ConceptMapSchema = z.preprocess(
  (val: unknown) => {
    const item = val as Record<string, unknown>;
    if (item && typeof item === 'object' && !item.baslik) {
      item.baslik = item.title || item.kavram || item.başlık || item.topic;
    }
    return item;
  },
  z.object({
    baslik: z.string().min(1),
    odak: z.string().default('Konu kapsamındaki temel kazanım'),
    // seviye alanına preprocess ekleyip metin bazında seviye belirleme
    seviye: z.preprocess(
      (val) => {
        const s = String(val).toLowerCase();
        if (s.includes('uygulama') || s.includes('apply')) {
          return 'Uygulama';
        }
        if (s.includes('analiz') || s.includes('analyze')) return 'Analiz';
        return 'Bilgi';
      },
      z.enum(['Bilgi', 'Uygulama', 'Analiz'])
    ),
    // gorsel alanı boş string gelirse null'a çevir
    gorsel: z.preprocess(
      (val) => (val === '' || val === undefined ? null : val),
      z.string().nullable()
    ),
    altText: z.string().nullable().optional().default(null),
    isException: z.preprocess((val) => !!val, z.boolean().default(false)),
    prerequisites: z.array(z.string()).optional().default([]),
  })
);

/** Kavram haritası üretimi için dönen toplu yanıt şeması */
export const ConceptMapResponseSchema = z.object({
  difficulty_index: z.preprocess((val) => {
    const num = Number(val);
    return Math.max(1, Math.min(5, isNaN(num) ? 3 : num));
  }, z.number().min(1).max(5).describe('Metnin bilişsel zorluk endeksi (1: Basit, 5: Çok Ağır Doktrin)')),
  concepts: z.array(ConceptMapSchema).nonempty(),
});

export const GeneratedQuestionSchema = z.preprocess(
  (data: unknown) => {
    if (typeof data !== 'object' || data === null) return data;
    const item = data as Record<string, unknown>;

    // Sin Source of Truth (SSoT) ve LLM mapping katmanı
    const mapped: Record<string, unknown> = { ...item };

    // Soru Metni
    if (!mapped.q && (item.yeni_soru || item.soru || item.question)) {
      mapped.q = item.yeni_soru || item.soru || item.question;
    }
    // Seçenekler
    if (!mapped.o && (item.secenekler || item.options || item.choices)) {
      mapped.o = item.secenekler || item.options || item.choices;
    }
    // Doğru Cevap (0-4)
    if (mapped.a === undefined) {
      const aVal = item.dogru_cevap ?? item.answer ?? item.correct_answer;
      if (aVal !== undefined) mapped.a = aVal;
    }
    // Açıklama
    if (!mapped.exp && (item.aciklama || item.explanation || item.exp)) {
      mapped.exp = item.aciklama || item.explanation || item.exp;
    }
    // Kanıt (Evidence) - DB: evidence, JSON: evidence
    if (!mapped.evidence && (item.dayanak || item.kanit || item.source)) {
      mapped.evidence = item.dayanak || item.kanit || item.source;
    }
    // Teşhis (Diagnosis) - DB: ai_diagnosis, JSON: diagnosis
    if (
      !mapped.diagnosis &&
      (item.ai_diagnosis || item.teshis || item.hatade_teshis)
    ) {
      mapped.diagnosis = item.ai_diagnosis || item.teshis || item.hatade_teshis;
    }
    // İçgörü (Insight) - DB: ai_insight, JSON: insight
    if (
      !mapped.insight &&
      (item.ai_insight || item.icgoru || item.mentor_notu)
    ) {
      mapped.insight = item.ai_insight || item.icgoru || item.mentor_notu;
    }

    return mapped;
  },
  z.object({
    q: z.string().min(10, 'Soru metni çok kısa'),
    o: z.array(z.string()).length(5, 'Tam olarak 5 seçenek olmalı'),
    a: z.number().int().min(0).max(4),
    exp: z.string().min(10, 'Açıklama metni çok kısa'),
    evidence: z.string().optional().default(''),
    img: z.preprocess((val) => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'string') {
        if (val.toLowerCase() === 'null') return null;
        const n = parseInt(val, 10);
        return isNaN(n) ? null : n;
      }
      return val;
    }, z.number().nullable().optional().default(null)),
    diagnosis: z.string().max(1000).optional().default(''),
    insight: z.string().max(1000).nullable().optional().default(''),
    bloomLevel: z.string().optional(),
    concept: z.string().optional(),
  })
);

export type GeneratedQuestionResult = z.infer<typeof GeneratedQuestionSchema>;

export const BatchGeneratedQuestionSchema = z.object({
  questions: z.array(GeneratedQuestionSchema),
});

export type BatchGeneratedQuestion = z.infer<
  typeof BatchGeneratedQuestionSchema
>;

/** Toplu revizyon yanıtı şeması — her soru index ile eşleştirilir */
export const BatchRevisionResponseSchema = z.object({
  questions: z.array(
    GeneratedQuestionSchema.and(z.object({ index: z.number().int().min(0) }))
  ),
});

export type BatchRevisionResponse = z.infer<typeof BatchRevisionResponseSchema>;

const BaseValidationResultSchema = z.object({
  total_score: z.coerce.number().min(0).max(100),
  decision: z.enum(['APPROVED', 'REJECTED']),
  critical_faults: z.array(z.string()).default([]),
  improvement_suggestion: z.string().default(''),
});

const validationResultPreprocessor = (data: unknown) => {
  const item = data as Record<string, unknown>;
  if (item && typeof item === 'object') {
    // total_score alanı yoksa alternatif isimlere bak
    if (item.total_score === undefined) {
      item.total_score = item.score ?? item.puan ?? item.point;
    }
    // decision alanı metnine göre eşle
    if (item.decision && typeof item.decision === 'string') {
      const d = item.decision.toUpperCase();
      if (
        d.includes('APPROV') ||
        d.includes('ONAY') ||
        d.includes('KABUL') ||
        d.includes('OK') ||
        d.includes('TRUE')
      ) {
        item.decision = 'APPROVED';
      } else if (
        d.includes('RED') ||
        d.includes('REJECT') ||
        d.includes('HATA')
      ) {
        item.decision = 'REJECTED';
      }
    }
  }
  return item;
};

export const ValidationResultSchema = z.preprocess(
  validationResultPreprocessor,
  BaseValidationResultSchema
);

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const BatchValidationResultSchema = z.object({
  results: z.array(
    z.preprocess(
      validationResultPreprocessor,
      BaseValidationResultSchema.extend({
        index: z.number(),
      })
    )
  ),
});

export type BatchValidationResult = z.infer<typeof BatchValidationResultSchema>;

export type GenerationStep =
  | 'INIT'
  | 'MAPPING'
  | 'GENERATING'
  | 'VALIDATING'
  | 'REVISION'
  | 'SAVING'
  | 'COMPLETED'
  | 'ERROR';

export interface GenerationLog {
  id: string;
  step: GenerationStep;
  message: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface GeneratorCallbacks {
  onLog: (log: GenerationLog) => void;
  onTotalTargetCalculated: (target: number) => void;
  onQuestionSaved: (totalSaved: number) => void;
  onComplete: (result: { success: boolean; generated: number }) => void;
  onError: (error: string) => void;
}

export const SubmitQuizAnswerSchema = z.object({
  questionId: z.string().uuid(),
  chunkId: z.string().uuid().nullable(),
  responseType: z.enum(['correct', 'incorrect', 'blank']),
  timeSpentMs: z.number().min(0).max(600000), // Max 10 minutes
  selectedAnswer: z.number().int().min(0).max(4).nullable(),
});

export type ValidatedSubmitQuizAnswer = z.infer<typeof SubmitQuizAnswerSchema>;
