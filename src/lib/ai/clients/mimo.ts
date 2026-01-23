/**
 * MiMo API Client (via Supabase Proxy)
 * 
 * Supabase Edge Function üzerinden MiMo API çağrısı yapar.
 * - CORS sorunu yok
 * - API anahtarı güvende
 */

import { supabase } from '@/lib/supabase';

interface MiMoResponse {
  id: string;
  choices: {
    message: {
      content: string;
    };
  }[];
}

export type LogCallback = (message: string, details?: Record<string, unknown>) => void;

/**
 * Call MiMo API via Supabase Proxy
 */
export async function callMiMo(systemPrompt: string, userPrompt: string, temperature: number = 0.7, onLog?: LogCallback): Promise<string> {
  onLog?.('MiMo API çağrısı başlatılıyor (Supabase Proxy)...', { promptLength: userPrompt.length });

  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      provider: 'mimo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: 4096
    }
  });

  if (error) {
    onLog?.('MiMo API hatası', { error: error.message });
    throw new Error(`MiMo API Hatası: ${error.message}`);
  }

  const response = data as MiMoResponse;
  const content = response.choices?.[0]?.message?.content || '';
  
  onLog?.('MiMo API yanıtı alındı', { responseLength: content.length });
  
  return content;
}

/**
 * Parse JSON from LLM response (simple extraction)
 */
export function parseJsonResponse(text: string, type: 'object' | 'array'): unknown | null {
  try {
    const pattern = type === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
    const match = text.match(pattern);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
