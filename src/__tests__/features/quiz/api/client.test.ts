import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnifiedLLMClient } from '@/features/quiz/api/client';
import * as Repository from '@/features/quiz/api/repository';
import { rateLimiter } from '@/features/quiz/api/rate-limit';
import { logger } from '@/shared/lib/core/utils/logger';
import { env } from '@/config/env';

// Mock dependencies
vi.mock('@/features/quiz/api/repository');
vi.mock('@/features/quiz/api/rate-limit', () => ({
  rateLimiter: {
    syncHeaders: vi.fn(),
  },
}));
vi.mock('@/shared/lib/core/utils/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    withPrefix: vi.fn().mockImplementation(() => mockLogger),
  };
  return { logger: mockLogger };
});

describe('UnifiedLLMClient', () => {
  const PROXY_URL = `${env.supabase.url}/functions/v1/ai-proxy`;
  const mockAccessToken = 'test-token';
  const mockMessages = [{ role: 'user' as const, content: 'Hello' }];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.mocked(Repository.getCurrentSessionToken).mockResolvedValue(
      mockAccessToken
    );
  });

  describe('Default Model Logic', () => {
    it('should use gemini-2.5-flash for google provider', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          choices: [{ message: { content: 'test' } }],
        }),
      } as Response);

      await UnifiedLLMClient.generate(mockMessages, {
        provider: 'google',
      });

      expect(fetch).toHaveBeenCalledWith(
        PROXY_URL,
        expect.objectContaining({
          body: expect.stringContaining('"model":"gemini-2.5-flash"'),
        })
      );
    });

    it('should use gpt-oss-120b for cerebras provider', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          choices: [{ message: { content: 'test' } }],
        }),
      } as Response);

      await UnifiedLLMClient.generate(mockMessages, {
        provider: 'cerebras',
      });

      expect(fetch).toHaveBeenCalledWith(
        PROXY_URL,
        expect.objectContaining({
          body: expect.stringContaining('"model":"gpt-oss-120b"'),
        })
      );
    });

    it('should use mimo-v2-flash for other providers', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          choices: [{ message: { content: 'test' } }],
        }),
      } as Response);

      // No cast needed as 'mimo' is a valid LLMProvider
      await UnifiedLLMClient.generate(mockMessages, {
        provider: 'mimo',
      });

      expect(fetch).toHaveBeenCalledWith(
        PROXY_URL,
        expect.objectContaining({
          body: expect.stringContaining('"model":"mimo-v2-flash"'),
        })
      );
    });
  });

  describe('Request Deep Inspection', () => {
    it('should send correct Authorization header and body integrity', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          choices: [{ message: { content: 'test' } }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        }),
      } as Response);

      const options = {
        provider: 'google' as const,
        temperature: 0.5,
        maxTokens: 500,
        usageType: 'test-usage',
      };

      await UnifiedLLMClient.generate(mockMessages, { ...options });

      expect(fetch).toHaveBeenCalledWith(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockAccessToken}`,
        },
        body: JSON.stringify({
          provider: 'google',
          model: 'gemini-2.5-flash',
          messages: mockMessages,
          temperature: 0.5,
          max_tokens: 500,
          usage_type: 'test-usage',
        }),
      });
    });
  });

  describe('Authentication Failure', () => {
    it('should throw error when session token is missing', async () => {
      vi.mocked(Repository.getCurrentSessionToken).mockResolvedValue(null);

      await expect(
        UnifiedLLMClient.generate(mockMessages, { provider: 'google' })
      ).rejects.toThrow('Oturum bulunamadı. Lütfen giriş yapın.');
    });
  });

  describe('API Error Handling', () => {
    it('should mask body in onLog callback and sync headers on error', async () => {
      const onLog = vi.fn();
      const mockHeaders = new Headers({ 'x-ratelimit-remaining': '0' });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: mockHeaders,
        text: async () => 'Internal Server Error',
      } as Response);

      await expect(
        UnifiedLLMClient.generate(mockMessages, {
          provider: 'google',
          onLog,
        })
      ).rejects.toThrow('google API Hatası (500): Internal Server Error');

      // Security Masking
      expect(onLog).toHaveBeenCalledWith(
        expect.stringContaining('API hatası'),
        expect.objectContaining({
          body: '[REDACTED FOR SECURITY]',
          status: 500,
        })
      );

      // Rate Limiter Sync even on error
      expect(rateLimiter.syncHeaders).toHaveBeenCalledWith(
        mockHeaders,
        'google'
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Schema Resilience & Successful Response', () => {
    it('should handle missing choices or usage gracefully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({}), // Empty response
      } as Response);

      const result = await UnifiedLLMClient.generate(mockMessages, {
        provider: 'google',
      });

      expect(result.content).toBe('');
      expect(result.usage).toBeUndefined();
    });

    it('should correctly parse successful response and usage', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          choices: [{ message: { content: 'Hello there' } }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
            prompt_tokens_details: { cached_tokens: 5 },
          },
        }),
      } as Response);

      const result = await UnifiedLLMClient.generate(mockMessages, {
        provider: 'google',
      });

      expect(result).toEqual({
        content: 'Hello there',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
          cached_tokens: 5,
        },
      });

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[AI Cache] Hit: 5 tokens')
      );
    });
  });

  describe('Network Crash', () => {
    it('should catch and log network errors', async () => {
      const networkError = new Error('Network failure');
      vi.mocked(fetch).mockRejectedValueOnce(networkError);

      await expect(
        UnifiedLLMClient.generate(mockMessages, { provider: 'google' })
      ).rejects.toThrow('Network failure');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[google] İstek hatası'),
        expect.any(Error)
      );
    });
  });
});
