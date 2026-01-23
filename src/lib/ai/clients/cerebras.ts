/**
 * Cerebras API Client (via Supabase Proxy)
 * 
 * Supabase Edge Function üzerinden Cerebras API çağrısı yapar.
 */

import { supabase } from '@/lib/supabase';

interface CerebrasResponse {
  id: string;
  choices: {
    message: {
      content: string;
    };
  }[];
}

export type LogCallback = (message: string, details?: Record<string, unknown>) => void;

/**
 * Call Cerebras API via Supabase Proxy
 */
export async function callCerebras(systemPrompt: string, userPrompt: string, onLog?: LogCallback): Promise<string> {
  onLog?.('Cerebras API çağrısı başlatılıyor (Supabase Proxy)...', { promptLength: userPrompt.length });

  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      provider: 'cerebras',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1, // Low temperature for consistent grading
      max_tokens: 4096
    }
  });

  if (error) {
    onLog?.('Cerebras API hatası', { error: error.message });
    throw new Error(`Cerebras API Hatası: ${error.message}`);
  }

  const response = data as CerebrasResponse;
  const content = response.choices?.[0]?.message?.content || '';
  
  onLog?.('Cerebras API yanıtı alındı', { responseLength: content.length });
  
  return content;
}
