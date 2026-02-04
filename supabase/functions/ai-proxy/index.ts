/**
 * AI Proxy Edge Function
 *
 * Tarayıcıdan gelen istekleri MiMo ve Cerebras API'lerine yönlendirir.
 * - CORS sorununu çözer
 * - API anahtarlarını güvende tutar
 */

import { corsHeaders } from "../_shared/cors.ts";

const MIMO_API_URL = "https://api.xiaomimimo.com/v1/chat/completions";
const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface ProxyRequest {
  provider: "mimo" | "cerebras" | "groq";
  messages: { role: string; content: string }[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { provider, messages, model, temperature, max_tokens } = await req
      .json() as ProxyRequest;

    if (!provider || !messages) {
      return new Response(
        JSON.stringify({ error: "provider ve messages gerekli" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let apiUrl: string;
    let headers: HeadersInit;
    let body: Record<string, unknown>;

    if (provider === "mimo") {
      const mimoKey = Deno.env.get("MIMO_API_KEY");
      if (!mimoKey) {
        return new Response(
          JSON.stringify({ error: "MIMO_API_KEY not configured" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      apiUrl = MIMO_API_URL;
      headers = {
        "Content-Type": "application/json",
        "api-key": mimoKey,
      };
      body = {
        model: model || "mimo-v2-flash",
        messages,
        max_completion_tokens: max_tokens || 4096,
        temperature: temperature ?? 0.7,
        top_p: 0.95,
        stream: false,
        thinking: { type: "disabled" },
      };
    } else if (provider === "cerebras") {
      const cerebrasKey = Deno.env.get("CEREBRAS_API_KEY");
      if (!cerebrasKey) {
        return new Response(
          JSON.stringify({ error: "CEREBRAS_API_KEY not configured" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      apiUrl = CEREBRAS_API_URL;
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cerebrasKey}`,
      };
      body = {
        model: model || "gpt-oss-120b",
        messages,
        temperature: temperature ?? 0.3,
        max_tokens: max_tokens || 4096,
      };
    } else if (provider === "groq") {
      const groqKey = Deno.env.get("GROQ_API_KEY");
      if (!groqKey) {
        return new Response(
          JSON.stringify({ error: "GROQ_API_KEY not configured" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      apiUrl = GROQ_API_URL;
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`,
      };
      body = {
        model: model || "mixtral-8x7b-32768",
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens || 4096,
      };
    } else {
      return new Response(
        JSON.stringify({
          error: "Geçersiz provider. mimo, cerebras veya groq olmalı.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[AI Proxy] ${provider} API çağrılıyor...`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        `[AI Proxy] ${provider} API hatası:`,
        response.status,
        responseText,
      );
      return new Response(
        JSON.stringify({
          error: `${provider} API Error: ${response.status}`,
          details: responseText,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[AI Proxy] ${provider} API başarılı`);

    return new Response(responseText, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    console.error("[AI Proxy] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
