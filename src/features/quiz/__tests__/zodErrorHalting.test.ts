import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StructuredGenerator } from '../logic/structuredGenerator';
import { z } from 'zod';
import { UnifiedLLMClient } from '../services/quizInfoService';

vi.mock('../services/quizInfoService', () => ({
  UnifiedLLMClient: {
    generate: vi.fn(),
  },
  rateLimiter: {
    schedule: vi.fn((task) => task()),
  },
}));

vi.mock('@/utils/aiConfig', () => ({
  getTaskConfig: vi.fn().mockReturnValue({
    provider: 'openai',
    model: 'gpt-4',
  }),
}));

describe('StructuredGenerator Early Exit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw an error when throwOnValidationError is true and validation fails', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const invalidResponse = {
      content: JSON.stringify({ name: 'Test', age: 'not-a-number' }), // age is string, invalid
    };

    vi.mocked(UnifiedLLMClient.generate).mockResolvedValue(invalidResponse);

    await expect(
      StructuredGenerator.generate([], {
        schema,
        throwOnValidationError: true,
        maxRetries: 0,
      })
    ).rejects.toThrow(/Zod validation failed/);
  });

  it('should NOT throw an error when throwOnValidationError is false', async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const invalidResponse = {
      content: JSON.stringify({ name: 'Test', age: 'not-a-number' }),
    };

    vi.mocked(UnifiedLLMClient.generate).mockResolvedValue(invalidResponse);

    const result = await StructuredGenerator.generate([], {
      schema,
      throwOnValidationError: false,
      maxRetries: 0,
    });

    expect(result).toBeNull();
  });
});
