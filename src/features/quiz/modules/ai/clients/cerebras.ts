/**
 * Cerebras API Client (via Supabase Proxy)
 *
 * Supabase Edge Function üzerinden Cerebras API çağrısı yapar.
 */

import { supabase } from "@/shared/lib/core/supabase";
import { env } from "@/config/env";
import { rateLimiter } from "../config/rate-limiter";

interface CerebrasResponse {
  id: string;
  choices: {
    message: {
      content: string;
    };
  }[];
}

export type LogCallback = (
  message: string,
  details?: Record<string, unknown>,
) => void;

/**
 * Call Cerebras API via Supabase Proxy using native fetch to access headers
 */
export async function callCerebras(
  messages: { role: string; content: string }[],
  model?: string,
  onLog?: LogCallback,
): Promise<string> {
  // Extract user content length for logging (approximate)
  const lastUserMessage = messages.slice().reverse().find((m) =>
    m.role === "user"
  );
  const contextLength = lastUserMessage?.content.length || 0;

  const effectiveModel = model || "gpt-oss-120b"; // Default to 120b if not specified

  onLog?.("Cerebras API çağrısı başlatılıyor (Supabase Proxy)...", {
    promptLength: contextLength,
    model: effectiveModel,
    messageCount: messages.length,
  });

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error("No active session for AI request");
  }

  const proxyUrl = `${env.supabase.url}/functions/v1/ai-proxy`;
  console.log("[Cerebras Debug] URL:", proxyUrl);
  console.log("[Cerebras Debug] Token exists:", !!token);

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      provider: "cerebras",
      messages: messages,
      model: effectiveModel,
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  // --- HEADER SYNC ---
  rateLimiter.syncHeaders(response.headers);

  if (!response.ok) {
    const errorText = await response.text();
    onLog?.("Cerebras API hatası", {
      status: response.status,
      body: errorText,
    });
    throw new Error(`Cerebras API Hatası (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as CerebrasResponse;
  const content = data.choices?.[0]?.message?.content || "";

  onLog?.("Cerebras API yanıtı alındı", { responseLength: content.length });

  return content;
}
