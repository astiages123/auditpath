// Deno types
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- CONFIGURATION ---
const PROVIDERS = {
  cerebras: {
    url: 'https://api.cerebras.ai/v1/chat/completions',
    envKey: 'CEREBRAS_API_KEY',
    defaultModel: 'zai-glm-4.7',
  },
  mimo: {
    url: 'https://api.xiaomimimo.com/v1/chat/completions',
    envKey: 'MIMO_API_KEY',
    defaultModel: 'mimo-v2-flash',
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    envKey: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
  },
  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-1.5-flash',
  },
};

interface ProxyRequest {
  provider?: keyof typeof PROVIDERS;
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

const sbUrl = Deno.env.get('SUPABASE_URL') ?? '';
const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Singleton admin client for logging
const adminClient = createClient(sbUrl, sbKey);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;

  try {
    // 1. Authenticate User
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabaseClient = createClient(sbUrl, sbKey, {
      global: { headers: { Authorization: authHeader } },
    });

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

    // 2. Check Quota
    const { data: quotaCheck, error: quotaError } = await adminClient.rpc(
      'check_and_increment_quota',
      {
        p_user_id: userId,
      }
    );

    if (quotaError || !quotaCheck?.allowed) {
      await safeLog({
        user_id: userId,
        provider: 'quota',
        model: 'quota',
        status: 429,
        latency_ms: Date.now() - startTime,
        usage_type: 'quota_exceeded',
        error_message: quotaError?.message || 'Daily quota reached',
      });
      return new Response(
        JSON.stringify({
          error: 'Kota Aşıldı',
          details: 'Günlük limit doldu.',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Parse and Resolve Provider
    const { provider, messages, model, temperature, max_tokens, usage_type } =
      (await req.json()) as ProxyRequest;
    if (!messages) throw new Error('messages is required');

    let resolvedProvider: keyof typeof PROVIDERS = provider || 'cerebras';
    if (model?.startsWith('gemini')) resolvedProvider = 'google';

    const config = PROVIDERS[resolvedProvider];
    if (!config) throw new Error(`Invalid provider: ${resolvedProvider}`);

    const apiKey = Deno.env.get(config.envKey);
    if (!apiKey) {
      throw new Error(`API KEY not configured for ${resolvedProvider}`);
    }

    const targetModel = model || config.defaultModel;

    // 4. Prepare and Call AI API
    const body: Record<string, unknown> = {
      model: targetModel,
      messages,
      temperature: temperature ?? (resolvedProvider === 'mimo' ? 0.3 : 0.1),
      max_tokens: max_tokens || 8192,
    };

    if (resolvedProvider === 'mimo') {
      body.chat_template_kwargs = { enable_thinking: true };
    }
    if (resolvedProvider === 'deepseek') {
      body.response_format = { type: 'json_object' };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (resolvedProvider === 'mimo') headers['api-key'] = apiKey;
    else headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    if (!response.ok) {
      await safeLog({
        user_id: userId,
        provider: resolvedProvider,
        model: targetModel,
        status: response.status,
        latency_ms: Date.now() - startTime,
        usage_type: usage_type || 'error',
        error_message: `API Error: ${responseText.substring(0, 500)}`,
      });
      return new Response(
        JSON.stringify({
          error: `API Error: ${response.status}`,
          details: responseText,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Clean and Parse Response
    let cleanedText = responseText;
    if (resolvedProvider === 'mimo') {
      cleanedText = responseText
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<think>[\s\S]*/gi, '')
        .trim();
    }

    let resultData;
    try {
      resultData = JSON.parse(cleanedText);
    } catch (e: unknown) {
      await safeLog({
        user_id: userId,
        provider: resolvedProvider,
        model: targetModel,
        status: 200,
        latency_ms: Date.now() - startTime,
        usage_type: 'parse_error',
        error_message: `JSON Parse Error: ${
          e instanceof Error ? e.message : String(e)
        }`,
      });
      return new Response(JSON.stringify({ error: 'Invalid JSON response' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Final Log and Return
    const usage = resultData.usage || {};
    await safeLog({
      user_id: userId,
      provider: resolvedProvider,
      model: targetModel,
      status: 200,
      latency_ms: Date.now() - startTime,
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
      cached_tokens: usage.prompt_tokens_details?.cached_tokens || 0,
      usage_type: usage_type || 'generation',
    });

    return new Response(JSON.stringify(resultData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (userId) {
      await safeLog({
        user_id: userId,
        provider: 'proxy',
        model: 'proxy',
        status: 500,
        latency_ms: Date.now() - startTime,
        usage_type: 'exception',
        error_message: msg,
      });
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function safeLog(payload: LogPayload): Promise<void> {
  try {
    const { error } = await adminClient
      .from('ai_generation_logs')
      .insert(payload);
    if (error) console.error('LOGGING ERROR:', error);
  } catch (err) {
    console.error('CRITICAL LOGGING EXCEPTION:', err);
  }
}
