import { describe, expect, it } from 'vitest';
import {
  ConceptMapItemSchema,
  MultipleChoiceQuestionSchema,
  TrueFalseQuestionSchema,
  QuizQuestionSchema,
  QuestionStatusSchema,
  ChunkMetadataSchema,
  QuestionRowSchema,
  QuestionWithStatusRowSchema,
  FollowUpQuestionRowSchema,
  ExchangeRateSchema,
  ChunkWithContentSchema,
  TimelineEventSchema,
} from '@/shared/lib/validation/quiz-schemas';

describe('quiz-schemas', () => {
  describe('ConceptMapItemSchema', () => {
    it('should validate valid concept map item', () => {
      const validItem = {
        baslik: 'Test Başlık',
        odak: 'Test Odak',
        seviye: 'Bilgi',
        gorsel: null,
        altText: null,
        isException: false,
        prerequisites: ['Prereq1'],
      };

      const result = ConceptMapItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('should validate with minimal required fields', () => {
      const minimalItem = {
        baslik: 'Test',
        odak: 'Odak',
        seviye: 'Uygulama',
        gorsel: null,
      };

      const result = ConceptMapItemSchema.safeParse(minimalItem);
      expect(result.success).toBe(true);
    });

    it('should reject invalid seviye values', () => {
      const invalidItem = {
        baslik: 'Test',
        odak: 'Odak',
        seviye: 'Geçersiz',
        gorsel: null,
      };

      const result = ConceptMapItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidItem = {
        baslik: 'Test',
      };

      const result = ConceptMapItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });
  });

  describe('MultipleChoiceQuestionSchema', () => {
    it('should validate valid multiple choice question', () => {
      const validQuestion = {
        id: 'q1',
        type: 'multiple_choice',
        q: 'Soru metni?',
        o: ['A', 'B', 'C', 'D'],
        a: 1,
        exp: 'Açıklama',
      };

      const result = MultipleChoiceQuestionSchema.safeParse(validQuestion);
      expect(result.success).toBe(true);
    });

    it('should accept valid answer indices', () => {
      // Test valid indices at boundaries
      const validQuestion1 = {
        type: 'multiple_choice',
        q: 'Soru?',
        o: ['A', 'B', 'C', 'D'],
        a: 0, // First option
        exp: 'Açıklama',
      };

      const validQuestion2 = {
        type: 'multiple_choice',
        q: 'Soru?',
        o: ['A', 'B', 'C', 'D'],
        a: 3, // Last option
        exp: 'Açıklama',
      };

      expect(
        MultipleChoiceQuestionSchema.safeParse(validQuestion1).success
      ).toBe(true);
      expect(
        MultipleChoiceQuestionSchema.safeParse(validQuestion2).success
      ).toBe(true);
    });

    it('should reject non-numeric answer', () => {
      const invalidQuestion = {
        type: 'multiple_choice',
        q: 'Soru?',
        o: ['A', 'B', 'C', 'D'],
        a: 'invalid', // Not a number
        exp: 'Açıklama',
      };

      const result = MultipleChoiceQuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const questionWithOptional = {
        type: 'multiple_choice',
        q: 'Soru?',
        o: ['A', 'B'],
        a: 0,
        exp: 'Açıklama',
        img: 1,
        imageUrls: ['url1.jpg'],
        imgPath: 'path/to/img',
        diagnosis: 'Tan',
        insight: 'İçgörü',
        evidence: 'Kanıt',
      };

      const result =
        MultipleChoiceQuestionSchema.safeParse(questionWithOptional);
      expect(result.success).toBe(true);
    });
  });

  describe('TrueFalseQuestionSchema', () => {
    it('should validate valid true/false question', () => {
      const validQuestion = {
        type: 'true_false',
        q: 'Doğru mu yanlış mı?',
        o: ['Doğru', 'Yanlış'],
        a: 1,
        exp: 'Açıklama',
      };

      const result = TrueFalseQuestionSchema.safeParse(validQuestion);
      expect(result.success).toBe(true);
    });

    it('should validate with tuple options', () => {
      const validQuestion = {
        type: 'true_false',
        q: 'Soru?',
        o: ['Evet', 'Hayır'],
        a: 0,
        exp: 'Açıklama',
      };

      const result = TrueFalseQuestionSchema.safeParse(validQuestion);
      expect(result.success).toBe(true);
    });

    it('should reject answer outside 0-1 range', () => {
      const invalidQuestion = {
        type: 'true_false',
        q: 'Soru?',
        o: ['Doğru', 'Yanlış'],
        a: 2, // Invalid
        exp: 'Açıklama',
      };

      const result = TrueFalseQuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
    });

    it('should reject options with wrong length', () => {
      const invalidQuestion = {
        type: 'true_false',
        q: 'Soru?',
        o: ['A', 'B', 'C'], // Should be exactly 2
        a: 0,
        exp: 'Açıklama',
      };

      const result = TrueFalseQuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
    });
  });

  describe('QuizQuestionSchema', () => {
    it('should discriminate multiple choice questions', () => {
      const mcQuestion = {
        type: 'multiple_choice',
        q: 'Soru?',
        o: ['A', 'B', 'C', 'D'],
        a: 2,
        exp: 'Açıklama',
      };

      const result = QuizQuestionSchema.safeParse(mcQuestion);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('multiple_choice');
        expect(Array.isArray(result.data.o)).toBe(true);
      }
    });

    it('should discriminate true/false questions', () => {
      const tfQuestion = {
        type: 'true_false',
        q: 'Soru?',
        o: ['Doğru', 'Yanlış'],
        a: 1,
        exp: 'Açıklama',
      };

      const result = QuizQuestionSchema.safeParse(tfQuestion);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('true_false');
      }
    });

    it('should reject unknown question types', () => {
      const unknownQuestion = {
        type: 'fill_blank',
        q: 'Soru?',
      };

      const result = QuizQuestionSchema.safeParse(unknownQuestion);
      expect(result.success).toBe(false);
    });
  });

  describe('QuestionStatusSchema', () => {
    it('should validate all valid statuses', () => {
      const validStatuses = [
        'active',
        'pending_followup',
        'archived',
        'learning',
      ];

      validStatuses.forEach((status) => {
        const result = QuestionStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const result = QuestionStatusSchema.safeParse('invalid_status');
      expect(result.success).toBe(false);
    });
  });

  describe('ChunkMetadataSchema', () => {
    it('should validate valid metadata', () => {
      const validMetadata = {
        difficulty_index: 3.5,
        concept_map: [
          {
            baslik: 'Konu 1',
            odak: 'Odak 1',
            seviye: 'Bilgi',
            gorsel: null,
          },
        ],
      };

      const result = ChunkMetadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);
    });

    it('should validate empty object', () => {
      const result = ChunkMetadataSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('QuestionRowSchema', () => {
    it('should validate valid row', () => {
      const validRow = {
        id: 'q1',
        chunk_id: 'c1',
        course_id: 'course1',
        parent_question_id: null,
        question_data: { type: 'multiple_choice', q: 'Soru?' },
      };

      const result = QuestionRowSchema.safeParse(validRow);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidRow = {
        id: 'q1',
      };

      const result = QuestionRowSchema.safeParse(invalidRow);
      expect(result.success).toBe(false);
    });
  });

  describe('QuestionWithStatusRowSchema', () => {
    it('should validate valid row with status', () => {
      const validRow = {
        question_id: 'q1',
        status: 'active',
        next_review_session: null,
        questions: {
          id: 'q1',
          chunk_id: 'c1',
          course_id: 'course1',
          parent_question_id: null,
          question_data: { q: 'Soru?' },
        },
      };

      const result = QuestionWithStatusRowSchema.safeParse(validRow);
      expect(result.success).toBe(true);
    });

    it('should validate with next_review_session', () => {
      const validRow = {
        question_id: 'q1',
        status: 'learning',
        next_review_session: 1234567890,
        questions: {
          id: 'q1',
          chunk_id: null,
          course_id: 'course1',
          parent_question_id: 'parent1',
          question_data: null,
        },
      };

      const result = QuestionWithStatusRowSchema.safeParse(validRow);
      expect(result.success).toBe(true);
    });
  });

  describe('FollowUpQuestionRowSchema', () => {
    it('should validate valid follow-up row', () => {
      const validRow = {
        id: 'q1',
        chunk_id: 'c1',
        course_id: 'course1',
        parent_question_id: 'parent1',
        question_data: { q: 'Soru?' },
        user_question_status: [{ status: 'active' }],
      };

      const result = FollowUpQuestionRowSchema.safeParse(validRow);
      expect(result.success).toBe(true);
    });

    it('should validate with empty status array', () => {
      const validRow = {
        id: 'q1',
        chunk_id: null,
        course_id: 'course1',
        parent_question_id: null,
        question_data: {},
        user_question_status: [],
      };

      const result = FollowUpQuestionRowSchema.safeParse(validRow);
      expect(result.success).toBe(true);
    });
  });

  describe('ExchangeRateSchema', () => {
    it('should validate valid exchange rate', () => {
      const validRate = {
        TRY: 35.5,
        EUR: 0.85,
        GBP: 0.75,
      };

      const result = ExchangeRateSchema.safeParse(validRate);
      expect(result.success).toBe(true);
    });

    it('should validate with only TRY', () => {
      const validRate = {
        TRY: 35.5,
      };

      const result = ExchangeRateSchema.safeParse(validRate);
      expect(result.success).toBe(true);
    });

    it('should reject missing TRY', () => {
      const invalidRate = {
        EUR: 0.85,
      };

      const result = ExchangeRateSchema.safeParse(invalidRate);
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric values', () => {
      const invalidRate = {
        TRY: 'invalid',
      };

      const result = ExchangeRateSchema.safeParse(invalidRate);
      expect(result.success).toBe(false);
    });
  });

  describe('ChunkWithContentSchema', () => {
    it('should validate valid chunk', () => {
      const validChunk = {
        id: 'c1',
        course_id: 'course1',
        metadata: { difficulty_index: 3 },
        status: 'active',
        content: 'İçerik metni',
        display_content: 'Görüntüleme içeriği',
        course_name: 'Kurs Adı',
        section_title: 'Bölüm Başlığı',
        ai_logic: { model: 'gpt-4' },
      };

      const result = ChunkWithContentSchema.safeParse(validChunk);
      expect(result.success).toBe(true);
    });

    it('should validate with minimal fields', () => {
      const minimalChunk = {
        id: 'c1',
        course_id: 'course1',
        metadata: null,
        status: 'active',
        content: 'İçerik',
        display_content: null,
        course_name: null,
        section_title: null,
      };

      const result = ChunkWithContentSchema.safeParse(minimalChunk);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidChunk = {
        id: 'c1',
      };

      const result = ChunkWithContentSchema.safeParse(invalidChunk);
      expect(result.success).toBe(false);
    });
  });

  describe('TimelineEventSchema', () => {
    it('should validate valid work event', () => {
      const validEvent = {
        type: 'work',
        start: 1234567890,
        end: 1234567900,
      };

      const result = TimelineEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should validate valid break event', () => {
      const validEvent = {
        type: 'break',
        start: 1234567890,
      };

      const result = TimelineEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should validate pause event with null end', () => {
      const validEvent = {
        type: 'pause',
        start: 1234567890,
        end: null,
      };

      const result = TimelineEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should validate uppercase event types', () => {
      const validEvent = {
        type: 'WORK',
        start: 1234567890,
        end: 1234567900,
      };

      const result = TimelineEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should reject invalid event type', () => {
      const invalidEvent = {
        type: 'invalid',
        start: 1234567890,
      };

      const result = TimelineEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric start time', () => {
      const invalidEvent = {
        type: 'work',
        start: 'invalid',
      };

      const result = TimelineEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });
  });
});
