import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const mocks = vi.hoisted(() => ({
  llmGenerate: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('@/features/quiz/services/quizInfoService', () => ({
  UnifiedLLMClient: {
    generate: mocks.llmGenerate,
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: mocks.loggerError,
  },
}));

import { generate } from '@/features/quiz/logic/structuredGenerator';

describe('structuredGenerator auth davranisi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AUTH_INVALID_JWT gelince retry yapmadan sessizce durur', async () => {
    mocks.llmGenerate.mockResolvedValue({
      content: null,
      errorCode: 'AUTH_INVALID_JWT',
    });

    const onLog = vi.fn();

    const result = await generate([{ role: 'user', content: 'test' }], {
      schema: z.object({ ok: z.boolean() }),
      maxRetries: 2,
      onLog,
    });

    expect(result).toBeNull();
    expect(mocks.llmGenerate).toHaveBeenCalledTimes(1);
    expect(
      onLog.mock.calls.some((call) =>
        String(call[0]).includes(
          'Oturum doğrulama hatası nedeniyle üretim durduruldu'
        )
      )
    ).toBe(true);
    expect(mocks.loggerError).not.toHaveBeenCalled();
  });
});
