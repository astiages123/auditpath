import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RevisionTask } from '@/features/quiz/lib/ai/tasks/revision-task';
import {
  PromptArchitect,
  StructuredGenerator,
} from '@/features/quiz/lib/ai/utils';
import { GeneratedQuestion } from '@/features/quiz/core/types';
import { ValidationResult } from '@/features/quiz/lib/ai/schemas';

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
}));

describe('RevisionTask', () => {
  let task: RevisionTask;

  const mockOriginalQuestion: GeneratedQuestion = {
    q: 'Bad Question',
    o: ['A', 'B', 'C', 'D', 'E'],
    a: 0,
    exp: 'Explanation',
    evidence: 'Evidence',
    bloomLevel: 'application',
    concept: 'Test Concept',
    img: null,
  };

  const mockValidationResult: ValidationResult = {
    decision: 'REJECTED',
    critical_faults: ['Error 1', 'Error 2'],
    improvement_suggestion: 'Fix it',
    total_score: 0,
  };

  const mockInput = {
    originalQuestion: mockOriginalQuestion,
    validationResult: mockValidationResult,
    sharedContextPrompt: 'Context',
  };

  const mockRevisedQuestion = {
    ...mockOriginalQuestion,
    q: 'Good Question',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    task = new RevisionTask();
    vi.mocked(PromptArchitect.assemble).mockReturnValue([]);
  });

  it('should return successful result with revised question', async () => {
    vi.mocked(StructuredGenerator.generate).mockResolvedValue(
      mockRevisedQuestion
    );

    const result = await task.run(mockInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockRevisedQuestion);
      expect(result.data!.bloomLevel).toBe(mockOriginalQuestion.bloomLevel);
    }
  });

  it('should return failure result when generator returns null', async () => {
    vi.mocked(StructuredGenerator.generate).mockResolvedValue(null);

    const result = await task.run(mockInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Revision failed');
    }
  });

  it('should include rejection reasons in the prompt', async () => {
    vi.mocked(StructuredGenerator.generate).mockResolvedValue(
      mockRevisedQuestion
    );

    await task.run(mockInput);

    expect(StructuredGenerator.generate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.anything()
    );
  });
});
