import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTimer,
  DebugLogger,
  parseJsonResponse,
  PromptArchitect,
  StructuredGenerator,
} from '@/features/quiz/lib/ai/utils';
import { logger } from '@/shared/lib/core/utils/logger';
import { UnifiedLLMClient } from '@/features/quiz/api/client';
import { rateLimiter } from '@/features/quiz/api/rate-limit';
import { z } from 'zod';
import type { Message } from '@/shared/types/core';

// Mock logger to avoid polluting test output
vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock API modules to avoid loading transitive dependencies like Supabase
vi.mock('@/features/quiz/api/client', () => ({
  UnifiedLLMClient: {
    generate: vi.fn(),
  },
}));

vi.mock('@/features/quiz/api/rate-limit', () => ({
  rateLimiter: {
    schedule: vi.fn((fn) => fn()),
  },
}));

// Mock env
vi.mock('@/config/env', () => ({
  env: {
    app: {
      isDev: true,
    },
    supabase: {
      url: 'https://mock.supabase.co',
      anonKey: 'mock-key',
    },
  },
}));

describe('Quiz Utils', () => {
  describe('createTimer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start and track elapsed time', () => {
      const timer = createTimer();
      timer.start();
      vi.advanceTimersByTime(1000);
      expect(timer.getTime()).toBe(1000);
    });

    it('should stop and return accumulated time', () => {
      const timer = createTimer();
      timer.start();
      vi.advanceTimersByTime(1000);
      const elapsed = timer.stop();
      expect(elapsed).toBe(1000);

      vi.advanceTimersByTime(500);
      expect(timer.getTime()).toBe(1000);
    });

    it('should accumulate time across multiple start/stop cycles', () => {
      const timer = createTimer();
      timer.start();
      vi.advanceTimersByTime(1000);
      timer.stop();

      vi.advanceTimersByTime(500);

      timer.start();
      vi.advanceTimersByTime(1000);
      expect(timer.getTime()).toBe(2000);
    });

    it('should reset the timer', () => {
      const timer = createTimer();
      timer.start();
      vi.advanceTimersByTime(1000);
      timer.stop();

      timer.reset(); // reset starts the timer again at current time
      vi.advanceTimersByTime(500);
      expect(timer.getTime()).toBe(500);
    });

    it('should clear the timer', () => {
      const timer = createTimer();
      timer.start();
      vi.advanceTimersByTime(1000);
      timer.clear();
      expect(timer.getTime()).toBe(0);
    });
  });

  describe('parseJsonResponse', () => {
    it('should parse valid JSON objects', () => {
      const input = '{"key": "value"}';
      expect(parseJsonResponse(input, 'object')).toEqual({
        key: 'value',
      });
    });

    it('should parse valid JSON arrays', () => {
      const input = '[1, 2, 3]';
      expect(parseJsonResponse(input, 'array')).toEqual([1, 2, 3]);
    });

    it('should remove <think> tags', () => {
      const input = '<think>I should return JSON</think>{"key": "value"}';
      expect(parseJsonResponse(input, 'object')).toEqual({
        key: 'value',
      });
    });

    it('should extract JSON from markdown code blocks', () => {
      const input = 'Here is the response: ```json\n{"key": "value"}\n```';
      expect(parseJsonResponse(input, 'object')).toEqual({
        key: 'value',
      });
    });

    it('should handle raw triple backticks', () => {
      const input = '```{"key": "value"}```';
      expect(parseJsonResponse(input, 'object')).toEqual({
        key: 'value',
      });
    });

    it('should fix LaTeX backslashes', () => {
      // In JSON, backslashes need to be escaped. If AI returns single backslash like \frac,
      // parser should fix it to \\frac
      // const input = '{"math": "\\frac{1}{2}"}'; // This is actually valid JSON in string form
      // Let's try one that would fail: {"math": "\frac{1}{2}"} -> where \f is an invalid escape
      // const invalidInput = '{"math": "\\frac{1}{2}"}';
      // Actually, regex in code: const regex = /(\\["\\/nrt]|\\u[0-9a-fA-F]{4})|(\\)/g;
      // It replaces invalid backslashes (not followed by common escape chars) with double backslashes.

      const problematic =
        '{"text": "This is a backslash: \\ and some LaTeX: \\alpha"}';
      const result = parseJsonResponse(problematic, 'object') as Record<
        string,
        unknown
      > | null;
      expect(result?.text).toBe(
        'This is a backslash: \\ and some LaTeX: \\alpha'
      );
    });

    it('should recover from truncated JSON (missing closers)', () => {
      expect(parseJsonResponse('{"key": "value"', 'object')).toEqual({
        key: 'value',
      });
      expect(parseJsonResponse('{"items": [1, 2', 'object')).toEqual({
        items: [1, 2],
      });
      expect(parseJsonResponse('{"key": "val', 'object')).toEqual({
        key: 'val',
      });
    });

    it('should recover truncated arrays', () => {
      expect(parseJsonResponse('[1, 2, {"a": 1}', 'array')).toEqual([
        1,
        2,
        { a: 1 },
      ]);
      expect(parseJsonResponse('[1, 2', 'array')).toEqual([1, 2]);
    });

    it('should return null for invalid inputs', () => {
      expect(parseJsonResponse(null, 'object')).toBeNull();
      expect(parseJsonResponse('', 'object')).toBeNull();
      expect(parseJsonResponse('not a json', 'object')).toBeNull();
    });

    it('should call onLog when no JSON structure is found', () => {
      const onLog = vi.fn();
      parseJsonResponse('just text', 'object', onLog);
      expect(onLog).toHaveBeenCalledWith(
        expect.stringContaining('Geçerli JSON yapısı bulunamadı'),
        expect.any(Object)
      );
    });

    it('should log warning for unrecoverable malformed JSON', () => {
      // "{"key": "value", "key2": " is broken and adding } or ] won't fix it because it expects value for key2
      const input = '{"key": "value", "key2": ';
      const result = parseJsonResponse(input, 'object');
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('JSON Parse Error (Unrecoverable)'),
        expect.any(Object)
      );
    });

    it('should handle critical errors during parsing', () => {
      // Force an error in the inner logic to trigger outer catch
      // We can make logger.warn throw, which is called when unrecoverable
      vi.mocked(logger.warn).mockImplementationOnce(() => {
        throw new Error('Logger failed');
      });

      const input = '{"key": "value", "key2": ';
      const result = parseJsonResponse(input, 'object');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('JSON Parse Error (Critical)'),
        expect.any(Object)
      );
    });
  });

  describe('PromptArchitect', () => {
    it('should assemble messages correctly', () => {
      const messages = PromptArchitect.assemble('System', 'Context', 'Task');
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({ role: 'system', content: 'System' });
      expect(messages[1].content).toContain('Context');
      expect(messages[1].content).toContain('--- GÖREV ---');
      expect(messages[1].content).toContain('Task');
    });

    it('should build context with headers', () => {
      const context = PromptArchitect.buildContext(
        'Content',
        'History',
        'Introduction'
      );
      expect(context).toContain('## DERS: History');
      expect(context).toContain('## KONU: Introduction');
      expect(context).toContain('## BAĞLAM METNİ:');
      expect(context).toContain('Content');
    });

    it('should include guidelines in context if provided', () => {
      const guidelines = {
        instruction: 'Rules here',
        few_shot_example: { example: 'good' },
        bad_few_shot_example: { example: 'bad' },
      };
      const context = PromptArchitect.buildContext(
        'Content',
        undefined,
        undefined,
        guidelines
      );
      expect(context).toContain('## DERS REHBERİ VE KURALLAR:');
      expect(context).toContain('Rules here');
      expect(context).toContain('İYİ ÖRNEK');
      expect(context).toContain('KÖTÜ ÖRNEK');
    });

    it('should clean reference images', () => {
      const content =
        'Text with image ![Alt](image.png) and another ![test](foo.jpg)';
      const cleaned = PromptArchitect.cleanReferenceImages(content);
      expect(cleaned).toBe('Text with image [GÖRSEL] and another [GÖRSEL]');
    });
  });

  describe('DebugLogger', () => {
    let consoleSpy: {
      groupCollapsed: ReturnType<typeof vi.spyOn>;
      groupEnd: ReturnType<typeof vi.spyOn>;
      log: ReturnType<typeof vi.spyOn>;
      table: ReturnType<typeof vi.spyOn>;
    };

    beforeEach(() => {
      consoleSpy = {
        groupCollapsed: vi
          .spyOn(console, 'groupCollapsed')
          .mockImplementation(() => {}),
        groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
        log: vi.spyOn(console, 'log').mockImplementation(() => {}),
        table: vi.spyOn(console, 'table').mockImplementation(() => {}),
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should log when enabled', () => {
      DebugLogger.group('Test Group', { info: 'test' });
      expect(consoleSpy.groupCollapsed).toHaveBeenCalled();

      DebugLogger.input('Input message');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('INPUT'),
        expect.any(String)
      );

      DebugLogger.groupEnd();
      expect(consoleSpy.groupEnd).toHaveBeenCalled();
    });

    it('should log errors via common logger', () => {
      DebugLogger.error('Failed', new Error('fail'));
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed'),
        expect.any(Object)
      );
    });
  });

  describe('StructuredGenerator', () => {
    const mockSchema = z.object({ success: z.boolean() });
    const mockMessages: Message[] = [{ role: 'user', content: 'hello' }];

    beforeEach(() => {
      vi.mocked(UnifiedLLMClient.generate).mockReset();
      vi.mocked(rateLimiter.schedule).mockImplementation((fn) => fn());
    });

    it('successfully generates and validates data', async () => {
      const mockResult = {
        content: '{"success": true}',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      };
      vi.mocked(UnifiedLLMClient.generate).mockResolvedValue(mockResult);

      const result = await StructuredGenerator.generate(mockMessages, {
        schema: mockSchema,
        provider: 'cerebras',
      });

      expect(result).toEqual({ success: true });
      expect(UnifiedLLMClient.generate).toHaveBeenCalledTimes(1);
    });

    it('retries on parse failure', async () => {
      const onLog = vi.fn();
      vi.mocked(UnifiedLLMClient.generate)
        .mockResolvedValueOnce({
          content: 'invalid json',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        })
        .mockResolvedValueOnce({
          content: '{"success": true}',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        });

      const result = await StructuredGenerator.generate(mockMessages, {
        schema: mockSchema,
        provider: 'cerebras',
        onLog,
      });

      expect(result).toEqual({ success: true });
      expect(UnifiedLLMClient.generate).toHaveBeenCalledTimes(2);
      expect(onLog).toHaveBeenCalledWith(
        expect.stringContaining('Retry denemesi #1...')
      );
    });

    it('retries on validation failure', async () => {
      vi.mocked(UnifiedLLMClient.generate)
        .mockResolvedValueOnce({
          content: '{"wrong": "field"}',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        })
        .mockResolvedValueOnce({
          content: '{"success": true}',
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        });

      const result = await StructuredGenerator.generate(mockMessages, {
        schema: mockSchema,
        provider: 'cerebras',
      });

      expect(result).toEqual({ success: true });
      expect(UnifiedLLMClient.generate).toHaveBeenCalledTimes(2);
    });

    it('returns null after maximum retries', async () => {
      vi.mocked(UnifiedLLMClient.generate).mockResolvedValue({
        content: 'invalid',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      });

      const result = await StructuredGenerator.generate(mockMessages, {
        schema: mockSchema,
        provider: 'cerebras',
        maxRetries: 1,
      });

      expect(result).toBeNull();
      expect(UnifiedLLMClient.generate).toHaveBeenCalledTimes(2);
    });
    it('logs cache stats if available', async () => {
      const onLog = vi.fn();
      const mockResult = {
        content: '{"success": true}',
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 150,
          prompt_cache_hit_tokens: 100,
          prompt_cache_miss_tokens: 50,
        },
      };
      vi.mocked(UnifiedLLMClient.generate).mockResolvedValue(mockResult);

      await StructuredGenerator.generate(mockMessages, {
        schema: mockSchema,
        provider: 'cerebras',
        onLog,
      });

      expect(onLog).toHaveBeenCalledWith(
        'Cache Stats',
        expect.objectContaining({
          hits: 100,
          misses: 50,
          total: 150,
        })
      );
    });
  });
});
