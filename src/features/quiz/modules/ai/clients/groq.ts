/**
 * Groq API Client (via Supabase Proxy)
 *
 * Supabase Edge Function üzerinden Groq API çağrısı yapar.
 */

import { supabase } from "@/shared/lib/core/supabase";

interface GroqResponse {
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
 * Call Groq API via Supabase Proxy
 */
export async function callGroq(
    messages: { role: string; content: string }[],
    model: string = "moonshotai/kimi-k2-instruct-0905",
    temperature: number = 0.7,
    onLog?: LogCallback,
): Promise<string> {
    const lastUserMessage = messages.slice().reverse().find((m) =>
        m.role === "user"
    );
    const contextLength = lastUserMessage?.content.length || 0;

    onLog?.("Groq API çağrısı başlatılıyor (Supabase Proxy)...", {
        promptLength: contextLength,
        model,
        messageCount: messages.length,
    });

    const { data, error } = await supabase.functions.invoke("ai-proxy", {
        body: {
            provider: "groq",
            messages: messages,
            model,
            temperature,
            max_tokens: 4096,
        },
    });

    if (error) {
        onLog?.("Groq API hatası", { error: error.message });
        throw new Error(`Groq API Hatası: ${error.message}`);
    }

    const response = data as GroqResponse;
    const content = response.choices?.[0]?.message?.content || "";

    onLog?.("Groq API yanıtı alındı", { responseLength: content.length });

    return content;
}
