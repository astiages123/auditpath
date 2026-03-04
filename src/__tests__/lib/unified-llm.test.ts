import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      refreshSession: mocks.refreshSession,
    },
  },
}));

vi.mock('@/utils/env', () => ({
  env: {
    supabase: {
      url: 'https://example-project.supabase.co',
      anonKey: 'sb_publishable_test_key',
    },
    app: {
      isDev: true,
      isProd: false,
      env: 'test',
      siteUrl: 'http://localhost:5173',
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
  },
}));

import { __unifiedLlmTestUtils, UnifiedLLMClient } from '@/lib/unified-llm';

describe('UnifiedLLMClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __unifiedLlmTestUtils.resetInvalidJwtSilence();

    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'eyJ.test.access.token' } },
    });
    mocks.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'eyJ.refreshed.access.token' } },
      error: null,
    });

    vi.stubGlobal('fetch', mocks.fetch);
  });

  it('ai-proxy çağrısında Bearer token ve apikey header gönderir', async () => {
    mocks.fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"ok":true}' } }],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await UnifiedLLMClient.complete({
      messages: [{ role: 'user', content: 'test' }],
      provider: 'deepseek',
      model: 'deepseek-chat',
    });

    expect(result.content).toBe('{"ok":true}');
    expect(mocks.fetch).toHaveBeenCalledTimes(1);

    const [url, init] = mocks.fetch.mock.calls[0];
    const requestInit = (init ?? {}) as RequestInit;

    expect(url).toBe(
      'https://example-project.supabase.co/functions/v1/ai-proxy'
    );
    expect(requestInit.method).toBe('POST');
    expect(requestInit.headers).toMatchObject({
      apikey: 'sb_publishable_test_key',
      Authorization: 'Bearer eyJ.test.access.token',
      'Content-Type': 'application/json',
    });
  });

  it('session yoksa refresh edip yeni token ile çağrı yapar', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null } });

    mocks.fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"refreshed":true}' } }],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await UnifiedLLMClient.complete({
      messages: [{ role: 'user', content: 'retry' }],
    });

    expect(result.content).toBe('{"refreshed":true}');
    const [, init] = mocks.fetch.mock.calls[0];
    const requestInit = (init ?? {}) as RequestInit;

    expect(requestInit.headers).toMatchObject({
      Authorization: 'Bearer eyJ.refreshed.access.token',
    });
  });

  it('401 durumunda null döner ve yetkilendirme hatasını loglar', async () => {
    mocks.fetch.mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Invalid token' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const result = await UnifiedLLMClient.complete({
      messages: [{ role: 'user', content: 'will fail' }],
    });

    expect(result.content).toBeNull();
    expect(result.errorCode).toBe('AUTH_SESSION_INVALID');
    expect(mocks.loggerError).toHaveBeenCalled();
    expect(
      mocks.loggerError.mock.calls.some((call) =>
        String(call[2]).includes('Proxy yetkilendirme hatası')
      )
    ).toBe(true);
  });

  it('401 Invalid JWT durumunda retry yapmadan AUTH_INVALID_JWT döner', async () => {
    mocks.fetch.mockResolvedValue(
      new Response(JSON.stringify({ code: 401, message: 'Invalid JWT' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await UnifiedLLMClient.complete({
      messages: [{ role: 'user', content: 'retry on invalid jwt' }],
      provider: 'deepseek',
      model: 'deepseek-chat',
    });

    expect(result.content).toBeNull();
    expect(result.errorCode).toBe('AUTH_INVALID_JWT');
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it('Invalid JWT sonrası kısa süreli sessize alır ve ek ağ isteği atmaz', async () => {
    mocks.fetch.mockResolvedValue(
      new Response(JSON.stringify({ code: 401, message: 'Invalid JWT' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const first = await UnifiedLLMClient.complete({
      messages: [{ role: 'user', content: 'invalid jwt silence 1' }],
      provider: 'deepseek',
      model: 'deepseek-chat',
    });
    expect(first.content).toBeNull();
    expect(first.errorCode).toBe('AUTH_INVALID_JWT');
    expect(mocks.fetch).toHaveBeenCalledTimes(1);

    const second = await UnifiedLLMClient.complete({
      messages: [{ role: 'user', content: 'invalid jwt silence 2' }],
      provider: 'deepseek',
      model: 'deepseek-chat',
    });
    expect(second.content).toBeNull();
    expect(second.errorCode).toBe('AUTH_INVALID_JWT');
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it('refresh başarısızsa fetch çağrısı yapmadan null döner', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null } });
    mocks.refreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'refresh failed' },
    });

    const result = await UnifiedLLMClient.complete({
      messages: [{ role: 'user', content: 'no session' }],
    });

    expect(result.content).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
