/**
 * Cerebras API Client (via Supabase Proxy)
 *
 * Supabase Edge Function üzerinden Cerebras API çağrısı yapar.
 */

import { supabase } from "@/shared/lib/core/supabase";

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
 * Call Cerebras API via Supabase Proxy
 */
/**
 * Call Cerebras API via Supabase Proxy
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

  const { data, error } = await supabase.functions.invoke("ai-proxy", {
    body: {
      provider: "cerebras",
      messages: messages,
      model, // Pass model to proxy
      temperature: 0.1, // Low temperature for consistent grading
      max_tokens: 4096,
    },
  });

  if (error) {
    onLog?.("Cerebras API hatası", { error: error.message });
    throw new Error(`Cerebras API Hatası: ${error.message}`);
  }

  const response = data as CerebrasResponse;
  const content = response.choices?.[0]?.message?.content || "";

  onLog?.("Cerebras API yanıtı alındı", { responseLength: content.length });

  return content;
}
