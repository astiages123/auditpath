import { z } from "zod";

/**
 * Validation schemas for Quiz domain types
 *
 * These schemas provide runtime type safety for data coming from:
 * - Supabase JSON columns (question_data, metadata)
 * - External APIs
 * - Local storage
 */

// ============================================================================
// Concept Map Schemas
// ============================================================================

export const ConceptMapItemSchema = z.object({
  baslik: z.string(),
  odak: z.string(),
  seviye: z.enum(["Bilgi", "Uygulama", "Analiz"]),
  gorsel: z.string().nullable(),
  altText: z.string().nullable().optional(),
  isException: z.boolean().optional(),
  prerequisites: z.array(z.string()).optional(),
});

export type ValidatedConceptMapItem = z.infer<typeof ConceptMapItemSchema>;

// ============================================================================
// Quiz Question Schemas
// ============================================================================

export const BaseQuestionSchema = z.object({
  id: z.string().optional(),
  q: z.string(),
  exp: z.string(),
  img: z.number().nullable().optional(),
  imageUrls: z.array(z.string()).optional(),
  imgPath: z.string().nullable().optional(),
  diagnosis: z.string().optional(),
  insight: z.string().optional(),
  evidence: z.string().optional(),
  chunk_id: z.string().optional(),
  courseSlug: z.string().optional(),
  topicSlug: z.string().optional(),
});

export const MultipleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("multiple_choice"),
  o: z.array(z.string()),
  a: z.number(),
});

export const TrueFalseQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("true_false"),
  o: z.tuple([z.string(), z.string()]).or(z.array(z.string()).length(2)),
  a: z.number().min(0).max(1),
});

export const QuizQuestionSchema = z.discriminatedUnion("type", [
  MultipleChoiceQuestionSchema,
  TrueFalseQuestionSchema,
]);

export type ValidatedQuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuestionStatusSchema = z.enum([
  "active",
  "pending_followup",
  "archived",
  "learning",
]);

// ============================================================================
// Chunk Metadata Schemas
// ============================================================================

export const ChunkMetadataSchema = z.object({
  difficulty_index: z.number().optional(),
  concept_map: z.array(ConceptMapItemSchema).optional(),
});

export type ValidatedChunkMetadata = z.infer<typeof ChunkMetadataSchema>;

// ============================================================================
// Repository Row Schemas
// ============================================================================

export const QuestionRowSchema = z.object({
  id: z.string(),
  chunk_id: z.string().nullable(),
  course_id: z.string(),
  parent_question_id: z.string().nullable(),
  question_data: z.unknown(),
});

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

export const FollowUpQuestionRowSchema = z.object({
  id: z.string(),
  chunk_id: z.string().nullable(),
  course_id: z.string(),
  parent_question_id: z.string().nullable(),
  question_data: z.unknown(),
  user_question_status: z.array(z.object({ status: z.string() })),
});

export type ValidatedFollowUpQuestion = z.infer<
  typeof FollowUpQuestionRowSchema
>;

// ============================================================================
// Exchange Rate Schema
// ============================================================================

export const ExchangeRateSchema = z.object({
  TRY: z.number(),
  EUR: z.number().optional(),
  GBP: z.number().optional(),
});

export type ValidatedExchangeRate = z.infer<typeof ExchangeRateSchema>;

// ============================================================================
// Note Chunk Schemas
// ============================================================================

export const ChunkWithContentSchema = z.object({
  id: z.string(),
  course_id: z.string(),
  metadata: z.unknown(),
  status: z.string(),
  content: z.string(),
  display_content: z.string().nullable(),
  course_name: z.string().nullable(),
  section_title: z.string().nullable(),
  ai_logic: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// Pomodoro Timeline Schemas
// ============================================================================

export const TimelineEventSchema = z.object({
  type: z.enum(["work", "break", "pause", "WORK", "BREAK", "PAUSE"]),
  start: z.number(),
  end: z.number().optional().nullable(),
});

export type ValidatedTimelineEvent = z.infer<typeof TimelineEventSchema>;
