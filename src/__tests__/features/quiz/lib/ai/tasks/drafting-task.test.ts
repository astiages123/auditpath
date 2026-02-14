import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DraftingTask } from '@/features/quiz/lib/ai/tasks/drafting-task';
import {
  PromptArchitect,
  StructuredGenerator,
} from '@/features/quiz/lib/ai/utils';
import { ConceptMapItem } from '@/features/quiz/core/types';

// Mock dependencies
vi.mock('@/features/quiz/lib/ai/utils', () => ({
  StructuredGenerator: {
    generate: vi.fn(),
  },
  PromptArchitect: {
    assemble: vi.fn(),
  },
}));

vi.mock('@/features/quiz/lib/ai/prompts', () => ({
  GLOBAL_AI_SYSTEM_PROMPT: 'System Prompt',
  buildDraftingTaskPrompt: vi.fn().mockReturnValue('Task Prompt'),
}));

vi.mock('@/features/quiz/lib/engine/strategy', () => ({
  determineNodeStrategy: vi.fn().mockReturnValue({
    bloomLevel: 'application',
  }),
}));

describe('DraftingTask', () => {
  let task: DraftingTask;

  const mockConcept: ConceptMapItem = {
    baslik: 'Test Concept',
    odak: 'Test Focus',
    seviye: 'Uygulama',
    gorsel: null,
  };

  const mockInput = {
    concept: mockConcept,
    index: 0,
    courseName: 'Test Course',
    sharedContextPrompt: 'Context',
  };

  const mockGeneratedQuestion = {
    q: 'Test Question',
    o: ['A', 'B', 'C', 'D', 'E'],
    a: 0,
    exp: 'Explanation',
    evidence: 'Evidence',
    img: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    task = new DraftingTask();
    vi.mocked(PromptArchitect.assemble).mockReturnValue([]);
  });

  it('should return successful result when generator returns data', async () => {
    vi.mocked(StructuredGenerator.generate).mockResolvedValue(
      mockGeneratedQuestion
    );

    const result = await task.run(mockInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        ...mockGeneratedQuestion,
        bloomLevel: 'application', // From mocked strategy
        concept: 'Test Concept',
      });
    }
  });

  it('should return failure result when generator returns null', async () => {
    vi.mocked(StructuredGenerator.generate).mockResolvedValue(null);

    const result = await task.run(mockInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Failed to generate question');
    }
  });

  it('should pass correct parameters to generator', async () => {
    vi.mocked(StructuredGenerator.generate).mockResolvedValue(
      mockGeneratedQuestion
    );

    await task.run({ ...mockInput, usageType: 'deneme' });

    expect(StructuredGenerator.generate).toHaveBeenCalledWith(
      expect.any(Array), // messages
      expect.anything()
    );
  });
});
