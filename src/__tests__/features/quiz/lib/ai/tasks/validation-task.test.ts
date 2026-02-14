import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ValidationTask,
  ValidationTaskInput,
  QuestionToValidate,
} from '@/features/quiz/lib/ai/tasks/validation-task';
import {
  ValidationResultSchema,
  ValidationResult,
} from '@/features/quiz/lib/ai/schemas';
import {
  buildValidationTaskPrompt,
  VALIDATION_SYSTEM_PROMPT,
} from '@/features/quiz/lib/ai/prompts';

vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    withPrefix: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

vi.mock('@/features/quiz/lib/ai/utils', () => ({
  PromptArchitect: {
    buildContext: vi.fn((content: string) => `Context: ${content}`),
    cleanReferenceImages: vi.fn((content: string) => content),
    assemble: vi.fn((system: string, context: string, task: string) => [
      { role: 'system', content: system },
      { role: 'user', content: `${context}\n\n--- GÖREV ---\n${task}` },
    ]),
    normalizeText: vi.fn((text: string) => text),
  },
  StructuredGenerator: {
    generate: vi.fn(),
  },
}));

import {
  StructuredGenerator,
  PromptArchitect,
} from '@/features/quiz/lib/ai/utils';

describe('ValidationTask', () => {
  let task: ValidationTask;

  beforeEach(() => {
    vi.clearAllMocks();
    task = new ValidationTask();
  });

  describe('Prompt Engineering', () => {
    it('should inject question text into validation prompt', () => {
      const question: QuestionToValidate = {
        q: 'Türk Anayasası kaç yılında kabul edilmiştir?',
        o: ['1921', '1924', '1928', '1931', '1935'],
        a: 1,
        exp: 'Türk Anayasası 1924 yılında kabul edilmiştir.',
      };

      const prompt = buildValidationTaskPrompt(question);

      expect(prompt).toContain(question.q);
    });

    it('should inject all options into validation prompt', () => {
      const options = ['1921', '1924', '1928', '1931', '1935'];
      const question: QuestionToValidate = {
        q: 'Soru',
        o: options,
        a: 1,
        exp: 'Açıklama',
      };

      const prompt = buildValidationTaskPrompt(question);

      options.forEach((opt) => {
        expect(prompt).toContain(opt);
      });
    });

    it('should inject correct answer index as letter', () => {
      const question: QuestionToValidate = {
        q: 'Soru',
        o: ['A', 'B', 'C', 'D', 'E'],
        a: 2,
        exp: 'Explanation',
      };

      const prompt = buildValidationTaskPrompt(question);

      expect(prompt).toContain('**Doğru Cevap:** C');
    });

    it('should inject explanation into validation prompt', () => {
      const explanation = 'Türk Anayasası 1924 yılında kabul edilmiştir.';
      const question: QuestionToValidate = {
        q: 'Soru',
        o: ['A', 'B', 'C', 'D', 'E'],
        a: 0,
        exp: explanation,
      };

      const prompt = buildValidationTaskPrompt(question);

      expect(prompt).toContain(explanation);
    });

    it('should include validation system prompt', () => {
      expect(VALIDATION_SYSTEM_PROMPT).toContain('AuditPath');
      expect(VALIDATION_SYSTEM_PROMPT).toContain('Güvenlik ve Doğruluk');
    });

    it('should build context prompt from content', () => {
      const content = 'Metin içeriği';
      const contextPrompt = PromptArchitect.buildContext(content);

      expect(contextPrompt).toBeDefined();
    });

    it('should assemble messages with all prompt components', async () => {
      const question: QuestionToValidate = {
        q: 'Test Question',
        o: ['A', 'B', 'C', 'D', 'E'],
        a: 0,
        exp: 'Explanation',
      };

      vi.mocked(StructuredGenerator.generate).mockResolvedValue({
        total_score: 80,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      });

      const input: ValidationTaskInput = {
        question,
        content: 'Context content',
      };

      await task.run(input);

      const generateCall = vi.mocked(StructuredGenerator.generate).mock
        .calls[0];
      const messages = generateCall[0] as Array<{
        role: string;
        content: string;
      }>;
      const systemMessage = messages.find((m) => m.role === 'system');
      const userMessage = messages.find((m) => m.role === 'user');

      expect(systemMessage?.content).toContain('AuditPath');
      expect(userMessage?.content).toContain('Test Question');
      expect(userMessage?.content).toContain('A) A');
    });
  });

  describe('AI Protocol - Happy Path', () => {
    it('should return success when AI approves question', async () => {
      const mockResult: ValidationResult = {
        total_score: 85,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      };

      vi.mocked(StructuredGenerator.generate).mockResolvedValue(mockResult);

      const input: ValidationTaskInput = {
        question: {
          q: 'Test Question',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Explanation',
        },
        content: 'Context',
      };

      const result = await task.run(input);

      expect(result.success).toBe(true);
      expect(result.data?.decision).toBe('APPROVED');
    });

    it('should return success when AI rejects question', async () => {
      const mockResult: ValidationResult = {
        total_score: 45,
        decision: 'REJECTED',
        critical_faults: ['Bilimsel hata'],
        improvement_suggestion: 'Düzeltme önerisi',
      };

      vi.mocked(StructuredGenerator.generate).mockResolvedValue(mockResult);

      const input: ValidationTaskInput = {
        question: {
          q: 'Test Question',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Explanation',
        },
        content: 'Context',
      };

      const result = await task.run(input);

      expect(result.success).toBe(true);
      expect(result.data?.decision).toBe('REJECTED');
      expect(result.data?.critical_faults).toEqual(['Bilimsel hata']);
    });

    it('should include correct schema in StructuredGenerator call', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue({
        total_score: 80,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      });

      const input: ValidationTaskInput = {
        question: {
          q: 'Soru',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Açıklama',
        },
        content: 'İçerik',
      };

      await task.run(input);

      const generateCall = vi.mocked(StructuredGenerator.generate).mock
        .calls[0];
      const options = generateCall[1] as { schema: unknown };

      expect(options.schema).toBe(ValidationResultSchema);
    });

    it('should use cerebras provider', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue({
        total_score: 80,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      });

      const input: ValidationTaskInput = {
        question: {
          q: 'Soru',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Açıklama',
        },
        content: 'İçerik',
      };

      await task.run(input);

      const generateCall = vi.mocked(StructuredGenerator.generate).mock
        .calls[0];
      const options = generateCall[1] as { provider: string };

      expect(options.provider).toBe('cerebras');
    });
  });

  describe('AI Protocol - Failure Path', () => {
    it('should return failure when AI returns null', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue(null);

      const input: ValidationTaskInput = {
        question: {
          q: 'Test Question',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Explanation',
        },
        content: 'Context',
      };

      const result = await task.run(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    it('should handle invalid JSON response', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue(null);

      const input: ValidationTaskInput = {
        question: {
          q: 'Soru',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Açıklama',
        },
        content: 'İçerik',
      };

      const result = await task.run(input);
      expect(result.success).toBe(false);
    });

    it('should return failure when AI returns null', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue(null);

      const input: ValidationTaskInput = {
        question: {
          q: 'Test Question',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Explanation',
        },
        content: 'Context',
      };

      const result = await task.run(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });
  });

  describe('Sanity Check - Score/Decision Consistency', () => {
    it('should override REJECTED to APPROVED when score >= 70', async () => {
      const mockResult: ValidationResult = {
        total_score: 85,
        decision: 'REJECTED',
        critical_faults: ['Some fault'],
        improvement_suggestion: 'Some suggestion',
      };

      vi.mocked(StructuredGenerator.generate).mockResolvedValue(mockResult);

      const input: ValidationTaskInput = {
        question: {
          q: 'Soru',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Açıklama',
        },
        content: 'İçerik',
      };

      const result = await task.run(input);

      expect(result.data?.decision).toBe('APPROVED');
      expect(result.data?.critical_faults).toEqual([]);
      expect(result.data?.improvement_suggestion).toBe('');
    });

    it('should override APPROVED to REJECTED when score < 70', async () => {
      const mockResult: ValidationResult = {
        total_score: 50,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      };

      vi.mocked(StructuredGenerator.generate).mockResolvedValue(mockResult);

      const input: ValidationTaskInput = {
        question: {
          q: 'Soru',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Açıklama',
        },
        content: 'İçerik',
      };

      const result = await task.run(input);

      expect(result.data?.decision).toBe('REJECTED');
    });

    it('should handle exactly 70 score with REJECTED decision', async () => {
      const mockResult: ValidationResult = {
        total_score: 70,
        decision: 'REJECTED',
        critical_faults: ['Fault'],
        improvement_suggestion: 'Suggestion',
      };

      vi.mocked(StructuredGenerator.generate).mockResolvedValue(mockResult);

      const input: ValidationTaskInput = {
        question: {
          q: 'Soru',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Açıklama',
        },
        content: 'İçerik',
      };

      const result = await task.run(input);

      expect(result.data?.decision).toBe('APPROVED');
    });

    it('should handle exactly 69 score with APPROVED decision', async () => {
      const mockResult: ValidationResult = {
        total_score: 69,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      };

      vi.mocked(StructuredGenerator.generate).mockResolvedValue(mockResult);

      const input: ValidationTaskInput = {
        question: {
          q: 'Soru',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Açıklama',
        },
        content: 'İçerik',
      };

      const result = await task.run(input);

      expect(result.data?.decision).toBe('REJECTED');
    });
  });

  describe('Zod Schema Validation', () => {
    it('should validate correct ValidationResultSchema', () => {
      const validData = {
        total_score: 80,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      };

      const result = ValidationResultSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should preprocess mixed-case decision APPROVED', () => {
      const data = {
        total_score: 85,
        decision: 'approved',
        critical_faults: [],
        improvement_suggestion: '',
      };

      const result = ValidationResultSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.decision).toBe('APPROVED');
      }
    });

    it('should preprocess mixed-case decision REJECTED', () => {
      const data = {
        total_score: 40,
        decision: 'rejected',
        critical_faults: ['error'],
        improvement_suggestion: 'fix',
      };

      const result = ValidationResultSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.decision).toBe('REJECTED');
      }
    });

    it('should handle Turkish decision texts', () => {
      const approvedData = {
        total_score: 80,
        decision: 'ONAY',
        critical_faults: [],
        improvement_suggestion: '',
      };

      const rejectedData = {
        total_score: 40,
        decision: 'RED',
        critical_faults: ['hata'],
        improvement_suggestion: 'öneri',
      };

      expect(ValidationResultSchema.safeParse(approvedData).success).toBe(true);
      expect(ValidationResultSchema.safeParse(rejectedData).success).toBe(true);
    });

    it('should coerce total_score from string', () => {
      const data = {
        total_score: '85',
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      };

      const result = ValidationResultSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_score).toBe(85);
      }
    });

    it('should handle alternative score field names', () => {
      const dataWithScore = {
        score: 75,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      };

      const dataWithPuan = {
        puan: 80,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      };

      expect(ValidationResultSchema.safeParse(dataWithScore).success).toBe(
        true
      );
      expect(ValidationResultSchema.safeParse(dataWithPuan).success).toBe(true);
    });

    it('should default critical_faults to empty array', () => {
      const data = {
        total_score: 90,
        decision: 'APPROVED',
      };

      const result = ValidationResultSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.critical_faults).toEqual([]);
      }
    });

    it('should default improvement_suggestion to empty string', () => {
      const data = {
        total_score: 90,
        decision: 'APPROVED',
      };

      const result = ValidationResultSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.improvement_suggestion).toBe('');
      }
    });

    it('should reject invalid decision value', () => {
      const data = {
        total_score: 80,
        decision: 'INVALID',
        critical_faults: [],
        improvement_suggestion: '',
      };

      const result = ValidationResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject total_score outside 0-100 range', () => {
      const data = {
        total_score: 150,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      };

      const result = ValidationResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle question with optional bloomLevel', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue({
        total_score: 80,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      });

      const input: ValidationTaskInput = {
        question: {
          q: 'Soru',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Açıklama',
          bloomLevel: 'analysis',
        },
        content: 'İçerik',
      };

      const result = await task.run(input);
      expect(result.success).toBe(true);
    });

    it('should handle question with optional img', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue({
        total_score: 80,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      });

      const input: ValidationTaskInput = {
        question: {
          q: 'Soru',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Açıklama',
          img: 2,
        },
        content: 'İçerik',
      };

      const result = await task.run(input);
      expect(result.success).toBe(true);
    });

    it('should handle empty content', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue({
        total_score: 80,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      });

      const input: ValidationTaskInput = {
        question: {
          q: 'Soru',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Açıklama',
        },
        content: '',
      };

      await task.run(input);
      expect(StructuredGenerator.generate).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log validation start', async () => {
      const contextLogger = vi.fn();
      vi.mocked(StructuredGenerator.generate).mockResolvedValue({
        total_score: 80,
        decision: 'APPROVED',
        critical_faults: [],
        improvement_suggestion: '',
      });

      const input: ValidationTaskInput = {
        question: {
          q: 'Soru',
          o: ['A', 'B', 'C', 'D', 'E'],
          a: 0,
          exp: 'Açıklama',
        },
        content: 'İçerik',
      };

      await task.run(input, { logger: contextLogger });

      expect(contextLogger).toHaveBeenCalledWith(
        'Validating question...',
        undefined
      );
    });
  });
});
