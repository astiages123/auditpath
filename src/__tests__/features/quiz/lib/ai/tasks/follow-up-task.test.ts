import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FollowUpTask } from '@/features/quiz/lib/ai/tasks/follow-up-task';
import {
  PromptArchitect,
  StructuredGenerator,
} from '@/features/quiz/lib/ai/utils';
import * as Repository from '@/features/quiz/api/repository';
import { GeneratedQuestion } from '@/features/quiz/core/types';

// Mock dependencies
vi.mock('@/features/quiz/lib/ai/utils', () => ({
  StructuredGenerator: {
    generate: vi.fn(),
  },
  PromptArchitect: {
    assemble: vi.fn(),
    buildContext: vi.fn(),
    cleanReferenceImages: vi.fn(),
  },
}));

vi.mock('@/features/quiz/lib/ai/prompts', () => ({
  GLOBAL_AI_SYSTEM_PROMPT: 'System Prompt',
  buildFollowUpTaskPrompt: vi.fn().mockReturnValue('Task Prompt'),
}));

vi.mock('@/features/quiz/api/repository', () => ({
  getUserQuestionStatus: vi.fn(),
  getRecentDiagnoses: vi.fn(),
}));

describe('FollowUpTask', () => {
  let task: FollowUpTask;

  const mockContext = {
    chunkId: 'chunk-1',
    originalQuestion: {
      id: 'q-1',
      q: 'Original Q',
      o: ['A', 'B'],
      a: 0,
      exp: 'Exp',
      evidence: 'Evidence',
      bloomLevel: 'analysis',
      concept: 'Concept',
      img: null,
    },
    incorrectOptionIndex: 1,
    correctOptionIndex: 0,
    courseId: 'course-1',
    userId: 'user-1',
  };

  const mockInput = {
    context: mockContext,
    evidence: 'Evidence',
    chunkContent: 'Content',
    courseName: 'Course',
    sectionTitle: 'Section',
    guidelines: {},
  };

  const mockGeneratedQuestion: GeneratedQuestion = {
    q: 'Follow Up Q',
    o: ['A', 'B'],
    a: 0,
    exp: 'Exp',
    evidence: 'Evidence',
    bloomLevel: 'analysis',
    concept: 'Concept',
    img: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    task = new FollowUpTask();
    vi.mocked(PromptArchitect.assemble).mockReturnValue([
      {
        role: 'user',
        content: 'test',
      },
    ]);
  });

  it('should generate follow-up question successfully', async () => {
    vi.mocked(Repository.getUserQuestionStatus).mockResolvedValue(null);
    vi.mocked(StructuredGenerator.generate).mockResolvedValue(
      mockGeneratedQuestion
    );

    const result = await task.run(mockInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data!.bloomLevel).toBe('analysis');
    }
  });

  it('should apply scaffolding when consecutive fails >= 2', async () => {
    vi.mocked(Repository.getUserQuestionStatus).mockResolvedValue({
      consecutive_fails: 2,
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    vi.mocked(StructuredGenerator.generate).mockResolvedValue(
      mockGeneratedQuestion
    );

    const result = await task.run(mockInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data!.bloomLevel).toBe('application'); // Dropped from analysis
    }
  });

  it('should NOT apply scaffolding when consecutive fails < 2', async () => {
    vi.mocked(Repository.getUserQuestionStatus).mockResolvedValue({
      consecutive_fails: 1,
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    vi.mocked(StructuredGenerator.generate).mockResolvedValue(
      mockGeneratedQuestion
    );

    const result = await task.run(mockInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data!.bloomLevel).toBe('analysis'); // Kept original
    }
  });

  it('should handle repository errors gracefully', async () => {
    vi.mocked(Repository.getUserQuestionStatus).mockRejectedValue(
      new Error('DB Error')
    );

    // It should probably throw or return failure, depending on implementation.
    // Looking at the code, it fails uncaught if repository throws.
    // But since the user wants unit tests for existing code, I should expect it to fail if the code doesn't handle it,
    // OR if the code is expected to bubble up error.
    // The BaseTask might handle it? checking BaseTask...
    // Actually the code doesn't wrap Repository calls in try-catch in run(), so it will throw.
    await expect(task.run(mockInput)).rejects.toThrow('DB Error');
  });

  it('should return failure result when generator returns null', async () => {
    vi.mocked(Repository.getUserQuestionStatus).mockResolvedValue(null);
    vi.mocked(StructuredGenerator.generate).mockResolvedValue(null);

    const result = await task.run(mockInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Follow-up generation failed');
    }
  });
});
