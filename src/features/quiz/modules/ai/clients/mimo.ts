/**
 * MiMo API Client (via Supabase Proxy)
 *
 * Supabase Edge Function üzerinden MiMo API çağrısı yapar.
 * - CORS sorunu yok
 * - API anahtarı güvende
 */

import { supabase } from "@/shared/lib/core/supabase";

interface MiMoResponse {
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
 * Call MiMo API via Supabase Proxy
 */
export interface MiMoGenerationResult {
  content: string;
  reasoning_content?: string;
}

/**
 * Call MiMo API via Supabase Proxy
 */
export async function callMiMo(
  messages: { role: string; content: string }[],
  temperature: number = 0.7,
  onLog?: LogCallback,
): Promise<MiMoGenerationResult> {
  // Extract last user message length for logging
  const lastUserMessage = messages.slice().reverse().find((m) =>
    m.role === "user"
  );

  onLog?.("MiMo API çağrısı başlatılıyor (Supabase Proxy)...", {
    promptLength: lastUserMessage?.content.length || 0,
    messageCount: messages.length,
  });

  const { data, error } = await supabase.functions.invoke("ai-proxy", {
    body: {
      provider: "mimo",
      messages: messages,
      temperature,
      max_tokens: 4096,
    },
  });

  if (error) {
    onLog?.("MiMo API hatası", { error: error.message });
    throw new Error(`MiMo API Hatası: ${error.message}`);
  }

  // MiMo returns reasoning_content if applicable (e.g. for cote models)
  // We need to check the exact response structure from the proxy/provider
  // Assuming standard OpenAI-compatible format with potential extra fields
  const choice = (data as any).choices?.[0];
  const message = choice?.message;

  const content = message?.content || "";
  const reasoning_content = message?.reasoning_content; // Capture reasoning if available

  onLog?.("MiMo API yanıtı alındı", {
    responseLength: content.length,
    hasReasoning: !!reasoning_content,
  });

  return { content, reasoning_content };
}

/**
 * Parse JSON from LLM response (simple extraction)
 */
export function parseJsonResponse(
  text: string | null | undefined,
  type: "object" | "array",
): unknown | null {
  if (!text || typeof text !== "string") return null;

  try {
    let cleanText = text.trim();

    // 1. Markdown bloklarını temizle (```json ... ```)
    const markdownMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (markdownMatch) {
      cleanText = markdownMatch[1].trim();
    }

    // 2. Ham JSON desenini bul
    const pattern = type === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
    const match = cleanText.match(pattern);

    if (!match) return null;

    return JSON.parse(match[0]);
  } catch (e) {
    console.warn("JSON Parse Error:", e, text.slice(0, 100));
    return null;
  }
}
