import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AnalysisTask,
  AnalysisTaskInput,
} from '@/features/quiz/core/tasks/analysis-task';
import { ConceptMapResponseSchema } from '@/features/quiz/core/schemas';
import { ConceptMapResult } from '@/features/quiz/core/types';
import { ANALYSIS_SYSTEM_PROMPT } from '@/features/quiz/core/prompts';

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

vi.mock('@/features/quiz/core/utils', () => ({
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
} from '@/features/quiz/core/utils';

describe('AnalysisTask', () => {
  let task: AnalysisTask;

  beforeEach(() => {
    vi.clearAllMocks();
    task = new AnalysisTask();
  });

  describe('Prompt Engineering', () => {
    it('should inject courseName into system prompt', () => {
      const courseName = 'Türk Anayasa Hukuku';
      const sectionTitle = 'Temel Kavramlar';
      const importance = 'high';

      const systemPrompt = ANALYSIS_SYSTEM_PROMPT(
        sectionTitle,
        courseName,
        importance
      );

      expect(systemPrompt).toContain(courseName);
    });

    it('should inject sectionTitle into system prompt', () => {
      const courseName = 'İdare Hukuku';
      const sectionTitle = 'İdarenin Hukuki Rejimi';
      const importance = 'medium';

      const systemPrompt = ANALYSIS_SYSTEM_PROMPT(
        sectionTitle,
        courseName,
        importance
      );

      expect(systemPrompt).toContain(sectionTitle);
      expect(systemPrompt).toContain('KPSS A Grubu');
    });

    it('should inject importance level into system prompt', () => {
      const courseName = 'Ceza Hukuku';
      const sectionTitle = 'Suçun Unsurları';
      const importance = 'low';

      const systemPrompt = ANALYSIS_SYSTEM_PROMPT(
        sectionTitle,
        courseName,
        importance
      );

      expect(systemPrompt).toContain(
        `ÖNEM DERECESİ: ${importance.toUpperCase()}`
      );
    });

    it('should use default importance when not provided', () => {
      const systemPrompt = ANALYSIS_SYSTEM_PROMPT(
        'Test Section',
        'Test Course'
      );

      expect(systemPrompt).toContain('ÖNEM DERECESİ: MEDIUM');
    });

    it('should build context prompt from content', () => {
      const content = 'Test content with reference images';
      const contextPrompt = PromptArchitect.buildContext(content);

      expect(contextPrompt).toBeDefined();
      expect(typeof contextPrompt).toBe('string');
    });

    it('should assemble messages with system, context, and task prompts', () => {
      const systemPrompt = 'System prompt';
      const contextPrompt = 'Context prompt';
      const taskPrompt = 'Task prompt';

      const messages = PromptArchitect.assemble(
        systemPrompt,
        contextPrompt,
        taskPrompt
      );

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain(systemPrompt);
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toContain(contextPrompt);
      expect(messages[1].content).toContain(taskPrompt);
    });

    it('should inject importance into final prompt assembly', async () => {
      const contextLogger = vi.fn();
      const input: AnalysisTaskInput = {
        content: 'Metin içeriği burada',
        courseName: 'Maliye',
        sectionTitle: 'Bütçe Türleri',
        importance: 'high',
      };

      vi.mocked(StructuredGenerator.generate).mockResolvedValue({
        difficulty_index: 3,
        concepts: [],
        quotas: { antrenman: 5, arsiv: 2, deneme: 2 },
      });

      await task.run(input, { logger: contextLogger });

      expect(StructuredGenerator.generate).toHaveBeenCalled();
      const generateCall = vi.mocked(StructuredGenerator.generate).mock
        .calls[0];
      const messages = generateCall[0] as Array<{
        role: string;
        content: string;
      }>;
      const userMessage = messages.find((m) => m.role === 'user');

      expect(userMessage?.content).toContain(input.importance);
      expect(userMessage?.content).toContain('Ders Önem Derecesi');
    });
  });

  describe('AI Protocol - Happy Path', () => {
    it('should return success when AI generates valid ConceptMapResult', async () => {
      const mockResult: ConceptMapResult = {
        difficulty_index: 4,
        concepts: [
          {
            baslik: 'Test Concept',
            odak: 'Test focus area',
            seviye: 'Uygulama',
            gorsel: null,
            isException: false,
            prerequisites: [],
          },
        ],
        quotas: {
          antrenman: 10,
          arsiv: 3,
          deneme: 3,
        },
      };

      vi.mocked(StructuredGenerator.generate).mockResolvedValue(mockResult);

      const input: AnalysisTaskInput = {
        content: 'Test content',
        courseName: 'Test Course',
        sectionTitle: 'Test Section',
        importance: 'medium',
      };

      const result = await task.run(input);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(StructuredGenerator.generate).toHaveBeenCalledTimes(1);
    });

    it('should include correct schema in StructuredGenerator call', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue({
        difficulty_index: 2,
        concepts: [],
        quotas: { antrenman: 3, arsiv: 1, deneme: 1 },
      });

      const input: AnalysisTaskInput = {
        content: 'Content',
        courseName: 'Course',
        sectionTitle: 'Section',
        importance: 'low',
      };

      await task.run(input);

      const generateCall = vi.mocked(StructuredGenerator.generate).mock
        .calls[0];
      const options = generateCall[1] as { schema: unknown };

      expect(options.schema).toBe(ConceptMapResponseSchema);
    });

    it('should use correct provider and model in StructuredGenerator call', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue({
        difficulty_index: 2,
        concepts: [],
        quotas: { antrenman: 3, arsiv: 1, deneme: 1 },
      });

      const input: AnalysisTaskInput = {
        content: 'Content',
        courseName: 'Course',
        sectionTitle: 'Section',
        importance: 'low',
      };

      await task.run(input);

      const generateCall = vi.mocked(StructuredGenerator.generate).mock
        .calls[0];
      const options = generateCall[1] as { provider: string; model: string };

      expect(options.provider).toBe('google');
      expect(options.model).toBe('gemini-2.5-flash');
    });
  });

  describe('AI Protocol - Failure Path', () => {
    it('should return failure when AI returns null', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue(null);

      const input: AnalysisTaskInput = {
        content: 'Test content',
        courseName: 'Test Course',
        sectionTitle: 'Test Section',
        importance: 'medium',
      };

      const result = await task.run(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate concept map');
    });

    it('should handle invalid JSON response gracefully', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue(null);

      const input: AnalysisTaskInput = {
        content: 'Test content',
        courseName: 'Test Course',
        sectionTitle: 'Test Section',
        importance: 'medium',
      };

      const result = await task.run(input);

      expect(result.success).toBe(false);
    });
  });

  describe('Zod Schema Validation', () => {
    it('should validate correct ConceptMapResponseSchema', () => {
      const validData = {
        difficulty_index: 3,
        concepts: [
          {
            baslik: 'Test Concept',
            odak: 'Test Focus',
            seviye: 'Bilgi',
            gorsel: null,
          },
        ],
        quotas: {
          antrenman: 5,
          arsiv: 2,
          deneme: 2,
        },
      };

      const result = ConceptMapResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should preprocess and normalize difficulty_index', () => {
      const data = {
        difficulty_index: '3',
        concepts: [
          {
            baslik: 'Test',
            odak: 'Focus',
            seviye: 'Bilgi',
            gorsel: null,
          },
        ],
        quotas: { antrenman: 5, arsiv: 2, deneme: 2 },
      };

      const result = ConceptMapResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.difficulty_index).toBe(3);
      }
    });

    it('should clamp difficulty_index to valid range', () => {
      const data = {
        difficulty_index: 10,
        concepts: [
          {
            baslik: 'Test',
            odak: 'Focus',
            seviye: 'Bilgi',
            gorsel: null,
          },
        ],
        quotas: { antrenman: 5, arsiv: 2, deneme: 2 },
      };

      const result = ConceptMapResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.difficulty_index).toBe(5);
      }
    });

    it('should reject empty concepts array', () => {
      const data = {
        difficulty_index: 3,
        concepts: [],
        quotas: { antrenman: 5, arsiv: 2, deneme: 2 },
      };

      const result = ConceptMapResponseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content string', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue({
        difficulty_index: 1,
        concepts: [],
        quotas: { antrenman: 1, arsiv: 1, deneme: 1 },
      });

      const input: AnalysisTaskInput = {
        content: '',
        courseName: 'Course',
        sectionTitle: 'Section',
        importance: 'low',
      };

      await task.run(input);
      expect(StructuredGenerator.generate).toHaveBeenCalled();
    });

    it('should handle all importance levels', async () => {
      vi.mocked(StructuredGenerator.generate).mockResolvedValue({
        difficulty_index: 2,
        concepts: [],
        quotas: { antrenman: 2, arsiv: 1, deneme: 1 },
      });

      const importanceLevels: Array<'high' | 'medium' | 'low'> = [
        'high',
        'medium',
        'low',
      ];

      for (const importance of importanceLevels) {
        const input: AnalysisTaskInput = {
          content: 'Content',
          courseName: 'Course',
          sectionTitle: 'Section',
          importance,
        };

        await task.run(input);
        expect(StructuredGenerator.generate).toHaveBeenCalled();
      }
    });
  });

  describe('Logging', () => {
    it('should log cognitive analysis start', async () => {
      const contextLogger = vi.fn();
      vi.mocked(StructuredGenerator.generate).mockResolvedValue({
        difficulty_index: 2,
        concepts: [],
        quotas: { antrenman: 2, arsiv: 1, deneme: 1 },
      });

      const input: AnalysisTaskInput = {
        content: 'Content',
        courseName: 'Course',
        sectionTitle: 'Section',
        importance: 'medium',
      };

      await task.run(input, { logger: contextLogger });

      expect(contextLogger).toHaveBeenCalledWith(
        'Bilişsel Analiz Yapılıyor (Öğrenme Doygunluğu)',
        expect.objectContaining({
          course: 'Course',
          section: 'Section',
          importance: 'medium',
        })
      );
    });
  });
});
