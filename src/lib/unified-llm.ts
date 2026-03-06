import { supabase } from '@/lib/supabase';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';

const MODULE = 'UnifiedLLMClient';
const INVALID_JWT_SILENCE_MS = 10_000;
let invalidJwtSilenceUntil = 0;

type TokenDebugInfo = {
  preview: string;
  expIso: string | null;
  expMs: number | null;
};

type ProxySuccessResult = {
  ok: true;
  data: unknown;
};

type ProxyErrorResult = {
  ok: false;
  status: number;
  detail: string;
};

export const __unifiedLlmTestUtils = {
  resetInvalidJwtSilence(): void {
    invalidJwtSilenceUntil = 0;
  },
};

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  messages: LLMMessage[];
  provider?:
    | 'google'
    | 'openai'
    | 'anthropic'
    | 'cerebras'
    | 'deepseek'
    | 'mimo';
  model?: string;
  temperature?: number;
  max_tokens?: number;
  usage_type?: string;
}

export type LLMErrorCode = 'AUTH_INVALID_JWT' | 'AUTH_SESSION_INVALID';

export interface LLMCompletionResult {
  content: string | null;
  errorCode?: LLMErrorCode;
}

const getTokenDebugInfo = (token: string): TokenDebugInfo => {
  const preview =
    token.length > 20 ? `${token.slice(0, 12)}...${token.slice(-6)}` : token;

  if (typeof atob !== 'function') {
    return { preview, expIso: null, expMs: null };
  }

  const payloadBase64Url = token.split('.')[1];
  if (!payloadBase64Url) {
    return { preview, expIso: null, expMs: null };
  }

  let base64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
  base64 += '='.repeat((4 - (base64.length % 4)) % 4);

  const payloadText = decodeURIComponent(
    atob(base64)
      .split('')
      .map(
        (character) =>
          `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`
      )
      .join('')
  );

  const payload = JSON.parse(payloadText) as { exp?: number };
  if (typeof payload.exp !== 'number') {
    return { preview, expIso: null, expMs: null };
  }

  const expMs = payload.exp * 1000;
  return { preview, expIso: new Date(expMs).toISOString(), expMs };
};

async function ensureSessionToken(func: string): Promise<{
  accessToken: string | null;
  errorCode?: LLMErrorCode;
}> {
  let { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    const { data: refreshData, error: refreshError } =
      await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session) {
      logger.error(MODULE, func, 'Oturum yenilenemedi:', refreshError);
      return { accessToken: null, errorCode: 'AUTH_SESSION_INVALID' };
    }
    sessionData = refreshData;
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    logger.error(MODULE, func, 'Access token bulunamadı, oturum kapalı.');
    return { accessToken: null, errorCode: 'AUTH_SESSION_INVALID' };
  }

  const tokenInfo = getTokenDebugInfo(accessToken);
  if (tokenInfo.expMs === null || tokenInfo.expMs > Date.now() + 30_000) {
    return { accessToken };
  }

  const { data: refreshData, error: refreshError } =
    await supabase.auth.refreshSession();
  if (refreshError || !refreshData.session?.access_token) {
    logger.error(
      MODULE,
      func,
      'Token süresi bitmek üzereydi ama session yenilenemedi.',
      refreshError
    );
    return { accessToken: null, errorCode: 'AUTH_SESSION_INVALID' };
  }

  return { accessToken: refreshData.session.access_token };
}

async function invokeProxy(
  token: string,
  options: LLMCompletionOptions
): Promise<ProxySuccessResult | ProxyErrorResult> {
  const response = await fetch(
    `${env.supabase.url.replace(/\/$/, '')}/functions/v1/ai-proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.supabase.anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(options),
    }
  );

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      detail: await response.text(),
    };
  }

  return {
    ok: true,
    data: await response.json(),
  };
}

/**
 * Farklı LLM sağlayıcılarını tek bir arayüz altında toplayan istemci.
 * Supabase Edge Function (ai-proxy) üzerinden güvenli erişim sağlar.
 */
export const UnifiedLLMClient = {
  /**
   * Tamamlama (completions) isteği gönderir.
   */
  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
    const FUNC = 'complete';
    const startTime = Date.now();

    if (Date.now() < invalidJwtSilenceUntil) {
      return { content: null, errorCode: 'AUTH_INVALID_JWT' };
    }

    const tokenResult = await ensureSessionToken(FUNC);
    if (!tokenResult.accessToken) {
      return { content: null, errorCode: tokenResult.errorCode };
    }

    const proxyResult = await invokeProxy(tokenResult.accessToken, options);
    const latency = Date.now() - startTime;

    if (!proxyResult.ok) {
      if (proxyResult.status === 401) {
        const isInvalidJwt = /invalid jwt/i.test(proxyResult.detail);
        logger.error(
          MODULE,
          FUNC,
          `Proxy yetkilendirme hatası (${latency}ms).`,
          {
            status: proxyResult.status,
            detail: proxyResult.detail.slice(0, 600),
          }
        );

        if (isInvalidJwt) {
          invalidJwtSilenceUntil = Date.now() + INVALID_JWT_SILENCE_MS;
          return { content: null, errorCode: 'AUTH_INVALID_JWT' };
        }

        return { content: null, errorCode: 'AUTH_SESSION_INVALID' };
      }

      logger.error(MODULE, FUNC, `Proxy hatası (${latency}ms):`, {
        status: proxyResult.status,
        detail: proxyResult.detail.slice(0, 600),
      });
      return { content: null };
    }

    invalidJwtSilenceUntil = 0;

    const content =
      (
        proxyResult.data as {
          choices?: Array<{ message?: { content?: string | null } }>;
        }
      )?.choices?.[0]?.message?.content || null;

    if (!content) {
      logger.warn(MODULE, FUNC, `Boş yanıt alındı (${latency}ms)`);
    }

    return { content };
  },
};
