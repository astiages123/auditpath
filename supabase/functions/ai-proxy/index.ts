// Deno types
// EdgeRuntime removed as unused

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';
const MIMO_API_URL = 'https://api.xiaomimimo.com/v1/chat/completions';

interface ProxyRequest {
  provider: 'cerebras' | 'mimo' | 'google';
  messages: { role: string; content: string }[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  usage_type?: string;
}

interface LogPayload {
  user_id: string;
  provider: string;
  model: string;
  status: number;
  latency_ms: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cached_tokens?: number;
  usage_type?: string;
  error_message?: string;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;
  let status = 200;

  try {
    // 1. Authenticate User
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    userId = user.id;

    // 2. Parse Request
    const { provider, messages, model, temperature, max_tokens, usage_type } =
      (await req.json()) as ProxyRequest;

    if (!messages) {
      return new Response(JSON.stringify({ error: 'messages is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate provider
    if (provider && !['cerebras', 'mimo', 'google'].includes(provider)) {
      return new Response(
        JSON.stringify({
          error: "Invalid provider. Supported: 'cerebras', 'mimo', 'google'",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Provider Configuration
    let apiUrl = CEREBRAS_API_URL;
    let apiKey = Deno.env.get('CEREBRAS_API_KEY');
    let targetModel = model || 'qwen-3-32b';
    let activeProvider = provider || 'cerebras';

    // Modeli isminden tanı (Otomatik Yönlendirme)
    if (model?.startsWith('gemini')) {
      activeProvider = 'google';
      apiUrl =
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      apiKey = Deno.env.get('GEMINI_API_KEY');
      targetModel = model;
    } else if (provider === 'mimo') {
      activeProvider = 'mimo';
      apiUrl = MIMO_API_URL;
      apiKey = Deno.env.get('MIMO_API_KEY');
      targetModel = model || 'mimo-v2-flash';
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: `API KEY not configured for ${activeProvider}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Call AI Provider
    const body = {
      model: targetModel,
      messages,
      temperature: temperature ?? 0.1,
      max_tokens: max_tokens || 5120,
    };

    console.log(`[AI Proxy] ${activeProvider} API calling (${targetModel})...`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (activeProvider === 'mimo') {
      headers['api-key'] = apiKey; // Mimo specific header
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`; // Standard OpenAI/Cerebras/Google
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    status = response.status;
    const responseText = await response.text();

    if (!response.ok) {
      // Log error status
      if (userId) {
        try {
          await logToDB({
            user_id: userId,
            provider: activeProvider,
            model: targetModel,
            status,
            latency_ms: Date.now() - startTime,
            usage_type: usage_type || 'unknown_error',
            error_message: `API Error ${response.status}: ${responseText.substring(
              0,
              500
            )}`,
          });
        } catch (logError) {
          console.error('[Proxy Log Error - Error Response]', logError);
        }
      }

      console.error(
        `[AI Proxy] ${activeProvider} API Error:`,
        response.status,
        responseText
      );
      return new Response(
        JSON.stringify({
          error: `${activeProvider} API Error: ${response.status}`,
          details: responseText,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Extract Usage & Log
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        'JSON Parse Error:',
        parseError,
        'Response:',
        responseText.substring(0, 200)
      );

      // Log the parse error to DB synchronously
      if (userId) {
        try {
          await logToDB({
            user_id: userId,
            provider: activeProvider,
            model: targetModel,
            status: 200, // Provider returned 200, but content was invalid
            latency_ms: Date.now() - startTime,
            usage_type: usage_type || 'json_parse_error',
            error_message: `JSON Parse Error: ${
              parseError instanceof Error
                ? parseError.message
                : String(parseError)
            }. Response: ${responseText.substring(0, 200)}`,
          });
        } catch (logError) {
          console.error('[Proxy Log Error - JSON Parse]', logError);
        }
      }

      // Return raw text or error response
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON response from AI provider',
          details: responseText.substring(0, 500),
        }),
        {
          status: 502, // Bad Gateway (sort of), or just return the text?
          // User asked to log it, but didn't strictly say fail.
          // But if we can't parse, we can't return JSON structure.
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || 0;
    const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;

    // Await logging as requested for debugging
    // Await logging as requested for debugging
    try {
      await logToDB({
        user_id: userId,
        provider: activeProvider,
        model: targetModel,
        status: 200,
        latency_ms: Date.now() - startTime,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        cached_tokens: cachedTokens,
        usage_type: usage_type || 'generation',
      });
    } catch (logError) {
      console.error('[Proxy Log Error - Success]', logError);
    }

    console.log(
      `[AI Proxy] Success. Tokens: ${totalTokens} (Cached: ${cachedTokens})`
    );

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI Proxy] Error:', errorMessage);

    if (userId) {
      try {
        await logToDB({
          user_id: userId,
          provider: 'unknown',
          model: 'unknown',
          status: 500,
          latency_ms: Date.now() - startTime,
          usage_type: 'proxy_error',
          error_message: errorMessage,
        });
      } catch (logError) {
        console.error('[Proxy Log Error - Exception]', logError);
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function logToDB(payload: LogPayload) {
  console.log('Starting logToDB...');

  const sbUrl = Deno.env.get('SUPABASE_URL');
  const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!sbUrl || !sbKey) {
    console.error(
      'CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
    );
    console.error('SUPABASE_URL defined:', !!sbUrl);
    console.error('SUPABASE_SERVICE_ROLE_KEY defined:', !!sbKey);
    return;
  }

  try {
    const adminClient = createClient(sbUrl, sbKey);

    console.log('Inserting payload:', JSON.stringify(payload, null, 2));

    const { data, error } = await adminClient
      .from('ai_generation_logs')
      .insert(payload)
      .select(); // Select to see returned data if successful

    if (error) {
      // Bu log Supabase Dashboard'da görünmeli
      console.error('DATABASE INSERT ERROR:', JSON.stringify(error, null, 2));
    } else {
      console.log('LOG SAVED SUCCESSFULLY:', data);
    }
  } catch (err) {
    console.error('CRITICAL LOGGING EXCEPTION:', err);
  }
}
