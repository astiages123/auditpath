/// <reference types="deno" />
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, systemPrompt, model, provider, temperature = 0.7 } = await req.json()

    let apiUrl = ''
    let apiKey = ''
    let body = {}

    if (provider === 'openrouter') {
      apiUrl = 'https://openrouter.ai/api/v1/chat/completions'
      apiKey = Deno.env.get('OPENROUTER_API_KEY') || ''
      body = {
        model: model || 'xiaomi/mimo-v2-flash:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature,
      }
    }

    if (!apiKey) {
      throw new Error(`API Key for ${provider} not found in secrets`)
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`AI Provider response was not valid JSON: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      const errorMsg = data.error?.message || data.error || responseText || 'Unknown AI Provider error';
      return new Response(JSON.stringify({ error: errorMsg, status: response.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      })
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('AI Proxy Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
