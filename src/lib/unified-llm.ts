import { supabase } from '@/lib/supabase';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';

// ==========================================
// === UNIFIED LLM CLIENT ===
// ==========================================

const MODULE = 'UnifiedLLMClient';
const INVALID_JWT_SILENCE_MS = 10_000;
let invalidJwtSilenceUntil = 0;

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

const getTokenDebugInfo = (
  token: string
): { preview: string; expIso: string | null; expMs: number | null } => {
  const preview =
    token.length > 20 ? `${token.slice(0, 12)}...${token.slice(-6)}` : token;

  try {
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
        .map((char) => `%${('00' + char.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );

    const payload = JSON.parse(payloadText) as { exp?: number };
    if (typeof payload.exp === 'number') {
      const expMs = payload.exp * 1000;
      return { preview, expIso: new Date(expMs).toISOString(), expMs };
    }

    return { preview, expIso: null, expMs: null };
  } catch {
    return { preview, expIso: null, expMs: null };
  }
};

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

    try {
      // Oturum token'ını açıkça oku; gerekirse yenile
      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          logger.error(MODULE, FUNC, 'Oturum yenilenemedi:', refreshError);
          return { content: null, errorCode: 'AUTH_SESSION_INVALID' };
        }
        sessionData = refreshData;
      }

      let accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        logger.error(MODULE, FUNC, 'Access token bulunamadı, oturum kapalı.');
        return { content: null, errorCode: 'AUTH_SESSION_INVALID' };
      }

      let tokenInfo = getTokenDebugInfo(accessToken);

      // Access token bitmek üzereyse önceden yenile.
      if (tokenInfo.expMs !== null && tokenInfo.expMs <= Date.now() + 30_000) {
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session?.access_token) {
          logger.error(
            MODULE,
            FUNC,
            'Token süresi bitmek üzereydi ama session yenilenemedi.',
            refreshError
          );
          return { content: null, errorCode: 'AUTH_SESSION_INVALID' };
        }

        accessToken = refreshData.session.access_token;
        tokenInfo = getTokenDebugInfo(accessToken);
      }

      const invokeProxy = async (token: string) => {
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
          let detailText = '';
          try {
            detailText = await response.text();
          } catch {
            detailText = '';
          }

          return {
            ok: false as const,
            status: response.status,
            detail: detailText,
          };
        }

        try {
          const data = await response.json();
          return {
            ok: true as const,
            data,
          };
        } catch (parseError) {
          return {
            ok: false as const,
            status: 502,
            detail: 'Invalid JSON response',
            parseError,
          };
        }
      };

      const proxyResult = await invokeProxy(accessToken);

      const latency = Date.now() - startTime;
      if (!proxyResult.ok) {
        if (proxyResult.parseError) {
          logger.error(
            MODULE,
            FUNC,
            `Proxy JSON parse hatası (${latency}ms):`,
            proxyResult.parseError
          );
          return { content: null };
        }

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

      const data = proxyResult.data;

      // OpenAI uyumlu formatta yanıtı işle (choices[0].message.content)
      // ai-proxy doğrudan bu formatı dönmektedir.
      const content =
        (
          data as {
            choices?: Array<{ message?: { content?: string | null } }>;
          }
        )?.choices?.[0]?.message?.content || null;

      if (!content) {
        logger.warn(MODULE, FUNC, `Boş yanıt alındı (${latency}ms)`);
      }

      return { content };
    } catch (error) {
      const latency = Date.now() - startTime;
      logger.error(MODULE, FUNC, `Beklenmedik hata (${latency}ms):`, error);
      return { content: null };
    }
  },
};
