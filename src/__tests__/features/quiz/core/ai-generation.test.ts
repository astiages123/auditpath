import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConceptMapSchema,
  GeneratedQuestionSchema,
  ValidationResult,
  ValidationResultSchema,
} from '@/features/quiz/core/schemas';
import { buildDraftingTaskPrompt } from '@/features/quiz/core/prompts';
import { ValidationTask } from '@/features/quiz/core/tasks/validation-task';
import { StructuredGenerator } from '@/features/quiz/core/utils';
import type { ConceptMapItem } from '@/features/quiz/core/types';

// Mock StructuredGenerator
vi.mock('@/features/quiz/core/utils', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/quiz/core/utils')>();
  return {
    ...actual,
    StructuredGenerator: {
      generate: vi.fn(),
    },
  };
});

describe('AI Generation Logic & Schema Validation', () => {
  describe('Schema Validation (Zod)', () => {
    it('should validate a correct question object', () => {
      const validQuestion = {
        q: 'Valid Question Text with enough length',
        o: ['Option A', 'Option B', 'Option C', 'Option D', 'Option E'],
        a: 0,
        exp: 'Valid explanation text with enough length',
        evidence: 'Valid evidence text',
        img: null,
      };

      const result = GeneratedQuestionSchema.safeParse(validQuestion);
      expect(result.success).toBe(true);
    });

    it('should strict fail if options array length is not 5', () => {
      const invalidQuestion = {
        q: 'Valid Question Text with enough length',
        o: ['Option A', 'Option B', 'Option C'], // Only 3 options
        a: 0,
        exp: 'Valid explanation text with enough length',
        evidence: 'Valid evidence text',
        img: null,
      };
      const result = GeneratedQuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Tam olarak 5 seçenek olmalı'
        );
      }
    });

    it('should handle mixed case decision in ValidationResultSchema preprocess', () => {
      const rawAiResponse = {
        total_score: 85,
        decision: 'Approved with minor edits', // Dirty input
        critical_faults: [],
        improvement_suggestion: '',
      };

      const result = ValidationResultSchema.safeParse(rawAiResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.decision).toBe('APPROVED');
      }
    });

    it('should reject invalid Zod schemas with short text', () => {
      const shortQuestion = {
        q: 'Short',
        o: ['A', 'B', 'C', 'D', 'E'],
        a: 0,
        exp: 'Short',
        evidence: 'Ev',
        img: null,
      };
      const result = GeneratedQuestionSchema.safeParse(shortQuestion);
      expect(result.success).toBe(false);
    });
  });

  describe('Prompt Generation', () => {
    it('should include concept title and focus in Drafting Task Prompt', () => {
      const concept: ConceptMapItem = {
        baslik: 'Test Concept',
        odak: 'Test Focus',
        seviye: 'Bilgi',
        gorsel: null,
      };
      const strategy = {
        bloomLevel: 'knowledge',
        instruction: 'Test Instruction',
      };

      const prompt = buildDraftingTaskPrompt(concept, strategy);

      expect(prompt).toContain('Test Concept');
      expect(prompt).toContain('Test Focus');
      expect(prompt).toContain('Test Instruction');
    });

    it('should include previous diagnoses if provided', () => {
      const concept: ConceptMapItem = {
        baslik: 'Test Concept',
        odak: 'Test Focus',
        seviye: 'Bilgi',
        gorsel: null,
      };
      const strategy = {
        bloomLevel: 'knowledge',
        instruction: 'Test Instruction',
      };
      const diagnoses = ['User confuses A with B'];

      const prompt = buildDraftingTaskPrompt(
        concept,
        strategy,
        'antrenman',
        diagnoses
      );
      expect(prompt).toContain('KULLANICININ GEÇMİŞ HATALARI');
      expect(prompt).toContain('User confuses A with B');
    });
  });

  describe('Task Chain Logic (ValidationTask)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return success when AI approves the question', async () => {
      const mockResult: ValidationResult = {
        total_score: 80,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      };

      vi.mocked(StructuredGenerator.generate).mockResolvedValue(mockResult);

      const task = new ValidationTask();
      const input = {
        question: {
          q: 'Test Question',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Explanation',
          evidence: 'Evidence',
        },
        content: 'Context Content',
      };

      const result = await task.run(input);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(StructuredGenerator.generate).toHaveBeenCalledTimes(1);
    });

    it('should return success even if AI rejects (it is a valid task result)', async () => {
      const mockResult: ValidationResult = {
        total_score: 40,
        decision: 'REJECTED',
        critical_faults: ['Logic error'],
        improvement_suggestion: 'Fix logic',
      };

      vi.mocked(StructuredGenerator.generate).mockResolvedValue(mockResult);

      const task = new ValidationTask();
      const input = {
        question: {
          q: 'Bad Question',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Explanation',
          evidence: 'Evidence',
        },
        content: 'Context Content',
      };

      const result = await task.run(input);

      // The task itself runs successfully, but the data indicates rejection
      expect(result.success).toBe(true);
      expect(result.data?.decision).toBe('REJECTED');
    });

    it('should handle null response from Generator', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue(null);

      const task = new ValidationTask();
      const input = {
        question: {
          q: 'Test Question',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Explanation',
          evidence: 'Evidence',
        },
        content: 'Context Content',
      };

      const result = await task.run(input);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });
  });

  describe('Bloom Level Consistency (ConceptMapSchema)', () => {
    it('should correct normalize mixed-case bloom levels', () => {
      const validLevels = [
        { input: 'Bilgi', expected: 'Bilgi' },
        { input: 'uygulama', expected: 'Uygulama' },
        { input: 'APPLY', expected: 'Uygulama' },
        { input: 'Analyze', expected: 'Analiz' },
        { input: 'sentez', expected: 'Bilgi' }, // Fallback default
      ];

      validLevels.forEach(({ input, expected }) => {
        // Create a minimal valid object
        const raw = {
          baslik: 'Test',
          seviye: input,
        };
        const result = ConceptMapSchema.safeParse(raw);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.seviye).toBe(expected);
        }
      });
    });
  });
});
